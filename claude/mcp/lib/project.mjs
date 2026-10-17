// Shared by the project-wide tools (inventory_figures, audit_figure, plan_redesign, contact_sheet, make_brief).
// Rules: every path must resolve inside the project folder; files are written only under <dir>/molecullage/; no shell is used.
import fs from 'node:fs';
import path from 'node:path';
import { projectRoot, within } from './validate.mjs';

export const ok = (obj) => ({ content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 1) }] });
export const fail = (msg) => ({ isError: true, content: [{ type: 'text', text: msg }] });
export const guard = (fn) => async (args) => { try { return await fn(args); } catch (e) { return fail(String(e.message || e)); } };

/** The project folder named by `dir` (default: the project root). Must exist and lie inside the project root. */
export function projectDir(dir = '.') {
  const root = projectRoot();
  const d = within(dir, [root], 'dir', root);
  if (!fs.existsSync(d) || !fs.statSync(d).isDirectory()) throw new Error(`dir "${dir}" is not a folder inside the project (${root}).`);
  return d;
}

/** <d>/molecullage, created on demand; `sub` is a relative path inside it. */
export function outDir(d, sub = '') {
  const base = path.join(d, 'molecullage');
  const o = within(path.join(base, sub), [base], 'output path', base);
  fs.mkdirSync(o, { recursive: true });
  return o;
}

/** A file or folder named by the caller: relative to d, must lie inside d. */
export function inside(d, p, what = 'path') {
  return within(p, [d], what, d);
}

export const rel = (d, p) => path.relative(d, p).split(path.sep).join('/');

export function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

export function writeText(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text.endsWith('\n') ? text : text + '\n');
}

/** One table cell: no pipes, no line breaks. */
export const cell = (s) => String(s ?? '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim();

/** Target width in mm: the argument, else project.json, else the first widthMm of the control file, else 178. */
export function targetWidth(d, given, cfg) {
  if (given) return given;
  const pj = readJson(path.join(d, 'molecullage', 'project.json'), {});
  return Number(pj.widthMm) || (Array.isArray(cfg?.widthMm) ? cfg.widthMm[0] : 0) || 178;
}
