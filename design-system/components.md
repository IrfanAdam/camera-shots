# Component Specs

**Status:** **21 live sections** over the **21 numbered blocks** in `components.css` (1–21, with §20b the rail foot as a sub-block of §20; 19 sections carry a gallery link — the rail and its foot/drawer are contract-only here, and the gallery lane owns their frame) · **3 proposed** (not built — appendix) · **3 page patterns** (spec'd, not shipped — appendix) · **10 specs new in the previous revision**.

Everything below is verified against the shipped layer: `design-system/base.css` (reset, focus ring, skip link, scroll regions, target floor), `design-system/components.css` (21 numbered blocks, 1–21), `design-system/components.js` (Overlay, Nav, Tabs, MenuButton, Toast/announce, copy, focus-preserve) and `design-system/icons.svg` (24 symbols). Values are named by token; the gallery at [`design-system/index.html`](index.html) renders every state once behind a small left-aligned theme pill switcher (pitch, wiki-light, wiki-dark, engine) with one theme panel visible at a time, so a claim here can be checked by eye in one frame. The switcher is the secondary pill shape — `.ds-tabs[data-variant="pill"]` — never the parent; each specimen carries its per-component token code area directly below the specimen frame; cross-surface links (Wiki · Pitch · Engine · Design System) live in the hero, so every gallery `.ds-rail` holds sections only and carries no `.ds-rail__foot`; scrolling lives at the page/panel level, never in a per-component scroll container.

**Read order:** [README](README.md) → [foundations](foundations.md) → this file → [patterns](patterns.md).

### Gallery specimen anatomy (gallery-only chrome, no `.ds-*` block)

Each `#spec-*` block reads head → themes → tokens → source. The theme row is a small left-aligned `.ds-tabs[data-variant="pill"]` switcher beside the block heading — one pill per theme map (pitch, wiki-light, wiki-dark, engine), wrapping, one `role="tabpanel"` visible at a time. Directly below the specimen frame sits the per-component token code area: a code block naming the block's tokens (token names only, one per line, plus the block's class anatomy string), so the eye moves specimen → tokens without leaving the block. Cross-surface links live in the hero, never in a sidenav: no gallery `.ds-rail` carries a `.ds-rail__foot`. Spacing throughout is token-named (`spacing.*`, `radius.*`, `border-width.*`, `typography.*`, `control.height.*`); no raw step ships in the contract.

## Geometry rules that hold for every live component

| Rule | Value | Token |
|---|---|---|
| Control radius | 4px | `radius.xs` |
| Panel / card / dialog radius | 8px | `radius.sm` (card/surface), `radius.md` on `.ds-surface` |
| Pill radius — **only** badges, switch track, progress track/fill, sheet grab, `[data-variant=pill]` chip | 9999px | `radius.pill` |
| Control height | compact 34 · default 40 · engine 44 · pitch 46 | `control.height.*` via `data-ds-density` on any wrapper |
| Hit floor | `touch.min`, coarse pointer → `control.height.touch` | `base.css` §6/§8, specificity `:where()` |
| Tab floor | `.ds-tab` is `min-block-size: max(--_ctl-h, control.height.touch)` (≥44px) under `(pointer:coarse)`; `[data-ds-compact]` opts out | `components.css` §5, two selectors |
| Focus | `outline-style:solid` + `--focus-width` / `--focus-color` / `--focus-offset`, longhands only | `base.css` §2 |
| Theming | every colour is a `--ds-*` role; **nothing paints without `[data-ds-theme]` on an ancestor** | `tokens.css` role maps |
| State | a real attribute (`aria-pressed`, `aria-selected`, `aria-expanded`, `aria-disabled`, `[hidden]`, `[data-armed]`, `[data-loading]`, `:disabled`, `:focus-visible`). `data-state~=…` exists only so the gallery can pin a state in a still frame | `components.css` header |

## Navigation grammar — rails, pills, buttons

Three rules are the owner's contract, and every navigation surface in the system follows them. A page that breaks one is off-grammar regardless of how it looks in isolation.

