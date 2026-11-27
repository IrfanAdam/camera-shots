# Design System

Four shipped surfaces — the wiki in `index.html`, the deck in `pitch.html`, the
canvas in `engine.html`, the gallery in `design-system/index.html` — share one
token contract and one gate. This file is a router: what exists, where, how the
pipeline runs. Values live in the generated references, never here.

## Docs map

| Doc | Answers |
|---|---|
| [foundations.md](foundations.md) | every scale, value and role slot — **generated** |
| [components.md](components.md) | 21 live specs over the 21 numbered component blocks, each linked to a gallery frame, plus the proposed appendix |
| [patterns.md](patterns.md) | 10 compositions, each with a status line |
| [surfaces.md](surfaces.md) | per-page contract: theme, print, breakpoints, export, browser support, adoption, blocked work |
| [accessibility.md](accessibility.md) | contrast rows per theme, the target floor (including the coarse pill floor), the mobile-drawer and workbench keyboard contracts |
| [verification.md](verification.md) | the twelve gates, their classes, blind spots, CI and PR evidence |
| [governance.md](governance.md) | six change classes, semver, deprecation, review |
| [decisions.md](decisions.md) | append-only ADRs — why the rules are what they are |
| [references/](references/README.md) | reference intake protocol, template, intake #1 |
| [DEPRECATIONS.md](DEPRECATIONS.md) · [audit-report.md](audit-report.md) · [audit-checklist.md](audit-checklist.md) | retired keys · generated gate receipt · per-screen checklist |

## Where things are

| Path | What it is | Generated |
|---|---|---|
| `design-system/tokens.json` | Token source: **187 keys, 20 groups**, 4 theme maps — the only hand-edited value source | no |
| `design-system/tokens.css` | `:root` properties + `[data-ds-theme]` role blocks | yes |
| `design-system/base.css` · `components.css` · `components.js` | Reset/focus/target floor · 21 numbered blocks (1–21, §20b the rail foot), `var()` only, four densities · behaviour (`DS.init/tabs/menu/overlay/nav/toast/…`) | no |
| `design-system/usage.json` · `usage.md` | Who consumes each token / component: 188 tokens, 158 with a product ref; 5 of 21 blocks have no product instance | yes |
| `design-system/gallery-workbench.js` · `gallery-workbench.css` | Workbench UI: hydrates every `[data-token]` row, inline edit, `?v=<sha256>` hot-swap, 8 s undo toast, read-only fallback | no |
| `design-system/pitch-shell.css` | Page-level pitch language: pins the 17 `--ds-*` roles and the chrome aliases (`--bg --card --s1 --s2 --ink --body --mut --mut2 --rule --acc --acc2 --amb --acc-ink`) to the pitch tokens. Opt in with `<html data-ds-shell="pitch" data-ds-theme="pitch">` and load it **after** the page's own `<style>` | no |
| `design-system/icons.svg` | 24-symbol sprite, `currentColor`, `<use href="icons.svg#ds-icon-…">` | no |
| `design-system/index.html` | Rendered gallery: swatches, type, motion, shape, components, consistency matrix | no |
| `scripts/build-tokens.mjs` · `build-foundations.mjs` | Source → CSS, source + CSS → docs; both deterministic, both with `--check` | no |
| `scripts/lint-tokens.mjs` | Adherence gate: V/U/T on the pages, C1–C6 on the shared layer | no |
| `scripts/build-usage.mjs` | Generates `usage.json` + `usage.md`; `--check` is the CI gate | no |
| `scripts/ds-set-token.mjs` · `scripts/lib/token-write.mjs` | Workbench CLI fallback · the shared validator, atomic writer, rebuild and rollback library | no |
| `scripts/check-doc-counts.mjs` · `check-anchors.mjs` | Docs may not state a stale count · every anchor resolves | no |
| `design-system/audit/2026-11-24/` · `.github/workflows/ds-gate.yml` | Measured baseline (lanes, metrics, shots) · CI: twelve blocking checks | no |

## The pipeline

```
node scripts/build-tokens.mjs            # regenerate tokens.css from tokens.json
node scripts/build-foundations.mjs       # regenerate foundations.md from tokens.json + tokens.css
node scripts/lint-tokens.mjs             # scan the pages, print counts, write audit-report.md
node scripts/lint-tokens.mjs --check     # CI mode: same scan, no write, exit 1 on failure
```

