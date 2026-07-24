/**
 * Google Lyria 3 RealTime provider — production-grade original music from a
 * mood prompt, streamed in ~real time. Keyed by $GEMINI_API_KEY (or
 * $GOOGLE_API_KEY); runs through Python's `google-genai` package, installed
 * on demand. Native knobs: bpm, brightness, density, scale, negative prompt.
 *
 * **Commercial-safe:** Google provides copyright indemnification for Lyria 3
 * output. This is the recommended provider for any production use.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { durationSeconds } from "../../tts/providers/audio-util.js";
import { findPython, hasPythonModules, runEmbeddedPython } from "../../tts/python.js";
import type { MusicProvider, MusicProviderOptions, MusicProviderResult } from "./types.js";

export function lyriaKey(): string | null {
  return process.env["GEMINI_API_KEY"] || process.env["GOOGLE_API_KEY"] || null;
}

/** Parameter payload handed to the embedded Python script (argv JSON). */
export function buildLyriaParams(
  outputPath: string,
  options: MusicProviderOptions,
): Record<string, unknown> {
  return {
    output: outputPath,
    duration: options.durationSeconds,
    prompt: options.prompt,
    bpm: options.bpm ?? 110,
    brightness: options.brightness ?? 0.8,
    density: options.density ?? 0.5,
    scale: options.scale ?? "MAJOR",
    negative_prompt: options.negativePrompt ?? null,
  };
}

// Ported from skills/hyperframes-media/scripts/lyria-recipe.py: stream
// audio chunks from the Lyria RealTime session until the target byte count,
// then write a 48kHz stereo 16-bit WAV.
const LYRIA_SCRIPT = `
import asyncio, json, os, sys, wave
from pathlib import Path

P = json.loads(sys.argv[1])
SAMPLE_RATE, CHANNELS, SAMPLE_WIDTH = 48000, 2, 2

async def run():
    from google import genai
    from google.genai import types

    key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY") or ""
    client = genai.Client(api_key=key, http_options={"api_version": "v1alpha"})
    out = Path(P["output"]); out.parent.mkdir(parents=True, exist_ok=True)
    target = int(P["duration"] * SAMPLE_RATE * CHANNELS * SAMPLE_WIDTH)

    cfg = {"bpm": int(P["bpm"]), "temperature": 1.0,
           "density": float(P["density"]), "brightness": float(P["brightness"])}
    scale = getattr(types.Scale, P.get("scale") or "", None)
    if scale: cfg["scale"] = scale

    prompts = [types.WeightedPrompt(text=P["prompt"], weight=1.0)]
    if P.get("negative_prompt"):
        prompts.append(types.WeightedPrompt(text=P["negative_prompt"], weight=-1.0))

    buf = bytearray()
    async with client.aio.live.music.connect(model="models/lyria-realtime-exp") as session:
        await session.set_weighted_prompts(prompts=prompts)
        await session.set_music_generation_config(config=types.LiveMusicGenerationConfig(**cfg))
        await session.play()

        async def collect():
            while len(buf) < target:
                async for msg in session.receive():
                    sc = msg.server_content
                    if sc and sc.audio_chunks:
                        for chunk in sc.audio_chunks:
                            buf.extend(chunk.data)
                            if len(buf) >= target: return
                await asyncio.sleep(1e-6)

        try:
            await asyncio.wait_for(collect(), timeout=P["duration"] + 12)
        except (TimeoutError, asyncio.TimeoutError):
            print(f"timeout, collected {len(buf)} bytes", file=sys.stderr)

    audio = bytes(buf[:target])
    with wave.open(str(out), "wb") as wf:
        wf.setnchannels(CHANNELS); wf.setsampwidth(SAMPLE_WIDTH)
        wf.setframerate(SAMPLE_RATE); wf.writeframes(audio)

asyncio.run(run())
`;

async function generate(
  outputPath: string,
  options: MusicProviderOptions,
): Promise<MusicProviderResult> {
  if (!lyriaKey()) throw new Error("GEMINI_API_KEY (or GOOGLE_API_KEY) is not set.");
  const python = findPython();
  if (!python) throw new Error("Python 3 not found on PATH (Lyria runs through google-genai).");

  if (!hasPythonModules(["google.genai"])) {
    options.onProgress?.("Installing google-genai...");
    try {
      execFileSync(python, ["-m", "pip", "install", "--quiet", "google-genai"], {
        stdio: "ignore",
        timeout: 300_000,
      });
    } catch {
      throw new Error(
        "google-genai is missing and could not be installed: pip install google-genai",
      );
    }
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  options.onProgress?.(`Streaming original music from Lyria (${options.durationSeconds}s)...`);
  runEmbeddedPython(
    python,
    LYRIA_SCRIPT,
    buildLyriaParams(outputPath, options),
    (options.durationSeconds + 90) * 1000,
    "Lyria",
  );

  return { outputPath, durationSeconds: durationSeconds(outputPath) };
}

export const lyriaProvider: MusicProvider = {
  id: "lyria",
  label: "Google Lyria 3 RealTime (production quality, commercial-safe)",
  local: false,
  setupHint:
    "Set GEMINI_API_KEY (free at aistudio.google.com/apikey); google-genai auto-installs. Commercial-safe with copyright indemnification.",
  availability() {
    if (!lyriaKey()) {
      return Promise.resolve({ ok: false, reason: "GEMINI_API_KEY / GOOGLE_API_KEY is not set" });
    }
    if (!findPython()) {
      return Promise.resolve({ ok: false, reason: "Python 3 not found on PATH" });
    }
    return Promise.resolve({ ok: true });
  },
  generate,
};
