// Build a deck: read deck.json, check it, prepare the 3D scenes, and write one HTML file with everything inside.
//   node deck/cli.mjs build <deck folder> [--audience cloud] [--out dir] [--live] [--fetch]
// The same assembler serves the preview server with inline=false (assets by URL, hot reload added by the server).
import fs from 'node:fs';
import path from 'node:path';
import { REPO, DEFAULTS, findConfig, resolveIn, findChimeraX } from '../build/config.mjs';
import { resolve, parseTarget } from './manifest.mjs';
import { slideHtml, esc } from './layouts.mjs';
import { renderLoop, findPdb } from './mol.mjs';

const read = (f) => fs.readFileSync(f, 'utf8');
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp', mp4: 'video/mp4', webm: 'video/webm' };

/** The deck folder and its manifest. `where` is a folder holding deck.json, or the json file. */
export function locate(where) {
  const p = path.resolve(where || '.');
  const file = fs.existsSync(p) && fs.statSync(p).isDirectory() ? path.join(p, 'deck.json') : p;
  if (!fs.existsSync(file)) throw new Error(`No deck.json at ${file}. Make one with: node deck/cli.mjs new <folder>`);
  return { dir: path.dirname(file), file, name: path.basename(path.dirname(file)) };
}

export function loadDeck(where, opts = {}) {
  const loc = locate(where);
  let raw;
  try { raw = JSON.parse(read(loc.file)); } catch (e) { throw new Error(`${loc.file} is not valid JSON: ${e.message}`); }
  const r = resolve(raw, { audience: opts.audience });
  return { ...loc, ...r };
}

/** Tokens, type ladder and word budget of the deck: the nearest molecullage.json above the deck, else the defaults. */
export function settings(dir) {
  const found = findConfig(dir);
  const cfg = found ? found.cfg : { ...DEFAULTS };
  const tokens = JSON.parse(read(resolveIn(found ? found.dir : REPO, cfg.palette)));
  return { cfg, tokens, ladder: { ...DEFAULTS.deckLadder, ...(cfg.deckLadder || {}) }, words: { ...DEFAULTS.deckWords, ...(cfg.deckWords || {}) } };
}

/** Keep the ATOM lines only: the viewer needs no header, no water and no ligands, and the deck gets smaller. */
export const slimPdb = (text, drop = '') => {
  const gone = new Set(drop.split(',').filter(Boolean));
  return text.split(/\r?\n/).filter((l) => (l.startsWith('ATOM') || l.startsWith('TER')) && !gone.has(l[21])).join('\n') + '\nEND\n';
};

/**
 * Decide, for each scene, what the slide shows: a ChimeraX loop (video) or the WebGL viewer.
 * A ChimeraX scene needs ChimeraX; without it the scene falls back to the viewer and the log says so.
 */
export function prepareScenes(deck, dir, { fetch = false, log = console.log, render = true } = {}) {
  const out = {};
  const mediaDir = path.join(dir, 'media');
  for (const sc of Object.values(deck.scenes)) {
    const r = { ...sc, kind: 'webgl', targetParts: sc.target ? parseTarget(sc.target) : null };
    let motion = sc.motion;
    if (sc.kind === 'chimerax') {
      const cx = findChimeraX();
      if (!cx) {
        if (!sc.fallback) throw new Error(`scene "${sc.id}": ChimeraX not found, and fallback is off`);
        log(`ChimeraX not found: scene "${sc.id}" uses the WebGL viewer. Install ChimeraX 1.10 or set MOLECULLAGE_CHIMERAX to render the loop.`);
      } else if (render) {
        const media = renderLoop(sc, { dir, mediaDir, fetch, log });
        out[sc.id] = { ...r, kind: 'video', src: path.relative(dir, media.mp4).split(path.sep).join('/'), gif: media.gif, loop: sc.loop };
        continue;
      } else {
        const mp4 = path.join(mediaDir, `${sc.id}.mp4`);
        if (fs.existsSync(mp4)) { out[sc.id] = { ...r, kind: 'video', src: `media/${sc.id}.mp4`, loop: sc.loop }; continue; }
        log(`scene "${sc.id}": no rendered loop yet; run the build to render it. Using the WebGL viewer for now.`);
      }
      if (motion === 'morph') { log(`scene "${sc.id}": a morph needs ChimeraX; the viewer shows a rotation instead`); motion = 'rotate'; }
    } else if (motion === 'morph') { log(`scene "${sc.id}": the WebGL viewer has no morph; it shows a rotation instead. Use kind "chimerax" for a morph.`); motion = 'rotate'; }
    const pdb = findPdb(dir, sc.pdb, { fetch, log });
    r.pdbText = slimPdb(read(pdb), sc.drop);
    r.motion = motion;
    out[sc.id] = r;
  }
  return out;
}

