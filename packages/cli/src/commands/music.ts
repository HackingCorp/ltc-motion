// fallow-ignore-file complexity
import { defineCommand } from "citty";
import { resolve } from "node:path";
import * as clack from "@clack/prompts";
import type { Example } from "./_examples.js";
import { c } from "../ui/colors.js";
import { errorBox } from "../ui/format.js";
import { renderProviderList } from "../ui/provider-list.js";
import {
  MUSIC_PROVIDERS,
  MUSIC_PROVIDER_IDS,
  resolveMusicProvider,
  type MusicProvider,
} from "../music/providers/index.js";

export const examples: Example[] = [
  ["Generate an original music bed", 'hyperframes music "uplifting corporate tech" --duration 20'],
  ["Pin a provider", 'hyperframes music "afrobeats, warm guitars" --provider musicgen'],
  [
    "Lyria fine control",
    'hyperframes music "epic orchestral trailer" --bpm 130 --scale MINOR --density 0.8',
  ],
  [
    "Steer away from styles",
    'hyperframes music "calm piano" --negative-prompt "drums, percussion"',
  ],
  ["Save to a specific file", 'hyperframes music "sunny ukulele" -o assets/bgm/track.wav'],
  ["List providers", "hyperframes music --list"],
];

const providerList = `auto, ${MUSIC_PROVIDER_IDS.join(", ")}`;

function parseUnitInterval(raw: unknown, flag: string): number | undefined {
  if (raw == null) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${flag} must be a number between 0 and 1, got: ${String(raw)}`);
  }
  return value;
}

function reportSuccess(provider: MusicProvider, outputPath: string, durationS: number): void {
  clack.outro(
    `${c.success("✓")} Generated ${durationS.toFixed(1)}s of original music with ${provider.label} → ${c.accent(outputPath)}`,
  );
}

export default defineCommand({
  meta: {
    name: "music",
    description:
      "Generate an original background-music bed from a mood prompt (Google Lyria or local MusicGen)",
  },
  args: {
    prompt: {
      type: "positional",
      description: 'Mood / instrumentation prompt (e.g. "uplifting corporate tech")',
      required: false,
    },
    provider: {
      type: "string",
      description: `Music provider: ${providerList} (default: auto)`,
    },
    duration: {
      type: "string",
      description: "Target duration in seconds (default: 20)",
    },
    bpm: { type: "string", description: "Tempo (Lyria native; MusicGen via prompt)" },
    brightness: { type: "string", description: "Lyria: 0-1, higher = brighter mood" },
    density: { type: "string", description: "Lyria: 0-1, higher = fuller mix" },
    scale: { type: "string", description: "Lyria: MAJOR | MINOR | PENTATONIC | ..." },
    "negative-prompt": { type: "string", description: "Lyria: styles to steer away from" },
    output: {
      type: "string",
      alias: "o",
      description: "Output .wav path (default: music.wav)",
    },
    list: { type: "boolean", description: "List providers and their availability" },
  },
  async run({ args }) {
    if (args.list) return renderProviderList("Music providers", MUSIC_PROVIDERS);

    const prompt = (args.prompt as string | undefined)?.trim();
    if (!prompt) {
      console.error(
        errorBox(
          "Missing prompt",
          `Usage: hyperframes music "<mood prompt>" [--duration 20] [--provider ${providerList}]`,
        ),
      );
      process.exit(1);
    }

    const durationSeconds = Number(args.duration ?? 20);
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > 600) {
      console.error(errorBox("Invalid duration", "--duration must be between 1 and 600 seconds."));
      process.exit(1);
    }

    let provider: MusicProvider;
    try {
      provider = await resolveMusicProvider(args.provider as string | undefined);
    } catch (err) {
      console.error(
        errorBox("No music provider", err instanceof Error ? err.message : String(err)),
      );
      process.exit(1);
    }

    const outputPath = resolve((args.output as string | undefined) ?? "music.wav");
    const spinner = clack.spinner();
    spinner.start(`Generating with ${provider.label}...`);
    try {
      const bpm = args.bpm ? Number(args.bpm) : undefined;
      const result = await provider.generate(outputPath, {
        prompt,
        durationSeconds,
        bpm: bpm && Number.isFinite(bpm) ? bpm : undefined,
        brightness: parseUnitInterval(args.brightness, "--brightness"),
        density: parseUnitInterval(args.density, "--density"),
        scale: args.scale as string | undefined,
        negativePrompt: args["negative-prompt"] as string | undefined,
        onProgress: (message) => spinner.message(message),
      });
      spinner.stop("Generation complete");
      reportSuccess(provider, result.outputPath, result.durationSeconds);
    } catch (err) {
      spinner.stop("Generation failed");
      console.error(
        errorBox("Music generation failed", err instanceof Error ? err.message : String(err)),
      );
      process.exit(1);
    }
  },
});
