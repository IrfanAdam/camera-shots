# Design System

## What this is

Three product surfaces (the wiki in `index.html`, the investor deck in `pitch.html`, the canvas app in `engine.html`) share one token space. Every color, size, radius, duration, z-index and touch dimension resolves from `design-system/tokens.css`, which is generated from `design-system/tokens.json`. Page CSS may not hardcode a value: it declares short local aliases in `:root` and consumes `var(--token)` everywhere below that.

## Map

| Path | What it is | Generated | Safe to edit |
|---|---|---|---|
| `design-system/tokens.json` | Token source, 229 keys, 13 groups | no | yes, the only design-value source |
| `design-system/tokens.css` | Single `:root` block of custom properties | yes | never |
| `scripts/build-tokens.mjs` | Generator, tokens.json to tokens.css | no | yes |
| `scripts/lint-tokens.mjs` | Adherence gate, per-file line numbers, exit 1 on failure | no | yes |
| `design-system/index.html` | Rendered gallery: color, type, space and shape, motion, touch, components, consistency matrix | no | yes |
| `design-system/components.md` | Component specs | no | yes |
| `design-system/patterns.md` | Shell and composition patterns | no | yes |
| `design-system/audit.md` | Findings, token-gap closure, re-point map | no | yes |
| `design-system/audit-report.md` | Machine receipt written by the gate | yes | never |
| `design-system/audit-checklist.md` | Checklist to run per screen before shipping | no | yes |

## The pipeline

```
node scripts/build-tokens.mjs          # regenerate tokens.css from tokens.json
node scripts/lint-tokens.mjs           # scan pages, print the table, write audit-report.md
node scripts/lint-tokens.mjs --check   # CI gate: same scan, no write, exit 1 on failure
```

`tokens.json` is the only file you edit by hand for a design value. `tokens.css` is regenerated; editing it is lost work. The generator is deterministic and idempotent (verified: a fresh run reproduces the on-disk file byte for byte).

## Naming rule

Lowercase each dot-separated key, replace dots with dashes, prefix with `--`. The generator also splits camelCase.

| Source key | Custom property |
|---|---|
| `color.engine.accent.wash.18` | `--color-engine-accent-wash-18` |
| `typography.size.h1.wiki` | `--typography-size-h1-wiki` |
| `motion.easing.drawer` | `--motion-easing-drawer` |
| `layout.sheet.grab.height` | `--layout-sheet-grab-height` |

## How a page consumes it

Each page links the generated sheet in `<head>` (`<link rel="stylesheet" href="design-system/tokens.css">`), then its own `:root` re-points short local names at canonical tokens. Deeper rules consume the local names, and the local names resolve to the token set.

Before the re-point (`pitch.html` in git history):

```css
--bg:#0A0A0B;--s1:#141416;--s2:#1B1B1E;--ink:#F2F0EB;
```

After (`pitch.html:11`):

```css
--bg:var(--color-pitch-bg);--s1:var(--color-pitch-surface-1);--s2:var(--color-pitch-surface-2);
```

## The scales

Color, per surface:

| Surface | bg | surface | ink | muted | rule/border | accent |
|---|---|---|---|---|---|---|
| Pitch | `#0A0A0B` | `#141416` | `#F2F0EB` | `#A7A5A0` | `#26262B` | `#C8B28A` |
| Wiki light | `#FAFAF8` | `#FFFFFF` | `#16181D` | `#5B6270` | `#E1E3E8` | `#0B5D66` |
| Wiki dark | `#0E1213` | `#151B1C` | `#ECF1F1` | `#9DAAAB` | `#243032` | `#5CC4D0` |
| Engine | `#0E1116` | `#161B22` | `#E8EAF0` | `#8B93A5` | `#262D38` | `#E8830C` |
| Pro | `#0B0B0D` | `#1E1E22` | `#F5F5F7` | `#9A9AA0` | `#2C2C2E` | `#FFD60A` |

