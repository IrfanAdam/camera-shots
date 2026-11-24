# Lane E — Visual & Cross-Surface Consistency

Evidence base: 10 fresh CDP shots in `ds-audit/shots/` (theme asserted by corner pixel: index light 248,248,244 / dark 14,18,19; pitch 10,10,11; engine 30,30,34; gallery 248,248,244 = LIGHT — the `*-top.png` files are stale dark captures and were replaced by crops of the fresh light file), `metrics.md`/`.json`, computed radii/height dumps, and token/selector greps. Crops in `shots/crops/` with offsets noted per defect.

## Family-resemblance verdict

**Two families plus a doc site — not one product.** The set genuinely shares two of the four pillars: control geometry (4px control / 8px panel radius on all three product pages — 47+13 uses in engine, `.tab/.chip` 4px in wiki, `.btn` 4px in pitch) and hairline discipline (one 1px token, contrast 1.22–1.46:1 on every surface — pitch 1.31, engine 1.25/1.41, wiki 1.46, gallery 1.37). It breaks the other two:

- **Label voice**: wiki/pitch/gallery use mono + `--typography-tracking-eyebrow` (0.16em); engine uses **sans** uppercase at 0.04/0.05/0.06em (10 literals, 0 token refs), with mono only inside prompt code rows. Engine's chrome therefore reads as a different app, not a different surface.
- **Colour-as-state**: only pitch holds "one accent". Wiki carries teal (7 declarations) + amber (30 declarations, incl. SVG figure fills); engine carries `--acc` #E8830C (4 declarations, **0 sampled pixels** on the default 1440 screen) + `--sel` #FFD60A which is what actually renders (sidebar rail, bbox 8,78→220,120). Engine's visible identity colour comes from the `color.pro-*` group, which the gallery files as "reference language" — i.e. the canvas tool is painted from a palette the system has not claimed for it.

And the surface that is supposed to *define* the shared language, `design-system/index.html`, documents controls that do not ship (see E-P0-1): its consistency matrix asserts 99px pill buttons where the product renders 4px, and 12/14/10px panels where the product renders 8px.

## Per-page scorecard

| Page | Hierarchy & type | Spacing & rhythm | Colour & contrast | Surfaces | Controls | States | Density / resp. | System consistency |
|---|---|---|---|---|---|---|---|---|
| index (wiki) | **FAIL** 10 sizes/screen; nav 16.8 > body 15; 15 vs 15.2 collision | at-risk 40px rhythm good, header cluster 36/34 | **FAIL** dark `.eng` 2.05:1; amber text 3.87:1; 2 hues | pass card + 1.46:1 hairline, 8px panels | at-risk pager r=8 among r=4 | at-risk focus ok, hover 4/28, 0 disabled | at-risk 390 rails scroll w/o cue; 4 chrome rows | **FAIL** two accents, body 15px literal |
| pitch | pass hero 49.6 / h2 21.6 / body 15; 10 sizes but one ramp | at-risk 4 heights: 46/31/27/22 | **PASS** champagne only, 9.6:1, 27/27 pairs | at-risk 1.22:1 hairline + 3.49 L\* step | pass r=4, 46px, clear primary/ghost | at-risk hover 8 rules, no disabled, hover snaps | pass 390 single column, 44px coarse-pointer guard | at-risk literal tracking .14/.10em, literal font-family |
| engine | at-risk app bar h1 16.8 vs nav 13.6; canvas lanes truncate | pass 5 sizes, 44/40 on scale | at-risk 2 palettes, accent invisible | **PASS** 8.35 L\* ladder, 2 hairline steps | at-risk 44 vs 40 in one bar | **PASS** 43 hover / 9 focus / 4 disabled | **PASS** 390 folds to bottom sheet, no page overflow | **FAIL** label voice + pro palette |
| gallery | pass 49.6/20/13.6; 12 sizes is fine for docs | pass consistent 3-col grid | at-risk 2 fails (badge 4.25, dev 3.68) | at-risk 8 radii ladder, product uses 4 | at-risk 15 <40px (14 are 30px specimen buttons) | **PASS** live hover/focus/disabled specimens | at-risk 21 361px tall; matrix scrolls at 390 | **FAIL** matrix contradicts shipped CSS |

## Cross-surface matrix

