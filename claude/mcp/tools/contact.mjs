// contact_sheet(paths[], out, labels?, cols?): figures side by side with their QA marks, one PNG under <dir>/molecullage/.
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { py, lastJson } from '../lib/core.mjs';
import { guard, ok, projectDir, outDir, inside } from '../lib/project.mjs';

export function register(server) {
  server.registerTool('contact_sheet', {
    description: 'Put up to 24 figures (png, jpg, tif, pdf, svg) side by side on one PNG, each with a label and its QA marks (ink, empty cells, band, blank rectangle). Use it for old against new at the gate and for batch review. Every path and dir must lie inside the project folder. out is a file name ending in .png; the sheet is written under dir/molecullage/. Order the paths old, new, old, new for pairs and use cols 2.',
    inputSchema: { paths: z.array(z.string()).min(1).max(24), out: z.string().regex(/^[A-Za-z0-9_./-]{1,120}\.png$/), dir: z.string().default('.'), labels: z.array(z.string().max(80)).optional(), cols: z.number().int().min(1).max(6).default(2) },
  }, guard(async ({ paths, out, dir, labels, cols }) => {
    const d = projectDir(dir);
    const files = paths.map((p) => {
      const f = inside(d, p, 'path');
      if (!fs.existsSync(f) || !/\.(png|jpe?g|tiff?|bmp|gif|webp|pdf|svg)$/i.test(f)) throw new Error(`Not an image file inside the project: ${p}`);
      return f;
    });
    const base = outDir(d);
    const target = inside(base, path.join(base, out), 'out');
    const spec = files.map((f, i) => ({ path: f, label: labels?.[i] || path.basename(f) }));
    const r = py('qa/contact_sheet.py', ['--out', target, '--cols', String(cols), `--spec=${JSON.stringify(spec)}`]);
    const res = lastJson(r.stdout);
    if (r.status || !res) throw new Error('Contact sheet failed: ' + ((r.stderr || r.stdout).trim().split('\n').pop() || 'no output'));
    return ok(res);
  }));
}
