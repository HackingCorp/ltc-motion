import { existsSync, readFileSync } from "node:fs";

/** Parse a .jsonl file into values, skipping blank/malformed lines. */
export function readJsonlValues(path: string): unknown[] {
  if (!existsSync(path)) return [];
  const out: unknown[] = [];
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    try {
      out.push(JSON.parse(trimmed));
    } catch {
      // ponytail: skip malformed lines, don't crash the whole read
    }
  }
  return out;
}
