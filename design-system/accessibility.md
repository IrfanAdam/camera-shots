# Accessibility — what the gate enforces, and what it does not

Status: **compliant on text contrast, with four declared non-text debts.** All
67 theme×pair token results in §1 clear their threshold except five annotated
rows: `pitch warning/surface` (latent — no node paints it) and the four
`rule/surface` hairlines (WCAG 1.4.11, owned by Phase 5). Text debt is **0**:
the eight rows that used to sit in this file were closed by the status-ink
tokens (Phase 4 Task 27). axe measures **0 serious/critical nodes on all nine
surface runs**.

The gate runs in `.github/workflows/ds-gate.yml` — **twelve blocking checks**
([verification.md](verification.md) owns the numbered list):

| job | checks | needs a browser |
|---|---|---|
| `static-docs` | 6 — tokens/foundations/usage byte-stability, token lint, doc counts, anchors, links | no |
| `a11y-static` | 2 — contrast pairs, target sizes | no |
| `a11y-browser` | 2 — axe-core 4.10.3 over 9 surface runs, keyboard smoke | yes — pinned Chrome for Testing |
| `html-validate` | 1 — 16 structural rules over the four pages | yes (installed validator) |
| `shots` | 1 — 12 captures, 0 page JS errors, 0 overflow > 1px, no blank frame | yes |

All twelve are blocking. There is no `continue-on-error`.

## 1 · Contrast (WCAG 1.4.3)

`scripts/check-contrast.mjs` reads `design-system/tokens.css`, resolves the
`var()` chain for each `[data-ds-theme]` map exactly as the browser does, and
computes WCAG 2.x relative-luminance ratios for a declared pair table.

**Threshold: 4.5:1 for every text pair, no large-text exemption.** The system
ships 12.8–13.6px text in these slots, so the 3:1 large-text allowance is not
available; a pair that only passes at 3:1 fails. Translucent colours are
composited over the background before measuring.

**Danger text is an ink, never the fill.** `color.status.danger` (`#E5484D`) stays
the tone for the 3:1 UI boundary and the badge fill. As text it is replaced by
`color.status.danger.ink.light` `#C93F43` (light maps) and
`color.status.danger.ink.dark` `#EA6C70` (dark maps), consumed through the
component-local `--_danger-ink` in `components.css` and `engine.html`. Armed and
hover labels on the fill take primitive black — **white on `#E5484D` is 3.91:1
and that idiom is retired, not fixed**: only black clears 5.37, and darkening the
fill instead would drop the dark badge inks to ~4.1.

Measured on `bb88390` (regenerate with `node scripts/check-contrast.mjs`):

