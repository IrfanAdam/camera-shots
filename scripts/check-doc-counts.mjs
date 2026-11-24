#!/usr/bin/env node
/**
 * check-doc-counts.mjs — documentation may not state a count the source contradicts.
 *
 * Read-only. Asserts, in order:
 *   1. design-system/tokens.css :root carries exactly as many custom properties
 *      as design-system/tokens.json has keys (the rendered total).
 *   2. every rendered token total in design-system/index.html matches that number.
 *   3. every gallery group tag ("N tokens") matches the swatches rendered under it.
 *   4. the swatch total equals the sum of the group tags.
 *   5. README's "N keys, M groups" claim matches the source, when it makes one.
 *
 * Exit codes: 0 all assertions pass, 1 any mismatch, 2 required file unreadable.
 *
 * Usage: node scripts/check-doc-counts.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const FILES = {
  tokens: resolve(ROOT, 'design-system/tokens.json'),
  css: resolve(ROOT, 'design-system/tokens.css'),
  gallery: resolve(ROOT, 'design-system/index.html'),
  readme: resolve(ROOT, 'design-system/README.md'),
};

const rel = (p) => relative(ROOT, p) || p;

function read(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch (err) {
    console.error(`FAIL: cannot read ${rel(path)} — ${err.message}`);
    process.exit(2);
  }
}

function flatten(node, path, out) {
  if (node === null || typeof node !== 'object' || Array.isArray(node)) return out;
  if (Object.prototype.hasOwnProperty.call(node, 'value')) {
    out.push(path.flatMap((p) => String(p).split('.')));
    return out;
  }
  for (const [key, child] of Object.entries(node)) {
    if (Object.prototype.hasOwnProperty.call(node, 'type')) continue; // malformed leaf; the generator reports it
    flatten(child, [...path, key], out);
  }
  return out;
}

/** Count custom properties inside the first :root block of the generated sheet. */
function countRootProperties(css) {
  const start = css.indexOf(':root');
  if (start === -1) return null;
  const open = css.indexOf('{', start);
  const close = css.indexOf('\n}', open);
  if (open === -1 || close === -1) return null;
  const block = css.slice(open + 1, close);
  return block.split('\n').filter((line) => /^\s*--[a-z0-9-]+\s*:/.test(line)).length;
}

/**
 * Read every `swgroup`: its heading, its tag count and the swatches rendered
 * inside it. Line-oriented on purpose — the gallery is hand-written HTML.
 */
function readGroups(html) {
  const groups = [];
  let current = null;
  const lines = html.split('\n');
  lines.forEach((line, i) => {
    if (/<div class="swgroup">/.test(line)) {
      current = { name: null, tag: null, swatches: 0, line: i + 1, tagLine: null };
      groups.push(current);
      return;
    }
    if (!current) return;
    if (/<div class="swgroup-head">/.test(line)) {
      const name = line.match(/<h3>([^<]+)<\/h3>/);
      const tag = line.match(/<span class="tag">(\d+)\s+tokens?<\/span>/);
      if (name) current.name = name[1].replace(/&amp;/g, '&').trim();
      if (tag) {
        current.tag = Number(tag[1]);
        current.tagLine = i + 1;
      }
      return;
    }
    if (/class="sw"/.test(line)) current.swatches += 1;
  });
  return groups;
}

const assertions = [];
function check(label, ok, detail) {
  assertions.push({ label, ok, detail });
}

// 1. tokens.json keys vs generated :root properties
const tokens = JSON.parse(read(FILES.tokens));
const leaves = flatten(tokens, [], []);
const keyCount = leaves.length;
const groupCount = new Set(leaves.map((path) => path[0])).size;
const rootCount = countRootProperties(read(FILES.css));

if (rootCount === null) {
  check(`${rel(FILES.css)} :root block readable`, false, 'no :root block with a closing brace found');
} else {
  check(
    `${rel(FILES.css)} :root properties = ${rel(FILES.tokens)} keys`,
    rootCount === keyCount,
    `tokens.css renders ${rootCount}, tokens.json defines ${keyCount}`,
  );
}

