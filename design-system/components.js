/* ==========================================================================
   components.js — behaviour layer for the ds-* component set
   --------------------------------------------------------------------------
   Dependency-free IIFE. No build step, no framework, no globals except
   `window.DS`. Load with a plain <script src> (no type="module"):

       <script src="design-system/components.js" defer></script>
       <script>DS.init()</script>

   Every module is declarative-first: mark up with the documented attributes
   and `DS.init()` wires it, or call the factory directly for finer control.
   Init is idempotent — an element that already carries `data-ds-ready` is
   never bound twice, so a second `DS.init()` (after a re-render, say) adds
   no listeners and no instances.

   Contracts (mirrored in components.css and components.md):
     tabs     .ds-tabs[role=tablist] > [role=tab]  +  [role=tabpanel]
     menu     [data-ds-menu-trigger][aria-expanded] + [role=menu]
     dialog   <dialog class="ds-dialog"> or [data-ds-overlay]
     toast    [data-ds-toast][role=status|alert]
     copy     [data-ds-copy]
     switch   role=switch + aria-checked   (pure CSS, no JS needed)
     focus    :focus-visible ring lives in base.css

   Not implemented here, deliberately: field-clear (zero consumers today),
   caret comboboxes (engine's mention/slash popovers — page-local), the
   canvas rig, the chart. See components.md.

   Conventions:
     · state is an attribute, never a class: aria-expanded / aria-selected /
       aria-checked / hidden / data-ds-open
     · closed overlays are `hidden` + `inert`, never transform-only
     · focus is always restored to the invoker on Escape / select / close
     · prefers-reduced-motion disables smooth scrolling and self-animation
   ========================================================================== */
