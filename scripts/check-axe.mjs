#!/usr/bin/env node
/* ==========================================================================
   check-axe.mjs — axe-core over the four shipped surfaces, headless.

   Serves the repo on an ephemeral loopback port (never 5173), loads each
   surface at a pinned viewport and theme, injects axe-core 4.10.3 from the
   pinned harness, and fails on any serious/critical violation that is not in
   scripts/a11y/baseline.json.

   The baseline is a ratchet, not a pass: every entry names a rule, a count, an
   owner and a reason, and the run prints each allowed node. A count above the
   baseline fails; a count below it is reported as improved. `color-contrast`
   entries are Task 27 debt (see design-system/accessibility.md) — this job
   does not call the system accessible while they exist.
   ========================================================================== */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './a11y/lib/server.mjs';
import { launchBrowser, openPage, injectAxe, runAxe, axeRules, classifyErrors } from './a11y/lib/harness.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

export const SURFACES = [
  { id: 'wiki:light:1440', file: 'index.html', theme: 'light', viewport: 'wide' },
  { id: 'wiki:dark:1440', file: 'index.html', theme: 'dark', viewport: 'wide' },
  { id: 'wiki:light:390', file: 'index.html', theme: 'light', viewport: 'narrow' },
  { id: 'pitch:default:1440', file: 'pitch.html', theme: null, viewport: 'wide' },
  { id: 'pitch:default:390', file: 'pitch.html', theme: null, viewport: 'narrow' },
  { id: 'engine:default:1440', file: 'engine.html', theme: null, viewport: 'wide' },
  { id: 'gallery:light:1440', file: 'design-system/index.html', theme: 'light', viewport: 'wide' },
  { id: 'gallery:dark:1440', file: 'design-system/index.html', theme: 'dark', viewport: 'wide' },
  { id: 'gallery:light:390', file: 'design-system/index.html', theme: 'light', viewport: 'narrow' },
];

/* Rules the gate insists on running, so a silently narrowed axe build cannot
   turn the job green. */
export const REQUIRED_RULES = [
  'color-contrast',
  'aria-allowed-attr',
  'aria-roles',
  'aria-required-attr',
  'button-name',
  'link-name',
  'image-alt',
  'label',
  'select-name',
  'duplicate-id-aria',
  'landmark-one-main',
  'region',
  'tabindex',
  'scrollable-region-focusable',
];

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const BLOCKING = new Set(['critical', 'serious']);

