/**
 * `hyperframes verify-beats <project>` — cross-check per-beat verification artifacts.
 *
 * Why this command exists: Step 5 sub-agents historically self-reported "0 errors,
 * looks good" without doing the work. The main agent trusted those reports and
 * shipped slideshow-quality videos. This command makes verification machine-checkable:
 * each sub-agent writes a `compositions/beat-N-verify.json` declaring what it built
 * (lint exit, snapshots taken, brand values used, assets referenced). This command
 * then cross-checks every claim against ground truth (composition HTML on disk,
 * snapshot PNGs on disk, re-running lint) and exits non-zero if any beat fails.
 *
 * The main agent's Step 5 gate becomes: `hyperframes verify-beats <project>` exits 0.
 * Sub-agents cannot fake verification because the CLI reads the actual files.
 */

import { defineCommand } from "citty";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Example } from "./_examples.js";

export const examples: Example[] = [
  ["Verify all beats in a project", "hyperframes verify-beats videos/raycast-launch"],
  ["Verify the current directory", "hyperframes verify-beats ."],
  ["Print machine-readable JSON output", "hyperframes verify-beats . --json"],
];

interface BeatVerification {
  beat: number;
  composition_file: string;
  lint?: { exit: number; errors: number; warnings: number };
  snapshots_taken_at_seconds?: number[];
  snapshot_files?: string[];
  frame_observations?: Array<{ t: number; describes: string }>;
  brand_check?: {
    primary_bg_hex_used?: string;
    primary_bg_hex_design_md?: string;
    matches_bg?: boolean;
    accent_hex_used?: string;
    accent_hex_design_md?: string;
    matches_accent?: boolean;
    headline_min_font_px?: number;
    captured_assets_referenced?: string[];
    no_assets_reason?: string;
  };
  concept_alignment?: string;
}

interface BeatCheckResult {
  beat: string;
  pass: boolean;
  failures: string[];
  warnings: string[];
}

const MIN_OBSERVATIONS = 3;
const MIN_HEADLINE_PX = 80;

