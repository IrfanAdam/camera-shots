# Surfaces — the per-page contract

Four shipped surfaces consume one token contract: the wiki (`index.html`), the
investor deck (`pitch.html`), the canvas app (`engine.html`) and the rendered
gallery (`design-system/index.html`). This file is the contract each one signs:
how it takes a theme, whether it prints, where it breaks, what it exports, how
much of the component layer it actually uses, and what is still blocked.

Measured on `6b1ab37` plus the gallery hierarchy wave, 2026-11-25. Every row
cites a file:line or a command; the class counts are the output of the command
below, not a recollection.

## The matrix

| Surface | Theme attribute | Print | Breakpoints (raw px) | Export | `ds-` class names |
|---|---|---|---|---|---|
| `index.html` (wiki) | **dynamic** — pre-paint script sets `data-ds-theme` to `wiki-light` / `wiki-dark` (`index.html:8`) | none (`@media print` count 0) | 800 (`:69`, `:71`), 639 (`:80`) | none | 18 |
| `pitch.html` (deck) | **none** — no `data-ds-theme`; local aliases point at `color.pitch.*` (`pitch.html:8–19`) | **yes** — `@media print` at `pitch.html:250` | 900 (`:193`), 639 (`:205`) | **yes** — header icons (`:277–279`), sidenav cluster (`:306–311`), drawer pills (`:684`, `:705`) | 8 |
| `engine.html` (canvas) | **static** — `data-ds-theme="engine"` on `<html>` (`engine.html:1`) | none | 760 (`:238`, `:252`), 860 (`:360`), 520 (`:399`) | per-asset JSON only, in JS (`engine.html:2103`) | 16 |
| `design-system/index.html` (gallery) | **four cells per specimen** — `pitch` / `wiki-light` / `wiki-dark` / `engine` (`:815–833`); scheme-driven at `:24` | none | 900 (`:307`), 640 (`:322`) | n/a (certification surface) | 51 (21 numbered blocks + BEM parts) |

Class-name counts are distinct `class="…ds-…"` tokens per file:

```
for f in index.html pitch.html engine.html design-system/index.html; do
  printf '%-28s ' "$f"
  grep -oE 'class="[^"]*"' "$f" | sed 's/^class="//;s/"$//' \
    | tr ' ' '\n' | grep '^ds-' | sort -u | wc -l
done
# index.html 18 · pitch.html 8 · engine.html 16 · design-system/index.html 51
```

The block total is the numbered comment headings in `components.css`:
`grep -cE '^/\* [0-9]+ ·' design-system/components.css` → 21.

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
- **Adoption.** 18 `ds-` names: `ds-badge ds-btn ds-copy ds-copy__code
  ds-input ds-nav-item ds-navtoggle ds-pager ds-rail ds-rail__foot ds-rail__item
  ds-rail__label ds-skip-link ds-sr-only ds-tab ds-table ds-table-wrap ds-tabs`.
  No drawer, dialog, toast, menu, chip or theme toggle — the wiki has no overlay
  in its IA, and the theme switcher is page chrome, not the `ds-theme-toggle`.
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
- **Adoption.** 8 `ds-` names — `ds-rail ds-rail__foot ds-rail__item
  ds-rail__label ds-nav-item ds-navtoggle ds-tabs ds-tab`: the rail, its surface
  foot and the mobile drawer toggle (32 nav items), plus the `doctabs` strip
  (4 tabs). Every other control is page-local, which is still the largest single
  adoption gap in the system.
- **Breakpoints.** 900 (`:193`) and 639 (`:205`); four width queries in pitch are
  the reason the gate carries a T6 budget of 5 (lint output, T6 budget note).

## engine.html — canvas

- **Themes.** Single shipped theme, declared statically: `data-ds-theme="engine"`
  on `<html>` (`:1`). Role values come from the engine map (`tokens.css:457–470`),
  including the null slots that fall through (`--ds-accent-soft`, `--ds-ink-2`,
  `--ds-faint`).
- **Layout.** Rail `var(--layout-sidebar-engine)` (`:113`, `:258`), drawer
  `var(--layout-drawer-engine-width)` (`:95`). The 62px mobile status strip
  (`layout.bar.engine`) left with the navigation rewrite — the shared drawer is
  the mobile chrome now (see `DEPRECATIONS.md`).
- **Adoption.** 16 `ds-` names — `ds-btn ds-dialog ds-dialog__box ds-drawer
  ds-icon-btn ds-menu ds-menu__item ds-nav-item ds-navtoggle ds-rail
  ds-rail__foot ds-rail__item ds-rail__label ds-skip-link ds-sr-only ds-toast`
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
| `ds-` component layer | partial (18) | partial (8) | deep (16) | all 21 blocks |
| Print sheet | no | yes | no | no |
| Export control | no | yes | per-asset only | n/a |
| Tokenised values (V1–V8 = 0) | yes | yes | yes | yes |

## Blocked

**Resolved.** While the counts above were first written, two files carried edits
owned by another lane. Both landed in `2f35c25`; `git status --short` is clean
for them now, so the table below records a past state and blocks no task.

| Surface | Was blocked by | Evidence then | State now |
|---|---|---|---|
| `pitch.html` | a foreign uncommitted edit — the drawer-v4 work in the working tree (63 changed lines) | `git status --short`, `git diff --stat` | committed in `2f35c25` |
| `engine.html` | a second foreign edit: a `#genImgBtn` button and its handler (37 lines) | `git diff engine.html` | not present at `6b1ab37` (`grep -c genImgBtn engine.html` → 0) |

The consequences that applied then — Phase 5 pitch tasks (32, and the pitch half
of 33–35) held, the pitch theme map gallery-only, T6 keeping its budget of 5 —
are a record of that state, not a current constraint. The rule still holds: do
not "fix" a page to make a number look better; land the owner's edit first.
