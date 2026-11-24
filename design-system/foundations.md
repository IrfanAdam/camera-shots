# Foundations

> GENERATED — do not hand-edit · regenerate: `node scripts/build-foundations.mjs`

Consumer counts are pinned to the committed `HEAD` blobs of the consumer files — the three product pages, the gallery, and `components.css` for the T8 view — never the dirty worktree, so a page mid-edit cannot drift this file. **Commit page changes before regenerating.** Token values still come from the worktree files, so a `tokens.json` edit regenerates here before it is committed.

The token set as shipped: **189 keys · 20 groups**, rendered into `design-system/tokens.css` with **4 theme maps** behind the `data-ds-theme` attribute, **14 role slots** expanding to **17 role vars**.

Read order: [README](README.md) → this file → [components](components.md) → [patterns](patterns.md). Values are read from `design-system/tokens.json`; the theme and type sections are asserted against `design-system/tokens.css` before this file is written, so a stale sheet fails the generator instead of being documented.

## How to read the tables

| Column | Meaning |
|---|---|
| Key | Dotted token name in `tokens.json`. The emitted custom property is the same path lowercased with `.` → `-`, e.g. `color.pitch.bg` → `--color-pitch-bg`. |
| Value | The literal the generator emits into `:root`. A `var(--…)` value is a one-release alias: it resolves through its target. |
| Type | The declared token type the generator validates the value against. |
| Role | The theme slot(s) whose map cell points at this key — the semantic job it does. `—` means no theme names it. A trailing `alias → --target` marks a pointer. |
| Consumers | Occurrence count, defined below. Zero is printed as `0`, not hidden. |

**Consumer count** = product-page references + theme-map cells + gallery swatches:

1. **Product** — occurrences of `var(--k)` in `index.html`, `pitch.html` and `engine.html`, plus the canvas string lookups `CT('--k')` / `WA('--k', …)` in those files. A `var()` scan cannot see a string argument, so both forms count.
2. **Theme** — one per theme-map cell in `tokens.json` whose value is `var(--k)`. The role contract is why a primitive exists even when no page names it directly.
3. **Gallery** — one per `.sw` swatch row in `design-system/index.html` naming `--k`. The gallery proves a token renders; it is not product usage.

**Source:** the consumer files are read as committed at `HEAD` (`git show HEAD:<path>`), so an uncommitted page or component edit cannot move these numbers — commit the change, then regenerate. `tokens.json` and `tokens.css` are read from disk, so a token edit is reflected before it is committed. When git is unavailable (an exported tree, e.g. `git archive`) or a consumer file is untracked, that file is read from disk instead.

It is a **count of occurrences**, not the gate's T8 presence test: T8 asks only whether a product page, a theme cell or `components.css` names a token at all, and excludes the gallery. So a key can be T8-unconsumed and still show a non-zero count here — read the breakdown the gate prints, not this column, when judging orphans.

Totals at committed HEAD: **1485 consumer references** across 189 keys, **19** key(s) with none (`breakpoint.lg`, `breakpoint.md`, `breakpoint.sm`, `breakpoint.xl`, `breakpoint.xs`, `color.status.danger.ink.light`, `color.wiki.dark.accent.ink`, `elevation.1`, `elevation.inset`, `elevation.ring`, `focus.color`, `icon.size.lg`, `icon.size.md`, `opacity.disabled`, `radius.lg`, `spacing.base`, `spacing.gutter.pro`, `spacing.section`, `tracking.label`).

Under the gate's narrower **T8** scope — `var()` in the three product pages plus theme-map cells plus `components.css`, gallery excluded, aliases and `breakpoint.*` exempt — **10** key(s) are unconsumed: `color.engine.track.audio`, `color.engine.track.fx`, `color.engine.track.title`, `elevation.inset`, `elevation.ring`, `icon.size.lg`, `icon.size.md`, `radius.lg`, `spacing.section`, `tracking.label`. Keys that differ between the two views are canvas-only (`CT()`/`WA()` strings the gate cannot see) or gallery-only consumers; `scripts/lint-tokens.mjs` prints the authoritative list and its budget note.

## Theme contract

