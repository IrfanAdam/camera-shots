#!/usr/bin/env node
/* ==========================================================================
   check-contrast.mjs — WCAG 2.2 contrast for the DS role pairs, computed from
   design-system/tokens.css (the generated file the pages actually load).

   It reads the same `:root` primitives and `[data-ds-theme]` maps the browser
   reads, resolves the var() chain, and checks a declared pair table. Pairs that
   are known to fail carry a debt annotation (owner + the measured ratio at the
   time it was recorded); a debt pair that gets *worse* fails, and a pair that
   improves above its floor is reported as FIXED so the annotation is removed.

   Exit 1 when a pair without a debt annotation fails, or when a debt pair
   regresses. Exit 0 when HEAD matches the documented state — which is NOT
   "0 failures": see design-system/accessibility.md.
   ========================================================================== */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const TOLERANCE = 0.02;

export const THEMES = ['pitch', 'wiki-light', 'wiki-dark', 'engine'];

/* WCAG 1.4.3 threshold. Text is judged at 4.5 even for the small sizes the
   system ships (12.8–13.6px); the 3:1 large-text allowance is not used
   anywhere, so a pair that only passes at 3:1 still fails. */
const TEXT = 4.5;

/*
  Declared pairs. `themes` defaults to all four. Every pair below is a slot the
  shipped CSS actually combines (button label, card text, badge, link, focus
  ring). `debt.expect` records, per theme, a known sub-threshold result with the
  owner and the node measured in the audit — it is printed on every run and must
  not regress. A pair is only debt in the themes listed there; elsewhere it must
  pass outright.
*/
export const PAIRS = [
  { id: 'ink/bg', label: 'body text on page', fg: '--ds-ink', bg: '--ds-bg', min: TEXT },
  { id: 'ink/surface', label: 'body text on card', fg: '--ds-ink', bg: '--ds-surface', min: TEXT },
  { id: 'ink-2/surface', label: 'secondary text on card', fg: '--ds-ink-2', bg: '--ds-surface', min: TEXT },
  { id: 'muted/bg', label: 'muted text on page', fg: '--ds-muted', bg: '--ds-bg', min: TEXT },
  { id: 'muted/surface', label: 'muted text on card', fg: '--ds-muted', bg: '--ds-surface', min: TEXT },
  { id: 'faint/surface', label: 'faint text / placeholder on card', fg: '--ds-faint', bg: '--ds-surface', min: TEXT },
  { id: 'on-accent/accent', label: 'primary button label', fg: '--ds-on-accent', bg: '--ds-accent', min: TEXT },
  { id: 'accent/bg', label: 'link text + focus ring on page', fg: '--ds-accent', bg: '--ds-bg', min: TEXT },
  { id: 'accent/surface', label: 'link text on card', fg: '--ds-accent', bg: '--ds-surface', min: TEXT },
  { id: 'success/surface', label: 'success text on card', fg: '--ds-success', bg: '--ds-surface', min: TEXT },
  {
    id: 'warning/surface', label: 'warning text on card', fg: '--ds-warning', bg: '--ds-surface', min: TEXT,
    debt: {
      owner: 'Task 27 (contrast tokens)',
      expect: {
        pitch: { ratio: 4.47, node: 'pitch amber note text 4.47:1' },
        'wiki-light': { ratio: 4.12, node: 'wiki light `h2 small` 4.12:1' },
      },
    },
  },
  {
    id: 'danger/surface', label: 'danger text on card', fg: '--ds-danger', bg: '--ds-surface', min: TEXT,
    debt: {
      owner: 'Task 27 (contrast tokens)',
      expect: {
        'wiki-light': { ratio: 3.91, node: 'gallery `span.badge-dev` 3.68:1 on page bg' },
        'wiki-dark': { ratio: 4.45, node: 'wiki dark danger note 4.45:1' },
        engine: { ratio: 4.24, node: 'engine danger note 4.24:1' },
      },
    },
  },
  /* The four nodes the audit measured, expressed with the tokens the pages
     actually combine, so the gate sees the same colour maths. */
  {
    id: 'white/wikidark-accent', label: 'wiki dark `.eng` label (page uses primitive white)',
    themes: ['wiki-dark'], fg: '--color-primitive-white', bg: '--ds-accent', min: TEXT,
    debt: { owner: 'Task 27 (contrast tokens)', expect: { 'wiki-dark': { ratio: 2.05, node: 'wiki dark `a.eng` 2.05:1' } } },
  },
  {
    id: 'white/status-info', label: 'gallery `badge--paid` label (page uses primitive white)',
    themes: ['wiki-light'], fg: '--color-primitive-white', bg: '--color-status-info', min: TEXT,
    debt: { owner: 'Task 27 (contrast tokens)', expect: { 'wiki-light': { ratio: 4.25, node: 'gallery `span.badge--paid` 4.25:1' } } },
  },
  {
    id: 'danger/wikil-bg', label: 'gallery `badge-dev` label on page bg', themes: ['wiki-light'],
    fg: '--color-status-danger', bg: '--color-wiki-light-bg', min: TEXT,
    debt: { owner: 'Task 27 (contrast tokens)', expect: { 'wiki-light': { ratio: 3.68, node: 'gallery `span.badge-dev` 3.68:1 ×8' } } },
  },
];