A fresh run reproduces the committed file byte for byte; `--check` diffs without
writing. Editing `tokens.css` or `foundations.md` by hand is lost work.

## The token workbench (DS → product)

A local-only write path: change one *existing* token value, rebuild `tokens.css`
through the committed generator, and hand the new stylesheet back so a client can
hot-swap it. It is the only thing that ever writes `tokens.json`, it is off by
default, and it does not exist in production.

```bash
DS_WORKBENCH=1 node scripts/relay.mjs     # the usual relay, workbench enabled
DS_WORKBENCH=1 npm run relay              # equivalent
npm run ds:workbench                      # same thing
```

Startup prints the exact state — `ENABLED` with the listen address, or
`DISABLED (<reason>)`. When it is disabled every `/__ds/*` path answers 404, and
the image relay and static serving behave byte-for-byte as they do without it.

| Route | Response |
|---|---|
| `GET /__ds/status` | `{enabled, revision, tokensCssSha, tokenCount}` |
| `GET /__ds/token?key=color.pitch.accent` | `{key, value, type, group}` |
| `POST /__ds/token` body `{key, value}` | `{ok, key, value, previous, sha256, css, revision, type, group, changed}` |

`sha256` is the sha256 of the returned `css` (the new `tokens.css` bytes);
`revision` is the sha256 of `tokens.json`. Errors are `{error: {code, message}}`
with no stack trace: 400 malformed request, 403 (non-loopback address or `Host`,
foreign `Origin`, missing `x-ds-workbench: 1`, wrong content type, wrong write
token, `themes` path), 404 unknown key, 405 wrong method, 413 body over 4 KB, 422
type or alias validation, 429 a write inside the 250 ms window, 500
`build-failed` after rollback. Every `/__ds` call needs `x-ds-workbench: 1`; a
write also needs `content-type: application/json`.

**The UI.** `design-system/gallery-workbench.{js,css}` is the client for that
backend. It hydrates every `[data-token]` row the gallery renders: each row's
`[data-token-value]` becomes a `role="button"` stop, focusing or activating it
opens an inline textbox (Enter saves, Esc cancels, a changed value commits on
blur), and a successful save reloads the `tokens.css` link with `?v=<sha256>` so
the page repaints without a reload. The undo toast lives 8 s and posts
`previous` back through the same route. `html[data-ds-workbench="live|off|
probing"]` is the page's mode flag. When `/__ds/status` is not a `200`, the rows
stay read-only and activating one offers the copied CLI command — the same
fallback as the commands below. The gallery loads the UI; this repo documents it,
it is not itself a product surface.

**What is mutable.** The *value* of a key that already exists — nothing else. No
new keys, no deletions, no writes into `themes` (that tree is the role contract,
not tokens), no direct writes to `tokens.css`. Values are re-validated per type
(`color`, `dimension`, `fontSize`, `fontWeight`, `number`, `duration`,
`cubicBezier`, `shadow`, `fontFamily` — the validators live in
`scripts/lib/token-write.mjs`) inside the injection-safe charset: semicolons,
braces, angle brackets, backslashes, newlines, `url(`, `expression(`,
`javascript:`, `@import` and comment markers are rejected, and a value is capped
at 160 characters. `var(--alias)` is accepted
only where the key already aliased, only when the target exists, and never when
it would close a cycle. The write is a temp file plus rename in the same
directory, then `node scripts/build-tokens.mjs`; if the build fails the previous
bytes are restored exactly and the call returns 500 with the generator's stderr.

**Undo.** `previous` from the response is the whole mechanism: post it back as
`{key, value: previous}` and the same validator, writer and rebuild run in
reverse. The gallery renders that as an Undo affordance; nothing is special-cased
server-side.

**Security posture.** Localhost only, in layers: the route exists only when
`DS_WORKBENCH=1`, only when the server bound to a loopback address, and each
request is refused unless `remoteAddress` is loopback, `Host` is
`127.0.0.1`/`localhost`/`[::1]` on the serving port, and `Origin` is absent or
one of those origins. `x-ds-workbench: 1` is a custom header, so any cross-origin
caller must pass a preflight this server never grants. `DS_WORKBENCH_TOKEN=1`
requires a per-process write token, printed once at startup (or set it to your
own value); without it no token is required. Writes are serialised per process
and throttled to one per 250 ms. The endpoint is never deployed: Vercel serves
the static tree and `scripts/` is not a function.

