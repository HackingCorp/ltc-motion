# fadeglow-music-video-v4 — Storyboard

**Format:** 1920×1080 · 30fps · 41.56s
**Audio:** `assets/bgmusic.mp3` (cut of "HTML Fadeglow")
**Transcript:** `assets/transcript.json` (word-level, large-model whisper)
**Ethos:** Each beat is its OWN visual world. No shared palette or typeface between neighbors. Lean poppy. Smash cuts. Word-by-word kinetic captions as the through-line.

## Beat map

| # | Time | Dur | Lyric | World |
|---|------|-----|-------|-------|
| 1 | 0.0–4.84 | 4.8s | "It's just HTML, baby." (starts 2.12) | **Risograph cover**: red+cobalt on cream, raw HTML tags as decoration |
| 2 | 4.90–14.58 | 9.7s | ~20× "bum" chant | **Neobrutalist viz**: magenta+black on white, full-bleed spectrum, BPM HUD |
| 3 | 15.64–20.86 | 5.2s | "This video you're watching right now ain't nothing but HTML." | **CRT meta**: dark cobalt bg, amber phosphor scanlines, screen-in-screen |
| 4 | 21.12–25.82 | 4.7s | "Every fade, every glow, every word on the screen is a file you can open yourself." | **Gradient glow garden**: peach/teal/lilac soft-light, each word tagged with a CSS property |
| 5 | 25.96–30.42 | 4.5s | "Ooh, it's a template, baby, ooh, it's a template." | **Figma wireframe**: pink+purple on cream, placeholder boxes labeled `[template]` |
| 6 | 31.32–33.68 | 2.4s | "You want these lyrics? Change. Then change them." | **Palette swap**: starts lime/navy, LITERALLY flips to magenta/yellow on "Change"; Memphis confetti |
| 7 | 33.94–35.92 | 2.0s | "Want this spotlight? Red. Go ahead." | **Bauhaus RED**: floods pure red on "Red", black+cream circles, single giant word |
| 8 | 36.60–41.04 | 4.4s | "It's just a div and a timeline, baby. Edit the code, render it fresh." | **Code→render**: warm light editor, syntax-highlight poppy colors, a `<div>` materialises into a rendered frame |

## Keyframes-first workflow

`mockups/beat-0N-*.html` — one static 1920×1080 HTML per beat, fully self-contained (own CSS, own fonts). Represents the *peak visual moment* of the beat.

`mockups/contact-sheet.html` — 3×3 grid of iframes at 0.33 scale for review.

Animate only after all 9 keyframes are approved.

## Per-beat notes

### 1. HTML baby (cover)
Title card doubles as lyric. "html_fadeglow" wordmark. Risograph grain. Thick sans display + mono caption. Red+cobalt misregistration trick. Position caption `"it's just HTML, baby"` dead-center, bold.

### 2. Bum chant viz (longest — 9.7s viz hero)
Full-bleed spectrum bars. ~20 beats in chant = 20 bar-pulses. Giant "BUM" typography that swaps position with each beat. Neobrutalist black outlines, hot magenta fill. Tabular BPM counter in corner. High-contrast white bg.

### 3. CRT thesis
Dark blue CRT monitor filling frame. Amber/green phosphor text. Scanlines + subtle warp. Caption renders as terminal typing. Meta joke: a tiny browser window inside the CRT showing itself.

### 4. Every fade / every glow
Each noun ("fade", "glow", "word", "screen", "file") gets its own CSS-styled chip floating on a soft peach→teal→lilac gradient field. Annotations like `filter: blur(8px)` next to each. Soft light, inviting.

### 5. Template
Figma-like inspector panel on the right. Wireframe placeholder rectangles labeled `[Template]`, `[Component]`. Purple/pink on cream. Handles + constraints visible. Layout feels like designing in real time.

### 6. Change (palette swap)
Before/after in one frame: left half = original calm palette (navy + lime), right half = post-flip (magenta + yellow + black). Lightning-bolt/swap icon in middle. Memphis-style squiggles + dots. The moment is the cut.

### 7. RED
Mostly blood-red. One giant cream "RED" at 800px font. Black Bauhaus circle in corner. Subtitle: `color: #E63946;` in mono. Spotlight beam from above.

### 8. Div + timeline (closer)
Warm cream-light code editor on left with syntax highlighted HTML. Timeline scrubber on bottom. Rendered output panel on right showing a tiny composition playing. Feels like "watching it build." Soft glow confirming the render.
