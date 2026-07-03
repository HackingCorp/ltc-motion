/**
 * Piper TTS provider — fully local neural TTS (https://github.com/rhasspy/piper).
 * Requires the `piper` binary on PATH and a voice model: pass the `.onnx` path
 * via `--voice`, or set $PIPER_VOICE. Good fit for offline French/African
 * voices (e.g. fr_FR-siwis-medium) with zero cloud dependency.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { durationSeconds } from "./audio-util.js";
import type { TtsProvider, TtsProviderOptions, TtsProviderResult } from "./types.js";

function hasPiperBinary(): boolean {
  try {
    execFileSync("piper", ["--version"], { stdio: "ignore", timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

function resolveModel(voice: string | undefined): string | null {
  const candidate = voice ?? process.env["PIPER_VOICE"];
  if (!candidate) return null;
  const path = resolve(candidate);
  return existsSync(path) ? path : null;
}

function runPiper(args: string[], text: string): void {
  try {
    execFileSync("piper", args, {
      input: text,
      timeout: 300_000,
      stdio: ["pipe", "ignore", "pipe"],
    });
  } catch (err) {
    const detail =
      err && typeof err === "object" && "stderr" in err
        ? String((err as { stderr: unknown }).stderr).slice(-300)
        : "";
    throw new Error(`Piper synthesis failed. ${detail}`.trim());
  }
}

function synthesize(
  text: string,
  outputPath: string,
  options: TtsProviderOptions,
): Promise<TtsProviderResult> {
  const model = resolveModel(options.voice);
  if (!model) {
    throw new Error(
      "Piper needs a voice model: pass --voice /path/to/voice.onnx or set PIPER_VOICE. " +
        "Download voices from https://github.com/rhasspy/piper/blob/master/VOICES.md",
    );
  }
  if (!outputPath.toLowerCase().endsWith(".wav")) {
    throw new Error("Piper only writes .wav output.");
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  options.onProgress?.(`Generating speech with Piper (${model})...`);

  const args = ["--model", model, "--output_file", outputPath];
  const speed = options.speed ?? 1.0;
  // Piper's length_scale is the inverse of speed: 0.5 → twice as fast.
  if (speed !== 1.0 && speed > 0) args.push("--length_scale", String(1 / speed));

  runPiper(args, text);

  if (!existsSync(outputPath)) throw new Error("Piper completed but produced no output file.");
  return Promise.resolve({
    outputPath,
    durationSeconds: durationSeconds(outputPath),
    words: null,
  });
}

export const piperProvider: TtsProvider = {
  id: "piper",
  label: "Piper (local)",
  local: true,
  setupHint:
    "Install piper (pip install piper-tts) and download a voice model (--voice x.onnx or PIPER_VOICE)",
  availability() {
    if (!hasPiperBinary()) {
      return Promise.resolve({ ok: false, reason: "piper binary not found on PATH" });
    }
    if (!resolveModel(undefined) && !process.env["PIPER_VOICE"]) {
      return Promise.resolve({
        ok: true, // usable with an explicit --voice; auto-selection needs PIPER_VOICE
      });
    }
    return Promise.resolve({ ok: true });
  },
  synthesize,
};
