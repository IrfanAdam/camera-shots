#!/usr/bin/env node
/* ==========================================================================
   check-targets.mjs — static target-size audit of the shared control layer.

   The rule the system documents: every interactive primitive resolves to at
   least --touch-min (40px) on a fine pointer and --control-height-touch (44px)
   on a coarse one, unless the control carries the dense-row opt-out
   [data-ds-compact] (or a compact size/density), which is allowed the 34px
   --control-height-compact step and nothing below it.

   This reads CSS text, not a browser: it proves the token flow (base.css floor
   → components.css --_ctl-h → control.height.* tokens) and catches a literal
   height below the floor. It cannot measure a rendered box or padding-derived
   height — accessibility.md states that limit.

   Exit 1 on any violation, including a 24px control (the negative test).
   ========================================================================== */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { blocks, customProperties, declarations, selectorList, toPx } from './a11y/lib/css.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const FLOOR = 40;      // --touch-min
const COARSE = 44;     // --control-height-touch
const COMPACT = 34;    // --control-height-compact
const PRIMITIVES = ['a', 'button', '[role="button"]', '[role="tab"]', '[role="menuitem"]',
  '[role="switch"]', 'summary', 'input', 'select', 'textarea'];

const CONTROL_RE = /(?:\.ds-(?:btn|icon-btn|input|select|textarea|chip|tab|nav-item|menu__item|switch|theme-toggle|copy|field))\b|\[role=(["']?)(?:tab|menuitem|menuitemcheckbox|menuitemradio|button|switch)\1\]/;
const HEIGHT_PROPS = ['height', 'min-height', 'block-size', 'min-block-size', 'max-height'];
const EXEMPT_RE = /\[data-ds-compact\]|data-size=(["']?)compact\1|data-ds-density=(["']?)compact\2/;

function tokenMap(css) {
  const map = new Map();
  for (const { selector, body } of blocks(css)) {
    if (!/(^|,)\s*:root\s*(,|$)/.test(selector)) continue;
    for (const [k, v] of customProperties(body)) map.set(k, v);
  }
  return map;
}

function resolve(map, value, depth = 0) {
  if (depth > 8) return null;
  if (!value) return null;
  const m = value.trim().match(/^var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)$/);
  if (!m) return value;
  const next = map.get(m[1]);
  if (next === undefined) return m[2] !== undefined ? resolve(map, m[2], depth + 1) : null;
  return resolve(map, next, depth + 1);
}

const rows = [];
function record(state, subject, detail, extra = {}) {
  rows.push({ state, subject, detail, ...extra });
}

/* ------------------------------------------------------------------ floor -- */

function checkFloor(baseCss, tokens) {
  const floorRule = blocks(baseCss).find(({ body, selector }) =>
    !selector.includes('@media') &&
    /min-block-size\s*:\s*var\(--touch-min\)/.test(body) &&
    /button:not\(\[data-ds-compact\]\)/.test(selector));
  if (!floorRule) {
    record('FAIL', 'base.css §6 target floor', 'no rule sets min-block-size:var(--touch-min) on controls with the [data-ds-compact] opt-out');
  } else {
    const px = toPx(resolve(tokens, 'var(--touch-min)'));
    const missing = PRIMITIVES.filter((p) => !floorRule.selector.includes(`${p}:not([data-ds-compact])`));
    const where = floorRule.selector.trim().startsWith(':where(');
    if (px === null || px < FLOOR) {
      record('FAIL', 'base.css §6 target floor', `--touch-min resolves to ${px === null ? 'nothing' : px + 'px'} (needs ${FLOOR})`);
    } else if (missing.length) {
      record('FAIL', 'base.css §6 target floor', `floor omits primitives: ${missing.join(' ')}`);
    } else if (!where) {
      record('FAIL', 'base.css §6 target floor', 'floor is not wrapped in :where() — it would outrank page rules');
    } else {
      record('PASS', 'base.css §6 target floor', `${px}px · ${PRIMITIVES.length}/${PRIMITIVES.length} primitives · :where() · compact opt-out`);
    }
  }

  const coarse = blocks(baseCss).find(({ body, at, selector }) =>
    at.some((a) => /pointer:coarse/.test(a)) &&
    /min-block-size\s*:\s*var\(--control-height-touch\)/.test(body) &&
    /button:not\(\[data-ds-compact\]\)/.test(selector));
  if (!coarse) {
    record('FAIL', 'base.css §8 coarse floor', 'no @media (pointer:coarse) floor at --control-height-touch');
  } else {
    const px = toPx(resolve(tokens, 'var(--control-height-touch)'));
    record(px !== null && px >= COARSE ? 'PASS' : 'FAIL', 'base.css §8 coarse floor',
      `@media (pointer:coarse) ${px === null ? 'unresolved' : px + 'px'} (needs ${COARSE})`);
  }
}

/* ------------------------------------------------------------- components -- */

function checkComponents(css, tokens) {
  let flowSeen = 0;
  for (const { selector, body, at } of blocks(css)) {
    if (at.length && at.some((a) => /prefers-reduced-motion/.test(a))) continue;
    const decls = declarations(body);
    const exempt = EXEMPT_RE.test(selector);
    const control = CONTROL_RE.test(selector);

    for (const [prop, raw] of customProperties(body)) {
      if (prop !== '--_ctl-h') continue;
      flowSeen += 1;
      const resolved = resolve(tokens, raw);
      const px = toPx(resolved);
      const subject = `--_ctl-h · ${selector.trim().slice(0, 90)}`;
      if (px === null) {
        record('FAIL', subject, `cannot resolve ${raw} through tokens.css`);
      } else if (exempt) {
        record(px >= COMPACT ? 'PASS' : 'FAIL', subject, `${px}px compact exemption (floor ${COMPACT})`);
      } else if (px < FLOOR) {
        record('FAIL', subject, `${px}px < ${FLOOR}px floor — no [data-ds-compact] / compact size on this selector`);
      } else {
        record('PASS', subject, `${px}px`);
      }
    }

    if (!control || /::/.test(selector)) continue; // pseudo-element paint, not a hit target
    for (const prop of HEIGHT_PROPS) {
      if (!decls.has(prop)) continue;
      const raw = decls.get(prop);
      if (/^var\(--_ctl-h\)$/.test(raw.trim())) continue; // covered above
      if (/^calc\(|^auto$|^fit-content|^100%$/.test(raw.trim())) continue;
      const resolved = resolve(tokens, raw);
      const px = toPx(resolved);
      if (px === null) continue;
      const subject = `${prop} · ${selector.trim().slice(0, 90)}`;
      if (exempt) {
        record(px >= COMPACT ? 'PASS' : 'FAIL', subject, `${px}px compact exemption (floor ${COMPACT})`);
      } else if (px < FLOOR) {
        record('FAIL', subject, `${px}px < ${FLOOR}px floor on a control`);
      } else {
        record('PASS', subject, `${px}px`);
      }
    }
  }
  if (!flowSeen) record('FAIL', 'components.css control height flow', 'no --_ctl-h declaration found — the control height token chain is gone');
}

/* ------------------------------------------------------------------- run -- */

async function main(argv) {
  const opts = {
    tokens: path.join(ROOT, 'design-system', 'tokens.css'),
    base: path.join(ROOT, 'design-system', 'base.css'),
    components: path.join(ROOT, 'design-system', 'components.css'),
    extra: null,
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--tokens') opts.tokens = path.resolve(argv[++i]);
    else if (a === '--base') opts.base = path.resolve(argv[++i]);
    else if (a === '--components') opts.components = path.resolve(argv[++i]);
    else if (a === '--css') opts.extra = path.resolve(argv[++i]);
    else if (a === '--json') opts.json = true;
    else if (a === '--help' || a === '-h') {
      console.log('usage: node scripts/check-targets.mjs [--tokens t.css] [--base base.css] [--components components.css] [--css extra.css] [--json]');
      return 0;
    } else {
      console.error(`unknown argument: ${a}`);
      return 2;
    }
  }

  const tokens = tokenMap(await readFile(opts.tokens, 'utf8'));
  const baseCss = await readFile(opts.base, 'utf8');
  let componentsCss = await readFile(opts.components, 'utf8');
  if (opts.extra) componentsCss += '\n' + await readFile(opts.extra, 'utf8');

  checkFloor(baseCss, tokens);
  checkComponents(componentsCss, tokens);

  const fails = rows.filter((r) => r.state === 'FAIL');
  if (opts.json) {
    process.stdout.write(JSON.stringify({ rows, fails: fails.length }, null, 2) + '\n');
  } else {
    console.log('target-size gate — static CSS, min 40px (34px compact exemption)');
    for (const r of rows) console.log(`${r.state.padEnd(4)} ${r.subject}\n     ${r.detail}`);
    console.log(`\nRESULT ${fails.length ? 'FAIL' : 'PASS'} — ${rows.length} checks, ${fails.length} failing`);
    for (const f of fails) console.error(`  FAIL ${f.subject}: ${f.detail}`);
  }
  return fails.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((c) => process.exit(c)).catch((e) => { console.error(e.stack || String(e)); process.exit(1); });
}
