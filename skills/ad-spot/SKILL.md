---
name: ad-spot
description: Produce a ready-to-run 26 s vertical (9:16) advertising spot — AI footage for humans/ambiance, HTML panels for every piece of on-screen text (chat UIs, dashboards, code), segmented neural voice-over, original music, animated captions and a brand end card. Use when the user asks for a video ad, a promo spot, a Meta/TikTok ad, or to turn a marketing angle into a finished MP4.
---

# ad-spot

Turn one marketing angle into a finished 26 s vertical ad (1080×1920 MP4) that passes the two review criteria that kill AI-made ads: **every word on screen is legible** and **the voice-over carries energy**.

## The two field-tested rules

1. **Never let AI-generated video show readable text.** Kling/Wan/Veo render gibberish on phone screens, dashboards, and terminals — one garbled close-up destroys the ad's credibility. AI clips are ONLY for humans and ambiance (faces, gestures, places, phones seen from the back / switched off / at an oblique angle). Anything textual — chat bubbles, product cards, CRM boards, stats, code — is rendered as an **HTML panel inside the composition** (crisp at any resolution, real copy).
2. **Segment the voice-over per scene.** One continuous VO reads flat and drifts out of sync. Generate one short clip per scene (`vo-1.wav` … `vo-4.wav`) and mount each at its scene's start (`data-start`). Recommended voice for energetic French ads: edge-tts `fr-FR-RemyMultilingualNeural` at `--speed 1.08`.

## Spot skeleton (validated timings)

```
S1  0.0 – 7.2   hook          panel OR human clip + caption
S2  7.2 – 16.5  demo          HTML panel (the feature, with real text)
S3 16.5 – 21.4  human payoff  AI clip, screen-free window + caption
END 21.4 – 26   end card      brand badge + claim + CTA pill
vo-1 @0.6 · vo-2 @7.6 · vo-3 @17.0 · vo-4 @22.0 · music 0–26 @volume 0.2
```

Composition layout: `<video class="clip">` elements on `data-track-index="0"` (muted, trimmed with `data-duration`), one full-length overlay `<div class="clip">` on track 1 holding watermark, panels, captions, end card and all `<audio id=…>` elements (audio without an `id` renders SILENT). A complete working template with CSS (WhatsApp-style bubbles, product card, notification card, stats bars, code block, end card) is in [`references/spot-template.html`](references/spot-template.html).

## Production pipeline

```bash
# 1. Voice-over — one segment per scene (instant, free)
npx hyperframes tts "Il est 23 heures. Une cliente vous envoie un vocal." \
  --provider edgetts --voice fr-FR-RemyMultilingualNeural --speed 1.08 -o assets/vo-1.wav
# … repeat for vo-2..4 (S1 ≈ 4-6 s, S2 ≈ 5-7 s, S3 ≈ 2 s, CTA ≈ 3 s of speech)

# 2. Music — 26 s bed matched to the angle's mood
npx hyperframes music "warm uplifting afrobeats-inspired ad background" \
  --provider musicgen --duration 26 --bpm 105 -o assets/bgm.wav
# musicgen runs `python3` — if your python3 lacks transformers/torch, shim it:
#   mkdir -p /tmp/pyshim && ln -sf "$(command -v python3.11)" /tmp/pyshim/python3
#   PATH=/tmp/pyshim:$PATH npx hyperframes music …

# 3. AI clips (humans/ambiance only) — any provider; prompt away from screens:
#    "phone face down", "screen away from camera", "over-the-shoulder, screen not visible"

# 4. VERIFY the clips before mounting — extract frames across each clip's window
ffmpeg -ss 2 -i clip.mp4 -frames:v 1 check-2s.png   # repeat at 4-6 s and near the end
#    Any frame with readable-looking garbled text → replace that scene with an HTML panel
#    or trim data-duration to the clean window.

# 5. Compose from references/spot-template.html, then lint + render
npx hyperframes lint .      # fix gsap_exit_missing_hard_kill: add tl.set(sel,{opacity:0},boundary)
npx hyperframes render . -o spot.mp4

# 6. QC the render — one frame per scene + end card; read every word
for t in 3 12 19 24; do ffmpeg -ss $t -i spot.mp4 -frames:v 1 qc-$t.png; done
```

## Gotchas

- **`gsap_exit_missing_hard_kill`** — every panel fade that ends at a clip boundary (7.2, 16.5, 21.4) needs a matching `tl.set("#panel", { opacity: 0 }, boundary)` after the exit tween, or non-linear seeks leave stale visibility.
- A timed `<video>` must be a **top-level clip on its own track** — nested inside a timed element it renders frozen.
- `<audio>` needs an `id` attribute or the mix is silent.
- Trimming: a 10 s clip mounted with `data-duration="4.9"` plays only its first 4.9 s — use this to keep only the screen-free window of a shot.
- End card covers track 0 from 21.4 s, so the last clip only needs footage up to ~22 s.

## Scaling to a series

For N angles, keep CSS/skeleton/timeline identical and swap only: the three clips, four VO lines, three caption pairs, claim and CTA. A ~40-line generator script (template + per-spot dict, plain string replacement) produces all compositions; renders take ~30 s each. Six-spot series cost in practice: a few dollars of GPU video generation, zero for VO (edge-tts) and music (local MusicGen).
