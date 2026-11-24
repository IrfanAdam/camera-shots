# Lane B — Components

Source of measurements: `c-*-1440/390.json` (computed styles + every CSS rule), `x-*.json` (focusables), `metrics.md`. Line refs are the page's inline `<style>` in `index.html` / `pitch.html` / `engine.html` / `design-system/index.html`. All widths in px at 1440 unless stated.

## Verdict

The system has **tokens and specs but no component layer**. Zero selectors are shared between the four files: the pages implement buttons four ways (`.eng`, `.btn.primary`, `.tools button`, `#addNode`), and `design-system/index.html` ships a **ninth vocabulary** (`.btn--primary`, `.field`, `.tool`, `.sheet`) that no product page consumes — 9 specimens, 0 product usages, and 3 of them (`.field`, `.field.is-error`, `.sheet`) exist only as documentation of behaviour the product does not have. What is shared is a *geometry habit*: 4px control radius on 84% of controls and 1px hairlines everywhere, which is why the three surfaces still read as one product.

Two P0 defects sit under that: **no dialog semantics or focus trap anywhere** (`aria-modal` only on pitch's two drawers, 0 `inert`, 0 trap helper) and **the toast is a silent `<div>`** (`engine.html:480`, no `role=status`/`aria-live`) so the only Undo affordance is announced to nobody. Both are cheap to fix and neither needs a rewrite.

The component layer is worth building because the forks are *accidental*, not expressive: three primary heights (34/46/44), three filter radii (4/9999/9999), six secondary heights (28–46), two switches (6.4rem×23 vs 34×19), seven popovers with three shadows. Only pitch's 46px reading density and engine's 44px touch density are legitimate surface expression. Verdict: **consolidate onto one `ds-` component set with density-varied heights and per-surface accent variables; keep all three IAs.**

## Component register table

| # | Component | Pages / instances | Implementing selectors | Variants | States | Measured geometry | Token vs literal |
|---|---|---|---|---|---|---|---|
| 1 | Primary button | wiki 1 (`.eng`), pitch 12 (4 primary), engine 6 (`#addNode`,`#addScene`,`#goShot`,`#toastBtn`,`#drawerAddImg`,`#projClose`) | `index.html:16`; `pitch.html:99`; `engine.html:48,64,69,108,207` | accent-fill (pitch/wiki/toast), text-inverse-fill (engine canvas: `#addNode` bg rgb(245,245,247)) | hover only; **no disabled, no loading, no focus token** (inherits global 2px outline) | wiki 84×34; pitch 156×46; engine 44 tall | wiki/pitch 100% token; **pitch `font-size:.9rem` = 14.4px has no token** (`pitch.html:98`) |
| 2 | Secondary / outline button | wiki 3 cls (`.pitch`,`.nav button`,`.token button`), pitch 5, engine 12+ | `index.html:18,41,44`; `pitch.html:98`; `engine.html:39,92,114,133,205,291` | outline, quiet, icon+label | hover border→ink/text-secondary; engine `:disabled{opacity:.35}` (`engine.html:42`) | heights 28,36,38,40,44,46 | engine `opacity:.35` literal duplicates `--opacity-disabled` |
| 3 | Ghost button | pitch `.btn.ghost` ×5 | `pitch.html:100` | — | — | 176×46 | **dead modifier**: base `.btn` already sets `transparent` bg + `--ink` colour, ghost re-declares both |
| 4 | Icon button / close | pitch 3 `.hicon`; engine 5 (`#drawerX`,`#cardMenuBtn`,`#drawerMenuBtn`,`#dots`,`#zoomCtl button`) | `pitch.html:46`; `engine.html:86,107,315,317` | square r4, circle r50% | hover border only | `.hicon` 40×40 (0×0 on desktop — `min-width:901px{display:none}` `pitch.html:20`); `#drawerX` 44×44; `#dots` 39×44; `#drawerMenuBtn` 35×40 | `#drawerX` declares 32px then 44px in a **second rule** (`engine.html:86` vs `:315`) |
| 5 | Destructive button + arm | engine 4 | `engine.html:36,115,128,293` | outline danger, filled-on-hover, `.armed` filled | armed 2-tap | 44 tall, fs 12.8 | 4 hand-rolled copies; no wiki/pitch equivalent |
| 6 | Export control | pitch 8 (3 `.hicon` mobile, 3 `.expbtn` side, 2 `.dpill` drawer) | `pitch.html:64,150` | icon-only, labelled, drawer | hover colour+border | 58×27 / 65×27 / 63×27 | eyebrow token; **27px < `touch-min` 40** |
| 7 | Document tabs | pitch `.tab-btn` ×4; wiki `.tab` ×n | `pitch.html:53`; `index.html:26` | dot+underline (pitch), filled pill (wiki) | hover ink, active `.tab-active`/`[aria-selected]` | pitch 40×46 (30 tall at 390); wiki 84×40 | dot `5px` literal twice (`pitch.html:57, 152`) |
| 8 | Step / section rail | wiki `.step` ×7 (STEPS, `index.html:269`); pitch `.toc a` ×9; pitch `.mrail a`; engine `#side button` ×5, `#projNav button`, `#pmNav button` | `index.html:52`; `pitch.html:45`; `engine.html:102,161,220` | underline (wiki), dot (pitch toc), filled pill (mrail), left-bar (engine) | `.on` class everywhere | wiki 42×45…125×45; pitch toc fs 12.8; engine 44 tall | `#projNav`/`#pmNav` rules are **byte-identical duplicates** (`engine.html:161` vs `:220`) |
| 9 | Filter chip / pill | wiki `.chip` rows ×10; pitch `.pill` ×4; gallery `.pill` ×3 | `index.html:26`; `pitch.html:177`; gallery `:132` | row (wiki 230 wide), filter (pitch 9999), pressed (gallery) | active fill; gallery `aria-pressed` | wiki 230×40 r4; pitch r9999 pad 6/14 fs12.8; gallery 40h pad 0/16 | 3 radii for one purpose; **`.chip` is a list row, not a filter** — name collision |
| 10 | Search input | wiki 1; engine 1 (`#menFilter`) | `index.html:23`; `engine.html:250` | — | focus border; **no clear button, no empty state hook** | 846×40 pad 8/14 | token-only |
| 11 | Text field | engine 3 (`.tin`, `.modal .tin`, `.code-row input`); gallery `.field input` (**0 product uses**) | `engine.html:238,272,185`; gallery `:139` | 44h form, 28h mono code | focus border ink; **no error, no helper in product** | 44 / ~34 / 128 wide | gallery `.field.is-error` (`:436`) is docs-only |
| 12 | Select | engine 5 | `engine.html:43,132,199,230,174` | inline, modal, token-row, editor | hover border; `:disabled{opacity:.5}` (`:176`) | heights 44, ~34, ~28; fs 13.6/12.8/12 | 5 selectors, 3 heights, 3 font sizes |
| 13 | Switch | pitch `.fxswitch`; engine `.sw` | `pitch.html:156`; `engine.html:189` | labelled INR/USD vs bare toggle | `aria-checked` vs `:checked` | 6.4rem×23 vs 34×19 | neither in components.md |
| 14 | Table | wiki `table.map`; pitch `.tbl` ×6; gallery `.matrix` | `index.html:45-49`; `pitch.html:130-134`; gallery `:185` | borderless + hairline rows vs boxed + header fill | no sort, no empty row (wiki injects `<td colspan=4>No matches.</td>`) | th pad 6/8 vs **12/14** (2× density); td 6/8 vs 12/14 | both token-only |
| 15 | Card / panel | pitch `.card` ×41, `.metric`; wiki `.panel`; gallery `.card`,`.panel`; engine `.proj-tok` | `pitch.html:103,124`; `index.html:32`; gallery `:446,461`; `engine.html:170` | content, metric, surface | hover only on linked cards | r8 pad16/18 (pitch), r8 pad20 (wiki), **r14 pad24** (gallery), r8 pad8/10 (engine) | radii 8 and 14 both "card" |
| 16 | Drawer / sheet | pitch 2 (`#fund-drawer`,`#plan-drawer`); engine 1 (`#drawer` 360), 1 (`#editPanel` 560) | `pitch.html:144,147,148`; `engine.html:82,86,208` | right sheet 720, right panel 360, second panel 560 | open translate, body lock | pitch pad 25.6, `role=dialog aria-modal`; engine no role | pitch `1.6rem` literal has a lint-allow comment (`pitch.html:144`) |
| 17 | Dialog / modal | engine 2 (`#projModal` 880, `#assetModal` 600, `.modal .box` 560) | `engine.html:135,141,281` | right-side sheet vs centered box | open/closing animations | 880 / 600 / 560 wide; **no `role=dialog`, no `aria-modal`, no trap** | 3 widths, 1 class `.modal` |
| 18 | Menu / popover | engine 7 (`#menuDrop`,`#cardMenu`,`#drawerMenu`,`#menDrop`,`#assetPanel`,`#arrowpick`,`#refPop`) | `engine.html:58,110,153,243,88,19`; `:296` | context menu, combobox, listbox, ref card | hover bg; `.on` inset bar (`:248`) | r8 pad 4/5/6; min-w 150/170/220; `#refPop` r10 (only md radius in engine) | 7 popovers, 3 shadows (`popover`,`sheet`), 0 `aria-activedescendant` |
| 19 | Toast | engine `#toast`; gallery `.toast` | `engine.html:62`; gallery `:167` | action only ("Undo") | autodismiss (JS) | engine r8 bottom 56; gallery 440×58 r10, `role=status` | **engine toast has no role/aria-live** |
| 20 | Badge / tag | wiki `.badge` ×4 tiers; pitch `.draft` ×3; engine `.tchip`; gallery `.badge` ×3 | `index.html:50`; `pitch.html:85`; `engine.html:234`; gallery `:496` | tier badge, draft stamp, pill chip, status | none | wiki mono 800 pill pad2/10; gallery sans 700 pad2/8; pitch dashed r4 pad4/12 | 4 components, 3 radii, 2 families |
| 21 | Eyebrow / kicker | wiki `.k`; pitch `.k`,`.eyebrow`; engine `.proj-code-tok`,`.edithead .pmtitle`; gallery `.card .eyebrow` | `index.html:36`; `pitch.html:84,92`; `engine.html:181,213` | mono uppercase, boxed | — | `.7rem` (11.2) vs `eyebrow` token (11.52) vs tracking .05em | wiki size literal diverges from token by 0.32px |
| 22 | Empty state | engine 5 + wiki inline | `engine.html:66,100,188,249,295`; `index.html` map rows | dashed panel, italic line, italic cell | — | pad 6–14, 3 text styles | **6 treatments, 0 shared class** |
| 23 | Pager | wiki 1 | `index.html:40,41` | prev/next + counter | hover | 78×38, 79×38 | **38 < `touch-min` 40** |
| 24 | Copy / token row | wiki `.token` + `.map td button`; engine `#copyStub` + `#promptBtnRow` | `index.html:42,44,49`; `engine.html:116,132` | inline row, floating row | hover | copy 55×28 (wiki), 44 tall (engine) | wiki 28px action inside a 46px row |
| 25 | Progress / bar | pitch `.track/.fill`, `.gtrack/.gbar` | `pitch.html:139,140,152,153` | 8px allocation, 10px gantt, ghost | — | 8 vs 10 tall | two heights for one idea; no indeterminate |
| 26 | Tooltip | pitch `.ftip` (chart only) | `pitch.html:173` | hover readout | `.show` toggle | `z-index:5` literal (lint-allowed) | **no `role=tooltip`, no page-wide primitive** |
| 27 | File picker | engine 2 | `engine.html:269,447,448` | image, json | — | 4×4 fixed −9999px | tabbable 4×4 inputs count as under-40 targets in `metrics.md` |
| 28 | Skip link | **0** | — | — | — | — | absent on all four pages |

## Divergence matrix (measured)

| Same purpose | Where | Measured difference | Legit or accidental | Sev |
|---|---|---|---|---|
| Primary action height | wiki `.eng` 34 · engine `#addNode` 44 · pitch `.btn.primary` 46 | 3 heights; 34 and 46 are off the 40/44/48 target scale | **accidental** — pitch 46 is a legit reading density, 34 is not on scale | P1 |
| Primary hover lift | `.eng` `brightness(1.1)` `index.html:17` · `.btn` 1.08 `pitch.html:101` · gallery 1.06 `:382` | 3 lifts for one affordance | accidental | P2 |
| Primary fill role | accent (pitch/wiki/toast) vs `--color-pro-text-primary` white (engine `#addNode`, `#addScene`, `pitch.html` n/a) | Engine uses text-inverse fill, not accent, for create actions | **legit** (accent is reserved for selection in canvas) — codify as `--ds-accent` per surface | — |
| Secondary heights | 28 (`.token button`) · 36 (`.pitch`) · 38 (`.nav button`) · 40 (`#assetBtn`) · 44 (`.tools button`) · 46 (`.btn`) | 6 heights | accidental | P1 |
| Icon-button shape | `#drawerX` 44 r50% · `#cardMenuBtn` 44 r4 · `#dots` 39×44 r4 · `.hicon` 40 r4 | circle vs square, 40 vs 44, 35/39/44 widths | accidental (only `#drawerX` is a true circle by role) | P2 |
| Inputs | wiki `#search` r4 pad8/14 · engine `.tin` min-h44 r4 · `.modal .tin` pad6/8 · gallery `.field input` r8 pad0/12 | 3 radii/paddings for a text field; gallery's r8 is the only 8px input | accidental | P1 |
| Selects | 5 selectors, fs 13.6/12.8/12, heights 44/~34/~28 | same control, 3 sizes on one page | accidental | P1 |
| Switches | pitch 6.4rem×23 labelled `aria-checked` · engine 34×19 `:checked` | incompatible geometry and state API | accidental — and one is a segmented control, not a switch | P0 |
| Tabs | pitch `.tab-btn` dot + `aria-selected` + `.tab-active`; wiki `.tab` fill + `aria-selected`; wiki `.step` `.on` (no role); pitch `.mrail a` `.on`; engine `#side` `.on` | **4 selected-state mechanisms**: `aria-selected`, `.on`, `.tab-active`, `aria-pressed` | accidental (visual per-surface is fine; state API is not) | P0 |
| Tabs a11y | wiki `.tab` has `role=tab`; wiki `.chip` (same rule block `index.html:26`) has none; pitch `.tab-btn` has role but no `aria-controls` | half the tab sets are unexposed | accidental | P1 |
| Filter chips | wiki r4 · pitch r9999 · gallery r9999 | 2 radii; wiki's "chip" is a 230px list row | **legit split** (row vs filter) but needs two names | P1 |
| Cards | pitch r8 pad16/18 · wiki r8 pad20 · gallery r14 pad24 · engine r8 pad8/10 | 2 radii, 3 paddings | gallery r14 is a docs-only fork | P1 |
| Tables | wiki th 6/8 no fill · pitch th 12/14 + `--s2` fill · gallery `.matrix` | 2× density, header fill only in pitch | **legit** (pitch long-form vs wiki dense) — but mobile collapse differs (below) | P1 |
| Table mobile collapse | wiki `tr:first-child{display:none}` `index.html:70` · pitch `thead{display:none}` `pitch.html:511` | both drop column labels; no `data-label` on cells | accidental — same pattern, two implementations, both lose labels | P1 |
| Drawers | pitch 720 pad25.6 r0 + `.backdrop`; engine 360 + `#scrim`; sheet breakpoints **639** (`pitch.html:519`) vs **860** (`engine.html:1020`) | widths differ by design; breakpoints and scrims differ by accident | mixed: width legit, breakpoint/scrim accidental | P1 |
| Dialog semantics | pitch `role=dialog aria-modal=true` (`pitch.html:663`) · engine `#drawer`/`#projModal`/`#assetModal` **no role** (`engine.html:455,469,474`) | semantics exist on 2 of 5 overlay surfaces; `inert:0`, `trapFocus:0` repo-wide | accidental | **P0** |
| Dialog widths | engine 560 (`.modal .box`) / 600 (`#assetModal`) / 880 (`#projModal`) | 3 widths, 1 class | accidental | P2 |
| Menus | 7 popovers; shadows `popover` ×4 / `sheet` ×2 (`#cardMenu` `engine.html:110`, `#assetPanel` `:88`) | same layer, 2 shadows; padding 4/5/6; radius 8 except `#refPop` 10 | accidental | P1 |
| Toast | engine r8, shadow `sheet`, no role (`engine.html:62`) · gallery r10, shadow `popover`, `role=status` (`gallery:167`) | geometry *and* semantics diverge between product and its own docs | accidental | **P0** |
| Badge geometry | wiki pad2/10 mono800 · gallery pad2/8 sans700 · pitch dashed r4 pad4/12 · engine pad1/8 | 3 radii, 2 families, 3 paddings for "small status label" | accidental | P2 |
| Empty states | 5 engine variants + wiki inline cell | 0 shared class, 3 type styles | accidental | P2 |
| Pager | wiki only, 38px tall | under `touch-min`; no pager elsewhere (pitch uses TOC, engine uses rail) | accidental (single-use pattern) | P2 |
| Icon system | unicode `→ ← × ✕ ⋯ ☰ ⚙ ☾ ▶ ✓` (engine 9 `→`, 4 `⋯`, 3 `⚙`) mixed with inline `<svg>` in pitch `.hicon`/`.expbtn` | 2 rendering systems, no size token, no `role=tooltip` | accidental | P1 |
| Literal density | 27/373 decls wiki (7%) · 86/602 pitch (14%) · 195/1578 engine (12%) · 64/750 gallery (9%) | engine worst, all four above the 0% a gate would demand | accidental | P2 |

## Spec coverage matrix

| Bucket | Items |
|---|---|
| **Speced + implemented** | Doc Tabs (pitch dot, wiki underline), Cards (content/metric), Buttons (primary/secondary/danger-arm), Search/Filter Input, Drawers (geometry + scrim), Toast + Confirm Row (geometry only), Asset List Rows (`#assetPanel`, `#assetEditList`) |
| **Implemented, not speced** | Select (5 variants), Text field (`.tin`), **both switches**, all 7 menus/popovers, empty states ×6, pager, step rail (`.step`), nav rails (`#side`,`#projNav`,`#pmNav`), export cluster (`.expbtn`/`.dpill`), progress bars (`.track`,`.gtrack`), tooltip (`.ftip`), file picker (`.filehide`), theme toggle (`#theme`), gallery's own 9 specimens (`.btn--*`, `.pill`, `.field`, `.card`, `.panel`, `.tool`, `.badge`, `.toast`, `.sheet`) |
| **Speced, not implemented** | **Timeline Chips** (`grep -c timeline engine.html` = **0**; `#projModal` copy says "Frames only — video/motion is deferred", `engine.html:470`), **Transport Bar** (0 transport controls, 0 playhead), **Inspector Pills** (0 overlay pills), Doc-Tabs variant "wiki chip tabs" (chips carry no tab role), Drawer "focus-trapped / returns focus" (0 `inert`, 0 trap helper), Toast `role=status` |
| **Missing entirely** | icon system, tooltip primitive, loading/indeterminate progress, error state (gallery `.field.is-error` has 0 product consumers), skip link (**0 on all 4 pages**), segmented control (pitch `.fxswitch` is one, unspecced), breadcrumb, table sort + labelled mobile rows |
| **Stale spec content** | `components.md` describes a pro-editor timeline (chips/tracks/transport/inspector) the product deliberately deferred — that is ~4 of 10 specs describing absent UI; the quote block is implemented (`pitch.html:117-119`) but unspecced and **no display/quote family exists** (`tokens.css` has only `family-sans`, `family-mono`; 0 uses of `family-display`/`family-quote` on any page) |

## Missing primitives (ranked)

1. **Dialog/overlay behaviour** — `role`, `aria-modal`, focus trap, focus return, Escape, scroll lock. Needed by 5 shipped surfaces today. P0.
2. **Toast + live region** — needs `role=status`, `aria-live=polite`, variants (info/undo/danger), stacking rule. P0 (one exists, unannounced).
3. **Text field / select** — one field with label, hint, error, disabled, clear. 5 select forks prove demand. P1.
4. **Table** — one table with density switch, sticky header option, mobile `data-label` rows. 7 tables ship today in 2 dialects. P1.
5. **Menu/popover** — one positioned surface with `role=menu`, roving focus, Esc, outside-click; replaces 7 hand-rolled ones. P1.
6. **Icon system** — sprite + size tokens (`icon.sm/md/lg`) + `aria-hidden` convention; replaces 10 unicode glyphs and 2 SVG sets. P1.
7. **Empty/error state** — one block (icon, line, optional action) for 6 current variants. P1.
8. **Skip link + focus-managed page shell** — 0 today; wiki/pitch are long scroll surfaces. P1.
9. **Segmented control** — pitch `.fxswitch` is one; engine `.modal .tabs button` is another shape of the same. P2.
10. **Progress/loading** — allocate bar exists, indeterminate does not; engine has async image loads with no placeholder. P2.
11. **Tooltip** — chart-only today; needed wherever unicode glyphs carry meaning. P2.
12. **Pager / breadcrumb** — single wiki pager, under-size target. P2.

## Proposed library — structure, API conventions, migration mapping

**Layout (additive; pages link one CSS + one JS, keep their own `<style>` for page layout only):**

```
design-system/
  tokens.json / tokens.css     (existing; add control-height, icon-size, dot-size, hover-lift)
  components.css               NEW  ~12 blocks, 100% var(), no page-specific colour
  components.js                NEW  dialog/menu/tabs/toast/switch/field-clear behaviours (ES module, ~200 lines)
  icons.svg                    NEW  <symbol> sprite, 24 ids, currentColor
  components.md                EXTEND (retire the 3 deferred pro-editor specs to a "Deferred" section)
  index.html                   gallery: replace 9 specimens with the 12 canonical + states
```

**Naming (BEM block/element + attribute state):** block `ds-btn`, element `ds-btn__icon`, modifier only for variant/size/shape `ds-btn--primary`, `ds-btn--sm`, `ds-chip--pill`. **State is never a class**: `[aria-pressed]`, `[aria-selected]`, `[aria-expanded]`, `[aria-disabled]`, `[data-loading]`, `[data-armed]`. This kills the `.on` / `.tab-active` / `.active` family (4 mechanisms measured) in one rule: *if it is state, it is an ARIA attribute*.

**Per-surface accent without forking geometry:** a `[data-surface="wiki|pitch|engine"]` root sets `--ds-accent`, `--ds-accent-ink`, `--ds-bg`, `--ds-surface-1/2`, `--ds-rule`, `--ds-ink`, `--ds-muted`, `--ds-control-h`, `--ds-pad`. The gallery already proves this pattern (`design-system/index.html:359-365` `.stage[data-surface]`); promote it to the library and every component becomes surface-agnostic. Engine create-actions map `--ds-accent` to `--color-pro-text-primary` (preserves the canvas rule that accent = selection).

**Density instead of size forks:** `--ds-control-h` 34 (wiki compact) / 40 (default) / 44 (engine touch) / 46 (pitch reading). One `ds-btn`, no `--sm/--md` gymnastics; `--sm` only for the 28px inline copy action.

**Radius policy:** control 4 (`radius-xs`), field 4, card/panel/menu/sheet 8 (`radius-sm`), pill 9999 **only** for filter chips and badges. Gallery's `.btn` at `radius-pill` (`gallery:374`) is the only pill button in the system and documents a button no page ships — migrate it to 4 and keep `--shape="pill"` as an explicit opt-in.

**Migration mapping (selector → canonical → expected delta):**

| Surface | Current selector (file:line) | Canonical | Visual delta |
|---|---|---|---|
| wiki | `.eng` (16) | `.ds-btn.ds-btn--primary` | none (34px kept via density; hover 1.1→1.06) |
| wiki | `.pitch` (18) | `.ds-btn` | none |
| wiki | `.tab` (26) | `.ds-segmented__item` | none |
| wiki | `.chip` (26) | `.ds-row` (rows) | none |
| wiki | `.step` (52) | `.ds-tabs--underline` | none |
| wiki | `#search` (23) | `.ds-field .ds-input` | small: focus ring border + clear button |
| wiki | `#theme` (24) | `.ds-theme-toggle` | none |
| wiki | `.badge` (50) | `.ds-badge` | none (`--ds-badge-font: mono` per surface) |
| wiki | `.nav button` (41) | `.ds-btn.ds-btn--sm` | small: 38→40 |
| wiki | `.token button` (44) | `.ds-btn--primary.ds-btn--xs` | small: 28→34 (target compliance) |
| wiki | `table.map` (45) | `.ds-table--compact` | none desktop; mobile gains `data-label` |
| pitch | `.btn`/`.btn.ghost` (98,100) | `.ds-btn` | none; ghost deleted |
| pitch | `.btn.primary` (99) | `.ds-btn--primary` | none (hover 1.08→1.06) |
| pitch | `.tab-btn` (53) | `.ds-tabs--dot` | none; +`aria-controls` |
| pitch | `.hicon` (46) | `.ds-icon-btn` | none |
| pitch | `.expbtn`/`.dpill` (64,150) | `.ds-btn--quiet.ds-btn--xs` | 1px (27→28) |
| pitch | `.pill` (177) | `.ds-chip` | none |
| pitch | `.fxswitch` (156) | `.ds-segmented--labeled` | none |
| pitch | `.drawer` (144) | `.ds-sheet` | none + trap/label |
| pitch | `.tbl` (130) | `.ds-table--cozy` | none |
| pitch | `.track/.fill` (139) | `.ds-progress` | none |
| pitch | `.ftip` (173) | `.ds-tooltip` | none + `role` |
| engine | `.tools button` (39) | `.ds-btn` | none |
| engine | `#addNode/#addScene` (108) | `.ds-btn--primary` | none |
| engine | `#side button` (102) | `.ds-nav-item` | none |
| engine | `#projNav`/`#pmNav` (161,220) | `.ds-nav-item` | none (**2 rules → 1**) |
| engine | `.sw` (189) | `.ds-switch` | none |
| engine | `#drawer` (82) | `.ds-sheet--compact` | none + dialog semantics |
| engine | `#projModal` (141) | `.ds-dialog--end-sheet` | none + semantics |
| engine | `.modal .box` (137) | `.ds-dialog` | none |
| engine | 7 menus (58,110,153,243,88,19,296) | `.ds-menu` | 2px: `#cardMenu` shadow sheet→popover |
| engine | `#toast` (62) | `.ds-toast` | none visually; +`role=status` |
| engine | `#drawerX` (86) | `.ds-icon-btn--circle` | none (single 44px rule) |
| engine | `.tchip` (234) | `.ds-badge--pill` | none |
| engine | `.filehide` (269) | `.ds-file-input` | none; no longer a 4×4 tab stop |
| gallery | `.btn` (374) | `.ds-btn` | **medium**: pill→4px radius (docs begin matching product) |

## Proposed workstream — ordered tasks, files, acceptance, effort

| # | Task | Files | Acceptance check | Effort |
|---|---|---|---|---|
| 1 | Add missing tokens: `control-height.compact/default/touch/reading`, `icon.size.sm/md/lg`, `dot.size`, `hover.lift` | `design-system/tokens.json`, regen `tokens.css` | byte-identical re-run; gate green; page diff 0.000% | 0.5d |
| 2 | Write `components.css`: btn, icon-btn, field/select, chip, segmented/tabs, nav-item, card/panel, table, sheet/dialog, menu, toast, badge, empty, progress, tooltip | `design-system/components.css` (new) | 0 raw hex; 0 raw px outside 1px hairlines; every block renders at 4 densities in gallery | 1.5d |
| 3 | Write `components.js`: focus trap + return, Esc, scroll lock, menu roving focus, toast live region, tabs keyboard, field clear | `design-system/components.js` (new) | keyboard-only pass on gallery: Tab stays inside dialog, Esc restores focus, arrows move tabs, toast announced (VoiceOver) | 1d |
| 4 | Migrate wiki | `index.html` | `role=tablist` on both tab sets; `.step` gets `aria-current`; pager 40px; skip link added; diff ≤ declared deltas | 0.5d |
| 5 | Migrate pitch | `pitch.html` | `.btn.ghost` gone; 2 drawers trapped + labelled; export heights 28; print CSS unchanged | 0.5d |
| 6 | Migrate engine | `engine.html` | duplicate selectors 0 (from 8); `#drawer`/`#projModal`/`#assetModal` have role+modal+trap; toast `role=status`; `#cardMenu` shadow = popover | 1d |
| 7 | Gallery + docs | `design-system/index.html`, `components.md` | 12 specimens with hover/focus/disabled/error live; deferred pro-editor specs moved to a "Deferred" section; quote block specced or removed | 0.5d |
| 8 | Extend the gate | `scripts/*` | fails on duplicate selectors, on `aria-modal` without `role=dialog`, on raw literals in `components.css` | 0.5d |

Total ≈ 6 days, additive; no page IA or accent changes.

## Still uncertain

- Whether wiki's 34px controls are deliberate density or legacy. I assumed **density=compact**; if it is legacy, migration should snap to 40 and the visual delta becomes small-but-visible on every wiki button.
- Engine's white `#addNode` fill is either a deliberate "text-inverse primary" (my reading — it keeps accent for selection) or a missed accent mapping. Owner call; the library supports both through `--ds-accent`.
- The `.ftip` `z-index:5` lint-allow (`pitch.html:173`) implies tooltips are intentionally outside the z scale — promoting them into `ds-tooltip` needs a decision on a `--z-tooltip` step.
- I treated missing focus traps as a bug only where `aria-modal` is declared; engine may have chosen non-modal panels deliberately. If so, engine should drop `aria-modal` semantics from the plan and label the drawer `role=complementary`.
- Gallery pill buttons: migrating them to 4px makes docs truthful but visibly changes the gallery; keeping `--shape=pill` keeps the gallery stable and leaves the lie in place. I recommend migrating; flagged as a medium delta rather than "none".
- Component count (28) counts *roles*, not instances; a per-DOM instance count needs a fresh capture with every panel/drawer open (current captures measure 28 hidden interactives on engine at 1440).