| property | wiki | pitch | engine | gallery | should be |
|---|---|---|---|---|---|
| Body type / leading | 15px / 1.6 | 15px / **1.7** | 15.2px / 1.6 | 15.2px / 1.7 | one body size+leading token (1.6); deck may keep 1.7 only as a tokenised variant |
| Distinct sizes (1440/390) | 10 / 10 | 10 / 11 | 5 / 6 | 12 / 12 | 5–6 per surface, one shared ladder |
| Control radius | 4px (0px section tabs, **8px pager**) | 4px (0px tabs) | 4px (47×) | specimens 9999px / 4px | 4px control, 0px text-tab, 8px pager→4 or declared |
| Panel radius | 8px | 8px | 8px (scene objects 4px) | 8/10/12/14/18 | 8px; ladder steps need a consumer or deletion |
| Control height | 40 (45 tabs, 38 pager, 36/34 header, 28 copy) | 46 (31 TOC, 27 export, 22 header) | 44 (40 secondary) | 40/44/35/30 | 44 primary, 40 secondary, 32 compact; 4 heights max |
| Hairline | 1px token | 1px token | 1px token, 2 strengths (32 strong / 11 base) | 1px token | 1px, one strength for containers vs controls |
| Hairline contrast | 1.46 (card) / 1.39 (dark) | 1.31 / **1.22 on card** | 1.41 base / 1.73 strong | 1.37 | ≥1.35, one value band |
| Surface step (ΔL\*) | 2.52 light / 4.04 dark | 3.62 / 3.49 | **8.35** / 5.79 | 2.52 | 4–5 L\* first step everywhere |
| Accent | teal #0B5D66 + amber #B86A00 | champagne #C8B28A (9.6:1) | rendered #FFD60A; token #E8830C unrendered | none (docs) | one accent = state/selection/primary |
| Label voice | mono upper 0.16em | mono upper 0.14/0.16em | **sans upper 0.04–0.06em** | mono upper 0.16em | mono upper, one tracking token |
| Nav / chrome | sticky head + search + step rail + tabs (4 rows) | sticky head + left TOC rail | app bar + chapter bar | header + left section rail | rail for section nav; 1 sticky row max on read surfaces |
| Footer | tip line + `<footer>` | brand + links `<footer>` | **no `<footer>`** (help strip) | generated line | every surface closes with one hairline + 11–13px muted line |
| Container / gutter @1440 | 980 / x=250 | 1080 / x=199 | full-bleed | 1100 / x=170 | role-based max-width, one page-gutter token |
| Motion | 34 token-duration refs | 6 refs (hover snaps) | 31 refs + literals | 44 refs | token durations on every hover |

## Defects — ID | Sev | Page | Evidence | Fix | Acceptance

