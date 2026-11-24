#!/usr/bin/env node
/**
 * check-links.mjs — every local link in the shipped pages and the design-system
 * docs resolves to a file that exists.
 *
 * Scope:
 *   1. `href` and `src` attributes in the four shipped HTML surfaces.
 *   2. relative `[text](target)` / `![alt](target)` links in design-system/*.md.
 *
 * Deliberately NOT in scope (each has its own owner or reason):
 *   · pure fragments (`href="#main"`) — scripts/check-anchors.mjs owns anchors
 *     and ids. A `file.html#fragment` link is checked for the file here; its
 *     fragment is left to check-anchors.
 *   · `mailto:` / `tel:` / `data:` / `javascript:` / `blob:` — not files.
 *   · external `http(s)://` and protocol-relative `//host` targets — this gate
 *     never touches the network: a vendor 503 or a CI runner with no egress
 *     would fail a merge for a reason the PR did not cause. The blind spot is
 *     recorded in design-system/verification.md; external URLs are reviewed by
 *     humans, not asserted here.
 *   · `${…}` template placeholders (`href="${src}"`, built by page JS at run
 *     time) — they are not links until the script runs, and the screenshot job
 *     plus axe job would catch a real broken one.
 *   · `design-system/references/**` and docs outside design-system — Task 39
 *     scopes the check to the shipped pages plus design-system/*.md.
 *
 * Read-only. Exit 0 when every local target exists, 1 on a missing target
 * (all of them listed), 2 when the file set cannot be enumerated.
 *
 * Usage: node scripts/check-links.mjs
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const rel = (p) => relative(ROOT, p) || p;

/* The four shipped surfaces — the same set the token gate and axe job read. */
const PAGES = ['index.html', 'pitch.html', 'engine.html', 'design-system/index.html'];

/* Task 39 scope: top-level design-system docs, not references/. */
const DOC_DIR = 'design-system';

const SKIP_SCHEME = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
const INERT_SCHEME = /^(?:mailto|tel|data|javascript|blob):/i;

const errors = [];
const failures = { missing: [], escape: [], unreadable: [] };
let checked = 0;
const skipped = {
  fragment: 0,
  external: 0,
  nonHttpScheme: 0,
  template: 0,
  empty: 0,
};

function fail(kind, where, message) {
  failures[kind].push({ where, message });
  errors.push({ where, message });
}

function read(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch (err) {
    fail('unreadable', rel(path), err.message);
    return null;
  }
}

/* ------------------------------------------------------------------ targets */

function safeDecode(value) {
  try {
    return decodeURI(value);
  } catch {
    return value; // a literal `%` in a filename is not a link bug
  }
}

/** Strip query and fragment, decode, and resolve against the file's directory. */
function resolveTarget(fromFile, raw) {
  const withoutHash = raw.split('#')[0];
  const withoutQuery = withoutHash.split('?')[0];
  if (!withoutQuery) return null; // pure fragment or query-only link
  const decoded = safeDecode(withoutQuery);
  /* A root-absolute path would bypass Vercel's static root on a subdirectory
     deploy; treat it as site-root-relative, which is what the browser does. */
  const base = decoded.startsWith('/') ? ROOT : dirname(resolve(ROOT, fromFile));
  return { path: resolve(base, decoded.replace(/^\/+/, '')), display: raw };
}

function isDirWithIndex(path) {
  try {
    return statSync(path).isDirectory() && existsSync(resolve(path, 'index.html'));
  } catch {
    return false;
  }
}

