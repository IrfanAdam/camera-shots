/* ==========================================================================
   gallery-specimens.js — hydrates the #spec-* band template from the index.

   The markup is authored once, with honest fallback text: names, roles,
   variant/state/size lists and token *names* are editorial; every count, every
   token value and every status claim comes from `usage.json` + `tokens.json`
   at runtime. Nothing is copied into the HTML, so the gallery cannot disagree
   with the committed index — and when the fetch fails the page keeps its
   authored text and shows no error UI.

   Contract (implemented here, never in the index):
     · an article is [data-usage-component="<specimen key>"]
     · [data-status] is the one status chip; filled Live / Reference only,
       with a `· n legacy` suffix for variants the block documents as legacy
     · [data-usage="variants|states|sizes|reach"] are meta values
     · [data-usage-count="wiki|pitch|engine"] are the per-surface counts; they
       live in the Instances cell, inside [data-usage-surfaces], which this file
       prunes to the surfaces that actually carry the block ("Wiki 4 · Engine 29")
     · [data-usage-source] is the components.css block number
     · [data-usage-token] chips are (re)filled from tokens.json
     · [data-usage-ledger] receives the zero-product ledger

   No innerHTML. Every fetched string reaches the DOM through textContent.
   One IIFE, one global: window.DSSpecimens.
   ========================================================================== */
