// Live preview of a deck: a small local server with hot reload.
//   npm run deck:preview -- <deck folder> [--port 4177] [--open] [--audience cloud] [--info-file file.json]
// Pages:  /            the deck (keys: arrows, O overview, P presenter window, F full screen, ? help)
//         /?presenter  the presenter view   (P opens it from the deck)
//         /?popout=ID  one 3D scene in its own window
// A change to any file in the deck folder reloads every open page; the slide number stays (it is in the address).
// Device frames with a "url" load that page in an iframe here, and only here: exports use the screenshot.
// The server listens on 127.0.0.1 only and serves files from the deck folder and the Molecullage folder.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { REPO } from '../build/config.mjs';
import { loadDeck, prepareScenes, assemble, locate } from './build.mjs';

const MIME = { html: 'text/html; charset=utf-8', js: 'text/javascript', css: 'text/css', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp', mp4: 'video/mp4', webm: 'video/webm', json: 'application/json' };
const RELOAD = `<script>new EventSource('/__events').onmessage=()=>location.reload();</script>`;
const page = (title, body) => `<!doctype html><meta charset="utf-8"><title>${title}</title><body style="font:20px Arial;padding:40px;max-width:900px">${body}${RELOAD}`;

export function startPreview(where, { port = 4177, audience, log = console.log, infoFile, open = false } = {}) {
  const { dir } = locate(where);
  const clients = new Set();
  const inside = (abs) => [path.resolve(dir), REPO].some((r) => abs === r || abs.startsWith(r + path.sep));
  const render = () => {
    const d = loadDeck(dir, { audience });
    if (d.errors.length) throw new Error(d.errors.join('\n'));
    const scenes = prepareScenes(d.deck, d.dir, { log, render: false });
    return assemble(d, scenes, { inline: false, live: true, url: (abs) => `/f?p=${encodeURIComponent(abs)}`, extra: RELOAD });
  };
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1');
    try {
      if (u.pathname === '/__events') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
        res.write('retry: 500\n\n');
        clients.add(res); req.on('close', () => clients.delete(res));
        return;
      }
      if (u.pathname === '/f') {
        const abs = path.resolve(u.searchParams.get('p') || '');
        if (!inside(abs) || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) { res.writeHead(404); return res.end('not found'); }
        const size = fs.statSync(abs).size, type = MIME[path.extname(abs).slice(1).toLowerCase()] || 'application/octet-stream';
        const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
        if (m) {
          const a = m[1] ? +m[1] : 0, b = m[2] ? Math.min(+m[2], size - 1) : size - 1;
          res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${a}-${b}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': b - a + 1 });
          return fs.createReadStream(abs, { start: a, end: b }).pipe(res);
        }
        res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes' });
        return fs.createReadStream(abs).pipe(res);
      }
      if (u.pathname === '/') {
        let html;
        try { html = render(); } catch (e) { html = page('Deck error', `<h2>The deck does not build</h2><pre style="white-space:pre-wrap">${String(e.message).replace(/</g, '&lt;')}</pre><p>Fix the file; this page reloads by itself.</p>`); }
        res.writeHead(200, { 'Content-Type': MIME.html, 'Cache-Control': 'no-store' });
        return res.end(html);
      }
      res.writeHead(404); res.end('not found');
    } catch (e) { res.writeHead(500); res.end(String(e.message)); }
  });

  let timer = null;
  const ignore = /(^|[\\/])(out|dist|node_modules|\.git|tmp)([\\/]|$)|\.deck-preview\.json$/;
  const watcher = fs.watch(dir, { recursive: true }, (_ev, file) => {
    if (file && ignore.test(file)) return;
    clearTimeout(timer);
    timer = setTimeout(() => { for (const c of clients) c.write('data: reload\n\n'); }, 200);
  });

  return new Promise((resolveP, rejectP) => {
    let p = port, tries = 0;
    const listen = () => server.listen(p, '127.0.0.1');
    server.on('error', (e) => { if (e.code === 'EADDRINUSE' && tries++ < 10) { p++; listen(); } else rejectP(e); });
    server.on('listening', () => {
      const url = `http://127.0.0.1:${p}/`;
      log(`Deck preview: ${url}\n  presenter view: press P in the deck, or open ${url}?presenter\n  watching ${dir}\n  stop with Ctrl+C`);
      if (infoFile) fs.writeFileSync(infoFile, JSON.stringify({ url, port: p, pid: process.pid, dir }));
      if (open) spawn(process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open', process.platform === 'win32' ? ['/c', 'start', '', url] : [url], { stdio: 'ignore', detached: true }).unref();
      resolveP({ url, port: p, close: () => { watcher.close(); for (const c of clients) c.end(); server.close(); } });
    });
    listen();
  });
}
