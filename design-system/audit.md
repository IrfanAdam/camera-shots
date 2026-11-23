# Audit — DS-Foundation (2026-11-23)

Scope: `index.html` (wiki), `pitch.html` (pitch), `engine.html` (engine canvas) vs. this system + heal-pitch-style + pro-editor visual language (feel only — layout never copied, own IA kept).

Method: static measurement (`grep` counts, `:root` values, target sizing). No layout replication from the reference.

## pitch.html — mostly Compliant

- Compliant: token discipline via `:root` vars (`--bg --s1 --s2 --ink --mut --rule --acc --acc-ink`); active-dot tabs (5px champagne) match spec; `fadeSlideIn` tab swap; export cluster present; 44px targets present; `prefers-reduced-motion` present (3 hits).
- Compliant: pitch-minimal integrity — one accent span H1, eyebrow+H2 rhythm, honest-qualifier pattern available.
- Deviation (minor): mobile header icon buttons `2rem` (32px) < `touch.min` (40px). Fix: raise to `touch.min`, keep visual size via inner glyph.
- Gap: none structural. Keep liked minimal style frozen — future pitch work extends, never reskins.

## index.html (wiki) — Compliant with notes

- Compliant: dual-theme vars (light + dark sets fully specified); pill filter + underline steps never mixed on one control; search filter in place; placeholder-friendly list rows.
- Deviation (minor): `.step` buttons rely on text padding only (~30px hit area) < `touch.min`. Fix: add `min-height: touch.min` with transparent padding.
- Compliant: `prefers-reduced-motion` present.

## engine.html — most Deviations (expected: canvas predates system)

- Deviation (major, token debt): ~70 raw-hex usages outside `:root` — `#222a36` (×24) → `color.engine.tool`, `#313b4a` (×33) → `color.engine.border.strong`, `#262d38` (×13) → `color.engine.border`, `#e8830c` (×34) → `color.engine.accent`. Behavior-neutral cleanup lane; do NOT restyle, only re-point values at tokens.
- Deviation: `#cardMenuBtn` fixed 28px < `touch.min`. Fix: 40px hit area, keep 15px glyph.
- Deviation (minor): `.tools button` padding-only height (~30px) < `touch.min`. Same transparent-padding fix.
- Deviation (minor): one `min-height:38px` < `touch.min` by 2px. Round up.
- Compliant: drawer lifecycle (scrim + Escape + 360px width), two-tap danger arm, toast `role`-equivalent pattern, `prefers-reduced-motion` present.
- Gap: timeline chips + inspector pills are specced (from reference feel) but not yet implemented in engine — adopt on next canvas feature, do not retrofit retroactively.

## Reference image (pro editor) — usage record

- Used for: dark surface layering feel, density-with-gutters, contrast ladder, 40–48px touch impression, chip/pill/transport component ideas.
- NOT used for: layout, track order, IA, branding. Our shells are our own (see patterns.md).

## Priority order for next lanes

1. Engine token re-point (no visual change).
2. Touch-target fixes (cardMenu + tools + wiki steps + pitch hdr icons).
3. Adopt timeline chips / inspector pills on next engine feature.
4. Everything else is compliant — hold the line.
