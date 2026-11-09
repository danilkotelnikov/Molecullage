// The one place that starts a browser and local studio server for the Studio's tests and tools.
// Copied from .\film\tools\render.mjs (read only, line 47).
// The one change: a missing Chrome throws an error, where render.mjs exits the process.
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { editsPlugin } from './edits-server.mjs';

const STUDIO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jsonl': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.hdr': 'application/octet-stream',
};

export const chromePath = () => {
  const c = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  const p = c.find((x) => x && fs.existsSync(x));
  if (!p) throw new Error('Chrome not found. Set CHROME_PATH to the Chrome or Chromium executable.');
  return p;
};

/** Starts headless Chrome with software WebGL 2. */
export const launch = () =>
  chromium.launch({
    executablePath: chromePath(),
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'],
  });

function checkPortListening(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const sock = net.createConnection({ port, host });
    sock.setTimeout(250);
    sock.once('connect', () => {
      sock.destroy();
      resolve(true);
    });
    sock.once('error', () => {
      sock.destroy();
      resolve(false);
    });
    sock.once('timeout', () => {
      sock.destroy();
      resolve(false);
    });
  });
}

/**
 * Ensures the Studio preview server is reachable. If 127.0.0.1:4380 is already listening
 * (and opts.forceNew is not set), reuses it; otherwise starts an in-process static + /__edits server.
 */
export async function ensureStudioServer(opts = {}) {
  const defaultPort = opts.port ?? 4380;
  const studioDir = opts.studioDir ?? STUDIO_DIR;
  if (opts.reuseExisting && defaultPort === 4380 && studioDir === STUDIO_DIR && (await checkPortListening(4380))) {
    return { url: 'http://127.0.0.1:4380', close: async () => {} };
  }

  const distDir = path.join(studioDir, 'web', 'dist');
  const editsMw = editsPlugin(path.join(studioDir, 'jobs'));
  let editsHandler = null;
  editsMw.configureServer({
    middlewares: {
      use(fn) {
        editsHandler = fn;
      },
    },
  });

  const server = http.createServer((req, res) => {
    const next = () => {
      const reqUrl = new URL(req.url ?? '/', 'http://127.0.0.1');
      const urlPath = decodeURIComponent(reqUrl.pathname);

      let filePath = null;
      if (urlPath === '/' || urlPath === '/index.html') {
        filePath = path.join(distDir, 'index.html');
      } else if (urlPath === '/gsap.html' || urlPath === '/test/gsap.html') {
        const p1 = path.join(distDir, 'test', 'gsap.html');
        const p2 = path.join(distDir, 'gsap.html');
        filePath = fs.existsSync(p1) ? p1 : p2;
      } else if (
        urlPath.startsWith('/jobs/') ||
        urlPath.startsWith('/lenses/') ||
        urlPath.startsWith('/library/') ||
        urlPath.startsWith('/cache/')
      ) {
        filePath = path.join(studioDir, urlPath);
      } else {
        filePath = path.join(distDir, urlPath);
      }

      if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'no-store');
      res.end(fs.readFileSync(filePath));
    };

    if (editsHandler) {
      editsHandler(req, res, next);
    } else {
      next();
    }
  });

  await new Promise((resolve) => {
    server.once('error', () => {
      server.listen(0, '127.0.0.1', resolve);
    });
    server.listen(defaultPort, '127.0.0.1', resolve);
  });

  const addr = server.address();
  const actualPort = typeof addr === 'object' && addr ? addr.port : defaultPort;
  return {
    url: `http://127.0.0.1:${actualPort}`,
    close: () => new Promise((r) => server.close(() => r())),
  };
}
