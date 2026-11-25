#!/usr/bin/env node
/**
 * build-usage.mjs — the product → design-system usage index.
 *
 * Answers, deterministically and without a browser: which token does each
 * surface consume, where is each component rendered, and what reaches the
 * product when either changes. The inverse direction (DS → product workbench)
 * is a separate lane; this file only measures.
 *
 * Reads  design-system/surfaces.json     (surface manifest, authored once)
 *        design-system/tokens.json       (definitions, aliases, theme maps)
 *        design-system/tokens.css        (the :root block the pages load — a
 *                                         stale sheet fails the build)
 *        index.html pitch.html engine.html  (product surfaces)
 *        design-system/index.html        (gallery — QUARANTINED, docsOnly)
 *        the stylesheets each surface links, plus components.css (component
 *        selectors + the numbered block a class belongs to)
 * Writes design-system/usage.json         (machine-readable index)
 *        design-system/usage.md           (generated human summary)
 *
 * Source of truth. Scanned inputs are read from committed HEAD with
 * `git show HEAD:<path>`, exactly as build-foundations.mjs reads its consumer
 * pages: a lane that is mid-edit on a page or a stylesheet cannot drift the
 * index, and the artifact describes the commit CI checks out. An untracked
 * input (surfaces.json on its first run) falls back to disk, as does
 * `--worktree`, which indexes what is on disk right now for local preview.
 * Regenerate after committing a page or stylesheet change, the same workflow
 * foundations.md uses.
 *
 * Quarantine rule. A surface marked `docsOnly: true` is scanned and counted,
 * but its refs never contribute to `productRefCount`. This mirrors
 * lint-tokens.mjs T8 ("a gallery swatch proves a token renders; it does not
 * prove a product uses it"), so the two gates cannot disagree about a token
 * with zero product consumers. A stylesheet loaded only by the gallery is
 * treated the same way: its refs are gallery refs, not product refs.
 *
 * Stability rule. The committed JSON carries no line numbers and no
 * timestamps: a ref is `{file, count}`, a component is a selector plus
 * attribute names. Ordinary edits inside a line therefore do not churn the
 * artifact. `--lines` prints a file:line drill-down to stdout for debugging;
 * line numbers are never written to disk.
 *
 * Determinism. One pass over the sources, stable key order (surfaces in
 * manifest order, tokens by CSS name, components by class, refs by file),
 * ASCII-codepoint comparison instead of locale collation, two-space JSON with
 * a trailing newline. Two consecutive runs are byte-identical.
 *
 * Usage:
 *   node scripts/build-usage.mjs                    # write usage.json + usage.md
 *   node scripts/build-usage.mjs --check            # diff a fresh build, never write
 *   node scripts/build-usage.mjs --check --quiet    # one line, still exits on drift
 *   node scripts/build-usage.mjs --print            # print usage.json to stdout
 *   node scripts/build-usage.mjs --lines            # print file:line drill-down
 *   node scripts/build-usage.mjs --lines --token=--color-pitch-accent
 *   node scripts/build-usage.mjs --lines --component=ds-btn
 *
 * Exit codes: 0 ok, 1 out of date / inconsistent source, 2 bad usage.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const CONFIG_FILE = 'design-system/surfaces.json';
const JSON_OUT = 'design-system/usage.json';
const MD_OUT = 'design-system/usage.md';

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const has = (flag) => argv.includes(flag);
const option = (name) => {
  const hit = argv.find((arg) => arg.startsWith(name + '='));
  return hit ? hit.slice(name.length + 1) : null;
};

const MODE = {
  check: has('--check'),
  print: has('--print'),
  lines: has('--lines'),
  quiet: has('--quiet'),
  worktree: has('--worktree'),
  help: has('--help') || has('-h'),
};
const FILTER = { token: option('--token'), component: option('--component') };

const KNOWN_ARGS = new Set(['--check', '--print', '--lines', '--quiet', '--worktree', '--help', '-h', '--token', '--component']);
for (const arg of argv) {
  const key = arg.split('=')[0];
  if (arg.startsWith('--') && !KNOWN_ARGS.has(key)) {
    console.error(`FAIL: unknown argument ${arg}`);
    console.error('Usage: node scripts/build-usage.mjs [--check] [--print] [--lines] [--quiet] [--token=--name] [--component=ds-name]');
    process.exit(2);
  }
}

if (MODE.help) {
  console.log(`build-usage.mjs — product → design-system usage index

  node scripts/build-usage.mjs                 write design-system/usage.json + usage.md
  node scripts/build-usage.mjs --check         exit 1 when either file is stale
  node scripts/build-usage.mjs --print         print usage.json to stdout
  node scripts/build-usage.mjs --lines         print file:line refs to stdout
      --token=--color-pitch-accent             narrow --lines to one token
      --component=ds-btn                       narrow --lines to one component
      --worktree                               index the working tree, not committed HEAD
      --quiet                                  one-line result under --check

By default the scanned sources are read from committed HEAD (like
build-foundations.mjs), so a half-edited worktree cannot drift the index and a
parallel lane's in-flight page edits are invisible. --worktree indexes what is
on disk right now, for local preview and for proving that a source edit changes
the result.

Exit codes: 0 ok, 1 stale/inconsistent, 2 bad usage.`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** Relative path with forward slashes on every platform. */
const rel = (abs) => relative(ROOT, abs).split(sep).join('/');

function read(relPath, { optional = false } = {}) {
  const abs = resolve(ROOT, relPath);
  try {
    return readFileSync(abs, 'utf8');
  } catch (err) {
    if (optional) return null;
    console.error(`FAIL: cannot read ${relPath} — ${err.message}`);
    process.exit(2);
  }
}

/**
 * Read a scanned input. By default this is `git show HEAD:<path>`, matching
 * build-foundations.mjs: a page another lane is mid-edit on cannot drift the
 * index, and the artifact describes the commit that will be checked out in CI.
 * Untracked inputs (surfaces.json on its first run) and `--worktree` fall back
 * to disk. Output files are always written to disk.
 */
