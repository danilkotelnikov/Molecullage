import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureStudioServer, launch } from './browser.mjs';
import { checkPage } from './checks.mjs';

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

test('flat arrow draws on over its keys and same t gives the same SVG', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  try {
    await page.goto(`${srv.url}/index.html?job=vector-test`);
    await page.evaluate(() => window.__studio.ready);

    const getDash = async (t) =>
      page.evaluate(async (time) => {
        await window.__studio.seek(time);
        const el = document.querySelector('[data-id="v-arrow"]');
        const raw = getComputedStyle(el).strokeDasharray || el.getAttribute('stroke-dasharray') || '0';
        const m = raw.match(/-?\d+(?:\.\d+)?/);
        return m ? Number(m[0]) : 0;
      }, t);

    const d1 = await getDash(1);
    const d15 = await getDash(1.5);
    const d2 = await getDash(2);
    assert.ok(Math.abs(d1 - 0) <= 1, `at t=1 expected ~0, got ${d1}`);
    assert.ok(Math.abs(d15 - 112) <= 1, `at t=1.5 expected ~112, got ${d15}`);
    assert.ok(Math.abs(d2 - 224) <= 1, `at t=2 expected ~224, got ${d2}`);

    await page.evaluate(() => window.__studio.seek(1.7));
    const svgA = await page.evaluate(() => document.querySelector('[data-vectors]').outerHTML);
    await page.evaluate(() => window.__studio.seek(1.7));
    const svgB = await page.evaluate(() => document.querySelector('[data-vectors]').outerHTML);
    assert.equal(svgA, svgB);
  } finally {
    await page.close();
  }
});

test('label follows its frame through the zoom and hides behind the camera', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  try {
    await page.goto(`${srv.url}/index.html?job=vector-test`);
    await page.evaluate(() => window.__studio.ready);

    for (let i = 0; i < 20; i++) {
      const t = (8 * i) / 19;
      const dist = await page.evaluate(async (time) => {
        await window.__studio.seek(time);
        const p = window.__studio.project({ frame: 'nano', pos: [0, 0, 0] });
        const el = document.querySelector('[data-id="igg-name"]');
        const cx = Number(el.dataset.baseX);
        const cy = Number(el.dataset.baseY);
        // box is [0, 20, 240, 48] -> box centre offset is (120, 44)
        return Math.hypot(cx - (p[0] + 120), cy - (p[1] + 44));
      }, t);
      assert.ok(dist < 2, `at t=${t}, distance was ${dist}`);
    }

    // At t = 11 the camera has passed the nano origin [0,0,0]
    const displayAt11 = await page.evaluate(async () => {
      await window.__studio.seek(11);
      const el = document.querySelector('[data-id="igg-name"]');
      return el.style.display;
    });
    assert.equal(displayAt11, 'none');
  } finally {
    await page.close();
  }
});

test('Russian label draws and is measured by checkPage', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  try {
    await page.goto(`${srv.url}/index.html?job=vector-test&lang=ru`);
    await page.evaluate(() => window.__studio.ready);
    await page.evaluate(() => window.__studio.seek(0));

    const text = await page.evaluate(() => document.querySelector('[data-id="v-title"]')?.textContent);
    assert.equal(text, 'Векторный слой');
    const findings = await checkPage(page);
    assert.equal(findings.filter((f) => f.id === 'v-title').length, 0);

    // Shrink boxW to 10px to verify overflow finding
    await page.evaluate(() => {
      const el = document.querySelector('[data-id="v-title"]');
      el.dataset.boxW = '10';
    });
    const narrowFindings = await checkPage(page);
    assert.ok(narrowFindings.some((f) => f.kind === 'overflow' && f.id === 'v-title'));
  } finally {
    await page.close();
  }
});
