#!/usr/bin/env node
/**
 * check-anchors.mjs — every in-repo fragment link has a target, and every id is
 * unique inside its document.
 *
 * Checks:
 *   1. every `id="…"` is unique within its file.
 *   2. every `href="#anchor"` resolves to an id in the same file — unless the
 *      same tag handles the click itself (`onclick="…return false"`), in which
 *      case the hash is application state, not a document anchor. Those are
 *      reported as SKIP so the exemption is visible, never silent.
 *   3. every `href="page.html#anchor"` resolves in that page. A target that is
 *      not a document — `icons.svg#ds-icon-copy`, a PDF, a zip — is not a
 *      fragment link this check can read, so it is skipped and counted, exactly
 *      as the markdown branch skips a non-.md/.html target. The skip is not
 *      blind: `scripts/lint-tokens.mjs` class C5 resolves every `svg#id`
 *      reference against the symbols that SVG actually declares.
 *   4. every `aria-labelledby` / `aria-describedby` / `aria-controls` idref
 *      resolves in the same file.
 *   5. every `[plan:<path>#<anchor>]` names a file that exists and an anchor that
 *      file really declares (`{#anchor}` or a heading slug).
 *
 * Read-only. Exit 0 when the graph is closed, 1 on the first class of failure
 * with every missing target listed, 2 when the file set cannot be enumerated.
 *
 * Usage: node scripts/check-anchors.mjs
 */

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const rel = (p) => relative(ROOT, p) || p;

const SKIP_DIRS = ['node_modules/', '.git/', 'uploads/', 'design-system/shots/'];
const TEXT_EXT = new Set(['.md', '.html', '.mjs', '.js', '.yml', '.yaml', '.json', '.txt']);

function repoFiles() {
  try {
    const list = (args) => execFileSync('git', args, { cwd: ROOT, maxBuffer: 32 * 1024 * 1024 })
      .toString('utf8')
      .split('\0')
      .filter(Boolean);
    const files = new Set([...list(['ls-files', '-z']), ...list(['ls-files', '-z', '-o', '--exclude-standard'])]);
    return [...files].filter((f) => !SKIP_DIRS.some((dir) => f.startsWith(dir)));
  } catch (err) {
    console.error(`FAIL: cannot enumerate repository files — ${err.message}`);
    process.exit(2);
  }
}

function read(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch (err) {
    console.error(`FAIL: cannot read ${rel(path)} — ${err.message}`);
    process.exit(2);
  }
}

const errors = [];
function fail(where, message) {
  errors.push({ where, message });
}

// ---------------------------------------------------------------------------
// HTML: ids + fragment links
// ---------------------------------------------------------------------------

/** id -> [line numbers]; duplicates are reported by the caller. */
function scanHtml(text) {
  const ids = new Map();
  const links = [];
  const idrefs = [];
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    const lineNo = i + 1;
    for (const m of line.matchAll(/\sid\s*=\s*"([^"]*)"/g)) {
      const id = m[1];
      if (!id) continue;
      if (!ids.has(id)) ids.set(id, []);
      ids.get(id).push(lineNo);
    }
    for (const m of line.matchAll(/<([a-zA-Z][\w-]*)\b[^>]*>/g)) {
      const tag = m[0];
      const href = tag.match(/\shref\s*=\s*"([^"]*)"/);
      const onclick = tag.match(/\sonclick\s*=\s*"([^"]*)"/);
      if (href) {
        const value = href[1];
        if (value === '#' || value === '') continue;
        if (/^[a-z][a-z0-9+.-]*:/i.test(value)) continue; // absolute URL
        const hashAt = value.indexOf('#');
        if (hashAt === -1) continue;
        const target = value.slice(0, hashAt);
        const anchor = value.slice(hashAt + 1);
        if (!anchor) continue;
        links.push({
          line: lineNo,
          anchor,
          target,
          jsControlled: Boolean(onclick && /return\s+false/.test(onclick[1])),
        });
      }
      for (const attr of ['aria-labelledby', 'aria-describedby', 'aria-controls']) {
        const ref = tag.match(new RegExp(`\\s${attr}\\s*=\\s*"([^"]*)"`));
        if (!ref) continue;
        for (const id of ref[1].trim().split(/\s+/).filter(Boolean)) {
          idrefs.push({ line: lineNo, attr, id });
        }
      }
    }
  });
  return { ids, links, idrefs };
}

