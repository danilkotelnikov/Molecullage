// One smoke check:  npm run check
// Builds the pipeline template, runs the QA marks on it, asks the MCP server for its tools over stdio,
// fires the hooks with harmless payloads, calls the five project tools on a scratch copy of examples/sample-project,
// and compares the skill's reference copies with their sources.
// Prints one pass or FAIL line per step; exits 1 if any step fails.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { REPO } from '../build/config.mjs';
import { build } from '../build/build.mjs';
import { py } from '../claude/mcp/lib/core.mjs';
import { staleRefs } from './install.mjs';

let failed = 0;
const step = async (name, fn) => {
  try { console.log(`pass  ${name}: ${await fn()}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${String(e.message || e).split('\n')[0]}`); }
};
const need = (cond, msg) => { if (!cond) throw new Error(msg); };
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'molecullage-check-'));
const hook = path.join(REPO, 'claude', 'hook', 'molecullage_hook.mjs');
const trigger = path.join(REPO, 'claude', 'hook', 'molecullage_trigger.mjs');

await step('build', async () => {
  const r = await build({ page: path.join(REPO, 'templates', 'pipeline.html'), outDir: out, artDir: path.join(REPO, 'art') });
  need(!r.errors.length, 'page errors: ' + r.errors.join('; '));
  need(fs.existsSync(r.pdf) && fs.existsSync(r.png), 'no PDF or PNG written');
  return `pipeline ${r.widthMm} x ${r.heightMm} mm`;
});

await step('qa', async () => {
  const r = py('qa/qa_fig.py', [path.join(out, 'pipeline'), '--json']);
  let res = null;
  try { res = JSON.parse(r.stdout); } catch { /* fall through to the error below */ }
  need(res,(r.stderr || r.stdout || 'no output').trim().split('\n').pop() + ' (are the Python packages installed? pip install -r requirements.txt)');
  need(res.ok, 'checks failed: ' + res.failures.join('; '));
  return `checks ok (ink ${res.marks.ink.value} %)`;
});

await step('mcp', async () => {
  const client = new Client({ name: 'molecullage-check', version: '0.1.0' });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(REPO, 'claude', 'mcp', 'server.mjs')], cwd: REPO, env: { ...process.env } }));
  try {
    const tools = (await client.listTools()).tools.length;
    need(tools === 15, `${tools} tools, expected 15`);
    const res = await client.callTool({ name: 'list_templates', arguments: {} });
    need(!res.isError, 'list_templates returned an error');
    const n = JSON.parse(res.content[0].text).length;
    need(n >= 8, `${n} templates, expected 8`);
    return `15 tools, ${n} templates`;
  } finally { await client.close(); }
});

await step('hook', async () => {
  const fire = (input) => spawnSync(process.execPath, [hook], { input, encoding: 'utf8', cwd: out });
  const a = fire(JSON.stringify({ tool_input: { file_path: path.join(out, 'notes.txt') } }));
  const b = fire('this is not json');
  need(a.status === 0 && b.status === 0, `exit codes ${a.status} and ${b.status}, expected 0`);
  need(!a.stdout && !b.stdout, 'printed something without a control file');
  return 'exit 0, silent without a control file';
});

// The project tools, called over stdio on a scratch copy of the sample project (the committed files stay as they are).
const proj = path.join(out, 'sample-project');
fs.cpSync(path.join(REPO, 'examples', 'sample-project'), proj, { recursive: true, filter: (src) => !(['molecullage', 'before', 'after'].includes(path.basename(src)) && fs.statSync(src).isDirectory()) });
const call = async (name, args) => {
  const client = new Client({ name: 'molecullage-check', version: '0.1.0' });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(REPO, 'claude', 'mcp', 'server.mjs')], cwd: proj, env: { ...process.env } }));
  try { const r = await client.callTool({ name, arguments: args }); return { error: !!r.isError, text: r.content[0].text }; } finally { await client.close(); }
};
const json = async (name, args) => { const r = await call(name, args); need(!r.error, `${name}: ${r.text.split('\n')[0]}`); return JSON.parse(r.text); };
const made = (...p) => fs.existsSync(path.join(proj, 'molecullage', ...p));

await step('inventory_figures', async () => {
  const r = await json('inventory_figures', {});
  need(r.counts.figures === 3, `${r.counts.figures} figures, expected 3`);
  need(made('inventory.json') && made('INVENTORY.md'), 'no inventory files');
  return `3 figures, ${r.counts.scripts} script, ${r.counts.references} references`;
});