| theme | pair | foreground → background | ratio | min | state |
|---|---|---|---:|---:|---|
| pitch | `ink/bg` | `--ds-ink` → `--ds-bg` | 17.38 | 4.50 | PASS |
| pitch | `ink/surface` | `--ds-ink` → `--ds-surface` | 16.15 | 4.50 | PASS |
| pitch | `ink-2/surface` | `--ds-ink-2` → `--ds-surface` | 12.79 | 4.50 | PASS |
| pitch | `muted/bg` | `--ds-muted` → `--ds-bg` | 8.04 | 4.50 | PASS |
| pitch | `muted/surface` | `--ds-muted` → `--ds-surface` | 7.48 | 4.50 | PASS |
| pitch | `faint/surface` | `--ds-faint` → `--ds-surface` | 5.47 | 4.50 | PASS |
| pitch | `on-accent/accent` | `--ds-on-accent` → `--ds-accent` | 9.02 | 4.50 | PASS |
| pitch | `accent/bg` | `--ds-accent` → `--ds-bg` | 9.60 | 4.50 | PASS |
| pitch | `accent/surface` | `--ds-accent` → `--ds-surface` | 8.93 | 4.50 | PASS |
| pitch | `success/surface` | `--ds-success` → `--ds-surface` | 7.25 | 4.50 | PASS |
| pitch | `warning/surface` | `--ds-warning` → `--ds-surface` | 4.47 | 4.50 | DEBT |
| pitch | `armed-ink/danger-fill` | `--color-primitive-black` → `--ds-danger` | 5.37 | 4.50 | PASS |
| pitch | `badge-danger-ink` | `--ds-on-accent` → `--ds-danger` | 4.75 | 4.50 | PASS |
| pitch | `rule/surface` | `--ds-rule` → `--ds-surface` | 1.22 | 3.00 | DEBT |
| wiki-light | `ink/bg` | `--ds-ink` → `--ds-bg` | 16.68 | 4.50 | PASS |
| wiki-light | `ink/surface` | `--ds-ink` → `--ds-surface` | 17.76 | 4.50 | PASS |
| wiki-light | `ink-2/surface` | `--ds-ink-2` → `--ds-surface` | 6.13 | 4.50 | PASS |
| wiki-light | `muted/bg` | `--ds-muted` → `--ds-bg` | 5.76 | 4.50 | PASS |
| wiki-light | `muted/surface` | `--ds-muted` → `--ds-surface` | 6.13 | 4.50 | PASS |
| wiki-light | `faint/surface` | `--ds-faint` → `--ds-surface` | 6.13 | 4.50 | PASS |
| wiki-light | `on-accent/accent` | `--ds-on-accent` → `--ds-accent` | 7.58 | 4.50 | PASS |
| wiki-light | `accent/bg` | `--ds-accent` → `--ds-bg` | 7.12 | 4.50 | PASS |
| wiki-light | `accent/surface` | `--ds-accent` → `--ds-surface` | 7.58 | 4.50 | PASS |
| wiki-light | `success/surface` | `--ds-success` → `--ds-surface` | 5.07 | 4.50 | PASS |
| wiki-light | `danger-ink/surface` | `--color-status-danger-ink-light` → `--ds-surface` | 4.91 | 4.50 | PASS |
| wiki-light | `danger-ink/bg` | `--color-status-danger-ink-light` → `--ds-bg` | 4.61 | 4.50 | PASS |
| wiki-light | `armed-ink/danger-fill` | `--color-primitive-black` → `--ds-danger` | 5.37 | 4.50 | PASS |
| wiki-light | `badge-danger-ink` | `--color-primitive-black` → `--ds-danger` | 5.37 | 4.50 | PASS |
| wiki-light | `wikil-amber-text/card` | `--color-wiki-light-amber` → `--ds-surface` | 4.87 | 4.50 | PASS |
| wiki-light | `wikil-amber-text/bg` | `--color-wiki-light-amber` → `--ds-bg` | 4.57 | 4.50 | PASS |
| wiki-light | `white-on-wikil-amber` | `--color-primitive-white` → `--color-wiki-light-amber` | 4.87 | 4.50 | PASS |
| wiki-light | `rule/surface` | `--ds-rule` → `--ds-surface` | 1.46 | 3.00 | DEBT |
| wiki-dark | `ink/bg` | `--ds-ink` → `--ds-bg` | 16.53 | 4.50 | PASS |
| wiki-dark | `ink/surface` | `--ds-ink` → `--ds-surface` | 15.28 | 4.50 | PASS |
| wiki-dark | `ink-2/surface` | `--ds-ink-2` → `--ds-surface` | 7.28 | 4.50 | PASS |
| wiki-dark | `muted/bg` | `--ds-muted` → `--ds-bg` | 7.87 | 4.50 | PASS |
| wiki-dark | `muted/surface` | `--ds-muted` → `--ds-surface` | 7.28 | 4.50 | PASS |
| wiki-dark | `faint/surface` | `--ds-faint` → `--ds-surface` | 7.28 | 4.50 | PASS |
| wiki-dark | `on-accent/accent` | `--ds-on-accent` → `--ds-accent` | 9.21 | 4.50 | PASS |
| wiki-dark | `accent/bg` | `--ds-accent` → `--ds-bg` | 9.21 | 4.50 | PASS |
| wiki-dark | `accent/surface` | `--ds-accent` → `--ds-surface` | 8.51 | 4.50 | PASS |
| wiki-dark | `success/surface` | `--ds-success` → `--ds-surface` | 6.87 | 4.50 | PASS |
| wiki-dark | `warning/surface` | `--ds-warning` → `--ds-surface` | 8.51 | 4.50 | PASS |
| wiki-dark | `danger-ink-dark/surface` | `--color-status-danger-ink-dark` → `--ds-surface` | 5.71 | 4.50 | PASS |
| wiki-dark | `danger-ink/alt` | `--color-status-danger-ink-dark` → `--ds-surface-alt` | 5.71 | 4.50 | PASS |
| wiki-dark | `armed-ink/danger-fill` | `--color-primitive-black` → `--ds-danger` | 5.37 | 4.50 | PASS |
| wiki-dark | `badge-danger-ink` | `--ds-on-accent` → `--ds-danger` | 4.81 | 4.50 | PASS |
| wiki-dark | `wikidark-fill-ink/accent` | `--color-wiki-dark-accent-ink` → `--ds-accent` | 9.21 | 4.50 | PASS |
| wiki-dark | `wikidark-fill-ink/amber` | `--color-wiki-dark-accent-ink` → `--color-wiki-dark-amber` | 9.20 | 4.50 | PASS |
| wiki-dark | `rule/surface` | `--ds-rule` → `--ds-surface` | 1.28 | 3.00 | DEBT |
| engine | `ink/bg` | `--ds-ink` → `--ds-bg` | 18.06 | 4.50 | PASS |
| engine | `ink/surface` | `--ds-ink` → `--ds-surface` | 15.26 | 4.50 | PASS |
| engine | `ink-2/surface` | `--ds-ink-2` → `--ds-surface` | 5.94 | 4.50 | PASS |
| engine | `muted/bg` | `--ds-muted` → `--ds-bg` | 7.03 | 4.50 | PASS |
| engine | `muted/surface` | `--ds-muted` → `--ds-surface` | 5.94 | 4.50 | PASS |
| engine | `faint/surface` | `--ds-faint` → `--ds-surface` | 5.94 | 4.50 | PASS |
| engine | `on-accent/accent` | `--ds-on-accent` → `--ds-accent` | 6.91 | 4.50 | PASS |
| engine | `accent/bg` | `--ds-accent` → `--ds-bg` | 7.19 | 4.50 | PASS |
| engine | `accent/surface` | `--ds-accent` → `--ds-surface` | 6.08 | 4.50 | PASS |
| engine | `success/surface` | `--ds-success` → `--ds-surface` | 6.55 | 4.50 | PASS |
| engine | `warning/surface` | `--ds-warning` → `--ds-surface` | 8.11 | 4.50 | PASS |
| engine | `danger-ink-dark/surface` | `--color-status-danger-ink-dark` → `--ds-surface` | 5.44 | 4.50 | PASS |
| engine | `danger-ink/alt` | `--color-status-danger-ink-dark` → `--ds-surface-alt` | 4.68 | 4.50 | PASS |
| engine | `danger-ink/control` | `--color-status-danger-ink-dark` → `--ds-control` | 5.57 | 4.50 | PASS |
| engine | `armed-ink/danger-fill` | `--color-primitive-black` → `--ds-danger` | 5.37 | 4.50 | PASS |
| engine | `badge-danger-ink` | `--ds-on-accent` → `--ds-danger` | 4.82 | 4.50 | PASS |
| engine | `rule/surface` | `--ds-rule` → `--ds-surface` | 1.19 | 3.00 | DEBT |