(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.DS && window.DS.__ds) return;

  var VERSION = '2.0.0';

  /* ---------------------------------------------------------------- tokens */
  /* Durations are read from CSS so the design layer owns the number. The
     fallback is the policy floor for an un-authored toast (10s: enough time
     to be spoken once); an authored token or an explicit option may be
     shorter — the author then owns the trade-off. */
  var DEFAULT_TOAST_MS = 10000;
  var TYPEAHEAD_MS = 500;
  var TOAST_TOKENS = ['--ds-toast-duration', '--toast-duration', '--motion-duration-toast'];

  /* ------------------------------------------------------------- internals */
  var seq = 0;
  var instances = 0;
  var liveListeners = 0;
  var byElement = new WeakMap();
  var openOverlays = [];
  var openMenus = [];

  function uid(prefix) {
    seq += 1;
    return prefix + '-' + seq;
  }

  function isEl(node) {
    return !!node && node.nodeType === 1;
  }

  /* Bind a listener and return an unbind function that is safe to call twice.
     Every binding in this file goes through here so `DS.debug.stats()` can
     prove re-init leaks nothing. */
  function on(target, type, handler, opts) {
    if (!target || !target.addEventListener) return function () {};
    target.addEventListener(type, handler, opts || false);
    liveListeners += 1;
    var live = true;
    return function off() {
      if (!live) return;
      live = false;
      target.removeEventListener(type, handler, opts || false);
      liveListeners -= 1;
    };
  }

  function emit(el, name, detail) {
    if (!isEl(el)) return true;
    var ev;
    try {
      ev = new CustomEvent(name, { bubbles: true, cancelable: true, detail: detail || {} });
    } catch (err) {
      ev = document.createEvent('CustomEvent');
      ev.initCustomEvent(name, true, true, detail || {});
    }
    return el.dispatchEvent(ev);
  }

  function attr(el, name, value) {
    if (!isEl(el)) return null;
    if (value === undefined) return el.getAttribute(name);
    if (value === null) el.removeAttribute(name);
    else el.setAttribute(name, value);
    return value;
  }

  function show(el) {
    if (!isEl(el)) return;
    el.removeAttribute('hidden');
    el.setAttribute('aria-hidden', 'false');
  }

  function hide(el) {
    if (!isEl(el)) return;
    el.setAttribute('hidden', '');
    el.setAttribute('aria-hidden', 'true');
  }

  function reducedMotion() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (err) {
      return false;
    }
  }

  function focusEl(el) {
    if (!isEl(el) || typeof el.focus !== 'function') return false;
    try {
      el.focus({ preventScroll: true });
    } catch (err) {
      el.focus();
    }
    return document.activeElement === el;
  }

  function isVisible(el) {
    if (!isEl(el)) return false;
    if (el.hasAttribute('hidden') || el.hasAttribute('inert')) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    if (el.closest('[inert]')) return false;
    var cs = window.getComputedStyle(el);
    if (!cs || cs.display === 'none' || cs.visibility === 'hidden') return false;
    return el.getClientRects().length > 0;
  }

  var FOCUSABLE = [
    'a[href]',
    'area[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'iframe',
    'summary',
    'audio[controls]',
    'video[controls]',
    '[contenteditable="true"]',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  function focusables(root) {
    if (!isEl(root)) return [];
    var nodes = root.querySelectorAll(FOCUSABLE);
    var out = [];
    for (var i = 0; i < nodes.length; i += 1) {
      if (nodes[i].disabled) continue;
      if (nodes[i].tabIndex < 0 && !nodes[i].hasAttribute('contenteditable')) continue;
      if (!isVisible(nodes[i])) continue;
      out.push(nodes[i]);
    }
    return out;
  }

  function parseMs(raw) {
    if (!raw) return null;
    var m = /^([0-9]*\.?[0-9]+)\s*(ms|s)?$/i.exec(String(raw).trim());
    if (!m) return null;
    var n = parseFloat(m[1]);
    if (!isFinite(n) || n <= 0) return null;
    return /^s$/i.test(m[2] || '') ? n * 1000 : n;
  }

  function readDuration(el, keys, fallback) {
    var cs = null;
    try {
      cs = window.getComputedStyle(el);
    } catch (err) {
      return fallback;
    }
    for (var i = 0; i < keys.length; i += 1) {
      if (!cs || typeof cs.getPropertyValue !== 'function') break;
      var parsed = parseMs(cs.getPropertyValue(keys[i]));
      if (parsed !== null) return parsed;
    }
    return fallback;
  }

  /* ================================================================ TABS ===
     Roving tabindex: exactly one tab is in the tab order, the selected one.
     Arrow keys move selection and focus (automatic activation, matching the
     pitch page, the only tab set in the tree that already does this right).
     Panels get `hidden`; their aria-labelledby points back at the tab.
     ======================================================================= */
  function Tabs(root, options) {
    if (!isEl(root)) throw new Error('DS.tabs: root element required');
    if (byElement.has(root)) return byElement.get(root);

    var opts = options || {};
    var orientation = opts.orientation || attr(root, 'data-ds-orientation') ||
      attr(root, 'aria-orientation') || 'horizontal';
    var onChange = typeof opts.onChange === 'function' ? opts.onChange : null;
    var offs = [];
    var api;
    var index = 0;

    attr(root, 'role', attr(root, 'role') || 'tablist');
    attr(root, 'aria-orientation', orientation === 'vertical' ? 'vertical' : 'horizontal');

    function tabs() {
      var list = root.querySelectorAll('[role="tab"]');
      return Array.prototype.filter.call(list, function (t) {
        return t.closest('[role="tablist"]') === root;
      });
    }

    function panels() {
      var scope = opts.panelScope || root.getAttribute('data-ds-panel-scope');
      var host = scope ? document.querySelector(scope) : root.parentElement || root;
      return Array.prototype.slice.call(host.querySelectorAll('[role="tabpanel"]'));
    }

    function panelFor(tab, all, idx) {
      var id = tab.getAttribute('aria-controls');
      if (id) {
        var found = document.getElementById(id);
        if (found) return found;
      }
      var scopeSel = attr(tab, 'data-ds-panel');
      if (scopeSel) {
        var scoped = document.querySelector(scopeSel);
        if (scoped) return scoped;
      }
      var own = tab.querySelector('[role="tabpanel"]');
      if (own) return own;
      return all[idx] || null;
    }

    function wire() {
      var all = tabs();
      var pans = panels();
      Array.prototype.forEach.call(all, function (tab, i) {
        if (!tab.id) tab.id = uid('ds-tab');
        var panel = panelFor(tab, pans, i);
        if (panel) {
          if (!panel.id) panel.id = uid('ds-tabpanel');
          attr(tab, 'aria-controls', panel.id);
          attr(panel, 'role', 'tabpanel');
          attr(panel, 'aria-labelledby', tab.id);
          attr(panel, 'tabindex', panel.getAttribute('tabindex') === null ? '0' : panel.getAttribute('tabindex'));
        }
        if (!tab.hasAttribute('aria-selected')) attr(tab, 'aria-selected', 'false');
        if (!tab.hasAttribute('tabindex')) attr(tab, 'tabindex', '-1');
      });
    }

    function apply(active, focus, source) {
      var all = tabs();
      var pans = panels();
      if (!all.length) return;
      var next = Math.max(0, Math.min(all.length - 1, active));
      index = next;
      Array.prototype.forEach.call(all, function (tab, i) {
        var selected = i === next;
        attr(tab, 'aria-selected', selected ? 'true' : 'false');
        attr(tab, 'tabindex', selected ? '0' : '-1');
        var panel = panelFor(tab, pans, i);
        if (panel) {
          if (selected) {
            panel.removeAttribute('hidden');
            panel.removeAttribute('inert');
          } else {
            panel.setAttribute('hidden', '');
          }
        }
      });
      if (focus) focusEl(all[next]);
      emit(root, 'ds:tabchange', { index: next, tab: all[next], id: all[next].id, source: source || 'api' });
      if (onChange) onChange(all[next], next);
    }

    function indexOf(node) {
      return Array.prototype.indexOf.call(tabs(), node);
    }

    wire();
    var initial = opts.selected !== undefined ? opts.selected : 0;
    var all = tabs();
    for (var i = 0; i < all.length; i += 1) {
      if (all[i].getAttribute('aria-selected') === 'true') { initial = i; break; }
    }
    apply(initial, false, 'init');

    offs.push(on(root, 'click', function (ev) {
      var tab = ev.target && ev.target.closest ? ev.target.closest('[role="tab"]') : null;
      if (!tab || !root.contains(tab)) return;
      var i = indexOf(tab);
      if (i < 0) return;
      ev.preventDefault();
      apply(i, false, 'pointer');
    }));

    offs.push(on(root, 'keydown', function (ev) {
      var tab = ev.target && ev.target.closest ? ev.target.closest('[role="tab"]') : null;
      if (!tab || !root.contains(tab)) return;
      var keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
      if (keys.indexOf(ev.key) < 0) return;
      var all = tabs();
      var i = indexOf(tab);
      if (i < 0) return;
      var vertical = orientation === 'vertical';
      var next = i;
      if (ev.key === 'Home') next = 0;
      else if (ev.key === 'End') next = all.length - 1;
      else if (ev.key === 'ArrowLeft') { if (vertical) return; next = (i - 1 + all.length) % all.length; }
      else if (ev.key === 'ArrowRight') { if (vertical) return; next = (i + 1) % all.length; }
      else if (ev.key === 'ArrowUp') { if (!vertical) return; next = (i - 1 + all.length) % all.length; }
      else if (ev.key === 'ArrowDown') { if (!vertical) return; next = (i + 1) % all.length; }
      ev.preventDefault();
      apply(next, true, 'keyboard');
    }));

    api = {
      el: root,
      select: function (which, focus) {
        var i = typeof which === 'number' ? which : indexOf(typeof which === 'string' ? document.getElementById(which) : which);
        if (i >= 0) apply(i, !!focus, 'api');
        return i;
      },
      next: function () { apply((index + 1) % tabs().length, true, 'api'); },
      prev: function () { var n = tabs().length; apply((index - 1 + n) % n, true, 'api'); },
      get index() { return index; },
      tabs: tabs,
      destroy: function () {
        offs.forEach(function (off) { off(); });
        offs = [];
        byElement.delete(root);
        root.removeAttribute('data-ds-ready');
      }
    };

    byElement.set(root, api);
    attr(root, 'data-ds-ready', '');
    instances += 1;
    return api;
  }

  /* ============================================================ MENUBUTTON ==
     Reference implementation is engine's #cardMenu: aria-expanded on the
     trigger, roving focus in the panel, Escape returns focus, outside
     pointerdown closes, one open at a time.
     ======================================================================= */
  function MenuButton(trigger, panel, options) {
    if (!isEl(trigger)) throw new Error('DS.menu: trigger required');
    if (!isEl(panel)) throw new Error('DS.menu: panel required');
    if (byElement.has(trigger) && byElement.get(trigger)) return byElement.get(trigger);

    var opts = options || {};
    var offs = [];
    var typeahead = '';
    var typeTimer = 0;
    var closeTimer = 0;
    var api;
    var isOpen = false;

    attr(trigger, 'aria-haspopup', opts.haspopup || 'menu');
    if (!trigger.hasAttribute('aria-expanded')) attr(trigger, 'aria-expanded', 'false');
    if (!panel.id) panel.id = uid('ds-menu');
    attr(trigger, 'aria-controls', panel.id);
    attr(panel, 'role', attr(panel, 'role') || 'menu');
    attr(panel, 'tabindex', panel.getAttribute('tabindex') === null ? '-1' : panel.getAttribute('tabindex'));
    if (isOpen === false) hide(panel);

    function items() {
      var list = panel.querySelectorAll('[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"]');
      return Array.prototype.filter.call(list, function (it) {
        return !it.disabled && it.getAttribute('aria-disabled') !== 'true' && isVisible(it);
      });
    }

    function focusItem(i) {
      var list = items();
      if (!list.length) return;
      var target = list[Math.max(0, Math.min(list.length - 1, i))];
      focusEl(target);
    }

    function place() {
      if (!opts.anchor && !trigger.hasAttribute('data-ds-menu-anchor')) return;
      var r = trigger.getBoundingClientRect();
      var spaceBelow = window.innerHeight - r.bottom;
      var est = Math.min(panel.offsetHeight || 220, 320);
      var flip = spaceBelow < est && r.top > spaceBelow;
      attr(panel, 'data-ds-placement', (flip ? 'top' : 'bottom') + '-' + (opts.placement === 'start' ? 'start' : 'end'));
      panel.style.setProperty('--ds-menu-x', Math.round(r.left) + 'px');
      panel.style.setProperty('--ds-menu-y', Math.round(flip ? r.top : r.bottom) + 'px');
    }

    function open(source, focusIndex) {
      if (isOpen) return;
      /* one open menu at a time */
      openMenus.slice().forEach(function (other) { if (other !== api) other.close(); });
      isOpen = true;
      show(panel);
      attr(panel, 'data-ds-open', '');
      attr(trigger, 'aria-expanded', 'true');
      place();
      focusItem(focusIndex || 0);
      openMenus.push(api);
      emit(panel, 'ds:menuopen', { source: source || 'api', trigger: trigger });
    }

    function close(reason, restore) {
      if (!isOpen) return;
      isOpen = false;
      hide(panel);
      attr(panel, 'data-ds-open', null);
      attr(trigger, 'aria-expanded', 'false');
      var at = openMenus.indexOf(api);
      if (at >= 0) openMenus.splice(at, 1);
      if (restore !== false) focusEl(trigger);
      emit(panel, 'ds:menuclose', { reason: reason || 'api', restore: restore !== false });
    }

    function toggle() {
      if (isOpen) close('trigger', true);
      else open('trigger', 0);
    }

    offs.push(on(trigger, 'click', function (ev) {
      ev.preventDefault();
      toggle();
    }));

    offs.push(on(trigger, 'keydown', function (ev) {
      if (ev.key === 'ArrowDown' || ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') {
        ev.preventDefault();
        if (!isOpen) open('keyboard', 0);
        else focusItem(0);
      } else if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        open('keyboard', items().length - 1);
      } else if (ev.key === 'Escape' && isOpen) {
        ev.preventDefault();
        close('escape', true);
      }
    }));

    offs.push(on(panel, 'keydown', function (ev) {
      var list = items();
      var at = list.indexOf(document.activeElement);
      if (ev.key === 'ArrowDown') { ev.preventDefault(); focusItem((at + 1 + list.length) % list.length); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); focusItem((at - 1 + list.length) % list.length); }
      else if (ev.key === 'Home') { ev.preventDefault(); focusItem(0); }
      else if (ev.key === 'End') { ev.preventDefault(); focusItem(list.length - 1); }
      else if (ev.key === 'Escape') { ev.preventDefault(); close('escape', true); }
      else if (ev.key === 'Tab') { close('tab', false); }
      else if (ev.key.length === 1 && /\S/.test(ev.key) && opts.typeahead !== false) {
        typeahead += ev.key.toLowerCase();
        window.clearTimeout(typeTimer);
        typeTimer = window.setTimeout(function () { typeahead = ''; }, TYPEAHEAD_MS);
        var hit = list.filter(function (it) {
          return (it.textContent || '').trim().toLowerCase().indexOf(typeahead) === 0;
        })[0];
        if (hit) { ev.preventDefault(); focusEl(hit); }
      }
    }));

    offs.push(on(panel, 'click', function (ev) {
      var item = ev.target && ev.target.closest ? ev.target.closest('[role^="menuitem"]') : null;
      if (!item || !panel.contains(item)) return;
      if (item.hasAttribute('data-ds-keep-open')) return;
      emit(panel, 'ds:menuselect', { item: item, value: attr(item, 'data-value') });
      if (opts.onSelect) opts.onSelect(item, ev);
      close('select', true);
    }));

    offs.push(on(document, 'pointerdown', function (ev) {
      if (!isOpen) return;
      var t = ev.target;
      if (panel.contains(t) || trigger.contains(t)) return;
      close('outside', false);
    }, true));

    offs.push(on(document, 'keydown', function (ev) {
      if (!isOpen) return;
      if (ev.key === 'Escape') { ev.preventDefault(); close('escape', true); }
    }, true));

    offs.push(on(panel, 'focusout', function () {
      window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(function () {
        if (!isOpen) return;
        var a = document.activeElement;
        if (panel.contains(a) || trigger.contains(a)) return;
        close('focusout', false);
      }, 0);
    }));

    api = {
      el: trigger,
      panel: panel,
      open: open,
      close: close,
      toggle: toggle,
      get isOpen() { return isOpen; },
      destroy: function () {
        offs.forEach(function (off) { off(); });
        offs = [];
        window.clearTimeout(closeTimer);
        window.clearTimeout(typeTimer);
        var at = openMenus.indexOf(api);
        if (at >= 0) openMenus.splice(at, 1);
        byElement.delete(trigger);
        trigger.removeAttribute('data-ds-ready');
        panel.removeAttribute('data-ds-ready');
      }
    };

    byElement.set(trigger, api);
    byElement.set(panel, api);
    attr(trigger, 'data-ds-ready', '');
    attr(panel, 'data-ds-ready', '');
    instances += 1;
    return api;
  }

  /* ================================================================ TOAST ===
     One node, one live region. `role=status aria-live=polite aria-atomic`
     for informational, `role=alert aria-live=assertive` for errors. Timer
     pauses while the pointer or focus is on the toast.
     ======================================================================= */
  function Toast(el, options) {
    if (!isEl(el)) throw new Error('DS.toast: element required');
    if (byElement.has(el)) return byElement.get(el);

    var opts = options || {};
    var offs = [];
    var timer = 0;
    var remaining = 0;
    var started = 0;
    var api;

    function live(politeness) {
      var politenessValue = politeness === 'assertive' ? 'assertive' : 'polite';
      attr(el, 'role', politenessValue === 'assertive' ? 'alert' : 'status');
      attr(el, 'aria-live', politenessValue);
      attr(el, 'aria-atomic', 'true');
    }

    function clear() {
      window.clearTimeout(timer);
      timer = 0;
      remaining = 0;
      started = 0;
    }

    function arm(ms) {
      clear();
      remaining = ms;
      started = Date.now();
      if (!ms || ms < 0) return;
      timer = window.setTimeout(function () {
        timer = 0;
        api.hide('timeout');
      }, ms);
    }

    function pause() {
      if (!timer) return;
      window.clearTimeout(timer);
      timer = 0;
      remaining = Math.max(0, remaining - (Date.now() - started));
    }

    function resume() {
      if (timer || !remaining) return;
      arm(remaining);
    }

    api = {
      el: el,
      show: function (message, showOpts) {
        var cfg = showOpts || {};
        live(cfg.politeness || opts.politeness || attr(el, 'data-ds-politeness'));
        if (message !== undefined && message !== null) {
          var body = el.querySelector('[data-ds-toast-message]') || el.querySelector('.ds-toast__message');
          if (body) body.textContent = String(message);
          else el.textContent = String(message);
        }
        el.removeAttribute('hidden');
        attr(el, 'data-ds-open', '');
        attr(el, 'data-ds-visible', '');
        var duration = cfg.timeout;
        if (duration === undefined || duration === null) {
          duration = readDuration(el, TOAST_TOKENS, opts.timeout === undefined ? DEFAULT_TOAST_MS : opts.timeout);
        }
        if (cfg.persistent) arm(0);
        else arm(Math.max(0, duration));
        emit(el, 'ds:toast', { message: message, politeness: cfg.politeness || opts.politeness || 'polite' });
        return api;
      },
      hide: function (reason) {
        clear();
        el.setAttribute('hidden', '');
        attr(el, 'data-ds-open', null);
        attr(el, 'data-ds-visible', null);
        emit(el, 'ds:toasthide', { reason: reason || 'api' });
      },
      pause: pause,
      resume: resume,
      destroy: function () {
        clear();
        offs.forEach(function (off) { off(); });
        offs = [];
        byElement.delete(el);
        el.removeAttribute('data-ds-ready');
      }
    };

    live(opts.politeness || attr(el, 'data-ds-politeness'));
    if (el.hasAttribute('hidden') === false && !el.hasAttribute('data-ds-open')) el.setAttribute('hidden', '');
    attr(el, 'data-ds-ready', '');

    offs.push(on(el, 'mouseenter', pause));
    offs.push(on(el, 'mouseleave', resume));
    offs.push(on(el, 'focusin', pause));
    offs.push(on(el, 'focusout', function (ev) {
      if (el.contains(ev.relatedTarget)) return;
      resume();
    }));

    byElement.set(el, api);
    instances += 1;
    return api;
  }

  /* ------------------------------------------------------------- announce */
  var liveRegion = null;

  function region(politeness) {
    var id = politeness === 'assertive' ? 'ds-live-assertive' : 'ds-live-polite';
    var node = document.getElementById(id);
    if (!node) {
      node = document.createElement('div');
      node.id = id;
      node.className = 'ds-sr-only';
      /* base.css owns .ds-sr-only; these inline declarations keep the region
         silent even if the stylesheet is not linked yet (a raw style attribute
         in JS is not a design value). */
      node.setAttribute('style', 'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0');
      document.body.appendChild(node);
    }
    attr(node, 'role', politeness === 'assertive' ? 'alert' : 'status');
    attr(node, 'aria-live', politeness === 'assertive' ? 'assertive' : 'polite');
    attr(node, 'aria-atomic', 'true');
    return node;
  }

  function announce(message, options) {
    if (message === undefined || message === null) return null;
    var opts = options || {};
    var politeness = opts.politeness === 'assertive' ? 'assertive' : 'polite';
    var node = region(politeness);
    /* clearing first makes an identical repeat re-announce in every AT */
    node.textContent = '';
    var text = String(message);
    window.setTimeout(function () { node.textContent = text; }, 30);
    var clearAfter = opts.timeout === undefined ? 10000 : opts.timeout;
    if (clearAfter > 0) {
      window.setTimeout(function () {
        if (node.textContent === text) node.textContent = '';
      }, clearAfter + 30);
    }
    return node;
  }

  /* ============================================================== OVERLAY ===
     Works for a native <dialog> (top layer + ::backdrop, focused via
     showModal) and for a plain element ([data-ds-overlay], e.g. a drawer).
     The trap and the Escape/backdrop handling are ours in both cases so the
     behaviour is identical and testable without real key events.
     ======================================================================= */
  function Overlay(el, options) {
    if (!isEl(el)) throw new Error('DS.overlay: element required');
    if (byElement.has(el)) return byElement.get(el);

    var opts = options || {};
    var offs = [];
    var isOpen = false;
    var invoker = null;
    var inerted = [];
    var api;
    var isDialog = typeof el.showModal === 'function' && el.tagName === 'DIALOG';

    function box() {
      return el.querySelector('[data-ds-dialog-box],.ds-dialog__box,.ds-dialog__panel,.ds-sheet__panel') || el;
    }

    function label() {
      var sel = attr(el, 'data-ds-label');
      if (sel) {
        var node = document.querySelector(sel);
        if (node) {
          if (!node.id) node.id = uid('ds-label');
          attr(el, 'aria-labelledby', node.id);
          return true;
        }
      }
      if (el.getAttribute('aria-labelledby')) {
        var target = document.getElementById(el.getAttribute('aria-labelledby'));
        if (target) return true;
      }
      if (el.getAttribute('aria-label')) return true;
      var heading = el.querySelector('h1,h2,h3,h4,[data-ds-title]');
      if (heading) {
        if (!heading.id) heading.id = uid('ds-title');
        attr(el, 'aria-labelledby', heading.id);
        return true;
      }
      if (opts.label) {
        attr(el, 'aria-label', opts.label);
        return true;
      }
      return false;
    }

    function inertBackground() {
      inerted = [];
      var top = el;
      while (top.parentElement && top.parentElement !== document.body) top = top.parentElement;
      var kids = document.body.children;
      for (var i = 0; i < kids.length; i += 1) {
        var kid = kids[i];
        if (kid === top || kid.tagName === 'SCRIPT' || kid.tagName === 'STYLE' || kid.tagName === 'LINK') continue;
        if (kid.contains(el)) continue;
        inerted.push({ el: kid, had: kid.hasAttribute('inert') });
        kid.setAttribute('inert', '');
      }
    }

    function releaseBackground() {
      inerted.forEach(function (rec) {
        if (!rec.had && !rec.el.contains(el)) rec.el.removeAttribute('inert');
      });
      inerted = [];
    }

    function trap(ev) {
      var list = focusables(el);
      if (!list.length) { ev.preventDefault(); focusEl(el); return; }
      var first = list[0];
      var last = list[list.length - 1];
      var active = document.activeElement;
      if (!el.contains(active)) {
        ev.preventDefault();
        focusEl(ev.shiftKey ? last : first);
        return;
      }
      if (ev.shiftKey && (active === first || active === el)) {
        ev.preventDefault();
        focusEl(last);
      } else if (!ev.shiftKey && active === last) {
        ev.preventDefault();
        focusEl(first);
      }
    }

    function onKey(ev) {
      if (!isOpen) return;
      /* only the top-most overlay answers keys; stacked overlays must not
         both trap the same Tab and move focus twice */
      if (openOverlays[openOverlays.length - 1] !== api) return;
      if (ev.key === 'Escape' || ev.key === 'Esc') {
        /* an open menu inside the overlay consumes Escape first */
        if (openMenus.length) return;
        if (attr(el, 'data-ds-esc') === 'off') return;
        ev.preventDefault();
        close('escape');
      } else if (ev.key === 'Tab') {
        trap(ev);
      }
    }

    function open(openOpts) {
      if (isOpen) return api;
      var cfg = openOpts || {};
      invoker = cfg.invoker || document.activeElement;
      if (!el.id) el.id = uid('ds-overlay');
      attr(el, 'role', 'dialog');
      attr(el, 'aria-modal', 'true');
      label();
      if (isDialog) {
        /* `hidden` would survive showModal() and keep the dialog at
           display:none — clear it first */
        el.removeAttribute('hidden');
        try {
          if (!el.open) el.showModal();
        } catch (err) {
          el.setAttribute('open', '');
        }
      } else {
        el.removeAttribute('hidden');
        el.removeAttribute('inert');
      }
      el.setAttribute('aria-hidden', 'false');
      attr(el, 'data-ds-open', '');
      isOpen = true;
      inertBackground();
      var target = null;
      if (cfg.initialFocus) {
        target = typeof cfg.initialFocus === 'string' ? el.querySelector(cfg.initialFocus) : cfg.initialFocus;
      }
      if (!target) target = el.querySelector('[data-ds-autofocus]') || focusables(el)[0] || el;
      if (target === el && el.tabIndex < 0) attr(el, 'tabindex', '-1');
      focusEl(target);
      openOverlays.push(api);
      emit(el, 'ds:open', { invoker: invoker, id: el.id });
      return api;
    }

    function close(reason) {
      if (!isOpen) return api;
      var proceed = emit(el, 'ds:beforeclose', { reason: reason || 'api' });
      if (proceed === false) return api;
      isOpen = false;
      if (isDialog) {
        try {
          if (el.open) el.close();
        } catch (err) {
          el.removeAttribute('open');
        }
        el.setAttribute('hidden', '');
      } else {
        el.setAttribute('hidden', '');
        el.setAttribute('inert', '');
      }
      el.setAttribute('aria-hidden', 'true');
      attr(el, 'data-ds-open', null);
      releaseBackground();
      var at = openOverlays.indexOf(api);
      if (at >= 0) openOverlays.splice(at, 1);
      var back = invoker;
      invoker = null;
      if (back && isEl(back) && document.contains(back) && back !== document.body) focusEl(back);
      emit(el, 'ds:close', { reason: reason || 'api' });
      return api;
    }

    if (!isDialog) {
      hide(el);
      /* closed = hidden AND inert, never transform-only */
      el.setAttribute('inert', '');
    } else if (!el.hasAttribute('open')) el.setAttribute('hidden', '');
    attr(el, 'data-ds-ready', '');
    /* static semantics, present before the first open: the gate asserts
       aria-modal implies role=dialog and a resolvable label */
    attr(el, 'role', 'dialog');
    attr(el, 'aria-modal', 'true');
    label();
    offs.push(on(document, 'keydown', onKey, true));
    offs.push(on(el, 'cancel', function (ev) {
      if (attr(el, 'data-ds-esc') === 'off') return;
      ev.preventDefault();
      close('escape');
    }));
    offs.push(on(el, 'click', function (ev) {
      if (attr(el, 'data-ds-static') !== null || attr(el, 'data-ds-backdrop') === 'off') return;
      if (ev.target !== el) return;
      var inner = box();
      if (inner !== el) {
        var r = inner.getBoundingClientRect();
        var x = ev.clientX;
        var y = ev.clientY;
        if (x || y) {
          var inside = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
          if (inside) return;
        }
      }
      close('backdrop');
    }));
    offs.push(on(el, 'close', function () {
      /* a native dialog closed by the UA (form method=dialog) still restores */
      if (isOpen) close('native');
    }));

    api = {
      el: el,
      open: open,
      close: close,
      get isOpen() { return isOpen; },
      destroy: function () {
        if (isOpen) close('destroy');
        offs.forEach(function (off) { off(); });
        offs = [];
        byElement.delete(el);
        el.removeAttribute('data-ds-ready');
      }
    };

    byElement.set(el, api);
    instances += 1;
    return api;
  }

  /* ========================================================= FOCUS PRESERVE ==
     For renderers that rewrite innerHTML (wiki draw(), pitch setRail(),
     engine's field painters). Snapshot the focused node by key, then by
     ordinal, then fall back to the container itself.
     ======================================================================= */
  function focusSignature(node, root) {
    var all = root.querySelectorAll('[data-ds-key],[data-key],[data-id],button,a[href],[tabindex],input,select,textarea');
    var index = Array.prototype.indexOf.call(all, node);
    return {
      key: node.getAttribute('data-ds-key') || node.getAttribute('data-key') || node.getAttribute('data-id') || node.id || '',
      tag: node.tagName,
      role: node.getAttribute('role') || '',
      index: index,
      label: (node.textContent || '').trim().slice(0, 40)
    };
  }

  function findBySignature(sig, root) {
    var all = root.querySelectorAll('[data-ds-key],[data-key],[data-id],button,a[href],[tabindex],input,select,textarea');
    if (sig.key) {
      for (var i = 0; i < all.length; i += 1) {
        var k = all[i].getAttribute('data-ds-key') || all[i].getAttribute('data-key') || all[i].getAttribute('data-id') || all[i].id || '';
        if (k === sig.key) return all[i];
      }
    }
    if (sig.index >= 0 && sig.index < all.length && all[sig.index].tagName === sig.tag) {
      if (!sig.label || (all[sig.index].textContent || '').trim().slice(0, 40) === sig.label) return all[sig.index];
    }
    for (var j = 0; j < all.length; j += 1) {
      if (all[j].tagName === sig.tag && sig.label && (all[j].textContent || '').trim().slice(0, 40) === sig.label) return all[j];
    }
    return null;
  }

  function focusPreserve(root, render) {
    var host = isEl(root) ? root : document.body;
    var active = document.activeElement;
    var sig = active && host.contains(active) && active !== host ? focusSignature(active, host) : null;
    var out = typeof render === 'function' ? render() : undefined;
    if (!sig) return out;
    var target = findBySignature(sig, host);
    if (!target && host.hasAttribute('tabindex')) target = host;
    if (target) focusEl(target);
    return out;
  }

  /* ================================================================== COPY ===
     Clipboard with the execCommand fallback every page already hand-rolls,
     plus a polite announcement so the copy is not silent to a screen reader.
     ======================================================================= */
  function legacyCopy(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.setAttribute('aria-hidden', 'true');
    area.setAttribute('tabindex', '-1');
    area.setAttribute('style', 'position:fixed;top:0;left:-9999px;opacity:0');
    document.body.appendChild(area);
    var ok = false;
    try {
      area.select();
      area.setSelectionRange(0, area.value.length);
      ok = document.execCommand ? document.execCommand('copy') : false;
    } catch (err) {
      ok = false;
    }
    document.body.removeChild(area);
    return ok;
  }

  function resolveCopyText(source) {
    if (typeof source !== 'string') return '';
    var first = source.charAt(0);
    if (first === '#' || first === '.' || first === '[') {
      var target = document.querySelector(source);
      if (target) return (target.textContent || '').trim();
    }
    return source;
  }

  function copy(text, btn) {
    var value = String(text === undefined || text === null ? '' : text);
    var message = (isEl(btn) && (attr(btn, 'data-ds-copy-message') || attr(btn, 'data-copied'))) || 'Copied to clipboard';
    function settle(ok) {
      announce(ok ? message : 'Copy failed', { politeness: 'polite' });
      if (isEl(btn)) emit(btn, 'ds:copied', { ok: ok, text: value });
      return ok;
    }
    var nav = window.navigator || {};
    if (nav.clipboard && typeof nav.clipboard.writeText === 'function') {
      return nav.clipboard.writeText(value).then(
        function () { return settle(true); },
        function () { return settle(legacyCopy(value)); }
      );
    }
    return Promise.resolve(settle(legacyCopy(value)));
  }

  /* ================================================================ INIT ==== */
  function ready(el) {
    return isEl(el) && el.hasAttribute('data-ds-ready');
  }

  function markAll(el, list) {
    attr(el, 'data-ds-ready', '');
    (list || []).forEach(function (node) { if (isEl(node)) attr(node, 'data-ds-ready', ''); });
  }

  function init(root) {
    var scope = isEl(root) ? root : document;
    var fresh = [];

    /* tabs */
    var tabRoots = scope.querySelectorAll('[data-ds-tabs],.ds-tabs,[role="tablist"]');
    Array.prototype.forEach.call(tabRoots, function (el) {
      if (ready(el)) return;
      if (!el.querySelector('[role="tab"]') && !el.hasAttribute('data-ds-tabs')) return;
      if (el.closest('[data-ds-ready]') && !el.hasAttribute('data-ds-tabs') && !el.matches('.ds-tabs')) return;
      try { fresh.push(Tabs(el, { orientation: attr(el, 'data-ds-orientation') || undefined })); } catch (err) { /* no-op */ }
    });

    /* menus */
    var triggers = scope.querySelectorAll('[data-ds-menu-trigger]');
    Array.prototype.forEach.call(triggers, function (trigger) {
      if (ready(trigger)) return;
      var sel = attr(trigger, 'aria-controls');
      var panel = sel ? document.getElementById(sel) : null;
      if (!panel) {
        var byAttr = attr(trigger, 'data-ds-menu');
        if (byAttr) panel = document.querySelector(byAttr.charAt(0) === '#' ? byAttr : '#' + byAttr);
      }
      if (!panel) panel = trigger.parentElement ? trigger.parentElement.querySelector('[role="menu"]') : null;
      if (!panel) return;
      try { fresh.push(MenuButton(trigger, panel, { anchor: true, typeahead: attr(trigger, 'data-ds-typeahead') !== 'off' })); } catch (err) { /* no-op */ }
    });

    /* overlays / dialogs */
    var overlays = scope.querySelectorAll('[data-ds-dialog],[data-ds-overlay],dialog.ds-dialog,.ds-dialog');
    Array.prototype.forEach.call(overlays, function (el) {
      if (ready(el)) return;
      if (el.tagName === 'DIALOG' && !el.classList.contains('ds-dialog') && !el.hasAttribute('data-ds-dialog')) return;
      try {
        Overlay(el, { label: attr(el, 'data-ds-label-text') || null });
        fresh.push(el);
      } catch (err) { /* one malformed overlay must not stop the rest */ }
    });

    /* declarative openers / closers */
    Array.prototype.forEach.call(scope.querySelectorAll('[data-ds-open]'), function (btn) {
      if (ready(btn)) return;
      var id = attr(btn, 'data-ds-open');
      var target = document.getElementById(id);
      if (!target) return;
      var api = byElement.get(target);
      if (!api) return;
      markAll(btn);
      on(btn, 'click', function (ev) {
        ev.preventDefault();
        api.open({ invoker: btn });
      });
      fresh.push(api);
    });

    Array.prototype.forEach.call(scope.querySelectorAll('[data-ds-close]'), function (btn) {
      if (ready(btn)) return;
      var host = btn.closest('[data-ds-dialog],[data-ds-overlay],.ds-dialog,dialog');
      var api = host ? byElement.get(host) : null;
      if (!api) return;
      markAll(btn);
      on(btn, 'click', function (ev) {
        ev.preventDefault();
        api.close('button');
      });
      fresh.push(api);
    });

    /* toasts */
    Array.prototype.forEach.call(scope.querySelectorAll('[data-ds-toast]'), function (el) {
      if (ready(el)) return;
      try { fresh.push(Toast(el, {})); } catch (err) { /* no-op */ }
    });

    /* copy buttons */
    Array.prototype.forEach.call(scope.querySelectorAll('[data-ds-copy]'), function (btn) {
      if (ready(btn)) return;
      markAll(btn);
      on(btn, 'click', function (ev) {
        ev.preventDefault();
        copy(resolveCopyText(attr(btn, 'data-ds-copy')), btn);
      });
      fresh.push(btn);
    });

    return fresh;
  }

  /* ================================================================ PUBLIC == */
  var DS = {
    __ds: true,
    version: VERSION,
    init: init,
    tabs: Tabs,
    menu: function (trigger, panel, options) {
      if (isEl(panel)) return MenuButton(trigger, panel, options);
      /* DS.menu(panelOrTrigger, options) */
      if (isEl(trigger)) {
        var panelEl = document.getElementById(attr(trigger, 'aria-controls') || '') ||
                      (trigger.parentElement ? trigger.parentElement.querySelector('[role="menu"]') : null);
        if (!panelEl) throw new Error('DS.menu: panel not found for trigger');
        return MenuButton(trigger, panelEl, panel || {});
      }
      throw new Error('DS.menu: trigger required');
    },
    overlay: Overlay,
    dialog: Overlay,
    toast: function (target, options) {
      if (isEl(target)) return Toast(target, options);
      var cfg = options || {};
      var host = document.getElementById('ds-toast-region') || document.body;
      var node = document.createElement('div');
      node.className = 'ds-toast';
      node.setAttribute('data-ds-toast', '');
      var body = document.createElement('span');
      body.className = 'ds-toast__message';
      body.setAttribute('data-ds-toast-message', '');
      body.textContent = String(target === undefined ? '' : target);
      node.appendChild(body);
      if (cfg.action) {
        var action = document.createElement('button');
        action.type = 'button';
        action.className = 'ds-toast__action ds-btn ds-btn--xs';
        action.textContent = cfg.action.label || 'Undo';
        action.addEventListener('click', function () {
          if (cfg.action.onClick) cfg.action.onClick();
          api.hide('action');
        });
        node.appendChild(action);
      }
      host.appendChild(node);
      var api = Toast(node, cfg);
      api.show(target, cfg);
      return api;
    },
    announce: announce,
    copy: copy,
    focusPreserve: focusPreserve,
    prefersReducedMotion: reducedMotion,
    focusables: focusables,
    debug: {
      stats: function () {
        return {
          version: VERSION,
          listeners: liveListeners,
          instances: instances,
          ready: document.querySelectorAll('[data-ds-ready]').length,
          openOverlays: openOverlays.length,
          openMenus: openMenus.length
        };
      },
      /** assert the top-most open overlay contains focus (ds:focuscheck) */
      focuscheck: function () {
        var top = openOverlays[openOverlays.length - 1];
        if (!top) return { ok: true, reason: 'no overlay open' };
        var active = document.activeElement;
        var inside = !!top.el && top.el.contains(active);
        var result = { ok: inside, active: active ? active.tagName + (active.id ? '#' + active.id : '') : null };
        emit(document, 'ds:focuscheck', result);
        return result;
      }
    }
  };

  /* the single global this file creates */
  window.DS = DS;

  /* auto-init after parse unless the page opts out (data-ds-manual) */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (!document.documentElement.hasAttribute('data-ds-manual')) init();
    }, { once: true });
  } else if (!document.documentElement.hasAttribute('data-ds-manual')) {
    init();
  }
}());