(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.DSSpecimens && window.DSSpecimens.__dsspec) return;

  var VERSION = '1.0.0';

  /* primary class per specimen block — identity, not a measurement */
  var COMPONENT = {
    'btn': 'ds-btn',
    'icon-btn': 'ds-icon-btn',
    'field': 'ds-field',
    'switch': 'ds-switch',
    'tabs': 'ds-tabs',
    'navigation': 'ds-tabs',
    'chip': 'ds-chip',
    'badge': 'ds-badge',
    'card': 'ds-card',
    'surface': 'ds-surface',
    'table': 'ds-table',
    'drawer': 'ds-drawer',
    'dialog': 'ds-dialog',
    'menu': 'ds-menu',
    'toast': 'ds-toast',
    'empty': 'ds-empty',
    'progress': 'ds-progress',
    'tooltip': 'ds-tooltip',
    'nav': 'ds-pager',
    'copy': 'ds-copy'
  };

  /* a grammar block documents more than one component; its numbers are the
     union of the blocks those classes live in (tabs §5, rail §20, nav item §18) */
  var AGGREGATE = {
    navigation: ['ds-tabs', 'ds-rail', 'ds-nav-item']
  };

  var SURFACES = [
    { id: 'wiki', label: 'Wiki' },
    { id: 'pitch', label: 'Pitch' },
    { id: 'engine', label: 'Engine' }
  ];

  var state = {
    status: 'fallback',      /* fallback | hydrated */
    usage: null,
    tokens: null,
    components: 0,
    ledger: 0,
    hydratedAt: 0
  };

  /* ------------------------------------------------------------- utilities */

  function text(node, value) {
    if (node) node.textContent = value === undefined || value === null ? '' : String(value);
  }

  function clear(node) {
    if (!node) return;
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function el(tag, cls, value) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (value !== undefined && value !== null) node.textContent = String(value);
    return node;
  }

  function list(values) {
    return values && values.length ? values.join(' · ') : '—';
  }

  function uniqueSorted(values) {
    var seen = Object.create(null);
    var out = [];
    (values || []).forEach(function (v) {
      if (!v || seen[v]) return;
      seen[v] = true;
      out.push(v);
    });
    return out.sort();
  }

  function plural(n, one, many) {
    return String(n) + ' ' + (n === 1 ? one : many);
  }

  /* --------------------------------------------------------- index reading */

  function blockNumbers(usage, spec) {
    var classes = AGGREGATE[spec] || [COMPONENT[spec]];
    var out = [];
    classes.forEach(function (name) {
      var rec = usage.components && usage.components[name];
      if (!rec || rec.block === undefined || rec.block === null) return;
      if (out.indexOf(rec.block) < 0) out.push(rec.block);
    });
    return out;
  }

  function blockClasses(usage, nums) {
    var out = [];
    nums.forEach(function (n) {
      var block = usage.blocks && usage.blocks[String(n)];
      (block && block.classes ? block.classes : []).forEach(function (c) {
        if (out.indexOf(c) < 0) out.push(c);
      });
    });
    return out;
  }

  function aggregate(usage, nums, classes) {
    var out = {
      instances: 0,
      productInstances: 0,
      bySurface: { wiki: 0, pitch: 0, engine: 0 },
      variants: [],
      states: [],
      sizes: [],
      hasProductInstance: false
    };
    nums.forEach(function (n) {
      var block = usage.blocks && usage.blocks[String(n)];
      if (!block) return;
      out.instances += Number(block.instances) || 0;
      out.productInstances += Number(block.productInstances) || 0;
      SURFACES.forEach(function (s) {
        out.bySurface[s.id] += Number(block.bySurface && block.bySurface[s.id]) || 0;
      });
      if (block.hasProductInstance) out.hasProductInstance = true;
    });
    classes.forEach(function (name) {
      var rec = usage.components && usage.components[name];
      if (!rec) return;
      out.variants = out.variants.concat(rec.variants || []);
      out.states = out.states.concat(rec.states || []);
      out.sizes = out.sizes.concat(rec.sizes || []);
    });
    out.variants = uniqueSorted(out.variants);
    out.states = uniqueSorted(out.states);
    out.sizes = uniqueSorted(out.sizes);
    return out;
  }

  function tokensFor(usage, nums) {
    var out = [];
    var names = Object.keys(usage.tokens || {});
    names.forEach(function (name) {
      var rec = usage.tokens[name];
      var blocks = rec && rec.usedByBlocks ? rec.usedByBlocks : [];
      var hit = blocks.some(function (n) { return nums.indexOf(n) >= 0; });
      if (hit) out.push(name);
    });
    out.sort(function (a, b) {
      var ga = (usage.tokens[a].group || '') + ' ' + a;
      var gb = (usage.tokens[b].group || '') + ' ' + b;
      return ga < gb ? -1 : ga > gb ? 1 : 0;
    });
    return out;
  }

  function tokenValue(name, usage, tokens) {
    var rec = usage.tokens && usage.tokens[name];
    if (!rec) return '';
    var raw = tokens[rec.jsonKey];
    if (raw && raw.value !== undefined) return raw.value;
    return rec.value === undefined || rec.value === null ? '' : rec.value;
  }

  /* ---------------------------------------------------------------- filling */

  function fillStatus(root, agg, legacy) {
    var chip = root.querySelector('[data-status]');
    var label = agg.hasProductInstance ? 'Live' : 'Reference only';
    if (legacy.length) label += ' · ' + plural(legacy.length, 'legacy', 'legacy');
    root.setAttribute('data-usage-status', agg.hasProductInstance ? 'live' : 'reference');
    text(chip, label);
  }

  function fillFacts(root, agg, legacy) {
    var variants = agg.variants.map(function (v) {
      return legacy.indexOf(v) >= 0 ? v + ' (legacy)' : v;
    });
    text(root.querySelector('[data-usage="variants"]'), list(variants));
    text(root.querySelector('[data-usage="states"]'), list(agg.states));
    text(root.querySelector('[data-usage="sizes"]'), list(agg.sizes));

    var live = SURFACES.filter(function (s) { return agg.bySurface[s.id] > 0; }).length;
    text(root.querySelector('[data-usage="reach"]'),
      plural(agg.productInstances, 'instance', 'instances') + ' on ' +
      plural(live, 'surface', 'surfaces'));
  }

  function fillUsedOn(root, agg) {
    SURFACES.forEach(function (s) {
      var node = root.querySelector('[data-usage-count="' + s.id + '"]');
      text(node, agg.bySurface[s.id]);
      var link = node && node.closest ? node.closest('a') : null;
      if (link) {
        if (agg.bySurface[s.id] > 0) link.setAttribute('data-used', 'yes');
        else link.setAttribute('data-used', 'no');
      }
    });

    /* The breakdown lives in the meta strip, one line, so a zero surface is
       dropped instead of printed: "Wiki 4 · Engine 29". Separators are rebuilt
       from the surviving links, which keeps the row free of double dots and
       trailing ones when a block has no product instance at all. */
    var wrap = root.querySelector('[data-usage-surfaces]');
    if (!wrap) return;
    Array.prototype.slice.call(wrap.querySelectorAll('.comp-dot')).forEach(function (dot) {
      if (dot.parentNode) dot.parentNode.removeChild(dot);
    });
    Array.prototype.slice.call(wrap.querySelectorAll('a[data-used="no"]')).forEach(function (link) {
      if (link.parentNode) link.parentNode.removeChild(link);
    });
    var links = Array.prototype.slice.call(wrap.querySelectorAll('a'));
    for (var i = links.length - 1; i > 0; i -= 1) {
      wrap.insertBefore(document.createTextNode(' · '), links[i]);
    }
    if (!links.length) {
      var sep = root.querySelector('.comp-fact-sep');
      if (sep && sep.parentNode) sep.parentNode.removeChild(sep);
    }
  }

  function fillSource(root, nums) {
    text(root.querySelector('[data-usage-source]'), '§' + nums.join('·'));
  }

  function fillTokens(root, usage, tokens, nums) {
    var row = root.querySelector('[data-usage-tokens]');
    if (!row) return;
    var anatomy = row.querySelector('.comp-classes');
    var names = tokensFor(usage, nums);
    if (!names.length) return;

    /* keep the anatomy string (last child, so it never hides the tokens), and
       replace every chip so the row cannot mix an authored token with an
       indexed one */
    var kids = Array.prototype.slice.call(row.children);
    kids.forEach(function (kid) {
      if (kid !== anatomy) row.removeChild(kid);
    });
    var frag = document.createDocumentFragment();
    names.forEach(function (name) {
      var chip = el('span', 'comp-token');
      chip.setAttribute('data-usage-token', name);
      var code = el('code', null, name);
      var val = el('b', null, tokenValue(name, usage, tokens) || '—');
      val.setAttribute('data-token-value', '');
      chip.appendChild(code);
      chip.appendChild(val);
      frag.appendChild(chip);
    });
    if (anatomy) row.insertBefore(frag, anatomy);
    else row.appendChild(frag);
  }

  function renderTokens(usage, tokens) {
    var chips = document.querySelectorAll('[data-usage-token]');
    for (var i = 0; i < chips.length; i += 1) {
      var name = chips[i].getAttribute('data-usage-token');
      var val = chips[i].querySelector('[data-token-value]');
      var value = tokenValue(name, usage, tokens);
      if (val && value) text(val, value);
    }
  }

  function fillBlock(root, usage, tokens) {
    var spec = root.getAttribute('data-usage-component');
    if (!spec || !COMPONENT[spec]) return false;
    var nums = blockNumbers(usage, spec);
    if (!nums.length) return false;
    var agg = aggregate(usage, nums, blockClasses(usage, nums));
    var legacy = (root.getAttribute('data-legacy') || '').split(/\s+/).filter(Boolean);

    fillStatus(root, agg, legacy);
    fillFacts(root, agg, legacy);
    fillUsedOn(root, agg);
    fillSource(root, nums);
    fillTokens(root, usage, tokens, nums);
    root.setAttribute('data-usage-block', String(nums[0]));
    return true;
  }

  function fillLedger(usage) {
    var listEl = document.querySelector('[data-usage-ledger]');
    var countEl = document.querySelector('[data-usage-ledger-count]');
    var rows = usage.ledgers &&
      usage.ledgers.componentsWithoutProductInstances &&
      usage.ledgers.componentsWithoutProductInstances.blocks;
    rows = rows || [];
    state.ledger = rows.length;
    text(countEl, rows.length ? '(' + rows.length + ')' : '(none)');
    if (!listEl) return;
    clear(listEl);
    if (!rows.length) {
      listEl.appendChild(el('li', null, 'None — every documented block has a product instance.'));
      return;
    }
    rows.forEach(function (row) {
      var li = el('li');
      var title = el('b', null, row.title || ('block ' + row.block));
      var meta = el('span', null,
        ' · ' + plural(Number(row.galleryInstances) || 0, 'gallery instance', 'gallery instances') +
        (row.classes && row.classes.length ? ' · .' + row.classes.join(' · .') : ''));
      li.appendChild(title);
      li.appendChild(meta);
      listEl.appendChild(li);
    });
  }

  /* ------------------------------------------------------- index offset ---- */

  var indexTimer = 0;

  function measureIndex() {
    indexTimer = 0;
    var root = document.documentElement;
    var nav = document.querySelector('.spec-index');
    if (!nav || !root) return;
    var sticky = window.innerWidth > 900;
    var hidden = !nav.getClientRects().length || !!nav.closest('[hidden]');
    if (!sticky || hidden) {
      /* the CSS fallback (the measured 3-row height) covers a deep link that
         arrives before the specimens panel has ever been shown */
      root.style.removeProperty('--spec-index-h');
      return;
    }
    root.style.setProperty('--spec-index-h', Math.ceil(nav.getBoundingClientRect().height) + 'px');
  }

  function scheduleIndex() {
    if (indexTimer) return;
    indexTimer = window.requestAnimationFrame ? window.requestAnimationFrame(measureIndex)
      : window.setTimeout(measureIndex, 16);
  }

  /* ------------------------------------------------------------------ boot */

  function hydrate(usage, tokens) {
    var roots = document.querySelectorAll('[data-usage-component]');
    var filled = 0;
    for (var i = 0; i < roots.length; i += 1) {
      try {
        if (fillBlock(roots[i], usage, tokens)) filled += 1;
      } catch (err) { /* one malformed block never blanks the rest */ }
    }
    renderTokens(usage, tokens);
    fillLedger(usage);
    state.status = 'hydrated';
    state.usage = usage;
    state.tokens = tokens;
    state.components = filled;
    state.hydratedAt = Date.now();
    scheduleIndex();
  }

  function fail() {
    state.status = 'fallback';
    scheduleIndex();
  }

  function fetchJson(url) {
    if (typeof window.fetch !== 'function') return Promise.reject(new Error('no fetch'));
    return window.fetch(url, { cache: 'no-store', credentials: 'same-origin' })
      .then(function (res) {
        if (!res || !res.ok) throw new Error('HTTP ' + (res ? res.status : 0));
        return res.json();
      });
  }

  function boot() {
    if (!document.querySelector('[data-usage-component]')) return;
    if (window.Promise && window.Promise.all) {
      window.Promise.all([fetchJson('usage.json'), fetchJson('tokens.json')])
        .then(function (pair) {
          if (!pair[0] || !pair[1]) return fail();
          hydrate(pair[0], pair[1]);
        })
        .catch(fail);
    } else {
      fail();
    }
    window.addEventListener('resize', scheduleIndex, { passive: true });
    window.addEventListener('hashchange', scheduleIndex);
    window.addEventListener('load', scheduleIndex);
    /* the panel is display:none until its tab is selected, so the height can
       only be measured after a tab change; the page dispatches this event */
    document.addEventListener('ds:tabchange', scheduleIndex);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(scheduleIndex, function () {});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  var DSSpecimens = {
    __dsspec: true,
    version: VERSION,
    state: function () {
      return {
        status: state.status,
        components: state.components,
        ledger: state.ledger,
        hydratedAt: state.hydratedAt
      };
    }
  };

  window.DSSpecimens = DSSpecimens;
})();
