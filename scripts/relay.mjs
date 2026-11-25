#!/usr/bin/env node
// Minimal same-origin relay for OpenCode image generation.
// Why it exists: a browser-direct POST to https://opencode.ai/inference/*
// carries Authorization + application/json, so the browser must preflight
// (OPTIONS) first — but the server answers OPTIONS on every POST route with
// 404 and no access-control-* headers, so the POST is blocked before it is
// sent (Safari surfaces this as a bare `Load failed`). Only GET /models
// carries ACAO:*, so key verification stays browser-direct and generation
// goes through here, where CORS does not apply.
//
// Usage: npm run relay  (PORT/HOST env overrides; defaults 127.0.0.1:8787)
//   GET  /api/oc-health  -> {ok:true, service:'oc-relay'} (no key needed)
//   POST /api/oc-image   -> Authorization: Bearer <opencode key>,
//                           JSON {model, prompt}; upstream status+body are
//                           passed through verbatim for the page to parse.
//   Anything else        -> static files from the repo root (engine.html at /).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  describe as dsDescribe,
  info as dsInfo,
  setToken as dsSetToken,
  TokenError,
} from './lib/token-write.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 8787);
const UPSTREAM_CHAT = 'https://opencode.ai/inference/v1/chat/completions';

// ---------------------------------------------------------------------------
// Design-system token workbench — DS_WORKBENCH=1 only, loopback only.
//
// This is a deliberate local write endpoint: it edits one *existing* value in
// design-system/tokens.json, rebuilds tokens.css through the committed
// generator, and hands the new stylesheet back so the gallery can hot-swap it.
// It is never deployed (Vercel serves the static tree; this file is not a
// function) and it is inert unless every gate below is satisfied:
//   1. DS_WORKBENCH=1 in the environment
//   2. the listen address is loopback
//   3. req.socket.remoteAddress is loopback
//   4. Host is 127.0.0.1/localhost/[::1] on this exact port
//   5. Origin, when present, is one of those origins (no cross-origin caller)
//   6. x-ds-workbench: 1 is present (a custom header ⇒ CORS preflight)
//   7. application/json body ≤ 4KB, one write per 250ms
// All mutation logic, validation and rollback live in scripts/lib/token-write.mjs.
// ---------------------------------------------------------------------------
const WORKBENCH_FLAG = process.env.DS_WORKBENCH === '1';
const BIND_IS_LOOPBACK = /^(?:127\.0\.0\.1|localhost|::1|\[::1\])$/.test(String(HOST));
const WORKBENCH = WORKBENCH_FLAG && BIND_IS_LOOPBACK;
const WORKBENCH_OFF_REASON = !WORKBENCH_FLAG
  ? 'DS_WORKBENCH is not set to 1'
  : `HOST=${HOST} is not a loopback address`;
const WORKBENCH_TOKEN = (() => {
  const v = process.env.DS_WORKBENCH_TOKEN;
  if (!v || v === '0') return null;
  if (v === '1') return randomBytes(16).toString('hex');
  return v;
})();
const DS_BODY_LIMIT = 4096;
const DS_WRITE_WINDOW_MS = 250;
let dsLastWriteAt = 0;

const LOOPBACK_IPS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const WORKBENCH_HOSTS = new Set([
  `127.0.0.1:${PORT}`,
  `localhost:${PORT}`,
  `[::1]:${PORT}`,
  ...(PORT === 80 ? ['127.0.0.1', 'localhost', '[::1]'] : []),
]);
const WORKBENCH_ORIGINS = new Set([
  `http://127.0.0.1:${PORT}`,
  `http://localhost:${PORT}`,
  `http://[::1]:${PORT}`,
]);

function dsSend(res, status, payload, extraHeaders = {}) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8');
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': body.length,
    'cache-control': 'no-store',
    ...extraHeaders,
  });
  res.end(body);
}

/** Error envelope: { error: { code, message, … } }. No stack traces, ever. */
function dsErr(res, status, code, extra = {}, headers = {}) {
  dsSend(res, status, { error: { code, ...extra } }, headers);
}

function dsReadBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        tooLarge = true;
        chunks.length = 0;
        return; // keep draining; the response is sent once the body ends
      }
      if (!tooLarge) chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooLarge) return resolve({ tooLarge: true, raw: null });
      resolve({ tooLarge: false, raw: Buffer.concat(chunks).toString('utf8') });
    });
    req.on('error', (err) => reject(err));
  });
}

