// fallow-ignore-file complexity
import { defineCommand } from "citty";
import type { Example } from "./_examples.js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

export const examples: Example[] = [
  ["Generate speech from text", 'hyperframes tts "Welcome to HyperFrames"'],
  ["Pin a provider", 'hyperframes tts "Hello" --provider elevenlabs'],
  ["Choose a voice", 'hyperframes tts "Hello world" --voice am_adam'],
  ["Save to a specific file", 'hyperframes tts "Intro" --voice bf_emma --output narration.wav'],
  ["Adjust speech speed", 'hyperframes tts "Slow and clear" --speed 0.8'],
  [
    "Generate Spanish speech",
    'hyperframes tts "La reunión empieza a las nueve" --voice ef_dora --output es.wav',
  ],
  [
    "Override phonemizer language",
    'hyperframes tts "Ciao a tutti" --voice af_heart --lang it --output accented.wav',
  ],
  [
    "Word timestamps (HeyGen)",
    'hyperframes tts "Narration" --provider heygen --words narration.words.json',
  ],
  ["Read text from a file", "hyperframes tts script.txt"],
  ["List providers and voices", "hyperframes tts --list"],
];
import { resolve, extname } from "node:path";
import * as clack from "@clack/prompts";
import { c } from "../ui/colors.js";
import { errorBox } from "../ui/format.js";
import {
  DEFAULT_VOICE,
  BUNDLED_VOICES,
  SUPPORTED_LANGS,
  inferLangFromVoiceId,
  isSupportedLang,
  type SupportedLang,
} from "../tts/manager.js";
import {
  TTS_PROVIDERS,
  TTS_PROVIDER_IDS,
  resolveProvider,
  type TtsProvider,
} from "../tts/providers/index.js";

const voiceList = BUNDLED_VOICES.map((v) => `${v.id} (${v.label})`).join(", ");
const langList = SUPPORTED_LANGS.join(", ");
const providerList = `auto, ${TTS_PROVIDER_IDS.join(", ")}`;

export default defineCommand({
  meta: {
    name: "tts",
    description:
      "Generate speech audio from text (HeyGen, ElevenLabs, OpenAI, Piper, or local Kokoro-82M)",
  },
  args: {
    input: {
      type: "positional",
      description: "Text to speak, or path to a .txt file",
      required: false,
    },
    output: {
      type: "string",
      description: "Output file path (default: speech.wav in current directory)",
      alias: "o",
    },
    provider: {
      type: "string",
      description: `TTS provider (default: auto — first configured of ${TTS_PROVIDER_IDS.join(" → ")}). Options: ${providerList}`,
      alias: "p",
    },
    voice: {
      type: "string",
      description: `Voice ID, provider-specific (Kokoro default: ${DEFAULT_VOICE}). Kokoro options: ${voiceList}`,
      alias: "v",
    },
    speed: {
      type: "string",
      description: "Speech speed multiplier (default: 1.0)",
      alias: "s",
    },
    lang: {
      type: "string",
      description: `Language hint. For Kokoro: phonemizer language (auto-detected from voice prefix). Options: ${langList}`,
      alias: "l",
    },
    words: {
      type: "string",
      description: "Write word timestamps JSON to this path (providers that support it: heygen)",
    },
    list: {
      type: "boolean",
      description: "List providers and available voices, then exit",
      default: false,
    },
    json: {
      type: "boolean",
      description: "Output result as JSON",
      default: false,
    },
  },
  async run({ args }) {
    if (args.list) {
      return listProvidersAndVoices(args.json);
    }

    const text = readInputTextOrExit(args.input);
    const provider = await resolveProviderOrExit(args.provider);
    const output = resolve(args.output ?? "speech.wav");
    const speed = parseSpeedOrExit(args.speed);
    const lang = resolveLangOrExit(provider, args);

    const spin = args.json ? null : clack.spinner();
    spin?.start(`Generating speech with ${c.accent(provider.label)}...`);

    try {
      const result = await provider.synthesize(text, output, {
        ...(args.voice ? { voice: args.voice } : {}),
        speed,
        ...(lang ? { lang } : {}),
        ...(spin ? { onProgress: (msg: string) => spin.message(msg) } : {}),
      });

      const wordsPath = writeWordsIfRequested(args.words, provider, result, args.json);
      reportSuccess({ args, provider, speed, lang, result, wordsPath, spin });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (args.json) {
        console.log(JSON.stringify({ ok: false, provider: provider.id, error: message }));
      } else {
        spin?.stop(c.error(`Speech synthesis failed (${provider.label}): ${message}`));
      }
      process.exit(1);
    }
  },
});

// ---------------------------------------------------------------------------
// Run helpers
// ---------------------------------------------------------------------------

function readInputTextOrExit(input: string | undefined): string {
  if (!input) {
    console.error(c.error("Provide text to speak, or use --list to see providers and voices."));
    process.exit(1);
  }

  const maybeFile = resolve(input);
  let text = input;
  if (existsSync(maybeFile) && extname(maybeFile).toLowerCase() === ".txt") {
    text = readFileSync(maybeFile, "utf-8").trim();
    if (!text) {
      console.error(c.error("File is empty."));
      process.exit(1);
    }
  }

  if (!text.trim()) {
    console.error(c.error("No text provided."));
    process.exit(1);
  }
  return text;
}

