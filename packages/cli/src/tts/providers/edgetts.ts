/**
 * Edge TTS provider — Microsoft Edge neural voices via the `edge-tts`
 * Python package (free service, no API key). The best free French voices
 * in the registry: fr-FR-DeniseNeural (default), fr-FR-HenriNeural,
 * fr-FR-RemyMultilingualNeural, fr-FR-EloiseNeural,
 * fr-FR-VivienneMultilingualNeural — plus hundreds of voices in other
 * locales (`python -m edge_tts --list-voices`).
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { durationSeconds, writeAudio } from "./audio-util.js";
import { findPython, hasPythonModules, stderrDetail } from "../python.js";
import type { TtsProvider, TtsProviderOptions, TtsProviderResult } from "./types.js";

const DEFAULT_VOICE = "fr-FR-DeniseNeural";

/**
 * edge-tts expresses pace as a signed percentage; the provider contract
 * uses a multiplier. 1.1 → "+10%", 0.9 → "-10%", clamped to ±50%.
 */
export function rateFlag(speed: number | undefined): string | null {
  const value = speed ?? 1.0;
  if (!Number.isFinite(value) || value === 1.0) return null;
  const percent = Math.round(Math.min(0.5, Math.max(-0.5, value - 1.0)) * 100);
  if (percent === 0) return null;
  return `${percent >= 0 ? "+" : ""}${percent}%`;
}

export function buildEdgeArgs(
  text: string,
  voice: string,
  mediaPath: string,
  speed: number | undefined,
): string[] {
  const args = ["-m", "edge_tts", "--voice", voice, "--text", text, "--write-media", mediaPath];
  const rate = rateFlag(speed);
  if (rate) args.push(`--rate=${rate}`);
  return args;
}

async function synthesize(
  text: string,
  outputPath: string,
  options: TtsProviderOptions,
): Promise<TtsProviderResult> {
  const python = findPython();
  if (!python) throw new Error("Python 3 not found on PATH (edge-tts runs through it).");

  const voice = options.voice ?? DEFAULT_VOICE;
  options.onProgress?.(`Generating speech with Edge TTS (${voice})...`);

  const workdir = mkdtempSync(join(tmpdir(), "hf-edgetts-"));
  const mediaPath = join(workdir, "speech.mp3");
  try {
    execFileSync(python, buildEdgeArgs(text, voice, mediaPath, options.speed), {
      stdio: ["ignore", "ignore", "pipe"],
      timeout: 120_000,
    });
    writeAudio(readFileSync(mediaPath), outputPath, "mp3");
  } catch (err) {
    throw new Error(`Edge TTS synthesis failed. ${stderrDetail(err)}`.trim());
  } finally {
    rmSync(workdir, { recursive: true, force: true });
  }

  return { outputPath, durationSeconds: durationSeconds(outputPath), words: null };
}

export const edgettsProvider: TtsProvider = {
  id: "edgetts",
  label: "Edge TTS (Microsoft neural voices, free)",
  local: false,
  setupHint: "pip install edge-tts (no API key; voices: python -m edge_tts --list-voices)",
  availability() {
    return Promise.resolve(
      hasPythonModules(["edge_tts"])
        ? { ok: true }
        : { ok: false, reason: "Python module edge_tts missing: pip install edge-tts" },
    );
  },
  synthesize,
};