// ---------------------------------------------------------------------------
// Markdown: heading/explicit anchors + links
// ---------------------------------------------------------------------------

function slug(title) {
  return title
    .toLowerCase()
    .replace(/`|\*|_/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

function scanMarkdown(text) {
  const anchors = new Map(); // anchor -> line
  const links = [];
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    const lineNo = i + 1;
    for (const m of line.matchAll(/\{#([A-Za-z0-9._-]+)\}/g)) {
      if (!anchors.has(m[1])) anchors.set(m[1], lineNo);
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const title = heading[2].replace(/\s*\{#[^}]*\}\s*$/, '').trim();
      const s = slug(title);
      if (s && !anchors.has(s)) anchors.set(s, lineNo);
    }
    for (const m of line.matchAll(/\]\(([^)\s]*)\)/g)) {
      const href = m[1];
      if (!href || /^[a-z][a-z0-9+.-]*:/i.test(href)) continue;
      const hashAt = href.indexOf('#');
      const target = hashAt === -1 ? href : href.slice(0, hashAt);
      const anchor = hashAt === -1 ? null : href.slice(hashAt + 1);
      if (!anchor && !/\.(md|html)$/i.test(target)) continue;
      links.push({ line: lineNo, href, target, anchor });
    }
  });
  return { anchors, links };
}

// ---------------------------------------------------------------------------
// Collect
// ---------------------------------------------------------------------------

const files = repoFiles();
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const mdFiles = files.filter((f) => f.endsWith('.md'));

const html = new Map();
for (const file of htmlFiles) {
  const doc = scanHtml(read(resolve(ROOT, file)));
  html.set(file, doc);
  for (const [id, lines] of doc.ids) {
    if (lines.length > 1) {
      fail(`${file}:${lines.join(',')}`, `duplicate id "${id}" (${lines.length} occurrences)`);
    }
  }
}

const md = new Map();
for (const file of mdFiles) md.set(file, scanMarkdown(read(resolve(ROOT, file))));

// ---------------------------------------------------------------------------
// 1+2. HTML fragment links
// ---------------------------------------------------------------------------

let localChecked = 0;
let jsSkipped = 0;
let foreignSkipped = 0;
for (const [file, doc] of html) {
  for (const link of doc.links) {
    if (link.target) {
      /* a fragment into a non-document (an SVG sprite, a PDF) is not a link
         this check can read. The markdown branch skips these before it looks
         for the file; do the same here, and count it so the report stays
         honest. C5 in scripts/lint-tokens.mjs resolves the svg#id case. */
      if (!/\.(md|html)$/i.test(link.target)) {
        foreignSkipped += 1;
        continue;
      }
      const targetPath = resolve(dirname(resolve(ROOT, file)), link.target);
      const key = rel(targetPath);
      if (!existsSync(targetPath)) {
        fail(`${file}:${link.line}`, `href="${link.target}#${link.anchor}" names a missing file`);
        continue;
      }
      const targetDoc = html.get(key);
      if (!targetDoc) {
        fail(`${file}:${link.line}`, `href="${link.target}#${link.anchor}" is not an HTML file this check reads`);
        continue;
      }
      if (!targetDoc.ids.has(link.anchor)) {
        fail(`${file}:${link.line}`, `href="${link.target}#${link.anchor}" — ${key} has no id="${link.anchor}"`);
      }
      localChecked += 1;
      continue;
    }
    if (link.jsControlled) {
      jsSkipped += 1;
      continue;
    }
    localChecked += 1;
    if (!doc.ids.has(link.anchor)) {
      fail(`${file}:${link.line}`, `href="#${link.anchor}" — no id="${link.anchor}" in this file`);
    }
  }
  for (const ref of doc.idrefs) {
    if (!doc.ids.has(ref.id)) {
      fail(`${file}:${ref.line}`, `${ref.attr}="${ref.id}" — no such id in this file`);
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Markdown links
// ---------------------------------------------------------------------------

let mdChecked = 0;
for (const [file, doc] of md) {
  for (const link of doc.links) {
    if (!link.target) {
      mdChecked += 1;
      if (link.anchor && !doc.anchors.has(link.anchor)) {
        fail(`${file}:${link.line}`, `](#${link.anchor}) — no heading or {#anchor} in this file`);
      }
      continue;
    }
    if (!/\.(md|html)$/i.test(link.target)) continue;
    const targetPath = resolve(dirname(resolve(ROOT, file)), link.target);
    if (!existsSync(targetPath)) {
      fail(`${file}:${link.line}`, `](${link.href}) names a missing file`);
      continue;
    }
    if (!link.anchor) continue;
    mdChecked += 1;
    const key = rel(targetPath);
    const pool = key.endsWith('.html') ? html.get(key)?.ids : md.get(key)?.anchors;
    if (!pool) {
      fail(`${file}:${link.line}`, `](${link.href}) — ${key} is not a file this check reads`);
    } else if (!pool.has(link.anchor)) {
      fail(`${file}:${link.line}`, `](${link.href}) — ${key} declares no anchor "${link.anchor}"`);
    }
  }
}

