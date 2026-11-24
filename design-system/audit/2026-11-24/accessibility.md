# Lane D — Accessibility & Interaction

Scope: index.html (wiki), pitch.html, engine.html, design-system/index.html · WCAG 2.2 AA + APG · measured 1440/390/320, light + dark.
Method: axe-core 4.10.3 (`wcag2a/2aa/21aa/22aa/best-practice`), CDP AX tree, real Tab traversal (keyboard), scripted state probes (drawer/modal open), computed-style contrast with nearest-opaque-bg, target measurement. Raw: `ds-audit/a11y/*.json`, `axe/*.json`, `contrast/*.json`.
**Measured violation** = reproduced above. **Inferred risk** = code/semantics only, no runtime proof.

## Verdict per page

| Page | Verdict | Why |
|---|---|---|
| **wiki** | **FAIL AA** | Keyboard focus destroyed to `<body>` on every tab/chip activation; `role=tab` with zero `tabpanel`; 13 `aria-selected` on non-tabs; search named only by placeholder; no `header`/`nav`/`main`. Contrast fail in both themes. |
| **pitch** | **PASS with fixes (P1)** | Tabs/tabpanels/roving/arrows/`aria-controls` correct; switch + 2 live regions + dialog roles; all text contrast passes (290 nodes). Gaps: no `main`, drawer not trapped despite `aria-modal`, mobile rail links focusable while off-screen, 27–31 px targets. |
| **engine** | **FAIL AA (worst)** | Board is pointer-only (no keyboard path to the core task); 7 of 21 tab stops are invisible (closed drawer + hidden file inputs); both modals have no dialog semantics, focus move, trap or return; one unnamed combobox. |
| **gallery** | **PASS with fixes (P2)** | Best structure: `header`/`nav`[label]/`main`/`footer`, `aria-pressed` theme toggle, labelled Fields, 32/40 authored focus rings, live toast. Fails: 2 badge contrasts, non-focusable scroll table at 390, nav links rely on UA ring. |

## Findings

