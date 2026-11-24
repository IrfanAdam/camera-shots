# Lane C — Docs, Gallery & Governance

## Verdict

The docs *describe* a governed system the repo does not yet have. Tokens, gate and gallery are real and green (`gate: PASS, 0 violations, 21 exempt`, exit 0); the documentation layer is a **single unversioned snapshot with no owner-facing policy and no machine check on its own claims.** 20 stale statements, 2 of which the gallery presents as *measured evidence* (focus-ring rows), plus 10 implemented components with no spec, 6 of 13 token groups missing from the only scale reference, and no changelog/version/deprecation/contribution path at all. Severity is driven less by any single line than by the absence of a policy that would have caught all of them: nothing verifies prose, and nothing forces a doc update when a token, family or component changes. The product is a 3-page static site, so the fix is small and cheap — one generated foundations doc, one rewritten README router, a docs-count assertion in CI, and a 6-rule governance page.

## Doc inventory + staleness table

| File | Purpose | Authority | Overlap |
|---|---|---|---|
| `README.md` (133 L) | Index + pipeline + scales + rules + known debt | prose, hand-maintained, **not source of truth** | duplicates `audit-report.md` (PASS claim), gallery (all scales), `audit.md` (debt) |
| `tokens.json` (229 keys) | Token source | **source of truth (values)** | — |
| `tokens.css` | Generated `:root` | **generated, never edit** | — |
| `components.md` (367 L) | 10 component specs | hand-maintained, authoritative for API | overlaps `patterns.md` token rows |
| `patterns.md` (100 L) | 7 compositions | hand-maintained, **claims unverified** | duplicates component token tables |
| `audit.md` (58 L) | Dated findings + history | **historical, reads as current** | duplicates `audit-report.md`; sole record of type-family ADR |
| `audit-report.md` (99 L) | Machine receipt | **generated** | 100% duplicate of the `audit.md` PASS claim + README:126 |
| `audit-checklist.md` (66 L) | Per-screen review checklist | hand-maintained | duplicates README §Rules + gate classes |
| `index.html` (gallery, 7 sections) | Rendered reference | **generated-by-hand, unverified counts** | the only place elevation/z/touch live |

Staleness (severity | file:line | claim | current fact):

