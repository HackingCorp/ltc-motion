/**
 * Factory for RunPod-hosted image providers — both registry entries (zimage,
 * qwenimage) talk to the same generic worker (ltc-tts-server/runpod-image),
 * differing only by endpoint env var and label. A new hosted model is one
 * more `makeRunpodImageProvider` call.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { runpodHealth, runpodRun, type RunpodConfig } from "../../runpod.js";
import type { ImageProvider, ImageProviderOptions, ImageProviderResult } from "./types.js";

export interface RunpodImageSpec {
  id: ImageProvider["id"];
  label: string;
  /** Env var holding the RunPod endpoint id for this model. */
  endpointEnv: string;
  setupHint: string;
}

function config(spec: RunpodImageSpec): RunpodConfig | null {
  const endpoint = process.env[spec.endpointEnv];
  const apiKey = process.env["RUNPOD_API_KEY"];
  if (!endpoint || !apiKey) return null;
  return { endpoint, apiKey };
}

/** Worker payload from the provider options (only set what the caller set). */
export function buildImageInput(options: ImageProviderOptions): Record<string, unknown> {
  const input: Record<string, unknown> = { prompt: options.prompt };
  if (options.width) input["width"] = options.width;
  if (options.height) input["height"] = options.height;
  if (options.steps) input["steps"] = options.steps;
  if (options.guidance != null) input["guidance"] = options.guidance;
  if (options.seed != null) input["seed"] = options.seed;
  if (options.negativePrompt) input["negative_prompt"] = options.negativePrompt;
  return input;
}

export function makeRunpodImageProvider(spec: RunpodImageSpec): ImageProvider {
  return {
    id: spec.id,
    label: spec.label,
    local: false,
    setupHint: spec.setupHint,
    availability() {
      const cfg = config(spec);
      if (!cfg) {
        return Promise.resolve({
          ok: false,
          reason: `${spec.endpointEnv} / RUNPOD_API_KEY not set`,
        });
      }
      return runpodHealth(cfg).then(
        () => ({ ok: true }),
        (err) => ({ ok: false, reason: String(err).slice(0, 120) }),
      );
    },
    // fallow-ignore-next-line complexity
    async generate(
      outputPath: string,
      options: ImageProviderOptions,
    ): Promise<ImageProviderResult> {
      const cfg = config(spec);
      if (!cfg) {
        throw new Error(`${spec.endpointEnv} and RUNPOD_API_KEY must be set for ${spec.id}.`);
      }
      options.onProgress?.(`Submitting to ${spec.label} on RunPod (${cfg.endpoint})...`);
      const done = await runpodRun(cfg, buildImageInput(options));

      const output = done["output"] as
        | { image_b64?: string; error?: string; width?: number; height?: number; model?: string }
        | undefined;
      if (output?.error) throw new Error(`${spec.label} worker error: ${output.error}`);
      if (!output?.image_b64) {
        throw new Error(`RunPod job returned no image: ${JSON.stringify(done).slice(0, 300)}`);
      }
      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, Buffer.from(output.image_b64, "base64"));
      return {
        outputPath,
        width: output.width ?? options.width ?? 1024,
        height: output.height ?? options.height ?? 1024,
        model: output.model ?? spec.id,
      };
    },
  };
}