| ID | Sev | Page | WCAG SC | Evidence (file:line + measured) | Fix (token / component / behavior) |
|---|---|---|---|---|---|
| D-01 | **P0** | wiki | 2.4.3, 2.1.1 | `index.html:321-333` `draw()` replaces `#tabs`/`#list` `innerHTML` on every state change. Measured: focus chip → `click()` → `document.activeElement===BODY`; same for tab activation and `ArrowRight`. Every primary navigation action drops the keyboard user to document start. | Behavior: `renderRegion()` primitive that patches in place (keyed nodes) or captures `{key, index}` before render and restores focus after. One module `ds-focus-preserve.js` used by wiki + any future list UI. |
| D-02 | **P0** | engine | 2.1.1, 1.1.1 | `#cv` (`engine.html:446`) is a bare `<canvas>`, not focusable, no role/label/fallback; all editing is `pointerdown/move/up/dblclick/wheel` (`890,899,906,912,1117`). No `keydown` for node create/move/connect/select/delete anywhere. AX node: `role=Canvas, name=""`. | Behavior: canvas keyboard layer — focusable stage (`tabindex=0`, `role=application` + instructions), arrow-key node cursor, Enter=open, `N`=new, `Delete`=remove, `C`=connect mode; plus a DOM list view (`Scenes` already exists) as the accessible equivalent of every canvas operation. |
| D-03 | **P0** | engine | 2.4.3, 2.4.7, 4.1.2 | `#drawer` is hidden only by `transform:translateX(105%)` (`engine.html:82`); no `hidden`/`aria-hidden`/`inert`. Measured tab order (21 stops): 15 `#filePick` x=-9999, 16 `#assetImportPick` x=-9999, 17 `#drawerX` x=1764, 18 `#anchorVariant` x=1505, 19 `#anchorAssign` x=1584, 20 `#drawerMenuBtn` x=1767, 21 `#copyStub` x=1734 → **7 invisible stops**. | Component: `Overlay` primitive with `open`/`closed` states; closed = `hidden` + `inert` (or `visibility:hidden`), never transform-only. `#editPanel` already does this correctly (`239` `visibility:hidden`) — copy that pattern, don't invent one. |
| D-04 | **P0** | engine | 4.1.2, 2.4.3 | `#projModal`/`#assetModal` are `div.modal` (`469,478`): no `role=dialog`, no `aria-modal`, no `aria-labelledby`, no `tabindex=-1`. Measured: after `projBtn` click `activeElement=BODY`; Tab 1 goes to page link `← wiki` behind the scrim. `closeProjectModal()` (`1505`) returns no focus. | Component: one `Dialog` controller — `role=dialog aria-modal=true aria-labelledby`, focus first control on open, trap Tab/Shift+Tab, Escape closes, focus returns to invoker, background `inert`. Reuse for projModal, assetModal, and the `#drawer` sheet. |
| D-05 | **P0** | wiki | 4.1.2 | `index.html:92` `<div role="tablist">`; `327` emits 3 `role=tab` with no `id`, no `aria-controls`, no `tabindex` roving; `#panel` has no `role=tabpanel`. `330,333` put `aria-selected` on 10 `.chip` buttons (`role=button`) → **13 `aria-selected`, 0 tabpanel**. axe: `aria-allowed-attr` **critical** on every chip. Arrow keys on a focused tab change the *card*, not the tab (`348-352`). | Component: `Tabs` primitive (tablist + `aria-controls` + panel `role=tabpanel aria-labelledby` + roving tabindex + ←/→/Home/End). Chips become `ToggleButton` (`aria-pressed`) or `role=tab` inside their own tablist — never bare `aria-selected`. |
| D-06 | **P0** | engine | 4.1.2, 3.3.2 | `#chapterSel` (`446`) preceded by a bare `<span>Chapter</span>`; AX tree: `role=combobox, name=""` (empty). axe `select-name` **critical**. Name currently falls back to the option text `"CH-CHAP · Chapter 1"`, so it renames itself on change. (`#shotCh`/`#shotSc` are fine — wrapping `<label>` gives `chapter`/`scene`.) | Component: `Field` + `Select` — visible `<label for>` or `aria-labelledby` to the existing span id. One rule: no form control ships without a programmatic label; add to the adherence gate. |
| D-07 | P1 | wiki | 3.3.2, 1.3.1 | `index.html:91` `#search` has no `<label>`/`aria-label`; AX name = placeholder only (`"Filter this tab…"`, `labels.length=0`). Name vanishes once the user types; not a label. | Component: `Field` with a visually-hidden `<label>` + `.ds-sr-only` utility + `aria-describedby` for the hint the placeholder currently carries. |
| D-08 | P1 | wiki | 2.4.1, 1.3.1, 4.1.3 | No `<header>`, `<nav>`, `<main>` (only `<footer>`); axe `landmark-one-main` + `region` (6 nodes ≥). No skip link. Search result count (`#count`, `330/333`) and panel swap have **zero** live regions (`aria-live` count 0). Copy confirmation is a label swap `Copy → Copied ✓` (`296`) with no status. | Behavior/primitive: page shell (banner/nav/main/footer) + `.ds-skip-link` + one `announce()` helper (`role=status`, polite, 1 s debounce) reused for filter count, panel change and copy. |
| D-09 | P1 | wiki | 2.1.1, 1.1.1 | Video lessons are `<div class="yt">` click targets (`304-306`) with delegated click (`338`); not focusable, no role, no key handler. Play glyph `span` = white on `#F0A642` → **2.05:1** (dark theme). | Component: `MediaThumb` = `<button>` wrapping the thumbnail, `aria-label="Play: <lesson>"`, icon forced to `--color-on-accent` at ≥3:1 (1.4.11). |
| D-10 | P1 | pitch | 2.4.3, 4.1.2 | `#fund-drawer`/`#plan-drawer` are `role=dialog aria-modal=true` (`663,683`) with no trap and no `inert` background. Measured: Tab 24 escapes to header `a.brand`; 23 in-drawer stops before that. `role=dialog` on `<aside>` also trips axe `aria-allowed-role`. | Component: same `Dialog` controller (D-04). Use `<div role="dialog">`; trap + `inert` siblings; keep existing Escape + opener-restore (already correct at `770-791`). |
| D-11 | P1 | pitch | 2.4.3, 2.4.7, 2.4.11 | Mobile `#mrail` (`656`) is hidden by `transform:translate(±…)` on scroll (`~775`) but stays focusable: measured at 390 after 600 px scroll — rail top 857 > vh 844, link rect y=862, `focus()` succeeds. Off-screen tab stops on mobile. | Component: `ScrollHideRail` — after the hide transition set `inert` + `aria-hidden`; restore on show. Never hide by transform alone. |
| D-12 | P1 | pitch | 4.1.2 | `rect[data-m]` (`883`) are `tabindex=0` with `aria-label` but no role → axe `aria-prohibited-attr` (serious): name is discarded, so 18 focus stops announce nothing. | Component: `Chart` primitive — hit rects `role="img"` (or one focusable plot + roving index); keep the existing `focusin` tooltip (`950`). |
| D-13 | P1 | engine | 4.1.3, 2.2.1 | `#toast` (`480`, `showToast` at `648`) has no `role=status`/`aria-live`; auto-hides in 5 s with its **Undo** action and no pause on hover/focus. Confirmations (`Cleared canvas`, undo) are silent to AT. | Component: `Toast` = `role=status aria-live=polite` + `aria-atomic`, 10 s minimum, pause on hover/focus, Undo retained after message hides. |
| D-14 | P1 | engine | 2.4.3, 2.4.1 | No `<main>` (`#main` is a div, `441`); 3 `<nav>` (`#side`, 2× `.pm-nav`) with no accessible names → axe `landmark-unique`. 21-stop tab order with no bypass; heading order H1 → H3 (`#drawerTitle`, empty until a card opens) → H2. | Component: page shell with `<main>`; `aria-label` per nav (`Views`, `Prompt sections`, `Token groups`); drawer title = `h2` and only rendered when populated. |
| D-15 | P1 | engine | 4.1.4, 4.1.2 | `#dots` (`436`) opens `#menuDrop` (a `<span>`) with `onclick` (`1105`); no `aria-haspopup`/`aria-expanded`/`aria-controls`, children are buttons without `role=menuitem`, no Escape-to-close (global Escape at `915` omits it). `#cardMenu`/`#assetPanel` *do* manage `menuitem` + `aria-expanded` (`953,963,1811`) — same page, two contracts. | Component: one `MenuButton` primitive (disclosure or APG menu): `aria-haspopup/expanded/controls`, roving items, Escape + outside-click, focus return. Migrate `#dots` to the cardMenu implementation. |
| D-16 | P1 | gallery | 2.1.1 | At 390 `.matrix-wrap` (`401`) is `overflow-x:auto` with a 640 px table and no focusable content → axe `scrollable-region-focusable` (serious): keyboard users cannot scroll the consistency matrix. | Component: `.ds-scroll-x` = `tabindex="0" role="region" aria-label` + visible focus ring (add to tokens as `--focus-*` consumer). |
| D-17 | P1 | gallery | 1.4.3 | `span.badge--paid` white on `#8A5CF6` **4.25:1** (11.5 px, needs 4.5); `span.badge-dev` `#E5484D` on `#F8F8F4` **3.68:1** (8 instances, table + matrix). axe serious ×9. | Token: `--color-badge-*` ink/background pairs recomputed to ≥4.5:1; badge text ≥12 px; add badge pairs to the contrast gate. |
| D-18 | P1 | wiki | 1.4.3, 1.4.11 | Dark theme `a.eng`: white on `#5CC4D0` = **2.05:1** (13.6 px). Light theme `h2 small` `#B86A00` on white = **4.12:1** (12.8 px). Both re-measured, matches `metrics.md`. | Token: `.eng` ink must be the on-accent token (`--color-wiki-dark-on-accent`), not `--color-neutral-white`; amber text token needs one darker step for small sizes (or bump size to ≥18.66 bold). |
| D-19 | P2 | all | 2.5.8 | Only true AA failure: engine `#drawerMenuBtn` (axe: 35.1×12.4 usable, partially obscured by the closed-drawer edge). Everything else ≥24 px passes 2.5.8 but misses the 40 px `--touch-min` token — see register. | Fix the drawer (D-03); then add `min-block-size: var(--touch-min)` to the shared control primitive. |
| D-20 | P2 | all | 1.3.1 | Tables: wiki 1 (no `thead`, no `scope`, no `caption`); pitch 6 (0 `scope`, 0 `caption`); gallery 12 (0 `caption`, 12 `scope` total). Header cells exist, so most SRs cope — risk, not failure. | Component: `Table` primitive emits `<caption class="ds-sr-only">` + `scope="col"` on all header cells. |
| D-21 | P2 | gallery | 2.4.7 | Focus-ring coverage measured per Tab stop: wiki 30/30, pitch 34/34, engine 40/40 authored rings; gallery **32/40** — the 7 side-nav links fall back to the UA ring (`outline:auto 1px rgb(153,200,255)`). Visible, but off-system. | Token/rule: add `a:focus-visible` to the gallery's ring selector list (it already has 10 scoped rules; the fix is to stop scoping). |
| D-22 | P2 | wiki/pitch/gallery | 4.1.2, 1.4.1 | Current item conveyed by class only: wiki `.step.on` (`27`), pitch `.toc a.on`, gallery `.side a.on` — none set `aria-current`. Colour-only state for sighted + no state for AT. | Component: `NavItem`/`Step` sets `aria-current="step"`/`"true"`; keep the underline/dot as the visual. |
| D-23 | P2 | all | 2.3.3 (AAA) + best practice | Reduced-motion coverage uneven: wiki `*{animation:none;transition:none}`; pitch `*{animation:none}` + selective transitions; engine only 4 selectors (`424` `#drawer,#scrim,#editPanel,.proj-box`) so toast/menus/buttons still animate; gallery selective. | Token/behavior: one `motion.css` partial — `--motion-duration-*` collapse to `0ms` under `prefers-reduced-motion` (no `!important` overrides per page). |
| D-24 | P2 | engine | 1.4.4 | `cv` wheel handler calls `e.preventDefault()` unconditionally (`1117`) with no `ctrlKey` branch → Ctrl/⌘+wheel (trackpad pinch) over the 740×371 stage cannot zoom the page. | Behavior: bail out when `e.ctrlKey \|\| e.metaKey`; keep the canvas zoom for plain wheel. |
| D-25 | P2 | pitch | print | `@media print` (`230`) hides nav/side/tabs and prints the active panel; no `thead{display:table-header-group}` (6 tables break across pages without headers), no URL expansion, no printed doc title. | Component: `print.css` rules in the token layer: repeat `thead`, append `a[href]::after{content:" (" attr(href) ")"}` for prose only, print `data-print-doc` title. |

