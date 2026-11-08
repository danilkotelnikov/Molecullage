// Deck tools: new_deck, build_deck, preview_deck, export_deck, deck_contact_sheet, audit_deck. Each calls deck/cli.mjs; no shell is used.
// A deck is a folder with deck.json inside the project folder. Files are written under <deck>/dist (exports) and <deck>/out (preview, audit).
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { z } from 'zod';
import { home, node } from '../lib/core.mjs';
import { guard, ok, projectDir } from '../lib/project.mjs';

const AUDIENCE = z.enum(['neutral', 'cloud', 'academic', 'industry']).optional();
const FORMATS = ['html', 'pdf', 'png', 'mp4', 'gif', 'notes', 'all'];
const tail = (s, n = 12) => s.trim().split(/\r?\n/).slice(-n).join('\n');

/** The deck folder named by `deck` (a folder, or its deck.json): must lie inside the project folder. */
function deckDir(deck) {
  const d = projectDir(deck.replace(/[\\/]?deck\.json$/, '') || '.');
  if (!fs.existsSync(path.join(d, 'deck.json'))) throw new Error(`No deck.json in ${d}. Make one with new_deck.`);
  return d;
}

const run = (args, timeout) => {
  const r = node('deck/cli.mjs', args, { timeout });
  if (r.status) throw new Error(tail(r.stderr || r.stdout || 'deck command failed'));
  return r;
};

