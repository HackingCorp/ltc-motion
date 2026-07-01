// @vitest-environment node
import { describe, expect, it, afterEach } from "vitest";
import { appendFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendRecord, findByFigmaNode, manifestPath, nextId, readManifest } from "./manifest";
import type { FigmaManifestRecord } from "./types";

const dirs: string[] = [];
function project(): string {
  const d = mkdtempSync(join(tmpdir(), "hf-manifest-"));
  dirs.push(d);
  return d;
}
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function rec(id: string, nodeId: string): FigmaManifestRecord {
  return {
    id,
    type: "image",
    path: `.media/images/${id}.png`,
    source: "figma",
    provenance: { source: "figma", fileKey: "FK", nodeId, format: "png" },
  };
}

describe("manifest", () => {
  it("appends and reads back records", () => {
    const p = project();
    appendRecord(p, rec("image_001", "1:2"));
    appendRecord(p, rec("image_002", "3:4"));
    const all = readManifest(p);
    expect(all.map((r) => r.id)).toEqual(["image_001", "image_002"]);
    expect(all[1]?.provenance.nodeId).toBe("3:4");
  });

  it("finds a record by figma node", () => {
    const p = project();
    appendRecord(p, rec("image_001", "1:2"));
    expect(findByFigmaNode(p, "FK", "1:2")?.id).toBe("image_001");
    expect(findByFigmaNode(p, "FK", "9:9")).toBeNull();
  });

  it("allocates incrementing ids per type", () => {
    const p = project();
    expect(nextId(p, "image")).toBe("image_001");
    appendRecord(p, rec("image_001", "1:2"));
    expect(nextId(p, "image")).toBe("image_002");
  });

  it("skips a manifest line that doesn't match the record shape", () => {
    const p = project();
    appendRecord(p, rec("image_001", "1:2"));
    appendFileSync(manifestPath(p), JSON.stringify({ foo: "bar" }) + "\n");
    appendRecord(p, rec("image_002", "3:4"));
    expect(readManifest(p).map((r) => r.id)).toEqual(["image_001", "image_002"]);
  });
});
