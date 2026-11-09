import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mulberry32 } from '../core/geo/index.ts';
import { ensureStudioServer, launch } from './browser.mjs';

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_DIR = path.resolve(TOOLS_DIR, '..');

let srv;
let browser;

before(async () => {
  srv = await ensureStudioServer({ studioDir: STUDIO_DIR });
  browser = await launch();
});

after(async () => {
  await browser?.close();
  await srv?.close();
});

test('opacity, x, and scale follow sample() across 50 seeded times', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  try {
    await page.goto(`${srv.url}/test/gsap.html`);
    await page.waitForFunction(() => typeof window.__gsapTest !== 'undefined');
    const rand = mulberry32(7);
    for (let i = 0; i < 50; i++) {
      const t = -1 + rand() * 6;
      const res = await page.evaluate((time) => {
        window.__gsapTest.set(time);
        const box = document.querySelector('[data-id="box"]');
        const mover = document.querySelector('[data-id="mover"]');
        const op = Number(getComputedStyle(box).opacity);
        const expOp = window.__gsapTest.sample(window.__gsapTest.tracks[0], time);
        const expX = window.__gsapTest.sample(window.__gsapTest.tracks[1], time);
        const expS = window.__gsapTest.sample(window.__gsapTest.tracks[2], time);
        const tf = mover.getAttribute('transform') || getComputedStyle(mover).transform;
        const nums = (tf.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) || []).map(Number);
        return { op, expOp, expX, expS, nums };
      }, t);
      assert.ok(Math.abs(res.op - res.expOp) < 1e-3, `opacity at t=${t}: ${res.op} vs ${res.expOp}`);
      assert.ok(Math.abs(res.nums[0] - res.expS) < 1e-3, `scale at t=${t}: ${res.nums[0]} vs ${res.expS}`);
      assert.ok(Math.abs(res.nums[4] - res.expX) < 1e-2, `x at t=${t}: ${res.nums[4]} vs ${res.expX}`);
    }
  } finally {
    await page.close();
  }
});

test('draw 0.5 shows half the stroke and seek back equals fresh', async () => {
  const pageA = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const pageB = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  try {
    await pageA.goto(`${srv.url}/test/gsap.html`);
    await pageA.waitForFunction(() => typeof window.__gsapTest !== 'undefined');
    const dash = await pageA.evaluate(() => {
      window.__gsapTest.set(0.5);
      const line = document.querySelector('[data-id="line"]');
      const raw = getComputedStyle(line).strokeDasharray || line.getAttribute('stroke-dasharray') || '0';
      return parseFloat(raw);
    });
    assert.ok(Math.abs(dash - 100) <= 1, `expected dash ~100 at t=0.5, got ${dash}`);

    await pageA.evaluate(() => {
      window.__gsapTest.set(3);
      window.__gsapTest.set(1);
    });
    const htmlA = await pageA.evaluate(() => window.__gsapTest.svg.outerHTML);

    await pageB.goto(`${srv.url}/test/gsap.html`);
    await pageB.waitForFunction(() => typeof window.__gsapTest !== 'undefined');
    await pageB.evaluate(() => window.__gsapTest.set(1));
    const htmlB = await pageB.evaluate(() => window.__gsapTest.svg.outerHTML);
    assert.equal(htmlA, htmlB);
  } finally {
    await pageA.close();
    await pageB.close();
  }
});
