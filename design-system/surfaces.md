# Surfaces — the per-page contract

Four shipped surfaces consume one token contract: the wiki (`index.html`), the
investor deck (`pitch.html`), the canvas app (`engine.html`) and the rendered
gallery (`design-system/index.html`). This file is the contract each one signs:
how it takes a theme, whether it prints, where it breaks, what it exports, how
much of the component layer it actually uses, and what is still blocked.

Measured on `c5eeca7`, 2026-11-24. Every row cites a file:line or a command.

## The matrix

| Surface | Theme attribute | Print | Breakpoints (raw px) | Export | `ds-` class names |
|---|---|---|---|---|---|
| `index.html` (wiki) | **dynamic** — pre-paint script sets `data-ds-theme` to `wiki-light` / `wiki-dark` (`index.html:8`) | none (`@media print` count 0) | 800 (`:69`, `:71`), 639 (`:80`) | none | 14 |
| `pitch.html` (deck) | **none** — no `data-ds-theme`; local aliases point at `color.pitch.*` (`pitch.html:8–19`) | **yes** — `@media print` at `pitch.html:250` | 900 (`:193`), 639 (`:205`) | **yes** — header icons (`:277–279`), sidenav cluster (`:306–311`), drawer pills (`:684`, `:705`) | 0 |
| `engine.html` (canvas) | **static** — `data-ds-theme="engine"` on `<html>` (`engine.html:1`) | none | 760 (`:238`, `:252`), 860 (`:360`), 520 (`:399`) | per-asset JSON only, in JS (`engine.html:2103`) | 11 |
| `design-system/index.html` (gallery) | **four cells per specimen** — `pitch` / `wiki-light` / `wiki-dark` / `engine` (`:815–833`); scheme-driven at `:24` | none | 900 (`:307`), 640 (`:322`) | n/a (certification surface) | 45 (19 blocks + BEM parts) |

Class-name counts are distinct `class="…ds-…"` tokens per file:

```
for f in index.html pitch.html engine.html; do
  grep -oE 'class="[^"]*"' "$f" | tr ' ' '\n' | grep '^ds-' | sort -u | wc -l
done
```

## index.html — wiki

- **Themes.** Light and dark are one attribute set before first paint by the
  inline script at `index.html:8`, reading `localStorage['cse-theme']` and
  falling back to `prefers-color-scheme`. `<html data-ds-manual>` (`:2`) says the
  page drives its own scheme; the dark `:root` override at `:11` re-points the
  local aliases at `color.wiki.dark.*`.
- **Layout contract.** Two columns from tokens: `grid-template-columns:
  var(--layout-rail) minmax(0,1fr)` (`:28`, the shared components.css rail).
  The mobile collapse (a horizontal pill strip at `:92`) is the
  `@media(max-width:900px)` step — `--breakpoint-lg`, no raw pixel width.
- **Adoption.** 14 `ds-` names: `ds-badge ds-btn ds-chip ds-copy ds-copy__code
  ds-input ds-pager ds-skip-link ds-sr-only ds-tab ds-table ds-table-wrap ds-tabs
  ds-theme-toggle`. No drawer, dialog, toast or menu — the wiki has no overlay
  in its IA.