/** CSS variables of the palette and the ladder. */
function rootCss(deck, tokens, ladder) {
  const c = tokens.color, fam = c.family;
  const whiteOn = new Set(tokens.meta?.white_text_on || []);
  const f = (k) => fam[k] || fam.indigo;
  const on = (k) => (whiteOn.has(k) ? '#FFFFFF' : c.ink);
  let css = `:root{--ink:${c.ink};--sub:${c.sub};--line:${c.line};--rule:${c.rule};--guide:${c.guide || '#777777'};`
    + `--accent:${f(deck.accent).fill};--accent-edge:${f(deck.accent).edge};--second:${f(deck.second).fill};--second-edge:${f(deck.second).edge};--on-accent:${on(deck.accent)};--on-second:${on(deck.second)};`
    + `--rose:${fam.rose.fill};--apricot:${fam.apricot.fill};--mint:${fam.mint.fill};--bar:${fam.grey.fill};`
    + Object.entries(ladder).map(([k, v]) => `--f-${k}:${v}px`).join(';');
  css += (c.data || []).map((d, i) => `;--data${i}:${d}`).join('') + '}';
  return css;
}

const palette = (tokens) => Object.fromEntries(Object.entries(tokens.color.family).map(([k, v]) => [k, { fill: v.fill, edge: v.edge }]));
const stripExport = (s) => s.replace(/^export /gm, '');
const safeScript = (s) => s.replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--');

/**
 * The HTML of the deck. opts.inline: assets become data URIs (a standalone file) or stay URLs from opts.url(absPath).
 * opts.live: device frames with a url load it in an iframe. opts.extra: markup before </body> (the preview server's reload hook).
 */
export function assemble(d, scenes, opts = {}) {
  const { deck, dir } = d;
  const { tokens, ladder } = settings(dir);
  const cache = new Map();
  const asset = (src) => {
    const abs = path.resolve(dir, src);
    if (!abs.startsWith(path.resolve(dir)) && !abs.startsWith(REPO)) throw new Error(`asset ${src} lies outside the deck folder`);
    if (!fs.existsSync(abs)) throw new Error(`asset not found: ${src}`);
    if (!opts.inline) return opts.url(abs);
    if (cache.has(abs)) return cache.get(abs);
    const ext = path.extname(abs).slice(1).toLowerCase();
    if (!MIME[ext]) throw new Error(`asset ${src}: ${ext} is not an image or video type the deck can inline`);
    const uri = `data:${MIME[ext]};base64,${fs.readFileSync(abs).toString('base64')}`;
    cache.set(abs, uri);
    return uri;
  };
  const text = (src) => {   // a text file of the deck folder (a drawing that goes into the page)
    const abs = path.resolve(dir, src);
    if (!abs.startsWith(path.resolve(dir)) && !abs.startsWith(REPO)) throw new Error(`file ${src} lies outside the deck folder`);
    if (!fs.existsSync(abs)) throw new Error(`file not found: ${src}`);
    return fs.readFileSync(abs, 'utf8');
  };
  const ctx = { deck, asset, text, scene: (id) => scenes[id] };
  const body = deck.slides.map((s, i) => slideHtml(s, i, ctx)).join('\n');
  const needGl = Object.values(scenes).some((s) => s.kind === 'webgl');
  const data = {
    title: deck.title, lang: deck.lang, fps: deck.fps, boundary: deck.boundary, palette: palette(tokens),
    scenes: Object.fromEntries(Object.entries(scenes).map(([id, s]) => [id, { id, kind: s.kind, pdbText: s.pdbText, motion: s.motion, duration: s.duration, chains: s.chains, target: s.target, targetParts: s.targetParts, poster: s.poster, loop: s.loop, title: s.title }])),
    slides: deck.slides.map((s) => ({ id: s.id, title: s.title || s.id, duration: s.duration, need: s.need, transition: s.transition, steps: s.steps, end0: s.end0, notes: s.notes })),
  };
  const lib = needGl ? `<script>${safeScript(read(path.join(REPO, 'deck', 'vendor', '3Dmol-min.js')))}</script>\n` : '';
  const timeline = stripExport(read(path.join(REPO, 'deck', 'runtime', 'timeline.mjs')));
  const html = `<!doctype html>
<html lang="${esc(deck.lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(deck.title)}</title>
<style>${rootCss(deck, tokens, ladder)}
${read(path.join(REPO, 'deck', 'runtime', 'deck.css'))}</style></head>
<body><div id="stage">
${body}
</div><div id="popout"></div>
<script id="deck-data" type="application/json">${safeScript(JSON.stringify(data))}</script>
${lib}<script>${opts.live ? 'window.__DECK_LIVE=true;' : ''}${safeScript(timeline)}</script>
<script>${safeScript(read(path.join(REPO, 'deck', 'runtime', 'deck.js')))}</script>
${opts.extra || ''}</body></html>
`;
  return html;
}

/** Build the standalone file. Returns { html, file, warnings, scenes, deck }. */
export function buildDeck(where, { audience, out, live = false, fetch = false, log = console.log, render = true } = {}) {
  const d = loadDeck(where, { audience });
  for (const w of d.warnings) log(`warning: ${w}`);
  if (d.errors.length) throw new Error(`${d.file}:\n  ` + d.errors.join('\n  '));
  const scenes = prepareScenes(d.deck, d.dir, { fetch, log, render });
  const outDir = path.resolve(out || path.join(d.dir, 'out'));
  fs.mkdirSync(outDir, { recursive: true });
  const suffix = audience ? `-${audience}` : '';
  const file = path.join(outDir, `${d.name}${suffix}.html`);
  const html = assemble(d, scenes, { inline: true, live });
  fs.writeFileSync(file, html);
  return { file, bytes: html.length, warnings: d.warnings, deck: d.deck, scenes, dir: d.dir, name: d.name + suffix, outDir };
}
