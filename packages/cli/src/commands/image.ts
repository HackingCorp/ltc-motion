// fallow-ignore-file complexity
import { defineCommand } from "citty";
import { resolve } from "node:path";
import * as clack from "@clack/prompts";
import type { Example } from "./_examples.js";
import { c } from "../ui/colors.js";
import { errorBox } from "../ui/format.js";
import { renderProviderList } from "../ui/provider-list.js";
import {
  IMAGE_PROVIDERS,
  IMAGE_PROVIDER_IDS,
  resolveImageProvider,
  type ImageProvider,
} from "../image/providers/index.js";

export const examples: Example[] = [
  [
    "Generate an image",
    'hyperframes image "product photo of a coffee bag, warm light" -o visual.png',
  ],
  [
    "Vertical format for a 9:16 composition",
    'hyperframes image "tropical beach aerial" --width 1080 --height 1920',
  ],
  ["Pin a provider", 'hyperframes image "poster with the text SALE -30%" --provider qwenimage'],
  ["Reproducible output", 'hyperframes image "abstract gradient" --seed 42'],
  ["List providers", "hyperframes image --list"],
];

const providerList = `auto, ${IMAGE_PROVIDER_IDS.join(", ")}`;

function parsePositiveInt(raw: unknown, flag: string): number | undefined {
  if (raw == null) return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${flag} must be a positive integer, got: ${String(raw)}`);
  }
  return value;
}

export default defineCommand({
  meta: {
    name: "image",
    description:
      "Generate an image from a text prompt (Z-Image-Turbo or Qwen-Image on your RunPod workers)",
  },
  args: {
    prompt: {
      type: "positional",
      description: "Image description prompt",
      required: false,
    },
    provider: { type: "string", description: `Image provider: ${providerList} (default: auto)` },
    width: { type: "string", description: "Width in px (default: 1024; rounded to /16, max 2048)" },
    height: { type: "string", description: "Height in px (default: 1024)" },
    steps: { type: "string", description: "Inference steps (default: worker's per-model default)" },
    guidance: {
      type: "string",
      description: "Guidance scale (default: worker's per-model default)",
    },
    seed: { type: "string", description: "Seed for reproducible output" },
    "negative-prompt": { type: "string", description: "What to avoid in the image" },
    output: { type: "string", alias: "o", description: "Output .png path (default: image.png)" },
    list: { type: "boolean", description: "List providers and their availability" },
  },
  async run({ args }) {
    if (args.list) return renderProviderList("Image providers", IMAGE_PROVIDERS);

    const prompt = (args.prompt as string | undefined)?.trim();
    if (!prompt) {
      console.error(
        errorBox(
          "Missing prompt",
          `Usage: hyperframes image "<prompt>" [-o image.png] [--provider ${providerList}]`,
        ),
      );
      process.exit(1);
    }

    let provider: ImageProvider;
    try {
      provider = await resolveImageProvider(args.provider as string | undefined);
    } catch (err) {
      console.error(
        errorBox("No image provider", err instanceof Error ? err.message : String(err)),
      );
      process.exit(1);
    }

    const outputPath = resolve((args.output as string | undefined) ?? "image.png");
    const spinner = clack.spinner();
    spinner.start(`Generating with ${provider.label}...`);
    try {
      const guidance = args.guidance == null ? undefined : Number(args.guidance);
      const result = await provider.generate(outputPath, {
        prompt,
        width: parsePositiveInt(args.width, "--width"),
        height: parsePositiveInt(args.height, "--height"),
        steps: parsePositiveInt(args.steps, "--steps"),
        guidance: guidance != null && Number.isFinite(guidance) ? guidance : undefined,
        seed: parsePositiveInt(args.seed, "--seed"),
        negativePrompt: args["negative-prompt"] as string | undefined,
        onProgress: (message) => spinner.message(message),
      });
      spinner.stop("Generation complete");
      clack.outro(
        `${c.success("✓")} ${result.width}×${result.height} via ${result.model} → ${c.accent(result.outputPath)}`,
      );
    } catch (err) {
      spinner.stop("Generation failed");
      console.error(
        errorBox("Image generation failed", err instanceof Error ? err.message : String(err)),
      );
      process.exit(1);
    }
  },
});
