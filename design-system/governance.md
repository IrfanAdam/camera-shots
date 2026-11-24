# Governance — six change classes, semver, deprecation, review

Scope: one maintainer, four static pages, one token contract. This is the
smallest process that would have caught the 20 stale claims the audit found
(plan D7 option B) — not a committee.

## Six change classes

Every design-system commit names exactly one class in its subject. The class
decides the semver bump and the evidence the commit must carry.

| Class | Subject form | What it is | Semver | Evidence required |
|---|---|---|---|---|
| 1 · `token:add` | `token:add ds-separator rule pair` | a new key in `tokens.json` **and** a consumer, or the key is dead weight | MINOR | regenerated `tokens.css` + `foundations.md`, the consuming `file:line`, gate tail |
| 2 · `token:value` | `token:value pitch rule +1.5:1` | an existing key changes value | PATCH if no rendered pixel moves; MINOR if one does | before/after contrast row or pixel delta, regenerated CSS |
| 3 · `token:rename` | `token:rename pro→engine tracks` | a key's name changes | **MAJOR** — a `var()` stops resolving | one-release alias in `DEPRECATIONS.md`, every cite grepped, U1 clean |
| 4 · `token:remove` | `token:remove 14 dead keys` | a key leaves the contract | **MAJOR** | `DEPRECATIONS.md` row, `grep` proving 0 refs, expected-leaf count updated |
| 5 · `component` | `component ds-tabbar mobile nav` | shared layer gains or changes a block (`base.css`, `components.css`, `components.js`, `icons.svg`) | MINOR additively; **MAJOR** for an API break (`data-*` renamed, markup shape changed) | spec in `components.md`, gallery frame in all four theme cells, a real consumer, C1–C6 clean |
| 6 · `docs` | `docs(ds): …` | prose, indexes, intake records — no value, no selector | PATCH | `check-doc-counts` + `check-anchors` exit 0; every measured claim cites a command or `file:line` |

`fix`, `chore` and `refactor` are **modifiers, not classes**: they may prefix any
of the six when the change is corrective, but they never decide a version bump on
their own. A commit that changes a token value *and* fixes a page is still
`token:value` with a `fix` note.

The plan reference rides in the subject:
`docs(ds): complete docs IA and reference intake [plan:.hermes/plans/2026-11-24_011239-ds-one-language-every-page.md#phase-5]`.

## Semver

The contract is `ds-v<major>.<minor>.<patch>`, tagged on `main`.
**Current state: pre-1.0, no tag** (`git tag -l` is empty); `ds-v1.0.0` lands with
Phase 6 Task 38.

| Bump | Means | Examples |
|---|---|---|
| MAJOR | a name or a shape stops resolving | token rename/removal, `.ds-*` class renamed, role slot removed from a theme map |
| MINOR | new capability, no consumer breaks | new key with a consumer, new component or variant, new theme map, value change that moves pixels |
| PATCH | no visual or API change | doc corrections, generated-file refresh, a value fix that is pixel-identical |

Pre-1.0, MAJOR stays `0.x` — a rename is still a MAJOR *intent* recorded in the
changelog, even while the tag is `0.x`.

## Deprecation

**Deprecate one release, remove the next.** `design-system/DEPRECATIONS.md` is
the memory; the gate is the enforcement.

1. A retired name is re-pointed as a `var()` alias to its replacement, listed in
   `DEPRECATIONS.md` with the release it dies in.
2. Consumers keep working; `U1` stays clean because the alias still resolves.
3. The following release deletes the alias and the row, and the removal is a
   `token:remove` MAJOR-class commit.
4. An exemption may not keep a deprecated token alive. If a `lint-allow` marker
   exists only to preserve a deprecated name, the marker is the bug.

The current alias tier is listed in `DEPRECATIONS.md` §"Alias tier still live
(one release)" — six keys plus `focus.color`, which is a role pointer rather than
an alias.

## Review

A solo repo still reviews itself, in this order:

1. **One owner per file, per change.** Two lanes never write one file. A file with
   uncommitted changes you did not make is a **foreign editor**, not a merge
   conflict: stop touching it, do not stage it, and say so in the report. Today
   `pitch.html` (drawer-v4) and `engine.html` (`#genImgBtn`) are in that state —
   see [surfaces.md](surfaces.md#blocked).
2. **Forward-only history.** Commit forward; never `--amend`, `reset` or replay a
   sibling's commit. Add files by explicit path — `git add .` stages a foreign
   lane's work.
3. **Gate before commit, all nine.** `PASS` on the changed tree, not on the tree
   you remember. If a gate fails, fix forward.
4. **Regenerate in the right order.** A page commits first; the generated doc
   commits second. Generated doc consumers are counted from committed `HEAD`,
   not the worktree, so the reverse order writes a doc CI will reject.
5. **Declare the delta.** A visual change ships with 1440/390 artifacts per
   surface and every scheme the surface supports. A green gate is not a rendered
   verdict.
6. **Evidence in the message body**, not a summary: the gate tail, the contrast
   row or the screenshot paths. See [verification.md](verification.md#pr-evidence).

## References

A reference never enters through a page. It enters as an intake record in
`design-system/references/`, and it lands as a **theme-map diff or a component
variant** — never page-specific CSS. Protocol:
[references/README.md](references/README.md). Decisions that constrain intake:
[decisions.md](decisions.md).
