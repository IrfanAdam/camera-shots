/* ==========================================================================
   gallery-workbench.js — inline token editing for the DS gallery.

   One dependency-free IIFE, one global (`window.DSWorkbench`). Load with a
   plain deferred <script src="gallery-workbench.js">; pair it with
   gallery-workbench.css, which owns every visual state.

   Contract with the page (implemented by the gallery markup, never by this
   file):
     · a token row is <tr data-token="color.pitch.accent"> where the dotted key
       is the same key used in tokens.json
     · the row contains [data-token-value] whose textContent is the current
       raw value of that token
     · tokens.css is linked exactly once with a normal <link rel=stylesheet>
     · the page loads gallery-workbench.css

   Modes
     live   GET /__ds/status answered 200 {enabled:true}; clicking or focusing
            a value turns it into an inline input. Enter saves, Esc cancels,
            blur saves only when the text changed. A successful save hot-swaps
            the tokens.css <link> for a ?v=<sha256> clone, so every cell that
            reads a token repaints without a reload.
     off    status was 404 / timed out / unreachable. Values stay read-only
            (cursor default, no hover underline); activating one shows the
            start command and a click-to-copy CLI fallback.

   Backend (see scripts/lib/token-write.mjs):
     GET  /__ds/status                 -> {enabled, revision, tokensCssSha, tokenCount}
     GET  /__ds/token?key=<dotted.key> -> {key, value, type, group}
     POST /__ds/token {key, value}     -> {ok, key, value, previous, sha256, css, revision, type, group, changed}
     Every call carries `x-ds-workbench: 1`; writes also send JSON.
     Errors are {error:{code, message, …}} with 400/403/404/405/413/422/429/500.

   Safety/quality rules honoured here:
     · no innerHTML anywhere — every server- or page-supplied string reaches
       the DOM through textContent
     · no eval, no new Function, no prototype edits
     · all listeners are bound once, at document level, through delegation, so
       re-rendered token tables (tabs, later panels) work with no rebinding
     · the inline input is absolutely positioned over the existing value box,
       so entering and leaving edit mode causes no layout shift
     · undo keeps the latest previous value per key for the life of the page;
       the undo toast lives 8s and is role=status aria-live=polite
   ========================================================================== */