| ID | Sev | Page | Evidence (shot + measured) | Fix (token/component) | Acceptance |
|---|---|---|---|---|---|
| E-P0-1 | P0 | gallery | Consistency matrix (g-matrix crop 60,14340→1400,14660; `index.html:1236-1250`) states wiki/pitch buttons `--radius-pill` "99px", wiki `.panel` "12px radius-card", pitch `.card` "14px radius-lg", engine "6/7/9/12px drift". Shipped computed radii: wiki `['0px','4px','8px','50%']`, pitch `['4px','8px']`, engine `['4px','50%']`. `.tab/.chip` = `--radius-xs` (4px), `.panel` = `--radius-sm` (8px), pitch `.btn` = `--radius-xs`. 5 of 6 rows false while the same page computes `--js-token-count` = 229 correctly | compute the matrix at render from `getComputedStyle` on the real selectors; delete the five stale cells and the pill-button specimen | gallery 1440 + 390, light |
| E-P0-2 | P0 | engine | `engine-1440.png`; `:root` aliases (`engine.html:10-28`) map `--bg/--panel/--ink/--mut/--border/--sel` onto `--color-pro-*` (74 consumers); `--color-engine-accent` #E8830C has 4 consumers (all off-canvas: drawer/modal/toast) and **0 sampled pixels**; visible rail+selection = #FFD60A at bbox 8,78→220,120. Labels: 10 sans-uppercase rules at 0.04/0.05/0.06em vs mono+0.16em on the other three | re-point the alias block to `color.engine.*` (#0E1116 / #161B22 / #262D38) and make #E8830C the rendered primary; label selectors → `--typography-family-mono` + one `--typography-tracking-label` | engine 1440 + 390 catch-up shots |
| E-P1-1 | P1 | wiki (dark) | `index.html:16` `.eng{color:var(--neutral)}` on `--acc` #5CC4D0 = **2.05:1** (light theme 9.6:1 on #0B5D66). Same pattern `.badge` (:50) and `.yt span` (:58): white on `--amb` #F0A648 = 2.05:1. `w-header-dark-1440` crop (1000,20→1230,85) | add `--color-wiki-light-accent-ink:#FFFFFF` / `--color-wiki-dark-accent-ink:#0E1213`, consume as `--acc-ink` in `.eng/.badge/.yt span` (pitch and engine already have accent-ink tokens) | index-dark 1440 + 390 |
| E-P1-2 | P1 | wiki, engine | wiki header: `pitch →` 75×**36** @y38 vs `engine →` 84×**34** @y39 (2px height, 1px baseline). Engine chapter bar: `+chapter` 82×**44** @y77 vs `☰ Scenes (3)` 104×**40** @y79. Crops `w-header-1440` (960,20→1230,85 ×2), `e-chapterbar-1440` (140,60→1440,135) | one height per cluster (`--touch-preferred` 44 / `--touch-min` 40) applied to the whole row; align on `align-items:center` | 1440 crops of both bars |
| E-P1-3 | P1 | wiki | pager `← Prev` 78×38 r=**8px** @y1405 while every other wiki button is r=4 (tabs, chips, header links, Copy 55×28). `w-pager-1440` (490,1330→1200,1450) | `.nav button` `--radius-sm` → `--radius-xs` | index 1440 card crop |
| E-P1-4 | P1 | pitch | four interactive heights on one page: tabs/buttons 46, TOC rows **203×31** @x216, export cluster **58×27** @y458 with **11.52px** text (smallest text in the set), header links 22. `p-export-1440` (190,430→430,500 ×2.2) | TOC 31→36 (or 40 on coarse), export 27→32 min-height and 11.52→12.8px | pitch 1440 + 390 |
| E-P1-5 | P1 | wiki | `.step` labels **16.8px** vs body 15px = 0.66 × h1 25.6px; set ratios: pitch 13.6/49.6 = 0.27, engine 13.6/16.8 = 0.81, gallery nav 11.52/49.6 = 0.23. `w-tabs-1440` (240,190→1175,320) | step rail → `--typography-size-body` 15.2px + weight 600 so nav sits below the card title (20px) | index 1440 + 390 |
| E-P1-6 | P1 | pitch | card border `#26262B` on `#141416` = **1.22:1** plus surface step **3.49 L\*** → cards read as the page. Compare wiki 1.46:1/2.52 L\*, engine 1.73:1/8.35 L\*. `p-cards-1440` (440,300→1120,700) | raise `--color-pitch-rule` to ≈#33333A (1.5:1 on `--surface-1`) or lift `--surface-1` one step; keep the token so all 15 card borders move together | pitch 1440 + 390 |
| E-P1-7 | P1 | wiki | two chromatic roles: `var(--acc)` 7 declarations, `var(--amb)` 30 — amber fills diagram SVG figures (`index.html:230,233,264`) and the callout rule; sampled amber bbox 518,656→872,1288 on `index-light-1440.png` | keep amber only for the note/callout (`--color-wiki-*-amber` = annotation), move figure fills to `--color-wiki-diagram-fill` + muted ink | index light+dark 1440 |
| E-P1-8 | P1 | wiki, pitch | 10 distinct rendered sizes per screen (wiki 11.2/12/12.8/13.6/15/15.2/16.8/20/22/25.6) with four inside 2.4px (11.2–13.6); body declared `15px` literal while UI uses `--typography-size-body` 15.2px → both 15 and 15.2 render on the same page | drop 11.2 (`.7rem` → `--typography-size-eyebrow` 11.52 or `--typography-size-timecode` 12); body → `var(--typography-size-body)`; merge 22 into 21.6 | index + pitch 1440 |
| E-P2-1 | P2 | gallery | renders 6 radius steps (4/8/10/12/14/18) + pill; product consumers: `radius-lg` 0, `radius-card` 0, `radius-xl` 0, `radius-md` 1 (engine) | delete or adopt the three unconsumed steps in `tokens.json`; add a "consumers" column to the radius ladder | gallery 1440 |
| E-P2-2 | P2 | engine | 32 borders on `--border-strong` (1.73:1) vs 11 on `--border` (1.41:1); wiki/pitch use one strength for containers and controls | reserve strong for focus/selection edges only, or keep as `--border-control` (named, governed) | engine 1440 |
| E-P2-3 | P2 | wiki | 4 `:hover` rules for 28 interactive elements; `.tab,.chip` declare 3-property transitions with no hover/active state (dead transition) | add `.chip:hover{background:var(--bg)}` + `.tab:hover{color:var(--ink)}` | index light+dark 1440 |
| E-P2-4 | P2 | pitch, all | 7 duration tokens (0.16–0.32s) for one hover idiom; pitch has 6 transition decls so TOC/btn/tab hover snaps while wiki fades 200ms | add hover transitions to pitch `.toc a/.btn/.tab-btn`, collapse durations to instant/hover/slow | pitch 1440 |
| E-P2-5 | P2 | pitch, engine | `font-family` hardcoded `system-ui,-apple-system,"Segoe UI",sans-serif` (pitch :23, engine :32) while index/gallery use `var(--typography-family-sans)`; 0 `@font-face`, 0 webfonts — all four surfaces are system sans | consume the family token on both pages | computed `ff` identical on all four |
| E-P2-6 | P2 | all | containers 980/1080/1100 + full-bleed; gutters x=250/199/170 @1440; pitch `.w{padding:0 1.2rem 4rem}` (19.2px) vs wiki `var(--spacing-20)` (20px) | role-based max-width is fine; page gutter → `--spacing-20` literal-free | 1440 all four |
| E-P2-7 | P2 | engine | default canvas lanes ≈70/70/514px so 2 of 3 headers truncate (drawing code adds "…" at `engine.html:815`, so the ellipsis is present — the earlier "clipped without ellipsis" reading is wrong) | default lane width from a token; equal first-lane widths | engine 1440 |
| E-P2-8 | P2 | wiki (light) | `--amb` #B86A00 as text at 12.8px on #F8F8F4 = **3.87:1** (metrics 4.12 own-bg approximation) | darker amber text token (#8E5200 ≈ 5.2:1) or bump to 13.6px/600 | index light 1440 |
| E-P2-9 | P2 | gallery | @390 the 640px matrix and the section-nav row scroll horizontally with no affordance (25 elements past 390, all inside `.matrix-wrap`/nav `overflow-x:auto` — not page overflow); measured page 21 361px tall | add scroll shadow/`mask-image` edge cue and a sticky first column on the matrix | gallery 390 |
| E-P2-10 | P2 | engine | no `<footer>` element (wiki/pitch/gallery each have one); its help strip is 11px mono vs pitch footer 12.8px sans | `<footer>` with the same hairline + `--typography-size-meta` muted voice | engine 1440 |

