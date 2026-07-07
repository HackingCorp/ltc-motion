/**
 * Image provider registry and auto-resolution.
 *
 * Both providers run on the generic RunPod worker in
 * ltc-tts-server/runpod-image; auto mode prefers zimage (fast, ~cents)
 * and falls back to qwenimage (heavier, best in-image text rendering).
 */

import { makeRunpodImageProvider } from "./runpod-image.js";
import type { ImageProvider } from "./types.js";

export type { ImageProvider } from "./types.js";

export const zimageProvider = makeRunpodImageProvider({
  id: "zimage",
  label: "Z-Image-Turbo (Apache 2.0, fast)",
  endpointEnv: "ZIMAGE_RUNPOD_ENDPOINT",
  setupHint:
    "Deploy ltc-tts-server/runpod-image with IMAGE_MODEL_ID=Tongyi-MAI/Z-Image-Turbo (GPU 24GB), then set ZIMAGE_RUNPOD_ENDPOINT + RUNPOD_API_KEY",
});

const qwenimageProvider = makeRunpodImageProvider({
  id: "qwenimage",
  label: "Qwen-Image 2512 (Apache 2.0, best in-image text)",
  endpointEnv: "QWEN_IMAGE_RUNPOD_ENDPOINT",
  setupHint:
    "Deploy ltc-tts-server/runpod-image with IMAGE_MODEL_ID=Qwen/Qwen-Image-2512 (GPU 48GB), then set QWEN_IMAGE_RUNPOD_ENDPOINT + RUNPOD_API_KEY",
});

/** Registry in auto-resolution order. */
export const IMAGE_PROVIDERS: readonly ImageProvider[] = [zimageProvider, qwenimageProvider];

export const IMAGE_PROVIDER_IDS = IMAGE_PROVIDERS.map((p) => p.id);

export function getImageProvider(id: string): ImageProvider | null {
  return IMAGE_PROVIDERS.find((p) => p.id === id) ?? null;
}

export async function resolveImageProvider(explicit?: string): Promise<ImageProvider> {
  if (explicit && explicit !== "auto") {
    const provider = getImageProvider(explicit);
    if (!provider) {
      throw new Error(
        `Unknown image provider "${explicit}". Options: auto, ${IMAGE_PROVIDER_IDS.join(", ")}`,
      );
    }
    return provider;
  }

  const reasons: string[] = [];
  for (const provider of IMAGE_PROVIDERS) {
    const status = await provider.availability();
    if (status.ok) return provider;
    reasons.push(`${provider.id}: ${status.reason}`);
  }
  throw new Error(`No image provider is available.\n  ${reasons.join("\n  ")}`);
}
