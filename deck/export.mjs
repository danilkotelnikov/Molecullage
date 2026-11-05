// Exports of a built deck, all from the one standalone HTML, in headless Chromium (playwright-core):
//   png   one PNG per slide, 1920 x 1080 (or scaled), still state (every step shown, 3D at its poster pose)
//   pdf   one page per slide, 1920 x 1080 px, live text
//   mp4   frame-exact: the exporter sets the deck time, waits until the page is ready, takes a screenshot, and pipes it to ffmpeg
//   gif   the same capture, for one slide or a range of slides
//   notes notes.txt and a notes PDF (slide thumbnail and text)
//   sheet one PNG with every slide, for the blind read
// Nothing here uses the wall clock of the page: window.__DECK_EXPORT stops the player, and DECK.seekGlobal(ms) draws a given moment.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { findChrome } from '../build/config.mjs';
import { esc } from './layouts.mjs';

const W = 1920, H = 1080;
const CLIP = { x: 0, y: 0, width: W, height: H };

/** Open the standalone HTML in headless Chromium and run fn(page, info). Remote requests are refused: an export is offline. */
export async function withDeck(htmlFile, fn, { scale = 1, live = false } = {}) {
  const exe = findChrome();
  if (!exe) throw new Error('No Chrome, Edge or Chromium found. Install one or set MOLECULLAGE_CHROME to its executable.');
  const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  try {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: scale });
    await ctx.addInitScript(() => { window.__DECK_EXPORT = true; });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    if (!live) await page.route(/^(https?|wss?|ftp):/i, (r) => r.abort());
    await page.goto(pathToFileURL(path.resolve(htmlFile)).href);
    await page.waitForFunction(() => window.DECK, null, { timeout: 30000 }).catch(() => { throw new Error('the deck did not start: ' + (errors.join('; ') || 'no DECK object')); });
    await page.evaluate(() => DECK.ready());
    const info = await page.evaluate(() => DECK.info());
    const res = await fn(page, info, errors);
    return res;
  } finally { await browser.close(); }
}

const ready = (page) => page.evaluate(() => DECK.ready());

/** Python script of the owner that strips text chunks from PNG files, when present next to the repository; otherwise a built-in pass. */
function stripPng(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32BE(0) !== 0x89504e47) return;
  const keep = [b.subarray(0, 8)];
  let i = 8, dropped = 0;
  while (i + 12 <= b.length) {
    const len = b.readUInt32BE(i), typ = b.toString('latin1', i + 4, i + 8), end = i + 12 + len;
    if (['tEXt', 'iTXt', 'zTXt', 'eXIf', 'tIME'].includes(typ)) dropped++; else keep.push(b.subarray(i, end));
    i = end;
    if (typ === 'IEND') break;
  }
  if (dropped) fs.writeFileSync(file, Buffer.concat(keep));
}

const pad = (n, w = 2) => String(n).padStart(w, '0');

/** One PNG per slide (all, or the ids in `only`). Returns the file names. */
export async function exportPng(html, outDir, { only, scale = 1, name = 'slide', log = console.log } = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  return withDeck(html, async (page, info) => {
    const files = [];
    for (const s of info.slides) {
      if (only && !only.includes(s.id)) continue;
      await page.evaluate((i) => DECK.seekSlide(i, 0, true), s.i);
      await ready(page);
      const f = path.join(outDir, `${name}-${pad(s.i + 1)}-${s.id}.png`);
      await page.screenshot({ path: f, clip: CLIP, type: 'png' });
      stripPng(f);
      files.push(f);
    }
    log(`png: ${files.length} files in ${outDir}`);
    return files;
  }, { scale });
}

