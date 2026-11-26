# Deprecations — token retirement log

Every token that leaves the contract is recorded here: what it was, what replaced it, and when the name stops resolving. The gate is the enforcement (a `var()` naming a retired key is a U1 failure), this file is the memory. Policy from `audit/2026-11-24/docs.md:88`: **deprecate one release, remove the next** — no exemption may keep a deprecated token alive.

## Retired by the navigation rewrite (2026-11-25)

The four-lane rail/pill rewrite removed the three layouts that sized themselves from these keys. Each was measured with a case-sensitive grep across `index.html`, `pitch.html`, `engine.html`, `design-system/{base,components,pitch-shell,gallery-pitch}.css`, `engine-pitch.css`, the theme maps and every gallery swatch row before deletion: zero `var()`, zero `eval()`-style `CT('--…')` / `WA('--…')` lookup, zero alias value, zero gallery specimen. The token set went 191 → 188 keys (20 groups unchanged).

| Key | Was | Reason it stopped resolving |
|---|---|---|
| `layout.sidebar.wiki` | `230px` | `index.html` no longer has the `.main` two-column grid; the wiki surface takes `layout.rail` (208px) from `components.css`. Nothing else ever sized from it. |
| `layout.sidebar.pitch` | `220px` | `pitch.html` replaced the centred `.w`/`.layout` shell (and its floating mobile rail) with the shared rail; the 220px column has no owner. |
| `spacing.section` | `26px` | Raised by the same measurement rather than the rewrite: the retired fixed bottom step bar and the 18px underline rhythm were its last plausible callers, and no surface, component sheet, engine-pitch sheet or gallery row named it. |

`layout.sidebar.engine`, `spacing.18` and `z.bar` were reported as retired by the same lane and are **not**: `engine.html` still consumes all three (the drawer's `.pm-nav` rail, the drawer's 18px gutters, and `#arrowpick`'s z-index). `elevation.float` is left in place because the gallery's elevation ladder (`design-system/index.html:634`) still renders it as a specimen — retiring it moves gallery pixels, so it waits for Phase 3 with the other gallery-only keys.

## Retired by the pinned surface switcher (2026-11-25)

The shared rail/drawer wave replaced engine's 62px mobile status strip with the off-canvas drawer, which was `layout.bar.engine`'s **last** consumer. Measured with a case-sensitive grep across every HTML page, `design-system/*.css`, `engine-pitch.css`, `components.js` (`CT('--…')` / `WA('--…')`), the theme maps, `scripts/*.mjs` and the docs: zero `var()`, zero string lookup, zero alias value. `layout.sidebar.engine`, `spacing.18` and `z.bar` survive on the consumers named above; `dot.size` stays until the dot block itself is deleted (see the component-shape table).

| Key | Was | Reason it stopped resolving | Replaced by |
|---|---|---|---|
| `layout.bar.engine` | `62px` | `engine.html`'s fixed mobile status strip is gone — the shared `[data-ds-nav-mode="drawer"]` rail is the mobile chrome now, so nothing sizes from a page-local bar height | nothing (the drawer's own keys: `layout.nav.drawer.width`, `z.drawer`, `z.overlay`) |

The same wave added `layout.nav.drawer.width` (`min(20rem, 86vw)`) for the drawer panel, so the token set holds at **188 keys / 20 groups** with one different key. `scripts/build-tokens.mjs` (`EXPECTED_LEAVES`) and `scripts/build-foundations.mjs` were updated in the same commit.

## Alias tier still live (one release)

These six keys keep their names for one release; their values are pointers, so a consumer that still names them resolves through the target. `focus.color` is not an alias in this sense — it is the role pointer the re-pointed focus rings consume.

| Key | Value | Retires |
|---|---|---|
| `color.wiki.light.card` | `var(--color-primitive-white)` | the release after Phase 1 |
| `color.wiki.light.amber` | `var(--color-status-warning)` | the release after Phase 1 |
| `color.pro.tool.hover` | `var(--color-engine-divider)` | the release after Phase 1 |
| `spacing.base` | `var(--spacing-2xs)` | the release after Phase 1 |
| `spacing.gutter.pro` | `var(--spacing-md)` | the release after Phase 1 |
| `color.print.ink` | `var(--color-engine-accent-ink)` | the release after Phase 1 |
| `focus.color` | `var(--ds-accent)` | the release after Phase 1 |

