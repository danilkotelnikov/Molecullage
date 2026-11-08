// The one Vite config of the whole Studio. Later plans only add to it (inputs, plugins).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

const web = path.dirname(fileURLToPath(import.meta.url));
const studio = path.resolve(web, '..');

// URL prefix -> folder under studio/
const MOUNTS: Record<string, string> = { '/jobs/': 'jobs', '/lenses/': 'lenses', '/library/': 'library', '/cache/': 'cache' };
const TYPES: Record<string, string> = {
  '.json': 'application/json',
  '.jsonl': 'text/plain; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
};

/** Serves /jobs/, /lenses/, /library/ and /cache/ from studio/jobs, studio/lenses, studio/library and studio/cache, in dev and in preview.
 *  It reads the file on each request, so a newly appended edits.jsonl is served at once. */
function studioFiles(): Plugin {
  const handler = (req: { url?: string }, res: any, next: () => void) => {
    const url = (req.url ?? '').split('?')[0];
    for (const [prefix, dir] of Object.entries(MOUNTS)) {
      if (!url.startsWith(prefix)) continue;
      const root = path.resolve(studio, dir);
      const file = path.resolve(root, decodeURIComponent(url.slice(prefix.length)));
      if (!file.startsWith(root + path.sep)) {
        res.statusCode = 403;
        return res.end('forbidden');
      }
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
        res.statusCode = 404;
        return res.end('not found');
      }
      res.setHeader('Content-Type', TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream');
      res.setHeader('Cache-Control', 'no-store');
      return fs.createReadStream(file).pipe(res);
    }
    next();
  };
  return {
    name: 'studio-files',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig({
  root: web,
  base: './',
  plugins: [studioFiles()],
  server: { fs: { allow: ['..'] } },
  build: {
    outDir: path.resolve(web, 'dist'),
    emptyOutDir: true,
    rollupOptions: { input: { index: path.resolve(web, 'index.html') } },
  },
});
