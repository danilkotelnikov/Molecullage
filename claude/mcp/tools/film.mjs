// new_film_beat, narrate_film, render_film: the film engine in film/ (or a folder with the same layout inside the project).
// A film folder holds tools/, src/kit/ and src/beats/<id>/. Files are written only inside that folder; no shell is used.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { z } from 'zod';
import { home } from '../lib/core.mjs';
import { pythonCmd } from '../../../build/config.mjs';
import { RE_ID, idOf, projectRoot, within } from '../lib/validate.mjs';
import { guard, ok } from '../lib/project.mjs';

/** The film folder: `dir` (inside the project or the Molecullage folder), default film/ of Molecullage. */
function filmDir(dir) {
  const d = within(dir || path.join(home(), 'film'), [projectRoot(), home()], 'dir', projectRoot());
  if (!fs.existsSync(path.join(d, 'tools', 'render.mjs'))) throw new Error(`${d} is not a film folder (no tools/render.mjs). The engine is the film/ folder of Molecullage.`);
  return d;
}
const beatOf = (d, id) => {
  idOf('beat', id);
  const b = path.join(d, 'src', 'beats', id);
  if (!fs.existsSync(path.join(b, 'scene.jsx'))) throw new Error(`No beat "${id}" in ${path.join(d, 'src', 'beats')}. Call new_film_beat first.`);
  return b;
};
const tail = (s, n = 12) => String(s || '').trim().split(/\r?\n/).slice(-n).join('\n');
const run = (cmd, args, cwd, timeout) => {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', timeout, maxBuffer: 1 << 26, env: { ...process.env } });
  return { status: r.status, out: (r.stdout || '') + (r.stderr || ''), error: r.error };
};

export function register(server) {
  server.registerTool('new_film_beat', {
    description: 'Scaffold a film beat: src/beats/<id>/scene.jsx (a small working scene) and narration.json in the film folder. dir is the film folder inside the project or the Molecullage folder (default: film/ of Molecullage). Edit the scene, then narrate_film and render_film.',
    inputSchema: { id: z.string().regex(RE_ID), seconds: z.number().min(5).max(300).default(20), dir: z.string().optional() },
  }, guard(async ({ id, seconds, dir }) => {
    idOf('id', id);
    const d = filmDir(dir);
    const r = run(process.execPath, [path.join(d, 'tools', 'new_beat.mjs'), id, String(seconds)], d, 60000);
    if (r.status) throw new Error(tail(r.out, 3) || 'new_beat failed');
    return ok({ beat: path.join(d, 'src', 'beats', id), scene: path.join(d, 'src', 'beats', id, 'scene.jsx'), narration: path.join(d, 'src', 'beats', id, 'narration.json'), next: 'Edit the scene and narration.json, then narrate_film and render_film.' });
  }));

  server.registerTool('narrate_film', {
    description: 'Speak the narration of a beat (src/beats/<id>/narration.json) with the Windows voice, and write src/beats/<id>/cues.json (the subtitles, with a time for every word) and out/audio/<id>-en.wav (voice and a soft pad). Returns a line per sentence and every PROBLEM: a sentence that runs into the next one or past the end of the beat. Windows only; needs Python with numpy and scipy.',
    inputSchema: { beat: z.string().regex(RE_ID), dir: z.string().optional(), voice: z.string().regex(/^[A-Za-z0-9 ._-]{1,60}$/).optional() },
  }, guard(async ({ beat, dir, voice }) => {
    const d = filmDir(dir); beatOf(d, beat);
    const [cmd, ...lead] = pythonCmd();
    const r = run(cmd, [...lead, '-X', 'utf8', path.join(d, 'tools', 'narrate.py'), beat, ...(voice ? ['--voice', voice] : [])], d, 600000);
    const problems = r.out.includes('PROBLEMS');
    return ok({ ok: !r.status && !problems, problems, report: tail(r.out, 30), cues: path.join(d, 'src', 'beats', beat, 'cues.json'), audio: path.join(d, 'out', 'audio', `${beat}-en.wav`) });
  }));

  server.registerTool('render_film', {
    description: 'Render a beat to MP4 in headless Chrome: frames, audit, an MP4 with the voice-over when narrate_film has run, and a stills sheet at the beat\'s hold times. Draft by default; exact=true gives the same pixels every time and takes about five times longer. Returns the paths and the audit result. Needs Node, Chrome (CHROME_PATH) and ffmpeg; can take several minutes.',
    inputSchema: { beat: z.string().regex(RE_ID), dir: z.string().optional(), lang: z.string().regex(/^[a-z]{2}$/).default('en'), exact: z.boolean().default(false), from: z.number().min(0).optional(), to: z.number().min(0).optional() },
  }, guard(async ({ beat, dir, lang, exact, from, to }) => {
    const d = filmDir(dir); beatOf(d, beat);
    const args = [path.join(d, 'tools', 'render.mjs'), beat, '--lang', lang, ...(exact ? ['--exact'] : []), ...(from !== undefined ? ['--from', String(from)] : []), ...(to !== undefined ? ['--to', String(to)] : [])];
    const r = run(process.execPath, args, d, 3600000);
    const mode = exact ? 'exact' : 'draft';
    const mp4 = path.join(d, 'out', `${beat}-${lang}-${mode}.mp4`);
    const audit = /AUDIT: (.*)/.exec(r.out)?.[1] || 'no audit line';
    if (r.status || !fs.existsSync(mp4)) throw new Error('Render failed. ' + tail(r.out, 8));
    return ok({ mp4, stills: path.join(d, 'out', `${beat}-${lang}-stills.png`), frames: path.join(d, 'out', beat, lang, 'frames'), audit, report: tail(r.out, 8) });
  }));
}
