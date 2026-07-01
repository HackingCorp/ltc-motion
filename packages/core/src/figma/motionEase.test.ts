// @vitest-environment node
import { describe, expect, it } from "vitest";
import { mapEase } from "./motionEase";

describe("mapEase", () => {
  it("maps linear to none", () => {
    expect(mapEase("linear")).toEqual({ kind: "named", ease: "none" });
  });
  it("maps a bezier array through unchanged", () => {
    expect(mapEase([0.539, 0, 0.312, 0.995])).toEqual({
      kind: "bezier",
      bezier: [0.539, 0, 0.312, 0.995],
    });
  });
  it("maps named eases to GSAP equivalents (case/format insensitive)", () => {
    expect(mapEase("easeOut")).toEqual({ kind: "named", ease: "power2.out" });
    expect(mapEase("EASE_IN_AND_OUT")).toEqual({
      kind: "named",
      ease: "power2.inOut",
    });
    expect(mapEase("backOut")).toEqual({ kind: "named", ease: "back.out" });
    expect(mapEase("HOLD")).toEqual({ kind: "named", ease: "steps(1)" });
  });
  it("falls back to none for unknown named eases", () => {
    expect(mapEase("wobble")).toEqual({ kind: "named", ease: "none" });
  });
});