Themes are selected by `data-ds-theme` on a root element. Each map declares all 14 slots; where a surface has no value the cell is an explicit `null` and the shared `[data-ds-theme]` fall-through block supplies one, so a switch never leaves a role undefined.

| Theme | Non-null cells | Null slots |
|---|---|---|
| `pitch` | 15 of 17 vars | `bg.accent.soft`, `line.strong` |
| `wiki-light` | 12 of 17 vars | `bg.surface.alt`, `bg.control`, `fg.secondary`, `fg.faint`, `line.strong` |
| `wiki-dark` | 12 of 17 vars | `bg.surface.alt`, `bg.control`, `fg.secondary`, `fg.faint`, `line.strong` |
| `engine` | 14 of 17 vars | `bg.accent.soft`, `fg.secondary`, `fg.faint` |

Null cells per map: pitch 2 · wiki-light 5 · wiki-dark 5 · engine 3. Fall-through `[data-ds-theme]`: `--ds-accent-soft → transparent` · `--ds-control → var(--ds-surface)` · `--ds-surface-alt → var(--ds-surface)` · `--ds-faint → var(--ds-muted)` · `--ds-ink-2 → var(--ds-muted)` · `--ds-rule-strong → var(--ds-rule)`.

| Slot | Role var | Null in |
|---|---|---|
| `bg.page` | `--ds-bg` | — |
| `bg.surface` | `--ds-surface` | — |
| `bg.surface.alt` | `--ds-surface-alt` | `wiki-light`, `wiki-dark` |
| `bg.control` | `--ds-control` | `wiki-light`, `wiki-dark` |
| `bg.accent.soft` | `--ds-accent-soft` | `pitch`, `engine` |
| `fg.primary` | `--ds-ink` | — |
| `fg.secondary` | `--ds-ink-2` | `wiki-light`, `wiki-dark`, `engine` |
| `fg.muted` | `--ds-muted` | — |
| `fg.faint` | `--ds-faint` | `wiki-light`, `wiki-dark`, `engine` |
| `fg.on.accent` | `--ds-on-accent` | — |
| `line.default` | `--ds-rule` | — |
| `line.strong` | `--ds-rule-strong` | `pitch`, `wiki-light`, `wiki-dark` |
| `accent` | `--ds-accent` | — |
| `status` | `--ds-success` `--ds-warning` `--ds-danger` `--ds-info` | — |

### What flips per theme

| Role var | `pitch` | `wiki-light` | `wiki-dark` | `engine` |
|---|---|---|---|---|
| `--ds-bg` | `var(--color-pitch-bg)` | `var(--color-wiki-light-bg)` | `var(--color-wiki-dark-bg)` | `var(--color-engine-surface-0)` |
| `--ds-surface` | `var(--color-pitch-surface-1)` | `var(--color-wiki-light-card)` | `var(--color-wiki-dark-card)` | `var(--color-engine-surface-1)` |
| `--ds-surface-alt` | `var(--color-pitch-surface-2)` | null → fall-through | null → fall-through | `var(--color-engine-surface-2)` |
| `--ds-control` | `var(--color-pitch-switch-bg)` | null → fall-through | null → fall-through | `var(--color-engine-tool)` |
| `--ds-accent-soft` | null → fall-through | `var(--color-wiki-light-accent-wash)` | `var(--color-wiki-dark-accent-wash)` | null → fall-through |
| `--ds-ink` | `var(--color-pitch-ink)` | `var(--color-wiki-light-ink)` | `var(--color-wiki-dark-ink)` | `var(--color-engine-text-primary)` |
| `--ds-ink-2` | `var(--color-pitch-body)` | null → fall-through | null → fall-through | null → fall-through |
| `--ds-muted` | `var(--color-pitch-muted)` | `var(--color-wiki-light-muted)` | `var(--color-wiki-dark-muted)` | `var(--color-engine-text-secondary)` |
| `--ds-faint` | `var(--color-pitch-muted-2)` | null → fall-through | null → fall-through | null → fall-through |
| `--ds-on-accent` | `var(--color-pitch-accent-ink)` | `var(--color-primitive-white)` | `var(--color-wiki-dark-bg)` | `var(--color-engine-accent-ink)` |
| `--ds-rule` | `var(--color-pitch-rule)` | `var(--color-wiki-light-rule)` | `var(--color-wiki-dark-rule)` | `var(--color-engine-divider)` |
| `--ds-rule-strong` | null → fall-through | null → fall-through | null → fall-through | `var(--color-engine-divider-strong)` |
| `--ds-accent` | `var(--color-pitch-accent)` | `var(--color-wiki-light-accent)` | `var(--color-wiki-dark-accent)` | `var(--color-engine-accent)` |
| `--ds-success` | `var(--color-pitch-positive)` | `var(--color-status-success)` | `var(--color-pitch-positive)` | `var(--color-pitch-positive)` |
| `--ds-warning` | `var(--color-status-warning)` | `var(--color-status-warning)` | `var(--color-wiki-dark-amber)` | `var(--color-wiki-dark-amber)` |
| `--ds-danger` | `var(--color-status-danger)` | `var(--color-status-danger)` | `var(--color-status-danger)` | `var(--color-status-danger)` |
| `--ds-info` | `var(--color-status-info)` | `var(--color-status-info)` | `var(--color-status-info)` | `var(--color-status-info)` |