async function dsHandle(req, res, u) {
  if (!LOOPBACK_IPS.has(String(req.socket.remoteAddress || ''))) {
    return dsErr(res, 403, 'not-loopback', { message: 'workbench requests must originate from loopback' });
  }
  if (!WORKBENCH_HOSTS.has(String(req.headers.host || '').toLowerCase())) {
    return dsErr(res, 403, 'bad-host', { message: `Host must be 127.0.0.1:${PORT}, localhost:${PORT} or [::1]:${PORT}` });
  }
  const origin = req.headers.origin;
  if (origin !== undefined && !WORKBENCH_ORIGINS.has(String(origin).toLowerCase())) {
    return dsErr(res, 403, 'bad-origin', { message: 'cross-origin callers are refused' });
  }
  if (String(req.headers['x-ds-workbench'] || '') !== '1') {
    return dsErr(res, 403, 'missing-header', { message: 'x-ds-workbench: 1 is required' });
  }
  if (WORKBENCH_TOKEN && String(req.headers['x-ds-workbench-token'] || '') !== WORKBENCH_TOKEN) {
    return dsErr(res, 403, 'bad-write-token', { message: 'x-ds-workbench-token does not match this process' });
  }

  const method = req.method || 'GET';
  const route = u.pathname;

  if (method === 'GET' && route === '/__ds/status') {
    const info = dsInfo();
    return dsSend(res, 200, {
      enabled: true,
      revision: info.revision,
      tokensCssSha: info.tokensCssSha,
      tokenCount: info.tokenCount,
    });
  }

  if (route === '/__ds/token' && method === 'GET') {
    const key = u.searchParams.get('key');
    if (!key) return dsErr(res, 400, 'missing-key', { message: '?key=<dotted.key> is required' });
    try {
      return dsSend(res, 200, dsDescribe(key));
    } catch (err) {
      return dsFail(res, err);
    }
  }

  if (route === '/__ds/token' && method === 'POST') {
    const ctype = String(req.headers['content-type'] || '');
    if (!/^application\/json\s*(?:;.*)?$/i.test(ctype)) {
      return dsErr(res, 403, 'bad-content-type', { message: 'content-type: application/json is required' });
    }
    const now = Date.now();
    if (now - dsLastWriteAt < DS_WRITE_WINDOW_MS) {
      const retryAfterMs = DS_WRITE_WINDOW_MS - (now - dsLastWriteAt);
      return dsErr(res, 429, 'throttled', { retryAfterMs }, { 'retry-after': String(Math.ceil(retryAfterMs / 1000)) });
    }
    const body = await dsReadBody(req, DS_BODY_LIMIT);
    if (body.tooLarge) {
      return dsErr(res, 413, 'body-too-large', { limitBytes: DS_BODY_LIMIT });
    }
    let parsed;
    try {
      parsed = JSON.parse(body.raw || '{}');
    } catch {
      return dsErr(res, 400, 'bad-json', { message: 'body must be JSON' });
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return dsErr(res, 400, 'bad-request', { message: 'body must be { "key": "...", "value": "..." }' });
    }
    if (typeof parsed.key !== 'string' || !parsed.key) {
      return dsErr(res, 400, 'bad-request', { message: '"key" must be a non-empty string' });
    }
    if (typeof parsed.value !== 'string') {
      return dsErr(res, 400, 'bad-request', { message: '"value" must be a string' });
    }
    // Only a request that actually attempts a disk write consumes the window;
    // rejected values never reach the file and must not rate-limit the editor.
    try {
      const result = await dsSetToken(parsed.key, parsed.value);
      dsLastWriteAt = Date.now();
      return dsSend(res, 200, {
        ok: true,
        key: result.key,
        value: result.value,
        previous: result.previous,
        sha256: result.sha256,
        css: result.css,
        revision: result.revision,
        type: result.type,
        group: result.group,
        changed: result.changed,
      });
    } catch (err) {
      if (err instanceof TokenError && err.code === 'build-failed') dsLastWriteAt = Date.now();
      return dsFail(res, err);
    }
  }

  if (route === '/__ds/status' || route === '/__ds/token') {
    return dsErr(res, 405, 'method-not-allowed', { message: `${method} is not allowed on ${route}` }, { allow: route === '/__ds/token' ? 'GET, POST' : 'GET' });
  }
  return dsErr(res, 404, 'not-found', { message: `unknown workbench route ${route}` });
}

/** Map a TokenError onto the documented statuses; never leak a stack. */
function dsFail(res, err) {
  if (err instanceof TokenError) {
    const status = Number.isInteger(err.status) ? err.status : 500;
    const extra = { message: err.message };
    if (err.key) extra.key = err.key;
    if (err.value !== undefined) extra.value = err.value;
    if (err.type) extra.type = err.type;
    if (err.rolledBack) {
      extra.rolledBack = true;
      if (err.stderr) extra.stderr = err.stderr;
    }
    return dsErr(res, status, err.code || 'error', extra);
  }
  return dsErr(res, 500, 'internal', { message: 'workbench failed' });
}


