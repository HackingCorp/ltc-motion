// @vitest-environment node
import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exceedsFreezeCap, freezeBytes, MAX_FREEZE_BYTES } from "./freeze";

const dirs: string[] = [];
function scratch(): string {
  const d = mkdtempSync(join(tmpdir(), "hf-freeze-"));
  dirs.push(d);
  return d;
}
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe("exceedsFreezeCap", () => {
  it("is false at and under the cap, true just over it", () => {
    expect(exceedsFreezeCap(MAX_FREEZE_BYTES)).toBe(false);
    expect(exceedsFreezeCap(MAX_FREEZE_BYTES + 1)).toBe(true);
  });
});

describe("freezeBytes", () => {
  it("writes bytes to a nested path and returns the length", () => {
    const dest = join(scratch(), "images", "a.png");
    const bytes = new Uint8Array([1, 2, 3, 4]);
    expect(freezeBytes(bytes, dest)).toBe(4);
    expect(Array.from(readFileSync(dest))).toEqual([1, 2, 3, 4]);
  });

  it("throws on empty bytes", () => {
    expect(() => freezeBytes(new Uint8Array(0), join(scratch(), "x"))).toThrow();
  });
});