## What must stay distinct

- **Accent hue per surface.** Champagne (deck), teal (wiki), a single warm signal (engine) are three different state colours by design. Do not unify the hex; unify the *rule* (one accent, state/selection/primary only, always paired with an accent-ink token).
- **Base temperature and depth.** Pitch's warm #0A0A0B and wiki's cool #0E1213 are a deliberate pair; engine's neutral #0B0B0D is a third. Engine's stronger ladder (8.35 L\*) is correct for an operating surface — it must not be flattened to pitch's 3.5.
- **Type scale ceilings.** h1 49.6 (pitch) vs 25.6 (wiki) vs 16.8 (engine app bar) is hierarchy for three different jobs. Only the *ratio between nav and content* should be reconciled (E-P1-5).
- **IA/chrome.** Wiki's horizontal step-rail + sidebar list (3-level browse), pitch's left TOC rail (linear narrative), engine's icon rail + canvas (workspace). Nav *shape* differs legitimately; nav *type and height* should not.
- **Density.** Engine's 5 sizes at 13.6/15.2 in a 44px control grid is right for an app; wiki's card at 15/1.6 in a 700px measure is right for reading.

## Proposed reconciliation workstream (additive, ordered)

| # | Task | Files / selectors | Acceptance | Effort |
|---|---|---|---|---|
| 1 | Accent-ink tokens + consumers | `tokens.json` + regenerated `tokens.css`: `--color-wiki-light-accent-ink`, `--color-wiki-dark-accent-ink`; `index.html:16,50,58` | index light **and** dark 1440+390; dark `.eng` ≥4.5:1 | 1.5h |
| 2 | Fix the certification surface first (it gates everything else) | `design-system/index.html:1236-1250` matrix → render-time measurement; rebuild Button/Pill specimens to shipped 4px/8px/40-44px geometry; per-group counts → computed | gallery 1440+390 light; matrix cells match computed radii of the three pages | 3h |
| 3 | Engine palette re-point | `engine.html:10-28` alias block → `--color-engine-*`; decide `color.pro` fate (delete or rename `engine.pro` and document it); `--acc` → primary action (`+scene`, `#goShot`, toast) | engine 1440+390; sampled accent pixel = #E8830C; gallery Pro group relabelled | 3h |
| 4 | Label voice unification | engine label selectors (`.proj-codes-h`, `.proj-code-tok`, `.edithead .pmtitle`, `.pm-nav .pmtitle`, `#editPanel .subh`, `#assetList .ah`, `#assetPanel .ah`, `.men-grp`, `.modal .subh`, `.modal .subh`) → `--typography-family-mono` + new `--typography-tracking-label` (0.10em dense, 0.16em prose); pitch literals `.14em/.1em` → same tokens | 1440 crops of engine drawer + asset panel next to a pitch card; one tracking value per role | 2.5h |
| 5 | Control geometry pass | wiki: `.nav button` → `--radius-xs`, header cluster to one 40px height, `.step` font 16.8→15.2/600; pitch: TOC 31→36, `.expbtn` 27→32 + 12.8px text; engine: `#chapterbar` row → one height | index/pitch/engine 1440+390; height histogram ≤3 families per page | 2.5h |
| 6 | Separation floor | pitch: `--color-pitch-rule` → ~#33333A **or** `--color-pitch-surface-1` +1 step; wiki light card step 2.52→~4 L\* via `--color-wiki-light-bg` #F4F4EF | pitch cards visible as cards in a 1440 crop at 100% and in a 50% downscale | 1h |
| 7 | Type-scale cleanup | wiki `.7rem`, `22px`, `font:15px` body → tokens; pitch `.9rem/.62rem` → tokens; add `--typography-tracking-*` consumers | distinct-size counts ≤6 wiki/pitch, all token-derived | 1.5h |
| 8 | Chrome/footer parity | engine `<footer>` help strip at `--typography-size-meta`; gallery dark theme decision (currently aliases the **pitch** palette, `index.html:24-25`, so "dark" resolves to two different bases) | engine 1440; gallery dark 1440 sampled vs wiki dark | 1h |
| 9 | States + motion floor | wiki `.chip/.tab` hover; pitch hover transitions; 7 durations → 3 tokens (instant/hover/slow) | hover/focus/disabled crops per surface | 1.5h |