/** PDF with one page of 1920 x 1080 px per slide. Returns { file, pages, bytes }. */
export async function exportPdf(html, file, { log = console.log } = {}) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  return withDeck(html, async (page, info) => {
    await page.evaluate(() => DECK.printMode());
    await page.emulateMedia({ media: 'print' });
    await page.pdf({ path: file, width: `${W}px`, height: `${H}px`, printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    const pages = (fs.readFileSync(file, 'latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    if (pages !== info.slides.length) log(`warning: the PDF has ${pages} pages for ${info.slides.length} slides`);
    log(`pdf: ${pages} pages, ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
    return { file, pages, bytes: fs.statSync(file).size };
  });
}

export const hasFfmpeg = () => spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' }).status === 0;

/**
 * Frame-exact capture to MP4 or GIF. Options: fps, width (output width in px, height follows 16:9), durations ({default, byId}), range (slide ids to capture; default all),
 * format 'mp4' | 'gif'. A frame whose signature equals the previous one is not captured again.
 */
export async function exportVideo(html, file, { fps = 30, width = W, format = 'mp4', durations, range, crf = 18, log = console.log } = {}) {
  if (!hasFfmpeg()) throw new Error('ffmpeg not found on the PATH. Install it to export MP4 or GIF.');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const outW = Math.round(width / 2) * 2, outH = Math.round((width * H) / W / 2) * 2;
  const scale = Math.min(2, Math.max(0.25, outW / W));
  const t0 = Date.now();
  return withDeck(html, async (page, info) => {
    const plan = await page.evaluate(({ durations, range }) => DECK.plan({ durations, range }), { durations, range });
    const frames = Math.max(1, Math.ceil((plan.total * fps) / 1000));
    const vf = format === 'gif'
      ? `fps=${Math.min(fps, 15)},scale=${Math.min(outW, 960)}:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5`
      : `scale=${outW}:${outH}:flags=lanczos`;
    const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-', '-vf', vf,
      ...(format === 'gif' ? ['-loop', '0'] : ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', String(crf), '-preset', 'medium', '-movflags', '+faststart']), file];
    const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });
    let err = '';
    ff.stderr.on('data', (d) => { err += d; });
    const closed = new Promise((res) => ff.on('close', res));
    let prev = null, buf = null, shots = 0;
    for (let f = 0; f < frames; f++) {
      const g = Math.min(plan.total, (f * 1000) / fps);
      const sig = await page.evaluate(async (g) => { const s = DECK.seekPlan(g); await DECK.ready(); return s; }, g);
      if (sig !== prev) { buf = await page.screenshot({ clip: CLIP, type: 'png' }); shots++; prev = sig; }
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    }
    ff.stdin.end();
    const code = await closed;
    if (code) throw new Error('ffmpeg failed: ' + err.trim().split('\n').pop());
    const secs = (Date.now() - t0) / 1000;
    log(`${format}: ${frames} frames (${shots} captured, ${frames - shots} repeated), ${(plan.total / 1000).toFixed(1)} s at ${fps} fps, ${outW} x ${outH}, ${(fs.statSync(file).size / 1024).toFixed(0)} KB, ${secs.toFixed(0)} s`);
    return { file, frames, captured: shots, seconds: plan.total / 1000, renderSeconds: +secs.toFixed(1), bytes: fs.statSync(file).size, size: [outW, outH] };
  }, { scale });
}

const dataUri = (f) => `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`;

/** notes.txt and a notes PDF (A4, three slides to a page: a thumbnail on the left, the notes on the right). */
export async function exportNotes(html, deck, outDir, { name = 'notes', log = console.log } = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  const txt = path.join(outDir, `${name}.txt`), pdf = path.join(outDir, `${name}.pdf`);
  const lines = [deck.title, '='.repeat(Math.min(60, deck.title.length)), ''];
  deck.slides.forEach((s, i) => { lines.push(`Слайд ${i + 1}. ${s.title || s.id} (${(s.duration / 1000).toFixed(1)} с)`, s.notes || '(без заметок)', ''); });
  fs.writeFileSync(txt, lines.join('\n'));
  const tmp = fs.mkdtempSync(path.join(outDir, '.thumbs-'));
  try {
    const thumbs = await exportPng(html, tmp, { scale: 0.5, log: () => {} });
    const rows = deck.slides.map((s, i) => `<section><div class="n">${i + 1}</div><img src="${dataUri(thumbs[i])}" alt=""><div class="t"><h2>${esc(s.title || s.id)}</h2><p>${esc(s.notes || '—').replace(/\n/g, '<br>')}</p></div></section>`).join('');
    const doc = `<!doctype html><html lang="${esc(deck.lang)}"><meta charset="utf-8"><style>
      @page{size:A4;margin:12mm}body{margin:0;font:11pt Arial,Helvetica,sans-serif;color:#0A0A0A}
      h1{font-size:15pt;margin:0 0 6mm}section{display:grid;grid-template-columns:8mm 78mm 1fr;gap:5mm;align-items:start;break-inside:avoid;border-top:.4mm solid #3A3A3A;padding:4mm 0;min-height:60mm}
      .n{font-weight:700;font-size:16pt}img{width:78mm;border:.3mm solid #3A3A3A}h2{font-size:11pt;margin:0 0 2mm}p{margin:0;line-height:1.35}</style>
      <h1>${esc(deck.title)}</h1>${rows}</html>`;
    const exe = findChrome();
    const browser = await chromium.launch({ executablePath: exe, headless: true });
    try {
      const pg = await browser.newPage();
      await pg.setContent(doc);
      await pg.pdf({ path: pdf, format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' } });
    } finally { await browser.close(); }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  log(`notes: ${txt}, ${pdf} (${(fs.statSync(pdf).size / 1024).toFixed(0)} KB)`);
  return { txt, pdf };
}

/** One PNG with every slide in a grid, numbered, no titles: the picture for the blind read. */
export async function exportSheet(html, file, { cols = 3, log = console.log } = {}) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = fs.mkdtempSync(path.join(path.dirname(file), '.sheet-'));
  try {
    const shots = await exportPng(html, tmp, { scale: 0.5, log: () => {} });
    const cells = shots.map((f, i) => `<div><img src="${dataUri(f)}"><b>${i + 1}</b></div>`).join('');
    const doc = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#fff;padding:20px;width:${cols * 980}px}.g{display:grid;grid-template-columns:repeat(${cols},960px);gap:20px}.g div{position:relative}
      img{width:960px;display:block;border:3px solid #3A3A3A;box-sizing:border-box}b{position:absolute;left:0;top:0;background:#0A0A0A;color:#fff;font:700 26px Arial;padding:2px 12px}</style><div class="g">${cells}</div>`;
    const browser = await chromium.launch({ executablePath: findChrome(), headless: true });
    try {
      const pg = await browser.newPage({ viewport: { width: cols * 980 + 40, height: 600 } });
      await pg.setContent(doc);
      await pg.screenshot({ path: file, fullPage: true, type: 'png' });
    } finally { await browser.close(); }
    stripPng(file);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  log(`sheet: ${file} (${(fs.statSync(file).size / 1024).toFixed(0)} KB)`);
  return file;
}
