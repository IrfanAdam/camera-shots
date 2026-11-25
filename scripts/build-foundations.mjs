#!/usr/bin/env node
/**
 * build-foundations.mjs — render design-system/foundations.md from the token set.
 *
 * Reads  design-system/tokens.json   (values, types, role contract)
 *        design-system/tokens.css    (what a browser actually receives)
 *        index.html pitch.html engine.html  (product-page consumers)
 *        design-system/index.html     (gallery swatches)
 * Writes design-system/foundations.md
 *
 * Deterministic and idempotent: no timestamps, groups and keys sorted, role
 * slots and theme maps in contract order. Running twice yields identical bytes.
 *
 * Consumer counts are pinned to committed HEAD: the four consumer files are
 * read with `git show HEAD:<path>`, never from the worktree, and tokens.json /
 * tokens.css are read from the worktree so a token edit still regenerates the
 * doc before it is committed. A page that is mid-edit therefore cannot drift
 * this file — commit the page change, then regenerate. When git is unavailable
 * (an exported tree, e.g. `git archive`) or a consumer file is untracked, that
 * file is read from disk instead.
 *
 * The doc states nothing it does not read. Before a byte is written:
 *   - every leaf of tokens.json becomes exactly one table row (188 keys, 20
 *     groups at the time of writing, both counted, never typed);
 *   - all 188 `:root` custom properties in tokens.css carry the tokens.json
 *     value for that key;
 *   - every `[data-ds-theme="…"]` block declares exactly the non-null cells of
 *     its map, with the same var names and values, and the fall-through block
 *     declares exactly the union of null slots.
 * A stale tokens.css therefore fails the generator instead of producing a doc
 * that quietly disagrees with the sheet the pages load.
 *
 * Usage:
 *   node scripts/build-foundations.mjs            # render + write foundations.md
 *   node scripts/build-foundations.mjs --check    # render, diff, never write
 *
 * Exit codes: 0 ok, 1 out of date / inconsistent source, 2 bad usage.
 */

import { readFileSync, writeFileSync, existsSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const TOKENS_JSON = 'design-system/tokens.json';
const TOKENS_CSS = 'design-system/tokens.css';
const OUT = 'design-system/foundations.md';
const PRODUCT_FILES = ['index.html', 'pitch.html', 'engine.html'];
const GALLERY = 'design-system/index.html';

const rel = (p) => relative(ROOT, p) || p;

function read(relPath, { optional = false } = {}) {
  const abs = resolve(ROOT, relPath);
  try {
    return readFileSync(abs, 'utf8');
  } catch (err) {
    if (optional) return null;
    console.error(`FAIL: cannot read ${relPath} — ${err.message}`);
    process.exit(1);
  }
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Committed-HEAD reads for consumer pages
// ---------------------------------------------------------------------------

/**
 * `git rev-parse --show-toplevel` from ROOT, or null when this tree is not a
 * git checkout (an exported archive, a copied directory). ROOT may sit below
 * the toplevel, so its repo-relative prefix is carried along for path lookups.
 */
function gitTopLevel() {
  const run = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: ROOT, encoding: 'utf8' });
  if (run.status !== 0) return null;
  const top = run.stdout.trim();
  if (!top) return null;
  const real = (p) => {
    try { return realpathSync(p); } catch { return resolve(p); }
  };
  const relFromTop = relative(real(top), real(ROOT));
  if (relFromTop.startsWith('..')) return null; // a repo that does not contain ROOT
  return { top, prefix: relFromTop ? relFromTop.split(sep).join('/') : '' };
}

const GIT = gitTopLevel();

