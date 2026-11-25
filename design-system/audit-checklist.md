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
- [ ] Eyebrows uppercase + tracked (`tracking.eyebrow`), never plain small caps
- [ ] Timecode tabular, `typography.size.timecode`

## Spacing / Density
- [ ] Gaps from `spacing.*` scale (4px base)
- [ ] Pro surfaces keep `spacing.gutter.pro` gutters at high density
- [ ] Section rhythm: `spacing.xl` between, `spacing.md` within

## Touch / Targets
- [ ] All interactive targets ≥ `touch.min` (40px)
- [ ] Transparent `pointer:coarse` floor holds: pills/tabs resolve ≥44px (`control.height.touch`) with no page-local override, and `[data-ds-compact]` is used only on dense, repeated, non-primary controls
- [ ] Transport/play controls ≥ `touch.preferred` (44px) where finger-first
- [ ] **Proposed:** timeline selection handles ≥ `spacing.xl` (32px) — no such handle is implemented

## Radius / Elevation
- [ ] Radii from `radius.*` — shipped: 4px control (`radius.xs`), 8px panel (`radius.sm`); `radius.pill` only on badges, switch tracks/thumb, progress track/fill and the sheet grab
- [ ] Shadows from `elevation.*` only

## Motion
- [ ] Durations/easings from `motion.*`
- [ ] Drawer + scrim paired (slide + fade)
- [ ] `prefers-reduced-motion` guard present — implemented on all four surfaces (`index.html:81`, `pitch.html:162,242`, `engine.html:424`, gallery `:454`); coverage is uneven, engine reduces 4 selectors only (D-23)

## Components
- [ ] Tabs: single indicator (dot OR underline, never both)
- [ ] Cards: one idea each, max one nesting level
- [ ] Drawers: scrim + Escape close, focus trap + return
- [ ] Nav rail: one `.ds-rail` serves the sidebar and the phone drawer; the toggle ships `hidden` and the closed drawer is `[hidden]` + `inert`
- [ ] Nav rail: the `.ds-rail__foot` roster is Wiki · Pitch · Engine · Design System on every page, its current item is ink + medium with **no** accent bar, and the section indicator keeps the bar
- [ ] Nav rail: scrim, injected 44×44 close control, Escape and the toggle all close; focus returns to the toggle; ≥901 tears the drawer state down
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
node scripts/check-doc-counts.mjs     # the docs may not state a count the source contradicts
node scripts/check-anchors.mjs        # every #anchor, id and idref resolves
node scripts/check-links.mjs          # every local href/src and relative doc link resolves
node scripts/build-usage.mjs --check  # usage.json + usage.md match the pages
```

- Scans `index.html`, `pitch.html`, `engine.html` and `design-system/*.html` (never `tokens.css`), per file and per line.
- Fails on: raw color (V1), raw duration/cubic-bezier (V2), raw `z-index` (V3), raw `border-radius` (V4), inline `style=` paint (V5), SVG `fill|stroke|stop-color="#…"` (V6), raw border width (V7), raw spacing (V8), dead `var(--name)` references (U1), raw `font-size` (T1), raw `line-height` (T2), raw `letter-spacing` (T3), raw `font-weight` and literal family stacks (T4), `!important` (T14) and inline `style=` attributes (T15).
- Fails on the token set too: tokens with 0 consumers (T8), two role names sharing one value (T9), role-contract parity across the theme maps (T10), `type` ↔ `value` shape (T11) and duplicate alias values in one `:root` (T13).
- Every class carries the count measured at the last migration as an explicit ceiling: only the excess fails, so existing debt stays visible and any regression breaks the build.
- `design-system/tokens.css` is the only place a literal may live; pages consume `var(--token)`. `:root` aliases may resolve to tokens (`--bg:var(--color-wiki-light-bg)`).
- Media-query breakpoints are the documented raw-px exception (`var()` is invalid in `@media`). `@media` pixel values (T6) and raw `width`/`height` (T7) are not enforced yet, and neither is raw `box-shadow`.
- An exemption is a `lint-allow` marker carrying its reason on the line it excuses. The report lists every exemption; a marker whose reason no longer applies fails as `bad-allow`. `PASS` means "no violation outside the gate's classes", not "every literal is tokenised".
- `design-system/audit-report.md` is machine-written — read it, never hand-edit it.
