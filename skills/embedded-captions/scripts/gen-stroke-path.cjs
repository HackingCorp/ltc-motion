#!/usr/bin/env node
/*
 * gen-stroke-path.cjs — generalized draw-on path generator (Node port of the former
 * gen-stroke-path.py; the skill is Python-free). Lays out ANY word in a single-line
 * (pen-path) SVG font — Hershey/EMS — and emits one continuous-dash-revealable path `d`.
 * The glyph data IS the pen path, so stroke-order reveal is exact by construction for any
 * text, no per-word tuning.
 *
 * Usage: node gen-stroke-path.cjs <font.svg> <text> <target_width_px> <baseline_y> <x0>
 * Prints: the path `d` string on stdout + layout info on stderr.
 *
 * Output is byte-identical to the Python original (same float math + 1-decimal coords),
 * so make-theme.cjs's downstream geometry (ink box, seal/underline anchors) is unchanged.
 */
const fs = require("fs");

const fontPath = process.argv[2];
const text = process.argv[3];
const target_w = parseFloat(process.argv[4]);
const baseline_y = parseFloat(process.argv[5]);
const x0 = parseFloat(process.argv[6]);

const svg = fs.readFileSync(fontPath, "utf8");
const glyphs = {};
const glyphRe = /<glyph\s+unicode="(.)"[^>]*?horiz-adv-x="([\d.]+)"(?:[^>]*?d="([^"]*)")?/g;
for (const m of svg.matchAll(glyphRe)) {
  glyphs[m[1]] = [parseFloat(m[2]), m[3] || ""];
}
// default advance for space
const space_adv = (glyphs[" "] || [300, ""])[0];

// total advance width in font units
let total = 0;
for (const ch of text) total += (glyphs[ch] || [space_adv, ""])[0];
const s = target_w / total; // scale font-units -> px

const out = [];
let cursor = 0;
const tokRe = /([ML])\s+([-\d.]+)\s+([-\d.]+)/g;
for (const ch of text) {
  const [adv, d] = glyphs[ch] || [space_adv, ""];
  if (d) {
    // polylines only (M/L): transform every coordinate pair
    for (const t of d.matchAll(tokRe)) {
      const x = x0 + (cursor + parseFloat(t[2])) * s;
      const y = baseline_y - parseFloat(t[3]) * s; // SVG-font y is UP; flip
      out.push(`${t[1]} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
  }
  cursor += adv;
}

process.stdout.write(out.join(" ") + "\n");
const subpaths = out.filter((o) => o.startsWith("M")).length;
process.stderr.write(
  `[gen] chars=${text.length} scale=${s.toFixed(3)} width=${Math.round(total * s)}px subpaths=${subpaths}\n`,
);
