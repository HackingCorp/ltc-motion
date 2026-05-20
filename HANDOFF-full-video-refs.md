# HANDOFF — Full-Video References + Workflow Audit Lock-In (May 19, 2026 evening)

> **READ THIS BEFORE PICKING UP THE WORK.** This is the third handoff doc in the sequence:
> - `HANDOFF.md` — pipeline-quality v2-v9 work through May 18
> - `HANDOFF-examples-library.md` — 81-scene library shipped May 19 (batches 7-17)
> - **`HANDOFF-full-video-refs.md` (this doc)** — workflow audit (batch 18) + full-video-refs plan (batch 19, in progress)

---

## TL;DR

**Where we are right now:**

- **81 scenes** in `skills/website-to-hyperframes/examples/` across 13 sections (batches 7-17 — all rendered, uploaded, gallery live, READMEs synced)
- **Workflow audit shipped** (batch 18, commit `851d62fc`): inverted the default visual strategy from "use captured assets" to "compose load-bearing visuals + assets-as-accents." Collapsed `step-1-design.md` from 615 → 157 lines. Added "stop scrollers / alive every frame / physical world / go viral / get everything yourself" keywords as load-bearing manifesto in `SKILL.md` Step -1.
- **Branch:** `feat/pipeline-quality-v2`, **25 commits ahead of origin**
- **Grand Tour reel:** 81 scenes / 9:22 at https://www.heygenverse.com/s/23b285ce-a09a-487a-94d7-53f0c2827f2d/raw
- **Gallery:** https://www.heygenverse.com/a/1636f2fe-3ddc-4543-9a56-0d0b99538807

**What's next (batch 19 — in progress):**

Adding **3 full-video reference projects** as a new tier in the library (`examples/_full-video-refs/`). Single-scene refs teach vocabulary; full-video refs teach grammar — how 4-6 beats assemble into a 40s+ video with HyperShader transitions + narration sync + intro hook + CTA close.

---

## Why full-video refs

**The gap in the current 81-scene library:** every scene is 5-15s of one technique done well. Nothing shows what 40 seconds with 4-6 beats + shader transitions + audio sync + opener + CTA assembles into. Agents looking at the library learn "what a beat can be." Full-video refs teach "what a beat fits into."

Concrete evidence: my hand-authored scenes (16 across batches 11-17) are **clean teaching demos** — they show one technique cleanly. The lifted production scenes (07-01 webgl-shader, 07-02 canvas-ascii, 11-04 anamorphic-text-crt, 12-01 techniques-grid) are **objectively richer** — more dense, more layered, more "shipped" feeling. Adding full-video refs lets agents pattern-match to assembled production work, not just individual technique demos.

---

## Scope (locked-in)

### The 3 full-video references

| Slot | Source project | Duration | Why |
|------|----------------|----------|-----|
| **ref-01-launch-video-2** | `launch-video-2/` (repo-local) | 41.8s | Highest novelty. Act-1 has 4 AI-agent IDEs (Claude Code + Cursor + Codex + Gemini CLI) with synchronized mouse cursors, click ripples, sent-message bubbles — agent-UI pattern the library doesn't have. Act-2 has MacBook + animated DESIGN.md callouts (meta-perfect for showing the website-to-hyperframes pipeline visually). Act-4 has the canonical aurora end-card. |
| **ref-02-claude-design-hyperframes-video** | `claude-design-hyperframes-video/` (repo-local) | 43.5s | Richest single compositions. claude-ui (1209 lines — full Claude AI interface with sub-toolbar + sidebar), dashboard (1525 lines — dense analytical dashboard, different from KPI-card 04-05), letters (orbital title with brand mark), grid (24 simultaneous techniques in one frame — already lifted as 12-01 but worth seeing in context), opener (light-ball cinematic — already 12-05 but in context), moodboard (brand book — already 12-04 in context), phones (3D iPhone with apps — already 04-09 in context). |
| **ref-03-hermes-hyperframes** | `/Users/ularkimsanov/Downloads/Archive/hermes-hyperframes/` | 41.0s | Multi-act with techniques the library lacks: VHS-noise boot-sequence (different from matrix-style 12-02), shader-render composite (WebGL + floating GLSL code + render terminal + CRT overlay), lottie-captions (real Lottie integration), binary-break, gsap-grid, parade. The "kitchen sink" launch reel. |

**Skipped (deliberate):**

