#!/usr/bin/env node
/* ==========================================================================
   lint-tokens.mjs — token-adherence gate v2 (zero dependencies)
   --------------------------------------------------------------------------
   tokens.css is the only place a raw paint / motion / z / radius / border /
   spacing / type value may live. Pages consume var(--token). This script
   proves it, per file, per line, and audits the token set itself.

   Classes
     V1 color            V5 inline paint        T1  raw font-size (incl. the
     V2 motion           V6 svg paint               `font:` shorthand size)
     V3 z-index          V7 border width        T2  raw line-height (incl. the
     V4 radius           V8 spacing                 `font:` shorthand leading)
     U1 dead var()                              T3  raw letter-spacing
                                                T4  raw font-weight / literal family
                                                T6  raw px in an @media width query
                                                T8  token with 0 consumers
                                                T9  two role names, one value
                                                T10 role contract parity
                                                T11 `type` ↔ `value` shape
                                                T13 duplicate alias value in one :root
                                                T14 `!important`
                                                T15 inline `style=` attribute

   The page classes (V1–V8, U1, T1–T15) judge the four HTML surfaces plus the
   token set. C1–C6 judge the shared component layer that landed in Phase 2 and
   the static contract every page must keep:

     C1 raw value in base.css / components.css (structural whitelist + a
        per-value allow table carrying a reason and a ceiling)
     C2 duplicate selector in one HTML file, keyed by selector + at-scope
        (media/supports/container) + nesting
     C3 an element with aria-modal also carries role="dialog" and one of
        aria-label / aria-labelledby
     C4 a .ds-* class is defined (top level) in two stylesheet sources
     C5 every `<use href="…svg#id">` names a symbol that file declares
     C6 no hex / rgb() / hsl() literal in components.js or icons.svg

   C2 is measured on the committed HEAD blob of each page, not the worktree:
   page lanes hold uncommitted edits, and a gate that bakes a neighbour's
   half-finished markup is a gate that lies. CI checks out HEAD, so there the
   two are the same file. Every other class reads the worktree.

   T8/T9/T10/T11 judge the token set, not a page; T13/T15 are per file. T8
   counts a `var()` reference from a product page, a `themes` map cell or
   `components.css` — a gallery swatch is documentation, not consumption. T9
   keeps the token-set duplicate check and adds a per-theme role check (two
   slots in one map, one family, one primitive). T10 asserts the 14-slot
   contract across all four maps, nulls included, and the emitted blocks. T6
   (raw `@media` width px) is enforced: a width query must equal a
   `breakpoint.*` value from tokens.json or carry a same-line reason, because
   `var()` is invalid in a media prelude. T7 (raw width/height) remains Phase 1
   and deliberately absent.

   Budgets
   Every class carries the exact count measured on 2026-11-24 as an explicit
   ceiling (BUDGETS below). A count at or under budget is PASS; only the
   excess is a violation, so the gate is green on day one and every regression
   fails. U1 is a budget class on the same loop (budget 0 per file): a dead
   `var()` is enforced, not merely tabulated. `--check` exits 1 when any class
   exceeds its budget, when a token `type`/`value` mismatch appears, or when an
   exemption is invalid.

   Usage:
     node scripts/lint-tokens.mjs           human tables + writes audit-report.md
     node scripts/lint-tokens.mjs --check   human tables only; exit 1 on failure

   Exit code: 0 = green, 1 = over budget / dead var() / invalid exemption, 2 =
   a required source file is missing.

   Exemptions — same line only, reason required, at least 8 chars. Written in
   the file's own comment syntax (CSS block comment, JS line comment, HTML
   comment), immediately on the flagged line:

     z-index:61   <-- CSS comment: lint-allow: no z token holds 61
     ...;         <-- JS  comment: lint-allow: popover must clear --z-overlay
     <meta ...>   <-- HTML comment: lint-allow: theme-color cannot read custom properties

   The marker clears every hit on its own line (V1..V8, U1) and nothing else.
   A marker with no reason, or with the reason "ok", exempts nothing and is
   reported BAD-ALLOW, so it cannot be used to blanket-suppress silently.
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const TOKENS_CSS = path.join(ROOT, 'design-system', 'tokens.css');
const TOKENS_JSON = path.join(ROOT, 'design-system', 'tokens.json');
const REPORT = path.join(ROOT, 'design-system', 'audit-report.md');

/* ---------------------------------------------------------------- budgets */
/* Measured 2026-11-24 against the committed tree, post Phase-1B stage 5 (the
   186-key retirement). A budget is a ceiling, not a target: counts may fall
   freely, only the excess fails `--check`. V1–V8 are budgeted on the same loop
   as U1/T1–T15 — they used to be tabulated and never compared, so a new raw
   paint value was invisible to `--check`. V3 is the one exception in the tree:
   `design-system/index.html:424` keeps `z-index:-1` on `#probe-host` (a 1×1
   fixed off-screen frame that measures a clipped page copy; no z token holds
   −1 and the frame must stay out of the paint order), so V3 carries an explicit
   budget of 1, per-file. Any second raw z-index anywhere fails. T4 is split
   (weight + literal family) because one class covers two properties; T15 is per
   file so styles cannot migrate into the largest page unnoticed.
   Every figure below is the measured post-retirement count, not an estimate:
   T8 9 — 2 canvas-read track keys are invisible to a `var()` counter, and 7
   tokens are consumed only by the gallery and docs until the page lanes wire
   them (components.css took `opacity.disabled` when it landed, and the
   navigation rewrite retired `layout.sidebar.wiki`, `layout.sidebar.pitch` and
   `spacing.section`, which is why the Phase 1 figure of 11 is now 9; the
   pinned surface switcher then retired `layout.bar.engine`, whose last
   consumer — engine's 62px mobile strip — became the shared drawer); T9 0
   because the 106 retired keys took
   the last duplicate role values with them; T15 147 because 53 inline swatch
   styles left with their rows. */
const BUDGETS = {
  V1: 0, V2: 0, V3: 1, V4: 0, V5: 0, V6: 0, V7: 0, V8: 0, U1: 0,
  T1: 10,
  T2: 32,
  T3: 21,
  T4w: 22,
  T4f: 2,
  T6: 5,
  T8: 9,
  T9: 0,
  T10: 0,
  T11: 0,
  T13: 0,
  T14: 8,
  T15: 147,
};
/* A budget above 0 is a decision, and it has to say why on every run. */
const BUDGET_NOTES = {
  V3: 'design-system/index.html:424 z-index:-1 on #probe-host — a 1x1 fixed, off-screen, opacity:0 measurement frame copied from the page one clipped 1440 frame at a time; no z token holds -1 and rounding it to --z-base (0) would put the measurement copy into the page paint order',
  T6: 'the 4 pitch.html width queries (768 ×3, 901) are deferred with Task 12 — pitch.html is under foreign editing and cannot be touched; the 1 gallery query (640 in the swatch preview) stays raw. index/engine carry budget 0 each',
  T8: '2 canvas-only + 7 gallery/doc: color.engine.track.fx and color.engine.track.title are read through CT() strings in engine.html (a var() counter cannot see a string argument); color.engine.track.audio, elevation.float, elevation.inset, elevation.ring, icon.size.lg, radius.lg and tracking.label are rendered only by the gallery ladder or named only in docs, and their product wiring belongs to Phase 3 — recorded, not hidden. The navigation rewrite retired layout.sidebar.wiki, layout.sidebar.pitch and spacing.section (13 → 10); the pinned surface switcher retired layout.bar.engine, whose last consumer was the engine 62px mobile strip, now the shared drawer (10 → 9)',
};
/* Per-file share of each budget, measured on the same run. Enforcing the share
   as well as the total means a fix on one page cannot pay for a regression on
   another, and an over-budget row points at the file that grew. The shares sum
   to the totals above. */
const BUDGET_SEED = {
  V3: { 'index.html': 0, 'pitch.html': 0, 'engine.html': 0, 'design-system/index.html': 1 },
  T1: { 'index.html': 3, 'pitch.html': 3, 'engine.html': 2, 'design-system/index.html': 2 },
  T2: { 'index.html': 0, 'pitch.html': 2, 'engine.html': 17, 'design-system/index.html': 13 },
  T3: { 'index.html': 1, 'pitch.html': 6, 'engine.html': 10, 'design-system/index.html': 4 },
  T4w: { 'index.html': 0, 'pitch.html': 0, 'engine.html': 22, 'design-system/index.html': 0 },
  T4f: { 'index.html': 0, 'pitch.html': 0, 'engine.html': 2, 'design-system/index.html': 0 },
  T6: { 'index.html': 0, 'pitch.html': 4, 'engine.html': 0, 'design-system/index.html': 1 },
  T14: { 'index.html': 2, 'pitch.html': 5, 'engine.html': 1, 'design-system/index.html': 0 },
  T15: { 'index.html': 19, 'pitch.html': 31, 'engine.html': 2, 'design-system/index.html': 95 },
};

/* ------------------------------------------------------------------ targets */

const PRODUCT_FILES = ['index.html', 'pitch.html', 'engine.html'];
const targets = [...PRODUCT_FILES];
const dsDir = path.join(ROOT, 'design-system');
if (fs.existsSync(dsDir)) {
  for (const name of fs.readdirSync(dsDir).sort()) {
    if (name.endsWith('.html')) targets.push(path.join('design-system', name));
  }
}

const files = targets
  .map((rel) => ({ rel, abs: path.join(ROOT, rel) }))
  .filter((f) => fs.existsSync(f.abs));

if (!fs.existsSync(TOKENS_CSS)) {
  console.error('FATAL: design-system/tokens.css not found — cannot build the token set.');
  process.exit(2);
}

/* ------------------------------------------------------------- token set */

/* Only the `:root` block is the token set. The generated `[data-ds-theme]`
   blocks live in the same file and declare --ds-* roles; counting them as
   tokens would invent ~24 orphans on every run. */
function rootBlock(text) {
  const at = text.indexOf(':root');
  if (at === -1) return '';
  const open = text.indexOf('{', at);
  if (open === -1) return '';
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(open + 1, i);
    }
  }
  return '';
}

const tokensText = fs.readFileSync(TOKENS_CSS, 'utf8');
const rootBody = rootBlock(tokensText);
const defined = new Set();
for (const m of rootBody.matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)) defined.add(m[1]);

/* The role contract: `themes` is a sibling of the token map, never a token. */
const THEME_ATTRIBUTE = 'data-ds-theme';
const THEME_NAMES = ['pitch', 'wiki-light', 'wiki-dark', 'engine'];
const THEME_SLOTS = [
  'bg.page', 'bg.surface', 'bg.surface.alt', 'bg.control', 'bg.accent.soft',
  'fg.primary', 'fg.secondary', 'fg.muted', 'fg.faint', 'fg.on.accent',
  'line.default', 'line.strong', 'accent', 'status',
];
const STATUS_KEYS = ['success', 'warning', 'danger', 'info'];
const ROLE_VAR_COUNT = 17;

/* tokens.json is the source of truth for role identity and declared type;
   T9, T10 and T11 read it, the pages never do. */
let tokenEntries = [];
let themes = null;
if (!fs.existsSync(TOKENS_JSON)) {
  console.error('FATAL: design-system/tokens.json not found — cannot audit the token set.');
  process.exit(2);
}
try {
  const parsed = JSON.parse(fs.readFileSync(TOKENS_JSON, 'utf8'));
  const { themes: themeContract, ...tokenMap } = parsed;
  themes = themeContract ?? null;
  tokenEntries = Object.entries(tokenMap).map(([name, spec]) => ({
    name,
    type: String(spec && spec.type || 'other'),
    value: String(spec && spec.value || ''),
  }));
} catch (err) {
  console.error(`FATAL: design-system/tokens.json is not valid JSON — ${err.message}`);
  process.exit(2);
}

/** dotted token key -> emitted custom property name (no leading --) */
function cssName(dotted) {
  return String(dotted)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
    .replace(/\./g, '-');
}

function refsIn(value) {
  const out = [];
  for (const m of String(value ?? '').matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)) out.push(m[1]);
  return out;
}

/* A theme cell is a consumer: it is the reason a primitive exists even when no
   page names it directly. The gallery is still not a consumer. */
const themeRefs = new Set();
if (themes && themes.maps && typeof themes.maps === 'object') {
  for (const map of Object.values(themes.maps)) {
    if (!map || typeof map !== 'object') continue;
    for (const cell of Object.values(map)) {
      if (typeof cell === 'string') for (const r of refsIn(cell)) themeRefs.add(r);
      else if (cell && typeof cell === 'object') {
        for (const v of Object.values(cell)) for (const r of refsIn(v)) themeRefs.add(r);
      }
    }
  }
}

/* components.css does not exist yet (Phase 2); absence is zero consumers, not
   an error. When it lands, its var() refs count exactly like a page's. */
const COMPONENTS_CSS = path.join(ROOT, 'design-system', 'components.css');
const componentRefs = new Set();
if (fs.existsSync(COMPONENTS_CSS)) {
  for (const r of refsIn(fs.readFileSync(COMPONENTS_CSS, 'utf8'))) componentRefs.add(r);
}

