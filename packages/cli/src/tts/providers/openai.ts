// fallow-ignore-file complexity
/**
 * OpenAI TTS provider — REST `/v1/audio/speech`, keyed by $OPENAI_API_KEY.
 * Requests WAV directly for `.wav` outputs, so no ffmpeg is needed.
 */

import { writeAudio, durationSeconds, envKey, fetchAudioBytes } from "./audio-util.js";
import type { TtsProvider, TtsProviderOptions, TtsProviderResult } from "./types.js";

const DEFAULT_MODEL = "gpt-4o-mini-tts";
const DEFAULT_VOICE = "alloy";

async function synthesize(
  text: string,
  outputPath: string,
  options: TtsProviderOptions,
): Promise<TtsProviderResult> {
  const key = envKey("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY is not set.");

  const voice = options.voice ?? DEFAULT_VOICE;
  const model = process.env["OPENAI_TTS_MODEL"] ?? DEFAULT_MODEL;
  const wantsWav = outputPath.toLowerCase().endsWith(".wav");

  options.onProgress?.(`Requesting OpenAI speech (${model}, voice ${voice})...`);

  const body: Record<string, unknown> = {
    model,
    voice,
    input: text,
    response_format: wantsWav ? "wav" : "mp3",
  };
  const speed = options.speed ?? 1.0;
  if (speed !== 1.0) body["speed"] = Math.min(4, Math.max(0.25, speed));

  const base = process.env["OPENAI_BASE_URL"] ?? "https://api.openai.com/v1";
  const bytes = await fetchAudioBytes(
    `${base}/audio/speech`,
    {
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    },
    "OpenAI",
  );
  writeAudio(bytes, outputPath, wantsWav ? "wav" : "mp3");

  return { outputPath, durationSeconds: durationSeconds(outputPath), words: null };
}

export const openaiProvider: TtsProvider = {
  id: "openai",
  label: "OpenAI TTS",
  local: false,
  setupHint: "Set OPENAI_API_KEY (https://platform.openai.com/api-keys)",
  availability() {
    return Promise.resolve(
      envKey("OPENAI_API_KEY") ? { ok: true } : { ok: false, reason: "OPENAI_API_KEY is not set" },
    );
  },
  synthesize,
};