### 1.1 Debt register — five annotated rows, none of them text

A `DEBT` row is a **known result below its own threshold**, not a pass. It exits 0
only because the pair is annotated with its measured ratio; a drop of more than
0.02 fails, and a pair that clears its floor prints `FIXED` so the annotation is
removed.

| theme | pair | ratio | min | what it means | owner / retirement |
|---|---|---:|---:|---|---|
| pitch | `warning/surface` | 4.47 | 4.5 | latent: pitch `--ds-warning` is a badge **fill** whose ink is `--ds-bg` (4.80). Pitch measures 0 of 105 failing nodes — nothing paints this role as text | Task 22, if the role ever gets a text use |
| pitch | `rule/surface` | 1.22 | 3.0 | 1.4.11: the hairline is the only affordance for an outlined control | Phase 5 (`line.strong` per theme) |
| wiki-light | `rule/surface` | 1.46 | 3.0 | same | Phase 5 |
| wiki-dark | `rule/surface` | 1.28 | 3.0 | same | Phase 5 |
| engine | `rule/surface` | 1.19 | 3.0 | same | Phase 5 |

**The four hairline rows are explicitly out of Task 27.** Reaching 3.0 means
changing the `--ds-rule` value itself, which repaints every divider and every
outlined control on four pages — a Phase 5 palette decision (`line.strong` per
theme), not a contrast-token value. Under 1.4.11 the binding case is narrow: it
applies only where the line is the *only* affordance (`.pitch`,
`.ds-btn[data-variant="secondary"]`, `.ds-input`), and each of those controls
also carries a text label. They are gated at 3.0 so they cannot silently worsen
while the decision is open.