The four maps are independent palettes: the same role carries a different primitive per surface (champagne for pitch, teal for wiki, warm signal for engine). Unifying a hue is a map-value change, never a page override.

## Type scale

| Size key | Value | Computed | Line-height |
|---|---|---|---|
| `typography.size.display` | `clamp(2rem, 5vw, 3.1rem)` | clamp / viewport-relative | `line-height.display` `1.08` |
| `typography.size.h1` | `1.6rem` | `25.6px` | `line-height.tight` `1.25` |
| `typography.size.h2` | `1.35rem` | `21.6px` | `line-height.tight` `1.25` |
| `typography.size.h3` | `1.25rem` | `20px` | `line-height.tight` `1.25` |
| `typography.size.lede` | `1.05rem` | `16.8px` | `line-height.relaxed` `1.6` |
| `typography.size.ui` | `1rem` | `16px` | `line-height.normal` `1.5` |
| `typography.size.body` | `0.95rem` | `15.2px` | `line-height.relaxed` `1.6` |
| `typography.size.small` | `0.85rem` | `13.6px` | `line-height.normal` `1.5` |
| `typography.size.meta` | `0.8rem` | `12.8px` | `line-height.normal` `1.5` |
| `typography.size.eyebrow` | `0.72rem` | `11.52px` | `line-height.normal` `1.5` |
| `typography.size.timecode` | `0.75rem` | `12px` | `line-height.normal` `1.5` |

`line-height.reading` (1.7) is the long-form body pairing on `pitch.html`; `line-height.relaxed` is the default body. Two families, no display face: hierarchy is size, weight and tracking only.

Weights: `weight.regular` `400` · `weight.medium` `600` · `weight.semibold` `650` · `weight.bold` `700` · `weight.heavy` `800`.
Tracking: `tracking.eyebrow` `0.16em` · `tracking.label` `0.05em` · `tracking.snug` `-0.01em` · `tracking.tight` `-0.02em`.

## Groups

| Group | Keys | With a consumer | Zero-consumer keys |
|---|---|---|---|
| `border` | 3 | 3 | 0 |
| `breakpoint` | 5 | 0 | 5 |
| `color` | 70 | 68 | 2 |
| `control` | 4 | 4 | 0 |
| `dot` | 1 | 1 | 0 |
| `elevation` | 6 | 3 | 3 |
| `focus` | 3 | 2 | 1 |
| `hover` | 1 | 1 | 0 |
| `icon` | 3 | 1 | 2 |
| `layout` | 8 | 8 | 0 |
| `line-height` | 5 | 5 | 0 |
| `motion` | 14 | 14 | 0 |
| `opacity` | 2 | 1 | 1 |
| `radius` | 7 | 6 | 1 |
| `spacing` | 16 | 13 | 3 |
| `touch` | 2 | 2 | 0 |
| `tracking` | 4 | 3 | 1 |
| `typography` | 13 | 13 | 0 |
| `weight` | 5 | 5 | 0 |
| `z` | 17 | 17 | 0 |
| **total** | **189** | **170** | **19** |

