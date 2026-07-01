import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

// ponytail: bound the write so a hostile/runaway source can't fill the disk.
export const MAX_FREEZE_BYTES = 256 * 1024 * 1024;

export function exceedsFreezeCap(byteLength: number): boolean {
  return byteLength > MAX_FREEZE_BYTES;
}

export function freezeBytes(bytes: Uint8Array, destPath: string): number {
  if (bytes.length === 0) throw new Error("freeze failed: empty bytes");
  if (exceedsFreezeCap(bytes.length))
    throw new Error(`freeze failed: ${bytes.length} bytes exceeds ${MAX_FREEZE_BYTES} cap`);
  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, bytes);
  return bytes.length;
}

export async function freezeUrl(url: string, destPath: string): Promise<number> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`freeze failed: HTTP ${res.status}`);
  return freezeBytes(new Uint8Array(await res.arrayBuffer()), destPath);
}

export function freezeLocalFile(srcPath: string, destPath: string): void {
  mkdirSync(dirname(destPath), { recursive: true });
  copyFileSync(srcPath, destPath);
}
