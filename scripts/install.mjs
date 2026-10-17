// Safe install steps for the Claude Code side of Molecullage.
//   node scripts/install.mjs            check tools, copy the skill to ~/.claude/skills/molecullage, print the commands for the rest
//   node scripts/install.mjs --yes      also run `claude mcp add` (user scope)
//   node scripts/install.mjs --sync-refs  refresh the skill's copies of docs/ and qa/ briefs
// It never edits settings.json and never registers the hook: it prints the entries and you paste them.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { REPO, findChrome, findChimeraX, pythonCmd } from '../build/config.mjs';

const SKILL_SRC = path.join(REPO, 'claude', 'skill', 'molecullage');
// skill reference name -> file of the repository it copies
const REFS = { 'grammar.md': 'docs/grammar.md', 'palette.md': 'docs/palette.md', 'chimerax.md': 'docs/chimerax.md', 'kit.md': 'docs/kit.md', 'blind-read.md': 'qa/blind_read.md', 'overclaim-read.md': 'qa/overclaim_read.md' };
const lf = (s) => s.replace(/\r\n/g, '\n');

/** Names of the skill references that differ from their source. With write=true, rewrites them. */
export function staleRefs(write = false) {
  const stale = [];
  for (const [name, rel] of Object.entries(REFS)) {
    const want = lf(fs.readFileSync(path.join(REPO, rel), 'utf8'));
    const f = path.join(SKILL_SRC, 'references', name);
    if (!fs.existsSync(f) || lf(fs.readFileSync(f, 'utf8')) !== want) { stale.push(name); if (write) fs.writeFileSync(f, want); }
  }
  return stale;
}

const fwd = (p) => p.split(path.sep).join('/');
const q = (p) => `"${p}"`;

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--sync-refs')) {
    const n = staleRefs(true);
    console.log(n.length ? `refreshed: ${n.join(', ')}` : 'skill references are current');
    return;
  }

  const [py, ...lead] = pythonCmd();
  const pv = spawnSync(py, [...lead, '--version'], { encoding: 'utf8' });
  const chrome = findChrome(), cx = findChimeraX();
  const nodeOk = Number(process.versions.node.split('.')[0]) >= 20;
  const deps = fs.existsSync(path.join(REPO, 'node_modules', '@modelcontextprotocol'));
  console.log('Tools');
  console.log(`  ${nodeOk ? 'ok     ' : 'MISSING'} Node ${process.versions.node} (20 or newer)`);
  console.log(`  ${pv.status === 0 ? 'ok     ' : 'MISSING'} Python 3: ${pv.status === 0 ? (pv.stdout || pv.stderr).trim() : 'not found (3.10 or newer)'}`);
  console.log(`  ${chrome ? 'ok     ' : 'MISSING'} Chrome, Edge or Chromium: ${chrome || 'not found; install one or set MOLECULLAGE_CHROME'}`);
  console.log(`  ${cx ? 'ok     ' : 'absent '} ChimeraX: ${cx || 'not found; optional, but new structure renders (render_structure) stay unavailable'}`);
  console.log(`  ${deps ? 'ok     ' : 'MISSING'} npm packages: ${deps ? 'installed' : 'run npm ci in ' + REPO}`);

  const dst = path.join(os.homedir(), '.claude', 'skills', 'molecullage');
  const stale = staleRefs();
  if (stale.length) { console.log(`\nSkill references out of date (${stale.join(', ')}); refreshing from the repository.`); staleRefs(true); }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.cpSync(SKILL_SRC, dst, { recursive: true });
  console.log(`\nSkill copied to ${dst}`);

  const server = fwd(path.join(REPO, 'claude', 'mcp', 'server.mjs'));
  const hook = fwd(path.join(REPO, 'claude', 'hook', 'molecullage_hook.mjs'));
  const trigger = fwd(path.join(REPO, 'claude', 'hook', 'molecullage_trigger.mjs'));
  const add = ['mcp', 'add', '--scope', 'user', 'molecullage', '-e', `MOLECULLAGE_HOME=${fwd(REPO)}`, '--', 'node', server];
  const shown = `claude mcp add --scope user molecullage -e MOLECULLAGE_HOME=${q(fwd(REPO))} -- node ${q(server)}`;
  if (args.includes('--yes')) {
    console.log(`\nRunning: ${shown}`);
    const win = process.platform === 'win32';
    // Windows needs a shell to start claude.cmd; quote every argument that holds more than plain path characters.
    if (win && add.some((a) => /["%!^]/.test(a))) { console.error('The Molecullage path holds " % ! or ^; run the command above yourself.'); process.exitCode = 1; return; }
    const r = spawnSync('claude', win ? add.map((a) => (/^[\w:/.=@-]+$/.test(a) ? a : q(a))) : add, { stdio: 'inherit', shell: win });
    if (r.status) { console.error('claude mcp add failed; run the command above yourself.'); process.exitCode = 1; }
  } else {
    console.log(`\nMCP server, user scope (stored in ~/.claude.json). Run it yourself, or run this script again with --yes:\n  ${shown}`);
  }

  console.log(`
Optional hook entries. Nothing here has been written. Merge them into the "hooks" object of ~/.claude/settings.json:

  "PostToolUse": [
    { "matcher": "Write|Edit",
      "hooks": [ { "type": "command", "command": "node \\"${hook}\\"" } ] }
  ],
  "UserPromptSubmit": [
    { "hooks": [ { "type": "command", "command": "node \\"${trigger}\\"" } ] }
  ]

The PostToolUse hook is silent in any project without a molecullage.json. In a project, copy ${fwd(path.join(REPO, 'molecullage.example.json'))} to molecullage.json to opt in.
The UserPromptSubmit entry (the auto-trigger) needs no control file. It adds one line when a prompt mentions figure work. Set "autotrigger": false in molecullage.json to switch it off.
Claude Code may refuse to edit settings.json itself; if so, paste the entries yourself.

Then run:  npm run check`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