Type:

Two families, no more: one sans for all text, one mono for labels, numbers, code and timecode. Hierarchy is size, weight and tracking only — there is no display face and no quote face.

| Token | Value |
|---|---|
| `family.sans` | `system-ui, -apple-system, Segoe UI, sans-serif` |
| `family.mono` | `ui-monospace, Menlo, monospace` |
| `h1.pitch` | `clamp(2rem, 5vw, 3.1rem)` |
| `h1.wiki` | `1.6rem` |
| `h2.pitch` | `1.35rem` |
| `h2.wiki` | `1.25rem` |
| `body` | `0.95rem` |
| `small` | `0.85rem` |
| `meta` | `0.8rem` |
| `eyebrow` | `0.72rem` |
| `timecode` | `0.75rem` |

| Radius | none | xs | sm | md | card | lg | xl | pill | circle |
|---|---|---|---|---|---|---|---|---|---|
| Value | `0` | `4px` | `8px` | `10px` | `12px` | `14px` | `18px` | `9999px` | `50%` |

| Duration | instant | hover | fast | tab | opacity | base | slow |
|---|---|---|---|---|---|---|---|
| Value | `0.16s` | `0.2s` | `0.22s` | `0.24s` | `0.25s` | `0.28s` | `0.32s` |

| Easing | standard | out | drawer | sheet | emphasized |
|---|---|---|---|---|---|
| Value | `ease` | `ease-out` | `cubic-bezier(0.32, 0.72, 0.24, 1)` | `cubic-bezier(0.16, 1, 0.3, 1)` | `cubic-bezier(0.22,1,0.36,1)` |

| z | base | raise | content | sticky | bar | overlay | sheet | drawer | popover | canvas | toast | menu | max |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Value | `0` | `1` | `2` | `40` | `50` | `60` | `65` | `70` | `72` | `90` | `120` | `130` | `200` |

| Touch | small | field | min | preferred | pro | handle |
|---|---|---|---|---|---|---|
| Value | `28px` | `38px` | `40px` | `44px` | `48px` | `32px` |

| Spacing | 2xs | xs | sm | md | lg | xl | 2xl |
|---|---|---|---|---|---|---|---|
| Value | `4px` | `8px` | `12px` | `16px` | `24px` | `32px` | `48px` |

## Rules

- No raw hex, `rgb()` or `rgba()` outside `tokens.css`. The one legal literal is a `var()` fallback.
- No raw duration or `cubic-bezier()` in `transition` or `animation`.
- No raw `z-index` and no raw `border-radius` (including bare `0`); use `z.*` and `radius.*`.
- Media-query breakpoints stay in raw px: `var()` is invalid in `@media`. This is the documented exception; the gate ignores it.
- Every interactive element needs the `:focus-visible` pair: `outline:var(--focus-width) solid <accent>` plus `outline-offset:var(--focus-offset)`.
- When a value is within 1px of a token step, use the token, not the nearest literal.
- To add a value: open `tokens.json`, add the key with `type` and `value`, run the generator, then consume the new `var(--...)`.
- A page change is not done until `node scripts/lint-tokens.mjs` is green.

## Known debt

`design-system/audit-report.md` (generated 2026-11-23) reports PASS, 0 violations, 21 documented exemptions — every raw paint, motion, z-index, radius, border width and spacing value now resolves from a token, and no page references an undefined token.

What the gate does not judge:

- Literal `font-size` values survive beside the type tokens: 2 distinct non-`var()` sizes per page (`index.html` `.7rem` / `22px`, `pitch.html` `.62rem` / `.9rem`, `engine.html` `.78rem` / `18px`). The gate has no font-size class; folding them into the scale is the next pass.
- `!important`: 2 in `index.html`, 5 in `pitch.html`, 1 in `engine.html`. Same lane.

Both are type-and-cascade cleanup, not token drift.
