/**
 * Pluggable original-music provider contract for `hyperframes music`.
 *
 * Same shape as the TTS providers: each provider reports whether it can run
 * right now and generates one music bed from a mood prompt. Registered in
 * `./index.js`, which owns the auto-resolution order (`--provider auto`).
 */

export type MusicProviderId = "lyria" | "musicgen";

export interface MusicProviderOptions {
  prompt: string;
  durationSeconds: number;
  /** Tempo hint. Lyria honors it natively; MusicGen reads it from the prompt. */
  bpm?: number;
  /** Lyria only — 0-1, higher = brighter mood. */
  brightness?: number;
  /** Lyria only — 0-1, higher = fuller mix. */
  density?: number;
  /** Lyria only — MAJOR / MINOR / PENTATONIC / … */
  scale?: string;
  /** Lyria only — styles to steer away from. */
  negativePrompt?: string;
  onProgress?: (message: string) => void;
}

export interface MusicProviderResult {
  outputPath: string;
  durationSeconds: number;
}

export interface MusicAvailability {
  ok: boolean;
  /** Shown when `ok` is false — what is missing and how to fix it. */
  reason?: string;
}

export interface MusicProvider {
  id: MusicProviderId;
  label: string;
  /** Fully local engine vs cloud service keyed by credential. */
  local: boolean;
  /** One-line setup hint surfaced by `--list`. */
  setupHint: string;
  availability(): Promise<MusicAvailability>;
  generate(outputPath: string, options: MusicProviderOptions): Promise<MusicProviderResult>;
}
