import path from 'node:path';
import { appendEdit, undoLast } from './edits-store.mjs';

const JOB_ID = /^[a-z0-9-]+$/;

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export function editsPlugin(jobsDir) {
  const handler = async (req, res, next) => {
    const url = (req.url ?? '').split('?')[0];
    if (!url.startsWith('/__edits/')) return next();
    if (req.method !== 'POST') {
      res.statusCode = 405;
      return res.end('method not allowed');
    }

    const rest = decodeURIComponent(url.slice('/__edits/'.length));
    const parts = rest.split('/');
    const job = parts[0] ?? '';
    const sub = parts[1] ?? null;

    if (!JOB_ID.test(job) || parts.length > 2 || (sub !== null && sub !== 'undo')) {
      res.statusCode = 400;
      return res.end('bad job name');
    }

    const jobDir = path.resolve(jobsDir, job);
    try {
      if (sub === 'undo') {
        const removed = undoLast(jobDir);
        if (!removed) {
          res.statusCode = 204;
          return res.end();
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify(removed));
      } else {
        const body = await readBody(req);
        const edit = JSON.parse(body);
        appendEdit(jobDir, edit);
        res.statusCode = 204;
        return res.end();
      }
    } catch (err) {
      res.statusCode = 400;
      return res.end(err instanceof Error ? err.message : String(err));
    }
  };

  return {
    name: 'studio-edits',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}
