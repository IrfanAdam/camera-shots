#!/usr/bin/env node
/**
 * check-doc-counts.mjs — documentation may not state a count the source contradicts.
 *
 * Read-only. Asserts, in order:
 *   1. design-system/tokens.css :root carries exactly as many custom properties
 *      as design-system/tokens.json has keys (the rendered total).
 *   2. every rendered token total in design-system/index.html matches that number.
 *      A runtime placeholder (empty or dash text in a .js-token-count element) is
 *      a SKIP, but only when the page JS that fills it is real: it must target
 *      .js-token-count and set it from the CSSOM :root rules of tokens.css, which
 *      assertion 1 pins to the tokens.json key count. A typed literal is checked.
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
const skips = [];
function check(label, ok, detail) {
  assertions.push({ label, ok, detail });
}

/**
 * Text a .js-token-count element may hold before the page JS runs. An em dash is
 * the shipped placeholder; an empty element is the same claim with less ink.
 */
const PLACEHOLDER_TEXT = /^(?:|—|–|&mdash;|&ndash;)$/;

/**
 * Prove the runtime binding behind those placeholders is real, not a promise:
 * it must select .js-token-count, assign it from a value derived from the CSSOM
 * :root custom-property names, and read only the generated tokens.css sheet (so
 * gallery chrome can never inflate the total). Assertion 1 pins that CSSOM count
 * to the tokens.json key count, so a placeholder and a literal prove the same fact.
 */
function inspectCountBinding(html) {
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1])
    .join('\n');
  const problems = [];

  if (!/querySelectorAll\(\s*['"]\.js-token-count['"]\s*\)/.test(scripts)) {
    problems.push("no querySelectorAll('.js-token-count') in the page script");
  }

  const assign = scripts.match(
    /querySelectorAll\(\s*['"]\.js-token-count['"]\s*\)[\s\S]{0,400}?\.textContent\s*=\s*(?!['"\d])([A-Za-z_$][\w$]*)\s*;/,
  );
  if (!assign) {
    problems.push('no .js-token-count textContent assignment from a computed value');
  } else {
    const source = assign[1];
    const from = scripts.match(
      new RegExp(`(?:var|let|const)\\s+${source}\\s*=\\s*(countRootTokens\\(\\)|rootTokenNames\\(\\)\\.length)\\s*;`),
    );
    if (!from) {
      problems.push(`.js-token-count is set from "${source}", which is not derived from CSSOM :root names`);
    } else if (
      from[1] === 'countRootTokens()' &&
      !/function\s+countRootTokens\s*\(\s*\)\s*\{\s*return\s+rootTokenNames\(\)\.length\s*;?\s*\}/.test(scripts)
    ) {
      problems.push('countRootTokens() does not return rootTokenNames().length');
    }
  }

  if (!/selectorText\s*===\s*['"]:root['"]/.test(scripts)) {
    problems.push("binding does not read a ':root' CSSStyleRule");
  }
  if (!/href[\s\S]{0,40}indexOf\(\s*['"]tokens\.css['"]\s*\)/.test(scripts)) {
    problems.push('binding does not restrict the count to the generated tokens.css sheet');
  }

  return { ok: problems.length === 0, detail: problems.join('; ') };
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

// 2. rendered totals in the gallery. Two honest forms: a literal that must equal
// the source count, or a runtime placeholder that is only acceptable when the
// binding filling it is real (asserted immediately after).
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
  const placeholders = totalSpans.filter((span) => PLACEHOLDER_TEXT.test(span.value));
  const literals = totalSpans.filter((span) => !PLACEHOLDER_TEXT.test(span.value));

  for (const span of placeholders) {
    skips.push(
      `gallery token total index.html:${span.line} is a runtime placeholder, filled by .js-token-count from CSSOM :root (asserted below)`,
    );
  }
  if (literals.length) {
    const bad = literals.filter((span) => span.value !== String(keyCount));
    check(
      `gallery token total (${literals.length} literal element${literals.length === 1 ? '' : 's'}) = ${keyCount}`,
      bad.length === 0,
      bad.map((span) => `index.html:${span.line} renders "${span.value}"`).join('; '),
    );
  }

  const binding = inspectCountBinding(galleryHtml);
  check(
    `gallery .js-token-count binding fills from tokens.css CSSOM :root (${placeholders.length} placeholder${placeholders.length === 1 ? '' : 's'})`,
    binding.ok,
    binding.detail,
  );
}

// 3. gallery group tags vs rendered swatches.
// A group that states no number has nothing to go stale (the count is rendered
// at runtime), so it is reported as a skip, never a failure. Stated counts must
// agree with the swatches actually rendered under them.
const groups = readGroups(galleryHtml);
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