/* shell.css is the linked-last shared shell: every product page loads it, so
   its var() refs prove product consumption exactly like a page's (the
   canonical-shell pass moved the thrice-repeated axis calc here). */
const SHELL_CSS = path.join(ROOT, 'design-system', 'shell.css');
const shellRefs = new Set();
if (fs.existsSync(SHELL_CSS)) {
  for (const r of refsIn(fs.readFileSync(SHELL_CSS, 'utf8'))) shellRefs.add(r);
}

/* Aliases (`value: var(--other)`) and breakpoints can never be consumed by a
   product page — an alias IS a pointer, and `var()` is invalid in @media. */
const aliasNames = new Set(
  tokenEntries
    .filter((t) => /^var\(/i.test(t.value.trim()))
    .map((t) => `--${cssName(t.name)}`),
);
const breakpointNames = new Set(
  tokenEntries.filter((t) => t.name.startsWith('breakpoint.')).map((t) => `--${cssName(t.name)}`),
);
/* T6 compares a raw `@media` width against the breakpoint scale. `var()` is
   invalid in a media prelude, so equality with the token's resolved px value is
   the only honest proof that a query and the token agree. Alias breakpoints
   (`breakpoint.xl = var(--…)`) are followed to their target;
   a breakpoint declared in rem/em simply never matches a px query. */
const breakpointPx = new Set();
{
  const byName = new Map(tokenEntries.map((t) => [`--${cssName(t.name)}`, String(t.value).trim()]));
  const resolve = (value, seen = new Set()) => {
    const m = String(value).match(/^var\(\s*(--[A-Za-z0-9_-]+)\s*\)$/);
    if (!m) return String(value).trim();
    if (seen.has(m[1])) return '';
    seen.add(m[1]);
    return resolve(byName.get(m[1]) ?? '', seen);
  };
  for (const t of tokenEntries) {
    if (!t.name.startsWith('breakpoint.')) continue;
    const px = resolve(t.value).match(/^(\d*\.?\d+)px$/i);
    if (px) breakpointPx.add(Number(px[1]));
  }
}

/* Width features only: `print`, `(pointer:coarse)` and a preference query hold
   no breakpoint. Classic `(min-width:…)` and the range form `(width >= …)` are
   both read, because both are one decision about a length. */
function widthFeatures(prelude) {
  const out = [];
  for (const m of prelude.matchAll(/\(\s*(?:min|max)-width\s*:\s*([^)]*)\)/gi)) {
    out.push({ value: m[1].trim(), index: m.index + m[0].indexOf(m[1]) });
  }
  for (const m of prelude.matchAll(/\(\s*width\s*(?:<=|>=|<|>)\s*([^)]*)\)/gi)) {
    out.push({ value: m[1].trim(), index: m.index });
  }
  for (const m of prelude.matchAll(/\(\s*([^()<>=\s]+)\s*(?:<=|>=|<|>)\s*width\s*\)/gi)) {
    out.push({ value: m[1].trim(), index: m.index });
  }
  return out;
}

/* --------------------------------------------------------------- helpers */

function lineStarts(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  return starts;
}

function lineOf(starts, offset) {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1; // 1-based
}

function maskRanges(chars, ranges) {
  for (const [start, end] of ranges) {
    const stop = Math.min(end, chars.length);
    for (let i = start; i < stop; i++) if (chars[i] !== '\n') chars[i] = ' ';
  }
}

function rangesOf(text, re) {
  const out = [];
  for (const m of text.matchAll(re)) out.push([m.index, m.index + m[0].length]);
  return out;
}

/* ------------------------------------------------------------ exemptions */

/* A marker must be a real comment opener, so prose that merely mentions the
   mechanism can never exempt code:
     CSS   slash-star  lint-allow: reason  star-slash
     JS    slash-slash lint-allow: reason
     HTML  less-than-bang-dash-dash  lint-allow: reason  dash-dash-greater
   The reason runs to the comment terminator (or end of line for //). */
const MARKER_RE = /(?:\/\*|\/\/|<!--)\s*lint-allow\s*:\s*([^\n]*)/;
const MIN_REASON = 8;
const THROWAWAY = new Set(['ok', 'okay', 'fine', 'todo', 'xx', 'n/a', 'na', 'test', 'skip']);

function markerFor(lineText) {
  const m = lineText.match(MARKER_RE);
  if (!m) return null;
  let reason = m[1];
  const cut = reason.search(/\*\/|-->/);
  if (cut !== -1) reason = reason.slice(0, cut);
  reason = reason.replace(/\s+/g, ' ').trim();
  const valid = reason.length >= MIN_REASON && !THROWAWAY.has(reason.toLowerCase());
  return { reason, valid };
}

/* mark the same line only — a marker never reaches the next line */
function lineMarkersOf(text, starts) {
  return starts.map((start, i) => {
    const end = i + 1 < starts.length ? starts[i + 1] - 1 : text.length;
    return markerFor(text.slice(start, end));
  });
}

