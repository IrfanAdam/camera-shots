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
 * Usage: node scripts/build-tokens.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SRC = resolve(ROOT, 'design-system/tokens.json');
const OUT = resolve(ROOT, 'design-system/tokens.css');

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
    const { value } = node;
    if (typeof value !== 'string' || value.trim() === '') {
      errors.push(`${path.join('.')}: missing or empty "value"`);
      return;
    }
    // Dotted flat keys expand into segments so grouping still works.
    const segments = path.flatMap((p) => String(p).split('.'));
    out.push({ path: segments, value });
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

const raw = readFileSync(SRC, 'utf8');
let json;
try {
  json = JSON.parse(raw);
} catch (err) {
  console.error(`FAIL: ${SRC} is not valid JSON — ${err.message}`);
  process.exit(1);
}

const leaves = [];
const errors = [];
flatten(json, [], leaves, errors);

if (errors.length) {
  console.error(`FAIL: ${errors.length} malformed token(s) in design-system/tokens.json:`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
if (leaves.length === 0) {
  console.error('FAIL: no tokens found in design-system/tokens.json');
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

const css = lines.join('\n');
writeFileSync(OUT, css, 'utf8');

console.log(`Wrote ${OUT}`);
console.log(`Tokens: ${leaves.length}`);
console.log(`Groups: ${groups.size}; bytes: ${Buffer.byteLength(css, 'utf8')}`);
