import { describe, expect, it } from "vitest";
import { buildEdgeArgs, edgettsProvider, rateFlag } from "./edgetts.js";

describe("rateFlag", () => {
  it("maps the speed multiplier to a signed percentage", () => {
    expect(rateFlag(1.1)).toBe("+10%");
    expect(rateFlag(0.85)).toBe("-15%");
  });

  it("returns null at neutral speed", () => {
    expect(rateFlag(undefined)).toBeNull();
    expect(rateFlag(1.0)).toBeNull();
  });

  it("clamps to ±50%", () => {
    expect(rateFlag(2.5)).toBe("+50%");
    expect(rateFlag(0.1)).toBe("-50%");
  });
});

describe("buildEdgeArgs", () => {
  it("builds the module invocation with voice, text and media path", () => {
    expect(buildEdgeArgs("Bonjour", "fr-FR-HenriNeural", "/tmp/x.mp3", 1.1)).toEqual([
      "-m",
      "edge_tts",
      "--voice",
      "fr-FR-HenriNeural",
      "--text",
      "Bonjour",
      "--write-media",
      "/tmp/x.mp3",
      "--rate=+10%",
    ]);
  });

  it("omits the rate flag at neutral speed", () => {
    expect(buildEdgeArgs("Salut", "fr-FR-DeniseNeural", "/tmp/y.mp3", undefined)).not.toContain(
      "--rate=+0%",
    );
  });
});

describe("edgettsProvider", () => {
  it("exposes the provider contract", () => {
    expect(edgettsProvider.id).toBe("edgetts");
    expect(edgettsProvider.local).toBe(false);
    expect(edgettsProvider.setupHint).toMatch(/edge-tts/);
  });
});
