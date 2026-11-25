# Patterns

Compositions of components. Names the parts, the spacing, and when to use vs. the
alternative. Token names only.

**Read the status line first.** Three of these eight compositions are *proposed*
(no page renders them) and three surface patterns are **blocked** behind the
foreign `pitch.html` edit — see [surfaces.md](surfaces.md#blocked). Do not audit a
page against a proposed pattern, and do not cite a pattern as shipped behaviour
without checking its status line.

## Pitch Document Shell (sticky header + top tabs + article)

**Status: shipped in `pitch.html` only — BLOCKED.** The file carries a foreign
uncommitted edit (drawer-v4, 63 lines per `git diff --stat`); Phase 5 pitch tasks
32–35 cannot run until the owner lands it.

**Combines**
Doc Tabs + Cards + Buttons (export pill) + Drawer (plan/fund).

**Layout rules**
Sticky header at `min-height:4rem` (`pitch.html:37`); brand left, tabs right;
article centered at `layout.max.pitch` (`pitch.html:32`); section rhythm
`spacing.xl` between blocks, `spacing.md` inside; every anchor offset for the
sticky header. Controls in the header are `control.height.default` 40 and the
reading buttons `control.height.reading` 46 (`pitch.html:46`, `:98`) — the 64px
header band is not a `touch.preferred` band, and this file used to say it was.

**When to use**
Long-form multi-doc pages (product / wiki / investors / MVP). Keep minimal
clinical-cinema tone: light-on-dark, champagne accent, generous measure.

**When NOT to use**
Dense canvas tools or dashboards — use Engine Canvas Shell instead.

## Wiki Browser Shell (filter + tabs + list + panel)

**Status: shipped in `index.html`.**

**Combines**
Search/Filter Input + chip tabs + list rows + panel Cards.

**Layout rules**
Two-column at `var(--layout-rail)` 208px (`index.html:28`, the shared
components.css rail) collapsing to a left-aligned, horizontally scrolling pill
strip at `@media(max-width:900px)` (`index.html:92`, i.e. `--breakpoint-lg`).
The
list scrolls independently; the panel carries one concept at a time with the
token copy row. This is **not** a `breakpoint.md` collapse — no shipped wiki
query uses the token.

**When to use**
Reference browsing where the user picks one item and acts on it (copy token, open
video, follow link).

**When NOT to use**
Narrative persuasion pages — use Pitch Document Shell.

## Engine Canvas Shell (tools + rail + stage + drawer)

**Status: shipped in `engine.html` (11 `ds-` classes — the deepest adoption).**

**Combines**
Transport Bar + Track Headers + Asset List Rows + Drawer + Toast.

**Layout rules**
Header tools; narrow left rail `var(--layout-sidebar-engine)` 148px
(`engine.html:113`, `:258`); fluid stage; drawer overlays at
`var(--layout-drawer-engine-width)` (`engine.html:95`); toast floats above the
bottom edge (`ds-toast`). Our own IA — rails group by workflow (assets → stage →
inspector), never copied from any reference layout.

**When to use**
Spatial editing where canvas state is primary and panels are transient.

**When NOT to use**
Reading-heavy content — use Pitch or Wiki shells.

## Timeline Stack (ruler + lanes + transport) — proposed

**Status: proposed.** No page renders timeline lanes, chips or selection handles.
Do not cite this as shipped behaviour.

**Purpose-built from reference feel, our own structure.**
Ruler with timecode (`typography.size.timecode`, tabular numbers — 16 refs in
`engine.html`); lanes of Timeline Chips; Transport Bar docked adjacent; playhead
across all lanes.

**Layout rules**
Lane gutters at `spacing.md` 16px. (This file previously cited
`spacing.gutter.pro`, which is an alias scheduled for retirement in
`DEPRECATIONS.md` and has **0 product references** —
`grep -c -- '--spacing-gutter-pro' index.html pitch.html engine.html` = 0 on all
three.)
Chip radius `radius.sm`; selection handles at `spacing.xl` 32px. A lane hue per
type is the plan, but two of the three hues (`color.engine.track.fx`,
`color.engine.track.title`) are read only through `CT()` strings in
`engine.html` and the third (`color.engine.track.audio`) has gallery-only
consumers — all three are T8 debt until lanes ship.

**When to use**
Any multi-lane temporal view in the engine.

## Inspector Overlay (pills over canvas) — proposed

**Status: proposed.** The pill spans are specced; only the engine toast and
drawer render today (`ds-toast`, `ds-drawer` in `engine.html`). Do not audit a
page against this pattern.

**Combines**
Inspector Pills (status + split) over the stage; never in flow.

**Layout rules**
Top-center status pill; bottom-center effect pill; max two visible; dismiss on
selection clear.

**When to use**
Transient canvas state that must not disturb layout.

## Section Block (pitch rhythm unit)

**Status: shipped in `pitch.html` only — BLOCKED** (same foreign edit as the
shell).

**Combines**
Eyebrow + heading + body + optional card/table/quote.

**Layout rules**
One eyebrow (`typography.size.eyebrow`, uppercase, accent) + one heading per
section; `scroll-mt` offset; `spacing.xl` between sections.

**When to use**
Every content section in pitch documents — the repeat unit that keeps the
minimal feel. It is not a wiki or canvas pattern.

## Metric Strip + Allocation Bars

**Status: shipped in `pitch.html` only (investor thesis) — BLOCKED.**

**Combines**
Cards (metric) + progress fills + honesty qualifier line.

**Layout rules**
Four-metric strip on thesis; allocation bars must sum to 100%; every figure
carries qualifier microcopy (`typography.size.meta`, muted).

**When to use**
Investor content. Never ship figures without qualifiers.

## Export Cluster

**Status: shipped in `pitch.html` only.** `index.html` and `engine.html` have no
document export at all: `grep -ci 'export\|download' index.html` = 0, and the
engine's only export is per-asset JSON in JS (`engine.html:2103`). This pattern
used to claim "every shippable doc surface", which was false.

**Combines**
Buttons (export pill) in the header (mobile icons), the sidenav footer
(desktop), and drawer headers — all in `pitch.html` (`:277–279`, `:306–311`,
`:684`, `:705`).

**Layout rules**
In a surface that *has* export: every doc type reachable from at least one export
control; drawers with content carry their own pill; the menu offers Markdown +
print-PDF paths.

**When to use**
Documents that are meant to leave the page. The wiki is not one today and the
canvas is not either — that gap is recorded in [surfaces.md](surfaces.md#indexhtml-wiki),
not silently generalised into a rule.
