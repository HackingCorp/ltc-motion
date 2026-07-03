/**
 * HeyGen Starfish TTS provider — REST `POST /v3/voices/speech`, authenticated
 * through the CLI's own credential store (`hyperframes auth login`, ~/.heygen,
 * or $HEYGEN_API_KEY). The only provider that returns native word timestamps.
 *
 * This closes the long-standing gap where `hyperframes tts` silently fell
 * back to Kokoro even when a HeyGen credential was configured.
 */

import { tryResolveCredential } from "../../auth/resolver.js";
import { buildAuthHeaders } from "../../auth/client.js";
import { writeAudio, durationSeconds } from "./audio-util.js";
import type { TtsProvider, TtsProviderOptions, TtsProviderResult, TtsWord } from "./types.js";

function apiBase(): string {
  return `${process.env["HEYGEN_API_URL"] ?? "https://api.heygen.com"}/v3`;
}

interface SpeechResponse {
  data?: { audio_url?: string; word_timestamps?: unknown[] };
  audio_url?: string;
  word_timestamps?: unknown[];
}

interface VoiceRow {
  voice_id?: string;
  language?: string;
}

async function authHeaders(): Promise<Record<string, string> | null> {
  const credential = await tryResolveCredential();
  return credential ? buildAuthHeaders(credential) : null;
}

/** Pick a default starfish voice, preferring the requested language. */
async function pickDefaultVoice(headers: Record<string, string>, lang: string): Promise<string> {
  const res = await fetch(`${apiBase()}/voices?engine=starfish&type=public&limit=50`, { headers });
  if (!res.ok) throw new Error(`HeyGen voice list failed (${res.status}). Pass --voice <id>.`);
  const payload = (await res.json()) as { data?: VoiceRow[]; voices?: VoiceRow[] };
  const rows = payload.data ?? payload.voices ?? [];
  const wanted = lang.toLowerCase();
  const match = rows.find((v) => (v.language ?? "").toLowerCase().startsWith(wanted));
  const fallback = rows.find((v) => typeof v.voice_id === "string");
  const chosen = match?.voice_id ?? fallback?.voice_id;
  if (!chosen) throw new Error("No HeyGen starfish voices available. Pass --voice <id>.");
  return chosen;
}

function parseWords(raw: unknown[] | undefined): TtsWord[] {
  if (!Array.isArray(raw)) return [];
  const words: TtsWord[] = [];
  for (const entry of raw) {
    const w = entry as { word?: unknown; start?: unknown; end?: unknown };
    if (
      typeof w.word === "string" &&
      typeof w.start === "number" &&
      typeof w.end === "number" &&
      Number.isFinite(w.start) &&
      Number.isFinite(w.end) &&
      !/^<.*>$/.test(w.word.trim()) // drop <start>/<end> sentinels
    ) {
      words.push({ text: w.word, start: w.start, end: w.end });
    }
  }
  return words;
}

async function requestSpeech(
  headers: Record<string, string>,
  body: Record<string, unknown>,
): Promise<{ audioUrl: string; wordTimestamps: unknown[] | undefined }> {
  const res = await fetch(`${apiBase()}/voices/speech`, {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`HeyGen API error ${res.status}: ${detail}`);
  }
  const payload = (await res.json()) as SpeechResponse;
  const inner = payload.data ?? payload;
  if (!inner.audio_url) throw new Error("HeyGen returned no audio_url.");
  return { audioUrl: inner.audio_url, wordTimestamps: inner.word_timestamps };
}

async function downloadBytes(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HeyGen audio download failed (${res.status}).`);
  return Buffer.from(await res.arrayBuffer());
}

async function synthesize(
  text: string,
  outputPath: string,
  options: TtsProviderOptions,
): Promise<TtsProviderResult> {
  const headers = await authHeaders();
  if (!headers) {
    throw new Error("No HeyGen credential. Run `hyperframes auth login` or set HEYGEN_API_KEY.");
  }

  const lang = options.lang ?? "en";
  const voice = options.voice ?? (await pickDefaultVoice(headers, lang));

  options.onProgress?.(`Requesting HeyGen speech (voice ${voice})...`);

  const body: Record<string, unknown> = { text, voice_id: voice, speed: options.speed ?? 1.0 };
  if (lang !== "en") body["language"] = lang;

  const speech = await requestSpeech(headers, body);

  options.onProgress?.("Downloading audio...");
  const bytes = await downloadBytes(speech.audioUrl);
  writeAudio(bytes, outputPath, "mp3");

  return {
    outputPath,
    durationSeconds: durationSeconds(outputPath),
    words: parseWords(speech.wordTimestamps),
  };
}

export const heygenProvider: TtsProvider = {
  id: "heygen",
  label: "HeyGen Starfish",
  local: false,
  setupHint: "Run `hyperframes auth login` (or set HEYGEN_API_KEY)",
  async availability() {
    const headers = await authHeaders();
    return headers ? { ok: true } : { ok: false, reason: "no HeyGen credential configured" };
  },
  synthesize,
};