## Target-size register (<40 px `--touch-min`; 2.5.8 AA = 24 px)

| Page | Control | Size @390 | Purpose | Verdict / fix |
|---|---|---|---|---|
| wiki | `Copy` (token box) | 55×28 | Copy prompt token — primary action, ×1 per card | 2.5.8 pass, token fail → `min-block-size:var(--touch-min)`, keep 55 width |
| wiki | `← Prev` / `Next →` | 78×38 / 79×38 | Card pagination | token fail (2 px short) → same primitive |
| wiki | `Read the full guide →` | 151×24 | Outbound link | inline-link exception; leave, but raise hit area to 32 |
| pitch | `.tab-btn` ×4 | 31–61×30 | Document tabs | token fail; 44 px at ≤767 (matches the 46 px desktop) |
| pitch | `.toc a` ×9 | 203×31 | Section TOC | token fail; 40 px block with 2 px gap |
| pitch | `#exp-md/copy/print` | 58–65×27 | Export cluster | token fail; 40 px |
| pitch | `#mrail a` ×9 | 52×32 | Mobile section rail | token fail **and** D-11 |
| engine | `#histUndoBtn/Redo` | 32×44 | Undo/redo | width <40 → `min-inline-size:var(--touch-min)` |
| engine | `#drawerMenuBtn` | 35×40 (12.4 usable) | Drawer overflow menu | **2.5.8 fail** (obscured) → D-03 + width |
| engine | `#filePick`, `#assetImportPick` | 4×4 @x=-9999 | Image/JSON import | **excluded** (visible labelled triggers: `Add image`, `Change image…`, asset-row `Import`) but must leave the tab order → `tabindex=-1` |
| gallery | `.mplay` ×14 | 75–135×30 | Play a motion specimen | token fail; 40 px height |
| gallery | `.side a` ×7 | 59–123×37 | Section nav | token fail (3 px short) |

