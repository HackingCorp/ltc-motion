import { describe, expect, it } from "vitest";
import { createStudioPositionSeekReapplyScript } from "./manualEditsRenderScript";

describe("createStudioPositionSeekReapplyScript", () => {
  it("returns a non-empty IIFE string", () => {
    const script = createStudioPositionSeekReapplyScript();
    expect(typeof script).toBe("string");
    expect(script.length).toBeGreaterThan(0);
    expect(script).toContain("studioPositionSeekReapplyRuntime");
  });

  it("contains the expected data attribute selectors", () => {
    const script = createStudioPositionSeekReapplyScript();
    expect(script).toContain("data-hf-studio-path-offset");
    expect(script).toContain("data-hf-studio-rotation");
  });
});
