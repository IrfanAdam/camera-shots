# Engine Prompt Editor Optimization — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Replace the 3-pane Generate Prompt drawer with a 2-pane sliding editor and relocate the live JSON prompt box under the drawer image, making every value/param clickable without an explicit Generate button.

**Architecture:** Keep single-file `engine.html` as source of truth. Refactor `promptModal` (.box) from 3 columns (nav | mid | json-right) to 2 columns (nav + edit) with staggered slide-in. Move canonical JSON rendering from `pm-right` into drawer `#promptPrev` (under image), drive click-through from JSON tokens → editor tabs/fields. Rename back→close and give `dim` inputs hover affordance.

**Tech Stack:** Single-file HTML/CSS/JS (`engine.html`), vanilla DOM, CSS transitions (transform/opacity), localStorage (`cse-engine-v4`). No build step.

---

## Execution map

| Phase | Title | Mode | Depends |
|-------|-------|------|---------|
| 1 | Drawer JSON relocation & click-through | sequential-blocking | — |
| 2 | Two-pane editor restructure + staggered open | sequential-blocking | 1 |
| 3 | Close affordance + dim-input polish & cleanup | sequential-blocking | 2 |

## File map

- Modify: `engine.html` (CSS ~107-152, HTML 179-210, JS 905-1012, 922-1003)
- Verify: manual visual check in Safari on :5173 (hover cards, drawer, prompt editor, persistence)
- No new files except plan itself

## Pitfalls

- `promptPrev` is currently plain `textContent = JSON.stringify`; replacing with interactive token spans must keep JSON valid and not break `copyText` path.
- `pmJsonText` and `renderPmOut()` are shared by copy buttons; removing `pm-right` must keep `pmJsonText` populated for copy paths (drawer copy + editor copy).
- `pmTarget` lifecycle (openPromptModal/closePromptModal/persist) is used by `sels`, `details` writes; changing modal shape must not drop `persist()` calls.
- Staggered animation must not block click-through: right-to-left `.box` contains both panes, inner panes need independent transitions with delays without leaving a gap where scrim clicks dismiss.
- `TOMBSTONES` / anchor validation must still gate JSON generation (`buildPromptJSON` returns null when no anchor).

---

## Phase 1 — Drawer JSON relocation & click-through {#phase-1}

*Tags:* drawer, json-relocation

*What the demo gains:* The source of truth prompt lives under the image where the dummy box was, and every token is a direct edit affordance — no Generate button required.

| # | Task | Done when |
|---|------|-----------|
| 1 | Render interactive JSON into drawer `#promptPrev` | `#promptPrev` shows token/free values with `.jval` spans (not plain text), matches right-pane appearance today |
| 2 | Wire drawer JSON spans → open 2-pane editor at correct tab/field | Clicking any value scrolls + flashes the field in editor; toast if no anchor |
| 3 | Remove / deprecate `✨ generate prompt` button | No visible Generate button; drawer still shows live prompt and `copy stub` remains |

### Task 1: Render interactive JSON into drawer `#promptPrev`

**Objective:** Replace plain `renderPromptPreview` text dump with interactive, styled JSON identical to `renderPmOut` right pane.

**Files:**
- Modify: `engine.html:82` (`#promptPrev` CSS — allow token spans, line-height)
- Modify: `engine.html:1004-1012` (`renderPromptPreview` + helpers `jValEl`, `K`, `C` reused or factored)

**Steps:**
1. Extend `#promptPrev` CSS: add `.jval` hover, free/tok colors (reuse 130-139 rules) and tighten `max-height` so it sits just under `drawerImg`/`drawerStills` without pushing delete.
2. Factor JSON DOM helpers: extract `K(tag)`, `C(char)`, `jValEl(tab,k,v,free)` outside `renderPmOut` scope if not already visible to drawer scope.
3. Rewrite `renderPromptPreview(n)` to mirror `renderPmOut` body: build `o = buildPromptJSON(n)`, clear `#promptPrev`, then `L(…)` pattern using existing `L` helper (or duplicate minimal version for drawer). Keep fallback string when `o==null` ("⚠ assign an anchor…").
4. Keep `buildPrompt(n)` as string fallback for copy if needed, but drawer no longer uses plain text.