**CLI fallback.** The same library is a command, for when the server is off —
this is what the gallery prints:

```bash
node scripts/ds-set-token.mjs --list
node scripts/ds-set-token.mjs --get color.pitch.accent
node scripts/ds-set-token.mjs color.pitch.accent '#B9A176'
node scripts/ds-set-token.mjs --undo color.pitch.accent '#C8B28A'
```

A successful set prints the new `tokens.css` sha256, the `tokens.json` revision
and the exact revert command. Exit 0 applied, 1 rejected or failed, 2 bad usage.

## The usage index (product → DS)

`design-system/usage.json` is the machine-readable answer to "who consumes this
token, where is this component rendered", and
[`design-system/usage.md`](usage.md) is its generated summary. Both come from
`scripts/build-usage.mjs`, reading `design-system/surfaces.json` and the pages
and stylesheets it names; neither file is hand-edited.

- **Quarantine.** The gallery is a surface with `docsOnly: true`. Its refs are
  counted in a separate bucket and never in `productRefCount`, and a stylesheet
  only the gallery loads follows the same rule. A swatch proves a token renders;
  it does not prove a product uses it — the same rule as `lint-tokens` T8, so
  the two gates cannot disagree about a token with zero product consumers.
- **Committed HEAD.** Scanned sources are read with `git show HEAD:<path>`, as
  `build-foundations.mjs` does for its consumer pages: a page another lane is
  mid-edit on cannot drift the index, and the artifact describes the commit CI
  checks out. Commit the page or stylesheet change, then regenerate.
- **Stable shape.** A ref is `{file, count}`; no line numbers or timestamps are
  stored, so ordinary edits do not churn the file. `--lines` prints the
  `file:line` drill-down to stdout for debugging.

```bash
node scripts/build-usage.mjs          # regenerate usage.json + usage.md
node scripts/build-usage.mjs --check  # CI: exit 1 with a diff summary when stale
node scripts/build-usage.mjs --lines --component=ds-btn
node scripts/build-usage.mjs --worktree   # index uncommitted worktree state
```

A stale index blocks the `static-docs` job in `.github/workflows/ds-gate.yml`.

## How a page consumes it

Each page links `design-system/tokens.css`, then re-points short local names in
its own `:root` at canonical tokens; deeper rules consume the local names. Names
are mechanical: lowercase, dots → dashes, `--` prefix.

```css
/* pitch.html:11 */
--bg:var(--color-pitch-bg);--accent:var(--color-pitch-accent);
```

`data-ds-theme="pitch|wiki-light|wiki-dark|engine"` declares the same 14 role
slots (17 vars), with explicit nulls where a surface has no value. Which surface
sets that attribute — and which one does not — is in [surfaces.md](surfaces.md).

### The pitch shell

A page that should read as the pitch page does not copy pitch.html's styles. It
opts in and links the shell last:

```html
<html lang="en" data-ds-shell="pitch" data-ds-theme="pitch">
...
<link rel="stylesheet" href="design-system/pitch-shell.css">
```

The shell owns the mapping only — roles, chrome aliases, body type, heading
voice, `::selection`, focus colour. It declares no layout, no size and no new
value: the pitch surface ladder, cream ink and champagne accent are the same
tokens `pitch.html` consumes. `index.html` is the reference adopter; a page that
keeps its own IA keeps its own density.

## Rules

- No raw hex, `rgb()` or `rgba()` outside `tokens.css`. The one legal literal is a `var()` fallback.
- No raw duration, `cubic-bezier()`, `z-index` or `border-radius` (including bare `0`); use the token.
- Media-query breakpoints stay in raw px — `var()` is invalid in `@media`. Documented exception, checked by T6.
- Every interactive element needs the `:focus-visible` pair: `outline:var(--focus-width) solid …` plus `outline-offset:var(--focus-offset)`.
- When a value is within 1px of a token step, use the token, not the nearest literal.
- To add a value: edit `tokens.json`, run both generators, consume the `var(--…)`, and name the change class from [governance.md](governance.md).
- A page change is not done until all twelve checks are green — [verification.md](verification.md) says what each proves.
- A reference never enters through a page: it enters as an intake record and lands as a theme-map diff or a component variant ([references/README.md](references/README.md)).
