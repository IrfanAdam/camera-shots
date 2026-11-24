# Lane A — Foundations & Tokens

Scope: `design-system/tokens.json` (229 keys / 13 groups), `tokens.css`, `scripts/build-tokens.mjs`, `scripts/lint-tokens.mjs`, and the 4 surfaces. Read-only; all probes under `/Users/irfan/.hermes/cache/scratch/ds-audit/work/`. Existing metrics (`metrics.md`, `c-*.json`) reused; consumer/scale counts re-measured with `work/consumers.py`, `work/aliases.py`, `work/scale.py`, `work/gatecounts.py`.

## Verdict

The token *pipeline* is honest — the generator is byte-stable and reproduces the committed `tokens.css` exactly, and the gate is green with 0 violations — but the token *set* is 40% documentation: 91 of 229 tokens (39.7%) are referenced by no product page, and 76 of those are "consumed" only by the gallery rendering their own swatch. There is no primitive tier (0 tokens) and the semantic tier is 4 status colours (1.7% of the set); 96 colour tokens are surface-named (`color.pitch|wiki|engine|pro.*`), i.e. component-tier tokens wearing semantic names, which is why the same role has 3–4 spellings (`card`/`surface.1`/`panel`, `rule`/`border`/`divider`) and every page must hand-write 12–19 local aliases. The two axes that carry type hierarchy — weight and line-height — are 100% unconsumed (0 `var()` refs across 3 product pages against 53 literal weights and 36 literal line-heights), and body type on all three pages bypasses the token set through the `font:` shorthand. The engine page renders `color.pro.*` (74 refs / 14 tokens) and only 5 of its 55 namesake `color.engine.*` tokens, two of which are aliased to values that contradict their names (`--teal` → a grey divider). Verdict: **tokens are generated and gated but not architecturally tiered and largely not consumed** — P0 fixes are the consumer gap and the engine palette inversion, not new values.

## Measured scale table

| Axis | Tokens declared | Distinct computed/declared in product | Near-duplicates | Ungoverned literals |
|---|---|---|---|---|
| font-size | 11 (`typography.size.*`; 2 surface-scoped: `h1.wiki`, `h1.pitch`) | **16 distinct computed** (wiki 10, pitch 10, engine 7; union 16) | 15/15.2, 21.6/22, 11.2/11.52, 16/16.8, 13.333/13.6 | 8 literals (2/page) + 2 `font:` shorthands |
| line-height | 2 (`body` 1.7, `pitch.h1` 1.08) | **7 distinct ratios** (1, 1.08, 1.25, 1.4, 1.5, 1.6, 1.7) | 1.6/1.7 both call themselves "body" | 36 declarations, 0 token refs |
| letter-spacing | 2 (`tight` −.02em, `eyebrow` .16em) | **10 distinct** | −.02/−.03; .04/.05/.06; .14/.16 | 28 declarations |
| font-weight | 4 (400/600/650/700) | **5 distinct** incl. 800 (no token) | 650 vs 700 (1 weight apart, 8 uses) | 53 declarations, **0 token refs** |
| font-family | 2 | 3 spellings of the same sans stack | — | 3 hardcoded stacks (pitch 1, engine 2) |
| spacing | 15 (2px micro-grid + numeric *and* t-shirt names) | 13 used by product; `spacing.base` ≡ `spacing.2xs` (4px) | README documents 7 | 13 exempted px values survive |
| radius | 9 | 8 rendered (`4,8,10,12,14,18,50%,9999`); `radius.lg/card/xl` product-orphaned | 10px = `spacing.10` by value | 0 (V4 closed) |
| elevation | 7 | **3 used** (`popover`, `sheet`, `float`); `0`,`1`,`ring`,`inset` orphaned | — | 0 (13/13 decls are `var()`) |
| motion | 15 (10 durations, 5 easings) | 14 used; `easing.sheet` orphaned | .20/.22/.24/.25 within 0.05s — 3 pairs ≤0.02s | 0 (V2 closed) |
| z | 15 | 12 used + 3 literal (3, 5, 80) | 70/71/72 (3 steps in 2 units); 40/41; 9 pairs ≤5 apart | 3 (all exempted) |
| layout | 10 | **3 used**; 4 bypassed by identical literals | — | 5 literal widths (980/1080/230/220/min(720px,100vw)) |
| touch | 6 | **2 used** (min, preferred); 4 orphaned | 28/38/32/40 within 12px | n/a |
| breakpoint | 4 | **0 consumable** (var() invalid in `@media`) | 767.5 vs literal 768; 639 vs literal 640 | 9 distinct `@media` px values ≠ any token |
| opacity | 3 | **0 used** | .45 scrim duplicated as `color.engine.scrim` | n/a |
| border / focus | 3 / 2 | 3 / 2 used | — | 0 |