/** Tracked at HEAD? (`ls-files` succeeds only for a path in the index.) */
function trackedAtHead(repoPath) {
  const run = spawnSync('git', ['ls-files', '--error-unmatch', '--', repoPath], {
    cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
  return run.status === 0;
}

let headReads = 0;
let diskReads = 0;

/**
 * Read a consumer file as committed at HEAD. Worktree edits are ignored by
 * design: a generated doc must not bake a neighbour's uncommitted page. Falls
 * back to the worktree when git is unavailable or the path is untracked.
 */
function readCommitted(relPath, { optional = false } = {}) {
  if (GIT) {
    const repoPath = GIT.prefix ? `${GIT.prefix}/${relPath}` : relPath;
    if (trackedAtHead(repoPath)) {
      const run = spawnSync('git', ['show', `HEAD:${repoPath}`], {
        cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      if (run.status === 0) {
        headReads += 1;
        return run.stdout;
      }
    }
  }
  const text = read(relPath, { optional });
  if (text !== null) diskReads += 1;
  return text;
}

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
let check = false;
for (const arg of argv) {
  if (arg === '--check') check = true;
  else if (arg === '-h' || arg === '--help') {
    console.log('Usage: node scripts/build-foundations.mjs [--check]');
    process.exit(0);
  } else {
    console.error(`FAIL: unknown argument "${arg}"`);
    console.error('Usage: node scripts/build-foundations.mjs [--check]');
    process.exit(2);
  }
}

// ---------------------------------------------------------------------------
// Token set
// ---------------------------------------------------------------------------

/** dotted token key -> emitted custom property name (no leading --), as build-tokens.mjs */
function cssName(dotted) {
  return String(dotted)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
    .replace(/\./g, '-');
}

/** Flatten the token map exactly as the generator does: a node with `value` is a leaf. */
function flatten(node, path, out) {
  if (node === null || typeof node !== 'object' || Array.isArray(node)) return out;
  if (Object.prototype.hasOwnProperty.call(node, 'value')) {
    out.push({ key: path.flatMap((part) => String(part).split('.')).join('.'), type: String(node.type ?? ''), value: String(node.value ?? '') });
    return out;
  }
  for (const [key, child] of Object.entries(node)) {
    flatten(child, [...path, key], out);
  }
  return out;
}

let parsed;
try {
  parsed = JSON.parse(read(TOKENS_JSON));
} catch (err) {
  fail(`${TOKENS_JSON} is not valid JSON — ${err.message}`);
}

const { themes, ...tokenMap } = parsed;
if (!themes) fail(`${TOKENS_JSON} has no \`themes\` role contract — cannot render the theme section`);

const leaves = flatten(tokenMap, [], []).sort((a, b) => a.key.localeCompare(b.key, 'en'));
if (leaves.length === 0) fail(`${TOKENS_JSON} contains no tokens`);

const byKey = new Map();
for (const leaf of leaves) {
  if (byKey.has(leaf.key)) fail(`duplicate key "${leaf.key}" in ${TOKENS_JSON}`);
  leaf.css = `--${cssName(leaf.key)}`;
  byKey.set(leaf.key, leaf);
}

const THEME_NAMES = ['pitch', 'wiki-light', 'wiki-dark', 'engine'];
const THEME_SLOTS = [
  'bg.page', 'bg.surface', 'bg.surface.alt', 'bg.control', 'bg.accent.soft',
  'fg.primary', 'fg.secondary', 'fg.muted', 'fg.faint', 'fg.on.accent',
  'line.default', 'line.strong', 'accent', 'status',
];
const STATUS_KEYS = ['success', 'warning', 'danger', 'info'];
const ATTRIBUTE = 'data-ds-theme';

if (!themes.maps || Object.keys(themes.maps).join('|') !== THEME_NAMES.join('|')) {
  fail(`themes.maps must be exactly ${THEME_NAMES.join(', ')} in order (got ${Object.keys(themes.maps || {}).join(', ')})`);
}
if (!Array.isArray(themes.slots) || themes.slots.join('|') !== THEME_SLOTS.join('|')) {
  fail('themes.slots must be the 14 locked slots in contract order');
}

/** role var list in contract order: 14 slots expanding to 17 vars */
function roleVars() {
  const out = [];
  for (const slot of THEME_SLOTS) {
    if (slot === 'status') for (const name of STATUS_KEYS) out.push({ slot: `status.${name}`, varName: themes.roleVars.status[name] });
    else out.push({ slot, varName: themes.roleVars[slot] });
  }
  return out;
}
const ROLE_VARS = roleVars();
if (ROLE_VARS.length !== 17) fail(`role contract emits ${ROLE_VARS.length} vars, expected 17`);

const SLOT_LABEL = {
  'bg.page': 'bg.page', 'bg.surface': 'bg.surface', 'bg.surface.alt': 'bg.surface.alt',
  'bg.control': 'bg.control', 'bg.accent.soft': 'bg.accent.soft',
  'fg.primary': 'fg.primary', 'fg.secondary': 'fg.secondary', 'fg.muted': 'fg.muted',
  'fg.faint': 'fg.faint', 'fg.on.accent': 'fg.on.accent',
  'line.default': 'line.default', 'line.strong': 'line.strong', 'accent': 'accent',
};

/** map[theme][slot] -> cell (string | null | status object) */
const cellOf = (theme, slot) => themes.maps[theme][slot];

const nullsOf = (theme) => THEME_SLOTS.filter((slot) => slot !== 'status' && cellOf(theme, slot) === null);
const nullCounts = Object.fromEntries(THEME_NAMES.map((theme) => [theme, nullsOf(theme).length]));
const nullUnion = [...new Set(THEME_NAMES.flatMap((theme) => nullsOf(theme)))].sort();

// ---------------------------------------------------------------------------
// Consumer counting
// ---------------------------------------------------------------------------

const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Consumer count = product-page references + theme-map cells + gallery swatches.
 *
 * product  `var(--k)` occurrences in index.html, pitch.html, engine.html, plus
 *          the canvas string lookups `CT('--k')` / `WA('--k', …)` in those files
 *          (a var() scan cannot see a string argument).
 * theme    one per theme-map cell whose value is `var(--k)` — the role contract
 *          is why a primitive exists even when no page names it.
 * gallery  one per `.sw` swatch row in design-system/index.html naming `--k`.
 *
 * Every consumer file is read as committed at HEAD (see readCommitted), so the
 * worktree cannot move these numbers; tokens.json and tokens.css still come
 * from disk, so a token edit regenerates here before it is committed.
 *
 * This is a count of occurrences, not the gate's T8 presence test: T8 asks only
 * whether any of product/theme/`components.css` names a token and excludes the
 * gallery, so a key can be T8-unconsumed and still count here.
 */
const productFiles = PRODUCT_FILES.map((file) => ({ file, text: readCommitted(file) }));

function productCounts() {
  const varCounts = new Map();
  const strCounts = new Map();
  for (const { text } of productFiles) {
    for (const leaf of leaves) {
      const name = leaf.css.slice(2);
      const varRe = new RegExp(`var\\(\\s*--${escapeRe(name)}(?=[\\s,)])`, 'g');
      const strRe = new RegExp(`(?:CT|WA)\\(\\s*['"]--${escapeRe(name)}['"]`, 'g');
      const varHits = (text.match(varRe) || []).length;
      const strHits = (text.match(strRe) || []).length;
      if (varHits) varCounts.set(leaf.key, (varCounts.get(leaf.key) ?? 0) + varHits);
      if (strHits) strCounts.set(leaf.key, (strCounts.get(leaf.key) ?? 0) + strHits);
    }
  }
  return { varCounts, strCounts };
}

const keyByCss = new Map(leaves.map((leaf) => [leaf.css, leaf.key]));

const themeCounts = new Map();
for (const theme of THEME_NAMES) {
  for (const slot of THEME_SLOTS) {
    const cellValue = cellOf(theme, slot);
    const values = slot === 'status' ? Object.values(cellValue ?? {}) : [cellValue];
    for (const value of values) {
      const match = typeof value === 'string' && value.match(/^var\((--[a-z0-9-]+)\)$/);
      if (!match) continue; // a dead cell is caught by the tokens.css parity assertion below
      const key = keyByCss.get(match[1]);
      if (!key) continue;
      themeCounts.set(key, (themeCounts.get(key) ?? 0) + 1);
    }
  }
}

function galleryCounts() {
  const counts = new Map();
  const html = readCommitted(GALLERY, { optional: true });
  if (!html) return counts;
  for (const line of html.split('\n')) {
    if (!/class="sw"/.test(line)) continue;
    const seen = new Set();
    for (const match of line.matchAll(/var\((--[a-z0-9-]+)\)/g)) seen.add(match[1]);
    for (const match of line.matchAll(/<code>(--[a-z0-9-]+)<\/code>/g)) seen.add(match[1]);
    for (const name of seen) {
      const key = keyByCss.get(name);
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

const { varCounts: productVarRefs, strCounts: productStrRefs } = productCounts();
const galleryRefs = galleryCounts();
const consumers = new Map();
for (const leaf of leaves) {
  const product = (productVarRefs.get(leaf.key) ?? 0) + (productStrRefs.get(leaf.key) ?? 0);
  const theme = themeCounts.get(leaf.key) ?? 0;
  const gallery = galleryRefs.get(leaf.key) ?? 0;
  consumers.set(leaf.key, { total: product + theme + gallery, product, theme, gallery });
}

/* T8's narrower scope, reproduced so the doc can name the gate's orphans: a
   `var()` reference from a product page, a theme cell, or components.css;
   gallery excluded; aliases (`value: var(--other)`) and breakpoint.* exempt. */
const componentsCss = readCommitted('design-system/components.css', { optional: true }) ?? '';
const componentRefs = new Set([...componentsCss.matchAll(/var\(\s*(--[a-z0-9-]+)/g)].map((match) => match[1]));
const gateOrphans = leaves.filter((leaf) => {
  if (/^var\(/.test(leaf.value.trim())) return false; // alias: the pointer is its own consumer
  if (leaf.key.startsWith('breakpoint.')) return false; // var() is invalid in @media
  return (productVarRefs.get(leaf.key) ?? 0) === 0
    && (themeCounts.get(leaf.key) ?? 0) === 0
    && !componentRefs.has(leaf.css);
});

/** key -> [{ theme, slot }] so the doc can name the semantic job a key does. */
const roleOf = new Map();
for (const theme of THEME_NAMES) {
  for (const slot of THEME_SLOTS) {
    const cell = cellOf(theme, slot);
    const labels = slot === 'status'
      ? STATUS_KEYS.map((name) => [`status.${name}`, cell?.[name]])
      : [[slot, cell]];
    for (const [label, value] of labels) {
      const match = typeof value === 'string' && value.match(/^var\((--[a-z0-9-]+)\)$/);
      if (!match) continue;
      const key = keyByCss.get(match[1]);
      if (!key) continue;
      if (!roleOf.has(key)) roleOf.set(key, []);
      roleOf.get(key).push({ theme, slot: label });
    }
  }
}

// ---------------------------------------------------------------------------
// tokens.css parity — the doc must describe the sheet the pages load
// ---------------------------------------------------------------------------

const cssText = read(TOKENS_CSS);

function rootBody(text) {
  const at = text.indexOf(':root');
  if (at === -1) fail(`${TOKENS_CSS} has no :root block`);
  const open = text.indexOf('{', at);
  const close = text.indexOf('\n}', open);
  if (open === -1 || close === -1) fail(`${TOKENS_CSS} :root block is unterminated`);
  return text.slice(open + 1, close);
}

const declared = new Map();
for (const match of rootBody(cssText).matchAll(/^\s*(--[a-z0-9-]+)\s*:\s*(.+?);\s*$/gm)) {
  declared.set(match[1], match[2]);
}
if (declared.size !== leaves.length) {
  fail(`${TOKENS_CSS} :root declares ${declared.size} properties, ${TOKENS_JSON} has ${leaves.length} keys — regenerate tokens.css`);
}
for (const leaf of leaves) {
  if (!declared.has(leaf.css)) fail(`${TOKENS_CSS} :root is missing ${leaf.css} (${leaf.key})`);
  if (declared.get(leaf.css) !== leaf.value) {
    fail(`${TOKENS_CSS} ${leaf.css} = "${declared.get(leaf.css)}" but ${TOKENS_JSON} says "${leaf.value}" — regenerate tokens.css`);
  }
}

/** `[data-ds-theme="x"] { … }` -> Map(var -> value), comments stripped. */
function themeBlock(css, selector) {
  const at = css.indexOf(`${selector} {`);
  if (at === -1) fail(`${TOKENS_CSS} is missing the ${selector} block — regenerate tokens.css`);
  const open = css.indexOf('{', at);
  const close = css.indexOf('\n}', open);
  if (close === -1) fail(`${TOKENS_CSS} ${selector} block is unterminated`);
  const body = css.slice(open + 1, close).replace(/\/\*[\s\S]*?\*\//g, '');
  const out = new Map();
  for (const match of body.matchAll(/^\s*(--ds-[a-z0-9-]+)\s*:\s*(.+?);\s*$/gm)) out.set(match[1], match[2]);
  return out;
}

const fallBlock = themeBlock(cssText, `[${ATTRIBUTE}]`);
const fallExpected = new Map(nullUnion.map((slot) => [themes.roleVars[slot], themes.fallthrough[slot]]));
for (const [varName, value] of fallExpected) {
  if (fallBlock.get(varName) !== value) {
    fail(`${TOKENS_CSS} fall-through ${varName} = "${fallBlock.get(varName)}" but tokens.json declares "${value}" — regenerate tokens.css`);
  }
}
if (fallBlock.size !== fallExpected.size) {
  fail(`${TOKENS_CSS} fall-through declares ${fallBlock.size} vars, tokens.json expects ${fallExpected.size}`);
}

for (const theme of THEME_NAMES) {
  const block = themeBlock(cssText, `[${ATTRIBUTE}="${theme}"]`);
  let expectedCount = 0;
  for (const { slot, varName } of ROLE_VARS) {
    const value = slot.startsWith('status.')
      ? cellOf(theme, 'status')[slot.slice('status.'.length)]
      : cellOf(theme, slot);
    if (value === null || value === undefined) continue;
    expectedCount += 1;
    if (block.get(varName) !== value) {
      fail(`${TOKENS_CSS} ${theme} ${varName} = "${block.get(varName)}" but tokens.json declares "${value}" — regenerate tokens.css`);
    }
  }
  if (block.size !== expectedCount) {
    fail(`${TOKENS_CSS} theme "${theme}" declares ${block.size} role vars, tokens.json has ${expectedCount} non-null cells — regenerate tokens.css`);
  }
}

// ---------------------------------------------------------------------------
// Type scale
// ---------------------------------------------------------------------------

/**
 * Documented size -> line-height pairing. Every `typography.size.*` key must be
 * listed: a new size cannot ship without a stated leading, which is the whole
 * point of generating this table. Values are read from tokens.json, never typed.
 */
const TYPE_PAIRS = [
  ['typography.size.display', 'line-height.display'],
  ['typography.size.h1', 'line-height.tight'],
  ['typography.size.h2', 'line-height.tight'],
  ['typography.size.h3', 'line-height.tight'],
  ['typography.size.lede', 'line-height.relaxed'],
  ['typography.size.ui', 'line-height.normal'],
  ['typography.size.body', 'line-height.relaxed'],
  ['typography.size.small', 'line-height.normal'],
  ['typography.size.meta', 'line-height.normal'],
  ['typography.size.eyebrow', 'line-height.normal'],
  ['typography.size.timecode', 'line-height.normal'],
];

const sizeKeys = leaves.filter((leaf) => leaf.key.startsWith('typography.size.')).map((leaf) => leaf.key);
for (const key of sizeKeys) {
  if (!TYPE_PAIRS.some(([size]) => size === key)) fail(`type scale: "${key}" has no line-height pairing — add it to TYPE_PAIRS`);
}
for (const [size, lh] of TYPE_PAIRS) {
  if (!byKey.has(size)) fail(`type scale: "${size}" does not exist in ${TOKENS_JSON}`);
  if (!byKey.has(lh)) fail(`type scale: "${lh}" does not exist in ${TOKENS_JSON}`);
}

/** rem -> px at the 16px root, so a reader sees what ships. */
function pxOf(value) {
  const rem = String(value).match(/^(-?\d*\.?\d+)rem$/);
  if (rem) return `${Number((Number(rem[1]) * 16).toFixed(3))}px`;
  return null;
}

// ---------------------------------------------------------------------------
// Markdown
// ---------------------------------------------------------------------------

const cell = (text) => String(text).replace(/\|/g, '\\|');
const code = (text) => `\`${cell(text)}\``;

const groups = new Map();
for (const leaf of leaves) {
  const group = leaf.key.split('.')[0];
  if (!groups.has(group)) groups.set(group, []);
  groups.get(group).push(leaf);
}
const groupNames = [...groups.keys()].sort((a, b) => a.localeCompare(b, 'en'));

const zeroConsumer = leaves.filter((leaf) => consumers.get(leaf.key).total === 0);
const totalConsumers = leaves.reduce((sum, leaf) => sum + consumers.get(leaf.key).total, 0);

const lines = [];
lines.push('# Foundations');
lines.push('');
lines.push('> GENERATED — do not hand-edit · regenerate: `node scripts/build-foundations.mjs`');
lines.push('');
lines.push('Consumer counts are pinned to the committed `HEAD` blobs of the consumer files — the three product pages, the gallery, and `components.css` for the T8 view — never the dirty worktree, so a page mid-edit cannot drift this file. **Commit page changes before regenerating.** Token values still come from the worktree files, so a `tokens.json` edit regenerates here before it is committed.');
lines.push('');
lines.push(`The token set as shipped: **${leaves.length} keys · ${groupNames.length} groups**, rendered into \`${TOKENS_CSS}\` with **${THEME_NAMES.length} theme maps** behind the \`${ATTRIBUTE}\` attribute, **${THEME_SLOTS.length} role slots** expanding to **${ROLE_VARS.length} role vars**.`);
lines.push('');
lines.push(`Read order: [README](README.md) → this file → [components](components.md) → [patterns](patterns.md). Values are read from \`${TOKENS_JSON}\`; the theme and type sections are asserted against \`${TOKENS_CSS}\` before this file is written, so a stale sheet fails the generator instead of being documented.`);
lines.push('');
lines.push('## How to read the tables');
lines.push('');
lines.push('| Column | Meaning |');
lines.push('|---|---|');
lines.push('| Key | Dotted token name in `tokens.json`. The emitted custom property is the same path lowercased with `.` → `-`, e.g. `color.pitch.bg` → `--color-pitch-bg`. |');
lines.push('| Value | The literal the generator emits into `:root`. A `var(--…)` value is a one-release alias: it resolves through its target. |');
lines.push('| Type | The declared token type the generator validates the value against. |');
lines.push('| Role | The theme slot(s) whose map cell points at this key — the semantic job it does. `—` means no theme names it. A trailing `alias → --target` marks a pointer. |');
lines.push('| Consumers | Occurrence count, defined below. Zero is printed as `0`, not hidden. |');
lines.push('');
lines.push('**Consumer count** = product-page references + theme-map cells + gallery swatches:');
lines.push('');
lines.push('1. **Product** — occurrences of `var(--k)` in `index.html`, `pitch.html` and `engine.html`, plus the canvas string lookups `CT(\'--k\')` / `WA(\'--k\', …)` in those files. A `var()` scan cannot see a string argument, so both forms count.');
lines.push('2. **Theme** — one per theme-map cell in `tokens.json` whose value is `var(--k)`. The role contract is why a primitive exists even when no page names it directly.');
lines.push(`3. **Gallery** — one per \`.sw\` swatch row in \`${GALLERY}\` naming \`--k\`. The gallery proves a token renders; it is not product usage.`);
lines.push('');
lines.push('**Source:** the consumer files are read as committed at `HEAD` (`git show HEAD:<path>`), so an uncommitted page or component edit cannot move these numbers — commit the change, then regenerate. `tokens.json` and `tokens.css` are read from disk, so a token edit is reflected before it is committed. When git is unavailable (an exported tree, e.g. `git archive`) or a consumer file is untracked, that file is read from disk instead.');
lines.push('');
lines.push('It is a **count of occurrences**, not the gate\'s T8 presence test: T8 asks only whether a product page, a theme cell or `components.css` names a token at all, and excludes the gallery. So a key can be T8-unconsumed and still show a non-zero count here — read the breakdown the gate prints, not this column, when judging orphans.');
lines.push('');
lines.push(`Totals at committed HEAD: **${totalConsumers} consumer references** across ${leaves.length} keys, **${zeroConsumer.length}** key(s) with none${zeroConsumer.length ? ` (${zeroConsumer.map((leaf) => `\`${leaf.key}\``).join(', ')})` : ''}.`);
lines.push('');
lines.push(`Under the gate's narrower **T8** scope — \`var()\` in the three product pages plus theme-map cells plus \`components.css\`, gallery excluded, aliases and \`breakpoint.*\` exempt — **${gateOrphans.length}** key(s) are unconsumed: ${gateOrphans.length ? gateOrphans.map((leaf) => `\`${leaf.key}\``).join(', ') : 'none'}. Keys that differ between the two views are canvas-only (\`CT()\`/\`WA()\` strings the gate cannot see) or gallery-only consumers; \`scripts/lint-tokens.mjs\` prints the authoritative list and its budget note.`);
lines.push('');

// ---- theme contract -------------------------------------------------------

lines.push('## Theme contract');
lines.push('');
lines.push(`Themes are selected by \`${ATTRIBUTE}\` on a root element. Each map declares all ${THEME_SLOTS.length} slots; where a surface has no value the cell is an explicit \`null\` and the shared \`[${ATTRIBUTE}]\` fall-through block supplies one, so a switch never leaves a role undefined.`);
lines.push('');
lines.push('| Theme | Non-null cells | Null slots |');
lines.push('|---|---|---|');
for (const theme of THEME_NAMES) {
  const nonNull = ROLE_VARS.length - nullCounts[theme];
  const nulls = nullsOf(theme);
  lines.push(`| \`${theme}\` | ${nonNull} of ${ROLE_VARS.length} vars | ${nulls.length ? nulls.map((slot) => `\`${slot}\``).join(', ') : '—'} |`);
}
lines.push('');
lines.push(`Null cells per map: ${THEME_NAMES.map((theme) => `${theme} ${nullCounts[theme]}`).join(' · ')}. Fall-through \`[${ATTRIBUTE}]\`: ${nullUnion.map((slot) => `\`${themes.roleVars[slot]} → ${themes.fallthrough[slot]}\``).join(' · ')}.`);
lines.push('');
lines.push('| Slot | Role var | Null in |');
lines.push('|---|---|---|');
for (const slot of THEME_SLOTS) {
  const varNames = slot === 'status'
    ? STATUS_KEYS.map((name) => `\`${themes.roleVars.status[name]}\``).join(' ')
    : `\`${themes.roleVars[slot]}\``;
  const nulls = THEME_NAMES.filter((theme) => slot !== 'status' && cellOf(theme, slot) === null);
  lines.push(`| \`${slot}\` | ${varNames} | ${nulls.length ? nulls.map((theme) => `\`${theme}\``).join(', ') : '—'} |`);
}
lines.push('');
lines.push('### What flips per theme');
lines.push('');
lines.push('| Role var |' + THEME_NAMES.map((theme) => ` \`${theme}\` |`).join(''));
lines.push('|---|' + THEME_NAMES.map(() => '---|').join(''));
for (const { slot, varName } of ROLE_VARS) {
  const rendered = THEME_NAMES.map((theme) => {
    const value = slot.startsWith('status.')
      ? cellOf(theme, 'status')[slot.slice('status.'.length)]
      : cellOf(theme, slot);
    if (value === null) return `null → fall-through`;
    return code(value);
  });
  lines.push(`| \`${varName}\` | ${rendered.join(' | ')} |`);
}
lines.push('');
lines.push('The four maps are independent palettes: the same role carries a different primitive per surface (champagne for pitch, teal for wiki, warm signal for engine). Unifying a hue is a map-value change, never a page override.');
lines.push('');

// ---- type scale -----------------------------------------------------------

lines.push('## Type scale');
lines.push('');
lines.push('| Size key | Value | Computed | Line-height |');
lines.push('|---|---|---|---|');
for (const [sizeKey, lhKey] of TYPE_PAIRS) {
  const size = byKey.get(sizeKey);
  const lh = byKey.get(lhKey);
  const px = pxOf(size.value);
  lines.push(`| \`${sizeKey}\` | ${code(size.value)} | ${px ? `\`${px}\`` : 'clamp / viewport-relative'} | \`${lhKey}\` ${code(lh.value)} |`);
}
lines.push('');
const reading = byKey.get('line-height.reading');
lines.push(`\`line-height.reading\` ${reading ? `(${reading.value})` : '(missing)'} is the long-form body pairing on \`pitch.html\`; \`line-height.relaxed\` is the default body. Two families, no display face: hierarchy is size, weight and tracking only.`);
lines.push('');
const weights = leaves.filter((leaf) => leaf.key.startsWith('weight.')).sort((a, b) => Number(a.value) - Number(b.value) || a.key.localeCompare(b.key, 'en'));
const tracking = leaves.filter((leaf) => leaf.key.startsWith('tracking.')).sort((a, b) => a.key.localeCompare(b.key, 'en'));
if (weights.length) lines.push(`Weights: ${weights.map((leaf) => `\`${leaf.key}\` ${code(leaf.value)}`).join(' · ')}.`);
if (tracking.length) lines.push(`Tracking: ${tracking.map((leaf) => `\`${leaf.key}\` ${code(leaf.value)}`).join(' · ')}.`);
lines.push('');

// ---- groups ---------------------------------------------------------------

lines.push('## Groups');
lines.push('');
lines.push('| Group | Keys | With a consumer | Zero-consumer keys |');
lines.push('|---|---|---|---|');
for (const group of groupNames) {
  const keys = groups.get(group);
  const withConsumer = keys.filter((leaf) => consumers.get(leaf.key).total > 0).length;
  lines.push(`| \`${group}\` | ${keys.length} | ${withConsumer} | ${keys.length - withConsumer} |`);
}
lines.push(`| **total** | **${leaves.length}** | **${leaves.length - zeroConsumer.length}** | **${zeroConsumer.length}** |`);
lines.push('');

