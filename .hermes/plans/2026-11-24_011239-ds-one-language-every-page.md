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
**Verify:** `--check` exits 0 with the landed budgets (V1–V8 0, U1 0, T1 10, T2 37, T3 27, T4 52+3, T8 104, T9 5, T10 0, T11 0, T13 0, T14 8, T15 200 — Phase 0 intermediate budgets, superseded by Phase 1 receipts; T8/T9/T10/T11/T13 re-seed when Phase 1 widens their scope, and every re-seed is recorded in `audit-report.md`); inserting `body{font-size:15px}` exits 1.

### Task 6: Build validation + CI
**Objective:** Make the committed CSS provably generated and the docs provably current.
**Files:** `scripts/build-tokens.mjs`, `scripts/check-doc-counts.mjs` (new), `scripts/check-anchors.mjs` (new), `.github/workflows/ds-gate.yml` (new).
**Steps:**
1. Add `--check` to the generator: compare a fresh render to disk, exit 1 on diff, do not write.
2. Validate `type` against a regex table (`color`, `dimension`, `fontFamily`, `fontSize`, `fontWeight`, `duration`, `cubicBezier`, `number`, `shadow`); reject `other`.
3. CI job 1–4: build `--check`; `lint-tokens --check`; doc-count assertion (README keys/groups, gallery tags); anchor/id closure; `html-validate` on 4 files.
4. Keep tooling dependency-free; no root `package.json`.
5. Validate alias targets: a leaf whose whole value is `var(--x)` must resolve to a name this build emits (`:root` token key or one of the 17 theme role vars); a dangling pointer or an alias cycle fails `--check` and names the key path. Landed in the Phase 1 close-out — the 7 live aliases (6 real + `focus.color`) pass, and re-pointing `spacing.base` at `--spacing-legacy-gone` exits 1.
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
| 10 | Wire the 39 orphans | ✅ every wired key has a consumer; T8 104 → **11** at the Phase 1 close, then **10** once `components.css` consumed `opacity.disabled` — all recorded in the budget note (2 canvas-only `CT()` names — `color.engine.track.fx` and `.title` — + 8 gallery/doc consumers) · wired `7733da1`+`10285cc`, count closed `2897a73`, re-seeded in the Phase 2 gate commit |
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

**Shipped:** body type, layout widths, touch, elevation and weight/tracking wiring landed in `7733da1`+`10285cc`. The count is **T8 11, not 0** at that SHA, now **10**, and every key is named rather than waived: **2** are canvas-only — `color.engine.track.fx` and `color.engine.track.title` are read only through `CT('--…')` string arguments in `engine.html:804`, which a `var()` counter cannot see — and **8** remain gallery/doc consumers whose product wiring is Phase 3 work: `color.engine.track.audio` (gallery swatch only; it appears in no page at all), `elevation.ring/inset`, `icon.size.md/lg`, `radius.lg`, `spacing.section`, `tracking.label`. `opacity.disabled` left the list when `components.css` shipped, which is why the Phase 2 receipt reads **10**, not 11. `scripts/lint-tokens.mjs` prints the list on every run and the budget note explains it, so the debt is visible instead of hidden behind a 0.

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

**Shipped in this commit:** `scripts/build-foundations.mjs` renders `design-system/foundations.md` from `tokens.json` (values, types, role maps) and refuses to write unless `tokens.css` agrees — all 186 `:root` values and every theme block's non-null cells are compared before the doc is emitted. The doc carries the required `GENERATED — do not hand-edit · regenerate: node scripts/build-foundations.mjs` banner, one table per group in sorted order (**20 tables, 186 rows, each key exactly once**), a role column naming the theme slots a key fills, and a consumer count defined as product-page `var(--k)` + `CT('--k')`/`WA('--k')` canvas lookups + theme-map cells + gallery swatches, printed as `total (product / theme / gallery)`. It also prints the gate's narrower T8 view (**11** unconsumed: the 2 canvas-only track keys the `var()` counter cannot see plus the 9 gallery/doc consumers), so the doc and the gate name the same debt. The theme section shows all 4 maps, 17 role vars, nulls 2/5/5/3 with the fall-through targets; the type section pairs every `typography.size.*` step with its `line-height.*` and the computed px. An unpaired size fails the generator, so a new step cannot ship without a stated leading. README is 59 lines and points at the generated doc for every value.

**Consumer counts are HEAD-pinned (determinism fix, this commit):** the consumer files — the 3 product pages, the gallery, and `components.css` for the T8 sentence — are read as committed at `HEAD` (`git show HEAD:<path>`), never from the dirty worktree; `tokens.json` and `tokens.css` still come from disk so a token edit regenerates here before it is committed. The first generation was rendered while `pitch.html` was under foreign editing, so the committed doc baked **1573** refs where committed HEAD yields **1561** — it recorded another lane's uncommitted page. Exactly 7 rows moved: `border.width.hairline` 120→119, `radius.none` 6→7, `radius.xs` 64→63, `spacing.2xs` 67→66, `spacing.lg` 16→9, `spacing.sm` 75→74, `spacing.xs` 98→96. A generated doc must not state a count no commit contains, so **commit page changes before regenerating**; the generator falls back to the worktree only when git is unavailable (an exported tree) or the file is untracked. Proven: `--check` exits 0 with the dirty `pitch.html` present, a further simulated pitch worktree edit leaves the output byte-identical, a tracked-page-only worktree edit leaves it byte-identical, and a clean `git archive` of the commit plus a fresh clone both reproduce the same bytes.

**REF GATE 1 — how to judge:** `node scripts/lint-tokens.mjs --check` reports the token-set classes at their measured ceilings — T8 **11** at the Phase 1 close, **10** from the Phase 2 gate commit (2 canvas-only `CT()` names + 8 gallery/doc consumers are recorded in the budget note; `components.css` took `opacity.disabled`), T9 **0**, T10 0, T11 0, T13 0 — and `tokens.json` lands at **186 keys / 20 groups**; `tokens.css` has 4 theme blocks, each declaring all 14 slots with explicit nulls (2/5/5/3), and setting `data-ds-theme` on an element makes those blocks flip all 17 role vars — note that **no product page sets the attribute or consumes a `--ds-*` var yet**, so the re-skin is proven at the block level only and per-page opt-in is Phase 2 work; engine renders one palette with the decoys gone and 0.000% pixel diff; `foundations.md` **exists and is generated** — 186 rows across 20 group tables, the 4-map/17-var theme contract with nulls 2/5/5/3, every type step with its line-height, and `node scripts/build-foundations.mjs` reproducing it byte-for-byte (CI runs the same script with `--check`); `design-system/README.md` is a router with no scale tables.

**Measured at this lane's HEAD:** build `--check` byte-stable (186 keys / 20 groups / 4 themes, sha256 `1a2c1d33…`); foundations `--check` byte-stable (20 group tables / 186 rows / **1561** HEAD-pinned consumer refs, sha256 `26267319…`); lint `--check` PASS 0 over budget, 28 exempt, 0 bad-allow; doc-counts PASS (README 186 keys / 20 groups = source, 59 lines); anchors PASS; U1 0; index/engine pixel diff 0 at 1440 and 390; pitch.html untouched by this lane.

---

## Phase 2 — Component library {#phase-2}

*Tags:* components, css, js, icons, gallery · *Status:* **7/7** · **GATE PASS**

One vocabulary, one behaviour contract, per-surface accent via variables. Additive: pages keep their IA.

