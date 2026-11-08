// Molecule loops for the deck: a ChimeraX render through the struct/ pipeline (struct/loop.py), then ffmpeg to MP4 and GIF.
// Cached by a hash of everything that goes into the picture, so a build renders a loop once.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { REPO, pythonCmd } from '../build/config.mjs';

export const hasFfmpeg = () => spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' }).status === 0;
const insideRoot = (abs, root) => abs === root || abs.startsWith(root + path.sep);

/** The PDB file of an entry: the deck folder, then data/pdb of the repository; fetched only when allowed (scripts/fetch_pdb.py). */
export function findPdb(dir, id, { fetch = false, log = () => {} } = {}) {
  if (/\.(pdb|cif|ent)$/i.test(id)) {
    const local = path.resolve(dir, id);
    const deckRoot = path.resolve(dir);
    const repoRoot = path.resolve(REPO);
    if (!insideRoot(local, deckRoot) && !insideRoot(local, repoRoot)) throw new Error(`structure ${id} lies outside the deck folder`);
    if (!fs.existsSync(local)) throw new Error(`structure file not found: ${id}`);
    return local;
  }
  const up = id.toUpperCase();
  for (const f of [path.join(dir, 'data', `${up}.pdb`), path.join(dir, `${up}.pdb`), path.join(REPO, 'data', 'pdb', `${up}.pdb`)]) if (fs.existsSync(f)) return f;
  if (!fetch) throw new Error(`Entry ${up} is not in data/pdb. Add --fetch to download it from the RCSB with scripts/fetch_pdb.py, or put a .pdb file in the deck folder.`);
  log(`fetching ${up} from the RCSB`);
  const [cmd, ...lead] = pythonCmd();
  const r = spawnSync(cmd, [...lead, '-I', '-B', path.join(REPO, 'scripts', 'fetch_pdb.py'), up], { encoding: 'utf8', cwd: REPO });
  const f = path.join(REPO, 'data', 'pdb', `${up}.pdb`);
  if (r.status || !fs.existsSync(f)) throw new Error(`could not fetch ${up}: ${(r.stderr || r.stdout || '').trim().split(/\r?\n/).pop()}`);
  return f;
}

const sha = (...parts) => crypto.createHash('sha1').update(parts.join('\u0001')).digest('hex').slice(0, 16);
const fileHash = (f) => (fs.existsSync(f) ? crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex') : '');

/**
 * Render the loop of a chimerax scene to <mediaDir>/<id>.mp4 and .gif. Returns { mp4, gif, cached }.
 * Needs ChimeraX (struct/run_cx.py finds it) and ffmpeg on the PATH. The ChimeraX window opens for a minute; do not touch it.
 */
export function renderLoop(sc, { dir, mediaDir, fetch = false, log = console.log }) {
  if (!hasFfmpeg()) throw new Error('ffmpeg not found on the PATH; the loop cannot be encoded. Install ffmpeg, or set the scene kind to "webgl".');
  fs.mkdirSync(mediaDir, { recursive: true });
  const mp4 = path.join(mediaDir, `${sc.id}.mp4`), gif = path.join(mediaDir, `${sc.id}.gif`), meta = path.join(mediaDir, `${sc.id}.json`);
  const pdb = findPdb(dir, sc.pdb, { fetch, log });
  const to = sc.motion === 'morph' ? findPdb(dir, sc.to, { fetch, log }) : null;
  const [w, h] = sc.size || [960, 720];
  const fps = 30;
  const frames = sc.frames || Math.round((sc.duration / 1000) * fps);
  const map = Object.entries(sc.chains || {}).map(([c, f]) => `${c}:${f}`).join(',');
  const target = sc.target ? sc.target.replace(/;/g, '+') : '';
  const key = sha(fileHash(pdb), to ? fileHash(to) : '', sc.drop || '', sc.motion, target, map, frames, w, h, fps, fileHash(path.join(REPO, 'struct', 'loop.py')), fileHash(path.join(REPO, 'struct', 'style.py')), fileHash(path.join(REPO, 'tokens', 'tokens.base.json')));
  try { if (JSON.parse(fs.readFileSync(meta, 'utf8')).key === key && fs.existsSync(mp4) && fs.existsSync(gif)) { log(`loop "${sc.id}": up to date (${path.relative(dir, mp4)})`); return { mp4, gif, cached: true }; } } catch { /* render */ }

  // ChimeraX script arguments cannot carry spaces, so the files go to a plain path under the repository
  const work = path.join(REPO, 'tmp', 'deck', sc.id);
  if (/[^A-Za-z0-9_./:-]/.test(work.split(path.sep).join('/'))) throw new Error(`The path ${work} has a character that ChimeraX script arguments cannot carry; move the Molecullage folder to a plain path.`);
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(work, { recursive: true });
  const fwd = (p) => p.split(path.sep).join('/');
  fs.copyFileSync(pdb, path.join(work, 'a.pdb'));
  if (to) fs.copyFileSync(to, path.join(work, 'b.pdb'));
  const frameDir = path.join(work, 'frames');
  const words = ['loop', `name=${sc.id}`, `pdb=${fwd(path.join(work, 'a.pdb'))}`, `motion=${sc.motion}`, `frames=${frames}`, `size=${w}x${h}`, `framesdir=${fwd(frameDir)}`,
    ...(sc.drop ? [`drop=${sc.drop}`] : []), ...(to ? [`to=${fwd(path.join(work, 'b.pdb'))}`] : []), ...(target ? [`target=${target}`] : []), ...(map ? [`map=${map}`] : [])];
  const [cmd, ...lead] = pythonCmd();
  log(`loop "${sc.id}": ChimeraX renders ${frames} frames of ${w} x ${h} (a window opens)`);
  const t0 = Date.now();
  const r = spawnSync(cmd, [...lead, '-B', path.join(REPO, 'struct', 'run_cx.py'), path.join(REPO, 'struct', 'loop.py'), ...words], { encoding: 'utf8', cwd: REPO, timeout: 1500000 });
  const out = (r.stdout || '') + (r.stderr || '');
  const n = fs.existsSync(frameDir) ? fs.readdirSync(frameDir).filter((f) => f.endsWith('.png')).length : 0;
  if (!/ChimeraX exit: 0/.test(out) || /Traceback/.test(out) || n < frames) throw new Error(`ChimeraX loop "${sc.id}" failed (${n} of ${frames} frames). ${out.trim().slice(-700)}`);
  const ff = (args) => { const e = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { encoding: 'utf8' }); if (e.status) throw new Error('ffmpeg failed: ' + (e.stderr || '').trim().split('\n').pop()); };
  const input = ['-framerate', String(fps), '-i', path.join(frameDir, 'f%04d.png')];
  ff([...input, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2:color=white', '-movflags', '+faststart', mp4]);
  ff([...input, '-vf', `fps=20,scale=${Math.min(w, 640)}:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5`, '-loop', '0', gif]);
  fs.writeFileSync(meta, JSON.stringify({ key, frames, size: [w, h], fps, motion: sc.motion, seconds: +((Date.now() - t0) / 1000).toFixed(1) }, null, 1));
  fs.rmSync(work, { recursive: true, force: true });
  log(`loop "${sc.id}": ${path.relative(dir, mp4)} ${(fs.statSync(mp4).size / 1024).toFixed(0)} KB, ${path.relative(dir, gif)} ${(fs.statSync(gif).size / 1024).toFixed(0)} KB, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  return { mp4, gif, cached: false };
}