// Upstream route per model family (all verified live 2026-11-25: each answers
// a dummy-key POST with 401 Invalid credential, i.e. the route exists and the
// auth layer runs — generation itself needs the user's real key at runtime).
// Responses pass through verbatim; the page's extractors already parse every
// shape (choices/message/images, candidates/content/parts, data[]/images[]).
function upstreamFor(model, prompt, size) {
  const m = String(model || '');
  const s = String(size || '1024x1024').trim() || '1024x1024';
  if (/^(gpt-|sunburst)|dall-e|gpt-image/i.test(m))
    return [
      'https://opencode.ai/inference/openai/v1/images/generations',
      { model: m, prompt, size: s },
    ];
  if (/grok/i.test(m))
    return [
      'https://opencode.ai/inference/xai/v1/images/generations',
      { model: m, prompt, size: s },
    ];
  if (/gemini|^google\//i.test(m))
    return [
      'https://opencode.ai/inference/google/v1beta/models/' +
        encodeURIComponent(m.replace(/^google\//i, '')) +
        ':generateContent',
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      },
    ];
  return [
    UPSTREAM_CHAT,
    { model: m, messages: [{ role: 'user', content: prompt }], modalities: ['image', 'text'] },
  ];
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function send(res, status, body, type = 'application/json; charset=utf-8') {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  res.writeHead(status, { 'content-type': type, 'content-length': buf.length });
  res.end(buf);
}
const jerr = (res, status, message) =>
  send(res, status, JSON.stringify({ error: { message } }));

function serveStatic(req, res) {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/engine.html';
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT + path.sep) && file !== ROOT)
    return jerr(res, 403, 'forbidden');
  fs.stat(file, (e, st) => {
    // Directory requests fall back to index.html (standard static behavior).
    const target = !e && st.isDirectory() ? path.join(file, 'index.html') : file;
    fs.stat(target, (e2, st2) => {
      if (e2 || !st2.isFile()) return jerr(res, 404, 'not found: ' + p);
      res.writeHead(200, {
        'content-type': MIME[path.extname(target).toLowerCase()] || 'application/octet-stream',
      });
      fs.createReadStream(target).pipe(res);
    });
  });
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/api/oc-health' && req.method === 'GET')
      return send(res, 200, JSON.stringify({ ok: true, service: 'oc-relay' }));
    if (u.pathname === '/api/oc-image' && req.method === 'POST') {
      const auth = req.headers.authorization || '';
      if (!/^Bearer\s+\S+/.test(auth))
        return jerr(res, 400, 'missing Authorization: Bearer <opencode key>');
      let body;
      try {
        body = await readJson(req);
      } catch {
        return jerr(res, 400, 'invalid JSON body');
      }
      const model = String((body && body.model) || '').trim();
      const prompt = String((body && (body.prompt ?? body.input)) || '').trim();
      if (!model) return jerr(res, 400, 'missing "model"');
      if (!prompt) return jerr(res, 400, 'missing "prompt"');
      // Backstop: buildPrompt() embeds the card's reference image (often a
      // base64 data URL = tens of thousands of tokens), which upstream
      // rejects with 400 'input token count exceeds allowed tokens'. The page
      // already strips/caps via genCapPrompt; truncate here too so stale pages
      // and direct callers can never trip the length 400 (dummy-key probes
      // stay 401 auth, never length-400s).
      const MAXP = 12000;
      const capped = prompt.length > MAXP ? prompt.slice(0, MAXP) : prompt;
      // Extra body fields (key, size) are accepted and ignored where unused so
      // older/newer page versions keep working against this relay.
      const [url, payload] = upstreamFor(model, capped, body && body.size);
      let up;
      try {
        up = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: auth },
          body: JSON.stringify(payload),
        });
      } catch (e) {
        return jerr(res, 502, 'upstream unreachable: ' + String((e && e.message) || e));
      }
      const text = await up.text().catch(() => '');
      return send(res, up.status, text || '{}');
    }
    if (u.pathname.startsWith('/api/')) return jerr(res, 404, 'unknown api route');
    // Token workbench: exists only when DS_WORKBENCH=1 and the bind is loopback.
    if (u.pathname === '/__ds' || u.pathname.startsWith('/__ds/')) {
      if (!WORKBENCH) return jerr(res, 404, 'not found');
      return await dsHandle(req, res, u);
    }
    if (req.method !== 'GET' && req.method !== 'HEAD')
      return jerr(res, 405, 'method not allowed');
    return serveStatic(req, res);
  } catch (e) {
    return jerr(res, 500, String((e && e.message) || e));
  }
});

server.on('error', (e) => {
  if (e && e.code === 'EADDRINUSE') {
    console.error(
      'port ' + PORT + ' is already in use (another relay/probe holds it) — ' +
        'stop it or run with a free port, e.g. PORT=8788 npm run relay',
    );
    process.exit(1);
  }
  throw e;
});
server.listen(PORT, HOST, () => {
  console.log('oc-relay serving ' + ROOT);
  console.log('open http://' + HOST + ':' + PORT + '/engine.html (health /api/oc-health)');
  if (WORKBENCH) {
    console.log(
      `ds-workbench: ENABLED (HOST=${HOST}, DS_WORKBENCH=1) — GET /__ds/status, ` +
        'GET /__ds/token?key=…, POST /__ds/token. Edits existing values in design-system/tokens.json ' +
        'and rebuilds design-system/tokens.css.',
    );
    console.log(
      WORKBENCH_TOKEN
        ? `ds-workbench: writes require header x-ds-workbench-token: ${WORKBENCH_TOKEN} (printed once)`
        : 'ds-workbench: no write token required (set DS_WORKBENCH_TOKEN=1 to require one printed at startup)',
    );
  } else {
    console.log(`ds-workbench: DISABLED (${WORKBENCH_OFF_REASON}) — /__ds/* answers 404`);
  }
});
