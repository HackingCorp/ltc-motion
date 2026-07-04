/**
 * Music provider registry and auto-resolution.
 *
 * `hyperframes music --provider <id>` pins one explicitly; without it the
 * first available provider wins: Lyria when a Gemini key is configured
 * (production quality, ~real-time), else local MusicGen (offline, free).
 */

import { lyriaProvider } from "./lyria.js";
import { musicgenProvider } from "./musicgen.js";
import type { MusicProvider } from "./types.js";

export type { MusicProvider } from "./types.js";

/** Registry in auto-resolution order. */
export const MUSIC_PROVIDERS: readonly MusicProvider[] = [lyriaProvider, musicgenProvider];

export const MUSIC_PROVIDER_IDS = MUSIC_PROVIDERS.map((p) => p.id);

export function getMusicProvider(id: string): MusicProvider | null {
  return MUSIC_PROVIDERS.find((p) => p.id === id) ?? null;
}

/**
 * Pick the provider to use. An explicit id is honored even when not ready
 * (the provider then throws its own actionable error). In auto mode, the
 * first available provider wins; when none is available, the error lists
 * every provider's fix.
 */
export async function resolveMusicProvider(explicit?: string): Promise<MusicProvider> {
  if (explicit && explicit !== "auto") {
    const provider = getMusicProvider(explicit);
    if (!provider) {
      throw new Error(
        `Unknown music provider "${explicit}". Options: auto, ${MUSIC_PROVIDER_IDS.join(", ")}`,
      );
    }
    return provider;
  }

  const reasons: string[] = [];
  for (const provider of MUSIC_PROVIDERS) {
    const status = await provider.availability();
    if (status.ok) return provider;
    reasons.push(`${provider.id}: ${status.reason}`);
  }
  throw new Error(`No music provider is available.\n  ${reasons.join("\n  ")}`);
}
