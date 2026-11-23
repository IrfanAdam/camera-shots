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

## Token-gap closure (2026-11-23, tokens.json 118 → 155, additive only)

All raw hexes in product CSS now have a token to re-point at. No visuals changed; html untouched.
- Engine canvas/graph (touch-layer commit): `color.engine.accent.ink` (#111111), `canvas.bg`, `graph.title/node.top/node.bottom/edge/label/arc/handle`, `switch.track/border`, `code.punct/hover`, `input.focus/edge`, `row`, `panel.project/codes`, `placeholder`, `highlight`.
- Pitch debt: `color.pitch.positive (+.ink)` (fx dots, surplus), `switch.bg`, `color.print.*` (rule/body/fine/accent/ink).
- Wiki debt: `color.wiki.diagram.fill`, `color.wiki.scrim.thumb`.
- Shared: `color.neutral.white/black`.
- Touch scale: `touch.small` (28px legacy, debt — do not use new), `touch.field` (38px legacy, round up to `touch.min` on next edit), `layout.bar.transport` (62px, `--bar-h`), `layout.sheet.grab.width/height` (44px/5px). `--tap` 44px already = `touch.preferred`.
- Not colors (excluded): `&#9654; &#8377; &#128065;` are HTML entities, not hex values.
- Re-point map for the cleanup lane: `#fff`→neutral.white, `#111`→engine.accent.ink (engine) / print.ink (print sheet), `#000`→neutral.black, `#ddd/#333/#222`→print.rule/body/fine, `#8a6d2b`→print.accent, canvas `#1a2130/#1b2230/#1c2432/#0d1117/#9aa3b5/#c7cedb/#7c3aed/#2a3342`→canvas.bg/graph.*, `#2a3340/#3a4554`→switch.*, `#4b5563/#1b212b`→code.*, `#1e2632/#b45309`→input.*, `#0f141b/#10151c/#0d1218`→row/panel.*, `#5b6577`→placeholder, `#fbbf24`→highlight, `#10b981/#06110c`→pitch.positive(+.ink), `#101012`→pitch.switch.bg, `#9fc3d8`→wiki.diagram.fill, `#101828`→wiki.scrim.thumb.

## Type family decision (final) — 2026-11-23

- **One family carries all text**: `typography.family.sans` (`system-ui, -apple-system, Segoe UI, sans-serif`). **One mono family** carries labels, numbers, code and timecode: `typography.family.mono` (`ui-monospace, Menlo, monospace`). Nothing else.
- **Hierarchy is size + weight + tracking, never a second face.** Level is set by `typography.size.*` against `typography.weight.*` and `typography.tracking.*` — h1 → body → eyebrow differ in scale, not in typeface.
- **`typography.family.display` (Space Grotesk) and `typography.family.quote` (Newsreader) are removed.** Both were specified early; neither was ever consumed by `index.html`, `pitch.html` or `engine.html`, which all declare the sans stack in `body` and never override the family for headings or quotes. Shipping them was a claim with no surface behind it — the same dishonesty as a token no page can resolve. The system is a system-sans UI; the reference never used a display or serif face.
- **Consequence in the gallery**: the design-system `index.html` type section was the only remaining consumer, through two specimen cards (`.fam-display`, `.fam-quote`) that rendered the unused stacks and one sentence claiming they were "real dependencies of the pages". Both cards are replaced by the Sans + Mono pair so the panel documents what ships.
- **Count**: `tokens.json` 231 → 229 keys; `--typography-family-display` and `--typography-family-quote` no longer exist in `tokens.css`.