### 1.2 Do-not-pair list

These combinations are **below 4.5:1 today** and pass only because no shipped
node combines them. A new component that reaches for one of them fails:

| pair | ratio | why it is not already a failure |
|---|---:|---|
| `color.status.success` `#2E7D46` × wiki-dark on-accent ink | 3.71 | wiki-dark maps `success` to `color.pitch.positive` (7.43) instead — correct by accident |
| `color.status.info` × wiki-dark on-accent ink | 4.43 | the only info fill ships with primitive black (4.94) |
| `color.status.warning` × pitch on-accent ink | 4.51 | 0.01 of headroom; pitch maps badge warning to `--ds-bg` (4.81) |
| primitive white × `--ds-danger` | 3.91 | retired: armed/hover take primitive black (5.37) |

### 1.3 Exemptions and why there are none in this check

- No 3:1 large-text allowance (see above).
- No "decorative text" exemption. A pair is either a slot the CSS combines or it
  is not in the table.
- Hairlines are gated at **3.0** (1.4.11), not 4.5 — see §1.1.

## 2 · Target sizes

`scripts/check-targets.mjs` reads `design-system/base.css` and
`design-system/components.css` and proves the token flow, statically:

| rule | threshold | evidence in the CSS |
|---|---|---|
| control floor | **40px** (`--touch-min`) | `base.css` §6 `:where(a:not([data-ds-compact]), button:…, [role="tab"], …)` with `min-block-size:var(--touch-min)`, 10 primitives, `:where()` so a page rule still wins |
| coarse pointer | **44px** (`--control-height-touch`) | `base.css` §8 `@media (pointer:coarse)` |
| component height | every `--_ctl-h` resolves to ≥40px | `components.css` block that binds `--_ctl-h` to `control.height.*` |
| tab / pill coarse floor | **≥44px** on every variant | `components.css` §5 `@media (pointer:coarse)` — `min-block-size:max(var(--_ctl-h),var(--control-height-touch))`, written as `.ds-tab:not([data-ds-compact])` and `.ds-tabs .ds-tab:not([data-ds-compact])` |
| compact step | **34px** (`--control-height-compact`) | only on `[data-ds-compact]`, `[data-size="compact"]`, `[data-ds-density="compact"]` |

**Why the tab floor is repeated in components.css.** `base.css` §8's coarse rule is a
`:where()` list (zero specificity), so a `.ds-tab` that states its own
`min-block-size` from `--_ctl-h` outranks it — the pill variant (0,3,0) stayed
40px on a phone. The components rule restates the floor at the tab's own
specificity, from `control.height.touch`, once for every variant: the bare class
covers a tab outside a `.ds-tabs` box and the descendant selector ties the pill
variant. `max()` keeps it a floor (a 46px reading tab or 44px engine step never
shrinks), and `[data-ds-compact]` keeps the dense-row opt-out.

**The documented exemption.** `[data-ds-compact]` on the control itself opts out
of both floors and is allowed the 34px compact step. It exists for dense,
repeated, non-primary controls — the reference case is the wiki prompt map (388
map-cell buttons: the floor grows `table.map` 3,736 → 5,173px). It is never for
the primary action of a view. The check enforces the shape of the exemption, not
the judgement call: a compact context that resolves below 34px fails, and a
non-compact selector below 40px fails.

What this check **cannot** see: a rendered box whose height comes from padding,
line-height or content rather than an explicit height; a control shrunk by a
page-level rule; and the actual hit area after clipping or overlap. The axe
`target-size` rule (WCAG 2.2 AA, 24px) runs in the browser job and covers the
soft floor; the 40px token floor remains a design contract, measured statically.

## 3 · axe-core

`scripts/check-axe.mjs` serves the repo on an **ephemeral loopback port**
(port 0; it refuses 5173), loads nine surface runs and runs axe-core 4.10.3 with
`wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice`:

| surface | runs |
|---|---|
| `index.html` (wiki) | light 1440, dark 1440, light 390 |
| `pitch.html` | default 1440, default 390 |
| `engine.html` | default 1440 |
| `design-system/index.html` | light 1440, dark 1440, light 390 |

