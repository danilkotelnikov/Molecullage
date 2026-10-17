// plan_redesign(dir): turn inventory.json and audit.json into molecullage/PLAN.md and plan.json.
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { home, py, findConfig } from '../lib/core.mjs';
import { within } from '../lib/validate.mjs';
import { guard, ok, projectDir, readJson, writeText, targetWidth } from '../lib/project.mjs';

const TEMPLATE = { structure: 'structures', schematic: 'pipeline', plot: 'plots2', table: null, photo: null, unknown: null };
const UNITS = { KEEP: 0, RESTYLE: 1, REDRAW: 3, REPLACE: 3, DEMOTE: 1 };
const STEP = {
  KEEP: 'leave as it is; check the caption',
  RESTYLE: 'same content: new palette and type, from the script if there is one',
  REDRAW: 'new page from the template; keep the content',
  REPLACE: 'real render (render_structure) or a data plot instead of the picture',
  DEMOTE: 'set as a table or as text in the manuscript',
};

/** A template for one figure: the kind decides, caption and name words refine it. */
export function templateFor(fig, verdict) {
  if (['KEEP', 'DEMOTE'].includes(verdict)) return null;
  const t = `${fig.id} ${fig.path} ${fig.caption || ''}`.toLowerCase();
  if (/contact map|contacts/.test(t)) return 'contacts';
  if (/sequence (view|track|logo)|alignment|\bmsa\b/.test(t)) return 'sequence';
  if (/time series|trajectory|denois|diffusion/.test(t) && fig.kind === 'structure') return 'series';
  return TEMPLATE[fig.kind] ?? null;
}

