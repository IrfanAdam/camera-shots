/* ==========================================================================
   a11y/lib/harness.mjs — one headless Chrome harness for axe + keyboard smoke.

   Pinned by scripts/a11y/package.json (puppeteer 24.10.2, axe-core 4.10.3);
   `npm ci --prefix scripts/a11y` installs Chrome for Testing with it, so CI and
   a laptop run the same browser build. No external requests are allowed: any
   URL that is not the local harness origin is aborted, which keeps runs
   deterministic and offline.
   ========================================================================== */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const AXE_PATH = path.join(HERE, '..', 'node_modules', 'axe-core', 'axe.min.js');

export const VIEWPORTS = {
  wide: { width: 1440, height: 900 },
  narrow: { width: 390, height: 844 },
};

export async function launchBrowser() {
  return puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
    ],
  });
}

/**
 * Open `url` with console/pageerror capture and local-only networking.
 * `theme` is applied two ways: prefers-color-scheme is emulated and the
 * `data-theme` / `data-ds-theme` attributes are set on <html> once parsed, so
 * both the page scheme and the DS role map switch together.
 */
export async function openPage(browser, url, { viewport = 'wide', theme = null } = {}) {
  const page = await browser.newPage();
  const errors = [];
  const failed = [];
  const origin = new URL(url).origin;

  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('requestfailed', (req) => {
    if (new URL(req.url()).origin === origin) failed.push(`requestfailed: ${req.url()} ${req.failure()?.errorText || ''}`);
  });

  await page.setRequestInterception(true);
  page.on('request', (req) => {
    let same = false;
    try { same = new URL(req.url()).origin === origin; } catch { same = false; }
    if (same || req.url().startsWith('data:') || req.url() === 'about:blank') {
      req.continue();
    } else {
      /* Fulfil offline instead of aborting: an aborted image logs
         "Failed to load resource" to the console, which would drown the real
         page errors this harness is looking for. */
      req.respond({ status: 204, contentType: 'text/plain', body: '' }).catch(() => {});
    }
  });

  const vp = VIEWPORTS[viewport] || viewport;
  await page.setViewport({ width: vp.width, height: vp.height });
  /* Reduced motion is always on for the gate: it removes the one source of
     nondeterminism in a contrast run (a fade mid-flight changes the blended
     foreground colour axe samples) and it is a supported user setting the DS
     claims to honour. */
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  if (theme) {
    await page.emulateMediaFeatures([
      { name: 'prefers-color-scheme', value: theme },
      { name: 'prefers-reduced-motion', value: 'reduce' },
    ]);
    await page.evaluateOnNewDocument((t) => {
      try { localStorage.setItem('cse-theme', t); } catch { /* file:// or blocked */ }
      const root = document.documentElement;
      const apply = () => {
        root.setAttribute('data-theme', t);
        root.setAttribute('data-ds-theme', t === 'dark' ? 'wiki-dark' : 'wiki-light');
      };
      if (root) apply();
    }, theme);
  }

  const response = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  if (!response || !response.ok()) {
    throw new Error(`GET ${url} -> ${response ? response.status() : 'no response'}`);
  }
  if (theme) {
    await page.evaluate((t) => {
      const root = document.documentElement;
      root.setAttribute('data-theme', t);
      root.setAttribute('data-ds-theme', t === 'dark' ? 'wiki-dark' : 'wiki-light');
    }, theme);
  }
  await settle(page);
  return { page, errors, failed };
}

/** One paint + microtask drain. No arbitrary sleeps. */
export async function settle(page) {
  await page.evaluate(() => new Promise((resolve) => {
    for (const a of document.getAnimations()) {
      try { a.finish(); } catch { /* infinite or scroll-driven: leave it */ }
    }
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
}

/** Network failures are not page bugs: the harness serves offline on purpose. */
const NETWORK_NOISE = /net::ERR_|Failed to load resource|CORS policy|Access to fetch at|ERR_BLOCKED_BY_CLIENT/i;

export function classifyErrors(errors) {
  const js = errors.filter((e) => !NETWORK_NOISE.test(e));
  const offline = errors.filter((e) => NETWORK_NOISE.test(e));
  return { js, offline };
}

export async function injectAxe(page) {
  await page.addScriptTag({ path: AXE_PATH });
  const version = await page.evaluate(() => window.axe && window.axe.version);
  if (!version) throw new Error('axe-core did not install itself on window');
  return version;
}

export async function runAxe(page, { tags, rules } = {}) {
  return page.evaluate(async ({ tags, rules }) => {
    const options = {
      runOnly: rules && rules.length ? { type: 'rule', values: rules } : { type: 'tag', values: tags },
      resultTypes: ['violations', 'incomplete'],
      reporter: 'v2',
    };
    return window.axe.run(document, options);
  }, { tags, rules });
}

export async function axeRules(page) {
  return page.evaluate(() => window.axe.getRules().map((r) => r.ruleId));
}

/* ------------------------------------------------------------------ keys -- */

const KEY_ALIASES = {
  Tab: 'Tab', Escape: 'Escape', Enter: 'Enter', ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight',
  ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', Home: 'Home', End: 'End', ' ': ' ',
};

export async function press(page, key, { shift = false } = {}) {
  const k = KEY_ALIASES[key] || key;
  if (shift) await page.keyboard.down('Shift');
  await page.keyboard.press(k);
  if (shift) await page.keyboard.up('Shift');
  await settle(page);
}

/** Focus descriptor for the current activeElement. */
export async function focused(page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return { tag: null, id: null, role: null, text: '', inside: null };
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      role: el.getAttribute('role'),
      cls: el.className && typeof el.className === 'string' ? el.className : '',
      text: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40),
      inside: el.closest('[data-test-scope]') ? el.closest('[data-test-scope]').getAttribute('data-test-scope') : null,
    };
  });
}

/** Focus a selector and return whether it landed. */
export async function focusSelector(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    el.focus();
    return document.activeElement === el;
  }, selector);
}

export function describe(el) {
  if (!el) return 'none';
  return `${el.tag || el.tagName}${el.id ? '#' + el.id : ''}${el.role ? `[role=${el.role}]` : ''}`;
}
