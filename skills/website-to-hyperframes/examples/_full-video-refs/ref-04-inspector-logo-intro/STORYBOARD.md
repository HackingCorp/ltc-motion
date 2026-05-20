# Inspector Logo Intro — Storyboard & Contact Sheet Plan

## Concept

A logo intro sequence that precedes the current scene-00 of the inspector launch video. The HyperFrames logo flies through camera, lands with spring physics, then "Inspector" joins it. A magnifying glass effect (ported from the Remotion html-in-canvas repo) scans over "Inspector," then drops away as the camera zooms in. A cursor enters and interacts with a live Inspector panel — color picker, font library, size controls — before dragging the text off-screen via cut-the-curve into the existing scene-00.

## Design System

Inherits from the parent project (`hyperframes-inspector-launch-contact-sheet/DESIGN.md`):

- Deep canvas: `#07100c`
- Green: `#45d86e`
- Cyan: `#19b7d5`
- Warm paper: `#fff8e9`
- Amber: `#f1b64a`
- Coral: `#d97757`
- Ink: `#191713`
- Claude surface: `#f5f4ed`
- Display: Inter, ui-sans-serif, system-ui, sans-serif
- Mono: IBM Plex Mono, SF Mono, ui-monospace, monospace

## Beat Sheet

### Beat 1 — Background Warp (0.25s)
**Time:** 0.00–0.25s

- **What:** Plain green field (`#45d86e` or similar) fills the frame. Within 0.25s it warps/morphs into the halftone grid background matching the main video's canvas style.
- **Background:** Starts as flat green. Rapid scale + density warp transition into the oversized halftone dot field. The dots emerge from the center outward, like a pulse.
- **Transition:** Instant start. No ease-in — we're already moving at frame 1.
- **What moves first:** Background (it IS the only element).

### Beat 2 — Logo Fly-Through (0.6s)
**Time:** 0.25–0.85s

- **What:** The HyperFrames wordmark (`hf-logo.svg`) flies toward the camera from deep Z-space. Starts tiny/blurred in the center, scales up rapidly past 1.0 (overshoots), then settles with a spring curve.
- **Motion reference:** The Remotion html-in-canvas glass-frame fly-through. The logo should feel like it's punching through a glass plane toward the viewer. Brief motion blur / chromatic fringe at peak velocity.
- **Spring config:** High stiffness, moderate damping — the logo should overshoot ~15% then settle in 2–3 bounces. Think `spring({ stiffness: 180, damping: 14 })` equivalent.
- **End state:** Logo centered, full size (~400px wide wordmark), sharp, on the halftone background.
- **Background:** Halftone alive — subtle breathing drift, no major shift yet.
- **What moves first:** Logo (background is already established).

### Beat 3 — Logo Settles + Slides Left, "Inspector" Enters (0.8s)
**Time:** 0.85–1.65s

- **What:** Immediately after spring settle, the logo begins scaling down (~60% of landing size) and translating left. This is one continuous spring motion — the settle bleeds directly into the reposition. As the logo reaches its left position, "Inspector" slides in from the right, letter by letter with staggered timing.
- **Logo motion:** `scale: 1.0 → 0.6`, `x: center → -220px` (approx). Spring curve continues — no hard keyframe boundary between the settle and the slide.
- **"Inspector" entry:** Each letter enters from right with ~0.04s stagger. Letters have slight blur on entry that clears. The word assembles left-to-right. Final position: right of the logo, forming the lockup "HyperFrames Inspector."
- **Typography:** "Inspector" in Inter, weight 800, sized to match the logo proportionally. Color: `#fff8e9` (warm paper).
- **Background:** Halftone does a subtle leftward drift matching the logo's slide direction (background leads by 0.1s per motion rules).
- **What moves first:** Background drifts left (0.1s lead) → logo scales/slides → "Inspector" letters stagger in.

### Beat 4 — Magnifying Glass Effect (1.2s)
**Time:** 1.65–2.85s

- **What:** A circular magnifying glass lens (ported from the Remotion WebGL shader) appears over the "Inspector" text. It enters from the right side with spring physics, hovers/scans leftward across the word with noise-driven jitter (fbm-based, same as reference), then exits.
- **Shader:** The fragment shader from `gl.ts` — spherical lens profile, chromatic aberration at rim, specular highlights, rim darkening. Magnification ~2.4x. We adapt this to work with a canvas overlay capturing the text layer beneath.
- **Lens motion:** Enters from right edge, scans left across "Inspector" with organic jitter (heavy X amplitude ~0.32, light Y amplitude ~0.025, same as reference). The scan takes ~0.8s.
- **Lens exit:** After scanning, the lens springs downward and scales to 0 over ~0.3s. Like it's dropping off the frame with gravity.
- **Background:** Halftone breathing continues. During the scan, a subtle hue shift (toward cyan) follows the lens position.
- **What moves first:** Lens enters → scans → drops out.
- **Placeholder note:** The WebGL shader needs to be ported from Remotion's `HtmlInCanvas` API to a standalone canvas overlay in HyperFrames. The shader itself (VS/FS) is directly portable; the texture upload path needs adaptation.