await step('audit_figure', async () => {
  const r = await json('audit_figure', { path: 'figures/pipeline.png' });
  need(['KEEP', 'RESTYLE', 'REDRAW', 'REPLACE', 'DEMOTE'].includes(r.verdict), `verdict ${r.verdict}`);
  need(typeof r.marks.ink === 'number' && r.effective_dpi > 0, 'measurements or dpi missing');
  need(made('AUDIT.md'), 'no AUDIT.md');
  return `${r.verdict} (ink ${r.marks.ink} %, ${r.effective_dpi} dpi at ${r.width_mm_target} mm)`;
});

await step('plan_redesign', async () => {
  await json('audit_figure', { path: 'figures/bfactors.png' });
  const r = await json('plan_redesign', {});
  need(made('PLAN.md') && made('plan.json'), 'no plan files');
  need(r.order.length >= 1, 'empty order of work');
  return `${r.order.length} figures to rebuild, gate: ${r.gate.join(', ')}`;
});

await step('contact_sheet', async () => {
  const r = await json('contact_sheet', { paths: ['figures/bfactors.png', 'figures/pipeline.png'], out: 'sheet.png' });
  need(made('sheet.png') && r.items.length === 2, 'no sheet');
  return `${r.size.join(' x ')} px, 2 figures`;
});

await step('make_brief', async () => {
  const r = await json('make_brief', { id: 'pipeline' });
  need(made('figures', 'pipeline', 'BRIEF.md'), 'no BRIEF.md');
  need(!fs.readFileSync(r.brief, 'utf8').includes('{{'), 'unfilled placeholder in the brief');
  return `brief for pipeline, template ${r.template}`;
});

await step('film tools', async () => {
  fs.cpSync(path.join(REPO, 'film'), path.join(proj, 'film'), { recursive: true, filter: (src) => !['node_modules', 'out', 'dist'].includes(path.basename(src)) });
  const r = await json('new_film_beat', { id: 'checkbeat', seconds: 12, dir: 'film' });
  need(fs.existsSync(r.scene) && fs.existsSync(r.narration), 'no scene or narration written');
  const again = await call('new_film_beat', { id: 'checkbeat', dir: 'film' });
  const outside = await call('render_film', { beat: 'checkbeat', dir: '..' });
  need(again.error && outside.error, 'a second scaffold or an outside folder was accepted');
  return 'a beat scaffolded, a repeat and an outside folder refused';
});

await step('project tools refuse outside paths', async () => {
  const a = await call('audit_figure', { path: '../../README.md' });
  const b = await call('inventory_figures', { dir: '..' });
  const c = await call('contact_sheet', { paths: ['figures/pipeline.png'], out: '../escape.png' });
  const d = await call('audit_figure', { path: 'figures/CON' });
  need(a.error && b.error && c.error, 'a path outside the project was accepted');
  need(d.error && /device/.test(d.text), 'a Windows device name was accepted as a path');
  need(!fs.existsSync(path.join(out, 'escape.png')), 'a file was written outside molecullage/');
  return 'three outside paths and a device name refused';
});

await step('trigger hook', async () => {
  const fire = (input) => spawnSync(process.execPath, [trigger], { input, encoding: 'utf8', cwd: out });
  const prompt = (text, cwd = out) => JSON.stringify({ hook_event_name: 'UserPromptSubmit', prompt: text, cwd });
  const on = fire(prompt('Redo all the figures of this paper'));
  const off = fire(prompt('Fix the failing unit test'));
  const bad = fire('this is not json');
  need(on.status === 0 && off.status === 0 && bad.status === 0, `exit codes ${on.status}, ${off.status}, ${bad.status}, expected 0`);
  const line = JSON.parse(on.stdout).hookSpecificOutput.additionalContext;
  need(line === 'Molecullage skill covers figure work: load it before drawing.', 'wrong reminder line');
  need(!off.stdout && !bad.stdout, 'printed for a prompt that is not about figures');
  const quiet = path.join(out, 'quiet');
  fs.mkdirSync(quiet, { recursive: true });
  fs.writeFileSync(path.join(quiet, 'molecullage.json'), '{ "autotrigger": false }');
  need(!fire(prompt('make a plot', quiet)).stdout, 'autotrigger false did not silence it');
  const qa = spawnSync(process.execPath, [hook], { input: prompt('make a plot'), encoding: 'utf8', cwd: out });
  need(qa.status === 0 && !qa.stdout, 'the QA hook answers prompts: that would be a second reminder');
  return 'one line for a figure prompt, silent otherwise, off with autotrigger false, QA hook silent on prompts';
});

await step('skill references', async () => {
  const stale = staleRefs();
  need(!stale.length, `out of date: ${stale.join(', ')}. Run: node scripts/install.mjs --sync-refs`);
  return 'current';
});

fs.rmSync(out, { recursive: true, force: true });
console.log(failed ? `\n${failed} step(s) failed.` : '\nAll steps passed.');
process.exit(failed ? 1 : 0);
