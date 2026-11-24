<!--
  PR evidence template — mirrors design-system/verification.md § PR evidence.
  Paste command tails, not summaries. A checked box with no output is not evidence.
-->

## What changed

<!-- One paragraph. Name the pages, tokens or docs touched. -->

## Plan

<!-- Plan phase reference (the repo convention links the plan file plus its
     phase anchor, e.g. .hermes/plans/<date>-<slug>.md#phase-N). -->

## Gate evidence

Run from the repo root; paste the last line of each.

| Gate | Command | Result |
|---|---|---|
| Tokens CSS | `node scripts/build-tokens.mjs --check` | |
| Foundations | `node scripts/build-foundations.mjs --check` | |
| Token/component classes | `node scripts/lint-tokens.mjs --check` | |
| Doc counts | `node scripts/check-doc-counts.mjs` | |
| Anchors / ids | `node scripts/check-anchors.mjs` | |
| Local links | `node scripts/check-links.mjs` | |
| Contrast | `node scripts/check-contrast.mjs` | |
| Target sizes | `node scripts/check-targets.mjs` | |
| axe (9 surfaces) | `node scripts/check-axe.mjs` | |
| Keyboard | `node scripts/check-keyboard.mjs` | |
| HTML structure | `scripts/a11y/node_modules/.bin/html-validate --config scripts/htmlvalidate.config.json index.html pitch.html engine.html design-system/index.html` | |
| Screenshots | `node scripts/a11y/check-shots.mjs` | |

## Visual evidence

- [ ] `ds-shots` artifact attached (or 1440 + 390 PNGs per touched surface)
- [ ] Every scheme the surface supports is included (wiki light/dark,
      gallery light/dark, pitch/engine default palette)
- [ ] Declared delta: what moved, by how much, and why

## Scope declarations

- [ ] No page HTML edited for the gate (`index.html`, `pitch.html`,
      `engine.html`, `design-system/index.html`) — or the edit is listed below
      with its plan phase
- [ ] No generated file hand-edited (`tokens.css`, `foundations.md`)
- [ ] No budget raised in `lint-tokens.mjs` / `check-contrast.mjs` /
      `scripts/a11y/baseline.json`
- [ ] New blind spot (if any) added to `design-system/verification.md`

## Known blind spots of this run

<!-- Quote the ones that apply: external links unchecked, html-validate rules
     disabled (see verification.md), screenshots are artifacts not pixel diffs,
     budgets are ceilings. -->
