# Design System

Four shipped surfaces — the wiki in `index.html`, the deck in `pitch.html`, the
canvas in `engine.html`, the gallery in `design-system/index.html` — share one
token contract and one gate. This file is a router: what exists, where, how the
pipeline runs. Values live in the generated references, never here.

## Docs map

| Doc | Answers |
|---|---|
| [foundations.md](foundations.md) | every scale, value and role slot — **generated** |
| [components.md](components.md) | 19 live specs, each linked to its gallery frame, plus the proposed appendix |
| [patterns.md](patterns.md) | 8 compositions, each with a status line |
| [surfaces.md](surfaces.md) | per-page contract: theme, print, breakpoints, export, browser support, adoption, blocked work |
| [accessibility.md](accessibility.md) | contrast rows per theme plus the focus, target and ARIA contract |
| [verification.md](verification.md) | the nine gates, their classes, blind spots, CI and PR evidence |
| [governance.md](governance.md) | six change classes, semver, deprecation, review |
| [decisions.md](decisions.md) | append-only ADRs — why the rules are what they are |
| [references/](references/README.md) | reference intake protocol, template, intake #1 |
| [DEPRECATIONS.md](DEPRECATIONS.md) · [audit-report.md](audit-report.md) · [audit-checklist.md](audit-checklist.md) | retired keys · generated gate receipt · per-screen checklist |

## Where things are

| Path | What it is | Generated |
|---|---|---|
| `design-system/tokens.json` | Token source: **189 keys, 20 groups**, 4 theme maps — the only hand-edited value source | no |
| `design-system/tokens.css` | `:root` properties + `[data-ds-theme]` role blocks | yes |
| `design-system/base.css` · `components.css` · `components.js` | Reset/focus/target floor · 19 blocks, `var()` only, four densities · behaviour (`DS.init/tabs/menu/overlay/toast/…`) | no |
| `design-system/pitch-shell.css` | Page-level pitch language: pins the 17 `--ds-*` roles and the chrome aliases (`--bg --card --s1 --s2 --ink --body --mut --mut2 --rule --acc --acc2 --amb --acc-ink`) to the pitch tokens. Opt in with `<html data-ds-shell="pitch" data-ds-theme="pitch">` and load it **after** the page's own `<style>` | no |
| `design-system/icons.svg` | 24-symbol sprite, `currentColor`, `<use href="icons.svg#ds-icon-…">` | no |
| `design-system/index.html` | Rendered gallery: swatches, type, motion, shape, components, consistency matrix | no |
| `scripts/build-tokens.mjs` · `build-foundations.mjs` | Source → CSS, source + CSS → docs; both deterministic, both with `--check` | no |
| `scripts/lint-tokens.mjs` | Adherence gate: V/U/T on the pages, C1–C6 on the shared layer | no |
| `scripts/check-doc-counts.mjs` · `check-anchors.mjs` | Docs may not state a stale count · every anchor resolves | no |
| `design-system/audit/2026-11-24/` · `.github/workflows/ds-gate.yml` | Measured baseline (lanes, metrics, shots) · CI: nine blocking gates + advisory html-validate | no |

## The pipeline

```
node scripts/build-tokens.mjs            # regenerate tokens.css from tokens.json
node scripts/build-foundations.mjs       # regenerate foundations.md from tokens.json + tokens.css
node scripts/lint-tokens.mjs             # scan the pages, print counts, write audit-report.md
node scripts/lint-tokens.mjs --check     # CI mode: same scan, no write, exit 1 on failure
```

A fresh run reproduces the committed file byte for byte; `--check` diffs without
writing. Editing `tokens.css` or `foundations.md` by hand is lost work.

## How a page consumes it

Each page links `design-system/tokens.css`, then re-points short local names in
its own `:root` at canonical tokens; deeper rules consume the local names. Names
are mechanical: lowercase, dots → dashes, `--` prefix.

```css
/* pitch.html:11 */
--bg:var(--color-pitch-bg);--accent:var(--color-pitch-accent);
```

`data-ds-theme="pitch|wiki-light|wiki-dark|engine"` declares the same 14 role
slots (17 vars), with explicit nulls where a surface has no value. Which surface
sets that attribute — and which one does not — is in [surfaces.md](surfaces.md).

### The pitch shell

A page that should read as the pitch page does not copy pitch.html's styles. It
opts in and links the shell last:

```html
<html lang="en" data-ds-shell="pitch" data-ds-theme="pitch">
...
<link rel="stylesheet" href="design-system/pitch-shell.css">
```

The shell owns the mapping only — roles, chrome aliases, body type, heading
voice, `::selection`, focus colour. It declares no layout, no size and no new
value: the pitch surface ladder, cream ink and champagne accent are the same
tokens `pitch.html` consumes. `index.html` is the reference adopter; a page that
keeps its own IA keeps its own density.

## Rules

- No raw hex, `rgb()` or `rgba()` outside `tokens.css`. The one legal literal is a `var()` fallback.
- No raw duration, `cubic-bezier()`, `z-index` or `border-radius` (including bare `0`); use the token.
- Media-query breakpoints stay in raw px — `var()` is invalid in `@media`. Documented exception, checked by T6.
- Every interactive element needs the `:focus-visible` pair: `outline:var(--focus-width) solid …` plus `outline-offset:var(--focus-offset)`.
- When a value is within 1px of a token step, use the token, not the nearest literal.
- To add a value: edit `tokens.json`, run both generators, consume the `var(--…)`, and name the change class from [governance.md](governance.md).
- A page change is not done until all nine gates are green — [verification.md](verification.md) says what each proves.
- A reference never enters through a page: it enters as an intake record and lands as a theme-map diff or a component variant ([references/README.md](references/README.md)).
