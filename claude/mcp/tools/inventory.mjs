// inventory_figures(dir, widthMm?): walk a project, list every figure, script and citation, write molecullage/inventory.json and INVENTORY.md.
import path from 'node:path';
import { z } from 'zod';
import { py, lastJson, findConfig } from '../lib/core.mjs';
import { guard, ok, projectDir, outDir, writeText, cell, targetWidth } from '../lib/project.mjs';

export const inventoryMarkdown = (inv) => {
  const f = inv.figures;
  const rows = f.map((x) => `| ${x.id} | ${cell(x.path)}${x.also?.length ? ' (also ' + cell(x.also.join(', ')) + ')' : ''} | ${x.vector ? 'vector' : (x.pixels || []).join(' x ') + ' px'} | ${x.target_mm ? x.target_mm.join(' x ') : ''} | ${x.effective_dpi ?? ''} | ${x.kind}${x.kind_source === 'pixels' || x.kind_source === 'none' ? ' (guess)' : ''} | ${cell(x.script || '')} | ${cell(x.cited_in.slice(0, 3).join(', '))} |`);
  const caps = f.filter((x) => x.caption).map((x) => `- **${x.id}**: ${cell(x.caption)}`);
  return [
    '# Figure inventory', '',
    `Folder: ${inv.dir}. Target width: ${inv.target_width_mm} mm. ${inv.counts.figures} figures, ${inv.counts.scripts} figure scripts, ${inv.counts.references} references in text; ${inv.counts.uncited} figures are cited nowhere, ${inv.counts.broken_references} references point at no file.`, '',
    '| id | path | size | mm at target | dpi at target | kind | script | cited in |', '|---|---|---|---|---|---|---|---|', ...rows, '',
    '## Captions', '', ...(caps.length ? caps : ['No captions found.']), '',
    '## Scripts', '', ...(inv.scripts.length ? inv.scripts.map((s) => `- ${s.path}: ${s.libs.join(', ') || 'no plotting library found'}; saves ${s.outputs.join(', ') || 'nothing by name'}`) : ['No figure scripts found.']), '',
    ...(inv.references.filter((r) => !r.figure).length ? ['## References without a file', '', ...inv.references.filter((r) => !r.figure).map((r) => `- ${r.file}:${r.line} points at ${cell(r.target)}`), ''] : []),
    ...(inv.documents.length ? ['## Documents', '', ...inv.documents.map((d) => `- ${d.path}: ${d.pages} pages, not a figure`), ''] : []),
    ...(inv.notes.length ? ['## Notes', '', ...inv.notes.map((n) => `- ${cell(n)}`), ''] : []),
    'Kinds marked "guess" come from the file name or the pixels. Look at the picture and correct them in the audit.',
  ].join('\n');
};

export function register(server) {
  server.registerTool('inventory_figures', {
    description: 'List every figure of a project: image and vector files (png, jpg, tif, pdf, svg, eps), docx pictures, notebook outputs, the figure scripts (matplotlib, seaborn, plotly, ggplot, R base graphics) and where LaTeX, Markdown, Quarto, Sphinx and docx cite them, with captions where they can be read. Writes molecullage/inventory.json and INVENTORY.md inside dir. dir must lie inside the project folder. Reads files; no network.',
    inputSchema: { dir: z.string().default('.'), widthMm: z.number().positive().max(400).optional() },
  }, guard(async ({ dir, widthMm }) => {
    const d = projectDir(dir);
    const out = outDir(d);
    const cfg = findConfig(d)?.cfg;
    const w = targetWidth(d, widthMm, cfg);
    const ignore = (Array.isArray(cfg?.ignore) ? cfg.ignore : []).filter((s) => typeof s === 'string' && /^[A-Za-z0-9_. /-]{1,80}$/.test(s) && !s.includes('..')).flatMap((s) => ['--ignore', s]);
    const r = py('qa/inventory.py', [d, '--width-mm', String(w), '--extract-dir', path.join(out, 'extracted'), ...ignore]);
    let inv = null;
    try { inv = JSON.parse(r.stdout); } catch { inv = lastJson(r.stdout); }
    if (r.status || !inv) throw new Error('Inventory failed: ' + ((r.stderr || r.stdout).trim().split('\n').pop() || 'no output'));
    inv.dir = path.basename(d);   // the files travel with the project, so they carry no absolute path
    writeText(path.join(out, 'inventory.json'), JSON.stringify(inv, null, 1));
    writeText(path.join(out, 'INVENTORY.md'), inventoryMarkdown(inv));
    return ok({ counts: inv.counts, files: [path.join(out, 'inventory.json'), path.join(out, 'INVENTORY.md')], figures: inv.figures.map((x) => ({ id: x.id, path: x.path, kind: x.kind, caption: x.caption.slice(0, 120) })) });
  }));
}