**Verify:**
- Open any card/scene drawer → prompt box under image shows colorized JSON (keys grey, tokens #c8cfdb, free #fbbf24 italic) instead of monochrome dump. Inspect → spans present.

### Task 2: Wire drawer JSON spans → open 2-pane editor at correct tab/field

**Objective:** Clicking a value/param in drawer JSON opens the editor focused on that field.

**Files:**
- Modify: `engine.html:535-544` (wiring), `engine.html:966-974` (`jValEl` onclick)
- Modify: `engine.html:922-930` (`openPromptModal` — accept optional target tab/key hint)

**Steps:**
1. Update `jValEl(tab,k,v,free)` title/click behavior for drawer context: if rendered inside `#promptPrev`, `onclick` calls `openPromptModal(drawerSub, {tab,k})` instead of tab-switch inside existing modal.
2. Extend `openPromptModal(n, hint)` to set `pmTab = hint.tab || pmTab` and after `renderPmFields()`, scroll/flash the field matching `hint.k` (reuse `jflash` animation 139-140).
3. Ensure `closeDrawer` does not hide the editor scrim; `openPromptModal` sets `drawerSub` as `pmTarget` so edits continue to persist + re-render both editor and drawer preview.

**Verify:**
- With drawer open, click a free word (amber italic) → editor slides in, Subject tab active, field flashed. Click a project token (grey) → Cine/Capture/etc. tab active, select flashed.

### Task 3: Remove / deprecate `✨ generate prompt` button

**Objective:** No explicit generate action; drawer click-through is the entry point.

**Files:**
- Modify: `engine.html:188` (remove or hide `#genPrompt`), `engine.html:538` (remove `genPrompt.onclick`)
- Modify: `engine.html:79-81` (keep `#copyStub` styles; drop `#genPrompt` rule or hide)

**Steps:**
1. Delete `#genPrompt` button node (or set `hidden`/`display:none`) and remove `#genPrompt` CSS block; keep layout gap minimal.
2. Remove `document.getElementById('genPrompt').onclick` listener; ensure `renderPromptPreview` updates drive copy without it.
3. Keep `#copyStub` (or unify to drawer copy of `pmJsonText`); ensure `copyText` path still reads `pmJsonText || buildPrompt(drawerSub)`.

**Verify:**
- Drawer shows anchor row → JSON prompt box → single `copy stub` / `copy prompt` control, no Generate button. Clicking still copies valid JSON. No console errors on load.

**REF GATE — Phase 1**
- [ ] Drawer under image shows interactive JSON covering anchor, subject, cine, capture, lighting, color, env, negative (not plain text)
- [ ] Each token/free value click opens editor at correct tab/field with flash
- [ ] No Generate button exists; copy still works and persistence across reload holds

---

## Phase 2 — Two-pane editor restructure + staggered open {#phase-2}

*Tags:* editor, animation

*What the demo gains:* Editor is only two panes (category nav + value pane), visually staged: edit pane arrives first, nav follows, implying drawer ancestry.

| # | Task | Done when |
|---|------|-----------|
| 4 | Restructure `#promptModal .box` to 2 columns; drop `#pm-right` | DOM is nav (148px) + mid (flex 1); no `pm-right`/`pmJson`/`pmCopyFloat`/`jlegend` inside modal |
| 5 | Stagger slide: edit pane (mid) → nav cascade | On open, mid content fades/slides 0→120ms, nav items cascade 120→260ms; close reverses (single scrim click collapses both) |
| 6 | Keep `#pmJson` rendering path alive without right pane | `pmJsonText` still computed in `renderPmOut`, used by drawer copy and optional hidden `<pre>` for tests |

### Task 4: Restructure `#promptModal .box` to 2 columns; drop right pane

**Objective:** Remove third column; editor becomes category list + fields only.

**Files:**
- Modify: `engine.html:111-128` (`.box` width, `.pm-right` removal, `.pm-mid` flex, `.pm-nav` reuse)
- Modify: `engine.html:198-210` (HTML — delete `<div class="pm-right"><pre id="pmJson">…`)

**Steps:**
1. Delete `pm-right` block (209) and its CSS (124 + `#pmJson`, `#pmCopyFloat`, `.jlegend` rules tied only to modal). Retain `.jval/.jkey/.jpunc` globals (used by drawer now).
2. Reduce `#promptModal .box` width from `min(1120px,96vw)` to `min(760px,92vw)` (nav 148 + mid ~560 + padding), keep full-height slide.
3. Keep `#pmNav`, `#pmFields`, `#pmTitle`, `#pmAnchor`; ensure tab rendering (PM_TABS) still drives `renderPmFields`. No JS change beyond `renderPmOut` not touching `#pmJson` DOM.

**Verify:**
- Open editor → two panes only, no right JSON panel, mid fills remaining width, nav border shows.

### Task 5: Stagger slide: edit pane then nav cascade

**Objective:** Sequential entrance: edit pane slides, nav follows.

**Files:**
- Modify: `engine.html:107-120` (CSS transitions + delays)

**Steps:**
1. Keep outer `.box` `transform: translateX(105%) → none 250ms ease` as base.
2. Add inner transitions: `.pm-mid { transition: transform .24s ease .04s, opacity .2s ease .04s }` and `.pm-nav button { transition: transform .22s ease, opacity .22s ease; transition-delay: calc(.12s + var(--i)*18ms) }` set via JS `--i` index on `renderPmFields` nav rebuild.
3. Closed state: set `.pm-mid { transform: translateX(12px); opacity:0 }` scoped under `#promptModal:not(.open) .pm-mid` (or inline under hidden). Open state resets to 0/1 via `#promptModal.open .pm-mid`.
4. Nav stagger: assign each `#pmNav button` `--i` in `renderPmFields` nav loop; hidden nav buttons start at `translateX(-8px); opacity:0`.
5. No JS `requestAnimationFrame` chain change; existing double-rAF `classList.add('open')` still fires transitions.

**Verify:**
- Slow-motion (increase duration to 800ms temporarily) shows mid arriving ~100ms before nav items cascade; reverse close feels unified.

### Task 6: Keep JSON rendering path alive without right pane

**Objective:** Preserve `pmJsonText`/copy behavior while modal no longer owns JSON DOM.

**Files:**
- Modify: `engine.html:965-1003` (`renderPmOut`)

**Steps:**
1. At `renderPmOut` top, still compute `o = buildPromptJSON(pmTarget)` and `pmJsonText = JSON.stringify(o,null,2)` even when `#pmJson` element is gone (guard `document.getElementById('pmJson')` null).
2. If `#pmJson` missing, skip DOM `box.appendChild` block but still set `#pmOut` hidden state and call `renderPromptPreview(pmTarget)` so drawer stays live.
3. Ensure `#pmCopy`/`#pmCopyFloat` handlers read `pmJsonText` fallback; if float removed, keep one copy button in `.pm-mid` footer that copies `pmJsonText`.

**Verify:**
- Edit a field → drawer prompt updates live; both drawer copy and editor footer copy copy identical JSON. Reload retains value.

**REF GATE — Phase 2**
- [ ] Editor shows exactly 2 panes (copy of old right pane not present)
- [ ] Staggered entrance observable (edit before nav) and single-action dismiss (back/close/scrim/Esc)
- [ ] Live sync: mid edit → drawer JSON updates without extra save click; copy paths both emit `pmJsonText`

---

## Phase 3 — Close affordance + dim-input polish & cleanup {#phase-3}

*Tags:* polish, a11y

*What the demo gains:* Inputs invite hover/click, and the entry affordance reads correctly.

| # | Task | Done when |
|---|------|-----------|
| 7 | Rename `‹ back` → `close` and make it collapse both panes | Nav top shows `close` (not back), click removes `open`, scrim/Esc behavior unchanged, drawer stays behind |
| 8 | Highlight dim inputs on hover/click | `.tin` and `.tok select` rest on dim `#222a36`/italic placeholder but highlight (border #e8830c, bg lift) on hover/focus and show pointer cursor |
| 9 | Final cleanup + verify build | No dead `#pm-right`/`#genPrompt`/`pmJson` references throwing; JSON schema parity; localStorage migration v4 still loads |

### Task 7: Rename `‹ back` → `close` and make it collapse both panes

**Objective:** Text change implies dismiss of stacked panes.

**Files:**
- Modify: `engine.html:113-114` (`#pmBack` text/styles), `engine.html:199` (`<button id="pmBack">`)
- Modify: `engine.html:540` (`pmBack.onclick` → `closePromptModal`)

**Steps:**
1. Change button text from `‹ back` to `close` (or `× close`), keep same `id="pmBack"` for JS hook, drop `‹` glyph. CSS: plain muted (#8b93a5 → #e8eaf0 on hover) matching existing `#pmBack`.
2. Ensure click collapses both panes together (outer `.box` transition does both); set `closePromptModal` to remove `open` then `hidden=true` after transition (reuse existing `classList.remove('open')` + `pmTarget=null` call, let CSS visibility handle hide).
3. Keep Esc/scrim paths (`promptModal` click on backdrop) calling same `closePromptModal`.

**Verify:**
- Editor shows `close` at nav top; clicking closes both nav + mid in one motion, focus returns to drawer; Esc/scrim match.

### Task 8: Highlight dim inputs on hover/click

**Objective:** Dim state is quiet; hover/focus invites edit and click affordance is obvious.

**Files:**
- Modify: `engine.html:92-98` (`.tin` + `select` rules), `engine.html:144-148` (hover/focus states)

**Steps:**
1. Base: `.tin, .tok select { background:#222a36; border-color:#313b4a; color:#fbbf24 or #e8eaf0; cursor:pointer }`, placeholder `#8b93a5` italic.
2. Hover: `.tin:hover, .tok select:hover { border-color:#e8830c; background:#1e2632 }`.
3. Focus: `.tin:focus, .tok select:focus { outline:none; border-color:#e8830c; background:#1e2632; box-shadow:0 0 0 2px rgba(232,131,12,.18) }`.
4. Add `transition: border-color .16s, background .16s, box-shadow .16s` to both.
5. Ensure empty `.jval.empty` values in drawer still show `""` but now hover highlights with `background:#1b212b` already present; add `cursor:pointer` confirmed.

**Verify:**
- Hover over any `.tin`/`select` → border orange, bg lift; focus shows ring; cursor pointer everywhere a value is editable.

### Task 9: Final cleanup + verify build

**Objective:** No dangling references; persistence and anchor flow unaffected.

**Files:**
- Modify: `engine.html` (audit dead CSS/JS: remove `#pmJson`, `#pmCopyFloat`, `.pm-right`, `#genPrompt`, unused `.pmdiv` only if dead)
- Verify: `git status`, manual reload

**Steps:**
1. Grep for leftover IDs: `genPrompt`, `pmJson`, `pmCopyFloat`, `pm-right` → remove handlers/refs or guard null checks.
2. Confirm `Store.key = 'cse-engine-v4'` still migrates v2/v3; `TOMBSTONES` still feed `allAnchors()`.
3. Run: `git status` clean except `engine.html`; open `index.html` unaffected. Visual pass: cards, scenes lanes, drawer image, prompt under image, editor 2-pane staggered, close, copy, undo, reload persistence.

**Verify:**
- No console errors on fresh load, on drawer open, on editor open, on copy, on undo, on reload. JSON emitted is schema-identical to prior right-pane version (anchor first).

**REF GATE — Phase 3**
- [ ] Nav top reads `close`, collapses both panes
- [ ] Dim inputs highlight on hover/focus and cursor indicates clickable
- [ ] No dead handlers throw; localStorage v4 reload shows correct prompt under image

---

## Acceptance (overall)

- Prompt box lives under drawer image (not in editor), shows interactive styled JSON, every value/param click opens 2-pane editor at correct field — no Generate button.
- Editor is exactly left nav categories + mid value pane, staged entrance (edit first, nav following).
- Nav top affordance says `close` and dismisses both panes.
- Dim inputs rest muted but highlight on hover/focus and are clickable affordances.