// 2. rendered totals in the gallery
const galleryHtml = read(FILES.gallery);
const galleryLines = galleryHtml.split('\n');
const totalSpans = [];
galleryLines.forEach((line, i) => {
  for (const m of line.matchAll(/<span class="js-token-count">([^<]*)<\/span>/g)) {
    totalSpans.push({ value: m[1].trim(), line: i + 1 });
  }
});
if (totalSpans.length === 0) {
  check('gallery renders a token total', false, 'no .js-token-count element found');
} else {
  const bad = totalSpans.filter((span) => span.value !== String(keyCount));
  check(
    `gallery token total (${totalSpans.length} element${totalSpans.length === 1 ? '' : 's'}) = ${keyCount}`,
    bad.length === 0,
    bad.map((span) => `index.html:${span.line} renders "${span.value}"`).join('; '),
  );
}

// 3. gallery group tags vs rendered swatches.
// A group that states no number has nothing to go stale (the count is rendered
// at runtime), so it is reported as a skip, never a failure. Stated counts must
// agree with the swatches actually rendered under them.
const groups = readGroups(galleryHtml);
const skips = [];
if (groups.length === 0) {
  check('gallery groups readable', false, 'no .swgroup blocks found');
} else {
  for (const group of groups) {
    const name = group.name ?? `group at line ${group.line}`;
    if (group.tag === null) {
      skips.push(`gallery group "${name}" states no count (${group.swatches} swatch${group.swatches === 1 ? '' : 'es'} rendered at runtime)`);
      continue;
    }
    check(
      `gallery group "${name}" tag ${group.tag} = ${group.swatches} swatches`,
      group.tag === group.swatches,
      `index.html:${group.tagLine} says ${group.tag}, ${group.swatches} swatch${group.swatches === 1 ? '' : 'es'} rendered`,
    );
  }

  const stated = groups.filter((group) => group.tag !== null);
  const swatchSum = groups.reduce((sum, group) => sum + group.swatches, 0);
  if (stated.length === groups.length) {
    const tagSum = stated.reduce((sum, group) => sum + group.tag, 0);
    check(
      `gallery swatch total ${swatchSum} = sum of ${groups.length} group tags ${tagSum}`,
      tagSum === swatchSum,
      'a group tag disagrees with the swatches under it',
    );
  } else if (stated.length > 0) {
    skips.push(`gallery group-tag sum skipped: ${stated.length} of ${groups.length} groups state a count`);
  } else {
    skips.push(`gallery group tags are runtime-computed; ${swatchSum} swatches rendered`);
  }
}

// 4. README claim, when present
const readme = read(FILES.readme);
const claim = readme.match(/(\d+)\s+keys?,\s*(\d+)\s+groups?/);
if (!claim) {
  console.log(`SKIP  ${rel(FILES.readme)} makes no "N keys, M groups" claim`);
} else {
  const line = readme.slice(0, claim.index).split('\n').length;
  check(
    `${rel(FILES.readme)} claim "${claim[1]} keys, ${claim[2]} groups" = source`,
    Number(claim[1]) === keyCount && Number(claim[2]) === groupCount,
    `README:${line} says ${claim[1]} keys / ${claim[2]} groups; source has ${keyCount} keys / ${groupCount} groups`,
  );
}

// Report
console.log(`check-doc-counts — source: ${rel(FILES.tokens)} (${keyCount} keys, ${groupCount} groups)`);
for (const skip of skips) console.log(`  SKIP  ${skip}`);
for (const assertion of assertions) {
  if (assertion.ok) {
    console.log(`  PASS  ${assertion.label}`);
  } else {
    console.log(`  FAIL  ${assertion.label}`);
    if (assertion.detail) console.log(`        ${assertion.detail}`);
  }
}

const failed = assertions.filter((assertion) => !assertion.ok);
if (failed.length) {
  console.error(`RESULT: FAIL — ${failed.length} of ${assertions.length} assertion(s) failed`);
  process.exit(1);
}
console.log(`RESULT: PASS — ${assertions.length} assertion(s)${skips.length ? `, ${skips.length} skipped` : ''}`);
