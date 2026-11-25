/**
 * token-write.mjs — the one write path into design-system/tokens.json.
 *
 * Used by two callers and nothing else:
 *   - scripts/ds-set-token.mjs   (offline CLI, `--get/--list/--undo`)
 *   - the guarded `/__ds/*` block in scripts/relay.mjs (DS_WORKBENCH=1 only)
 *
 * Contract: an edit may change the *value* of a key that already exists, and
 * nothing else. No new keys, no deletions, no writes into `themes`, no direct
 * writes to tokens.css — that file is only ever produced by build-tokens.mjs.
 *
 * Write sequence (setToken):
 *   1. read the exact bytes of tokens.json
 *   2. validate the key (exists, is a leaf, not in `themes`) and the value
 *      (per-type shape + injection charset + alias rules)
 *   3. atomically replace tokens.json (temp file in the same dir + rename)
 *   4. run `node scripts/build-tokens.mjs`
 *   5. on a non-zero build exit: restore the exact previous bytes, restore
 *      tokens.css if the build touched it, and throw `build-failed`
 *   6. return the new tokens.css text, its sha256, and the previous value
 *
 * Formatting is preserved: the serializer round-trips the bytes on disk, so a
 * one-value edit produces a one-value diff. A file that matches no known style
 * falls back to 2-space JSON + trailing newline.
 *
 * No dependencies. Node >= 20.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..', '..');
export const TOKENS_PATH = path.join(ROOT, 'design-system/tokens.json');
export const CSS_PATH = path.join(ROOT, 'design-system/tokens.css');
const BUILD_PATH = path.join(ROOT, 'scripts/build-tokens.mjs');

const MAX_VALUE_LENGTH = 160;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * Machine-readable failure. `code` is part of the HTTP contract; `status` is
 * the status the relay returns. The CLI prints code + message.
 */
export class TokenError extends Error {
  constructor(code, message, status = 422, extra = {}) {
    super(message);
    this.name = 'TokenError';
    this.code = code;
    this.status = status;
    Object.assign(this, extra);
  }
}

const fail = (code, message, status, extra) => {
  throw new TokenError(code, message, status, extra);
};

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

/** Raw bytes of tokens.json (string, utf8) — the exact source of truth. */
function readRaw() {
  try {
    return fs.readFileSync(TOKENS_PATH, 'utf8');
  } catch (err) {
    fail('read-failed', `cannot read design-system/tokens.json: ${err.message}`, 500);
  }
}

/**
 * readTokens() -> { json, raw, sha256, count, path }
 * `count` counts leaves the way build-tokens does (every object with `value`,
 * `themes` excluded).
 */
export function readTokens() {
  const raw = readRaw();
  let json;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    fail('read-failed', `design-system/tokens.json is not valid JSON: ${err.message}`, 500);
  }
  return { json, raw, sha256: sha256(raw), count: countLeaves(json), path: TOKENS_PATH };
}

export function revision() {
  return sha256(readRaw());
}

export function tokensCssSha() {
  try {
    return sha256(fs.readFileSync(CSS_PATH, 'utf8'));
  } catch {
    return null;
  }
}

export function tokenCount() {
  return countLeaves(JSON.parse(readRaw()));
}

/** count leaves: any object with an own `value`, outside the `themes` sibling. */
function countLeaves(json) {
  let n = 0;
  const walk = (node) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    if (Object.prototype.hasOwnProperty.call(node, 'value')) {
      n += 1;
      return;
    }
    for (const [k, v] of Object.entries(node)) {
      if (k === 'themes') continue;
      walk(v);
    }
  };
  walk(json);
  return n;
}

// ---------------------------------------------------------------------------
// Key resolution: this repo stores flat dotted keys; the generator also
// accepts a nested tree. Both are supported, `themes` never is.
// ---------------------------------------------------------------------------

const KEY_RE = /^[a-z][a-z0-9-]*(?:\.[a-z0-9-]+)+$/;

/**
 * resolveKey(json, key) -> { key, type, value, group, parent, prop }
 * Throws TokenError: forbidden-key (403) for `themes*` / a prefix that is a
 * leaf, unknown-key (404) when no such token exists.
 */