**Shipped:** `f912979` (Tasks 14–15: `base.css` + `components.css`), `ac314aa` (Tasks 16–17: `components.js` + `icons.svg`), `0e23798` (AA on the status badges — the `info`/`warning` tones carry a per-theme `--_badge-ink`), `d719a51` (Task 18: the gallery's 19 specimen blocks), `83f2403` (the `[data-ds-compact]` floor opt-out that base.css §6/§8 needed), `595206c` (Task 20: the component gate + the anchor fix + the regenerated receipts), and the Phase 2 close-out docs commit (Task 19). The library is **19 numbered blocks** in `components.css`, 24 symbols in `icons.svg`, and 8 public behaviours in `components.js` (`init tabs menu overlay toast announce copy focusPreserve`) — none of it adopted by a page yet, by design: adoption is Phase 3.

| # | Task | Done when |
|---|---|---|
| 14 | `base.css` | ✅ reset, one focus ring (longhands, `:where()` 0-specificity), `.ds-sr-only`, `.ds-skip-link`, `.ds-scroll-x/y`, target floor with the `[data-ds-compact]` opt-out, reduced motion — 0 raw px except the `calc()` sign and the iteration count · shipped `f912979`, floor opt-out added later |
| 15 | `components.css` | ✅ 19 blocks, `var()` throughout, four densities (34/40/44/46 via `data-ds-density`), no page colour; the only literals are the 6 C1-listed values (dialog geometry, the `--_scrim` default, the `40rem` container threshold) · shipped `f912979` |
| 16 | `components.js` | ✅ `Overlay` (role/`aria-modal`/label/trap/inert/return), `Tabs` (roving + `aria-controls`), `MenuButton`, `Toast`/`announce`, `focusPreserve`, `copy`; auto-init off under `data-ds-manual` · shipped `ac314aa` |
| 17 | `icons.svg` | ✅ 24 symbols, `currentColor`, `icon.size.*`, `<use href="icons.svg#ds-icon-…">` convention, 0 unresolved references (C5) · shipped `ac314aa` |
| 18 | Gallery specimens | ✅ 19 `#spec-*` blocks × 4 theme cells = **76 cells**, every state pinned with `data-state`, `data-ds-manual` (no auto-init), legacy forks still present in the page's `<style>` (Task 24 removes them) · shipped `d719a51` |
| 19 | `components.md` | ✅ **19 live sections** + **3 proposed** (not built) + **3 page patterns** + the **10 newly specified** components; every live section links its gallery frame · shipped in the Phase 2 close-out commit |
| 20 | Component gate | ✅ C1–C6 enforced with measured budgets; `--check` green; each class negative-tested · shipped `595206c` |

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
**Files:** `design-system/components.md`, `design-system/README.md`.
**Steps:**
1. 19 live sections, each with purpose, anatomy, variants, states, token map, dos/don'ts, a11y and a gallery anchor.
2. Status column: `live` / `proposed`; Timeline Chips, Inspector Pills and Transport Bar move to a `## Proposed` appendix behind a "nothing here ships" banner.
3. Add the 10 missing specs: theme toggle, step rail, table, footer, select, file picker, project modal, asset modal, context menu, scroll region.
4. Link each spec to its gallery frame id.
**Verify:** every live component in the register has a section; every section has a gallery anchor; no `proposed` item is presented as shipped.

**Shipped — what the counts are:** **19 live sections**, each with `**Gallery** → index.html#spec-…` and every one of the 19 frame ids used at least once (Card and Surface share a section; Table and Scroll region share a section; Dialog carries the project-modal sheet and the asset-modal box as variants) · **3 proposed** (Timeline Chips, Inspector Pills, Transport Bar — each opens with "**Status: not built**" and names the blocker: no component, no markup, no page usage) · **3 page patterns** (step rail, footer, file picker — page-local, no shipped equivalent) · **10 specs new in this revision** in a register at the top that says, per item, whether it is live and where it lives. README links the file and keeps the `186 keys, 20 groups` line; it gained rows for `base.css`/`components.css`/`components.js`/`icons.svg` and carries no scale table. `check-anchors` resolves all 31 markdown targets the gallery links added.

### Task 20: Component gate
**Objective:** Keep the new layer from drifting the moment it lands.
**Files:** `scripts/lint-tokens.mjs`, `scripts/check-anchors.mjs`, `.github/workflows/ds-gate.yml`.
**Steps:**
1. Add `components.css` / `base.css` to the scanned set; raw values fail.
2. Fail duplicate selector blocks inside one page — keyed by selector **+ at-scope + nesting**, not by identical declarations.
3. Static check: an element with `aria-modal` must also have `role=dialog` and `aria-label` **or** `aria-labelledby`.
4. Fail a component class defined in two files.
5. Resolve `svg#id` references.
6. Ban paint literals in `components.js` / `icons.svg`.
**Verify:** current tree fails with the 8 duplicates listed; after cleanup passes; a deliberately unlabelled modal fails.

**Shipped — the six classes, their measured budgets and why each is real:**

| Class | What it judges | Budget (measured 2026-11-24) |
|---|---|---|
| C1 | raw value in `base.css` / `components.css`: hex, `rgb()`/`hsl()`, or a number with a unit that is not structural | **6** — components.css 6, base.css 0 |
| C2 | duplicate selector in one page, keyed selector + at-scope (`@media`/`@supports`/`@container`) + nesting | **12** — pitch 4, engine 8, index 0, gallery 0 |
| C3 | `aria-modal` ⇒ `role="dialog"` and `aria-label` or `aria-labelledby` | **0** (2 `aria-modal` nodes checked) |
| C4 | a `.ds-*` class defined at top level in two stylesheet sources | **0** |
| C5 | every `<use href="…svg#id">` names a symbol that SVG declares | **0** (48 refs, 24 symbols) |
| C6 | no hex / `rgb()` / `hsl()` in `components.js` or `icons.svg` outside comments | **0** |

C1's structural whitelist is `0`, any `%`, any `fr`, `100vw/dvh`, `2px` only as `outline-offset`, a unitless factor multiplied into a token (`calc(var(--x) * 2)`), a `flex`/`order` factor, the `calc()` sign, and `animation-iteration-count:1`. Everything else is listed in `C1_ALLOW` with a reason and a ceiling of 1 — the six are `560px`, `94vw`, `88vh`, `92vw` (dialog geometry), `rgb(0 0 0 / .6)` (the component-local `--_scrim` default) and `40rem` (the table's `@container` threshold, where `var()` is invalid). An **unlisted** value fails even when the file is under its total, so deleting a listed literal cannot buy room for a new one.

**C2 corrected the plan.** The plan said "fail duplicate selector blocks with identical declarations". Measured, that catches **0** of engine's 8 and **0** of pitch's: every later block adds a declaration (safe-area padding, a tap size, a border-left accent). The rule is now "same selector, same cascade context". C2 is measured on the **committed HEAD blob** — a sibling lane's uncommitted `pitch.html` has 5 duplicates against HEAD's 4, and the gate follows HEAD (CI checks out HEAD) rather than baking another lane's half-finished markup into a budget. The divergence is printed every run.

**check-anchors fixed.** Its HTML branch treated `<use href="icons.svg#ds-icon-…">` as a fragment link and failed 48 times. It now skips a non-`.md`/`.html` target exactly as the markdown branch does, counts the skips (48 today) so they stay visible, and C5 makes the skip non-blind by resolving every symbol. Local and cross-page broken fragments still fail.

**Negative-tested** (a pristine `git archive HEAD` export in scratch, one mutation per case, 16/16 as expected): unlisted hex and `13px` → exit 1 · the structural whitelist (0, 100%, 1fr, `outline-offset:2px`, `flex:1`) → exit 0 · a duplicate selector in the gallery (budget 0) and a 5th in pitch (budget 4) → exit 1 · `aria-modal` without `role`, and `role="dialog"` without a name → exit 1 · `.ds-btn` added to `base.css` → C4 exit 1 · a `<use>` renamed to a missing symbol → C5 exit 1 while anchors stay green · a hex in `components.js` → C6 exit 1 · a local and a cross-page broken fragment → anchors exit 1.

**REF GATE 2 — how to judge:** open the gallery at 1440; **19 specimen blocks × 4 theme cells = 76 cells**, every component showing its states without hovering a picture; resize to 390 and the table/specimens reflow without page overflow; run `node scripts/lint-tokens.mjs --check` — **PASS**, 0 over budget, and the component table reads C1 6/6 · C2 12/12 · C3 0/0 · C4 0/0 · C5 0/0 · C6 0/0; `node scripts/build-foundations.mjs --check` is byte-stable at **186 keys / 20 groups** and **T8 10**; `node scripts/check-anchors.mjs` exits 0 with 48 non-document targets skipped; keyboard through the gallery with `components.js` loaded and confirm dialog trap/return, tab arrows, toast announcement.

