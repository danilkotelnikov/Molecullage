// Shared by the hook and the MCP server: where the repository is and how to run its scripts.
// Control-file lookup and the Python launcher come from build/config.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { findConfig, pythonCmd } from '../../../build/config.mjs';

export { findConfig };

/** The repository root: $MOLECULLAGE_HOME, else two folders above claude/mcp/lib. Throws a plain message when it is not a Molecullage checkout. */
export function home() {
  const dir = path.resolve(process.env.MOLECULLAGE_HOME || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..'));
  if (!fs.existsSync(path.join(dir, 'build', 'build.mjs'))) {
    throw new Error(`Molecullage not found at ${dir}. Set MOLECULLAGE_HOME to the folder you cloned.`);
  }
  return dir;
}

/** Run a Python script of the repository isolated (-I): returns { status, stdout, stderr }. */
export function py(script, args = [], opts = {}) {
  const [cmd, ...lead] = pythonCmd();
  const r = spawnSync(cmd, [...lead, '-I', '-B', path.join(home(), script), ...args], { encoding: 'utf8', cwd: home(), env: { ...process.env, ...(opts.env || {}) }, timeout: opts.timeout || 600000 });
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '', error: r.error };
}

/** Run a short Python expression from the repository folder and return its stdout. */
export function pyCode(code) {
  const [cmd, ...lead] = pythonCmd();
  const r = spawnSync(cmd, [...lead, '-I', '-B', '-c', code], { cwd: home(), encoding: 'utf8' });
  if (r.status) throw new Error('Python failed: ' + (r.stderr || '').trim().split(/\r?\n/).pop());
  return r.stdout;
}

/** Run a Node script of the repository. */
export function node(script, args = [], opts = {}) {
  const r = spawnSync(process.execPath, [path.join(home(), script), ...args], { encoding: 'utf8', cwd: opts.cwd || home(), env: { ...process.env, ...(opts.env || {}) }, timeout: opts.timeout || 600000 });
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '', error: r.error };
}

/** Last JSON object printed on a line of `text`. */
export function lastJson(text) {
  const lines = text.trim().split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) { try { return JSON.parse(lines[i]); } catch { /* next */ } }
  return null;
}