- Blocking: `critical` and `serious`, above `scripts/a11y/baseline.json`.
- The baseline is a **ratchet**: a rule with no entry fails; a count above the
  entry fails; a count below prints `improved` so the entry is tightened; an
  entry that reaches 0 prints `clean` so it is removed.
- Required rules are asserted against the installed build (`color-contrast`,
  `aria-allowed-attr`, `aria-roles`, `aria-required-attr`, `button-name`,
  `link-name`, `image-alt`, `label`, `select-name`, `duplicate-id-aria`,
  `landmark-one-main`, `region`, `tabindex`, `scrollable-region-focusable`), so a
  silently narrowed axe build cannot turn the job green.
- `prefers-reduced-motion: reduce` is emulated and all animations are finished
  before the run. This is not cosmetic: a section mid-fade blends its text and
  axe then measures an interim colour — the same page read 34 contrast nodes
  mid-transition and 0 after it settled.

Current baseline (`bb88390` + Task 27): **0 nodes on all nine surfaces**. The
three `color-contrast` entries that used to sit in the baseline (`wiki:light:1440`
`h2 small`, `wiki:dark:1440` `a.eng`, `wiki:light:390` `h2 small`) now measure
**4.87** and **9.21** and were deleted from `scripts/a11y/baseline.json` in the
same commit. Every surface is listed with an empty rule map, so a new violation
fails loudly instead of sliding into an absent entry.

Page JS errors fail the job. Network failures are classified separately and
reported as `offline`: the harness answers every non-local request offline, so
the engine's Supabase fetch and the wiki's YouTube thumbnails fail by design.

### State coverage the nine surfaces do not reach

The engine's delete confirmation is 0×0 until the page's own JS opens the card
drawer, so the axe run never sees it. It is measured by a DOM probe instead
(`getComputedStyle` + nearest opaque ancestor background, transitions frozen):

| state | pair | before | after |
|---|---|---:|---:|
| drawer open, `#drawerDel` | `#C93F43`/`#EA6C70` text — here `--_danger-ink` on `--panel` `#1E1E22` | 4.24 | **5.44** |
| drawer open, `#drawerDel:hover` / `.armed` | primitive black on `--ds-danger` `#E5484D` | 3.91 | **5.37** |
| `#drawerMenu #menuDel.armed` | primitive black on `--ds-danger` | 3.91 | **5.37** |
| `#assetEditList .aeactions button.danger` | `--_danger-ink` on the row `--tool` | 5.00 | 5.57 |

## 4 · Mobile navigation drawer

The rail is one `<nav>` landmark in both modes. Below `--breakpoint-lg` (900px,
inclusive) `DS.nav()` turns the same element into an off-canvas drawer; at 901
and above it tears the drawer state down and the static rail returns. The
contract below is what `components.js` `Nav()` actually enforces, and what a
page must not re-implement.

| guarantee | how it is met | WCAG |
|---|---|---|
| Closed drawer is out of the tree and the tab order | `[hidden]` (so `display:none`) **and** `inert`; the toggle reports `aria-expanded="false"` and "Open menu" | 2.4.3 Focus Order · 4.1.2 Name, Role, Value |
| Open drawer keeps focus inside | focus moves to `[data-ds-autofocus]`, else the focusable `[aria-current="page"]`, else the first focusable; Tab from the last item wraps to the injected close control, Shift+Tab from it wraps back to the last; Tab arriving from outside is pulled in | 2.1.1 Keyboard · 2.1.2 No Keyboard Trap |
| There is always a visible way out | the panel's own 44×44 `.ds-navclose` is injected **first**, so it is the trap's first stop and the first thing a screen reader meets; Escape, the scrim and the toggle also close | 2.1.2 · 2.5.8 Target Size (Minimum) |
| The scrim is a real close surface | a `<button type="button" tabindex="-1" aria-label="Close menu">` behind the panel: pointer users can tap it, keyboard users never tab to a redundant stop | 2.1.1 · 2.5.8 |
| Background cannot be reached | every sibling of the rail's ancestor chain (`header`, `main`, `footer`) is `inert` while open and restored on close | 2.4.3 · 1.3.1 Info and Relationships |
| Closing returns focus | focus goes back to the toggle that opened it, unless that node is gone or inside an inert subtree | 2.4.3 |
| Scroll lock does not shift the page | `html[data-ds-nav-lock]` sets `overflow:hidden` **and** `scrollbar-gutter:stable`, so the gutter is reserved while the bar is there and the page does not jump sideways on close | 1.4.10 Reflow |
| Above the breakpoint nothing is left behind | `toStatic()` removes `[hidden]`/`inert`, removes `data-ds-open` and `data-ds-nav-mode`, hides the scrim, drops the injected close button and releases the scroll lock — the static rail is never inert | 2.1.2 |
| No-JS fallback | the toggle ships `hidden` and every drawer rule is gated on `[data-ds-nav-mode="drawer"]`, which only `Nav()` stamps: without JS the rail renders as the plain sticky column, and a hamburger that cannot open anything never appears | 1.3.1 · 4.1.2 |
| Escape yields to a menu | while a `.ds-menu` is open, Escape closes the menu and leaves the drawer open | 2.1.1 |

