/* ==========================================================================
   a11y/lib/server.mjs — a private, dependency-free static server for the gate.

   The gate must never touch a developer's server on :5173, so the checks bind
   an ephemeral loopback port by default (port 0 -> OS-assigned) and refuse
   5173 outright. Only files inside the repo root are served; everything else
   is a 404, requests outside `root` cannot escape it.
   ========================================================================== */
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

export const RESERVED_PORT = 5173;

/**
 * Serve `root` on loopback. Returns { origin, port, close }.
 * `port` defaults to 0 (ephemeral). 5173 is refused because that is the
 * developer server the gate must not disturb.
 */
export async function startServer(root, { port = 0 } = {}) {
  if (Number(port) === RESERVED_PORT) {
    throw new Error(`refusing to bind :${RESERVED_PORT} — the gate serves on an ephemeral loopback port`);
  }
  const base = path.resolve(root);

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      let rel = decodeURIComponent(url.pathname);
      if (rel === '/favicon.ico') {
        res.writeHead(204).end();
        return;
      }
      if (rel.endsWith('/')) rel += 'index.html';
      const file = path.resolve(base, '.' + rel);
      if (file !== base && !file.startsWith(base + path.sep)) {
        res.writeHead(403).end('forbidden');
        return;
      }
      const info = await stat(file);
      if (!info.isFile()) {
        res.writeHead(404).end('not found');
        return;
      }
      const body = await readFile(file);
      res.writeHead(200, {
        'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'cache-control': 'no-store',
        'content-length': body.length,
      });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  const actual = server.address().port;
  if (actual === RESERVED_PORT) {
    server.close();
    throw new Error(`OS assigned :${RESERVED_PORT}; re-run to get another ephemeral port`);
  }
  return {
    origin: `http://127.0.0.1:${actual}`,
    port: actual,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
