#!/usr/bin/env node
// Molecullage hook for Claude Code. Opt-in by the presence of a control file; silent and exit code 0 without one.
//
// A project opts in by having molecullage.json above the edited file (or above the working directory).
// With "hook" not set to false, it does one thing:
//   PostToolUse, matcher "Write|Edit": after an edit of figs/*.html or templates/*.html, runs the quick QA marks (PNG only)
//     on the matching out/<key>.png when it exists, and prints them as one line of additionalContext. It never blocks, unless
//     "hookBlocks": true and the marks fail under strictness "strict": then it exits 2 and writes the reason to stderr.
// The reminder when a prompt is about a figure is not here: it is the one job of molecullage_trigger.mjs (UserPromptSubmit).
// This file ignores every event that is not a Write or Edit of a page, so an old UserPromptSubmit entry that still points here prints nothing.
// Off: delete the control file, set "hook": false, or remove the entry from settings. It never writes a file.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findConfig, py, lastJson } from '../mcp/lib/core.mjs';

async function readStdin() {
  let s = '';
  for await (const c of process.stdin) s += c;
  return s;
}

function matchingPng(file, cfgDir) {
  const key = path.basename(file).replace(/\.html?$/, '');
  const candidates = [path.join(cfgDir, 'out', `${key}.png`), path.join(path.dirname(file), '..', 'out', `${key}.png`), path.join(path.dirname(file), 'out', `${key}.png`)];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

/** Never throws: a malformed payload or control file, or any other fault, ends quietly with exit code 0. */
export async function run(payload) {
  try { return payload?.hook_event_name === 'UserPromptSubmit' ? { code: 0 } : await check(payload); } catch { return { code: 0 }; }
}

const ctx = (text, event = 'PostToolUse') => JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: text } }) + '\n';

async function check(payload) {
  const file = payload?.tool_input?.file_path;
  if (typeof file !== 'string' || !/\.html?$/i.test(file)) return { code: 0 };
  const rel = file.split(path.sep).join('/');
  if (!/(^|\/)(figs|templates)\/[^/]+\.html?$/i.test(rel)) return { code: 0 };
  const found = findConfig(file);
  if (!found || found.cfg.hook === false) return { code: 0 };
  const png = matchingPng(file, found.dir);
  if (!png) return { code: 0 };
  let r;
  try {
    r = py('qa/qa_fig.py', [png, '--quick', '--json', '--strictness', String(found.cfg.strictness)], { timeout: 50000 });
  } catch {
    return { code: 0, out: ctx('Molecullage: QA not run (Python or the repository was not found).') };
  }
  const res = lastJsonObject(r.stdout);
  if (!res || !res.marks || !Array.isArray(res.failures)) return { code: 0, out: ctx('Molecullage: QA gave no result. Run qa_figure for the details.') };
  const bad = res.failures.length ? ' | ' + res.failures.join('; ') : '';
  const line = `Molecullage QA for ${res.key} [${res.strictness}, PNG marks only]: ${res.ok ? 'ok' : 'FAIL'} | ink ${res.marks.ink.value} %, empty cells ${res.marks.cells.value} %, band ${res.marks.band.value} %, blank ${res.marks.blank.value} %${bad}`;
  if (!res.ok && found.cfg.hookBlocks && res.strictness === 'strict') return { code: 2, err: line + '\n' };
  return { code: 0, out: ctx(line) };
}

function lastJsonObject(text) {
  try { return JSON.parse(text); } catch { return lastJson(text); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let payload = null;
  try { payload = JSON.parse(await readStdin()); } catch { /* not our payload */ }
  const r = payload ? await run(payload) : { code: 0 };
  if (r.out) process.stdout.write(r.out);
  if (r.err) process.stderr.write(r.err);
  process.exit(r.code === 2 ? 2 : 0);
}
