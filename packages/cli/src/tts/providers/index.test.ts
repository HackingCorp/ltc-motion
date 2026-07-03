import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
});

afterEach(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  rmSync(emptyConfigDir, { recursive: true, force: true });
});

describe("registry", () => {
  it("registers the five providers in auto-resolution order", () => {
    expect(TTS_PROVIDER_IDS).toEqual(["heygen", "elevenlabs", "openai", "piper", "kokoro"]);
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
});