## Keyboard & focus map per page (measured, 1440)

- **wiki** — 28 stops, visual order holds: `pitch →`(1) `engine →`(2) `search`(3) `theme`(4) 7 `.step`(5-11) 3 `.tab`(12-14) 10 `.chip`(15-24) `Copy`(25) guide link(26) `Prev`(27) `Next`(28). No skip link; 24 stops before any card body. **Activating 5-14 or 24 destroys focus → BODY** (D-01). `/` focuses search (good, `342`); ←/→ change card but do not move focus and do not `preventDefault`.
- **pitch** — header brand(1) 2 links(2-3) 4 tabs(4-7, roving; only active tab is a stop) 9 TOC(8-16) 3 export(17-19) then panel content. Drawer: focus → `Close` (`770`), 23 in-drawer stops, **escapes at Tab 24** (D-10). Escape closes + restores opener (`787`, `804`) ✓. Chart: 18 `rect` stops with discarded names (D-12).
- **engine** — 21 stops then cycles: 2 back-links, `dots`, 5 view buttons, `chapterSel`, 3 scene buttons, `assetBtn` → **7 invisible stops (15-21)** → back to top. Canvas never receives focus. Modal: focus stays on BODY, Tab enters the page behind the scrim (D-04). Escape (`915`) closes overlays but returns no focus.
- **gallery** — 38 stops, monotonic document order (verified: only the wrap is non-monotonic): theme(1-2) nav(3-9) 14 `mplay`(10-24) components(25-30) fields(31-32) tools(33-37) sheet close(38). No skip link; 9 stops before content.

