// Render an HTML figure page to PDF (vector, live text) and PNG (600 dpi) with headless Chromium.
//
//   node build/build.mjs <page.html> [widthMm] [tokens.json] [--out dir] [--art dir]
//
// The page holds an element with class "fig" and uses the kit (Fig, f.tool, f.pill, ...). Settings come from the nearest
// molecullage.json above the page (palette, type ladder, claim boundary); arguments win over the file.
// Icons written as icon:'name' or <i data-icon="name"></i> are inlined from @tabler/icons (outline, MIT).
// <!--INLINE_SVG relative/path.svg--> inlines a plot layer. Structure renders come from the art folder (struct/trim.py output).
// A token file with meta.remapFrom recolours a page written against another palette: every family fill and edge hex is replaced.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { REPO, DEFAULTS, findConfig, findChrome, resolveIn } from './config.mjs';

const MM = 96 / 25.4;
const read = (f) => fs.readFileSync(f, 'utf8');

const svgOf = (iconDir, icon) => {
  const f = path.join(iconDir, `${icon}.svg`);
  if (!fs.existsSync(f)) throw new Error(`icon not found: ${icon} (looked in ${iconDir})`);
  return read(f).replace(/<svg[^>]*>/, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">').replace(/\s*\n\s*/g, '');
};

/** Pure part: page source + tokens + config -> the HTML that Chromium prints. Exported for tests. */
export function assemble({ html, pageDir, tokens, cfg, tokenDir, artDir, outDir, iconDir }) {
  const c = tokens.color;
  if (tokens.meta?.remapFrom) {
    const from = JSON.parse(read(path.resolve(tokenDir, tokens.meta.remapFrom))).color.family;
    const map = new Map();
    for (const [k, v] of Object.entries(from)) {
      const n = c.family[k];
      if (!n) continue;
      map.set(v.fill.toLowerCase(), n.fill);
      map.set(v.edge.toLowerCase(), n.edge);
    }
    html = html.replace(/#[0-9a-fA-F]{6}\b/g, (h) => map.get(h.toLowerCase()) ?? h);
  }
  html = html.replace(/<i data-icon="([\w-]+)"([^>]*)><\/i>/g, (_, icon, rest) => `<span class="ic"${rest}>${svgOf(iconDir, icon)}</span>`);
  html = html.replace(/<!--INLINE_SVG ([^>]+?)-->/g, (_, p) => {
    const f = path.resolve(pageDir, p.trim());
    if (!/\.svg$/i.test(f)) throw new Error(`INLINE_SVG takes an .svg file: ${p.trim()}`);
    if (!fs.existsSync(f)) throw new Error(`INLINE_SVG not found: ${p.trim()}`);
    const s = read(f).replace(/<\?xml[^>]*\?>\s*/g, '').replace(/<!DOCTYPE[^>]*>\s*/g, '');
    return `<div class="plots" style="position:absolute;left:0;top:0;pointer-events:none">${s}</div>`;
  });
  html = html.replace(/<!--INLINE_JS ([^>]+?)-->/g, (_, p) => {   // a data file the page reads (window.DATA = ...), path relative to the page
    const f = path.resolve(pageDir, p.trim());
    if (!/\.js$/i.test(f)) throw new Error(`INLINE_JS takes a .js file: ${p.trim()}`);
    if (!fs.existsSync(f)) throw new Error(`INLINE_JS not found: ${p.trim()}`);
    return `<script>${read(f)}</script>`;
  });
  const used = new Set(['device-desktop', 'flask', 'arrow-narrow-right']);
  for (const m of html.matchAll(/icon:\s*'([\w-]+)'/g)) used.add(m[1]);
  const icons = Object.fromEntries([...used].map((i) => [i, svgOf(iconDir, i)]));

  const lad = { ...DEFAULTS.typeLadder, ...(cfg.typeLadder || {}) };
  const pt = (v) => `${v}pt`;
  let css = `:root{--ink:${c.ink};--sub:${c.sub};--line:${c.line};--rule:${c.rule};--guide:${c.guide || '#777777'};`
    + `--fs-letter:${pt(lad.letter)};--fs-title:${pt(lad.title)};--fs-label:${pt(lad.label)};--fs-floor:${pt(+(lad.floor + 0.05).toFixed(2))};--fs-math:${pt(lad.math)}`
    + (c.data || []).map((d, i) => `;--data${i}:${d}`).join('') + '}\n';
  for (const [k, v] of Object.entries(c.family)) {
    css += `.fam-${k}{background:${v.fill};border-color:${v.edge};--edge:${v.edge}}\n`;
    if (v.dash) css += `.fam-${k}{border-style:dashed}\n`;
  }
  for (const [a, k] of Object.entries(c.alias || {})) css += `.fam-${a}{background:${c.family[k].fill};border-color:${c.family[k].edge};--edge:${c.family[k].edge}}\n`;
  css += '.dashed{background:#fff !important}\n';

  const kitCss = read(path.join(REPO, 'kit', 'kit.css'));
  const kitJs = read(path.join(REPO, 'kit', 'kit.js')) + '\n' + read(path.join(REPO, 'kit', 'kit_blocks.js'));
  // every index*.json in the art folder (one per render group, written by struct/trim.py) is merged into window.ART
  const art = {};
  if (artDir && fs.existsSync(artDir)) for (const fn of fs.readdirSync(artDir).filter((n) => /^index.*\.json$/.test(n))) Object.assign(art, JSON.parse(read(path.join(artDir, fn))));
  const artRel = artDir ? path.relative(outDir, artDir).split(path.sep).join('/') || '.' : 'art';
  const config = { claimBoundary: cfg.claimBoundary || '', floorPt: lad.floor + 0.05, typeLadder: lad, strictness: cfg.strictness };
  // a replacer function: the kit source contains "$'" and other patterns that String.replace would expand in a plain replacement string
  return html.replace('</head>', () => `<style>${css}${kitCss}${tokens.css || ''}</style><script>window.ICONS=${JSON.stringify(icons)};window.ART=${JSON.stringify(art)};window.ART_DIR=${JSON.stringify(artRel)};window.CONFIG=${JSON.stringify(config)};window.TOKENS=${JSON.stringify({ color: c, meta: tokens.meta || {}, provenance: tokens.provenance || {} })};</script><script>${kitJs}</script></head>`);
}

export async function build({ page, widthMm, tokensFile, outDir, artDir }) {
  const pageFile = path.resolve(page);
  if (!fs.existsSync(pageFile)) throw new Error(`page not found: ${page}`);
  const pageDir = path.dirname(pageFile);
  const found = findConfig(pageFile);
  const cfg = found ? found.cfg : { ...DEFAULTS };
  const cfgDir = found ? found.dir : REPO;
  const tokenPath = tokensFile ? path.resolve(tokensFile) : resolveIn(cfgDir, cfg.palette);
  const tokens = JSON.parse(read(tokenPath));
  const width = Number(widthMm || cfg.widthMm?.[0] || 178);
  const out = path.resolve(outDir || path.join(cfgDir, 'out'));
  const art = path.resolve(artDir || resolveIn(cfgDir, cfg.art || 'art'));
  const name = path.basename(pageFile).replace(/\.html?$/, '');
  const iconDir = path.join(REPO, 'node_modules', '@tabler', 'icons', 'icons', 'outline');
  fs.mkdirSync(out, { recursive: true });

  const html = assemble({ html: read(pageFile), pageDir, tokens, cfg, tokenDir: path.dirname(tokenPath), artDir: art, outDir: out, iconDir });
  const outHtml = path.join(out, `${name}.html`);
  fs.writeFileSync(outHtml, html);

  const exe = findChrome();
  if (!exe) throw new Error('No Chrome, Edge or Chromium found. Install one or set MOLECULLAGE_CHROME to its executable.');
  const browser = await chromium.launch({ executablePath: exe, headless: true });
  try {
    const pg = await browser.newPage({ viewport: { width: Math.round(width * MM), height: 800 }, deviceScaleFactor: 600 / 96 });
    const errors = [];
    pg.on('pageerror', (e) => errors.push(String(e)));
    await pg.route(/^(https?|wss?|ftp):/i, (r) => r.abort());   // a figure page is built offline: no request leaves the machine
    await pg.goto(pathToFileURL(outHtml).href);
    await pg.evaluate(() => document.fonts.ready);
    const box = await pg.evaluate(() => { const r = document.querySelector('.fig').getBoundingClientRect(); return { w: r.width, h: r.height }; });
    if (!box.w) throw new Error('the page drew nothing: ' + (errors.join('; ') || 'no .fig element or it has no size'));
    await pg.setViewportSize({ width: Math.round(box.w), height: Math.ceil(box.h) });
    await pg.pdf({ path: path.join(out, `${name}.pdf`), width: `${(box.w / MM).toFixed(2)}mm`, height: `${(box.h / MM).toFixed(2)}mm`, printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 }, pageRanges: '1' });
    await pg.screenshot({ path: path.join(out, `${name}.png`), clip: { x: 0, y: 0, width: box.w, height: box.h } });
    const info = await pg.evaluate(() => {
      const sizes = new Set(); const over = [];
      document.querySelectorAll('body *').forEach((e) => {
        if ([...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) sizes.add(+(parseFloat(getComputedStyle(e).fontSize) * 0.75).toFixed(2));
        if (e.classList.contains('card') && (e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1)) over.push(e.id);
      });
      return { textPt: [...sizes].sort((a, b) => a - b), overflowingCards: over };
    });
    return { name, widthMm: +(box.w / MM).toFixed(1), heightMm: +(box.h / MM).toFixed(1), ...info, errors, pdf: path.join(out, `${name}.pdf`), png: path.join(out, `${name}.png`), html: outHtml };
  } finally {
    await browser.close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const flags = {}; const pos = [];
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) { if (a[i].startsWith('--')) flags[a[i].slice(2)] = a[++i]; else pos.push(a[i]); }
  if (!pos[0]) { console.error('usage: node build/build.mjs <page.html> [widthMm] [tokens.json] [--out dir] [--art dir]'); process.exit(2); }
  try {
    const r = await build({ page: pos[0], widthMm: pos[1], tokensFile: pos[2], outDir: flags.out, artDir: flags.art });
    console.log(JSON.stringify(r));
    if (r.errors.length) process.exitCode = 1;
  } catch (e) { console.error(String(e.message || e)); process.exit(1); }
}