**Declared contrast residuals (not Phase 2's to fix, recorded here so no gate claims otherwise):** the gallery's legacy specimens still fail 100 nodes @1440 light / 41 dark — `.badge--paid` is white on `#8A5CF6` = **4.24**, plus `.badge-dev` and the danger-red `.cite` eyebrow; @390 add `scrollable-region-focusable` on `.matrix-wrap`. The shipped `.ds-badge` tones do **not** inherit those ratios (each carries `--_badge-ink`, which is what `0e23798` fixed). Wiki dark still measures `.eng` **2.04** (white on `#5CC4D0`) and light `h2 small` amber **4.11** — both are Task 27 token work, and Task 21's verify is therefore scoped to "no new violations".

---

## Phase 3 — Page adoption {#phase-3}

*Tags:* wiki, pitch, engine, gallery, migration · *Status:* 3/4 tasks · GATE PARTIAL

File-disjoint lanes. Each page keeps its own `<style>` for layout and its own accent. Every visual delta must be declared in the lane report.

**Corrections folded in from the Phase 3 recon** (`/Users/irfan/.hermes/cache/scratch/ds-p3-recon/phase3-recon.md`, measured 2026-11-24 13:55–14:12 IST, live DOM + axe-core 4.10.2). The recon beat the plan on ten points; the tasks below are the corrected versions:

1. **`base.css` is a visible change, not a neutral link.** Linking it resizes **5 of 28** wiki controls, **14 of 27** pitch controls and **2 of 20** engine controls (the two `x=-9999` file inputs); the wiki's prompt-map table grows **3,736 → 5,173px (+38%)**. The floor now has a documented opt-out — `[data-ds-compact]` on the control (base.css §6/§8) — and the lane must apply it, with the reason, or declare the delta.
2. **The theme attribute must land with the first class swap, in one commit.** `--focus-color` resolves only under `[data-ds-theme]`; the `.ds-*` focus rules are 0,2,0 and beat the page rings, so a page that swaps a class before it sets the attribute computes `outline-style:none` — no ring at all. Measured on a real `.ds-btn` in the wiki: no attribute → no ring; `<html data-ds-theme="wiki-light">` → 2px solid `#0B5D66`.
3. **`DS.tabs` does not fit the wiki.** It assumes one tab → one panel and hides every non-selected panel; the wiki re-renders **one shared `#panel`**. Wiki takes `.ds-tab` CSS + manual `aria-controls`/roving tabindex; wiring `DS.tabs` waits for a 3-panel render (Phase 4).
4. **Engine needs `--_z` and box-geometry overrides.** `.ds-dialog` defaults to `--z-overlay` (60) while engine modals sit at `--z-canvas` (90) → both modals set `--_z:var(--z-canvas)`; `#projModal .box.proj-box` is an 880px full-height sheet, so its geometry stays as a `.ds-dialog__box` override or it collapses to the centred 560px box.
5. **Pitch is deferred, not skipped.** `pitch.html` is under foreign editing (dirty worktree, moving selectors). Task 22 starts only after that lane commits; until then its line numbers are stale and every edit must be selector-anchored and re-read.
6. **Gallery is verification, not a rewrite.** It is already on the library (95% converted) and is being rewritten live. Task 24 = re-measure, verification, add the skip link, swap the **last 5/2/3/3/1** legacy specimens.
7. **No shipped equivalent exists for five things** — the step rail (wiki, 7 instances), pitch's ≤639px drawer bottom-sheet, pitch's two-label INR/USD FX switch (`aria-checked` segmented, not a `.ds-switch`), and the **32px / 36px** control heights the earlier plan asked for (the scale is 34/40/44/46; there is no 32 or 36 token). Do not invent one: use the nearest step and declare it, or keep the page rule.
8. **The duplicate-selector rule keys on selector + cascade context**, not identical declarations (Task 20 shipped it; it catches 8/8 engine and 4/4 pitch at HEAD).
9. **`aria-label` is accepted** on a modal — `Overlay.label()` accepts it and only synthesises `aria-labelledby` when no label exists. C3 enforces `role="dialog"` + one of the two; it does not force `aria-labelledby`, so pitch's correctly-adopted drawers pass.
10. **"0 off-viewport tab stops" is now defined.** A raw geometric count fails good pages: at 390 the wiki has **10** and pitch **2** stops inside same-page `overflow-x` rails that scroll into view on focus. The gate is **unreachable-only** — outside the viewport *and* outside any scrollable ancestor that can bring it into view — plus a separate assertion that every scrollable region is keyboard reachable and named (`tabindex="0" role="region" aria-label`), which is what `.ds-scroll-x` documents.

**Recommended lane order (recon §G, not the plan's original order):** engine → pitch (blocked) → wiki → gallery. Engine is file-disjoint, already at DS type and heights, exercises the riskiest JS (Overlay ×3, Menu, Toast) on the page with the fewest visual deltas, and is the only page that can prove a 0.000% pixel diff.

| # | Task | Done when |
|---|---|---|
| 21 | Wiki adoption | ✅ wiki consumes ds- classes, landmarks, tabs, focus preservation; no new axe violations in both themes · shipped `8027d5c` + `bb88390` (11 groups, 4009.5px@1440 / 7882.4px@390, 40/44px actions) |
| 22 | Pitch adoption | ✗ **BLOCKED** — `pitch.html` still carries a foreign uncommitted drawer-v4 edit (43+/20−, no commit on the chain); starts only after that lane commits |
| 23 | Engine adoption | ✅ engine consumes ds- classes, dialog semantics, live toast, one palette, menu contract, `--_z` overrides · shipped `a0515c1` + `6542c01` + `a7c086d` |
| 24 | Gallery adoption | ✅ verification + skip link + the last 5/2/3/3/1 legacy specimens; docs-only forks removed · shipped `869eb55` |

### Task 21: Wiki adoption
**Files:** `index.html` (all inline CSS/JS).
**Steps:**
1. Link `base.css` + `components.css` + `components.js` before `<style>`, in the documented order (tokens → base → components → page).
2. **Same commit:** `data-ds-theme="wiki-light|wiki-dark"` on `<html>`, written by the one function that also sets `data-theme` and `localStorage['cse-theme']` (two writers half-apply dark mode), **and** `[data-ds-compact]` on the controls that must stay dense — the map table's row buttons above all, or the table grows 1,437px.
3. Replace `.eng`, `.pitch` (rename the class — it collides with the page name), `.tab`, `.chip`, `#search`, `#theme`, `.badge`, `.nav button`, `.token button`, `table.map` with `ds-` classes. `.step` and the chip rail stay page-local (no component; see correction 7).
4. Add `<header>`, `<nav aria-label>`, `<main id="main" tabindex="-1">`, keep `<footer>`, add `.ds-skip-link` as the first focusable element.
5. Tabs: `.ds-tab` + real `role="tablist"/"tab"` + `aria-controls` + roving tabindex, **manual** — not `DS.tabs` (correction 3). Chips: `aria-selected` → `aria-pressed` (the 10 illegal attributes are the page's only axe **critical**). Steps: `aria-current="step"`.
6. `draw()` → `DS.focusPreserve`; `DS.announce` for the filter count and copy; `[data-ds-copy]` replaces `copyTxt()`.
7. Declared deltas: body 15 → 15.2 (delete the `font:` shorthand — the page rule beats base.css), `.step` 16.8/700 → 15.2/600, copy 28 → 40, pager 38 → 40, `.eng` 34 → 40, `.pitch` link 36 → 40, `.go` 24 → 40, map table +1,437px unless `[data-ds-compact]` is applied.
**Verify:** axe **no new** serious/critical at 1440/390 in both themes (the dark `.eng` 2.04 and light `h2 small` 4.11 stay until Task 27, or Task 27's two tokens land first and the verify becomes 0/0); focus survives tab/chip activation; off-viewport = 0 **unreachable** stops (10 reachable rail stops at 390 are expected and must be listed); every scrollable region focusable + named; screenshots both themes.

**Shipped `8027d5c` + `bb88390`.** Measured at HEAD `bb88390` on a clean `git archive` tree, 390×844 and 1440×900, with the **Prompt map** tab activated (it lives under the *Intro* step, not the default *Shot language* tabs — a measurement of `.map` that skips that click measures nothing, which is what happened on the first probe):

| Measure | 1440 | 390 |
|---|---|---|
| `.map` height | **4009.5px** (+7.3% on the 3,736px pre-compact height) | **7882.4px** (−53.8% on the pre-compaction height) |
| groups / rows | 11 / 97 | 11 / 97 |
| group header | `display:none` on the row; the Group column carries the label per row | `display:block` band, 32.47px, 306px wide in a 308px table (**1px inset**, aligned to the rows) |
| action button | **40px** (`--touch-min`) | **44px** (`--control-height-touch`, coarse pointer — the touch floor, not drift) |
| page overflow | none (scrollWidth 1440) | none (scrollWidth 390) |

The 7.3% at 1440 is the 40px action column doing exactly what the token asks; the −53.8% at 390 is the group band replacing per-row group cells. Neither is undeclared.

**Group header — occlusion, measured, not assumed.** At the natural page top the first `.map-grouphead th` is at **y=659**, `display:block`, **height 32.47px**, and `elementFromPoint` at its centre (195,676) returns the `th` itself: fully visible. Scrolled so the map's top edge sits at the viewport top (`scrollY 658`), the same header is at **y=1 (h 32)** and `elementFromPoint(195,18)` returns **`h1`** — the sticky `.top` (163px tall at 390, `position:sticky`, `z-index:40`) covers it **32/32px**. Scrolled to `scrollY 496` (map top minus header height) it sits at y=163, fully clear, hit = `th` again. So the header is **not clipped by any overflow or `display` rule** — `.ds-table-wrap` scrolls but the header is above it, and the band renders at full height. It is **occluded only at the map-top-aligned scroll position**, and that position is reachable: `html` has `scroll-padding-top:0px` and `.map` has `scroll-margin-top:0px`, so any `scrollIntoView`/anchor jump to the map lands the first group under the header. Nothing in the wiki links to the map today (`check-anchors`: index has 1 fragment link, `#main`), which is why it never showed up as a broken anchor. **Cause:** `.top{position:sticky;top:0;z-index:var(--z-sticky)}` with no `scroll-padding-top` on `html` and no `scroll-margin-top` on `.map`. **Minimal fix (not applied):** `html{scroll-padding-top:calc(var(--spacing-10)*2 + <h1 line> + safe-area)}` or, cheaper and exact, `.map{scroll-margin-top:var(--layout-header)}` with the 163px 390 / metric recorded; a third option is letting the 390 header wrap less, since 163px is 19% of an 844px viewport. Also seen at 390: the fixed bottom nav covers the *last* group band the same way — same class of bug, opposite edge.

### Task 22: Pitch adoption
**Files:** `pitch.html`.
**Steps:**
1. **Wait for the current dirty lane to commit; rebase; re-read each selector anchor.** Nothing in this task may be started against the moving file.
2. Replace `.btn`, `.tab-btn`, `.hicon`, `.expbtn`, `.dpill`, `.pill`, `.drawer`, `.tbl`, `.track`, `.ftip`; `data-ds-theme="pitch"` on `<body>` (not `<html>` — the print sheet's `--paper/--prt*` must stay out of the theme map).
3. Drawers through `DS.overlay` (trap, return, `inert`); delete the page's Esc/backdrop handlers; **keep the ≤639px bottom-sheet CSS** — `.ds-drawer` has no sheet variant, so dropping it turns the phone drawer into a full-height side panel (correction 7).
4. Tabs: `DS.tabs` with `aria-controls` per tab and `onChange` → the existing `showPanel`; keep the 5px dot indicator or declare its removal (underline is a different indicator, not a rename).
5. Tables: `scope` on all 21 `th`, `data-label` on `td`, a `caption`/`aria-label`; `@media print{thead{display:table-header-group}}` (new behaviour — declare it).
6. Resolve the height targets **before** writing CSS: **32 and 36 do not exist** — use `control.height.compact` 34 / `default` 40 and record the decision (correction 7). The FX switch stays page-local unless a segmented component ships (Task 36).
7. Chart rects: keep them focusable and give each an accessible name; do **not** put `role="img"` on 18 focusable rects (anti-pattern — recon risk 8).
**Verify:** axe 0/0 ×4 (its baseline is already 0); open `#fund-drawer` and Tab 30× — focus never leaves (today it escapes at **#24**); print preview repeats headers; 390 has no page overflow and 2 reachable rail stops are listed as reachable.

**NOT STARTED — blocked on the foreign lane.** At HEAD `bb88390` `pitch.html` is still dirty: **43 insertions / 20 deletions** against the committed blob, working-tree sha256 `55d73eba…`, committed `1b3fa9b…`. The edit is the *plan drawer v4* block — `.drawer` padding `1.6rem` → `var(--spacing-lg)`, and `#plan-weeks .plan-context` rewritten to `gap:var(--spacing-xs)` with a mask fade, `flex:0 0 auto;max-width:var(--breakpoint-xs);background:var(--s2)`, plus a new `#plan-weeks{padding-block-end:var(--spacing-2xl)}`. It is **absent from every commit on the chain**: `git log 869eb55..bb88390 -- pitch.html` is empty, and no replayed commit touches pitch at all. Correction 5 stands: the selectors are moving, so nothing in this task was edited. It unblocks the moment that lane commits.

### Task 23: Engine adoption
**Files:** `engine.html`.
**Steps:**
1. `data-ds-theme="engine"` on `<body>` in the **same commit** as the first class swap; keep the `--panel/--tool/--border/--tap` aliases (canvas chrome reads them from JS-drawn SVG).
2. Merge the **8** duplicate selectors (`html,body`, `body`, `header`, `#arrowpick button`, `#drawerX`, `.dp h3`, `#chapterbar select`, `#anchorRow code`) — C2 is the check.
3. Overlays: `.ds-drawer`, `.ds-dialog[data-variant="sheet"]` (project), `.ds-dialog` (asset), `DS.overlay` ×3, **`--_z:var(--z-canvas)` on both modals**, `.proj-box` geometry kept as a `.ds-dialog__box` override (correction 4). Closed = `hidden` + `inert`, so the drawer's 5 controls leave the tab order.
4. `#dots` → `DS.menu` with `role=menu`/`role=menuitem` on all 6 popovers (`#assetPanel`, `#cardMenu`, `#drawerMenu`, `#menuDrop`, `#arrowpick`, `#delConfirm` — note `#refPop` is referenced in JS but **does not exist in the DOM**); `#toast` → `.ds-toast` + `DS.toast` (`role=status`).
5. `#chapterSel` gets a label; both file inputs get `tabindex="-1" aria-hidden="true"` (they are 4×4px at `x=-9999` **and tabbable** — 2 axe criticals); `<main>`, `<footer>` and a skip link; `aria-label` on `#side`, `#pmNav`, `#projNav`.
6. Declared deltas: toast bottom 56 → 48 (`spacing.2xl`), the two file inputs 4 → 40 (invisible), canvas z-index unchanged via `--_z`, `.proj-box` geometry unchanged.
**Verify:** axe 0/0 ×4; off-viewport **unreachable** stops = 0 at both widths (7 at 1440 today); modal open → focus in, Tab cycles, Esc returns; drawer closed ⇒ its 5 controls are not tab stops; pixel diff 0.000% except the toast's 8px.

**Shipped `a0515c1` + `6542c01` + `a7c086d`.** `a0515c1` did the adoption: tokens → base → components → components.js, tool row / chapter bar / side rail / rails / switches / drawer / both modals / toast / chips / file inputs on `ds-` classes, the 8 duplicate selectors merged, `#chapterSel` labelled, both file inputs `tabindex=-1 aria-hidden` behind their visible triggers. Overlays run `DS.overlay` (name, trap, return, background inert, closed = `hidden`+`inert`), modals keep `--_z:var(--z-canvas)`, `#projModal .proj-box` keeps its 880px sheet as a `__box` override, toast is `DS.toast` (`role=status`, 5s, pauses on hover/focus). Declared deltas are the two invisible file inputs (4×4 → 4×40) and toast bottom 56 → 48. Measured there: axe **critical 1 → 0**, 0 serious, 0 moderate, 0 minor; **0.0000% pixel diff** at 1440 and 390; off-viewport unreachable stops **7/3 → 0/0**. `a7c086d` closed the two C2 leftovers the gate found *after* the page commit (`#arrowpick button`, the `:root` alias block), C2 **2 → 0**, pixel diff still 0.0000%. `6542c01` is the `--check`-clean foundations regen that must follow a page commit (186 keys / 20 groups / 4 themes / 17 roles).

One drift from the written step, recorded rather than hidden: step 1 asks for `data-ds-theme="engine"` on `<body>`; it shipped on **`<html>`** (same single writer, same one-commit rule, and the `[data-ds-theme]` role map resolves from either), which is what the wiki does too.

### Task 24: Gallery adoption
**Files:** `design-system/index.html`.
**Steps:**
1. **Re-measure first** — the file is being rewritten live (1,640 → 2,312 lines during the recon) and may already be done.
2. Swap the remaining legacy specimens: **5 `.btn`, 2 `.field`, 3 `.tool`, 1 `.sheet`, 3 `.badge`, 1 `.toast`, 1 `.card`, 1 `.panel`** (the 128-line fork block plus the reduced-motion selector line).
3. Add `.ds-skip-link` + `id="main"` on `<main>` (the page has `<main>` but **no id**, and no skip link — the recon measured 0).
4. Make `.matrix-wrap` focusable and named (`tabindex="0" role="region" aria-label` — the @390 `scrollable-region-focusable` violation), and either fix the 100/41 contrast nodes (`badge--paid` 4.24, `badge-dev`, `.cite`) or hand them to Task 27 with a citation.
**Verify:** the page's `<style>` contains no component definition (grep `^\.(btn|field|tool|sheet|badge|toast|chip|card)`); 19 specimen frames still resolve (`check-anchors`); axe serious/critical 0 ×4 or the contrast set explicitly cited to Task 27.

**Shipped `869eb55`.** Verification confirmed the recon's "95% done" was 100% after the rewrite: the last section (nine articles — `.btn .chip .field .card .panel .tool .badge .toast .sheet`) duplicated the shipped specimens a block down, so the section was **deleted, not re-labelled**, together with the 128-line `.frame/.stage/.btn→.sheet-body` fork. The page `<style>` now holds layout, specimen frames and the data-driven matrix only — 0 occurrences of `btn/field/tool/sheet/badge/toast/card/panel/chip` in markup or style block. The 19-block section is untouched: **19 blocks, 76 theme cells, 40 static states**, computed at render. Structure: `.ds-skip-link` is first focusable, `<main id="main" tabindex="-1">` is its target; headless Chrome confirms the first Tab reveals it at y=8 and Enter moves focus and the hash to `#main` — which is why `check-anchors` now reports `index.html` (gallery) 39 unique ids with every fragment resolving. The contrast citation this task owed to Task 27 mostly evaporated instead of being deferred: `.badge--paid` (4.24) died with the section, the deviation flag became `.ds-badge[data-variant="danger"]` (**5.37**), and `.cite` moved to mono `--g-muted` (**5.76 light / 8.04 dark**) from danger red 3.67.

**REF GATE 3 — how to judge:** for each page, compare 1440 and 390 before/after. The only differences allowed are the declared deltas in the lane report — and the recon's list (wiki 8, pitch 14, engine 4, gallery 0) is the starting point, not a guess. Every page uses `ds-` classes for controls, has one `<main>` with `id="main"`, a skip link, and 0 **unreachable** off-viewport stops. Axe baseline is 0 serious/critical, except the two contrast pairs explicitly owned by Task 27. Each lane's first commit carries the theme attribute and the floor decision with it.

**Measured at HEAD `bb88390` — 3 of 4 lanes, PARTIAL, not PASS.** Wiki (`8027d5c`+`bb88390`), engine (`a0515c1`+`6542c01`+`a7c086d`) and gallery (`869eb55`) satisfy their rows: skip link + `id="main"` present on all three, the theme attribute on first paint for wiki and engine (the gallery sets it per specimen cell — 19–20 cells per theme, not on `<html>`), 0 unreachable off-viewport stops where the lane reported it (engine 7/3 → 0/0), pixel diff 0.0000% on engine. **Pitch does not**, and it is not a pass that is merely unrecorded: `pitch.html` is still carrying a foreign 43+/20− drawer-v4 edit at HEAD, no replayed commit touches it, so Task 22 has not begun. A gate that needs four pages cannot be PASS on three; the honest reading is **PARTIAL**.

The wiki's own numbers, re-measured here rather than quoted: `.map` **4009.5px @1440** and **7882.4px @390**, **11 groups / 97 rows**, action buttons **40px @1440 and 44px @390** (coarse-pointer floor), group header 306px in a 308px table (1px inset). **Group-header finding:** the first `.map-grouphead` is *not* clipped — at the natural page top it is at y=659, `display:block`, 32.47px, and `elementFromPoint` returns the `th`. It is **fully occluded only when the map's top edge is scrolled to the viewport top**, where the 163px sticky `.top` covers all 32px and `elementFromPoint(195,18)` returns `h1`. That position is reachable by any `scrollIntoView`/anchor jump because `scroll-padding-top` and `scroll-margin-top` are both `0px`; nothing links to `#map` today, so it is latent rather than live. Fix is one declaration (`.map{scroll-margin-top:…}` or `html{scroll-padding-top:…}`), not applied here. See Task 21's receipt for the four scroll positions.

**Chain audit (the receipts above are on the rebuilt chain, so say which one).** HEAD is `bb88390`; the four replayed commits are `bb88390` (foundations), `a31689b` (CI, replay of `5edca36`), `71fdc7d` (engine keyboard, replay of `71b6ec5`) and `8027d5c` (wiki compact, replay of `64b5b7e`), with `a0321c2` as the foundations regen between the last two. `git merge-base --is-ancestor` confirms `8027d5c`, `71fdc7d`, `a31689b`, `869eb55`, `a0515c1`, `6542c01`, `a7c086d` and `bb88390` are all ancestors of HEAD; `64b5b7e`, `71b6ec5` and `5edca36` still exist as objects but are **not** ancestors — they are the pre-rebuild originals, superseded, and nothing references them. Tree at HEAD carries the wiki group markup + CSS (`.map .map-grouphead` at index.html:55/84-85, `mapGroups()` at :344), the engine keyboard layer (`#cv` `tabindex`/`role=application` at :474, keydown at :1045), and the CI surface (`check-contrast`, `check-targets`, `check-axe`, `check-keyboard`, `scripts/a11y/*`, `design-system/accessibility.md`). No commit in `869eb55..bb88390` touches `pitch.html`.

---

## Phase 4 — Accessibility and interaction hardening {#phase-4}

*Tags:* wcag, keyboard, canvas, contrast, ci · *Status:* 3/5 tasks · GATE OPEN

| # | Task | Done when |
|---|---|---|
| 25 | Canvas keyboard layer | ✅ every canvas operation has a keyboard path and a list equivalent · shipped `71fdc7d` (0-px unfocused frame; card @390 x94 y350 200×190 — re-measured at `c5eeca7`, same numbers) |
| 26 | Focus + live regions | ◐ **partial** — wiki `focusPreserve` + announce verified, engine selection/mode announced; the cross-page announcement audit is not done |
| 27 | Contrast tokens | ✅ **closed** — status-ink tokens replace danger text; `check-contrast` **67 pairs / 0 failing / 5 known debt** (4 hairlines + 1 latent), axe **0 serious/critical on 9/9** · shipped `679413a` + `c5eeca7` (3 keys + the amber value; **189 keys**) |
| 28 | Tables, chart, print | ◐ **partial** — wiki `.map` captioned + scoped with `data-label`; pitch's 6 tables and print headers blocked with Task 22 |
| 29 | Verification jobs | ✅ axe/keyboard/contrast/target checks run in CI · shipped `a31689b` (9 axe surfaces, 19 keyboard assertions); re-run at `c5eeca7`: **all nine gates exit 0** |

### Task 25: Canvas keyboard layer
**Files:** `engine.html` canvas JS, `design-system/components.js` (optional helper).
**Steps:**
1. Make `#cv` focusable (`tabindex=0`, `role=application`, `aria-describedby` instructions).
2. Arrow keys move a node cursor; Enter opens; `N` creates; Delete removes; `C` enters connect mode; Escape cancels.
3. Keep the existing Scenes list as the accessible equivalent of every canvas operation.
4. Announce the selected node and mode.
**Verify:** complete create→connect→rename→delete flow with keyboard only; screen reader announces mode/selection; axe canvas role valid.

**Shipped `71fdc7d`.** `#cv` is now `<canvas id="cv" tabindex="0" role="application" aria-label="Storyboard canvas" aria-describedby="cvHelp">` with a `ds-sr-only` instruction paragraph naming every key, and a neutral inset ring on focus. The layer is a real handler, not a shortcut list: `Escape` → `kbCancel()`, arrows via `KB_DIR` → `kbMove()`, `Enter` → `kbLinkTo()` in link mode or `kbOpen()` otherwise, `Delete`/`Backspace` → `kbDelete()` (armed two-step, same as the drawer), `N` → `kbAdd()`, `C` → `kbLink()`; every branch calls `preventDefault()`+`stopPropagation()` and the whole handler bails when `kbTyping(e.target)` is true, so inputs, selects and contenteditable keep their own keys. Selection and mode are announced through `DS.announce`, and the assets list stays the DOM path to every card.

The deterministic proof is in the commit, not in a screenshot nobody can diff: a seeded board (`cse-engine-v4`, one card at world 553,120) captured at 1440×900 and 390×844, with the card **fully in frame at 390 — absolute x94 y350, 200×190, fit `cam.x` 467** — and the **unfocused frame a 0-px diff** against the pre-change capture at both widths. axe: 0 violations across 8 runs (seeded/empty × 1440/390 × light/dark); 0 unreachable off-viewport tab stops. Verified here at HEAD: the canvas opens `tabindex="0"`, the keydown listener exists at `engine.html:1045`, and `check-axe`/`check-keyboard` both exit 0 on the archived tree.

### Task 26: Focus + live regions
**Files:** `index.html` render functions, `design-system/components.js`.
**Steps:**
1. Replace innerHTML region rewrites with `focusPreserve` (keyed) on tabs, chips, steps.
2. Add one polite status region; announce filter count, copy confirmation, panel change, toast.
3. Remove label-swap-only confirmations.
**Verify:** activating a tab keeps `activeElement` on the same logical control; VoiceOver announces each change once; no double announcements.

**Partial — and the parts that landed are verified, the parts that did not are named.** Wiki: every render goes through `DS.focusPreserve(document.body, draw)` (one call site, `draw()` is the only innerHTML writer), tabs/chips/steps use `data-ds-key` so activation re-focuses the same logical control, and `DS.announce` fires once for the filter count and once for copy — not for both label-swaps that used to double up. Engine: `71fdc7d` announces selection and mode from the canvas layer through the same `DS.announce`. **Not done:** the cross-page audit the verify line actually asks for — one pass over all four surfaces confirming exactly one announcement per change — because pitch is blocked (Task 22) and gallery announcements were only exercised through the specimen harness, not the page. Counting this ✓ on the strength of two pages would be the same optimism the earlier phases were corrected for, so it stays partial.

### Task 27: Contrast tokens
**Files:** `tokens.json`, pages consuming accent/amber/badge.
**Steps:**
1. Add `color.wiki.*.accent-ink` and consume on `.eng`, `.badge`, `.yt`; dark ≥4.5.
2. Darken small amber text to ≥4.5 (≈#8E5200) or raise to 18.66 bold.
3. Recompute badge info/dev pairs to ≥4.5; badge text ≥12px.
4. Generate a contrast table (pair, ratio, pass) into `accessibility.md`.
**Verify:** contrast script reports 0 fails across all themes; table regenerates.

**Closed — `679413a` (fix) + `c5eeca7` (receipts), both in this chain.** The fix is three new token leaves plus one value change: `color.status.danger.ink.light` `#C93F43`, `color.status.danger.ink.dark` `#EA6C70`, `color.wiki.dark.accent.ink` (aliased to the wiki-dark page bg it already painted), and `color.wiki.light.amber` moving off `var(--color-status-warning)` to a literal `#A76000`. Token count goes **186 → 189**, and `EXPECTED_LEAVES` in `scripts/build-tokens.mjs` moves with it so the build cannot drift. Danger text is now an **ink, never the fill**: `color.status.danger` (`#E5484D`) stays the 3:1 UI boundary and the badge fill, while text consumes the new ink through the component-local `--_danger-ink` in `components.css` and `engine.html`. Armed and hover labels on the fill take primitive black — **white on `#E5484D` is 3.91:1 and that idiom is retired, not patched**: only black clears the floor at 5.37, and darkening the fill instead would push the dark badge inks to ~4.1.

What the gate says now, measured on a clean `git archive HEAD` tree: **67 pairs / 4 themes, 0 failing, 5 known debt, 0 skipped** — up from 51 pairs at `bb88390`, because the pair table was widened with the ink, amber and 1.4.11 hairline rows rather than only re-pointed. Of the **eight** pre-contrast debt rows, **seven now pass** (wiki-light `warning/surface` 4.12, `danger/surface` 3.91, `white/status-info` 4.25, `danger/wikil-bg` 3.68; wiki-dark `danger/surface` 4.45, `white/wikidark-accent` 2.05; engine `danger/surface` 4.24); the eighth, pitch `warning/surface` 4.47, is **latent** — pitch paints `--ds-warning` as a fill whose ink is `--ds-bg` (4.80), so no node combines that pair as text, and it retires with Task 22 if the role ever gets a text use. The five remaining rows are that latent one plus the **four `rule/surface` hairlines** (1.19–1.46 against a 3.0 floor), which are Phase 5's `line.strong` palette decision, not a contrast-token value: reaching 3.0 repaints every divider and outlined control on four pages.

Axe confirms the DOM half rather than the token table: **0 serious/critical on all nine surface runs**, down from 2 selectors / 3 node instances (wiki-light `small` at both widths, wiki-dark `.eng`). The `.eng` 2.05 and the `h2 small` amber both disappear because the ink changed, not because the nodes changed. Amber text stays a sliver of the page — the lane's pixel count is **0.14% of the wiki-light page and 0.49% of the wiki-dark**; an independent full-page re-count here at ΔRGB≤30 gives 0.23% / 0.12%, so the magnitude holds but the two area definitions are not interchangeable and neither figure should be quoted as the other. `design-system/accessibility.md` and `audit-report.md` carry the regenerated tables (`c5eeca7`), and the visual proof at both widths shows the amber note and the danger ink in place with **engine at-rest still a 0-px frame**.

### Task 28: Tables, chart, print
**Files:** wiki `.map`, pitch 6 tables, gallery matrix, pitch chart/print.
**Steps:**
1. Add visually hidden `<caption>` and `scope="col"`; mobile rows get `data-label`.
2. Chart hit rects get `role="img"` (or one focusable plot).
3. Print: `thead{display:table-header-group}`, print doc title, prose URL expansion only.
4. Gallery matrix scroll region focusable with a visible ring.
**Verify:** axe table/aria checks 0; print preview repeats headers; matrix scrolls by keyboard at 390.

**Partial — the wiki half is done and measured; the pitch half is blocked; engine has no data table.** Wiki `.map`: a `ds-sr-only` `<caption>` ("Every prompt token with its group, code and phrase, plus a copy action"), **4 `scope="col"`** on the column headers plus **1 `scope="colgroup"`** on the group band, and **5 `data-label`** occurrences so the 390 stacked rows keep their column names — all live in `8027d5c`/`bb88390`'s markup, which is why the 390 group bands read as sections rather than orphan rows. Engine ships **no `<table>`** (it is a canvas app), so nothing was owed there; the header/`scope` work in its dialogs was Task 23's. **Pitch is untouched:** 6 `<table>` elements and **0** `scope` attributes at HEAD, **0** `table-header-group`, which is exactly Task 22's blocked file. Gallery matrix scroll region is not this task's to close separately — `869eb55` made it focusable and named. So: wiki ✓, print/pitch ✗ blocked, and the "matrix scrolls by keyboard at 390" leg is proven by `check-keyboard`'s tab/dialog/menu runs but not by the matrix itself.

### Task 29: Verification jobs
**Files:** `.github/workflows/ds-gate.yml`, `tools/` (playwright + axe), `scripts/`.
**Steps:**
1. axe on 4 pages × {1440,390} × themes + 4 scripted states; fail serious/critical.
2. Keyboard script: every Tab stop in viewport, focus survives activation, Esc closes top overlay and returns focus.
3. Contrast and target-size scripts (blocking after Phase 5).
4. Publish artifacts + a one-line baseline in the PR.
**Verify:** CI red on a reverted focus fix; baseline committed; run time under 5 min.

**Shipped `a31689b`.** Three blocking jobs, all reproducible without a dev server (the harness binds an ephemeral loopback port and refuses 5173): `a11y-static` runs contrast (51 pairs × 4 themes, 4.5:1 floor, no large-text allowance) and targets (base.css 40px `:where()` floor + 44px coarse, every `--_ctl-h` ≥ 40, the `[data-ds-compact]`/compact-size/compact-density exemption pinned to 34); `a11y-browser` installs the pinned puppeteer 24.15.0 + axe-core 4.10.3 and runs **9 axe surface runs** (wiki light/dark @1440, wiki light @390, pitch @1440/@390, engine @1440, gallery light/dark @1440, gallery light @390) against `scripts/a11y/baseline.json` with 14 required rules asserted present, plus **19 keyboard assertions** (tab arrows/Home/End + roving, dialog focus-in/trap/inert/Escape-return, menu ArrowDown/roving/Escape-return) that fail on any page JS error.

Re-run here on a clean `git archive HEAD` tree at `bb88390`: **axe exit 0 — 9 surfaces, 0 failures**; **keyboard exit 0 — 19 assertions, 0 failing**; **contrast exit 0 — 51 pairs, 8 known debt**; **targets exit 0 — 11 checks**. The one number to correct rather than repeat: the commit says the axe baseline is "2 color-contrast nodes", and it is **2 distinct selectors** (wiki light `small`, wiki dark `.eng`) but **3 node instances**, because `small` appears at both 1440 and 390. The gate counts nodes, so the honest baseline figure is 2 selectors / 3 instances — both are Task 27 debt and neither is new. `design-system/accessibility.md` is the contract: pair table, thresholds, exemptions, ratchet, exact commands, negative proofs, and the limit list (canvas text unmeasurable, static target analysis, incomplete axe nodes, no screen reader).

Re-run again at `c5eeca7` on a fresh `git archive HEAD` export: **all nine exit 0** — `build-tokens --check` (189 keys / 20 groups / 4 themes), `build-foundations --check` (17 role vars, nulls 2/5/5/3, **1495 consumer refs**, 17 zero-consumer keys), `lint-tokens --check` (**0 over budget, 27 exempt, 0 bad-allow**; T4w 22/22, T6 5/5, T8 10/10, T15 144/147), `check-doc-counts` (**189 keys / 20 groups**; 3 assertions, 10 runtime skips), `check-anchors` (4 html + 18 markdown files, 55 html targets, 48 non-document fragment skips, 0 unresolved), `check-contrast` (**67 pairs / 0 failing / 5 known debt**), `check-targets` (11 checks, 0 failing), `check-axe` (**9 surfaces, 0 serious/critical**), `check-keyboard` (**19 assertions, 0 failing**). Budget table, unchanged by the contrast commit except where noted: V1–V8 0/0/1/0/0/0/0/0, U1 0, T1 9/10, T2 31/32, T3 18/21, T4w 22/22, T4f 2/2, T6 5/5, T13 0, T14 8/8, T15 144/147, C1 6/6, C2 4/12, C3–C6 0.

**REF GATE 4 — how to judge:** axe 0 serious/critical on all pages and states; contrast 0 fails; 0 off-viewport stops; keyboard-only pass of the 4 core tasks (filter wiki, switch docs, edit a scene, read/export pitch); print preview. **All five, not four.**

**Measured at HEAD `c5eeca7` — 3 of 5 done, GATE OPEN, not PASS.** Task 25 (canvas keyboard), Task 27 (contrast tokens) and Task 29 (verification jobs) are done and each is proven at this SHA: all nine gates exit 0 on an archived HEAD, contrast is **0 failing** with 5 declared debt rows (four of them 1.4.11 hairlines owned by Phase 5), axe is **0 serious/critical on 9/9**, and the canvas keyboard layer is a real handler with a seeded, diffed proof. Two of the gate's five conditions are still not met, and neither is a formality: **print preview is untestable while `pitch.html` still carries the foreign drawer-v4 edit** — that blocks Task 28's pitch half and keeps Task 22 blocked — and the **cross-page announcement audit** (Task 26) has not been run, because pitch is one of the four surfaces it must cover and gallery announcements were only exercised through the specimen harness. Counting Task 26 on two pages would be the same optimism this plan keeps correcting, so the honest reading is **3 of 5, GATE OPEN**, with exactly two named blockers left: pitch print and the cross-page announcement audit.

**Final visual proof at `c5eeca7`** — two labelled contact sheets, captured headless on a private port (8803) from the same `git archive HEAD` export the gates ran on, at 1440×900 and 390×844: `/Users/irfan/.hermes/cache/scratch/ds-final/contact-1440.png` (wiki light, wiki dark, engine, gallery light) and `contact-390.png` (wiki light map, wiki dark map, engine, gallery light). The wiki panels are `Intro › Prompt map` with the grouped table live; **0 document overflow at both widths on all four surfaces** (`scrollWidth == innerWidth`, measured, not assumed). Re-measured rather than quoted: `.map` **4009.5px @1440 / 7882.40625px @390**, **11 groups / 97 data rows** (108 `tbody` rows before the 11 bands are subtracted); at 390 the first band is `display:block`, sits at **y166.39–200.86 with the sticky header bottom at 158.88**, so the band is fully visible and `elementFromPoint` returns its `TH` — the occlusion the earlier receipt found when the map top was scrolled to the viewport top does not recur at the natural position. At 1440 the bands are `display:none` by design and the `<thead>` starts at **y75.09** against a header bottom of 66.88, so no row is hidden under the sticky bar. Engine, seeded from `cse-engine-v4`: **1 node, image decoded, card @390 x94 y350 200×190** (in canvas, `cam.x` 467) and @1440 x709 y197 200×190; **at-rest frame diff 0 px at both widths**. Gallery: **19 `#spec-*` blocks / 76 `.spec-cell`s** at 1440 light, 1440 dark and 390 light, all three panels showing the Button specimen with its four theme cells. axe over the captured states (light/dark wiki at both widths, engine 390, gallery ×3): **0 serious/critical**, and `check-contrast` reports **0 failing** — consistent with the gate runs above rather than a second opinion.

**Re-verified at `3833b23`** on a fresh `git archive HEAD` export (the two docs commits since then touch no token, page, script or workflow file): **all nine gates exit 0** — `build-tokens --check` (189 keys / 20 groups / 4 themes), `build-foundations --check` (17 role vars, nulls 2/5/5/3, 1495 consumer refs), `lint-tokens --check` (0 over budget, 27 exempt, 0 bad-allow), `check-doc-counts` (3 assertions PASS, 10 skipped), `check-anchors` (4 html + 25 markdown, 55 html targets, 48 non-document fragment skips, 0 unresolved — 25 markdown now, not 18, because Phase 6 added seven docs), `check-contrast` (**67 pairs / 0 failing / 5 known debt**), `check-targets` (11 checks, 0 failing), `check-axe` (**9 surfaces, 0 serious/critical**), `check-keyboard` (**19 assertions, 0 failing**). Visual numbers re-read from the same export rather than re-quoted: `.map` **4009.5px @1440 / 7882.4px @390**; at 390 the first band sits at **y166.39–200.86** against a sticky header bottom of **158.88**; engine card **x94 y350 200×190**; gallery **19 `#spec-*` / 76 `.spec-cell`**; **0 document overflow** at either width on any surface.

Two lane-report numbers are corrected here, and the corrections are the ones already on record at `c5eeca7`, not new findings: the pre-contrast debt was **8 rows and 7 now pass**, not the **6** the lane claimed — pitch `warning/surface` 4.47 is latent, not retired, because pitch paints warning as a fill whose ink is `--ds-bg`; and the amber page-area census is **0.23% light / 0.12% dark** on an independent ΔRGB≤30 re-count against the lane's **0.14% / 0.49%**, so the magnitude holds but the two area definitions are not interchangeable and neither figure may be quoted as the other.

---

## Phase 5 — Visual reconciliation + reference intake {#phase-5}

*Tags:* visual-language, reference, type, geometry, motion · *Status:* **1/7 · GATE OPEN** — 30 ✅ (protocol + template + intake #1, verdict DEFER); 31 ◐ contrast half only (`accent-ink` landed under Task 27); 32 ⛔ blocked by the foreign `pitch.html` edit; 33–36 not started

Fix what the eye sees, after the structure is sound. Keep accents and IA distinct.

| # | Task | Done when |
|---|---|---|
| 30 | Reference intake protocol + intake #1 | ✅ `ac0cd30` + `d71c060` — `references/` index + template + intake #1 (17 measured values, 17 mapping rows, 7 rejected, verdict **defer**; no assets dir) |
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

**Shipped `ac0cd30` (protocol + intake) + `d71c060` (floor labelling) — Task 30 ✅, and nothing adopted.** `design-system/references/README.md` (44 L) states the mutability rule — a reference changes values or adds a variant, never page IA and never a page-specific override — and `TEMPLATE.md` (70 L) is the nine-section skeleton the plan specifies (source, measured, borrow, reject, map, decision, proof). Intake #1 (`2026-11-24-studio-editor.md`, 119 L) carries **17 measured values across 6 families** (5 palette, 4 radii, 2 control heights, 4 type sizes, 1 stroke, 1 label voice), **17 mapping rows** in §5 with our token and a `tokens.css:line` cite for each, **7 rejected items** in §4 (the editing IA, platform labels, brand assets, blue `#2E72FF`, page `#111111`, the 48/52 heights as global steps, radii 12/6 as new steps), and the verdict **defer** — language accepted as feel, zero values shipped, accent hue left to the owner as plan D4-C.

Two facts a later reader must not lose: **no source image exists in the tree**, so `references/assets/` was deliberately **not created** and no path is invented; and every value was **transcribed from the brief, not sampled from a file we hold**, so a lane must **re-sample the pixels before it ships any theme edit** — the record says so in §1. The record's durable finding is the two-label-role argument (`label.ui` / `label.data`, now plan D5), recorded in §7 with `lint-tokens --check` unchanged because no token, component or page file moved in these commits.

### Task 31: Accent-ink + two-hue discipline
**Status — ◐ partial, contrast half only.** Step 1 landed under Task 27 (`c5eeca7`): `color.wiki.dark.accent.ink` aliased to the page bg makes dark `.eng` clear 4.5:1 and axe's `.eng` node disappear. Steps 2–3 are untouched: amber is still a figure fill in places and the engine's primary accent visibility on the default screen has no receipt. Do not count this task done on the strength of a contrast row.
**Files:** `tokens.json`, `index.html:16,50,58`, gallery.
**Steps:**
1. Add `color.wiki.light.accent-ink` and `color.wiki.dark.accent-ink`; consume on `.eng`, `.badge`, `.yt`.
2. Confine amber to annotation/callout and diagram fills to `diagram.fill`; delete amber from figure fills.
3. Make the engine's primary accent visible on the default screen (or explicitly document selection vs action accent).
**Verify:** dark `.eng` ≥4.5; one chromatic role per surface in the computed colour census; screenshots both wiki themes.

### Task 32: Pitch separation + heights
**Status — ⛔ blocked.** `pitch.html` carries a foreign drawer-v4 edit (63 changed lines: 43 insertions / 20 deletions, uncommitted) that another lane owns; re-pointing `color.pitch.rule`, the TOC/export heights and the header hit areas on top of it would make the visual diff unattributable and would overwrite work we cannot see the intent of. The 1.4.11 half of the same decision (`rule/surface` 1.19–1.46) is the Phase 5 `line.strong` value and lands with it.
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

**Measured at HEAD `3833b23` — 1 of 7, GATE OPEN, not PASS.** Only the last condition holds: the intake file explains 17 borrowed values and 7 rejections, the protocol is linked from `README.md` and `governance.md`, and `check-anchors` resolves the intake's links. **None of the computed counts has been measured yet** — distinct sizes per surface, height families, and the per-surface accent census are all Task 33/34/36 work — and the 1.4.11 hairline debt (four rows, 1.19–1.46) is still on the contrast table because `line.strong` is Task 32's decision. The family-resemblance read is therefore a hypothesis, not a receipt: the four pages share tokens and components, but the visual statement has two blocked surfaces of four (pitch by the foreign edit, engine's chrome untouched since Phase 3). Honest score: **1/7**, with 31 half-credited and 32 unable to start.

---

## Phase 6 — Governance and release {#phase-6}

*Tags:* docs, governance, changelog, ci, release · *Status:* **1/4 · GATE OPEN** — 37 ✅; 38–40 open

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

**Shipped `ac0cd30` (docs IA) + `d71c060` (floor labelling) — Task 37 ✅, with one honest qualifier.** `design-system/README.md` is now a **73-line router**: a docs map of eleven entries, a where-things-are table, the four-command pipeline, the page-consumption contract and the rules — no scale tables, no values, nothing to go stale. Three new contracts carry the claims that used to live nowhere: `surfaces.md` (137 L — per-page theme, print, breakpoints, export, browser floor, adoption state, blocked work), `verification.md` (155 L — the nine gates, what each proves, blind spots, CI, PR evidence), `governance.md` (90 L — six change classes with the evidence each demands, semver, deprecation, review) and `decisions.md` (143 L — five append-only ADRs: one sans + one mono, no display face, 2px grid, reference-is-feel-only, 40px floor). `patterns.md` was corrected to **169 L** with a status line per composition — three of eight are marked *proposed*, and every `pitch.html` composition is marked **BLOCKED** on the foreign edit rather than described as shipped.

Every measured claim cites a command or `file:line` — `check-anchors` walks **25 markdown files** (was 18), 4 html files, 55 html targets and **1 plan anchor**, 0 unresolved; `check-doc-counts` passes 3 assertions with 10 runtime skips; `audit-report.md` keeps its generated machine-receipt footer and `audit/archive/audit-2026-11-23.md` holds the retired audit. The qualifier: **browser version floors are support-table knowledge, not gate output**, and `d71c060` exists precisely to say so — the feature-usage counts (`inert` 17 uses in `components.js`, 6 in `engine.html`; `container-type` at `components.css:548`, `@container` at `:577`) are measured, the Chrome/Safari/Firefox numbers beside them are labelled *"published support tables, not gate-verified"*, and `surfaces.md` states that Safari and Firefox behaviour is unverified by any automated check. Docs being true is Task 37; docs being *complete* is not — the remaining gaps are enumerated in the checklist below.

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

**Measured at HEAD `3833b23` — 1 of 4, GATE OPEN, not PASS, and not v1.0.0.** Two conditions hold and two do not. *Holds:* regeneration is byte-identical on a clean `git archive HEAD` export — `build-tokens --check` prints `189 keys / 20 groups / 4 themes`, sha256 `1128…dab`, and `build-foundations --check` reproduces `foundations.md` exactly (17 role vars, nulls 2/5/5/3, 1495 consumer refs); and every doc claim is checkable by machine — `check-anchors` resolves 55 html targets, 39 markdown targets and 1 plan anchor with **0 unresolved and every id unique**, `check-doc-counts` passes **3 assertions**, and `lint-tokens --check` reports 0 dead token references. *Does not hold:* **`ds-v1.0.0` does not exist** (`git tag -l` is empty, no `CHANGELOG.md`, no `DESIGN-SYSTEM.md` — Task 38), and **"one command runs the gate and verification"** is only half-true: `.github/workflows/ds-gate.yml` runs the six script gates in three jobs, but the hardening Task 39 owns (link check, html-validate blocking, screenshot matrix with artifact upload, PR-evidence block) is in flight in another lane, so a stranger cloning today gets the scripts, not one documented entry point. Counting Task 37 as the whole gate would be the same optimism this plan keeps correcting: the docs are true and the pipeline is reproducible, but the release does not exist and the CI contract is not finished.

### Remaining to close — measured `3833b23`, 2026-11-24

| # | Item | State | What unblocks it |
|---|---|---|---|
| 22 | Pitch adoption | ⛔ **blocked** | a foreign 63-line drawer-v4 edit sits uncommitted in `pitch.html` (43 insertions / 20 deletions); merge or drop it before any pitch token/class work |
| 26 | Cross-page announcement audit | open | pitch is one of the four surfaces it must cover; gallery announcements were exercised only through the specimen harness |
| 28 | Pitch print / table scope | ◐ partial | wiki half shipped; pitch's 6 tables and print headers inherit Task 22's block |
| 31 | Accent-ink + two-hue discipline | ◐ contrast half only | `accent-ink` landed under Task 27; amber confinement and engine accent visibility unproven |
| 32 | Pitch separation + heights | ⛔ **blocked** | same foreign edit; also owns `line.strong`, which is what retires the four 1.19–1.46 hairline rows |
| 33–36 | Label voice, control geometry, footer/chrome + motion, reference components | not started | 33/34/35 need pitch unblocked for a full four-surface pass; 36 needs the components built (`ds-segmented`, `ds-tabbar`, `ds-btn--block`, `ds-row`) |
| 38 | Version + changelog | open | `CHANGELOG.md` + `DESIGN-SYSTEM.md` + a `ds-v1.0.0` tag that must not be created before 31–36 close |
| 39 | CI hardening | in flight elsewhere | doc counts/anchors already blocking; link check, html-validate, screenshot matrix, PR evidence still owed |
| 40 | Final audit | open | needs 22, 26, 28, 31–36, 38 first; publishes 91→0 orphans, 16→≤6 sizes, 24→0 forks, 4→0 contrast fails, 20→0 stale claims |

**The system is not v1.0.0.** Nine gates are green and no regression is outstanding, but **nine of the eleven Phase 5/6 tasks are still open or blocked** (only 30 and 37 are closed), `ds-v1.0.0` is untagged, and one of four shipped surfaces cannot be edited by this lane. Anything that reports the design system as released, or as passing REF GATE 5/6, is wrong at this SHA.

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
| `design-system/components.css` | 19 canonical blocks, token-only (6 C1-listed literals) |
| `design-system/components.js` | Overlay/Tabs/Menu/Toast/focus-preserve |
| `design-system/icons.svg` | 24-symbol sprite |
| `design-system/foundations.md` | generated scale/role reference |
| `design-system/components.md` | 19 live specs (each with a gallery frame) + 3 proposed + 3 page patterns |
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
| `scripts/lint-tokens.mjs` | V1–V8, U1 + T1–T15 (pages, tokens) + C1–C6 (component layer) |
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