- `launch-video/` (the original) — most compositions already individually lifted as scenes (anatomy → 09-01, engine → 09-02, flex-shader → 07-01, canvas-close → 07-02, flex-threejs → 11-01, flex-gsap → 10-01, cta → 04-10). Adding it as a full-video ref would be 60% duplicate content. Skip.
- Archive 2/timeline-launch-video — partially mined (timeline-editor-launch-v5 → 04-11). The full reel is 9 acts of feature breakdown; less novel than hermes.
- Archive 2/playground-launch — multi-beat but heavy on screenshots, less compose-from-divs density.
- Archive 2/fadeglow-music-video-v4 — music video with 8 abstract beats; novel aesthetic but lacks the "product launch grammar" that's the teaching point.
- All 37 archive projects — would dilute. 3 best-of-class > 37 of varying quality.

### Approach: ship the source + the rendered MP4 separately

Each ref is **a frozen reference**, not a renderable copy. Agents READ the source files to learn assembly grammar; they WATCH the rendered MP4 to see the finished result.

What gets shipped per ref:

```
examples/_full-video-refs/
├── README.md                                     ← tier intro, how to study, ref roster
├── ref-01-launch-video-2/
│   ├── README.md                                 ← project intro + per-act breakdown + asset ID for the MP4
│   ├── BEAT-NOTES.md                             ← per-beat callout: what technique + why + which examples/ scene it maps to
│   ├── index.html                                ← the orchestrator (HyperShader.init + transitions array + scene wiring)
│   ├── SCRIPT.md                                 ← narration script (if applicable)
│   ├── STORYBOARD.md                             ← the storyboard that planned the video
│   ├── compositions/                             ← all sub-compositions (the actual beat HTMLs)
│   │   ├── act-1-cold-open.html
│   │   ├── act-2-extraction.html
│   │   ├── act-3-reel.html  (note: references mp4 clips that aren't bundled — agents read the markup, don't try to render)
│   │   ├── act-3-beats/*.html
│   │   └── act-4-end-card.html
│   ├── fonts/                                    ← brand fonts if shipped with project
│   └── logos/                                    ← brand SVGs/PNGs that compositions reference
├── ref-02-claude-design-hyperframes-video/
│   └── (same structure)
└── ref-03-hermes-hyperframes/
    └── (same structure)
```

**What's deliberately NOT included:**

- The `renders/` directory (renders live on Verse via asset URL)
- The `snapshots/` directory (gitignored)
- The audio files (`*.wav`, `*.mp3`) — too large; agents listen to the assembled MP4 on Verse, not the raw audio
- Source video clips for act-3 (the brand-clip mp4s in `act-3-clips/`) — would balloon size; act-3 README points to the assembled MP4 instead
- `transcript.json` — only useful for re-rendering, not for reading
- Old README/HANDOFF docs from the project (kept only the canonical SCRIPT + STORYBOARD)

### File-size estimate

- Per ref: ~3-5 MB committed (16-20 HTML comps + 3-4 fonts + 5-10 logo SVGs + 2-3 markdown docs)
- 3 refs: ~10-15 MB total committed
- 3 MP4s on Verse: ~43 MB uploaded (not in repo)

---

## Per-ref content + lift plan

### ref-01 launch-video-2 (41.8s, hyperframes website-to-hyperframes launch)

**Acts:**
1. **act-1-cold-open.html (931 lines)** — 4 AI-agent IDEs in quadrants. Claude Code (top-left), Cursor (top-right), Codex (bottom-left), Gemini CLI (bottom-right). Mouse cursors click "send," prompts type in, sent-message bubbles appear in each chat area. Then a centered "Now / any site becomes / video." phrase + YEAHH celebration with stars. **Highest-novelty content in any production project.**
2. **act-2-extraction.html (475 lines)** — MacBook (left) with site screenshot + DESIGN.md panel (right) being progressively written + 16 callout tags pinning at design elements (LOGO, DISPLAY, ASSET, BUTTON, STAT, COLOR, TYPE-WRAP, etc.) + EXTRACTING→EXTRACTED stamp.
3. **act-3-reel.html (49 lines, lightweight)** — orchestrates 10 brand-clip mp4s (Stripe, Framer, etc.) with caption overlays. Each beat is `a3-beat-NN.html` (78 lines) — minimal: just a video tag + caption fade. **Note: the brand-clip MP4s are NOT included in the lift** — the markup is the reference; agents read the orchestration pattern, not the rendered video clips. README explicitly notes this.
4. **act-4-end-card.html (292 lines)** — aurora end-card. Already lifted as 10-02; here it's seen as the closer of the assembled video.