The drawer is deliberately **not** `role="dialog"` / `aria-modal="true"`: it is
the page's navigation landmark, moved off-canvas, so a screen-reader user keeps
one navigation region rather than a dialog that duplicates it. That also means
the usual dialog assertions do not apply — the things to check are the landmark
name (`aria-label` survives both modes), `aria-expanded` on the toggle, and that
nothing inside the closed panel is focusable.

**What the gate covers.** `check-keyboard.mjs` does not instantiate `Nav()`; the
keyboard contract above is verified by the lane that ships the pages (four page
lanes) and by review, not by the gallery specimen run. axe still sees the
closed/static states on all nine surfaces.

## 5 · Focus + target contract

| token | value | where |
|---|---|---|
| `--focus-width` | `2px` | one ring, `base.css`; no component declares its own |
| `--focus-offset` | `2px` | inside components (`-1 ×` on menu items) |
| `--focus-color` | `var(--ds-accent)` | per theme: pitch 9.60, wiki-light 7.12, wiki-dark 9.21, engine 7.19 against `--ds-bg`; the worst on-surface value is 6.08 (engine `accent/surface`). All clear the 3.0 non-text floor |
| `--touch-min` | `40px` | control floor, §2 |

## 6 · Keyboard smoke

`scripts/check-keyboard.mjs` loads `design-system/index.html` and instantiates
the **shipped** behaviours on the specimen markup (`components.js` is loaded with
`data-ds-manual`, so the page itself never auto-inits the specimens), then drives
real key events through CDP:

1. **Tabs** — ArrowRight/ArrowLeft/Home/End move focus and selection; exactly
   one tab holds `tabindex="0"` and exactly one is `aria-selected="true"`.
2. **Dialog** — open puts focus inside `.ds-dialog__box`, `role=dialog` +
   `aria-modal=true` + a resolvable label, every background sibling is `inert`,
   Tab ×6 never leaves the box, Shift+Tab from the first control wraps to the
   last, Escape closes and returns focus to the invoker.
3. **Menu** — ArrowDown opens onto the first item, ArrowDown roves, Escape
   closes and returns focus to the trigger.

Current result: **19 assertions, 0 failing.**

The test scaffolding is created in the browser at run time (a trigger button is
inserted next to the specimen). No page file is edited. This proves the
component contract; it does not prove that a page wired the component — that is
each lane's own verification.

Negative seams (`--break=tab-arrows|dialog-trap|menu-escape`) sabotage one
behaviour in the page so the assertion has to fail; they exist to prove the
check can fail and are never used in CI.

## 7 · Token workbench keyboard model

The local workbench UI (`design-system/gallery-workbench.js`, behind
`DS_WORKBENCH=1` and a loopback bind) edits existing token values. It is a
documentation tool, not a product surface, so it ships its own small keyboard
contract rather than reusing the component APIs:

| step | key / device | result |
|---|---|---|
| reach a row | Tab | each `[data-token]` row exposes its `[data-token-value]` as a `role="button"`, `tabindex="0"` stop labelled with the dotted key |
| edit | focus the value (live mode) or Enter/Space on it | the value becomes an inline textbox labelled "Edit `<key>` value"; focusing it is enough — the row switches from read to edit on focus |
| save | Enter in the textbox | `POST /__ds/token`; on success the row marks saved and the stylesheet hot-swaps to `tokens.css?v=<sha>` |
| cancel | Escape in the textbox | the editor closes and the original text is restored; no request is sent |
| commit by leaving | Tab/blur with a changed value | commits, same path as Enter |
| undo | the toast's **Undo** button | re-posts `previous`; the same validator, writer and rebuild run in reverse |
| read-only | `/__ds/status` not `200 {enabled:true}` | rows stay focusable but speak only on activation: the value's label says the workbench is off and activating copies the matching `node scripts/ds-set-token.mjs …` command |

