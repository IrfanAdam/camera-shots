#!/usr/bin/env node
/**
 * build-tokens.mjs — single source of truth for design tokens.
 *
 * Reads  design-system/tokens.json
 * Writes design-system/tokens.css
 *
 * Deterministic and idempotent: no timestamps, no randomness, no sorting by
 * anything but source order. Running twice yields byte-identical output.
 *
 * Every leaf is validated before a single byte is emitted: the declared `type`
 * must be one of TYPE_RULES and the `value` must match that type's shape. The
 * error names both the key and the offending value, so a bad token never
 * reaches the committed CSS.
 *
 * Three tiers: the token map is the primitive palette, the semantic status
 * vocabulary and the component/scale steps; the top-level `themes` object is
 * NOT a token branch — it is the role contract (14 slots -> 17 vars) mapped
 * onto the four surfaces. It is destructured before flatten() so no map cell
 * can become a phantom token, and it renders as one `[data-ds-theme]`
 * fall-through block plus one block per theme.
 *
 * Usage:
 *   node scripts/build-tokens.mjs                     # render + write tokens.css
 *   node scripts/build-tokens.mjs --check             # render, diff, never write
 *   node scripts/build-tokens.mjs --tokens <path> --check   # validate a scratch copy
 *   node scripts/build-tokens.mjs --tokens <path> --out <path>  # render a scratch copy
 *   node scripts/build-tokens.mjs --strict-types      # kept for CI compat; the legacy set is gone
 *
 * Exit codes: 0 ok, 1 invalid tokens or out-of-date CSS, 2 bad usage.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SRC = resolve(ROOT, 'design-system/tokens.json');
const OUT = resolve(ROOT, 'design-system/tokens.css');

/** Repo-relative label, or the absolute path when the file lives outside the repo. */
function rel(path) {
  const r = relative(ROOT, path);
  return !r || r.startsWith('..') ? path : r;
}

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

function usage(message) {
  if (message) console.error(`FAIL: ${message}`);
  console.error('Usage: node scripts/build-tokens.mjs [--check] [--tokens <path>] [--out <path>] [--strict-types]');
  process.exit(2);
}

