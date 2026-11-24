# Intake #1 — 2026-11-24 — three-screen mobile editor

**Decision: defer.** The language is accepted as feel; no value and no component
ships in this commit. Accent hue is an owner call (plan D4 option C).

## 1 · Source

| Field | Value |
|---|---|
| What it is | Three-screen mobile editor with iOS-style chrome: library list → detail → edit sheet, with a persistent bottom action bar |
| Supplied as | attached screenshot, described in the task brief |
| Received | 2026-11-24 |
| Layer it may influence | surfaces, geometry, type, iconography, components — **not** IA |
| Kept image | **none in repo.** `design-system/shots/` holds only our own captures (`gallery-1440.png`, `page-*-390.png`, …) and no reference image exists anywhere in the tree; `references/assets/` was therefore **not created** and no path is invented here |

Re-measure before acting on this record: the values below were transcribed from
the brief, not sampled from a file we hold, so a later lane must sample the
pixels before it ships a theme edit.

## 2 · Measured

**17 measured values across 6 families.**

| Family | Measured | Count |
|---|---|---|
| Palette | page `#111111` · panel `#1C1C1E` · raised `#2A2A2C` · accent `#2E72FF` · tint `#30384C` | 5 |
| Radii | card `12` · control `10` · thumb `8` · clip `6` (px) | 4 |
| Controls | field `48` · primary CTA `52` (px) | 2 |
| Type | `17` · `15` · `13` · `11` (px) | 4 |
| Iconography | line icons `1.5–2px` stroke | 1 |
| Label voice | sentence case, sans, untracked | 1 |

Surface ladder read from the palette: page `#111111` → panel `#1C1C1E` (one step
lighter) → raised `#2A2A2C` (a second step), with `#30384C` as the selected/tint
wash over the panel and `#2E72FF` as the single chromatic action role.

## 3 · Borrow

| Borrow | Why the product needs it |
|---|---|
| Three-step surface ladder as a *rule* (page → panel → raised) | Our engine already runs three surfaces but documents them loosely; the reference names the ladder as a contract |
| Segmented control (labelled and icon) | Pitch's doc switcher and engine's mode switches are hand-rolled per page |
| Field / select at a coarse 44–48 height | Engine selects are dense and page-specific; the reference shows the tall variant we lack |
| Mobile tab bar | Neither wiki nor pitch has a bottom nav at 390px |
| Block CTA (icon + title + subtitle) | Engine's primary action is a flat `ds-btn`; the reference's two-line CTA is the mobile-first shape we do not ship |
| Row with thumb + meta | The engine asset list is hand-built per row |
| Sentence-case labels with two label roles | The reference separates chrome labels from data; we conflate them (see §5) |

All six component borrows are **proposed**. `grep -c 'ds-segmented\|ds-tabbar\|ds-btn--block\|ds-row' design-system/components.css design-system/components.md`
returns 0 for each: none of them exists yet, and each is Phase 5 Task 36 work.

## 4 · Reject

| Rejected | Reason |
|---|---|
| The editing IA (library → detail → sheet, three screens deep) | IA is ours: engine groups by workflow (assets → stage → inspector), pitch is a document with tabs. A reference never supplies structure |
| Platform labels ("Photos", "Done", "Cancel" chrome, iOS sheet naming) | Product naming is ours; the reference's platform voice does not ship |
| Brand assets (icon set artwork, app icon, any logotype) | Borrow the *stroke weight and optical size*, never the drawings; `design-system/icons.svg` keeps its own 24 symbols |
| The blue accent `#2E72FF` | Accent hue is identity: champagne (pitch), teal (wiki), warm signal (engine) stay. Blue is one theme-map value swap **if the owner decides** (plan D4 option C) — not a silent adoption |
| Page `#111111` as the engine page colour | Ours is `#0B0B0D` (`tokens.css:50`). Adopting `#111111` lightens every engine surface by 6/255 for no stated reason |
| Field `48` / CTA `52` as new global heights | We have four height families (`control.height.compact 34 · default 40 · touch 44 · reading 46`); adding 48 and 52 for one reference would make six. Task 36 adopts them as *variants*, not new steps |
| Radii `12` and `6` as new tokens | `12` sits between `radius.md 10` and `radius.lg 14`; `6` between `radius.xs 4` and `radius.sm 8`. Two new steps for one reference is the drift the gate exists to stop — recorded as geometry debt instead |

