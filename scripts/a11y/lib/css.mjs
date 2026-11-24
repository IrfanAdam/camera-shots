/* ==========================================================================
   a11y/lib/css.mjs — the smallest CSS reader the gate needs: top-level blocks,
   at-rule context, and custom-property declarations. No dependency, no
   cascade engine — it reads the two files that ship in design-system/.
   ========================================================================== */

export function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Flatten `selector { body }` blocks, recursing into @media/@supports/@layer.
 * Each entry: { selector, body, at: ['@media (pointer:coarse)'] }.
 */
export function blocks(css, at = []) {
  const out = [];
  const src = stripComments(css);
  let i = 0;
  while (i < src.length) {
    const open = src.indexOf('{', i);
    if (open === -1) break;
    const selector = src.slice(i, open).trim();
    let depth = 1;
    let j = open + 1;
    while (j < src.length && depth > 0) {
      if (src[j] === '{') depth += 1;
      else if (src[j] === '}') depth -= 1;
      j += 1;
    }
    const body = src.slice(open + 1, j - 1);
    if (/^@(media|supports|layer|container)/i.test(selector)) {
      out.push(...blocks(body, [...at, selector]));
    } else if (selector) {
      out.push({ selector, body, at });
    }
    i = j;
  }
  return out;
}

/** All custom-property declarations in a block, in source order. */
export function customProperties(body) {
  const out = [];
  for (const raw of body.split(';')) {
    const chunk = raw.trim();
    if (!chunk.startsWith('--')) continue;
    const at = chunk.indexOf(':');
    if (at < 0) continue;
    out.push([chunk.slice(0, at).trim(), chunk.slice(at + 1).trim()]);
  }
  return out;
}

/** All `prop: value` declarations in a block (last one wins per property). */
export function declarations(body) {
  const map = new Map();
  for (const raw of body.split(';')) {
    const chunk = raw.trim();
    if (!chunk || chunk.startsWith('--')) continue;
    const at = chunk.indexOf(':');
    if (at < 0) continue;
    const prop = chunk.slice(0, at).trim().toLowerCase();
    const value = chunk.slice(at + 1).trim();
    if (!prop || !value) continue;
    map.set(prop, value);
  }
  return map;
}

/** Split a selector list on top-level commas (parens/brackets aware). */
export function selectorList(selector) {
  const out = [];
  let depth = 0;
  let buf = '';
  for (const ch of selector) {
    if (ch === '(' || ch === '[') depth += 1;
    if (ch === ')' || ch === ']') depth -= 1;
    if (ch === ',' && depth === 0) {
      out.push(buf.trim());
      buf = '';
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

/** 40px / 2.5rem / 0.95em -> px at a 16px root; null when not a simple length. */
export function toPx(value, rem = 16) {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  const m = v.match(/^(-?\d*\.?\d+)(px|rem|em)$/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (m[2] === 'px') return n;
  return n * rem;
}
