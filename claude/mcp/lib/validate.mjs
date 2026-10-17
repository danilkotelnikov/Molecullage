// Checks for every argument the MCP tools take, before it reaches a command or a path.
import fs from 'node:fs';
import path from 'node:path';
import { findConfig } from './core.mjs';

/** key, name, template: letters, digits, underscore, hyphen. */
export const RE_ID = /^[A-Za-z0-9_-]{1,64}$/;
/** A PDB entry code. */
export const RE_ENTRY = /^[A-Za-z0-9]{4}$/;
/** A value given to the renderer: no space, quote, semicolon or newline. */
export const RE_VALUE = /^[A-Za-z0-9_,.:=+-]+$/;
/** A local structure file passed to the renderer: no space or shell character. */
export const RE_LOCAL_PATH = /^[A-Za-z0-9_.:/\\-]+$/;

/** The keys that struct/render.py reads. name and pdb are set by the server and cannot be overridden. */
export const RENDER_KEYS = ['binder', 'antigen', 'light', 'drop', 'cdr', 'light_cdr', 'seed', 'sigma', 't', 'assign'];
export const GROUPS = ['complex', 'poses', 'series', 'anatomy', 'chains'];

/** Windows device names (CON, NUL, COM1, ...), with or without an extension: never a file or folder name. */
const DEVICE = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])(\..*)?$/i;

export const idOf = (what, v) => {
  if (!RE_ID.test(String(v)) || DEVICE.test(String(v))) throw new Error(`${what} "${v}" is not allowed. Use 1 to 64 letters, digits, underscores or hyphens, and not a Windows device name such as CON or NUL.`);
  return v;
};

/** The project folder: the folder of the nearest control file above the working directory, else the working directory. */
export function projectRoot() {
  try { const f = findConfig(process.cwd()); if (f) return f.dir; } catch { /* a bad control file does not widen the limit */ }
  return process.cwd();
}

// Resolve symlinks of the part of the path that exists, so a link inside the project cannot lead out of it.
function real(p) {
  let head = p; const tail = [];
  while (!fs.existsSync(head)) { const up = path.dirname(head); if (up === head) return p; tail.unshift(path.basename(head)); head = up; }
  return path.join(fs.realpathSync(head), ...tail);
}

export function isInside(p, root) {
  // Decide on the text first: a path that is outside on paper is refused without touching the file system (no UNC lookup).
  const lex = path.relative(root, p);
  if (lex.startsWith('..') || path.isAbsolute(lex)) return false;
  const rel = path.relative(real(root), real(p));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/** Resolve `p` against `base` and refuse it when it lies outside every folder in `roots`. */
export function within(p, roots, what, base = roots[0]) {
  const abs = path.resolve(base, String(p));
  if (String(p).split(/[\\/]/).some((s) => DEVICE.test(s))) throw new Error(`${what} "${p}" names a Windows device (CON, NUL, ...). Use another name.`);
  if (!roots.some((r) => isInside(abs, r))) throw new Error(`${what} "${p}" is outside the project folder (${roots[0]}). Use a path inside it.`);
  return abs;
}

/** Render parameters: allowed keys only, safe values only. Returns a list of key=value words. */
export function renderWords(chains) {
  return Object.entries(chains || {}).map(([k, v]) => {
    if (!RENDER_KEYS.includes(k)) throw new Error(`Render key "${k}" is not allowed. Allowed keys: ${RENDER_KEYS.join(', ')}.`);
    if (!RE_VALUE.test(String(v))) throw new Error(`Value for "${k}" is not allowed. Use letters, digits and _ , . : = + - only; no spaces, quotes, semicolons or line breaks.`);
    return `${k}=${v}`;
  });
}
