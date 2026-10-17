#!/usr/bin/env node
// Molecullage MCP server (stdio). Twelve tools that call the repository's scripts as subprocesses.
//   list_templates, new_figure, build_figure, qa_figure, palette_sample, palette_check, render_structure
//   project-wide (claude/mcp/tools/): inventory_figures, audit_figure, plan_redesign, contact_sheet, make_brief
// The repository is found through $MOLECULLAGE_HOME, else from the location of this file.
// Every argument is checked before it reaches a command or a path (lib/validate.mjs). Files are written only inside the project folder,
// the folder of the nearest molecullage.json, else the working directory. Files may be read from the project and from the repository.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { home, findConfig, py, pyCode, node, lastJson } from './lib/core.mjs';
import { TEMPLATES, NOTES_STUB } from './lib/templates.mjs';
import { register as registerInventory } from './tools/inventory.mjs';
import { register as registerAudit } from './tools/audit.mjs';
import { register as registerPlan } from './tools/plan.mjs';
import { register as registerContact } from './tools/contact.mjs';
import { register as registerBrief } from './tools/brief.mjs';
import { RE_ID, RE_ENTRY, RE_LOCAL_PATH, GROUPS, RENDER_KEYS, idOf, projectRoot, within, renderWords } from './lib/validate.mjs';

const ok = (obj) => ({ content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 1) }] });
const fail = (msg) => ({ isError: true, content: [{ type: 'text', text: msg }] });
const guard = (fn) => async (args) => { try { return await fn(args); } catch (e) { return fail(String(e.message || e)); } };

const HEX = /^#?[0-9A-Fa-f]{6}$/;
const writable = (p, what) => within(p, [projectRoot()], what, projectRoot());
// A relative path is looked up in the project first, then in the Molecullage folder (so "tokens/tokens.base.json" and "art" work).
const readable = (p, what, base) => {
  const root = projectRoot();
  const a = within(p, [root, home()], what, base || root);
  const b = path.resolve(home(), String(p));
  return !fs.existsSync(a) && !path.isAbsolute(String(p)) && fs.existsSync(b) ? within(b, [root, home()], what) : a;
};

/** Where a figure lives: <dir>/<key>.html or <dir>/figs/<key>.html. */
function pageOf(key, dir) {
  const d = readable(dir || '.', 'dir');
  const c = [path.join(d, `${key}.html`), path.join(d, 'figs', `${key}.html`), path.join(d, 'templates', `${key}.html`)].find((p) => fs.existsSync(p));
  if (!c) throw new Error(`No page for "${key}" in ${d} (looked for ${key}.html, figs/${key}.html, templates/${key}.html).`);
  return c;
}

