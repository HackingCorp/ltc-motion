# ref-04 — inspector-logo-intro

A production-density 12.77s logo intro composed as a **single 1344-line HTML file**. No sub-compositions, no HyperShader — just one composition that orchestrates a full Figma-style design-tool-inspector reveal arc. Halftone canvas background → green flash → HyperFrames logo strike → "Inspector" letterforms type in → magnifying glass sweeps over with text clone + ring + handle → selection highlight + cursor → full Inspector panel with cycling values (Color RGB / Font / Size).

**Watch the assembled MP4:** https://www.heygenverse.com/s/e0474ffa-9c3b-4f50-b8aa-03c92ba72bf2/raw

---

## Why this ref

The library has `scene-13-design-inspector/` — my lift of the Inspector-panel concept that demonstrates the cycling-values pattern. **This production original is significantly denser** and shows the **full intro arc** the single-scene version doesn't:

- Green flash overlay (beat 1)
- Halftone canvas background (procedural canvas dot pattern)
- HyperFrames logo entrance (SVG + scale)
- "Inspector" type-on with per-letter spans (`l-I`, `l-n`, `l-s`, ...)
- Magnifying glass with text clone + overlay + ring + handle
- Selection highlight rectangle
- Cursor with arrow SVG
- Inspector panel with 5 sections (Document / Layout / Color / Font / Size)
- Color cycling: `rgb(255,248,233)` → `rgb(142,216,220)` → `rgb(76,200,217)` → `rgb(25,183,213)` (pre-rendered absolute-positioned spans)
- Font cycling: `Inter` → `Fraunces` → `IBM Plex Mono` → `Georgia`
- Size cycling: `120px` → `3` → `36` → `360px` → `4` → `48px` → `3` → `30` → `300px` (caret + highlight edit states)
- Color picker (stroke color modal with picker gradient + hue bar)

**It's also the only short-form (12.77s) production ref in the library.** Teaches "how to do a complete 10-15s mini-reveal at production density." Most launch videos are 30-60s; sometimes you need a tight 10-15s opener-or-explainer.

---

## How to study

1. **Watch the MP4** at https://www.heygenverse.com/s/e0474ffa-9c3b-4f50-b8aa-03c92ba72bf2/raw.
2. **Read `index.html`** end to end. 1344 lines, single composition. Everything inside one `<div data-composition-id="inspector-logo-intro">` block.
3. Pay attention to the **stacked-absolute-span pattern** for cycling values (search for `cl-0` through `cl-3` for RGB cycling, `fd-inter` / `fd-fraunces` / `fd-plex` / `fd-georgia` for font cycling, `sv-120` / `sv-sel` / `sv-caret` / `sv-3a` / `sv-36` etc. for size cycling). This is the canonical pattern for "cycling values in a UI panel" and it's seekable under `tl.seek()` — `tl.set(span, { opacity: 0/1 })` at fixed timestamps to swap which span is visible. The library's `scene-13-design-inspector/` uses this same pattern, lifted from here.
4. Pay attention to the **halftone canvas background** rendering. Search for `#halftone-bg` and the canvas-render code. Canvas-based pattern with `gsap.ticker.add()` reading `tl.time()` (the seekable-canvas pattern).
5. The **magnifying glass** is interesting — it's a CSS-only effect using a clone of the "Inspector" text scaled inside a circular clip-path ring. Search for `#mag-glass`, `#mag-text-clone`, `#mag-overlay`, `#mag-ring`, `#mag-handle`.

---

## Architecture

**Single-composition.** No sub-compositions, no HyperShader, no sub-comp loading. All 1344 lines inside `index.html`'s root `<div data-composition-id="inspector-logo-intro">`. The composition's `data-duration` is `12.75`.

Track index usage in `index.html`:

| Element | Track | Beat |
|---------|-------|------|
| `#halftone-bg` (canvas) | 0 | Background (entire 12.75s) |
| `#green-flash` | 1 | Beat 1 (0-1.33s) |
| `#logo-container` | 2 | Beat 1-2 (0.42-5.42s) |
| `#inspector-text` | 3 | Beat 2 (1.42-12.25s) |
| `#mag-glass` | 4 | Beat 3 (2.75-4.75s) |
| `#selection-highlight` | 5 | Beat 4 (5.58-12.25s) |
| `#cursor` | 6 | Beat 4-5 (5.58-12.25s) |
| `#inspector-panel` | 7 | Beat 5 (6.92-12.25s) |
| `#color-picker` | 8 | Beat 5 (7.92-9.25s) |

This is a great reference for **track-index hygiene** in single-composition videos — each tracked element gets its own track so the linter doesn't flag overlaps.

---

## What this ref teaches that single scenes don't

- **Single-composition production density at scale.** 1344 lines in one file. When to author this way vs. sub-comps: this works when (a) all beats share a common visual frame (the halftone bg is constant; the panel/cursor/highlight overlap each other), (b) the duration is short (10-15s), and (c) you want a tight orchestration without sub-comp loading overhead.
- **The canonical stacked-absolute-span swap pattern** at production scale. `scene-13-design-inspector` is the teaching version; this is the source.
- **Magnifying glass effect via CSS clip-path + text clone.** No WebGL, no JavaScript-driven masks — pure CSS. The text inside the magnifying glass is a `position: absolute` clone of the same "Inspector" text, scaled larger, clipped by the circular ring.
- **Cursor + selection-highlight choreography.** The cursor moves between target positions to make the inspector feel "operated on" rather than "shown to you." Cursor at the color row → color cycles. Cursor at the size field → size cycles. Cursor at the font dropdown → font cycles.
- **Beat-within-beat tightness.** The 12.75s composition has 5 clear sub-beats. Each sub-beat lasts ~2.5s. Inside each sub-beat, multiple things move continuously (the cursor + the cycling values + the selection-highlight pulse + the halftone canvas drift). **No static moments.**

---

## ⚠ Assets bundled (small)

This ref bundles the `assets/` directory because it's small (~16K) and contains only the SVG logo (`hf-logo.svg`) that the composition references. No audio, no captured screenshots — this video is silent (or rendered with music in production but the music isn't bundled here).

To re-render: the production project is at `~/Downloads/Archive/inspector-logo-intro/`. Has no sub-composition deps, so it should render anywhere with GSAP + Google Fonts loaded.