| Surface | Rule | Component |
|---|---|---|
| **Vertical section nav** | FLAT. No background, no border-radius, no card, no shadow, no dots. Inactive items are muted; the current item is ink + medium weight + a 2px `--ds-accent` bar on the inline-start edge, and every item keeps that 2px as a transparent slot so the text never shifts. One text axis, left-aligned. Edge-flush, sticky, full height, one hairline against the content column. | [Section rail](#ds-rail) — `.ds-rail` + `.ds-nav-item.ds-rail__item` |
| **Content switching** | PARENT + SECONDARY. The parent tablist is the underline shape — `.ds-tabs[data-variant="underline"]`: one horizontal row on the content axis, left-aligned, scrolling under overflow instead of wrapping, never stretched to fill the row; the selected parent takes a `border-width.strong` `--ds-accent` rule and nothing else. Pill (`data-variant="pill"`) is secondary/in-panel only: rounded-full quiet surface, accent fill when selected, wrapping, each tab sized by its label. The boxed bare rendering (`.ds-tabs` with no attribute) is legacy for one release; a nested sub-tablist (`.ds-tabsub__nav`) is legacy too — the live sub shape is the in-panel section nav, one `.ds-rail` of links nested inside each main panel (`.ds-tabsub`), never a standalone rail tablist. | [Tabs](#ds-tabs) — `.ds-tabs[data-variant="underline"]` (parent) + `.ds-tabs[data-variant="pill"]` (secondary) + in-panel `.ds-rail` (sub nav) |
| **Buttons in page chrome** | `.ds-btn` keeps its geometry — `padding-inline: spacing.lg`, `radius.xs`, `control.height.*` — even inside compact toolbars and dense grids. The only sanctioned shrink is `data-size="xs"`; never `padding:0`, never a hand-set radius. §1 carries a geometry guard so an ordinary page selector cannot strip it. | [Button](#ds-btn) — `.ds-btn.ds-btn` |
| **Cross-page links** | PULLED BOTTOM. Links between the core units (wiki, pitch, engine, design system) are one `.ds-rail__foot` group pinned to the bottom of the sidebar — site chrome with a `SURFACES` label, not a section. Its current item is ink + `weight.medium` **only**: the accent bar belongs to the section indicator. Under `breakpoint.lg` the same rail is the off-canvas menu, opened from one `[data-ds-nav-toggle]` button. | [Rail foot & mobile drawer](#ds-mobile-nav) — `.ds-rail__foot` + `DS.nav()` |

Anything that used to be a dot, a card-y rail, a boxed bare parent, or a nested sub-tablist is a legacy shape: it still renders this wave (pages consume it), it is annotated `LEGACY`/`DEPRECATED` in `components.css`, and it is not extended.

## Spec register — the 10 specs added in this revision

| # | Spec | Status | Where it lives |
|---|---|---|---|
| 1 | Theme toggle | **live** | [Pager · nav item · theme toggle](#ds-nav) — `.ds-theme-toggle`, frame `#spec-nav` |
| 2 | Step rail | page pattern, **not built** | [Page patterns](#pattern-step-rail) — no `.ds-*` block exists |
| 3 | Table | **live** | [Table & scroll region](#ds-table) — `.ds-table-wrap` / `.ds-table`, frame `#spec-table` |
| 4 | Footer | page pattern, **not built** | [Page patterns](#pattern-footer) — engine ships no `<footer>` today |
| 5 | Select | **live** | [Select](#ds-select) — `.ds-select`, frame `#spec-field` |
| 6 | File picker | page pattern, **not built** | [Page patterns](#pattern-file-picker) — hidden input + visible trigger |
| 7 | Project modal | **live** variant | [Dialog](#ds-dialog) — `[data-variant=sheet]`, frame `#spec-dialog`; engine adoption is Task 23 |
| 8 | Asset modal | **live** variant | [Dialog](#ds-dialog) — centred `__box`, frame `#spec-dialog`; engine adoption is Task 23 |
| 9 | Context menu | **live** | [Menu & context menu](#ds-menu) — `.ds-menu` + `DS.menu`, frame `#spec-menu` |
| 10 | Scroll region | **live** | [Table & scroll region](#ds-table) — `.ds-scroll-x` / `.ds-scroll-y`, frame `#spec-table` |

---

## Live components

<a id="live"></a>

### Button {#ds-btn}

**Purpose** — the only action primitive. One primary per view; everything else steps down to secondary, ghost, or danger.

**Anatomy** — `<button class="ds-btn" data-variant="primary">` (or `<a>`), optional leading/trailing `<svg class="ds-icon" aria-hidden="true">`, label text or `.ds-btn__label` when the label swaps during loading.

**Variants**

| Variant | Attribute | What changes |
|---|---|---|
| Primary | `data-variant="primary"` | `--ds-accent` fill, `--ds-on-accent` text |
| Secondary (default) | — / `data-variant="secondary"` | transparent fill, `--ds-rule` border, `--ds-ink` text |
| Ghost | `data-variant="ghost"` | no border, ink → `--ds-accent-soft` on hover |
| Danger | `data-variant="danger"` | `--ds-danger` ink/border; `[data-armed]` fills |
| Compact / tall | `data-size="xs"｜"compact"｜"tall"` | height from `--_ctl-h`; `xs` is the **only sanctioned shrink** (padding narrows to `spacing.md`, type to `typography.size.meta`) |

**Geometry guard** — `.ds-btn.ds-btn` restates §1's box (block padding 0, `padding-inline: var(--_pad-x)`, `radius.xs`, `min-block-size: var(--_ctl-h)`) at (0,3,0), so compact page chrome — a toolbar, a dense grid, a page rule like `.plan-nav .pill{padding:0 10px}` — cannot strip the component's padding, radius or height. The shared layer ships no `!important` and `components.css` loads before the page's `<style>`, so without the guard a page selector at (0,1,1) or (0,2,0) wins the tie; repeating the class is what makes the declaration survive. It adds no geometry and cannot shrink a button: the horizontal padding is the component-local `--_pad-x`, which the size ladder re-points (`[data-size="xs"]` → `spacing.md`) and the copy field re-points to `spacing.10`, so the sanctioned steps still win; the height floor is `--_ctl-h`, so `data-ds-density` and `[data-ds-compact]` keep working. A page that wants a smaller button passes `data-size="xs"`; it never writes `padding`.

**States** — default · hover (`--hover-lift` 1.06 + surface step) · focus-visible (ring) · disabled (`opacity.disabled`, `:disabled` **and** `aria-disabled="true"`) · armed (`[data-armed]`, two-tap destroy) · loading (`[data-loading]`, label at `opacity.media`, `cursor:progress`).

**Token map**

| Property | Token |
|---|---|
| Fill / ink | `--ds-accent`, `--ds-on-accent`, `--ds-accent-soft` |
| Surface | `--ds-surface-alt` (hover), `--ds-rule` / `--ds-rule-strong` (border) |
| Height | `control.height.compact｜default｜touch｜reading` via `--_ctl-h` |
| Radius / spacing | `radius.xs`, `spacing.xs`, `spacing.md`, `spacing.lg` |
| Type | `typography.size.small`, `typography.size.meta`, `weight.semibold`, `line-height.tight` |
| Motion | `motion.duration.hover`, `motion.easing.standard`, `hover.lift` |
| Disabled / focus | `opacity.disabled`, `focus.width`, `focus.color`, `focus.offset` |

**Dos and don'ts** — DO keep one `primary` per view; DO require `[data-armed]` for anything destructive; DO pass `data-size="xs"` when chrome needs a smaller button. DON'T put two primaries side by side; DON'T fake a disabled button with `opacity` alone (it stays focusable and clickable); DON'T strip a button's geometry in compact chrome (`padding:0`, a hand-set radius, a 28px height) — the guard will fight you, and the design system has one button shape.

**Accessibility** — real `<button>` or `<a href>`; the label is the accessible name (an icon-only action is an `.ds-icon-btn` with `aria-label`); `:disabled` for inert, `aria-disabled="true"` when the control must stay focusable; focus ring comes from `base.css` §2 and cannot be removed per page.

**Gallery** — [Button frame](index.html#spec-btn) · `#spec-btn`

---

### Icon button {#ds-icon-btn}

**Purpose** — a single icon action with no label: close, overflow, undo, copy, theme.

**Anatomy** — `<button class="ds-icon-btn" aria-label="…">` + one 20px `ds-icon` from the sprite; the square is `--_ctl-h` so it aligns with text buttons in the same row.

**Variants**

| Variant | Attribute | What changes |
|---|---|---|
| Square (default) | — | `radius.xs`, hairline border, `--ds-surface-alt` |
| Circle | `data-variant="circle"` | `radius.circle`, filled surface — used for a drawer close |

**States** — default · hover · focus-visible · disabled (`opacity.disabled`).

**Token map**

| Property | Token |
|---|---|
| Ink / surface | `--ds-ink`, `--ds-muted`, `--ds-surface-alt`, `--ds-rule` |
| Size / radius | `--_ctl-h`, `radius.xs`, `radius.circle` |
| Motion | `motion.duration.hover`, `motion.easing.standard` |

**Dos and don'ts** — DO give every icon button an `aria-label`; DO use `ds-icon` at 20px (`icon.size.md`) so the stroke weight matches. DON'T ship a button whose only affordance is a glyph with no name.

**Accessibility** — `aria-label` is mandatory (the gallery enforces the convention, the gate enforces `svg#id` resolution); the icon keeps `aria-hidden="true" focusable="false"`; hit area is `touch.min` from `base.css` §6.

**Gallery** — [Icon button frame](index.html#spec-icon-btn) · `#spec-icon-btn`

---

### Field & input {#ds-field}

**Purpose** — one labelled control row: label, control, note, error.

**Anatomy** — `<label class="ds-field">` wrapping `.ds-label`, the control (`.ds-input` / `.ds-textarea` / `.ds-select`), and an optional `.ds-note`. The wrapper is the label, so no `for`/`id` pairing is needed and clicking the label focuses the control.

**Variants**

| Variant | Attribute | What changes |
|---|---|---|
| Default | — | `--ds-control` fill, `--ds-rule` border, `radius.xs` |
| Quiet | `data-variant="quiet"` on the control | transparent fill, border only on focus |
| Invalid | `data-invalid="true"` on the field + `aria-invalid="true"` on the control | `--ds-danger` border, `--_alert-ink` label/note |
| Multiline | `.ds-textarea` + `rows` | `min-block-size:calc(--_ctl-h * 2)`, `resize:vertical` |

**States** — default · focus (ring + `--ds-accent` border) · populated · placeholder (`--ds-faint`) · invalid · disabled (`opacity.disabled`).

**Token map**

| Property | Token |
|---|---|
| Surface / border | `--ds-control`, `--ds-rule`, `--ds-rule-strong` |
| Ink | `--ds-ink`, `--ds-ink-2`, `--ds-muted`, `--ds-faint` |
| Invalid | `--ds-danger`, `--_alert-ink` (per-theme alert ink) |
| Label / note | `typography.size.eyebrow` + `tracking.eyebrow` (uppercase label), `typography.size.meta` (note) |
| Geometry | `radius.xs`, `spacing.2`, `spacing.xs`, `spacing.sm`, `spacing.lg` |

**Dos and don'ts** — DO keep the label above the control and the note below; DO let the note carry the rule ("Max 12 characters"). DON'T replace the label with a placeholder — it disappears on input.

**Accessibility** — the `<label>` wrapper is the accessible name; errors use `aria-invalid` **and** the `data-invalid` wrapper (colour is never the only signal — the note changes text); disabled controls use `:disabled`, not a class.

**Gallery** — [Field frame](index.html#spec-field) · `#spec-field`

---

### Select {#ds-select}

**Purpose** — choose one value from a short list without leaving the form. Shipped as the native control, styled; there is no custom listbox.

**Anatomy** — `<label class="ds-field"><span class="ds-label">Lens</span><select class="ds-select">…</select></label>`. Native popup, native keyboard, native mobile sheet.

**Variants**

| Variant | Attribute | What changes |
|---|---|---|
| Default | `class="ds-select"` | same skin as `.ds-input` |
| Quiet | `data-variant="quiet"` | transparent fill |
| In a dense row | inherits `data-ds-density` from the wrapper | 34 / 40 / 44 / 46 height |

**States** — default · focus-visible (ring) · invalid (`aria-invalid`) · disabled.

**Token map**

| Property | Token |
|---|---|
| Surface / border | `--ds-control`, `--ds-rule`, `--ds-rule-strong` |
| Ink | `--ds-ink`, `--ds-muted` |
| Geometry | `radius.xs`, `--_ctl-h`, `spacing.xs`, `spacing.sm` |
| Focus | `focus.width`, `focus.color`, `focus.offset` |

**Dos and don'ts** — DO use it for 3–15 options; DO keep the option text short enough for 390px. DON'T build a `<div role="listbox">` for a plain choice — the native element is the whole a11y contract here; DON'T use a select for navigation.

**Accessibility** — native `<select>` inside a `<label>`; the popup is the platform's, so type-ahead, arrow keys and the mobile picker all work; `aria-invalid` + note for errors. Engine's `#chapterSel` currently has **no label** — that is Task 23's fix, not the component's.

**Gallery** — [Select specimen inside the field frame](index.html#spec-field) · `#spec-field`

---

### Switch {#ds-switch}

**Purpose** — an on/off setting that applies immediately (no Save).

**Anatomy** — `<label class="ds-switch">` + `<input class="ds-switch__input" type="checkbox">` + `<span class="ds-switch__track">` + `<span class="ds-switch__label">`. A real checkbox: form-submittable, screen-reader-legible, no JS.

**Variants**

| Variant | Attribute | What changes |
|---|---|---|
| Checkbox semantics | `type="checkbox"` | default; `:checked` fills the track |
| Switch semantics | `role="switch" aria-checked` (markup choice) | same skin, `aria-checked` instead of `checked` |

**States** — off · on (`:checked` → `--ds-accent` track, thumb to the end) · focus-visible (ring on the **track**, not the clipped input) · disabled (`opacity.disabled`, no pointer).

**Token map**

| Property | Token |
|---|---|
| Track | `--ds-control` (off), `--ds-accent` (on), `--ds-rule` border |
| Thumb | `--ds-muted` → `--color-primitive-white` when checked |
| Geometry | `spacing.2xl` × `spacing.lg` track, `radius.pill`, `radius.circle` thumb, `spacing.2` inset |
| Motion | `motion.duration.hover`, `motion.easing.standard` |

**Dos and don'ts** — DO use a switch for a setting that takes effect at once; DO pair it with a label that names the state ("Autosave"). DON'T use a switch for a choice that needs a Save, and DON'T build a two-label segmented control out of it — pitch's INR/USD control is a different mechanism (see [Proposed](#proposed)).

**Accessibility** — the input is visually hidden with the hairline-box technique, never `display:none` (it must stay focusable); `:focus-visible` paints the track; `:disabled` dims both parts. 19 engine switches already use this exact `<label class=sw><input type=checkbox>` shape.

**Gallery** — [Switch frame](index.html#spec-switch) · `#spec-switch`

---

### Tabs {#ds-tabs}

**Purpose** — switch between sibling panels in place, without a page load. **The parent tablist is the underline shape** (navigation grammar) — `.ds-tabs[data-variant="underline"]` — composed as one hierarchy: hero, then underline parent mains on top switching the main `.ds-tabpanel`, and every main panel nesting its own in-panel `.ds-rail` section nav on the left (`.ds-tabsub` + `.ds-tabsub__panels`) with real sub-sections inside the main container. Pill is secondary/in-panel only. The boxed bare rendering (no attribute) and the nested sub-tablist (`.ds-tabsub__nav`) are legacy for one release and are not extended.

**Anatomy** — a parent `<div class="ds-tabs" data-variant="underline" role="tablist">` of `.ds-tab[role="tab"]` (Product/Investors/Wiki/MVP), each with `aria-controls` onto its `.ds-tabpanel` (`hidden` when not selected). Inside every main panel, a `.ds-tabsub` two-column row holds a `<nav class="ds-rail" aria-label="…">` of `.ds-nav-item.ds-rail__item` links (`href` onto the panel's own sub-sections, `aria-current` on the live one) on the left, plus a `.ds-tabsub__panels` column of the real sub-sections. `DS.tabs(root)` is wired on the parent tablist only and supplies roving tabindex, ←/→/Home/End and the panel swap; the in-panel navs are plain links, not tablists, so no sub-level tab semantics run.

**Variants**

| Variant | Attribute | What changes | Status |
|---|---|---|---|
| **Parent (underline)** | `data-variant="underline"` | horizontal parent row (`spacing.md` gap, `border-width.hairline` `--ds-rule` block-end rule, `overflow-x:auto`), box-less tabs at `radius.none`; the selected tab takes a `border-width.strong` `--ds-accent` block-end mark and nothing else; left-aligned on the content axis, scrolling under overflow instead of wrapping | **live — use this for parent/main content-switching** |
| **Pill (secondary / in-panel only)** | `data-variant="pill"` | rounded-full quiet surface (`radius.pill`), `border-width.hairline` `--ds-rule` boundary, transparent until selected, accent fill + `--ds-on-accent` ink when selected, left-aligned, wraps, each tab sized by its label | **live as the secondary shape — never the parent** |
| Boxed bare | — (no attribute) | bordered tabs at `radius.xs` with accent fill when selected | **legacy — superseded by the underline parent; retires next release** |
| Rail (stacked tablist in a dialog or panel) | `data-variant="rail"` + `aria-orientation="vertical"` inside a dialog or panel | a tablist stacked in a column inside a dialog or panel — **not** a section nav and **not** the per-main-panel sub shape | **live only there — never a section nav, never a main-panel sub-nav** |
| Nested sub-tablist | `.ds-tabs.ds-tabsub__nav` | bare vertical `role="tablist"` with an `aria-selected` / `hidden` pairing at sub level | **legacy — superseded by the in-panel section nav; retires next release** |
| **In-panel section nav (live sub shape)** | `nav.ds-rail` inside `.ds-tabsub` | one flat left section nav per main panel: `.ds-nav-item.ds-rail__item` links (`href` + `aria-current`), the same `layout.rail.inset` text axis and `border-width.strong` `--ds-accent` inline-start mark as the page rail, `spacing.md` gap to the `.ds-tabsub__panels` column | **live — use this for every main panel's own sections** |

**States** — default (`--ds-muted` ink, transparent `border-width.strong` slot) · hover (`--ds-ink` text) · selected (`aria-selected="true"` → `--ds-ink` + `weight.semibold` + `--ds-accent` block-end rule, no fill) · focus-visible (the shared ring) · panel hidden/shown.

**Touch floor** — under `@media (pointer:coarse)` every `.ds-tab` (all four variants) resolves `min-block-size: max(var(--_ctl-h), var(--control-height-touch))`, so a pill is **≥44×44** on a phone even though the pill variant states its own 40px height at (0,3,0) and outranks `base.css` §8's zero-specificity `:where()` floor. The rule is written twice on purpose — `.ds-tab:not([data-ds-compact])` covers a tab outside a `.ds-tabs` box, `.ds-tabs .ds-tab:not([data-ds-compact])` ties the pill variant's selector and wins by source order. `max()` makes it a floor, not a fixed size: a 46px reading-density tab and the 44px engine step never shrink. `[data-ds-compact]` on the tab keeps the dense-row opt-out from `base.css` §6/§8 (34px); a page never needs a local lift.

**Token map**

| Property | Token |
|---|---|
| Ink / surface | `--ds-ink`, `--ds-muted`, `--ds-accent` (parent mark), `--ds-on-accent`, `--ds-surface-alt` (pill / sub selected fill) |
| Rule | `--ds-rule`, `border-width.hairline` (parent block-end rule), `border-width.strong` (selected parent mark, sub-tab inline-start slot) |
| Geometry | `radius.none` (parent), `radius.pill` (secondary pill), `radius.xs` (legacy boxed bare), `spacing.2xs`, `spacing.2`, `spacing.10`, `spacing.md`, `spacing.sm`, `control.height.*` via `--_ctl-h` |
| Type | `typography.size.small`, `typography.family.sans`, `weight.medium` |
| Motion | `motion.duration.hover`, `motion.easing.standard` |

**Dos and don'ts** — DO use the underline parent tablist (`data-variant="underline"`) for main switching: one horizontal row, left-aligned, scrolling under overflow. DO pass `data-variant="pill"` only for secondary/in-panel switching and let that row wrap. DO give every tab `aria-controls` pointing at a real panel id. DO nest one `.ds-rail` section nav inside each main panel (`.ds-tabsub` left cell, `.ds-tabsub__panels` with the real sub-sections on the right) — every main panel carries its own flat left link-list inside the main container, each link a plain `href` with `aria-current` on the live one. DON'T reach for the boxed bare rendering (legacy), a standalone `rail` tablist, or a nested sub-tablist (`.ds-tabsub__nav`, legacy), DON'T stretch parent tabs to equal widths, and DON'T wrap the parent row on desktop: horizontal scroll is the intended behaviour there (the pill row wraps instead). DON'T wire `DS.tabs` onto the in-panel nav — it is links, not tabs, and `apply()` hiding non-selected panels would hide real sections (wiki's exact blocker; it adopts `.ds-tab` CSS + manual ARIA in Phase 3 and defers the JS). DON'T render a rail tablist as a sibling of the parent mains — a standalone rail is the legacy shape.

**Accessibility** — `role="tablist"` / `role="tab"` / `role="tabpanel"` on the parent level only; exactly one tab in the tab order; `aria-selected` on the tab, `aria-labelledby` on the panel; panels get `hidden` (not `display:none` by hand). The in-panel navs are `<nav>` landmarks with plain links — no `role="tablist"`, no `aria-selected` / `hidden` pairing below the parent; the live link carries `aria-current`, exactly like the page rail. The pill's selected state is carried by fill + ink, not by an underline alone, and the focus ring is unchanged from the other controls.

**Gallery** — [Tabs frame](index.html#spec-tabs) · `#spec-tabs` (renders the composed hierarchy — hero, then underline parent mains on top, every main panel nesting its own sticky in-panel `.ds-rail` section nav on the left with real sub-sections inside the main container; pill is the secondary/in-panel shape; the boxed bare rendering and the nested sub-tablist each sit in a single labelled legacy row). Each specimen's themes render behind a small left-aligned pill switcher with one theme panel visible at a time and its per-component token code area directly below the specimen frame — never four cells side by side, never a per-component scroll container. The gallery's own top strip (`#ds-cats`) is the same live parent shape — `.ds-tabs[data-variant="underline"]`: one horizontal row on the content axis, left-aligned, `spacing.md` gap, `border-width.hairline` `--ds-rule` block-end rule, scrolling under overflow instead of wrapping. Pill is never the gallery top strip.

---

### Chip {#ds-chip}

**Purpose** — a filter token: press to narrow a list, press again to release.

**Anatomy** — `<button class="ds-chip" aria-pressed="false">` + label + optional `.ds-chip__count` (the number of matches behind the filter).

**Variants**

| Variant | Attribute | What changes |
|---|---|---|
| Rectangular (default) | — | `radius.xs` |
| Pill | `data-variant="pill"` | `radius.pill` — the one chip allowed to be a pill |
| With count | `.ds-chip__count` child | mono count, inherits the pressed ink |

**States** — default · hover (`--ds-accent` border) · pressed (`aria-pressed="true"` → accent fill, `--ds-on-accent` text) · focus-visible · disabled.

**Token map**

| Property | Token |
|---|---|
| Surface / ink | `--ds-surface`, `--ds-accent`, `--ds-on-accent`, `--ds-ink`, `--ds-muted` |
| Geometry | `radius.xs` / `radius.pill`, `spacing.xs`, `spacing.md` |
| Type | `typography.size.small`, `typography.size.eyebrow`, `typography.family.mono` (count) |

**Dos and don'ts** — DO use `aria-pressed`, never `aria-selected`, on a `<button>` (the wiki's 10 `aria-selected` chips are its only axe **critical**); DO show the count when the list is filtered. DON'T use a chip for navigation or for a destructive action.

**Accessibility** — `<button aria-pressed>`; the pressed state is announced; the visible ink change is paired with the attribute so colour is not the only signal.

**Gallery** — [Chip frame](index.html#spec-chip) · `#spec-chip`

---

### Badge {#ds-badge}

**Purpose** — a non-interactive status word: FREE / PAID / UNVERIFIED, success, warning, danger.

**Anatomy** — `<span class="ds-badge" data-variant="success">` + short uppercase text; mono, tracked, `radius.pill`.

**Variants**

| Variant | Attribute | Ink |
|---|---|---|
| success | `data-variant="success"` | `--ds-success` fill |
| info | `data-variant="info"` | `--ds-info` fill, black ink override |
| warning | `data-variant="warning"` | `--ds-warning` fill, per-theme ink |
| danger | `data-variant="danger"` | `--ds-danger` fill |
| neutral | `data-variant="neutral"` | `--ds-muted` fill |
| outline | `data-variant="outline"` | transparent, `--ds-rule` border |

**States** — static. A badge has no hover, focus, or pressed state; anything stateful is a chip.

**Token map**

| Property | Token |
|---|---|
| Fill / ink | `--ds-success`, `--ds-warning`, `--ds-danger`, `--ds-info`, `--ds-muted`, `--ds-on-accent`, `--_badge-ink` |
| Geometry | `radius.pill`, `spacing.2`, `spacing.xs` |
| Type | `typography.size.eyebrow`, `tracking.eyebrow`, `typography.family.mono`, `weight.bold` |

**Dos and don'ts** — DO keep one word; DO let the tone carry meaning the text already states. DON'T put a badge on a button or use it as a control.

**Accessibility** — the text is the label (no `aria-label` needed, no icon-only badge); contrast is token-owned — `warning` carries a per-theme `--_badge-ink` because one ink cannot pass AA on all four surfaces; the `info` tone uses black ink for the same reason.

**Gallery** — [Badge frame](index.html#spec-badge) · `#spec-badge`

---

### Card & surface {#ds-card}

**Purpose** — card groups one idea; surface is the bare panel behind a group of controls.

**Anatomy** — `.ds-card` = hairline + `radius.sm` + `spacing.md`/`spacing.lg` padding, with `.ds-card__head`, `.ds-card__eyebrow`, `.ds-card__meta`. `.ds-surface` = the same skin at `radius.md`, no internal structure.

**Variants**

| Variant | Attribute | What changes |
|---|---|---|
| Card | `.ds-card` | `radius.sm`, hairline `--ds-rule`, `--ds-surface` |
| Accent card | `data-variant="accent"` | `border-inline-start: border-width.accent` in `--ds-accent` |
| Raised surface | `.ds-surface[data-variant="raised"]` | `elevation.1` shadow |
| Inset surface | `.ds-surface[data-variant="inset"]` | `--ds-bg` fill — a well inside a panel |

**States** — static; a card is linked only by wrapping its title in an `<a>`, and then the focus ring is the only state.

**Token map**

| Property | Token |
|---|---|
| Surface / border | `--ds-surface`, `--ds-bg`, `--ds-rule`, `border-width.hairline`, `border-width.accent` |
| Ink | `--ds-ink`, `--ds-muted`, `--ds-accent` |
| Geometry | `radius.sm`, `radius.md`, `spacing.md`, `spacing.lg`, `elevation.1` |
| Type | `typography.size.eyebrow` + `tracking.eyebrow` (eyebrow), `typography.size.meta` (meta) |

**Dos and don'ts** — DO put one idea per card and keep nesting to one level. DON'T reach for a shadow to separate cards on a dark surface — the hairline plus the surface step does it.

**Accessibility** — titles are real headings (`h3`/`h4`) in document order; if the whole card is a link, it is one `<a>` wrapper with a name, not a div with a click handler.

**Gallery** — [Card frame](index.html#spec-card) · `#spec-card` · [Surface frame](index.html#spec-surface) · `#spec-surface`

---

### Table & scroll region {#ds-table}

**Purpose** — dense tabular data (token maps, plans, shot lists), with a mobile reading mode. Scroll region is the keyboard contract for any overflow container.

**Anatomy** — `.ds-table-wrap` (the scroll region) > `table.ds-table` > `thead th[scope="col"]` + `tbody td[data-label="…"]`. Below the container query the header row hides and each row becomes a stacked card whose cells prefix themselves from `data-label`.

**Variants**

| Variant | Attribute | What changes |
|---|---|---|
| Compact table | `.ds-table` | `spacing.sm` × `spacing.14` cells, hairline row rules |
| Stacked (automatic) | `@container (width < 40rem)` | rows become cards, `td::before` prints `data-label` |
| Horizontal scroll | `.ds-scroll-x` (+ `tabindex="0" role="region" aria-label`) | `overflow-x:auto`, `overscroll-behavior-x:contain` |
| Vertical scroll | `.ds-scroll-y` (+ same attributes when it scrolls) | `overflow-y:auto`, `overscroll-behavior-y:contain` |

**States** — static rows; a row action is a `.ds-btn[data-size="xs"]` or a `.ds-menu__item` inside the row.

**Token map**

| Property | Token |
|---|---|
| Surface / rule | `--ds-surface`, `--ds-surface-alt` (hover), `--ds-rule`, `border-width.hairline` |
| Ink | `--ds-ink`, `--ds-muted` |
| Geometry | `spacing.sm`, `spacing.14`, `radius.xs` (stacked rows) |
| Type | `typography.size.small`, `typography.size.eyebrow`, `tracking.eyebrow`, `weight.medium` |

**Dos and don'ts** — DO add `scope="col"` to every `<th>` and `data-label` to every `<td>`; DO give the wrapper `tabindex="0" role="region"` and a name when it scrolls. DON'T ship a 97-row table without `scope`/`data-label` (the wiki's map table is the measured counter-example: 4 `th`, 0 `scope`, 0 `caption`).

**Accessibility** — `<th scope>` is the row/column contract; `data-label` is what makes the stacked mode readable, not decorative; a scrollable region must be reachable and named (that is exactly the "unreachable-only" rule the Phase 3 gate uses instead of a raw off-viewport count). The one non-token value in `components.css` lives here: the `40rem` container threshold, because `var()` is invalid in a prelude (C1 lists it).

**Gallery** — [Table frame](index.html#spec-table) · `#spec-table` · the same frame's wrapper is the scroll-region specimen.

---

### Drawer {#ds-drawer}

**Purpose** — a side surface that keeps the page context visible: engine's card editor, pitch's plan sheet.

**Anatomy** — `<aside class="ds-drawer" hidden>` fixed to the inline end, `100dvh`, full-height scroll body, hairline leading edge. Opened and closed by `DS.overlay`, never by a class flip.

**Variants**

| Variant | Attribute | What changes |
|---|---|---|
| Engine width | — | `layout.drawer.engine.width` |
| Wide (pitch) | `data-variant="wide"` | `layout.drawer.pitch.width` |
| Open | `data-open` (painted state) | `transform:none` — only ever set **with** `hidden` removed |

**States** — closed (`hidden` + `inert`, **not** transform-only) · open (`[data-open]`) · focus inside the trap · returning focus to the invoker on close.

**Token map**

| Property | Token |
|---|---|
| Surface / rule | `--ds-surface`, `--ds-rule`, `--ds-ink`, `border-width.hairline` |
| Width | `layout.drawer.engine.width`, `layout.drawer.pitch.width` |
| Stacking | `z.drawer` via `--_z` |
| Motion | `motion.duration.slow`, `motion.easing.drawer` |
| Padding | `spacing.lg` |

**Dos and don'ts** — DO close on Escape, on scrim click and on the close button, and return focus to the invoker. DON'T close with `transform:translateX(105%)` alone — the closed drawer keeps 5 tab stops in the engine today; DON'T put a transform on an ancestor of a fixed drawer. There is **no bottom-sheet variant at ≤639px** — pitch's 92dvh phone sheet stays page-local until a variant ships.

**Accessibility** — `role="dialog"` + `aria-modal="true"` + `aria-label` (or `aria-labelledby`); background `inert`; focus trapped and returned; the close control is an `.ds-icon-btn[data-variant="circle"]`.

**Gallery** — [Drawer frame](index.html#spec-drawer) · `#spec-drawer`

---

### Dialog (incl. project modal · asset modal) {#ds-dialog}

**Purpose** — a modal that must be answered before the page continues. Two shipped shapes: a centred box (asset modal) and a full-height inline-end sheet (project modal).

**Anatomy** — `.ds-dialog` (fixed grid, `--_z` stacking) > `.ds-dialog__scrim` + `.ds-dialog__box` (heading, body, action row). `DS.overlay` supplies role, `aria-modal`, label, trap, `inert` and focus return.

**Variants**

| Variant | Attribute | Geometry |
|---|---|---|
| Centred box | `.ds-dialog` | `--_box-w: min(560px, 94vw)`, `max-block-size: 88vh` |
| Sheet | `data-variant="sheet"` | pinned to the inline end, full height, `min(92vw, layout.max.wiki)` cap |
| Project modal (engine) | sheet + page geometry override | keep `.proj-box` width/padding on the `__box` or the 880px sheet collapses to 560 |
| Asset modal (engine) | centred box | 560px, no override needed |

**States** — closed (`hidden`) · open (trap live) · scrim hover (no change — the scrim is a close target, not a button).

**Token map**

| Property | Token |
|---|---|
| Surface / scrim | `--ds-surface`, `--ds-rule`, `--ds-rule-strong`, `--_scrim` (default `rgb(0 0 0 / .6)`, overridable per surface) |
| Box | `--_box-w` (`560px` / `94vw` — C1-listed), `88vh`, `92vw` |
| Geometry | `radius.sm` (box), `radius.none` (sheet), `spacing.md`, `spacing.20`, `spacing.lg` |
| Stacking | `z.overlay` default; engine sets `--_z: z.canvas` so a modal clears its own canvas |

**Dos and don'ts** — DO open with `DS.overlay(el)` and let it label, trap and restore; DO keep the sheet's page geometry as a `__box` override rather than a new selector. DON'T ship a second scrim element of your own — engine's `.backdrop` goes away; DON'T nest a dialog in a dialog.

**Accessibility** — `role="dialog"` + `aria-modal="true"` + `aria-label` **or** `aria-labelledby` (both accepted; C3 enforces that pair); background `inert`; Escape closes; focus returns to the invoker; the heading inside the box is the natural label source (`Overlay.label()` synthesises `aria-labelledby` from the first heading when no label exists).

**Gallery** — [Dialog frame](index.html#spec-dialog) · `#spec-dialog` (both shapes are in every theme cell)

---

### Menu & context menu {#ds-menu}

**Purpose** — a short list of actions attached to a trigger: the engine's `#dots` overflow and every row's context menu.

**Anatomy** — `[data-ds-menu-trigger][aria-expanded]` + a `.ds-menu[role="menu"]` containing `.ds-menu__item[role="menuitem"]` buttons. `DS.menu(trigger, panel)` owns `aria-haspopup/expanded/controls`, roving items, Escape, outside click and focus return.

**Variants**

| Variant | Attribute | What changes |
|---|---|---|
| Default item | `.ds-menu__item` | `--ds-ink`, `--ds-surface-alt` on hover |
| Danger item | `data-variant="danger"` | `--ds-danger` ink |
| Armed | `data-armed` | filled danger — the second tap of a destroy |
| Shortcut hint | `<kbd>` inside the item | mono, `--ds-muted` |

**States** — closed (`hidden`) · open (`aria-expanded="true"`) · item hover/focus (`--ds-surface-alt`) · armed · disabled item (`aria-disabled`).

**Token map**

| Property | Token |
|---|---|
| Surface / rule | `--ds-surface`, `--ds-surface-alt`, `--ds-rule-strong` |
| Ink | `--ds-ink`, `--ds-danger` |
| Geometry | `radius.sm` panel, `radius.xs` item, `spacing.6`, `spacing.10` |
| Elevation / z | `elevation.popover`, `z.menu` |
| Type | `typography.size.small`, `typography.family.sans` |

**Dos and don'ts** — DO put `role="menuitem"` on every child (the engine ships 6 popovers with **0** menuitems today); DO close on selection. DON'T use a menu for a form (`#arrowpick` is a form popover, `#delConfirm` an armed pair — both stay page-local); DON'T nest submenus.

**Accessibility** — `role="menu"` with a name, `role="menuitem"` children, roving tabindex, Escape closes and returns focus, outside click closes. Items are real `<button>`s so Enter/Space work without listeners.

**Gallery** — [Menu frame](index.html#spec-menu) · `#spec-menu`

---

### Toast {#ds-toast}

**Purpose** — one line of feedback for an action that already succeeded, with at most one action (Undo).

**Anatomy** — `.ds-toast` fixed at the bottom centre, `role="status"`, message + optional action `.ds-btn`. `DS.toast` / `DS.announce` own the live region, the auto-dismiss timer and the pause on hover/focus.

**Variants**

| Variant | Attribute | What changes |
|---|---|---|
| Informational | `role="status"` (default) | polite, `aria-atomic="true"` |
| Error | `role="alert"` | assertive — for a failure the user must notice |
| With action | `.ds-btn` child | one action maximum |

**States** — hidden (idle, `[hidden]`) · visible · paused (hover or focus inside) · dismissed (10s minimum).

**Token map**

| Property | Token |
|---|---|
| Surface / rule | `--ds-surface`, `--ds-rule-strong`, `--ds-ink` |
| Geometry | `radius.sm`, `spacing.md`, `spacing.xs`, `spacing.2xl`, `layout.max.wiki` |
| Elevation / z | `elevation.popover`, `z.toast` |
| Type | `typography.size.small` |

**Dos and don'ts** — DO announce once per action; DO let it auto-dismiss. DON'T ask a question in a toast (use a dialog); DON'T stack toasts — the last message wins.

**Accessibility** — one node, one live region: `role=status aria-live=polite aria-atomic` for information, `role=alert` + assertive for errors; the timer pauses on hover/focus so it can be read; the action button is keyboard reachable inside the region. The engine's `#toast` today has no role and no live region — Task 23.

**Gallery** — [Toast frame](index.html#spec-toast) · `#spec-toast`

---

### Empty state {#ds-empty}

**Purpose** — say what is missing and what to do next, in the space where content would be.

**Anatomy** — `.ds-empty` block + `.ds-empty__title` + one line of guidance, optionally an action.

**Variants**

| Variant | Attribute | What changes |
|---|---|---|
| Block | `.ds-empty` | centred, `spacing.md` block padding |
| Inline | `data-variant="inline"` | single line, no block padding — for a list row |

**States** — static.

**Token map**

| Property | Token |
|---|---|
| Ink | `--ds-ink-2` (title), `--ds-muted` (body) |
| Geometry | `spacing.2xs`, `spacing.md` |
| Type | `typography.size.small`, `typography.size.meta`, `weight.medium` |

**Dos and don'ts** — DO name the reason ("No shots match this filter") and the next action; DO keep it to one sentence plus one action. DON'T use an empty state for an error — errors carry `role="alert"` and a retry.

**Accessibility** — plain text in document order; if it is the result of a filter, announce the count through `DS.announce` rather than relying on the region being seen.

**Gallery** — [Empty state frame](index.html#spec-empty) · `#spec-empty`

---

### Progress {#ds-progress}

**Purpose** — determinate progress for an operation with a known end (render, import, upload).

**Anatomy** — `.ds-progress` track + `.ds-progress__bar` whose `inline-size` is the percentage; `role="progressbar"` with `aria-valuenow` / `aria-valuemin` / `aria-valuemax` on the track.

**Variants**

| Variant | Attribute | What changes |
|---|---|---|
| Default | `.ds-progress` | `spacing.xs` track, accent bar |
| Thick | `data-variant="thick"` | `spacing.10` track |
| Ghost | `data-variant="ghost"` | dashed accent outline bar — for an indeterminate-feeling estimate |

**States** — idle (0) · in progress (`aria-valuenow` changes) · complete (100).

**Token map**

| Property | Token |
|---|---|
| Track / bar | `--ds-surface-alt`, `--ds-accent`, `--ds-rule` |
| Geometry | `spacing.xs` / `spacing.10` height, `radius.pill` |
| Motion | `motion.duration.base`, `motion.easing.standard` |

**Dos and don'ts** — DO update `aria-valuenow` with the width; DO use the ghost variant only when the end is genuinely unknown. DON'T animate a determinate bar with a looping shimmer.

**Accessibility** — `role="progressbar"` + `aria-valuenow/min/max` on the track (not the bar); the bar is decorative; with `prefers-reduced-motion` the width transition collapses to 0s via `base.css` §7.

**Gallery** — [Progress frame](index.html#spec-progress) · `#spec-progress`

---

### Tooltip {#ds-tooltip}

**Purpose** — name an unlabelled control or explain an abbreviation on hover **and** on focus.

**Anatomy** — `.ds-tooltip[hidden]` positioned by the page (a chart tooltip is placed per rect), referenced by the trigger's `aria-describedby`.

**Variants**

| Variant | Attribute | What changes |
|---|---|---|
| Default | `.ds-tooltip` | `--ds-surface-alt` fill, hairline, `radius.sm`, `z.tooltip` |

**States** — hidden (default) · visible on hover · visible on focus (the one that matters for keyboards).

**Token map**

| Property | Token |
|---|---|
| Surface / rule | `--ds-surface-alt`, `--ds-rule-strong`, `--ds-ink` |
| Geometry | `radius.sm`, `spacing.xs`, `spacing.10` |
| Stacking / type | `z.tooltip`, `typography.size.eyebrow` |

**Dos and don'ts** — DO show on focus as well as hover; DO keep it to a name or a number. DON'T hide required information in a tooltip; DON'T position it with JS inside the component — the owner places it.

**Accessibility** — `aria-describedby` from trigger to tooltip; the tooltip is never the only label (that is `aria-label`'s job); it must not capture pointer events.

**Gallery** — [Tooltip frame](index.html#spec-tooltip) · `#spec-tooltip`

---

### Pager, nav item & theme toggle {#ds-nav}

**Purpose** — three small navigational primitives: the pager under a list, the nav item in a rail or a TOC, and the light/dark switch.

**Anatomy** — `.ds-pager` (Prev · "Page n" · Next, buttons at `data-size="xs"`); `.ds-nav-item` (an `<a>` with `aria-current="page"` when active, optional `::before` dot); `.ds-theme-toggle` (`role="group"` + `aria-label`, two `.ds-btn[data-variant="ghost"][aria-pressed]`).

**Variants**

| Variant | Attribute | What changes |
|---|---|---|
| Rail item — **flat** | `.ds-rail .ds-rail__item` (or `.ds-nav-item[data-variant="rail"]`) | full-width row, **no radius, no fill**: hover is ink text only, current is ink + `weight.medium` + a 2px `--ds-accent` inline-start bar that every item reserves as a transparent slot. See [Section rail](#ds-rail) |
| Dot item — **deprecated** | `.ds-nav-item[data-variant="dot"]` | `::before` `dot.size` marker; the grammar has no dots (the accent bar is the one indicator). Renders this wave, retires next release — do not add it to new markup |
| Pager | `.ds-pager` | flex row, `spacing.md` gap |
| Theme toggle | `.ds-theme-toggle` | `role="group"`, two pressed buttons |

**States** — default (`--ds-muted`, transparent 2px slot) · hover (rail: ink text, no fill) · current (`aria-current="page"` → ink + `weight.medium`, `--ds-accent` bar on the inline-start edge) · focus-visible · theme button pressed (`aria-pressed="true"` → accent fill).

**Token map**

| Property | Token |
|---|---|
| Ink / surface | `--ds-ink`, `--ds-muted`, `--ds-accent`, `--ds-surface`, `--ds-surface-alt`, `--ds-bg` |
| Rule / marker | `--ds-rule`, `--ds-rule-strong`, `border-width.strong`, `dot.size` (deprecated variant only) |
| Geometry | `radius.none` (rail item), `radius.xs` (pager/toggle), `spacing.2`, `spacing.sm`, `spacing.md`, `spacing.10` |
| Target | `touch.min` |

**Dos and don'ts** — DO mark the current item with `aria-current`, not a class; DO keep the theme toggle to two states and write `data-ds-theme` and `data-theme` in **one** function (two writers half-apply dark mode). DON'T add a dot to the underline tab style — pick one indicator.

**Accessibility** — nav items are links with `aria-current="page"`; the pager's two buttons have text, not glyphs alone; the theme toggle is a labelled group of toggle buttons (`aria-pressed`), so the state is announced without a live region.

**Gallery** — [Pager · nav item · theme toggle frame](index.html#spec-nav) · `#spec-nav`

---

### Section rail · block 20 {#ds-rail}

**Purpose** — the vertical section navigation for a page: one flat column of section links pinned to the left edge of the viewport. It is a scaffold, not a card — the flatness is the grammar. A page adds no background, no radius, no shadow, no dot; the only mark is the accent bar on the current item.

**Anatomy** — `<nav class="ds-rail" aria-label="Sections">` holding at most a few `.ds-rail__label` eyebrows and one `.ds-nav-item.ds-rail__item` per section. Two class names per item and **no attribute**: `.ds-rail__item` carries the item's rule set (declared with §18's nav item), `.ds-nav-item` brings the type, height and focus behaviour.

```html
<nav class="ds-rail" aria-label="Sections">
  <p class="ds-rail__label">Brief</p>
  <a class="ds-nav-item ds-rail__item" href="#brief" aria-current="page">The brief</a>
  <a class="ds-nav-item ds-rail__item" href="#shots">Shots</a>
  <a class="ds-nav-item ds-rail__item" href="#notes">Notes</a>
</nav>
```

`data-variant="rail"` on a `.ds-nav-item` is the equivalent older spelling and renders identically; new markup uses the two-class form. The rail styles only the items it contains — a `<ul>`/`<li>` wrapper is allowed but not required.

**Slotting it into a full-bleed grid** — the rail must sit against the viewport's left edge, so it can never live inside a centred max-width wrapper. The page grid owns the split, and the content column owns the max-width and its own gutter:

```css
.page{display:grid;grid-template-columns:var(--layout-rail) minmax(0,1fr)}
.page__main{max-inline-size:var(--layout-max-wiki);margin-inline:auto;
            padding-inline:var(--spacing-2xl)}
```

`<body>` and the grid row carry **no** horizontal padding — the rail supplies its own inset, and its hairline is the only edge it draws. `position:sticky` needs a row taller than the rail, which is why the rail is `align-self:start` and `block-size:100dvh`; no ancestor may declare `overflow`, or that ancestor becomes the sticky container and the rail scrolls away with the content. On a narrow viewport the page drops the rail cell (`grid-template-columns:minmax(0,1fr)`) and the same element becomes the off-canvas drawer described in [Rail foot & mobile drawer](#ds-mobile-nav) — one rail element, two modes, no duplicate nav markup.

**Under a sticky header** — the rail's sticky offset and its height come from the component-local `--_rail-top`, which defaults to `0px` (`inset-block-start: var(--_rail-top)`, `block-size: calc(100dvh - var(--_rail-top))`). A page whose rail starts below a sticky header sets it once on the rail (`engine.html` measures its header with `offsetHeight` and writes the value in JS, because the header wraps and a hard-coded height would drift). It is a private var, not a token: the distance belongs to the page shell, and `0px` is the correct value for a rail pinned to the viewport top.

**States**

| State | Mark | Selector |
|---|---|---|
| default | `--ds-muted` text, 2px transparent inline-start slot, `weight.regular` | `.ds-rail .ds-rail__item` |
| hover | `--ds-ink` text only — no fill, no border change | `:hover`, `[data-state~="hover"]` |
| current | `--ds-ink` + `weight.medium` + 2px `--ds-accent` bar on the inline-start edge | `[aria-current="page"]`, `[aria-selected="true"]`, `[data-state~="current"]` |
| focus-visible | the shared ring (`focus.width` / `focus.offset` / `focus.color`) | `.ds-nav-item:is(:focus-visible)` |

The 2px slot is present on **every** item, current or not, which is why the text never shifts when the current item changes. The label sits on the same text axis (slot + `spacing.md`), so the eyebrow and the items share one left edge.

**Inside a main tabpanel** — the same rail nests per main panel as the tabs' live sub shape: one `<nav class="ds-rail" aria-label="…">` in the `.ds-tabsub` left cell, the panel's own sub-sections in `.ds-tabsub__panels` across a `spacing.md` gap. Same two-class items, same tokens — `layout.rail.inset` text axis, `border-width.strong` `--ds-accent` inline-start mark, `control.height.*` rows through `--_ctl-h`, `spacing.2` row rhythm, `typography.size.small` items. The in-panel rail is sticky inside its panel (`inset-block-start` from the gallery's top-offset token, `z.sticky` below the category bar) with its own internal scroll (`overflow-y:auto`, `overscroll-behavior-y:contain`), so a long sub-nav scrolls without moving the panel content. Only the page-level rules fall away: an in-panel rail is not full-height and never a drawer — its links are `href`s onto the panel's own sub-sections with `aria-current` on the live one, and there is no `.ds-rail__foot` inside a panel. No nested scroll containers: the panel owns the scroll; specimens and theme panels never add per-component scroll caps.

**Token map**

| Property | Token |
|---|---|
| Width | `layout.rail` (208px) — a rail is narrower than a card sidebar; the per-surface `layout.sidebar.*` widths it replaced were retired with the navigation rewrite (see `DEPRECATIONS.md`) |
| Inset | `layout.rail.inset` → `spacing.20`: the **rail** takes it as `padding-block` only (`padding-inline:0`), so the 2px indicator sits flush at x=0 and the hairline is the edge; the **items and the label** carry it as `padding-inline-start` (inline-end `spacing.md`) |
| Edge | `border.width.hairline` + `--ds-rule`, inline-end only; `radius.none`; `background:transparent` |
| Indicator | `border.width.strong` (2px), `--ds-accent`, transparent when idle |
| Ink | `--ds-muted` (idle), `--ds-ink` (hover/current), `--ds-faint` (label) |
| Type | `typography.size.small` (items), `typography.size.eyebrow` + `typography.family.mono` + `tracking.eyebrow` (label), `weight.regular` / `weight.medium`, `line-height.tight` |
| Rhythm | `spacing.2` (item gap), `spacing.xs` (label → items), `spacing.md` (item padding / label offset), `spacing.lg` (second label) |
| Height | `control.height.*` through `--_ctl-h` and `data-ds-density`, i.e. the item is a control, the rail is not |
| Sticky offset | `--_rail-top` (component-local, default `0px`; page rail set by a page whose rail starts under a sticky header) · in-panel rail `inset-block-start` from the gallery top-offset token (`control.height.default` + `spacing.2xl` source) at `z.sticky`, with internal `overflow-y:auto` + `overscroll-behavior-y:contain` |
| Motion | `motion.duration.hover`, `motion.easing.standard` (inherited from the item) |

**Dos and don'ts** — DO keep the rail flat and edge-flush, DO mark the live section with `aria-current="page"`, DO let the content column carry the max-width, DO put cross-page links in a `.ds-rail__foot` (below). DON'T put a background, border-radius, card, shadow or dot on the rail or its items, DON'T nest the rail inside the max-width wrapper (it must be the first grid cell), DON'T give it a second indicator (an icon *and* a bar, a dot *and* a bar), and DON'T rebuild a section nav out of a `.ds-tabs[data-variant="rail"]` tablist or a nested `.ds-tabsub__nav` sub-tablist — both are tab semantics, not section-nav semantics (the in-panel `.ds-rail` of links inside `.ds-tabsub` is the tabs' live sub shape, and it *is* a section nav).

**Accessibility** — a landmark `<nav>` with `aria-label`; items are links (`<a href>`), not buttons, and the current one carries `aria-current="page"` so the state is announced rather than coloured. The rail is in normal document order before the content, so the tab sequence matches reading order; the focus ring is the shared `base.css` ring. Because the rail is sticky and full height, it must not trap scrolling: it scrolls its own overflow only when the sections exceed the viewport.

**Gallery** — the gallery places its section nav under the hero blurb, not in a left column: one flat `.ds-rail` group on the content axis beneath the masthead lede, items at `control.height.*` via `--_ctl-h` with the `spacing.md` text-axis offset and `spacing.2` row rhythm. The nav holds sections only — cross-surface links live in the hero, and no gallery `.ds-rail` carries a `.ds-rail__foot`. The top category strip above the panels is the underline parent shape (`#ds-cats` as `.ds-tabs[data-variant="underline"]`). The drawer contract in the next section still holds — this section states the placement, the next states the drawer.

---

### Rail foot & mobile drawer · blocks 20b + 21 {#ds-mobile-nav}

**Purpose** — two things the owner asked for in one contract: the cross-page links ("design system, pitch etc") live in a group **pulled to the bottom** of the sidebar instead of scattered in the header, and the same rail is the **menu on a phone** (`data-ds-nav-mode="drawer"` at ≤`breakpoint.lg`). One rail element serves both, so a page never ships duplicate nav markup.

**Anatomy**

```html
<header class="top">
  <div class="hright"><span class="by">by irfan</span>
    <button type="button" class="ds-navtoggle" data-ds-nav-toggle="nav-drawer"
            aria-controls="nav-drawer" aria-expanded="false"
            aria-label="Open menu" hidden>
      <svg aria-hidden="true" focusable="false"><use href="design-system/icons.svg#ds-icon-menu"></use></svg>
    </button>
  </div>
</header>

<nav class="ds-rail" id="nav-drawer" data-ds-nav aria-label="Entries">
  <p class="ds-rail__label">Entries</p>
  <!-- …the section list… -->
  <div class="ds-rail__foot">
    <p class="ds-rail__label">Surfaces</p>
    <span class="ds-nav-item ds-rail__item" aria-current="page">Wiki</span>
    <a class="ds-nav-item ds-rail__item" href="pitch.html">Pitch</a>
    <a class="ds-nav-item ds-rail__item" href="engine.html">Engine</a>
    <a class="ds-nav-item ds-rail__item" href="design-system/index.html">Design System</a>
  </div>
</nav>
```

**The foot** — `.ds-rail__foot` is the browser's last flex item with `margin-block-start:auto` inside the 100dvh rail column, so it sits on the viewport bottom; it is `position:sticky` on the block-end edge, so a section list longer than the rail scrolls **under** it instead of carrying it away. A hairline (`border.width.hairline` + `--ds-rule`) is the only separator, and the group paints `--ds-bg` so items never show through. It is **site chrome, not a section**: its items are ordinary `.ds-nav-item.ds-rail__item`s (same 2px transparent slot, same `layout.rail.inset` text axis) one type step down (`typography.size.meta`, `tracking.snug`) at the touch height, and `aria-current="page"` on one is **ink + `weight.medium` only** — never the accent bar, so the section indicator stays the only bar in the rail. A rail with no foot keeps the old 20px of air under its last item.

**The drawer** — `DS.nav(railEl, options?)` binds one rail and returns `{open, close, toggle, sync, isOpen, el, breakpoint, destroy}`; `DS.init()` binds every `[data-ds-nav]` and passes `{breakpoint: data-ds-breakpoint}` from the rail. `sync()` re-runs the mode check after a page renders or moves its toggle. The module reads the breakpoint from `--breakpoint-lg` at runtime, so the CSS and the JS cannot drift, and it stamps `data-ds-nav-mode="drawer"` on the rail while the query matches. The query is `(max-width: <breakpoint>px)` — **900px is included, 901 is desktop** — and crossing it upward calls `toStatic()`. Every drawer rule is gated on the mode attribute: no JS, no attribute, static rail — and a rail with **no** `[data-ds-nav-toggle]` also stays static, so a page can never hide its navigation behind a menu that nothing opens.

**Attributes**

| Attribute | On | Contract |
|---|---|---|
| `data-ds-nav` | the rail | Opt-in marker: `DS.init()` binds every element that carries it, and `Nav()` sets it too |
| `id` | the rail | The name a toggle points at (`nav-drawer` on all four pages); if absent, `Nav()` generates `nav-drawer-<n>` |
| `data-ds-nav-toggle="<rail-id or #rail-id>"` | the opener button | Binds the click, writes `aria-controls` / `aria-expanded` / `aria-label`; JS un-hides it only while the mobile query matches |
| `data-ds-label-open` | the opener button | Optional override for the "Open menu" label; the closed label is always "Close menu" |
| `data-ds-breakpoint` | the rail | Per-rail breakpoint in px; read by `DS.init()` only (a direct `DS.nav(el)` call passes `{breakpoint}` instead) |
| `data-ds-autofocus` | any focusable inside the rail | First focus target on open; when absent, `Nav()` prefers a focusable `[aria-current="page"]`, then the first focusable |
| `data-ds-nav-keep-open` | an item inside the rail | Exempts that item from the "navigation closes the drawer" rule |
| `data-ds-nav-ready`, `data-ds-nav-mode`, `data-ds-open` | the rail | Module-owned state; never hand-authored |
| `html[data-ds-nav-lock]` | `<html>` | Module-owned scroll lock while open |

**States**

| State | Mark |
|---|---|
| static (≥901, or no JS) | no `data-ds-nav-mode`; rail is the normal sticky column; the toggle stays `hidden`; no scrim and no `.ds-navclose` in the DOM |
| closed (drawer) | rail `[hidden]` + `inert`; toggle `aria-expanded="false"` and "Open menu"; scrim `hidden`; no `html[data-ds-nav-lock]` |
| open (drawer) | rail `[data-ds-open]`, not `hidden`/`inert`; toggle `aria-expanded="true"` and "Close menu"; scrim visible; `html[data-ds-nav-lock]`; close button first in the panel |
| current foot item | `aria-current="page"` → `--ds-ink` + `weight.medium` only; `border-inline-start-color` stays transparent |
| focus-visible | the shared ring on the toggle, the scrim's close control, and every rail item |

**Drawer contract**

| Piece | Contract |
|---|---|
| Toggle | `[data-ds-nav-toggle="<rail-id>"]` + `aria-controls` + `aria-expanded` + `aria-label="Open menu"`, `min 44×44`, `icons.svg#ds-icon-menu`. Ships **`hidden`**; JS reveals it only while the mobile query matches, so a hamburger never appears where it cannot open anything |
| Rail | `data-ds-nav` + a stable `id`; `[data-ds-nav-ready]` and `[data-ds-nav-mode="drawer"]` are JS-owned state attributes |
| Open / closed | open = `[data-ds-open]` + `aria-expanded="true"`; closed = `[hidden]` + `inert` (**not** transform-only) + `aria-expanded="false"` |
| Scrim | `.ds-navscrim`, injected by JS: a real `<button tabindex="-1" aria-label="Close menu">`, `position:fixed`, `--z-overlay`, `--color-engine-overlay-scrim` (`rgba(0,0,0,.9)` — the strongest scrim role, so the exposed strip of page reads as covered, overridable per page with `--_scrim`) |
| Close control | `.ds-navclose`, injected by JS as the drawer's **first child**: a 44×44 `<button type="button" aria-label="Close menu">` with an inline `currentColor` X, styled from `control.height.touch` / `icon.size.md` / `radius.xs`. First stop in the focus trap; removed from the DOM when the rail returns to a static column |
| Scroll lock | `html[data-ds-nav-lock]` → `overflow:hidden` + `scrollbar-gutter:stable` (no sideways shift) |
| Close paths | Escape (unless a menu is open) · scrim click · the drawer's close button · any `a[href]` or `.ds-rail__item` inside the rail (`data-ds-nav-keep-open` opts one out) · a click on the toggle · resize above the breakpoint |
| Focus | opens on `[data-ds-autofocus]`, else the focusable `[aria-current="page"]`, else the first focusable; Tab/Shift+Tab are trapped inside the rail; every close returns focus to the toggle; the background — every sibling along the rail's ancestor chain, including `header` and `footer` — is `inert` while open |
| Stacking | the rail is `z.drawer` (70) and the scrim `z.overlay` (60), so the panel paints above its own scrim and both sit above page chrome (`z.sticky` 40 / `z.bar` 50) |
| Motion | `motion.duration.slow` + `motion.easing.drawer`; `prefers-reduced-motion` zeroes the token in `base.css`, which makes open/close synchronous |

**Keyboard** — the toggle is a real `<button>` with `aria-expanded`; Enter/Space opens. In the open drawer the trap's first stop is the injected `.ds-navclose` (44×44, labelled "Close menu"), then the rail's own items and controls; Tab from the last focusable wraps to the close button, Shift+Tab from the close button wraps to the last, and Tab with focus outside the rail is pulled back in. Escape closes and returns focus to the toggle — but is ignored while a `.ds-menu` is open, so Escape dismisses the menu first. Closed means `[hidden]` **and** `inert`, so the drawer's items are not tab stops and not in the accessibility tree.

**Token map**

| Property | Token |
|---|---|
| Drawer width | `layout.nav.drawer.width` (`min(20rem, 86vw)` — 320px at 390, leaving ~70px of page visible behind the panel; the engine asset drawer keeps its wider `layout.drawer.engine.width`) |
| Foot rhythm | `spacing.sm` (top pad), `layout.rail.inset` (bottom pad, so the foot's border box reaches the viewport edge), `spacing.2` (row gap), `spacing.md` (label offset) |
| Type | `typography.size.meta` (items), `typography.size.eyebrow` + `tracking.eyebrow` (label), `weight.medium` (current) |
| Target | `control.height.touch` (44px) for foot rows and every control in the drawer |
| Stacking | `z.drawer` 70 (rail), `z.overlay` 60 (scrim) |
| Motion | `motion.duration.slow`, `motion.easing.drawer` |

**Dos and don'ts** — DO keep one rail for both modes, DO let the page's ≤900 layout drop the rail's grid cell, DO give the foot a `SURFACES` label so it reads as chrome. DON'T paint the accent bar on a foot item, DON'T add a close button of your own — `DS.nav` injects the panel's 44×44 control as the first child and the scrim behind it, DON'T hide the drawer with `transform` alone (a closed drawer that is still focusable is a tab trap with no escape), and DON'T hand-write `data-ds-nav-mode`, `data-ds-nav-ready` or `data-ds-open` — they are module state.

**Accessibility** — a closed drawer is `display:none` (via `[hidden]`) **and** `inert`, so it is out of the accessibility tree and the tab order; open, it is still the `<nav>` landmark (a drawer is not a dialog, so no `role="dialog"`), Tab is trapped, Escape closes, the background is `inert`, focus returns to the 44×44 toggle whose `aria-label` flips to "Close menu", and crossing the breakpoint upward tears every bit of drawer state down so the static rail is never left inert. The rail keeps its own vertical scroll, so an open drawer never traps page scrolling.

**Gallery** — the specimen matrix below the nav keeps one rhythm: cells at `radius.sm` with `spacing.sm` gaps and `spacing.sm` cell padding, section heads separated by `spacing.lg` block spacing and capped at `layout.max.wiki`; each `#spec-*` block adds its small left pill switcher above the frame and its per-component token code area directly below it. No gallery `.ds-rail` carries a `.ds-rail__foot` — surfaces links live in the hero. On a narrow viewport the under-hero nav collapses to the same `[data-ds-nav-mode="drawer"]` drawer opened from one `[data-ds-nav-toggle]` button; the foot and drawer contract above still holds for page rails.

---

### Copy field {#ds-copy}

**Purpose** — show a value (a token name, a prompt) with a one-tap copy.

**Anatomy** — `.ds-copy` > `code.ds-copy__code` + `.ds-btn[data-size="xs"]` carrying `data-ds-copy`. `DS.copy` writes the clipboard, falls back when `navigator.clipboard` is unavailable, and announces the result.

**Variants**

| Variant | Attribute | What changes |
|---|---|---|
| Default | `.ds-copy` | inline row, `--ds-bg` well, `radius.sm` |

**States** — default · hover (button surface) · focus-visible · copied (announce only — no label swap).

**Token map**

| Property | Token |
|---|---|
| Surface / rule | `--ds-bg`, `--ds-rule`, `--ds-ink` |
| Geometry | `radius.sm`, `spacing.2xs`, `spacing.xs`, `spacing.sm`, `spacing.10` |
| Type | `typography.family.mono`, `typography.size.timecode`, `typography.size.meta` |

**Dos and don'ts** — DO keep the copied value selectable (it is a `<code>`, not an image); DO announce with `DS.announce`. DON'T swap the button text to "Copied" and leave it — it is a transient state with no announcement and no reset.

**Accessibility** — the `<code>` is the readable value; the button has a name ("Copy") and, ideally, `aria-describedby` pointing at the value; the confirmation is a live-region announcement, not a colour change.

**Gallery** — [Copy field frame](index.html#spec-copy) · `#spec-copy`

---

## Proposed — not built {#proposed}

> **Nothing in this appendix ships.** No `.ds-*` block exists for any of these, no page renders one, and the gallery has no frame for them. They are kept because the shape is worth agreeing on *before* someone builds it — not as evidence of current UI.

### Timeline Chips (pro track segments) {#proposed-timeline-chips}

**Status: not built.** No component, no markup, no page usage. The engine's timeline is not in `components.css` and `components.js` explicitly leaves the canvas rig out of scope.

**Purpose (when built)** — colour-coded selectable segments on track lanes: FX, title/graphics, audio.

**Shape to agree on** — rounded bar (`radius.sm`), leading glyph, short label, handles on the active chip; one hue per track type (`color.engine.track.fx` / `.title` / `.audio`), selection edge from `color.engine.selection`; selected state must add handles, not just colour. **Blocked on:** a canvas-side selection model that can express a segment as a focusable element (the open question in the Phase 3 recon, risk 8: 18 focusable chart rects and no role).

### Inspector Pills (floating status overlays) {#proposed-inspector-pills}

**Status: not built.** No page renders an inspector overlay; `patterns.md` marks it proposed too.

**Purpose (when built)** — transient floating status over the canvas (selection length, applied effect + drill-in).

**Shape to agree on** — dark translucent pill on `color.engine.overlay.panel`, optional split with a white active segment + dark drill-in segment, `elevation.popover`, `radius.pill`; overlay-only, never pushing layout; two pills maximum; `role="status"` so it is announced, never the sole carrier of critical state.

### Transport Bar (engine / pro feel) {#proposed-transport-bar}

**Status: not built.** The engine's tool row is a plain `.tools` cluster of buttons (Task 23's `.ds-btn[data-size="xs"]` / `.ds-icon-btn` swap); there is no transport component and no frame-rate readout component.

**Purpose (when built)** — playback and edit-action cluster for canvas and timeline control.

**Shape to agree on** — containerless icon cluster (`color.engine.tool` surface, `color.engine.divider` hover, `color.engine.accent` active edge), frame counter in `typography.size.timecode` with tabular figures, targets never below `touch.min`, every icon button labelled.

---

## Page patterns — spec'd, not shipped {#page-patterns}

> Page-local patterns with **no shipped equivalent**. They stay in the page's own `<style>` until a component exists; the spec here is the contract the page adopts, not a claim that a `.ds-*` class does it.

### Step rail {#pattern-step-rail}

**Status: not built** — there is no `ds-step`, `ds-stepper` or `ds-rail` in `components.css`, and the wiki's 7 `.step` buttons are page-local (16.8px/700 today; `typography.size.body`/`weight.semibold` is the target). Adopting `.ds-nav-item[data-variant="dot"]` for the visual and keeping the click handler local is the cheap path; a real component needs a progress model the wiki does not have yet. **Contract either way:** `aria-current="step"` on the active step, `touch.min` targets, and no colour-only active state. Task 21 owns the page change.

### Footer {#pattern-footer}

**Status: not built** — the engine has no `<footer>` (0 today), the wiki has one, pitch and the gallery have their own. **Contract:** one `<footer>` per page, hairline `border-block-start` in `--ds-rule`, one `typography.size.meta` line in `--ds-muted`, no navigation invented that the page does not have. Task 23 adds the engine's; no component is warranted for a three-line block.

### File picker {#pattern-file-picker}

**Status: not built as a widget** — the pattern is a visually hidden `<input type="file">` plus a visible `.ds-btn` trigger. **Contract:** the input keeps its native semantics (never `display:none` from the a11y tree in a way that breaks label association), and when it is hidden at `x=-9999` it must carry `tabindex="-1"` + `aria-hidden="true"` so it is not a 40px-tall off-screen tab stop (the engine's two inputs are exactly that today — the measured `label` criticals). The trigger is a real button with a name; the chosen filename is announced. Task 23 owns both engine inputs.

---

## Cross-references

- Values and scales: [foundations.md](foundations.md) — generated, never hand-edited.
- Composition patterns (shells, reading layouts, rails): [patterns.md](patterns.md).
- Gate classes and their budgets (V/T for pages and tokens, C1–C6 for this layer): [audit-report.md](audit-report.md) — generated by `node scripts/lint-tokens.mjs`.
- Enforcement: `node scripts/lint-tokens.mjs --check` must pass before a component change lands; C1–C6 are the classes that keep this file from drifting away from `components.css`.
