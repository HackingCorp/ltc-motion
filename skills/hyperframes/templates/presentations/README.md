# Presentation templates

Vendored from [zarazhangrui/beautiful-html-templates](https://github.com/zarazhangrui/beautiful-html-templates) and tokenized for the HyperFrames design picker.

## Attribution

All `template.html`, `summary.html`, `template.json`, and `deck-stage.js` files
in this directory are derived from the upstream `beautiful-html-templates`
library. Original work by [@zarazhangrui](https://github.com/zarazhangrui).
Please refer to the upstream repository for license terms.

## What we changed

- **Tokenization.** Hard-coded palette colors were rewired to the
  `--tp-primary` / `--tp-secondary` / `--tp-tertiary` / `--tp-accent` CSS
  custom-property contract so the picker can re-theme each template at render
  time. See [`../../references/design-picker.md`](../../references/design-picker.md)
  for the full token contract.
- **`deck-stage.js` lint cleanup.** Unused `catch` parameter bindings replaced
  with bare `catch {}` for the repo's eslint pass. No behavioral change.
- **Per-template fixes.** A handful of templates received targeted fixes to
  the cover headlines, palette swatches, slide-rendering classes, and orphan
  `@import` lines so they render cleanly inside the picker's iframes. The
  fixes live in the picker chrome PR — these files in this directory are the
  baseline import.

The hand-crafted `design.html` files for each template (`<slug>/design.html`)
are _not_ upstream content — those are new work for the HyperFrames design
picker and live in a separate PR.

## Adding a new template

1. Add the template directory under `presentations/<slug>/` with at minimum
   `template.html`, `summary.html`, and `template.json`.
2. Run `python3 ../../scripts/tokenize-templates.py <slug>` to inject the
   `--tp-*` contract.
3. Write a `design.html` for the new template (see existing examples).
4. Register the slug in `../index.json` and `../presentations-index.json`.
5. Verify with `hyperframes pick` (requires `HYPERFRAMES_DESIGN_PICKER=1`
   outside dev mode).
