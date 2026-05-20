# ref-05 — fadeglow-music-video-v4

A **music video**. 41.6s, 8 beats, **no narration**, music-driven cuts. Different mode entirely from anything else in the library. Beat-driven motion synced to the soundtrack, kinetic typography on warm cream backgrounds, code-editor + gradient-canvas + waveform aesthetics. The library is otherwise heavily product-marketing-skewed; this fills the missing "music video" grammar.

**Watch the assembled MP4:** https://www.heygenverse.com/s/5eee1ed3-3255-473b-a0e0-f488eda984df/raw

---

## Why this ref

Every other full-video ref in the library teaches **product launch grammar** — narration drives beat timing, beat content is product UI / brand identity / call-to-action. **Music video grammar is different:**

- No narration. Music drives the cuts.
- Beats are emotional / kinetic / aesthetic, not informational.
- Typography is the visual focal point — large kinetic word stacks with gradient sweep fills, code-editor + canvas aesthetics, warm cream / red / amber palette instead of corporate blue.
- Pacing is felt, not measured. Some beats are 2s, some are 9s — driven by what the song does at that point.
- No CTA. The ending lands, doesn't sell.

**When agents would reach for this:** when the user says "make me a music video," "I want this for our album drop," "playful / kinetic / no voiceover," or "something that feels like a Fred Again drop." Most agents pattern-match to "product demo with VO" by default; this is the reference for when that's the wrong default.

---

## How to study

1. **Watch the MP4** at https://www.heygenverse.com/s/5eee1ed3-3255-473b-a0e0-f488eda984df/raw.
2. **Read `index.html`** — 57 lines, very simple. 8 sub-composition slots all on track 1 (no overlap), one audio track. No HyperShader, no captions, no SFX track — just music + 8 sequential beats.
3. **Read each `compositions/beat-NN-*.html`** in order:
   - `beat-01-html-baby.html` (76 lines, 4.84s) — "HTML baby" intro typography
   - `beat-02-bum-viz.html` (133 lines, 9.74s) — visualization beat (longest in the video)
   - `beat-03-crt-thesis.html` (105 lines, 6.28s) — CRT-style thesis statement
   - `beat-04-every-fade.html` (119 lines, 4.96s) — "every fade" theme
   - `beat-05-template.html` (126 lines, 4.60s) — template/scaffold reveal
   - `beat-06-change.html` (113 lines, 3.38s) — change/transformation beat
   - `beat-07-red.html` (81 lines, 2.11s) — fast red impact beat
   - `beat-08-div-timeline.html` (164 lines, 5.64s) — the closer — code editor + gradient canvas with kinetic text
4. **Browse `mockups/`** — 14 mockup HTMLs from planning. Some are alternative versions of the same beats. Shows the iteration process.

---

## BEAT MAP

| Beat | File | Duration | Aesthetic | Notes |
|------|------|----------|-----------|-------|
| 1 · HTML baby | `beat-01-html-baby.html` | 0.00 - 4.84s | Intro typography on warm cream bg | Kinetic word build, sets the warm/cream visual palette for the whole video |
| 2 · Bum viz | `beat-02-bum-viz.html` | 4.82 - 14.56s | **Longest beat** — visualization layer, layered motion | Often the visual peak of a music video — give the longest beat to the most complex visual |
| 3 · CRT thesis | `beat-03-crt-thesis.html` | 14.58 - 20.86s | CRT scanline aesthetic over the thesis statement | CRT treatment connects to ref-03 hermes-hyperframes' aesthetic vocabulary |
| 4 · Every fade | `beat-04-every-fade.html` | 20.86 - 25.82s | Multi-element fade choreography | "Every fade" theme — fades as the visual subject, not just transitions |
| 5 · Template | `beat-05-template.html` | 25.82 - 30.42s | Template / scaffold reveal | Composition-as-content beat — the structure IS the visual |
| 6 · Change | `beat-06-change.html` | 30.42 - 33.80s | Transformation beat | Faster cut leading to the impact |
| 7 · Red | `beat-07-red.html` | 33.81 - 35.92s | **Fastest beat (2.11s)** — red impact | Music video pacing — short impact cuts work because the soundtrack does the heavy lifting |
| 8 · Div timeline | `beat-08-div-timeline.html` | 35.92 - 41.56s | **Closer** — code editor on left + gradient canvas on right with kinetic text "Edit / Fresh line" with shimmer gradient sweep fill | The signature beat of the video — code-editor + live-preview aesthetic with the "fresh line" being painted with rainbow gradient sweep |

---

## Architecture

**Sequential sub-composition slots, all on the same track index.** Different from ref-01 (4 acts as overlapping slots) and ref-02 (10 pre-rendered MP4 clips):

```html
<div data-composition-src="compositions/beat-01-..." data-start="0"    data-duration="4.84" data-track-index="1"></div>
<div data-composition-src="compositions/beat-02-..." data-start="4.82" data-duration="9.74" data-track-index="1"></div>
...
```

All 8 beats on track 1 → they don't overlap → simple sequencing. Music plays on track 0 for the whole 41.56s. No captions, no SFX.

This is the **cleanest possible architecture** for a video where each beat fully replaces the previous. Use when:
- No cross-beat persistence needed (no element stays on screen across beats)
- Beats are conceptually distinct (different visuals each time)
- Audio is music-only (no narration-sync complexity)
- No shader transitions desired (the hard cut on the music beat IS the transition)

---

## What this ref teaches that single scenes don't

- **Music video grammar.** The library has no other music-video reference. Different pacing rules, different visual vocabulary (kinetic typography + cream/red/amber palette + CRT scanlines instead of corporate blue + clean dashboard).
- **Beat-duration variance dictated by the song, not by content.** Beat 7 is 2.11s, beat 2 is 9.74s — the song decided. Product videos usually have more even pacing because the script needs even airtime; music videos can let one beat hold for 10s and another flash by in 2s.
- **No-narration architecture.** No captions, no SFX, just music + 8 beats. The TIGHTEST possible orchestration for "this is the visual side of the song." Useful pattern when the user says "no voiceover, just visuals."
- **Aesthetic coherence across 8 distinct beats.** Each beat has different content (typography / viz / CRT / fade / template / change / red impact / code editor) but they ALL share the warm cream + red + amber palette. Reading the 8 compositions side-by-side shows how to maintain visual coherence across visually-different beats.
- **The "code editor + live preview" closer pattern** (beat-08-div-timeline). Code on left, gradient canvas with kinetic text on right, "fresh line" painted with rainbow gradient sweep fill — this is the canonical "watch the code make the visual" beat. Similar to `examples/04-composed-ui/scene-10-terminal-with-preview/` but warmer/more cinematic.

---

## ⚠ Assets not bundled

To keep the ref slim (188K), the following are NOT included:

- `assets/bgmusic.mp3` — the soundtrack (listen on the assembled MP4)
- `assets/analysis.json` (audio analysis output)
- `assets/transcript.json` (not used — this is a no-narration video)
- The mockups subdir IS included (188K total) for process artifact value — shows planning iterations

To re-render: the production project is at `~/Downloads/Archive 2/fadeglow-music-video-v4/`.