function checkTarget(fromFile, raw, where) {
  const target = resolveTarget(fromFile, raw);
  if (!target) {
    skipped.fragment += 1;
    return;
  }
  checked += 1;
  const display = target.display;
  const path = target.path;
  const inside = path === ROOT || path.startsWith(ROOT + sep);
  if (!inside) {
    fail('escape', where, `"${display}" resolves outside the repository (${path})`);
    return;
  }
  if (existsSync(path)) {
    try {
      if (statSync(path).isFile()) return;
      if (statSync(path).isDirectory()) {
        if (existsSync(resolve(path, 'index.html'))) return;
        fail('missing', where, `"${display}" is a directory without index.html`);
        return;
      }
    } catch (err) {
      fail('unreadable', where, `"${display}" — ${err.message}`);
      return;
    }
  }
  fail('missing', where, `"${display}" — no such file (${rel(path)})`);
}

/* --------------------------------------------------------------------- html */

const ATTR = /\s(href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;

function checkHtml(file) {
  const text = read(resolve(ROOT, file));
  if (text == null) return;
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    const where = `${file}:${i + 1}`;
    for (const m of line.matchAll(ATTR)) {
      const raw = (m[2] ?? m[3] ?? '').trim();
      if (!raw) {
        skipped.empty += 1;
        continue;
      }
      if (raw.includes('${')) {
        skipped.template += 1;
        continue;
      }
      if (raw.startsWith('#')) {
        skipped.fragment += 1;
        continue;
      }
      if (INERT_SCHEME.test(raw)) {
        skipped.nonHttpScheme += 1;
        continue;
      }
      if (SKIP_SCHEME.test(raw)) {
        skipped.external += 1;
        continue;
      }
      checkTarget(file, raw, where);
    }
  });
}

/* --------------------------------------------------------------- markdown */

/** Remove fenced blocks and inline code so examples are not read as links. */
function stripCode(text) {
  return text
    .replace(/^(```|~~~)[\s\S]*?^\1[^\n]*$/gm, '')
    .replace(/`[^`\n]*`/g, '');
}

function checkMarkdown(file) {
  const text = read(resolve(ROOT, file));
  if (text == null) return;
  const lines = stripCode(text).split('\n');
  lines.forEach((line, i) => {
    const where = `${file}:${i + 1}`;
    for (const m of line.matchAll(/!?\[[^\]]*\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g)) {
      const raw = m[1].trim().replace(/^<|>$/g, '');
      if (!raw) {
        skipped.empty += 1;
        continue;
      }
      if (raw.startsWith('#')) {
        skipped.fragment += 1;
        continue;
      }
      if (INERT_SCHEME.test(raw)) {
        skipped.nonHttpScheme += 1;
        continue;
      }
      if (SKIP_SCHEME.test(raw)) {
        skipped.external += 1;
        continue;
      }
      checkTarget(file, raw, where);
    }
  });
}

/* ------------------------------------------------------------------- main */

for (const page of PAGES) {
  if (!existsSync(resolve(ROOT, page))) {
    fail('missing', page, 'shipped page is missing from the tree');
    continue;
  }
  checkHtml(page);
}

let docs;
try {
  docs = readdirSync(resolve(ROOT, DOC_DIR))
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => `${DOC_DIR}/${name}`);
} catch (err) {
  console.error(`FAIL: cannot enumerate ${DOC_DIR}/*.md — ${err.message}`);
  process.exit(2);
}
for (const doc of docs) checkMarkdown(doc);

/* ---------------------------------------------------------------- report */

console.log(`check-links — ${PAGES.length} page(s), ${docs.length} doc(s), ${checked} local target(s)`);
console.log(
  `  skipped: ${skipped.fragment} fragment(s) (check-anchors owns them), ` +
    `${skipped.external} external/absolute, ${skipped.nonHttpScheme} mailto/tel/data, ` +
    `${skipped.template} JS template placeholder(s), ${skipped.empty} empty`,
);
for (const page of PAGES) console.log(`  ${page}`);

if (errors.length) {
  for (const error of errors) console.log(`FAIL  ${error.where} — ${error.message}`);
  console.error(`RESULT: FAIL — ${errors.length} broken local link(s)`);
  process.exit(1);
}
console.log('RESULT: PASS — every local href/src and markdown link resolves');
