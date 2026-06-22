---
name: media-use
description: Agent Media OS — resolve any media need (BGM, SFX, voice, image, icon, brand asset) into a frozen local file + ledger record. One verb (`resolve`) handles the full cascade: project cache, global cache, provider search, generation fallback, freeze, register. Keeps search noise on disk, hands the agent a path. Use when a composition needs audio, images, icons, or brand assets.
---

# media-use

Resolve media needs into frozen local files. One verb, all types, zero context noise.

## Quick start

```bash
# resolve a media need
node <SKILL_DIR>/scripts/resolve.mjs --type bgm --intent "subtle confident tech" --project .
# → resolved bgm_001 → .media/audio/bgm/bgm_001.wav (bgm, 11s)

# adopt all existing assets/ files into the manifest (run once per project)
node <SKILL_DIR>/scripts/resolve.mjs --adopt --project .
# → adopted 4 assets from assets/
#   bgm_001 → assets/bgm/track.mp3 (bgm)
#   image_001 → assets/icons/logo.svg (icon)
```

## Supported types

| Type    | What it finds       | Search provider              | Generate fallback              |
| ------- | ------------------- | ---------------------------- | ------------------------------ |
| `bgm`   | Background music    | HeyGen audio catalog         | hyperframes bgm (local gen)    |
| `sfx`   | Sound effects       | HeyGen audio catalog         | Bundled SFX library            |
| `voice` | TTS voiceover       | ElevenLabs                   | hyperframes tts (Kokoro local) |
| `image` | Photos, backgrounds | Asset Scout + HeyGen library | fal.ai image gen (Flux)        |
| `icon`  | Icons, logos        | Asset Scout + HeyGen library | —                              |
| `brand` | Brand kit assets    | HeyGen brand kits            | —                              |
| `video` | B-roll clips        | HeyGen video search          | fal.ai video gen (v1.1)        |

## How it works

1. Check project `.media/manifest.jsonl` for exact-prompt match
2. Scan existing `assets/` directory for unregistered files matching the need
3. Check global cache `~/.media/` for reusable asset
4. Search via provider (HeyGen catalog, Asset Scout, ElevenLabs, brand kits)
5. Fall back to generation (fal.ai image/video gen, hyperframes bgm, Kokoro TTS)
6. Freeze file to `.media/<type>/`, register in manifest, regenerate `index.md`

The agent gets back **one line**. Candidates, scores, provenance stay on disk.

## Working with existing projects

Most HyperFrames projects already have assets in `assets/` (audio in `assets/bgm/`, images in `assets/icons/`, etc.). media-use is aware of these:

- **`--adopt`** scans `assets/` and registers every media file in the manifest without moving anything. Compositions keep their existing `src="assets/..."` paths. Run once per project to get a full inventory.
- **During resolve**, if an unregistered file in `assets/` matches the intent, media-use adopts it on the fly — no re-download, no provider call.
- The `index.md` shows ALL media: both `.media/` (resolved) and `assets/` (existing). Agents see the complete picture.

## Files

- `.media/manifest.jsonl` — machine SSOT, one JSON record per line
- `.media/index.md` — agent-readable table (id, type, dur, dims, path, description)
- `~/.media/` — global cross-project reuse cache (content-addressed, SHA-256)

## CLI tools used

media-use orchestrates these tools (all installed locally):

| Tool          | Purpose                                                  | Required?             |
| ------------- | -------------------------------------------------------- | --------------------- |
| `ffprobe`     | Probe duration, dimensions, codec on adopt/resolve       | Yes                   |
| `ffmpeg`      | Format conversion, audio normalization                   | For processing        |
| `fal`         | Image generation (Flux), video generation                | For generate fallback |
| `yt-dlp`      | Download video/audio from URLs (1000+ platforms)         | For resolve:video     |
| `elevenlabs`  | High-quality TTS (via audio engine)                      | For resolve:voice     |
| `hyperframes` | Local BGM gen (Lyria/MusicGen), TTS (Kokoro), transcribe | Fallback              |
| `heygen`      | Audio catalog search, asset search, brand kits           | For search providers  |
| `ImageMagick` | Resize, convert, composite images                        | For processing        |

## References

- `references/resolve-types.md` — per-type provider chains and manifest fields
- `references/manifest-schema.md` — JSONL record schema and index format
