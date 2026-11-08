// Walk every step of every schematic slide; report overlap of the caption, bad selectors, forbidden words; save frames.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { chromium } = require('playwright-core');
const [file, out, only] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const log = []; log.push = (...a) => { a.forEach((x) => console.log(x)); return Array.prototype.push.apply(log, a); };   // every line is printed as it happens, so a crash keeps the log
for (const [w, h, tag] of [[1440, 900, 'd'], [390, 844, 'm']].filter((v) => !process.env.VIEWS || process.env.VIEWS.includes(v[2]))) {   // VIEWS=d walks the desktop only
  const p = await b.newPage({ viewport: { width: w, height: h }, colorScheme: 'dark' }); p.setDefaultNavigationTimeout(180000); p.setDefaultTimeout(180000);
  p.on('pageerror', (e) => log.push(tag + ' pageerror ' + e.message)); p.on('console', (m) => m.type() === 'error' && log.push(tag + ' console ' + m.text()));
  await p.goto(pathToFileURL(path.resolve(file)).href + '#1'); await p.waitForTimeout(1200);
  const keys = await p.evaluate(() => [...document.querySelectorAll('.slide')].map((s, i) => [i + 1, s.dataset.k, (window.STEPS[s.dataset.k] || []).length]).filter((x) => x[2]));
  for (const [i, k, n] of keys) {
    if (only && !only.split(',').includes(k)) continue;
    await p.goto(pathToFileURL(path.resolve(file)).href + '#1'); await p.waitForTimeout(300);
    await p.goto(pathToFileURL(path.resolve(file)).href + '#' + i); await p.reload();
    await p.evaluate(() => { hold = true; if (autoT) { autoT.kill(); autoT = null; } });   // a film slide must not play itself away during the walk
    await p.waitForTimeout(1500);
    for (let j = 0; j < n; j++) {
      if (j) await p.keyboard.press('ArrowRight');
      await p.waitForTimeout(3200);
      const r = await p.evaluate((j) => {
        const s = document.querySelector('.slide.on'), st = window.STEPS[s.dataset.k][j], o = {};
        o.match = st.on === '*' ? -1 : s.querySelectorAll(st.on).length;
        o.words = st.cap.split(/\s+/).length; o.bad = ['·', '?', 'not yet', 'developing', 'arc-harness'].filter((x) => st.cap.includes(x));
        const c = document.querySelector('#stepcap').getBoundingClientRect(); o.capH = Math.round(c.height);
        o.hit = [...s.querySelectorAll('text, h2, p, li, span, b')].filter((e) => e.textContent.trim() && e.getClientRects().length && getComputedStyle(e).opacity !== '0').map((e) => { let r = e.getBoundingClientRect(); const v = e.ownerSVGElement; if (v && getComputedStyle(v).overflow === 'hidden') { const b = v.getBoundingClientRect(); r = { left: Math.max(r.left, b.left), right: Math.min(r.right, b.right), top: Math.max(r.top, b.top), bottom: Math.min(r.bottom, b.bottom) }; r.width = r.right - r.left; if (r.bottom <= r.top) r.width = 0; } return [e, r]; })
          .filter(([, r]) => r.left < c.right && r.right > c.left && r.top < c.bottom && r.bottom > c.top && r.width > 0).map(([e]) => e.textContent.trim().slice(0, 24)).slice(0, 3);
        o.spill = [...s.querySelectorAll('.pk')].filter((g) => getComputedStyle(g).opacity !== '0' && !(innerWidth < 760 && g.closest('svg.dg'))).map((g) => g.getBoundingClientRect()).filter((r) => r.width && (r.right > innerWidth || r.left < 0 || r.bottom > innerHeight)).length;
        // BLEED: something of another slide is visible. A child with visibility:visible shows through a hidden slide; use inherit.
        o.bleed = [...document.querySelectorAll('.slide:not(.on) *')].filter((e) => e.getClientRects().length && getComputedStyle(e).visibility === 'visible' && getComputedStyle(e).opacity !== '0' && ((e.children.length === 0 && e.textContent.trim()) || e.tagName === 'CANVAS' || e.tagName === 'IMG')).length;
        return o; }, j);
      const line = `${tag} ${k} step ${j + 1}/${n}: match ${r.match} words ${r.words} capH ${r.capH}` + (r.hit.length ? ' OVERLAP ' + r.hit.join('|') : '') + (r.bad.length ? ' FORBIDDEN ' + r.bad : '') + (r.spill ? ' PKSPILL' : '') + (r.bleed ? ' BLEED ' + r.bleed : '') + (r.match === 0 ? ' NOMATCH' : '') + (r.words > 16 ? ' LONG' : '');
      log.push(line);
      await p.screenshot({ path: `${out}/${tag}-${k}-${j + 1}.png` });
    }
  }
  await p.close();
}
await b.close();
