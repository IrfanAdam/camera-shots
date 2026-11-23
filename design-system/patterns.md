# Patterns

Compositions of components. Names the parts, the spacing, and when to use vs. the alternative. Token names only.

## Pitch Document Shell (sticky header + top tabs + article)

**Combines**
Doc Tabs + Cards + Buttons (export pill) + Drawer (plan/fund).

**Layout rules**
Sticky header (`touch.pro`-scale height band); brand left, tabs right; article centered at `layout.max.pitch`; section rhythm `spacing.xl` between blocks, `spacing.md` inside; every anchor offset for the sticky header.

**When to use**
Long-form multi-doc pages (product / wiki / investors / MVP). Keep minimal clinical-cinema tone: light-on-dark, champagne accent, generous measure.

**When NOT to use**
Dense canvas tools or dashboards — use Engine Canvas Shell instead.

## Wiki Browser Shell (filter + tabs + list + panel)

**Combines**
Search/Filter Input + chip tabs + list rows + panel Cards.

**Layout rules**
Two-column (`layout.sidebar.wiki` list + fluid panel) collapsing to stacked filter-chips on `breakpoint.tablet`; list scrolls independently; panel carries one concept at a time with token copy row.

**When to use**
Reference browsing where the user picks one item and acts on it (copy token, open video, follow link).

**When NOT to use**
Narrative persuasion pages — use Pitch Document Shell.

## Engine Canvas Shell (tools + rail + stage + drawer)

**Combines**
Transport Bar + Track Headers + Asset List Rows + Drawer + Toast.

**Layout rules**
Header tools; narrow left rail (`layout.sidebar.engine`); fluid stage; drawer overlays at `layout.drawer.width`; toast floats above bottom edge. Our own IA — rails group by workflow (assets → stage → inspector), never copied from any reference layout.

**When to use**
Spatial editing where canvas state is primary and panels are transient.

**When NOT to use**
Reading-heavy content — use Pitch or Wiki shells.

## Timeline Stack (ruler + lanes + transport)

**Purpose-built from reference feel, our own structure.**
Ruler with timecode (`typography.size.timecode`, tabular numbers); lanes of Timeline Chips color-coded by type; Transport Bar docked adjacent; playhead across all lanes.

**Layout rules**
Lane gutters at `spacing.gutter.pro`; chip radius `radius.sm`; selection handles at `touch.handle.timeline`; one hue per lane type always.

**When to use**
Any multi-lane temporal view in the engine.

## Inspector Overlay (pills over canvas)

**Combines**
Inspector Pills (status + split) over the stage; never in flow.

**Layout rules**
Top-center status pill; bottom-center effect pill; max two visible; dismiss on selection clear.

**When to use**
Transient canvas state that must not disturb layout.

## Section Block (pitch rhythm unit)

**Combines**
Eyebrow + heading + body + optional card/table/quote.

**Layout rules**
One eyebrow (`typography.size.eyebrow`, uppercase, accent) + one heading per section; `scroll-mt` offset; `spacing.xl` between sections.

**When to use**
Every content section in pitch documents — the repeat unit that keeps the minimal feel.

## Metric Strip + Allocation Bars

**Combines**
Cards (metric) + progress fills + honesty qualifier line.

**Layout rules**
Four-metric strip on thesis; allocation bars must sum to 100%; every figure carries qualifier microcopy (`typography.size.meta`, muted).

**When to use**
Investor content. Never ship figures without qualifiers.

## Export Cluster

**Combines**
Buttons (export pill) in header (mobile icons), sidenav footer (desktop), and drawer headers.

**Layout rules**
Every doc type reachable from at least one export control; drawers with content carry their own export pill; menu offers Markdown + print-PDF paths.

**When to use**
Every shippable doc surface. Never omit.