### border

3 keys.

| Key | Value | Type | Role | Consumers |
|---|---|---|---|---|
| `border.width.accent` | `3px` | dimension | — | 1 (1/0/0) |
| `border.width.hairline` | `1px` | dimension | — | 116 (116/0/0) |
| `border.width.strong` | `2px` | dimension | — | 10 (10/0/0) |

### breakpoint

5 keys.

| Key | Value | Type | Role | Consumers |
|---|---|---|---|---|
| `breakpoint.lg` | `900px` | dimension | — | 0 (0/0/0) |
| `breakpoint.md` | `767.5px` | dimension | — | 0 (0/0/0) |
| `breakpoint.sm` | `639px` | dimension | — | 0 (0/0/0) |
| `breakpoint.xl` | `1023.5px` | dimension | — | 0 (0/0/0) |
| `breakpoint.xs` | `390px` | dimension | — | 0 (0/0/0) |

### color

70 keys.

| Key | Value | Type | Role | Consumers |
|---|---|---|---|---|
| `color.diagram.fill.wiki` | `#9FC3D8` | color | — | 5 (4/0/1) |
| `color.diagram.scrim.wiki` | `#101828` | color | — | 2 (1/0/1) |
| `color.engine.accent` | `#E8830C` | color | accent | 3 (1/1/1) |
| `color.engine.accent.ink` | `#111111` | color | fg.on.accent | 6 (4/1/1) |
| `color.engine.canvas` | `#08080A` | color | — | 1 (1/0/0) |
| `color.engine.divider` | `#2C2C2E` | color | line.default | 4 (2/1/1) |
| `color.engine.divider.strong` | `#3A3A3C` | color | line.strong | 5 (4/1/0) |
| `color.engine.overlay.panel` | `rgba(30,30,34,.94)` | color | — | 4 (3/0/1) |
| `color.engine.overlay.scrim` | `rgba(0,0,0,.9)` | color | — | 7 (7/0/0) |
| `color.engine.scrim` | `rgba(0,0,0,.45)` | color | — | 3 (2/0/1) |
| `color.engine.scrim.strong` | `rgba(0,0,0,.55)` | color | — | 2 (1/0/1) |
| `color.engine.selection` | `#FFD60A` | color | — | 9 (8/0/1) |
| `color.engine.surface.0` | `#0B0B0D` | color | bg.page | 10 (8/1/1) |
| `color.engine.surface.1` | `#1E1E22` | color | bg.surface | 8 (6/1/1) |
| `color.engine.surface.2` | `#2A2A2E` | color | bg.surface.alt | 14 (12/1/1) |
| `color.engine.surface.deep` | `#0C0C0C` | color | — | 2 (2/0/0) |
| `color.engine.text.primary` | `#F5F5F7` | color | fg.primary | 22 (20/1/1) |
| `color.engine.text.secondary` | `#9A9AA0` | color | fg.muted | 37 (35/1/1) |
| `color.engine.tool` | `#1C1C1E` | color | bg.control | 7 (5/1/1) |
| `color.engine.track.audio` | `#32ADE6` | color | — | 1 (0/0/1) |
| `color.engine.track.fx` | `#5E5CE6` | color | — | 2 (1/0/1) |
| `color.engine.track.title` | `#30D158` | color | — | 2 (1/0/1) |
| `color.engine.wash.25` | `rgba(255,255,255,.25)` | color | — | 4 (3/0/1) |
| `color.pitch.accent` | `#C8B28A` | color | accent | 8 (6/1/1) |
| `color.pitch.accent.ink` | `#141310` | color | fg.on.accent | 4 (2/1/1) |
| `color.pitch.bg` | `#0A0A0B` | color | bg.page | 6 (4/1/1) |
| `color.pitch.body` | `#D9D7D2` | color | fg.secondary | 4 (2/1/1) |
| `color.pitch.ink` | `#F2F0EB` | color | fg.primary | 5 (3/1/1) |
| `color.pitch.muted` | `#A7A5A0` | color | fg.muted | 6 (4/1/1) |
| `color.pitch.muted.2` | `#8E8C86` | color | fg.faint | 4 (2/1/1) |
| `color.pitch.overlay.bg` | `rgba(10,10,11,.92)` | color | — | 3 (2/0/1) |
| `color.pitch.overlay.surface` | `rgba(20,20,22,.92)` | color | — | 2 (1/0/1) |
| `color.pitch.positive` | `#10B981` | color | status.success | 8 (4/3/1) |
| `color.pitch.positive.ink` | `#06110C` | color | — | 2 (1/0/1) |
| `color.pitch.rule` | `#26262B` | color | line.default | 5 (3/1/1) |
| `color.pitch.scrim.mid` | `rgba(0,0,0,.6)` | color | — | 2 (1/0/1) |
| `color.pitch.surface.1` | `#141416` | color | bg.surface | 4 (2/1/1) |
| `color.pitch.surface.2` | `#1B1B1E` | color | bg.surface.alt | 4 (2/1/1) |
| `color.pitch.switch.bg` | `#101012` | color | bg.control | 3 (1/1/1) |
| `color.primitive.black` | `#000000` | color | — | 8 (7/0/1) |
| `color.primitive.white` | `#FFFFFF` | color | fg.on.accent | 26 (24/1/1) |
| `color.print.accent` | `#8A6D2B` | color | — | 2 (1/0/1) |
| `color.print.body` | `#333333` | color | — | 2 (1/0/1) |
| `color.print.fine` | `#222222` | color | — | 2 (1/0/1) |
| `color.print.ink` | `var(--color-engine-accent-ink)` | color | — · alias → --color-engine-accent-ink | 2 (1/0/1) |
| `color.print.rule` | `#DDDDDD` | color | — | 2 (1/0/1) |
| `color.pro.tool.hover` | `var(--color-engine-divider)` | color | — · alias → --color-engine-divider | 1 (1/0/0) |
| `color.status.danger` | `#E5484D` | color | status.danger | 6 (1/4/1) |
| `color.status.danger.ink.dark` | `#EA6C70` | color | — | 1 (1/0/0) |
| `color.status.danger.ink.light` | `#C93F43` | color | — | 0 (0/0/0) |
| `color.status.info` | `#8A5CF6` | color | status.info | 6 (1/4/1) |
| `color.status.success` | `#2E7D46` | color | status.success | 3 (1/1/1) |
| `color.status.warning` | `#B86A00` | color | status.warning | 3 (0/2/1) |
| `color.wiki.dark.accent` | `#5CC4D0` | color | accent | 2 (0/1/1) |
| `color.wiki.dark.accent.ink` | `var(--color-wiki-dark-bg)` | color | — · alias → --color-wiki-dark-bg | 0 (0/0/0) |
| `color.wiki.dark.accent.wash` | `#12383D` | color | bg.accent.soft | 2 (0/1/1) |
| `color.wiki.dark.amber` | `#F0A648` | color | status.warning | 3 (0/2/1) |
| `color.wiki.dark.bg` | `#0E1213` | color | bg.page, fg.on.accent | 3 (0/2/1) |
| `color.wiki.dark.card` | `#151B1C` | color | bg.surface | 2 (0/1/1) |
| `color.wiki.dark.ink` | `#ECF1F1` | color | fg.primary | 2 (0/1/1) |
| `color.wiki.dark.muted` | `#9DAAAB` | color | fg.muted | 2 (0/1/1) |
| `color.wiki.dark.rule` | `#243032` | color | line.default | 2 (0/1/1) |
| `color.wiki.light.accent` | `#0B5D66` | color | accent | 2 (0/1/1) |
| `color.wiki.light.accent.wash` | `#DDEFF1` | color | bg.accent.soft | 2 (0/1/1) |
| `color.wiki.light.amber` | `#A76000` | color | — | 7 (6/0/1) |
| `color.wiki.light.bg` | `#F8F8F4` | color | bg.page | 2 (0/1/1) |
| `color.wiki.light.card` | `var(--color-primitive-white)` | color | bg.surface · alias → --color-primitive-white | 2 (0/1/1) |
| `color.wiki.light.ink` | `#16181D` | color | fg.primary | 2 (0/1/1) |
| `color.wiki.light.muted` | `#5B6270` | color | fg.muted | 2 (0/1/1) |
| `color.wiki.light.rule` | `#D2D6DE` | color | line.default | 2 (0/1/1) |

