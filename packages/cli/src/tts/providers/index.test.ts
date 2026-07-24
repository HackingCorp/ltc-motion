import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  TTS_PROVIDERS,
  TTS_PROVIDER_IDS,
  getProvider,
  isProviderId,
  resolveProvider,
} from "./index.js";

const CLOUD_ENV_KEYS = [
  "HEYGEN_API_KEY",
  "HYPERFRAMES_API_KEY",
  "ELEVENLABS_API_KEY",
  "OPENAI_API_KEY",
  "FISH_SPEECH_URL",
  "FISH_SPEECH_VOICE",
  "PIPER_VOICE",
];

let savedEnv: Record<string, string | undefined>;
let emptyConfigDir: string;

beforeEach(() => {
  savedEnv = {};
  for (const key of [...CLOUD_ENV_KEYS, "HEYGEN_CONFIG_DIR"]) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
  // Point the HeyGen credential store at an empty directory so a developer's
  // real ~/.heygen login cannot leak into the resolution assertions.
  emptyConfigDir = mkdtempSync(join(tmpdir(), "hyperframes-tts-test-"));
  process.env["HEYGEN_CONFIG_DIR"] = emptyConfigDir;
  // Port 1 is never listening — keeps the fishspeech health probe from
  // accidentally hitting a real local server during auto-resolution tests.
  process.env["FISH_SPEECH_URL"] = "http://127.0.0.1:1";
  // edgetts availability depends on the machine's python3 — exclude it from
  // auto-resolution so these assertions stay environment-independent.
  process.env["HYPERFRAMES_TTS_SKIP"] = "edgetts";
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  rmSync(emptyConfigDir, { recursive: true, force: true });
});

describe("registry", () => {
  it("registers the nine providers in auto-resolution order", () => {
    expect(TTS_PROVIDER_IDS).toEqual([
      "heygen",
      "elevenlabs",
      "openai",
      "edgetts",
      "fishspeech",
      "chatterbox",
      "qwen3tts",
      "piper",
      "kokoro",
    ]);
  });

  it("every provider has a label and setup hint", () => {
    for (const provider of TTS_PROVIDERS) {
      expect(provider.label.length).toBeGreaterThan(0);
      expect(provider.setupHint.length).toBeGreaterThan(0);
    }
  });

  it("getProvider finds by id and returns null otherwise", () => {
    expect(getProvider("elevenlabs")?.id).toBe("elevenlabs");
    expect(getProvider("nope")).toBeNull();
  });

  it("isProviderId narrows known ids", () => {
    expect(isProviderId("openai")).toBe(true);
    expect(isProviderId("auto")).toBe(false);
  });
});

describe("resolveProvider", () => {
  it("throws on an unknown explicit provider", async () => {
    await expect(resolveProvider("bogus")).rejects.toThrow(/Unknown TTS provider/);
  });

  it("honors an explicit provider even when it is not configured", async () => {
    const provider = await resolveProvider("elevenlabs");
    expect(provider.id).toBe("elevenlabs");
  });

  it("falls back to kokoro when nothing is configured", async () => {
    const provider = await resolveProvider();
    expect(provider.id).toBe("kokoro");
  });

  it("treats auto like the default resolution", async () => {
    const provider = await resolveProvider("auto");
    expect(provider.id).toBe("kokoro");
  });

  it("picks elevenlabs in auto mode when only its key is set", async () => {
    process.env["ELEVENLABS_API_KEY"] = "test-key";
    const provider = await resolveProvider();
    expect(provider.id).toBe("elevenlabs");
  });

  it("picks openai in auto mode when only its key is set", async () => {
    process.env["OPENAI_API_KEY"] = "test-key";
    const provider = await resolveProvider();
    expect(provider.id).toBe("openai");
  });

  it("prefers heygen over other cloud providers", async () => {
    process.env["HEYGEN_API_KEY"] = "test-key";
    process.env["ELEVENLABS_API_KEY"] = "test-key";
    process.env["OPENAI_API_KEY"] = "test-key";
    const provider = await resolveProvider();
    expect(provider.id).toBe("heygen");
  });

  it("prefers elevenlabs over openai when both are set", async () => {
    process.env["ELEVENLABS_API_KEY"] = "test-key";
    process.env["OPENAI_API_KEY"] = "test-key";
    const provider = await resolveProvider();
    expect(provider.id).toBe("elevenlabs");
  });

  it("skips piper in auto mode when PIPER_VOICE is not set", async () => {
    const provider = await resolveProvider();
    expect(provider.id).not.toBe("piper");
  });

  it("picks fishspeech in auto mode when its local server responds", async () => {
    process.env["FISH_SPEECH_URL"] = "http://fish.test:8080";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 200 })),
    );
    const provider = await resolveProvider();
    expect(provider.id).toBe("fishspeech");
  });

  it("prefers cloud credentials over a running fishspeech server", async () => {
    process.env["ELEVENLABS_API_KEY"] = "test-key";
    process.env["FISH_SPEECH_URL"] = "http://fish.test:8080";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 200 })),
    );
    const provider = await resolveProvider();
    expect(provider.id).toBe("elevenlabs");
  });
});