/* --------------------------------------------------------------- parsing -- */

import { blocks, customProperties } from './a11y/lib/css.mjs';

export function parseTokens(css) {
  const root = new Map();
  const fallthrough = new Map();
  const themes = new Map(THEMES.map((t) => [t, new Map()]));
  for (const { selector, body } of blocks(css)) {
    const adds = customProperties(body);
    if (!adds.length) continue;
    if (/(^|,)\s*:root\s*(,|$)/.test(selector)) {
      for (const [k, v] of adds) root.set(k, v);
      continue;
    }
    const m = selector.match(/\[data-ds-theme(?:=["']?([\w-]+)["']?)?\]/);
    if (!m) continue;
    const theme = m[1];
    if (!theme) {
      for (const [k, v] of adds) fallthrough.set(k, v);
    } else if (themes.has(theme)) {
      for (const [k, v] of adds) themes.get(theme).set(k, v);
    }
  }
  return { root, fallthrough, themes };
}

export function scopeFor(tokens, theme) {
  const map = new Map(tokens.root);
  for (const [k, v] of tokens.fallthrough) map.set(k, v);
  for (const [k, v] of tokens.themes.get(theme) || []) map.set(k, v);
  return map;
}

export function resolveVar(scope, name, seen = new Set()) {
  if (seen.has(name)) throw new Error(`var() cycle at ${name}`);
  if (!scope.has(name)) return null;
  let value = scope.get(name).trim();
  seen.add(name);
  for (let guard = 0; guard < 12; guard += 1) {
    const m = value.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)$/);
    if (!m) break;
    const next = resolveVar(scope, m[1], seen);
    if (next === null) {
      if (m[2] === undefined) return null;
      value = m[2].trim();
    } else {
      value = next;
    }
  }
  return value;
}

/** sRGB colour -> {r,g,b,a} (0-255, a 0-1), or null. */
export function parseColor(input) {
  if (!input) return null;
  const v = input.trim().toLowerCase();
  if (v === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  const hex = v.match(/^#([0-9a-f]{3,8})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (h.length === 4) h = h.split('').map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
    };
  }
  const fn = v.match(/^rgba?\(([^)]+)\)$/);
  if (!fn) return null;
  const parts = fn[1].split(/[,/\s]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const num = (s, max) => (s.endsWith('%') ? (parseFloat(s) / 100) * max : parseFloat(s));
  const a = parts[3] === undefined ? 1 : parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
  return { r: num(parts[0], 255), g: num(parts[1], 255), b: num(parts[2], 255), a: Number.isFinite(a) ? a : 1 };
}

function composite(fg, bg) {
  if (fg.a >= 1) return fg;
  const a = fg.a;
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
    a: 1,
  };
}

function channel(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance({ r, g, b }) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(fg, bg) {
  const solidBg = bg.a >= 1 ? bg : composite(bg, { r: 255, g: 255, b: 255, a: 1 });
  const solidFg = composite(fg, solidBg);
  const l1 = luminance(solidFg);
  const l2 = luminance(solidBg);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

/* ------------------------------------------------------------------ run --- */

export function evaluate(tokens) {
  const rows = [];
  for (const theme of THEMES) {
    const scope = scopeFor(tokens, theme);
    for (const pair of PAIRS) {
      if (pair.themes && !pair.themes.includes(theme)) continue;
      const fgRaw = resolveVar(scope, pair.fg);
      const bgRaw = resolveVar(scope, pair.bg);
      const row = {
        theme, id: pair.id, label: pair.label, min: pair.min,
        fgToken: pair.fg, bgToken: pair.bg,
        fg: fgRaw, bg: bgRaw, ratio: null, state: 'SKIP', note: '',
      };
      const fg = parseColor(fgRaw);
      const bg = parseColor(bgRaw);
      if (!fg || !bg || fg.a === 0) {
        row.note = !fgRaw || !bgRaw ? 'token unresolved' : 'non-opaque pair — not machine-checkable';
        rows.push(row);
        continue;
      }
      row.ratio = Number(contrast(fg, bg).toFixed(2));
      const expect = pair.debt && pair.debt.expect ? pair.debt.expect[theme] : null;
      if (row.ratio + 1e-9 >= pair.min) {
        row.state = 'PASS';
        if (expect) {
          row.state = 'FIXED';
          row.note = `was ${expect.ratio}:1 (${pair.debt.owner}) — remove the debt entry`;
        }
      } else if (expect) {
        row.state = row.ratio < expect.ratio - TOLERANCE ? 'REGRESSED' : 'DEBT';
        row.note = `${pair.debt.owner}: ${expect.node}`;
      } else {
        row.state = 'FAIL';
      }
      rows.push(row);
    }
  }
  return rows;
}

function table(rows) {
  const head = 'theme       pair                          ratio   min   state';
  const lines = rows.map((r) => [
    r.theme.padEnd(11),
    r.id.padEnd(29),
    (r.ratio === null ? '  —  ' : r.ratio.toFixed(2)).padStart(5),
    r.min.toFixed(2).padStart(5),
    r.state,
  ].join(' '));
  return [head, ...lines].join('\n');
}

async function main(argv) {
  let tokensPath = path.join(ROOT, 'design-system', 'tokens.css');
  let json = false;
  let report = null;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--tokens') tokensPath = path.resolve(argv[++i]);
    else if (a === '--json') json = true;
    else if (a === '--report') report = path.resolve(argv[++i]);
    else if (a === '--help' || a === '-h') {
      console.log('usage: node scripts/check-contrast.mjs [--tokens design-system/tokens.css] [--json] [--report out.json]');
      return 0;
    } else {
      console.error(`unknown argument: ${a}`);
      return 2;
    }
  }
  const css = await readFile(tokensPath, 'utf8');
  const rows = evaluate(parseTokens(css));

  const fails = rows.filter((r) => r.state === 'FAIL' || r.state === 'REGRESSED');
  const debts = rows.filter((r) => r.state === 'DEBT');
  const fixed = rows.filter((r) => r.state === 'FIXED');
  const skipped = rows.filter((r) => r.state === 'SKIP');

  if (json) {
    const payload = { tokens: path.relative(ROOT, tokensPath), rows, fails: fails.length, debt: debts.length };
    process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
  } else {
    console.log(`contrast gate — ${path.relative(ROOT, tokensPath)}`);
    console.log(table(rows));
    if (skipped.length) {
      console.log(`\nskipped ${skipped.length} (non-opaque / unresolved):`);
      for (const r of skipped) console.log(`  · ${r.theme} ${r.id} — ${r.note}`);
    }
    if (debts.length) {
      console.log(`\nknown debt — ${debts.length} theme×pair below threshold, owned, not a pass:`);
      for (const r of debts) console.log(`  · ${r.theme} ${r.id} ${r.ratio}:1 (needs ${r.min}:1) — ${r.note}`);
    }
    if (fixed.length) {
      console.log('\nimproved — remove the debt annotation for:');
      for (const r of fixed) console.log(`  · ${r.theme} ${r.id} ${r.ratio}:1`);
    }
    for (const r of fails) {
      console.error(`\nFAIL ${r.theme} ${r.id} (${r.label}): ${r.ratio}:1 < ${r.min}:1  [${r.fgToken} on ${r.bgToken}]`);
    }
    console.log(`\nRESULT ${fails.length ? 'FAIL' : 'PASS'} — ${rows.length - skipped.length} pairs checked, ` +
      `${fails.length} failing, ${debts.length} known debt, ${skipped.length} skipped`);
  }
  if (report) {
    const fs = await import('node:fs/promises');
    await fs.writeFile(report, JSON.stringify({ tokens: path.relative(ROOT, tokensPath), rows }, null, 2));
  }
  return fails.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => process.exit(code)).catch((err) => {
    console.error(err.stack || String(err));
    process.exit(1);
  });
}