### control

4 keys.

| Key | Value | Type | Role | Consumers |
|---|---|---|---|---|
| `control.height.compact` | `34px` | dimension | — | 1 (1/0/0) |
| `control.height.default` | `40px` | dimension | — | 5 (5/0/0) |
| `control.height.reading` | `46px` | dimension | — | 1 (1/0/0) |
| `control.height.touch` | `44px` | dimension | — | 14 (14/0/0) |

### dot

1 key.

| Key | Value | Type | Role | Consumers |
|---|---|---|---|---|
| `dot.size` | `5px` | dimension | — | 6 (6/0/0) |

### elevation

6 keys.

| Key | Value | Type | Role | Consumers |
|---|---|---|---|---|
| `elevation.1` | `0 1px 2px rgb(15 23 42 / 0.05)` | shadow | — | 0 (0/0/0) |
| `elevation.float` | `0 8px 24px rgba(0,0,0,.25)` | shadow | — | 1 (1/0/0) |
| `elevation.inset` | `inset 0 0 0 1px rgba(232,131,12,.5)` | shadow | — | 0 (0/0/0) |
| `elevation.popover` | `0 8px 24px rgba(0, 0, 0, 0.45)` | shadow | — | 6 (6/0/0) |
| `elevation.ring` | `0 0 0 2px rgba(232,131,12,.18)` | shadow | — | 0 (0/0/0) |
| `elevation.sheet` | `0 8px 24px rgba(0, 0, 0, 0.5)` | shadow | — | 4 (4/0/0) |