- **Gaps.** No print block and no export control: a wiki article cannot leave the
  page except by the browser's own print. Recorded, not hidden; it is the
  reference for the corrected Export Cluster claim in
  [patterns.md](patterns.md#export-cluster).

## pitch.html — deck

- **Themes.** Tokenised but **not role-mapped**: `grep -c 'data-ds-theme'
  pitch.html` returns 0 and `grep -c -- '--ds-' pitch.html` returns 0. The page
  consumes `color.pitch.*` directly through its `:root` alias layer
  (`pitch.html:8–19`). The `pitch` theme map exists in `tokens.css` and is
  exercised by the gallery's pitch cells only.
- **Print.** The only surface with a print sheet: `@media print` (`:250`) paints
  the article, and `.no-print` headers/rails/export rows drop out (`:277–279`).
  `document.body.dataset.printDoc` (`:781`) selects which tab prints.
- **Export.** Three entry points, all Markdown + print-PDF: header icon row
  (`:277–279`), sidenav `role="group" aria-label="Export active document"`
  (`:306–311`), and per-drawer pills for funding and plan (`:684`, `:705`). The
  blob writer is `:1029`.
- **Adoption.** 0 `ds-` classes: every control is page-local. This is the largest
  single adoption gap in the system, and it is **blocked** — see below.
- **Breakpoints.** 900 (`:193`) and 639 (`:205`); four width queries in pitch are
  the reason the gate carries a T6 budget of 5 (lint output, T6 budget note).

## engine.html — canvas

- **Themes.** Single shipped theme, declared statically: `data-ds-theme="engine"`
  on `<html>` (`:1`). Role values come from the engine map (`tokens.css:457–470`),
  including the null slots that fall through (`--ds-accent-soft`, `--ds-ink-2`,
  `--ds-faint`).
- **Layout.** Rail `var(--layout-sidebar-engine)` (`:113`, `:258`), drawer
  `var(--layout-drawer-engine-width)` (`:95`), bar `layout.bar.engine`.
- **Adoption.** 11 `ds-` names — `ds-btn ds-dialog ds-dialog__box ds-drawer
  ds-icon-btn ds-menu ds-menu__item ds-nav-item ds-skip-link ds-sr-only ds-toast`
  — the deepest component adoption of any page.
- **Gaps.** No print sheet (a canvas does not print; stated, not fixed) and no
  document export — only per-asset JSON (`:2103`). Overlays are the page's own
  job only where the reference's editing IA was rejected; see intake #1.

## design-system/index.html — gallery

- **Themes.** Four cells per specimen, one per theme map (`:815–833`), plus a
  scheme-driven page shell (`:24`). The gallery is the only place a pitch or
  wiki-dark specimen renders.
- **Print.** None. The gallery is read on screen.
- **Role.** Certification surface: every count on it is computed at render and
  asserted by `scripts/check-doc-counts.mjs`. It is not a product page and never
  ships to a user.

## Browser support

There is **no build step** (Vercel `framework: null`, no root `package.json`) and
no webfont: `@font-face` / `fonts.googleapis` occurrences = 0 across every page
and the shared layer, so the families are system stacks from
`typography.family.sans` / `.mono`.

The floor is set by two features in the shipped layer:

| Feature | Where | Floor (published support tables, not gate-verified) |
|---|---|---|
| `inert` (focus containment for closed overlays) | `design-system/components.js` (17 uses), `engine.html` (6) | Chrome/Edge 102, Safari 15.5, Firefox 112 |
| CSS container query | `components.css:548` (`container-type`), `:577` (`@container (width < 40rem)`) | Chrome/Edge 105, Safari 16, Firefox 110 |

Deliberately **not** used: `:has(` (0), optional chaining `?.` (0), nullish `??`
(0), popover API (0), `structuredClone` (0). `:is(` (39) and `:where(` (9) are
widely available.

Verification is a **single-browser** gate: CI installs the pinned Chrome for
Testing via `scripts/a11y` (`puppeteer 24.15.0`, `axe-core 4.10.3`) and nothing
else. Safari and Firefox behaviour is unverified by any automated check — treat
that as a known blind spot, not a support promise. See
[verification.md](verification.md#blind-spots).

## Current adoption status

| Contract item | wiki | deck | engine | gallery |
|---|---|---|---|---|
| `tokens.css` linked | yes (`index.html:5`) | yes (`pitch.html:6`) | yes (`engine.html:2`) | yes |
| `data-ds-theme` resolved | yes, dynamic | **no** | yes, static | yes, per cell |
| `ds-` component layer | partial (14) | **none (0)** | deep (11) | all 19 |
| Print sheet | no | yes | no | no |
| Export control | no | yes | per-asset only | n/a |
| Tokenised values (V1–V8 = 0) | yes | yes | yes | yes |

## Blocked

| Surface | Blocked by | Evidence |
|---|---|---|
| `pitch.html` | a **foreign uncommitted edit** — the drawer-v4 work in the working tree. `git status --short` shows `M pitch.html`; `git diff --stat` reports 63 changed lines. No lane touches the file, stages it, or cites its current line numbers as stable until the owner lands that edit | `git status --short`, `git diff --stat` |
| `engine.html` | a second foreign edit: a `#genImgBtn` button and its handler were added in the same working tree (37 lines) | `git diff engine.html` |

Consequences: Phase 5 pitch tasks (32, and the pitch half of 33–35) are **blocked**,
the pitch theme map stays gallery-only, and T6 keeps its budget of 5 because
pitch's width queries cannot be snapped. Do not "fix" a blocked page to make a
number look better; land the owner's edit first, then re-run the gate.