## Shared a11y primitives to build (design-system terms)

1. **`layers/overlay.*` — one Dialog/Sheet controller.** `open(el,{labelFrom})` → `role=dialog aria-modal=true aria-labelledby`, `inert` on `main`+`header`, save `document.activeElement`, focus first control, Tab/Shift+Tab cycle, Escape → close, restore focus. Closed state = `hidden` + `inert` (never transform). Consumed by: engine drawer/modals, pitch drawers, gallery sheet. Kills D-03, D-04, D-10.
2. **`base/a11y.css` — three utilities only.** `.ds-sr-only` (clip-path rect), `.ds-skip-link` (visible on focus, targets `main`), `.ds-focus-ring` (`outline: var(--focus-width) solid var(--focus-color); outline-offset: var(--focus-offset)` applied through one selector list `a,button,[role],input,select,textarea,summary,[tabindex]`). Nine scoped ring rules across four pages collapse to this one.
3. **`base/landmarks.*`** — page shell contract: `header > nav[aria-label]`, one `main`, `footer`; navs must carry a name (`--` no exceptions). Satisfies D-08 (wiki), D-14 (engine), D-10's `main` gap (pitch).
4. **`components/tabs.*`** — tablist/tab/tabpanel with `aria-controls`+`aria-labelledby`, roving tabindex, ←/→/Home/End. Replaces wiki's pseudo-tabs (D-05) and formalises pitch's hand-rolled one.
5. **`components/field.*`** — label + hint + error wiring (`for`/`aria-describedby`/`aria-invalid`); every control renders a label, hidden if the design has none. Fixes D-06, D-07, and the modal's `label-title-only` selects.
6. **`behaviors/announce.*`** — single `role=status` region + `announce(msg)` (polite, debounced); used by filter counts, copy, toast, chart tooltip. Fixes D-08's silent state and D-13.
7. **`behaviors/focus-preserve.*`** — keyed render: snapshot `{region, index, key}` → re-render → restore. Fixes D-01 and is the rule for any future innerHTML list.
8. **Tokens to add:** `--color-badge-{info,dev}-{bg,ink}` (≥4.5:1), `--color-wiki-dark-on-accent`, `--color-wiki-light-amber-small`, `--touch-min` enforced in the control primitive (currently declared but not applied to 12 controls), `--focus-color` per surface.

## Verification plan

**Automate (CI, every PR):**
- axe-core on 4 pages × {1440, 390} × {light, dark} + 4 scripted states (wiki filter+map tab, engine drawer, engine modal, pitch drawer) — fail on `critical`/`serious`. Current baseline: wiki 4, pitch 2-3, engine 6-8, gallery 1-2 violations.
- Contrast script (text + non-text + every `--color-*` pair from tokens.json) — must stay at 0 fails; today 4 distinct pairs fail.
- Target-size script vs `--touch-min` (report-only until the 12 entries above are fixed, then blocking).
- Keyboard script (`Input.dispatchKeyEvent` Tab/Enter/Escape as used here): assert (a) every Tab stop is inside the viewport, (b) focus survives activation, (c) Escape closes the top overlay and returns focus.
- AX-tree assertions: every `role=tab` has `aria-controls` → existing tabpanel; every form control has a non-empty name; every `nav` has a name.

