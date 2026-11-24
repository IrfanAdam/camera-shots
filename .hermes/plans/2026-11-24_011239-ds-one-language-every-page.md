# Camera Shots — One Design System, Every Page (DS v2)

> **For Hermes:** Execute phase by phase with `subagent-driven-development`; token source has one owner at a time. This plan is the single build for the whole DS overhaul — do not split it into per-day plan files.

**Goal:** Every one of the four shipped HTML surfaces (`index.html`, `pitch.html`, `engine.html`, `design-system/index.html`) consumes one token contract and one component library, passes one verification gate, and is documented by guides that cannot go stale — while keeping each surface's own accent, IA and density.

**Architecture:** A three-tier token source (`primitive → semantic role → component/thin`) generates `tokens.css` plus four theme maps. A shared `base.css` + `components.css` + `components.js` + `icons.svg` carries every repeated control; page `<style>` blocks keep layout only. A rendered gallery is the visual contract; a gate plus CI is the enforcement contract; `design-system/references/` is the intake log that makes the language mouldable.

**Tech stack:** Static HTML/CSS/JS, ES modules, Node 20 scripts, headless Chrome via CDP, GitHub Actions. No framework, no runtime dependency, no root `package.json` (Vercel stays `framework: null`).

**Tags:** design-system, tokens, components, accessibility, governance, visual-language

**Scope:** exactly 4 HTML surfaces — verified by `git ls-files '*.html'`. No additional pages exist.

---

## Current state (measured 2026-11-24, not estimated)

| Layer | What exists | What the audit found |
|---|---|---|
| Tokens | 229 keys / 13 groups; generated `tokens.css`; byte-stable generator | **91/229 (39.7%) have zero refs from product pages**; 76 are gallery-only. 0 primitive tier. 96/119 colours are surface-named. |
| Palettes | 5 documented: pitch, wiki light, wiki dark, engine, pro | `engine.html` renders **`color.pro.*` (74 refs / 14 tokens)** and only 5 of its 55 namesake `color.engine.*`; the documented engine surface `#0E1116` ships nowhere. |
| Type | 11 size tokens, 2 line-height, 4 weight, 2 tracking | **16 distinct computed sizes**; 0 line-height and 0 weight consumers; 36 literal line-heights, 53 literal weights; body bypasses tokens via `font:` shorthand (15px/1.6 vs token 15.2). |
| Components | 0 shared selectors across 4 files | 28 component roles, 24 measured forks: 3 primary heights (34/46/44), 6 secondary heights, 3 filter radii, 2 switches, 7 popovers / 3 shadows, 4 selected-state mechanisms. |
| A11y | Authored focus rings on 3 of 4 pages | **0 focus traps, 0 `inert`**; wiki drops focus to `<body>` on every tab/chip click; engine canvas is pointer-only; engine toast has no `role=status`; 4 contrast pairs fail (2.05, 3.68, 4.12, 4.25:1). |
| Docs | README, components, patterns, audit, generated receipt, checklist, gallery | **20 stale claims**; gallery consistency matrix is false on 5 of 6 rows; 10 implemented components unspecced; 2 specs describe UI that does not exist. |
| Gate | V1–V8 + U1; PASS 0 violations / 21 exemptions | Blind to font-size, line-height, weight, tracking, shadow, width/height, `@media`, consumers, types, theme parity, `!important`; 8 of 21 exemptions mask missing tokens. |

Audit lanes (foundations, components, docs, accessibility, visual) each wrote a full evidence table; Phase 0 imports them under `design-system/audit/2026-11-24/`.

---

## Decisions (settle before Phase 1; recommended verdicts)

| # | Decision | Options | Verdict | Why |
|---|---|---|---|---|
| D1 | Runtime model | A) static + shared CSS/JS layer · B) migrate to Vite/React/Tailwind · C) tokens only | **A** | 4 static pages, zero deps, Vercel static. B changes IA and risks the product for no visual gain; C is today's failing state. |
| D2 | Token tiers | A) primitive + semantic role + thin component · B) keep surface-prefixed | **A** | One role contract with 4 theme maps (`pitch`, `wiki-light`, `wiki-dark`, `engine`) removes 57 page-local aliases and makes a new reference a theme change. |
| D3 | Engine palette truth | A) re-point page at `color.engine.*` (#0E1116) · B) rename the real palette (`color.pro.*`) to engine roles, delete the 50 decoys · C) keep both | **B** | Zero visual delta; names stop lying. A changes pixels without a design reason. C keeps two truths. |
| D4 | Accent per surface | A) keep champagne / teal / warm signal · B) adopt reference blue #2E72FF everywhere · C) keep identity, ship blue as an opt-in theme map | **C** | Family resemblance is geometry + hairline + label voice + colour-as-state, not one hue. Blue is one theme-map value swap if wanted. **Owner call.** |
| D5 | Label voice | A) mono everywhere · B) sans everywhere · C) two roles: `label.ui` (sans, sentence case) + `label.data` (mono, tracked) | **C** | Reference intake #1 uses sentence-case sans for chrome; the product uses mono for timecode/eyebrows. Two named roles end the per-page drift without forcing one face. |
| D6 | Density / targets | A) one 40px control everywhere · B) per-surface densities: wiki 40, pitch 46, engine 44 · C) keep current 28–46 | **B** | Legit surface expression; C fails 2.5.8 on one control and the 40px floor on twelve. |
| D7 | Governance weight | A) no process · B) 6 change classes + semver + changelog + CI · C) full RFC board | **B** | Solo-maintained static site; B is the smallest process that would have caught all 20 stale claims. C is theatre. |

**Open owner decisions:** blue vs warm engine accent (D4); whether `color.pro.*` is a staged future product or the engine's palette (D3 assumes the latter); wiki 34px controls are density or legacy (D6 assumes density→raise to 40); `typography.size.ui` vs `lede` duplication (retire one).

---

## Execution map

| Phase | Depends on | Mode | Gate |
|---|---|---|---|
| 0 Truth & guardrails | — | sequential, blocking | gate v2 reports baseline; CI green |
| 1 Foundations v2 | Phase 0 | sequential, token owner only | 0 product-orphan tokens; body type tokenised; one engine palette |
| 2 Component library | Phase 1 | one lane owns CSS/JS, one owns docs/gallery | components.css 0 raw values; gallery specimens live |
| 3 Page adoption | Phase 2 | **parallel, file-disjoint**: wiki / pitch / engine / gallery | per-page screenshots, axe 0 serious, no undeclared delta |
| 4 Accessibility hardening | Phase 3 | parallel per page; canvas lane separate | 0 axe serious/critical, 0 contrast fails, 0 off-viewport stops |
| 5 Visual reconciliation + reference #1 | Phase 3/4 | parallel per page after tokens | family-resemblance screenshots; measured counts |
| 6 Governance & release | Phases 1–5 | sequential | docs machine-checked; `ds-v1.0.0` tagged |

---

## Phase 0 — Truth and guardrails {#phase-0}

*Tags:* audit, gallery, gate, ci · *Status:* 6/6 tasks · GATE PASS

Shipped: `ee347f3`+`7cf688b` (Tasks 1, 4), `a089fed` (Tasks 2, 3, part of 6), `9ae7f97` (Task 5), `2792fd2` (Task 6), `55103e7` (Phase 0 gate: doc-count gap closed, token map reconciled). All five SHAs are on this branch. Verified at HEAD after the Phase 1A gate fix: `build-tokens.mjs --check`, `lint-tokens.mjs --check`, `check-doc-counts.mjs` and `check-anchors.mjs` all exit 0; a wrong README count still exits 1.

The system currently certifies itself with false evidence. Fix the certification surface and the checks before changing any value, or the rest of the work cannot be trusted.

