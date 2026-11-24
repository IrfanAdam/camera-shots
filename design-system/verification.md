# Verification — what the gates prove, and what they cannot see

`PASS` in this repo means **"no violation outside the gates' classes"**, never
"every literal is tokenised". This file is the map from a claim to the command
that can falsify it, so a reviewer never has to trust prose.

## The nine blocking gates

All nine run in `.github/workflows/ds-gate.yml`; the first five are static and
install nothing. Run them from the repo root.

| # | Command | Job | Proves |
|---|---|---|---|
| 1 | `node scripts/build-tokens.mjs --check` | `gate` | committed `tokens.css` is byte-identical to a fresh render of `tokens.json` |
| 2 | `node scripts/build-foundations.mjs --check` | `gate` | committed `foundations.md` matches the source |
| 3 | `node scripts/lint-tokens.mjs --check` | `gate` | V1–V8, U1, T1–T15 on the four pages + C1–C6 on the shared layer |
| 4 | `node scripts/check-doc-counts.mjs` | `gate` | no doc states a count the source contradicts |
| 5 | `node scripts/check-anchors.mjs` | `gate` | every `#anchor`, id, idref and `[plan:…]` link resolves |
| 6 | `node scripts/check-contrast.mjs` | `a11y-static` | WCAG 1.4.3 over the declared token pairs |
| 7 | `node scripts/check-targets.mjs` | `a11y-static` | 40px control floor + the documented compact exemption |
| 8 | `node scripts/check-axe.mjs` | `a11y-browser` | axe-core 4.10.3 over 9 surface runs, 0 serious/critical |
| 9 | `node scripts/check-keyboard.mjs` | `a11y-browser` | tabs / dialog / menu driven with real key events, no page error |

`html-validate` is a tenth job and is **advisory** — `continue-on-error: true` in
`ds-gate.yml` until Phase 6 Task 39 makes it blocking.

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
8. **Screenshots are manual.** No screenshot job exists in CI yet (Task 39); the
   `design-system/shots/` artifacts are review evidence, not assertions.
9. **Reduced motion is collapsed at the source** (`base.css:148` zeroes every
   duration token) but page-local guards vary in coverage; uneven coverage is
   tracked as D-23 in `audit-checklist.md`, not enforced.
10. **One browser.** CI runs the pinned Chrome for Testing only
    (`scripts/a11y/package.json`); Safari and Firefox are unverified.
11. **`lint-allow` exemptions are reasons, not passes.** 26 lines carry a marker
    with its justification; a marker whose reason no longer applies fails as
    `bad-allow`. Removing a marker to make a count look better is the failure
    mode this class exists to catch.

## CI

| Job | Gates | Runtime | Blocking |
|---|---|---|---|
| `gate` (tokens, docs, anchors) | 1–5 | ~1 s | yes |
| `a11y-static` (contrast + targets) | 6–7 | <0.2 s | yes |
| `a11y-browser` (axe + keyboard) | 8–9 | ~7 s after a cold Chrome install | yes |
| `html-validate` (advisory) | — | ~20 s | **no** (`continue-on-error`) |

`a11y-browser` is the only job with dependencies, scoped to `scripts/a11y`:
`puppeteer 24.15.0` and `axe-core 4.10.3` exactly. There is no root
`package.json` by design — the site stays framework-free on Vercel.

## PR evidence

Attach the tail of each command, not a summary of it:

```
node scripts/build-tokens.mjs --check          # "byte-identical"
node scripts/build-foundations.mjs --check     # "byte-identical"
node scripts/lint-tokens.mjs --check           # "RESULT: PASS — 0 over budget, N exempt, 0 bad-allow"
node scripts/check-doc-counts.mjs             # "RESULT: PASS — N assertion(s)"
node scripts/check-anchors.mjs                # "RESULT: PASS — every anchor resolves"
node scripts/check-contrast.mjs               # table + debt rows listed
node scripts/check-targets.mjs                # floor + exemptions
node scripts/check-axe.mjs                    # "0 serious/critical"
node scripts/check-keyboard.mjs               # tabs/dialog/menu pass
```

Plus, for any visual change: a 1440 and a 390 artifact per touched surface, every
scheme the surface supports, and a declared delta (what moved and by how much).

## Adding a class

1. Seed the budget with today's measured count and print it in the report.
2. Prove it with one injected violation in a scratch copy: the gate must exit 1
   and increment its own count.
3. Ratchet the budget down as debt is paid. Never raise a budget to absorb a new
   raw value or a new token — that legalises the regression.
