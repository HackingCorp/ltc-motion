import { defineCommand } from "citty";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join, basename } from "node:path";
import { c } from "../ui/colors.js";
import { safeFetch } from "../capture/assetDownloader.js";
import type { Example } from "./_examples.js";

export const examples: Example[] = [
  [
    "Download the hero video (index 0) from a captured project's manifest",
    "capture-video ./my-project --index 0",
  ],
  [
    "Download a specific video by exact URL",
    "capture-video ./my-project --url https://cdn.example.com/hero.mp4",
  ],
  ["List entries in the manifest without downloading", "capture-video ./my-project --list"],
];

/**
 * The capture pipeline writes capture/extracted/video-manifest.json listing
 * every <video> element on the source page (URL, dimensions, heading, caption,
 * preview PNG) but deliberately does NOT download the mp4s — sites with
 * dozens of feature videos would balloon the capture size to hundreds of MB.
 *
 * This command lets agents pull just the ONE video a beat needs (e.g.
 * heygen.com's "Orb" hero animation at index 0) on demand. The downloaded
 * file lands at capture/assets/videos/<filename-from-manifest> so beat
 * compositions can reference it as `capture/assets/videos/<filename>` —
 * same pattern as the captured SVGs and rasters.
 */

/** Max video size (250 MB) — a long social/marketing reel rarely exceeds 50 MB
 * but allow headroom for higher-quality masters. Anything above this is almost
 * certainly a misconfigured manifest URL pointing at the wrong asset.
 */
const MAX_VIDEO_BYTES = 250 * 1024 * 1024;

/** Whitelist of content-types we accept. Anything else (XML/HTML error pages,
 * tracking pixels, JSON, etc.) means the URL didn't actually point at a video.
 */
const VIDEO_CONTENT_TYPE_RE = /^(video\/|application\/(mp4|octet-stream|x-mpegurl))/i;

// fallow-ignore-next-line complexity
async function fetchToBuffer(url: string): Promise<Buffer> {
  // safeFetch enforces SSRF protection (rejects private/metadata hosts AND
  // re-validates on every redirect hop — a bare redirect:"follow" only checks
  // the initial URL, so a public URL can 30x to 169.254.169.254 etc.).
  const r = await safeFetch(url, {
    signal: AbortSignal.timeout(120_000),
    headers: { "User-Agent": "HyperFrames/1.0" },
  });
  if (!r) {
    throw new Error(
      `fetch blocked or failed (private/metadata host, redirect chain, or network error): ${url}`,
    );
  }
  if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText} for ${url}`);
  const ct = r.headers.get("content-type") || "";
  if (!VIDEO_CONTENT_TYPE_RE.test(ct)) {
    throw new Error(
      `unexpected content-type "${ct}" for ${url} — expected video/*. The URL probably doesn't point at a real video file.`,
    );
  }
  const cl = r.headers.get("content-length");
  if (cl && Number(cl) > MAX_VIDEO_BYTES) {
    throw new Error(
      `video too large (${Math.round(Number(cl) / 1024 / 1024)}MB > ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)}MB cap) for ${url}`,
    );
  }
  const ab = await r.arrayBuffer();
  if (ab.byteLength > MAX_VIDEO_BYTES) {
    throw new Error(
      `video body exceeds ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)}MB cap (got ${Math.round(ab.byteLength / 1024 / 1024)}MB) for ${url}`,
    );
  }
  return Buffer.from(ab);
}

export function safeFilename(name: string): string {
  // Manifest filenames sometimes carry URL-encoded chars (e.g.
  // "Frame-2147227325%20(1).mp4"). Decode and replace anything that
  // could be hostile on disk while keeping the extension intact.
  let decoded = name;
  try {
    decoded = decodeURIComponent(name);
  } catch {
    /* keep raw */
  }
  return decoded.replace(/[^A-Za-z0-9._-]+/g, "_");
}

/** Exported for tests — matches the content types a real video URL returns. */
export { VIDEO_CONTENT_TYPE_RE, MAX_VIDEO_BYTES };

export interface ManifestEntry {
  index: number;
  url: string;
  filename: string;
  width: number;
  height: number;
  heading: string;
  caption: string;
  ariaLabel: string;
  preview: string;
}

export type PickResult =
  | { ok: true; entry: ManifestEntry }
  | {
      ok: false;
      code: "no-selector" | "bad-index" | "no-match-index" | "no-match-url";
      message: string;
    };

/**
 * Pick a manifest entry from `--index N` or `--url URL`. Looks up by the
 * entry's own `index` field (NOT array offset — `captureVideoManifest` can
 * skip videos whose preview screenshot fails, leaving gaps in `index`).
 */
export function pickManifestEntry(
  manifest: ManifestEntry[],
  args: { index?: string | number | null; url?: string | null },
): PickResult {
  if (args.index != null) {
    const i = Number(args.index);
    if (!Number.isInteger(i) || i < 0) {
      return {
        ok: false,
        code: "bad-index",
        message: `--index ${args.index} must be a non-negative integer`,
      };
    }
    const found = manifest.find((e) => e.index === i);
    if (!found) {
      const available = manifest.map((e) => e.index).join(", ");
      return {
        ok: false,
        code: "no-match-index",
        message: `no manifest entry with index=${i} (available: ${available || "none"})`,
      };
    }
    return { ok: true, entry: found };
  }
  if (args.url != null) {
    const found = manifest.find((e) => e.url === args.url);
    if (!found) {
      return { ok: false, code: "no-match-url", message: `no manifest entry with url=${args.url}` };
    }
    return { ok: true, entry: found };
  }
  return {
    ok: false,
    code: "no-selector",
    message: "specify --index <N> or --url <URL> (or --list to see what's in the manifest)",
  };
}

