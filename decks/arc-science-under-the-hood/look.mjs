// One frame per scene: node look.mjs deck.html outdir key:step,key:step [w h]
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { chromium } = require('playwright-core');
const [file, out, list, w = 1440, h = 900] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });


let p = await b.newPage({ viewport: { width: +w, height: +h }, colorScheme: 'dark' }); await p.goto('file:///' + file + '#1', { timeout: 60000 }); await p.waitForTimeout(800);
const idx = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('.slide')].map((s, i) => [s.dataset.k, i + 1])));
for (const it of list.split(',')) {
  const [k, n] = it.split(':');
  await p.close(); p = await b.newPage({ viewport: { width: +w, height: +h }, colorScheme: 'dark' }); p.on('pageerror', (e) => console.log('pageerror', e.message));
  await p.goto('file:///' + file + '#' + idx[k], { timeout: 60000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => { gsap.ticker.lagSmoothing(0); document.querySelectorAll('[data-film]').forEach((s) => s.removeAttribute('data-film')); });
  for (let j = 1; j < +n; j++) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150); }
  await p.waitForTimeout(+process.env.WAIT || 3800);
  await p.screenshot({ path: `${out}/${k}-${n}.png` });
}
await b.close();
