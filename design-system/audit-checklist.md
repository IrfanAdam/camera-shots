# Audit Checklist

Use per screen. Mark each: Compliant / Deviation / Gap. Deviations name the correct token; gaps propose the spec section to add.

Rules marked **proposed** describe UI that no page ships yet. They are future acceptance criteria, not current violations — do not file a deviation against a page for failing one.

## Color / Theme
- [ ] Surfaces resolve to `color.*` tokens (no raw hex in product CSS)
- [ ] Text/muted pairs meet 4.5:1 (body) and 3:1 (large/meta) contrast
- [ ] One accent per surface; champagne (pitch), teal/amber (wiki), orange+teal (engine) never mixed on one surface
- [ ] **Proposed:** timeline hues fixed — FX violet, title green, audio blue, selection yellow (no timeline lanes ship in any page yet)
- [ ] Wiki dark mode flips all four semantic slots (bg/card/ink/rule/accent), not just bg

## Typography
- [ ] Families from `typography.family.*` only
- [ ] Sizes from `typography.size.*` scale
- [ ] Eyebrows uppercase + tracked (`typography.tracking.eyebrow`), never plain small caps
- [ ] Timecode tabular, `typography.size.timecode`

## Spacing / Density
- [ ] Gaps from `spacing.*` scale (4px base)
- [ ] Pro surfaces keep `spacing.gutter.pro` gutters at high density
- [ ] Section rhythm: `spacing.xl` between, `spacing.md` within

## Touch / Targets
- [ ] All interactive targets ≥ `touch.min` (40px)
- [ ] Transport/play controls ≥ `touch.pro` (48px) where finger-first
- [ ] **Proposed:** timeline selection handles ≥ `touch.handle.timeline` (32px) — no such handle is implemented

## Radius / Elevation
- [ ] Radii from `radius.*` — shipped: 4px control, 8px panel, 9999px filter pill
- [ ] Shadows from `elevation.*` only

## Motion
- [ ] Durations/easings from `motion.*`
- [ ] Drawer + scrim paired (slide + fade)
- [ ] `prefers-reduced-motion` guard present — implemented on all four surfaces (`index.html:81`, `pitch.html:162,242`, `engine.html:424`, gallery `:454`); coverage is uneven, engine reduces 4 selectors only (D-23)

## Components
- [ ] Tabs: single indicator (dot OR underline, never both)
- [ ] Cards: one idea each, max one nesting level
- [ ] Drawers: scrim + Escape close, focus trap + return
- [ ] Danger: two-tap arm
- [ ] Toasts: auto-dismiss, `role=status`
- [ ] Missing media shows placeholder, never broken thumb

## Pitch-minimal integrity
- [ ] One H1 with single accent span; one eyebrow + H2 per section
- [ ] Type stays one sans + one mono: no display face, no quote face; hierarchy is size, weight and tracking only
- [ ] Figures carry honesty qualifiers; allocation sums to 100%
- [ ] Print shows article only (header/aside/rails hidden)
- [ ] Export path exists for every doc type

## Enforcement gate

**A page change is not done until the gate is green.**

```sh
node scripts/lint-tokens.mjs          # human table; regenerates design-system/audit-report.md
node scripts/lint-tokens.mjs --check  # CI mode: no write, exit 1 on any violation
```

- Scans `index.html`, `pitch.html`, `engine.html` and `design-system/*.html` (never `tokens.css`), per file and per line.
- Fails on: raw color (V1), raw duration/cubic-bezier (V2), raw `z-index` (V3), raw `border-radius` (V4), inline `style=` paint (V5), SVG `fill|stroke|stop-color="#…"` (V6), and dead `var(--name)` references (U1).
- `design-system/tokens.css` is the only place a literal may live; pages consume `var(--token)`. `:root` aliases may resolve to tokens (`--bg:var(--color-wiki-light-bg)`).
- Media-query breakpoints are the documented raw-px exception (`var()` is invalid in `@media`).
- 21 documented exemptions survive today; 8 of them mask a token that was never created. `PASS` means "no violation outside the gate's classes", not "every literal is tokenised" — read the exemption list in `audit-report.md`, or the summary in `audit/2026-11-24/foundations.md`.
- `!important`, inline `style=` and `var(--)` counts are reported for visibility, not failed on.
- `design-system/audit-report.md` is machine-written — read it, never hand-edit it.