(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.DSWorkbench && window.DSWorkbench.__dswb) return;

  var VERSION = '1.0.0';

  var HEADER = 'x-ds-workbench';
  var PROBE_MS = 1500;
  var WRITE_MS = 12000;
  var UNDO_MS = 8000;
  var REVERT_MS = 4000;
  var SWAP_FALLBACK_MS = 4000;
  var SAVED_FLASH_MS = 1200;

  var mode = 'probing';           /* probing | live | off */
  var statusInfo = null;          /* last /__ds/status payload */
  var lastStatus = 0;             /* last HTTP status this file observed */
  var lastError = null;           /* last error object, for DSWorkbench.state() */

  var undoByKey = Object.create(null); /* key -> latest previous raw value */
  var pending = [];               /* activations that arrived during the probe */
  var suppressFocus = false;

  var toast = null;
  var toastTimer = null;

  var swapQueue = [];
  var swapping = false;

  var boundRows = new WeakMap();
  var observer = null;
  var decorateTimer = null;

  /* ------------------------------------------------------------- utilities */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function clearChildren(node) {
    if (!node) return;
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function attrList() {
    return document.querySelectorAll('[data-token]');
  }

  function closestAttr(node, name) {
    while (node && node.nodeType === 1) {
      if (node.hasAttribute(name)) return node;
      node = node.parentNode;
    }
    return null;
  }

  function contains(ancestor, node) {
    if (!ancestor || !node) return false;
    while (node) {
      if (node === ancestor) return true;
      node = node.parentNode;
    }
    return false;
  }

  function readValue(info) {
    var raw = (info.valueEl.textContent || '').replace(/\s+/g, ' ').trim();
    if (raw && raw !== '—' && raw !== '–' && raw !== '-') return raw;
    return computedValue(info.key);
  }

  /* The DOM owns the displayed raw value; this is only a fallback for a row
     whose value cell has not been filled yet (the gallery paints "—" before
     its own probe runs). Custom properties keep their authored spelling, so
     #C8B28A comes back as "#C8B28A", not rgb(). */
  function computedValue(key) {
    try {
      var prop = '--' + String(key).replace(/\./g, '-');
      return window.getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
    } catch (err) {
      return '';
    }
  }

  function quoteArg(value) {
    return "'" + String(value).replace(/'/g, "'\\''") + "'";
  }

  function cssCommand(info) {
    return 'node scripts/ds-set-token.mjs ' + info.key + ' ' + quoteArg(readValue(info));
  }

  /* ------------------------------------------------------------- transport */

  function request(method, url, body, timeout, cb) {
    var xhr = new XMLHttpRequest();
    var finished = false;

    function done(err, res) {
      if (finished) return;
      finished = true;
      cb(err, res);
    }

    try {
      xhr.open(method, url, true);
    } catch (err) {
      done({ network: true }, null);
      return;
    }

    xhr.timeout = timeout || PROBE_MS;
    try {
      xhr.setRequestHeader(HEADER, '1');
      xhr.setRequestHeader('accept', 'application/json');
      if (body !== null && body !== undefined) {
        xhr.setRequestHeader('content-type', 'application/json');
      }
    } catch (err) { /* header failure surfaces as a network error below */ }

    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      var data = null;
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch (err) {
        data = null;
      }
      var retryAfter = null;
      try {
        var ra = xhr.getResponseHeader('retry-after');
        if (ra) retryAfter = Number(ra);
      } catch (err) { /* ignore */ }
      done(null, { status: xhr.status, data: data, retryAfter: retryAfter });
    };
    xhr.onerror = function () { done({ network: true }, null); };
    xhr.ontimeout = function () { done({ network: true, timeout: true }, null); };

    try {
      xhr.send(body !== null && body !== undefined ? JSON.stringify(body) : null);
    } catch (err) {
      done({ network: true }, null);
    }
  }

  function describeError(err, res) {
    if (!err) {
      if (!res || res.status === 0) return 'Workbench not reachable — is the relay still running?';
      return 'Request failed (' + res.status + ')';
    }
    if (err.kind === 'rolled-back') return 'rolled back';
    if (err.kind === 'network') return 'Workbench not reachable — is the relay still running?';
    var text = err.message || 'request rejected';
    if (err.kind === 'throttled' && err.retryAfter) {
      text += ' — retry in ' + err.retryAfter + 's';
    }
    return text;
  }

  function postToken(key, value, cb) {
    request('POST', '/__ds/token', { key: key, value: value }, WRITE_MS, function (err, res) {
      lastStatus = res ? res.status : 0;
      if (err) {
        lastError = { kind: 'network', status: 0, message: 'unreachable' };
        return cb(lastError, null);
      }
      if (res.status === 200 && res.data && res.data.ok === true) {
        lastError = null;
        return cb(null, res.data);
      }
      var e = (res.data && res.data.error) || {};
      var kind = 'error';
      if (res.status === 500) kind = 'rolled-back';
      else if (res.status === 429) kind = 'throttled';
      else if (res.status === 422 || res.status === 403 || res.status === 400 || res.status === 404 || res.status === 413) kind = 'rejected';
      lastError = {
        kind: kind,
        status: res.status,
        code: e.code || '',
        message: e.message || (res.status === 429 ? 'too many writes' : ('request failed (' + res.status + ')')),
        retryAfter: res.retryAfter || (e.retryAfterMs ? Math.ceil(e.retryAfterMs / 1000) : null)
      };
      cb(lastError, null);
    });
  }

  /* --------------------------------------------------------------- hot swap */

  function findTokensLink() {
    var links = document.querySelectorAll('link[rel~="stylesheet"]');
    for (var i = 0; i < links.length; i += 1) {
      var href = links[i].getAttribute('href') || '';
      if (/(^|\/)tokens\.css(?:[?#].*)?$/.test(href)) return links[i];
    }
    return null;
  }

  /* Insert a fresh <link> after the current one and only then drop the old
     node, so the page never renders without tokens. Both sheets apply for a
     frame or two; the later one wins, which is exactly the new file. */
  function swapTokens(sha, done) {
    var old = findTokensLink();
    if (!old || !sha || !old.parentNode) {
      if (done) done(false);
      return;
    }
    if (old.getAttribute('data-dswb-v') === sha) {
      if (done) done(true);
      return;
    }

    var href = old.getAttribute('href') || 'tokens.css';
    var base = href.split('#')[0].split('?')[0];
    var next = document.createElement('link');
    next.setAttribute('rel', 'stylesheet');
    next.setAttribute('href', base + '?v=' + encodeURIComponent(sha));
    next.setAttribute('data-dswb-v', sha);

    var settled = false;
    function settle(ok) {
      if (settled) return;
      settled = true;
      if (ok) {
        if (old.parentNode) old.parentNode.removeChild(old);
      } else {
        if (next.parentNode) next.parentNode.removeChild(next);
      }
      if (done) done(ok);
    }

    next.onload = function () { settle(true); };
    next.onerror = function () { settle(false); };
    old.parentNode.insertBefore(next, old.nextSibling);
    window.setTimeout(function () { settle(true); }, SWAP_FALLBACK_MS);
  }

  function queueSwap(sha) {
    if (!sha) return;
    swapQueue.push(sha);
    while (swapQueue.length > 1) swapQueue.shift(); /* only the latest matters */
    if (!swapping) runSwapQueue();
  }

  function runSwapQueue() {
    if (!swapQueue.length) {
      swapping = false;
      return;
    }
    swapping = true;
    var sha = swapQueue.shift();
    swapTokens(sha, function () {
      window.setTimeout(runSwapQueue, 0);
    });
  }

  function updateStatusFrom(data) {
    if (!statusInfo) statusInfo = {};
    if (data.revision !== undefined) statusInfo.revision = data.revision;
    if (data.sha256) statusInfo.tokensCssSha = data.sha256;
  }

  /* ----------------------------------------------------------------- toast */

  function ensureToast() {
    if (toast && toast.parentNode) return toast;
    toast = el('div', 'dswb-toast');
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.setAttribute('aria-atomic', 'true');
    toast.hidden = true;
    (document.body || document.documentElement).appendChild(toast);
    toast.addEventListener('focusin', function () {
      if (toastTimer) window.clearTimeout(toastTimer);
    });
    toast.addEventListener('focusout', function () {
      if (toastTimer) window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(function () {
        if (!toast || !toast.contains(document.activeElement)) hideToast();
      }, 2000);
    });
    return toast;
  }

  function revealToast(ms) {
    if (!toast) return;
    toast.hidden = false;
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      if (toast && toast.contains(document.activeElement)) {
        toastTimer = window.setTimeout(hideToast, 2000);
        return;
      }
      hideToast();
    }, ms);
  }

  function hideToast() {
    if (!toast) return;
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = null;
    toast.hidden = true;
    clearChildren(toast);
  }

  function showUndo(key, previous) {
    var t = ensureToast();
    t.className = 'dswb-toast dswb-toast--undo';
    clearChildren(t);

    var msg = el('span', 'dswb-toast__msg', 'Changed ' + key + ' —');
    var action = el('button', 'dswb-toast__action', 'Undo');
    action.type = 'button';
    action.addEventListener('click', function () {
      doUndo(key, previous, action, t);
    });

    t.appendChild(msg);
    t.appendChild(action);
    revealToast(UNDO_MS);
  }

  function doUndo(key, previous, button, t) {
    if (button.disabled) return;
    if (previous === undefined) return;
    button.disabled = true;
    button.textContent = 'Undoing…';

    postToken(key, previous, function (err, data) {
      if (err) {
        button.disabled = false;
        button.textContent = 'Undo';
        var msg = t.querySelector('.dswb-toast__msg');
        if (msg) msg.textContent = 'Undo failed — ' + describeError(err, null);
        revealToast(6000);
        return;
      }
      delete undoByKey[key];
      setRowValue(key, data.value);
      updateStatusFrom(data);
      queueSwap(data.sha256);
      clearChildren(t);
      t.className = 'dswb-toast dswb-toast--undo';
      t.appendChild(el('span', 'dswb-toast__msg', 'Reverted ' + key));
      revealToast(REVERT_MS);
    });
  }

  function showOfflineToast(info) {
    var t = ensureToast();
    t.className = 'dswb-toast dswb-toast--off';
    clearChildren(t);

    var head = el('p', 'dswb-toast__title', 'Workbench is off');
    var start = el('code', 'dswb-start', 'Start it with: DS_WORKBENCH=1 node scripts/relay.mjs');
    var command = cssCommand(info);
    var cmd = el('button', 'dswb-cmd', command);
    cmd.type = 'button';
    cmd.title = 'Copy this command';
    var hint = el('p', 'dswb-toast__hint', 'Click the command to copy the CLI fallback.');
    var close = el('button', 'dswb-toast__close', 'Dismiss');
    close.type = 'button';
    close.addEventListener('click', hideToast);

    cmd.addEventListener('click', function () {
      copyText(command, function (ok) {
        hint.textContent = ok
          ? 'Copied — paste it into a terminal, then reload.'
          : 'Copy failed — select the command text and copy it manually.';
      });
    });

    t.appendChild(head);
    t.appendChild(start);
    t.appendChild(cmd);
    t.appendChild(hint);
    t.appendChild(close);
    revealToast(UNDO_MS * 3);
  }

  function copyText(text, cb) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.className = 'dswb-copy-src';
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.setAttribute('aria-hidden', 'true');
      document.body.appendChild(ta);
      var ok = false;
      try {
        ta.select();
        ok = document.execCommand('copy');
      } catch (err) {
        ok = false;
      }
      document.body.removeChild(ta);
      cb(ok);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { cb(true); },
        function () { fallback(); }
      );
    } else {
      fallback();
    }
  }

  /* -------------------------------------------------------------- edit state */

  function rowInfo(row) {
    if (!row || row.nodeType !== 1) return null;
    var valueEl = row.querySelector ? row.querySelector('[data-token-value]') : null;
    var key = row.getAttribute ? row.getAttribute('data-token') : '';
    if (!valueEl || !key) return null;
    return { row: row, valueEl: valueEl, key: key };
  }

  function setRowState(info, state) {
    if (!info.row) return;
    if (state === 'idle') info.row.removeAttribute('data-token-state');
    else info.row.setAttribute('data-token-state', state);
  }

  function addSpinner(info) {
    removeSpinner(info);
    var spin = el('span', 'dswb-spin');
    spin.setAttribute('aria-hidden', 'true');
    info.valueEl.appendChild(spin);
    info.spinner = spin;
  }

  function removeSpinner(info) {
    if (info.spinner && info.spinner.parentNode) info.spinner.parentNode.removeChild(info.spinner);
    info.spinner = null;
  }

  function clearError(info) {
    if (info.errorEl && info.errorEl.parentNode) info.errorEl.parentNode.removeChild(info.errorEl);
    info.errorEl = null;
  }

  function showError(info, text) {
    clearError(info);
    var err = el('span', 'dswb-error', text);
    err.setAttribute('role', 'alert');
    info.errorEl = err;
    info.valueEl.appendChild(err);
  }

  function focusValue(info) {
    if (!info.valueEl || !info.valueEl.focus) return;
    suppressFocus = true;
    try {
      info.valueEl.focus({ preventScroll: true });
    } catch (err) {
      try { info.valueEl.focus(); } catch (err2) { /* ignore */ }
    }
    suppressFocus = false;
  }

  function openEditor(info) {
    if (info.row.__dswbInput) {
      try { info.row.__dswbInput.focus(); } catch (err) { /* ignore */ }
      return;
    }
    var raw = readValue(info);
    info.original = raw;
    info.busy = false;
    info.closed = false;

    var input = el('input', 'dswb-input');
    input.type = 'text';
    input.value = raw;
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('spellcheck', 'false');
    input.setAttribute('aria-label', 'Edit ' + info.key + ' value');
    input.setAttribute('data-dswb-input', '');

    info.valueEl.classList.add('dswb-editing');
    /* the value stops being a button while a textbox lives inside it, so the
       accessibility tree never contains a button that wraps a textbox */
    info.valueEl.removeAttribute('role');
    setRowState(info, 'editing');
    info.row.__dswbInput = input;
    info.valueEl.appendChild(input);

    input.addEventListener('keydown', function (ev) {
      var key = ev.key;
      if (key === 'Enter') {
        ev.preventDefault();
        ev.stopPropagation();
        commit(info);
      } else if (key === 'Escape' || key === 'Esc') {
        ev.preventDefault();
        ev.stopPropagation();
        closeEditor(info, info.original, true);
      }
    });

    input.addEventListener('input', function () {
      clearError(info);
      if (info.row.getAttribute('data-token-state') === 'error') setRowState(info, 'editing');
    });

    input.addEventListener('blur', function () {
      if (info.closed || info.busy) return;
      var next = input.value.trim();
      if (next !== info.original) commit(info);
      else closeEditor(info, info.original, false);
    });

    try {
      input.focus({ preventScroll: true });
    } catch (err) {
      input.focus();
    }
    try { input.setSelectionRange(raw.length, raw.length); } catch (err) { /* ignore */ }
  }

  function closeEditor(info, text, focusBack) {
    if (info.closed) return;
    info.closed = true;
    info.busy = false;
    removeSpinner(info);
    clearError(info);

    var input = info.row.__dswbInput;
    if (input && input.parentNode) input.parentNode.removeChild(input);
    info.row.__dswbInput = null;

    info.valueEl.classList.remove('dswb-editing');
    info.valueEl.setAttribute('role', 'button');
    if (typeof text === 'string') info.valueEl.textContent = text;
    info.row.removeAttribute('aria-busy');
    if (info.row.getAttribute('data-token-state') !== 'saved') setRowState(info, 'idle');
    updateLabels();
    if (focusBack) focusValue(info);
  }

  function commit(info) {
    if (info.closed || info.busy) return;
    var input = info.row.__dswbInput;
    if (!input) return;

    var next = input.value.trim();
    if (next === info.original) {
      closeEditor(info, info.original, true);
      return;
    }

    info.busy = true;
    input.disabled = true;
    setRowState(info, 'saving');
    info.row.setAttribute('aria-busy', 'true');
    clearError(info);
    addSpinner(info);

    postToken(info.key, next, function (err, data) {
      removeSpinner(info);
      if (err) {
        info.busy = false;
        input.disabled = false;
        info.row.removeAttribute('aria-busy');
        setRowState(info, 'error');
        showError(info, describeError(err, null));
        try {
          input.focus();
          input.select();
        } catch (err2) { /* ignore */ }
        if (err.kind === 'network') setMode('off');
        return;
      }

      info.row.removeAttribute('aria-busy');
      closeEditor(info, data.value !== undefined && data.value !== null ? data.value : next, true);
      setRowState(info, 'saved');
      window.setTimeout(function () {
        if (info.row.getAttribute('data-token-state') === 'saved') setRowState(info, 'idle');
      }, SAVED_FLASH_MS);

      undoByKey[info.key] = data.previous;
      updateStatusFrom(data);
      queueSwap(data.sha256);
      showUndo(info.key, data.previous);
    });
  }

  function setRowValue(key, value) {
    var rows = attrList();
    for (var i = 0; i < rows.length; i += 1) {
      var info = rowInfo(rows[i]);
      if (!info || info.key !== key) continue;
      if (info.row.__dswbInput) continue; /* never clobber an open editor */
      info.valueEl.textContent = value;
    }
  }

  function activate(info, fromFocus) {
    if (!info) return;
    if (mode === 'probing') {
      if (!fromFocus) pending.push(info);
      return;
    }
    if (mode === 'off') {
      showOfflineToast(info);
      return;
    }
    if (mode !== 'live') return;
    if (info.row.getAttribute('data-token-state') === 'saving') return;
    if (info.row.__dswbInput) {
      try { info.row.__dswbInput.focus(); } catch (err) { /* ignore */ }
      return;
    }
    openEditor(info);
  }

  /* ------------------------------------------------------------- decoration */

  function updateLabels() {
    var rows = attrList();
    for (var i = 0; i < rows.length; i += 1) {
      var info = rowInfo(rows[i]);
      if (!info) continue;
      if (mode === 'live') {
        info.valueEl.setAttribute('aria-label', 'Edit ' + info.key + ' value');
        info.valueEl.title = 'Click to edit ' + info.key;
      } else if (mode === 'off') {
        info.valueEl.setAttribute('aria-label', info.key + ' — workbench off; activate for the CLI command');
        info.valueEl.title = 'Workbench off — activate for the CLI command';
      } else {
        info.valueEl.setAttribute('aria-label', info.key);
      }
    }
  }

  function decorate() {
    var rows = attrList();
    for (var i = 0; i < rows.length; i += 1) {
      var row = rows[i];
      var info = rowInfo(row);
      if (!info) continue;

      if (boundRows.get(row) && row.__dswbValue === info.valueEl) continue;
      boundRows.set(row, true);
      row.__dswbValue = info.valueEl;

      info.valueEl.setAttribute('tabindex', '0');
      info.valueEl.setAttribute('role', 'button');
      row.setAttribute('data-dswb-bound', '1');
    }
    updateLabels();
  }

  function scheduleDecorate() {
    if (decorateTimer) return;
    decorateTimer = window.setTimeout(function () {
      decorateTimer = null;
      decorate();
    }, 100);
  }

  function observe() {
    if (!window.MutationObserver) return;
    observer = new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i += 1) {
        var add = records[i].addedNodes;
        for (var j = 0; j < add.length; j += 1) {
          var node = add[j];
          if (node.nodeType !== 1) continue;
          if (node.hasAttribute('data-token') || (node.querySelector && node.querySelector('[data-token]'))) {
            scheduleDecorate();
            return;
          }
        }
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  /* ------------------------------------------------------------ mode handling */

  function setMode(next) {
    mode = next;
    var label = next === 'live' || next === 'off' ? next : 'probing';
    document.documentElement.setAttribute('data-ds-workbench', label);
    updateLabels();
  }

  function flushPending() {
    var queue = pending;
    pending = [];
    for (var i = 0; i < queue.length; i += 1) {
      if (mode === 'live') openEditor(queue[i]);
      else if (mode === 'off') showOfflineToast(queue[i]);
    }
  }

  function probe() {
    request('GET', '/__ds/status', null, PROBE_MS, function (err, res) {
      lastStatus = res ? res.status : 0;
      if (!err && res && res.status === 200 && res.data && res.data.enabled === true) {
        statusInfo = res.data;
        setMode('live');
      } else {
        statusInfo = null;
        setMode('off');
      }
      flushPending();
    });
  }

  /* ------------------------------------------------------------------ events */

  function onClick(ev) {
    var target = ev.target;
    if (!target || target.nodeType !== 1) return;
    if (target.closest && target.closest('.dswb-toast')) return;

    var row = closestAttr(target, 'data-token');
    if (!row) return;
    var info = rowInfo(row);
    if (!info) return;
    if (!contains(info.valueEl, target)) return;
    if (row.__dswbInput) return; /* click landed on the open input itself */
    activate(info, false);
  }

  function onFocusIn(ev) {
    if (suppressFocus) return;
    if (mode !== 'live') return; /* read-only rows speak only on activation */
    var target = ev.target;
    if (!target || target.nodeType !== 1) return;
    var row = closestAttr(target, 'data-token');
    if (!row) return;
    var info = rowInfo(row);
    if (!info) return;
    if (target !== info.valueEl) return;
    if (row.__dswbInput) return;
    activate(info, true);
  }

  function onKeyDown(ev) {
    var target = ev.target;
    if (!target || target.nodeType !== 1) return;
    if (target.hasAttribute && target.hasAttribute('data-dswb-input')) return; /* input handles its own keys */
    if (ev.key !== 'Enter' && ev.key !== ' ' && ev.key !== 'Spacebar') return;

    var row = closestAttr(target, 'data-token');
    if (!row) return;
    var info = rowInfo(row);
    if (!info) return;
    if (target !== info.valueEl) return;
    ev.preventDefault();
    activate(info, false);
  }

  var bound = false;
  function bindOnce() {
    if (bound) return;
    bound = true;
    document.addEventListener('click', onClick, false);
    document.addEventListener('focusin', onFocusIn, false);
    document.addEventListener('keydown', onKeyDown, false);
  }

  /* --------------------------------------------------------------------- boot */

  function boot() {
    if (!document.documentElement) return;
    document.documentElement.setAttribute('data-ds-workbench', 'probing');
    bindOnce();
    decorate();
    observe();
    probe();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  /* The single global this file creates. `state()` is read-only; tests and the
     page use it to prove which mode a reload landed in. */
  var DSWorkbench = {
    __dswb: true,
    version: VERSION,
    state: function () {
      var link = findTokensLink();
      return {
        mode: mode,
        revision: statusInfo ? statusInfo.revision : null,
        tokensCssSha: statusInfo ? statusInfo.tokensCssSha : null,
        tokenCount: statusInfo ? statusInfo.tokenCount : null,
        lastStatus: lastStatus,
        lastError: lastError,
        undoKeys: Object.keys(undoByKey),
        editing: document.querySelectorAll('[data-token-state="editing"]').length,
        tokensHref: link ? link.getAttribute('href') : null
      };
    },
    refresh: decorate,
    probe: probe
  };
  window.DSWorkbench = DSWorkbench;
}());
