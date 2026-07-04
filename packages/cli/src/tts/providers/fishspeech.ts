/**
 * Fish Speech / OpenAudio TTS provider — zero-shot voice cloning
 * (https://github.com/fishaudio/fish-speech).
 *
 * Two transports, picked by environment:
 *   - RunPod serverless (GPU, scale-to-zero) when $FISH_SPEECH_RUNPOD_ENDPOINT
 *     is set — jobs go through api.runpod.ai (runsync + status polling)
 *     against the worker in ltc-tts-server/runpod.
 *   - Direct HTTP server ($FISH_SPEECH_URL, default localhost:8080) — a
 *     locally or remotely hosted fish-speech api_server.
 *
 * Either way the CLI stays pure-Node; the PyTorch stack lives server-side.
 * Voice cloning: pass a reference sample via `--voice /path/to/sample.wav`
 * (or set $FISH_SPEECH_VOICE). When a sidecar transcript `<sample>.txt`
 * exists next to the sample it is sent as the reference text, which
 * measurably improves cloning fidelity.
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

// ── RunPod serverless transport ──────────────────────────────────────────────

const RUNPOD_BASE = "https://api.runpod.ai/v2";

interface RunpodConfig {
  endpoint: string;
  apiKey: string;
}

function runpodConfig(): RunpodConfig | null {
  const endpoint = process.env["FISH_SPEECH_RUNPOD_ENDPOINT"];
  const apiKey = process.env["RUNPOD_API_KEY"];
  if (!endpoint || !apiKey) return null;
  return { endpoint, apiKey };
}

async function runpodJson(
  cfg: RunpodConfig,
  path: string,
  body?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${RUNPOD_BASE}/${cfg.endpoint}/${path}`, {
    method: body ? "POST" : "GET",
    headers: { authorization: `Bearer ${cfg.apiKey}`, "content-type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    throw new Error(`RunPod API error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return (await res.json()) as Record<string, unknown>;
}

const RUNPOD_POLL_MS = 2_000;
const RUNPOD_DEADLINE_MS = 600_000;

// fallow-ignore-next-line complexity
async function waitForRunpodCompletion(
  cfg: RunpodConfig,
  first: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  let current = first;
  const deadline = Date.now() + RUNPOD_DEADLINE_MS;
  while (Date.now() < deadline) {
    const status = current["status"];
    if (status === "COMPLETED") return current;
    if (status === "FAILED" || status === "CANCELLED" || status === "TIMED_OUT") {
      const detail = JSON.stringify(current["error"] ?? current["output"] ?? "");
      throw new Error(`RunPod job ${status}: ${detail.slice(0, 300)}`);
    }
    const id = current["id"];
    if (typeof id !== "string") {
      throw new Error(`RunPod response has no job id: ${JSON.stringify(current).slice(0, 200)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, RUNPOD_POLL_MS));
    current = await runpodJson(cfg, `status/${id}`);
  }
  throw new Error("RunPod job did not complete within 10 minutes (cold start + synthesis)");
}

// fallow-ignore-next-line complexity
async function synthesizeViaRunpod(
  cfg: RunpodConfig,
  text: string,
  outputPath: string,
  reference: ReferenceSample | null,
  options: TtsProviderOptions,
): Promise<TtsProviderResult> {
  const format = outputPath.toLowerCase().endsWith(".mp3") ? "mp3" : "wav";
  const input: Record<string, unknown> = { text, format };
  if (reference) input["references"] = [reference];

  options.onProgress?.(`Submitting to Fish Speech on RunPod (${cfg.endpoint})...`);
  const first = await runpodJson(cfg, "runsync", { input });
  const done = await waitForRunpodCompletion(cfg, first);

  const output = done["output"] as { audio_b64?: string; error?: string } | undefined;
  if (output?.error) throw new Error(`Fish Speech worker error: ${output.error}`);
  if (!output?.audio_b64) {
    throw new Error(`RunPod job returned no audio: ${JSON.stringify(done).slice(0, 300)}`);
  }
  writeAudio(Buffer.from(output.audio_b64, "base64"), outputPath, format);
  return { outputPath, durationSeconds: durationSeconds(outputPath), words: null };
}

// ── Provider entry points ────────────────────────────────────────────────────

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

  const runpod = runpodConfig();
  if (runpod) return synthesizeViaRunpod(runpod, text, outputPath, reference, options);

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
  const runpod = runpodConfig();
  if (runpod) {
    try {
      await runpodJson(runpod, "health");
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        reason: `RunPod endpoint ${runpod.endpoint}: ${String(err).slice(0, 120)}`,
      };
    }
  }
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
    "RunPod: set FISH_SPEECH_RUNPOD_ENDPOINT + RUNPOD_API_KEY (worker in ltc-tts-server/runpod). Local: run a fish-speech api_server and set FISH_SPEECH_URL. Clone with --voice sample.wav",
  availability,
  synthesize,
};