## 5 · Map — reference value → our token / component / variant

Our side is read from `design-system/tokens.css` (generated) and
`design-system/components.css`.

| Reference | Ours | Status |
|---|---|---|
| page `#111111` | `color.engine.surface.0` `#0B0B0D` → `--ds-bg` (`tokens.css:50`, role at `:457`) | **rejected** (keep ours) |
| panel `#1C1C1E` | `color.engine.tool` `#1C1C1E` → `--ds-control` (`tokens.css:48`, role at `:460`) | **exact** — same hex, different job name |
| raised `#2A2A2C` | `color.engine.surface.2` `#2A2A2E` → `--ds-surface-alt` (`tokens.css:52`, role at `:459`) | **within tolerance** (Δ2 on blue, 0.8%) |
| tint `#30384C` | no host role: `--ds-accent-soft` is `null` on the engine map (`tokens.css` engine block, fall-through `transparent`) | **gap** — a theme-map diff, not a component |
| accent `#2E72FF` | `color.engine.accent` `#E8830C` → `--ds-accent` (`tokens.css:49`) | **rejected** unless the owner chooses D4-C |
| radius `12` | between `radius.md 10` and `radius.lg 14` | **rejected** as a step; use `radius.md` |
| radius `10` | `radius.md` (`tokens.json`) | **exact** |
| radius `8` | `radius.sm` | **exact** |
| radius `6` | between `radius.xs 4` and `radius.sm 8` | **rejected** as a step; recorded debt |
| field `48` | no step (`control.height.*` 34/40/44/46) | **gap** → Task 36 `ds-field` at coarse size |
| CTA `52` | no step | **gap** → Task 36 `ds-btn--block` |
| size `17` | `typography.size.ui` 16px | **within tolerance** (1px) |
| size `15` | `typography.size.body` 15.2px | **within tolerance** (0.2px) |
| size `13` | `typography.size.small` 13.6px | **within tolerance** (0.6px) |
| size `11` | `typography.size.eyebrow` 11.52px | **within tolerance** (0.52px) |
| stroke `1.5–2px` | `icons.svg` — all 24 symbols at `stroke-width="1.75"` | **exact**, nothing to change |
| sentence-case labels | chrome is lowercase, eyebrows are uppercase mono tracked (`tracking.eyebrow`) | **gap of roles**, not values → plan D5: `label.ui` (sans, sentence case) + `label.data` (mono, tracked) |

Component mapping (all proposed, none built):

| Reference component | Proposed name | Status |
|---|---|---|
| segmented control | `ds-segmented` | **proposed** — Task 36 |
| field / select | `ds-field` / `ds-select` (select is live at `components.md#ds-select`) | field **live**, coarse variant **gap** |
| bottom tab bar (mobile only) | `ds-tabbar` | **proposed** — Task 36 |
| block CTA | `ds-btn--block` variant of `components.md#ds-btn` | **proposed** — Task 36 |
| list row (thumb + meta) | `ds-row` | **proposed** — Task 36 |
| clip / selected state | existing `color.engine.selection` `#FFD60A` + track hues | **live**, no change |

## 6 · Decision

| Field | Value |
|---|---|
| Verdict | **defer** — language accepted, zero values shipped |
| Whose call | accent hue: **owner** (plan D4 option C). Everything else: system, via Task 36 |
| Unblocks | Task 36 (component adoption) and the Phase 5 contrast/geometry tasks; the tint role needs a theme-map diff first |
| Why not now | Every adoption is a component build, and the components do not exist; shipping a page override to fake it would break the mutability contract |

## 7 · Proof

**Nothing adopted — no visual delta.** `node scripts/lint-tokens.mjs --check`
reports 0 violations before and after this record, and no page, token, or
component file changed in this commit. Before/after screenshots are owed by
Task 36, when a value or variant actually ships.

The intake's one durable output is the **two-label-role finding**: the
reference's sentence-case sans chrome argues for `label.ui` + `label.data`
instead of one face everywhere. That is now plan D5, and it is why this record
sits beside `decisions.md` rather than in a screenshots folder.
