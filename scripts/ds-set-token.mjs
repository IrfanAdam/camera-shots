#!/usr/bin/env node
/**
 * ds-set-token.mjs — offline fallback for the live token workbench.
 *
 * The gallery prints one of these commands when the relay is not running with
 * DS_WORKBENCH=1. Same library, same validators, same atomic write + rebuild +
 * rollback as POST /__ds/token, so a copy-pasted command can never do anything
 * the endpoint would have refused.
 *
 * Usage:
 *   node scripts/ds-set-token.mjs color.pitch.accent '#B9A176'
 *   node scripts/ds-set-token.mjs --get color.pitch.accent
 *   node scripts/ds-set-token.mjs --list [--type color] [--group color]
 *   node scripts/ds-set-token.mjs --undo color.pitch.accent '#C8B28A'
 *
 * Exit: 0 ok, 1 rejected/failed, 2 bad usage.
 * Every successful write prints the tokens.css sha256, the tokens.json
 * revision, and the exact command that restores the previous value.
 */

import {
  describe,
  listTokens,
  readTokens,
  setToken,
  undo,
  TokenError,
} from './lib/token-write.mjs';

function usage(message) {
  if (message) console.error(`FAIL: ${message}`);
  console.error('Usage:');
  console.error('  node scripts/ds-set-token.mjs <dotted.key> <value>');
  console.error('  node scripts/ds-set-token.mjs --get <dotted.key>');
  console.error('  node scripts/ds-set-token.mjs --list [--type <type>] [--group <group>]');
  console.error('  node scripts/ds-set-token.mjs --undo <dotted.key> <previous-value>');
  process.exit(2);
}

/** Single-quote for a POSIX shell, the way a user would paste it. */
function sh(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function parseArgs(argv) {
  const opts = { mode: 'set', key: null, value: null, type: null, group: null };
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--get') {
      opts.mode = 'get';
    } else if (arg === '--list') {
      opts.mode = 'list';
    } else if (arg === '--undo') {
      opts.mode = 'undo';
    } else if (arg === '--type' || arg === '--group') {
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) usage(`${arg} needs a value`);
      opts[arg === '--type' ? 'type' : 'group'] = next;
      i += 1;
    } else if (arg === '-h' || arg === '--help') {
      usage();
    } else if (arg.startsWith('--')) {
      usage(`unknown flag "${arg}"`);
    } else {
      rest.push(arg);
    }
  }
  opts.rest = rest;
  return opts;
}

const opts = parseArgs(process.argv.slice(2));

function printChange(result) {
  console.log(`${result.ok ? 'ok' : 'no-op'} ${result.key} [${result.type}]`);
  if (result.changed) console.log(`  ${result.previous} -> ${result.value}`);
  else console.log(`  ${result.value} (unchanged)`);
  console.log(`  tokens.css sha256: ${result.sha256}`);
  console.log(`  tokens.json revision: ${result.revision}`);
  console.log(`  revert: node scripts/ds-set-token.mjs ${result.key} ${sh(result.previous)}`);
}

function die(err) {
  if (err instanceof TokenError) {
    console.error(`FAIL [${err.code}] ${err.message}`);
    if (err.rolledBack) console.error('  tokens.json restored byte-for-byte; tokens.css left unchanged.');
    process.exit(1);
  }
  console.error(`FAIL ${err && err.message ? err.message : err}`);
  process.exit(1);
}

try {
  if (opts.mode === 'list') {
    const rows = listTokens().filter(
      (t) => (!opts.type || t.type === opts.type) && (!opts.group || t.group === opts.group),
    );
    for (const t of rows) console.log(`${t.key}\t${t.type}\t${t.value}`);
    console.error(`${rows.length} token(s)`);
    process.exit(0);
  }

  if (opts.mode === 'get') {
    const key = opts.rest[0];
    if (!key) usage('--get needs a dotted key');
    console.log(JSON.stringify(describe(key), null, 2));
    process.exit(0);
  }

  if (opts.mode === 'undo') {
    const [key, value] = opts.rest;
    if (!key || value === undefined) usage('--undo needs a key and the previous value');
    printChange(await undo(key, value));
    process.exit(0);
  }

  const [key, value] = opts.rest;
  if (!key || value === undefined) usage('a key and a value are required');
  if (opts.rest.length > 2) usage('quote the value: a value with spaces is one argument');
  printChange(await setToken(key, value));
  process.exit(0);
} catch (err) {
  die(err);
}
