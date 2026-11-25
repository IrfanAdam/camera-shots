#!/usr/bin/env node
/* ==========================================================================
   check-keyboard.mjs — keyboard smoke for the gallery specimens, headless.

   design-system/index.html loads components.js with `data-ds-manual`, so the
   specimens are static markup: the gate instantiates the shipped behaviours on
   the specimen DOM (no page edit, no file fork) and drives them with real key
   events through CDP:

     1. tabs      — ArrowRight/ArrowLeft/Home/End move focus and selection,
                    and exactly one tab stays in the tab order (roving).
     2. dialog    — open puts focus inside, Tab and Shift+Tab cycle inside the
                    box, background is inert, Escape closes and returns focus.
     3. menu      — ArrowDown opens onto the first item, arrows rove, Escape
                    closes and returns focus to the trigger.

   Fails on any assertion failure or page JS error (network noise is classified
   separately: the harness serves offline on purpose).

   --break=tab-arrows|dialog-trap|menu-escape are negative-test seams: they
   sabotage the one behaviour under test in the page, so the corresponding
   assertion must fail and the script must exit 1.
   ========================================================================== */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './a11y/lib/server.mjs';
import { launchBrowser, openPage, press, focused, classifyErrors, settle } from './a11y/lib/harness.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const rows = [];
function check(name, ok, detail) {
  rows.push({ name, ok: !!ok, detail });
}

async function installBreak(page, kind) {
  if (!kind) return;
  await page.evaluate((k) => {
    if (k === 'dialog-trap') {
      window.addEventListener('keydown', (ev) => {
        if (ev.key === 'Tab') ev.stopPropagation();
      }, true);
    }
    if (k === 'menu-escape') {
      /* DS closes an open menu from a document-level Escape handler too, so the
         sabotage has to sit above document: window capture. */
      window.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') ev.stopPropagation();
      }, true);
    }
    if (k === 'tab-arrows') {
      const target = document.querySelector('#spec-tabs .ds-tabs');
      if (target) target.addEventListener('keydown', (ev) => ev.stopPropagation(), true);
    }
  }, kind);
}

/* ------------------------------------------------------------------- tabs -- */

