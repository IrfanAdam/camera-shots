# Audit baseline — 2026-11-24

Frozen evidence for the DS v2 plan (`.hermes/plans/2026-11-24_011239-ds-one-language-every-page.md`, Phase 0). Everything here is a snapshot; later phases measure against it, nothing in this directory is a live spec.

## Contents

| Path | What it is |
|---|---|
| `foundations.md` | Lane A — tokens, scale, generator, gate. Findings + evidence tables. |
| `components.md` | Lane B — component register, measured geometry, forks. |
| `docs.md` | Lane C — doc inventory, 20 stale claims, governance gaps. |
| `accessibility.md` | Lane D — axe + AX-tree + keyboard results, contrast, targets. |
| `visual.md` | Lane E — family resemblance, per-page scorecard, visual defects. |
| `metrics.json` | Aggregate computed-style dump per page/viewport/theme (46 KB). |
| `data/metrics.md` | Human-readable roll-up of the same measurement run. |
| `data/x-*.json` | Per-page focusable/target summaries (8 files, 6–9 KB each). |
| `shots/*.png` | 10 full-page captures — wiki light + dark, pitch, engine, gallery at 1440 and 390. The lane reports call the wiki page "index"; `wiki-*` here is the same capture. |

Deliberately not imported: the raw `c-*.json` computed-style dumps (0.5–0.74 MB each) and the axe/contrast/AX JSON. They are regenerable with the probe scripts and would bury the reports in the tree. Whitespace, wording and tables are preserved from the lane reports except for the filename.

**Path note:** the reports are verbatim evidence, so `docs.md` still cites `design-system/audit.md`. That file was archived in the same commit — every such reference now means `design-system/audit/archive/audit-2026-11-23.md`. Nothing in the reports was rewritten to match the move.

## Method

- **Runtime measurement, not static reading.** Every geometry, colour and type claim was probed through the Chrome DevTools Protocol against the served pages, then cross-checked against the authored CSS. `metrics.json` is the aggregation; the lane reports cite the specific values.
- **Viewport is CDP emulation, not a resized window.** `Emulation.setDeviceMetricsOverride` at 1440 and 390 CSS px, `deviceScaleFactor=1`, `mobile` on for 390; full-page capture via `Page.captureScreenshot` with `captureBeyondViewport` and a clip at `scrollHeight`. A resized browser window reports a different layout viewport and a different `window.innerWidth`, which silently changes `clamp()` results and media-query boundaries — numbers taken that way are not comparable.
- **Theme is emulated, not assumed.** wiki light/dark comes from `Emulation.setEmulatedMedia` with `prefers-color-scheme`, and every capture was theme-asserted afterwards by sampling the corner pixel (wiki light `248,248,244`, wiki dark `14,18,19`, pitch `10,10,11`, engine `30,30,34`, gallery `248,248,244` = light). The gallery is light-only by design. The `*-top.png` contact-sheet crops from an earlier pass were stale dark captures and are not imported.
- **Accessibility** ran axe-core 4.10.3 (`wcag2a/2aa/21aa/22aa/best-practice`), the CDP accessibility tree, real `Input.dispatchKeyEvent` Tab traversal, scripted overlay state probes, and computed contrast against the nearest opaque background.

Reduced-motion behaviour was measured statically, not by film: all four surfaces declare a `prefers-reduced-motion: reduce` block (`index.html:81`, `pitch.html:162,242`, `engine.html:424`, gallery `:454`). Coverage is uneven — engine reduces 4 selectors and leaves toast/menu/button transitions running (D-23) — so the checklist states "implemented, coverage uneven", never "known gap".

## Headline measured numbers

Tokens — 229 keys across 13 groups, generated `tokens.css`, byte-stable generator. **91 of 229 (39.7%) have zero references from product pages**; 76 of those appear only because the gallery renders their swatch. 0 primitive tier. 96 of 119 colour tokens are surface-named.

Palettes — 5 documented (pitch, wiki light, wiki dark, engine, pro). `engine.html` renders **`color.pro.*` — 74 refs across 14 tokens** — and only 5 of its 55 namesake `color.engine.*` tokens. The documented engine surface `#0E1116` ships nowhere.

Type — 11 size tokens, 2 line-height, 4 weight, 2 tracking, **16 distinct computed sizes** across the three product pages. Line-height and weight have **0 token consumers** against 36 literal line-heights and 53 literal weights. Body type bypasses the set through the `font:` shorthand (15px/1.6 where the token says 15.2).

Components — **0 selectors shared across the four files**. 28 component roles, 24 measured forks: 3 primary heights (34/46/44), 6 secondary heights, 3 filter radii, 2 switch implementations, 7 popovers with 3 shadows, 4 selected-state mechanisms.

Accessibility — focus rings authored on 3 of 4 pages; **0 focus traps, 0 `inert`**. Wiki drops focus to `<body>` on every tab/chip click; the engine canvas is pointer-only; the engine toast has no `role=status`. 4 contrast pairs fail: **2.05, 3.68, 4.12, 4.25:1**.

Docs — **20 stale claims**; the gallery consistency matrix is false on **5 of 6 rows**; 10 implemented components have no spec; 2 specs describe UI that does not exist.

Gate — V1–V8 + U1, **PASS with 0 violations and 21 exemptions**. Blind to font-size, line-height, weight, tracking, shadow, width/height, `@media`, consumers, token types and theme parity; `!important` is counted but never failed. 8 of the 21 exemptions mask missing tokens.

## Reading it later

Per-page screenshots are full-page, so the wiki/pitch/gallery files are tall; `visual.md` names the crops and offsets for the defects it cites. The panorama is the evidence, the reports are the argument.
