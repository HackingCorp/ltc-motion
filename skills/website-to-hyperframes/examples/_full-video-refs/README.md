# Full-Video References

A **second tier** in the example library. The 81 numbered scenes (sections 01-13) teach vocabulary — what individual beats and techniques can look like. The 3 refs here teach **grammar** — how 4-10 beats assemble into a 40-second video with HyperShader transitions or pre-rendered clip stitching, narration sync, intro hook, CTA close.

Single scenes give you a beat catalog. Full-video refs give you a sense for **how the whole thing fits together.**

---

## When to study

- **Before writing your first storyboard.** Watch one ref MP4 end-to-end to feel the rhythm of 4-10 beats over 40 seconds — pacing of opener, build, peak, close.
- **When picking architecture for index.html.** The 3 refs demonstrate 3 different patterns (live sub-comps / pre-rendered clip stitch / single-composition-with-many-beats) — pick the one that fits your project.
- **When stuck on caption-track design.** All 3 refs show the canonical pattern: one `<div class="cap clip">` per spoken phrase, on a dedicated track index, with `data-start` from `transcript.json`.
- **When stuck on intro hook.** Each ref's first 1.5 seconds is a different but valid way to stop scrollers — read the first beat and pattern-match.

---

## Roster (6 refs)

### Tier A — full launch reels (40s+)

| Ref | Project | Duration | Assembled MP4 | Architecture | Highest novelty |
|-----|---------|----------|---------------|--------------|-----------------|
| **ref-01** | [`ref-01-launch-video-2/`](ref-01-launch-video-2/) | 41.8s | https://www.heygenverse.com/s/fb0a115b-81e6-4e3f-acae-6dbe8ef3def7/raw | 4 acts as stacked `<div>` slots with live sub-comps | Act-1's 4-panel AI-agent IDE quartet (Claude Code + Cursor + Codex + Gemini CLI) |
| **ref-02** | [`ref-02-claude-design-hyperframes-video/`](ref-02-claude-design-hyperframes-video/) | 43.5s | https://www.heygenverse.com/s/0e1f0a40-351d-4a2d-9b18-139c095a42dd/raw | 10 pre-rendered MP4 clips stitched + captions + music + 6 SFX | `claude-ui.html` (1209 lines), `dashboard.html` (1525), `grid.html` (1621) |
| **ref-03** | [`ref-03-hermes-hyperframes/`](ref-03-hermes-hyperframes/) | 41.0s, **1080×1080 square** | https://www.heygenverse.com/s/51dbc7ce-42df-4a94-84ef-a10c302b4a2f/raw | Single 1367-line `parade.html` w/ 20 internal beats + Lottie captions sub-comp | VHS+CRT+Lottie, square format, 14 keyframe mockups |
| **ref-05** | [`ref-05-fadeglow-music-video-v4/`](ref-05-fadeglow-music-video-v4/) | 41.6s | https://www.heygenverse.com/s/5eee1ed3-3255-473b-a0e0-f488eda984df/raw | 8 sequential sub-comp slots, music-only audio, no narration | **Music video grammar.** No narration; cuts driven by song; kinetic typography on warm cream + red + amber; 8 distinct beats with shared aesthetic |

### Tier B — short-form / single-mode references (10-15s)

| Ref | Project | Duration | Assembled MP4 | Architecture | Why it earns a place |
|-----|---------|----------|---------------|--------------|----------------------|
| **ref-04** | [`ref-04-inspector-logo-intro/`](ref-04-inspector-logo-intro/) | 12.77s | https://www.heygenverse.com/s/e0474ffa-9c3b-4f50-b8aa-03c92ba72bf2/raw | **Single 1344-line composition** — no sub-comps, no HyperShader. Halftone canvas + 5 sub-beats inside one timeline | Production-density mini-reveal arc (logo flash → magnifying glass → inspector with cycling values). Source for the cycling-spans pattern in `04-13-design-inspector`. |
| **ref-06** | [`ref-06-webgl-textures-playground/`](ref-06-webgl-textures-playground/) | 12.0s | https://www.heygenverse.com/s/094d6602-c8cf-4c08-99a0-80345a60958f/raw | Three.js shader + HTML overlay with `mix-blend-mode: screen` | **Shader-as-the-beat** pattern. Library has shaders as transitions and shaders as layer effects, but nothing showing the shader as the load-bearing visual for the whole beat. Use for atmospheric openers / brand reels / music video atmosphere. |

---

## How to study each ref

Every ref has the same structure:

```
ref-NN-name/
├── README.md             ← project intro + per-beat map + closest single-scene refs
├── index.html            ← the orchestrator
├── compositions/         ← the actual beat HTMLs
├── SCRIPT.md             ← narration script (if present)
├── STORYBOARD.md         ← planning doc (if present)
└── fonts/ + logos/       ← brand fonts and logo SVGs the compositions reference
```