export function resolveKey(json, key) {
  const k = String(key ?? '');
  if (!KEY_RE.test(k)) {
    fail('invalid-key', 'key must be a dotted lowercase path like "color.pitch.accent"', 400, { key: k });
  }
  if (k === 'themes' || k.startsWith('themes.')) {
    fail('forbidden-key', 'the `themes` role contract is not a token and cannot be edited', 403, { key: k });
  }

  // Flat shape: own property, exactly this key.
  if (Object.prototype.hasOwnProperty.call(json, k)) {
    const node = json[k];
    if (node && typeof node === 'object' && !Array.isArray(node) && Object.prototype.hasOwnProperty.call(node, 'value')) {
      return { key: k, type: node.type, value: node.value, group: groupOf(k), parent: json, prop: k };
    }
    fail('forbidden-key', `"${k}" is a group, not a leaf token`, 403, { key: k });
  }

  // Nested shape: walk segment by segment.
  const segments = k.split('.');
  let node = json;
  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i];
    if (node === null || typeof node !== 'object' || Array.isArray(node) || !Object.prototype.hasOwnProperty.call(node, seg)) {
      fail('unknown-key', `no token named "${k}"`, 404, { key: k });
    }
    const next = node[seg];
    const isLast = i === segments.length - 1;
    if (!isLast) {
      if (next && typeof next === 'object' && Object.prototype.hasOwnProperty.call(next, 'value')) {
        fail('forbidden-key', `"${k}" runs through "${segments.slice(0, i + 1).join('.')}", which is a leaf`, 403, { key: k });
      }
      node = next;
      continue;
    }
    if (!next || typeof next !== 'object' || Array.isArray(next) || !Object.prototype.hasOwnProperty.call(next, 'value')) {
      if (next && typeof next === 'object' && !Array.isArray(next) && Object.keys(next).length) {
        fail('forbidden-key', `"${k}" is a group of tokens, not a leaf`, 403, { key: k });
      }
      fail('unknown-key', `no token named "${k}"`, 404, { key: k });
    }
    return { key: k, type: next.type, value: next.value, group: groupOf(k), parent: node, prop: seg };
  }
  fail('unknown-key', `no token named "${k}"`, 404, { key: k });
}