const HEAD_CACHE = new Map();
function gitShow(relPath) {
  if (HEAD_CACHE.has(relPath)) return HEAD_CACHE.get(relPath);
  const result = spawnSync('git', ['-C', ROOT, 'show', `HEAD:${relPath}`], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const text = result.status === 0 ? result.stdout : null;
  HEAD_CACHE.set(relPath, text);
  return text;
}

function source(relPath) {
  if (!MODE.worktree) {
    const committed = gitShow(relPath);
    if (committed !== null) return committed;
  }
  return read(relPath);
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

/** Codepoint comparison: identical on every machine, unlike localeCompare. */
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const uniqSorted = (values) => [...new Set(values)].sort(cmp);

function countToObject(map, keys) {
  const out = {};
  for (const key of keys) out[key] = map.get(key) || 0;
  return out;
}

function addTo(map, key, n = 1) {
  map.set(key, (map.get(key) || 0) + n);
}

/** Line starts for a text; used for internal line numbers only. */
function lineStarts(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) if (text[i] === '\n') starts.push(i + 1);
  return starts;
}

function lineAt(starts, offset) {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

/**
 * Mask comments without swallowing real markup. A block-comment span is masked
 * only when it is single-line or opens at line start: `accept="image/*"` in
 * engine.html opens a fake comment that would otherwise blank 6 kB of markup.
 * Newlines are preserved so offsets and line numbers stay valid.
 */
function maskComments(text) {
  const out = text.split('');
  const blank = (from, to) => {
    for (let i = from; i < to; i += 1) if (out[i] !== '\n') out[i] = ' ';
  };
  const lineStartAt = (index) => text.lastIndexOf('\n', index - 1) + 1;

  for (const match of text.matchAll(/\/\*[\s\S]*?\*\//g)) {
    const multiline = match[0].includes('\n');
    if (multiline && !/^[ \t]*$/.test(text.slice(lineStartAt(match.index), match.index))) continue;
    blank(match.index, match.index + match[0].length);
  }
  for (const match of text.matchAll(/<!--[\s\S]*?-->/g)) {
    blank(match.index, match.index + match[0].length);
  }
  return out.join('');
}

/** Character ranges covered by <script> elements (content included). */
function scriptRanges(text) {
  const ranges = [];
  for (const match of text.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)) {
    ranges.push([match.index, match.index + match[0].length]);
  }
  return ranges;
}

function inRanges(ranges, offset) {
  for (const [from, to] of ranges) if (offset >= from && offset < to) return true;
  return false;
}

/** The opening tag around an offset, or '' when the offset is not in a tag. */
function tagAt(text, offset) {
  const open = text.lastIndexOf('<', offset);
  if (open === -1) return '';
  const prevClose = text.lastIndexOf('>', offset);
  if (prevClose > open) return '';
  const close = text.indexOf('>', offset);
  if (close === -1) return text.slice(open, Math.min(text.length, open + 600));
  return text.slice(open, close + 1);
}

/** path segments -> kebab CSS custom property name (no leading --), as build-tokens.mjs does it. */
function kebab(segments) {
  return segments
    .map((segment) =>
      String(segment)
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase(),
    )
    .join('-');
}

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

const VAR_RE = /\bvar\(\s*(--[A-Za-z0-9_-]+)/g;
const DS_READ_RE = /\b(?:CT|WA|getPropertyValue)\s*\(([^()]*)\)/g;
const QUOTED_VAR_RE = /["'](--[A-Za-z0-9_-]+)["']/g;

function loadTokens() {
  const tokenSource = JSON.parse(source('design-system/tokens.json'));
  const leaves = [];
  const visit = (node, path) => {
    if (node === null || typeof node !== 'object' || Array.isArray(node)) return;
    if (Object.prototype.hasOwnProperty.call(node, 'value')) {
      const segments = path.flatMap((part) => String(part).split('.'));
      const value = String(node.value);
      leaves.push({
        key: segments.join('.'),
        group: segments[0],
        type: typeof node.type === 'string' ? node.type : 'other',
        value,
        css: '--' + kebab(segments),
        aliasOf: value.match(/^var\(\s*(--[A-Za-z0-9_-]+)\s*\)$/)?.[1] || null,
      });
      return;
    }
    // A token-shaped object without a value is malformed; build-tokens owns
    // reporting it. Skip so this scanner cannot invent a token.
    if (Object.prototype.hasOwnProperty.call(node, 'type')) return;
    for (const [key, child] of Object.entries(node)) {
      if (path.length === 0 && key === 'themes') continue;
      visit(child, [...path, key]);
    }
  };
  visit(tokenSource, []);

  const seen = new Set();
  for (const leaf of leaves) {
    if (seen.has(leaf.css)) fail(`duplicate CSS custom property ${leaf.css} (from "${leaf.key}")`);
    seen.add(leaf.css);
  }
  const sorted = leaves.sort((a, b) => cmp(a.css, b.css));

  // tokens.css is what the pages actually load. A mismatch means a stale
  // generated sheet; fail rather than index names that do not exist.
  const css = source('design-system/tokens.css');
  const start = css.indexOf(':root');
  const end = start === -1 ? -1 : css.indexOf('\n}', start);
  if (start === -1 || end === -1) fail('design-system/tokens.css has no :root block');
  const live = [...css.slice(start, end).matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map((m) => m[1]);
  if (live.length !== sorted.length) {
    fail(`tokens.css :root declares ${live.length} properties, tokens.json has ${sorted.length} — run node scripts/build-tokens.mjs`);
  }
  const liveSet = new Set(live);
  for (const leaf of sorted) {
    if (!liveSet.has(leaf.css)) fail(`tokens.css is missing ${leaf.css} — run node scripts/build-tokens.mjs`);
  }

  return { leaves: sorted, byCss: new Map(sorted.map((leaf) => [leaf.css, leaf])), themes: tokenSource.themes || {} };
}

/** Every theme-map cell that points at a token, from `themes.maps`. */
function loadRoleMapCells(themes) {
  const cells = [];
  for (const [theme, map] of Object.entries(themes.maps || {})) {
    for (const [slot, cell] of Object.entries(map || {})) {
      const add = (slotName, value) => {
        if (typeof value !== 'string') return;
        for (const match of value.matchAll(VAR_RE)) cells.push({ token: match[1], theme, slot: slotName });
      };
      if (typeof cell === 'string') add(slot, cell);
      else if (cell && typeof cell === 'object') {
        for (const [key, value] of Object.entries(cell)) add(slot + '.' + key, value);
      }
    }
  }
  return cells;
}

// ---------------------------------------------------------------------------
// Surface manifest
// ---------------------------------------------------------------------------

function loadSurfaces() {
  const config = JSON.parse(source(CONFIG_FILE));
  const surfaces = Array.isArray(config.surfaces) ? config.surfaces : [];
  if (!surfaces.length) fail(`${CONFIG_FILE} declares no surfaces`);

  const ids = new Set();
  for (const surface of surfaces) {
    for (const field of ['id', 'page', 'role']) {
      if (typeof surface[field] !== 'string' || !surface[field]) fail(`${CONFIG_FILE}: surface is missing "${field}"`);
    }
    if (ids.has(surface.id)) fail(`${CONFIG_FILE}: duplicate surface id "${surface.id}"`);
    ids.add(surface.id);
    if (!existsSync(resolve(ROOT, surface.page))) fail(`${CONFIG_FILE}: ${surface.id} page "${surface.page}" does not exist`);
    if (!Array.isArray(surface.css) || !surface.css.length) fail(`${CONFIG_FILE}: ${surface.id} lists no stylesheets`);
    for (const sheet of surface.css) {
      if (!existsSync(resolve(ROOT, sheet))) fail(`${CONFIG_FILE}: ${surface.id} stylesheet "${sheet}" does not exist`);
    }
  }

  // A page that loads tokens.css and is not in the manifest would be invisible
  // to every rollup. Catch it here rather than in a review.
  const manifest = config.manifest || {};
  if (manifest.requireTokenCssLink !== false) {
    const listed = new Set(surfaces.map((surface) => surface.page));
    const candidates = [];
    for (const file of readdirSync(ROOT)) if (file.endsWith('.html')) candidates.push(file);
    const dsDir = resolve(ROOT, 'design-system');
    if (existsSync(dsDir)) for (const file of readdirSync(dsDir)) if (file.endsWith('.html')) candidates.push('design-system/' + file);
    candidates.sort(cmp);
    for (const file of candidates) {
      if (listed.has(file)) continue;
      const text = source(file);
      if (/<link[^>]+href\s*=\s*["'](?:[^"']*\/)?tokens\.css["']/.test(text)) {
        fail(`${file} loads tokens.css but has no surface row in ${CONFIG_FILE}`);
      }
    }
  }

  return { config, surfaces };
}

// ---------------------------------------------------------------------------
// Scan
// ---------------------------------------------------------------------------

function scan() {
  const { leaves, byCss, themes } = loadTokens();
  const { config, surfaces } = loadSurfaces();
  const surfaceById = new Map(surfaces.map((surface) => [surface.id, surface]));
  const surfaceIds = surfaces.map((surface) => surface.id);
  const productIds = surfaces.filter((surface) => !surface.docsOnly).map((surface) => surface.id);

  const cssFiles = uniqSorted(surfaces.flatMap((surface) => surface.css));
  const cssSurfaces = new Map(cssFiles.map((file) => [file, surfaces.filter((surface) => surface.css.includes(file)).map((surface) => surface.id)]));
  // ---- tokens: refs and role-map cells -----------------------------------
  const tokenRefs = []; // { token, file, surface|null, surfaces[], line, kind, dynamic }
  const varRefs = []; // every custom-property occurrence, for the totals split
  const refsByFile = new Map();

  const addVar = (name, file, surface, line, kind, dynamic) => {
    varRefs.push({ name, file, line, kind });
    addTo(refsByFile, file);
    if (byCss.has(name)) {
      tokenRefs.push({ token: name, file, surface, surfaces: surface ? [surface] : cssSurfaces.get(file) || [], line, kind, dynamic });
    }
  };

  const classInstances = []; // raw class-name occurrences: { name, file, surface, line, via, dynamic, tag }

  for (const surface of surfaces) {
    const raw = source(surface.page);
    const text = maskComments(raw);
    const starts = lineStarts(raw);
    const ranges = scriptRanges(text);

    for (const match of text.matchAll(VAR_RE)) {
      addVar(match[1], surface.page, surface.id, lineAt(starts, match.index), 'var', false);
    }
    for (const match of text.matchAll(DS_READ_RE)) {
      for (const read of match[1].matchAll(QUOTED_VAR_RE)) {
        addVar(read[1], surface.page, surface.id, lineAt(starts, match.index), 'canvas', true);
      }
    }

    // class="…" — the optional backslash is engine.html's `class=\"ds-drawer\"`
    // inside a template literal; without it, the drawer and its icon button
    // are invisible.
    for (const match of text.matchAll(/\bclass\s*=\s*\\?(["'`])([\s\S]{0,600}?)\\?\1/g)) {
      const value = match[2];
      const tag = tagAt(text, match.index);
      const dynamic = inRanges(ranges, match.index);
      for (const cls of value.matchAll(/(?:^|\s)(ds-[a-z0-9-]+)/g)) {
        classInstances.push({
          name: cls[1],
          file: surface.page,
          surface: surface.id,
          line: lineAt(starts, match.index),
          via: dynamic ? 'template' : 'markup',
          dynamic,
          tag,
        });
      }
    }
    for (const match of text.matchAll(/\bclassList\.(?:add|remove|toggle|contains)\(\s*(['"`])([^'"`]+)\1/g)) {
      const line = lineAt(starts, match.index);
      for (const cls of match[2].matchAll(/(?:^|\s)(ds-[a-z0-9-]+)/g)) {
        classInstances.push({ name: cls[1], file: surface.page, surface: surface.id, line, via: 'classList', dynamic: true, tag: '' });
      }
    }
    for (const match of text.matchAll(/\bclassName\s*=\s*(['"`])([^'"`]*)\1/g)) {
      const line = lineAt(starts, match.index);
      for (const cls of match[2].matchAll(/(?:^|\s)(ds-[a-z0-9-]+)/g)) {
        classInstances.push({ name: cls[1], file: surface.page, surface: surface.id, line, via: 'className', dynamic: true, tag: '' });
      }
    }
    for (const match of text.matchAll(/\bsetAttribute\(\s*(['"])class\1\s*,\s*(['"`])([^'"`]*)\2/g)) {
      const line = lineAt(starts, match.index);
      for (const cls of match[3].matchAll(/(?:^|\s)(ds-[a-z0-9-]+)/g)) {
        classInstances.push({ name: cls[1], file: surface.page, surface: surface.id, line, via: 'setAttribute', dynamic: true, tag: '' });
      }
    }
  }

  for (const file of cssFiles) {
    const raw = source(file);
    const text = maskComments(raw);
    const starts = lineStarts(raw);
    for (const match of text.matchAll(VAR_RE)) {
      addVar(match[1], file, null, lineAt(starts, match.index), 'css', false);
    }
  }

  // ---- components.css: numbered sections + selectors ----------------------
  const componentSource = config.componentSource || 'design-system/components.css';
  const compRaw = source(componentSource);
  const compLines = compRaw.split('\n');

  const sections = [];
  compLines.forEach((line, index) => {
    const match = line.match(/^\/\* (\d+) · (.*?)\s*-{3,}/);
    if (match) sections.push({ n: Number(match[1]), title: match[2].trim(), line: index + 1 });
  });
  sections.sort((a, b) => a.n - b.n);
  sections.forEach((section, index) => {
    section.end = index + 1 < sections.length ? sections[index + 1].line - 1 : compLines.length;
  });
  const sectionAtLine = (line) => sections.find((section) => line > section.line && line <= section.end) || null;

  /** Rules in a stylesheet: selector prelude, its classes (with selectors' own
   *  lines — a prelude may start on a comment line above its selector) and the
   *  numbered block each class selector sits in. */
  function rulesOf(text, starts, file) {
    const rules = [];
    for (let i = 0; i < text.length; i += 1) {
      if (text[i] !== '{') continue;
      let j = i - 1;
      let guard = 0;
      while (j >= 0 && !'{};'.includes(text[j]) && guard < 4000) {
        j -= 1;
        guard += 1;
      }
      const prelude = text.slice(j + 1, i);
      if (!prelude.trim() || prelude.trim().startsWith('@')) continue;
      const classes = [];
      for (const match of prelude.matchAll(/\.(ds-[a-z0-9_-]+)/g)) {
        const line = lineAt(starts, j + 1 + match.index);
        classes.push({ name: match[1], line, section: file === componentSource ? sectionAtLine(line)?.n ?? null : null });
      }
      rules.push({ prelude, line: lineAt(starts, j + 1), classes });
    }
    return rules;
  }

  const cssRules = new Map(); // file -> rules
  for (const file of cssFiles) {
    const raw = source(file);
    cssRules.set(file, rulesOf(maskComments(raw), lineStarts(raw), file));
  }

  // Class selectors per file, and the numbered block a class is styled in.
  const cssClassSites = new Map(); // class -> [{ file, line, section, prelude }]
  for (const [file, rules] of cssRules) {
    for (const rule of rules) {
      for (const site of rule.classes) {
        if (!cssClassSites.has(site.name)) cssClassSites.set(site.name, []);
        cssClassSites.get(site.name).push({ file, line: site.line, section: site.section, prelude: rule.prelude });
      }
    }
  }

  const foldBem = (name) => name.replace(/__(.+)$/, '');
  const definedClasses = new Set(); // base classes styled in components.css
  for (const [name, sites] of cssClassSites) {
    if (!sites.some((site) => site.file === componentSource)) continue;
    definedClasses.add(foldBem(name));
  }
  const baseClasses = new Set(); // structural classes styled in base.css
  for (const [name, sites] of cssClassSites) {
    if (sites.some((site) => site.file === 'design-system/base.css')) baseClasses.add(foldBem(name));
  }

  const rawNames = new Set(classInstances.map((instance) => instance.name));
  const foldName = (name) => {
    const child = name.match(/^(ds-[a-z0-9]+(?:-[a-z0-9]+)*)__(.+)$/);
    if (child) return child[1];
    const modifier = name.match(/^(ds-[a-z0-9]+(?:-[a-z0-9]+)*)--([a-z0-9-]+)$/);
    if (modifier && (definedClasses.has(modifier[1]) || baseClasses.has(modifier[1]) || rawNames.has(modifier[1]))) return modifier[1];
    return name;
  };

  // Block ownership: the first numbered section in which the class is the
  // subject of a selector. A cross-cutting group such as
  // `.ds-btn,.ds-icon-btn,.ds-input,…{…}` names five classes but owns none of
  // them; taking its first section would file the chip and the rail under
  // button. Fall back to any occurrence for a class only ever styled as a
  // descendant (none at present).
  const isPrimary = (prelude, base) => {
    const trimmed = prelude.trim();
    if (!trimmed.startsWith('.' + base)) return false;
    const next = trimmed.charAt(base.length + 1);
    return next === '' || !/[a-z0-9_-]/.test(next);
  };
  const blockOf = new Map();
  for (const [name, sites] of cssClassSites) {
    const base = foldBem(name);
    if (blockOf.has(base)) continue;
    const owned = sites
      .filter((site) => site.file === componentSource && site.section !== null)
      .sort((a, b) => a.line - b.line);
    const primary = owned.find((site) => isPrimary(site.prelude, base));
    if (primary) blockOf.set(base, primary.section);
    else if (owned.length) blockOf.set(base, owned[0].section);
  }

  // ---- token records ------------------------------------------------------
  const refsByToken = new Map();
  for (const ref of tokenRefs) {
    if (!refsByToken.has(ref.token)) refsByToken.set(ref.token, []);
    refsByToken.get(ref.token).push(ref);
  }
  const cellsByToken = new Map();
  for (const cell of loadRoleMapCells(themes)) {
    if (!cellsByToken.has(cell.token)) cellsByToken.set(cell.token, []);
    cellsByToken.get(cell.token).push(cell);
  }
  const aliasedBy = new Map();
  for (const leaf of leaves) {
    if (!leaf.aliasOf || !byCss.has(leaf.aliasOf)) continue;
    if (!aliasedBy.has(leaf.aliasOf)) aliasedBy.set(leaf.aliasOf, []);
    aliasedBy.get(leaf.aliasOf).push(leaf.css);
  }

  const tokens = {};
  for (const leaf of leaves) {
    const refs = refsByToken.get(leaf.css) || [];
    const bySurface = new Map(surfaceIds.map((id) => [id, 0]));
    const markup = new Map(surfaceIds.map((id) => [id, 0]));
    const cssFilesMap = new Map();
    let dynamic = 0;

    for (const ref of refs) {
      if (ref.kind === 'css') {
        addTo(cssFilesMap, ref.file);
        for (const id of ref.surfaces) addTo(bySurface, id);
      } else {
        addTo(bySurface, ref.surface);
        addTo(markup, ref.surface);
        if (ref.dynamic) dynamic += 1;
      }
    }

    const bySurfaceObj = countToObject(bySurface, surfaceIds);
    const productRefCount = productIds.reduce((sum, id) => sum + bySurfaceObj[id], 0);
    const galleryRefs = bySurfaceObj.gallery || 0;
    const refCount = refs.length;

    const usedByBlocks = [...new Set(
      refs
        .filter((ref) => ref.file === componentSource)
        .map((ref) => sectionAtLine(ref.line)?.n)
        .filter((n) => n !== undefined && n !== null),
    )].sort((a, b) => a - b);

    const roleMapCells = (cellsByToken.get(leaf.css) || []).length;
    const reach =
      productRefCount > 0 ? 'product' : galleryRefs > 0 ? 'gallery' : refCount > 0 ? 'css-only' : roleMapCells > 0 ? 'role-map' : 'none';

    tokens[leaf.css] = {
      cssName: leaf.css,
      jsonKey: leaf.key,
      group: leaf.group,
      type: leaf.type,
      value: leaf.value,
      aliasOf: leaf.aliasOf,
      aliasedBy: uniqSorted(aliasedBy.get(leaf.css) || []),
      bySurface: bySurfaceObj,
      direct: countToObject(markup, surfaceIds),
      cssFiles: countToObject(cssFilesMap, [...cssFilesMap.keys()].sort(cmp)),
      roleMapCells,
      usedByBlocks,
      dynamic,
      refs: [...refsByFile.keys()]
        .filter((file) => refs.some((ref) => ref.file === file))
        .sort(cmp)
        .map((file) => ({ file, count: refs.filter((ref) => ref.file === file).length })),
      refCount,
      productRefCount,
      galleryRefs,
      reach,
      hasProductRef: productRefCount > 0,
    };
  }

  // ---- component records --------------------------------------------------
  const recordNames = new Set([...definedClasses, ...baseClasses, ...classInstances.map((instance) => foldName(instance.name))]);

  const PRELUDE_ATTR = {
    variants: /\[data-variant[~*^|$]?=\s*["']?([a-z0-9-]+)/g,
    states: /\[data-state[~*^|$]?=\s*["']?([a-z0-9-]+)/g,
    sizes: /\[data-size[~*^|$]?=\s*["']?([a-z0-9-]+)/g,
    densities: /\[data-ds-density[~*^|$]?=\s*["']?([a-z0-9-]+)/g,
  };
  const TAG_ATTR = {
    variants: /\bdata-variant\s*=\s*(["'])([^"']*)\1/g,
    states: /\bdata-state\s*=\s*(["'])([^"']*)\1/g,
    sizes: /\bdata-size\s*=\s*(["'])([^"']*)\1/g,
    densities: /\bdata-ds-density\s*=\s*(["'])([^"']*)\1/g,
  };
  const PSEUDO_RE = /:(hover|focus-visible|focus-within|focus|active|disabled|checked|open|target|current)\b/g;
  const ARIA_PRELUDE_RE = /\[(aria-[a-z-]+)/g;
  const ARIA_TAG_RE = /\b(aria-[a-z-]+)\s*=/g;

  const components = {};
  for (const name of [...recordNames].sort(cmp)) {
    const instances = classInstances.filter((instance) => foldName(instance.name) === name);
    const bySurface = new Map(surfaceIds.map((id) => [id, 0]));
    const files = new Map();
    let dynamicCount = 0;
    let productDynamic = 0;
    for (const instance of instances) {
      addTo(bySurface, instance.surface);
      addTo(files, instance.file);
      if (instance.dynamic) {
        dynamicCount += 1;
        if (!surfaceById.get(instance.surface)?.docsOnly) productDynamic += 1;
      }
    }
    const bySurfaceObj = countToObject(bySurface, surfaceIds);
    const productInstances = productIds.reduce((sum, id) => sum + bySurfaceObj[id], 0);

    const related = new Set([name]);
    for (const raw of rawNames) if (foldName(raw) === name) related.add(raw);

    const preludes = [];
    for (const cls of related) for (const site of cssClassSites.get(cls) || []) preludes.push(site.prelude);

    const sets = { variants: new Set(), states: new Set(), sizes: new Set(), densities: new Set(), pseudo: new Set(), aria: new Set() };
    for (const prelude of preludes) {
      for (const [kind, regex] of Object.entries(PRELUDE_ATTR)) {
        for (const match of prelude.matchAll(regex)) sets[kind].add(match[1]);
      }
      for (const match of prelude.matchAll(PSEUDO_RE)) sets.pseudo.add(match[1]);
      for (const match of prelude.matchAll(ARIA_PRELUDE_RE)) sets.aria.add(match[1]);
    }
    for (const instance of instances) {
      if (!instance.tag) continue;
      for (const [kind, regex] of Object.entries(TAG_ATTR)) {
        for (const match of instance.tag.matchAll(regex)) sets[kind].add(match[2].trim());
      }
      for (const match of instance.tag.matchAll(ARIA_TAG_RE)) sets.aria.add(match[1]);
    }
    for (const set of Object.values(sets)) for (const value of [...set]) if (!value) set.delete(value);

    const blockNo = blockOf.get(name) || null;
    const block = blockNo ? sections.find((section) => section.n === blockNo) : null;

    components[name] = {
      class: name,
      selector: '.' + name,
      block: blockNo,
      blockTitle: block ? block.title : null,
      kind: definedClasses.has(name) ? 'component' : baseClasses.has(name) ? 'structural' : 'utility',
      defined: definedClasses.has(name),
      instances: instances.length,
      bySurface: bySurfaceObj,
      dynamic: dynamicCount,
      staticInstances: instances.length - dynamicCount,
      productInstances,
      productDynamic,
      productStaticInstances: productInstances - productDynamic,
      galleryInstances: bySurfaceObj.gallery || 0,
      files: [...files.keys()].sort(cmp).map((file) => ({ file, count: files.get(file) })),
      modifiers: uniqSorted(instances.map((instance) => instance.name).filter((raw) => raw !== name)),
      variants: uniqSorted(sets.variants),
      states: uniqSorted(sets.states),
      sizes: uniqSorted(sets.sizes),
      densities: uniqSorted(sets.densities),
      pseudo: uniqSorted(sets.pseudo),
      aria: uniqSorted(sets.aria),
      hasProductInstance: productInstances > 0,
    };
  }

  // ---- blocks rollup ------------------------------------------------------
  const blocks = {};
  for (const section of sections) {
    const classes = Object.values(components)
      .filter((component) => component.block === section.n)
      .map((component) => component.class)
      .sort(cmp);
    const bySurface = new Map(surfaceIds.map((id) => [id, 0]));
    let instances = 0;
    let productInstances = 0;
    for (const cls of classes) {
      const record = components[cls];
      instances += record.instances;
      productInstances += record.productInstances;
      for (const id of surfaceIds) addTo(bySurface, id, record.bySurface[id] || 0);
    }
    blocks[String(section.n)] = {
      n: section.n,
      title: section.title,
      classes,
      instances,
      productInstances,
      bySurface: countToObject(bySurface, surfaceIds),
      hasProductInstance: productInstances > 0,
    };
  }

  // ---- surfaces -----------------------------------------------------------
  const pages = {};
  for (const surface of surfaces) {
    // Stylesheets only this surface loads. Shared sheets are not repeated here:
    // their reach is the per-token `bySurface` rollup, and repeating them would
    // make every product surface look identical.
    const ownCss = surface.css.filter((file) => {
      const ids = cssSurfaces.get(file) || [];
      return ids.length === 1 && ids[0] === surface.id;
    });
    const directTokens = uniqSorted(Object.entries(tokens).filter(([, token]) => (token.direct[surface.id] || 0) > 0).map(([css]) => css));
    const ownCssTokens = uniqSorted(
      Object.entries(tokens)
        .filter(([, token]) => ownCss.some((file) => (token.cssFiles[file] || 0) > 0))
        .map(([css]) => css),
    );
    const tokenSet = uniqSorted([...directTokens, ...ownCssTokens]);
    const surfaceComponents = Object.values(components)
      .filter((component) => (component.bySurface[surface.id] || 0) > 0)
      .map((component) => ({ class: component.class, instances: component.bySurface[surface.id] }))
      .sort((a, b) => b.instances - a.instances || cmp(a.class, b.class));
    const pageRefs = tokenRefs.filter((ref) => ref.file === surface.page);
    const directAll = varRefs.filter((ref) => ref.file === surface.page);

    pages[surface.id] = {
      file: surface.page,
      role: surface.role,
      docsOnly: Boolean(surface.docsOnly),
      stylesheets: surface.css,
      refs: {
        customProperties: directAll.length,
        tokens: directAll.filter((ref) => ref.kind !== 'canvas' && byCss.has(ref.name)).length,
        roleVars: directAll.filter((ref) => !byCss.has(ref.name) && ref.name.startsWith('--ds-')).length,
        localVars: directAll.filter((ref) => !byCss.has(ref.name) && !ref.name.startsWith('--ds-')).length,
        canvas: pageRefs.filter((ref) => ref.kind === 'canvas').length,
      },
      tokens: { count: tokenSet.length, list: tokenSet, direct: directTokens.length, ownCss: ownCssTokens.length },
      components: { count: surfaceComponents.length, instances: surfaceComponents.reduce((sum, row) => sum + row.instances, 0), list: surfaceComponents },
    };
  }

  for (const token of Object.values(tokens)) {
    const pageRefs = Object.values(token.direct).reduce((sum, n) => sum + n, 0);
    const cssRefs = Object.values(token.cssFiles).reduce((sum, n) => sum + n, 0);
    if (pageRefs + cssRefs !== token.refCount) {
      fail(`token ${token.cssName}: ${pageRefs} page + ${cssRefs} css refs do not add up to ${token.refCount}`);
    }
  }
  for (const component of Object.values(components)) {
    const surfaceSum = Object.values(component.bySurface).reduce((sum, n) => sum + n, 0);
    const fileSum = component.files.reduce((sum, row) => sum + row.count, 0);
    if (surfaceSum !== component.instances || fileSum !== component.instances) {
      fail(`component ${component.class}: surface/file splits ${surfaceSum}/${fileSum} do not add up to ${component.instances}`);
    }
  }

  for (const id of surfaceIds) {
    const r = pages[id].refs;
    const sum = r.tokens + r.roleVars + r.localVars + r.canvas;
    if (sum !== r.customProperties) {
      fail(`surface ${id} ref split sums to ${sum}, page total is ${r.customProperties}`);
    }
  }

  // ---- counts + ledgers ---------------------------------------------------
  const tokenList = Object.values(tokens);
  const componentList = Object.values(components);

  // Grouped zero-product ledger. Precedence: gallery reach, then a breakpoint
  // (a criterion, not a consumer), then an unreferenced alias, then a theme-map
  // cell with no var() anywhere, then anything else.
  const zeroProductTokens = tokenList.filter((token) => !token.hasProductRef);
  const groups = { galleryOnly: [], roleMapOnly: [], breakpoint: [], aliasUnreferenced: [], unreferenced: [] };
  for (const token of zeroProductTokens) {
    if (token.reach === 'gallery') groups.galleryOnly.push(token);
    else if (token.group === 'breakpoint') groups.breakpoint.push(token);
    else if (token.aliasOf) groups.aliasUnreferenced.push(token);
    else if (token.reach === 'role-map') groups.roleMapOnly.push(token);
    else if (token.reach === 'none') groups.unreferenced.push(token);
    else groups.galleryOnly.push(token); // css-only that is not gallery-only cannot happen; keep the total honest
  }
  const groupedTotal = Object.values(groups).reduce((sum, list) => sum + list.length, 0);
  if (groupedTotal !== zeroProductTokens.length) {
    fail(`zero-product ledger covers ${groupedTotal} tokens, expected ${zeroProductTokens.length}`);
  }

  const zeroBlocks = Object.values(blocks).filter((block) => !block.hasProductInstance);
  const zeroClasses = componentList.filter((component) => !component.hasProductInstance);
  const structuralKinds = new Set(['structural', 'utility']);

  const kindCounts = { token: 0, roleVar: 0, localVar: 0, canvas: 0 };
  const localDetail = { componentLocal: 0, pageAlias: 0 };
  for (const ref of varRefs) {
    if (ref.kind === 'canvas') kindCounts.canvas += 1;
    else if (byCss.has(ref.name)) kindCounts.token += 1;
    else if (ref.name.startsWith('--ds-')) kindCounts.roleVar += 1;
    else {
      kindCounts.localVar += 1;
      if (ref.name.startsWith('--_')) localDetail.componentLocal += 1;
      else localDetail.pageAlias += 1;
    }
  }
  const tokenRefsByFile = {};
  for (const file of [...new Set(tokenRefs.map((ref) => ref.file))].sort(cmp)) {
    tokenRefsByFile[file] = tokenRefs.filter((ref) => ref.file === file).length;
  }

  const counts = {
    surfaces: surfaces.length,
    productSurfaces: productIds.length,
    tokens: tokenList.length,
    tokensWithProductRefs: tokenList.filter((token) => token.hasProductRef).length,
    tokensWithoutProductRefs: zeroProductTokens.length,
    tokensGalleryOnly: groups.galleryOnly.length,
    tokensRoleMapOnly: groups.roleMapOnly.length,
    tokensBreakpointNoRef: groups.breakpoint.length,
    tokensAliasNoRef: groups.aliasUnreferenced.length,
    tokensNoRef: tokenList.filter((token) => token.refCount === 0).length,
    tokensAlias: tokenList.filter((token) => token.aliasOf).length,
    customPropertyRefs: varRefs.length,
    customPropertyRefsByKind: kindCounts,
    localVarDetail: localDetail,
    tokenRefs: tokenRefs.length,
    tokenRefsByFile,
    refsByFile: Object.fromEntries([...refsByFile.keys()].sort(cmp).map((file) => [file, refsByFile.get(file)])),
    canvasReads: kindCounts.canvas,
    components: componentList.length,
    componentsStyled: componentList.filter((component) => component.defined).length,
    componentsWithProductInstances: componentList.filter((component) => component.hasProductInstance).length,
    componentsStyledWithProductInstances: componentList.filter((component) => component.defined && component.hasProductInstance).length,
    componentsWithoutProductInstances: zeroClasses.length,
    componentsWithoutProductInstancesStyled: zeroClasses.filter((component) => !structuralKinds.has(component.kind)).length,
    componentInstances: componentList.reduce((sum, component) => sum + component.instances, 0),
    componentInstancesProduct: componentList.reduce((sum, component) => sum + component.productInstances, 0),
    componentInstancesDynamic: componentList.reduce((sum, component) => sum + component.dynamic, 0),
    componentInstancesBySurface: Object.fromEntries(surfaceIds.map((id) => [id, componentList.reduce((sum, component) => sum + (component.bySurface[id] || 0), 0)])),
    blocks: Object.keys(blocks).length,
    blocksWithProductInstances: Object.values(blocks).filter((block) => block.hasProductInstance).length,
    blocksWithoutProductInstances: zeroBlocks.length,
  };

  // Self-checks: headline facts must agree with their own ledgers.
  if (counts.tokensWithProductRefs + counts.tokensWithoutProductRefs !== counts.tokens) {
    fail('token ledger does not partition the token set');
  }
  if (counts.componentsWithProductInstances + counts.componentsWithoutProductInstances !== counts.components) {
    fail('component ledger does not partition the component set');
  }
  const surfaceTotal = Object.values(counts.componentInstancesBySurface).reduce((sum, n) => sum + n, 0);
  if (surfaceTotal !== counts.componentInstances) {
    fail(`component surface split sums to ${surfaceTotal}, total is ${counts.componentInstances}`);
  }

  const tokenRefTotalKind = kindCounts.token + kindCounts.roleVar + kindCounts.localVar + kindCounts.canvas;
  if (tokenRefTotalKind !== counts.customPropertyRefs) {
    fail(`custom-property kind split sums to ${tokenRefTotalKind}, total is ${counts.customPropertyRefs}`);
  }

  return {
    config,
    surfaces,
    surfaceIds,
    productIds,
    cssFiles,
    cssSurfaces,
    componentSource,
    sections,
    tokens,
    components,
    blocks,
    pages,
    counts,
    tokenRefs,
    classInstances,
    groups,
    foldName,
  };
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

function buildDocument(model) {
  const { config, surfaces, cssFiles, componentSource, tokens, components, blocks, pages, counts, groups } = model;

  return {
    $schema: 'ds-usage/1',
    generator: 'scripts/build-usage.mjs',
    deterministic: 'no timestamps, no line numbers, stable key order; two consecutive runs are byte-identical',
    method: {
      scan: 'static scan of the four surfaces (page markup, markup authored in JS template strings, stylesheets) plus tokens.json',
      componentSource,
      stylesheets: cssFiles,
      tokenRefs: 'var(--x) in a page or stylesheet; plus quoted custom-property reads inside CT(…), WA(…) and getPropertyValue(…) calls — those are counted in `dynamic`',
      componentInstances: 'ds-* names in class="…" attributes (including escaped markup inside JS template strings, flagged dynamic), classList.add/remove/toggle/contains, className =, setAttribute(\'class\', …)',
      quarantine: 'a docsOnly surface and any stylesheet only it loads are counted but never contribute to productRefCount',
      attribution: 'a shared stylesheet ref counts once per surface that links the sheet, so productRefCount is reach and may exceed refCount',
      aliasEdges: 'aliasOf is the token this value points at; aliasedBy lists tokens that point at this one',
      counts: 'bySurface is reach (page refs plus stylesheet refs attributed to every surface that links the sheet); direct is page-source refs only; cssFiles is stylesheet refs per file; productRefCount sums bySurface over non-docsOnly surfaces',
      blockOwnership: 'a component belongs to the first numbered section of components.css in which it is the subject of a selector, not a member of a shared :is(…) group',
      blindSpots: [
        'Authored occurrences, not DOM nodes: one template that renders N rows counts once.',
        'Class names built by concatenation (`\'ds-\' + kind`) are not resolvable statically.',
        'Runtime style.setProperty(\'--x\', …) writes are invisible; the scan reads literals only.',
        'A var() inside a @media width query is invalid CSS and cannot appear; breakpoints are criteria, not consumers.',
        'CSS refs are attributed to every surface loading the stylesheet, including refs that only matter under @media print.',
      ],
    },
    counts,
    surfaces: surfaces.map((surface) => ({
      id: surface.id,
      page: surface.page,
      role: surface.role,
      docsOnly: Boolean(surface.docsOnly),
      css: surface.css,
    })),
    tokens,
    components,
    blocks,
    pages,
    ledgers: {
      tokensWithoutProductRefs: {
        galleryOnly: groups.galleryOnly.map((token) => token.cssName),
        roleMapOnly: groups.roleMapOnly.map((token) => token.cssName),
        breakpoint: groups.breakpoint.map((token) => token.cssName),
        aliasUnreferenced: groups.aliasUnreferenced.map((token) => token.cssName),
        unreferenced: groups.unreferenced.map((token) => token.cssName),
        // Direct-ref ledger only: a token here can still repaint the product
        // through a theme-map cell → --ds-* role, which components.css uses.
        roleMapped: Object.values(tokens)
          .filter((token) => !token.hasProductRef && token.roleMapCells > 0)
          .map((token) => token.cssName)
          .sort(cmp),
      },
      componentsWithoutProductInstances: {
        blocks: Object.values(blocks)
          .filter((block) => !block.hasProductInstance)
          .map((block) => ({ block: block.n, title: block.title, classes: block.classes, galleryInstances: block.bySurface.gallery || 0 })),
        classes: Object.values(components)
          .filter((component) => !component.hasProductInstance)
          .map((component) => ({ class: component.class, kind: component.kind, galleryInstances: component.galleryInstances })),
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Markdown
// ---------------------------------------------------------------------------

const code = (text) => '`' + text + '`';
const pct = (part, whole) => (whole === 0 ? '0%' : Math.round((part / whole) * 100) + '%');

function table(headers, rows) {
  const lines = ['| ' + headers.join(' | ') + ' |', '|' + headers.map(() => '---').join('|') + '|'];
  for (const row of rows) lines.push('| ' + row.join(' | ') + ' |');
  return lines;
}

function renderMarkdown(doc) {
  const { counts, pages, ledgers, surfaces } = doc;
  const lines = [];
  const push = (...items) => lines.push(...items);

  push('# Usage index — product → design system', '');
  push('> Generated by `node scripts/build-usage.mjs` — do not edit by hand.');
  push('> Regenerating is the only way to change it; `node scripts/build-usage.mjs --check`');
  push('> fails when this file or `usage.json` disagrees with the pages and stylesheets.');
  push('');
  push('Surfaces: ' + surfaces.map((surface) => code(surface.page) + (surface.docsOnly ? ' (gallery, quarantined)' : '')).join(' · ') + '.');
  push('');

  push('## Totals', '');
  push(...table(['measure', 'value'], [
    ['surfaces', String(counts.surfaces) + ' (' + counts.productSurfaces + ' product + ' + (counts.surfaces - counts.productSurfaces) + ' quarantined)'],
    ['tokens defined', String(counts.tokens)],
    ['tokens with a product ref', String(counts.tokensWithProductRefs)],
    ['tokens with no product ref', String(counts.tokensWithoutProductRefs)],
    ['custom-property refs', String(counts.customPropertyRefs)],
    ['… token / role-var `--ds-*` / local / canvas read',
      [counts.customPropertyRefsByKind.token, counts.customPropertyRefsByKind.roleVar, counts.customPropertyRefsByKind.localVar, counts.customPropertyRefsByKind.canvas].join(' / ')],
    ['… local split: component `--_*` / page alias',
      [counts.localVarDetail.componentLocal, counts.localVarDetail.pageAlias].join(' / ')],
    ['component records', String(counts.components) + ' (' + counts.componentsStyled + ' styled in components.css)'],
    ['component instances', String(counts.componentInstances) + ' (' + counts.componentInstancesProduct + ' product, ' + (counts.componentInstances - counts.componentInstancesProduct) + ' gallery)'],
    ['… authored in JS (flagged dynamic)', String(counts.componentInstancesDynamic)],
    ['numbered blocks', String(counts.blocks) + ' (' + counts.blocksWithProductInstances + ' with a product instance)'],
  ]));
  push('');

  push('## Tokens with no product reference (' + counts.tokensWithoutProductRefs + ')', '');
  push('A gallery swatch proves a token renders; it does not prove a product uses it.');
  push('None of these has a direct reference from a product page or product stylesheet,');
  push('grouped by why:', '');
  const tokenRow = (label, list, note) => [label, String(list.length), note, list.length ? list.map(code).join(', ') : '—'];
  push(...table(['group', 'count', 'what it means', 'tokens'], [
    tokenRow('gallery-only', ledgers.tokensWithoutProductRefs.galleryOnly, 'referenced by the gallery page or a gallery-only stylesheet'),
    tokenRow('role-map only', ledgers.tokensWithoutProductRefs.roleMapOnly, 'referenced by a theme-map cell, by no var() anywhere'),
    tokenRow('breakpoint', ledgers.tokensWithoutProductRefs.breakpoint, 'a media-query criterion; var() is invalid there'),
    tokenRow('alias, unreferenced', ledgers.tokensWithoutProductRefs.aliasUnreferenced, 'a var(--alias) definition nothing references'),
    tokenRow('unreferenced', ledgers.tokensWithoutProductRefs.unreferenced, 'defined, never read'),
  ]));
  const roleMapped = ledgers.tokensWithoutProductRefs.roleMapped;
  if (roleMapped.length) {
    push('');
    push(String(roleMapped.length) + ' of these back a theme-map cell (' + roleMapped.map(code).join(', ') + '):');
    push('they can still repaint a product through the `--ds-*` role those cells feed, so read');
    push('"no direct ref" literally. Role indirection is the workbench lane, not this index.');
  }
  push('');

  push('## Components with no product instance (' + counts.blocksWithoutProductInstances + ' of ' + counts.blocks + ' blocks)', '');
  push('A block can be documented, styled and exercised in the gallery while no product screen renders it.', '');
  const zeroBlockRows = ledgers.componentsWithoutProductInstances.blocks.map((block) => [
    String(block.block),
    block.title,
    block.classes.map(code).join(' '),
    String(block.galleryInstances),
  ]);
  if (zeroBlockRows.length) push(...table(['block', 'title', 'classes', 'gallery instances'], zeroBlockRows));
  else push('Every numbered block has at least one product instance.');
  push('');
  const classOnly = ledgers.componentsWithoutProductInstances.classes.filter((row) => row.kind === 'component');
  if (classOnly.length) {
    push('At class level, ' + classOnly.length + ' styled records have no product instance: ' +
      classOnly.map((row) => code('.' + row.class) + ' (' + row.galleryInstances + ' gallery)').join(', ') + '.');
    push('');
  }
  const utilityZero = ledgers.componentsWithoutProductInstances.classes.filter((row) => row.kind !== 'component');
  if (utilityZero.length) {
    push('Structural and utility records with no product instance: ' + utilityZero.map((row) => code('.' + row.class) + ' (' + row.galleryInstances + ' gallery)').join(', ') + '.');
    push('');
  }

  push('## Per-surface consumption', '');
  for (const surface of surfaces) {
    const page = pages[surface.id];
    const top = page.components.list.slice(0, 10);
    push('### ' + surface.id + ' — ' + code(surface.page) + ' (' + surface.role + (surface.docsOnly ? ', quarantined' : '') + ')', '');
    push(String(page.components.instances) + ' component instances, ' + String(page.refs.customProperties) + ' custom-property refs in the page source, ' +
      String(page.tokens.count) + ' tokens named by the page and by stylesheets only it loads (' +
      String(page.tokens.direct) + ' direct, ' + String(page.tokens.ownCss) + ' from its own sheets).');
    push('');
    if (top.length) {
      push(...table(['component', 'instances', 'share of surface'], top.map((row) => [code('.' + row.class), String(row.instances), pct(row.instances, page.components.instances)])));
      if (page.components.list.length > top.length) push('', 'Showing 10 of ' + page.components.list.length + ' components.');
    } else {
      push('No component instances.');
    }
    push('');
  }

  push('## How this is computed', '');
  push('- **Surfaces** come from `design-system/surfaces.json`. A page that links `tokens.css`');
  push('  without a surface row fails the build, so a new surface cannot be invisible.');
  push('- **Committed HEAD.** Scanned sources are read with `git show HEAD:<path>`, following');
  push('  `build-foundations.mjs`: a lane mid-edit on a page cannot drift this file, and it');
  push('  describes the commit CI checks out. Commit the change, then regenerate.');
  push('- **Quarantine.** `docsOnly: true` on the gallery means its refs are counted but never');
  push('  contribute to `productRefCount`; a stylesheet only the gallery loads is treated the same');
  push('  way. This is the same rule as `lint-tokens.mjs` T8, so the two gates agree on zero-consumer tokens.');
  push('- **Token refs** are `var(--x)` plus quoted reads inside `CT(…)`, `WA(…)` and');
  push('  `getPropertyValue(…)` calls. A string read carries `dynamic: true`: the value is resolved');
  push('  by a script at runtime (the engine canvas, two gallery probes), not by the cascade alone.');
  push('- **Components** are `ds-*` names in `class="…"` (including markup authored inside JS');
  push('  template strings), `classList.add/remove/toggle/contains`, `className =` and');
  push('  `setAttribute(\'class\', …)`. Anything authored in JS is flagged `dynamic`.');
  push('- **Instances are authored occurrences, not DOM nodes.** A template that renders one row per');
  push('  group counts once; runtime multiplicity is not guessed. That under-count is visible here.');
  push('- **Shared stylesheets** are attributed to every surface that links them, so `productRefCount`');
  push('  is reach, not occurrences — it can exceed `refCount`. Per-surface token sets count only what');
  push('  the page names plus sheets only that surface loads; shared reach lives in `bySurface`.');
  push('- **Blocks** come from the numbered `/* N · … */` sections of `components.css`; a class belongs');
  push('  to the first section where it is the subject of a selector, not a member of a shared');
  push('  `:is(…)` group. Classes styled only in `base.css` are `structural`; markup-only classes');
  push('  are `utility`, and `.ds-icon` is the one utility with no rule of its own.');
  push('- **No line numbers and no timestamps** are stored, so ordinary edits do not churn the file.');
  push('  `node scripts/build-usage.mjs --lines` prints a file:line drill-down for debugging.');
  push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Diff summary for --check
// ---------------------------------------------------------------------------

function diffCounts(oldCounts, newCounts, out) {
  for (const key of Object.keys(newCounts)) {
    if (!(key in oldCounts)) continue;
    const before = oldCounts[key];
    const after = newCounts[key];
    if (JSON.stringify(before) === JSON.stringify(after)) continue;
    const bothObjects = before && after && typeof before === 'object' && typeof after === 'object';
    if (!bothObjects) {
      out.push(`counts.${key}: ${JSON.stringify(before)} → ${JSON.stringify(after)}`);
      continue;
    }
    for (const sub of Object.keys(after)) {
      if (JSON.stringify(before[sub]) !== JSON.stringify(after[sub])) {
        out.push(`counts.${key}.${sub}: ${JSON.stringify(before[sub] ?? 0)} → ${JSON.stringify(after[sub])}`);
      }
    }
  }
}

function describeDiff(oldDoc, newDoc, oldMd, newMd, jsonDiffers) {
  const out = [];
  const detail = [];
  diffCounts(oldDoc.counts || {}, newDoc.counts, detail);

  const oldTokens = oldDoc.tokens || {};
  const newTokens = newDoc.tokens;
  const removed = Object.keys(oldTokens).filter((key) => !(key in newTokens)).sort(cmp);
  const added = Object.keys(newTokens).filter((key) => !(key in oldTokens)).sort(cmp);
  if (removed.length) detail.push(`tokens removed: ${removed.slice(0, 6).join(', ')}${removed.length > 6 ? ` (+${removed.length - 6} more)` : ''}`);
  if (added.length) detail.push(`tokens added: ${added.slice(0, 6).join(', ')}${added.length > 6 ? ` (+${added.length - 6} more)` : ''}`);
  for (const key of Object.keys(newTokens).sort(cmp)) {
    const before = oldTokens[key];
    if (!before) continue;
    const after = newTokens[key];
    for (const field of ['refCount', 'productRefCount', 'galleryRefs', 'roleMapCells', 'dynamic']) {
      if ((before[field] ?? 0) !== (after[field] ?? 0)) detail.push(`token ${key} ${field}: ${before[field] ?? 0} → ${after[field] ?? 0}`);
    }
    for (const surface of Object.keys(after.bySurface || {})) {
      if ((before.bySurface?.[surface] ?? 0) !== (after.bySurface[surface] ?? 0)) {
        detail.push(`token ${key} bySurface.${surface}: ${before.bySurface?.[surface] ?? 0} → ${after.bySurface[surface] ?? 0}`);
      }
    }
  }

  const oldComponents = oldDoc.components || {};
  const newComponents = newDoc.components;
  const removedComponents = Object.keys(oldComponents).filter((key) => !(key in newComponents)).sort(cmp);
  const addedComponents = Object.keys(newComponents).filter((key) => !(key in oldComponents)).sort(cmp);
  if (removedComponents.length) detail.push(`components removed: ${removedComponents.slice(0, 6).join(', ')}`);
  if (addedComponents.length) detail.push(`components added: ${addedComponents.slice(0, 6).join(', ')}`);
  for (const key of Object.keys(newComponents).sort(cmp)) {
    const before = oldComponents[key];
    if (!before) continue;
    const after = newComponents[key];
    for (const field of ['instances', 'productInstances', 'dynamic', 'block']) {
      if ((before[field] ?? null) !== (after[field] ?? null)) detail.push(`component ${key} ${field}: ${before[field] ?? '—'} → ${after[field] ?? '—'}`);
    }
    for (const surface of Object.keys(after.bySurface || {})) {
      if ((before.bySurface?.[surface] ?? 0) !== (after.bySurface[surface] ?? 0)) {
        detail.push(`component ${key} bySurface.${surface}: ${before.bySurface?.[surface] ?? 0} → ${after.bySurface[surface] ?? 0}`);
      }
    }
  }

  const oldPages = oldDoc.pages || {};
  for (const key of Object.keys(newDoc.pages).sort(cmp)) {
    const before = oldPages[key];
    if (!before) continue;
    const after = newDoc.pages[key];
    if ((before.components?.instances ?? 0) !== (after.components?.instances ?? 0)) {
      detail.push(`surface ${key} component instances: ${before.components?.instances ?? 0} → ${after.components?.instances ?? 0}`);
    }
    if ((before.tokens?.count ?? 0) !== (after.tokens?.count ?? 0)) {
      detail.push(`surface ${key} tokens consumed: ${before.tokens?.count ?? 0} → ${after.tokens?.count ?? 0}`);
    }
    if ((before.refs?.customProperties ?? 0) !== (after.refs?.customProperties ?? 0)) {
      detail.push(`surface ${key} page refs: ${before.refs?.customProperties ?? 0} → ${after.refs?.customProperties ?? 0}`);
    }
  }

  out.push(jsonDiffers ? 'usage.json differs from a fresh build.' : 'usage.json is current; usage.md is stale.');
  if (detail.length) out.push(...detail.slice(0, 40).map((line) => '  ' + line));
  if (detail.length > 40) out.push(`  … ${detail.length - 40} more changes`);

  if (oldMd !== newMd) {
    const before = oldMd.split('\n');
    const after = newMd.split('\n');
    let first = -1;
    for (let i = 0; i < Math.max(before.length, after.length); i += 1) {
      if (before[i] !== after[i]) {
        first = i;
        break;
      }
    }
    out.push(`usage.md differs (${Buffer.byteLength(oldMd, 'utf8')} B on disk, ${Buffer.byteLength(newMd, 'utf8')} B rendered)`);
    if (first !== -1) {
      out.push(`  first diff at line ${first + 1}`);
      out.push(`    on disk:  ${JSON.stringify(before[first] ?? '<missing>')}`);
      out.push(`    rendered: ${JSON.stringify(after[first] ?? '<missing>')}`);
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// --lines drill-down
// ---------------------------------------------------------------------------

function printLines(model) {
  const { tokens, components } = model;
  const tokenFilter = FILTER.token ? (FILTER.token.startsWith('--') ? FILTER.token : '--' + FILTER.token) : null;
  const componentFilter = FILTER.component ? FILTER.component.replace(/^\./, '') : null;
  const numeric = (list) => [...new Set(list)].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  if (!componentFilter || tokenFilter) {
    console.log('TOKENS (file:line)');
    let tokenCount = 0;
    for (const [css, token] of Object.entries(tokens).sort((a, b) => cmp(a[0], b[0]))) {
      if (tokenFilter && css !== tokenFilter) continue;
      const refs = model.tokenRefs.filter((ref) => ref.token === css);
      if (!refs.length && !tokenFilter) continue;
      tokenCount += 1;
      const byFile = new Map();
      for (const ref of refs) {
        if (!byFile.has(ref.file)) byFile.set(ref.file, []);
        byFile.get(ref.file).push(String(ref.line) + (ref.kind === 'canvas' ? '~' : ''));
      }
      console.log(`${css}  (refs ${token.refCount}, product ${token.productRefCount}, dynamic ${token.dynamic})`);
      for (const file of [...byFile.keys()].sort(cmp)) console.log(`  ${file}:${numeric(byFile.get(file)).join(',')}`);
    }
    if (!tokenCount) console.log('  (none)');
    if (!componentFilter) return;
    console.log('');
  }

  console.log('COMPONENTS (file:line)');
  let componentCount = 0;
  for (const [name, component] of Object.entries(components).sort((a, b) => cmp(a[0], b[0]))) {
    if (componentFilter && name !== componentFilter) continue;
    const instances = model.classInstances.filter((instance) => model.foldName(instance.name) === name);
    if (!instances.length && !componentFilter) continue;
    componentCount += 1;
    const byFile = new Map();
    for (const instance of instances) {
      if (!byFile.has(instance.file)) byFile.set(instance.file, []);
      byFile.get(instance.file).push(String(instance.line) + (instance.dynamic ? '~' : ''));
    }
    console.log(`.${name}  (instances ${component.instances}, product ${component.productInstances}, dynamic ${component.dynamic})`);
    for (const file of [...byFile.keys()].sort(cmp)) console.log(`  ${file}:${numeric(byFile.get(file)).join(',')}`);
  }
  if (!componentCount) console.log('  (none)');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const model = scan();
const doc = buildDocument(model);
const json = JSON.stringify(doc, null, 2) + '\n';
const markdown = renderMarkdown(doc);

if (MODE.lines) {
  printLines(model);
  process.exit(0);
}

if (MODE.print) {
  process.stdout.write(json);
  process.exit(0);
}

const summary = [
  `Totals: ${doc.counts.tokens} tokens (${doc.counts.tokensWithProductRefs} with a product ref, ${doc.counts.tokensWithoutProductRefs} without); ` +
    `${doc.counts.customPropertyRefs} custom-property refs (${doc.counts.customPropertyRefsByKind.canvas} canvas reads); ` +
    `${doc.counts.components} components (${doc.counts.componentsStyled} styled) with ${doc.counts.componentInstances} instances, ${doc.counts.componentInstancesProduct} on product surfaces; ` +
    `${doc.counts.blocks} blocks (${doc.counts.blocksWithoutProductInstances} with no product instance)`,
];

if (MODE.check) {
  const jsonAbs = resolve(ROOT, JSON_OUT);
  const mdAbs = resolve(ROOT, MD_OUT);
  if (!existsSync(jsonAbs) || !existsSync(mdAbs)) {
    console.error(`FAIL: ${JSON_OUT} or ${MD_OUT} does not exist; run node scripts/build-usage.mjs`);
    process.exit(1);
  }
  const oldJson = readFileSync(jsonAbs, 'utf8');
  const oldMd = readFileSync(mdAbs, 'utf8');
  if (oldJson !== json || oldMd !== markdown) {
    let oldDoc = {};
    try {
      oldDoc = JSON.parse(oldJson);
    } catch (err) {
      console.error(`FAIL: ${JSON_OUT} is not valid JSON — ${err.message}`);
      process.exit(1);
    }
    console.error(describeDiff(oldDoc, doc, oldMd, markdown, oldJson !== json).join('\n'));
    console.error(`  Regenerate: node scripts/build-usage.mjs`);
    process.exit(1);
  }
  if (!MODE.quiet) {
    console.log(`OK: ${JSON_OUT} and ${MD_OUT} match the pages and stylesheets byte-for-byte`);
    for (const line of summary) console.log(line);
  } else {
    console.log('OK: usage index up to date');
  }
  process.exit(0);
}

writeFileSync(resolve(ROOT, JSON_OUT), json, 'utf8');
writeFileSync(resolve(ROOT, MD_OUT), markdown, 'utf8');
console.log(`Wrote ${JSON_OUT} (${Buffer.byteLength(json, 'utf8')} B) and ${MD_OUT} (${Buffer.byteLength(markdown, 'utf8')} B)`);
for (const line of summary) console.log(line);
