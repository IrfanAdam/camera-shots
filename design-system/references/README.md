# References — intake index

A reference is **visual language only**: surface ladder, hairline and contrast
steps, control geometry, type scale and leading, density, iconography, accent
role, motion feel. It never supplies IA, layout, track order, platform naming, or
brand assets. This directory is an intake log, not a mood board.

## Protocol

1. **Measure before mapping.** Sample pixels, count radii/heights/type. Copy
   `TEMPLATE.md` to `<YYYY-MM-DD>-<slug>.md` and fill all seven sections: source,
   measured, borrow, reject, map, decision, proof.
2. **Classify each value**: theme value, existing component variant, new
   primitive, or reject. If it needs page-specific CSS it is not a system change.
3. **Edit the theme map first.** Surfaces and accents belong in
   `design-system/tokens.json`; regenerate `tokens.css` and every surface follows.
4. **Add a component variant only for a proven page need** — spec, gallery frame,
   then consumer. Never a per-page override.
5. **Prove with the same evidence set**: 1440 + 390, every scheme the surface
   supports, gate output, contrast rows, declared deltas.
6. **Record the decision** here and in the intake file. A deferral is a decision.

**Changing a reference later** = a theme-map value edit or a new component
variant plus a changelog line. Never a page-specific override. That is the
mutability contract.

**Source images** live in `references/assets/`. If the supplied image is not in
the repo, the intake says so explicitly and no asset path is invented.

## Intakes

| # | Date | Source | Layer | Decision | File |
|---|---|---|---|---|---|
| 1 | 2026-11-24 | Three-screen mobile editor (iOS-style chrome) | surfaces, geometry, type, icons, components | **defer** — feel accepted, no value shipped yet; accent is an owner call | [2026-11-24-studio-editor.md](2026-11-24-studio-editor.md) |

## Boundary with the rest of the docs

| Question | Doc |
|---|---|
| What values exist | [foundations.md](../foundations.md) (generated) |
| What components exist | [components.md](../components.md) |
| Which page consumes what | [surfaces.md](../surfaces.md) |
| How a change is classified and shipped | [governance.md](../governance.md) |
| Why a decision was made | [decisions.md](../decisions.md) |