// ---------------------------------------------------------------------------
// 4. [plan:<path>#<anchor>] references
// ---------------------------------------------------------------------------

const PLAN_REF = /\[plan:([^\]\s#]+)#([A-Za-z0-9._-]+)\]/g;
let planRefs = 0;
for (const file of files) {
  const ext = file.slice(file.lastIndexOf('.'));
  if (!TEXT_EXT.has(ext)) continue;
  const text = read(resolve(ROOT, file));
  let lineNo = 1;
  let index = 0;
  for (const m of text.matchAll(PLAN_REF)) {
    const before = text.slice(index, m.index);
    lineNo += (before.match(/\n/g) ?? []).length;
    index = m.index;
    planRefs += 1;
    const targetPath = resolve(ROOT, m[1]);
    if (!existsSync(targetPath)) {
      fail(`${file}:${lineNo}`, `[plan:${m[1]}#${m[2]}] names a missing plan file`);
      continue;
    }
    const key = rel(targetPath);
    const pool = key.endsWith('.md') ? md.get(key)?.anchors : html.get(key)?.ids;
    if (!pool) {
      fail(`${file}:${lineNo}`, `[plan:${m[1]}#${m[2]}] — ${key} is not a file this check reads`);
    } else if (!pool.has(m[2])) {
      fail(`${file}:${lineNo}`, `[plan:${m[1]}#${m[2]}] — ${key} declares no anchor "${m[2]}"`);
    }
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log(`check-anchors — ${html.size} html, ${md.size} markdown, ${planRefs} plan reference(s)`);
for (const [file, doc] of html) {
  const skipped = doc.links.filter((link) => !link.target && link.jsControlled).length;
  console.log(
    `  ${file}: ${doc.ids.size} id(s) unique, ${doc.links.length - skipped} fragment link(s) checked${skipped ? `, ${skipped} JS-controlled skipped` : ''}`,
  );
}
console.log(`  ${localChecked} html target(s), ${mdChecked} markdown target(s), ${planRefs} plan anchor(s) resolved${foreignSkipped ? `, ${foreignSkipped} non-document fragment target(s) skipped (svg#id and friends)` : ''}`);

if (errors.length) {
  for (const error of errors) console.log(`FAIL  ${error.where} — ${error.message}`);
  console.error(`RESULT: FAIL — ${errors.length} broken reference(s)`);
  process.exit(1);
}
console.log('RESULT: PASS — every anchor resolves, every id is unique');
