// Whole-deck smoke test in about a minute: node smoke.mjs deck.html
// Goes to every slide, runs its steps at high speed, and reports page errors and BLEED (something of another slide stays visible).
// It does not replace steps.mjs (overlap, caption length, frames); it catches faults that only appear in the whole deck.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { chromium } = require('playwright-core');
const file = process.argv[2];
if (!file) { console.log('usage: node smoke.mjs deck.html'); process.exit(2); }
const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
const errs = [];
p.on('pageerror', (e) => errs.push('pageerror ' + e.message.slice(0, 200)));
p.on('console', (m) => m.type() === 'error' && errs.push('console ' + m.text().slice(0, 200)));
await p.goto(pathToFileURL(path.resolve(file)).href + '#1', { timeout: 120000 }); await p.waitForTimeout(1500);
await p.evaluate(() => { hold = true; if (autoT) { autoT.kill(); autoT = null; } gsap.globalTimeline.timeScale(12); });
const keys = await p.evaluate(() => [...slides].map((s) => s.dataset.k));
const bleedJs = () => [...document.querySelectorAll('.slide:not(.on) *')].filter((e) => e.getClientRects().length && getComputedStyle(e).visibility === 'visible' && getComputedStyle(e).opacity !== '0' && ((e.children.length === 0 && e.textContent.trim()) || e.tagName === 'CANVAS' || e.tagName === 'IMG')).map((e) => (e.closest('.slide') || {}).dataset?.k + ':' + e.textContent.trim().slice(0, 20));
let bad = 0;
for (let i = 0; i < keys.length; i++) {
  const before = errs.length;
  let active = '';
  for (let tries = 0; tries < 60 && active !== keys[i]; tries++) {   // go() is ignored while a transition runs: ask again until the slide is open
    if (tries % 8 === 0) await p.evaluate((i) => go(i), i);
    await p.waitForTimeout(250);
    active = await p.evaluate(() => (document.querySelector('.slide.on') || { dataset: {} }).dataset.k);
  }
  await p.waitForTimeout(500);
  const n = await p.evaluate((k) => (window.STEPS[k] || []).length, keys[i]);
  const first = await p.evaluate(bleedJs);
  for (let j = 1; j < n; j++) {
    await p.keyboard.press('ArrowRight');
    for (let w = 0; w < 30 && (await p.evaluate(() => step)) < j; w++) await p.waitForTimeout(100);   // wait until the step has advanced
  }
  await p.waitForTimeout(500);
  const last = await p.evaluate(bleedJs);
  const at = await p.evaluate(() => step);
  const here = errs.slice(before);
  const lost = active !== keys[i] || (n > 1 && at !== n - 1);   // the slide did not open, or the keys did not walk its steps
  const flag = first.length || last.length || here.length || lost;
  bad += flag ? 1 : 0;
  console.log((flag ? 'FLAG ' : 'ok   ') + String(i + 1).padStart(2) + ' ' + keys[i].padEnd(8) + ' steps ' + n + (first.length ? ' BLEED@first ' + first.slice(0, 3).join('|') : '') + (last.length ? ' BLEED@last ' + last.slice(0, 3).join('|') : '') + (lost ? ' NOT-REACHED ' + active + ':' + at : '') + (here.length ? ' ' + here.slice(0, 2).join(' | ') : ''));
}
console.log(bad ? `${bad} slides flagged` : 'smoke: all slides clean', '| errors total', errs.length);
await b.close();
process.exit(bad || errs.length ? 1 : 0);   // a page error at load time fails the run too
