#!/usr/bin/env node
/* ==========================================================================
   check-shots.mjs — the visual artifact job: 12 page states, captured headless.

   Matrix: the four shipped surfaces at 1440 and 390, with every scheme the
   surface declares — wiki (index.html) light + dark, the gallery light + dark,
   pitch and engine in their own single palette. 12 PNGs, written to
   `artifacts/shots/` for upload; nothing is committed.

   Fails on:
     · a page JS error (console.error or pageerror) at any matrix cell
     · horizontal overflow: documentElement/body scrollWidth - clientWidth > 1px
     · a capture that is missing or suspiciously small (a blank page compresses
       to almost nothing, so size is the cheap "did it paint" assertion)

   The job is artifact-only: it records what shipped, it does not pixel-diff
   against a reference. That blind spot is stated in design-system/verification.md.

   Serves on an ephemeral loopback port via the shared helper — never 5173.
   ========================================================================== */
import { mkdir, rm, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './lib/server.mjs';
import { launchBrowser, openPage, settle, classifyErrors } from './lib/harness.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');

/* width is the viewport width; `vp` names the harness preset. */
export const SHOT_MATRIX = [
  { id: 'wiki-light-1440', file: 'index.html', theme: 'light', vp: 'wide' },
  { id: 'wiki-dark-1440', file: 'index.html', theme: 'dark', vp: 'wide' },
  { id: 'wiki-light-390', file: 'index.html', theme: 'light', vp: 'narrow' },
  { id: 'wiki-dark-390', file: 'index.html', theme: 'dark', vp: 'narrow' },
  { id: 'pitch-1440', file: 'pitch.html', theme: null, vp: 'wide' },
  { id: 'pitch-390', file: 'pitch.html', theme: null, vp: 'narrow' },
  { id: 'engine-1440', file: 'engine.html', theme: null, vp: 'wide' },
  { id: 'engine-390', file: 'engine.html', theme: null, vp: 'narrow' },
  { id: 'gallery-light-1440', file: 'design-system/index.html', theme: 'light', vp: 'wide' },
  { id: 'gallery-dark-1440', file: 'design-system/index.html', theme: 'dark', vp: 'wide' },
  { id: 'gallery-light-390', file: 'design-system/index.html', theme: 'light', vp: 'narrow' },
  { id: 'gallery-dark-390', file: 'design-system/index.html', theme: 'dark', vp: 'narrow' },
];

const MIN_BYTES = 5 * 1024;
const OVERFLOW_TOLERANCE = 1;

async function main(argv) {
  const opts = { root: ROOT, out: path.join(ROOT, 'artifacts', 'shots'), only: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--root') opts.root = path.resolve(argv[++i]);
    else if (a === '--out') opts.out = path.resolve(argv[++i]);
    else if (a === '--only') opts.only = argv[++i];
    else if (a === '--help' || a === '-h') {
      console.log('usage: node scripts/a11y/check-shots.mjs [--root <tree>] [--out <dir>] [--only <shot-id>]');
      return 0;
    } else {
      console.error(`unknown argument: ${a}`);
      return 2;
    }
  }

  const cells = SHOT_MATRIX.filter((c) => !opts.only || c.id === opts.only);
  if (!cells.length) {
    console.error(`FAIL no matrix cell matches --only ${opts.only}`);
    return 2;
  }

  await rm(opts.out, { recursive: true, force: true });
  await mkdir(opts.out, { recursive: true });

  const server = await startServer(opts.root);
  const browser = await launchBrowser();
  const failures = [];
  const records = [];

  try {
    for (const cell of cells) {
      const url = `${server.origin}/${cell.file}`;
      const { page, errors } = await openPage(browser, url, { viewport: cell.vp, theme: cell.theme });
      try {
        /* Weights are local by design (the harness serves offline); waiting on
           document.fonts keeps a capture from freezing a fallback face. */
        await page.evaluate(() => document.fonts.ready);
        await settle(page);

        const metrics = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          return {
            width: window.innerWidth,
            height: doc.scrollHeight,
            overflow: Math.max(
              doc.scrollWidth - doc.clientWidth,
              body ? body.scrollWidth - body.clientWidth : 0,
            ),
          };
        });

        const file = path.join(opts.out, `${cell.id}.png`);
        await page.screenshot({ path: file, fullPage: true });
        const { size } = await stat(file);

        const { js } = classifyErrors(errors);
        if (js.length) {
          for (const e of js) failures.push({ id: cell.id, kind: 'page-error', detail: e });
        }
        if (metrics.overflow > OVERFLOW_TOLERANCE) {
          failures.push({
            id: cell.id,
            kind: 'overflow',
            detail: `horizontal overflow ${metrics.overflow}px at ${metrics.width}px (tolerance ${OVERFLOW_TOLERANCE}px)`,
          });
        }
        if (size < MIN_BYTES) {
          failures.push({ id: cell.id, kind: 'capture', detail: `PNG is ${size} bytes — did the page paint?` });
        }

        records.push({ id: cell.id, file: cell.file, theme: cell.theme, ...metrics, bytes: size, jsErrors: js.length });
        console.log(
          `${cell.id.padEnd(20)} ${String(metrics.width).padStart(4)}px  ` +
            `h=${String(metrics.height).padStart(5)}  overflow=${metrics.overflow}px  ` +
            `js=${js.length}  ${(size / 1024).toFixed(0)}KB`,
        );
        for (const e of js) console.log(`   · ${e.slice(0, 200)}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }

  const manifest = {
    generatedBy: 'scripts/a11y/check-shots.mjs',
    tolerancePx: OVERFLOW_TOLERANCE,
    screenshots: records,
    failures,
  };
  await writeFile(path.join(opts.out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

  if (failures.length) {
    for (const f of failures) console.error(`\nFAIL ${f.id} ${f.kind}: ${f.detail}`);
    console.error(`\nRESULT: FAIL — ${failures.length} failure(s) across ${records.length} capture(s)`);
    return 1;
  }
  console.log(`\nRESULT: PASS — ${records.length} capture(s), 0 page errors, 0 overflow > ${OVERFLOW_TOLERANCE}px`);
  console.log(`artifacts: ${path.relative(ROOT, opts.out)}/`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((c) => process.exit(c)).catch((e) => { console.error(e.stack || String(e)); process.exit(1); });
}
