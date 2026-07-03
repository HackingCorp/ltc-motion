// fallow-ignore-file code-duplication
import { execFileSync } from "child_process";
import { existsSync } from "fs";
import { resolve } from "path";

export const FFMPEG_PATH_ENV = "HYPERFRAMES_FFMPEG_PATH";
export const FFPROBE_PATH_ENV = "HYPERFRAMES_FFPROBE_PATH";

const pathCache = new Map<string, string | undefined>();

function findOnPath(name: "ffmpeg" | "ffprobe"): string | undefined {
  if (pathCache.has(name)) return pathCache.get(name);
  try {
    const command = process.platform === "win32" ? "where" : "which";
    const output = execFileSync(command, [name], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 5000,
    });
    const first = output
      .split(/\r?\n/)
      .map((s) => s.trim())
      .find(Boolean);
    const resolved = first ? resolve(first) : undefined;
    pathCache.set(name, resolved);
    return resolved;
  } catch {
    pathCache.set(name, undefined);
    return undefined;
  }
}

function getConfiguredBinary(envName: string, binaryName: "ffmpeg" | "ffprobe"): string {
  const configured = process.env[envName]?.trim();
  if (configured) return resolve(configured);
  return findOnPath(binaryName) ?? binaryName;
}

export function getFfmpegBinary(): string {
  return getConfiguredBinary(FFMPEG_PATH_ENV, "ffmpeg");
}

export function getFfprobeBinary(): string {
  return getConfiguredBinary(FFPROBE_PATH_ENV, "ffprobe");
}

// A literal U+FFFD in a configured path is never a real path component — it's
// the Unicode replacement character, which only appears when some layer
// (shell, subprocess env passthrough, code page mismatch) failed to decode a
// non-ASCII character in the original path. Windows installer link paths
// (e.g. WinGet Links) commonly contain accented characters, so this is the
// single most useful diagnostic to surface before the generic "not found".
function mangledPathHint(path: string): string {
  if (!path.includes("�")) return "";
  return (
    ` This path contains a "�" (Unicode replacement character), which means a ` +
    "non-ASCII character in the real path got mangled before reaching this process " +
    "— common with accented characters in Windows install paths. Try the short " +
    '8.3 path (e.g. via `for %I in ("<path>") do @echo %~sI`) or move the binary ' +
    "to an ASCII-only path."
  );
}

export function assertConfiguredFfmpegBinariesExist(): void {
  const ffmpegPath = process.env[FFMPEG_PATH_ENV]?.trim();
  if (ffmpegPath && !existsSync(ffmpegPath)) {
    throw new Error(
      `[FFmpeg] FFmpeg binary not found at ${FFMPEG_PATH_ENV}="${ffmpegPath}".` +
        mangledPathHint(ffmpegPath) +
        " Install FFmpeg or unset the override.",
    );
  }

  const ffprobePath = process.env[FFPROBE_PATH_ENV]?.trim();
  if (ffprobePath && !existsSync(ffprobePath)) {
    throw new Error(
      `[FFmpeg] FFprobe binary not found at ${FFPROBE_PATH_ENV}="${ffprobePath}".` +
        mangledPathHint(ffprobePath) +
        " Install FFmpeg or unset the override.",
    );
  }
}