## Retired in the 186-token contract (Phase 1 Task 9)

**44 deprecated `var()` aliases** — every one pointed at a kept key, so deleting the name changed no value:

- `color.pro.surface.0` → `var(--color-engine-surface-0)`
- `color.pro.surface.1` → `var(--color-engine-surface-1)`
- `color.pro.surface.2` → `var(--color-engine-surface-2)`
- `color.pro.surface.deep` → `var(--color-engine-surface-deep)`
- `color.pro.canvas` → `var(--color-engine-canvas)`
- `color.pro.text.primary` → `var(--color-engine-text-primary)`
- `color.pro.text.secondary` → `var(--color-engine-text-secondary)`
- `color.pro.tool` → `var(--color-engine-tool)`
- `color.pro.divider` → `var(--color-engine-divider)`
- `color.pro.divider.strong` → `var(--color-engine-divider-strong)`
- `color.pro.selection` → `var(--color-engine-selection)`
- `color.pro.track.fx` → `var(--color-engine-track-fx)`
- `color.pro.track.title` → `var(--color-engine-track-title)`
- `color.pro.track.audio` → `var(--color-engine-track-audio)`
- `color.pro.overlay.scrim` → `var(--color-engine-overlay-scrim)`
- `color.pro.overlay.panel` → `var(--color-engine-overlay-panel)`
- `color.semantic.success` → `var(--color-status-success)`
- `color.semantic.danger` → `var(--color-status-danger)`
- `color.semantic.warning` → `var(--color-status-warning)`
- `color.semantic.info` → `var(--color-status-info)`
- `typography.size.h1.pitch` → `var(--typography-size-display)`
- `typography.size.h1.wiki` → `var(--typography-size-h1)`
- `typography.size.h2.pitch` → `var(--typography-size-h2)`
- `typography.size.h2.wiki` → `var(--typography-size-h3)`
- `typography.weight.regular` → `var(--weight-regular)`
- `typography.weight.medium` → `var(--weight-medium)`
- `typography.weight.semibold` → `var(--weight-semibold)`
- `typography.weight.bold` → `var(--weight-bold)`
- `typography.lineheight.body` → `var(--line-height-reading)`
- `typography.lineheight.pitch.h1` → `var(--line-height-display)`
- `typography.tracking.tight` → `var(--tracking-tight)`
- `typography.tracking.eyebrow` → `var(--tracking-eyebrow)`
- `opacity.overlay.thumb` → `var(--opacity-media)`
- `layout.drawer.width` → `var(--layout-drawer-engine-width)`
- `breakpoint.sidenav` → `var(--breakpoint-xl)`
- `breakpoint.grid.collapse` → `var(--breakpoint-md)`
- `breakpoint.table.stack` → `var(--breakpoint-sm)`
- `color.wiki.diagram.fill` → `var(--color-diagram-fill-wiki)`
- `color.wiki.scrim.thumb` → `var(--color-diagram-scrim-wiki)`
- `color.neutral.white` → `var(--color-primitive-white)`
- `color.neutral.black` → `var(--color-primitive-black)`
- `layout.bar.transport` → `var(--layout-bar-engine)`
- `elevation.ring.accent` → `var(--elevation-ring)`
- `elevation.inset.accent` → `var(--elevation-inset)`

**48 engine decoys** — values from the #0E1116/#161B22 palette no page renders; 0 product `var()` refs. Two names were re-used by the real palette and stayed live with the real value: `color.engine.tool` (`#1C1C1E`) and `color.engine.overlay.panel` (`rgba(30,30,34,.94)`).