export default defineCommand({
  meta: {
    name: "capture-video",
    description:
      "Download a video referenced in capture/extracted/video-manifest.json (on-demand; the capture pipeline only writes the manifest + preview PNGs)",
  },
  args: {
    project: {
      type: "positional",
      description: "Path to the captured project directory",
      required: true,
    },
    index: {
      type: "string",
      description: "Manifest entry index to download (0-based)",
    },
    url: {
      type: "string",
      description: "Exact video URL to download (must match a manifest entry)",
    },
    list: {
      type: "boolean",
      description: "List manifest entries (index, dimensions, heading) and exit",
    },
  },
  // CLI orchestrator: arg parsing + manifest layout detection + lookup + download
  // + snippet output + error paths. Cyclomatic count is intrinsic to the surface,
  // not accidental complexity.
  // fallow-ignore-next-line complexity
  async run({ args }) {
    const projectDir = resolve(String(args.project));
    // `hyperframes capture <url> --output <dir>` writes <dir>/extracted/...
    // A W2H project nests its capture output under <project>/capture/extracted/... instead.
    // Accept both so this command works on either layout without the user juggling subdirs.
    const directPath = join(projectDir, "extracted", "video-manifest.json");
    const w2hPath = join(projectDir, "capture", "extracted", "video-manifest.json");
    const manifestPath = existsSync(directPath) ? directPath : w2hPath;
    const isW2hLayout = manifestPath === w2hPath;
    if (!existsSync(manifestPath)) {
      console.error(
        `${c.error("✗")} no video-manifest.json at ${directPath} or ${w2hPath}\n` +
          `  Was this directory produced by \`hyperframes capture\`?`,
      );
      process.exitCode = 1;
      return;
    }
    let manifest: ManifestEntry[];
    try {
      manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    } catch (e) {
      console.error(`${c.error("✗")} video-manifest.json is malformed: ${(e as Error).message}`);
      process.exitCode = 1;
      return;
    }

    if (args.list) {
      if (manifest.length === 0) {
        console.log(c.dim("(manifest is empty — no <video> elements on the captured page)"));
        return;
      }
      console.log(
        `${manifest.length} video entr${manifest.length === 1 ? "y" : "ies"} in ${manifestPath}:`,
      );
      for (const e of manifest) {
        console.log(
          `  ${c.bold(`[${e.index}]`)} ${e.filename} — ${e.width}×${e.height}` +
            (e.heading ? `\n      heading: "${e.heading}"` : "") +
            `\n      url: ${e.url}`,
        );
      }
      return;
    }

    const pick = pickManifestEntry(manifest, args);
    if (!pick.ok) {
      console.error(
        `${c.error("✗")} ${pick.message}` +
          (pick.code === "no-match-url" ? `\n  Run with --list to see what's available.` : ""),
      );
      process.exitCode = 1;
      return;
    }
    const entry = pick.entry;

    // Match the layout detected from where the manifest was found.
    const outDir = isW2hLayout
      ? join(projectDir, "capture", "assets", "videos")
      : join(projectDir, "assets", "videos");
    mkdirSync(outDir, { recursive: true });
    const fname = safeFilename(entry.filename || basename(entry.url));
    const outPath = join(outDir, fname);
    const relPath = isW2hLayout ? `capture/assets/videos/${fname}` : `assets/videos/${fname}`;

    // No upstream existsSync precheck — that's a TOCTOU race source by
    // construction (CodeQL js/file-system-race). The atomic exclusive
    // create below is the single source of truth for "already downloaded?"
    // and "create new file" — there is no gap for another process to win.
    console.log(
      `${c.accent("▸")} downloading [${entry.index}] ${entry.filename} (${entry.width}×${entry.height})`,
    );
    console.log(`     from: ${entry.url}`);
    try {
      const buf = await fetchToBuffer(entry.url);
      // `flag: "wx"` = exclusive create: throws EEXIST if outPath exists.
      // Race-free check-and-create in one syscall.
      try {
        writeFileSync(outPath, buf, { flag: "wx" });
      } catch (writeErr) {
        if ((writeErr as NodeJS.ErrnoException).code === "EEXIST") {
          console.log(`${c.warn("⚠")}  already downloaded: ${relPath} (skipping)`);
          console.log(`     Delete the file and re-run to refetch.`);
          return;
        }
        throw writeErr;
      }
      const sizeKb = Math.round(buf.length / 1024);
      const sizeStr = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)}MB` : `${sizeKb}KB`;
      console.log(`${c.success("◇")}  wrote ${relPath} (${sizeStr})`);
      // `id` is required by the media lint rule (`media_missing_id`) and the
      // producer's media discovery; without one the video renders frozen.
      const snippetId = `video-${entry.index}`;
      console.log(
        `     Reference it from a beat composition as:\n` +
          `       <video id="${snippetId}" src="${relPath}" data-start="0" data-duration="${entry.width === entry.height ? 5 : 4}" data-track-index="0" autoplay muted loop></video>`,
      );
    } catch (e) {
      console.error(`${c.error("✗")} download failed: ${(e as Error).message}`);
      process.exitCode = 1;
    }
  },
});