export function register(server) {
  server.registerTool('plan_redesign', {
    description: 'Turn molecullage/inventory.json and molecullage/audit.json into molecullage/PLAN.md and plan.json: one palette and one type ladder for the project, a template per figure, the order of work, two prototypes for the gate (one structure-led, one schematic) and an effort estimate. Run inventory_figures and audit_figure first. dir must lie inside the project folder; files are written under dir/molecullage only.',
    inputSchema: { dir: z.string().default('.') },
  }, guard(async ({ dir }) => {
    const d = projectDir(dir);
    const o = path.join(d, 'molecullage');
    const inv = readJson(path.join(o, 'inventory.json'));
    if (!inv) throw new Error('No molecullage/inventory.json. Call inventory_figures first.');
    const audits = Object.fromEntries((readJson(path.join(o, 'audit.json'), { figures: [] }).figures).map((a) => [a.id, a]));
    const found = findConfig(d);
    const cfg = found?.cfg || {};
    const pj = readJson(path.join(o, 'project.json'), {});
    const tokenRel = pj.palette || cfg.palette || 'tokens/tokens.base.json';
    let tokenFile = path.resolve(d, tokenRel);
    if (!fs.existsSync(tokenFile)) tokenFile = path.resolve(home(), tokenRel);
    within(tokenFile, [d, home()], 'palette', d);
    const tokens = readJson(tokenFile, null);
    if (!tokens?.color) throw new Error(`${tokenRel} is not a token file.`);
    const chk = py('palette/check_palette.py', [tokenFile, '--json']);
    let worst = null;
    try { worst = JSON.parse(chk.stdout).min_ciede2000; } catch { /* the plan does not need it */ }
    const ladder = { ...{ letter: 9, title: 7.5, label: 7, floor: 6.5 }, ...(cfg.typeLadder || {}) };
    const w = targetWidth(d, null, cfg);

    const items = inv.figures.map((f) => {
      const a = audits[f.id];
      const verdict = a?.verdict || null;
      return { id: f.id, path: f.path, kind: a?.kind || f.kind, verdict, template: verdict ? templateFor({ ...f, kind: a?.kind || f.kind }, verdict) : null, units: verdict ? UNITS[verdict] : null, caption: f.caption || '' };
    });
    const todo = items.filter((i) => i.verdict && UNITS[i.verdict] > 0);
    const unaudited = items.filter((i) => !i.verdict);
    // order: the work that needs a real render first (it takes longest), then drawings, then restyles; ties by id
    const rank = { REPLACE: 0, REDRAW: 1, RESTYLE: 2, DEMOTE: 3 };
    todo.sort((a, b) => rank[a.verdict] - rank[b.verdict] || a.id.localeCompare(b.id));
    const structure = todo.find((i) => i.kind === 'structure') || null;
    const schematic = todo.find((i) => i.kind === 'schematic' && i !== structure) || null;
    const gate = [structure, schematic].filter(Boolean);
    for (const i of todo) if (gate.length < 2 && !gate.includes(i)) gate.push(i);
    const order = [...gate, ...todo.filter((i) => !gate.includes(i))];
    const units = todo.reduce((s, i) => s + i.units, 0);
    const roles = Object.entries(tokens.color.alias || {}).map(([r, fam]) => `${r} = ${fam}`).join(', ');
    const families = Object.entries(tokens.color.family || {}).map(([k, v]) => `${k} ${v.fill}`).join(', ');

    const plan = { dir: path.basename(d), targetWidthMm: w, palette: { file: tokenRel, worst_ciede2000: worst }, typeLadder: ladder, items, gate: gate.map((g) => g.id), order: order.map((g) => g.id), units, unaudited: unaudited.map((u) => u.id) };
    writeText(path.join(o, 'plan.json'), JSON.stringify(plan, null, 1));
    const md = [
      '# Redesign plan', '',
      `Project: ${path.basename(d)}. Target width: ${w} mm. ${items.length} figures: ${todo.length} to rebuild, ${items.length - todo.length - unaudited.length} to keep or set as a table${unaudited.length ? `, ${unaudited.length} not audited yet (${unaudited.map((u) => u.id).join(', ')})` : ''}.`, '',
      '## One palette', '', `Token file: ${tokenRel}${worst != null ? `. Smallest colour-vision distance among the core families: ${worst} (CIEDE2000).` : '.'} Families: ${families}.`, '', `Roles: ${roles}.`, 'A role colour means that role in every figure of the project and nothing else.', '',
      '## One type ladder', '', `Arial only. Panel letter ${ladder.letter} pt bold, title ${ladder.title} pt bold, label ${ladder.label} pt, floor ${ladder.floor} pt. At most 6 words per box, 3 per arrow, 130 words in a schematic, 90 in a plate, one footnote line.`, '',
      '## Figures', '', '| id | kind | verdict | template | what to do |', '|---|---|---|---|---|',
      ...items.map((i) => `| ${i.id} | ${i.kind} | ${i.verdict || 'not audited'} | ${i.template || ''} | ${i.verdict ? STEP[i.verdict] : 'run audit_figure'} |`), '',
      '## Order of work', '', ...(order.length ? order.map((i, n) => `${n + 1}. ${i.id} (${i.verdict}, template ${i.template || 'none'})${gate.includes(i) ? ' - prototype' : ''}`) : ['Nothing to rebuild.']), '',
      '## Gate', '', gate.length ? `Build ${gate.map((g) => g.id).join(' and ')} first. They stand for ${gate.length === 2 ? 'one structure-led and one schematic figure' : 'the work'}. Show them next to the old versions with the QA numbers. Nothing else is rebuilt before a yes.` : 'No prototypes needed.', '',
      '## Effort', '', `About ${units} build rounds in total (restyle 1, redraw 3, replace 3, table 1). Each round is a build, the QA marks, a blind read and a fix list. After three rounds on one figure, ask the user.`, '',
      '## Not changed', '', 'Original files are never overwritten. New files get new names under molecullage/figures/. Swapping them into the project is a separate step the user asks for.',
    ].join('\n');
    writeText(path.join(o, 'PLAN.md'), md);
    return ok({ files: [path.join(o, 'PLAN.md'), path.join(o, 'plan.json')], gate: plan.gate, order: plan.order, units, unaudited: plan.unaudited });
  }));
}