| # | Sev | Cite | Claim | Current fact |
|---|---|---|---|---|
| 1 | P1 | `README.md:109-111` | Spacing is 7 steps (2xs→2xl) | `tokens.json` has **15** spacing keys (`2,2xs,6,xs,10,sm,14,md,18,20,lg,xl,2xl,base,gutter.pro`); the 2px grid the gate enforces (V8) is undocumented |
| 2 | P1 | `README.md:126` | "0 violations, 21 documented exemptions — every raw paint, motion, z-index, radius, border width and spacing value now resolves from a token" | self-contradictory: `audit-report.md:31-70` lists **21 raw literals kept in place** (`z-index:5`, `z-index:80`, `padding:5px`, `#0B0B0D`) |
| 3 | P1 | `README.md:59-111` ("The scales") | documents "the scales" | omits **6 of 13 groups / 29 keys**: `elevation`(7), `opacity`(3), `layout`(10), `breakpoint`(4), `focus`(2), `border`(3) |
| 4 | P2 | `README.md:11` | "229 keys, 13 groups" | correct **today**, hand-typed → unconditional rot (verified: 229/13) |
| 5 | P2 | `README.md:130` | 2 non-var font sizes per page, listed for 3 pages | correct for the 3 pages; gallery adds 2 more (`11px` ×2, `design-system/index.html`) — never mentioned |
| 6 | P1 | `design-system/index.html:745` | "One 4px base, **eight steps**" | renders 8 of 15 spacing tokens; caption hardcoded |
| 7 | P1 | `index.html:506,530,544,558,579,604,631,647,657` | 9 hardcoded group tags `18/8/8/15/19/21/10/4/9 tokens` | all 9 currently match rendered swatches, but are **static text** — skill requires every count computed at render (only `229` is, via `.js-token-count`, `:1332`) |
| 8 | **P0** | `index.html:1269` (matrix, Wiki/Focus) | "deviation — **none defined**. Browser default only" | false: `index.html:84-86` declare `outline:var(--focus-width) solid …; outline-offset:var(--focus-offset)` on all focusables |
| 9 | **P0** | `index.html:1270` (matrix, Engine/Focus) | "deviation — 1px accent + shadow … Round up" | false: `engine.html:410` global `:focus-visible{outline:var(--focus-width)…}` (+`:227`, 9 rules) |
| 10 | P2 | `index.html:1237,1243` | "`--radius-pill` **99px**" | `radius.pill = 9999px` |
| 11 | P1 | `index.html:682-694` | specimen meta "w 650 · lh 1.22 / 1.28" | line-heights are literals in the gallery's own CSS; only `lineheight.body` + `lineheight.pitch.h1` exist → **9 of 11 type sizes have no line-height token** |
| 12 | P1 | `audit-checklist.md:47` | "Newsreader quote max once per page" | family deleted (`audit.md:56-58`); no quote face exists; rule is unenforceable and refers to a removed token |
| 13 | P1 | `audit-checklist.md:35` | "`prefers-reduced-motion` guard present (**known gap** — see audit.md)" | implemented on all 4 surfaces: `index.html:81`, `pitch.html:162,242,717`, `engine.html:424`, gallery `:454` |
| 14 | P1 | `audit-checklist.md:26` | "Timeline handles ≥ `touch.handle.timeline` (32px)" | token has **0 consumers**; timeline chips are unimplemented (see #19) |
| 15 | P1 | `audit.md:11,17,23` | open deviations: pitch icons 2rem, wiki `.step` ~30px, `#cardMenuBtn` 28px | all resolved: `index.html:52` `min-height:40px`; `engine.html:107` `var(--tap-min)`. No resolved/date column → reads as live worklist |
| 16 | P1 | `patterns.md:11` | "article centred at `layout.max.pitch`" | `layout.max.pitch` has **0** `var()` consumers; `pitch.html` uses `max-width:1080px` |
| 17 | P1 | `patterns.md:25` | wiki collapses "on `breakpoint.tablet`" | `breakpoint.tablet` (720px) has **0** consumers; wiki breaks at 800px/639px raw |
| 18 | P1 | `patterns.md:97` | "Every doc type reachable from at least one export control … Never omit" | only `pitch.html` has print/export (`:1134,1137`); `index.html`/`engine.html` have 0 |
| 19 | P1 | `components.md:81,120` | full specs for Timeline Chips + Inspector Pills | not implemented (no lane-chip / pill DOM in `engine.html`; `audit.md:27` admits it) — specs have no surface |
| 20 | P2 | `audit-report.md` | machine receipt | duplicates `audit.md` findings and the README:126 PASS sentence; three copies of one fact |

Uncited-but-true (verified, no action): token groups 229/13 exact; build is deterministic — regenerating into a scratch copy produced `689afe28…` identical to the on-disk `tokens.css`; `!important` 2/5/1/0 = README's 2/5/1 + gallery 0; no duplicate `id`s; all `<img>` have `alt`; docs reference **0 dead tokens** except `audit.md`'s deliberate historical note.

## Gallery coverage gaps

- **Color: 112/119 rendered.** 7 `color.pro.*` tokens have no swatch though all are consumed by pages: `pro.surface.deep`(2 uses), `pro.canvas`(1), `pro.tool`(2), `pro.tool.hover`(1), `pro.divider.strong`(4), `pro.overlay.scrim`(3), `pro.overlay.panel`(3). The "Pro editor — reference language / 10 tokens" tag implies completeness.
- **Section set** = Color, Type, Space & shape, Motion, Touch, Components, Consistency. Missing as *sections or evidence*: **opacity ladder** (3 tokens; `disabled` appears only inside two component tables, `scrim`/`overlay.thumb` never), **layout/container widths** (10 tokens, 0 specimens — and `layout.max.*`/`sidebar.*` are unadopted anyway), **breakpoints** (4 tokens, structural: `var()` cannot live in `@media`), **iconography** (no icon set, no size/stroke scale — but pages use emoji/SVG glyphs), **accessibility evidence** (zero contrast ratios on the page; WCAG is claimed only in `audit-checklist.md:7`).
- **Elevation and z are NOT missing** (contra my brief): 5 shadows at `:775-779`, full 15-step z table at `:786-800`. What is missing is `elevation.0` and `elevation.sheet` from the ladder (sheet appears only in the drawer token table).
- **Touch: 5/6** — `touch.handle.timeline` absent (consistent with #14).
- **Type:** 11/11 sizes + 2 families, but line-height/tracking/weight rendered as **hand-typed prose**, not tokens; no dense/display comparison, no tabular-figure specimen.
- **Components: 9 specimens vs 10 specs.** Rendered: Button, Pill filter, Field, Card, Panel, Tool button, Badge, Toast, Drawer/sheet header. No specimen for Doc Tabs, Transport Bar, Timeline Chips, Inspector Pills.
- **Implemented, specced nowhere, shown nowhere:** wiki theme toggle (`#theme`), wiki step rail (`.steps`), wiki table `.map`, footers, engine `#chapterSel`, 2 `type="file"` pickers, project modal (`#projModal`), asset modal (`#assetModal`), context menus (`#cardMenu`, `#drawerMenu`, `#assetPanel`). **Ten gaps** = the real spec debt, not the two speculative ones in #19.
- **States:** each of the 9 frames shows default/hover/focus/disabled/armed only where that component has them; no per-component state matrix, no error/loading/empty state anywhere, no dark-vs-light pairing except in the matrix.
- **Counts:** `229` is computed (`:1332`); the 9 group tags, "eight steps", and every matrix note are hardcoded. 11 of 12 numeric claims are unverified at render.

## Missing guides (ranked, with why-now)

1. **P0 `foundations.md`** — 13 groups with value + role + consumer count; wiki light/dark theme contract (which slots flip); type scale **with line-height** (9/11 sizes have none — this is why pages ship `15px/1.6` vs `15px/1.7`); spacing 2px grid vs 4px step; radius; elevation; z; motion; layout/grid; iconography. *Why now:* README is the only scale reference and it is already wrong in 3 places (#1,#3,#6); the matrix's own "Body size" deviation is a symptom of the missing line-height contract.
2. **P0 completion of `components.md` API** — spec the 10 implemented-but-unspecced components; move Timeline Chips/Inspector Pills to a `proposed/` status instead of presenting them as live. *Why now:* 10 of ~19 shipped components are undocumented, and the gallery cannot show what has no spec.
3. **P1 `accessibility.md`** — measured contrast table generated from `tokens.json` (pairs, ratio, pass/fail), focus-ring contract (`--focus-width`/`--focus-offset`/accent per surface), target floors, reduced-motion policy, `aria` roles per component. *Why now:* the matrix's two "measured" focus claims are false (#8,#9) and no ratio exists anywhere in the repo — the system currently cannot answer "is this compliant?" without re-deriving it.
4. **P1 `verification.md`** — what the gate checks, what it deliberately cannot (font-size, prose, doc counts, contrast), the CI contract, and the PR evidence list. *Why now:* the gate is manual and green by habit; `README:126` shows the prose already outran the gate's limited scope.
5. **P1 `governance.md`** — 6-rule policy below. *Why now:* zero tags, zero changelog, zero contribution path; the type-family deletion (231→229) is recorded only inside a dated audit section.
6. **P1 `surfaces.md`** (per-page contract) — theme ownership, print, breakpoints, browser support, export affordances per surface. *Why now:* absorbs four "guides" the site actually needs (print, breakpoints, browser support, adoption) into one page instead of four generic docs; `patterns.md:97` is already a false cross-surface promise.
7. **P2 `content.md`** — honesty-qualifier and figure-label voice, export menu wording, error/empty copy. *Why now:* the pitch surface's differentiator is qualifier discipline; it exists as one checklist line with no examples.
8. (folded, no file) **adoption/migration** — extend README §"How a page consumes it"; **performance** — one line in `governance.md` ("no runtime deps, one stylesheet, no build step"). Neither earns a page for 3 static files.

## Governance policy proposal (change classes, versioning, deprecation, changelog)

Solo-maintained static site → **centralised, one maintainer, 6 rules, no RFC board.** Governance theatre is the failure mode here, not under-process.

**Change classes** (declare in the commit subject; force a version intent):

| Class | Trigger | Needs |
|---|---|---|
| `token:add` | new key, no consumer change | regenerate; gallery specimen; changelog `Added`, **minor** |
| `token:value` | value edit that moves pixels | before/after screenshot; changelog `Changed`, **major if it alters a surface's identity** (accent/bg), else minor |
| `token:rename/remove` | key removed or renamed | grep 0 consumers first; update every doc cite; `## Removed`; **major** |
| `component` | new/changed spec or markup | spec section + gallery frame + state list; **minor** (breaking spec = major) |
| `docs` | prose only | factual cite (`file:line` or command) for any measured claim; **patch** |
| `fix` | gate/lint bug | must not weaken a check without a `BAD-ALLOW` rationale; **patch** |

**Versioning:** the *system*, not the site, is versioned — `DESIGN-SYSTEM.md` frontmatter + `git tag ds-vX.Y.Z`. No tags exist today (verified `git tag -l` = 0). Site deploys carry no version; the token contract does. Major = key removed/renamed or a surface's accent/bg changes; minor = key added, component added; patch = docs, fix, non-visual value nudge.

**Deprecation:** deprecate in N, remove in N+1, minimum. Mechanism for CSS-only: keep the key one release with `/* @deprecated → --new-key */` in `tokens.json` (`description`), list in `DEPRECATIONS.md`, and add a `U1`-style *advisory* row to the gate (warning, not failure) so consumers see it. No exemption from the gate may be used to keep a deprecated token alive.

**Changelog:** root `CHANGELOG.md`, Keep-a-Changelog, one entry per tag, entries grouped Added/Changed/Removed/Fixed, each naming keys and surfaces. Written at commit time, never reconstructed (there is no history to reconstruct from — the 231→229 removal is only in `audit.md:58`).

**Review checklist** = the 8 lines in `audit-checklist.md` **after** fixing #12–#14, plus: *gate green*, *build byte-stable*, *every new count computed*, *every doc claim cites a command or line*. **Ownership:** one maintainer (repo owner) is the only approver; a second reviewer is required only for `token:rename/remove` and any change to `tokens.json` structure.

**Decision log:** `decisions.md` — append-only ADR stubs (date, decision, consequence, affected keys). Seed it with the 5 decisions currently buried in `audit.md`: one-family type, no display/quote face, 2px grid + declared off-grid debt, pro-editor reference is feel-only, touch.small/field are legacy.

## CI workflow spec (exact job steps + failure conditions)

Path: `.github/workflows/ds-gate.yml`. Triggers: `pull_request`, `push: branches:[main]`, `workflow_dispatch`. `permissions: contents: read`. `concurrency: group: ds-gate-${{ github.ref }}, cancel-in-progress: true`. **No deploy step, no `vercel` CLI, no root `package.json`** — dev tooling lives in `tools/` with its own manifest and `npm ci --prefix tools`, so Vercel's `framework:null` static detection is untouched.

`job: verify` (ubuntu-latest, node 20, `fetch-depth: 1`):
1. `node scripts/build-tokens.mjs` → `git diff --exit-code -- design-system/tokens.css`. **Fails if** regeneration is not byte-identical (proves the committed CSS matches `tokens.json`). Zero deps. *(Prefer adding `build-tokens.mjs --check` that compares without writing; same guarantee, no worktree mutation.)*
2. `node scripts/lint-tokens.mjs --check`. **Fails if** any V1–V8/U1 violation or `BAD-ALLOW`; the 21 exemptions stay informational.
3. `node .github/scripts/check-doc-counts.mjs` (new, ~40 L, zero deps). **Fails if** README's "`N` keys, `M` groups" ≠ `tokens.json`; any gallery group tag ≠ its rendered swatch count; any `js-token-count` fallback ≠ computed count. This is the only check that can catch #4/#7.
4. `node .github/scripts/check-anchors.mjs` (new, zero deps: parse `id="…"` + `href="#…"`, assert closure, assert no duplicate ids). **Fails** on a dangling anchor or duplicate id.
5. External links: 3 URLs only — `curl -sSfIL --retry 2 --max-time 20` in a loop; **fails** on 4xx/5xx except an explicit 403 allowlist (publisher WAFs). No `lychee` action needed at this scale.
6. HTML validity: `npx --yes html-validate@9 index.html pitch.html engine.html design-system/index.html`. **Fails** on parse errors, duplicate attributes, invalid nesting. (`tidy -e` via apt is the offline fallback.) This is the one network-fetched tool; pin the version.
7. `npm ci --prefix tools && node tools/shots.mjs && node tools/a11y.mjs`. `tools/` deps: `playwright`, `@axe-core/playwright`. Shots at 1440×900 and 390×844 for the 4 files, **light and dark forced** via `colorScheme`; assert wiki-light background pixel sum RGB > 600. `a11y` fails on axe `serious`/`critical` only (contrast, names, roles) and prints the ratio table it computed. Upload `shots/**` + `axe.json` via `actions/upload-artifact@v4`.
8. Screenshot diff: on `pull_request` only, compare against artifacts from `main` (download by run-id, or cache); report % changed per surface, **fail** if the gallery itself is not 0.000% when only tokens changed (no-op proof).

**PR must attach:** (a) gate table tail — `RESULT … PASS (n exempt)`; (b) byte-stability step output; (c) doc-count check output; (d) artifact link with both themes for any surface touched; (e) for a new/changed color token, the contrast pair + ratio row from `tools/a11y.mjs`; (f) `CHANGELOG.md` diff line and the change class. **Overall failure gate:** any of 1–7 non-zero ⇒ block merge; 8 is advisory except the gallery no-op case.

## Proposed docs IA (file | purpose | source of truth | action)

| File | Purpose | SoT? | Action |
|---|---|---|---|
| `design-system/README.md` | router: what/where/pipeline/rules | no (index) | **rewrite to ~60 L**; drop all scale tables → `foundations.md`; drop PASS/debt prose → `verification.md` |
| `design-system/foundations.md` | **new** — 13 groups, roles, theme contract, type+line-height, grid | values yes (`tokens.json`); prose no | create; every table carries a `keys: N` line asserted by CI |
| `design-system/components.md` | 19 components, 10 new sections; `proposed` status for chips/pills | **yes (API)** | extend; add status column |
| `design-system/patterns.md` | shells + compositions | yes | **fix #16–#18** or delete the false rows; drop duplicated token tables |
| `design-system/surfaces.md` | **new** — per-surface contract: themes, print, breakpoints, browser support, export | yes | create; absorbs 4 micro-guides |
| `design-system/accessibility.md` | **new** — contrast table (generated), focus contract, targets, motion, ARIA | no (derived) | create; generated section marked `GENERATED` |
| `design-system/verification.md` | **new** — gate classes, blind spots, CI, PR evidence | **yes** | create; README:126's job moves here, factually |
| `design-system/governance.md` | **new** — 6 change classes, semver, deprecation, review, ownership | **yes** | create |
| `design-system/decisions.md` | **new** — append-only ADR stubs | **yes (why)** | create; seed with 5 decisions from `audit.md` |
| `design-system/audit.md` | dated findings archive | historical | **retire to `archive/audit-2026-11-23.md`**; strip the live worklist |
| `design-system/audit-report.md` | machine receipt | generated | keep; footer says "regenerated by CI, not a doc" |
| `design-system/audit-checklist.md` | per-screen review | yes | keep, fix #12–#14, move the gate section to `verification.md` |
| `design-system/index.html` | gallery | rendered proof | keep; computed counts, 7 → 10 sections |
| `CHANGELOG.md` (root) | release log | **yes** | create |
| `DESIGN-SYSTEM.md` (root) | 5-line pointer + current `ds-v` version | yes | create (1 screen) |

**Read order = pipeline:** `README` → `foundations` (tokens) → `components` → `patterns` → `surfaces` (pages) → `verification` → `governance`/`decisions` → `CHANGELOG`.

## Proposed workstream — ordered tasks with files + acceptance + effort

| # | Task | Files | Acceptance | Effort |
|---|---|---|---|---|
| 1 | Fix the two false matrix rows + pill value | `design-system/index.html` | Wiki/Engine focus rows cite `index.html:84`/`engine.html:410` and lose the `deviation` badge; no claim without a `file:line` | S |
| 2 | Compute every gallery count | `design-system/index.html` | 9 group tags + "eight steps" derive from DOM/`getComputedStyle`; grep for `tokens</span>` shows no literal digit | S |
| 3 | Retire stale checklist rules | `audit-checklist.md` | no `Newsreader`; reduced-motion phrased as implemented-with-a-test; timeline rule removed or marked proposed | S |
| 4 | Archive `audit.md`, run its worklist to zero first | `audit.md` → `archive/` | every deviation row has a resolved-by cite; live worklist is empty | S |
| 5 | Write `foundations.md` from `tokens.json` | + `README.md` | 13 groups, all 229 keys attributable, spacing shows 15 incl 2px grid, 11 sizes each with line-height | M |
| 6 | Spec the 10 unspecced components; status column | `components.md`, `index.html` | 19 sections; chips/pills marked `proposed`; each live component has a gallery frame | M |
| 7 | Correct `patterns.md` | `patterns.md` | no claim referencing an unconsumed token; export-cluster rule either true or deleted | S |
| 8 | `accessibility.md` + ratio generator | `tools/a11y.mjs`, new doc | every text/surface pair has a measured ratio; any <4.5:1 listed as debt | M |
| 9 | Governance + changelog + first tag | `governance.md`, `decisions.md`, `CHANGELOG.md`, `DESIGN-SYSTEM.md` | 6 classes documented; `ds-v1.0.0` tagged; one changelog entry citing keys | S |
| 10 | CI workflow + doc-count + anchor scripts | `.github/workflows/ds-gate.yml`, `.github/scripts/*` | green run on `main`; a deliberate README count edit fails job 3; Vercel deploy unchanged | M |
| 11 | Gallery sections 08–10 (opacity, layout, a11y) | `design-system/index.html` | 119/119 color swatches; opacity + layout specimens; contrast table with ratios | M |

## Still uncertain

- **Contrast ratios are unmeasured by me** — no ratio appears in the repo and I did not run a color-contrast tool, so `accessibility.md` cannot be seeded with numbers from this audit; #8 above must compute them before any pass/fail claim.
- Whether Vercel's `framework:null` project tolerates a nested `tools/package.json` without changing detection — needs one preview deploy to confirm; root `package.json` must stay absent regardless.
- Whether `audit.md` should be archived as-is or rewritten in place: archive is safer (it is the only record of the type-family decision) but leaves two audit surfaces until `decisions.md` is seeded.
- `engine.html` at 214 KB with 0 print/export support: whether the "every doc type exports" rule should be narrowed for canvas (my recommendation) or the engine should gain print — a product call, not a docs call.
- Gallery group taxonomy (9 color clusters) is undocumented anywhere; whether `color.pro.*` (7 unshown) is a fifth surface or an engine sub-language is unresolved and blocks a clean 5th surface row in `surfaces.md`.
