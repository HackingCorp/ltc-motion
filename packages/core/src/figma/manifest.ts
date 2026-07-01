import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { FigmaManifestRecord } from "./types";

const MANIFEST_FILE = "manifest.jsonl";

// Mirrors the media-use `.media/` layout for interop (one shared inventory).
const TYPE_DIRS: Record<FigmaManifestRecord["type"], string> = {
  image: "images",
  video: "video",
};

export function mediaDir(projectDir: string): string {
  return join(projectDir, ".media");
}

export function manifestPath(projectDir: string): string {
  return join(mediaDir(projectDir), MANIFEST_FILE);
}

export function typeDirPath(projectDir: string, type: FigmaManifestRecord["type"]): string {
  return join(mediaDir(projectDir), TYPE_DIRS[type]);
}

export function isFigmaManifestRecord(value: unknown): value is FigmaManifestRecord {
  if (typeof value !== "object" || value === null) return false;
  if (!("id" in value) || !("type" in value) || !("path" in value) || !("source" in value))
    return false;
  if (
    typeof value.id !== "string" ||
    typeof value.type !== "string" ||
    typeof value.path !== "string"
  )
    return false;
  if (typeof value.source !== "string") return false;
  if (!("provenance" in value)) return false;

  const provenance = value.provenance;
  if (typeof provenance !== "object" || provenance === null) return false;
  if (!("source" in provenance) || !("fileKey" in provenance) || !("nodeId" in provenance))
    return false;
  return (
    provenance.source === "figma" &&
    typeof provenance.fileKey === "string" &&
    typeof provenance.nodeId === "string"
  );
}

export function readManifest(projectDir: string): FigmaManifestRecord[] {
  const p = manifestPath(projectDir);
  if (!existsSync(p)) return [];
  const out: FigmaManifestRecord[] = [];
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (isFigmaManifestRecord(parsed)) out.push(parsed);
    } catch {
      // ponytail: skip malformed/non-matching lines, don't crash the whole read
    }
  }
  return out;
}

export function appendRecord(projectDir: string, record: FigmaManifestRecord): void {
  mkdirSync(typeDirPath(projectDir, record.type), { recursive: true });
  appendFileSync(manifestPath(projectDir), JSON.stringify(record) + "\n");
}

export function findByFigmaNode(
  projectDir: string,
  fileKey: string,
  nodeId: string,
): FigmaManifestRecord | null {
  for (const r of readManifest(projectDir)) {
    if (
      r.provenance.source === "figma" &&
      r.provenance.fileKey === fileKey &&
      r.provenance.nodeId === nodeId
    )
      return r;
  }
  return null;
}

export function nextId(projectDir: string, type: FigmaManifestRecord["type"]): string {
  const re = new RegExp(`^${type}_(\\d+)$`);
  let max = 0;
  for (const r of readManifest(projectDir)) {
    if (r.type !== type) continue;
    const m = r.id.match(re);
    const n = m?.[1];
    if (n !== undefined) max = Math.max(max, Number.parseInt(n, 10));
  }
  return `${type}_${String(max + 1).padStart(3, "0")}`;
}