**Files to copy (target ~4 MB):**
- `index.html` (root orchestrator with HyperShader transitions)
- `SCRIPT.md`, `STORYBOARD.md`, `README.md`
- `compositions/*.html` (all 4 acts + 10 act-3 beats)
- `fonts/Inter-Variable.woff2`, `fonts/JetBrainsMono-Variable.woff2`, `fonts/BungeeShade-Regular.woff2`
- `logos/{claude,codex,cursor,gemini}.svg/png` (5 files)
- `assets/heygen-fullpage.png` if reasonable size (otherwise note it's expected and skip)
- NEW: `BEAT-NOTES.md` (handwritten — see structure below)
- NEW: `README.md` overwrite — clean intro for library context

**Verse MP4:** existing `launch-video-2/renders/launch.mp4` (13 MB)

### ref-02 claude-design-hyperframes-video (43.5s)

**Compositions (all in `compositions/`):**
- `opener.html` (416 lines) — light-ball cinematic opener
- `moodboard.html` (692 lines) — brand book moodboard
- `letters.html` (349 lines) — orbital title (HYPER FRAMES letters)
- `claude-ui.html` (1209 lines) — full Claude AI interface mockup (top bar + sub-toolbar + sidebar + main canvas)
- `dashboard.html` (1525 lines) — dense analytical dashboard
- `phones.html` (682 lines) — 3D iPhones with Strava-style + music apps
- `grid.html` (1621 lines) — 24-cell technique grid
- `captions.html` (115 lines) — caption track

**Files to copy (target ~5 MB):**
- `index.html`
- `compositions/*.html` (8 files)
- `SCRIPT.md`, `STORYBOARD.md` if present
- Brand fonts (Fraunces, Inter, JetBrains Mono, Instrument Serif — check what's in `fonts/`)
- Any captured assets referenced in compositions (check + minimize)
- NEW: `BEAT-NOTES.md`
- NEW: `README.md`

**Note: this project has 9+ `video-NN-*/` subdirectories** with version iterations (`video-7-2`, `video-9-2`, `video-5`, `video-10-2`, `video-11-fixed`, etc.). **Lift only the canonical `compositions/` directory at root + the root `index.html`.** Skip the iteration directories — they're 90% noise for agent reading.

**Verse MP4:** existing `claude-design-hyperframes-video/renders/claude-design-hyperframes-video_2026-04-25_12-28-58.mp4` (19 MB)

### ref-03 hermes-hyperframes (41.0s)

**Compositions** (`/Users/ularkimsanov/Downloads/Archive/hermes-hyperframes/compositions/`):
- `boot-sequence.html` (252 lines) — VHS-noise terminal + skill detection flash + CRT overlays
- `binary-break.html` (202 lines) — Matrix-style binary break
- `gsap-grid.html` — GSAP technique grid (similar to 12-01 but different aesthetic)
- `shader-render.html` (323 lines) — WebGL shader bg + floating GLSL code snippet + shader label + render terminal + CRT
- `lottie-captions.html` — Lottie integration with captions
- `parade.html` (1367 lines, 1080×1080) — kinetic typography parade with CRT aesthetic
- `deploy-cta.html` — deploy CTA closer
- `captions.html`

**Files to copy (target ~5 MB):**
- `index.html` (orchestrator)
- `compositions/*.html` (8 files)
- `SCRIPT.md`, `STORYBOARD.md`
- Fonts referenced in compositions
- NEW: `BEAT-NOTES.md`
- NEW: `README.md`

**Note: parade.html is 1080×1080** (square format). Storyboard note: hermes targeted multiple aspect ratios. README explains this.

**Verse MP4:** `/Users/ularkimsanov/Downloads/Archive/hermes-hyperframes/renders/hermes-hyperframes-v4.mp4` (11 MB)

---

## Execution sequence

When picking this up (whether continuing this session or a future one), do in this order:

1. **Upload the 3 MP4s to Verse first** — `mcp__heygenverse-apps__hv_execute` action `batch_upload_assets` with `{ items: [{file_name: "ref-01-launch-video-2.mp4"}, ...] }`, then curl PUT each one. Note asset IDs.

2. **Create dir structure** — `mkdir -p skills/website-to-hyperframes/examples/_full-video-refs/{ref-01-launch-video-2,ref-02-claude-design-hyperframes-video,ref-03-hermes-hyperframes}`

3. **Lift ref-01 launch-video-2 first** (highest novelty + smallest project):
   - `cp -r launch-video-2/compositions/ examples/_full-video-refs/ref-01-launch-video-2/`
   - `cp launch-video-2/{index.html,SCRIPT.md,STORYBOARD.md} examples/_full-video-refs/ref-01-launch-video-2/`
   - `cp -r launch-video-2/{fonts,logos} examples/_full-video-refs/ref-01-launch-video-2/`
   - `cp launch-video-2/assets/heygen-fullpage.png` if <2MB
   - Write `BEAT-NOTES.md` mapping each beat to its `examples/` scene equivalent + the technique
   - Write `README.md` (replace existing) — library-context intro

4. **Same pattern for ref-02 claude-design-video** — but ONLY copy the root `compositions/` + root `index.html`, skip the `video-*/` iteration directories.

5. **Same pattern for ref-03 hermes-hyperframes** — copy from `/Users/ularkimsanov/Downloads/Archive/hermes-hyperframes/`.

6. **Write `examples/_full-video-refs/README.md`** — tier intro + roster + how to study + asset IDs.

7. **Update `examples/README.md`** — add tier link near top + add 3 entries to the lookup table.

8. **Patch gallery app** — add a new section "_Full-Video References_" at the top of the gallery, embedding the 3 MP4s + linking to the source paths in the GitHub-future PR.

9. **Update `HANDOFF-examples-library.md`** — bump TL;DR with new tier, update commit log.

10. **Commit batch 19.**

---

## What I need from BEAT-NOTES.md per ref

Format (template):

```markdown
# BEAT NOTES — <ref-name>

This is what a real production HyperFrames video looks like assembled. <duration> across <N> beats with HyperShader transitions, narration, intro hook, CTA close.

## How to study this ref

1. **Watch the assembled MP4 first**: <verse URL>. Get the feel of the whole.
2. **Read `index.html`**: how the beats are orchestrated via `HyperShader.init({ scenes: [...], transitions: [...] })`. This is the assembly grammar single-scene refs don't show.
3. **Read `compositions/<beat>.html`**: the actual beat code. Pair with the BEAT MAP below to see what techniques each one uses + which `examples/` scene maps closest.
4. **Read `SCRIPT.md` + `STORYBOARD.md`**: see how planning translated into beats.

## Beat map

| Beat | Composition | Duration | Techniques | Closest examples/ scene |
|------|-------------|----------|------------|--------------------------|
| 1 | act-1-cold-open | ~12s | 4 AI-agent IDE quadrants + mouse cursors + click ripples + sent-message bubbles + phrase reveal + YEAHH stars | `04-12-claude-code-ide/` (single panel) — this beat is the 4-panel quartet extension |
| 2 | act-2-extraction | ~12s | MacBook + animated DESIGN.md + 16 callout tags + EXTRACTING→EXTRACTED stamp | `12-06-design-extraction/` (the library's lifted version, decontextualized) |
| 3 | act-3-reel | ~8s | 10-beat brand clip showcase with caption overlays | none in library (brand-clip reels are video-asset-driven; not in compose-from-divs scope) |
| 4 | act-4-end-card | ~8s | Aurora end-card with particles + tri-color wordmark + install command type-on | `10-02-aurora-end-card/` (the library's decontextualized version of this exact beat) |

## What this teaches that single scenes don't

- **HyperShader orchestration**: how `transitions: [{time, shader, duration}]` wires beats together
- **Narration sync at video scale**: each beat's `data-start`/`data-duration` aligned to spoken phrases
- **Intro hook**: act-1's first 1.5s and how it stops scrollers
- **CTA hold rhythm**: act-4 ends 2-3s after last spoken word, not 8s of silence
- **Asset accent restraint**: only 2-3 captured assets used as accents (logo, heygen-fullpage screenshot in laptop) — everything else composed
```

---

## Lock-in checklist (what's already locked vs what's still TODO)

### Locked (will not be lost):

- [x] 81-scene library shipped + on disk + on Verse + in gallery
- [x] Skill wiring 3-mode framework + manifesto in SKILL.md Step -1
- [x] DESIGN.md spec collapsed 615 → 157
- [x] step-3 screenshot-pull lines removed; replaced with composed-primary framing
- [x] step-3 Asset Audit reframed to accent-only
- [x] step-3 beat template "Assets" → "Composition + Accents"
- [x] step-2 Question 3 reframed to compose-first options
- [x] All in commit `851d62fc` on `feat/pipeline-quality-v2`

### TODO (batch 19 plan):

- [ ] Upload 3 rendered MP4s to Verse (assets created, IDs recorded below)
- [ ] Create `examples/_full-video-refs/` directory structure
- [ ] Lift ref-01 (launch-video-2): source copy + BEAT-NOTES + README
- [ ] Lift ref-02 (claude-design): source copy (root only, skip iteration dirs) + BEAT-NOTES + README
- [ ] Lift ref-03 (hermes-hyperframes): source copy + BEAT-NOTES + README
- [ ] Write `examples/_full-video-refs/README.md` (tier intro)
- [ ] Patch `examples/README.md` (add tier + lookup entries)
- [ ] Patch gallery app (add full-video tier at top with embedded MP4s)
- [ ] Update `HANDOFF-examples-library.md` (mention batch 18 + 19)
- [ ] Commit batch 19

### Future / not committing to (out of scope for this lift):

- Lifting more archive projects (inspector-logo-intro, timeline-launch-video, fadeglow, playground-launch) — punted
- Re-rendering the 3 refs in our pipeline (they render fine with their original asset deps; we're shipping the assembled MP4s as-is from the project's own renders/)
- Rewriting the BEAT-NOTES for already-lifted scenes — those READMEs are fine

---

## Verse asset IDs (UPLOADED ✓ — all 6 refs)

```
ref-01-launch-video-2.mp4:    fb0a115b-81e6-4e3f-acae-6dbe8ef3def7
   https://www.heygenverse.com/s/fb0a115b-81e6-4e3f-acae-6dbe8ef3def7/raw  (13MB, 41.8s)

ref-02-claude-design-hyperframes-video.mp4: 0e1f0a40-351d-4a2d-9b18-139c095a42dd
   https://www.heygenverse.com/s/0e1f0a40-351d-4a2d-9b18-139c095a42dd/raw  (19MB, 43.5s)

ref-03-hermes-hyperframes.mp4: 51dbc7ce-42df-4a94-84ef-a10c302b4a2f
   https://www.heygenverse.com/s/51dbc7ce-42df-4a94-84ef-a10c302b4a2f/raw  (11MB, 41.0s)

ref-04-inspector-logo-intro.mp4: e0474ffa-9c3b-4f50-b8aa-03c92ba72bf2
   https://www.heygenverse.com/s/e0474ffa-9c3b-4f50-b8aa-03c92ba72bf2/raw  (32MB, 12.77s — locally rendered high-quality)

ref-05-fadeglow-music-video-v4.mp4: 5eee1ed3-3255-473b-a0e0-f488eda984df
   https://www.heygenverse.com/s/5eee1ed3-3255-473b-a0e0-f488eda984df/raw  (11MB, 41.6s)

ref-06-webgl-textures-playground.mp4: 094d6602-c8cf-4c08-99a0-80345a60958f
   https://www.heygenverse.com/s/094d6602-c8cf-4c08-99a0-80345a60958f/raw  (7.7MB, 12.0s)
```

## Source dirs lifted (ON DISK ✓)

```
examples/_full-video-refs/
├── README.md                                     ← tier intro
├── ref-01-launch-video-2/         (940K)
│   ├── README.md + BEAT-MAP table
│   ├── index.html + SCRIPT.md + STORYBOARD.md
│   ├── compositions/ (act-1 + act-2 + act-3-reel + act-3-beats/ + act-4)
│   ├── fonts/ + logos/
│   └── (heygen-fullpage.png intentionally skipped — 8MB)
├── ref-02-claude-design-hyperframes-video/   (316K)
│   ├── README.md + BEAT-MAP table
│   ├── index.html
│   └── compositions/ (opener / claude-ui / moodboard / dashboard / grid / phones / letters / captions)
│       (iteration dirs video-7-2/, video-9-2/, etc. intentionally skipped)
└── ref-03-hermes-hyperframes/      (652K)
    ├── README.md + BEAT-MAP + standalone-composition table
    ├── index.html + SCRIPT.md + STORYBOARD.md
    ├── compositions/ (parade + boot-sequence + binary-break + gsap-grid + shader-render + lottie-captions + deploy-cta + captions)
    └── mockups/ (14 keyframe planning artifacts + bg/ palette/ parade/ parade-v2/ subdirs)
```

**Total disk size: 1.9MB** for all 3 refs (compositions + READMEs + planning docs + fonts/logos).

---

## Recovery instructions (if context resets mid-batch-19)

1. Read this doc top to bottom.
2. Read `HANDOFF-examples-library.md` (covers batches 7-17).
3. Read `HANDOFF.md` (covers pipeline-quality v2-v9 through May 18).
4. `git log --oneline -10` to see where commits stopped.
5. Last expected commit before batch 19: `851d62fc` (workflow audit). If `git log` shows that as HEAD, batch 19 hasn't started — start from "Execution sequence" step 1 above.
6. If `git log` shows commits past `851d62fc`, read the commit messages to see how far batch 19 got, then resume at the next TODO checkbox.

All file paths in this doc are absolute (rooted at `/Users/ularkimsanov/Desktop/hyperframes-3/`) or library-relative (rooted at `skills/website-to-hyperframes/examples/`). No ambiguity.
