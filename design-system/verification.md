# Verification — what the gates prove, and what they cannot see

`PASS` in this repo means **"no violation outside the gates' classes"**, never
"every literal is tokenised". This file is the map from a claim to the command
that can falsify it, so a reviewer never has to trust prose.

## The twelve blocking checks

All twelve run in `.github/workflows/ds-gate.yml`; checks 1–6 are static and
install nothing. Run them from the repo root.

| # | Command | Job | Proves |
|---|---|---|---|
| 1 | `node scripts/build-tokens.mjs --check` | `static-docs` | committed `tokens.css` is byte-identical to a fresh render of `tokens.json` |
| 2 | `node scripts/build-foundations.mjs --check` | `static-docs` | committed `foundations.md` matches the source |
| 3 | `node scripts/lint-tokens.mjs --check` | `static-docs` | V1–V8, U1, T1–T15 on the four pages + C1–C6 on the shared layer |
| 4 | `node scripts/check-doc-counts.mjs` | `static-docs` | no doc states a count the source contradicts |
| 5 | `node scripts/check-anchors.mjs` | `static-docs` | every `#anchor`, id, idref and `[plan:…]` link resolves |
| 6 | `node scripts/check-links.mjs` | `static-docs` | every local `href`/`src` in the four pages and every relative link in `design-system/*.md` names a file that exists |
| 7 | `node scripts/check-contrast.mjs` | `a11y-static` | WCAG 1.4.3 over the declared token pairs |
| 8 | `node scripts/check-targets.mjs` | `a11y-static` | 40px control floor + the documented compact exemption |
| 9 | `node scripts/check-axe.mjs` | `a11y-browser` | axe-core 4.10.3 over 9 surface runs, 0 serious/critical |
| 10 | `node scripts/check-keyboard.mjs` | `a11y-browser` | tabs / dialog / menu driven with real key events, no page error |
| 11 | `scripts/a11y/node_modules/.bin/html-validate --config scripts/htmlvalidate.config.json index.html pitch.html engine.html design-system/index.html` | `html-validate` | 16 curated structural rules over the four pages |
| 12 | `node scripts/a11y/check-shots.mjs` | `shots` | 12 captures, 0 page JS errors, 0 horizontal overflow > 1px, no blank frame |

