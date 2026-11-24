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
 * Usage:
 *   node scripts/build-tokens.mjs                     # render + write tokens.css
 *   node scripts/build-tokens.mjs --check             # render, diff, never write
 *   node scripts/build-tokens.mjs --tokens <path> --check   # validate a scratch copy
 *   node scripts/build-tokens.mjs --tokens <path> --out <path>  # render a scratch copy
 *   node scripts/build-tokens.mjs --strict-types      # fail on the legacy "other" set
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

/** Accepts "none" or 2-4 lengths, at most one `inset` and one colour. */
function isShadow(value) {
  if (/^none$/i.test(value)) return true;
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
  number: new RegExp(`^${NUM}$`),
  shadow: { test: isShadow },
};

/** Accepted legacy spellings, mapped onto a canonical type in TYPE_RULES. */
const TYPE_ALIASES = {
  boxShadow: 'shadow',
  lineHeight: 'number',
  letterSpacing: 'dimension',
};

/**
 * The 24 tokens still declared `type: "other"` by the shipped source. They are
 * number / cubic-bezier / `none` shapes waiting for a real type in Phase 1
 * (Task 8 adds `number`, `cubicBezier`, `shadow`). Grandfathering is explicit
 * and printed on every run so the list cannot grow silently: a key outside this
 * set with `type: "other"` fails, and `--strict-types` fails this whole set.
 *
 * TODO(phase-1): convert these to number / cubicBezier / shadow, then delete
 * this ledger and drop the grandfathering branch.
 */
const LEGACY_OTHER = new Set([
  'elevation.0',
  'motion.easing.drawer',
  'motion.easing.standard',
  'motion.easing.sheet',
  'motion.easing.emphasized',
  'motion.easing.out',
  'opacity.disabled',
  'opacity.overlay.thumb',
  'opacity.scrim',
  'z.base',
  'z.raise',
  'z.content',
  'z.sticky',
  'z.sticky.rail',
  'z.bar',
  'z.overlay',
  'z.sheet',
  'z.drawer',
  'z.drawer.child',
  'z.popover',
  'z.canvas',
  'z.toast',
  'z.menu',
  'z.max',
]);

/**
 * Baseline type mismatches already measured by the gate (T11 = 1). They are
 * grandfathered per key so the tree stays green on day one, but a mismatch on
 * any other key — or a new one on a listed key after this entry is removed —
 * fails. `--strict-types` fails these too.
 *
 * TODO(phase-1): retype typography.lineheight.pitch.h1 to `number`, then delete
 * this map.
 */
const TYPE_DEBT = new Map([
  ['typography.lineheight.pitch.h1', 'declares fontSize but the value "1.08" is a line-height ratio'],
]);

const typeLabel = (path) => path.join('.');

/**
 * Validate one leaf. Returns an error string, or null when the leaf is sound.
 * Every message carries the key and the offending value.
 */
function validateLeaf(leaf, strictTypes, legacySeen, debtSeen) {
  const key = typeLabel(leaf.path);
  const value = String(leaf.value).trim();
  const rawType = leaf.type;
  if (typeof rawType !== 'string' || rawType.trim() === '') {
    return `${key}: missing "type" (value "${value}")`;
  }
  const type = rawType.trim();

  if (type === 'other') {
    if (!LEGACY_OTHER.has(key)) {
      return `${key}: type "other" is not a valid token type (value "${value}") — use one of ${Object.keys(TYPE_RULES).join(', ')}`;
    }
    legacySeen.push(key);
    if (strictTypes) {
      return `${key}: type "other" is grandfathered legacy only (value "${value}") — --strict-types rejects it; use one of ${Object.keys(TYPE_RULES).join(', ')}`;
    }
    return null;
  }

  const canonical = TYPE_ALIASES[type] ?? type;
  const rule = TYPE_RULES[canonical];
  if (!rule) {
    return `${key}: unknown type "${type}" (value "${value}") — expected one of ${Object.keys(TYPE_RULES).join(', ')}`;
  }
  if (!rule.test(value)) {
    if (TYPE_DEBT.has(key)) {
      debtSeen.push(key);
      if (strictTypes) {
        return `${key}: type "${type}" does not match value "${value}" (known debt: ${TYPE_DEBT.get(key)}) — --strict-types rejects it`;
      }
      return null;
    }
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
  flatten(json, [], leaves, errors);

  if (errors.length) {
    console.error(`FAIL: ${errors.length} malformed token(s) in ${srcPath}:`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  if (leaves.length === 0) {
    console.error(`FAIL: no tokens found in ${srcPath}`);
    process.exit(1);
  }

  // Type <-> value validation, before names or output.
  const legacySeen = [];
  const debtSeen = [];
  const typeErrors = [];
  for (const leaf of leaves) {
    const problem = validateLeaf(leaf, opts.strictTypes, legacySeen, debtSeen);
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

  return { css: lines.join('\n'), leaves, groups, legacySeen, debtSeen };
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

const { css, leaves, groups, legacySeen, debtSeen } = render();
const label = rel(srcPath);

if (legacySeen.length) {
  console.warn(`TYPE-DEBT: ${legacySeen.length} token(s) still declared type "other" (grandfathered, TODO phase-1 task 8): ${legacySeen.join(', ')}`);
}
for (const key of debtSeen) {
  console.warn(`TYPE-DEBT: ${key} — ${TYPE_DEBT.get(key)} (grandfathered, TODO phase-1 task 8)`);
}

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
  console.log(`Tokens: ${leaves.length}; Groups: ${groups.size}; bytes: ${Buffer.byteLength(css, 'utf8')}; sha256: ${sha256(css)}`);
  process.exit(0);
}

if (outPath !== OUT) {
  writeFileSync(outPath, css, 'utf8');
  console.log(`Wrote ${outPath} (from ${label})`);
  console.log(`Tokens: ${leaves.length}; Groups: ${groups.size}; bytes: ${Buffer.byteLength(css, 'utf8')}`);
  process.exit(0);
}

writeFileSync(outPath, css, 'utf8');

console.log(`Wrote ${outPath}`);
console.log(`Tokens: ${leaves.length}`);
console.log(`Groups: ${groups.size}; bytes: ${Buffer.byteLength(css, 'utf8')}`);
