# ref-06 — webgl-textures-playground (Shader Flow)

A **shader-as-the-entire-beat** reference. 12.0s, single composition. Pure Three.js WebGL fragment shader rendering as the load-bearing visual, with a kinetic typography overlay using `mix-blend-mode: screen`. **The shader IS the beat** — not a transition between scenes, not a layer behind composed UI, but the primary visual.

**Watch the assembled MP4:** https://www.heygenverse.com/s/094d6602-c8cf-4c08-99a0-80345a60958f/raw

---

## Why this ref

The library has 3 shader-transition refs (`scene-01-shader-transitions-showcase`, `scene-02-ripple-shader-transition`, `scene-03-glitch-shader-transition`) — all of which use the shader **as a transition between two scenes**. The library has 1 shader-with-HTML-overlay ref (`scene-01-webgl-shader` in section 07) — which uses the shader as a 1.2s **fragment effect** with a Canvas 2D fallback.

**Nothing in the library shows the pattern "the shader runs for the entire beat duration as the load-bearing visual."** That's what this ref is. Use it when:
- The user wants an atmospheric / abstract opener
- A brand reel where the shader recreates the website's hero gradient as a hold beat
- A music video atmospheric beat (overlap with ref-05 fadeglow's mode)
- An end-card where the shader breathes behind the wordmark

---

## How to study

1. **Watch the MP4** at https://www.heygenverse.com/s/094d6602-c8cf-4c08-99a0-80345a60958f/raw.
2. **Read `index.html`** — single composition. The Three.js setup (renderer + scene + camera + mesh + shader material) and the custom fragment shader (search for `gl_FragColor` and the GLSL code in a `<script id="frag" type="x-shader/x-fragment">` tag).
3. Pay attention to the **seekable WebGL pattern**: the shader's `uTime` uniform is driven by `gsap.ticker.add()` reading `tl.time()`, NOT by `requestAnimationFrame`. This is the canonical pattern for "WebGL animation that survives `tl.seek()`" — without it, the snapshot/render CLI would show a frozen first-frame.
4. The HTML overlay (`.sf-mark` with letter-by-letter gradient, `.sf-title`, `.sf-tag`) demonstrates how to layer **kinetic typography on top of a live shader** with `mix-blend-mode: screen` so the shader's color glows through the text.

---

## Architecture

**Single composition with hybrid Three.js + HTML overlay.** Two layers:

1. **WebGL canvas** (`.sf-canvas`) — full-bleed 1920×1080. Three.js scene with a single fullscreen plane running a custom fragment shader. The shader produces the entire visual — domain-warp FBM noise + cosine palette + multi-stop iridescent sweep.
2. **HTML overlay** (`.sf-overlay`) — `position: absolute; inset: 0; mix-blend-mode: screen;` containing:
   - `.sf-mark` — large gradient-filled letters (280px) with letter-by-letter entrance
   - `.sf-rule` — horizontal accent line (0→100% width)
   - `.sf-title` — uppercase title with clip-path reveal
   - `.sf-tag` — small caption labels

The `mix-blend-mode: screen` on the overlay is the key trick — it makes the white text glow through the colored shader instead of sitting flatly on top. This makes the typography feel "born from the shader" rather than "stamped on it."

---

## What this ref teaches that single scenes don't

- **The shader-as-the-beat pattern.** Library has shaders as transitions (5-section) and shaders as layer effects (07-01). Nothing shows the shader being the load-bearing visual for the whole beat. This is it.
- **The `gsap.ticker.add()` + `tl.time()` pattern at scene scale.** Used inside Three.js's animation loop to make the WebGL animation seekable. The library's `scene-02-canvas-ascii/` teaches this pattern for Canvas 2D; this teaches it for WebGL.
- **HTML-on-shader composition.** Layered text with `mix-blend-mode: screen` lets the shader colors illuminate the text edges. Different from putting text on a solid background — the text feels integrated with the shader's atmosphere.
- **Letter-by-letter typography with gradient fills.** Each letter is a `<span>` with its own gradient that animates in independently. Pair with the library's typography section (`01-`).
- **What "atmospheric" looks like.** This is the visual mode for "let it breathe / cinematic opener / something dreamy." When the user says "I want it to feel atmospheric / dreamy / not-corporate," this is the reference.

---

## When this is NOT the right pattern

- **Product demos.** Atmospheric shaders don't communicate product features. A live UI demo (kanban, dashboard, etc.) does. Don't reach for this when the brief is "show our product."
- **Information-heavy beats.** If the beat needs to deliver specific stats, copy, or a CTA, the shader competes for attention. Shaders work best for openers, transitions, end-cards, and atmospheric beats — not for the meat of the video.
- **Tight pacing.** This pattern wants to breathe — 8-15s minimum. If the storyboard is 0.7s per beat, this isn't it.

---

## ⚠ Asset deps

This ref has minimal deps:
- Three.js CDN script (loaded inline)
- GSAP CDN script (loaded inline)
- Inter font from Google Fonts

No bundled assets. The shader is GLSL code inside `index.html`. The composition is fully self-contained — should render anywhere with internet (for CDN script loading).

To re-render: the production project is at `~/Downloads/Archive/webgl-textures-playground/` — though this ref's lifted `index.html` is identical and renderable standalone.
