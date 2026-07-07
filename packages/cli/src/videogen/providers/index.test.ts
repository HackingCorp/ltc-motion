import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  VIDEO_PROVIDER_IDS,
  buildVideoInput,
  framesForDuration,
  resolveVideoProvider,
  wanProvider,
} from "./index.js";

let savedEnv: Record<string, string | undefined>;
let workdir: string;

beforeEach(() => {
  workdir = mkdtempSync(join(tmpdir(), "hf-video-test-"));
  savedEnv = {};
  for (const key of ["WAN_RUNPOD_ENDPOINT", "RUNPOD_API_KEY"]) {
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

describe("framesForDuration", () => {
  it("maps seconds to Wan's 4n+1 frame grid at 24fps", () => {
    expect(framesForDuration(5)).toBe(121);
    expect(framesForDuration(1)).toBe(25);
    expect((framesForDuration(2.5) - 1) % 4).toBe(0);
  });

  it("clamps and defaults", () => {
    expect(framesForDuration(60)).toBe(121);
    expect(framesForDuration(undefined)).toBe(81);
    expect(framesForDuration(0)).toBe(81);
  });
});

describe("registry", () => {
  it("registers wan", () => {
    expect(VIDEO_PROVIDER_IDS).toEqual(["wan"]);
  });

  it("resolve rejects unknown providers", async () => {
    await expect(resolveVideoProvider("bogus")).rejects.toThrow(/Unknown video provider/);
    expect((await resolveVideoProvider("auto")).id).toBe("wan");
  });
});

describe("buildVideoInput", () => {
  it("always sets frames and forwards only provided options", () => {
    expect(buildVideoInput({ prompt: "waves" })).toEqual({ prompt: "waves", frames: 81 });
    expect(
      buildVideoInput({ prompt: "waves", durationSeconds: 5, width: 704, height: 1280, seed: 7 }),
    ).toEqual({ prompt: "waves", frames: 121, width: 704, height: 1280, seed: 7 });
  });
});

describe("generate via RunPod", () => {
  it("submits the job and writes the decoded mp4", async () => {
    process.env["WAN_RUNPOD_ENDPOINT"] = "vid123";
    process.env["RUNPOD_API_KEY"] = "rpa_test";
    const mp4 = Buffer.from("fake-mp4-bytes");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        expect(String(url)).toContain("/v2/vid123/");
        return new Response(
          JSON.stringify({
            id: "j1",
            status: "COMPLETED",
            output: {
              video_b64: mp4.toString("base64"),
              format: "mp4",
              frames: 81,
              fps: 24,
              model: "Wan-AI/Wan2.2-TI2V-5B-Diffusers",
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }),
    );

    const out = join(workdir, "clip.mp4");
    const result = await wanProvider.generate(out, { prompt: "waves" });
    expect(readFileSync(out).equals(mp4)).toBe(true);
    expect(result.frames).toBe(81);
  });

  it("surfaces worker errors", async () => {
    process.env["WAN_RUNPOD_ENDPOINT"] = "vid123";
    process.env["RUNPOD_API_KEY"] = "rpa_test";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ id: "j", status: "COMPLETED", output: { error: "OOM" } }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      ),
    );
    await expect(wanProvider.generate(join(workdir, "x.mp4"), { prompt: "t" })).rejects.toThrow(
      /worker error: OOM/,
    );
  });
});