### focus

3 keys.

| Key | Value | Type | Role | Consumers |
|---|---|---|---|---|
| `focus.color` | `var(--ds-accent)` | color | — · alias → --ds-accent | 0 (0/0/0) |
| `focus.offset` | `2px` | dimension | — | 5 (5/0/0) |
| `focus.width` | `2px` | dimension | — | 5 (5/0/0) |

### hover

1 key.

| Key | Value | Type | Role | Consumers |
|---|---|---|---|---|
| `hover.lift` | `1.06` | number | — | 1 (1/0/0) |

### icon

3 keys.

| Key | Value | Type | Role | Consumers |
|---|---|---|---|---|
| `icon.size.lg` | `24px` | dimension | — | 0 (0/0/0) |
| `icon.size.md` | `20px` | dimension | — | 0 (0/0/0) |
| `icon.size.sm` | `16px` | dimension | — | 2 (2/0/0) |

### layout

8 keys.

| Key | Value | Type | Role | Consumers |
|---|---|---|---|---|
| `layout.bar.engine` | `62px` | dimension | — | 1 (1/0/0) |
| `layout.drawer.engine.width` | `min(360px, 92vw)` | dimension | — | 1 (1/0/0) |
| `layout.drawer.pitch.width` | `min(720px, 100vw)` | dimension | — | 1 (1/0/0) |
| `layout.max.pitch` | `1080px` | dimension | — | 1 (1/0/0) |
| `layout.max.wiki` | `980px` | dimension | — | 1 (1/0/0) |
| `layout.sidebar.engine` | `148px` | dimension | — | 2 (2/0/0) |
| `layout.sidebar.pitch` | `220px` | dimension | — | 1 (1/0/0) |
| `layout.sidebar.wiki` | `230px` | dimension | — | 1 (1/0/0) |

### line-height

5 keys.

| Key | Value | Type | Role | Consumers |
|---|---|---|---|---|
| `line-height.display` | `1.08` | number | — | 1 (1/0/0) |
| `line-height.normal` | `1.5` | number | — | 1 (1/0/0) |
| `line-height.reading` | `1.7` | number | — | 1 (1/0/0) |
| `line-height.relaxed` | `1.6` | number | — | 2 (2/0/0) |
| `line-height.tight` | `1.25` | number | — | 1 (1/0/0) |

