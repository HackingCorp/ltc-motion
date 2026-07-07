/**
 * Pluggable image-generation provider contract for `hyperframes image`.
 * Same shape as the TTS/music providers; registered in `./index.js`.
 */

export type ImageProviderId = "zimage" | "qwenimage";

export interface ImageProviderOptions {
  prompt: string;
  width?: number;
  height?: number;
  /** Inference steps — defaults are per-provider (8 turbo / 40 quality). */
  steps?: number;
  guidance?: number;
  seed?: number;
  negativePrompt?: string;
  onProgress?: (message: string) => void;
}

export interface ImageProviderResult {
  outputPath: string;
  width: number;
  height: number;
  model: string;
}

export interface ImageAvailability {
  ok: boolean;
  reason?: string;
}

export interface ImageProvider {
  id: ImageProviderId;
  label: string;
  local: boolean;
  setupHint: string;
  availability(): Promise<ImageAvailability>;
  generate(outputPath: string, options: ImageProviderOptions): Promise<ImageProviderResult>;
}
