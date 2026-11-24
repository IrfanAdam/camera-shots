# Reference Intake — <date> — <name>

Copy this file to `design-system/references/<YYYY-MM-DD>-<slug>.md` and fill every
section. A section with nothing in it is a section that was not measured; write
`none` and say why. The record is the contract: an intake with no mapping table
and no rejected-items list is a mood board.

## 1 · Source

| Field | Value |
|---|---|
| What it is | e.g. "three-screen mobile editor, iOS-style chrome" |
| Supplied as | attached screenshot / URL / file in `references/assets/` |
| Received | YYYY-MM-DD |
| Layer it may influence | surfaces · geometry · type · iconography · motion feel · components |
| Kept image | `references/assets/<file>` — or `none in repo` with the reason |

If the image is not in the repo, say so here. Never write an asset path that does
not resolve; a later reader will try to open it.

## 2 · Measured

State each value with its sampling method (pixel sample, crop, count). Numbers
only — "dark grey" cannot be mapped.

| Family | Measured | Count |
|---|---|---|
| Palette | page / panel / raised / accent / tint hexes | 5 |
| Radii | card / control / thumb / clip px | 4 |
| Controls | field / primary CTA heights px | 2 |
| Type | sizes px (+ leading if measurable) | 4 |
| Iconography | stroke width band px | 1 |
| Label voice | case, tracking, family | 1 |
| Density / motion feel | row rhythm, duration impression | note |

## 3 · Borrow

Components and decisions worth adopting, each with the need it answers. Name the
page need, not the reference screen — "engine selects are page-specific", not
"screen 2 has a select".

## 4 · Reject

IA, layout, platform naming, brand assets, accent hue, and any value that would
add a token for one reference. One line each, with the reason. An empty reject
list means the intake was not scoped.

## 5 · Map

| Reference | Ours | Status |
|---|---|---|
| e.g. panel `#1C1C1E` | `color.engine.tool` (`tokens.css:48`) | exact |
| e.g. radius 10 | `radius.md` | exact |
| e.g. field 48 | no `control.height.*` step | gap → component task |

Status vocabulary: **exact** · **within tolerance** · **gap** · **proposed** ·
**rejected**. Anything mapped to a component that does not exist is *proposed*,
and must name the task that would build it.

## 6 · Decision

`adopt` / `defer` / `reject`, whose call it is, and what unblocks it. A deferral
is a decision and stays on the record until it is revisited.

## 7 · Proof

Before/after artifacts at 1440 and 390 for every affected surface, the gate
output, and the contrast rows that moved. If nothing shipped yet, write
`nothing adopted — no visual delta` and cite the command that shows the page is
unchanged. Do not attach a screenshot of a page nothing changed.
