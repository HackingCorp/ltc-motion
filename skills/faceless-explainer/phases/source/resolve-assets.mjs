#!/usr/bin/env node
// faceless-explainer · Source phase (optional, conditional) — resolve the real-world assets a faceless
// script genuinely needs (a company logo, a real person, a specific product) that the LLM cannot invent.
//
// Detection happened upstream: the scriptwriting agent emits, per scene, an optional
//     assetNeeds: [{ type: "icon"|"image", entity, intent, treatment? }]
// (default omitted / [] — FE stays faceless). This phase RESOLVES those needs via the media-use skill
// (search -> select -> freeze), drops each frozen file into public/, and writes the resolved
//     assetCandidates: [{ path: "public/<file>", description }]
// back onto that scene — the exact shape the scene worker already places (no worker / prep / validator change).
//
// Degrades to a NO-OP (FE stays faceless) when: no scene has assetNeeds · media-use isn't installed ·
// no search backend configured · a given need fails to resolve. It never blocks the pipeline.
//
// Usage:
//   node resolve-assets.mjs --project <PROJECT_DIR> --media-use <media-use skill dir> \
//        [--narrator-scripts ./narrator_scripts.json] [--search-cmd <MEDIA_USE_SEARCH_CMD>] \
//        [--validator <validate-narrator.mjs>]
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join, resolve as presolve } from "node:path";

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : def;
}
function out(o) {
  console.log(JSON.stringify(o, null, 2));
}
function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);
}

const PROJECT = presolve(arg("project", "."));
const NS = presolve(arg("narrator-scripts", join(PROJECT, "narrator_scripts.json")));
const MU = arg("media-use", "");
const SEARCH_CMD = arg("search-cmd", process.env.MEDIA_USE_SEARCH_CMD || "");
const VALIDATOR = arg("validator", "");
const PUBLIC = join(PROJECT, "public");
const SCRATCH = join(PROJECT, ".source-assets"); // media-use workspace (keeps the ledger / provenance)

if (!existsSync(NS)) {
  out({ ok: false, error: `narrator_scripts not found: ${NS}` });
  process.exit(1);
}
const doc = JSON.parse(readFileSync(NS, "utf8"));
const scenes = Array.isArray(doc.scenes) ? doc.scenes : [];

// collect needs declared by scriptwriting
const needs = [];
for (const s of scenes) {
  const arr = Array.isArray(s.assetNeeds) ? s.assetNeeds : [];
  for (const n of arr) if (n && n.entity) needs.push({ scene: s, need: n });
}
if (!needs.length) {
  out({ ok: true, resolved: 0, note: "no assetNeeds — faceless, nothing to source" });
  process.exit(0);
}

// degrade gracefully — never block the pipeline
const resolveMjs = MU ? join(MU, "scripts", "resolve.mjs") : "";
if (!MU || !existsSync(resolveMjs)) {
  out({ ok: true, resolved: 0, degraded: "media-use not available — scenes stay faceless", needs: needs.length });
  process.exit(0);
}
if (!SEARCH_CMD) {
  out({ ok: true, resolved: 0, degraded: "no search backend (MEDIA_USE_SEARCH_CMD) — scenes stay faceless", needs: needs.length });
  process.exit(0);
}

mkdirSync(PUBLIC, { recursive: true });
mkdirSync(SCRATCH, { recursive: true });
const env = { ...process.env, MEDIA_USE_SEARCH_CMD: SEARCH_CMD };

const resolved = [], failed = [];
let idx = 0;
for (const { scene, need } of needs) {
  idx++;
  const type = need.type === "icon" ? "icon" : "image";
  const intent = need.intent || need.entity;
  try {
    const raw = execFileSync(
      "node",
      [resolveMjs, "--workspace", SCRATCH, "--type", type, "--entity", String(need.entity), "--intent", String(intent), "--auto"],
      { encoding: "utf8", env, timeout: 150000, maxBuffer: 16 * 1024 * 1024 },
    );
    const r = JSON.parse(raw.trim()); // resolve prints one pretty-printed JSON object on stdout (logs go to stderr)
    if (!r.ok || !r.path) throw new Error(r.error || "resolve returned no path");
    const ext = (r.path.match(/\.(\w+)$/) || ["", type === "icon" ? "png" : "jpg"])[1];
    const file = `${type === "icon" ? "icon" : "img"}-${slug(need.entity)}-${idx}.${ext}`;
    copyFileSync(join(SCRATCH, r.path), join(PUBLIC, file));
    // the scene worker treats a provided assetCandidate as the scene's primary asset (faceless scene-worker, Scope + constraint #4)
    scene.assetCandidates = [{ path: `public/${file}`, description: String(need.intent || need.entity).slice(0, 120) }];
    delete scene.assetNeeds; // satisfied — drop the marker
    resolved.push({ scene: scene.sceneNumber, entity: need.entity, type, path: `public/${file}` });
  } catch (e) {
    failed.push({ scene: scene.sceneNumber, entity: need.entity, error: (e.stdout || e.message || e).toString().slice(0, 160) });
    if (Array.isArray(scene.assetNeeds)) delete scene.assetNeeds; // unmet — stay faceless for this scene
  }
}

writeFileSync(NS, JSON.stringify(doc, null, 2) + "\n");

let validated = null;
if (VALIDATOR && existsSync(VALIDATOR)) {
  try {
    execFileSync("node", [VALIDATOR, NS], { encoding: "utf8" });
    validated = "pass";
  } catch (e) {
    validated = "FAIL: " + (e.stdout || e.stderr || e.message || "").toString().slice(0, 200);
  }
}

out({ ok: true, resolved: resolved.length, failed: failed.length, resolvedItems: resolved, failedItems: failed, validated });