const groupOf = (key) => String(key).split('.')[0];

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const NUM = String.raw`[+-]?(?:\d+\.\d+|\d+|\.\d+)`;
const NUMBER_RE = new RegExp(`^${NUM}$`);
const UNIT = '(?:px|rem|em|%|vw|vh|ch)';
const SIMPLE_DIM_RE = new RegExp(`^${NUM}${UNIT}$`, 'i');
const FN_DIM_RE = /^(?:min|max|clamp|calc)\(/i;
const DURATION_RE = /^(?:0|\d+(?:\.\d+)?|\.\d+)(ms|s)$/i;
const KEYWORD_COLOR = /^(?:transparent|currentcolor|inherit)$/i;
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const COLOR_FN = /^(?:rgb|rgba|hsl|hsla)\(([^()]*)\)$/i;
const COLOR_FN_INNER = /^[0-9.,%/\s+-]+$/;
const FN_COLOR = /^(?:rgb|rgba|hsl|hsla)\((?:[^()]*)\)$/i;
const VAR_WHOLE = /^var\((--[a-z0-9-]+)\)$/;
const EASING_KEYWORD = /^(?:linear|ease|ease-in|ease-out|ease-in-out)$/i;
const CUBIC = /^cubic-bezier\(\s*([^,()]+)\s*,\s*([^,()]+)\s*,\s*([^,()]+)\s*,\s*([^,()]+)\s*\)$/i;
const FONT_GENERIC = new Set([
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui',
  'ui-monospace', 'ui-sans-serif', 'ui-serif', 'ui-rounded', 'emoji', 'math',
  'fangsong', '-apple-system', 'blinkmacsystemfont',
]);

/** Anything that could escape a declaration, a rule or a url() is rejected. */
const SAFE_VALUE = /^[^;{}\r\n<>\\]*$/;
const FORBIDDEN_FRAGMENT = /(?:url\s*\(|expression\s*\(|javascript:|@import|\/\*|\*\/|&#|\\[0-9a-f])/i;

/** Groups whose absolute px size must stay plausible; radius is exempt. */
const PX_CAP = { radius: 10000 };
const DEFAULT_PX_CAP = 2400;
const NUMBER_RANGE = {
  opacity: [0, 1],
  'line-height': [0.8, 3],
  z: [0, 999],
  weight: [100, 900],
  hover: [0.5, 3],
};

const bad = (message) => ({ ok: false, code: 'invalid-value', message });

function isBalanced(value, open = '(', close = ')') {
  let depth = 0;
  for (const ch of value) {
    if (ch === open) depth += 1;
    if (ch === close) {
      depth -= 1;
      if (depth < 0) return false;
    }
  }
  return depth === 0;
}

/** Split on a delimiter that sits at paren depth 0. */
function splitTop(value, delimiter) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const ch of value) {
    if (ch === '(') depth += 1;
    else if (ch === ')') depth -= 1;
    if (ch === delimiter && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts;
}

function checkColor(value) {
  if (KEYWORD_COLOR.test(value)) return null;
  if (HEX_COLOR.test(value)) return null;
  const m = value.match(COLOR_FN);
  if (m) {
    const inner = m[1].trim();
    if (!inner) return 'color function needs arguments';
    if (!COLOR_FN_INNER.test(inner)) return 'color function arguments must be numeric (no named colours)';
    if (!/\d/.test(inner)) return 'color function needs at least one number';
    return null;
  }
  return 'color expects #rgb/#rgba/#rrggbb/#rrggbbaa, rgb()/hsl() with numeric args, or transparent/currentcolor';
}

/** Simple dimension -> px number (rem/em at 16), or null when not simple. */
function pxOf(value) {
  if (value === '0') return 0;
  const m = value.match(new RegExp(`^(${NUM})(px|rem|em)$`, 'i'));
  if (!m) return null;
  const n = Number(m[1]);
  return m[2].toLowerCase() === 'px' ? n : n * 16;
}

function checkDimension(value, { cap = DEFAULT_PX_CAP, min = -Infinity, max = Infinity } = {}) {
  if (value === '0') return 0 >= min && 0 <= max ? null : `must be between ${min} and ${max}px`;
  if (SIMPLE_DIM_RE.test(value)) {
    const px = pxOf(value);
    if (px === null) return null; // %/vw/vh/ch: no absolute range to check
    if (px > cap) return `absolute size ${px}px exceeds the ${cap}px workbench cap`;
    if (px < min || px > max) return `size ${px}px is outside ${min}-${max}px`;
    return null;
  }
  if (FN_DIM_RE.test(value)) {
    if (!isBalanced(value) || !value.endsWith(')')) return 'unbalanced parentheses';
    const inner = value.slice(value.indexOf('(') + 1, -1);
    if (!inner.trim()) return 'function needs arguments';
    // Each top-level argument must itself be a length, 0, or a nested function.
    for (const arg of splitTop(inner, ',')) {
      const a = arg.trim();
      if (!a) return 'empty function argument';
      if (a === '0' || SIMPLE_DIM_RE.test(a) || FN_DIM_RE.test(a)) continue;
      if (/^[0-9a-zA-Z\s.,%+\-*/()]+$/.test(a) && isBalanced(a)) continue; // calc() arithmetic
      return `unsupported argument "${a}" in ${value.split('(')[0]}()`;
    }
    return null;
  }
  return 'dimension expects 0, a number with px|rem|em|%|vw|vh|ch, or min()/max()/clamp()/calc()';
}

function checkFontSize(value, group) {
  if (/^(?:smaller|larger)$/i.test(value)) return null;
  const px = pxOf(value);
  if (px !== null && !FN_DIM_RE.test(value)) {
    if (px < 8) return 'font size below 8px is unreadable';
    if (px > 200) return 'font size above 200px is outside the scale';
    return null;
  }
  const problem = checkDimension(value, { cap: 2400 });
  if (problem) return problem;
  return null;
}

function checkNumber(value, group) {
  if (!NUMBER_RE.test(value)) return 'number expects a plain decimal (no exponent, no unit)';
  const n = Number(value);
  if (!Number.isFinite(n)) return 'number is not finite';
  if (group === 'z' && !Number.isInteger(n)) return 'z-index values must be integers';
  const range = NUMBER_RANGE[group];
  if (range && (n < range[0] || n > range[1])) return `${group} must be between ${range[0]} and ${range[1]}`;
  if (!range && Math.abs(n) > 10000) return 'number is implausibly large (|n| > 10000)';
  return null;
}

function checkDuration(value) {
  if (value === '0') return null;
  const m = value.match(DURATION_RE);
  if (!m) return 'duration expects 0 or a non-negative number with ms/s (e.g. 220ms, 0.22s)';
  const n = Number(value.slice(0, -m[1].length));
  const ms = m[1].toLowerCase() === 's' ? n * 1000 : n;
  if (ms < 0) return 'duration cannot be negative';
  if (ms > 10000) return 'duration above 10s is outside the motion scale';
  return null;
}

function checkCubicBezier(value) {
  if (EASING_KEYWORD.test(value)) return null;
  const m = value.match(CUBIC);
  if (!m) return 'cubicBezier expects cubic-bezier(n, n, n, n) or linear/ease/ease-in/ease-out/ease-in-out';
  const nums = m.slice(1, 5).map((s) => (NUMBER_RE.test(s.trim()) ? Number(s) : NaN));
  if (nums.some((n) => !Number.isFinite(n))) return 'cubic-bezier takes four plain numbers';
  const [x1, , x2] = nums;
  if (x1 < 0 || x1 > 1) return 'cubic-bezier x1 must be within [0, 1]';
  if (x2 < 0 || x2 > 1) return 'cubic-bezier x2 must be within [0, 1]';
  if (nums.some((n) => Math.abs(n) > 100)) return 'cubic-bezier control point is implausibly large';
  return null;
}

function checkShadow(value) {
  if (/^none$/i.test(value)) return null;
  const layers = splitTop(value, ',');
  if (!layers.length || layers.length > 4) return 'shadow accepts at most 4 comma-separated layers';
  for (const layer of layers) {
    if (!layer.trim()) return 'empty shadow layer';
    const parts = splitTop(layer.trim(), ' ').filter(Boolean);
    if (parts.length < 3) return 'a shadow layer needs 2-4 lengths and a colour';
    let lengths = 0;
    let colors = 0;
    let insets = 0;
    for (const part of parts) {
      if (/^inset$/i.test(part)) insets += 1;
      else if (FN_COLOR.test(part) || HEX_COLOR.test(part) || /^(?:transparent|currentcolor)$/i.test(part)) colors += 1;
      else if (part === '0' || SIMPLE_DIM_RE.test(part)) lengths += 1;
      else return `unexpected shadow term "${part}"`;
    }
    if (insets > 1) return 'a shadow layer takes at most one inset';
    if (colors > 1) return 'a shadow layer takes exactly one colour';
    if (lengths < 2 || lengths > 4) return `a shadow layer needs 2-4 lengths, got ${lengths}`;
    if (parts.length !== lengths + colors + insets) return 'shadow layer has stray tokens';
  }
  return null;
}

function checkFontFamily(value) {
  const parts = splitTop(value, ',').map((p) => p.trim());
  if (!parts.length) return 'fontFamily is empty';
  if (parts.length > 8) return 'fontFamily lists more than 8 families';
  for (const part of parts) {
    if (!part) return 'empty font family in list';
    if (/^"[^"\\]{1,60}"$/.test(part)) continue;
    if (/^'[^'\\]{1,60}'$/.test(part)) continue;
    if (/^-?[A-Za-z][A-Za-z0-9 _-]{0,59}$/.test(part) || FONT_GENERIC.has(part.toLowerCase())) continue;
    return `unsupported font family "${part}" — quote names with digits/punctuation`;
  }
  return null;
}

function checkFontWeight(value) {
  if (/^(?:normal|bold)$/i.test(value)) return null;
  if (!/^\d{1,4}$/.test(value)) return 'fontWeight expects 100-900 (or normal/bold)';
  const n = Number(value);
  if (n < 100 || n > 1000) return 'fontWeight must be between 100 and 900';
  return null;
}

/** css name as build-tokens.mjs emits it (no leading --). */
function kebab(segments) {
  return segments
    .map((seg) =>
      String(seg)
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase(),
    )
    .join('-');
}

/** Every name the build emits: token kebab names + the 17 theme role vars. */
function liveNames(json) {
  const live = new Set();
  const walk = (node, pathParts) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    if (Object.prototype.hasOwnProperty.call(node, 'value')) {
      live.add(`--${kebab(pathParts.flatMap((p) => String(p).split('.')))}`);
      return;
    }
    for (const [k, v] of Object.entries(node)) {
      if (k === 'themes') continue;
      walk(v, [...pathParts, k]);
    }
  };
  walk(json, []);
  const roleVars = json.themes && json.themes.roleVars;
  if (roleVars && typeof roleVars === 'object') {
    for (const [slot, v] of Object.entries(roleVars)) {
      if (slot === 'status' && v && typeof v === 'object') Object.values(v).forEach((x) => live.add(x));
      else if (typeof v === 'string') live.add(v);
    }
  }
  return live;
}

/** Alias chain: does following `from` reach `self`? Also verifies the target exists. */
function aliasTarget(json, selfName, targetName) {
  const live = liveNames(json);
  if (!live.has(targetName)) {
    return { error: `alias target ${targetName} is not a token or role var` };
  }
  const aliases = new Map();
  const walk = (node, pathParts) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    if (Object.prototype.hasOwnProperty.call(node, 'value')) {
      const m = String(node.value).trim().match(VAR_WHOLE);
      if (m) aliases.set(`--${kebab(pathParts.flatMap((p) => String(p).split('.')))}`, m[1]);
      return;
    }
    for (const [k, v] of Object.entries(node)) {
      if (k === 'themes') continue;
      walk(v, [...pathParts, k]);
    }
  };
  walk(json, []);
  aliases.set(selfName, targetName); // the candidate edge
  const seen = [];
  let cur = selfName;
  while (aliases.has(cur) && !seen.includes(cur)) {
    seen.push(cur);
    cur = aliases.get(cur);
  }
  if (seen.includes(cur) && aliases.has(cur)) {
    return { error: `alias cycle: ${seen.concat(cur).join(' -> ')}` };
  }
  return null;
}

/**
 * validate(key, value, options)
 *   options.previous   the value currently on disk (undo may restore an alias)
 *   options.json       parsed tokens.json (avoid re-reading)
 *   options.allowAlias override the "already an alias" rule
 *
 * -> { ok: true, key, value, type, group } or throws TokenError.
 */
export function validate(key, value, options = {}) {
  const json = options.json ?? readTokens().json;
  const leaf = resolveKey(json, key);
  const previous = typeof options.previous === 'string' ? options.previous : String(leaf.value ?? '');
  const type = String(leaf.type ?? '').trim();
  const raw = value;

  if (typeof raw !== 'string') {
    fail('invalid-value', 'value must be a string', 422, { key: leaf.key, value: raw, type });
  }
  const v = raw.trim();
  if (v !== raw) {
    fail('invalid-value', 'value must not have leading or trailing whitespace', 422, { key: leaf.key, value: raw, type });
  }
  if (v.length === 0) fail('invalid-value', 'value is empty', 422, { key: leaf.key, value: raw, type });
  if (v.length > MAX_VALUE_LENGTH) {
    fail('invalid-value', `value is longer than ${MAX_VALUE_LENGTH} characters`, 422, { key: leaf.key, value: raw, type });
  }
  if (!SAFE_VALUE.test(v)) {
    fail('invalid-value', 'value must not contain ; { } < > backslash or newlines', 422, { key: leaf.key, value: raw, type });
  }
  if (FORBIDDEN_FRAGMENT.test(v)) {
    fail('invalid-value', 'value must not contain url(), expression(), javascript:, @import or a comment marker', 422, { key: leaf.key, value: raw, type });
  }

  // Aliases are pointers. They are only legal on a key that already points,
  // or when undo restores the exact value the key held before.
  const alias = v.match(VAR_WHOLE);
  if (alias) {
    const previousIsAlias = VAR_WHOLE.test(String(previous).trim());
    const restoring = String(previous).trim() === v;
    const allowed = options.allowAlias === true || previousIsAlias || restoring;
    if (!allowed) {
      fail('invalid-value', 'this token holds a literal value; alias values (var(--x)) are only allowed where the key already aliases', 422, { key: leaf.key, value: raw, type });
    }
    const selfName = `--${kebab(leaf.key.split('.'))}`;
    const problem = aliasTarget(json, selfName, alias[1]);
    if (problem) {
      const code = /cycle/.test(problem.error) ? 'alias-cycle' : 'invalid-value';
      fail(code, problem.error, 422, { key: leaf.key, value: raw, type, chain: problem.error });
    }
    // An alias satisfies every type (build-tokens treats it as a pointer).
    return { ok: true, key: leaf.key, value: v, type, group: leaf.group, alias: alias[1] };
  }

  let problem = null;
  switch (type) {
    case 'color':
      problem = checkColor(v);
      break;
    case 'dimension':
      problem = checkDimension(v, { cap: PX_CAP[leaf.group] ?? DEFAULT_PX_CAP });
      break;
    case 'fontSize':
      problem = checkFontSize(v, leaf.group);
      break;
    case 'fontWeight':
      problem = checkFontWeight(v);
      break;
    case 'number':
      problem = checkNumber(v, leaf.group);
      break;
    case 'duration':
      problem = checkDuration(v);
      break;
    case 'cubicBezier':
      problem = checkCubicBezier(v);
      break;
    case 'shadow':
      problem = checkShadow(v);
      break;
    case 'fontFamily':
      problem = checkFontFamily(v);
      break;
    default:
      fail('invalid-value', `token type "${type}" is not supported by the workbench`, 422, { key: leaf.key, value: raw, type });
  }
  if (problem) fail('invalid-value', problem, 422, { key: leaf.key, value: raw, type });
  return { ok: true, key: leaf.key, value: v, type, group: leaf.group, alias: null };
}

// ---------------------------------------------------------------------------
// Describe (GET /__ds/token)
// ---------------------------------------------------------------------------

export function describe(key) {
  const json = readTokens().json;
  const leaf = resolveKey(json, key);
  return { key: leaf.key, value: leaf.value, type: leaf.type, group: leaf.group };
}

/** {key, value, type, group} for every leaf, sorted by key. */
export function listTokens() {
  const { json } = readTokens();
  const out = [];
  const walk = (node, pathParts) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    if (Object.prototype.hasOwnProperty.call(node, 'value')) {
      const key = pathParts.flatMap((p) => String(p).split('.')).join('.');
      out.push({ key, value: node.value, type: node.type, group: groupOf(key) });
      return;
    }
    for (const [k, v] of Object.entries(node)) {
      if (k === 'themes') continue;
      walk(v, [...pathParts, k]);
    }
  };
  walk(json, []);
  return out.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

// ---------------------------------------------------------------------------
// Serialize with the file's own formatting
// ---------------------------------------------------------------------------

const STYLES = [
  (o) => JSON.stringify(o),
  (o) => JSON.stringify(o, null, 2),
  (o) => JSON.stringify(o, null, 2) + '\n',
  (o) => JSON.stringify(o, null, 1) + '\n',
  (o) => JSON.stringify(o, null, '\t') + '\n',
];

function serializerFor(raw, json) {
  for (const style of STYLES) {
    if (style(json) === raw) return style;
  }
  return (o) => JSON.stringify(o, null, 2) + '\n';
}

// ---------------------------------------------------------------------------
// Atomic write
// ---------------------------------------------------------------------------

function atomicWrite(target, data) {
  const dir = path.dirname(target);
  const tmp = path.join(dir, `.${path.basename(target)}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`);
  let fd = null;
  try {
    fd = fs.openSync(tmp, 'wx', 0o644);
    fs.writeFileSync(fd, data);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = null;
    fs.renameSync(tmp, target);
  } finally {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch {
        /* already closed */
      }
    }
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch {
      /* best effort */
    }
  }
}

// ---------------------------------------------------------------------------
// Mutex: one in-flight mutation per process
// ---------------------------------------------------------------------------

let queue = Promise.resolve();
function withLock(fn) {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** Run build-tokens.mjs and capture stderr. */
function runBuild() {
  const res = spawnSync(process.execPath, [BUILD_PATH], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 60000,
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  if (res.error) {
    return { ok: false, stderr: `cannot run scripts/build-tokens.mjs: ${res.error.message}` };
  }
  const stderr = String(res.stderr || '').trim();
  const stdout = String(res.stdout || '').trim();
  if (res.status !== 0) {
    return { ok: false, stderr: stderr || stdout || `build-tokens exited ${res.status}` };
  }
  return { ok: true, stderr: '', stdout };
}

// ---------------------------------------------------------------------------
// setToken / undo
// ---------------------------------------------------------------------------

/**
 * setToken(key, value) ->
 *   { ok, key, value, previous, sha256, css, revision, tokensCssSha,
 *     type, group, changed }
 * `sha256` is the sha256 of the returned `css` (the new tokens.css bytes).
 * `revision` is the sha256 of the new tokens.json bytes.
 * Throws TokenError; on build failure tokens.json/tokens.css are restored byte-exactly.
 */
export function setToken(key, value, options = {}) {
  return withLock(async () => {
    const raw = readRaw();
    let json;
    try {
      json = JSON.parse(raw);
    } catch (err) {
      fail('read-failed', `design-system/tokens.json is not valid JSON: ${err.message}`, 500);
    }

    const leaf = resolveKey(json, key);
    const previous = String(leaf.value);
    const checked = validate(leaf.key, value, {
      json,
      previous,
      allowAlias: options.allowAlias === true,
    });

    if (checked.value === previous) {
      let css = '';
      try {
        css = fs.readFileSync(CSS_PATH, 'utf8');
      } catch {
        fail('read-failed', 'design-system/tokens.css is missing; run node scripts/build-tokens.mjs', 500);
      }
      return {
        ok: true,
        key: checked.key,
        value: checked.value,
        previous,
        sha256: sha256(css),
        css,
        revision: sha256(raw),
        tokensCssSha: sha256(css),
        type: checked.type,
        group: checked.group,
        changed: false,
      };
    }

    // Mutate in place so key order and every other value stay untouched.
    leaf.parent[leaf.prop] = { ...leaf.parent[leaf.prop], value: checked.value };
    // Detect the file's own formatting from the ORIGINAL parse — comparing a
    // mutated object to the original bytes can never match and would silently
    // reformat the whole file.
    const nextRaw = serializerFor(raw, JSON.parse(raw))(json);
    const cssBefore = (() => {
      try {
        return fs.readFileSync(CSS_PATH, 'utf8');
      } catch {
        return null;
      }
    })();

    atomicWrite(TOKENS_PATH, nextRaw);

    const build = runBuild();
    if (!build.ok) {
      // Restore the exact bytes, then tokens.css if the failed run touched it.
      atomicWrite(TOKENS_PATH, raw);
      if (cssBefore !== null) {
        const cssNow = (() => {
          try {
            return fs.readFileSync(CSS_PATH, 'utf8');
          } catch {
            return null;
          }
        })();
        if (cssNow !== cssBefore) atomicWrite(CSS_PATH, cssBefore);
      }
      fail('build-failed', `build-tokens.mjs rejected the write; previous tokens.json restored. ${build.stderr}`, 500, {
        key: checked.key,
        value: checked.value,
        previous,
        rolledBack: true,
        stderr: build.stderr,
      });
    }

    let css;
    try {
      css = fs.readFileSync(CSS_PATH, 'utf8');
    } catch (err) {
      atomicWrite(TOKENS_PATH, raw);
      fail('build-failed', `tokens.css unreadable after build: ${err.message}`, 500, { rolledBack: true });
    }

    return {
      ok: true,
      key: checked.key,
      value: checked.value,
      previous,
      sha256: sha256(css),
      css,
      revision: revision(),
      tokensCssSha: sha256(css),
      type: checked.type,
      group: checked.group,
      changed: true,
    };
  });
}

/**
 * undo(key, previous) — re-apply a known-good value through the same path.
 * Alias restores are allowed because `previous` is byte-identical to a value
 * that was already committed.
 */
export function undo(key, previous) {
  return setToken(key, previous, { allowAlias: true });
}

/** status shape used by GET /__ds/status (route adds `enabled`). */
export function info() {
  const { json, sha256: rev } = readTokens();
  return {
    revision: rev,
    tokensCssSha: tokensCssSha(),
    tokenCount: countLeaves(json),
  };
}
