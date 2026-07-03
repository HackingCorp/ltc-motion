/**
 * Cloud-Run-local render path for the regression harness — the GCP twin of
 * `regression-harness-lambda-local.ts`.
 *
 * Drives the OSS `@hyperframes/gcp-cloud-run` `dispatch()` through the exact
 * sequence Cloud Workflows POSTs in production:
 *
 *     dispatch({ Action: "plan" })              → planDir tarball on GCS
 *     dispatch({ Action: "renderChunk" }) × N   → chunk artifacts on GCS
 *     dispatch({ Action: "assemble" })          → final mp4 / mov / png-seq
 *
 * The Storage client is a filesystem-backed fake: every
 * `gs://harness-cloudrun-local/<key>` URI maps to `<tempRoot>/gcs/<key>`.
 * This exercises the handler's event unwrapping + GCS-URI validation + tar
 * layout + dispatch logic on top of the shared producer primitives —
 * catching regressions (event JSON drift, GCS key conventions, plan-hash
 * boundary checks) that `distributed-simulated` mode wouldn't.
 *
 * Deliberately not a Docker invocation, for the same reason lambda-local
 * isn't an RIE one: gating the producer suite on Docker-in-Docker would
 * break most CI runners. The real-container path is covered by the
 * maintainer-run `examples/gcp-cloud-run/scripts/smoke.sh`.
 */

