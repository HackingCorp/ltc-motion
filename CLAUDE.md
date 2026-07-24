# Hyperframes

Open-source video rendering framework: write HTML, render video.

> **Fork note (ltc-motion).** You are in [HackingCorp/ltc-motion](https://github.com/HackingCorp/ltc-motion), a synced fork of heygen-com/hyperframes maintained by HackingCorp / LTC Group. Install skills **from this repo** (commands below use it). Fork additions — `hyperframes tts` (7 providers: free neural voices via `--provider edgetts`, voice cloning via `--provider fishspeech`), `hyperframes music` (original music: Lyria 3 commercial-safe default, MusicGen non-commercial fallback CC-BY-NC), `@hyperframes/browser-export`, French Studio locale (`?lang=fr`), GCP Cloud Run parity tooling, 9:16 e-commerce blocks — are indexed in [`ROADMAP-LTC.md`](ROADMAP-LTC.md). Generic improvements are contributed upstream (no CLA); LTC/WazeApp-specific work stays here. Conventional commits + lefthook gates (fallow/oxfmt/commitlint) apply as described below.

## Skills

This repo ships 20 AI agent skills via [vercel-labs/skills](https://github.com/vercel-labs/skills). Install them before writing compositions — they encode framework-specific patterns that generic docs don't cover.

```bash
npx skills add HackingCorp/ltc-motion                        # interactive picker
npx skills add HackingCorp/ltc-motion --all                  # install all 20 (skips picker)
npx skills add HackingCorp/ltc-motion --skill <name>         # just one (bare name, no leading slash)
```

**`/hyperframes` is the entry skill — read it first.** It's the capability map for the domain skills below AND the intent router for the creation workflows. The full README skills section mirrors this list; keep them in sync (see "Skill catalog maintenance" below).

### Creation workflows

- `/product-launch-video` — a **product** URL (or a pre-written script / text brief in no-capture mode) → product launch / promo video, up to ~3 min (sweet spot ~30-90s).
- `/website-to-video` — a **general** website / URL → a video _of_ the site (tour / showcase / social clip from captured screenshots + assets); for a product **launch / promo**, use `/product-launch-video`.
- `/faceless-explainer` — arbitrary text, **no URL and no website capture** → faceless explainer, up to ~3 min (sweet spot ~30-90s); every visual is LLM-invented (typography / abstract graphics / diagram / data-viz).
- `/pr-to-video` — a GitHub PR (URL / `owner/repo#N` / "this PR") → code-change explainer, up to ~3 min (changelog / feature reveal / fix / refactor). A PR link, not a product website.
- `/embedded-captions` — an existing talking-head video (MP4) → the same footage with captions / subtitles added (verbatim rail + embedded climax, or pure-cinematic embed); the footage itself is untouched (no NLE-style editing).
- `/talking-head-recut` — an existing talking-head / interview / podcast video (MP4) → the same footage packaged with designed **graphic overlays** (kinetic titles, lower-thirds, data callouts, pull-quotes, side panels, PiP) synced to the transcript; the clip plays unchanged underneath, footage untouched. For plain captions/subtitles → `/embedded-captions`.
- `/motion-graphics` — a short (typically under 10s) design-led **motion graphic**, motion-is-the-message, no narration: kinetic type, a stat / number count-up, a chart, a logo sting, a lower-third / overlay, or an animated tweet / headline / captured-page highlight; rendered to MP4 or a transparent overlay. Longer / narrated / custom → `/general-video`.
- `/music-to-video` — a **music track** (audio file, or video to pull audio from) → beat-synced video (lyric / slideshow / kinetic promo). Music drives pacing; user-supplied images / videos are cut onto the same beat grid.
- `/slideshow` — a **presentation / pitch deck / interactive deck** — discrete slides, fragment reveals, branching, hotspot navigation, presenter mode. Output is a navigable deck, not a rendered video.
- `/general-video` — fallback for any other video creation (title card, longer brand / sizzle reel, multi-scene montage, static loop, custom composition); the original hyperframes flow — design → plan → layout → build → validate, any length.
- `/remotion-to-hyperframes` — port an existing Remotion (React) composition to HyperFrames HTML. One-way migration, not creation.
- `/ad-spot` — produce a ready-to-run 26 s vertical (9:16) advertising spot — AI footage for humans/ambiance, HTML panels for on-screen text, segmented neural voice-over, original music, animated captions and a brand end card. Use when the user asks for a video ad, promo spot, or Meta/TikTok ad.

### Domain skills (loaded on demand)

Atomic capabilities the creation workflows compose against — pull one when you need that specific layer:

- `/hyperframes-core` — the composition contract: `data-*` timing attributes, `class="clip"`, tracks, sub-compositions, variables, framework-owned media playback, determinism rules. Read before writing composition HTML.
- `/hyperframes-animation` — all animation knowledge: atomic motion rules, scene blueprints, transitions, runtime adapters (GSAP default, plus Lottie / Three.js / Anime.js / CSS / WAAPI / TypeGPU).
- `/hyperframes-keyframes` — seek-safe keyframe authoring across runtimes: GSAP timelines, CSS keyframes, Anime.js, WAAPI, FLIP, paths, masks, SVG morph/draw, text trails, cursor demos, 3D depth; plus `hyperframes keyframes` diagnostics for surfacing and verifying rendered motion.
- `/hyperframes-creative` — non-animation creative direction: `frame.md` / `design.md` handling, palettes, typography, narration, beat planning, audio-reactive visuals, composition patterns.
- `/hyperframes-media` — audio + media: TTS voiceover, background music, sound effects, Whisper transcription, background removal, caption authoring (one shared `scripts/audio.mjs` engine, multi-provider).
- `/media-use` — resolve any media need (BGM, SFX, image, icon) into a frozen local file + ledger record. One verb (`resolve`) over the HeyGen catalog with manifest tracking; keeps search noise on disk.
- `/hyperframes-cli` — CLI dev loop: `init`, `add`, `lint`, `validate`, `inspect`, `preview`, `render`, `publish`, `doctor`, `lambda` (AWS Lambda cloud rendering).
- `/hyperframes-registry` — install and wire registry blocks and components into compositions via `hyperframes add`. Covers authoring a new block or component to contribute upstream.

## Skill catalog maintenance

When adding a new skill, or substantially renaming / repurposing an existing one, update all three agent-facing discoverability surfaces in lockstep:

1. The skill list above (CLAUDE.md) AND the `## Skills` section in `README.md` AND `docs/guides/skills.mdx` (rendered at [hyperframes.heygen.com/guides/skills](https://hyperframes.heygen.com/guides/skills)). Out-of-date entries silently kill discovery.
2. If the skill changes the routing surface for "make a video" requests, also update the capability map and intent router in `skills/hyperframes/SKILL.md` — that's the canonical router agents read first.
3. Mirror the Router / Creation workflows / Domain skills grouping across all three surfaces so a skill always lives in the same column.
4. Skill count appears in the README and CLAUDE.md intro lines ("20 AI agent skills…") — update on add/remove. The `docs/guides/skills.mdx` page deliberately omits a count to avoid drift; keep it count-free.

The skill's own `SKILL.md` frontmatter `description:` is the source of truth for the one-line "use when" blurb; copy from there into the catalog rather than paraphrasing.

## Build & Test

```bash
bun install     # Install dependencies (NOT pnpm — do not create pnpm-lock.yaml)
bun run build   # Build all packages (dependency-ordered: parsers/lint → core → engine/producer/player/studio → cli)
bun run test    # Run all tests
bun run dev     # Run Studio (composition editor, vite dev server)
```

Run the CLI from source without building: `bun run --filter @hyperframes/cli dev -- <args>`.

### Testing

```bash
bun run --filter @hyperframes/core test              # One package (most use vitest)
cd packages/core && bunx vitest run src/safePath.test.ts   # Single test file
cd packages/core && bunx vitest run -t "test name"   # Single test by name
bun run --filter '*' typecheck                       # Type-check all packages
bun run test:skills                                  # Skill fixture tests (node --test)
bun run test:scripts                                 # Release/tooling script tests
```

- **Exception — producer has no vitest suite**: its `test` script is a visual regression harness (`src/regression-harness.ts`) that renders fixture compositions and diffs output. `test:update` regenerates baselines; `docker:test` runs it in the CI container (build with `docker:build:test`). Baseline diffs are expected to be run in Docker for pixel-exact results.
- **Runtime contract tests**: `bun run --filter @hyperframes/core test:hyperframe-runtime-ci` — builds the runtime artifact then runs contract / behavior / seek / duration-guard / parity / security suites. Run when touching `packages/core/src/runtime` or the runtime build scripts.

### Linting & Formatting

Uses **oxlint** and **oxfmt** (not eslint, not prettier, not biome).

```bash
bunx oxlint <files>        # Lint
bunx oxfmt <files>         # Format
bunx oxfmt --check <files> # Check formatting (CI / pre-commit)
```

Always lint and format changed files before committing. Lefthook pre-commit hooks enforce this automatically.

Pre-commit gates beyond lint/format (see `lefthook.yml`): tsc for core + studio; `fallow audit --base origin/main` (fails only on issues _introduced by the branch_, but audits the **working tree** — stash unstaged WIP under `packages/**` if a commit fails on code you didn't stage); skills-manifest regeneration when `skills/**` changes; large-binary rejection (use LFS); a 600-line max per file in `packages/studio` (non-test, non-generated). `commit-msg` runs commitlint (conventional commits).

### Composition Validation

After creating or editing any `.html` composition:

```bash
npx hyperframes lint       # Static HTML structure check
npx hyperframes validate   # Runtime check (headless Chrome — catches JS errors, missing assets)
```

Both must pass before previewing or considering work complete.

## Architecture

A composition is a plain HTML file. The pipeline that turns it into video:

1. **core** parses the `data-*` timing attributes into a typed composition model (parsers, linter, generators) and ships the **hyperframes runtime** — a browser-side artifact (built by `build:hyperframes-runtime`, injected into the page) that owns the master timeline, seeks deterministically to any frame, and drives animation runtimes through the frame-adapter pattern (GSAP primary; Lottie / Three.js / Anime.js / CSS / WAAPI plug in via seek-by-frame).
2. **engine** loads the page in headless Chrome (Puppeteer/CDP), seeks frame-by-frame via the runtime, and captures each frame.
3. **producer** is the full render pipeline on top of engine: capture + FFmpeg encode + audio mix. `aws-lambda` and `gcp-cloud-run` wrap producer for cloud rendering.
4. **player** (`<hyperframes-player>` web component) and **studio** (editor UI, served by `studio-server`) play the same composition live in the browser — no render step.

Preview and producer output must be pixel-identical; parity is enforced by harnesses in producer (`parity:check`, regression tests). This is why the determinism rules below are hard requirements, not style preferences.

Workspace packages export TS sources to bun and `dist/` to node (see `exports` maps). `bun run build` at the root builds in dependency order — after touching core, rebuild the tree rather than a single package.

## Project Structure

```
packages/
  cli/                  → hyperframes CLI (init, preview, lint, render, publish, tts, music, transcribe…)
  core/                 → Types, parsers, generators, linter, runtime, frame adapters
  parsers/, lint/       → Standalone parser + lint entry points (built before core)
  engine/               → Seekable page-to-video capture engine (Puppeteer + CDP)
  producer/             → Full rendering pipeline (capture + FFmpeg encode + audio mix)
  aws-lambda/, gcp-cloud-run/ → Cloud rendering wrappers around producer
  player/               → Embeddable <hyperframes-player> web component
  browser-export/       → In-browser export (fork addition)
  shader-transitions/   → WebGL shader transitions for compositions
  studio/, studio-server/ → Browser-based composition editor UI + server
  sdk/, sdk-playground/ → Programmatic SDK + playground
registry/
  blocks/               → Installable sub-composition scenes (50+)
  components/           → Installable effects and snippets
  examples/             → Starter project templates
docs/                   → Mintlify documentation site (hyperframes.heygen.com)
skills/                 → AI agent skill definitions (mirrored by skills-manifest.json)
```

## Key Conventions

- **Package manager**: bun (not pnpm, not npm for workspace operations)
- **Commit format**: Conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`)
- **TypeScript**: Avoid `any`, `as T` assertions, and `!` non-null assertions. Prefer type guards and narrowing. Acceptable: `as const`, and `as unknown as T` at hard type-system boundaries (untrusted JSON, postMessage) with a one-line comment justifying it.
- **Compositions**: HTML files with `data-*` attributes. Clips need `class="clip"`. GSAP timelines must be paused and registered on `window.__timelines`.
- **Frame Adapters**: Animation runtimes plug in via the seek-by-frame adapter pattern. GSAP is the primary adapter.
- **Deterministic rendering**: No `Date.now()`, no unseeded `Math.random()`, no render-time network fetches.

## Documentation

- Docs: https://hyperframes.heygen.com/introduction
- Catalog (50+ blocks): https://hyperframes.heygen.com/catalog/blocks/data-chart