`html-validate` and `shots` are blocking; both are report/artifact jobs with a
narrow assertion surface, and their limits are listed under [Blind spots](#blind-spots).

## Gate classes

Classes carry the count measured at the last migration as an explicit ceiling:
only the excess fails. A new raw value inside a class's remaining headroom is
therefore invisible — that is the ratchet's one real weakness.

**Pages — value classes**

| Class | Fails on | Budget |
|---|---|---|
| V1 | raw hex / `rgb()` / `rgba()` | 0 |
| V2 | raw duration, `cubic-bezier()` | 0 |
| V3 | raw `z-index` | 1 (gallery probe frame, `index.html:424`) |
| V4 | raw `border-radius`, including bare `0` | 0 |
| V5 | inline `style=` paint | 0 |
| V6 | SVG `fill`/`stroke`/`stop-color` hex | 0 |
| V7 | raw border width | 0 |
| V8 | raw spacing | 0 |
| U1 | `var(--name)` that no token defines | 0 |

**Pages — surface classes**

| Class | Fails on | Budget |
|---|---|---|
| T1 | raw `font-size` (parses the `font:` shorthand too) | 10 |
| T2 | raw `line-height` | 32 |
| T3 | raw `letter-spacing` | 21 |
| T4w / T4f | raw `font-weight` / literal family stacks | 22 / 2 |
| T6 | `@media` width px off the breakpoint scale | 5 |
| T13 | duplicate alias values in one `:root` | 0 |
| T14 | `!important` | 8 |
| T15 | inline `style=` attributes | 147 |

**Token set**

| Class | Fails on | Budget |
|---|---|---|
| T8 | tokens with 0 consumers (product + gallery/doc counted apart) | 10 |
| T9 | two role names sharing one value | 0 |
| T10 | role-contract gaps across the four theme maps | 0 |
| T11 | `type` ↔ `value` shape mismatch | 0 |

**Component layer**

| Class | Fails on | Budget |
|---|---|---|
| C1 | raw values in `base.css` / `components.css` | 6 (each with a reason) |
| C2 | duplicate selector blocks keyed by cascade scope | 4 of 12 measured |
| C3 | `aria-modal` nodes without `role=dialog` + label + hidden | 0 |
| C4 | a `.ds-*` class defined twice | 0 |
| C5 | `svg#id` that resolves to no symbol | 0 (48 refs / 24 symbols) |
| C6 | paint literals in `components.js` / `icons.svg` | 0 |

## Docs, links, HTML structure, screenshots (Task 39)

### `scripts/check-links.mjs` — the local link graph

Parses `href`/`src` in `index.html`, `pitch.html`, `engine.html`,
`design-system/index.html` and relative `[text](target)` / `![alt](target)`
links in the twelve `design-system/*.md` files (fenced blocks and inline code
stripped first). A target must exist; a directory must contain `index.html`; a
target resolving outside the repo fails.

Deliberately skipped, all counted in the report so the skip is visible:

| Skipped | Count (HEAD) | Reason |
|---|---|---|
| pure `#fragment` | 67 | `check-anchors.mjs` owns anchors and ids |
| external `http(s)://` / `//host` | 3 | no network in CI: a vendor 503 is not a PR defect (blind spot 12) |
| `mailto:` / `tel:` / `data:` / `javascript:` | 0 | not files |
| `${…}` template placeholders | 7 | built by page JS at run time (`href="${src}"`, YouTube thumbnails); the screenshot and axe jobs would catch a real 404 |
| empty | 0 | — |

132 local targets are checked at HEAD. The fragment half of a
`file.html#anchor` link is left to `check-anchors`, which owns it.

### `scripts/htmlvalidate.config.json` — curated structural rules

html-validate **8.24.1** is a pinned `devDependency` in `scripts/a11y`
(`package.json` + lockfile). The job runs the locked binary, not `npx`.

Enabled (16): `doctype-html`, `no-dup-id`, `no-dup-attr`, `no-dup-class`,
`no-redundant-role`, `element-permitted-content` (valid nesting), `close-order`,
`void-style`, `no-implicit-close`, `no-unknown-elements`,
`no-missing-references` (ARIA idrefs), `aria-hidden-body`, `wcag/h30` (link
text), `wcag/h32` (form submit), `wcag/h37` (img alt), `input-missing-label`.

This is not `html-validate:recommended`. The four pages were **not edited** for
this task, so every recommended rule they currently violate is disabled and
listed here rather than made silently green:

| Disabled rule | Violations at HEAD | Where | Why it is off |
|---|---|---|---|
| `no-inline-style` | 113 | `pitch.html` 18, gallery 95 | page-level inline style; token gate T15 owns the budget |
| `no-implicit-button-type` | 48 | `engine.html` 34, `pitch.html` 14 | untyped `<button>` in JS templates; a page edit, not a gate edit |
| `wcag/h63` | 27 | `pitch.html` 21, gallery 6 | `<th>` without `scope` |
| `prefer-native-element` | 15 | gallery 13, `index.html` 2 | `role="region"` wrappers, a deliberate pattern |
| `doctype-style` | 2 | `engine.html`, gallery | lowercase `<!doctype html>`; `doctype-html` is still enforced |
| `heading-level` | 1 | `engine.html:490` | `<h3>` inside a JS template with no `<h2>` |
| `element-required-attributes` | 1 | `engine.html:487` | `<img>` without `src` in a JS template (src set later) |
| `empty-heading` | 1 | `engine.html:490` | same template `<h3>` |
| `unique-landmark` | 1 | `engine.html:485` | duplicate named landmark in a template |
| `aria-label-misuse` | 1 | `pitch.html:694` | `aria-label` on a non-interactive element |

Those ten rules are the html-validate blind spot (blind spot 13). Turning one on
requires a page change and belongs to that page's owner.

### Negative proofs

Every new gate was falsified once and restored:

| Injected failure | Observed |
|---|---|
| `mv design-system/base.css` aside (missing local asset) | `FAIL index.html:6`, `engine.html:3`, `design-system/index.html:9 — no such file`; exit 1 |
| append a relative link to `./does-not-exist.md` in this file | `FAIL design-system/verification.md — "./does-not-exist.md" — no such file`; exit 1 |
| duplicate `id="main"` in a scratch copy of `index.html` | `no-dup-id: Duplicate ID "main"` + `element-permitted-content`; exit 1 (real tree: exit 0) |
| 3000px-wide `<div>` served at 390 in a scratch root | `FAIL wiki-light-390 overflow: horizontal overflow 2626px at 390px (tolerance 1px)`; exit 1 |

### Screenshot matrix (`scripts/a11y/check-shots.mjs`)

12 cells, full-page PNGs plus `manifest.json` in `artifacts/shots/`, uploaded as
the `ds-shots` artifact (14-day retention). `artifacts/` is gitignored.

| Surface | 1440 | 390 |
|---|---|---|
| `index.html` (wiki) | light, dark | light, dark |
| `pitch.html` | default palette | default palette |
| `engine.html` | default palette | default palette |
| `design-system/index.html` | light, dark | light, dark |

Fails on a page JS error (console.error / pageerror, network noise excluded),
`scrollWidth - clientWidth > 1` on `documentElement` or `body`, or a PNG under
5KB (did it paint). Serves on an ephemeral loopback port through
`scripts/a11y/lib/server.mjs` — never 5173. Local runtime at HEAD is ~6s.

## Blind spots

Read this list before quoting a green run as a guarantee.

1. **Budgets are ceilings, not zero.** T1 9/10, T2 31/32, T3 18/21, T4w 22/22,
   T4f 2/2, T6 5/5, T14 8/8, T15 144/147, T8 10/10, C1 6/6, C2 4/12 are all debt
   carried forward. A regression *inside* a class's headroom passes.
2. **T6 is deferred, not enforced.** Its budget of 5 exists because `pitch.html`'s
   width queries cannot be snapped while the page is under foreign editing, and
   one gallery query stays raw (see [surfaces.md](surfaces.md#blocked)).
3. **T7 (raw width/height) and raw `box-shadow` are not enforced**, per
   `audit-checklist.md` §"Enforcement gate".
4. **Canvas string lookups are invisible to a `var()` counter.** `engine.html`
   reads two tokens through `CT('--color-engine-track-*')` strings; that is why
   T8's budget of 10 starts with "2 canvas-only" rather than counting them dead.
5. **C2 measures the committed blob, not the worktree.** The lint output says it
   plainly: "pitch.html worktree has 5 duplicate selector(s), committed HEAD has
   4 — C2 follows HEAD". A green C2 beside a dirty page is expected.
6. **Contrast exit 0 is not "0 failures".** `a11y-static` passes while five
   annotated rows stay open — `pitch warning/surface` (latent) and four
   `rule/surface` hairlines at 3:1 (WCAG 1.4.11). See
   [accessibility.md](accessibility.md#1-contrast-wcag-143).
7. **Only counts and anchors are machine-checked in docs.** A prose sentence can
   be wrong while `check-doc-counts` is green; it validates "189 keys, 20 groups",
   gallery totals, group tags, and nothing else.
8. **Screenshots are artifacts, not assertions.** `shots` proves the page loaded,
   painted, threw no JS error and does not overflow horizontally at 1440/390. It
   does **not** pixel-diff against a reference, so a colour, spacing or z-order
   regression inside the viewport passes. Visual judgement still needs a human
   with the PNGs.
9. **Reduced motion is collapsed at the source** (`base.css:148` zeroes every
   duration token) but page-local guards vary in coverage; uneven coverage is
   tracked as D-23 in `audit-checklist.md`, not enforced.
10. **One browser.** CI runs the pinned Chrome for Testing only
    (`scripts/a11y/package.json`); Safari and Firefox are unverified.
11. **`lint-allow` exemptions are reasons, not passes.** 26 lines carry a marker
    with its justification; a marker whose reason no longer applies fails as
    `bad-allow`. Removing a marker to make a count look better is the failure
    mode this class exists to catch.
12. **External links are unchecked.** `check-links.mjs` never fetches
    `http(s)://`; a dead vendor URL or a redirected citation passes the gate.
    Egress would fail merges on third-party outages, so the check is a closed
    local graph by design.
13. **html-validate runs 16 curated rules, not the recommended set.** Ten
    recommended rules are disabled because the shipped pages violate them and
    Task 39 does not own the pages — the table above is the exact list, with
    counts. `no-implicit-button-type` (48) and `no-inline-style` (113) are the
    two most material.

## CI

| Job | Checks | Runtime | Blocking |
|---|---|---|---|
| `static-docs` (tokens, docs, anchors, links) | 1–6 | ~2 s | yes |
| `a11y-static` (contrast + targets) | 7–8 | <0.2 s | yes |
| `a11y-browser` (axe + keyboard) | 9–10 | ~90 s cold (Chrome install) | yes |
| `html-validate` (structural) | 11 | ~15 s (no Chrome download) | yes |
| `shots` (1440 + 390 artifacts) | 12 | ~75 s cold | yes |

Jobs run in parallel, so wall clock is bounded by `a11y-browser` at ~90 s plus
queueing — well under the 5-minute budget. Only `a11y-browser`, `html-validate`
and `shots` install, all inside `scripts/a11y`: `puppeteer 24.15.0`,
`axe-core 4.10.3`, `html-validate 8.24.1` exactly. The `html-validate` job sets
`PUPPETEER_SKIP_DOWNLOAD=1`. There is no root `package.json` by design — the
site stays framework-free on Vercel.

## PR evidence

Attach the tail of each command, not a summary of it:

```
node scripts/build-tokens.mjs --check          # "byte-identical"
node scripts/build-foundations.mjs --check     # "byte-identical"
node scripts/lint-tokens.mjs --check           # "RESULT: PASS — 0 over budget, N exempt, 0 bad-allow"
node scripts/check-doc-counts.mjs             # "RESULT: PASS — N assertion(s)"
node scripts/check-anchors.mjs                # "RESULT: PASS — every anchor resolves"
node scripts/check-links.mjs                  # "RESULT: PASS — 132 local target(s)"
node scripts/check-contrast.mjs               # table + debt rows listed
node scripts/check-targets.mjs                # floor + exemptions
node scripts/check-axe.mjs                    # "0 serious/critical"
node scripts/check-keyboard.mjs               # tabs/dialog/menu pass
scripts/a11y/node_modules/.bin/html-validate --config scripts/htmlvalidate.config.json \
  index.html pitch.html engine.html design-system/index.html   # silent, exit 0
node scripts/a11y/check-shots.mjs             # "RESULT: PASS — 12 capture(s)"
```

Plus, for any visual change: the `ds-shots` artifact link (or the 1440 and 390
PNGs) for every touched surface and every scheme it supports, and a declared
delta (what moved and by how much).

## Adding a class

1. Seed the budget with today's measured count and print it in the report.
2. Prove it with one injected violation in a scratch copy: the gate must exit 1
   and increment its own count.
3. Ratchet the budget down as debt is paid. Never raise a budget to absorb a new
   raw value or a new token — that legalises the regression.
