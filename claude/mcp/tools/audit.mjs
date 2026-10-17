// audit_figure(path, kind?, dir?, widthMm?, verdict?, reason?, blind_read?): measure one figure and record a verdict in molecullage/audit.json and AUDIT.md.
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { py, findConfig } from '../lib/core.mjs';
import { guard, ok, projectDir, outDir, inside, rel, readJson, writeText, cell, targetWidth } from '../lib/project.mjs';

const EXT = /\.(png|jpe?g|tiff?|bmp|gif|webp|pdf|svg|eps)$/i;
const VERDICTS = ['KEEP', 'RESTYLE', 'REDRAW', 'REPLACE', 'DEMOTE'];

export const auditMarkdown = (items) => {
  const rows = items.map((a) => {
    const m = a.marks || {};
    return `| ${a.id} | ${a.kind} | **${a.verdict || 'not measured'}** | ${m.ink ?? ''} / ${m.cells ?? ''} / ${m.band ?? ''} / ${m.blank ?? ''} | ${a.colours ? a.colours.chromatic + ' hues, worst ' + (a.colours.worst_distance ?? 'n/a') : ''} | ${a.effective_dpi ?? (a.vector ? 'vector' : '')} | ${cell(a.reason)} |`;
  });
  const reads = items.filter((a) => a.blind_read).map((a) => `- **${a.id}**: ${cell(a.blind_read)}`);
  return [
    '# Figure audit', '',
    'Marks are in percent: ink, empty cells, longest empty band, largest blank rectangle (limits at strictness normal: ink at least 9, cells at most 25, band at most 4, blank at most 6). Worst is the smallest colour-vision distance (CIEDE2000) among the dominant colours; the shipped palette reaches 11.5.', '',
    '| id | kind | verdict | ink / cells / band / blank | colours | dpi | reason |', '|---|---|---|---|---|---|---|', ...rows, '',
    '## Blind reads', '', ...(reads.length ? reads : ['None recorded yet.']), '',
    'Verdicts: KEEP, RESTYLE (same content, new palette and type), REDRAW (new page from a template), REPLACE (a real render or a data plot instead of a drawing), DEMOTE (becomes a table or text). Rules: references/audit-rubric.md.',
  ].join('\n');
};

export function register(server) {
  server.registerTool('audit_figure', {
    description: 'Measure one figure file: ink share, empty-cell share, longest empty band, largest blank rectangle (the qa_figure marks, computed on the raster), colour count and the worst colour-vision distance among the dominant colours, effective dpi and size in mm at the target width, and for a PDF the smallest text size. Returns a suggested verdict (KEEP, RESTYLE, REDRAW, REPLACE, DEMOTE) with the reason. With record=true it also saves the result in molecullage/audit.json and rewrites AUDIT.md; pass verdict, reason and blind_read to store your own verdict after the blind read. path and dir must lie inside the project folder. PDF and SVG need pymupdf; EPS needs Ghostscript.',
    inputSchema: {
      path: z.string(), kind: z.enum(['auto', 'structure', 'schematic', 'plot', 'table', 'photo']).default('auto'),
      dir: z.string().default('.'), widthMm: z.number().positive().max(400).optional(),
      verdict: z.enum(VERDICTS).optional(), reason: z.string().max(400).optional(), blind_read: z.string().max(1500).optional(), record: z.boolean().default(true),
    },
  }, guard(async ({ path: p, kind, dir, widthMm, verdict, reason, blind_read, record }) => {
    const d = projectDir(dir);
    const file = inside(d, p, 'path');
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`File not found: ${file}`);
    if (!EXT.test(file)) throw new Error('Only png, jpg, tif, bmp, gif, webp, pdf, svg and eps files can be audited.');
    const cfg = findConfig(d)?.cfg;
    const w = targetWidth(d, widthMm, cfg);
    const out = path.join(d, 'molecullage');
    const inv = readJson(path.join(out, 'inventory.json'), { figures: [] });
    const r = rel(d, file);
    const entry = inv.figures.find((f) => f.path === r || (f.also || []).includes(r));
    const rr = py('qa/audit_raster.py', [file, '--width-mm', String(w), '--kind', kind === 'auto' && entry && entry.kind !== 'unknown' && entry.kind_source !== 'pixels' ? entry.kind : kind, '--json', ...(entry?.script ? ['--has-script'] : [])]);
    let a = null;
    try { a = JSON.parse(rr.stdout); } catch { /* handled below */ }
    if (!a) throw new Error('Audit failed: ' + ((rr.stderr || rr.stdout).trim().split('\n').pop() || 'no output'));
    a.path = r; a.id = entry?.id || r.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 64);
    a.suggested_verdict = a.verdict; a.suggested_reason = a.reason;
    if (verdict) { a.verdict = verdict; a.reason = reason || a.reason; }
    if (blind_read) a.blind_read = blind_read;
    if (record) {
      const o = outDir(d);
      const f = path.join(o, 'audit.json');
      const all = readJson(f, { figures: [] });
      const old = all.figures.find((x) => x.id === a.id);
      if (old?.blind_read && !blind_read) a.blind_read = old.blind_read;
      all.figures = [...all.figures.filter((x) => x.id !== a.id), a].sort((x, y) => x.id.localeCompare(y.id));
      writeText(f, JSON.stringify(all, null, 1));
      writeText(path.join(o, 'AUDIT.md'), auditMarkdown(all.figures));
    }
    return ok(a);
  }));
}
