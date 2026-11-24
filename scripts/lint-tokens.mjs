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
     U1 dead var()                               T3  raw letter-spacing
                                                 T4  raw font-weight / literal family
                                                 T8  token with 0 product consumers
                                                 T9  two role names, one value
                                                 T10 light/dark theme key parity
                                                 T11 `type` ↔ `value` shape
                                                 T13 duplicate alias value in one :root
                                                 T14 `!important`
                                                 T15 inline `style=` attribute

   T8/T9/T11 judge the token set, not a page; T10/T13/T15 are per file. T8
   counts var() references in the three product pages only — a gallery swatch
   is documentation, not consumption. T6 (@media px) and T7 (raw width/height)
   are Phase 1 and deliberately absent.

   Budgets
   Every class carries the exact count measured on 2026-11-24 as an explicit
   ceiling (BUDGETS below). A count at or under budget is PASS; only the
   excess is a violation, so the gate is green on day one and every regression
   fails. `--check` exits 1 when any class exceeds its budget, when a token
   `type`/`value` mismatch appears, or when an exemption is invalid.

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
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const TOKENS_CSS = path.join(ROOT, 'design-system', 'tokens.css');
const TOKENS_JSON = path.join(ROOT, 'design-system', 'tokens.json');
const REPORT = path.join(ROOT, 'design-system', 'audit-report.md');

/* ---------------------------------------------------------------- budgets */
/* Measured 2026-11-24 against the committed tree. A budget is a ceiling, not
   a target: counts may fall freely, only the excess fails `--check`. T4 is
   split (weight + literal family) because one class covers two properties;
   T15 is per file so styles cannot migrate into the largest page unnoticed. */
const BUDGETS = {
  V1: 0, V2: 0, V3: 0, V4: 0, V5: 0, V6: 0, V7: 0, V8: 0, U1: 0,
  T1: 10,
  T2: 37,
  T3: 27,
  T4w: 52,
  T4f: 3,
  T8: 91,
  T9: 5,
  T10: 0,
  T11: 1,
  T13: 4,
  T14: 8,
  T15: 200,
};
/* Per-file share of each budget, measured on the same run. Enforcing the share
   as well as the total means a fix on one page cannot pay for a regression on
   another, and an over-budget row points at the file that grew. The shares sum
   to the totals above. */
const BUDGET_SEED = {
  T1: { 'index.html': 3, 'pitch.html': 3, 'engine.html': 2, 'design-system/index.html': 2 },
  T2: { 'index.html': 1, 'pitch.html': 6, 'engine.html': 17, 'design-system/index.html': 13 },
  T3: { 'index.html': 2, 'pitch.html': 11, 'engine.html': 10, 'design-system/index.html': 4 },
  T4w: { 'index.html': 8, 'pitch.html': 22, 'engine.html': 22, 'design-system/index.html': 0 },
  T4f: { 'index.html': 0, 'pitch.html': 1, 'engine.html': 2, 'design-system/index.html': 0 },
  T13: { 'engine.html': 4 },
  T14: { 'index.html': 2, 'pitch.html': 5, 'engine.html': 1, 'design-system/index.html': 0 },
  T15: { 'index.html': 19, 'pitch.html': 31, 'engine.html': 2, 'design-system/index.html': 148 },
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

const tokensText = fs.readFileSync(TOKENS_CSS, 'utf8');
const defined = new Set();
for (const m of tokensText.matchAll(/^\s*(--[A-Za-z0-9_-]+)\s*:/gm)) defined.add(m[1]);

/* tokens.json is the source of truth for role identity and declared type;
   T9 and T11 read it, the pages never do. */
let tokenEntries = [];
if (!fs.existsSync(TOKENS_JSON)) {
  console.error('FATAL: design-system/tokens.json not found — cannot audit the token set.');
  process.exit(2);
}
try {
  const parsed = JSON.parse(fs.readFileSync(TOKENS_JSON, 'utf8'));
  tokenEntries = Object.entries(parsed).map(([name, spec]) => ({
    name,
    type: String(spec && spec.type || 'other'),
    value: String(spec && spec.value || ''),
  }));
} catch (err) {
  console.error(`FATAL: design-system/tokens.json is not valid JSON — ${err.message}`);
  process.exit(2);
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
        blocks.push({ sel, parent, body, offset: top.open + 1 });
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
    T1: [], T2: [], T3: [], T4w: [], T4f: [], T10: [], T13: [], T14: [], T15: [],
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

  /* T10/T13 — theme and :root blocks. Only leaf blocks (no nested rules) are
     read, so `:root[data-theme] :focus-visible` cannot pollute a key set. */
  const blocks = declBlocks(codeText);
  const baseRootKeys = new Set();
  for (const b of blocks) {
    if (b.sel === ':root' && !/prefers-color-scheme\s*:\s*dark/i.test(b.parent)) {
      for (const p of customProps(b.body)) baseRootKeys.add(p.name);
    }
  }
  const darkBlocks = [];
  for (const b of blocks) {
    const look = `${b.parent} ${b.sel}`;
    const isDark = /data-theme\s*=\s*["']dark["']/i.test(look) || /prefers-color-scheme\s*:\s*dark/i.test(look);
    if (!isDark) continue;
    const props = customProps(b.body);
    if (!props.length) continue;
    darkBlocks.push({ ...b, keys: props.map((p) => p.name) });
  }
  if (darkBlocks.length) {
    if (!baseRootKeys.size) {
      hit('T10', darkBlocks[0].offset, `${file.rel} dark theme`, 'no base :root theme map');
    } else {
      for (const b of darkBlocks) {
        const missing = b.keys.filter((k) => !baseRootKeys.has(k));
        if (missing.length) {
          hit('T10', b.offset, `${short(b.sel, 48)} → ${missing.join(',')}`, 'theme role missing from base :root');
        }
      }
    }
    const [first, ...rest] = darkBlocks;
    for (const b of rest) {
      const extra = b.keys.filter((k) => !first.keys.includes(k));
      const gone = first.keys.filter((k) => !b.keys.includes(k));
      if (extra.length || gone.length) {
        hit('T10', b.offset, `${short(b.sel, 48)} → +${extra.join(',') || '∅'} −${gone.join(',') || '∅'}`, 'theme maps disagree');
      }
    }
  }
  for (const b of blocks) {
    if (b.sel !== ':root') continue;
    const props = customProps(b.body, b.offset);
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
      T10: keptBudget.T10.length,
      T13: keptBudget.T13.length,
      T14: keptBudget.T14.length,
      T15: keptBudget.T15.length,
    },
  });
}

