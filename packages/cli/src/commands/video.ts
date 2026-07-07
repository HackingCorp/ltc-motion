// fallow-ignore-file complexity
import { defineCommand } from "citty";
import { resolve } from "node:path";
import * as clack from "@clack/prompts";
import type { Example } from "./_examples.js";
import { c } from "../ui/colors.js";
import { errorBox } from "../ui/format.js";
import { renderProviderList } from "../ui/provider-list.js";
import {
  VIDEO_PROVIDERS,
  resolveVideoProvider,
  type VideoProvider,
} from "../videogen/providers/index.js";

export const examples: Example[] = [
  [
    "Generate an AI video clip",
    'hyperframes video "drone shot over a turquoise lagoon at sunset" --duration 4 -o clip.mp4',
  ],
  [
    "Portrait clip for a 9:16 composition",
    'hyperframes video "coffee pouring in slow motion" --width 704 --height 1280',
  ],
  ["Reproducible output", 'hyperframes video "ocean waves" --seed 42'],
  ["List providers", "hyperframes video --list"],
];

export default defineCommand({
  meta: {
    name: "video",
    description:
      "Generate a short AI video clip from a text prompt (Wan 2.2 on your RunPod worker)",
  },
  args: {
    prompt: { type: "positional", description: "Video description prompt", required: false },
    provider: { type: "string", description: "Video provider: auto, wan (default: auto)" },
    duration: { type: "string", description: "Target duration in seconds, max 5 (default: ~3.4)" },
    width: { type: "string", description: "Width in px (default: 1280)" },
    height: { type: "string", description: "Height in px (default: 704)" },
    steps: { type: "string", description: "Inference steps (default: 40)" },
    guidance: { type: "string", description: "Guidance scale (default: 5.0)" },
    seed: { type: "string", description: "Seed for reproducible output" },
    "negative-prompt": { type: "string", description: "What to avoid" },
    output: { type: "string", alias: "o", description: "Output .mp4 path (default: clip.mp4)" },
    list: { type: "boolean", description: "List providers and their availability" },
  },
  async run({ args }) {
    if (args.list) return renderProviderList("Video providers", VIDEO_PROVIDERS);

    const prompt = (args.prompt as string | undefined)?.trim();
    if (!prompt) {
      console.error(
        errorBox(
          "Missing prompt",
          'Usage: hyperframes video "<prompt>" [--duration 4] [-o clip.mp4]',
        ),
      );
      process.exit(1);
    }

    let provider: VideoProvider;
    try {
      provider = await resolveVideoProvider(args.provider as string | undefined);
    } catch (err) {
      console.error(
        errorBox("No video provider", err instanceof Error ? err.message : String(err)),
      );
      process.exit(1);
    }

    const outputPath = resolve((args.output as string | undefined) ?? "clip.mp4");
    const spinner = clack.spinner();
    spinner.start(`Generating with ${provider.label}...`);
    try {
      const num = (v: unknown) => (v == null || Number.isNaN(Number(v)) ? undefined : Number(v));
      const result = await provider.generate(outputPath, {
        prompt,
        durationSeconds: num(args.duration),
        width: num(args.width),
        height: num(args.height),
        steps: num(args.steps),
        guidance: num(args.guidance),
        seed: num(args.seed),
        negativePrompt: args["negative-prompt"] as string | undefined,
        onProgress: (message) => spinner.message(message),
      });
      spinner.stop("Generation complete");
      clack.outro(
        `${c.success("✓")} ${result.frames} frames @ ${result.fps}fps via ${result.model} → ${c.accent(result.outputPath)}`,
      );
    } catch (err) {
      spinner.stop("Generation failed");
      console.error(
        errorBox("Video generation failed", err instanceof Error ? err.message : String(err)),
      );
      process.exit(1);
    }
  },
});
