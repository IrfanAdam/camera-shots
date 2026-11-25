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
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 8787);
const UPSTREAM_CHAT = 'https://opencode.ai/inference/v1/chat/completions';

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
});