async function main(argv) {
  const opts = {
    baseline: path.join(ROOT, 'scripts', 'a11y', 'baseline.json'),
    json: false,
    requireRule: null,
    only: null,
    root: ROOT,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--baseline') opts.baseline = path.resolve(argv[++i]);
    else if (a === '--json') opts.json = true;
    else if (a === '--require-rule') opts.requireRule = argv[++i];
    else if (a === '--only') opts.only = argv[++i];
    else if (a === '--root') opts.root = path.resolve(argv[++i]);
    else if (a === '--help' || a === '-h') {
      console.log('usage: node scripts/check-axe.mjs [--baseline scripts/a11y/baseline.json] [--require-rule id] [--only surface-id] [--root <tree>] [--json]');
      return 0;
    } else {
      console.error(`unknown argument: ${a}`);
      return 2;
    }
  }

  const baseline = JSON.parse(await readFile(opts.baseline, 'utf8'));
  const server = await startServer(opts.root);
  const browser = await launchBrowser();
  const runs = [];
  const failures = [];
  const consoleErrors = [];
  let requiredChecked = false;

  try {
    for (const surface of SURFACES) {
      if (opts.only && surface.id !== opts.only) continue;
      const { page, errors } = await openPage(browser, `${server.origin}/${surface.file}`, {
        viewport: surface.viewport,
        theme: surface.theme,
      });
      const version = await injectAxe(page);
      if (opts.requireRule) {
        const ids = await axeRules(page);
        if (!ids.includes(opts.requireRule)) {
          console.error(`FAIL required rule "${opts.requireRule}" is not in axe-core ${version} — the runner would silently skip it`);
          return 1;
        }
      }
      if (!requiredChecked) {
        const ids = await axeRules(page);
        const missing = REQUIRED_RULES.filter((r) => !ids.includes(r));
        if (missing.length) {
          console.error(`FAIL axe-core ${version} is missing required rules: ${missing.join(', ')}`);
          return 1;
        }
        requiredChecked = true;
      }
      const results = await runAxe(page, { tags: TAGS });
      const blocking = results.violations.filter((v) => BLOCKING.has(v.impact));
      const record = {
        id: surface.id,
        axe: version,
        violations: results.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
        blocking: blocking.map((v) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          nodes: v.nodes.map((n) => {
            const data = n.any?.find((c) => c.data && c.data.contrastRatio)?.data || null;
            return {
              target: n.target.join(' '),
              summary: (n.failureSummary || '').replace(/\s+/g, ' ').trim().slice(0, 200),
              ratio: data?.contrastRatio ?? null,
              fg: data?.fgColor ?? null,
              bg: data?.bgColor ?? null,
            };
          }),
        })),
      };
      const allowedFor = baseline.surfaces?.[surface.id] || {};
      for (const v of blocking) {
        const allowed = allowedFor[v.id];
        if (!allowed) {
          failures.push({ surface: surface.id, rule: v.id, count: v.nodes.length, allowed: 0, reason: 'not in baseline' });
        } else if (v.nodes.length > allowed.count) {
          failures.push({ surface: surface.id, rule: v.id, count: v.nodes.length, allowed: allowed.count, reason: allowed.reason });
        } else if (v.nodes.length < allowed.count) {
          record.improved = record.improved || [];
          record.improved.push({ id: v.id, was: allowed.count, now: v.nodes.length });
        }
      }
      for (const [ruleId, allowed] of Object.entries(allowedFor)) {
        const seen = blocking.find((v) => v.id === ruleId);
        if (!seen) {
          record.fixed = record.fixed || [];
          record.fixed.push({ id: ruleId, was: allowed.count });
        }
      }
      const { js, offline } = classifyErrors(errors);
      for (const e of js) consoleErrors.push(`${surface.id}: ${e}`);
      if (offline.length) record.offlineErrors = offline.length;
      runs.push(record);
      await page.close();
    }
  } finally {
    await browser.close();
    await server.close();
  }

  if (consoleErrors.length) {
    failures.push({ surface: 'console', rule: 'page errors', count: consoleErrors.length, allowed: 0, reason: consoleErrors.join(' | ') });
  }

  if (opts.json) {
    process.stdout.write(JSON.stringify({ runs, failures, consoleErrors }, null, 2) + '\n');
  } else {
    console.log(`axe gate — axe-core ${runs[0]?.axe || '?'} · ${runs.length} surface runs`);
    for (const r of runs) {
      const blocking = r.blocking.map((b) => `${b.id}(${b.nodes.length})`).join(' ') || 'none';
      console.log(`${r.id.padEnd(22)} serious/critical: ${blocking}`);
      for (const b of r.blocking) {
        for (const n of b.nodes) console.log(`   · ${b.id} ${b.impact}: ${n.target}`);
      }
      for (const imp of r.improved || []) console.log(`   ↑ improved ${imp.id}: ${imp.was} -> ${imp.now} (tighten baseline.json)`);
      for (const fix of r.fixed || []) console.log(`   ✓ clean ${fix.id}: baseline allowed ${fix.was}, now 0 (remove the entry)`);
    }
    if (consoleErrors.length) {
      console.error('\nconsole/page errors:');
      for (const e of consoleErrors) console.error(`  · ${e}`);
    }
    for (const f of failures) console.error(`\nFAIL ${f.surface} ${f.rule}: ${f.count} node(s), baseline allows ${f.allowed} — ${f.reason}`);
    console.log(`\nRESULT ${failures.length ? 'FAIL' : 'PASS'} — ${runs.length} surfaces, ${failures.length} failure(s)`);
  }
  return failures.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((c) => process.exit(c)).catch((e) => { console.error(e.stack || String(e)); process.exit(1); });
}
