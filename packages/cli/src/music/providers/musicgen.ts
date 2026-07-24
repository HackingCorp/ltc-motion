/**
 * MusicGen provider — fully local original music (facebook/musicgen-small,
 * ~300 MB downloaded on first use). No account, no key, works offline; uses
 * Apple MPS or CUDA when available, CPU otherwise. Generates ONE seed clip
 * (≤30 s, the decoder's positional limit) then crossfade-loops it up to the
 * target duration — the same strategy as the hyperframes-media audio engine.
 *
 * **License:** CC-BY-NC 4.0 — non-commercial use only. For commercial
 * productions, use the Lyria provider (`--provider lyria`) which includes
 * Google's copyright indemnification.
 */

import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { durationSeconds } from "../../tts/providers/audio-util.js";
import { findPython, hasPythonModules, runEmbeddedPython } from "../../tts/python.js";
import type { MusicProvider, MusicProviderOptions, MusicProviderResult } from "./types.js";

const REQUIRED_MODULES = ["transformers", "torch", "soundfile", "numpy"];
const PIP_HINT = "pip install transformers torch soundfile numpy";

const MUSICGEN_SEED_SECONDS = 28;

/**
 * MusicGen has no structured knobs — bake the tempo hint into the prompt
 * so `--bpm` still does something on this provider.
 */
export function musicgenPrompt(options: MusicProviderOptions): string {
  const base = options.prompt.trim();
  if (!options.bpm || /\b\d{2,3}\s*bpm\b/i.test(base)) return base;
  return `${base}, ${options.bpm} bpm`;
}

// Ported from skills/hyperframes-media/scripts/lib/bgm.mjs (musicgenScript),
// with GPU device selection added (MPS/CUDA) — params via argv JSON.
const MUSICGEN_SCRIPT = `
import json, math, os, sys, traceback
from pathlib import Path
import numpy as np
import soundfile as sf
import torch
from transformers import MusicgenForConditionalGeneration, AutoProcessor

P = json.loads(sys.argv[1])
prompt, out_path = P["prompt"], P["output"]
target_s, seed_s, token_rate, crossfade_s = float(P["duration"]), float(P["seed"]), 50, 0.3

def apply_fade(arr, sr, fade_in_s=0.08, fade_out_s=0.5):
    n_in = min(int(round(fade_in_s * sr)), arr.shape[0] // 2)
    n_out = min(int(round(fade_out_s * sr)), arr.shape[0] // 2)
    if n_in > 1: arr[:n_in] *= np.linspace(0.0, 1.0, n_in, dtype="float32")
    if n_out > 1: arr[-n_out:] *= np.linspace(1.0, 0.0, n_out, dtype="float32")
    return arr

def loop_crossfade(seed, target_len, xf):
    if seed.shape[0] >= target_len: return seed[:target_len]
    xf = min(xf, seed.shape[0] // 2)
    if xf < 1:
        reps = int(math.ceil(target_len / seed.shape[0]))
        return np.tile(seed, reps)[:target_len]
    t = np.linspace(0.0, 1.0, xf, dtype="float32")
    fade_out = np.cos(t * (math.pi / 2)); fade_in = np.sin(t * (math.pi / 2))
    out = seed.copy()
    while out.shape[0] < target_len:
        tail = out[-xf:] * fade_out; head = seed[:xf] * fade_in
        out = np.concatenate([out[:-xf], tail + head, seed[xf:]])
    return out[:target_len]

try:
    Path(os.path.dirname(out_path)).mkdir(parents=True, exist_ok=True)
    device = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
    processor = AutoProcessor.from_pretrained("facebook/musicgen-small")
    model = MusicgenForConditionalGeneration.from_pretrained("facebook/musicgen-small").to(device)
    model.eval()
    sr = int(model.config.audio_encoder.sampling_rate)
    gen_s = min(seed_s, target_s)
    tokens = max(1, int(math.ceil(gen_s * token_rate)))
    inputs = processor(text=[prompt], padding=True, return_tensors="pt").to(device)
    audio = model.generate(**inputs, max_new_tokens=tokens, do_sample=True, guidance_scale=3.0)
    seed = audio[0, 0].detach().cpu().numpy().astype("float32")
    peak = float(np.max(np.abs(seed)))
    if peak > 1e-6: seed = seed * (0.89 / peak)
    want = max(1, int(round(target_s * sr)))
    final = seed[:want].copy() if seed.shape[0] >= want else loop_crossfade(seed, want, int(round(crossfade_s * sr)))
    if final.shape[0] < want: final = np.pad(final, (0, want - final.shape[0]))
    else: final = final[:want]
    final = apply_fade(final, sr)
    peak = float(np.max(np.abs(final)))
    if peak > 1.0: final = final / peak
    sf.write(out_path, final, sr)
except Exception:
    traceback.print_exc(); sys.exit(1)
`;

async function generate(
  outputPath: string,
  options: MusicProviderOptions,
): Promise<MusicProviderResult> {
  const python = findPython();
  if (!python) throw new Error("Python 3 not found on PATH (MusicGen runs through it).");
  if (!hasPythonModules(REQUIRED_MODULES)) {
    throw new Error(`MusicGen dependencies missing: ${PIP_HINT}`);
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  options.onProgress?.(
    `Generating original music locally with MusicGen (${options.durationSeconds}s — first run downloads ~300 MB)...`,
  );
  const params = {
    prompt: musicgenPrompt(options),
    output: outputPath,
    duration: options.durationSeconds,
    seed: MUSICGEN_SEED_SECONDS,
  };
  runEmbeddedPython(python, MUSICGEN_SCRIPT, params, 1_800_000, "MusicGen");

  return { outputPath, durationSeconds: durationSeconds(outputPath) };
}

export const musicgenProvider: MusicProvider = {
  id: "musicgen",
  label: "MusicGen (local, offline, CC-BY-NC — non-commercial only)",
  local: true,
  setupHint: `${PIP_HINT} (no account; ~300 MB model cached on first use). ⚠️ CC-BY-NC license — not for commercial use. Use --provider lyria for commercial productions.`,
  availability() {
    if (!findPython()) {
      return Promise.resolve({ ok: false, reason: "Python 3 not found on PATH" });
    }
    return Promise.resolve(
      hasPythonModules(REQUIRED_MODULES)
        ? { ok: true }
        : { ok: false, reason: `Python modules missing: ${PIP_HINT}` },
    );
  },
  generate,
};
