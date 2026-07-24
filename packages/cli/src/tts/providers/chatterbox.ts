// fallow-ignore-file code-duplication
/**
 * Chatterbox TTS provider — local neural TTS from Resemble AI
 * (https://github.com/resemble-ai/chatterbox), MIT licensed.
 *
 * Two modes, selected automatically:
 *   - **Multilingual** (default, 23+ languages including French) when no
 *     reference audio is provided — zero-shot, no cloning needed.
 *   - **Turbo** (English, voice cloning) when a reference sample is passed
 *     via --voice /path/to/sample.wav (or $CHATTERBOX_VOICE). 350M params,
 *     single-step decoder, ~3× real-time on GPU.
 *
 * Requires `chatterbox-tts` Python package. GPU recommended (CUDA/MPS),
 * but Nano mode (110M) runs CPU at acceptable speed.
 *
 * **License:** MIT — safe for commercial use.
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { durationSeconds } from "./audio-util.js";
import { findPython, hasPythonModules, runEmbeddedPython } from "../python.js";
import type { TtsProvider, TtsProviderOptions, TtsProviderResult } from "./types.js";

const REQUIRED_MODULES = ["chatterbox_tts"];
const PIP_HINT = "pip install chatterbox-tts";

function resolveReference(voice: string | undefined): { path: string } | null {
  const candidate = voice ?? process.env["CHATTERBOX_VOICE"];
  if (!candidate) return null;
  const audioPath = resolve(candidate);
  if (!existsSync(audioPath)) {
    throw new Error(
      `Chatterbox reference sample not found: ${audioPath}. ` +
        "Pass --voice /path/to/sample.wav (5–15s clean speech) or omit for multilingual zero-shot.",
    );
  }
  return { path: audioPath };
}

/**
 * Pick the chatterbox model class + factory based on whether a reference
 * sample is provided. With a reference → Turbo (350M, voice cloning).
 * Without → Multilingual (500M, zero-shot, 23+ languages).
 */
const CHATTERBOX_SCRIPT = `
import json, os, sys, traceback
from pathlib import Path
import numpy as np
import soundfile as sf

P = json.loads(sys.argv[1])
text, out_path = P["text"], P["output"]
ref_path = P.get("reference")
lang = P.get("lang", "fr")
device = P.get("device", "cuda")

try:
    if ref_path:
        # Turbo mode — voice cloning from reference audio
        from chatterbox.tts_turbo import ChatterboxTurboTTS
        model = ChatterboxTurboTTS.from_pretrained(device=device)
        wav = model.generate(text, audio_prompt_path=ref_path)
    else:
        # Multilingual zero-shot — 23+ languages
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS
        model = ChatterboxMultilingualTTS.from_pretrained(device=device, t3_model="v3")
        wav = model.generate(text, language_id=lang)

    # wav is a numpy array; write as 24kHz mono WAV (chatterbox native rate)
    wav_np = wav.cpu().numpy().squeeze() if hasattr(wav, "cpu") else np.asarray(wav).squeeze()
    sr_out = getattr(model, "sample_rate", 24000)
    Path(os.path.dirname(out_path)).mkdir(parents=True, exist_ok=True)
    sf.write(out_path, wav_np.astype(np.float32), int(sr_out))
except Exception:
    traceback.print_exc()
    sys.exit(1)
`;

async function synthesize(
  text: string,
  outputPath: string,
  options: TtsProviderOptions,
): Promise<TtsProviderResult> {
  const python = findPython();
  if (!python) throw new Error("Python 3 not found on PATH (Chatterbox runs through it).");
  if (!hasPythonModules(REQUIRED_MODULES)) {
    throw new Error(`Chatterbox dependencies missing: ${PIP_HINT}`);
  }

  const reference = resolveReference(options.voice);
  const lang = options.lang ?? "fr";

  options.onProgress?.(
    reference
      ? `Generating speech with Chatterbox Turbo (cloned voice from ${reference.path})...`
      : `Generating speech with Chatterbox Multilingual (lang=${lang}, zero-shot)...`,
  );

  const params: Record<string, unknown> = {
    text,
    output: outputPath,
    lang,
    device: process.env["CHATTERBOX_DEVICE"] ?? "cuda",
  };
  if (reference) params["reference"] = reference.path;

  runEmbeddedPython(python, CHATTERBOX_SCRIPT, params, 300_000, "Chatterbox");

  return { outputPath, durationSeconds: durationSeconds(outputPath), words: null };
}

async function availability(): Promise<{ ok: boolean; reason?: string }> {
  if (!findPython()) {
    return { ok: false, reason: "Python 3 not found on PATH" };
  }
  if (!hasPythonModules(REQUIRED_MODULES)) {
    return { ok: false, reason: `Python modules missing: ${PIP_HINT}` };
  }
  return { ok: true };
}

export const chatterboxProvider: TtsProvider = {
  id: "chatterbox",
  label: "Chatterbox (local, MIT — 23+ languages, voice cloning)",
  local: true,
  setupHint:
    "pip install chatterbox-tts (GPU recommended). Zero-shot multilingual by default; pass --voice sample.wav for voice cloning (Turbo mode). Set CHATTERBOX_DEVICE=cpu for CPU-only.",
  availability,
  synthesize,
};
