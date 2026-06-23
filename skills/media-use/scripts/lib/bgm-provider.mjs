import { execSync } from "node:child_process";

function searchBgm(query, { limit = 5 } = {}) {
  try {
    const q = query.replace(/'/g, "'\\''");
    const cmd = `heygen --x-source media-use audio sounds list --query '${q}' --type music --limit ${limit}`;
    const out = execSync(cmd, { encoding: "utf8", timeout: 15000, stdio: ["pipe", "pipe", "pipe"] });
    const payload = JSON.parse(out);
    const data = payload?.data;
    if (!Array.isArray(data) || data.length === 0) return null;
    return data;
  } catch {
    return null;
  }
}

export const bgmProvider = {
  async search(intent) {
    const results = searchBgm(intent);
    if (!results) return null;
    const best = results[0];
    return {
      url: best.audio_url,
      source: "search",
      ext: ".mp3",
      metadata: {
        description: best.description || intent,
        duration: best.duration || null,
        provider: "heygen.audio.sounds",
        provenance: { track_id: best.id, score: best.score, query: intent },
      },
    };
  },

  async generate(_intent) {
    return null;
  },
};
