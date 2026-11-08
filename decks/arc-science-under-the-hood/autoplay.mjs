// Autoplay and pause test: node autoplay.mjs deck.html   (deck built with NO3D=1, slides m3 and m4 only)
// Time runs 12 times faster through gsap.globalTimeline.timeScale, so a 10 s wait is 0.8 s of real time.
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { chromium } = require('playwright-core');
const [file] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
let fails = 0;
const ok = (name, cond, info = '') => { console.log(cond ? 'PASS' : 'FAIL', name, info); if (!cond) fails++; };
const pos = () => p.evaluate(() => `${cur}:${step}`);
const label = () => p.evaluate(() => document.querySelector('#play').textContent);
const wait = (s) => p.waitForTimeout(s * 1000 / 12);   // s seconds of deck time

await p.goto('file:///' + file + '#2', { timeout: 60000 }); await p.waitForTimeout(800);
await p.evaluate(() => { gsap.globalTimeline.timeScale(12); });
const film = await p.evaluate(() => slides[cur].hasAttribute('data-film'));
ok('start slide is a film slide', film);

// 1. A film slide plays itself until the user pauses.
const a = await pos(); await wait(14);
const b1 = await pos();
ok('film slide advances on its own', a !== b1, `${a} -> ${b1}`);

// 2. Pause holds, on a film slide too.
await p.click('#play');   // the button reads Pause while the slide is playing itself
const lab = await label();
await p.waitForTimeout(100);
const held = await pos(); await wait(40);
ok('pause holds the position', held === await pos(), `${held} -> ${await pos()}`);
ok('button then reads Play', lab === 'Play', `label ${lab}`);

// 3. Play resumes from there.
await p.click('#play'); await wait(14);
ok('play resumes', held !== await pos(), `${held} -> ${await pos()}`);
ok('button then reads Pause', (await label()) === 'Pause');

// 4. A transition in flight never kills autoplay: press Next, then see it move on again.
await p.keyboard.press('ArrowLeft'); await wait(40);
const m = await pos(); await wait(20);
ok('autoplay survives a manual step', m !== await pos(), `${m} -> ${await pos()}`);

// 5. Fast stepping leaves one timer.
for (let i = 0; i < 6; i++) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(30); }
await p.waitForTimeout(400);
const n = await p.evaluate(() => gsap.globalTimeline.getChildren(true, false, true).filter((t) => t.data === 'auto' || t._cb).length);
ok('no pile of timers after fast stepping', n <= 6, `delayed calls ${n}`);

// 6. A slide with an input holds autoplay while the viewer types (slide key CAMMUT only when present).
const hasInput = await p.evaluate(() => !!document.querySelector('.slide input[data-hold], .slide textarea[data-hold]'));
if (hasInput) {
  await p.evaluate(() => { const i = document.querySelector('.slide input[data-hold], .slide textarea[data-hold]'); go([...slides].indexOf(i.closest('.slide'))); });
  await wait(5);
  await p.focus('.slide.on input[data-hold], .slide.on textarea[data-hold]'); const h = await pos(); await wait(60);
  ok('typing holds autoplay', h === await pos(), `${h} -> ${await pos()}`);
}
ok('no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));
await b.close();
process.exit(fails ? 1 : 0);