Order matters: **1 → 2 → 3 → 4** (tokens, then the page that certifies them, then the palette, then the voice). Tasks 5–9 are parallel-safe per page and file-disjoint. Every task ships the same acceptance set: 1440 + 390, wiki in **both** themes (`--force-color-profile` fixed, scheme via `Emulation.setEmulatedMedia`, theme asserted by corner-pixel sum).

## Still uncertain

- **Pitch's 30px tabs / 31px TOC** are guarded by `@media(pointer:coarse){min-height:44px}` (`pitch.html:219-222`), so the measured 30px is a fine-pointer capture, not necessarily a phone failure. Reported as E-P1-4 only because the fine-pointer case (laptop touchpad/touchscreen) still renders 27px export buttons — those are **not** covered by the coarse-pointer rule.
- **Engine contrast**: metrics reports 0 failing pairs, but its sampler skips canvas-drawn text (scene/board labels are `ctx.fillText`), so canvas label contrast is unverified.
- **Engine `.tools` and `#side` mobile overflow** ("Cast" at right=451) sits inside `overflow-x:auto` rails — intentional scrollers, not page overflow; not counted as a defect.
- **Gallery "6 tokens vs 8 swatches"** from the first vision pass is **wrong** — scripted count of `.sw` per group matches every header (18/8/8/15/19/21/10/4/9). Discarded, as is "no ellipsis" on engine canvas labels (the drawing code appends "…").
- **`--typography-size-ui` (1rem) and `--typography-size-lede` (1.05rem)** have 2–3 consumers each and produce the 16 vs 16.8 pair; unclear whether one is meant to be retired — needs an owner decision, not a gate.
