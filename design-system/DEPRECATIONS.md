# Deprecations — token retirement log

Every token that leaves the contract is recorded here: what it was, what replaced it, and when the name stops resolving. The gate is the enforcement (a `var()` naming a retired key is a U1 failure), this file is the memory. Policy from `audit/2026-11-24/docs.md:88`: **deprecate one release, remove the next** — no exemption may keep a deprecated token alive.

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

## Renames that preceded this list

The 44 renames (16 `color.pro.*` → `color.engine.*`, 28 role/type/scale names) shipped in the Phase 1A stages before this retirement; each old name survived as a `var()` alias and is deleted above, which is why the alias tier is empty apart from the six keys in the first table.
