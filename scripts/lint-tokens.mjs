#!/usr/bin/env node
/* ==========================================================================
   lint-tokens.mjs — token-adherence gate (zero dependencies)
   --------------------------------------------------------------------------
   tokens.css is the only place a raw paint / motion / z / radius value may
   live. Pages consume var(--token). This script proves it, per file, per line.

   Usage:
     node scripts/lint-tokens.mjs           human table + writes audit-report.md
     node scripts/lint-tokens.mjs --check   human table only; exit 1 on failure

   Exit code: 0 = green, 1 = violations (including dead var() references).
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const TOKENS_CSS = path.join(ROOT, 'design-system', 'tokens.css');
const REPORT = path.join(ROOT, 'design-system', 'audit-report.md');

/* ------------------------------------------------------------------ targets */

const targets = ['index.html', 'pitch.html', 'engine.html'];
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

const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\s*\(/g;
const SVG_PAINT_RE = /\b(fill|stroke|stop-color)\s*=\s*(["'])(#[0-9a-fA-F]{3,8})\2/gi;
const STYLE_ATTR_RE = /\bstyle\s*=\s*(["'])([\s\S]*?)\1/gi;
const DECL_RE = (prop) => new RegExp(`(?<![-\\w])${prop}\\s*:\\s*([^;}]*)`, 'gi');

const DURATION_RE = /(?:^|[^\w.])(?:\d*\.?\d+)(?:ms|s)(?![\w])/i;
const RADIUS_UNIT_RE = /(?:\d*\.?\d+)(?:px|%|rem|em|vw|vh|vmin|vmax)\b/i;

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

  /* counts (not V-classes) */
  const varChars = masked.split('');
  maskRanges(varChars, textRanges);
  const varText = varChars.join('');
  const important = [...masked.matchAll(/!important\b/g)].length;
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

  results.push({
    file: file.rel,
    violations: violations.sort((a, b) => a.line - b.line || a.cls.localeCompare(b.cls)),
    deadVars: deadVars.sort((a, b) => a.line - b.line),
    important,
    inlineStyles: styleAttrs.length,
    varUses,
    counts: {
      V1: violations.filter((v) => v.cls === 'V1').length,
      V2: violations.filter((v) => v.cls === 'V2').length,
      V3: violations.filter((v) => v.cls === 'V3').length,
      V4: violations.filter((v) => v.cls === 'V4').length,
      V5: violations.filter((v) => v.cls === 'V5').length,
      V6: violations.filter((v) => v.cls === 'V6').length,
      U1: deadVars.length,
    },
  });
}

/* ---------------------------------------------------------------- totals */

const classes = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'U1'];
const totals = Object.fromEntries(classes.map((c) => [c, 0]));
let totalImportant = 0;
let totalInline = 0;
let totalVars = 0;
for (const r of results) {
  for (const c of classes) totals[c] += r.counts[c];
  totalImportant += r.important;
  totalInline += r.inlineStyles;
  totalVars += r.varUses;
}
const totalViolations = classes.reduce((n, c) => n + totals[c], 0);
const failed = totalViolations > 0;

/* ---------------------------------------------------------- console table */

const header =
  'file'.padEnd(26) + ['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'U1'].map((c) => c.padStart(5)).join('') +
  '!imp'.padStart(6) + 'inline'.padStart(8) + 'var()'.padStart(8);
const rule = '-'.repeat(header.length);

console.log('');
console.log(`DS token-adherence gate — ${results.length} file(s) scanned, ${defined.size} tokens defined in tokens.css`);
console.log(rule);
console.log(header);
console.log(rule);
for (const r of results) {
  console.log(
    r.file.padEnd(26) +
      classes.map((c) => String(r.counts[c]).padStart(5)).join('') +
      String(r.important).padStart(6) +
      String(r.inlineStyles).padStart(8) +
      String(r.varUses).padStart(8)
  );
}
console.log(rule);
console.log(
  'TOTAL'.padEnd(26) +
    classes.map((c) => String(totals[c]).padStart(5)).join('') +
    String(totalImportant).padStart(6) +
    String(totalInline).padStart(8) +
    String(totalVars).padStart(8)
);
console.log(rule);

for (const r of results) {
  if (!r.violations.length && !r.deadVars.length) continue;
  console.log(`\n${r.file}`);
  for (const v of r.violations) {
    console.log(`  ${String(v.line).padStart(5)}:${String(v.col).padEnd(4)} ${v.cls}  ${v.note.padEnd(18)} ${v.found}`);
  }
  for (const d of r.deadVars) {
    console.log(`  ${String(d.line).padStart(5)}:${String(d.col).padEnd(4)} U1  ${'undefined token'.padEnd(18)} ${d.name}`);
  }
}

console.log(
  `\nRESULT: ${totalViolations} violation(s) across ${results.length} file(s) — ${failed ? 'FAIL' : 'PASS'}`
);
if (failed) {
  const summary = classes.filter((c) => totals[c]).map((c) => `${c}=${totals[c]}`).join(' ');
  console.log(`        ${summary}`);
}
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
  ['U1', 'Dead `var(--name)`: not defined in tokens.css and not declared in this page', 'Add the token to `design-system/tokens.json` → regenerate, or use the existing token; never rely on a fallback'],
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
md += `- Result: **${failed ? 'FAIL' : 'PASS'}** — ${totalViolations} violation(s)\n\n`;

md += '## Per-file violations\n\n';
md += '| File | V1 color | V2 motion | V3 z-index | V4 radius | V5 inline paint | V6 svg paint | U1 dead var | `!important` | inline `style=` | `var(--)` uses |\n';
md += '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n';
for (const r of results) {
  md += `| \`${r.file}\` | ${r.counts.V1} | ${r.counts.V2} | ${r.counts.V3} | ${r.counts.V4} | ${r.counts.V5} | ${r.counts.V6} | ${r.counts.U1} | ${r.important} | ${r.inlineStyles} | ${r.varUses} |\n`;
}
md += `| **Total** | **${totals.V1}** | **${totals.V2}** | **${totals.V3}** | **${totals.V4}** | **${totals.V5}** | **${totals.V6}** | **${totals.U1}** | **${totalImportant}** | **${totalInline}** | **${totalVars}** |\n\n`;

md += '## Violation detail\n\n';
let anyDetail = false;
for (const r of results) {
  if (!r.violations.length && !r.deadVars.length) continue;
  anyDetail = true;
  md += `### \`${r.file}\`\n\n`;
  md += '| Line | Class | Found |\n|---:|---|---|\n';
  const rows = [
    ...r.violations.map((v) => [v.line, v.cls, v.found]),
    ...r.deadVars.map((d) => [d.line, 'U1', d.name]),
  ].sort((a, b) => a[0] - b[0] || String(a[1]).localeCompare(String(b[1])));
  for (const [line, cls, found] of rows) {
    md += `| ${line} | ${cls} | \`${mdEscape(found)}\` |\n`;
  }
  md += '\n';
}
if (!anyDetail) md += '_No violations._\n\n';

md += '## How to fix\n\n';
md += '| Class | Meaning | Fix with |\n|---|---|---|\n';
for (const [cls, meaning, fix] of LEGEND) md += `| ${cls} | ${meaning} | ${fix} |\n`;
md += '\n';
md += '### Documented exceptions\n\n';
md += '- Media-query breakpoints stay raw px (`var()` is invalid in `@media`).\n';
md += '- `design-system/tokens.css` is the token source and is never scanned.\n';
md += '- Page-local alias declarations in `:root` are legal when they resolve to a token: `--bg:var(--color-wiki-light-bg)`.\n';
md += '- A hex color is legal only as a `var()` fallback: `var(--color-x, #fff)`.\n';

if (!CHECK) {
  const prev = fs.existsSync(REPORT) ? fs.readFileSync(REPORT, 'utf8') : null;
  if (prev !== md) fs.writeFileSync(REPORT, md);
}

process.exit(failed ? 1 : 0);
