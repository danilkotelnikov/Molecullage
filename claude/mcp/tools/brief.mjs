// make_brief(dir, id): fill references/brief-template.md for one figure and write molecullage/figures/<id>/BRIEF.md.
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { home, findConfig } from '../lib/core.mjs';
import { RE_ID, idOf, within } from '../lib/validate.mjs';
import { guard, ok, projectDir, outDir, readJson, writeText, targetWidth } from '../lib/project.mjs';

export function register(server) {
  server.registerTool('make_brief', {
    description: 'Write the brief for one figure: the project palette and rules, the old image, its caption and script, the template, the output paths, the loop and the hand-back. Needs molecullage/inventory.json (inventory_figures) and, for a verdict and template, audit.json and plan.json (audit_figure, plan_redesign). Writes dir/molecullage/figures/<id>/BRIEF.md. dir must lie inside the project folder. Give the file to a subagent or follow it yourself.',
    inputSchema: { dir: z.string().default('.'), id: z.string().regex(RE_ID) },
  }, guard(async ({ dir, id }) => {
    idOf('id', id);
    const d = projectDir(dir);
    const o = path.join(d, 'molecullage');
    const inv = readJson(path.join(o, 'inventory.json'));
    if (!inv) throw new Error('No molecullage/inventory.json. Call inventory_figures first.');
    const fig = inv.figures.find((f) => f.id === id);
    if (!fig) throw new Error(`No figure "${id}" in the inventory. Ids: ${inv.figures.map((f) => f.id).join(', ')}`);
    const audit = (readJson(path.join(o, 'audit.json'), { figures: [] }).figures).find((a) => a.id === id);
    const plan = readJson(path.join(o, 'plan.json'), null);
    const item = plan?.items?.find((i) => i.id === id);
    const cfg = findConfig(d)?.cfg || {};
    const tokenRel = plan?.palette?.file || cfg.palette || 'tokens/tokens.base.json';
    let tf = path.resolve(d, tokenRel);
    if (!fs.existsSync(tf)) tf = path.resolve(home(), tokenRel);
    within(tf, [d, home()], 'palette', d);
    const tokens = readJson(tf, null);
    const fams = tokens?.color?.family ? Object.entries(tokens.color.family).map(([k, v]) => `${k} ${v.fill}`).join(', ') : 'see the token file';
    const roles = tokens?.color?.alias ? ' Roles: ' + Object.entries(tokens.color.alias).map(([r, f]) => `${r} = ${f}`).join(', ') + '.' : '';
    const L = { letter: 9, title: 7.5, label: 7, floor: 6.5, ...(cfg.typeLadder || {}) };
    const figDir = path.join(o, 'figures', id);
        const val = {
      id, kind: audit?.kind || fig.kind, verdict: audit?.verdict || 'not audited', reason: audit?.reason || 'not audited yet',
      template: item?.template || (audit ? 'none (see the verdict)' : 'choose from list_templates'),
      width_mm: String(targetWidth(d, null, cfg)), old_image: fig.path.split('::')[0], script: fig.script || 'none found', cited_in: fig.cited_in.join(', ') || 'nowhere',
      caption: (fig.caption || 'none found').replace(/\s+/g, ' '),
      palette_file: tokenRel, palette_families: fams + '.' + roles,
      type_ladder: `Panel letter ${L.letter} pt bold, title ${L.title} pt bold, label ${L.label} pt, floor ${L.floor} pt.`,
      claim: cfg.claimBoundary || 'one line, 14 words or fewer: what is data, what is illustration',
      outdir: `molecullage/figures/${id}`, page: `molecullage/figures/${id}/${id}.html`,
    };
    const tpl = fs.readFileSync(path.join(home(), 'claude', 'skill', 'molecullage', 'references', 'brief-template.md'), 'utf8');
    const text = tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in val ? val[k] : m));
    const file = path.join(outDir(d, path.join('figures', id)), 'BRIEF.md');
    writeText(file, text);
    return ok({ brief: file, outdir: figDir, template: val.template, verdict: val.verdict });
  }));
}
