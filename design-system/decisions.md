# Decisions — append-only architecture decision records

An accepted ADR is never edited. To change a decision, append a new ADR that
supersedes it and say so in the old one's `Superseded by` line. The log is the
reasoning behind the rules that `README.md` states and the gate enforces.

| # | Decision | Status | Constrains |
|---|---|---|---|
| 1 | One sans family + one mono family | accepted 2026-11-24 | type, components |
| 2 | No display face; hierarchy is size/weight/tracking | accepted 2026-11-24 | type, pitch |
| 3 | 2px micro-grid is load-bearing; no mass snap | accepted 2026-11-24 | spacing, density |
| 4 | A reference is feel only — never IA, never a page override | accepted 2026-11-24 | intake, themes |
| 5 | 40px is the touch floor; `compact` is density, not a target | accepted 2026-11-24 | geometry, a11y |

---

## ADR-001 · One sans family + one mono family

**Status:** accepted 2026-11-24

**Context.** Three surfaces with three different visual jobs (wiki, deck, canvas)
could each justify a display face. The audit found the opposite problem: type
hierarchy was being carried by size and weight on a single inherited family, and
a reviewer's claim of a "serif display headline" was refuted by grep. What the
system lacked was not another face — it was named roles.

**Decision.** Two families, no more: `typography.family.sans` for everything, and
`typography.family.mono` for data (timecode, token strings, code). A third family
is a MAJOR-class change, not a page style.

**Consequences.** No webfont ships; `@font-face` / `fonts.googleapis` occurrences
are 0 across the four pages and the shared layer, so there is no FOUT and no
network dependency on type. Differentiation must come from roles: plan D5 splits
labels into `label.ui` (sans, sentence case, 0 tracking) and `label.data` (mono,
0.16em), because the chrome and the data were previously one role.

**Evidence.** `tokens.json` defines exactly two `typography.family.*` keys —
`typography.family.sans` and `typography.family.mono` — and no other family key;
`grep -c '@font-face\|fonts.googleapis' index.html pitch.html engine.html
design-system/*.css` = 0 on every file.

---

## ADR-002 · No display face; hierarchy is size, weight and tracking

**Status:** accepted 2026-11-24

**Context.** The deck's hero is the only place a display face would earn its
weight. Adding one would buy a single headline and cost a webfont, a fallback
stack, a loading state, and a fourth family in the contract.

**Decision.** Ship a display **size** (`typography.size.display`,
`clamp(2rem, 5vw, 3.1rem)`) and no display **family**. Hierarchy is size,
weight and tracking — three token families that already exist.

**Consequences.** A future brand face is a MAJOR change with a fallback plan, not
a page-level `font-family`. Reviewers must stop inferring typography they cannot
see: any claim naming a family has to survive one grep of `@font-face` and the
token source before it becomes a task.

**Evidence.** `tokens.json` has no `family.display` / `family.quote` key; the
hero consumes the size token (`pitch.html:93`); `@font-face` count is 0.

---

## ADR-003 · The 2px micro-grid is load-bearing; never mass-snap

**Status:** accepted 2026-11-24

**Context.** The spacing scale carries both 2px and 4px steps plus named aliases
(`spacing.2` 2 · `spacing.2xs` 4 · `spacing.6` 6 · `spacing.xs` 8 · `spacing.10`
10 · `spacing.sm` 12 · `spacing.14` 14 · `spacing.md` 16 · `spacing.18` 18 ·
`spacing.20` 20 · `spacing.lg` 24 · `spacing.xl` 32 · `spacing.2xl` 48). Dense
editor chrome lives between the steps: a 5px inset, a 3px chip offset, a 1px
optical hairline. A 4px snap reads as correct in a table of numbers and visibly
tightens a toolbar.

**Decision.** Keep the micro-grid. Snap a literal only when it is within 0.8px of
a step; anything outside stays literal with a `lint-allow` reason on the line and
is logged as debt. Never snap a control height, a chip inset or a rail offset to
make a count smaller.

**Consequences.** V8 stays at 0 with 26 exemptions, each carrying its reason
(1px optical offsets, 3px flush cancellation, 5px panel inset, 118px label
column). The debt is visible in the gate output instead of hidden in a migration.
`spacing.section` 26px is currently gallery-only (T8 budget of 10) — wiring it is
a token job, not a licence to invent a 4px section rhythm.

**Evidence.** `node scripts/lint-tokens.mjs --check` → V8 0/0, 26 exempt, 0
bad-allow; each exemption line in the output names its px value and reason.

---

## ADR-004 · A reference is feel only — never IA, never a page override

**Status:** accepted 2026-11-24

**Context.** A supplied visual reference is the fastest way to drift: each page
reinterprets it, nobody can say which value came from where, and the system stops
being describable. The audit's own framing is the rule — family resemblance is
geometry + hairline + label voice + colour-as-state, not a shared hue.

**Decision.** A reference supplies visual language only: surface ladder, hairline
and contrast steps, control geometry, type scale, density, iconography, accent
role, motion feel. It never supplies IA, layout, platform naming, brand assets or
accent hue. Every intake is a record with measured values, a mapping table and a
rejected-items list, and it lands as a **theme-map diff or a component variant**.
Page-specific CSS is not an adoption.

**Consequences.** Intake #1 (three-screen mobile editor) is recorded as **defer**:
its palette is close, its radii and heights are not on our scale, its blue accent
is an owner call, and its IA and platform labels are rejected outright. A later
reference change is one value edit plus a changelog line.

**Evidence.** `design-system/references/2026-11-24-studio-editor.md` (§4 reject,
§5 map, §6 decision); protocol in `design-system/references/README.md`.

---

## ADR-005 · 40px is the touch floor; `compact` is density, not a target

**Status:** accepted 2026-11-24

**Context.** The wiki's dense prompt map ships hundreds of 34px cells. Raising
every control to 44px would grow that table by roughly 38% (the measured figure
in `base.css` §6) and triple the scroll length of a 97-row map on touch. Calling
34px a touch target, however, fails WCAG 2.5.8.

**Decision.** `touch.min` 40px is the floor for every interactive element
(`base.css:143`); a coarse pointer promotes it to `control.height.touch` 44px
(`base.css:185`). `control.height.compact` 34px is a **density** for dense,
repeated, non-primary controls, reachable only through an explicit
`[data-ds-compact]` opt-out on the control itself — never on a primary action and
never as a way to shrink below the component's own height. Wiki's 34px controls
are density (plan D6), not legacy debt to be raised blindly.

**Consequences.** `check-targets` passes because the floor and its exemption are
both declared in CSS, not asserted in prose. A new dense grid that opts out must
carry its reason on the line, and a primary control may never opt out.

**Evidence.** `design-system/base.css:143` (`min-block-size:var(--touch-min)`),
`:185` (coarse-pointer promotion), §6 comment block (the 3,736px → 5,173px
measurement); `node scripts/check-targets.mjs` exit 0.