### motion

14 keys.

| Key | Value | Type | Role | Consumers |
|---|---|---|---|---|
| `motion.duration.base` | `0.28s` | duration | — | 3 (3/0/0) |
| `motion.duration.fast` | `0.22s` | duration | — | 2 (2/0/0) |
| `motion.duration.hover` | `0.2s` | duration | — | 20 (20/0/0) |
| `motion.duration.instant` | `0.16s` | duration | — | 7 (7/0/0) |
| `motion.duration.none` | `0s` | duration | — | 1 (1/0/0) |
| `motion.duration.opacity` | `0.25s` | duration | — | 1 (1/0/0) |
| `motion.duration.pulse` | `1.1s` | duration | — | 1 (1/0/0) |
| `motion.duration.slow` | `0.32s` | duration | — | 9 (9/0/0) |
| `motion.duration.tab` | `0.24s` | duration | — | 11 (11/0/0) |
| `motion.duration.tick` | `0.06s` | duration | — | 1 (1/0/0) |
| `motion.easing.drawer` | `cubic-bezier(0.32, 0.72, 0.24, 1)` | cubicBezier | — | 1 (1/0/0) |
| `motion.easing.emphasized` | `cubic-bezier(0.22,1,0.36,1)` | cubicBezier | — | 7 (7/0/0) |
| `motion.easing.out` | `ease-out` | cubicBezier | — | 11 (11/0/0) |
| `motion.easing.standard` | `ease` | cubicBezier | — | 26 (26/0/0) |

### opacity

2 keys.

| Key | Value | Type | Role | Consumers |
|---|---|---|---|---|
| `opacity.disabled` | `0.35` | number | — | 0 (0/0/0) |
| `opacity.media` | `0.85` | number | — | 1 (1/0/0) |

### radius

7 keys.

| Key | Value | Type | Role | Consumers |
|---|---|---|---|---|
| `radius.circle` | `50%` | dimension | — | 7 (7/0/0) |
| `radius.lg` | `14px` | dimension | — | 0 (0/0/0) |
| `radius.md` | `10px` | dimension | — | 1 (1/0/0) |
| `radius.none` | `0` | dimension | — | 8 (8/0/0) |
| `radius.pill` | `9999px` | dimension | — | 12 (12/0/0) |
| `radius.sm` | `8px` | dimension | — | 27 (27/0/0) |
| `radius.xs` | `4px` | dimension | — | 61 (61/0/0) |

### spacing

16 keys.

| Key | Value | Type | Role | Consumers |
|---|---|---|---|---|
| `spacing.10` | `10px` | dimension | — | 44 (44/0/0) |
| `spacing.14` | `14px` | dimension | — | 25 (25/0/0) |
| `spacing.18` | `18px` | dimension | — | 18 (18/0/0) |
| `spacing.2` | `2px` | dimension | — | 22 (22/0/0) |
| `spacing.20` | `20px` | dimension | — | 12 (12/0/0) |
| `spacing.2xl` | `48px` | dimension | — | 6 (6/0/0) |
| `spacing.2xs` | `4px` | dimension | — | 65 (65/0/0) |
| `spacing.6` | `6px` | dimension | — | 73 (73/0/0) |
| `spacing.base` | `var(--spacing-2xs)` | dimension | — · alias → --spacing-2xs | 0 (0/0/0) |
| `spacing.gutter.pro` | `var(--spacing-md)` | dimension | — · alias → --spacing-md | 0 (0/0/0) |
| `spacing.lg` | `24px` | dimension | — | 9 (9/0/0) |
| `spacing.md` | `16px` | dimension | — | 31 (31/0/0) |
| `spacing.section` | `26px` | dimension | — | 0 (0/0/0) |
| `spacing.sm` | `12px` | dimension | — | 70 (70/0/0) |
| `spacing.xl` | `32px` | dimension | — | 7 (7/0/0) |
| `spacing.xs` | `8px` | dimension | — | 98 (98/0/0) |

### touch

2 keys.

| Key | Value | Type | Role | Consumers |
|---|---|---|---|---|
| `touch.min` | `40px` | dimension | — | 10 (10/0/0) |
| `touch.preferred` | `44px` | dimension | — | 1 (1/0/0) |

