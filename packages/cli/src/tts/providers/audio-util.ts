/**
 * Small audio helpers shared by the TTS providers: write/transcode provider
 * bytes to the requested output path and measure the result's duration.
 * ffmpeg is only required when a transcode is actually needed (e.g. an mp3
 * provider response written to a `.wav` output path).
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/** Duration of a PCM WAV file, parsed from its RIFF chunks (no ffprobe). */
function wavDurationSeconds(path: string): number {
  const buf = readFileSync(path);
  if (buf.length < 44 || buf.toString("ascii", 0, 4) !== "RIFF") return 0;

  let byteRate = 0;
  let dataSize = 0;
  let offset = 12; // skip RIFF header + WAVE tag
  while (offset + 8 <= buf.length) {
    const chunkId = buf.toString("ascii", offset, offset + 4);
    const chunkSize = buf.readUInt32LE(offset + 4);
    if (chunkId === "fmt ") {
      byteRate = buf.readUInt32LE(offset + 16);
    } else if (chunkId === "data") {
      dataSize = chunkSize;
      break;
    }
    offset += 8 + chunkSize + (chunkSize % 2);
  }
  if (byteRate <= 0 || dataSize <= 0) return 0;
  return dataSize / byteRate;
}

/** Best-effort duration via ffprobe for non-WAV outputs (mp3 etc.). */
function probeDurationSeconds(path: string): number {
  try {
    const out = execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
      { encoding: "utf-8", timeout: 30_000 },
    ).trim();
    const dur = Number(out);
    return Number.isFinite(dur) && dur > 0 ? dur : 0;
  } catch {
    return 0;
  }
}

export function durationSeconds(path: string): number {
  if (path.toLowerCase().endsWith(".wav")) {
    const dur = wavDurationSeconds(path);
    if (dur > 0) return dur;
  }
  return probeDurationSeconds(path);
}

/** Non-empty environment variable, or null. */
export function envKey(name: string): string | null {
  const value = process.env[name];
  return value && value.length > 0 ? value : null;
}

/** POST a JSON body and return the response bytes, with a labeled error. */
export async function fetchAudioBytes(
  url: string,
  init: { headers: Record<string, string>; body: string },
  label: string,
): Promise<Buffer> {
  const res = await fetch(url, { method: "POST", ...init });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`${label} API error ${res.status}: ${detail}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Write provider audio bytes to `outputPath`. When the path asks for `.wav`
 * but the bytes are compressed (mp3), transcode with ffmpeg (44.1 kHz mono,
 * the same shape the media skill's audio engine produces).
 */
export function writeAudio(bytes: Buffer, outputPath: string, sourceFormat: "wav" | "mp3"): void {
  mkdirSync(dirname(outputPath), { recursive: true });

  const wantsWav = outputPath.toLowerCase().endsWith(".wav");
  if (!wantsWav || sourceFormat === "wav") {
    writeFileSync(outputPath, bytes);
    return;
  }

  try {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        "pipe:0",
        "-ar",
        "44100",
        "-ac",
        "1",
        outputPath,
      ],
      { input: bytes, timeout: 120_000 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `ffmpeg transcode to wav failed (${message}). Install ffmpeg, or use an .mp3 output path.`,
    );
  }

  if (!existsSync(outputPath) || statSync(outputPath).size === 0) {
    throw new Error("ffmpeg transcode produced no output.");
  }
}
