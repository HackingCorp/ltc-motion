// fallow-ignore-file code-duplication
// fallow-ignore-file complexity
/**
 * Qwen3-TTS provider — local neural TTS from Alibaba Qwen
 * (https://github.com/QwenLM/Qwen3-TTS), Apache 2.0 licensed.
 *
 * Three generation modes:
 *   - **CustomVoice** (default) — pre-built speaker timbres: Vivian, Serena,
 *     Uncle_Fu, Dylan, Eric, Ryan, Aiden, Ono_Anna, Sohee. Pass a speaker
 *     name via --voice or $QWEN3TTS_SPEAKER.
 *   - **VoiceDesign** — describe a voice persona in natural language via
 *     $QWEN3TTS_INSTRUCT (e.g. "Deep, warm French narrator, calm pace").
 *     Activated when $QWEN3TTS_MODE=design.
 *   - **VoiceClone** — 3-second reference audio. Pass the sample via --voice
 *     /path/to/ref.wav. Requires a sidecar .txt transcript (same basename).
 *     Activated when a reference sample is provided.
 *
 * Models: 0.6B or 1.7B (set $QWEN3TTS_MODEL). Requires `qwen-tts` Python
 * package and ~4 GB VRAM (GPU recommended). FlashAttention 2 optional.
 *
 * **License:** Apache 2.0 — safe for commercial use.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { durationSeconds } from "./audio-util.js";
import { findPython, hasPythonModules, runEmbeddedPython } from "../python.js";
import type { TtsProvider, TtsProviderOptions, TtsProviderResult } from "./types.js";

const REQUIRED_MODULES = ["qwen_tts"];
const PIP_HINT = "pip install qwen-tts";

/** Pre-built CustomVoice speakers shipped with the model. */
const CUSTOMVOICE_SPEAKERS = [
  "Vivian",
  "Serena",
  "Uncle_Fu",
  "Dylan",
  "Eric",
  "Ryan",
  "Aiden",
  "Ono_Anna",
  "Sohee",
];

/** Default HuggingFace model repo — 1.7B CustomVoice variant. */
const DEFAULT_MODEL_REPO = "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice";

interface ReferenceSample {
  path: string;
  text: string;
}

function resolveReference(voice: string | undefined): ReferenceSample | null {
  const candidate = voice ?? process.env["QWEN3TTS_VOICE"];
  if (!candidate) return null;
  const audioPath = resolve(candidate);
  if (!existsSync(audioPath)) {
    throw new Error(
      `Qwen3-TTS reference sample not found: ${audioPath}. ` +
        "Pass --voice /path/to/ref.wav (3s+ clean speech) or omit for CustomVoice mode.",
    );
  }
  const transcriptPath = audioPath.replace(/\.[^.]+$/, ".txt");
  const refText = existsSync(transcriptPath) ? readFileSync(transcriptPath, "utf-8").trim() : "";
  return { path: audioPath, text: refText };
}

const QWEN3TTS_SCRIPT = `
import json, os, sys, traceback
from pathlib import Path
import numpy as np
import soundfile as sf
import torch

P = json.loads(sys.argv[1])
text, out_path = P["text"], P["output"]
mode = P.get("mode", "custom_voice")
lang = P.get("lang", "French")
device = P.get("device", "cuda:0")
dtype_str = P.get("dtype", "bfloat16")
model_repo = P.get("model_repo")

DTYPE_MAP = {"bfloat16": torch.bfloat16, "float16": torch.float16, "float32": torch.float32}
dtype = DTYPE_MAP.get(dtype_str, torch.bfloat16)

# Optional FlashAttention 2
attn_kwargs = {}
try:
    import flash_attn
    attn_kwargs["attn_implementation"] = "flash_attention_2"
except ImportError:
    pass

try:
    from qwen_tts import Qwen3TTSModel

    model = Qwen3TTSModel.from_pretrained(
        model_repo,
        device_map=device,
        dtype=dtype,
        **attn_kwargs,
    )

    if mode == "voice_clone":
        ref_audio = P["ref_audio"]
        ref_text = P.get("ref_text", "")
        if not ref_text:
            print("Warning: no reference transcript — cloning fidelity may suffer", file=sys.stderr)
        wavs, sr = model.generate_voice_clone(
            text=text, language=lang,
            ref_audio=ref_audio, ref_text=ref_text,
        )
    elif mode == "voice_design":
        instruct = P.get("instruct", "Clear and natural voice")
        wavs, sr = model.generate_voice_design(
            text=text, language=lang, instruct=instruct,
        )
    else:
        # CustomVoice — pre-built speaker
        speaker = P.get("speaker", "Ryan")
        instruct = P.get("instruct")
        gen_kwargs = {"text": text, "language": lang, "speaker": speaker}
        if instruct:
            gen_kwargs["instruct"] = instruct
        wavs, sr = model.generate_custom_voice(**gen_kwargs)

    # wavs[0] is the first (only) sample; write as WAV
    wav = wavs[0].cpu().numpy().squeeze() if hasattr(wavs[0], "cpu") else np.asarray(wavs[0]).squeeze()
    Path(os.path.dirname(out_path)).mkdir(parents=True, exist_ok=True)
    sf.write(out_path, wav.astype(np.float32), int(sr))
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
  if (!python) throw new Error("Python 3 not found on PATH (Qwen3-TTS runs through it).");
  if (!hasPythonModules(REQUIRED_MODULES)) {
    throw new Error(`Qwen3-TTS dependencies missing: ${PIP_HINT}`);
  }

  const reference = resolveReference(options.voice);
  const mode = reference ? "voice_clone" : (process.env["QWEN3TTS_MODE"] ?? "custom_voice");
  const modelRepo = process.env["QWEN3TTS_MODEL"] ?? DEFAULT_MODEL_REPO;
  const speaker = options.voice ?? process.env["QWEN3TTS_SPEAKER"] ?? "Ryan";

  const modeLabel =
    mode === "voice_clone"
      ? `voice clone (${reference!.path})`
      : mode === "voice_design"
        ? "voice design"
        : `CustomVoice speaker=${speaker}`;
  options.onProgress?.(`Generating speech with Qwen3-TTS (${modeLabel})...`);

  const params: Record<string, unknown> = {
    text,
    output: outputPath,
    mode,
    lang: options.lang ?? "French",
    model_repo: modelRepo,
    device: process.env["QWEN3TTS_DEVICE"] ?? "cuda:0",
    dtype: process.env["QWEN3TTS_DTYPE"] ?? "bfloat16",
    speaker,
  };

  if (mode === "voice_clone" && reference) {
    params["ref_audio"] = reference.path;
    params["ref_text"] = reference.text;
  }

  const instruct = process.env["QWEN3TTS_INSTRUCT"];
  if (instruct) params["instruct"] = instruct;

  runEmbeddedPython(python, QWEN3TTS_SCRIPT, params, 600_000, "Qwen3-TTS");

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

export const qwen3ttsProvider: TtsProvider = {
  id: "qwen3tts",
  label: "Qwen3-TTS (local, Apache 2.0 — 10 languages, voice cloning)",
  local: true,
  setupHint: `pip install qwen-tts (GPU, ~4 GB VRAM). CustomVoice speakers: ${CUSTOMVOICE_SPEAKERS.join(", ")}. Set QWEN3TTS_SPEAKER, or pass --voice ref.wav for voice cloning.`,
  availability,
  synthesize,
};
