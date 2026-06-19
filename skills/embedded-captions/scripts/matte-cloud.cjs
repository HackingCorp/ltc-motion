#!/usr/bin/env node
/*
 * matte-cloud.cjs — cloud subject matte via the HeyGen CLI's `background-removal`
 * (Bria GPU model; POST/GET /v3/background-removals). Produces the SAME
 * <project>/frames_fg/f_%04d.png (RGBA) as the local hyperframes remove-background
 * path in matte.cjs, so the downstream composite is unchanged. matte.cjs opts in
 * with EC_MATTE=cloud and FALLS BACK to the local engine on any failure here.
 *
 * Why a CLI (not raw REST): per the repo convention the HeyGen API is reached
 * through a CLI; the `heygen` CLI is codegen'd from the OpenAPI spec and reads the
 * credential itself (HEYGEN_API_KEY / ~/.heygen/credentials — the SAME key the
 * hyperframes CLI uses; see `hyperframes auth login`). available() pre-checks the
 * credential so we can NUDGE early instead of surfacing a cryptic CLI auth error.
 *
 * STATUS (2026-06): `heygen background-removal` is generated from experiment-framework
 * PR #40076 (OpenAPI spec). Until that merges + ships and `heygen update` is run, the
 * command is absent → available() returns {ok:false} → matte.cjs uses the local engine.
 * When it lands, confirm the exact flags with:
 *     heygen background-removal create --request-schema
 * and adjust the create/get invocations below (they use the anticipated shape).
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const cp = require("child_process");

// --- HeyGen credential probe — mirrors hyperframes-media/scripts/heygen-tts.mjs and the
//     hyperframes CLI auth resolver: $HEYGEN_API_KEY → $HYPERFRAMES_API_KEY → ~/.heygen/
//     credentials (api_key or unexpired oauth). Pure check, never throws. ---
function hasHeyGenCredential() {
  if (process.env.HEYGEN_API_KEY || process.env.HYPERFRAMES_API_KEY) return true;
  const file = path.join(
    process.env.HEYGEN_CONFIG_DIR || path.join(os.homedir(), ".heygen"),
    "credentials",
  );
  try {
    const raw = fs.readFileSync(file, "utf8").trim();
    if (!raw) return false;
    if (!raw.startsWith("{")) return true; // legacy single-line plaintext key
    const c = JSON.parse(raw);
    return Boolean(c.api_key || c.oauth?.access_token);
  } catch {
    return false;
  }
}

// Nudge shown (and surfaced by matte.cjs) when the cloud path is wanted but unauthenticated.
const CRED_NUDGE =
  "no HeyGen API key. Get one at https://app.heygen.com/settings/api, then either:\n" +
  "           export HEYGEN_API_KEY=<key>   (shared with the heygen CLI + hyperframes), or\n" +
  "           run `heygen auth login` (or `hyperframes auth login`)";

function probeCmd(bin, args) {
  try {
    cp.execFileSync(bin, args, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// Is the cloud matte usable right now? → {ok:true} | {ok:false, reason}
function available() {
  if (!probeCmd("heygen", ["--version"]))
    return { ok: false, code: "no-cli", reason: "`heygen` CLI not on PATH" };
  if (!probeCmd("heygen", ["background-removal", "--help"]))
    return {
      ok: false,
      code: "no-command",
      reason:
        "the `heygen` CLI has no `background-removal` command yet (pending OpenAPI codegen, experiment-framework PR #40076)",
    };
  if (!hasHeyGenCredential()) return { ok: false, code: "no-cred", reason: CRED_NUDGE };
  return { ok: true };
}

// spawn + throw a readable error on non-zero exit; returns stdout.
function run(bin, args, label) {
  const r = cp.spawnSync(bin, args, { encoding: "utf8", timeout: 600000 });
  if ((r.status || 0) !== 0)
    throw new Error(
      `${label} (exit ${r.status}): ${(r.stderr || r.stdout || "").trim().slice(-200)}`,
    );
  return r.stdout || "";
}

// Produce <project>/frames_fg/f_%04d.png (RGBA) from the cloud foreground layer.
// Throws on any failure — matte.cjs catches and falls back to the local engine.
function toFramesFg({ matteSrc, fps, framesFg }) {
  const av = available();
  if (!av.ok) throw new Error(av.reason);

  // 1) upload the (already CFR-normalized) source as a HeyGen asset → asset_id.
  //    `heygen asset create` is a shipped command; default output is JSON.
  const up = JSON.parse(run("heygen", ["asset", "create", "--file", matteSrc], "asset create"));
  const assetId = up.asset_id || up.id || up.data?.asset_id || up.data?.id;
  if (!assetId) throw new Error("asset create returned no asset_id");

  // 2) create the job — foreground layer only (that IS our matte: subject on transparent).
  //    Flag names follow the codegen'd shape; verify with `--request-schema` when it ships.
  const created = JSON.parse(
    run(
      "heygen",
      ["background-removal", "create", "--video-asset-id", assetId, "--layers", "foreground"],
      "background-removal create",
    ),
  );
  const jobId = created.id || created.data?.id;
  if (!jobId) throw new Error("background-removal create returned no job id");

  // 3) poll get until completed (the codegen CLI is a thin per-endpoint wrapper — no --wait).
  let job = {};
  let done = false;
  for (let i = 0; i < 200; i++) {
    job = JSON.parse(run("heygen", ["background-removal", "get", jobId], "background-removal get"));
    const status = job.status || job.data?.status;
    if (status === "completed") {
      done = true;
      break;
    }
    if (status === "failed" || status === "deleted")
      throw new Error(`job ${status}: ${job.error || job.data?.error || "unknown"}`);
    cp.execFileSync("sleep", ["3"]);
  }
  if (!done) throw new Error("job did not complete within the poll window");
  const layers = job.layers || job.data?.layers || {};
  const fgUrl = layers.foreground;
  if (!fgUrl) throw new Error("completed job has no `foreground` layer URL");

  // 4) download the foreground webm (VP9 + alpha) and burst to RGBA pngs at the project rate.
  //    -c:v libvpx-vp9 on the INPUT so ffmpeg decodes the alpha plane (yuva420p).
  const webm = path.join(path.dirname(framesFg), "_matte_cloud.webm");
  run("curl", ["-fsSL", "-o", webm, fgUrl], "download foreground layer");
  fs.mkdirSync(framesFg, { recursive: true });
  cp.execFileSync(
    "ffmpeg",
    [
      "-y",
      "-c:v",
      "libvpx-vp9",
      "-i",
      webm,
      "-vf",
      `fps=${fps}`,
      "-pix_fmt",
      "rgba",
      path.join(framesFg, "f_%04d.png"),
    ],
    { stdio: "ignore" },
  );
  fs.rmSync(webm, { force: true });
}

module.exports = { available, toFramesFg };
