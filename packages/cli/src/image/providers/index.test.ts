import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  IMAGE_PROVIDERS,
  IMAGE_PROVIDER_IDS,
  getImageProvider,
  resolveImageProvider,
  zimageProvider,
} from "./index.js";
import { buildImageInput } from "./runpod-image.js";

let savedEnv: Record<string, string | undefined>;
let workdir: string;

beforeEach(() => {
  workdir = mkdtempSync(join(tmpdir(), "hf-image-test-"));
  savedEnv = {};
  for (const key of ["ZIMAGE_RUNPOD_ENDPOINT", "QWEN_IMAGE_RUNPOD_ENDPOINT", "RUNPOD_API_KEY"]) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  rmSync(workdir, { recursive: true, force: true });
});

describe("registry", () => {
  it("registers zimage before qwenimage", () => {
    expect(IMAGE_PROVIDER_IDS).toEqual(["zimage", "qwenimage"]);
  });

  it("every provider has a label and setup hint", () => {
    for (const provider of IMAGE_PROVIDERS) {
      expect(provider.label.length).toBeGreaterThan(0);
      expect(provider.setupHint.length).toBeGreaterThan(0);
    }
  });

  it("getImageProvider finds by id and returns null otherwise", () => {
    expect(getImageProvider("qwenimage")?.id).toBe("qwenimage");
    expect(getImageProvider("nope")).toBeNull();
  });
});

describe("resolveImageProvider", () => {
  it("throws on an unknown explicit provider", async () => {
    await expect(resolveImageProvider("bogus")).rejects.toThrow(/Unknown image provider/);
  });

  it("honors an explicit provider even when not configured", async () => {
    const provider = await resolveImageProvider("zimage");
    expect(provider.id).toBe("zimage");
  });

  it("lists every provider's fix when nothing is configured", async () => {
    await expect(resolveImageProvider()).rejects.toThrow(/ZIMAGE_RUNPOD_ENDPOINT/);
  });
});

describe("buildImageInput", () => {
  it("only includes what the caller set", () => {
    expect(buildImageInput({ prompt: "a cat" })).toEqual({ prompt: "a cat" });
    expect(
      buildImageInput({
        prompt: "a cat",
        width: 1080,
        height: 1920,
        steps: 8,
        guidance: 1,
        seed: 42,
        negativePrompt: "blur",
      }),
    ).toEqual({
      prompt: "a cat",
      width: 1080,
      height: 1920,
      steps: 8,
      guidance: 1,
      seed: 42,
      negative_prompt: "blur",
    });
  });
});

describe("generate via RunPod", () => {
  it("submits the job and writes the decoded png", async () => {
    process.env["ZIMAGE_RUNPOD_ENDPOINT"] = "img123";
    process.env["RUNPOD_API_KEY"] = "rpa_test";
    const png = Buffer.from("fake-png-bytes");
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(String(url));
        return new Response(
          JSON.stringify({
            id: "j1",
            status: "COMPLETED",
            output: {
              image_b64: png.toString("base64"),
              format: "png",
              width: 512,
              height: 512,
              model: "Tongyi-MAI/Z-Image-Turbo",
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }),
    );

    const out = join(workdir, "out.png");
    const result = await zimageProvider.generate(out, { prompt: "test", width: 512, height: 512 });
    expect(calls[0]).toBe("https://api.runpod.ai/v2/img123/runsync");
    expect(readFileSync(out).equals(png)).toBe(true);
    expect(result.model).toBe("Tongyi-MAI/Z-Image-Turbo");
  });

  it("surfaces worker errors", async () => {
    process.env["ZIMAGE_RUNPOD_ENDPOINT"] = "img123";
    process.env["RUNPOD_API_KEY"] = "rpa_test";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ id: "j", status: "COMPLETED", output: { error: "CUDA OOM" } }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
      ),
    );
    await expect(zimageProvider.generate(join(workdir, "x.png"), { prompt: "t" })).rejects.toThrow(
      /worker error: CUDA OOM/,
    );
  });
});