- `color.engine.bg` = `#0E1116`
- `color.engine.panel` = `#161B22`
- `color.engine.panel.deep` = `#0B0E13`
- `color.engine.ink` = `#E8EAF0`
- `color.engine.muted` = `#8B93A5`
- `color.engine.muted.2` = `#AAB2C2`
- `color.engine.code` = `#C8CFDB`
- `color.engine.tool.hover` = `#1D2530`
- `color.engine.border` = `#262D38`
- `color.engine.border.strong` = `#313B4A`
- `color.engine.teal` = `#0F766E`
- `color.engine.teal.bright` = `#5EEAD4`
- `color.engine.canvas.bg` = `#1A2130`
- `color.engine.graph.title` = `#1B2230`
- `color.engine.graph.node.top` = `#1C2432`
- `color.engine.graph.node.bottom` = `#0D1117`
- `color.engine.graph.edge` = `#9AA3B5`
- `color.engine.graph.label` = `#C7CEDB`
- `color.engine.graph.arc` = `#7C3AED`
- `color.engine.graph.handle` = `#2A3342`
- `color.engine.switch.track` = `#2A3340`
- `color.engine.switch.border` = `#3A4554`
- `color.engine.code.punct` = `#4B5563`
- `color.engine.code.hover` = `#1B212B`
- `color.engine.input.focus` = `#1E2632`
- `color.engine.input.edge` = `#B45309`
- `color.engine.row` = `#0F141B`
- `color.engine.panel.project` = `#10151C`
- `color.engine.panel.codes` = `#0D1218`
- `color.engine.placeholder` = `#5B6577`
- `color.engine.highlight` = `#FBBF24`
- `color.engine.wash.6` = `rgba(232,234,240,.06)`
- `color.engine.wash.10` = `rgba(232,234,240,.10)`
- `color.engine.wash.12` = `rgba(232,234,240,.12)`
- `color.engine.wash.14` = `rgba(232,234,240,.14)`
- `color.engine.wash.16` = `rgba(232,234,240,.16)`
- `color.engine.accent.wash.10` = `rgba(232,131,12,.10)`
- `color.engine.accent.wash.12` = `rgba(232,131,12,.12)`
- `color.engine.accent.wash.14` = `rgba(232,131,12,.14)`
- `color.engine.accent.wash.18` = `rgba(232,131,12,.18)`
- `color.engine.accent.wash.35` = `rgba(232,131,12,.35)`
- `color.engine.accent.wash.50` = `rgba(232,131,12,.50)`
- `color.engine.overlay.72` = `rgba(10,13,18,.72)`
- `color.engine.overlay.90` = `rgba(10,13,18,.9)`
- `color.engine.overlay.panel.94` = `rgba(22,27,34,.94)`
- `color.engine.overlay.panel.97` = `rgba(22,27,34,.97)`
- `color.engine.overlay.82` = `rgba(10,13,18,.82)`
- `color.engine.overlay.88` = `rgba(10,13,18,.88)`

**14 dead keys** — 0 product refs and no replacement; a consumer that needs the effect uses the noted token or a literal.

- `color.pitch.overlay.scrim` = `#00000073`
- `elevation.0` = `none`
- `motion.easing.sheet` = `cubic-bezier(0.16, 1, 0.3, 1)`
- `opacity.scrim` = `0.45`
- `touch.pro` = `48px`
- `touch.handle.timeline` = `32px`
- `breakpoint.tablet` = `720px`
- `touch.small` = `28px`
- `touch.field` = `38px`
- `layout.sheet.grab.width` = `44px`
- `layout.sheet.grab.height` = `5px`
- `radius.card` = `12px`
- `radius.xl` = `18px`
- `color.pitch.scrim.soft` = `rgba(0,0,0,.5)`

## Component shapes deprecated (one release, no token removed)

The navigation grammar (rails are flat, parent tabs are the underline shape with pill as secondary/in-panel only, buttons keep their geometry) retires four *shapes*, not names. Each still renders in `components.css`, annotated `LEGACY`/`DEPRECATED` in place, because pages still consume it this wave; a later lane migrates the call sites and only then deletes the block (and, for the dot, `dot.size` with it). The boxed bare `.ds-tabs` rendering (no attribute) is the superseded parent shape — the underline variant is the live parent, not a deprecation.

