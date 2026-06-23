import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const SKILL_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const MEDIA_LIB = join(SKILL_DIR, "hyperframes-media", "scripts", "lib");

function resolveHeaders() {
  const envKey = process.env.HEYGEN_API_KEY || process.env.HYPERFRAMES_API_KEY;
  if (envKey) return { "X-Api-Key": envKey };
  const file = join(process.env.HEYGEN_CONFIG_DIR || join(homedir(), ".heygen"), "credentials");
  if (!existsSync(file)) return null;
  const raw = readFileSync(file, "utf8").trim();
  if (!raw) return null;
  if (!raw.startsWith("{")) return { "X-Api-Key": raw };
  try {
    const cred = JSON.parse(raw);
    if (cred.oauth?.access_token) return { Authorization: `Bearer ${cred.oauth.access_token}` };
    if (cred.api_key) return { "X-Api-Key": cred.api_key };
  } catch { /* malformed */ }
  return null;
}

export const bgmProvider = {
  async search(intent, { projectDir } = {}) {
    const headers = resolveHeaders();
    if (!headers) return null;

    try {
      const { retrieveBgm } = await import(join(MEDIA_LIB, "bgm.mjs"));
      const hfDir = projectDir || process.cwd();
      const result = await retrieveBgm({ query: intent, headers, hyperframesDir: hfDir, hasVoice: false });
      if (!result) return null;
      return {
        localPath: join(hfDir, result.path),
        source: "search",
        ext: ".mp3",
        metadata: {
          description: intent,
          duration: result.duration_s,
          provider: "heygen.audio.sounds",
          provenance: { query: intent, mode: "retrieve" },
        },
      };
    } catch {
      return null;
    }
  },

  async generate(_intent) {
    // ponytail: local generation (Lyria/MusicGen) is complex and detached.
    // For now, return null — the resolve cascade handles this as "no generate fallback".
    // When we need it: import generateBgmDetached + wait-bgm.mjs from the audio engine.
    return null;
  },
};
