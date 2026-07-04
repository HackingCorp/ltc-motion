/**
 * Fish Speech / OpenAudio TTS provider — local server, zero-shot voice
 * cloning (https://github.com/fishaudio/fish-speech).
 *
 * Talks to a locally running Fish Speech API server over HTTP; the CLI stays
 * pure-Node and the heavy PyTorch stack lives in the server process. Voice
 * cloning: pass a reference sample via `--voice /path/to/sample.wav` (or set
 * $FISH_SPEECH_VOICE). When a sidecar transcript `<sample>.txt` exists next
 * to the sample it is sent as the reference text, which measurably improves
 * cloning fidelity.
 *
 * ⚠ Model weights are licensed CC-BY-NC-SA — non-commercial use only.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { durationSeconds, fetchAudioBytes, writeAudio } from "./audio-util.js";
import type { TtsProvider, TtsProviderOptions, TtsProviderResult } from "./types.js";

const DEFAULT_URL = "http://127.0.0.1:8080";

function serverUrl(): string {
  return (process.env["FISH_SPEECH_URL"] ?? DEFAULT_URL).replace(/\/+$/, "");
}

/**
 * Auth headers for a hosted server. The Fish Speech api server has no auth
 * of its own, so remote deployments sit behind a reverse proxy that expects
 * a bearer token — $FISH_SPEECH_API_KEY is forwarded when set (harmless for
 * a bare localhost server, which just ignores it).
 */
function authHeaders(): Record<string, string> {
  const key = process.env["FISH_SPEECH_API_KEY"];
  return key ? { authorization: `Bearer ${key}` } : {};
}

interface ReferenceSample {
  audio: string; // base64
  text: string;
}

/**
 * Load the cloning reference: audio as base64, plus its transcript when a
 * same-basename `.txt` sits next to the sample.
 */
function loadReference(voice: string | undefined): ReferenceSample | null {
  const candidate = voice ?? process.env["FISH_SPEECH_VOICE"];
  if (!candidate) return null;
  const audioPath = resolve(candidate);
  if (!existsSync(audioPath)) {
    throw new Error(
      `Fish Speech reference sample not found: ${audioPath}. ` +
        "Pass --voice /path/to/sample.wav (5–15s of clean speech) or unset FISH_SPEECH_VOICE.",
    );
  }
  const transcriptPath = audioPath.replace(/\.[^.]+$/, ".txt");
  const text = existsSync(transcriptPath) ? readFileSync(transcriptPath, "utf-8").trim() : "";
  return { audio: readFileSync(audioPath).toString("base64"), text };
}

async function synthesize(
  text: string,
  outputPath: string,
  options: TtsProviderOptions,
): Promise<TtsProviderResult> {
  const reference = loadReference(options.voice);
  options.onProgress?.(
    reference
      ? "Generating speech with Fish Speech (cloned voice)..."
      : "Generating speech with Fish Speech (default voice)...",
  );

  // ServeTTSRequest shape of fish-speech's api server. `speed` is not part
  // of the request model — pace is driven by the reference sample. The
  // server encodes to the requested container itself, so the output
  // extension drives `format` and no local transcode is needed.
  const format = outputPath.toLowerCase().endsWith(".mp3") ? "mp3" : "wav";
  const body: Record<string, unknown> = {
    text,
    format,
    streaming: false,
  };
  if (reference) body["references"] = [reference];

  const bytes = await fetchAudioBytes(
    `${serverUrl()}/v1/tts`,
    {
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    },
    "Fish Speech",
  );
  writeAudio(bytes, outputPath, format);

  return { outputPath, durationSeconds: durationSeconds(outputPath), words: null };
}

async function availability(): Promise<{ ok: boolean; reason?: string }> {
  try {
    const res = await fetch(`${serverUrl()}/v1/health`, {
      headers: authHeaders(),
      signal: AbortSignal.timeout(3_000),
    });
    if (res.ok) return { ok: true };
    return { ok: false, reason: `Fish Speech server responded ${res.status} at ${serverUrl()}` };
  } catch {
    return {
      ok: false,
      reason: `no Fish Speech server at ${serverUrl()} (set FISH_SPEECH_URL or start one)`,
    };
  }
}

export const fishspeechProvider: TtsProvider = {
  id: "fishspeech",
  label: "Fish Speech / OpenAudio (local, voice cloning — non-commercial license)",
  local: true,
  setupHint:
    "pip install fish-speech, download OpenAudio S1-mini weights, run `python -m tools.api_server --listen 127.0.0.1:8080`; clone with --voice sample.wav",
  availability,
  synthesize,
};