| Shape | Where it lives | Replaced by | Retires |
|---|---|---|---|
| `.ds-nav-item[data-variant="dot"]` | `components.css` §18 | the flat rail item's inline-start accent bar — `class="ds-nav-item ds-rail__item"` | the release after this wave |
| `.ds-tabs` (no attribute — boxed bare parent) | `components.css` §5 | `.ds-tabs[data-variant="underline"]` for parent tabs; pill stays secondary/in-panel only | the release after this wave |
| `.ds-tabs[data-variant="rail"]` (standalone) | `components.css` §5 | a standalone rail tablist → `.ds-tabs[data-variant="underline"]` for parent tabs, `.ds-rail` for a section nav; a `rail` tablist stacked inside a dialog or panel stays live there | standalone use retires the release after this wave |
| `.ds-tabs.ds-tabsub__nav` (nested sub-tablist) | `components.css` §5 | the bare vertical sub-tablist (`role="tablist"` + `aria-orientation="vertical"` inside `.ds-tabsub`, one flat left sub-nav per main panel with an `aria-selected` / `hidden` pairing at sub level) → the in-panel `.ds-rail` section nav: plain links with `href` + `aria-current` in the same `.ds-tabsub` left cell, no sub-level tab semantics | nested sub-tablist use retires the release after this wave; the in-panel rail is the composed hierarchy's live sub shape |

## Page shapes retired with the rail foot + mobile menu (no token removed, 2026-11-25)

`index.html` was the only surface that turned the rail into a horizontal pill strip under the header (`@media(max-width:900px)` rules for `.rail-list`, `.rail-field`, `.rail-count` and `.ds-rail__item`). Those page-local rules are deleted: the same rail is the off-canvas menu now (`.ds-rail[data-ds-nav-mode="drawer"]`, `components.css` §21), reached from one `[data-ds-nav-toggle]` button, and no `.ds-*` block was retired to make that happen. The wiki's header cross-links (`pitch →`, `engine →`, `design system →`) moved out of `.hright` into the rail's `.ds-rail__foot`; the `.eng` / `.pitch` header-button rules and their `pointer:coarse` expansion went with them. Both are page CSS, not contract — recorded here only so a later lane does not reintroduce a second mobile nav shape.

## Gallery shell shapes retired (no token removed, 2026-11-26)

The gallery's own chrome followed the navigation grammar this wave: three page-local shapes retired, no `.ds-*` block added or removed to make that happen. Spacing throughout is token-named (`spacing.*`, `layout.*`, `radius.*`, `border.width.*`); no raw step ships in the contract.

| Shape | Was | Replaced by |
|---|---|---|
| Pill top strip (`#ds-cats` as `.ds-tabs[data-variant="pill"]`) | the gallery's category row rendered as the secondary pill shape | the live parent shape — `#ds-cats` as `.ds-tabs[data-variant="underline"]`: one horizontal row on the content axis, left-aligned, `spacing.md` gap, `border-width.hairline` `--ds-rule` block-end rule, scrolling under overflow instead of wrapping |
| Left-column gallery nav | the section list sat in a rail cell beside the content | the section nav sits under the hero blurb on the content axis: one flat `.ds-rail` group beneath the masthead lede, items at `control.height.*` via `--_ctl-h`, `spacing.md` text-axis offset, `spacing.2` row rhythm; narrow viewports collapse it to the `[data-ds-nav-mode="drawer"]` drawer |
| Cramped specimen matrix | theme cells and section heads with ad-hoc gaps | one rhythm: cells at `radius.sm` with `spacing.sm` gaps and `spacing.sm` cell padding, section heads separated by `spacing.lg` block spacing, capped at `layout.max.wiki` |

## Renames that preceded this list

The 44 renames (16 `color.pro.*` → `color.engine.*`, 28 role/type/scale names) shipped in the Phase 1A stages before this retirement; each old name survived as a `var()` alias and is deleted above, which is why the alias tier is empty apart from the six keys in the first table.