export function buildServer() {
  const server = new McpServer({ name: 'molecullage', version: '0.1.0' });

  server.registerTool('list_templates', {
    description: 'List the Molecullage templates: name, what it shows, and the public PDB entry its example uses.',
    inputSchema: {},
  }, guard(async () => {
    const root = home();
    const names = fs.readdirSync(path.join(root, 'templates')).filter((n) => n.endsWith('.html')).map((n) => n.replace(/\.html$/, ''));
    return ok(names.map((n) => ({ name: n, shows: TEMPLATES[n]?.line || '', example: TEMPLATES[n]?.example || '', page: path.join(root, 'templates', `${n}.html`) })));
  }));

  server.registerTool('new_figure', {
    description: 'Copy a template into the project as <dir>/<key>.html with a notes stub <dir>/<key>.notes.md. Relative data paths in the page are rewritten to point into the Molecullage folder. dir must be inside the project folder.',
    inputSchema: { template: z.string().regex(RE_ID), key: z.string().regex(RE_ID), dir: z.string().default('figs') },
  }, guard(async ({ template, key, dir }) => {
    idOf('template', template); idOf('key', key);
    const root = home();
    const src = path.join(root, 'templates', `${template}.html`);
    if (!fs.existsSync(src)) throw new Error(`Unknown template "${template}". Call list_templates.`);
    const d = writable(dir, 'dir');
    fs.mkdirSync(d, { recursive: true });
    const page = path.join(d, `${key}.html`), notes = path.join(d, `${key}.notes.md`);
    if (fs.existsSync(page) || fs.existsSync(notes)) throw new Error(`${page} or ${notes} exists; choose another key.`);
    const text = fs.readFileSync(src, 'utf8').replace(/<!--(INLINE_(?:JS|SVG)) (\.\.\/[^>]+?)-->/g, (_, kind, p) => {
      const target = path.resolve(path.join(root, 'templates'), p.trim());
      return `<!--${kind} ${path.relative(d, target).split(path.sep).join('/')}-->`;
    });
    fs.writeFileSync(page, text);
    fs.writeFileSync(notes, NOTES_STUB(key, `templates/${template}.html of Molecullage`));
    return ok({ page, notes, next: 'Edit the page, then build_figure.' });
  }));

  server.registerTool('build_figure', {
    description: 'Build a page to PDF and PNG with Molecullage (headless Chromium). Returns the file paths, the page size and any page errors. dir, out, art and tokens must lie inside the project folder (art and tokens may also lie inside the Molecullage folder); out is written.',
    inputSchema: { key: z.string().regex(RE_ID), dir: z.string().default('figs'), widthMm: z.number().default(178), tokens: z.string().optional(), out: z.string().optional(), art: z.string().optional() },
  }, guard(async ({ key, dir, widthMm, tokens, out, art }) => {
    idOf('key', key);
    const page = pageOf(key, dir);
    const found = findConfig(page);
    const root = projectRoot();
    const outDir = out ? writable(out, 'out') : (() => { const d = path.join(found ? found.dir : path.dirname(page), 'out'); try { return writable(d, 'out'); } catch { return path.join(root, 'out'); } })();
    const args = [page, String(widthMm), ...(tokens ? [readable(tokens, 'tokens')] : []), '--out', outDir, ...(art ? ['--art', readable(art, 'art')] : [])];
    const r = node('build/build.mjs', args);
    const res = lastJson(r.stdout);
    if (r.status || !res) throw new Error('Build failed: ' + ((r.stderr || r.stdout).trim().split('\n').pop() || 'no output'));
    return ok(res);
  }));

  server.registerTool('qa_figure', {
    description: 'Measure a built figure (out/<key>.png and .pdf) against the drawing rules. Returns the checks as JSON with pass, fail or warn and the reason for each failure. dir must lie inside the project folder or the Molecullage folder.',
    inputSchema: { key: z.string().regex(RE_ID), dir: z.string().default('out'), strictness: z.enum(['normal', 'strict', 'loose']).optional(), kind: z.enum(['schematic', 'plate']).default('schematic'), quick: z.boolean().default(false) },
  }, guard(async ({ key, dir, strictness, kind, quick }) => {
    idOf('key', key);
    const target = path.join(readable(dir, 'dir'), key);
    const r = py('qa/qa_fig.py', [target, '--json', '--kind', kind, ...(strictness ? ['--strictness', strictness] : []), ...(quick ? ['--quick'] : [])]);
    let res = null;
    try { res = JSON.parse(r.stdout); } catch { res = lastJson(r.stdout); }
    if (!res) throw new Error((r.stderr || r.stdout || 'QA gave no result').trim().split('\n').pop());
    return ok(res);
  }));

  server.registerTool('palette_sample', {
    description: 'Sample the flat fills of an image or a PDF page: the exact most frequent colour of each group of pixels, with counts. The file must lie inside the project folder or the Molecullage folder.',
    inputSchema: { image_or_pdf: z.string(), page: z.number().int().default(1), levels: z.number().int().default(2), maxColours: z.number().int().default(18) },
  }, guard(async ({ image_or_pdf, page, levels, maxColours }) => {
    const f = readable(image_or_pdf, 'image_or_pdf');
    if (!fs.existsSync(f)) throw new Error(`File not found: ${f}`);
    const r = py('palette/sample_palette.py', [f, '--page', String(page), '--levels', String(levels), '--max', String(maxColours)]);
    if (r.status) throw new Error((r.stderr || 'sampling failed').trim().split('\n').pop());
    return ok(JSON.parse(r.stdout));
  }));

  server.registerTool('palette_check', {
    description: 'Colour-vision check: worst-case CIEDE2000 between every pair (normal, deuteranopia, protanopia, tritanopia) and contrast on white, for hex colours or a token file inside the project folder or the Molecullage folder.',
    inputSchema: { tokens_or_hexes: z.array(z.string()).min(1), roles_from: z.string().optional() },
  }, guard(async ({ tokens_or_hexes, roles_from }) => {
    const items = tokens_or_hexes.map((s) => {
      if (HEX.test(s)) return s;
      if (/\.json$/i.test(s)) return readable(s, 'token file');
      throw new Error(`"${s}" is neither a hex colour like #1D397B nor a .json token file.`);
    });
    const r = py('palette/check_palette.py', [...items, '--json', ...(roles_from ? ['--roles', readable(roles_from, 'roles_from')] : [])]);
    if (r.status) throw new Error((r.stderr || 'check failed').trim().split('\n').pop());
    return ok(JSON.parse(r.stdout));
  }));

  server.registerTool('render_structure', {
    description: `Render a public PDB entry in the flat Molecullage style with ChimeraX and trim it. entry is a four-character PDB code or the path of a .pdb or .cif file inside the project folder. A code that is not already in the Molecullage data/pdb folder is fetched from the RCSB only when you pass fetch=true; otherwise the tool stops and says so. Groups: ${GROUPS.join(', ')}. chains holds render parameters; allowed keys: ${RENDER_KEYS.join(', ')}; values use letters, digits and _ , . : = + - only. Needs ChimeraX (MOLECULLAGE_CHIMERAX); with dry_run it writes the setup commands and prints the command it would run.`,
    inputSchema: {
      entry: z.string(), group: z.enum(GROUPS).default('complex'),
      chains: z.record(z.string()).describe('render parameters, for example {"binder":"A","antigen":"L","drop":"B,M","cdr":"1mel_vhh"}; chain lists have no leading slash').default({}),
      name: z.string().regex(RE_ID).optional(), out: z.string().optional(), tokens: z.string().optional(), dry_run: z.boolean().default(false), fetch: z.boolean().default(false),
    },
  }, guard(async ({ entry, group, chains, name, out, tokens, dry_run, fetch }) => {
    const sf = home();
    const root = projectRoot();
    if (!GROUPS.includes(group)) throw new Error(`Group "${group}" is not allowed. Use one of: ${GROUPS.join(', ')}.`);
    if (name !== undefined) idOf('name', name);
    const words = renderWords(chains);
    let id, pdb, local = false;
    if (RE_ENTRY.test(entry)) {
      id = entry.toUpperCase();
      pdb = path.join(sf, 'data', 'pdb', `${id}.pdb`);
    } else {
      pdb = within(entry, [root], 'entry', root);
      if (!/\.(pdb|cif|ent)$/i.test(pdb) || !fs.existsSync(pdb)) throw new Error(`entry "${entry}" is neither a four-character PDB code nor an existing .pdb or .cif file inside the project folder.`);
      id = path.basename(pdb).replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 40) || 'local';
      local = true;
    }
    const pdbArg = pdb.split(path.sep).join('/');
    if (!RE_LOCAL_PATH.test(pdbArg)) throw new Error(`The path ${pdbArg} has a space or another character that ChimeraX script arguments cannot carry. Move the file to a plain path.`);
    const outDir = writable(out || 'art', 'out');
    const nm = name || `${id.toLowerCase()}_${group}`;
    const env = { MOLECULLAGE_ART: outDir, ...(tokens ? { MOLECULLAGE_TOKENS: readable(tokens, 'tokens') } : {}) };
    const kv = [`name=${nm}`, `pdb=${pdbArg}`, ...words];
    const runCx = ['struct/run_cx.py', ...(dry_run ? ['--dry-run'] : []), path.join(sf, 'struct', 'render.py'), group, ...kv];
    if (dry_run) {
      const r = py(runCx[0], runCx.slice(1), { env });
      const cmds = JSON.parse(pyCode("import json,sys;sys.path.insert(0,'struct');import style;print(json.dumps(style.setup_commands()+[style.save_command('NAME.png')]))"));
      fs.mkdirSync(outDir, { recursive: true });
      const cxc = path.join(outDir, `${nm}.setup.cxc`);
      fs.writeFileSync(cxc, cmds.join('\n') + '\n');
      return ok({ dry_run: true, setup_script: cxc, setup_commands: cmds, command: r.stdout.trim(), pdb_present: fs.existsSync(pdb), art_dir: outDir });
    }
    if (!fs.existsSync(pdb)) {
      if (local) throw new Error(`File not found: ${pdb}`);
      if (!fetch) throw new Error(`Entry ${id} is not in ${path.join(sf, 'data', 'pdb')}. To download it from the RCSB into that folder, call render_structure again with fetch=true. Or pass entry as the path of a local .pdb file inside the project.`);
      const f = py('scripts/fetch_pdb.py', [id]);
      if (f.status) throw new Error(`Could not fetch ${id}: ${(f.stderr || '').trim().split('\n').pop()}`);
    }
    fs.mkdirSync(outDir, { recursive: true });
    const r = py(runCx[0], runCx.slice(1), { env });
    if (r.status && /ChimeraX not found/.test(r.stderr + r.stdout)) throw new Error('ChimeraX not found. Install ChimeraX 1.10 and set MOLECULLAGE_CHIMERAX to its executable.');
    const exit = /ChimeraX exit: (\w+)/.exec(r.stdout)?.[1];
    if (exit !== '0' || /Traceback/.test(r.stdout)) throw new Error('Render failed. ' + r.stdout.trim().slice(-600));
    const t = py('struct/trim.py', [nm], { env });
    const idx = path.join(outDir, `index.${nm}.json`);
    if (t.status || !fs.existsSync(idx)) throw new Error('Trim failed. ' + (t.stderr || t.stdout).trim().slice(-400));
    const index = JSON.parse(fs.readFileSync(idx, 'utf8'));
    return ok({ png: Object.keys(index).map((k) => path.join(outDir, `${k}_t.png`)), anchors: Object.fromEntries(Object.entries(index).map(([k, v]) => [k, v.anchors])), art_dir: outDir });
  }));

  for (const reg of [registerInventory, registerAudit, registerPlan, registerContact, registerBrief]) reg(server);
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildServer().connect(new StdioServerTransport());
}