async function testTabs(page) {
  const setup = await page.evaluate(() => {
    const root = document.querySelector('#spec-tabs .ds-tabs');
    if (!root) return { ok: false, detail: 'no #spec-tabs .ds-tabs in the gallery' };
    root.setAttribute('data-test-scope', 'tabs');
    const api = window.DS.tabs(root);
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    window.__tabs = api;
    window.__tabRoot = root;
    tabs[0].focus();
    return {
      ok: document.activeElement === tabs[0],
      count: tabs.length,
      hasPanels: !!root.parentElement.querySelector('[role="tabpanel"]'),
    };
  });
  check('tabs: specimen found and DS.tabs instantiated', setup.ok && setup.count >= 3, `tabs=${setup.count}`);
  if (!setup.ok) return;

  const roving = await page.evaluate(() => {
    const tabs = [...window.__tabRoot.querySelectorAll('[role="tab"]')];
    return {
      focusable: tabs.filter((t) => t.getAttribute('tabindex') === '0').length,
      selected: tabs.filter((t) => t.getAttribute('aria-selected') === 'true').length,
    };
  });
  check('tabs: one tab in the tab order, one selected', roving.focusable === 1 && roving.selected === 1,
    `tabindex=0 ×${roving.focusable}, selected ×${roving.selected}`);

  await press(page, 'ArrowRight');
  const afterRight = await page.evaluate(() => {
    const tabs = [...window.__tabRoot.querySelectorAll('[role="tab"]')];
    return { index: tabs.indexOf(document.activeElement), selected: tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true') };
  });
  check('tabs: ArrowRight moves focus to tab 2', afterRight.index === 1, `focus index ${afterRight.index}`);
  check('tabs: ArrowRight activates tab 2', afterRight.selected === 1, `selected index ${afterRight.selected}`);

  await press(page, 'ArrowLeft');
  const afterLeft = await page.evaluate(() => [...window.__tabRoot.querySelectorAll('[role="tab"]')].indexOf(document.activeElement));
  check('tabs: ArrowLeft returns to tab 1', afterLeft === 0, `focus index ${afterLeft}`);

  await press(page, 'End');
  const afterEnd = await page.evaluate(() => [...window.__tabRoot.querySelectorAll('[role="tab"]')].indexOf(document.activeElement));
  check('tabs: End moves to the last tab', afterEnd === setup.count - 1, `focus index ${afterEnd}`);

  await press(page, 'Home');
  const afterHome = await page.evaluate(() => [...window.__tabRoot.querySelectorAll('[role="tab"]')].indexOf(document.activeElement));
  check('tabs: Home returns to the first tab', afterHome === 0, `focus index ${afterHome}`);
}

/* ----------------------------------------------------------------- dialog -- */

async function testDialog(page) {
  const setup = await page.evaluate(() => {
    const cell = document.querySelector('#spec-dialog .spec-cell');
    const dlg = cell && cell.querySelector('.ds-dialog');
    if (!dlg) return { ok: false, detail: 'no #spec-dialog .ds-dialog' };
    cell.setAttribute('data-test-scope', 'dialog');
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.id = 'dsKeyboardTrigger';
    trigger.textContent = 'Open specimen dialog';
    cell.insertBefore(trigger, cell.firstChild);
    const api = window.DS.overlay(dlg);
    window.__dlg = api;
    window.__dlgEl = dlg;
    window.__dlgTrigger = trigger;
    trigger.focus();
    api.open();
    return { ok: true };
  });
  if (!setup.ok) { check('dialog: specimen found', false, setup.detail); return; }
  await settle(page);

  const opened = await page.evaluate(() => {
    const el = window.__dlgEl;
    const active = document.activeElement;
    const box = el.querySelector('.ds-dialog__box') || el;
    const labelId = el.getAttribute('aria-labelledby');
    let top = el;
    while (top.parentElement && top.parentElement !== document.body) top = top.parentElement;
    const siblings = [...document.body.children].filter((k) => k !== top && !['SCRIPT', 'STYLE', 'LINK'].includes(k.tagName));
    return {
      inside: box.contains(active),
      role: el.getAttribute('role'),
      modal: el.getAttribute('aria-modal'),
      labelled: !!(labelId && document.getElementById(labelId)),
      inertSiblings: siblings.filter((k) => k.hasAttribute('inert')).length,
      siblingCount: siblings.length,
      activeText: (active?.textContent || '').trim().slice(0, 20),
    };
  });
  check('dialog: open moves focus inside the box', opened.inside, `focus on "${opened.activeText}"`);
  check('dialog: role=dialog + aria-modal + resolvable label',
    opened.role === 'dialog' && opened.modal === 'true' && opened.labelled,
    `role=${opened.role} aria-modal=${opened.modal} labelled=${opened.labelled}`);
  check('dialog: every background sibling is inert while open',
    opened.siblingCount > 0 && opened.inertSiblings === opened.siblingCount,
    `${opened.inertSiblings}/${opened.siblingCount} body-level siblings inert`);

  let stayed = true;
  let seen = [];
  for (let i = 0; i < 6; i += 1) {
    await press(page, 'Tab');
    const state = await page.evaluate(() => {
      const el = window.__dlgEl;
      return { inside: el.contains(document.activeElement), text: (document.activeElement?.textContent || '').trim().slice(0, 12) };
    });
    seen.push(state.text || '?');
    if (!state.inside) stayed = false;
  }
  check('dialog: Tab ×6 never leaves the box', stayed, `stops: ${seen.join(' → ')}`);

  const shifted = await page.evaluate(() => {
    const el = window.__dlgEl;
    const box = el.querySelector('.ds-dialog__box') || el;
    const list = [...box.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')];
    const first = list[0];
    const last = list[list.length - 1];
    first.focus();
    return { first: first.textContent.trim(), last: last.textContent.trim(), count: list.length };
  });
  await press(page, 'Tab', { shift: true });
  const wrapped = await page.evaluate(() => {
    const el = window.__dlgEl;
    const box = el.querySelector('.ds-dialog__box') || el;
    const list = [...box.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')];
    return { atLast: document.activeElement === list[list.length - 1], text: document.activeElement.textContent.trim() };
  });
  check('dialog: Shift+Tab from first wraps to last', wrapped.atLast, `${shifted.first} → ${wrapped.text}`);

  await press(page, 'Escape');
  const closed = await page.evaluate(() => ({
    open: window.__dlg.isOpen,
    hidden: window.__dlgEl.hasAttribute('hidden'),
    returned: document.activeElement === window.__dlgTrigger,
    ariaModal: window.__dlgEl.getAttribute('aria-modal'),
  }));
  check('dialog: Escape closes', closed.open === false && closed.hidden, `isOpen=${closed.open} hidden=${closed.hidden}`);
  check('dialog: Escape returns focus to the invoker', closed.returned, 'focus should be on #dsKeyboardTrigger');
  check('dialog: closed dialog is not left aria-modal-exposed', closed.ariaModal === 'true' && closed.hidden,
    'aria-modal stays on a hidden element, which is safe only because it is hidden');
}

/* ------------------------------------------------------------------- menu -- */

async function testMenu(page) {
  const setup = await page.evaluate(() => {
    const cell = document.querySelector('#spec-menu .spec-cell');
    const menu = cell && cell.querySelector('.ds-menu');
    if (!menu) return { ok: false, detail: 'no #spec-menu .ds-menu' };
    cell.setAttribute('data-test-scope', 'menu');
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.id = 'dsMenuTrigger';
    trigger.textContent = 'Shot actions';
    cell.insertBefore(trigger, cell.firstChild);
    const api = window.DS.menu(trigger, menu);
    window.__menu = api;
    window.__menuEl = menu;
    window.__menuTrigger = trigger;
    trigger.focus();
    return { ok: true, items: menu.querySelectorAll('[role="menuitem"]').length };
  });
  if (!setup.ok) { check('menu: specimen found', false, setup.detail); return; }

  await press(page, 'ArrowDown');
  const opened = await page.evaluate(() => ({
    expanded: window.__menuTrigger.getAttribute('aria-expanded'),
    hidden: window.__menuEl.hasAttribute('hidden'),
    first: document.activeElement === window.__menuEl.querySelector('[role="menuitem"]'),
    text: (document.activeElement?.textContent || '').trim(),
  }));
  check('menu: ArrowDown opens and focuses the first item',
    opened.expanded === 'true' && !opened.hidden && opened.first, `focus "${opened.text}"`);

  await press(page, 'ArrowDown');
  const second = await page.evaluate(() => {
    const items = [...window.__menuEl.querySelectorAll('[role="menuitem"]')];
    return { index: items.indexOf(document.activeElement), text: document.activeElement.textContent.trim() };
  });
  check('menu: ArrowDown roves to item 2', second.index === 1, `focus index ${second.index} "${second.text}"`);

  await press(page, 'Escape');
  const closed = await page.evaluate(() => ({
    expanded: window.__menuTrigger.getAttribute('aria-expanded'),
    hidden: window.__menuEl.hasAttribute('hidden'),
    returned: document.activeElement === window.__menuTrigger,
  }));
  check('menu: Escape closes and returns focus to the trigger',
    closed.expanded === 'false' && closed.hidden && closed.returned,
    `expanded=${closed.expanded} hidden=${closed.hidden} returned=${closed.returned}`);
}

/* -------------------------------------------------------------------- run -- */

async function main(argv) {
  const opts = { root: ROOT, break: null, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const eq = a.indexOf('=');
    const key = eq > 0 ? a.slice(0, eq) : a;
    const inline = eq > 0 ? a.slice(eq + 1) : null;
    if (key === '--root') opts.root = path.resolve(inline ?? argv[++i]);
    else if (key === '--break') opts.break = inline ?? argv[++i];
    else if (a === '--json') opts.json = true;
    else if (a === '--help' || a === '-h') {
      console.log('usage: node scripts/check-keyboard.mjs [--root <tree>] [--break=tab-arrows|dialog-trap|menu-escape] [--json]');
      return 0;
    } else {
      console.error(`unknown argument: ${a}`);
      return 2;
    }
  }
  if (opts.break && !['tab-arrows', 'dialog-trap', 'menu-escape'].includes(opts.break)) {
    console.error(`unknown break seam: ${opts.break}`);
    return 2;
  }

  const server = await startServer(opts.root);
  const browser = await launchBrowser();
  const jsErrors = [];
  const offline = [];
  try {
    /* the specimen blocks (#spec-tabs, #spec-dialog, #spec-menu) live inside the
       #specimens tabpanel; the gallery shows one panel at a time, so the page
       must be entered through its hash route or the assertions act on hidden
       DOM. The hash also selects the matching tab, exactly as a deep link does. */
    const { page, errors } = await openPage(browser, `${server.origin}/design-system/index.html#specimens`);
    const cls = classifyErrors(errors);
    jsErrors.push(...cls.js);
    offline.push(...cls.offline);
    await installBreak(page, opts.break);

    const order = opts.break === 'menu-escape' ? ['menu'] : opts.break === 'dialog-trap' ? ['dialog'] : ['tabs', 'dialog', 'menu'];
    if (order.includes('tabs')) await testTabs(page);
    if (order.includes('dialog')) await testDialog(page);
    if (order.includes('menu')) await testMenu(page);

    const after = classifyErrors(errors.slice(cls.js.length));
    jsErrors.push(...after.js);
    await page.close();
  } finally {
    await browser.close();
    await server.close();
  }

  for (const e of jsErrors) check('console: no page JS errors', false, e);
  if (!jsErrors.length) check('console: no page JS errors', true, '0 console.error / pageerror');

  const failed = rows.filter((r) => !r.ok);
  if (opts.json) {
    process.stdout.write(JSON.stringify({ rows, failed: failed.length, offline: offline.length, break: opts.break }, null, 2) + '\n');
  } else {
    console.log(`keyboard smoke — gallery specimens${opts.break ? ` (break seam: ${opts.break})` : ''}`);
    for (const r of rows) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name}${r.detail ? `\n     ${r.detail}` : ''}`);
    if (offline.length) console.log(`\noffline network noise ignored: ${offline.length} (harness serves with no external requests)`);
    console.log(`\nRESULT ${failed.length ? 'FAIL' : 'PASS'} — ${rows.length} assertions, ${failed.length} failing`);
    for (const f of failed) console.error(`  FAIL ${f.name}: ${f.detail}`);
  }
  return failed.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((c) => process.exit(c)).catch((e) => { console.error(e.stack || String(e)); process.exit(1); });
}
