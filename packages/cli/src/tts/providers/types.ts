/**
 * Pluggable TTS provider contract for `hyperframes tts`.
 *
 * Each provider knows how to (a) report whether it can run right now
 * (credential present / binary installed) and (b) synthesize one text into an
 * audio file. Providers are registered in `./index.js`, which also owns the
 * auto-resolution order used when the user does not pass `--provider`.
 */

export type TtsProviderId = "heygen" | "elevenlabs" | "openai" | "piper" | "kokoro";

export interface TtsWord {
  text: string;
  start: number;
  end: number;
}

export interface TtsProviderResult {
  outputPath: string;
  durationSeconds: number;
  /** Word-level timestamps when the provider returns them natively (HeyGen). */
  words: TtsWord[] | null;
}

export interface TtsProviderOptions {
  voice?: string;
  speed?: number;
  /** BCP-47-ish language hint; providers that cannot honor it ignore it. */
  lang?: string;
  onProgress?: (message: string) => void;
}

export interface TtsAvailability {
  ok: boolean;
  /** Shown when `ok` is false — what is missing and how to fix it. */
  reason?: string;
}

export interface TtsProvider {
  id: TtsProviderId;
  label: string;
  /** Local engine (no account needed) vs cloud provider keyed by credential. */
  local: boolean;
  /** One-line setup hint surfaced by `--list`. */
  setupHint: string;
  availability(): Promise<TtsAvailability>;
  synthesize(
    text: string,
    outputPath: string,
    options: TtsProviderOptions,
  ): Promise<TtsProviderResult>;
}
