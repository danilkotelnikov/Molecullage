// Checks for a deck, the way qa/qa_fig.py checks a figure. Every slide is drawn in its still state at 1920 x 1080 in headless Chromium
// and measured in the page:
//   palette   every fill, border and text colour is in the token file
//   font      no text under the floor of the type ladder; sizes that are not on the ladder are listed
//   overflow  no text outside the slide, no clipped box, no two text boxes on top of each other
//   contrast  text against its background: 4.5:1, or 3:1 for large text
//   words     the word budget of a slide, a title, a bullet and the footnote (a failure at "strict", else a warning)
//   media     images have alt text and load; a video loads; a 3D scene has its viewer
//   usage:  node qa/qa_deck.mjs <deck folder> [--json] [--strictness normal|strict|loose] [--audience cloud] [--sheet file.png]
// Exit code 1 when a check fails (0 at "loose"). The blind read and the overclaim read are not run here: with --sheet it writes the
// contact sheet for the blind reader, and it always writes overclaim-pack.md for the overclaim reader (see the briefs in qa/).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildDeck, settings } from '../deck/build.mjs';
import { withDeck, exportSheet } from '../deck/export.mjs';

/** Runs in the page. Returns the raw measurements of one slide. */
function measure({ i, allowed, ladder }) {
  const sl = document.querySelector(`.slide[data-i="${i}"]`);
  const base = sl.getBoundingClientRect();
  const hex = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return null; const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); if (a === 0) return null; return '#' + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('').toUpperCase(); };
  const lum = (h) => { const v = [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const name = (e) => { let s = e.tagName.toLowerCase(); if (e.className && typeof e.className === 'string') s += '.' + e.className.trim().split(/\s+/)[0]; const t = (e.textContent || '').trim().slice(0, 24); return t ? `${s} "${t}"` : s; };
  const bgOf = (e) => { for (let n = e; n && n !== document.documentElement; n = n.parentElement) { const h = hex(getComputedStyle(n).backgroundColor); if (h) return h; } return '#FFFFFF'; };
  const all = [...sl.querySelectorAll('*')].filter((e) => !['SCRIPT', 'STYLE', 'VIDEO', 'CANVAS', 'IMG', 'IFRAME'].includes(e.tagName));
  const out = { palette: {}, small: [], offLadder: {}, outside: [], clipped: [], overlaps: [], contrast: [], words: { slide: 0, title: 0, bullets: [], footnote: 0 }, media: [], minFont: 1e9, text: [] };
  const texts = [];
  for (const e of all) {
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const cs = getComputedStyle(e);
    let op = 1; for (let n = e; n && n !== sl; n = n.parentElement) op *= parseFloat(getComputedStyle(n).opacity); // a part that has faded out in the finished state is not on the slide
    if (op < 0.05) continue;
    const add = (h) => { if (h && !allowed.includes(h)) (out.palette[h] ||= []).push(name(e)); };
    add(hex(cs.backgroundColor));
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) if (parseFloat(cs[`border${side}Width`]) > 0 && cs[`border${side}Style`] !== 'none') add(hex(cs[`border${side}Color`]));
    const own = [...e.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ');
    if (e.scrollWidth > e.clientWidth + 1 && /hidden|auto|scroll/.test(cs.overflowX) && e.clientWidth) out.clipped.push(name(e));
    if (e.scrollHeight > e.clientHeight + 1 && /hidden|auto|scroll/.test(cs.overflowY) && e.clientHeight && e !== sl) out.clipped.push(name(e));
    if (!own) continue;
    const px = parseFloat(cs.fontSize), fg = hex(cs.color);
    add(fg);
    const inSub = !!e.closest('sub,sup');
    out.minFont = Math.min(out.minFont, px);
    if (px < ladder.floor - 0.01) out.small.push(`${name(e)} ${px}px`);
    else if (!inSub && !Object.values(ladder).some((v) => Math.abs(v - px) < 0.01)) (out.offLadder[px] ||= []).push(name(e));
    const rel = { l: r.left - base.left, t: r.top - base.top, r: r.right - base.left, b: r.bottom - base.top };
    if (rel.l < -1 || rel.t < -1 || rel.r > 1921 || rel.b > 1081) out.outside.push(name(e));
    const bg = bgOf(e), large = px >= 56 || (parseInt(cs.fontWeight, 10) >= 700 && px >= 42);
    const cr = fg ? ratio(fg, bg) : 99;
    if (cr < (large ? 3 : 4.5)) out.contrast.push(`${name(e)} ${cr.toFixed(2)}:1`);
    texts.push({ e, rel, own });
    const w = (own.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;
    out.text.push(own);
    if (e.closest('.foot')) { if (e.classList.contains('bd')) out.words.footnote += w; }
    else if (!e.closest('.ui') && !e.closest('.mol-cap') && !e.closest('.pgn')) {
      out.words.slide += w;
      if (e.tagName === 'H1') out.words.title += w;
      if (e.tagName === 'LI') out.words.bullets.push(w);
    }
  }
  for (let a = 0; a < texts.length; a++) for (let b = a + 1; b < texts.length; b++) {
    const A = texts[a], B = texts[b];
    if (A.e.contains(B.e) || B.e.contains(A.e)) continue;
    const ox = Math.min(A.rel.r, B.rel.r) - Math.max(A.rel.l, B.rel.l), oy = Math.min(A.rel.b, B.rel.b) - Math.max(A.rel.t, B.rel.t);
    if (ox > 4 && oy > 4) out.overlaps.push(`${name(A.e)} / ${name(B.e)}`);
  }
  sl.querySelectorAll('img').forEach((im) => { if (!im.complete || !im.naturalWidth) out.media.push(`image does not load: ${im.alt || im.src.slice(0, 30)}`); else if (!im.alt && !im.closest('.mol')) out.media.push(`image without alt: ${im.src.slice(0, 40)}`); });
  sl.querySelectorAll('video').forEach((v) => { if (!v.videoWidth) out.media.push('video does not load'); });
  sl.querySelectorAll('.mol[data-kind="webgl"]').forEach((m) => { if (!m.querySelector('canvas')) out.media.push('3D scene has no viewer'); });
  out.minFont = out.minFont === 1e9 ? null : out.minFont;
  return out;
}

const tokenColours = (tokens) => {
  const c = tokens.color, s = new Set([c.ink, c.sub, c.line, c.rule, c.guide || '#777777', '#FFFFFF', ...(c.data || [])]);
  for (const f of Object.values(c.family)) { s.add(f.fill); s.add(f.edge); }
  return [...s].map((x) => x.toUpperCase());
};

/** Plain text of every slide plus notes and scene sources, for the reader who looks for overclaims. */
export function overclaimPack(deck) {
  const out = [`# ${deck.title}`, '', `Claim boundary on every slide: ${deck.boundary || '(none)'}`, ''];
  deck.slides.forEach((s, i) => {
    const bits = [];
    const walk = (v) => { if (v == null) return; if (typeof v === 'string') bits.push(v); else if (Array.isArray(v)) v.forEach(walk); else if (typeof v === 'object') { for (const [k, x] of Object.entries(v)) if (!['step', 'effect', 'key', 'src', 'url', 'frame', 'type', 'build', 'ordered'].includes(k)) walk(x); } };
    ['title', 'subtitle', 'kicker', 'left', 'right', 'figure', 'caption', 'alt', 'items', 'columns', 'rows', 'bullets'].forEach((k) => walk(s[k]));
    out.push(`## Slide ${i + 1} (${s.layout})`, bits.join('\n'), '', `Speaker notes: ${s.notes || '(none)'}`, '');
  });
  const sc = Object.values(deck.scenes);
  if (sc.length) { out.push('## Structures shown'); sc.forEach((x) => out.push(`- ${x.id}: ${x.pdb}${x.to ? ' to ' + x.to : ''}, ${x.motion}, ${x.kind}`)); }
  return out.join('\n') + '\n';
}

/** Build the deck (no ChimeraX render) and measure it. Returns { ok, failures, warnings, slides }. */
export async function auditDeck(where, { strictness, audience, sheet, log = () => {} } = {}) {
  const b = buildDeck(where, { audience, log, render: false });
  const { cfg, tokens, ladder, words } = settings(b.dir);
  const level = strictness || cfg.strictness || 'normal';
  const allowed = tokenColours(tokens);
  const failures = [], warnings = [];
  const slides = await withDeck(b.file, async (page, info) => {
    const res = [];
    for (const s of info.slides) {
      await page.evaluate((i) => DECK.seekSlide(i, 0, true), s.i);
      await page.evaluate(() => DECK.ready());
      const m = await page.evaluate(measure, { i: s.i, allowed, ladder });
      res.push({ i: s.i, id: s.id, m });
    }
    return res;
  });
  const hard = (cond, msg) => { if (cond) failures.push(msg); };
  const soft = (cond, msg) => { if (cond) (level === 'strict' ? failures : warnings).push(msg); };
  const rows = slides.map(({ i, id, m }) => {
    const tag = `slide ${i + 1} (${id})`;
    const off = Object.keys(m.palette);
    hard(off.length, `${tag}: colours outside the palette: ${off.map((h) => `${h} on ${m.palette[h][0]}`).join('; ')}`);
    hard(m.small.length, `${tag}: text under the ${ladder.floor} px floor: ${m.small.slice(0, 3).join('; ')}`);
    hard(m.outside.length, `${tag}: text outside the slide: ${m.outside.slice(0, 3).join('; ')}`);
    hard(m.clipped.length, `${tag}: a box clips its content: ${m.clipped.slice(0, 3).join('; ')}`);
    hard(m.overlaps.length, `${tag}: text boxes overlap: ${m.overlaps.slice(0, 3).join('; ')}`);
    hard(m.contrast.length, `${tag}: low contrast: ${m.contrast.slice(0, 3).join('; ')}`);
    hard(m.media.length, `${tag}: ${m.media.join('; ')}`);
    soft(Object.keys(m.offLadder).length, `${tag}: sizes not on the type ladder: ${Object.entries(m.offLadder).map(([px, n]) => `${px}px (${n[0]})`).join('; ')}`);
    soft(m.words.slide > words.slide, `${tag}: ${m.words.slide} words, budget ${words.slide}`);
    soft(m.words.title > words.title, `${tag}: title has ${m.words.title} words, budget ${words.title}`);
    soft(m.words.bullets.some((w) => w > words.bullet), `${tag}: a bullet has more than ${words.bullet} words`);
    soft(m.words.footnote > words.footnote, `${tag}: footnote has ${m.words.footnote} words, budget ${words.footnote}`);
    return { slide: i + 1, id, minFontPx: m.minFont, words: m.words.slide, titleWords: m.words.title, offPalette: off.length, overflow: m.outside.length + m.clipped.length, overlaps: m.overlaps.length, lowContrast: m.contrast.length, media: m.media.length };
  });
  if (level === 'loose') { warnings.push(...failures.splice(0)); }
  const pack = path.join(b.outDir, 'overclaim-pack.md');
  fs.writeFileSync(pack, overclaimPack(b.deck));
  let sheetFile = null;
  if (sheet) { sheetFile = path.resolve(sheet); await exportSheet(b.file, sheetFile, { log }); }
  return { ok: failures.length === 0, strictness: level, failures, warnings, slides: rows, html: b.file, overclaimPack: pack, sheet: sheetFile,
    reads: { blind: 'Give a reader the contact sheet only, with qa/blind_read.md (deck section).', overclaim: 'Give a reader overclaim-pack.md, with qa/overclaim_read.md (deck section).' } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2), flags = {}, pos = [];
  for (let i = 0; i < a.length; i++) { if (a[i] === '--json') flags.json = true; else if (a[i].startsWith('--')) flags[a[i].slice(2)] = a[++i]; else pos.push(a[i]); }
  if (!pos[0]) { console.error('usage: node qa/qa_deck.mjs <deck folder> [--json] [--strictness normal|strict|loose] [--audience cloud] [--sheet file.png]'); process.exit(2); }
  try {
    const r = await auditDeck(pos[0], { strictness: flags.strictness, audience: flags.audience, sheet: flags.sheet });
    if (flags.json) console.log(JSON.stringify(r));
    else {
      console.log(`${r.ok ? 'pass' : 'FAIL'}  ${r.slides.length} slides, strictness ${r.strictness}`);
      for (const f of r.failures) console.log(`  FAIL  ${f}`);
      for (const w of r.warnings) console.log(`  warn  ${w}`);
      for (const s of r.slides) console.log(`  slide ${s.slide}: min font ${s.minFontPx} px, ${s.words} words`);
      console.log(`  overclaim pack: ${r.overclaimPack}${r.sheet ? `\n  contact sheet: ${r.sheet}` : ''}`);
    }
    process.exit(r.ok || r.strictness === 'loose' ? 0 : 1);
  } catch (e) { console.error(String(e.message || e)); process.exit(1); }
}