export function register(server) {
  server.registerTool('new_deck', {
    description: 'Start a deck: writes <dir>/deck.json with three starter slides (title, numbers, two columns), each with speaker notes. dir must be a new or empty folder inside the project folder. Edit deck.json, then preview_deck. Slides are Russian-first; write the slide text in the language of the talk.',
    inputSchema: { dir: z.string().regex(/^[A-Za-z0-9_./-]{1,120}$/), title: z.string().max(120).optional(), audience: AUDIENCE },
  }, guard(async ({ dir, title, audience }) => {
    const root = projectDir('.');
    const target = path.resolve(root, dir);
    if (target !== root && !target.startsWith(root + path.sep)) throw new Error('dir must lie inside the project folder.');
    const r = run(['new', target, ...(title ? ['--title', title] : []), ...(audience ? ['--audience', audience] : [])], 60000);
    return ok({ deck: path.join(target, 'deck.json'), say: tail(r.stdout, 2) });
  }));

  server.registerTool('build_deck', {
    description: 'Check deck.json, render the ChimeraX loops (when ChimeraX is present; otherwise the 3D scene falls back to the WebGL viewer and the log says so) and write one standalone HTML file under <deck>/dist that opens from a file with no network. Returns the build log with the file, its size and the warnings. fetch lets the build download a missing PDB entry through scripts/fetch_pdb.py.',
    inputSchema: { deck: z.string(), audience: AUDIENCE, fetch: z.boolean().default(false) },
  }, guard(async ({ deck, audience, fetch }) => {
    const d = deckDir(deck);
    const r = run(['build', d, '--out', path.join(d, 'dist'), ...(audience ? ['--audience', audience] : []), ...(fetch ? ['--fetch'] : [])], 900000);
    return ok({ log: tail(r.stdout, 30) });
  }));

  server.registerTool('preview_deck', {
    description: 'Start the live preview of a deck on 127.0.0.1 with hot reload: the page reloads when any file in the deck folder changes. Keys in the page: arrows, O overview, P presenter window (current slide, next slide, notes, timer), F full screen. Returns the address and the process id; stop it with that pid when done. The preview shows the real slide runtime, so look at it in a browser before exporting.',
    inputSchema: { deck: z.string(), port: z.number().int().min(1024).max(65535).default(4177), audience: AUDIENCE },
  }, guard(async ({ deck, port, audience }) => {
    const d = deckDir(deck);
    const info = path.join(d, 'out', '.deck-preview.json');
    fs.mkdirSync(path.dirname(info), { recursive: true });
    try { fs.unlinkSync(info); } catch { /* none yet */ }
    const p = spawn(process.execPath, [path.join(home(), 'deck', 'cli.mjs'), 'preview', d, '--port', String(port), '--info-file', info, ...(audience ? ['--audience', audience] : [])], { detached: true, stdio: 'ignore', cwd: home() });
    p.unref();
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 250));
      if (fs.existsSync(info)) { try { const j = JSON.parse(fs.readFileSync(info, 'utf8')); return ok({ url: j.url, pid: j.pid, watching: j.dir }); } catch { /* still being written */ } }
    }
    throw new Error('The preview did not start within 15 seconds. Run: node deck/cli.mjs preview <deck> and read the message.');
  }));

  server.registerTool('export_deck', {
    description: 'Export a deck under <deck>/dist. format: html (standalone, offline), pdf (one page per slide, exactly 1920x1080 px), png (one image per slide, in its finished state), mp4 (frame-exact video: the exporter drives a virtual clock, so every run gives the same frames), gif, notes (speaker notes as a .txt and an A4 PDF with a thumbnail beside each note), or all (html, pdf, png, mp4, notes). fps and width apply to mp4 and gif; duration (ms) sets every slide to that length; slides picks slide ids. An mp4 takes minutes: about 6 frames a second at 1920 wide.',
    inputSchema: { deck: z.string(), format: z.enum(FORMATS), audience: AUDIENCE, fps: z.number().int().min(1).max(60).optional(), width: z.number().int().min(320).max(3840).optional(), duration: z.number().int().min(500).max(120000).optional(), slides: z.array(z.string().regex(/^[A-Za-z0-9_-]{1,40}$/)).max(40).optional() },
  }, guard(async ({ deck, format, audience, fps, width, duration, slides }) => {
    const d = deckDir(deck);
    const r = run(['export', d, '--format', format, '--out', path.join(d, 'dist'),
      ...(audience ? ['--audience', audience] : []), ...(fps ? ['--fps', String(fps)] : []), ...(width ? ['--width', String(width)] : []),
      ...(duration ? ['--duration', String(duration)] : []), ...(slides?.length ? ['--slide', slides.join(',')] : [])], 1800000);
    const dist = path.join(d, 'dist');
    return ok({ files: fs.existsSync(dist) ? fs.readdirSync(dist).map((n) => path.join(dist, n)) : [], log: tail(r.stdout, 30) });
  }));

  server.registerTool('deck_contact_sheet', {
    description: 'Put every slide of a deck, in its finished state, on one PNG with the slide numbers: the sheet for the blind read before you look at single slides. Written to <deck>/dist/<name>-sheet.png.',
    inputSchema: { deck: z.string(), audience: AUDIENCE },
  }, guard(async ({ deck, audience }) => {
    const d = deckDir(deck);
    const dist = path.join(d, 'dist');
    const r = run(['export', d, '--format', 'sheet', '--out', dist, ...(audience ? ['--audience', audience] : [])], 300000);
    return ok({ sheet: fs.readdirSync(dist).filter((n) => n.endsWith('-sheet.png')).map((n) => path.join(dist, n)), log: tail(r.stdout, 6) });
  }));

  server.registerTool('audit_deck', {
    description: 'Measure a deck against the drawing rules in the real page: colours outside the palette, text under the deck minimum size (25 px at 1920x1080), text outside or cut off, overlapping blocks, contrast, word counts per slide, missing images and videos. Also writes <deck>/out/overclaim-pack.md, the text to read for claims the data does not carry. strictness normal fails on palette, size, overflow, overlap, contrast and media; word counts and type-ladder steps are warnings (strict makes them failures, loose makes every item a warning). Returns the checks as JSON.',
    inputSchema: { deck: z.string(), strictness: z.enum(['normal', 'strict', 'loose']).optional(), audience: AUDIENCE, sheet: z.boolean().default(false) },
  }, guard(async ({ deck, strictness, audience, sheet }) => {
    const d = deckDir(deck);
    const r = node('deck/cli.mjs', ['audit', d, '--json', ...(strictness ? ['--strictness', strictness] : []), ...(audience ? ['--audience', audience] : []), ...(sheet ? ['--sheet', path.join(d, 'out', 'contact-sheet.png')] : [])], { timeout: 300000 });
    const line = r.stdout.trim().split(/\r?\n/).reverse().find((l) => l.startsWith('{'));
    if (!line) throw new Error(tail(r.stderr || r.stdout || 'audit gave no result'));
    return ok(JSON.parse(line));
  }));
}
