import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MUSIC_PROVIDERS,
  MUSIC_PROVIDER_IDS,
  getMusicProvider,
  resolveMusicProvider,
} from "./index.js";
import { buildLyriaParams, lyriaKey } from "./lyria.js";
import { musicgenPrompt } from "./musicgen.js";

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = {};
  for (const key of ["GEMINI_API_KEY", "GOOGLE_API_KEY"]) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("registry", () => {
  it("registers lyria before musicgen", () => {
    expect(MUSIC_PROVIDER_IDS).toEqual(["lyria", "musicgen"]);
  });

  it("every provider has a label and setup hint", () => {
    for (const provider of MUSIC_PROVIDERS) {
      expect(provider.label.length).toBeGreaterThan(0);
      expect(provider.setupHint.length).toBeGreaterThan(0);
    }
  });

  it("getMusicProvider finds by id and returns null otherwise", () => {
    expect(getMusicProvider("musicgen")?.id).toBe("musicgen");
    expect(getMusicProvider("nope")).toBeNull();
  });
});

describe("resolveMusicProvider", () => {
  it("throws on an unknown explicit provider", async () => {
    await expect(resolveMusicProvider("bogus")).rejects.toThrow(/Unknown music provider/);
  });

  it("honors an explicit provider even when it is not configured", async () => {
    const provider = await resolveMusicProvider("lyria");
    expect(provider.id).toBe("lyria");
  });

  it("picks lyria in auto mode when a Gemini key is set", async () => {
    process.env["GEMINI_API_KEY"] = "test-key";
    const provider = await resolveMusicProvider();
    expect(provider.id).toBe("lyria");
  });

  it("accepts GOOGLE_API_KEY as an alias", () => {
    process.env["GOOGLE_API_KEY"] = "alias-key";
    expect(lyriaKey()).toBe("alias-key");
  });
});

describe("buildLyriaParams", () => {
  it("maps options with sensible defaults", () => {
    expect(
      buildLyriaParams("/tmp/track.wav", { prompt: "calm piano", durationSeconds: 18 }),
    ).toEqual({
      output: "/tmp/track.wav",
      duration: 18,
      prompt: "calm piano",
      bpm: 110,
      brightness: 0.8,
      density: 0.5,
      scale: "MAJOR",
      negative_prompt: null,
    });
  });

  it("passes explicit knobs through", () => {
    const params = buildLyriaParams("/tmp/x.wav", {
      prompt: "epic",
      durationSeconds: 30,
      bpm: 130,
      brightness: 0.7,
      density: 0.8,
      scale: "MINOR",
      negativePrompt: "vocals",
    });
    expect(params["bpm"]).toBe(130);
    expect(params["scale"]).toBe("MINOR");
    expect(params["negative_prompt"]).toBe("vocals");
  });
});

describe("musicgenPrompt", () => {
  it("bakes the bpm hint into the prompt", () => {
    expect(musicgenPrompt({ prompt: "warm guitars", durationSeconds: 18, bpm: 105 })).toBe(
      "warm guitars, 105 bpm",
    );
  });

  it("leaves the prompt alone when bpm is absent or already present", () => {
    expect(musicgenPrompt({ prompt: "warm guitars", durationSeconds: 18 })).toBe("warm guitars");
    expect(musicgenPrompt({ prompt: "jazzy trio, 92 bpm", durationSeconds: 18, bpm: 120 })).toBe(
      "jazzy trio, 92 bpm",
    );
  });
});