import { createReadStream, createWriteStream, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";
import {
  dispatch,
  downloadGcsObjectToFile,
  tarDirectory,
  untarDirectory,
} from "@hyperframes/gcp-cloud-run";
import type {
  AssembleEvent,
  AssembleResultBody,
  HandlerDeps,
  PlanEvent,
  PlanResultBody,
  RenderChunkEvent,
  RenderChunkResultBody,
  SerializableDistributedRenderConfig,
} from "@hyperframes/gcp-cloud-run";

export type { RunCloudRunLocalInput } from "./regression-harness-cloudrun-local-types.js";
import type { RunCloudRunLocalInput } from "./regression-harness-cloudrun-local-types.js";

const FAKE_BUCKET = "harness-cloudrun-local";

/** GCS URI helpers — keep the URI shape identical to what Workflows uses in production. */
function uri(key: string): string {
  return `gs://${FAKE_BUCKET}/${key}`;
}

/**
 * Run plan → renderChunk × N → assemble through the OSS dispatch() with a
 * filesystem-backed fake GCS. Output lands at `input.renderedOutputPath`.
 */
// Integration harness exercised via `--mode=cloudrun-local` full renders,
// not unit tests — CRAP is inflated by the missing coverage mapping, same
// as the lambda-local twin this mirrors.
// fallow-ignore-next-line complexity
export async function runCloudRunLocalRender(input: RunCloudRunLocalInput): Promise<void> {
  const gcsRoot = join(input.tempRoot, "gcs");
  mkdirSync(gcsRoot, { recursive: true });

  // STEP 0: stage the project as a tar.gz at the fake-GCS path the Plan
  // event will reference, mirroring what `deploySite` does in prod.
  const projectKey = `sites/harness/${Date.now()}/project.tar.gz`;
  const projectGcsPath = join(gcsRoot, projectKey);
  mkdirSync(dirname(projectGcsPath), { recursive: true });
  await tarDirectory(input.projectDir, projectGcsPath);

  const fakeStorage = new FilesystemBackedFakeStorage(gcsRoot);
  const deps: HandlerDeps = {
    // Typed through HandlerDeps so producer doesn't need to declare
    // @google-cloud/storage itself just for this cast.
    storage: fakeStorage as unknown as HandlerDeps["storage"],
    // The handler resolves the container's pinned chrome-headless-shell by
    // default; locally we want the producer's already-configured Chrome.
    skipChromeResolution: true,
    tmpRoot: join(input.tempRoot, "cloudrun-tmp"),
  };
  mkdirSync(deps.tmpRoot as string, { recursive: true });

  const config: SerializableDistributedRenderConfig = {
    fps: input.fps,
    width: input.width,
    height: input.height,
    format: input.format,
    ...(input.format === "mp4" && input.codec !== undefined ? { codec: input.codec } : {}),
    chunkSize: input.chunkSize,
    maxParallelChunks: input.maxParallelChunks,
    hdrMode: "force-sdr",
    // Forward `variables` through the event boundary so cloudrun-local mode
    // exercises the same variables-in-encoder.json path real executions take.
    variables: input.variables,
  };

  // STEP A: plan
  const planPrefix = `renders/harness/${Date.now()}/`;
  const planEvent: PlanEvent = {
    Action: "plan",
    ProjectGcsUri: uri(projectKey),
    PlanOutputGcsPrefix: uri(planPrefix),
    Config: config,
  };
  const planResult = (await dispatch(planEvent, deps)) as PlanResultBody;

  // STEP B: render every chunk through the handler.
  const chunkUris: string[] = [];
  for (let i = 0; i < planResult.ChunkCount; i++) {
    const chunkEvent: RenderChunkEvent = {
      Action: "renderChunk",
      PlanGcsUri: planResult.PlanGcsUri,
      PlanHash: planResult.PlanHash,
      ChunkIndex: i,
      ChunkOutputGcsPrefix: uri(planPrefix),
      Format: input.format,
    };
    const chunkResult = (await dispatch(chunkEvent, deps)) as RenderChunkResultBody;
    chunkUris.push(chunkResult.ChunkGcsUri);
  }

  // STEP C: assemble
  const finalUri = uri(
    `${planPrefix}output${input.format === "png-sequence" ? ".tar.gz" : `.${input.format}`}`,
  );
  const assembleEvent: AssembleEvent = {
    Action: "assemble",
    PlanGcsUri: planResult.PlanGcsUri,
    ChunkGcsUris: chunkUris,
    AudioGcsUri: planResult.AudioGcsUri,
    OutputGcsUri: finalUri,
    Format: input.format,
  };
  (await dispatch(assembleEvent, deps)) as AssembleResultBody;

  // Copy the final output from fake-GCS land back out to the path the
  // harness expects. For png-sequence, untar into the dir.
  const finalKey = finalUri.slice(`gs://${FAKE_BUCKET}/`.length);
  if (input.format === "png-sequence") {
    const tarPath = join(gcsRoot, finalKey);
    mkdirSync(input.renderedOutputPath, { recursive: true });
    await untarDirectory(tarPath, input.renderedOutputPath);
  } else {
    await downloadGcsObjectToFile(
      fakeStorage as unknown as Parameters<typeof downloadGcsObjectToFile>[0],
      finalUri,
      input.renderedOutputPath,
    );
  }
}

/**
 * Minimum `@google-cloud/storage`-shaped fake the transport's
 * `bucket().file().createReadStream()` and `bucket().upload()` calls land
 * in. Blobs live on the local filesystem under `root/<key>` so the harness
 * can pre-stage inputs (tarball'd project) and post-inspect outputs
 * (per-chunk artifacts, final video) without a real GCS endpoint.
 */
class FilesystemBackedFakeStorage {
  constructor(private readonly root: string) {}

  bucket(_bucketName: string): FakeBucket {
    return new FakeBucket(this.root);
  }
}

class FakeBucket {
  constructor(private readonly root: string) {}

  file(key: string): FakeFile {
    return new FakeFile(join(this.root, key), key);
  }

  async upload(localPath: string, options: { destination: string }): Promise<void> {
    const destPath = join(this.root, options.destination);
    mkdirSync(dirname(destPath), { recursive: true });
    await pipeline(createReadStream(localPath), createWriteStream(destPath));
  }
}

class FakeFile {
  constructor(
    private readonly fsPath: string,
    private readonly key: string,
  ) {}

  createReadStream(): Readable {
    if (!existsSync(this.fsPath)) {
      throw new Error(`FakeGcs: read of missing object ${FAKE_BUCKET}/${this.key}`);
    }
    return createReadStream(this.fsPath);
  }

  async exists(): Promise<[boolean]> {
    return [existsSync(this.fsPath)];
  }

  async getMetadata(): Promise<[{ size: number }]> {
    if (!existsSync(this.fsPath)) {
      throw new Error(`FakeGcs: getMetadata of missing object ${FAKE_BUCKET}/${this.key}`);
    }
    return [{ size: statSync(this.fsPath).size }];
  }
}