function parseArgs(argv) {
  const opts = { check: false, tokens: null, out: null, strictTypes: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--check') {
      opts.check = true;
    } else if (arg === '--strict-types') {
      opts.strictTypes = true;
    } else if (arg === '--tokens' || arg === '--out') {
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) usage(`${arg} needs a path`);
      opts[arg === '--tokens' ? 'tokens' : 'out'] = resolve(process.cwd(), next);
      i += 1;
    } else if (arg === '-h' || arg === '--help') {
      usage();
    } else {
      usage(`unknown argument "${arg}"`);
    }
  }
  if (opts.tokens && !opts.check && !opts.out) {
    usage('--tokens on its own would overwrite design-system/tokens.css from an alternate source; pass --check or --out');
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
const srcPath = opts.tokens ?? SRC;
const outPath = opts.out ?? OUT;

// ---------------------------------------------------------------------------
// Type table: type -> value shape. A token that fails its own type is a hard
// error, and a type missing from this table (including the legacy "other") is
// rejected too, so an untyped token cannot slip into the generated CSS.
// ---------------------------------------------------------------------------

const NUM = String.raw`[+-]?(?:\d+\.\d+|\d+|\.\d+)`;
const LENGTH = String.raw`(?:0|${NUM}(?:px|rem|em|%|vw|vh|vmin|vmax|svh|dvh|ch|pt|ex))`;
const COLOR_VALUE = String.raw`(?:#[0-9a-f]{3,4}|#[0-9a-f]{6}|#[0-9a-f]{8}|(?:rgb|hsl)a?\([^()]*\)|transparent|currentcolor|inherit|var\(--[a-z0-9-]+\))`;
const CSS_FN = String.raw`(?:min|max|clamp|calc)\((?:[^()]|\([^()]*\))*\)`;
const VAR = String.raw`var\(--[a-z0-9-]+(?:\s*,[^)]*)?\)`;

/** Accepts "none", a `var()` alias, or 2-4 lengths with at most one `inset` and one colour. */
function isShadow(value) {
  if (/^none$/i.test(value)) return true;
  // A deprecated alias is a pointer, not a second truth: `var(--elevation-ring)`
  // is a legal shadow value before it is resolved.
  if (/^var\(--[a-z0-9-]+\)$/i.test(value.trim())) return true;
  const parts = [];
  let depth = 0;
  let current = '';
  for (const ch of value) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (/\s/.test(ch) && depth === 0) {
      if (current) parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current) parts.push(current);
  if (parts.length < 3) return false;
  const colorRe = new RegExp(`^(?:${COLOR_VALUE})$`, 'i');
  const lengthRe = new RegExp(`^${LENGTH}$`, 'i');
  let lengths = 0;
  let colors = 0;
  let insets = 0;
  for (const part of parts) {
    if (/^inset$/i.test(part)) insets += 1;
    else if (colorRe.test(part)) colors += 1;
    else if (lengthRe.test(part)) lengths += 1;
    else return false;
  }
  return insets <= 1 && colors <= 1 && lengths >= 2 && lengths <= 4
    && parts.length === lengths + colors + insets;
}

const TYPE_RULES = {
  color: new RegExp(`^(?:${COLOR_VALUE})$`, 'i'),
  dimension: new RegExp(`^(?:${LENGTH}|${CSS_FN}|${VAR})$`, 'i'),
  fontFamily: /^(?:"[^"]*"|'[^']*'|-?[A-Za-z][\w -]*|var\(--[a-z0-9-]+\))(?:\s*,\s*(?:"[^"]*"|'[^']*'|-?[A-Za-z][\w -]*|var\(--[a-z0-9-]+\)))*$/i,
  fontSize: new RegExp(`^(?:${LENGTH}|${CSS_FN}|${VAR}|smaller|larger)$`, 'i'),
  fontWeight: /^(?:[1-9]\d{0,2}|1000|normal|bold|bolder|lighter|var\(--[a-z0-9-]+\))$/i,
  duration: new RegExp(`^(?:0|${NUM}(?:s|ms)|${VAR})$`, 'i'),
  cubicBezier: new RegExp(`^(?:cubic-bezier\\(\\s*${NUM}\\s*,\\s*${NUM}\\s*,\\s*${NUM}\\s*,\\s*${NUM}\\s*\\)|ease|ease-in|ease-out|ease-in-out|linear|step-start|step-end|${VAR})$`, 'i'),
  number: new RegExp(`^(?:${NUM}|var\\(--[a-z0-9-]+\\))$`),
  shadow: { test: isShadow },
};

/** Accepted legacy spellings, mapped onto a canonical type in TYPE_RULES. */
const TYPE_ALIASES = {
  boxShadow: 'shadow',
  lineHeight: 'number',
  letterSpacing: 'dimension',
};

/**
 * The role contract lives in `themes` (sibling of the token map, never a
 * branch of it): 14 slots, 17 emitted vars, four surface maps, explicit nulls.
 * These constants are asserted, so a new theme or a new slot cannot slip in
 * without the generator and the gate agreeing.
 */
const THEME_ATTRIBUTE = 'data-ds-theme';
const THEME_NAMES = ['pitch', 'wiki-light', 'wiki-dark', 'engine'];
const THEME_SLOTS = [
  'bg.page', 'bg.surface', 'bg.surface.alt', 'bg.control', 'bg.accent.soft',
  'fg.primary', 'fg.secondary', 'fg.muted', 'fg.faint', 'fg.on.accent',
  'line.default', 'line.strong', 'accent', 'status',
];
const STATUS_KEYS = ['success', 'warning', 'danger', 'info'];
const ROLE_VAR_COUNT = 17;
/**
 * The committed token count. `themes` must never change it: a phantom
 * `--themes-pitch-bg-page` would push this over and fail the build loudly
 * instead of shipping ~70 invented properties.
 */
const EXPECTED_LEAVES = 292;

const typeLabel = (path) => path.join('.');

/**
 * Validate one leaf. Returns an error string, or null when the leaf is sound.
 * Every message carries the key and the offending value.
 */
function validateLeaf(leaf) {
  const key = typeLabel(leaf.path);
  const value = String(leaf.value).trim();
  const rawType = leaf.type;
  if (typeof rawType !== 'string' || rawType.trim() === '') {
    return `${key}: missing "type" (value "${value}")`;
  }
  const type = rawType.trim();

  const canonical = TYPE_ALIASES[type] ?? type;
  const rule = TYPE_RULES[canonical];
  if (!rule) {
    return `${key}: unknown type "${type}" (value "${value}") — expected one of ${Object.keys(TYPE_RULES).join(', ')}`;
  }
  if (!rule.test(value)) {
    return `${key}: type "${type}" does not match value "${value}"`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Flatten
// ---------------------------------------------------------------------------

/** path segments -> kebab CSS custom property name (no leading --) */
function kebab(segments) {
  return segments
    .map((seg) =>
      String(seg)
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase(),
    )
    .join('-');
}

/**
 * Flatten tokens.json into ordered leaves.
 * Handles both shapes:
 *   nested  { color: { pitch: { bg: { type, value } } } }
 *   flat    { "color.pitch.bg": { type, value } }
 * A node is a leaf when it has its own `value` key.
 */
function flatten(node, path, out, errors) {
  if (node === null || typeof node !== 'object' || Array.isArray(node)) {
    errors.push(`${path.join('.') || '<root>'}: expected an object leaf, got ${Array.isArray(node) ? 'array' : typeof node}`);
    return;
  }
  if (Object.prototype.hasOwnProperty.call(node, 'value')) {
    const { value, type } = node;
    if (typeof value !== 'string' || value.trim() === '') {
      errors.push(`${path.join('.')}: missing or empty "value"`);
      return;
    }
    // Dotted flat keys expand into segments so grouping still works.
    const segments = path.flatMap((p) => String(p).split('.'));
    out.push({ path: segments, value, type });
    return;
  }
  // Token-shaped object (has "type") without "value" is a hard error, not a branch.
  if (Object.prototype.hasOwnProperty.call(node, 'type')) {
    errors.push(`${path.join('.')}: missing "value"`);
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    flatten(child, [...path, key], out, errors);
  }
}

// ---------------------------------------------------------------------------
// Theme contract
// ---------------------------------------------------------------------------

const VAR_REF = /^var\((--[a-z0-9-]+)\)$/;

/** Every emitted role var, in slot order (status expands to 4). */
function roleVarList(themes) {
  const out = [];
  for (const slot of THEME_SLOTS) {
    if (slot === 'status') for (const key of STATUS_KEYS) out.push(themes.roleVars.status[key]);
    else out.push(themes.roleVars[slot]);
  }
  return out;
}

/**
 * Validate the role contract before it is emitted. Four maps, 14 slots each,
 * explicit nulls, and every cell a `var()` reference that resolves to a real
 * primitive — a typo in a map is a dead reference in shipped CSS, so it fails
 * here instead of painting nothing.
 */
function validateThemes(themes, tokenNames) {
  const errs = [];
  if (!themes || typeof themes !== 'object' || Array.isArray(themes)) {
    return ['themes: missing — expected { attribute, slots, roleVars, fallthrough, maps }'];
  }
  if (themes.attribute !== THEME_ATTRIBUTE) {
    errs.push(`themes.attribute: expected "${THEME_ATTRIBUTE}", got ${JSON.stringify(themes.attribute)}`);
  }

  const slots = themes.slots;
  if (!Array.isArray(slots) || slots.join('|') !== THEME_SLOTS.join('|')) {
    errs.push(`themes.slots: expected the 14 locked slots in order (${THEME_SLOTS.join(', ')})`);
  }

  const roleVars = themes.roleVars;
  if (!roleVars || typeof roleVars !== 'object') {
    errs.push('themes.roleVars: missing');
  } else {
    const keys = Object.keys(roleVars);
    if (keys.join('|') !== THEME_SLOTS.join('|')) {
      errs.push(`themes.roleVars: keys must be exactly the 14 slots, got ${keys.join(', ')}`);
    }
    for (const slot of THEME_SLOTS) {
      if (slot === 'status') {
        const st = roleVars.status;
        if (!st || Object.keys(st).join('|') !== STATUS_KEYS.join('|')) {
          errs.push(`themes.roleVars.status: expected ${STATUS_KEYS.join('/')}`);
          continue;
        }
        for (const key of STATUS_KEYS) {
          if (!/^--ds-[a-z0-9-]+$/.test(String(st[key]))) errs.push(`themes.roleVars.status.${key}: expected a --ds-* name`);
        }
      } else if (!/^--ds-[a-z0-9-]+$/.test(String(roleVars[slot]))) {
        errs.push(`themes.roleVars.${slot}: expected a --ds-* name`);
      }
    }
    const emitted = new Set(roleVarList(themes));
    if (emitted.size !== ROLE_VAR_COUNT) errs.push(`themes.roleVars: ${emitted.size} distinct vars, expected ${ROLE_VAR_COUNT}`);
  }

  const maps = themes.maps;
  if (!maps || typeof maps !== 'object' || Array.isArray(maps)) {
    errs.push('themes.maps: missing');
    return errs;
  }
  if (Object.keys(maps).join('|') !== THEME_NAMES.join('|')) {
    errs.push(`themes.maps: expected exactly ${THEME_NAMES.join(', ')} in order, got ${Object.keys(maps).join(', ')}`);
  }

  const nullUnion = new Set();
  for (const name of THEME_NAMES) {
    const map = maps[name];
    if (!map || typeof map !== 'object') {
      errs.push(`themes.maps.${name}: missing`);
      continue;
    }
    const keys = Object.keys(map);
    const missing = THEME_SLOTS.filter((s) => !keys.includes(s));
    const extra = keys.filter((k) => !THEME_SLOTS.includes(k));
    if (missing.length) errs.push(`themes.maps.${name}: missing slot(s) ${missing.join(', ')} — declare null explicitly`);
    if (extra.length) errs.push(`themes.maps.${name}: unknown slot(s) ${extra.join(', ')}`);
    for (const slot of THEME_SLOTS) {
      if (!keys.includes(slot)) continue;
      const cell = map[slot];
      if (slot === 'status') {
        if (!cell || typeof cell !== 'object') {
          errs.push(`themes.maps.${name}.status: expected { ${STATUS_KEYS.join(', ')} }`);
          continue;
        }
        const stMissing = STATUS_KEYS.filter((k) => !(k in cell));
        if (stMissing.length) errs.push(`themes.maps.${name}.status: missing ${stMissing.join(', ')}`);
        for (const key of STATUS_KEYS) {
          if (!(key in cell)) continue;
          const ref = cell[key];
          const m = typeof ref === 'string' && ref.match(VAR_REF);
          if (!m) errs.push(`themes.maps.${name}.status.${key}: expected var(--primitive), got ${JSON.stringify(ref)}`);
          else if (!tokenNames.has(m[1].slice(2))) errs.push(`themes.maps.${name}.status.${key}: dead reference ${ref}`);
        }
        continue;
      }
      if (cell === null) {
        nullUnion.add(slot);
        continue;
      }
      const m = typeof cell === 'string' && cell.match(VAR_REF);
      if (!m) errs.push(`themes.maps.${name}.${slot}: expected var(--primitive) or null, got ${JSON.stringify(cell)}`);
      else if (!tokenNames.has(m[1].slice(2))) errs.push(`themes.maps.${name}.${slot}: dead reference ${cell}`);
    }
  }

  const fall = themes.fallthrough;
  if (!fall || typeof fall !== 'object' || Array.isArray(fall)) {
    errs.push('themes.fallthrough: missing');
  } else {
    const declared = Object.keys(fall).sort().join('|');
    const expected = [...nullUnion].sort().join('|');
    if (declared !== expected) {
      errs.push(`themes.fallthrough: must cover exactly the null slots (${expected || 'none'}), got ${declared || 'none'}`);
    }
    const emitted = roleVars ? new Set(roleVarList(themes)) : new Set();
    for (const [slot, value] of Object.entries(fall)) {
      if (value === 'transparent') continue;
      const m = typeof value === 'string' && value.match(VAR_REF);
      if (!m) errs.push(`themes.fallthrough.${slot}: expected var(--ds-*) or transparent, got ${JSON.stringify(value)}`);
      else if (!emitted.has(m[1])) errs.push(`themes.fallthrough.${slot}: ${value} is not an emitted role var`);
    }
  }
  return errs;
}

/**
 * Emitted shape, in this order and no other:
 *   [data-ds-theme]        fall-through for every slot some theme leaves null
 *   [data-ds-theme="…"]    one block per map, declared order, null slots skipped
 * Both selectors are (0,1,0), so the fall-through block MUST precede the maps;
 * the assertion in render() enforces it.
 */
function renderThemes(themes) {
  const out = [];
  out.push('/* ---- theme maps (generated from tokens.json -> themes) ---- */');
  out.push(`[${THEME_ATTRIBUTE}] {`);
  for (const [slot, value] of Object.entries(themes.fallthrough)) {
    out.push(`  ${themes.roleVars[slot]}: ${value};`);
  }
  out.push('}');

  for (const name of THEME_NAMES) {
    const map = themes.maps[name];
    const nulls = THEME_SLOTS.filter((slot) => slot !== 'status' && map[slot] === null);
    const declared = ROLE_VAR_COUNT - nulls.length;
    out.push('');
    out.push(`/* ${name} — ${declared} of ${ROLE_VAR_COUNT} role vars (${nulls.length} null, inherited from the fall-through block) */`);
    out.push(`[${THEME_ATTRIBUTE}="${name}"] {`);
    let written = 0;
    for (const slot of THEME_SLOTS) {
      if (slot === 'status') {
        for (const key of STATUS_KEYS) {
          out.push(`  ${themes.roleVars.status[key]}: ${map.status[key]};`);
          written += 1;
        }
        continue;
      }
      if (map[slot] === null) {
        out.push(`  /* ${themes.roleVars[slot]}: null -> fall-through */`);
        continue;
      }
      out.push(`  ${themes.roleVars[slot]}: ${map[slot]};`);
      written += 1;
    }
    out.push('}');
    if (written !== declared) {
      console.error(`FAIL: theme "${name}" emitted ${written} declarations, expected ${declared}`);
      process.exit(1);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function render() {
  let raw;
  try {
    raw = readFileSync(srcPath, 'utf8');
  } catch (err) {
    console.error(`FAIL: cannot read ${rel(srcPath)} — ${err.message}`);
    process.exit(1);
  }
  let json;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    console.error(`FAIL: ${srcPath} is not valid JSON — ${err.message}`);
    process.exit(1);
  }

  const leaves = [];
  const errors = [];
  // `themes` is a sibling of the token map, not a branch of it. Destructuring
  // here is the one change that stops every role cell from flattening into a
  // phantom `--themes-*` property; the leaf count assertion below proves it.
  const { themes, ...tokenTree } = json;
  flatten(tokenTree, [], leaves, errors);

  if (errors.length) {
    console.error(`FAIL: ${errors.length} malformed token(s) in ${srcPath}:`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  if (leaves.length === 0) {
    console.error(`FAIL: no tokens found in ${srcPath}`);
    process.exit(1);
  }
  if (leaves.length !== EXPECTED_LEAVES) {
    console.error(`FAIL: ${leaves.length} token leaves in ${srcPath}, expected ${EXPECTED_LEAVES}.`);
    console.error('  A new key means bumping EXPECTED_LEAVES on purpose; a jump of ~70 means `themes` was flattened.');
    process.exit(1);
  }
  if (leaves.some((leaf) => leaf.path[0] === 'themes')) {
    console.error('FAIL: `themes` leaked into the token map — role maps are not tokens.');
    process.exit(1);
  }

  // Type <-> value validation, before names or output.
  const typeErrors = [];
  for (const leaf of leaves) {
    const problem = validateLeaf(leaf);
    if (problem) typeErrors.push(problem);
  }
  if (typeErrors.length) {
    console.error(`FAIL: ${typeErrors.length} invalid token(s) in ${srcPath}:`);
    for (const e of typeErrors) console.error(`  - ${e}`);
    process.exit(1);
  }

  // Name + collision checks — fail loudly rather than emit broken CSS.
  const names = new Set();
  for (const leaf of leaves) {
    const name = kebab(leaf.path);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
      console.error(`FAIL: token "${leaf.path.join('.')}" produced an invalid CSS name: --${name}`);
      process.exit(1);
    }
    if (names.has(name)) {
      console.error(`FAIL: duplicate CSS custom property --${name} (from "${leaf.path.join('.')}")`);
      process.exit(1);
    }
    names.add(name);
    leaf.name = name;
  }

  const themeErrors = validateThemes(themes, names);
  if (themeErrors.length) {
    console.error(`FAIL: ${themeErrors.length} invalid theme map entr${themeErrors.length === 1 ? 'y' : 'ies'} in ${srcPath}:`);
    for (const e of themeErrors) console.error(`  - ${e}`);
    process.exit(1);
  }

  // Group by top-level segment (order of first appearance), then by the first two
  // segments for a readable sub-heading. Token order inside a group stays source order.
  const groups = new Map();
  for (const leaf of leaves) {
    const top = leaf.path[0];
    const sub = leaf.path.length > 1 ? `${leaf.path[0]}.${leaf.path[1]}` : leaf.path[0];
    if (!groups.has(top)) groups.set(top, new Map());
    const subs = groups.get(top);
    if (!subs.has(sub)) subs.set(sub, []);
    subs.get(sub).push(leaf);
  }

  const lines = [];
  lines.push('/* ==========================================================================');
  lines.push('   tokens.css — GENERATED FILE, DO NOT EDIT BY HAND.');
  lines.push('   Source:     design-system/tokens.json');
  lines.push('   Regenerate: node scripts/build-tokens.mjs');
  lines.push(`   Tokens:     ${leaves.length}`);
  lines.push(`   Themes:     ${themes.maps ? Object.keys(themes.maps).length : 0} · role slots: ${THEME_SLOTS.length} · role vars: ${ROLE_VAR_COUNT}`);
  lines.push('   ========================================================================== */');
  lines.push('');
  lines.push(':root {');

  let firstGroup = true;
  for (const [, subs] of groups) {
    for (const [sub, tokens] of subs) {
      if (!firstGroup) lines.push('');
      firstGroup = false;
      lines.push(`  /* ${sub} */`);
      for (const token of tokens) {
        lines.push(`  --${token.name}: ${token.value};`);
      }
    }
  }

  lines.push('}');
  lines.push('');
  lines.push(...renderThemes(themes));

  const css = lines.join('\n');
  // Specificity is (0,1,0) for both selectors, so source order alone decides:
  // the fall-through must be emitted before the first theme map.
  const fallAt = css.indexOf(`[${THEME_ATTRIBUTE}] {`);
  const firstMapAt = css.indexOf(`[${THEME_ATTRIBUTE}="`);
  if (fallAt < 0 || firstMapAt < 0 || fallAt > firstMapAt) {
    console.error('FAIL: theme emission order broken — [data-ds-theme] fall-through must precede the maps');
    process.exit(1);
  }

  return { css, leaves, groups, themeCount: Object.keys(themes.maps).length };
}

// ---------------------------------------------------------------------------
// Compare (never writes)
// ---------------------------------------------------------------------------

function describeDiff(expected, actual) {
  const want = expected.split('\n');
  const got = actual.split('\n');
  const max = Math.max(want.length, got.length);
  let differing = 0;
  let first = -1;
  for (let i = 0; i < max; i += 1) {
    if (want[i] !== got[i]) {
      differing += 1;
      if (first === -1) first = i;
    }
  }
  const out = [`FAIL: ${rel(outPath)} is out of date (rendered ${Buffer.byteLength(expected, 'utf8')} B, on disk ${Buffer.byteLength(actual, 'utf8')} B; ${differing} differing line(s))`];
  if (first !== -1) {
    out.push(`  first diff at line ${first + 1}:`);
    out.push(`    expected: ${JSON.stringify(want[first] ?? '<missing>')}`);
    out.push(`    on disk:  ${JSON.stringify(got[first] ?? '<missing>')}`);
  }
  out.push('  Regenerate: node scripts/build-tokens.mjs');
  return out.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

const { css, leaves, groups, themeCount } = render();
const label = rel(srcPath);

if (opts.check) {
  if (!existsSync(outPath)) {
    console.error(`FAIL: ${rel(outPath)} does not exist; run node scripts/build-tokens.mjs`);
    process.exit(1);
  }
  const actual = readFileSync(outPath, 'utf8');
  if (actual !== css) {
    console.error(describeDiff(css, actual));
    process.exit(1);
  }
  console.log(`OK: ${rel(outPath)} matches ${label} byte-for-byte`);
  console.log(`Tokens: ${leaves.length}; Groups: ${groups.size}; Themes: ${themeCount}; bytes: ${Buffer.byteLength(css, 'utf8')}; sha256: ${sha256(css)}`);
  process.exit(0);
}

if (outPath !== OUT) {
  writeFileSync(outPath, css, 'utf8');
  console.log(`Wrote ${outPath} (from ${label})`);
  console.log(`Tokens: ${leaves.length}; Groups: ${groups.size}; Themes: ${themeCount}; bytes: ${Buffer.byteLength(css, 'utf8')}`);
  process.exit(0);
}

writeFileSync(outPath, css, 'utf8');

console.log(`Wrote ${outPath}`);
console.log(`Tokens: ${leaves.length}`);
console.log(`Themes: ${themeCount}; Groups: ${groups.size}; bytes: ${Buffer.byteLength(css, 'utf8')}`);
