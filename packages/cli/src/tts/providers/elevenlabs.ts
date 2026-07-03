/**
 * ElevenLabs TTS provider — pure-Node REST (no Python SDK required).
 * Keyed by $ELEVENLABS_API_KEY. Model defaults to eleven_multilingual_v2,
 * which covers French and most other languages without extra flags.
 */

import { writeAudio, durationSeconds, envKey, fetchAudioBytes } from "./audio-util.js";
import type { TtsProvider, TtsProviderOptions, TtsProviderResult } from "./types.js";

const BASE = "https://api.elevenlabs.io/v1";
/** "Rachel" — ElevenLabs' canonical default voice. */
const DEFAULT_VOICE = "21m00Tcm4TlvDq8ikWAM";
const DEFAULT_MODEL = "eleven_multilingual_v2";

async function synthesize(
  text: string,
  outputPath: string,
  options: TtsProviderOptions,
): Promise<TtsProviderResult> {
  const key = envKey("ELEVENLABS_API_KEY");
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set.");

  const voice = options.voice ?? DEFAULT_VOICE;
  const model = process.env["ELEVENLABS_MODEL"] ?? DEFAULT_MODEL;

  options.onProgress?.(`Requesting ElevenLabs speech (voice ${voice})...`);

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
  label: "ElevenLabs",
  local: false,
  setupHint: "Set ELEVENLABS_API_KEY (https://elevenlabs.io → profile → API key)",
  availability() {
    return Promise.resolve(
      envKey("ELEVENLABS_API_KEY")
        ? { ok: true }
        : { ok: false, reason: "ELEVENLABS_API_KEY is not set" },
    );
  },
  synthesize,
};