## Findings

| ID | Sev | Area | Evidence | Rule | Proposed fix |
|---|---|---|---|---|---|
| F-01 | P0 | Consumer gap | 91/229 tokens have 0 refs from `index/pitch/engine.html`; 76 are referenced only by `design-system/index.html` swatches. By group: color 63/119 used, typography 14/21, elevation 3/7, touch 2/6, layout 3/10, opacity 0/3, breakpoint 0/4. (`work/consumers.json`) | A token with no consumer is a claim, not a system | Wire or delete each; add T8 gate. Delete 26, wire 41, document-keep 24 (breakpoints + gallery-only specimens) |
| F-02 | P0 | Engine palette inverted | `engine.html:23` `--teal:var(--color-pro-divider-strong)` (#3A3A3C) and `:24` `--teal-bright:var(--color-pro-text-primary)` (#F5F5F7), while `color.engine.teal` #0F766E / `.teal.bright` #5EEAD4 (tokens.json:1) are unused by the page. engine.html has 74 `color.pro.*` refs vs 11 `color.engine.*` refs (5 tokens of 55). `README.md:68` documents #0E1116/#161B22/#E8830C as the engine surface. | Token names must describe what the page renders | Either re-point engine.html at `color.engine.*` (visual change, needs sign-off) or rename the group `color.pro.*` → `color.engine.*` and delete the decoy 50 (zero visual delta) |
| F-03 | P0 | No tier model | 0 primitive tokens; semantic tier = 4 (`color.semantic.*`); 96/119 colours are surface-scoped (`color.pitch.*` 18, `color.wiki.*` 16, `color.engine.*` 55, `color.pro.*` 17). One slot, 3 names: `wiki.light.card` / `pitch.surface.1` / `engine.panel` (unused) / `pro.surface.1`. Rules: `rule`/`border`/`divider`. | Consumers reference semantic tokens, never globals; surface names belong in the component tier | Introduce §Token architecture v2 (14-slot role contract, 5 theme maps) |
| F-04 | P1 | Body type bypasses tokens | `index.html:11` `font:15px/1.6 var(--typography-family-sans)`, `pitch.html:23` `font:15px/1.7 system-ui,…` (literal 15px, literal family), `engine.html:32` `font:var(--typography-size-body)/1.6 …` (literal 1.6). Token body = 0.95rem = 15.2px, leading token = 1.7. Wiki and pitch render 15px, not 15.2px. | One body size, one leading, consumed by token | Rewrite 3 declarations to `font-size`/`line-height`/`font-family` longhand with tokens; add T1/T13 |
| F-05 | P1 | Scale cardinality | 16 distinct computed sizes vs 11 size tokens; 10 durations (3 pairs ≤0.02s inside a 0.16–0.32 band: .20/.22, .22/.24, .24/.25); 15 z steps (70/71/72; 9 pairs ≤5 apart); 15 spacing steps mixing `spacing.6` and `spacing.xs`, with `spacing.base` ≡ `spacing.2xs`. | Constrain to a defined scale; token sprawl (space-13/14/15) is not consistency | Cut durations to 5 (instant .16, fast .24, base .28, slow .32, tick .06, pulse 1.1); cut z to 10 by banding (see v2); collapse spacing numerics into t-shirt names |
| F-06 | P1 | Layout tokens bypassed | `index.html:12` `max-width:980px` = `layout.max.wiki`; `index.html:28` `grid-template-columns:230px 1fr` = `layout.sidebar.wiki`; `pitch.html:32` `max-width:1080px` = `layout.max.pitch`; `pitch.html:68` `220px 1fr`; `pitch.html:144` `min(720px,100vw)` = `layout.drawer.pitch.width`. Gate has no width/height class (162 literal declarations). | A token whose value is duplicated verbatim in CSS is not governing | Add T7; re-point these 5 to `var(--layout-*)` |
| F-07 | P1 | Docs contradict source | `README.md:66` wiki light bg `#FAFAF8`, rule `#E1E3E8` vs tokens `#F8F8F4`, `#D2D6DE`. `README.md:109` documents 7 spacing steps vs 15. `:101` 13 z values vs 15 (missing `sticky.rail`, `drawer.child`). `:93` 7 durations vs 10. `:68` engine row describes the unused palette. | Docs generated from source or gated against it | Generate the README tables from `tokens.json` in `build-tokens.mjs`, or add T-DOC comparing tables to source |
| F-08 | P1 | Overlay sprawl | 20 alpha tokens across 5 palettes. Engine alone: `scrim` .45 / `scrim.strong` .55; `overlay.72/.82/.88/.90`; `overlay.panel/.92/.94/.97` — 4 scrims within .06 alpha, 3 panels within .05, none consumed by `engine.html`. | One sink per role, alpha as an opacity step not a new colour | Collapse to `overlay.scrim` + `overlay.panel` per palette × 3 `opacity.*` steps; net −12 tokens |
| F-09 | P1 | Leading ungoverned | 2 line-height tokens, 0 refs in product; 7 distinct ratios measured; 36 literal declarations (engine 17, gallery 13, pitch 6, wiki 0 — wiki only sets leading inside `font:`). | Type scale must include line-height per size step | Add `line-height.tight/normal/relaxed/display` (1.25/1.5/1.6/1.08); add T2 |
| F-10 | P1 | Theme parity unenforced | Dark mapping written twice per page: `index.html:8` + `:9` (8 roles × 2), `design-system/index.html:22` + `:34` (8 roles × 2) = 32 duplicated declarations. Gallery dark borrows pitch wholesale (`index.html:24–30`), so the docs page has no surface of its own and `--g-amber` flips meaning: `#B86A00` warning (light) → `#C8B28A` accent (dark). | One role contract; theme = data, not a second stylesheet | Emit `:root[data-theme]` blocks from one JSON theme map (generator); add T10 key-parity check |
| F-11 | P1 | Exemptions mask missing tokens | 8 of 21 exemptions carry values that recur or fill scale holes: `1.6rem`×3 (`pitch.html:91,144,203`), `1.4rem`×2 (`:50,97`), `z-index:5` (`:173`), `3` (`engine.html:153`), `80` (`:1228`) — z has no step between `z.content` 2 and `z.sticky` 40. | A repeated literal is a missing token; an exemption is for one-offs | Added `spacing.section` 26px (closes 1.6rem×3 and 1.4rem×2 within 2px) + `z.tooltip` 5 / `z.pinned` 80; retire the 5 spacing exemptions at the same time |
| F-12 | P1 | Generator validates shape only | `build-tokens.mjs:42–66` checks JSON, leaf `value` is a non-empty string, name regex, duplicate name. It never checks `type`↔`value`: `typography.lineheight.pitch.h1` is `type:"fontSize"`, `value:"1.08"`; `radius.none` is a `dimension` with no unit; 24 tokens are typed `other` (all z, all easings, all opacity). | Generated output must be type-checked | Add T11 type↔value regex table; retype `other` → `number`/`cubicBezier`/`shadow` |
| F-13 | P2 | Alias duplicates inside one scope | `engine.html:13/16` `--ink` ≡ `--code` (both `color-pro-text-primary`); `:14/15` `--mut` ≡ `--mut2`; `:20/23` `--border-strong` ≡ `--teal`; `:24` `--teal-bright` ≡ `--ink`. 57 local alias names total (wiki 12, pitch 19, engine 19, gallery 18). | Local `--x: value` is a missing role, not page styling | Promote the 14-slot role contract; delete 4 duplicate aliases |
| F-14 | P2 | Inline style as mechanism | 200 `style=` attributes (gallery 148, pitch 31, wiki 19, engine 2); 0 carry raw paint (V5 passes them) but 13 in `index.html:229–255` are `style="color:var(--ink)"` repeating a one-class need. | Styling belongs in the cascade | Add a class; T15 caps inline count per file |
| F-15 | P2 | `!important` budget | 8 total (wiki 2, pitch 5, engine 1); counted by the gate (`lint-tokens.mjs` `important`) but never enforced. | `!important` signals a cascade defect | Add T14; fix the 8 then gate at 0 |
| F-16 | P2 | Breakpoints unexpressed | `@media` px values: wiki 639/800, pitch 639/768/900/901, engine 520/760/860, gallery 640/900 → 9 of 11 queries use no token value. Tokens: 720, 1023.5, 767.5, 639. Pitch ships `900` and `901` as a pair; wiki+pitch use 639 where the gallery uses 640. | Breakpoint values must be a single scale even when `var()` cannot be used | Add T6 (literal `@media` px must equal a `breakpoint.*` value); reconcile to 5 steps (390/640/768/900/1024) |
| F-17 | P2 | Weight 800 has no token | `index.html` 2× `font-weight:800`; tokens stop at 700. | Every used step exists as a token | Add `weight.heavy` 800 or snap to 700 |
| F-18 | P2 | Names that lie | `--teal`/`--teal-bright` (grey text), `--code` (primary text), `--g-amber` (accent in dark), `color.engine.code`/`.teal` (0 product refs), `color.pitch.surface.1` vs `wiki.light.card` vs `engine.panel`, `typography.size.h1.wiki` (a size token scoped to a page). | Name states role, not surface or value | Folded into v2 rename list |

## Token architecture v2 — proposed tiers

| Tier | Contents | Count | Notes |
|---|---|---|---|
| T1 primitive | `neutral.0…1000` (12), `accent.teal.100…700` (7), `accent.amber.100…700` (7), `alpha.white/black` (4) | ~30 | Replaces nothing today — the system has **0** primitives; this tier is new |
| T2 semantic role | 14 slots × 5 theme maps (see below) + `status.*` 4×2 + `overlay.scrim`/`overlay.panel` × 5 | ~78 | One name per role; theme is a map, not a name prefix |
| T3 component | `button.*`, `chip.*`, `field.*`, `graph.*`, `track.*` | ~24 | `graph.*`/`track.*` already exist under surface names |

Role schema (slot ← which palettes fill it; `–` = falls through to a neighbour):

| # | Slot | wiki-light | wiki-dark | pitch | engine | pro |
|---|---|---|---|---|---|---|
| 1 | `bg.page` | ✓ | ✓ | ✓ | ✓ | ✓ |
| 2 | `bg.surface` (raised 1) | ✓ `card` | ✓ `card` | ✓ `surface.1` | ✓ `panel` | ✓ `surface.1` |
| 3 | `bg.surface.alt` (raised 2) | – | – | ✓ `surface.2` | ✓ `panel.deep` | ✓ `surface.2` |
| 4 | `bg.control` | – | – | ✓ `switch.bg` | ✓ `tool` | ✓ `tool` |
| 5 | `bg.accent.soft` | ✓ `accent.wash` | ✓ | – | ✓ `accent.wash.*` | – |
| 6 | `fg.primary` | ✓ | ✓ | ✓ `ink` | ✓ `ink` | ✓ `text.primary` |
| 7 | `fg.secondary` | – | – | ✓ `body` | ✓ `muted.2` | – |
| 8 | `fg.muted` | ✓ | ✓ | ✓ `muted` | ✓ `muted` | ✓ `text.secondary` |
| 9 | `fg.faint` | – | – | ✓ `muted.2` | ✓ `placeholder` | – |
| 10 | `fg.on-accent` | – | – | ✓ `accent.ink` | ✓ `accent.ink` | – |
| 11 | `line.default` | ✓ `rule` | ✓ `rule` | ✓ `rule` | ✓ `border` | ✓ `divider` |
| 12 | `line.strong` | – | – | – | ✓ `border.strong` | ✓ `divider.strong` |
| 13 | `accent` | ✓ | ✓ | ✓ | ✓ | ✓ `selection` |
| 14 | `status.{success,warning,danger,info}` | ✓ | ✓ | ✓ (`positive`) | ✓ | ✓ |

11 of 14 slots are filled by all five palettes; slots 3, 4, 5, 7, 12 are partial (2–3 palettes) and must be declared `null` explicitly so a lookup never silently inherits another theme's value. A single role contract **can** cover all five: the only structural obstacle is that wiki is the sole light theme, so `light`/`dark` becomes a mode axis on slots 1–3 and 6–8 rather than a fifth palette.

Action counts (target 229 → 206 keys):

| Action | Count | Examples |
|---|---|---|
| Alias (value becomes `var(--other)`) | 12 | `wiki.light.amber`→`semantic.warning`; `pro.tool.hover`→`pro.divider` (#2C2C2E dup); `engine.accent.ink`→`print.ink` (#111111 dup); `wiki.light.card`→`neutral.white`; `spacing.base`→`spacing.2xs`; 7 overflow/overlay alphas |
| Rename | 24 | `card`/`panel`/`panel.deep` → `surface`/`surface.alt`; `rule`/`border`/`divider`/`divider.strong` → `line`/`line.strong`; `ink`/`text.primary` → `fg.primary`; `muted`/`text.secondary` → `fg.muted`; `size.h1.wiki|pitch` → `size.h1` + per-theme value |
| Add | 21 | `line-height.{tight,normal,relaxed,display}` 4; `tracking.{snug,wide,eyebrow,widest}` 4; `weight.heavy` 1; `spacing.hairline` 1px 1; `z.tooltip` 5 / `z.pinned` 80 2; `breakpoint.{xs,sm,md,lg,xl}` 5; `layout.indent` 1; `overlay.scrim`/`panel` for wiki 2; `fg.secondary` wiki 2 |
| Delete | 26 | `opacity.scrim`, `opacity.overlay.thumb`, `elevation.0`, `touch.handle.timeline`, `layout.sheet.grab.{width,height}`, 50 unused `color.engine.*` minus the 5 real ones (collapse 45 → graph/track/overlay keeps), `color.engine.wash.{10,12,14}`, `overlay.82/.88/.90`, `overlay.panel.94/.97` |
| Keep, wire instead | 41 | 4 weight, 2 line-height, 2 tracking, 4 breakpoint, 4 layout, 4 elevation, 4 touch, 5 colour orphans — the F-01 "wire" set |

Migration order (each step ships green):
1. **Alias + fold** (`tokens.json` + regenerate). Zero visual delta — assert byte-identical render on the 3 static pages.
2. **Rename to role names** with the old key kept as an alias for one release; `build-tokens` emits both.
3. **Wire the 41 orphans** (F-04, F-06, F-09, F-17) — page work, gate T1/T2/T4/T7 must be added first or it regresses.
4. **Add the 21 missing values**; delete the 26 once `T8` reports 0.
5. **Emit theme maps from JSON** so `index.html:8/9` and `gallery:22/34` become one block each.
6. **Turn on the new gate classes** one at a time, each with its own N-exemption budget.

## Gate hardening

Current classes: V1 colour, V2 motion, V3 z-index, V4 radius, V5 inline paint, V6 SVG paint, V7 border width, V8 spacing, U1 dead `var()`. Blind to: font-size, line-height, letter-spacing, font-weight, font-family, box-shadow, widths/heights, `@media` values, token consumers, token types, theme parity, `!important` (counted only).

| New check | Would flag now | Fix command |
|---|---|---|
| T1 raw `font-size` (incl. `font:` shorthand size) | **10** (2/page + 2 shorthands) | re-point to `typography.size.*` |
| T2 raw `line-height` | **36** | `var(--line-height-*)` |
| T3 raw `letter-spacing` | **28** | `var(--tracking-*)` |
| T4 raw `font-weight` / literal family stack | **53** / **3** | `var(--typography-weight-*)`, `var(--typography-family-sans)` |
| T5 raw `box-shadow` | **0** (13/13 are `var()`) — passes today, guards regressions | `var(--elevation-*)` |
| T6 `@media` px not equal to a `breakpoint.*` value | **9 queries / 8 distinct values** (of 11; 900/901 pair, 640 vs 639, 768 vs 767.5) | `--breakpoint-*` value list in the check |
| T7 literal `width/height/min/max-*` | **162** (wiki 15, pitch 48, engine 63, gallery 36) | `var(--layout-*)` or `lint-allow` |
| T8 token with 0 product consumers | **91** (15 with zero refs anywhere) | wire or delete; budget per release |
| T9 two distinct roles, one resolved value | **5** (#FFFFFF, #B86A00, #2C2C2E, #111111, 4px) | alias one to the other |
| T10 light/dark key-set parity per theme block | **0** (wiki 8/8, gallery 8/8) — passes; prevents F-10 | add slot to both maps |
| T11 `type`↔`value` mismatch (regex per type) | **1** (`lineheight.pitch.h1` typed `fontSize`) + 24 `other` | retype |
| T12 group cardinality cap (e.g. durations ≤6, z ≤10) | durations **10** (4 over), z **15** (5 over) | merge steps |
| T13 duplicate alias value in one `:root` | **4** (engine) | delete alias |
| T14 `!important` | **8** | fix cascade |
| T15 inline `style=` attributes | **200** | classes |

Pass/fail example for the two highest-value checks:
- `T1`: PASS `h1{font-size:var(--typography-size-h1-wiki)}` / FAIL `body{font:15px/1.6 …}` — the regex must read the `font` shorthand's leading `<size>/<line-height>` pair, or F-04's bypass stays invisible.
- `T8`: PASS `--color-pitch-bg` (30 pitch refs) / FAIL `--color-engine-teal` (0 product refs, 1 gallery swatch ref) — count refs inside `<style>`/`<script>` of the 3 product pages only; a gallery swatch is documentation, not consumption.

## Proposed workstream

| # | Task | Files | Acceptance | Effort |
|---|---|---|---|---|
| A1 | Add T1/T2/T4/T13 + `font:` shorthand parsing to the gate, with current counts as the exemption budget | `scripts/lint-tokens.mjs` | `--check` exits 1 with exactly 10/36/53/3 hits; exit 0 after A3 | 1d |
| A2 | Add T8 (consumer audit) + T9 (duplicate value) + T10 (theme parity) + T11 (type↔value) to the gate and `build-tokens` | `scripts/lint-tokens.mjs`, `scripts/build-tokens.mjs` | Reports 91 / 5 / 0 / 1; generator rejects a bad `type` with exit 1 | 1.5d |
| A3 | Wire body type + family on 3 pages; add line-height and tracking scales | `tokens.json`, `index.html:11`, `pitch.html:23`, `engine.html:32` | T1/T2/T4 = 0; body computed = 15.2px/1.6 on all 3; 16 distinct sizes → ≤11 | 1.5d |
| A4 | Wire layout tokens + breakpoint scale; reconcile 900/901, 639/640, 768/767.5 | `index.html:12,28`, `pitch.html:32,68,144`, `tokens.json` | T6/T7 = 0 for those 5; 5 breakpoint steps | 1d |
| A5 | Role-contract rename + 12 aliases + delete 26 | `tokens.json`, all 4 pages' `:root` | 229 → 206 keys; T8 = 0; render byte-identical on static pages | 2d |
| A6 | Generate theme maps + README tables from `tokens.json` | `build-tokens.mjs`, `design-system/README.md`, `index.html:8–9`, `gallery:22–34` | One dark block per page; README diff = 0 against source | 1.5d |
| A7 | Resolve the engine palette inversion (decide: re-point page vs rename group) | `engine.html`, `tokens.json`, `README.md:68` | Engine page refs ≥ 40 to one palette; 0 name/value contradictions | 0.5d decision + 2d execution |

## Still uncertain

- Whether `color.pro.*` is a *staged* palette for an unbuilt "pro" tool that engine.html borrowed early, or a paste error. The 76 gallery-only tokens (`graph.*`, `track.*`, `canvas.bg`) suggest staged features, not dead code — deleting them would be wrong if a roadmap exists. Needs the owner's intent.
- Whether 15px is a deliberate screenshot-matched body size (both static pages agree) or the 15.2px token rounding wrong. The token is `0.95rem`; the pages say `15px`; both are "correct" until someone states the intent.
- Whether the 5 palettes are meant to be one product's five themes or five products sharing a stylesheet. That answer changes v2 from "role contract + theme maps" to "5 theme packs + one shared primitive tier".
- My inline-style counts are 19/31/2/148 against the brief's 16/30/2/148 — I count every `style="` including those inside JS template strings; the brief's number likely excludes script-built markup. Neither is wrong; the 148 gallery figure matches exactly, which suggests the difference is in `index.html`/`pitch.html` script markup.
- Gallery contrast failures (`span.badge` 4.25, `span.badge-dev` 3.68, `a.eng` 2.05) are colour *value* problems in `tokens.css`, not structure — out of scope for Lane A but they mean `color.semantic.info`/`.danger` and `wiki.dark.accent` need value work, not renaming.