**Manual (cannot automate):** screen-reader passes (VoiceOver/Safari + NVDA/Chrome) on the 4 core tasks; canvas keyboard layer usability; modal trap feel; 200% zoom + 320 reflow reading order (machine check: no page h-scroll at 320 — passes today); print output of pitch (6 tables across page breaks); reduced-motion experience; real touch target comfort.

**Acceptance checklist (per page):** landmarks + skip link; zero axe critical/serious; zero contrast fails; 0 off-viewport tab stops; activating any control preserves focus; overlay: open→focus in, Tab cycles, Esc→focus back; every control ≥40 px or documented inline exception; every state (selected/current/expanded) exposed via ARIA; live region announces async changes.

## Proposed workstream (ordered)

| # | Task | Files | Acceptance | Effort |
|---|---|---|---|---|
| 1 | `base/a11y.css` + landmarks shell (all 4 pages) | `design-system/a11y.css`, `index.html`, `pitch.html`, `engine.html`, `design-system/index.html` | axe `landmark-one-main`/`region` = 0; skip link works | S |
| 2 | `Overlay` controller; migrate engine drawer + 2 modals + pitch drawers | `design-system/overlay.js`, `engine.html:82,455,469,478,1003-1023,1504` ; `pitch.html:663,683,770-804` | 0 off-viewport tab stops; trap verified by keyboard script; focus returns | M |
| 3 | Fix wiki render/focus destruction + Tabs primitive | `index.html:321-347`, `design-system/tabs.js` | focus survives tab/chip activation; 0 tabs without tabpanel; axe `aria-allowed-attr` = 0 | M |
| 4 | `Field` primitive: `#chapterSel`, `#search`, modal selects | `engine.html:446`, `index.html:91`, `design-system/field.css` | axe `select-name`/`label`/`label-title-only` = 0 | S |
| 5 | Canvas keyboard layer + accessible list equivalent | `engine.html:446,890-980`, new `engine-keyboard.js` | create/move/connect/delete reachable by keyboard; instructions announced | L |
| 6 | `announce` + toast + copy/filter/live statuses | `design-system/announce.js`, `engine.html:648`, `index.html:296,330-347` | filter count, copy, toast announced once each | S |
| 7 | Token/contrast fixes (badges, `.eng` ink, amber) | `design-system/tokens.json` + regenerate | contrast script 0 fails in all 4 themes | S |
| 8 | Target-size pass on 12 controls + `#dots` MenuButton | shared control CSS, `engine.html:436,1105` | all ≥40 px or documented; menu has `aria-expanded`/Escape | M |
| 9 | Tables + chart + print polish | `index.html:318`, `pitch.html:883,230`, gallery tables | captions/scopes present; rects carry a role; `thead` repeats in print | M |
| 10 | Wire the 5 gates into CI | `scripts/` | red on regression; baseline committed | S |

## Still uncertain

- **Canvas (engine) has no machine-checkable text contrast** — the paint reads tokens (`CT()` at `484`), but rendered ink/background pairs inside the canvas were not sampled; a pixel sample of one card per view is still owed.
- **SR announcement quality** (not just presence): whether the pitch tabpanel swap reads acceptably with VoiceOver, and whether the engine drawer opening while focus stays on the stage is discoverable, needs a real AT pass.
- **2.4.11 (Focus Not Obscured)** is untested at scroll positions — the wiki mobile step rail is fixed and the engine has a fixed bottom bar; I did not reproduce a case where a focused control sits under them.
- **`role=dialog` on `<aside>`** is flagged by axe as not-allowed; Chrome still maps it to dialog. Whether any AT mis-maps it is untested — the fix (use a `div`) is cheap either way.
- axe left `color-contrast` "incomplete" on 1-4 nodes per page (gradient/overlay backgrounds); those were checked manually here and passed except the `fxswitch` label, which the screenshot showed is *visible* (false positive from overlapping thumb).