/* var(...) spans, including nested fallbacks */
function varSpans(text) {
  const spans = [];
  const re = /\bvar\(/g;
  let m;
  while ((m = re.exec(text))) {
    let depth = 0;
    let i = m.index + 3; // at "("
    for (; i < text.length; i++) {
      if (text[i] === '(') depth++;
      else if (text[i] === ')') {
        depth--;
        if (depth === 0) {
          i++;
          break;
        }
      }
    }
    spans.push([m.index, i]);
    re.lastIndex = i;
  }
  return spans;
}

function callSpans(text, name) {
  const out = [];
  const re = new RegExp(`\\b${name}\\(`, 'g');
  let m;
  while ((m = re.exec(text))) {
    let depth = 0;
    let i = m.index + name.length;
    for (; i < text.length; i++) {
      if (text[i] === '(') depth++;
      else if (text[i] === ')') {
        depth--;
        if (depth === 0) {
          i++;
          break;
        }
      }
    }
    out.push([m.index, i]);
    re.lastIndex = i;
  }
  return out;
}

const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\s*\(/g;
const SVG_PAINT_RE = /\b(fill|stroke|stop-color)\s*=\s*(["'])(#[0-9a-fA-F]{3,8})\2/gi;
const STYLE_ATTR_RE = /\bstyle\s*=\s*(["'])([\s\S]*?)\1/gi;
const DECL_RE = (prop) => new RegExp(`(?<![-\\w])${prop}\\s*:\\s*([^;}]*)`, 'gi');

const DURATION_RE = /(?:^|[^\w.])(?:\d*\.?\d+)(?:ms|s)(?![\w])/i;
const RADIUS_UNIT_RE = /(?:\d*\.?\d+)(?:px|%|rem|em|vw|vh|vmin|vmax)\b/i;
const LENGTH_RE = /(?:^|[^\w.-])(?:\d*\.?\d+)(?:px|rem|em|%|pt|vw|vh|vmin|vmax|ch|ex)\b/i;
const SIZE_KEYWORD_RE = /^(?:xx-small|x-small|small|medium|large|x-large|xx-large|smaller|larger)$/i;
const FONT_SYSTEM_RE = /^(?:caption|icon|menu|message-box|small-caption|status-bar)$/i;
const FONT_INHERIT_RE = /^(?:inherit|initial|unset|revert|revert-layer)$/i;
const FAMILY_LITERAL_RE = /(?:system-ui|-apple-system|ui-monospace|sans-serif|serif|monospace|cursive|fantasy)\b/i;
const STEP_NAME_RE = /^(?:base|2xs|xs|sm|md|lg|xl|2xl|\d+)$/;

/* A declaration value with every var()/env()/calc() call removed, so a number
   that only exists inside a token reference is not mistaken for a literal. */
function literalRemainder(value) {
  let out = value;
  for (const [s, e] of [...callSpans(out, 'var'), ...callSpans(out, 'env')]) {
    out = out.slice(0, s) + ' ' + out.slice(e);
  }
  return out.replace(/!important/gi, ' ').trim();
}

/* `font:` shorthand → its size and leading components.
   Returns null for the inherit family and the system-font keywords, which
   carry no size. */
function fontShorthand(value) {
  const val = value.trim();
  if (!val || FONT_INHERIT_RE.test(val) || FONT_SYSTEM_RE.test(val)) return null;
  const slash = val.indexOf('/');
  const before = (slash === -1 ? val : val.slice(0, slash)).trim();
  const tokens = before.split(/\s+/).filter(Boolean);
  const size = tokens.length ? tokens[tokens.length - 1] : '';
  const after = slash === -1 ? '' : val.slice(slash + 1).trim();
  const leading = after ? after.split(/\s+/)[0] : '';
  return { size, leading };
}

/* Minimal selector/declaration block reader: records every leaf block with its
   own selector, its parent at-rule selector and the absolute body offset. */
function declBlocks(css) {
  const blocks = [];
  const stack = [];
  let start = 0;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === '{') {
      stack.push({ selStart: start, open: i });
      start = i + 1;
    } else if (ch === '}') {
      const top = stack.pop();
      if (!top) {
        start = i + 1;
        continue;
      }
      const body = css.slice(top.open + 1, i);
      if (!body.includes('{')) {
        let sel = css.slice(top.selStart, top.open).replace(/\s+/g, ' ').trim();
        /* the scan starts at the top of an HTML file, so the first selector in
           a <style> block arrives with the tag and any text before it: cut back
           to the last markup/declaration boundary */
        if (sel.includes('<')) sel = sel.slice(sel.lastIndexOf('>') + 1).trim();
        if (sel.includes(';')) sel = sel.slice(sel.lastIndexOf(';') + 1).trim();
        if (sel.includes('}')) sel = sel.slice(sel.lastIndexOf('}') + 1).trim();
        let parent = '';
        if (stack.length) {
          parent = css.slice(stack[stack.length - 1].selStart, stack[stack.length - 1].open).replace(/\s+/g, ' ').trim();
          if (parent.includes('<')) parent = parent.slice(parent.lastIndexOf('>') + 1).trim();
          if (parent.includes(';')) parent = parent.slice(parent.lastIndexOf(';') + 1).trim();
        }
        /* the full at-scope/nesting chain, outermost first — C2 keys a
           duplicate on selector + scope, so `.mrail` inside
           `@media(max-width:900px)` is not the same rule as a top-level one */
        const scope = stack.map((ancestor) => {
          let text = css.slice(ancestor.selStart, ancestor.open).replace(/\s+/g, ' ').trim();
          if (text.includes('<')) text = text.slice(text.lastIndexOf('>') + 1).trim();
          if (text.includes(';')) text = text.slice(text.lastIndexOf(';') + 1).trim();
          if (text.includes('}')) text = text.slice(text.lastIndexOf('}') + 1).trim();
          return text;
        });
        blocks.push({ sel, parent, scope, body, offset: top.open + 1 });
      }
      start = i + 1;
    }
  }
  return blocks;
}

function customProps(body, base = 0) {
  const out = [];
  for (const m of body.matchAll(/(--[A-Za-z0-9_-]+)\s*:\s*([^;}]*)/g)) {
    out.push({ name: m[1], value: m[2].replace(/\s+/g, ' ').trim(), offset: base + m.index });
  }
  return out;
}

/* T11 — one regex per declared type. `other` is not in the table on purpose:
   the 24 untyped tokens are Phase 2 work, and the gate must not claim a shape
   it was never given. */
const TYPE_SHAPE = {
  color: (v) => /^#[0-9a-f]{3,8}$/i.test(v) || /^(?:rgb|rgba|hsl|hsla|oklch|color-mix)\(/i.test(v),
  dimension: (v) =>
    v === '0' ||
    /^-?\d*\.?\d+(?:px|rem|em|%|vw|vh|vmin|vmax|ch|ex|pt)$/i.test(v) ||
    /^(?:min|max|clamp|calc)\(/i.test(v),
  fontSize: (v) =>
    /^-?\d*\.?\d+(?:px|rem|em|%|vw|vh|pt)$/i.test(v) || /^(?:clamp|min|max|calc)\(/i.test(v),
  lineHeight: (v) => /^-?\d*\.?\d+$/.test(v) || /^\d*\.?\d+(?:px|rem|em|%)$/i.test(v),
  letterSpacing: (v) => v === '0' || /^-?\d*\.?\d+(?:em|rem|px|%)$/i.test(v),
  fontWeight: (v) => /^(?:normal|bold|[1-9]\d{0,2}|1000)$/i.test(v),
  fontFamily: (v) => /[a-z]/i.test(v) && !v.includes(';'),
  duration: (v) => /^\d*\.?\d+m?s$/i.test(v),
  cubicBezier: (v) => /^(?:cubic-bezier|steps|linear)\(/i.test(v) || /^(?:ease|ease-in|ease-out|ease-in-out|step-start|step-end)$/i.test(v),
  boxShadow: (v) => v === 'none' || /(?:^|\s)inset(?:\s|$)/i.test(v) || /\d(?:px|rem|em)\b/i.test(v),
  shadow: (v) => v === 'none' || /(?:^|\s)inset(?:\s|$)/i.test(v) || /\d(?:px|rem|em)\b/i.test(v),
  number: (v) => /^-?\d*\.?\d+$/.test(v),
};

function short(str, max = 96) {
  const s = String(str).replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

/* full color call text for rgb()/rgba()/hsl()/hsla() so each report row is identifiable */
function colorSnippet(src, offset, token) {
  if (!token.endsWith('(')) return token;
  let depth = 0;
  let end = offset;
  const limit = Math.min(src.length, offset + 80);
  for (; end < limit; end++) {
    if (src[end] === '(') depth++;
    else if (src[end] === ')') {
      depth--;
      if (depth === 0) {
        end++;
        break;
      }
    }
  }
  return short(src.slice(offset, end), 60);
}

/* ------------------------------------------------------------------ scan */

const results = [];
const productRefs = new Set();

for (const file of files) {
  const text = fs.readFileSync(file.abs, 'utf8');
  const starts = lineStarts(text);

  /* mask comments first (CSS block comments + HTML comments) */
  const commentRanges = [
    ...rangesOf(text, /\/\*[\s\S]*?\*\//g),
    ...rangesOf(text, /<!--[\s\S]*?-->/g),
  ];
  const maskedChars = text.split('');
  maskRanges(maskedChars, commentRanges);
  const masked = maskedChars.join('');

  /* helpers that need the comment-masked text */
  const spans = varSpans(masked);
  const styleAttrs = [];
  for (const m of masked.matchAll(STYLE_ATTR_RE)) {
    const quote = m[1];
    const value = m[2];
    const valueStart = m.index + m[0].indexOf(quote) + 1;
    styleAttrs.push({ start: valueStart, end: valueStart + value.length, value });
  }
  const svgPaint = [];
  for (const m of masked.matchAll(SVG_PAINT_RE)) {
    svgPaint.push({ start: m.index, end: m.index + m[0].length, attr: m[1], value: m[3] });
  }
  const urlRanges = [
    ...rangesOf(masked, /\b(?:href|src|xlink:href)\s*=\s*(["'])[^"']*\1/gi),
    ...rangesOf(masked, /\burl\([^)]*\)/gi),
  ];

  /* HTML text nodes (prose) are documentation, not consumption: a mention of
     `var(--mut)` or `#fff` inside a <p> is not CSS. Mask text outside
     <style>/<script> so the gate only judges code. */
  const codeRanges = [
    ...rangesOf(text, /<style\b[^>]*>[\s\S]*?<\/style>/gi),
    ...rangesOf(text, /<script\b[^>]*>[\s\S]*?<\/script>/gi),
  ];
  const textRanges = [];
  {
    let i = 0;
    while (i < text.length) {
      const inCode = codeRanges.find(([s, e]) => i >= s && i < e);
      if (inCode) {
        i = inCode[1];
        continue;
      }
      if (text[i] === '>') {
        const lt = text.indexOf('<', i + 1);
        if (lt === -1) break;
        textRanges.push([i + 1, lt]);
        i = lt;
      } else {
        i++;
      }
    }
  }

  /* declarations are read from script/style blocks and style attributes, with
     HTML prose masked — a sentence mentioning `font-size:15px` is not code */
  const codeChars = masked.split('');
  maskRanges(codeChars, textRanges);
  const codeText = codeChars.join('');

  /* color scan sees everything except fallbacks, inline style values,
     SVG paint attributes, comments, URL/hash references and prose */
  const colorChars = masked.split('');
  maskRanges(colorChars, spans);
  maskRanges(colorChars, styleAttrs.map((s) => [s.start, s.end]));
  maskRanges(colorChars, svgPaint.map((s) => [s.start, s.end]));
  maskRanges(colorChars, urlRanges);
  maskRanges(colorChars, commentRanges);
  maskRanges(colorChars, textRanges);
  const colorText = colorChars.join('');

  const violations = []; // {class, line, col, found, note}
  const push = (cls, offset, found, note) => {
    const line = lineOf(starts, offset);
    const lineStart = starts[line - 1];
    const lineEnd = line < starts.length ? starts[line] - 1 : text.length;
    violations.push({
      cls,
      line,
      col: offset - lineStart + 1,
      found: short(found, 80),
      context: short(text.slice(lineStart, lineEnd), 110),
      note,
    });
  };

  /* V1 — raw color */
  for (const m of colorText.matchAll(COLOR_RE)) {
    push('V1', m.index, colorSnippet(colorText, m.index, m[0]), 'raw color');
  }
  /* dedupe identical offset (rgb( + nested?) impossible; keep guard anyway */
  {
    const seen = new Set();
    for (let i = violations.length - 1; i >= 0; i--) {
      const k = violations[i].cls + ':' + violations[i].line + ':' + violations[i].col;
      if (seen.has(k)) violations.splice(i, 1);
      else seen.add(k);
    }
  }

  /* V2 — raw duration / cubic-bezier inside transition / animation */
  for (const prop of ['transition', 'animation']) {
    for (const m of masked.matchAll(DECL_RE(prop))) {
      const value = m[1];
      if (value.includes('<') || value.length > 400) continue;
      if (DURATION_RE.test(value) || /cubic-bezier\(/i.test(value)) {
        const cb = value.match(/cubic-bezier\([^)]*\)/i);
        const dur = value.match(/(?:^|[^\w.])((?:\d*\.?\d+)(?:ms|s))(?![\w])/i);
        const offender = cb ? cb[0] : dur ? dur[1] : value.trim();
        push('V2', m.index, `${prop}:${offender}`, 'raw motion');
      }
    }
  }

  /* V3 — raw z-index */
  for (const m of masked.matchAll(/(?<![-\w])z-index\s*:\s*(-?\d+)\b/gi)) {
    push('V3', m.index, `z-index:${m[1]}`, 'raw z-index');
  }

  /* V4 — raw radius (style-attr radii belong to V5) */
  for (const m of masked.matchAll(DECL_RE('border-radius'))) {
    const value = m[1];
    if (value.includes('<') || value.length > 200) continue;
    const inStyleAttr = styleAttrs.some((s) => m.index >= s.start && m.index < s.end);
    if (inStyleAttr) continue;
    if (spans.some(([s, e]) => m.index >= s && m.index < e)) continue;
    const stripped = value.replace(/\bvar\([^)]*\)/g, '').replace(/!important/gi, '').trim();
    const hasVar = /\bvar\(/.test(value);
    const isZero = !hasVar && /^0(?:\s+0)*$/.test(stripped);
    if (RADIUS_UNIT_RE.test(stripped) || isZero) {
      push('V4', m.index, `border-radius:${short(value, 60)}`, isZero ? 'raw radius (0)' : 'raw radius');
    }
  }

  /* V5 — inline style= attributes carrying paint */
  for (const s of styleAttrs) {
    const value = s.value;
    const reasons = [];
    if (COLOR_RE.test(value)) reasons.push('color');
    COLOR_RE.lastIndex = 0;
    const rm = value.match(/border-radius\s*:\s*([^;]*)/i);
    if (rm) {
      const v = rm[1].replace(/\bvar\([^)]*\)/g, '').trim();
      if (RADIUS_UNIT_RE.test(v) || /^0(?:\s+0)*$/.test(v)) reasons.push('radius');
    }
    if (reasons.length) {
      push('V5', s.start, short(`style="${value}"`, 90), 'inline paint: ' + reasons.join('+'));
    }
  }

  /* V6 — SVG paint attributes */
  for (const s of svgPaint) push('V6', s.start, short(`${s.attr}="${s.value}"`, 60), 'svg paint');

  /* V7 — raw border width: a border shorthand/side whose width is a px number
     instead of var(--border-width-*). Color, style and 0/none are other
     concerns (V1 for paint; border-collapse / border-spacing are not widths). */
  {
    for (const prop of ['border', 'border-top', 'border-right', 'border-bottom', 'border-left']) {
      for (const m of codeText.matchAll(DECL_RE(prop))) {
        const value = m[1];
        if (value.includes('<') || value.length > 300) continue;
        const w = value.match(/(?<![\w.-])\d*\.?\d+px(?![\w-])/);
        if (w) push('V7', m.index, `${prop}:${short(value, 60)}`, 'raw border width');
      }
    }
  }

  /* V8 — raw spacing: padding / margin / gap must resolve to a spacing step.
     Only rhythm is judged; width/height/top/left/inset/transform/grid-template
     are geometry and stay out. 0, auto and percentages carry no unit; a var()
     fallback and an env() safe-area inset are not spacing picks, so numbers
     inside those calls are skipped. calc() arithmetic is still rhythm. */
  {
    const SPACING_PROPS = [
      'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
      'padding-block', 'padding-inline', 'padding-block-start', 'padding-block-end',
      'padding-inline-start', 'padding-inline-end',
      'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
      'margin-block', 'margin-inline', 'margin-block-start', 'margin-block-end',
      'margin-inline-start', 'margin-inline-end',
      'gap', 'row-gap', 'column-gap',
    ];
    for (const prop of SPACING_PROPS) {
      const re = new RegExp(`(?<![-\\w])${prop}\\s*:\\s*([^;}"]*)`, 'gi');
      for (const m of codeText.matchAll(re)) {
        const value = m[1];
        if (value.includes('<') || value.length > 300) continue;
        const skip = [...callSpans(value, 'env'), ...varSpans(value)];
        for (const n of value.matchAll(/(?<![\w.#-])-?\d*\.?\d+(?:px|rem|em)\b/g)) {
          if (skip.some(([s, e]) => n.index >= s && n.index < e)) continue;
          push('V8', m.index, `${prop}:${short(value, 46)}`, 'raw spacing');
          break;
        }
      }
    }
  }

  /* ---------------------------------------------- v2 budgeted checks ---- */
  /* These hits are budgeted, not "must be zero": each class is compared with
     BUDGETS after exemptions, and only the excess fails. A same-line
     lint-allow marker works here exactly as it does for V1–V8. */
  const budgetHits = {
    T1: [], T2: [], T3: [], T4w: [], T4f: [], T6: [], T13: [], T14: [], T15: [],
  };
  const hit = (cls, offset, found, note) => {
    const line = lineOf(starts, offset);
    budgetHits[cls].push({
      cls,
      line,
      col: offset - starts[line - 1] + 1,
      found: short(found, 80),
      context: short(text.slice(starts[line - 1], line < starts.length ? starts[line] - 1 : text.length), 110),
      note,
    });
  };

  /* T1 — raw font-size, and the size half of a `font:` shorthand.
     T2 — raw line-height, and the leading half of a `font:` shorthand. */
  for (const m of codeText.matchAll(DECL_RE('font-size'))) {
    const value = m[1];
    if (value.includes('<') || value.length > 300) continue;
    const rest = literalRemainder(value);
    if (!rest) continue;
    const last = rest.split(/\s+/).pop();
    if (LENGTH_RE.test(rest) || SIZE_KEYWORD_RE.test(last)) {
      hit('T1', m.index, `font-size:${short(value, 46)}`, 'raw font-size');
    }
  }
  for (const m of codeText.matchAll(DECL_RE('font'))) {
    const value = m[1];
    if (value.includes('<') || value.length > 400) continue;
    const parts = fontShorthand(value);
    if (!parts) continue;
    if (LENGTH_RE.test(parts.size) || SIZE_KEYWORD_RE.test(parts.size)) {
      hit('T1', m.index, `font:${short(value, 64)}`, 'raw size in font shorthand');
    }
    if (parts.leading && /^-?\d*\.?\d+(?:px|rem|em|%)?$/.test(parts.leading)) {
      hit('T2', m.index, `font:${short(value, 64)}`, 'raw leading in font shorthand');
    }
    if (FAMILY_LITERAL_RE.test(literalRemainder(value))) {
      hit('T4f', m.index, `font:${short(value, 64)}`, 'literal family stack');
    }
  }
  for (const m of codeText.matchAll(DECL_RE('line-height'))) {
    const value = m[1];
    if (value.includes('<') || value.length > 200) continue;
    const rest = literalRemainder(value);
    if (!rest || /^(?:normal|inherit|initial|unset|revert)$/i.test(rest)) continue;
    if (/^-?\d*\.?\d+(?:px|rem|em|%)?$/.test(rest)) {
      hit('T2', m.index, `line-height:${short(value, 46)}`, 'raw line-height');
    }
  }
  /* T3 — raw letter-spacing */
  for (const m of codeText.matchAll(DECL_RE('letter-spacing'))) {
    const value = m[1];
    if (value.includes('<') || value.length > 200) continue;
    const rest = literalRemainder(value);
    if (!rest || /^(?:normal|inherit|initial|unset|revert)$/i.test(rest)) continue;
    if (/^-?\d*\.?\d+(?:em|rem|px|%)?$/.test(rest)) {
      hit('T3', m.index, `letter-spacing:${short(value, 46)}`, 'raw letter-spacing');
    }
  }
  /* T4 — raw font-weight, and a literal family stack in `font-family:` */
  for (const m of codeText.matchAll(DECL_RE('font-weight'))) {
    const value = m[1];
    if (value.includes('<') || value.length > 200) continue;
    const rest = literalRemainder(value);
    if (/^\d{3}$/.test(rest) || /^(?:normal|bold|bolder|lighter)$/i.test(rest)) {
      hit('T4w', m.index, `font-weight:${short(value, 46)}`, 'raw font-weight');
    }
  }
  for (const m of codeText.matchAll(DECL_RE('font-family'))) {
    const value = m[1];
    if (value.includes('<') || value.length > 400) continue;
    const rest = literalRemainder(value);
    if (!rest || /^(?:inherit|initial|unset|revert)$/i.test(rest)) continue;
    if (/[a-z]/i.test(rest)) {
      hit('T4f', m.index, `font-family:${short(value, 64)}`, 'literal family stack');
    }
  }

  /* T6 — a raw px width in a @media prelude. `var()` cannot appear in a media
     condition, so the query has to restate the number; it passes only when
     that number IS a breakpoint token's value, or when the same line carries a
     `lint-allow` reason for the one-off. The prelude is read from the
     comment-masked text, so the reason itself never hides the query. */
  for (const m of masked.matchAll(/@media([^{]*)\{/gi)) {
    const prelude = m[1];
    const base = m.index + m[0].indexOf(prelude);
    for (const f of widthFeatures(prelude)) {
      const px = f.value.match(/^(\d*\.?\d+)px$/i);
      if (px && breakpointPx.has(Number(px[1]))) continue;
      hit('T6', base + f.index, `@media width:${short(f.value, 30)}`, 'raw @media px (no breakpoint match)');
    }
  }

  /* T13 — duplicate alias value in one :root. An alias (`var(--other)`) is a
     pointer, not a second truth, so it is skipped: only two literal values are
     a duplicate. Theme role blocks are generated and own their own duplicates
     (T10), so they are not scanned here. */
  const blocks = declBlocks(codeText);
  for (const b of blocks) {
    if (b.sel !== ':root') continue;
    const props = customProps(b.body, b.offset).filter((p) => !/^var\(/i.test(p.value));
    const byValue = new Map();
    for (const p of props) {
      if (!byValue.has(p.value)) byValue.set(p.value, []);
      byValue.get(p.value).push(p);
    }
    for (const [value, group] of byValue) {
      if (group.length < 2) continue;
      for (let i = 1; i < group.length; i++) {
        hit('T13', group[i].offset, `${group[0].name} ≡ ${group[i].name} → ${short(value, 40)}`, 'duplicate alias value');
      }
    }
  }

  /* T14 — !important, T15 — inline style= attribute */
  for (const m of codeText.matchAll(/!important\b/g)) {
    hit('T14', m.index, '!important', 'important');
  }
  for (const s of styleAttrs) {
    hit('T15', s.start, `style="${short(s.value, 70)}"`, 'inline style attribute');
  }

  /* counts (not V-classes) */
  const varChars = masked.split('');
  maskRanges(varChars, textRanges);
  const varText = varChars.join('');
  const varUses = [...varText.matchAll(/\bvar\(\s*--/g)].length;

  /* dead var() references: used but neither in tokens.css nor declared here */
  const localDecls = new Set();
  for (const m of masked.matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)) localDecls.add(m[1]);
  for (const m of masked.matchAll(/setProperty\(\s*(["'])(--[A-Za-z0-9_-]+)\1/g)) localDecls.add(m[2]);
  const allDefined = new Set([...defined, ...localDecls]);
  const deadVars = [];
  const deadSeen = new Set();
  for (const m of varText.matchAll(/\bvar\(\s*(--[A-Za-z0-9_-]+)/g)) {
    const name = m[1];
    if (allDefined.has(name)) continue;
    const line = lineOf(starts, m.index);
    const key = line + ':' + name;
    if (deadSeen.has(key)) continue;
    deadSeen.add(key);
    deadVars.push({ line, name, col: m.index - starts[line - 1] + 1 });
  }

  /* -------- exemptions: same line, reason required, V1..V6 + U1 -------- */
  const lineMarkers = lineMarkersOf(text, starts);
  const exempt = [];
  const badAllows = [];
  const badLines = new Map(); // line -> {reason, classes:Set} — one BAD-ALLOW per line
  const noteBad = (line, cls, reason) => {
    if (!badLines.has(line)) badLines.set(line, { line, reason, classes: new Set() });
    badLines.get(line).classes.add(cls);
  };

  const keptViolations = [];
  for (const v of violations) {
    const mk = lineMarkers[v.line - 1];
    if (!mk) keptViolations.push(v);
    else if (mk.valid) exempt.push({ ...v, reason: mk.reason });
    else {
      keptViolations.push({ ...v, badAllow: mk.reason });
      noteBad(v.line, v.cls, mk.reason);
    }
  }
  const keptDead = [];
  for (const d of deadVars) {
    const mk = lineMarkers[d.line - 1];
    if (!mk) keptDead.push(d);
    else if (mk.valid) {
      exempt.push({ cls: 'U1', line: d.line, col: d.col, found: d.name, note: 'undefined token', reason: mk.reason });
    } else {
      keptDead.push(d);
      noteBad(d.line, 'U1', mk.reason);
    }
  }

  /* budgeted classes get the same in-place exemption path */
  const keptBudget = {};
  for (const cls of Object.keys(budgetHits)) {
    keptBudget[cls] = [];
    for (const h of budgetHits[cls]) {
      const mk = lineMarkers[h.line - 1];
      if (!mk) keptBudget[cls].push(h);
      else if (mk.valid) exempt.push({ ...h, reason: mk.reason });
      else {
        keptBudget[cls].push({ ...h, badAllow: mk.reason });
        noteBad(h.line, h.cls, mk.reason);
      }
    }
    keptBudget[cls].sort((a, b) => a.line - b.line || a.col - b.col);
  }

  if (PRODUCT_FILES.includes(file.rel)) {
    for (const m of varText.matchAll(/\bvar\(\s*(--[A-Za-z0-9_-]+)/g)) productRefs.add(m[1]);
  }

  for (const b of badLines.values()) badAllows.push({ line: b.line, reason: b.reason, classes: [...b.classes].sort() });

  results.push({
    file: file.rel,
    violations: keptViolations.sort((a, b) => a.line - b.line || a.cls.localeCompare(b.cls)),
    deadVars: keptDead.sort((a, b) => a.line - b.line),
    exempt: exempt.sort((a, b) => a.line - b.line || a.cls.localeCompare(b.cls)),
    badAllows: badAllows.sort((a, b) => a.line - b.line),
    important: keptBudget.T14.length,
    inlineStyles: keptBudget.T15.length,
    varUses,
    budgetHits: keptBudget,
    counts: {
      V1: keptViolations.filter((v) => v.cls === 'V1').length,
      V2: keptViolations.filter((v) => v.cls === 'V2').length,
      V3: keptViolations.filter((v) => v.cls === 'V3').length,
      V4: keptViolations.filter((v) => v.cls === 'V4').length,
      V5: keptViolations.filter((v) => v.cls === 'V5').length,
      V6: keptViolations.filter((v) => v.cls === 'V6').length,
      V7: keptViolations.filter((v) => v.cls === 'V7').length,
      V8: keptViolations.filter((v) => v.cls === 'V8').length,
      U1: keptDead.length,
      T1: keptBudget.T1.length,
      T2: keptBudget.T2.length,
      T3: keptBudget.T3.length,
      T4w: keptBudget.T4w.length,
      T4f: keptBudget.T4f.length,
      T6: keptBudget.T6.length,
      T13: keptBudget.T13.length,
      T14: keptBudget.T14.length,
      T15: keptBudget.T15.length,
    },
  });
}

/* ------------------------------------------------- component gate (C1–C6) */
/* The shared layer is additive and opt-in, so the page classes never see it:
   base.css / components.css carry no page selector, components.js and
   icons.svg carry no token consumer, and a `.ds-*` class can be redeclared by
   a page without moving a single V or T count. These six classes close that
   hole. Every one is budgeted exactly like V/T — the measured count is the
   ceiling and only the excess fails — and every figure is measured on
   2026-11-24, not estimated. */

const DS_BASE = 'design-system/base.css';
const DS_COMPONENTS = 'design-system/components.css';
const DS_JS = 'design-system/components.js';
const DS_ICONS = 'design-system/icons.svg';
const DS_CSS_FILES = [DS_BASE, DS_COMPONENTS];
const HTML_TARGETS = files.map((f) => f.rel).filter((rel) => rel.endsWith('.html'));

/* C1 — the structural whitelist. These carry no design decision: a zero is a
   zero, a percentage or an fr is relative layout, 100vw/dvh is "fill the
   viewport", `2px` is the focus offset the outline pair needs, `-1` only ever
   negates a token inside calc(), a unitless number multiplied into a token is
   arithmetic on that token, a flex factor is a ratio, and `1` is an iteration
   count. Everything else must be named in C1_ALLOW with a reason and its own
   ceiling. */
function c1Structural(value, prop, before = '', after = '') {
  const v = String(value).trim();
  if (/^-?0(?:\.0+)?(?:px|rem|em|%|s|ms|vh|vw|dvh|deg)?$/i.test(v)) return true;
  if (/^-?\d*\.?\d+%$/.test(v)) return true;
  if (/^-?\d*\.?\d+fr$/.test(v)) return true;
  if (/^100(?:d?[sv]?[hw])$/.test(v)) return true;
  if (v === '2px' && prop === 'outline-offset') return true;
  if (/^[-\d.]+$/.test(v) && /[*\/]\s*$/.test(before)) return true;          // factor on a token
  if (/^[-\d.]+$/.test(v) && /^(?:flex|flex-grow|flex-shrink|order)$/.test(prop)) return true;
  if (v === '-1' && /^\s*\*/.test(after)) return true;
  if (v === '1' && prop === 'animation-iteration-count') return true;
  return false;
}

/* C1_ALLOW — the only raw values allowed in the two stylesheets, each with the
   reason it is not a token and a per-value ceiling. An unlisted value is a
   violation no matter how small its file budget is. */
const C1_ALLOW = [
  {
    file: DS_COMPONENTS,
    value: '560px',
    budget: 1,
    reason: 'dialog box max width — the layout scale ships page widths (layout.max.wiki 980, layout.max.pitch 1080), and a modal box width is not a page width',
  },
  {
    file: DS_COMPONENTS,
    value: '94vw',
    budget: 1,
    reason: 'dialog inline cap on narrow viewports; a viewport cap has no token and shrinking it to a spacing step would break the box on phones',
  },
  {
    file: DS_COMPONENTS,
    value: '88vh',
    budget: 1,
    reason: 'dialog block cap so a long body scrolls inside the box instead of pushing the close control off-screen',
  },
  {
    file: DS_COMPONENTS,
    value: '92vw',
    budget: 1,
    reason: 'sheet variant inline cap, min(92vw, layout.max.wiki) — the viewport half of the pair is the reason it cannot be one token',
  },
  {
    file: DS_COMPONENTS,
    value: 'rgb(0 0 0 / .6)',
    budget: 1,
    reason: 'component-local --_scrim default; the token layer ships scrims as per-theme engine roles, not as one fixed rgba, and the overlay must paint before any theme attribute exists. A page overrides it with --_scrim:var(--color-engine-scrim)',
  },
  {
    file: DS_COMPONENTS,
    value: '40rem',
    budget: 1,
    reason: 'table stacking threshold in the @container prelude — a custom property is invalid in a prelude, so the 639px breakpoint step cannot be spelled var(); this is the component-layer twin of T6',
  },
];

function c1AllowFor(file, value) {
  return C1_ALLOW.find((entry) => entry.file === file && entry.value === value) || null;
}

const COLOR_CALL_RE = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|color-mix)\s*\([^)]*\)/gi;
const NUMBER_RE = /(?<![\w.#-])-?\d*\.?\d+(?:px|rem|em|vh|vw|dvh|dvw|svh|svw|%|s|ms|deg|ch|fr|pt|ex|vmin|vmax)?(?![\w-])/g;

function rawValueHits(file, text) {
  const starts = lineStarts(text);
  const chars = text.split('');
  maskRanges(chars, rangesOf(text, /\/\*[\s\S]*?\*\//g));
  const masked = chars.join('');
  const hits = [];
  const noteHit = (offset, prop, value) => {
    const line = lineOf(starts, offset);
    const allow = c1AllowFor(file, value);
    hits.push({
      cls: 'C1',
      file,
      line,
      col: offset - starts[line - 1] + 1,
      value,
      found: `${prop}:${short(value, 34)}`,
      note: allow ? `listed raw value — ${short(allow.reason, 58)}` : `raw value (unlisted) — ${short(value, 30)}`,
      unlisted: !allow,
    });
  };
  for (const block of declBlocks(masked)) {
    for (const m of block.body.matchAll(/(?<![-\w])(--[A-Za-z0-9_-]+|[A-Za-z-][A-Za-z0-9-]*)\s*:\s*([^;}]*)/g)) {
      const prop = m[1];
      const value = m[2];
      const head = block.offset + m.index + m[0].indexOf(':') + 1;
      /* var()/env() are token reads, not literals; blank them length-preserving
         so the offsets still map to the real line */
      let scan = value;
      for (const [s, e] of [...callSpans(scan, 'var'), ...callSpans(scan, 'env')]) {
        scan = scan.slice(0, s) + ' '.repeat(e - s) + scan.slice(e);
      }
      for (const c of scan.matchAll(COLOR_CALL_RE)) {
        noteHit(head + c.index, prop, c[0].replace(/\s+/g, ' ').trim());
      }
      scan = scan.replace(COLOR_CALL_RE, (s) => ' '.repeat(s.length));
      for (const n of scan.matchAll(NUMBER_RE)) {
        const before = scan.slice(0, n.index);
        if (c1Structural(n[0], prop, before, scan.slice(n.index + n[0].length))) continue;
        noteHit(head + n.index, prop, n[0]);
      }
    }
  }
  /* a numeric threshold in an at-rule prelude is a literal by force: var() is
     invalid there, so it is recorded like one */
  for (const m of masked.matchAll(/@(media|container|supports)([^{]*)\{/gi)) {
    const prelude = m[2];
    const base = m.index + m[0].indexOf(prelude);
    for (const n of prelude.matchAll(/(?<![\w.#-])-?\d*\.?\d+(?:px|rem|em|vh|vw|dvh|%|s|ms)?(?![\w-])/g)) {
      if (c1Structural(n[0], `@${m[1]}`, prelude.slice(0, n.index), prelude.slice(n.index + n[0].length))) continue;
      noteHit(base + n.index, `@${m[1]}`, n[0]);
    }
  }
  return hits;
}

/* C2 — duplicate selector in one document. Keyed by the selector plus its full
   at-scope chain (media / supports / container) and nesting, because the rule
   that matters is "the same selector declared twice in the same cascade
   context". Matching identical declarations was measured to catch 0 of the 8
   engine duplicates and 0 of pitch's: every later block adds something. */
function styleChunks(text) {
  const out = [];
  for (const m of text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    out.push({ css: m[1], offset: m.index + m[0].indexOf('>') + 1 });
  }
  return out;
}

function duplicateSelectorHits(file, text) {
  const starts = lineStarts(text);
  const hits = [];
  const seen = new Map();
  for (const chunk of styleChunks(text)) {
    const css = chunk.css.replace(/\/\*[\s\S]*?\*\//g, (s) => ' '.repeat(s.length));
    for (const b of declBlocks(css)) {
      const key = `${b.scope.join(' > ')}||${b.sel}`;
      const at = chunk.offset + b.offset;
      if (!seen.has(key)) {
        seen.set(key, at);
        continue;
      }
      const line = lineOf(starts, at);
      hits.push({
        cls: 'C2',
        file,
        line,
        col: 1,
        found: short(`${b.sel}${b.scope.length ? ` @ ${b.scope.join(' > ')}` : ' @ top level'}`, 78),
        note: `duplicate selector (first declared line ${lineOf(starts, seen.get(key))})`,
      });
    }
  }
  return hits;
}

/* C3 — modal semantics. aria-modal is a promise that the rest of the document
   is inert; a node that makes it without role=dialog and an accessible name is
   a lie to the screen reader. aria-label is accepted — Overlay.label() accepts
   it, and pitch's drawers carry one. */
function ariaModalHits(file, text) {
  const starts = lineStarts(text);
  const hits = [];
  let seen = 0;
  for (const m of text.matchAll(/<([a-zA-Z][\w-]*)\b[^>]*>/g)) {
    if (!/\saria-modal\s*=/.test(m[0])) continue;
    seen += 1;
    const tag = m[1];
    const hasRole = /\srole\s*=\s*["']dialog["']/.test(m[0]);
    const hasLabel = /\saria-label(?:ledby)?\s*=\s*["'][^"']+["']/.test(m[0]);
    const line = lineOf(starts, m.index);
    if (!hasRole) {
      hits.push({ cls: 'C3', file, line, col: 1, found: short(m[0], 70), note: `<${tag}> has aria-modal but no role="dialog"` });
    } else if (!hasLabel) {
      hits.push({ cls: 'C3', file, line, col: 1, found: short(m[0], 70), note: `<${tag}> role="dialog" with aria-modal but no aria-label / aria-labelledby` });
    }
  }
  return { hits, seen };
}

/* C4 — a .ds-* class defined twice. Only a *top-level definition* counts: a
   rule whose subject compound is the class and which has no ancestor
   combinator. `.spec-cell .ds-dialog` is a gallery stage override (it
   neutralises fixed positioning so a dialog can be shown inline), not a second
   definition, and failing it would forbid the only way to photograph a fixed
   overlay. */
function dsDefinitions(file, text) {
  const chunks = file.endsWith('.html') ? styleChunks(text).map((c) => c.css) : [text];
  const classes = new Set();
  for (const chunk of chunks) {
    const css = chunk.replace(/\/\*[\s\S]*?\*\//g, (s) => ' '.repeat(s.length));
    for (const b of declBlocks(css)) {
      for (const part of b.sel.split(',')) {
        const p = part.trim();
        if (!p.startsWith('.ds-')) continue;
        if (/[\s>+~]/.test(p)) continue;
        const name = p.match(/^\.(ds-[a-zA-Z0-9_-]+)/);
        if (name) classes.add(name[1]);
      }
    }
  }
  return classes;
}

/* C5 — an icon reference must name a real symbol. This is the check that keeps
   the check-anchors skip honest: check-anchors no longer treats
   `icons.svg#ds-icon-x` as a fragment link (it is not an HTML document), so
   the sprite has to be validated here or nothing validates it. */
function iconRefHits(file, text) {
  const starts = lineStarts(text);
  const hits = [];
  const dir = path.dirname(path.join(ROOT, file));
  for (const m of text.matchAll(/<(?:use|image)\b[^>]*?(?:href|xlink:href)\s*=\s*["']([^"']+)["']/g)) {
    const value = m[1];
    if (!value.includes('#') || value.startsWith('#')) continue;
    const [target, anchor] = value.split('#');
    if (!/\.svg$/i.test(target)) continue;
    const line = lineOf(starts, m.index);
    const abs = path.resolve(dir, target);
    if (!fs.existsSync(abs)) {
      hits.push({ cls: 'C5', file, line, col: 1, found: short(value, 60), note: 'names a missing svg file' });
      continue;
    }
    const svg = fs.readFileSync(abs, 'utf8');
    const ids = new Set([...svg.matchAll(/\sid\s*=\s*["']([^"']+)["']/g)].map((x) => x[1]));
    if (!ids.has(anchor)) {
      hits.push({ cls: 'C5', file, line, col: 1, found: short(value, 60), note: `${short(target, 30)} declares no id="${short(anchor, 30)}"` });
    }
  }
  return hits;
}

/* C6 — the JS and the sprite paint with var() and currentColor only. A hex in
   components.js would bypass every stylesheet check; a hex in icons.svg would
   freeze an icon to one theme. */
function paintLiteralHits(file, text, { js = false } = {}) {
  const starts = lineStarts(text);
  const chars = text.split('');
  const maskedRanges = [...rangesOf(text, /\/\*[\s\S]*?\*\//g), ...rangesOf(text, /\burl\([^)]*\)/g)];
  if (js) maskedRanges.push(...rangesOf(text, /^[ \t]*\/\/.*$/gm));
  maskRanges(chars, maskedRanges);
  const masked = chars.join('');
  const hits = [];
  for (const m of masked.matchAll(COLOR_CALL_RE)) {
    const line = lineOf(starts, m.index);
    hits.push({
      cls: 'C6',
      file,
      line,
      col: m.index - starts[line - 1] + 1,
      found: short(m[0].replace(/\s+/g, ' ').trim(), 40),
      note: 'raw paint literal outside a comment',
    });
  }
  return hits;
}

const componentFindings = [];
layers: {
  for (const rel of DS_CSS_FILES) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) break layers;
    componentFindings.push(...rawValueHits(rel, fs.readFileSync(abs, 'utf8')));
  }
  /* C2 reads the committed blob (see the header); the worktree copy is kept so
     a divergence can be reported instead of silently ignored */
  const worktreeDupCounts = new Map();
  for (const rel of HTML_TARGETS) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    const worktreeText = fs.readFileSync(abs, 'utf8');
    worktreeDupCounts.set(rel, duplicateSelectorHits(rel, worktreeText).length);
    let committed = null;
    try {
      committed = execFileSync('git', ['show', `HEAD:${rel}`], {
        cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch {
      committed = null;
    }
    componentFindings.push(...duplicateSelectorHits(rel, committed ?? worktreeText));
    componentFindings.push(...ariaModalHits(rel, worktreeText).hits);
    componentFindings.push(...iconRefHits(rel, worktreeText));
  }
  /* C3 runs on every page; count the compliant nodes too so the receipt can
     say "N checked, 0 bad" instead of only naming failures */
  let ariaModalSeen = 0;
  for (const rel of HTML_TARGETS) {
    const abs = path.join(ROOT, rel);
    if (fs.existsSync(abs)) ariaModalSeen += ariaModalHits(rel, fs.readFileSync(abs, 'utf8')).seen;
  }
  const owners = new Map();
  for (const rel of [...DS_CSS_FILES, ...HTML_TARGETS]) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    for (const name of dsDefinitions(rel, fs.readFileSync(abs, 'utf8'))) {
      if (!owners.has(name)) owners.set(name, []);
      owners.get(name).push(rel);
    }
  }
  for (const [name, list] of [...owners].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (list.length < 2) continue;
    componentFindings.push({
      cls: 'C4',
      file: list[1],
      line: null,
      col: null,
      found: `.${name}`,
      note: `defined in ${list.join(' and ')}`,
    });
  }
  for (const rel of [DS_JS, DS_ICONS]) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    componentFindings.push(...paintLiteralHits(rel, fs.readFileSync(abs, 'utf8'), { js: rel.endsWith('.js') }));
  }
  /* stash the two "checked" counters for the receipt */
  globalThis.__dsGateCounters = {
    ariaModalSeen,
    iconRefs: HTML_TARGETS.reduce((n, rel) => {
      const abs = path.join(ROOT, rel);
      if (!fs.existsSync(abs)) return n;
      const text = fs.readFileSync(abs, 'utf8');
      return n + [...text.matchAll(/<(?:use|image)\b[^>]*?(?:href|xlink:href)\s*=\s*["']([^"']*#[^"']+)["']/g)].length;
    }, 0),
    worktreeDupCounts,
  };
}
const GATE_COUNTERS = globalThis.__dsGateCounters || { ariaModalSeen: 0, iconRefs: 0, worktreeDupCounts: new Map() };
const COMPONENT_CLASSES = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'];
const C_BUDGETS = { C1: 6, C2: 12, C3: 0, C4: 0, C5: 0, C6: 0 };
/* C1 and C2 are per file: a fix on one stylesheet or page cannot pay for a
   regression on another. C3–C6 have no seed, so any hit anywhere fails. */
const C_SEED = {
  C1: { [DS_BASE]: 0, [DS_COMPONENTS]: 6 },
  C2: { 'index.html': 0, 'pitch.html': 4, 'engine.html': 8, 'design-system/index.html': 0 },
};
const C_NOTES = {
  C1: `components.css ${C1_ALLOW.length} listed values (${C1_ALLOW.map((a) => a.value).join(', ')}), each with a reason and a ceiling of 1; base.css 0 — its only literals are 0, 100%, 50%, the calc() sign multiplier and an iteration count`,
  C2: 'pitch 4 + engine 8, measured on the committed HEAD blob. Engine: html,body · body · header · .dp h3 · #arrowpick button · #chapterbar select · #anchorRow code · #drawerX. Pitch: .plan-nav · .plan-nav .pill · #plan-weeks .wrow · .mrail (inside @media(max-width:900px)). Identical-declaration matching would catch 0 of these — every later block adds a declaration',
  C3: '2 aria-modal nodes checked (both pitch drawers: role=dialog + aria-label + hidden when closed), 0 bad',
  C4: '0 classes defined at top level in two sources; the 14 `.spec-cell .ds-*` rules in the gallery are scoped stage overrides and do not count as definitions',
  C5: '48 `<use href="icons.svg#…">` references, 24 symbols, 0 unresolved',
  C6: '0 paint literals in components.js (paints through var() + currentColor) and icons.svg (currentColor only)',
};
/* ---------------------------------------------------------------- totals */

const classes = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'U1'];
const fileTClasses = ['T1', 'T2', 'T3', 'T4w', 'T4f', 'T6', 'T13', 'T14', 'T15'];
const globalTClasses = ['T8', 'T9', 'T10', 'T11'];
const ALL_CLASSES = [...classes, ...fileTClasses, ...globalTClasses];

/* T8 — a token defined in the `:root` contract that nothing consumes.
   Consumers are: a `var()` reference from a product page, a `themes` map cell
   (the role contract is why the primitive exists), `components.css` once it
   lands, or the linked-last shared `shell.css` every product page loads. A
   gallery swatch proves the token renders; it does not prove a product uses
   it, so `design-system/index.html` stays outside. Aliases
   (`value: var(--other)`) and `breakpoint.*` are exempt: a pointer is its own
   consumer, and `var()` cannot appear in `@media`. */
const consumed = new Set([...productRefs, ...themeRefs, ...componentRefs, ...shellRefs]);
const unusedTokens = [...defined]
  .filter((name) => !consumed.has(name) && !aliasNames.has(name) && !breakpointNames.has(name))
  .sort();

/* T9 — two role names resolving to one value.
   (a) token set: colors compared across the whole set; dimensions only between
       step names of the same scale, because `spacing.xs` and `radius.sm` both
       being 8px is two scales, not two roles.
   (b) role contract: within ONE theme map and ONE family (bg/fg/line/accent/
       status), two slots pointing at the same primitive is one role too many.
       Scoped per block: the same warning color in pitch and wiki-light is a
       palette prior, not a duplicate role. */
function t9Findings(entries) {
  const out = [];
  const colors = new Map();
  for (const t of entries) {
    if (t.type !== 'color') continue;
    if (!colors.has(t.value)) colors.set(t.value, []);
    colors.get(t.value).push(t.name);
  }
  for (const [value, names] of colors) {
    for (let i = 1; i < names.length; i++) {
      out.push({ cls: 'T9', found: `${names[0]} ≡ ${names[i]}`, note: `one color value ${value}` });
    }
  }
  const steps = new Map();
  for (const t of entries) {
    if (t.type !== 'dimension') continue;
    const parts = t.name.split('.');
    if (parts.length !== 2 || !STEP_NAME_RE.test(parts[1])) continue;
    const key = `${parts[0]}|${t.value}`;
    if (!steps.has(key)) steps.set(key, []);
    steps.get(key).push(t.name);
  }
  for (const [key, names] of steps) {
    const value = key.slice(key.indexOf('|') + 1);
    for (let i = 1; i < names.length; i++) {
      out.push({ cls: 'T9', found: `${names[0]} ≡ ${names[i]}`, note: `one step value ${value}` });
    }
  }
  return out;
}
const t9 = t9Findings(tokenEntries);

function t9ThemeFindings(contract) {
  const out = [];
  if (!contract || !contract.maps || typeof contract.maps !== 'object') return out;
  for (const name of THEME_NAMES) {
    const map = contract.maps[name];
    if (!map || typeof map !== 'object') continue;
    const families = new Map();
    const note = (family, slot, ref) => {
      if (!families.has(family)) families.set(family, new Map());
      const refs = families.get(family);
      if (!refs.has(ref)) refs.set(ref, []);
      refs.get(ref).push(slot);
    };
    for (const slot of THEME_SLOTS) {
      const cell = map[slot];
      if (slot === 'status') {
        if (cell && typeof cell === 'object') {
          for (const [key, value] of Object.entries(cell)) {
            if (typeof value === 'string') note('status', `status.${key}`, value);
          }
        }
      } else if (typeof cell === 'string') {
        note(slot.split('.')[0], slot, cell);
      }
    }
    for (const [family, refs] of families) {
      for (const [ref, slots] of refs) {
        if (slots.length < 2) continue;
        out.push({ cls: 'T9', found: `${name}: ${slots.join(' ≡ ')}`, note: `two ${family} roles share ${ref}` });
      }
    }
  }
  return out;
}
const t9Themes = t9ThemeFindings(themes);

/* T10 — the role contract. Not "every theme has the same non-null list"
   (2/5/5/3 nulls are the design); every block must declare all 14 slots, the
   nulls explicitly, and the emitted CSS must carry one block per map with
   17 − nulls role vars. An accidental omission still fails. */
function t10Findings(contract, cssText) {
  const out = [];
  const add = (found, note) => out.push({ cls: 'T10', found, note });
  if (!contract || typeof contract !== 'object') {
    add('themes', 'no role contract in tokens.json');
    return out;
  }
  if (contract.attribute !== THEME_ATTRIBUTE) add(`attribute=${JSON.stringify(contract.attribute)}`, `expected "${THEME_ATTRIBUTE}"`);
  if (!Array.isArray(contract.slots) || contract.slots.join('|') !== THEME_SLOTS.join('|')) {
    add('themes.slots', 'the 14 locked slots are missing or reordered');
  }
  const maps = contract.maps;
  if (!maps || typeof maps !== 'object') {
    add('themes.maps', 'missing');
    return out;
  }
  if (Object.keys(maps).join('|') !== THEME_NAMES.join('|')) {
    add(`maps=${Object.keys(maps).join(',')}`, `expected ${THEME_NAMES.join(', ')} in order`);
  }
  const nullUnion = new Set();
  for (const name of THEME_NAMES) {
    const map = maps[name];
    if (!map || typeof map !== 'object') {
      add(name, 'theme map missing');
      continue;
    }
    const keys = Object.keys(map);
    for (const slot of THEME_SLOTS) if (!keys.includes(slot)) add(`${name}.${slot}`, 'slot not declared (declare null)');
    for (const k of keys) if (!THEME_SLOTS.includes(k)) add(`${name}.${k}`, 'slot outside the contract');
    const st = map.status;
    if (!st || typeof st !== 'object') add(`${name}.status`, 'status slot missing');
    else {
      for (const k of STATUS_KEYS) if (!(k in st)) add(`${name}.status.${k}`, 'status role missing');
      for (const k of Object.keys(st)) if (!STATUS_KEYS.includes(k)) add(`${name}.status.${k}`, 'status role outside the contract');
    }
    for (const slot of THEME_SLOTS) {
      if (slot === 'status' || !(slot in map)) continue;
      if (map[slot] === null) nullUnion.add(slot);
      else if (!/^var\(--[a-z0-9-]+\)$/.test(String(map[slot]))) {
        add(`${name}.${slot}`, `expected var(--primitive) or null, got ${short(map[slot], 40)}`);
      }
    }
  }
  const declared = Object.keys(contract.fallthrough || {}).sort().join('|');
  const expected = [...nullUnion].sort().join('|');
  if (declared !== expected) add('themes.fallthrough', `must cover exactly the null slots (${expected || 'none'})`);

  const blocks = declBlocks(cssText.replace(/\/\*[\s\S]*?\*\//g, ' '));
  const bySel = new Map();
  for (const b of blocks) bySel.set(b.sel, b);
  if (!bySel.has(`[${THEME_ATTRIBUTE}]`)) add('tokens.css', 'fall-through block missing');
  for (const name of THEME_NAMES) {
    const sel = `[${THEME_ATTRIBUTE}="${name}"]`;
    const b = bySel.get(sel);
    if (!b) {
      add(`tokens.css ${sel}`, 'theme block missing');
      continue;
    }
    const map = maps[name] || {};
    const nulls = THEME_SLOTS.filter((s) => s !== 'status' && map[s] === null);
    const want = ROLE_VAR_COUNT - nulls.length;
    const got = customProps(b.body).length;
    if (got !== want) add(`tokens.css ${sel}`, `${got} role vars, expected ${want} (${nulls.length} null)`);
  }
  const fallAt = cssText.indexOf(`[${THEME_ATTRIBUTE}] {`);
  const firstMap = cssText.indexOf(`[${THEME_ATTRIBUTE}="`);
  if (fallAt === -1 || firstMap === -1 || fallAt > firstMap) {
    add('tokens.css order', 'fall-through block must precede the theme maps');
  }
  return out;
}
const t10 = t10Findings(themes, tokensText);

/* T11 — `type` ↔ `value` shape; `other` stays out of the table on purpose.
   A value that is itself a `var()` pointer is an alias: its shape is whatever
   the target resolves to, so it is skipped here (and the target is judged on
   its own row). A literal that contradicts its declared type still fails. */
const t11 = [];
for (const t of tokenEntries) {
  const check = TYPE_SHAPE[t.type];
  if (!check) continue;
  const value = String(t.value).trim();
  if (/^var\(/i.test(value)) continue;
  if (!check(value)) {
    t11.push({ cls: 'T11', found: `${t.name} type=${t.type} value="${t.value}"`, note: 'type/value mismatch' });
  }
}

const globalFindings = [
  ...unusedTokens.map((name) => ({ cls: 'T8', found: name, note: 'no consumer (page, theme cell or components.css)' })),
  ...t9,
  ...t9Themes,
  ...t10,
  ...t11,
];

const totals = Object.fromEntries(ALL_CLASSES.map((c) => [c, 0]));
let totalVars = 0;
let totalExempt = 0;
let totalBadAllow = 0;
for (const r of results) {
  for (const c of [...classes, ...fileTClasses]) totals[c] += r.counts[c];
  totalVars += r.varUses;
  totalExempt += r.exempt.length;
  totalBadAllow += r.badAllows.length;
}
for (const c of globalTClasses) totals[c] = globalFindings.filter((f) => f.cls === c).length;

/* ---------------------------------------------------------------- budgets */

/* Consume each budget in file order; every hit past it is a violation. T15 is
   per file so one page cannot borrow another page's allowance. */
const hitsOf = (cls) => {
  if (globalTClasses.includes(cls)) return globalFindings.filter((f) => f.cls === cls);
  /* U1 is a budget class like T1–T15: a dead var() is a violation, not a
     statistic. Its hits live on `deadVars` (already exemption-filtered), so
     they are folded into the same shape the budget loop consumes. */
  if (cls === 'U1') {
    return results.flatMap((r) =>
      r.deadVars.map((d) => ({
        cls: 'U1',
        line: d.line,
        col: d.col,
        found: d.name,
        note: 'undefined token',
        file: r.file,
      })),
    );
  }
  /* V1–V8 are violations, not statistics: before this they were counted into
     `counts` and never compared with a budget, so a new raw paint, z, radius,
     motion, border or spacing value could land while `--check` stayed green. */
  if (classes.includes(cls)) {
    return results.flatMap((r) =>
      r.violations.filter((v) => v.cls === cls).map((v) => ({ ...v, file: r.file })),
    );
  }
  return results.flatMap((r) => (r.budgetHits[cls] || []).map((h) => ({ ...h, file: r.file })));
};

const overGroups = [];
const budgetRows = [];
for (const cls of ALL_CLASSES) {
  const hits = hitsOf(cls);
  const budget = BUDGETS[cls] ?? 0;
  let over = 0;
  if (globalTClasses.includes(cls)) {
    over = Math.max(0, hits.length - budget);
    if (over) overGroups.push({ cls, file: null, now: hits.length, limit: budget, hits });
  } else {
    const byFile = new Map();
    for (const h of hits) {
      if (!byFile.has(h.file)) byFile.set(h.file, []);
      byFile.get(h.file).push(h);
    }
    for (const r of results) {
      const list = byFile.get(r.file) || [];
      const limit = (BUDGET_SEED[cls] || {})[r.file] ?? 0;
      if (list.length > limit) {
        over += list.length - limit;
        overGroups.push({ cls, file: r.file, now: list.length, limit, hits: list });
      }
    }
  }
  budgetRows.push({ cls, now: hits.length, budget, over });
}

/* C1–C6 — same contract, different sources. C1/C2 carry a per-file seed; a hit
   in a file with no seed has a limit of 0, so a new stylesheet or page cannot
   inherit another's allowance. C1 hits that name a value absent from
   C1_ALLOW fail even when the file is under its total, so deleting a listed
   literal cannot buy room for an unlisted one. */
const unlistedC1 = [];
for (const cls of COMPONENT_CLASSES) {
  const hits = componentFindings
    .filter((f) => f.cls === cls)
    .sort((a, b) => String(a.file).localeCompare(String(b.file)) || (a.line ?? 0) - (b.line ?? 0));
  const seed = C_SEED[cls] || {};
  const rowsOver = [];
  const byFile = new Map();
  for (const h of hits) {
    if (!byFile.has(h.file)) byFile.set(h.file, []);
    byFile.get(h.file).push(h);
  }
  for (const [file, list] of [...byFile].sort((a, b) => a[0].localeCompare(b[0]))) {
    const limit = Object.prototype.hasOwnProperty.call(seed, file) ? seed[file] : 0;
    if (list.length > limit) {
      rowsOver.push({ cls, file, now: list.length, limit, hits: list });
    }
  }
  if (cls === 'C1') {
    for (const h of hits) {
      if (!h.unlisted) continue;
      unlistedC1.push(h);
      if (!rowsOver.some((g) => g.file === h.file)) {
        rowsOver.push({ cls: 'C1', file: h.file, now: hits.filter((x) => x.file === h.file).length, limit: 0, hits: [h] });
      }
    }
  }
  for (const group of rowsOver) overGroups.push(group);
  budgetRows.push({
    cls,
    now: hits.length,
    budget: C_BUDGETS[cls],
    over: rowsOver.reduce((n, g) => n + Math.max(1, g.now - g.limit), 0),
  });
}
const totalExcess = budgetRows.reduce((n, r) => n + r.over, 0);
const failed = totalExcess > 0 || totalBadAllow > 0;

/* ---------------------------------------------------------- console table */

const header =
  'file'.padEnd(26) +
  classes.map((c) => c.padStart(5)).join('') +
  'exempt'.padStart(7) +
  'bad'.padStart(5) +
  '!imp'.padStart(6) +
  'inline'.padStart(8) +
  'var()'.padStart(8);
const rule = '-'.repeat(header.length);

console.log('');
console.log(`DS token-adherence gate v2 — ${results.length} file(s) scanned, ${defined.size} tokens defined in tokens.css`);
console.log(rule);
console.log(header);
console.log(rule);
for (const r of results) {
  console.log(
    r.file.padEnd(26) +
      classes.map((c) => String(r.counts[c]).padStart(5)).join('') +
      String(r.exempt.length).padStart(7) +
      String(r.badAllows.length).padStart(5) +
      String(r.important).padStart(6) +
      String(r.inlineStyles).padStart(8) +
      String(r.varUses).padStart(8)
  );
}
console.log(rule);
console.log(
  'TOTAL'.padEnd(26) +
    classes.map((c) => String(totals[c]).padStart(5)).join('') +
    String(totalExempt).padStart(7) +
    String(totalBadAllow).padStart(5) +
    String(totals.T14).padStart(6) +
    String(totals.T15).padStart(8) +
    String(totalVars).padStart(8)
);
console.log(rule);

console.log('');
console.log('Type, consumer & theme checks (budgeted)');
console.log(rule);
console.log('file'.padEnd(26) + fileTClasses.map((c) => c.padStart(5)).join(''));
console.log(rule);
for (const r of results) {
  console.log(r.file.padEnd(26) + fileTClasses.map((c) => String(r.counts[c]).padStart(5)).join(''));
}
console.log(rule);
console.log('token set (global)'.padEnd(26) + globalTClasses.map((c) => String(totals[c]).padStart(5)).join(''));
console.log(rule);

console.log('');
console.log('Budgets');
console.log('class'.padEnd(7) + 'now'.padStart(5) + 'budget'.padStart(8) + '  status');
for (const row of budgetRows) {
  const status = row.over ? `OVER +${row.over}` : row.now < row.budget ? 'under' : 'ok';
  console.log(row.cls.padEnd(7) + String(row.now).padStart(5) + String(row.budget).padStart(8) + `  ${status}`);
}
for (const [cls, note] of Object.entries(BUDGET_NOTES)) {
  console.log(`  ${cls} budget ${BUDGETS[cls]}: ${note}`);
}

/* the component gate gets its own block: its budget is a styleguide, not a
   number, and a reviewer needs to see the allow table every run */
console.log('');
console.log('Component gate C1–C6');
console.log(rule);
for (const cls of COMPONENT_CLASSES) {
  const row = budgetRows.find((r) => r.cls === cls);
  const seed = C_SEED[cls];
  const detail = seed
    ? Object.entries(seed).map(([f, n]) => `${f} ${n}`).join(', ')
    : cls === 'C3'
      ? `${GATE_COUNTERS.ariaModalSeen} aria-modal node(s) checked`
      : cls === 'C5'
        ? `${GATE_COUNTERS.iconRefs} svg#id reference(s) resolved`
        : 'any hit fails';
  console.log(`${cls.padEnd(4)}${String(row.now).padStart(4)}/${row.budget}  ${detail}`);
  console.log(`      ${C_NOTES[cls]}`);
}
const divergent = HTML_TARGETS.filter((rel) => {
  const wt = GATE_COUNTERS.worktreeDupCounts.get(rel) ?? 0;
  const committed = componentFindings.filter((f) => f.cls === 'C2' && f.file === rel).length;
  return wt !== committed;
});
if (divergent.length) {
  for (const rel of divergent) {
    console.log(`      note: ${rel} worktree has ${GATE_COUNTERS.worktreeDupCounts.get(rel)} duplicate selector(s), committed HEAD has ${componentFindings.filter((f) => f.cls === 'C2' && f.file === rel).length} — C2 follows HEAD (a sibling lane's uncommitted edit is not this gate's); commit, then re-run`);
  }
}

if (totalExcess) {
  console.log('\nOver budget');
  for (const g of overGroups) {
    console.log(`  ${(g.file || 'token set').padEnd(26)} ${g.cls}  ${g.now}/${g.limit} (+${g.now - g.limit})`);
    const shown = g.hits.length <= 12 ? g.hits : g.hits.slice(-12);
    for (const h of shown) {
      const where = h.line ? `${String(h.line).padStart(5)}:${String(h.col).padEnd(4)}` : '                  ';
      console.log(`    ${where} ${h.note.padEnd(26)} ${h.found}`);
    }
    if (g.hits.length > 12) console.log(`    …and ${g.hits.length - 12} more`);
  }
}

for (const r of results) {
  if (!r.exempt.length) continue;
  console.log(`\n${r.file} — Exempt (${r.exempt.length})`);
  for (const e of r.exempt) {
    console.log(`  ${String(e.line).padStart(5)}:${String(e.col).padEnd(4)} ${e.cls}  ${e.found}`);
    console.log(`        reason: ${e.reason}`);
  }
}

if (totalBadAllow) {
  for (const r of results) {
    if (!r.badAllows.length) continue;
    console.log(`\n${r.file} — BAD-ALLOW (${r.badAllows.length})`);
    for (const b of r.badAllows) {
      console.log(`  ${String(b.line).padStart(5)}     ${b.classes.join(',')}  reason: ${b.reason || '(none)'}  — needs a real reason of ${MIN_REASON}+ chars`);
    }
  }
}

console.log(
  `\nRESULT: ${failed ? 'FAIL' : 'PASS'} — ${totalExcess} over budget, ${totalExempt} exempt, ${totalBadAllow} bad-allow`
);
if (failed) {
  const summary = budgetRows.filter((b) => b.over).map((b) => `${b.cls}=${b.now}/${b.budget}`).join(' ');
  if (summary) console.log(`        ${summary}`);
}
console.log(`        classes at budget: ${budgetRows.filter((b) => b.now >= b.budget && b.over === 0).map((b) => b.cls).join(' ')}`);
console.log(`        report: ${CHECK ? 'skipped (--check)' : path.relative(ROOT, REPORT)}`);
console.log('');

/* ----------------------------------------------------------- write report */

const LEGEND = [
  ['V1', 'Raw color literal (hex / rgb() / rgba() / hsl()) outside a var() fallback', '`color.*` → `var(--color-*)`; legal fallback only inside `var(--token, #hex)`'],
  ['V2', 'Raw duration or cubic-bezier inside `transition:` / `animation:`', '`motion.duration.*` + `motion.easing.*` → `var(--motion-duration-*)` / `var(--motion-easing-*)`'],
  ['V3', 'Raw numeric `z-index`', '`z.*` → `var(--z-base|raise|content|sticky|bar|overlay|sheet|drawer|popover|canvas|toast|menu|max)`'],
  ['V4', 'Raw `border-radius` (px/%/rem or bare 0)', '`radius.*` → `var(--radius-none|xs|sm|md|card|lg|xl|pill|circle)`'],
  ['V5', 'Inline `style="…"` attribute carrying color or px radius', 'Move to a class in `<style>`; paint via `var(--color-*)`, radius via `var(--radius-*)`'],
  ['V6', 'SVG paint attribute `fill|stroke|stop-color="#…"`', '`var(--color-*)` in a CSS rule (`fill:var(--color-…)`) or a token-backed class'],
  ['V7', 'Raw px border width in `border` / `border-top|right|bottom|left`', '`border.width.*` → `var(--border-width-hairline|strong|accent)` as the width position of the shorthand'],
  ['V8', 'Raw px/rem number inside a `padding` / `margin` / `gap` declaration (incl. `-top|-right|-bottom|-left|-block|-inline`, `row-gap`, `column-gap`)', '`0`, `auto` and percentages pass; `spacing.*` → `var(--spacing-2|2xs|6|xs|10|sm|14|md|18|20|lg|xl|2xl)`; layout-scale and off-grid values get an in-place `lint-allow` reason'],
  ['U1', 'Dead `var(--name)`: not defined in tokens.css and not declared in this page', 'Add the token to `design-system/tokens.json` → regenerate, or use the existing token; never rely on a fallback'],
  ['T1', 'Raw numeric `font-size`, or a literal size inside the `font:` shorthand', '`typography.size.*` → `var(--typography-size-*)`; `font:` shorthand takes `var(--typography-size-*)/var(--line-height-*)`'],
  ['T2', 'Raw numeric `line-height`, or a literal leading inside the `font:` shorthand', '`typography.lineheight.*` → `var(--line-height-*)` once the scale exists'],
  ['T3', 'Raw `letter-spacing` value', '`typography.tracking.*` → `var(--typography-tracking-*)`'],
  ['T4', 'Raw numeric `font-weight`, or a literal family stack', '`typography.weight.*` / `typography.family.*` → `var(--typography-weight-*)` / `var(--typography-family-*)`'],
  ['T6', 'Raw px width in an `@media` query that does not equal a `breakpoint.*` value', 'Use the token\'s px value exactly (`var()` is invalid in a media prelude) — or keep the one-off with an in-place `lint-allow` reason'],
  ['T8', 'Token defined in the `:root` contract with no consumer (product page, `themes` map cell, `components.css`, or the linked-last `shell.css`)', 'Wire it in `index/pitch/engine.html`, in a theme map, in `components.css`, or in `design-system/shell.css` — or delete it; gallery swatches do not count'],
  ['T9', 'Two role names resolving to one value: in the token set, or in one theme map and family', 'Alias one name to the other (`--other`) and remove the duplicate role; a slot that legitimately has no own value is declared `null`'],
  ['T10', 'Role contract parity: a map missing a slot, a slot outside the contract, or an emitted block with the wrong role-var count', 'Declare all 14 slots in every map (null where a theme has no value) and regenerate; nulls are explicit, not gaps'],
  ['T11', 'Token `type` does not match its `value` shape (an alias `var(--other)` is skipped — the target is judged)', 'Fix the type or the value in `tokens.json` → regenerate'],
  ['T13', 'Two literal values in one `:root` (an alias `var(--other)` is skipped — it is a pointer, not a second truth)', 'Delete the redundant alias and keep one role name'],
  ['T14', '`!important`', 'Fix the cascade; `!important` is an escalation, not a style'],
  ['T15', 'Inline `style=` attribute', 'Move to a class in `<style>`; budget is per file'],
  ['C1', 'Raw value in `base.css` / `components.css`: a hex, `rgb()`/`hsl()`, or a number with a unit that is not structural', 'Use `var(--token)`. Structural literals (0, %, fr, 1× viewport, the `calc()` sign, a flex factor, an iteration count) pass; anything else must be listed in `C1_ALLOW` with a reason and a ceiling of 1'],
  ['C2', 'The same selector declared twice in one document in the same cascade scope (selector + `@media`/`@supports`/`@container` chain + nesting)', 'Merge the two blocks. Measured on the committed HEAD blob, so a sibling lane\'s uncommitted edit cannot move the count'],
  ['C3', 'An element carries `aria-modal` without `role="dialog"`, or without `aria-label` / `aria-labelledby`', 'Give the overlay `role="dialog"`, `aria-modal="true"` and a name; `aria-label` is accepted. Closed overlays get `hidden` + `inert`, never transform alone'],
  ['C4', 'A `.ds-*` class defined at top level in two stylesheet sources', 'One definition, in `components.css` (or `base.css` for a base rule). A scoped stage override such as `.spec-cell .ds-dialog` is not a definition'],
  ['C5', '`<use href="…svg#id">` whose fragment is not a symbol in that SVG', 'Add the symbol to `icons.svg` or fix the id; this is the check that keeps the anchor gate\'s non-HTML skip honest'],
  ['C6', 'A hex / `rgb()` / `hsl()` literal in `components.js` or `icons.svg`, outside a comment', 'Paint through `var(--…)` or `currentColor`; a hex in the sprite freezes an icon to one theme'],
];

function mdEscape(s) {
  return String(s).replace(/\|/g, '\\|');
}

let md = '';
md += '<!-- GENERATED by scripts/lint-tokens.mjs — do not hand-edit -->\n\n';
md += '# Token Adherence Audit\n\n';
md += 'Machine receipt for the design-system enforcement gate. Counts are per occurrence per file.\n\n';
md += '```\nnode scripts/lint-tokens.mjs          # table + regenerate this report\n';
md += 'node scripts/lint-tokens.mjs --check  # CI gate: no write, exit 1 on failure\n```\n\n';
md += `- Generated: ${new Date().toISOString().slice(0, 10)}\n`;
md += `- Tokens defined: ${defined.size} (\`design-system/tokens.css\`)\n`;
md += `- Files scanned: ${results.map((r) => '`' + r.file + '`').join(', ')}\n`;
md += `- Result: **${failed ? 'FAIL' : 'PASS'}** — ${totalExcess} over budget, ${totalExempt} exempt, ${totalBadAllow} bad-allow\n`;
md += `- Budgets: ${budgetRows.map((b) => `${b.cls} ${b.now}/${b.budget}`).join(' · ')}\n\n`;

md += '## Per-file violations\n\n';
md += '| File | V1 color | V2 motion | V3 z-index | V4 radius | V5 inline paint | V6 svg paint | V7 border width | V8 spacing | U1 dead var | exempt | bad-allow | inline `style=` | `var(--)` uses |\n';
md += '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n';
for (const r of results) {
  md += `| \`${r.file}\` | ${r.counts.V1} | ${r.counts.V2} | ${r.counts.V3} | ${r.counts.V4} | ${r.counts.V5} | ${r.counts.V6} | ${r.counts.V7} | ${r.counts.V8} | ${r.counts.U1} | ${r.exempt.length} | ${r.badAllows.length} | ${r.inlineStyles} | ${r.varUses} |\n`;
}
md += `| **Total** | **${totals.V1}** | **${totals.V2}** | **${totals.V3}** | **${totals.V4}** | **${totals.V5}** | **${totals.V6}** | **${totals.V7}** | **${totals.V8}** | **${totals.U1}** | **${totalExempt}** | **${totalBadAllow}** | **${totals.T15}** | **${totalVars}** |\n\n`;

md += '## Type, consumer & theme counts\n\n';
md += '| File | T1 font-size | T2 line-height | T3 tracking | T4 weight | T4 family | T6 `@media` px | T13 dup alias | T14 `!important` | T15 inline `style=` |\n';
md += '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n';
for (const r of results) {
  md += `| \`${r.file}\` | ${r.counts.T1} | ${r.counts.T2} | ${r.counts.T3} | ${r.counts.T4w} | ${r.counts.T4f} | ${r.counts.T6} | ${r.counts.T13} | ${r.counts.T14} | ${r.counts.T15} |\n`;
}
md += `| **Total** | **${totals.T1}** | **${totals.T2}** | **${totals.T3}** | **${totals.T4w}** | **${totals.T4f}** | **${totals.T6}** | **${totals.T13}** | **${totals.T14}** | **${totals.T15}** |\n\n`;
md += `Token-set checks (not per file): **T8** ${totals.T8} unconsumed tokens · **T9** ${totals.T9} duplicate role values · **T10** ${totals.T10} role-contract gaps · **T11** ${totals.T11} type/value mismatch.\n\n`;

md += '## Budgets\n\n';
md += 'Each class carries the count measured on 2026-11-24 as a ceiling. A count at or under its budget is PASS; only the excess is a violation, so this receipt is green on day one and every regression fails `--check`.\n\n';
md += '| Class | Now | Budget | Status |\n|---|---:|---:|---|\n';
for (const row of budgetRows) {
  const status = row.over ? `OVER +${row.over}` : row.now < row.budget ? 'under' : 'ok';
  const seed = BUDGET_SEED[row.cls] || C_SEED[row.cls];
  const note = seed
    ? ` (per file ${Object.entries(seed).map(([f, n]) => `${f} ${n}`).join(', ')})`
    : '';
  md += `| ${row.cls} | ${row.now} | ${row.budget}${note} | ${status} |\n`;
}
md += '\n';

md += '## Component gate (C1–C6)\n\n';
md += 'The shared layer (`base.css`, `components.css`, `components.js`, `icons.svg`) is additive and opt-in, so no page class sees it: a raw hex in `components.css`, a second definition of `.ds-btn`, or an unlabelled `aria-modal` changes no V or T count. These six classes close that hole. C2 is measured on the committed `HEAD` blob of each page — CI checks out `HEAD`, and a sibling lane\'s uncommitted edit must not move a budget.\n\n';
md += '| File | Value | Count | Ceiling | Why it is not a token |\n|---|---|---:|---:|---|\n';
for (const entry of C1_ALLOW) {
  const count = componentFindings.filter((f) => f.cls === 'C1' && f.file === entry.file && f.value === entry.value).length;
  md += `| \`${entry.file}\` | \`${mdEscape(entry.value)}\` | ${count} | ${entry.budget} | ${mdEscape(entry.reason)} |\n`;
}
md += '\n';
md += '| Class | Source | Now | Ceiling | Note |\n|---|---|---:|---:|---|\n';
for (const cls of COMPONENT_CLASSES) {
  const row = budgetRows.find((r) => r.cls === cls);
  const seed = C_SEED[cls];
  const source = cls === 'C1'
    ? '`design-system/base.css`, `design-system/components.css`'
    : cls === 'C2'
      ? '`index.html`, `pitch.html`, `engine.html`, `design-system/index.html`'
      : cls === 'C3'
        ? 'all four HTML surfaces'
        : cls === 'C4'
          ? 'both stylesheets + four pages'
          : cls === 'C5'
            ? 'four pages → `icons.svg`'
            : '`components.js`, `icons.svg`';
  const perFile = seed ? Object.entries(seed).map(([f, n]) => `${f} ${n}`).join(' · ') : '';
  md += `| ${cls} | ${source} | ${row.now} | ${row.budget} | ${mdEscape(C_NOTES[cls])}${perFile ? ` — per file: ${mdEscape(perFile)}` : ''} |\n`;
}
md += '\n';
md += `Counters: **${GATE_COUNTERS.ariaModalSeen}** \`aria-modal\` node(s) checked · **${GATE_COUNTERS.iconRefs}** \`svg#id\` reference(s) resolved.\n\n`;
const wtDiverge = HTML_TARGETS.map((rel) => ({
  rel,
  wt: GATE_COUNTERS.worktreeDupCounts.get(rel) ?? 0,
  head: componentFindings.filter((f) => f.cls === 'C2' && f.file === rel).length,
})).filter((x) => x.wt !== x.head);
if (wtDiverge.length) {
  md += 'Worktree divergence (C2 follows `HEAD`): ';
  md += wtDiverge.map((x) => `\`${x.rel}\` ${x.wt} in the worktree vs ${x.head} at HEAD`).join(' · ');
  md += '.\n\n';
}

md += '## Over-budget detail\n\n';
let anyDetail = false;
for (const g of overGroups) {
  anyDetail = true;
  md += `### \`${g.file || 'token set'}\` — ${g.cls} ${g.now}/${g.limit} (+${g.now - g.limit})\n\n`;
  if (g.file) {
    md += '| Line | Found | Note |\n|---:|---|---|\n';
    for (const h of g.hits) md += `| ${h.line} | \`${mdEscape(h.found)}\` | ${mdEscape(h.note)} |\n`;
  } else {
    md += '| Found | Note |\n|---|---|\n';
    for (const h of g.hits) md += `| \`${mdEscape(h.found)}\` | ${mdEscape(h.note)} |\n`;
  }
  md += '\n';
}
if (!anyDetail) md += '_No class is over budget._\n\n';

md += '## Token-set baseline\n\n';
md += 'The four set-level checks are budgeted at the measured post-Phase-1A value, so they document the gap without failing the build until it grows.\n\n';
md += `### T8 — no consumer (${totals.T8})\n\n`;
md += 'A `var()` reference in `index.html`, `pitch.html` or `engine.html`, a `themes` map cell, or (from Phase 2) `components.css` counts; a gallery swatch does not. Aliases (`value: var(--other)`) and `breakpoint.*` are exempt because neither can be consumed by a page.\n\n';
md += '<details><summary>Unconsumed tokens</summary>\n\n';
for (let i = 0; i < unusedTokens.length; i += 6) {
  md += '- ' + unusedTokens.slice(i, i + 6).map((n) => '`' + n + '`').join(', ') + '\n';
}
md += '\n</details>\n\n';
md += `### T9 — two role names, one value (${totals.T9})\n\n`;
md += 'Colors are compared across the whole set; dimensions only between step names of the same scale, because two scales sharing a length is not a duplicate role.\n\n';
if (t9.length) {
  md += '| Pair | Value |\n|---|---|\n';
  for (const t of t9) md += `| \`${mdEscape(t.found)}\` | ${mdEscape(t.note.replace(/^one (?:color|step) value /, ''))} |\n`;
  md += '\n';
} else md += '_None._\n\n';
md += `### T11 — \`type\` matches \`value\` (${totals.T11} mismatch)\n\n`;
md += 'One regex per declared type: `color`, `dimension`, `fontSize`, `lineHeight`, `letterSpacing`, `fontWeight`, `fontFamily`, `duration`, `cubicBezier`, `boxShadow`, `number`. A value that is a `var()` alias is skipped — it is a pointer, and the target token is judged on its own row. A literal that contradicts its declared type fails.\n\n';
if (t11.length) {
  md += '| Token | Declared | Value |\n|---|---|---|\n';
  for (const t of t11) {
    const m = t.found.match(/^(\S+) type=(\S+) value="(.*)"$/);
    md += m ? `| \`${m[1]}\` | ${m[2]} | \`${mdEscape(m[3])}\` |\n` : `| \`${mdEscape(t.found)}\` | | |\n`;
  }
  md += '\n';
} else md += '_None._\n\n';

/* exempted hits, per file — what is tolerated and why */
for (const r of results) {
  if (!r.exempt.length) continue;
  md += `### \`${r.file}\` — Exempt (${r.exempt.length})\n\n`;
  md += '| Line | Class | Found | Reason |\n|---:|---|---|---|\n';
  for (const e of r.exempt) {
    md += `| ${e.line} | ${e.cls} | \`${mdEscape(e.found)}\` | ${mdEscape(e.reason)} |\n`;
  }
  md += '\n';
}

if (totalBadAllow) {
  md += `## BAD-ALLOW (${totalBadAllow})\n\n`;
  md += 'A marker that names no real reason exempts nothing; the hit stays a violation.\n\n';
  md += '| File | Line | Class | Marker reason |\n|---|---:|---|---|\n';
  for (const r of results) {
    for (const b of r.badAllows) {
      md += `| \`${r.file}\` | ${b.line} | ${b.classes.join(',')} | ${b.reason ? `\`${mdEscape(b.reason)}\`` : '_(none)_'} |\n`;
    }
  }
  md += '\n';
}

md += '## How to fix\n\n';
md += '| Class | Meaning | Fix with |\n|---|---|---|\n';
for (const [cls, meaning, fix] of LEGEND) md += `| ${cls} | ${meaning} | ${fix} |\n`;
md += '\n';
md += '### Exemptions (`lint-allow`)\n\n';
md += 'A hit may be tolerated only **in place, on the same line, with a reason**: ';
md += '`/* lint-allow: reason */` in CSS, `// lint-allow: reason` in JS, ';
md += '`<!-- lint-allow: reason -->` in HTML. The marker clears every hit on its own line (V1–V8, U1 and the budgeted T classes) and nothing on the next line. ';
md += `The reason must be at least ${MIN_REASON} characters after trimming; a marker with no reason, or with \`ok\`, exempts nothing — the hit stays a violation and is additionally reported as **BAD-ALLOW**, so the mechanism cannot silently blanket-suppress.\n\n`;
md += 'Legitimate only where **a browser cannot resolve the value from a custom property**: the `meta` theme-color tag, `@media` / `@supports` conditions, and canvas or gradient string composites assembled in JS. ';
md += 'Never legitimate for any color, duration, radius, border width, spacing step or `z-index` that a token could hold — those get a token (or get fixed), because that is exactly the drift this gate exists to catch.\n\n';
md += '### Documented exceptions\n\n';
md += '- Media-query breakpoints stay raw px (`var()` is invalid in `@media`); `T6` requires the number to equal a `breakpoint.*` value from `tokens.json` (alias breakpoints resolved) or to carry a same-line `lint-allow` reason for a documented one-off.\n';
md += '- `design-system/tokens.css` is the token source and is never scanned.\n';
md += '- Page-local alias declarations in `:root` are legal when they resolve to a token: `--bg:var(--color-wiki-light-bg)`. `--spacing-*` is the only scale that may hold rhythm.\n';
md += '- A hex color is legal only as a `var()` fallback: `var(--color-x, #fff)`.\n';
md += '- Spacing is a 2px grid: `padding`/`margin`/`gap` take `var(--spacing-2|2xs|6|xs|10|sm|14|md|18|20|lg|xl|2xl)` or `0`/`auto`/a percentage. `width`, `height`, `top`, `left`, `inset`, `transform` and `grid-template` are geometry and stay out of V8.\n';
md += '- Layout-scale padding above 48px, negative offsets, and off-grid values (22.4, 25.6, 41.6, 86.4, 118) that would move more than 0.9px are kept literal with an in-place `lint-allow` reason.\n';
md += '- Budgets are ceilings, not exemptions: the count measured on 2026-11-24 stays visible, no file is excluded from any check, and a count below budget is progress. Only the excess fails `--check`.\n';
md += '- `T8` counts `var()` references inside `<style>`/`<script>` of the three product pages, every `themes` map cell, and `design-system/components.css` when it exists, and the linked-last `design-system/shell.css` every page loads; `design-system/index.html` is the system\'s own documentation and never counts as a consumer. Aliases (`value: var(--other)`) and `breakpoint.*` are exempt.\n';
md += '- `T9` compares colors across the whole set but dimensions only between step names of one scale (`spacing.base ≡ spacing.2xs`), because `spacing.xs` and `radius.sm` both being 8px is two scales, not two roles. Role slots are compared only inside one theme map and one family, so the same warning color in two themes is a palette prior, not a duplicate role.\n';
md += '- `T10` asserts the role contract: 14 slots in all four maps, nulls explicit, the fall-through covering exactly the null set, and one emitted block per map with 17 − nulls role vars. Themes legitimately differ in nulls (pitch 2, wiki-light 5, wiki-dark 5, engine 3).\n';
md += '- `T11` validates the 9 canonical types; `other` is gone from the source and is rejected by the generator. A `var()` alias value is skipped (it is a pointer; the target keeps its own row).\n';
md += '- `T15` is budgeted per file (index 19, pitch 31, engine 2, gallery 148) so inline styles cannot migrate into the largest page without failing.\n';

if (!CHECK) {
  const prev = fs.existsSync(REPORT) ? fs.readFileSync(REPORT, 'utf8') : null;
  if (prev !== md) fs.writeFileSync(REPORT, md);
}

process.exit(failed ? 1 : 0);