### tracking

4 keys.

| Key | Value | Type | Role | Consumers |
|---|---|---|---|---|
| `tracking.eyebrow` | `0.16em` | dimension | — | 6 (6/0/0) |
| `tracking.label` | `0.05em` | dimension | — | 0 (0/0/0) |
| `tracking.snug` | `-0.01em` | dimension | — | 3 (3/0/0) |
| `tracking.tight` | `-0.02em` | dimension | — | 3 (3/0/0) |

### typography

13 keys.

| Key | Value | Type | Role | Consumers |
|---|---|---|---|---|
| `typography.family.mono` | `ui-monospace, Menlo, monospace` | fontFamily | — | 13 (13/0/0) |
| `typography.family.sans` | `system-ui, -apple-system, Segoe UI, sans-serif` | fontFamily | — | 1 (1/0/0) |
| `typography.size.body` | `0.95rem` | fontSize | — | 13 (13/0/0) |
| `typography.size.display` | `clamp(2rem, 5vw, 3.1rem)` | fontSize | — | 1 (1/0/0) |
| `typography.size.eyebrow` | `0.72rem` | fontSize | — | 25 (25/0/0) |
| `typography.size.h1` | `1.6rem` | fontSize | — | 1 (1/0/0) |
| `typography.size.h2` | `1.35rem` | fontSize | — | 2 (2/0/0) |
| `typography.size.h3` | `1.25rem` | fontSize | — | 1 (1/0/0) |
| `typography.size.lede` | `1.05rem` | fontSize | — | 3 (3/0/0) |
| `typography.size.meta` | `0.8rem` | fontSize | — | 40 (40/0/0) |
| `typography.size.small` | `0.85rem` | fontSize | — | 47 (47/0/0) |
| `typography.size.timecode` | `0.75rem` | fontSize | — | 21 (21/0/0) |
| `typography.size.ui` | `1rem` | fontSize | — | 7 (7/0/0) |

### weight

5 keys.

| Key | Value | Type | Role | Consumers |
|---|---|---|---|---|
| `weight.bold` | `700` | fontWeight | — | 11 (11/0/0) |
| `weight.heavy` | `800` | fontWeight | — | 1 (1/0/0) |
| `weight.medium` | `600` | fontWeight | — | 4 (4/0/0) |
| `weight.regular` | `400` | fontWeight | — | 2 (2/0/0) |
| `weight.semibold` | `650` | fontWeight | — | 11 (11/0/0) |

### z

17 keys.

| Key | Value | Type | Role | Consumers |
|---|---|---|---|---|
| `z.bar` | `50` | number | — | 3 (3/0/0) |
| `z.base` | `0` | number | — | 1 (1/0/0) |
| `z.canvas` | `90` | number | — | 3 (3/0/0) |
| `z.content` | `2` | number | — | 3 (3/0/0) |
| `z.drawer` | `70` | number | — | 3 (3/0/0) |
| `z.drawer.child` | `71` | number | — | 1 (1/0/0) |
| `z.max` | `200` | number | — | 1 (1/0/0) |
| `z.menu` | `130` | number | — | 1 (1/0/0) |
| `z.overlay` | `60` | number | — | 4 (4/0/0) |
| `z.pinned` | `80` | number | — | 1 (1/0/0) |
| `z.popover` | `72` | number | — | 1 (1/0/0) |
| `z.raise` | `1` | number | — | 1 (1/0/0) |
| `z.sheet` | `65` | number | — | 2 (2/0/0) |
| `z.sticky` | `40` | number | — | 6 (6/0/0) |
| `z.sticky.rail` | `41` | number | — | 1 (1/0/0) |
| `z.toast` | `120` | number | — | 1 (1/0/0) |
| `z.tooltip` | `5` | number | — | 1 (1/0/0) |

Consumer cells read as `total (product / theme / gallery)` — the three terms of the formula above, so a zero is attributable at a glance.

Regenerate with `node scripts/build-foundations.mjs`; verify the committed file with `--check`. Source: [tokens.json](tokens.json).
