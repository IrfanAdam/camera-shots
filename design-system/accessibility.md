# Accessibility — what the gate enforces, and what it does not

Status: **partially compliant, with named debt.** Two WCAG 1.4.3 nodes on the
wiki and eight theme×pair token results are still below threshold; they are
enumerated below as **Task 27 debt** and are ratcheted (they fail if they get
worse). Nothing in this file claims a clean pass.

The gate added in Phase 4 Task 29 runs in `.github/workflows/ds-gate.yml`:

| job | checks | needs a browser | runtime on this machine |
|---|---|---|---|
| `gate` | the five original gates (byte-stability, token lint, doc counts, anchors) | no | ~1 s |
| `a11y-static` | contrast pairs, target sizes | no | <0.2 s |
| `a11y-browser` | axe-core 4.10.3 over 9 surface runs, keyboard smoke | yes — pinned Chrome for Testing | ~7 s after install |

All four accessibility checks are blocking. There is no `continue-on-error`.

## 1 · Contrast (WCAG 1.4.3)

`scripts/check-contrast.mjs` reads `design-system/tokens.css`, resolves the
`var()` chain for each `[data-ds-theme]` map exactly as the browser does, and
computes WCAG 2.x relative-luminance ratios for a declared pair table.

**Threshold: 4.5:1 for every text pair, no large-text exemption.** The system
ships 12.8–13.6px text in these slots, so the 3:1 large-text allowance is not
available; a pair that only passes at 3:1 fails. Translucent colours are
composited over the background before measuring.

Measured on `a7c086d` (regenerate with `node scripts/check-contrast.mjs`):

