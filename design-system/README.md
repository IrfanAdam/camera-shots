# Design System

Three product surfaces — the wiki in `index.html`, the investor deck in `pitch.html`, the canvas app in `engine.html` — share one token contract and one gate. This file is a router: it says what exists, where it lives, and how the pipeline runs. Values live in the generated references, never here.

## Where things are

| Path | What it is | Generated |
|---|---|---|
| `design-system/tokens.json` | Token source: **189 keys, 20 groups**, 4 theme maps | no — the only hand-edited value source |
| `design-system/tokens.css` | Generated `:root` properties + `[data-ds-theme]` role blocks | yes |
| `design-system/base.css` | Base layer: reset, the one focus ring, skip link, scroll regions, target floor, reduced motion | no |
| `design-system/components.css` | Component layer: 19 blocks, `var()` only, four densities via `data-ds-density` | no |
| `design-system/components.js` | Behaviour: `DS.init/tabs/menu/overlay/toast/announce/copy/focusPreserve` | no |
| `design-system/icons.svg` | 24-symbol sprite, `currentColor`, `<use href="icons.svg#ds-icon-…">` | no |
| `design-system/foundations.md` | Generated scale reference: every group, theme contract, type scale with line-height, consumer counts | yes |
| `scripts/build-tokens.mjs` | `tokens.json` → `tokens.css`, with type validation and `--check` | no |
| `scripts/build-foundations.mjs` | `tokens.json` + `tokens.css` → `foundations.md`, with `--check` | no |
| `scripts/lint-tokens.mjs` | Adherence gate: per-file line numbers, token-set classes, exit 1 on failure | no |
| `scripts/check-doc-counts.mjs` | Docs may not state a count the source contradicts | no |
| `scripts/check-anchors.mjs` | Fragment links, ids and `[plan:…]` anchors resolve | no |
| `design-system/index.html` | Rendered gallery: swatches, type, motion, shape, components, consistency matrix | no |
| `design-system/components.md` | Component specs: 19 live, each linked to its gallery frame, plus a not-built appendix | no |
| `design-system/patterns.md` | Shell and composition patterns | no |
| `design-system/DEPRECATIONS.md` | Every retired key, with its replacement | no |
| `design-system/audit-report.md` | Machine receipt written by the gate | yes — never edit |
| `design-system/audit/2026-11-24/` | Measured audit baseline: five lane reports, metrics, screenshots | no |
| `.github/workflows/ds-gate.yml` | CI: byte-stability, gate, doc counts, anchors | no |

## The pipeline

```
node scripts/build-tokens.mjs            # regenerate tokens.css from tokens.json
node scripts/build-foundations.mjs       # regenerate foundations.md from tokens.json + tokens.css
node scripts/lint-tokens.mjs             # scan the pages, print counts, write audit-report.md
node scripts/lint-tokens.mjs --check     # CI gate: same scan, no write, exit 1 on failure
```

Both generators are deterministic and idempotent: a fresh run reproduces the committed file byte for byte, and `--check` diffs without writing. `tokens.json` is the only file you edit by hand for a design value. Editing `tokens.css` or `foundations.md` is lost work.

## How a page consumes it

Each page links `design-system/tokens.css` in `<head>`, then its own `:root` re-points short local names at canonical tokens; deeper rules consume the local names. Names are mechanical: lowercase, dots → dashes, `--` prefix.

```css
/* pitch.html:11 */
--bg:var(--color-pitch-bg);--accent:var(--color-pitch-accent);
```

Themes are one attribute: `data-ds-theme="pitch|wiki-light|wiki-dark|engine"` declares the same 14 role slots (17 vars), with explicit nulls where a surface has no value.

## Rules

- No raw hex, `rgb()` or `rgba()` outside `tokens.css`. The one legal literal is a `var()` fallback.
- No raw duration, `cubic-bezier()`, `z-index` or `border-radius` (including bare `0`); use the token.
- Media-query breakpoints stay in raw px — `var()` is invalid in `@media`. That is the documented exception, and T6 checks each query against the breakpoint scale.
- Every interactive element needs the `:focus-visible` pair: `outline:var(--focus-width) solid …` plus `outline-offset:var(--focus-offset)`.
- When a value is within 1px of a token step, use the token, not the nearest literal.
- To add a value: edit `tokens.json`, run both generators, then consume the new `var(--…)`.
- A page change is not done until `node scripts/lint-tokens.mjs` is green and the regenerated files are committed with it.

## Read next

[foundations.md](foundations.md) for values and roles · [components.md](components.md) for the 19 live component specs (each with a gallery frame) and the proposed appendix · [patterns.md](patterns.md) for compositions · `design-system/audit-report.md` for the measured counts the gate reports against explicit per-class budgets, including the component classes C1–C6 (and the exemptions that carry their reasons on the line they excuse) · `design-system/audit/2026-11-24/` for the baseline those budgets were seeded from.
