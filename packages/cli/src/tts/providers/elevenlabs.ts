/**
 * ElevenLabs TTS provider — pure-Node REST (no Python SDK required).
 * Keyed by $ELEVENLABS_API_KEY. Uses eleven_turbo_v2_5 (latest turbo
 * model, 32+ languages including French) with ultra-low latency. Supports
 * paralinguistic audio tags (e.g. [laugh], [chuckle], [gasp]) inline in
 * the input text — pass them through verbatim, the model renders them
 * natively.
 *
 * Override the model via $ELEVENLABS_MODEL env var.
 * Voice cloning: pass a voice ID via --voice (any voice from your library).
 */

import { writeAudio, durationSeconds, envKey, fetchAudioBytes } from "./audio-util.js";
import type { TtsProvider, TtsProviderOptions, TtsProviderResult } from "./types.js";

const BASE = "https://api.elevenlabs.io/v1";
/** "Rachel" — ElevenLabs' canonical default voice. */
const DEFAULT_VOICE = "21m00Tcm4TlvDq8ikWAM";
/** Latest turbo model (GA 2025): 32+ languages, ~300ms latency, audio tags. */
const DEFAULT_MODEL = "eleven_turbo_v2_5";

async function synthesize(
  text: string,
  outputPath: string,
  options: TtsProviderOptions,
): Promise<TtsProviderResult> {
  const key = envKey("ELEVENLABS_API_KEY");
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set.");

  const voice = options.voice ?? DEFAULT_VOICE;
  const model = process.env["ELEVENLABS_MODEL"] ?? DEFAULT_MODEL;

  options.onProgress?.(`Requesting ElevenLabs speech (voice ${voice}, model ${model})...`);

  const body: Record<string, unknown> = { text, model_id: model };
  const speed = options.speed ?? 1.0;
  if (speed !== 1.0) {
    // voice_settings.speed is supported on current ElevenLabs models (0.7–1.2).
    body["voice_settings"] = { speed: Math.min(1.2, Math.max(0.7, speed)) };
  }

  const bytes = await fetchAudioBytes(
    `${BASE}/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`,
    {
      headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify(body),
    },
    "ElevenLabs",
  );
  writeAudio(bytes, outputPath, "mp3");

  return { outputPath, durationSeconds: durationSeconds(outputPath), words: null };
}

export const elevenlabsProvider: TtsProvider = {
  id: "elevenlabs",
  label: "ElevenLabs (turbo v2.5, 32+ languages, audio tags)",
  local: false,
  setupHint:
    "Set ELEVENLABS_API_KEY (https://elevenlabs.io → profile → API key). Use [laugh], [chuckle], [gasp] tags inline in text for expressive speech.",
  availability() {
    return Promise.resolve(
      envKey("ELEVENLABS_API_KEY")
        ? { ok: true }
        : { ok: false, reason: "ELEVENLABS_API_KEY is not set" },
    );
  },
  synthesize,
};