| # | Task | Done when |
|---|---|---|
| 1 | Import the audit baseline | ✅ 5 lane reports + measured JSON/screenshots live in `design-system/audit/2026-11-24/`; `audit.md` archived · shipped `ee347f3`+`7cf688b` |
| 2 | Make the gallery matrix true | ✅ every `Element / surface` cell is computed from `getComputedStyle` on the real selector; no hardcoded radius/shadow claim · shipped `a089fed` |
| 3 | Compute every gallery count | ✅ 9 group tags, "eight steps" and token totals derive from DOM/CSSOM; grep finds no literal count · shipped `a089fed` |
| 4 | Retire stale doc claims | ✅ no `Newsreader`, no "known gap" reduced-motion, no unimplemented timeline rule, no self-contradicting PASS sentence · shipped `ee347f3`; pill-radius claims closed in the Phase 0 gate commit |
| 5 | Gate v2 | ✅ new classes report the exact baseline counts; a deliberate raw `font-size` fails `--check` · shipped `9ae7f97` |
| 6 | Build validation + CI | ✅ `build-tokens --check` byte-stable, type↔value rejects a bad token, CI fails on a changed doc count · shipped `2792fd2`+`a089fed` |

### Task 1: Import the audit baseline
**Objective:** Freeze today's evidence so later phases have a before/after reference.
**Files:** create `design-system/audit/2026-11-24/{foundations,components,docs,accessibility,visual}.md`, `metrics.json`, `shots/*.png`; move `design-system/audit.md` → `design-system/audit/archive/audit-2026-11-23.md`.
**Steps:**
1. Copy the five lane reports and the measured `c-*.json` / `x-*.json` summaries (not the raw 800 KB dumps).
2. Copy the 10 fresh screenshots at 1440/390, wiki light + dark.
3. Add a one-page `README.md` stating method, viewport emulation (CDP, not window-size), and the measured headline numbers.
4. Mark `audit.md` historical and remove it from the live worklist.
**Verify:** `ls design-system/audit/2026-11-24` shows 5 reports + shots; no live doc links to `audit.md` as current.

### Task 2: Make the gallery matrix true
**Objective:** The page that defines the system must stop documenting controls that never shipped.
**Files:** `design-system/index.html:1236-1250`, `.stage[data-surface]` block.
**Steps:**
1. Replace the hardcoded matrix cells with a render-time probe: for each surface, read the real page's computed `border-radius`, control height, hairline colour and font family (fetch the page in a hidden iframe, or import a generated JSON snapshot).
2. Delete the 99px-pill / 12/14/10px-panel claims; show the shipped 4px control / 8px panel values.
3. Rebuild the Button and Pill specimens at shipped geometry (4px control, 8px panel, 40/44/46 heights).
4. Add a `deviation` badge only where a computed value differs, with a `file:line` cite.
**Verify:** matrix cell values equal `metrics.json` for all 4 surfaces; screenshot of gallery 1440 shows no pill button.

### Task 3: Compute every gallery count
**Objective:** Counts must never rot when the token set grows.
**Files:** `design-system/index.html` group headers, space caption, footer count.
**Steps:**
1. Derive each group tag from the number of rendered `.sw` children.
2. Derive spacing-step count from the rendered ladder.
3. Derive token total from `cssRules` custom properties on `:root`.
4. Assert no numeric literal remains in a `<span class="…count">`.
**Verify:** `grep -nE '>[0-9]+ tokens' design-system/index.html` returns nothing; changing `tokens.json` and regenerating changes the displayed counts without editing HTML.

### Task 4: Retire stale doc claims
**Objective:** Remove claims that are already false before adding new docs.
**Files:** `design-system/audit-checklist.md:26,35,47`, `design-system/README.md:126`, `design-system/patterns.md`.
**Steps:**
1. Delete the Newsreader rule; replace with the one-family type rule already shipped.
2. Reframe reduced motion as implemented-and-tested, not a known gap.
3. Mark timeline-handle/chips rules `proposed` or delete them.
4. Remove the PASS sentence that contradicts the 21 exemptions; point to `verification.md` (created Phase 6; stub now).
**Verify:** `grep -rn 'Newsreader\|known gap\|every raw .* resolves' design-system/*.md` returns nothing.

### Task 5: Gate v2
**Objective:** Extend the gate to the values that actually drift.
**Files:** `scripts/lint-tokens.mjs`.
**Steps:**
1. Add **T1** raw `font-size`, including the `font:` shorthand's `<size>/<line-height>` pair; **T2** raw `line-height`; **T3** raw `letter-spacing`; **T4** raw `font-weight` + literal family stacks.
2. Add **T8** product-consumer audit (count `var()` refs in the 3 product pages **plus theme-map cells plus `components.css`**; gallery refs do not count; `var()` alias values and every `breakpoint.*` key are exempt — a media query cannot consume a custom property); **T9** two roles with one resolved value, **scoped per theme block** (a pitch role may equal a wiki role; two roles inside one block may not); **T10** theme slot presence, **all 14 slots declared in every block with explicit nulls** (not identical non-null lists — see Task 7); **T11** `type`↔`value` shape; **T13** duplicate alias value in one `:root`, **skipping `var()` alias values** (they resolve through their target and are not duplicates); **T14** `!important`; **T15** inline `style=` budget.
3. Seed each new class with today's exact count as an explicit budget, so the gate is green on day one and only regressions fail.
4. Print the new counts in `audit-report.md` next to V1–V8.
**Verify:** `--check` exits 0 with the landed budgets (V1–V8 0, U1 0, T1 10, T2 37, T3 27, T4 52+3, T8 104, T9 5, T10 0, T11 0, T13 0, T14 8, T15 200; T8/T9/T10/T11/T13 re-seed when Phase 1 widens their scope, and every re-seed is recorded in `audit-report.md`); inserting `body{font-size:15px}` exits 1.

### Task 6: Build validation + CI
**Objective:** Make the committed CSS provably generated and the docs provably current.
**Files:** `scripts/build-tokens.mjs`, `scripts/check-doc-counts.mjs` (new), `scripts/check-anchors.mjs` (new), `.github/workflows/ds-gate.yml` (new).
**Steps:**
1. Add `--check` to the generator: compare a fresh render to disk, exit 1 on diff, do not write.
2. Validate `type` against a regex table (`color`, `dimension`, `fontFamily`, `fontSize`, `fontWeight`, `duration`, `cubicBezier`, `number`, `shadow`); reject `other`.
3. CI job 1–4: build `--check`; `lint-tokens --check`; doc-count assertion (README keys/groups, gallery tags); anchor/id closure; `html-validate` on 4 files.
4. Keep tooling dependency-free; no root `package.json`.
**Verify:** CI green on `main`; editing a README token count fails job 3; regenerating tokens is byte-identical.

**REF GATE 0 — how to judge:** open the gallery at 1440; every count matches `tokens.json`; every matrix cell matches a computed value; run the gate and read `RESULT: PASS (budgets)`; break one token type and watch the build fail. **Pass means all five.**

---

## Phase 1 — Foundations v2 {#phase-1}

*Tags:* tokens, themes, scale, generator · *Status:* 7/7 · GATE PASS (Task 12 partial: the pitch lane still owns its 4 queries)

One role contract, four theme maps, every scale consumed. No new values until the orphans are wired.