const renderedKeys = [];

for (const group of groupNames) {
  const keys = groups.get(group);
  lines.push(`### ${group}`);
  lines.push('');
  lines.push(`${keys.length} key${keys.length === 1 ? '' : 's'}.`);
  lines.push('');
  lines.push('| Key | Value | Type | Role | Consumers |');
  lines.push('|---|---|---|---|---|');
  for (const leaf of keys) {
    renderedKeys.push(leaf.key);
    const count = consumers.get(leaf.key);
    const roleHits = (roleOf.get(leaf.key) ?? []).map((hit) => hit.slot);
    const roleText = [...new Set(roleHits)].sort((a, b) => a.localeCompare(b, 'en')).join(', ');
    const alias = /^var\(/.test(leaf.value.trim()) ? `alias → ${leaf.value.match(/var\((--[a-z0-9-]+)\)/)?.[1] ?? leaf.value}` : '';
    const role = [roleText ? roleText : '—', alias].filter(Boolean).join(' · ');
    lines.push(`| \`${leaf.key}\` | ${code(leaf.value)} | ${leaf.type} | ${role} | ${count.total} (${count.product}/${count.theme}/${count.gallery}) |`);
  }
  lines.push('');
}

lines.push('Consumer cells read as `total (product / theme / gallery)` — the three terms of the formula above, so a zero is attributable at a glance.');
lines.push('');
lines.push(`Regenerate with \`node scripts/build-foundations.mjs\`; verify the committed file with \`--check\`. Source: [tokens.json](tokens.json).`);
lines.push('');

const markdown = `${lines.join('\n')}`;

// ---------------------------------------------------------------------------
// Self-checks on the rendered doc
// ---------------------------------------------------------------------------

{
  const seen = new Set();
  for (const key of renderedKeys) {
    if (seen.has(key)) fail(`foundations.md renders "${key}" more than once`);
    seen.add(key);
  }
  if (seen.size !== leaves.length) {
    fail(`foundations.md accounts for ${seen.size} keys, ${TOKENS_JSON} has ${leaves.length}`);
  }
  if (renderedKeys.length !== leaves.length) {
    fail(`foundations.md renders ${renderedKeys.length} table rows, expected ${leaves.length}`);
  }
  const renderedGroups = [...markdown.matchAll(/^### (.+)$/gm)]
    .map((match) => match[1].trim())
    .filter((title) => title !== 'What flips per theme');
  if (renderedGroups.join('|') !== groupNames.join('|')) {
    fail(`foundations.md group sections (${renderedGroups.join(', ')}) do not match the token groups (${groupNames.join(', ')})`);
  }
}

// ---------------------------------------------------------------------------
// Write / compare
// ---------------------------------------------------------------------------

const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

function describeDiff(expected, actual) {
  const want = expected.split('\n');
  const got = actual.split('\n');
  let first = -1;
  for (let i = 0; i < Math.max(want.length, got.length); i += 1) {
    if (want[i] !== got[i]) { first = i; break; }
  }
  return [
    `FAIL: ${OUT} is out of date (rendered ${Buffer.byteLength(expected, 'utf8')} B, on disk ${Buffer.byteLength(actual, 'utf8')} B)`,
    first === -1 ? '' : `  first diff at line ${first + 1}:`,
    first === -1 ? '' : `    expected: ${JSON.stringify(want[first] ?? '<missing>')}`,
    first === -1 ? '' : `    on disk:  ${JSON.stringify(got[first] ?? '<missing>')}`,
    `  Regenerate: node scripts/build-foundations.mjs`,
  ].filter(Boolean).join('\n');
}

const summary = [
  `Keys: ${leaves.length}; Groups: ${groupNames.length}; Themes: ${THEME_NAMES.length}; Role vars: ${ROLE_VARS.length}; Nulls: ${THEME_NAMES.map((theme) => nullCounts[theme]).join('/')}`,
  `Consumers: ${totalConsumers} references; zero-consumer keys: ${zeroConsumer.length}${zeroConsumer.length ? ` (${zeroConsumer.map((leaf) => leaf.key).join(', ')})` : ''}`,
  `Consumer files: ${headReads} from HEAD, ${diskReads} from the worktree${GIT ? '' : ' (no git checkout — exported tree)'}`,
  `Bytes: ${Buffer.byteLength(markdown, 'utf8')}; sha256: ${sha256(markdown)}`,
];

if (check) {
  const outAbs = resolve(ROOT, OUT);
  if (!existsSync(outAbs)) {
    console.error(`FAIL: ${OUT} does not exist; run node scripts/build-foundations.mjs`);
    process.exit(1);
  }
  const actual = readFileSync(outAbs, 'utf8');
  if (actual !== markdown) {
    console.error(describeDiff(markdown, actual));
    process.exit(1);
  }
  console.log(`OK: ${OUT} matches ${TOKENS_JSON} byte-for-byte`);
  for (const line of summary) console.log(line);
  process.exit(0);
}

writeFileSync(resolve(ROOT, OUT), markdown, 'utf8');
console.log(`Wrote ${OUT}`);
for (const line of summary) console.log(line);