**Reading order per ref:**

1. Watch the assembled MP4 first (link in the ref's README + above)
2. Read the ref's `README.md` — has the BEAT MAP
3. Read `index.html` to see the orchestration pattern
4. Open each `compositions/<beat>.html` paired with the BEAT MAP row

Don't try to render these refs standalone — they reference production assets (audio, brand-clip MP4s, captured screenshots) that aren't bundled here to keep the lifts under 1MB each. The point is to **read the source**, not re-render.

---

## What's deliberately not bundled

- **Audio files** (narration, music, SFX) — listen to the assembled MP4 on Verse
- **Brand-clip MP4s** (ref-01's act-3 references 11 brand-recording MP4s; ref-02's clips were pre-rendered from compositions) — watch the assembled MP4
- **`transcript.json`** — only useful for re-rendering; the captions in `index.html` already encode the timing
- **`renders/`** — the assembled MP4s live on Verse
- **`snapshots/`** — gitignored anyway
- **Iteration directories** (ref-02's production project has 9+ `video-*/` snapshots; only the root `compositions/` is lifted)
- **VO generation tooling** (ref-03's `_generate_vo*.py` scripts) — production tooling, not relevant to reading the compositions

If you need to re-render or modify any ref, the production projects live at:
- ref-01: `launch-video-2/` in the repo root
- ref-02: `claude-design-hyperframes-video/` in the repo root
- ref-03: `~/Downloads/Archive/hermes-hyperframes/` (external archive)

---

## Architectural patterns at a glance

| Pattern | When to use | Demonstrated in |
|---------|-------------|-----------------|
| **Stacked live sub-comps** | Multi-act narrative where each act is conceptually distinct, fast iteration on per-act compositions, runtime can handle the load | ref-01 launch-video-2 |
| **Pre-rendered clip stitching** | Heavy compositions (1500+ lines each), wanting to iterate on one beat without re-rendering the rest, or wanting the final to play as MP4 (cheaper at runtime) | ref-02 claude-design |
| **Single composition with many beats** | Beats share a common visual idiom (terminal aesthetic, kinetic typography), want the whole video to feel like one continuous piece, square or unusual aspect ratios | ref-03 hermes |
| **Single composition (no beats)** | Tight short-form (10-15s) where all beats share a common visual frame (constant background, overlapping cursor/panel/highlight), single timeline orchestration without sub-comp loading overhead | ref-04 inspector-logo-intro |
| **Sequential sub-comp slots, all on same track** | Beats fully replace previous, music-only audio, no shader transitions desired (hard cut on music beat IS the transition) | ref-05 fadeglow music video |
| **Three.js shader + HTML overlay** | Shader is the load-bearing visual (atmospheric opener / brand reel / music video atmosphere), HTML text glows through with `mix-blend-mode: screen` | ref-06 webgl-textures-playground |
| **HyperShader.init() transitions** | Multi-beat with shader-transition wipes between beats — **not demonstrated in current refs.** A future ref-07 could lift launch-video (the original) for this. | (gap) |

---

## Future work

This tier ships with **6 refs across 6 distinct architectures**. Don't add more than ~7-8 — past that the tier dilutes.

The remaining gap: **HyperShader-orchestrated multi-beat video**. None of the current 6 use HyperShader.init() — they use stacked slots / clip stitching / single composition / sequential slots. A future ref-07 could lift `launch-video/` (the original HyperFrames launch reel) to teach that pattern. Skipped for now because most of launch-video's compositions are already individually lifted as library scenes.

Other deliberately-skipped candidates (with reasons documented in `HANDOFF-full-video-refs.md`):
- `texture-launch-video` — too monolithic, hard to read
- `vfx-heygen-combined` — overlaps with library section 07
- `vercel-intro-hyperframes` — partially mined (`11-02-vercel-triangle-roll`)
- `homepage-carousel-mockups` — niche creator-reel pattern
- `notion-oneetest-walkthrough` / `hyperframes-article-walkthrough` — niche article-walkthrough pattern
- `playground-launch` — video-clip-driven, less compose-from-divs density
- `timeline-launch-video` — multi-act feature breakdown; standout pattern (timeline-editor UI) already in lib as `04-11`

---

## Disk + Verse cost (transparency)

| Ref | Source on disk | MP4 on Verse |
|-----|----------------|--------------|
| ref-01 launch-video-2 | 948K | 13MB |
| ref-02 claude-design | 328K | 19MB |
| ref-03 hermes | 664K | 11MB |
| ref-04 inspector-logo-intro | 136K (with assets) | 32MB |
| ref-05 fadeglow | 188K | 11MB |
| ref-06 webgl-textures | 56K | 7.7MB |
| **Total** | **~2.3MB** | **~94MB** |

Source committed to repo: ~2.3MB across 6 refs. MP4s on Verse: ~94MB (not in repo).
