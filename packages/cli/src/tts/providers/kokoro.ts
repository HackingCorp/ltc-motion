/**
 * Kokoro-82M provider — the original fully-local engine, wrapped behind the
 * provider contract. Delegates to the existing Python-based synthesis in
 * `../synthesize.js` (kokoro-onnx + soundfile).
 */

import { hasPythonModules } from "../python.js";
import {
  DEFAULT_VOICE,
  inferLangFromVoiceId,
  isSupportedLang,
  type SupportedLang,
} from "../manager.js";
import type { TtsProvider, TtsProviderOptions, TtsProviderResult } from "./types.js";

const REQUIRED_MODULES = ["kokoro_onnx", "soundfile"];

async function synthesize(
  text: string,
  outputPath: string,
  options: TtsProviderOptions,
): Promise<TtsProviderResult> {
  const { synthesize: kokoroSynthesize } = await import("../synthesize.js");

  const voice = options.voice ?? DEFAULT_VOICE;
  let lang: SupportedLang = inferLangFromVoiceId(voice);
  if (options.lang && isSupportedLang(options.lang)) lang = options.lang;

  const result = await kokoroSynthesize(text, outputPath, {
    voice,
    speed: options.speed ?? 1.0,
    lang,
    ...(options.onProgress ? { onProgress: options.onProgress } : {}),
  });

  return {
    outputPath: result.outputPath,
    durationSeconds: result.durationSeconds,
    words: null,
  };
}

export const kokoroProvider: TtsProvider = {
  id: "kokoro",
  label: "Kokoro-82M (local)",
  local: true,
  setupHint: "pip install kokoro-onnx soundfile",
  availability() {
    const ok = hasPythonModules(REQUIRED_MODULES);
    return Promise.resolve(
      ok
        ? { ok: true }
        : { ok: false, reason: "Python deps missing: pip install kokoro-onnx soundfile" },
    );
  },
  synthesize,
};