| theme | pair | foreground → background | ratio | min | state |
|---|---|---|---|---|---|
| pitch | `ink/bg` | `--ds-ink` → `--ds-bg` | 17.38 | 4.50 | PASS |
| pitch | `ink/surface` | `--ds-ink` → `--ds-surface` | 16.15 | 4.50 | PASS |
| pitch | `ink-2/surface` | `--ds-ink-2` → `--ds-surface` | 12.79 | 4.50 | PASS |
| pitch | `muted/bg` | `--ds-muted` → `--ds-bg` | 8.04 | 4.50 | PASS |
| pitch | `muted/surface` | `--ds-muted` → `--ds-surface` | 7.48 | 4.50 | PASS |
| pitch | `faint/surface` | `--ds-faint` → `--ds-surface` | 5.47 | 4.50 | PASS |
| pitch | `on-accent/accent` | `--ds-on-accent` → `--ds-accent` | 9.02 | 4.50 | PASS |
| pitch | `accent/bg` | `--ds-accent` → `--ds-bg` | 9.60 | 4.50 | PASS |
| pitch | `accent/surface` | `--ds-accent` → `--ds-surface` | 8.93 | 4.50 | PASS |
| pitch | `success/surface` | `--ds-success` → `--ds-surface` | 7.25 | 4.50 | PASS |
| pitch | `warning/surface` | `--ds-warning` → `--ds-surface` | 4.47 | 4.50 | DEBT |
| pitch | `danger/surface` | `--ds-danger` → `--ds-surface` | 4.70 | 4.50 | PASS |
| wiki-light | `ink/bg` | `--ds-ink` → `--ds-bg` | 16.68 | 4.50 | PASS |
| wiki-light | `ink/surface` | `--ds-ink` → `--ds-surface` | 17.76 | 4.50 | PASS |
| wiki-light | `ink-2/surface` | `--ds-ink-2` → `--ds-surface` | 6.13 | 4.50 | PASS |
| wiki-light | `muted/bg` | `--ds-muted` → `--ds-bg` | 5.76 | 4.50 | PASS |
| wiki-light | `muted/surface` | `--ds-muted` → `--ds-surface` | 6.13 | 4.50 | PASS |
| wiki-light | `faint/surface` | `--ds-faint` → `--ds-surface` | 6.13 | 4.50 | PASS |
| wiki-light | `on-accent/accent` | `--ds-on-accent` → `--ds-accent` | 7.58 | 4.50 | PASS |
| wiki-light | `accent/bg` | `--ds-accent` → `--ds-bg` | 7.12 | 4.50 | PASS |
| wiki-light | `accent/surface` | `--ds-accent` → `--ds-surface` | 7.58 | 4.50 | PASS |
| wiki-light | `success/surface` | `--ds-success` → `--ds-surface` | 5.07 | 4.50 | PASS |
| wiki-light | `warning/surface` | `--ds-warning` → `--ds-surface` | 4.12 | 4.50 | DEBT |
| wiki-light | `danger/surface` | `--ds-danger` → `--ds-surface` | 3.91 | 4.50 | DEBT |
| wiki-light | `white/status-info` | `--color-primitive-white` → `--color-status-info` | 4.25 | 4.50 | DEBT |
| wiki-light | `danger/wikil-bg` | `--color-status-danger` → `--color-wiki-light-bg` | 3.68 | 4.50 | DEBT |
| wiki-dark | `ink/bg` | `--ds-ink` → `--ds-bg` | 16.53 | 4.50 | PASS |
| wiki-dark | `ink/surface` | `--ds-ink` → `--ds-surface` | 15.28 | 4.50 | PASS |
| wiki-dark | `ink-2/surface` | `--ds-ink-2` → `--ds-surface` | 7.28 | 4.50 | PASS |
| wiki-dark | `muted/bg` | `--ds-muted` → `--ds-bg` | 7.87 | 4.50 | PASS |
| wiki-dark | `muted/surface` | `--ds-muted` → `--ds-surface` | 7.28 | 4.50 | PASS |
| wiki-dark | `faint/surface` | `--ds-faint` → `--ds-surface` | 7.28 | 4.50 | PASS |
| wiki-dark | `on-accent/accent` | `--ds-on-accent` → `--ds-accent` | 9.21 | 4.50 | PASS |
| wiki-dark | `accent/bg` | `--ds-accent` → `--ds-bg` | 9.21 | 4.50 | PASS |
| wiki-dark | `accent/surface` | `--ds-accent` → `--ds-surface` | 8.51 | 4.50 | PASS |
| wiki-dark | `success/surface` | `--ds-success` → `--ds-surface` | 6.87 | 4.50 | PASS |
| wiki-dark | `warning/surface` | `--ds-warning` → `--ds-surface` | 8.51 | 4.50 | PASS |
| wiki-dark | `danger/surface` | `--ds-danger` → `--ds-surface` | 4.45 | 4.50 | DEBT |
| wiki-dark | `white/wikidark-accent` | `--color-primitive-white` → `--ds-accent` | 2.05 | 4.50 | DEBT |
| engine | `ink/bg` | `--ds-ink` → `--ds-bg` | 18.06 | 4.50 | PASS |
| engine | `ink/surface` | `--ds-ink` → `--ds-surface` | 15.26 | 4.50 | PASS |
| engine | `ink-2/surface` | `--ds-ink-2` → `--ds-surface` | 5.94 | 4.50 | PASS |
| engine | `muted/bg` | `--ds-muted` → `--ds-bg` | 7.03 | 4.50 | PASS |
| engine | `muted/surface` | `--ds-muted` → `--ds-surface` | 5.94 | 4.50 | PASS |
| engine | `faint/surface` | `--ds-faint` → `--ds-surface` | 5.94 | 4.50 | PASS |
| engine | `on-accent/accent` | `--ds-on-accent` → `--ds-accent` | 6.91 | 4.50 | PASS |
| engine | `accent/bg` | `--ds-accent` → `--ds-bg` | 7.19 | 4.50 | PASS |
| engine | `accent/surface` | `--ds-accent` → `--ds-surface` | 6.08 | 4.50 | PASS |
| engine | `success/surface` | `--ds-success` → `--ds-surface` | 6.55 | 4.50 | PASS |
| engine | `warning/surface` | `--ds-warning` → `--ds-surface` | 8.11 | 4.50 | PASS |
| engine | `danger/surface` | `--ds-danger` → `--ds-surface` | 4.24 | 4.50 | DEBT |

### Known debt (owner: Task 27 — contrast tokens)

A `DEBT` row is a **known failure**, not a pass. It exits 0 only because the
pair is annotated with its measured ratio; a drop of more than 0.02 fails, and a
pair that clears 4.5:1 prints `FIXED` so the annotation is removed.

| theme | pair | ratio | node it produces |
|---|---|---|---|
| pitch | warning/surface | 4.47 | pitch amber note text |
| wiki-light | warning/surface | 4.12 | wiki `h2 small` (`#B86A00` on white) |
| wiki-light | danger/surface | 3.91 | gallery `span.badge-dev` family |
| wiki-light | `danger/wikil-bg` | 3.68 | gallery `span.badge-dev` ×8 (`#E5484D` on `#F8F8F4`) |
| wiki-light | `white/status-info` | 4.25 | gallery `span.badge--paid` (white on `#8A5CF6`) |
| wiki-dark | danger/surface | 4.45 | wiki dark danger note |
| wiki-dark | `white/wikidark-accent` | 2.05 | wiki dark `a.eng` (white on `#5CC4D0`) |
| engine | danger/surface | 4.24 | engine danger note |

