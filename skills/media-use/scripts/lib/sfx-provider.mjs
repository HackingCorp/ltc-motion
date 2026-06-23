import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SFX_DIR = join(SKILL_DIR, "hyperframes-media", "assets", "sfx");
const MANIFEST_PATH = join(SFX_DIR, "manifest.json");

let bundledManifest = null;

function loadBundledManifest() {
  if (bundledManifest) return bundledManifest;
  if (!existsSync(MANIFEST_PATH)) return {};
  bundledManifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  return bundledManifest;
}

function findBundledMatch(intent) {
  const m = loadBundledManifest();
  const lower = intent.toLowerCase();
  if (m[lower]) return { key: lower, ...m[lower] };
  for (const [key, entry] of Object.entries(m)) {
    if (key.includes(lower) || lower.includes(key)) return { key, ...entry };
    if (entry.description?.toLowerCase().includes(lower)) return { key, ...entry };
  }
  const words = lower.split(/\s+/);
  for (const [key, entry] of Object.entries(m)) {
    const desc = (key + " " + (entry.description || "")).toLowerCase();
    if (words.some((w) => w.length > 2 && desc.includes(w))) return { key, ...entry };
  }
  return null;
}

function searchHeygenSfx(query, { limit = 5, minScore = 0.4 } = {}) {
  try {
    const q = query.replace(/'/g, "'\\''");
    const cmd = `heygen --x-source media-use audio sounds list --query '${q}' --type sound_effects --limit ${limit} --min-score ${minScore}`;
    const out = execSync(cmd, { encoding: "utf8", timeout: 15000, stdio: ["pipe", "pipe", "pipe"] });
    const payload = JSON.parse(out);
    const data = payload?.data;
    if (!Array.isArray(data) || data.length === 0) return null;
    return data;
  } catch {
    return null;
  }
}

export const sfxProvider = {
  async search(intent) {
    // 1. Try HeyGen catalog first (richer library, ranked by relevance)
    const heygenResults = searchHeygenSfx(intent);
    if (heygenResults) {
      const best = heygenResults[0];
      return {
        url: best.audio_url,
        source: "search",
        ext: ".mp3",
        metadata: {
          description: best.description || best.name || intent,
          duration: best.duration || null,
          provider: "heygen.audio.sounds",
          provenance: { track_id: best.id, score: best.score, query: intent },
        },
      };
    }

    // 2. Fallback to bundled library (no auth needed, instant)
    const match = findBundledMatch(intent);
    if (!match) return null;
    const filePath = join(SFX_DIR, match.file);
    if (!existsSync(filePath)) return null;
    return {
      localPath: filePath,
      source: "search",
      ext: ".mp3",
      metadata: {
        description: match.description || match.key,
        duration: match.duration,
        provider: "bundled_sfx",
        provenance: { library_key: match.key },
      },
    };
  },
};
