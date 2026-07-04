/**
 * TTS provider registry and auto-resolution.
 *
 * Order mirrors the hyperframes-media skill's engine (HeyGen → ElevenLabs →
 * local), extended with OpenAI between the cloud providers, Fish Speech when
 * its local server is up (a running server is a strong signal of intent),
 * then Piper before Kokoro when a $PIPER_VOICE is configured.
 * `hyperframes tts --provider <id>` pins one explicitly; without it the
 * first available provider wins, so a configured HeyGen or ElevenLabs
 * credential is no longer silently ignored.
 */

import { heygenProvider } from "./heygen.js";
import { elevenlabsProvider } from "./elevenlabs.js";
import { openaiProvider } from "./openai.js";
import { fishspeechProvider } from "./fishspeech.js";
import { piperProvider } from "./piper.js";
import { kokoroProvider } from "./kokoro.js";
import type { TtsProvider, TtsProviderId } from "./types.js";

export type { TtsProvider, TtsProviderId } from "./types.js";

/** Registry in auto-resolution order. */
export const TTS_PROVIDERS: readonly TtsProvider[] = [
  heygenProvider,
  elevenlabsProvider,
  openaiProvider,
  fishspeechProvider,
  piperProvider,
  kokoroProvider,
];

export const TTS_PROVIDER_IDS = TTS_PROVIDERS.map((p) => p.id);

export function getProvider(id: string): TtsProvider | null {
  return TTS_PROVIDERS.find((p) => p.id === id) ?? null;
}

export function isProviderId(id: string): id is TtsProviderId {
  return TTS_PROVIDERS.some((p) => p.id === id);
}

/**
 * Pick the provider to use. An explicit id is honored even when not ready
 * (the provider then throws its own actionable error). In auto mode, the
 * first available provider wins; Piper participates only when $PIPER_VOICE
 * points at a model (otherwise it cannot pick a voice unattended). Kokoro is
 * the final fallback, matching the CLI's historical behavior.
 */
export async function resolveProvider(explicit?: string): Promise<TtsProvider> {
  if (explicit && explicit !== "auto") {
    const provider = getProvider(explicit);
    if (!provider) {
      throw new Error(
        `Unknown TTS provider "${explicit}". Options: auto, ${TTS_PROVIDER_IDS.join(", ")}`,
      );
    }
    return provider;
  }

  for (const provider of TTS_PROVIDERS) {
    if (provider.id === "kokoro") break; // final fallback, checked below
    if (provider.id === "piper" && !process.env["PIPER_VOICE"]) continue;
    const status = await provider.availability();
    if (status.ok) return provider;
  }
  return kokoroProvider;
}