export default defineCommand({
  meta: {
    name: "verify-beats",
    description:
      "Cross-check per-beat verification artifacts against composition HTML and snapshots",
  },
  args: {
    project: {
      type: "positional",
      description: "Path to the project directory containing compositions/",
      default: ".",
      required: false,
    },
    json: {
      type: "boolean",
      description: "Output machine-readable JSON instead of human-readable text",
      default: false,
    },
  },
  async run({ args }) {
    const projectDir = resolve(args.project);
    const compositionsDir = join(projectDir, "compositions");

    if (!existsSync(compositionsDir)) {
      printOrJson(
        args.json,
        { pass: false, error: `No compositions/ directory at ${projectDir}` },
        () => console.error(`error: no compositions/ directory at ${projectDir}`),
      );
      process.exit(2);
    }

    const beatFiles = readdirSync(compositionsDir)
      .filter((f) => /^beat-.*\.html$/.test(f))
      .sort();

    if (beatFiles.length === 0) {
      printOrJson(
        args.json,
        { pass: false, error: "No beat-*.html files found in compositions/" },
        () => console.error("error: no beat-*.html files in compositions/"),
      );
      process.exit(2);
    }

    const results: BeatCheckResult[] = [];

    for (const beatFile of beatFiles) {
      const beatName = beatFile.replace(/\.html$/, "");
      const verifyPath = join(compositionsDir, `${beatName}-verify.json`);
      const compositionPath = join(compositionsDir, beatFile);
      const result: BeatCheckResult = {
        beat: beatName,
        pass: true,
        failures: [],
        warnings: [],
      };

      // Gate 1: verify.json exists
      if (!existsSync(verifyPath)) {
        result.failures.push(
          `Missing ${beatName}-verify.json. The sub-agent that built this beat did not produce a verification artifact. Re-dispatch the sub-agent with the beat-builder-guide.md verify.json requirement enforced.`,
        );
        result.pass = false;
        results.push(result);
        continue;
      }

      // Gate 2: verify.json parses
      let verify: BeatVerification;
      try {
        verify = JSON.parse(readFileSync(verifyPath, "utf-8")) as BeatVerification;
      } catch (err) {
        result.failures.push(
          `verify.json is malformed JSON: ${err instanceof Error ? err.message : err}`,
        );
        result.pass = false;
        results.push(result);
        continue;
      }

      // Gate 3: composition HTML exists (sanity check)
      if (!existsSync(compositionPath)) {
        result.failures.push(`Composition file ${beatFile} not found on disk`);
        result.pass = false;
        results.push(result);
        continue;
      }

      const compositionHtml = readFileSync(compositionPath, "utf-8");

      // Gate 4: lint result claims exit 0
      if (!verify.lint) {
        result.failures.push("verify.json missing 'lint' field (must include exit code)");
        result.pass = false;
      } else if (verify.lint.exit !== 0) {
        result.failures.push(
          `lint reported exit ${verify.lint.exit} with ${verify.lint.errors ?? "?"} errors. Lint must pass before this beat is complete.`,
        );
        result.pass = false;
      }

      // Gate 5: at least MIN_OBSERVATIONS frame observations
      const obs = verify.frame_observations ?? [];
      if (obs.length < MIN_OBSERVATIONS) {
        result.failures.push(
          `Only ${obs.length} frame observations provided (need ≥${MIN_OBSERVATIONS}). The sub-agent did not visually verify the beat at enough timestamps. View snapshot PNGs and write a concrete observation per frame.`,
        );
        result.pass = false;
      }
      for (const o of obs) {
        if (!o.describes || o.describes.trim().length < 20) {
          result.failures.push(
            `Frame observation at t=${o.t}s is too short or empty: "${o.describes}". Each observation must describe what's actually visible (≥20 chars).`,
          );
          result.pass = false;
        }
      }

      // Gate 6: snapshot files exist on disk
      const snapshotFiles = verify.snapshot_files ?? [];
      if (snapshotFiles.length === 0) {
        result.failures.push(
          "No snapshot_files listed. Sub-agents must run hyperframes snapshot and list the resulting PNG paths.",
        );
        result.pass = false;
      }
      for (const snapPath of snapshotFiles) {
        const abs = snapPath.startsWith("/") ? snapPath : join(projectDir, snapPath);
        if (!existsSync(abs)) {
          result.failures.push(
            `Snapshot file claimed but missing on disk: ${snapPath}. Sub-agent did not actually take this snapshot.`,
          );
          result.pass = false;
        }
      }

      // Gate 7: cross-check bg + accent hex appear in the composition HTML
      const brand = verify.brand_check ?? {};
      if (!brand.primary_bg_hex_used) {
        result.failures.push("brand_check.primary_bg_hex_used missing");
        result.pass = false;
      } else if (!compositionHtml.toLowerCase().includes(brand.primary_bg_hex_used.toLowerCase())) {
        result.failures.push(
          `brand_check claims primary_bg_hex_used="${brand.primary_bg_hex_used}" but that color does not appear in ${beatFile}. Sub-agent reported a color it did not actually use.`,
        );
        result.pass = false;
      }
      if (!brand.accent_hex_used) {
        result.warnings.push(
          "brand_check.accent_hex_used missing (allowed if beat has no accent color)",
        );
      } else if (!compositionHtml.toLowerCase().includes(brand.accent_hex_used.toLowerCase())) {
        result.failures.push(
          `brand_check claims accent_hex_used="${brand.accent_hex_used}" but that color does not appear in ${beatFile}.`,
        );
        result.pass = false;
      }

      // Gate 8: DESIGN.md alignment — bg and accent should match what DESIGN.md says
      if (brand.matches_bg === false) {
        result.warnings.push(
          `primary_bg differs from DESIGN.md (used="${brand.primary_bg_hex_used}", design.md="${brand.primary_bg_hex_design_md}"). If this is intentional, note the override in concept_alignment.`,
        );
      }

      // Gate 9: headline font size meets minimum
      if (
        brand.headline_min_font_px !== undefined &&
        brand.headline_min_font_px < MIN_HEADLINE_PX
      ) {
        result.failures.push(
          `Headline min font size is ${brand.headline_min_font_px}px (must be ≥${MIN_HEADLINE_PX}px for video readability).`,
        );
        result.pass = false;
      }

      // Gate 10: cross-check that captured assets claimed are actually referenced in HTML
      const assetsClaimed = brand.captured_assets_referenced ?? [];
      for (const asset of assetsClaimed) {
        if (!compositionHtml.includes(asset)) {
          result.failures.push(
            `brand_check claims captured_assets_referenced contains "${asset}" but that path does not appear in ${beatFile}. Sub-agent reported an asset it did not actually use.`,
          );
          result.pass = false;
        }
      }
      if (assetsClaimed.length === 0 && !brand.no_assets_reason) {
        result.warnings.push(
          "No captured assets referenced in this beat. If intentional, add brand_check.no_assets_reason explaining why (e.g., 'opener is pure kinetic typography; brand logo lands in closer beat').",
        );
      }

      // Gate 11: concept_alignment is non-empty and substantive
      if (!verify.concept_alignment || verify.concept_alignment.trim().length < 30) {
        result.failures.push(
          "concept_alignment must be a non-empty sentence (≥30 chars) describing how this beat serves the storyboard's message and arc.",
        );
        result.pass = false;
      }

      results.push(result);
    }

    // ── Brand-floor checks across the whole video ─────────────────────────
    // The skill's minimum-utilization rule: logo should appear in opener AND closer.
    // We check by looking at every composition's claimed captured_assets_referenced.
    const overallWarnings: string[] = [];
    const firstBeat = beatFiles[0]?.replace(/\.html$/, "");
    const lastBeat = beatFiles[beatFiles.length - 1]?.replace(/\.html$/, "");
    const logoLikePattern = /logo|brand|mark|wordmark/i;
    function beatReferencesLogo(beat: string | undefined): boolean {
      if (!beat) return false;
      const verifyPath = join(compositionsDir, `${beat}-verify.json`);
      if (!existsSync(verifyPath)) return false;
      try {
        const v = JSON.parse(readFileSync(verifyPath, "utf-8")) as BeatVerification;
        const refs = v.brand_check?.captured_assets_referenced ?? [];
        return refs.some((r) => logoLikePattern.test(r));
      } catch {
        return false;
      }
    }
    if (!beatReferencesLogo(firstBeat)) {
      overallWarnings.push(
        `First beat (${firstBeat}) does not reference a logo/brand asset. The brand mark should appear in the opener unless STORYBOARD.md explicitly overrides this.`,
      );
    }
    if (!beatReferencesLogo(lastBeat) && lastBeat !== firstBeat) {
      overallWarnings.push(
        `Last beat (${lastBeat}) does not reference a logo/brand asset. The brand mark should appear in the closer unless STORYBOARD.md explicitly overrides this.`,
      );
    }

    // ── Report ───────────────────────────────────────────────────────────
    const failedCount = results.filter((r) => !r.pass).length;
    const overallPass = failedCount === 0 && overallWarnings.length === 0;

    if (args.json) {
      console.log(
        JSON.stringify(
          {
            pass: overallPass,
            beats: results,
            overall_warnings: overallWarnings,
            summary: {
              total: results.length,
              passed: results.length - failedCount,
              failed: failedCount,
              warnings: results.reduce((n, r) => n + r.warnings.length, 0) + overallWarnings.length,
            },
          },
          null,
          2,
        ),
      );
    } else {
      console.log();
      for (const r of results) {
        const icon = r.pass ? "✓" : "✗";
        console.log(`${icon} ${r.beat}`);
        for (const f of r.failures) console.log(`    ✗ ${f}`);
        for (const w of r.warnings) console.log(`    ! ${w}`);
      }
      if (overallWarnings.length > 0) {
        console.log();
        console.log("Brand-floor warnings:");
        for (const w of overallWarnings) console.log(`  ! ${w}`);
      }
      console.log();
      const summary = `${results.length - failedCount}/${results.length} beats passed`;
      console.log(overallPass ? `✓ ${summary}` : `✗ ${summary} (${failedCount} failed)`);
      console.log();
    }

    process.exit(failedCount > 0 ? 1 : 0);
  },
});

function printOrJson(json: boolean, payload: unknown, humanFallback: () => void): void {
  if (json) console.log(JSON.stringify(payload, null, 2));
  else humanFallback();
}
