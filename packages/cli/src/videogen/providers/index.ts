/**
 * AI-video provider registry — same pluggable pattern as tts/music/image.
 * One provider today: Wan 2.2 on the generic RunPod worker
 * (ltc-tts-server/runpod-video). A future LTX/Hunyuan endpoint is one more
 * entry here.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { runpodHealth, runpodRun, type RunpodConfig } from "../../runpod.js";

export interface VideoProviderOptions {
  prompt: string;
  /** Target duration in seconds (mapped to Wan's 4n+1 frame counts at 24fps). */
  durationSeconds?: number;
  width?: number;
  height?: number;
  steps?: number;
  guidance?: number;
  seed?: number;
  negativePrompt?: string;
  onProgress?: (message: string) => void;
}

export interface VideoProviderResult {
  outputPath: string;
  frames: number;
  fps: number;
  model: string;
}

export interface VideoProvider {
  id: "wan";
  label: string;
  local: boolean;
  setupHint: string;
  availability(): Promise<{ ok: boolean; reason?: string }>;
  generate(outputPath: string, options: VideoProviderOptions): Promise<VideoProviderResult>;
}

function config(): RunpodConfig | null {
  const endpoint = process.env["WAN_RUNPOD_ENDPOINT"];
  const apiKey = process.env["RUNPOD_API_KEY"];
  if (!endpoint || !apiKey) return null;
  return { endpoint, apiKey };
}

/** Wan generates 4n+1 frame counts at 24fps; 121 frames = 5s max. */
export function framesForDuration(durationSeconds: number | undefined): number {
  const seconds = durationSeconds && durationSeconds > 0 ? Math.min(durationSeconds, 5) : 3.4;
  const raw = Math.round(seconds * 24) + 1;
  const clamped = Math.max(17, Math.min(121, raw));
  return Math.floor((clamped - 1) / 4) * 4 + 1;
}

export function buildVideoInput(options: VideoProviderOptions): Record<string, unknown> {
  const input: Record<string, unknown> = {
    prompt: options.prompt,
    frames: framesForDuration(options.durationSeconds),
  };
  if (options.width) input["width"] = options.width;
  if (options.height) input["height"] = options.height;
  if (options.steps) input["steps"] = options.steps;
  if (options.guidance != null) input["guidance"] = options.guidance;
  if (options.seed != null) input["seed"] = options.seed;
  if (options.negativePrompt) input["negative_prompt"] = options.negativePrompt;
  return input;
}

export const wanProvider: VideoProvider = {
  id: "wan",
  label: "Wan 2.2 TI2V-5B (Apache 2.0, 720p)",
  local: false,
  setupHint:
    "Deploy ltc-tts-server/runpod-video (GPU 24GB, network volume), then set WAN_RUNPOD_ENDPOINT + RUNPOD_API_KEY",
  availability() {
    const cfg = config();
    if (!cfg) {
      return Promise.resolve({ ok: false, reason: "WAN_RUNPOD_ENDPOINT / RUNPOD_API_KEY not set" });
    }
    return runpodHealth(cfg).then(
      () => ({ ok: true }),
      (err) => ({ ok: false, reason: String(err).slice(0, 120) }),
    );
  },
  // fallow-ignore-next-line complexity
  async generate(outputPath, options) {
    const cfg = config();
    if (!cfg) throw new Error("WAN_RUNPOD_ENDPOINT and RUNPOD_API_KEY must be set.");

    options.onProgress?.(
      `Submitting to Wan 2.2 on RunPod (${cfg.endpoint}) — video takes minutes...`,
    );
    const done = await runpodRun(cfg, buildVideoInput(options));

    const output = done["output"] as
      | { video_b64?: string; error?: string; frames?: number; fps?: number; model?: string }
      | undefined;
    if (output?.error) throw new Error(`Wan worker error: ${output.error}`);
    if (!output?.video_b64) {
      throw new Error(`RunPod job returned no video: ${JSON.stringify(done).slice(0, 300)}`);
    }
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, Buffer.from(output.video_b64, "base64"));
    return {
      outputPath,
      frames: output.frames ?? 0,
      fps: output.fps ?? 24,
      model: output.model ?? "wan",
    };
  },
};

export const VIDEO_PROVIDERS: readonly VideoProvider[] = [wanProvider];
export const VIDEO_PROVIDER_IDS = VIDEO_PROVIDERS.map((p) => p.id);

export async function resolveVideoProvider(explicit?: string): Promise<VideoProvider> {
  if (explicit && explicit !== "auto" && explicit !== "wan") {
    throw new Error(`Unknown video provider "${explicit}". Options: auto, wan`);
  }
  return wanProvider;
}