These are the four measured page pairs from
`design-system/audit/2026-11-24/accessibility.md` (D-17, D-18) expressed as
token pairs, plus the four themes' status-ink siblings of the same values. Task
27 owns the token values; this gate does not hide them.

### Exemptions and why there are none in this check

- No 3:1 large-text allowance (see above).
- No "decorative text" exemption. A pair is either a slot the CSS combines or it
  is not in the table.
- Hairlines (`--ds-rule` on `--ds-surface`, 1.19–1.46:1) are **not** a pair
  here: WCAG 1.4.11 applies to boundaries needed to identify a control, and the
  shipped hairlines are decorative separators. The audit records the band; the
  gate does not gate it. If a control ever depends on its border to be
  perceivable, that control's pair must be added.

## 2 · Target sizes

`scripts/check-targets.mjs` reads `design-system/base.css` and
`design-system/components.css` and proves the token flow, statically:

| rule | threshold | evidence in the CSS |
|---|---|---|
| control floor | **40px** (`--touch-min`) | `base.css` §6 `:where(a:not([data-ds-compact]), button:…, [role="tab"], …)` with `min-block-size:var(--touch-min)`, 10 primitives, `:where()` so a page rule still wins |
| coarse pointer | **44px** (`--control-height-touch`) | `base.css` §8 `@media (pointer:coarse)` |
| component height | every `--_ctl-h` resolves to ≥40px | `components.css` block that binds `--_ctl-h` to `control.height.*` |
| compact step | **34px** (`--control-height-compact`) | only on `[data-ds-compact]`, `[data-size="compact"]`, `[data-ds-density="compact"]` |

**The documented exemption.** `[data-ds-compact]` on the control itself opts out
of both floors and is allowed the 34px compact step. It exists for dense,
repeated, non-primary controls — the reference case is the wiki prompt map (388
map-cell buttons: the floor grows `table.map` 3,736 → 5,173px). It is never for
the primary action of a view. The check enforces the shape of the exemption, not
the judgement call: a compact context that resolves below 34px fails, and a
non-compact selector below 40px fails.

What this check **cannot** see: a rendered box whose height comes from padding,
line-height or content rather than an explicit height; a control shrunk by a
page-level rule; and the actual hit area after clipping or overlap. The axe
`target-size` rule (WCAG 2.2 AA, 24px) runs in the browser job and covers the
soft floor; the 40px token floor remains a design contract, measured statically.

## 3 · axe-core

`scripts/check-axe.mjs` serves the repo on an **ephemeral loopback port**
(port 0; it refuses 5173), loads nine surface runs and runs axe-core 4.10.3 with
`wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice`:

| surface | runs |
|---|---|
| `index.html` (wiki) | light 1440, dark 1440, light 390 |
| `pitch.html` | default 1440, default 390 |
| `engine.html` | default 1440 |
| `design-system/index.html` | light 1440, dark 1440, light 390 |

- Blocking: `critical` and `serious`, above `scripts/a11y/baseline.json`.
- The baseline is a **ratchet**: a rule with no entry fails; a count above the
  entry fails; a count below prints `improved` so the entry is tightened; an
  entry that reaches 0 prints `clean` so it is removed.
- Required rules are asserted against the installed build (`color-contrast`,
  `aria-allowed-attr`, `aria-roles`, `aria-required-attr`, `button-name`,
  `link-name`, `image-alt`, `label`, `select-name`, `duplicate-id-aria`,
  `landmark-one-main`, `region`, `tabindex`, `scrollable-region-focusable`), so a
  silently narrowed axe build cannot turn the job green.
- `prefers-reduced-motion: reduce` is emulated and all animations are finished
  before the run. This is not cosmetic: a section mid-fade blends its text and
  axe then measures an interim colour — the same page read 34 contrast nodes
  mid-transition and 0 after it settled.

Current baseline (HEAD `a7c086d`): **2 nodes**, both Task 27 debt —
`wiki:light:1440` and `wiki:dark:1440` each allow one `color-contrast`
(`h2 small` 4.11:1, `a.eng` 2.04:1); `wiki:light:390` allows the same light
node. Every other surface and rule is 0. This is a known WCAG failure, not a
pass.