### Beat 5 — Zoom In on "Inspector" (0.5s)
**Time:** 2.85–3.35s

- **What:** As the magnifying glass drops, the camera zooms in on "Inspector." The HyperFrames wordmark fades/scales out of frame (it's to the left, so it exits left). "Inspector" scales up to fill ~70% of frame width, centered.
- **Motion:** Zoom-through style — scale accelerates with `power3.in` on the zoom, blur peaks mid-transition, then `expo.out` settle. But this is a camera move, not a text swap, so both the logo exit and the Inspector zoom are part of one continuous forward motion.
- **End state:** "Inspector" centered, large (~70% frame width), sharp, warm paper color on halftone.
- **Background:** Major halftone shift — scale up, slight upward drift. Background leads by 0.1s.
- **What moves first:** Background zooms → logo fades left → "Inspector" scales to center.

### Beat 6 — Cursor Enters + Text Selection (0.8s)
**Time:** 3.35–4.15s

- **What:** A cursor (macOS pointer style) enters from the bottom-left corner. It travels to a position near the top-left of the letter "t" in "Inspector." Then it clicks and drags diagonally downward, leaving a blue highlight selection on just the letter "t."
- **Cursor path:** Bottom-left corner → top-left of "t". Smooth bezier path, not a straight line. Speed: fast travel, ease into position.
- **Selection:** Click point near top of "t". Drag diagonally downward across the letter. Blue selection highlight (`rgba(25, 183, 213, 0.3)` — cyan tinted) follows the drag in real-time.
- **End state:** Letter "t" selected with blue highlight. Cursor resting at bottom of "t".
- **Background:** Halftone breathes. No major shift — the cursor action is the focus.
- **What moves first:** Cursor enters → pauses briefly at "t" → drag begins → selection fills.

### Beat 7 — Inspector Panel Slides In (0.6s)
**Time:** 4.15–4.75s

- **What:** The Inspector panel slides in from the right edge of the screen. This is a rounded-corner, softer recreation of the Inspector panel from the screenshot — not pixel-perfect but faithful in spirit. It contains: color picker, font selector, size controls.
- **Panel design:** Rounded corners (~24px), dark surface (`#0d1a14` or similar dark green-tinted), warm paper text. Sections: Layout (X/Y/W/H fields), Stroke, Effects, and prominently: a color swatch showing current text color, a font dropdown showing "Inter", a size field showing the current size.
- **Entry:** Slides from `x: +400px` to final position (right side of frame, ~440px wide). Spring curve with slight overshoot.
- **Background:** Halftone shifts right slightly (anticipating the panel's arrival, 0.1s lead).
- **What moves first:** Background shifts right → panel slides in from right.

### Beat 8 — Color Picker Interaction (0.8s)
**Time:** 4.75–5.55s

- **What:** Cursor moves to the color swatch in the panel, clicks it. A color picker opens (gradient square + hue/alpha sliders + hex field — matching the Inspector screenshot). Cursor selects a blue color (`#19b7d5` cyan-blue). Only the selected letter "t" changes color — rest of "Inspector" stays warm paper.
- **Cursor motion:** From selection end-point → color swatch (smooth bezier). Click → picker opens → cursor moves to blue → click.
- **Live update:** As the cursor hovers near blue in the picker, the "t" starts transitioning. On click, it snaps to final blue.
- **End state:** Letter "t" is now cyan-blue. Rest of word remains `#fff8e9`. Color swatch in panel reflects the new color.
- **What moves first:** Cursor moves → click → picker opens → cursor selects → "t" updates.

### Beat 9 — Font Library Interaction (0.8s)
**Time:** 5.55–6.35s

- **What:** Cursor moves to the font dropdown in the panel, clicks it. A font list opens. Cursor clicks through 3–4 fonts rapidly — each click instantly changes only the "t" letter's font. Rest of "Inspector" stays Inter. Fonts cycle: Inter → Fraunces (serif) → IBM Plex Mono → final choice.
- **Font cycling:** Each font swap is instant on the "t" only. ~0.15s per font click.
- **End state:** "t" in a chosen final font, rest of word unchanged.
- **What moves first:** Cursor → click dropdown → rapid font clicks → "t" updates live.

### Beat 10 — Size Interaction (0.5s)
**Time:** 6.35–6.85s

- **What:** Cursor moves to the size field. Drags or scrubs the value — only the "t" scales up and down in real-time. Rest of word stays at base size. Settle on a slightly larger "t."
- **End state:** "t" at adjusted size, rest of "Inspector" at base size.
- **What moves first:** Cursor → size field → drag/scrub → "t" scales.

### Beat 11 — Drag Off + Cut-the-Curve Transition (0.5s)
**Time:** 6.85–7.35s

- **What:** Cursor grabs the "Inspector" text (selection handles appear briefly) and drags it off the left side of the frame. As the text exits left, the Inspector panel slides off right simultaneously. This is a cut-the-curve transition into the existing scene-00 of the main video.
- **Cut-the-curve:** "Inspector" text accelerates leftward (`power3.in`), blur peaks at the cut point. Scene-00's dark prompt box continues the leftward motion entering from the right (`expo.out`). Background leads the transition by 0.1s with a major leftward halftone shift.
- **End state:** Clean handoff to existing scene-00 (dark Claude prompt box with typewriter text).
- **What moves first:** Background shifts left (0.1s lead) → cursor drags text left + panel exits right → blur peak → scene-00 content enters from right.

## Total Duration

~7.35s for the full intro sequence.

## Technical Notes

### Magnifying Glass Shader Port

The Remotion `gl.ts` shader is standard WebGL2. The key adaptation:

1. **Vertex/Fragment shaders** (`VS`/`FS`) — directly portable, no Remotion dependency.
2. **Texture source** — Remotion uses `texElementImage2D` (their custom API). In HyperFrames, we'll render the text layer to a `<canvas>`, then upload via standard `texImage2D`.
3. **Noise functions** — `hash1`, `valueNoise`, `fbm` are pure math, copy directly.
4. **Spring physics** — replace Remotion's `spring()` with GSAP spring-equivalent or a custom spring function.
5. **The lens uniforms** — `u_lensCenter`, `u_lensRadius`, `u_aspect`, `u_magnify` — drive these from GSAP timeline values.

### Cursor

CSS-rendered cursor element (not a system cursor). White pointer with 2px dark outline, drop shadow. Animated via GSAP along bezier paths.

### Inspector Panel

HTML/CSS recreation — not a screenshot. Rounded corners, dark theme matching the video's canvas. Interactive-looking but all state changes are timeline-driven (no real interactivity).

### Spring Curves in GSAP

GSAP doesn't have a native spring easing. Options:
- Use `CustomEase` with a spring curve (pre-calculated control points).
- Use `gsap.to()` with `type: "spring"` via InertiaPlugin (if available).
- Manually animate with a spring physics function updating via `gsap.ticker`.

For this project, we'll use a damped spring function on the GSAP ticker for the logo fly-through and settle, and `CustomEase` approximations for simpler spring motions (panel slide-in, etc.).

## What Is Intentionally Placeholder

- The exact Inspector panel layout — will be refined based on the screenshot reference once we build it.
- Font choices during the cycling beat — will pick fonts that are visually distinct at large sizes.
- Exact cursor bezier paths — will tune in preview.
- The magnifying glass shader may need visual tuning (lens radius, magnification, chromatic aberration strength) once we see it on the halftone background.

## Halftone Background System (from halftone-motion-examples.html)

Canvas-rendered halftone field — NOT CSS radial-gradient dots. The background is one continuous warped surface; dots are texture, not independent particles.

### Core Components
- **drawHalftone()** — fbm domain warping, 3 gradient masses (elliptical color fields), dot-level energy/color from shaderField()
- **paintShaderWash()** — soft color overlay in screen blend mode (green, cyan, amber ellipses + ribbon)
- **shaderField()** — per-dot shape/hue/ribbon/nested values from warped field coordinates
- **Spacing** = 5.15 / density, **base radius** = 1.02

### Transition Modes Per Beat
| Beat | Mode | Swell | Blend | Notes |
|------|------|-------|-------|-------|
| 1 | **FIELD WIPE** | 1.65 | 0.98 | Dots emerge from zero. Most explosive opening. |
| 2 | **DOT BLOOM** | 1.35 | 0.85 | Radius swell at logo impact. Hue+sat kick. |
| 3 | **SOFT CUT** | 0.35 | 0.20 | Same field drifts left under the slide. |
| 4 | **CURRENT** | — | — | Slow domain warp. Hue tracks magnifying glass. |
| 5 | **FIELD WIPE** | 1.65 | 0.98 | Explosive zoom transition. Dots blur to wash, resolve. |
| 6–10 | **PROOF BEAT** | — | — | Measured lateral ±34px. Background serves the UI. |
| 11 | **CUT-CURVE V2 60%** | 0.81 | 0.51 | BG accelerates with fg, field drags laterally, bloom at cut. |

### Energy Arc
The background follows a clear energy arc: **explosive** (beats 1–2) → **settling** (3–4) → **explosive** (5) → **calm/precise** (6–10) → **explosive exit** (11). This gives the viewer breathing room during the interactive section while bookending with high-energy moments.

## Motion Rules (from parent project)

- Cut-the-curve for the final transition into scene-00.
- Background halftone leads all transitions by 0.1s.
- First visible motion within 0.2s (we start at frame 1 with the green warp).
- Background always alive — breathing, never static.
- Spring physics for the logo landing and panel entries.