async function resolveProviderOrExit(explicit: string | undefined): Promise<TtsProvider> {
  try {
    return await resolveProvider(explicit);
  } catch (err) {
    errorBox("Invalid --provider", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

function parseSpeedOrExit(raw: string | undefined): number {
  const speed = raw ? parseFloat(raw) : 1.0;
  if (isNaN(speed) || speed <= 0 || speed > 3) {
    console.error(c.error("Speed must be a number between 0.1 and 3.0"));
    process.exit(1);
  }
  return speed;
}

/**
 * Language handling. Kokoro has a fixed set of phonemizer languages with
 * voice-prefix inference; other providers take the hint as-is.
 */
function resolveLangOrExit(
  provider: TtsProvider,
  args: { lang?: string; voice?: string; json?: boolean },
): string | undefined {
  const requested = args.lang != null ? String(args.lang).toLowerCase() : undefined;
  if (provider.id !== "kokoro") return requested;

  const voice = args.voice ?? DEFAULT_VOICE;
  const inferredLang: SupportedLang = inferLangFromVoiceId(voice);
  if (requested == null) return inferredLang;

  if (!isSupportedLang(requested)) {
    errorBox("Invalid --lang", `Got "${args.lang}". Must be one of: ${langList}.`);
    process.exit(1);
  }
  // Mismatched voice/lang is a valid stylization (English text, French
  // phonemization for accent), so this is a hint, not an error.
  if (!args.json && requested !== inferredLang) {
    console.log(
      c.dim(
        `  Note: voice "${voice}" is ${inferredLang}, rendering with --lang ${requested} instead.`,
      ),
    );
  }
  return requested;
}

function writeWordsIfRequested(
  wordsArg: string | undefined,
  provider: TtsProvider,
  result: { words: { text: string; start: number; end: number }[] | null },
  json: boolean,
): string | null {
  if (!wordsArg) return null;
  if (result.words && result.words.length > 0) {
    const wordsPath = resolve(wordsArg);
    writeFileSync(wordsPath, JSON.stringify(result.words, null, 2));
    return wordsPath;
  }
  if (!json) {
    console.log(
      c.dim(
        `  Note: provider "${provider.id}" returned no word timestamps; ${wordsArg} not written. Use --provider heygen, or chain \`hyperframes transcribe\`.`,
      ),
    );
  }
  return null;
}

function reportSuccess(ctx: {
  args: { json?: boolean; voice?: string };
  provider: TtsProvider;
  speed: number;
  lang: string | undefined;
  result: { durationSeconds: number; outputPath: string };
  wordsPath: string | null;
  spin: { stop: (msg: string) => void } | null;
}): void {
  const { args, provider, speed, lang, result, wordsPath, spin } = ctx;
  if (args.json) {
    console.log(
      JSON.stringify({
        ok: true,
        provider: provider.id,
        voice: args.voice ?? null,
        speed,
        lang: lang ?? null,
        durationSeconds: result.durationSeconds,
        outputPath: result.outputPath,
        wordsPath,
      }),
    );
    return;
  }
  spin?.stop(
    c.success(
      `Generated ${c.accent(result.durationSeconds.toFixed(1) + "s")} of speech with ${c.accent(provider.label)} → ${c.accent(result.outputPath)}`,
    ),
  );
  if (wordsPath) {
    console.log(c.dim(`  Word timestamps → ${wordsPath}`));
  }
}

// ---------------------------------------------------------------------------
// List providers and voices
// ---------------------------------------------------------------------------

async function listProvidersAndVoices(json: boolean): Promise<void> {
  const providers = await Promise.all(
    TTS_PROVIDERS.map(async (p) => {
      const status = await p.availability();
      return {
        id: p.id,
        label: p.label,
        local: p.local,
        ready: status.ok,
        ...(status.reason ? { reason: status.reason } : {}),
        setupHint: p.setupHint,
      };
    }),
  );

  const kokoroVoices = BUNDLED_VOICES.map((v) => ({
    ...v,
    defaultLang: inferLangFromVoiceId(v.id),
  }));

  if (json) {
    console.log(JSON.stringify({ providers, kokoroVoices }));
    return;
  }

  console.log(`\n${c.bold("TTS providers")} (auto picks the first ready one)\n`);
  for (const p of providers) {
    const mark = p.ready ? c.success("●") : c.dim("○");
    const status = p.ready ? c.success("ready") : c.dim(p.reason ?? "not configured");
    console.log(`  ${mark} ${c.accent(p.id.padEnd(12))} ${p.label.padEnd(22)} ${status}`);
    if (!p.ready) console.log(`      ${c.dim(p.setupHint)}`);
  }

  console.log(`\n${c.bold("Kokoro voices")} (local, always available once installed)\n`);
  console.log(
    `  ${c.dim("ID")}                ${c.dim("Name")}         ${c.dim("Language")}   ${c.dim("Lang code")}  ${c.dim("Gender")}`,
  );
  console.log(`  ${c.dim("─".repeat(72))}`);
  for (const row of kokoroVoices) {
    const id = row.id.padEnd(18);
    const label = row.label.padEnd(13);
    const lang = row.language.padEnd(10);
    const code = row.defaultLang.padEnd(10);
    console.log(`  ${c.accent(id)} ${label} ${lang} ${code} ${row.gender}`);
  }
  console.log(
    `\n  ${c.dim("Kokoro: any voice from https://github.com/thewh1teagle/kokoro-onnx (54 voices)")}`,
  );
  console.log(
    `  ${c.dim("ElevenLabs / OpenAI: pass the provider's voice id via --voice. Piper: --voice /path/to/model.onnx")}`,
  );
  console.log(
    `  ${c.dim("Override Kokoro phonemizer with --lang <" + SUPPORTED_LANGS.join("|") + ">")}\n`,
  );
}