**Shipped in this lane (`2897a73`, `3dc58e0`, the receipts commit, and the Task 13 commit):** the 186-key contract, the pruned gallery, the receipts and the generated foundations reference. Tokens: **186 keys / 20 groups** (measured, `build-tokens --check` prints it), down from 249 after Phase 1A and 292 across the interim stages. Removals: **106 = 44 deprecated `var()` aliases + 48 engine decoys + 14 dead keys**; the 2 collision names (`color.engine.tool`, `color.engine.overlay.panel`) are live with their real values, and the 6 real alias keys (`color.wiki.light.card`, `color.wiki.light.amber`, `color.pro.tool.hover`, `spacing.base`, `spacing.gutter.pro`, `color.print.ink`) plus `focus.color` resolve to live targets. Tasks 9, 10, 11 and 13 are closed; Task 12 is partial (pitch's 4 queries deferred to the pitch lane).

**Phase 1A gate fix (this commit):** U1 dead `var()` is enforced in the budget loop — an undefined token now fails `--check` instead of only printing — and T11 accepts a `var()` alias as an alias (skipped, target judged) while still rejecting a literal type mismatch.

**Verified Phase 1 reality** (recon `.hermes/.../token-map.md`, computed from `tokens.json`, not estimated): 229 → **186** keys = the recon's **185** + `focus.color`, the token the re-pointed focus rings need. `206` is a stale estimate — it requires keeping ~20 phantom palette keys the same tasks delete. Actions: **64 deletes** (50 engine decoys + 14 dead keys, all 0 product refs), **44 renames** (16 `color.pro.*` → `color.engine.*` + 28 role/type/scale), **6 aliases** — the 6-key alias layer, not one deprecated alias per rename, **21 additions** = 229 − 64 + 0 + 21. Deletes land **before** renames where a name collides (`color.engine.tool`, `color.engine.overlay.panel`) — the reverse deletes the value it just installed. Duration 10 → 5 and z 15 → 10 are **value changes, not alias folds**, so they move to Phase 5 Task 35; Phase 1 only adds `z.tooltip`/`z.pinned`.

| # | Task | Done when |
|---|---|---|
| 7 | Role contract + theme maps | ✅ 14 slots × 4 themes emitted as `[data-ds-theme]` blocks (17 role vars each, nulls explicit) · shipped `a05cefa` |
| 8 | Add missing scales | ✅ line-height, tracking, weight, control heights, icon/dot sizes, hover lift, section spacing, z tooltip/pinned, breakpoints, layout roles emitted · shipped `a05cefa` |
| 9 | Alias / rename / delete | ✅ 229 → **186** keys (185 recon + `focus.color`); 44 renames + 6 aliases in Phase 1A stages, then **106 removals** (44 deprecated `var()` aliases + 48 decoys + 14 dead) · shipped `2897a73` |
| 10 | Wire the 39 orphans | ✅ every wired key has a consumer; T8 104 → **11**, all 11 recorded in the budget note (3 canvas-only `CT()`/`WA()` names + 8 gallery/doc consumers) · wired `7733da1`+`10285cc`, count closed `2897a73` |
| 11 | Resolve the engine palette | ✅ engine renders one palette; 48 decoy keys deleted, 2 collision names revalued in place; gallery group relabelled "Engine — surface language" · `2897a73`+`3dc58e0` |
| 12 | Reconcile breakpoints | **PARTIAL** — index/engine/gallery carry budget 0 (6 one-off queries with same-line reasons: 800×2, 760×2, 860, 520). Deferred: **pitch.html is under foreign editing**, so its 4 counted queries stay — `pitch.html:37,52,54` (`min-width:768px` vs `breakpoint.md` 767.5) and `pitch.html:45` (`min-width:901px`) — plus 2 equality-only queries the snap must revisit: `pitch.html:193` (900) and `pitch.html:205` (639, equals today's `breakpoint.sm` but not the 640 step). The token-side snap (`sm` 639→640, `md` 767.5→768, `xl` 1023.5→1024) cannot land alone: it flips T6 on `index.html:68` and `pitch.html:205` in the same commit, so it ships with the pitch lane |
| 13 | Generate `foundations.md` | ✅ `scripts/build-foundations.mjs` + generated `foundations.md` (186 keys in 20 group tables, theme + type contract) + 59-line README router · shipped in this commit |

### Task 7: Role contract + theme maps
**Objective:** Replace 57 page-local aliases with one attribute and 14 role names.
**Files:** `design-system/tokens.json`, `scripts/build-tokens.mjs`, `design-system/tokens.css`.
**Steps:**
1. Define 14 slots: `bg.page`, `bg.surface`, `bg.surface.alt`, `bg.control`, `bg.accent.soft`, `fg.primary`, `fg.secondary`, `fg.muted`, `fg.faint`, `fg.on.accent`, `line.default`, `line.strong`, `accent`, `status.{success,warning,danger,info}`.
2. Fill 4 theme maps: `theme.pitch.*`, `theme.wiki.light.*`, `theme.wiki.dark.*`, `theme.engine.*`; declare `null` explicitly where a slot does not exist.
3. Generator emits `[data-ds-theme="…"] { --ds-bg: …; --ds-surface: …; }` once per map, plus the raw `:root` tokens.
4. Add a `T10` presence check: every theme block declares **all 14 slots**, using `null` where a role does not exist in that theme. Presence, not identity — the four non-null lists legitimately differ (pitch has 2 nulls, wiki light/dark 5, engine 3), so the gate must not demand identical lists.
**Verify:** `tokens.css` contains 4 theme blocks, each carrying 17 role declarations (14 slots, `status` expanding to 4); setting `data-ds-theme` on `<html>` changes all 14 roles; no page needs a local alias for a role; T10 fails only on a slot missing from a block, never on a declared `null`.
**Shipped:** `a05cefa` — 4 maps, 17 role vars each (pitch 2 nulls, wiki-light 5, wiki-dark 5, engine 3), T10 0.

### Task 8: Add missing scales
**Objective:** Every axis that carries hierarchy has a constrained scale.
**Files:** `design-system/tokens.json`.
**Steps:**
1. Type: `line-height.{tight,normal,relaxed,reading,display}` (1.25/1.5/1.6/1.7/1.08); `tracking.{tight,snug,label,eyebrow}`; `weight.heavy` 800.
2. Controls: `control.height.{compact,default,touch,reading}` (34/40/44/46); `icon.size.{sm,md,lg}` (16/20/24); `dot.size` 5px; `hover.lift` 1.06.
3. Layout: `spacing.section` 26px (closes 1.6rem×3 + 1.4rem×2 within 2px); `z.tooltip` 5, `z.pinned` 80; 5 breakpoints 390/640/768/900/1024; layout roles for max-width, sidebar, drawer.
4. Constrain spacing numerics → t-shirt names. **Do not** merge durations or band `z` here: 10 → 5 durations and 15 → 10 z bands are value changes (every merge moves a computed time/index), so they would smuggle visual deltas into the alias-only step. They move to Phase 5 Task 35; Phase 1 only adds `z.tooltip`/`z.pinned` and retypes the legacy `other` leaves.
**Verify:** generator emits every new key; `z.tooltip`/`z.pinned` ship as `number`; duration/z cardinality still at 10/15 here and only collapses in Task 35.
**Shipped:** `a05cefa` — every listed scale emitted; the token set is now **249 keys / 20 groups** (the Phase 1 target of 186 is Task 9's after the deletes).

### Task 9: Alias / rename / delete
**Objective:** One name per role; remove the tokens that are claims without consumers. Target: 229 → 186 keys (the recon's 185 + `focus.color`).
**Files:** `design-system/tokens.json`, all 4 pages' `:root` blocks, `engine.html` canvas `CT('--…')` / `WA('--…')` lookups.
**Steps:**
1. Alias **6** exact duplicates (key kept one release, value becomes a `var()` pointer): `wiki.light.card`→`primitive.white`; `wiki.light.amber`→`status.warning`; `pro.tool.hover`→`engine.divider`; `spacing.base`→`spacing.2xs`; `spacing.gutter.pro`→`spacing.md`; `print.ink`→`engine.accent.ink`. This 6-key layer **is** the alias tier — the 44 renames below do not each emit a deprecated alias. The other six the earlier draft proposed are 0-consumer alpha keys that duplicate a kept key — they are deleted, not aliased.
2. Rename **44** names: 16 `color.pro.*` → `color.engine.*` (surface/text/divider/selection/canvas/tool/overlay) and 28 role/type/scale names (`size.h1.wiki|pitch`→`size.display`/`size.h1`, `weight.*` group prefix dropped, `lineheight`→`line-height`, `typography.size.h2.wiki`→`size.h3`). Rewrite the **56** canvas lookups in `engine.html` in the same commit — `42 CT('--…')` plus `14 WA('--…', pct)`; `WA()` wraps `CT()`, so a renamed key fails silently in both.
3. Delete **64** (50 engine decoys + 14 dead: `color.pitch.overlay.scrim`, `color.pitch.scrim.soft`, `elevation.0`, `motion.easing.sheet`, `opacity.scrim`, `touch.pro`, `touch.small`, `touch.field`, `touch.handle.timeline`, `layout.sheet.grab.width`, `layout.sheet.grab.height`, `radius.card`, `radius.xl`, `breakpoint.tablet`). All 64 have 0 product refs. **Order:** apply the decoy delete first, then the rename, where names collide (`color.engine.tool`, `color.engine.overlay.panel`) — the reverse deletes the value it just installed. Same commit.
4. Record every rename/delete/alias in `design-system/DEPRECATIONS.md` — shipped `2897a73`: 106 removals (44 alias keys + 48 decoys + 14 dead), the 6 surviving one-release aliases, and the 44 renames that preceded them.
**Verify:** T8 reports 0 product-orphans under its Phase 1 scope (3 product pages + theme-map cells + `components.css`, with `var()` aliases and `breakpoint.*` exempt); T9 = 0 **per theme block**; T13 = 0 with `var()` alias values skipped; `grep` for each removed key returns no consumer; static pages render byte-identical where the change was alias-only.

**Shipped:** `2897a73` — 292 → **186 keys / 20 groups**. The 106 removals reconcile exactly as 44 deprecated `var()` aliases + 48 engine decoys + 14 dead keys; the 2 collision names and the 6 real aliases stay live. `EXPECTED_LEAVES` 292 → 186; `tokens.css` regenerated byte-stable; 50 gallery swatch rows and every non-swatch citation of a removed name retired in the same commit, so U1 is 0 at that SHA. Measured T8 **11**, T9 **0**, T13 **0** (T8 is 11, not 0 — see Task 10); index/engine pixel diff 0 at 1440 and 390.

### Task 10: Wire the 39 orphans
**Objective:** Stop documenting values the pages do not use. The recon's wiring list is 39 keys with 0 product refs today; "25" was an earlier partial pass, and "41" was a lane-A estimate while 89/91 counted whole-tree `var()` scans — neither is the wire list.
**Files:** `index.html:11-12,28`, `pitch.html:23,32,68,144`, `engine.html:32`, plus control rules.
**Steps:**
1. Body type: rewrite the 3 `font:` shorthands as `font-size`/`line-height`/`font-family` tokens (15.2/1.6; pitch 1.7 via `lineheight.reading`).
2. Layout: 980 → `layout.max.wiki`; 230 → `layout.sidebar.wiki`; 1080 → `layout.max.pitch`; 220 → `layout.sidebar.pitch`; `min(720px,100vw)` → `layout.drawer.pitch.width`.
3. Touch: apply `touch.min` to the 12 under-40 controls; `touch.handle.timeline` is deleted in Task 9, so nothing may reference it.
4. Elevation: consume `0/1/ring/inset` or delete; weights/tracking wired on every heading and label.
**Verify:** T1/T2/T4 = 0; T7 literal widths drops by 5; computed body = 15.2px on all 3 product pages; T8 = 0 with all 39 keys either consumed or recorded as delete-adjacent (`radius.lg`) / exempt (`spacing.base`, `spacing.gutter.pro`, `breakpoint.*`).

**Shipped:** body type, layout widths, touch, elevation and weight/tracking wiring landed in `7733da1`+`10285cc`. The count is **T8 11, not 0**, and the 11 are named rather than waived: `color.engine.track.fx/title/audio` are read only through the canvas `CT()`/`WA()` strings (a `var()` counter cannot see them) and `elevation.ring/inset`, `icon.size.md/lg`, `opacity.disabled`, `radius.lg`, `spacing.section`, `tracking.label` are gallery/doc consumers whose product wiring is Phase 2–3 work. `scripts/lint-tokens.mjs` prints the list on every run and the budget note explains it, so the debt is visible instead of hidden behind a 0.

### Task 11: Resolve the engine palette
**Objective:** Token names must describe what the page renders.
**Files:** `design-system/tokens.json`, `engine.html:10-28`, `design-system/README.md:68`, gallery Pro group.
**Steps:**
1. Rename the real palette `color.pro.*` → `color.engine.surface|text|divider|selection|canvas|tool.*`; keep `color.engine.accent*`, `scrim*`, `wash*`.
2. Delete the 50 decoy `color.engine.bg/panel/ink/muted/code/tool/border/teal/graph/switch/wash/overlay` keys and the README row that describes them. Two names collide (`tool`, `overlay.panel`) — delete the decoy before applying the rename.
3. Re-point `engine.html` aliases; `--teal`/`--teal-bright` become real `line.strong`/`fg.primary`, not grey lies.
4. Relabel the gallery group "Engine — surface language"; merge the separate "Pro editor" group.
**Verify:** engine refs ≥40 to one palette; pixel diff 0.000% on `engine-1440`; T9 = 0 name/value contradictions.

**Shipped:** `2897a73` deletes 48 decoys and `3dc58e0` finishes the gallery. `engine.html` had already been re-pointed off all 15 legacy names in `10285cc`, so this commit only proves it: `grep` for every retired `--color-engine-*`/`--color-pro-*` name in `engine.html` returns 0, the two collision names carry the real palette values (`#1C1C1E`, `rgba(30,30,34,.94)`), T9 0, and the 1440/390 pixel diff against `10285cc` is exactly 0.

### Task 12: Reconcile breakpoints
**Objective:** One breakpoint scale even where `var()` cannot be used.
**Files:** `index.html`, `pitch.html`, `engine.html`, `design-system/index.html` media queries.
**Steps:**
1. Set 5 steps: 390 / 640 / 768 / 900 / 1024.
2. There are **15 width queries over 9 distinct values** (768×3, 900×2, 800×2, 760×2, 639×2, 901, 860, 640, 520). Snap 639→640, 760→768, 900/901→900; the **4 one-offs** are 800 (×2), 860 and 520 — send them to 768 / 900 / 640 only where layout allows; otherwise keep and `lint-allow` with a reason.
3. Add T6: every literal `@media` px must equal a `breakpoint.*` value.
**Verify:** T6 = 0 or documented one-offs; no 900/901 or 760/768 pair; 15 queries resolve onto the 5 steps; mobile layout unchanged at 390.

**Partial — what is and is not done:** T6 exists and is enforced (budget 5 = pitch 4 + gallery 1); the 6 remaining one-offs beyond that budget carry same-line reasons (index 800×2, engine 760×2, 860, 520). Not done, because `pitch.html` is being edited by another session: the 4 counted pitch queries at `37/45/52/54` and the 2 equality-only queries at `193` (900) and `205` (639). Also open: the token-side snap (`breakpoint.sm` 639 → 640, `md` 767.5 → 768, `xl` 1023.5 → 1024) — it cannot land alone, because it flips T6 on `index.html:68` and `pitch.html:205` in the same commit.

### Task 13: Generate `foundations.md`
**Objective:** The scale reference can no longer contradict the source.
**Files:** `scripts/build-foundations.mjs` (new), `design-system/foundations.md` (generated), `design-system/README.md` (router).
**Steps:**
1. Emit tables for all **20** groups: key, value, type, role, consumer count.
2. Emit the theme contract (which slots flip) and the type scale with line-height per step.
3. Mark the file `GENERATED — do not hand-edit · regenerate: node scripts/build-foundations.mjs`.
4. Cut README to ~60 lines: what/where/pipeline/rules, linking foundations.
**Verify:** regenerate produces byte-identical output; README contains no scale table; every count matches `tokens.json`.

**Shipped in this commit:** `scripts/build-foundations.mjs` renders `design-system/foundations.md` from `tokens.json` (values, types, role maps) and refuses to write unless `tokens.css` agrees — all 186 `:root` values and every theme block's non-null cells are compared before the doc is emitted. The doc carries the required `GENERATED — do not hand-edit · regenerate: node scripts/build-foundations.mjs` banner, one table per group in sorted order (**20 tables, 186 rows, each key exactly once**), a role column naming the theme slots a key fills, and a consumer count defined as product-page `var(--k)` + `CT('--k')`/`WA('--k')` canvas lookups + theme-map cells + gallery swatches, printed as `total (product / theme / gallery)`. It also prints the gate's narrower T8 view (**11** unconsumed: the 3 canvas-only track keys the `var()` counter cannot see plus the 8 gallery/doc consumers), so the doc and the gate name the same debt. The theme section shows all 4 maps, 17 role vars, nulls 2/5/5/3 with the fall-through targets; the type section pairs every `typography.size.*` step with its `line-height.*` and the computed px. An unpaired size fails the generator, so a new step cannot ship without a stated leading. README is 59 lines and points at the generated doc for every value.

**REF GATE 1 — how to judge:** `node scripts/lint-tokens.mjs --check` reports the token-set classes at their measured ceilings — T8 **11** (not 0: 3 canvas-only `CT()` names + 8 gallery/doc consumers are recorded in the budget note), T9 **0**, T10 0, T11 0, T13 0 — and `tokens.json` lands at **186 keys / 20 groups**; `tokens.css` has 4 theme blocks, each declaring all 14 slots with explicit nulls (2/5/5/3); switching `data-ds-theme` re-skins a page; engine renders one palette with the decoys gone and 0.000% pixel diff; `foundations.md` **exists and is generated** — 186 rows across 20 group tables, the 4-map/17-var theme contract with nulls 2/5/5/3, every type step with its line-height, and `node scripts/build-foundations.mjs` reproducing it byte-for-byte (CI runs the same script with `--check`); `design-system/README.md` is a router with no scale tables.

**Measured at this lane's HEAD:** build `--check` byte-stable (186 keys / 20 groups / 4 themes, sha256 `1a2c1d33…`); foundations `--check` byte-stable (20 group tables / 186 rows, sha256 `ddd3b94f…`); lint `--check` PASS 0 over budget, 28 exempt, 0 bad-allow; doc-counts PASS (README 186 keys / 20 groups = source, 59 lines); anchors PASS; U1 0; index/engine pixel diff 0 at 1440 and 390; pitch.html untouched by this lane.

---

## Phase 2 — Component library {#phase-2}

*Tags:* components, css, js, icons, gallery · *Status:* 0/7 tasks · GATE OPEN

One vocabulary, one behaviour contract, per-surface accent via variables. Additive: pages keep their IA.

| # | Task | Done when |
|---|---|---|
| 14 | `base.css` | focus ring, sr-only, skip link, scroll-x, target floor, reduced motion — one rule each |
| 15 | `components.css` | 18 blocks, 100% `var()`, four densities, no page colour |
| 16 | `components.js` | Overlay, Tabs, MenuButton, Toast/announce, focus-preserve, field clear |
| 17 | `icons.svg` | 24 symbols, `currentColor`, size tokens, `aria-hidden` convention |
| 18 | Gallery specimens | 12+ canonical components with live hover/focus/disabled/error and consumer counts |
| 19 | `components.md` | 19 specs with status; deferred pro-editor specs moved to `proposed/` |
| 20 | Component gate | new files scanned; duplicate selectors and dialog semantics statically checked |

### Task 14: `base.css`
**Objective:** One place for the rules currently duplicated on every page.
**Files:** `design-system/base.css` (new); pages link it after `tokens.css`.
**Steps:**
1. `.ds-sr-only`, `.ds-skip-link` (visible on focus, targets `main`), `.ds-scroll-x` (`tabindex=0 role=region` guidance).
2. One focus selector list: `a, button, [role], input, select, textarea, summary, [tabindex]` → `outline: var(--focus-width) solid var(--focus-color); outline-offset: var(--focus-offset)`. Delete the 9 scoped ring rules from pages.
3. Control floor: `min-block-size: var(--touch-min)` on interactive primitives; density opt-down only with a documented hit-area expansion.
4. `@media (prefers-reduced-motion: reduce)` collapses `--motion-duration-*` to `0ms` once.
**Verify:** 0 raw px in the file except hairlines; gallery + all pages keep visible focus; reduced-motion emulation stops transitions on all 4 pages.

### Task 15: `components.css`
**Objective:** The canonical component set the pages will consume.
**Files:** `design-system/components.css` (new).
**Steps:**
1. Blocks: `ds-btn` (primary/secondary/ghost/danger, `--xs` inline), `ds-icon-btn`, `ds-field`/`ds-input`/`ds-select`, `ds-chip`, `ds-segmented`, `ds-tabs` (dot/underline), `ds-nav-item`, `ds-card`/`ds-panel`, `ds-table` (compact/cozy + `data-label` mobile), `ds-sheet`, `ds-dialog`, `ds-menu`, `ds-toast`, `ds-badge`, `ds-empty`, `ds-progress`, `ds-tooltip`, `ds-pager`, `ds-theme-toggle`.
2. Geometry: control 4px, panel 8px, pill only chips/badges; heights from `--ds-control-h` (34/40/44/46).
3. Surface accent via `--ds-accent`, `--ds-accent-ink`, `--ds-bg`, `--ds-surface-1/2`, `--ds-rule`, `--ds-ink`, `--ds-muted`.
4. State is never a class: `[aria-selected]`, `[aria-pressed]`, `[aria-expanded]`, `[aria-disabled]`, `[data-loading]`, `[data-armed]`.
**Verify:** 0 raw hex/duration/radius/z; each block renders at 4 densities in a scratch harness; no selector mentions a page name.

### Task 16: `components.js`
**Objective:** Behaviour that accessibility and consistency both depend on.
**Files:** `design-system/components.js` (new, ES module, no deps).
**Steps:**
1. `Overlay`: `open(el,{labelFrom})` sets `role=dialog aria-modal=true aria-labelledby`, saves invoker, focuses first control, traps Tab/Shift+Tab, closes on Escape, restores focus, `inert`s background. Closed = `hidden` + `inert`, never transform-only.
2. `Tabs`: roving tabindex, ←/→/Home/End, `aria-controls`/`aria-labelledby`, panel swap.
3. `MenuButton`: `aria-haspopup/expanded/controls`, roving items, Escape, outside click, focus return.
4. `Toast`/`announce`: `role=status aria-live=polite aria-atomic`, pause on hover/focus, 10s minimum.
5. `focusPreserve`: snapshot `{key,index}` before an innerHTML render, restore after.
**Verify:** keyboard-only gallery pass: focus stays in dialog, Esc returns it, arrows move tabs, toast announced in VoiceOver; no page-level errors in console.

### Task 17: `icons.svg`
**Objective:** Replace unicode glyphs and two SVG dialects with one set.
**Files:** `design-system/icons.svg` (new), `tokens.json` icon sizes.
**Steps:**
1. Draw/collect 24 symbols at 24×24, 1.75px stroke, `currentColor`, `fill=none` where line.
2. Define `icon.size.sm/md/lg`; document `<svg aria-hidden="true"><use href="…"></use></svg>` and the labelled-icon rule.
3. Inventory every glyph currently used (`→ ← × ✕ ⋯ ☰ ⚙ ☾ ▶ ✓`) and map it to a symbol or a text string.
**Verify:** sprite renders in gallery; swap one glyph on each page with no layout shift; no `aria-hidden` missing on decorative icons.

### Task 18: Gallery specimens
**Objective:** The gallery documents only what ships and proves every state.
**Files:** `design-system/index.html`.
**Steps:**
1. Replace the 9 docs-only specimens with the canonical set; each frame shows default/hover/focus/disabled plus error/loading where applicable.
2. Add sections: opacity, layout/container, iconography, accessibility (contrast table with ratios).
3. Every specimen header shows the consumer count per surface, computed.
4. Remove or relabel any specimen with 0 product usages.
**Verify:** gallery 1440 + 390 light/dark screenshots; axe 0 serious/critical; every caption count computed.

### Task 19: `components.md`
**Objective:** Specs describe the shipped library, not a deferred pro editor.
**Files:** `design-system/components.md`.
**Steps:**
1. 19 sections: purpose, anatomy, variants, states, token map, dos/don'ts, a11y.
2. Status column: `live` / `proposed`; move Timeline Chips, Inspector Pills, Transport Bar to a `## Proposed` appendix with a "not built" banner.
3. Add the 10 missing specs: theme toggle, step rail, table, footer, select, file picker, project modal, asset modal, context menu, scroll region.
4. Link each spec to its gallery frame id.
**Verify:** every live component in the register has a section; every section has a gallery anchor; no `proposed` item is presented as shipped.

### Task 20: Component gate
**Objective:** Keep the new layer from drifting the moment it lands.
**Files:** `scripts/lint-tokens.mjs`.
**Steps:**
1. Add `components.css` / `base.css` to scanned files; raw values fail.
2. Fail duplicate selector blocks with identical declarations inside one page (the 8 engine duplicates).
3. Static check: an element with `aria-modal` must also have `role=dialog` and `aria-labelledby`.
4. Fail a component class defined in two files.
**Verify:** current tree fails with the 8 duplicates listed; after cleanup passes; a deliberately unlabelled modal fails.

**REF GATE 2 — how to judge:** open the gallery at 1440; every component shows four states without hovering a picture; resize to 390 and the table/specimens reflow without page overflow; run the gate (0 raw values in the new CSS); keyboard through the gallery with the components.js loaded and confirm dialog trap/return, tab arrows, toast announcement.

---

## Phase 3 — Page adoption {#phase-3}

*Tags:* wiki, pitch, engine, gallery, migration · *Status:* 0/4 tasks · GATE OPEN

File-disjoint lanes. Each page keeps its own `<style>` for layout and its own accent. Every visual delta must be declared in the lane report.

| # | Task | Done when |
|---|---|---|
| 21 | Wiki adoption | wiki consumes ds- classes, landmarks, tabs, focus preservation; both themes pass |
| 22 | Pitch adoption | pitch consumes ds- classes, trapped drawers, correct tabs/tables/export targets |
| 23 | Engine adoption | engine consumes ds- classes, dialog semantics, live toast, one palette, menu contract |
| 24 | Gallery adoption | gallery's own specimens use ds- classes; docs-only forks removed |

### Task 21: Wiki adoption
**Files:** `index.html` (all inline CSS/JS).
**Steps:**
1. Link `base.css` + `components.css` + `components.js`; keep layout CSS.
2. Replace `.eng`, `.pitch`, `.tab`, `.chip`, `.step`, `#search`, `#theme`, `.badge`, `.nav button`, `.token button`, `table.map` with `ds-` classes.
3. Add `<header>`, `<nav aria-label>`, `<main>`, keep `<footer>`; add skip link.
4. Tabs: real tablist/tab/tabpanel + `aria-controls`; chips become `aria-pressed`; steps get `aria-current`.
5. Wrap `draw()` in `focusPreserve`; add `announce()` for filter count and copy.
6. Target sizes: copy 28→40 (hit area), pager 38→40; body 15→15.2; `.step` 16.8→15.2/600.
**Verify:** axe 0 serious/critical at 1440/390 light+dark; focus survives tab/chip activation; 0 off-viewport stops; screenshots both themes.

### Task 22: Pitch adoption
**Files:** `pitch.html`.
**Steps:**
1. Replace `.btn`/`.btn.ghost`/`.tab-btn`/`.hicon`/`.expbtn`/`.dpill`/`.pill`/`.fxswitch`/`.drawer`/`.tbl`/`.track`/`.ftip`.
2. Drawers through `Overlay` (trap, return, `inert`); tabs keep roving + `aria-controls`.
3. Export targets 27→32 min, text 11.52→12.8; TOC rows 31→36; mobile tabs 30→40 on coarse pointers.
4. Table heads get `scope`; print repeats `thead`.
5. Chart rects get `role="img"`; keep the focus tooltip.
**Verify:** Tab 24 no longer escapes the drawer; axe 0 serious; print preview repeats headers; 1440/390 screenshots; no page overflow.

### Task 23: Engine adoption
**Files:** `engine.html`.
**Steps:**
1. Replace `.tools button`, `#addNode`, `#addScene`, `#goShot`, `#side button`, `#projNav`, `#pmNav`, `.sw`, `#drawer`, `#projModal`, `#assetModal`, `.modal .box`, 7 menus, `#toast`, `#drawerX`, `.tchip`, `.filehide`.
2. Overlay controller on drawer + both modals: labels, trap, return, background `inert`; closed state `hidden`+`inert`.
3. Toast `role=status` + pause; `#dots` becomes `MenuButton`; remove the 8 duplicate selectors.
4. Label `#chapterSel`; file inputs `tabindex=-1` behind visible triggers.
5. One palette (Task 11) and `aria-label` on the 3 navs; add `<main>` and `<footer>`.
**Verify:** 0 off-viewport tab stops; axe 0 serious; modal open→focus-in, Tab cycles, Esc→return; 1440/390 screenshots; pixel diff 0.000% except declared deltas.

### Task 24: Gallery adoption
**Files:** `design-system/index.html`.
**Steps:**
1. Replace `.btn--*`/`.field`/`.tool`/`.sheet`/`.pill`/`.badge`/`.toast` specimens with `ds-` classes.
2. Delete specimens for components that do not ship; add the new primitives.
3. Ensure the page itself consumes the same CSS the product does (no parallel specimen vocabulary).
**Verify:** gallery CSS contains no component definitions; only layout + specimen frames; axe 0 serious.

**REF GATE 3 — how to judge:** for each page, compare 1440 and 390 before/after. The only differences allowed are the declared deltas in the lane report. Every page uses `ds-` classes for controls, has one `<main>`, a skip link, and no off-viewport tab stops. Axe baseline is 0 serious/critical.

---

## Phase 4 — Accessibility and interaction hardening {#phase-4}

*Tags:* wcag, keyboard, canvas, contrast, ci · *Status:* 0/5 tasks · GATE OPEN

| # | Task | Done when |
|---|---|---|
| 25 | Canvas keyboard layer | every canvas operation has a keyboard path and a list equivalent |
| 26 | Focus + live regions | wiki focus preservation, filter/copy/toast announced once |
| 27 | Contrast tokens | all 4 failing pairs fixed; ratio table generated |
| 28 | Tables, chart, print | captions/scopes, chart roles, print headers |
| 29 | Verification jobs | axe/keyboard/contrast/target checks run in CI |

### Task 25: Canvas keyboard layer
**Files:** `engine.html` canvas JS, `design-system/components.js` (optional helper).
**Steps:**
1. Make `#cv` focusable (`tabindex=0`, `role=application`, `aria-describedby` instructions).
2. Arrow keys move a node cursor; Enter opens; `N` creates; Delete removes; `C` enters connect mode; Escape cancels.
3. Keep the existing Scenes list as the accessible equivalent of every canvas operation.
4. Announce the selected node and mode.
**Verify:** complete create→connect→rename→delete flow with keyboard only; screen reader announces mode/selection; axe canvas role valid.

### Task 26: Focus + live regions
**Files:** `index.html` render functions, `design-system/components.js`.
**Steps:**
1. Replace innerHTML region rewrites with `focusPreserve` (keyed) on tabs, chips, steps.
2. Add one polite status region; announce filter count, copy confirmation, panel change, toast.
3. Remove label-swap-only confirmations.
**Verify:** activating a tab keeps `activeElement` on the same logical control; VoiceOver announces each change once; no double announcements.

### Task 27: Contrast tokens
**Files:** `tokens.json`, pages consuming accent/amber/badge.
**Steps:**
1. Add `color.wiki.*.accent-ink` and consume on `.eng`, `.badge`, `.yt`; dark ≥4.5.
2. Darken small amber text to ≥4.5 (≈#8E5200) or raise to 18.66 bold.
3. Recompute badge info/dev pairs to ≥4.5; badge text ≥12px.
4. Generate a contrast table (pair, ratio, pass) into `accessibility.md`.
**Verify:** contrast script reports 0 fails across all themes; table regenerates.

### Task 28: Tables, chart, print
**Files:** wiki `.map`, pitch 6 tables, gallery matrix, pitch chart/print.
**Steps:**
1. Add visually hidden `<caption>` and `scope="col"`; mobile rows get `data-label`.
2. Chart hit rects get `role="img"` (or one focusable plot).
3. Print: `thead{display:table-header-group}`, print doc title, prose URL expansion only.
4. Gallery matrix scroll region focusable with a visible ring.
**Verify:** axe table/aria checks 0; print preview repeats headers; matrix scrolls by keyboard at 390.

### Task 29: Verification jobs
**Files:** `.github/workflows/ds-gate.yml`, `tools/` (playwright + axe), `scripts/`.
**Steps:**
1. axe on 4 pages × {1440,390} × themes + 4 scripted states; fail serious/critical.
2. Keyboard script: every Tab stop in viewport, focus survives activation, Esc closes top overlay and returns focus.
3. Contrast and target-size scripts (blocking after Phase 5).
4. Publish artifacts + a one-line baseline in the PR.
**Verify:** CI red on a reverted focus fix; baseline committed; run time under 5 min.

**REF GATE 4 — how to judge:** axe 0 serious/critical on all pages and states; contrast 0 fails; 0 off-viewport stops; keyboard-only pass of the 4 core tasks (filter wiki, switch docs, edit a scene, read/export pitch); print preview. **All five, not four.**

---

## Phase 5 — Visual reconciliation + reference intake {#phase-5}

*Tags:* visual-language, reference, type, geometry, motion · *Status:* 0/7 tasks · GATE OPEN

Fix what the eye sees, after the structure is sound. Keep accents and IA distinct.

| # | Task | Done when |
|---|---|---|
| 30 | Reference intake protocol + intake #1 | `design-system/references/` index + template + measured intake record |
| 31 | Accent-ink + two-hue discipline | no 2.05:1 accent text; amber = annotation only |
| 32 | Pitch separation + heights | cards visible as cards; TOC/export targets on scale |
| 33 | Label voice + type scale | two label roles; ≤6 sizes/surface; no literal sizes |
| 34 | Control geometry | ≤3 height families/page; one radius policy |
| 35 | Footer/chrome + states/motion | every surface closes the same way; 3 durations; hover/disabled consistent |
| 36 | Reference #1 component adoption | segmented/field/tab-bar/clip variants shipped as documented opt-ins |

### Task 30: Reference intake protocol + intake #1
**Objective:** Make the language mouldable without letting references leak into IA.
**Files:** create `design-system/references/README.md`, `design-system/references/TEMPLATE.md`, `design-system/references/2026-11-24-studio-editor.md`, `design-system/references/assets/…` (source image).
**Steps:**
1. Template sections: source, measured palette, surface ladder, geometry, type, density, iconography, motion feel, components to borrow, explicitly not copied, mapped tokens/components, adoption tasks, owner decision.
2. Record intake #1 from the attached three-screen mobile editor:
   - palette `#111111` page / `#1C1C1E` panel / `#2A2A2C` raised / `#2E72FF` accent / `#30384C` tint;
   - radii 12 card / 10 control / 8 thumb / 6 clip;
   - controls 48 field, 52 CTA; type 17/15/13/11; line icons 1.5–2px; sentence-case labels.
3. Map to our terms: surface ladder → `theme.engine.*`; segmented → `ds-segmented`; field/select → `ds-field`; tab bar → new `ds-tabbar` (mobile only); clip selection → existing `ds-selection`/track tokens; CTA block → `ds-btn--block` variant.
4. State what is not copied: the editing IA, platform labels, brand assets, and the blue accent unless the owner chooses it.
5. Add a rule to the index: a reference changes values/components only; never page IA; every intake ends in a theme-map diff or a component variant, never page-specific CSS.
**Verify:** intake file carries ≥6 measured values and a rejected-items list; the protocol is referenced from `README.md` and `governance.md`.

### Task 31: Accent-ink + two-hue discipline
**Files:** `tokens.json`, `index.html:16,50,58`, gallery.
**Steps:**
1. Add `color.wiki.light.accent-ink` and `color.wiki.dark.accent-ink`; consume on `.eng`, `.badge`, `.yt`.
2. Confine amber to annotation/callout and diagram fills to `diagram.fill`; delete amber from figure fills.
3. Make the engine's primary accent visible on the default screen (or explicitly document selection vs action accent).
**Verify:** dark `.eng` ≥4.5; one chromatic role per surface in the computed colour census; screenshots both wiki themes.

### Task 32: Pitch separation + heights
**Files:** `tokens.json`, `pitch.html`.
**Steps:**
1. Raise `color.pitch.rule` to ≈#33333A (≥1.5:1 on surface-1) or lift surface-1 one step; prefer the rule.
2. TOC 31→36 (40 coarse), export 27→32 and 12.8px, header links hit area 32.
3. Keep 46px reading controls; no other heights.
**Verify:** card boundary visible in a 1440 crop and 50% downscale; ≤3 interactive heights on the page.

### Task 33: Label voice + type scale
**Files:** all pages, `tokens.json`.
**Steps:**
1. Define `label.ui` (sans, sentence case, 0 tracking) and `label.data` (mono, 0.16em); map every label to one.
2. Engine chrome → `label.ui`; timecode/eyebrow/token → `label.data`; stop literal tracking .04/.05/.06/.14/.10em.
3. Drop `.7rem`/`22px`/`.9rem`/`.62rem`/`11px`; body 15.2; merge 22→21.6; 11.2→11.52.
4. Target ≤6 distinct sizes per surface.
**Verify:** computed distinct sizes ≤6 per page; `grep` for raw rem/px font sizes = 0; label roles used on all 4 surfaces.

### Task 34: Control geometry
**Files:** wiki/pitch/engine control rules.
**Steps:**
1. One height per cluster: wiki header 40, engine chapter bar 44/40 consistent, pitch header 46.
2. Wiki pager radius 8→4; icon buttons square except the drawer close circle.
3. Engine `.tools`/`#side` widths from tokens; no 39/35/32 one-offs.
**Verify:** height histogram ≤3 families per page; radius census 0/4/8/pill only; screenshots.

### Task 35: Footer/chrome + states/motion
**Files:** engine footer, wiki/pitch hover states, all durations.
**Steps:**
1. Engine `<footer>` with hairline + `--typography-size-meta` muted line.
2. Add hover/disabled to wiki tabs/chips and pitch TOC/buttons; collapse durations to 3 (instant 160, hover 240, slow 320) + reduced-motion. This is where Phase 1's deferred **duration cardinality 10 → 5** lands (the 5 bands then fold to the 3 shipped values) — every merge changes a computed time, so it cannot ride Phase 1's alias-only commit.
3. Standardise hover lift 1.06; remove brightness 1.08/1.1.
4. **z banding 15 → 10** (also deferred from Phase 1 Task 8): band the 15 `z.*` keys into 10 documented bands, keep the stacking order pixel-identical on all four pages, and record every member of each band.
**Verify:** hover/disabled crop set; reduced-motion emulation kills transitions; duration tokens = 3 (from 10); `z.*` = 10 bands covering the same computed order; no two duration steps within 0.02s or two z steps within ≤2 unless listed as a band.

### Task 36: Reference #1 component adoption
**Files:** `components.css`, `components.js`, pages as needed, gallery.
**Steps:**
1. Ship `ds-segmented` (labelled + icon), `ds-field`/`ds-select` at 44/48 coarse, `ds-tabbar` (mobile only), `ds-btn--block` (icon+title+subtitle), `ds-row` (thumb+meta).
2. Adopt one per real need: pitch switch → segmented; engine selects → field/select; wiki/pitch mobile nav → tabbar if it replaces the rail.
3. Record the adoption in the intake file with before/after screenshots.
**Verify:** each adopted component has a spec + gallery frame + consumer; no page-specific override.

**REF GATE 5 — how to judge:** open all four pages at 1440 and 390, wiki in both themes; the set reads as one product by geometry, hairline, label voice and colour-as-state while accents/IA stay distinct; computed counts (≤6 sizes, ≤3 heights, one accent role per surface) hold; the reference intake file explains every borrowed value and every rejected one.

---

## Phase 6 — Governance and release {#phase-6}

*Tags:* docs, governance, changelog, ci, release · *Status:* 0/4 tasks · GATE OPEN

| # | Task | Done when |
|---|---|---|
| 37 | Docs IA completion | foundations/components/patterns/surfaces/accessibility/verification/governance/decisions all exist and are true |
| 38 | Version + changelog | `ds-v1.0.0` tagged; CHANGELOG entry; change classes documented |
| 39 | CI hardening | doc counts, anchors, links, html-validate, axe, screenshots all blocking |
| 40 | Final audit | before/after numbers published; gate and docs agree |

### Task 37: Docs IA completion
**Files:** `design-system/{README,foundations,components,patterns,surfaces,accessibility,verification,governance,decisions,audit-checklist}.md`.
**Steps:**
1. README = router (~60 L). Foundations = generated scales. Components = 19 specs. Patterns = 8 compositions, corrected. Surfaces = per-page contract (themes, print, breakpoints, export, browser support). Accessibility = generated contrast + focus/target/ARIA contract. Verification = gate classes, blind spots, CI, PR evidence. Governance = 6 change classes, semver, deprecation, review. Decisions = append-only ADR stubs seeded with: one-family type, no display face, 2px grid + debt, reference is feel-only, touch legacy.
2. Fix `patterns.md` claims that reference unconsumed tokens or export behaviour only pitch has.
3. Keep `audit-report.md` generated with a "machine receipt" footer; archive `audit.md`.
**Verify:** every measured claim cites a command or `file:line`; doc-count script passes; no dead token references in docs.

### Task 38: Version + changelog
**Files:** `CHANGELOG.md`, `DESIGN-SYSTEM.md`, git tag.
**Steps:**
1. Write `DESIGN-SYSTEM.md` (5-line pointer + current `ds-v` version).
2. `CHANGELOG.md` Keep-a-Changelog with the v1.0.0 entry naming the token/component changes.
3. Tag `ds-v1.0.0`; document `token:add|value|rename|remove`, `component`, `docs`, `fix` classes.
**Verify:** `git tag -l` shows the tag; changelog links every phase's [plan:] anchor; deprecations listed.

### Task 39: CI hardening
**Files:** `.github/workflows/ds-gate.yml`, `tools/`.
**Steps:**
1. Add doc-count, anchor/id, link check, html-validate.
2. Add axe/keyboard/contrast/targets (Phase 4) and screenshot matrix (both themes, 1440/390) with artifact upload.
3. PR evidence: gate tail, byte-stability, doc counts, screenshots, contrast row, changelog line.
**Verify:** a deliberate regression in each class fails the correct job; `main` is green; Vercel preview unchanged.

### Task 40: Final audit
**Files:** `design-system/audit/2026-12-…/` (new dated folder), gallery.
**Steps:**
1. Re-run the 5 audit lanes' measurements against the final tree.
2. Publish before/after: orphan tokens 91→0; distinct sizes 16→≤6/surface; component forks 24→0; axe serious 0; contrast fails 4→0; stale claims 20→0.
3. Confirm every page at 1440/390, wiki both themes, and that the gallery matrix equals computed values.
**Verify:** gate PASS, CI green, screenshots committed, and the "definition of done" below all true.

**REF GATE 6 — how to judge:** from a fresh clone, one command regenerates tokens and foundations byte-identically; one command runs the gate and verification; every doc claim is checkable; `ds-v1.0.0` exists. **Pass means a stranger can maintain this without asking you.**

---

## Reference intake protocol (standing, not a phase)

A reference is **visual language only**: surface layering, hairline, geometry, type/leading, density, iconography, accent role, motion feel. Never IA, layout, platform naming, or brand assets.

Each intake is a file in `design-system/references/` with:

| Section | Required content |
|---|---|
| Source | image/URL, date, what it is |
| Measured | palette hexes, radii, control heights, type sizes, density, stroke |
| Borrow | components/decisions worth adopting |
| Reject | IA/layout/brand items deliberately not copied |
| Map | reference value → our token/component/variant |
| Decision | adopt / defer / reject, owner call |
| Proof | before/after screenshots + gate output |

**Changing a reference later** = edit a theme map value or add a component variant, regenerate, screenshot. It is never a page-specific override. That is the mutability contract.

---

## File map

| Path | Role |
|---|---|
| `design-system/tokens.json` | only hand-edited value source; 3 tiers, 4 theme maps |
| `design-system/tokens.css` | generated `:root` + `[data-ds-theme]` blocks |
| `design-system/base.css` | focus, sr-only, skip link, scroll-x, target floor, reduced motion |
| `design-system/components.css` | 18 canonical blocks, token-only |
| `design-system/components.js` | Overlay/Tabs/Menu/Toast/focus-preserve |
| `design-system/icons.svg` | 24-symbol sprite |
| `design-system/foundations.md` | generated scale/role reference |
| `design-system/components.md` | 19 specs, status column |
| `design-system/patterns.md` | 8 compositions |
| `design-system/surfaces.md` | per-page contract |
| `design-system/accessibility.md` | generated contrast + a11y contract |
| `design-system/verification.md` | gate/CI/PR evidence |
| `design-system/governance.md` | change classes, semver, deprecation |
| `design-system/decisions.md` | ADR stubs |
| `design-system/references/` | intake index + template + records |
| `design-system/index.html` | rendered gallery, computed counts |
| `scripts/build-tokens.mjs` | generator + `--check` + type validation |
| `scripts/build-foundations.mjs` | generated docs tables |
| `scripts/lint-tokens.mjs` | V1–V8, U1 + T1–T15 |
| `scripts/check-doc-counts.mjs` | docs-vs-source assertion |
| `scripts/check-anchors.mjs` | ids/anchors |
| `tools/` | playwright + axe dev deps (nested manifest) |
| `.github/workflows/ds-gate.yml` | CI verification |

---

## Pitfalls

- **Do not mass-snap spacing.** The 2px micro-grid is load-bearing; a 4px snap visibly tightens toolbars. Snap only within 0.8px; log everything else as debt.
- **Do not unify accents or IA.** Champagne, teal and the warm signal are identity; wiki browse, deck narrative and canvas workspace are different jobs. Unify the *rule*, not the hue.
- **A vision claim is a hypothesis.** The audit already discarded "6 tokens vs 8 swatches" and "clipped without ellipsis". Confirm any mechanism with one grep or computed value before designing a fix.
- **390px captures need CDP device emulation.** macOS Chrome clamps `--window-size` to 500px; a "390" screenshot then lies. Force scheme via `Emulation.setEmulatedMedia` and assert a corner pixel.
- **Never hide an overlay with transform only.** Closed = `hidden` + `inert`; otherwise it stays in the tab order (7 off-viewport stops measured).
- **The `font:` shorthand hides size and line-height.** Gate T1 must parse it or the body bypass survives.
- **Renaming a token breaks docs and gallery.** Grep every cite, run T8/T9/T10, and keep a one-release deprecated alias.
- **Gallery counts must be computed.** Two hardcoded counts were already wrong on the day they were written.
- **Vercel is static.** No root `package.json`; dev tooling stays in `tools/`. Do not add a build step to deploy.
- **Lane discipline.** One owner per file; commit forward only, never amend/reset; add files by path; `git add .` is banned while siblings hold work.

---

## Definition of done

All must be true, measured, and quoted in the final report:

1. `node scripts/build-tokens.mjs --check` byte-identical; `node scripts/build-foundations.mjs` byte-identical.
2. `node scripts/lint-tokens.mjs --check` PASS: 0 violations, 0 product-orphan tokens, 0 duplicate role values, 0 type mismatches, 0 `!important`, 0 inline-style paint.
3. All 4 pages consume `ds-` components; page `<style>` carries layout only.
4. `0` shared-selector duplication; `0` duplicate selector blocks within a page.
5. axe: 0 serious/critical on 4 pages × 1440/390 × themes + 4 scripted states.
6. Contrast: 0 failures across all themes; table published.
7. 0 off-viewport tab stops; overlays trap and return focus; toast/live regions announce.
8. Targets: every interactive ≥40px or a documented inline-link exception.
9. Type: ≤6 distinct sizes per surface; one body size/leading token; 0 literal font sizes/weights/tracking.
10. Visual: gallery matrix equals computed values; ≤3 control-height families per page; one accent role per surface.
11. Docs: 20 stale claims → 0; every count computed; every measured claim cites a command or `file:line`; `ds-v1.0.0` tagged.
12. Reference intake #1 recorded with measured values, map, rejected items, and adoption proof.

---

## Handoff

Execute with `subagent-driven-development`: one fresh subagent per task, spec-compliance review then code-quality review. Phase 0 is sequential; Phase 1 is one token owner; Phase 2 splits CSS/JS vs docs/gallery; Phase 3 runs four file-disjoint page lanes; Phases 4–5 run per-page lanes after tokens are frozen; Phase 6 is parent-only integration.

**Open questions to answer before Phase 1 starts:** blue vs warm engine accent; whether `color.pro.*` is a staged future product; wiki 34px controls as density or legacy; `typography.size.ui` vs `lede` retirement. Everything else has a recommended verdict above.