/* ---------------------------------------------------------------- totals */

const classes = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'U1'];
const fileTClasses = ['T1', 'T2', 'T3', 'T4w', 'T4f', 'T10', 'T13', 'T14', 'T15'];
const globalTClasses = ['T8', 'T9', 'T11'];
const ALL_CLASSES = [...classes, ...fileTClasses, ...globalTClasses];

/* T8 — a token defined in tokens.css that no product page consumes.
   A gallery swatch proves the token renders; it does not prove a product uses
   it, so `design-system/index.html` is deliberately outside productRefs. */
const unusedTokens = [...defined].filter((name) => !productRefs.has(name)).sort();

/* T9 — two role names resolving to one value. Colors are compared across the
   whole set; dimensions only between step names of the same scale, because
   `spacing.xs` and `radius.sm` both being 8px is two scales, not two roles. */
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

/* T11 — `type` ↔ `value` shape; `other` stays out of the table on purpose. */
const t11 = [];
for (const t of tokenEntries) {
  const check = TYPE_SHAPE[t.type];
  if (!check) continue;
  if (!check(t.value)) {
    t11.push({ cls: 'T11', found: `${t.name} type=${t.type} value="${t.value}"`, note: 'type/value mismatch' });
  }
}

const globalFindings = [
  ...unusedTokens.map((name) => ({ cls: 'T8', found: name, note: 'no product consumer' })),
  ...t9,
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
const hitsOf = (cls) =>
  globalTClasses.includes(cls)
    ? globalFindings.filter((f) => f.cls === cls)
    : results.flatMap((r) => (r.budgetHits[cls] || []).map((h) => ({ ...h, file: r.file })));

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
console.log('token set (global)'.padEnd(26) + ['T8', 'T9', 'T11'].map((c) => String(totals[c]).padStart(5)).join(''));
console.log(rule);

console.log('');
console.log('Budgets');
console.log('class'.padEnd(7) + 'now'.padStart(5) + 'budget'.padStart(8) + '  status');
for (const row of budgetRows) {
  const status = row.over ? `OVER +${row.over}` : row.now < row.budget ? 'under' : 'ok';
  console.log(row.cls.padEnd(7) + String(row.now).padStart(5) + String(row.budget).padStart(8) + `  ${status}`);
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
  ['T8', 'Token defined in tokens.css with no `var()` reference from a product page', 'Wire it in `index/pitch/engine.html` or delete it; gallery swatches do not count as consumption'],
  ['T9', 'Two role names resolving to one value', 'Alias one name to the other (`--other`) and remove the duplicate role'],
  ['T10', 'A dark theme block that invents a role or disagrees with the other dark map', 'Declare every theme role in the base `:root`; write the dark mapping once'],
  ['T11', 'Token `type` does not match its `value` shape', 'Fix the type or the value in `tokens.json` → regenerate'],
  ['T13', 'Two local aliases in one `:root` with the same value', 'Delete the redundant alias and keep one role name'],
  ['T14', '`!important`', 'Fix the cascade; `!important` is an escalation, not a style'],
  ['T15', 'Inline `style=` attribute', 'Move to a class in `<style>`; budget is per file'],
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
md += '| File | T1 font-size | T2 line-height | T3 tracking | T4 weight | T4 family | T10 theme parity | T13 dup alias | T14 `!important` | T15 inline `style=` |\n';
md += '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n';
for (const r of results) {
  md += `| \`${r.file}\` | ${r.counts.T1} | ${r.counts.T2} | ${r.counts.T3} | ${r.counts.T4w} | ${r.counts.T4f} | ${r.counts.T10} | ${r.counts.T13} | ${r.counts.T14} | ${r.counts.T15} |\n`;
}
md += `| **Total** | **${totals.T1}** | **${totals.T2}** | **${totals.T3}** | **${totals.T4w}** | **${totals.T4f}** | **${totals.T10}** | **${totals.T13}** | **${totals.T14}** | **${totals.T15}** |\n\n`;
md += `Token-set checks (not per file): **T8** ${totals.T8} unconsumed tokens · **T9** ${totals.T9} duplicate role values · **T11** ${totals.T11} type/value mismatch.\n\n`;

md += '## Budgets\n\n';
md += 'Each class carries the count measured on 2026-11-24 as a ceiling. A count at or under its budget is PASS; only the excess is a violation, so this receipt is green on day one and every regression fails `--check`.\n\n';
md += '| Class | Now | Budget | Status |\n|---|---:|---:|---|\n';
for (const row of budgetRows) {
  const status = row.over ? `OVER +${row.over}` : row.now < row.budget ? 'under' : 'ok';
  const seed = BUDGET_SEED[row.cls];
  const note = seed
    ? ` (per file ${Object.entries(seed).map(([f, n]) => `${f} ${n}`).join(', ')})`
    : '';
  md += `| ${row.cls} | ${row.now} | ${row.budget}${note} | ${status} |\n`;
}
md += '\n';

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
md += 'The three set-level checks are budgeted at today\'s measured value, so they document the gap without failing the build until it grows.\n\n';
md += `### T8 — no product consumer (${totals.T8})\n\n`;
md += 'A `var()` reference in `index.html`, `pitch.html` or `engine.html` counts; a gallery swatch does not. Tokens are declared in `tokens.css` and referenced nowhere in the product.\n\n';
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
md += 'One regex per declared type: `color`, `dimension`, `fontSize`, `lineHeight`, `letterSpacing`, `fontWeight`, `fontFamily`, `duration`, `cubicBezier`, `boxShadow`, `number`. The 24 tokens typed `other` are not judged yet — Phase 2 retypes them.\n\n';
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
md += '- Media-query breakpoints stay raw px (`var()` is invalid in `@media`).\n';
md += '- `design-system/tokens.css` is the token source and is never scanned.\n';
md += '- Page-local alias declarations in `:root` are legal when they resolve to a token: `--bg:var(--color-wiki-light-bg)`. `--spacing-*` is the only scale that may hold rhythm.\n';
md += '- A hex color is legal only as a `var()` fallback: `var(--color-x, #fff)`.\n';
md += '- Spacing is a 2px grid: `padding`/`margin`/`gap` take `var(--spacing-2|2xs|6|xs|10|sm|14|md|18|20|lg|xl|2xl)` or `0`/`auto`/a percentage. `width`, `height`, `top`, `left`, `inset`, `transform` and `grid-template` are geometry and stay out of V8.\n';
md += '- Layout-scale padding above 48px, negative offsets, and off-grid values (22.4, 25.6, 41.6, 86.4, 118) that would move more than 0.9px are kept literal with an in-place `lint-allow` reason.\n';
md += '- Budgets are ceilings, not exemptions: the count measured on 2026-11-24 stays visible, no file is excluded from any check, and a count below budget is progress. Only the excess fails `--check`.\n';
md += '- `T8` counts `var()` references inside `<style>`/`<script>` of the three product pages; `design-system/index.html` is the system\'s own documentation and never counts as a consumer.\n';
md += '- `T9` compares colors across the whole set but dimensions only between step names of one scale (`spacing.base ≡ spacing.2xs`), because `spacing.xs` and `radius.sm` both being 8px is two scales, not two roles.\n';
md += '- `T10` compares each dark theme block with the base `:root` key set and with the other dark block in the same file; the duplicated dark map must stay identical.\n';
md += '- `T11` validates the 11 declared types; the 24 tokens typed `other` are outside the table until Phase 2 retypes them.\n';
md += '- `T15` is budgeted per file (index 19, pitch 31, engine 2, gallery 148) so inline styles cannot migrate into the largest page without failing.\n';

if (!CHECK) {
  const prev = fs.existsSync(REPORT) ? fs.readFileSync(REPORT, 'utf8') : null;
  if (prev !== md) fs.writeFileSync(REPORT, md);
}

process.exit(failed ? 1 : 0);
