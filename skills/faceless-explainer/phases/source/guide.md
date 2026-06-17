# Source phase (Step 2a) — resolve real-world assets the LLM can't invent

**Optional + conditional.** faceless-explainer invents every visual by default. This phase is the one
seam where it reaches outside itself: when a scene genuinely turns on a **real** entity — a specific
company / brand **logo**, a **real person's** likeness, a named **real product** — the LLM cannot draw it
faithfully, so we fetch the real thing instead.

Detection happened upstream: the **scriptwriting** agent (Step 2) flags those scenes with an optional
`assetNeeds` array (see `phases/scriptwriting/guide.md` → "Faceless Visuals"). This phase **resolves**
them. It does **not** decide what to fetch — it executes what scriptwriting asked for.

## Contract

```
in :  narrator_scripts.json scenes carrying  assetNeeds: [{ type, entity, intent, treatment? }]
out:  same scenes with       assetCandidates: [{ path: "public/<file>", description }]   (assetNeeds removed)
      + the real files frozen into public/
      + provenance ledger at .source-assets/assets/manifest.jsonl
```

`{path, description}` is the **exact shape the Step 6 scene worker already places** (`agents/hyperframes-scene.md`
Scope: a provided candidate becomes the scene's primary asset). So nothing downstream — validator, prep,
workers — changes. This phase only fills a slot that already exists.

## When it runs / skips

Run it immediately after Step 2 returns, **before** Step 2b / Step 3 (so visual-design and prep see the
assets). It is always safe to call — `resolve-assets.mjs` self-detects and **no-ops** (FE stays fully
faceless) when any of:

- no scene has `assetNeeds` (the common case),
- the media-use skill isn't installed,
- no search backend is configured (`MEDIA_USE_SEARCH_CMD` unset).

## Command

```bash
(cd "$PROJECT_DIR" && node <SKILL_DIR>/phases/source/resolve-assets.mjs \
  --project . \
  --media-use <SKILL_DIR>/../media-use \
  --search-cmd "$MEDIA_USE_SEARCH_CMD" \
  --validator <SKILL_DIR>/scripts/validate-narrator.mjs)
```

Output JSON: `{ ok, resolved, failed, resolvedItems[], failedItems[], validated }` (or `{ ok:true, resolved:0,
degraded|note }` on a no-op). An unresolved need leaves that scene faceless — **the phase never blocks the
pipeline**. `validated: "pass"` confirms the rewritten `narrator_scripts.json` is still schema-valid.

## Selection & backends (media-use owns these)

- **Selection quality is media-use's job, not this phase's.** The backend's raw top-1 can be wrong; for a
  clean logo prefer media-use's vision rerank over blind top-1. `resolve-assets.mjs` calls `resolve --auto`
  as the simple baseline — swap to a select-then-pick flow when logo fidelity matters.
- **Backend** = whatever `MEDIA_USE_SEARCH_CMD` points at (e.g. a web image + icon search CLI, or an
  HTTP `/v3/assets/search` adapter). A backend's index can be weak for **icons** (text-embedded results
  dominate, and icons score below images) — for logos, request `type: "image"` (the real logo is stored
  as an image) rather than `type: "icon"`.

## Anti-patterns

- Don't fetch for concept / claim / process / number scenes — those stay faceless; typography + diagrams
  read better and more credibly than a stock image. `assetNeeds` is the rare exception.
- Don't invent `assetCandidates` paths here — only paths this phase actually froze into `public/` may appear.
- Don't block: a failed fetch degrades that one scene to faceless and the run continues.