Page JS errors fail the job. Network failures are classified separately and
reported as `offline`: the harness answers every non-local request offline, so
the engine's Supabase fetch and the wiki's YouTube thumbnails fail by design.

## 4 · Keyboard smoke

`scripts/check-keyboard.mjs` loads `design-system/index.html` and instantiates
the **shipped** behaviours on the specimen markup (`components.js` is loaded with
`data-ds-manual`, so the page itself never auto-inits the specimens), then drives
real key events through CDP:

1. **Tabs** — ArrowRight/ArrowLeft/Home/End move focus and selection; exactly
   one tab holds `tabindex="0"` and exactly one is `aria-selected="true"`.
2. **Dialog** — open puts focus inside `.ds-dialog__box`, `role=dialog` +
   `aria-modal=true` + a resolvable label, every background sibling is `inert`,
   Tab ×6 never leaves the box, Shift+Tab from the first control wraps to the
   last, Escape closes and returns focus to the invoker.
3. **Menu** — ArrowDown opens onto the first item, ArrowDown roves, Escape
   closes and returns focus to the trigger.

The test scaffolding is created in the browser at run time (a trigger button is
inserted next to the specimen). No page file is edited. This proves the
component contract; it does not prove that a page wired the component — that is
each lane's own verification.

Negative seams (`--break=tab-arrows|dialog-trap|menu-escape`) sabotage one
behaviour in the page so the assertion has to fail; they exist to prove the
check can fail and are never used in CI.

## 5 · Commands

```sh
# static, no install
node scripts/check-contrast.mjs            # --json, --tokens <file>
node scripts/check-targets.mjs             # --json, --css <extra.css>

# browser checks (once)
npm ci --prefix scripts/a11y --no-audit --no-fund
(cd scripts/a11y && npx --no-install puppeteer browsers install chrome)

node scripts/check-axe.mjs                 # --only wiki:dark:1440 --json --root <tree>
node scripts/check-keyboard.mjs            # --json
npm run --prefix scripts/a11y all          # all four, in order
```

`--root <tree>` serves another checkout (e.g. a `git worktree` of the commit you
want to measure) with the current scripts — useful when the working tree is
dirty.

### Negative proofs (each must exit 1)

```sh
printf '[data-ds-theme="wiki-light"]{--ds-ink:#C9C9C9}\n' >> /tmp/bad.css
cp design-system/tokens.css /tmp/tokens.css && cat /tmp/bad.css >> /tmp/tokens.css
node scripts/check-contrast.mjs --tokens /tmp/tokens.css          # -> 1  (ink/bg 1.56:1)

printf '.ds-btn{--_ctl-h:24px}\n' > /tmp/target.css
node scripts/check-targets.mjs --css /tmp/target.css              # -> 1  (24px < 40px)

node scripts/check-keyboard.mjs --break=tab-arrows                # -> 1  (focus never moves)
node scripts/check-keyboard.mjs --break=dialog-trap               # -> 1  (Tab escapes)
node scripts/check-keyboard.mjs --break=menu-escape               # -> 1  (menu stays open)

node scripts/check-axe.mjs --require-rule not-a-real-rule         # -> 1  (rule missing)
```

## 6 · Limits (honest list)

- **Canvas text is unmeasurable.** Engine board labels are painted with
  `ctx.fillText`; neither the contrast check nor axe sees them.
- **Non-opaque pairs are skipped, not guessed.** `rgba()` scrims and overlays
  resolve to `SKIP` with a reason (currently none in the table).
- **Target sizes are static.** Rendered padding-derived heights, clipping and
  overlap are not measured; axe `target-size` covers the 24px soft floor only.
- **axe reports 1–4 `incomplete` colour-contrast nodes per page** (gradients,
  overlapping layers). They are printed, not failed — a human still has to look.
- **No screen reader, no cross-browser, no 200%/320% reading order, no 2.4.11
  (focus obscured) check.** Those stay manual, as listed in the audit's
  verification plan.
- **Other Phase 4 lanes share the working tree** at the time this gate was added
  (pitch, and the canvas/focus layers in engine + wiki). Every number above is
  measured on commit `a7c086d` with `--root` on a clean worktree of it; a lane
  that darkens text below 4.5:1 fails this gate, which is the intended
  behaviour.
- **CI installs Chrome from the puppeteer lockfile.** If that download is
  blocked by a runner policy, `a11y-browser` fails loudly — it never skips.