The undo toast is `role="status"`, `aria-live="polite"`, `aria-atomic="true"`,
lives **8 s**, and contains a real focusable **Undo** button — focusing the
toast pauses its timer, and focus leaving it restarts a 2 s grace. That is the
4.1.3 Status Messages path: the save and the undo are announced without moving
focus, and the announcement never carries the only copy of the action.

Error rows set `data-token-state="error"` and keep the editor open, so a
rejected value is visible where it was typed (3.3.1 Error Identification). The
workbench is **not** loaded by the nine axe surface runs or by
`check-keyboard.mjs`; this table is its contract, and the lane that wires the
gallery verifies it in a browser.

## 8 · Commands

```sh
# static, no install
node scripts/check-contrast.mjs            # --json, --tokens <file>
node scripts/check-targets.mjs             # --json, --css <extra.css>

# browser checks (once)
npm ci --prefix scripts/a11y --no-audit --no-fund
(cd scripts/a11y && npx --no-install puppeteer browsers install chrome)

node scripts/check-axe.mjs                 # --only wiki:dark:1440 --json --root <tree>
node scripts/check-keyboard.mjs            # --json
npm run --prefix scripts/a11y all          # all four, in order
```

`--root <tree>` serves another checkout (e.g. a `git worktree` of the commit you
want to measure) with the current scripts — useful when the working tree is
dirty.

### Negative proofs (each must exit 1)

```sh
printf '[data-ds-theme="wiki-light"]{--ds-ink:#C9C9C9}\n' >> /tmp/bad.css
cp design-system/tokens.css /tmp/tokens.css && cat /tmp/bad.css >> /tmp/tokens.css
node scripts/check-contrast.mjs --tokens /tmp/tokens.css          # -> 1  (ink/bg 1.56:1)

printf '.ds-btn{--_ctl-h:24px}\n' > /tmp/target.css
node scripts/check-targets.mjs --css /tmp/target.css              # -> 1  (24px < 40px)

node scripts/check-keyboard.mjs --break=tab-arrows                # -> 1  (focus never moves)
node scripts/check-keyboard.mjs --break=dialog-trap               # -> 1  (Tab escapes)
node scripts/check-keyboard.mjs --break=menu-escape               # -> 1  (menu stays open)

node scripts/check-axe.mjs --require-rule not-a-real-rule         # -> 1  (rule missing)
```

## 9 · Limits (honest list)

- **Canvas text is unmeasurable.** Engine board labels are painted with
  `ctx.fillText`; neither the contrast check nor axe sees them. A pixel sample of
  one card per view is still owed.
- **Non-opaque pairs are skipped, not guessed.** `rgba()` scrims and overlays
  resolve to `SKIP` with a reason (currently none in the table).
- **Target sizes are static.** Rendered padding-derived heights, clipping and
  overlap are not measured; axe `target-size` covers the 24px soft floor only.
- **axe reports 1–4 `incomplete` colour-contrast nodes per page** (gradients,
  overlapping layers). They are printed, not failed — a human still has to look.
- **The hairline band (1.19–1.46) is gated at 3.0 as declared debt**, not fixed;
  the value decision is Phase 5 (§1.1).
- **No screen reader, no cross-browser, no 200%/320% reading order, no 2.4.11
  (focus obscured) check.** Those stay manual, as listed in the audit's
  verification plan.
- **The mobile drawer and the token workbench are not driven by a gate.**
  `check-keyboard.mjs` instantiates Tabs, Dialog and Menu only; `Nav()` and
  `gallery-workbench.js` are verified by their lanes in a real browser. axe sees
  the drawer closed/static on the nine product runs and never loads the
  workbench.
- **Other Phase 4 lanes share the working tree** at the time these numbers were
  taken (pitch, and the canvas prompt-generation control in engine). Every number
  above is measured on `bb88390` plus this lane's diff; a lane that darkens text
  below 4.5:1 fails this gate, which is the intended behaviour.
- **CI installs Chrome from the puppeteer lockfile.** If that download is
  blocked by a runner policy, `a11y-browser` fails loudly — it never skips.
