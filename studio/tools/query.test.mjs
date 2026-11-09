import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

test('rejects a bad job id', async () => {
  const badIds = ['../x', 'Zoom', 'a'.repeat(41)];
  for (const bad of badIds) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const fetched = [];
    page.on('request', (req) => {
      const u = req.url();
      if (u.includes('/jobs/') || u.includes('/lenses/') || u.includes('/cache/')) {
        fetched.push(u);
      }
    });
    await page.goto(`${srv.url}/index.html?job=${encodeURIComponent(bad)}`);
    const msg = await page.locator('#message').textContent();
    assert.equal(msg, 'bad job id');
    assert.deepEqual(fetched, []);
    await page.close();
  }
});

test('a valid query still loads', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(`${srv.url}/index.html?job=zoom-test&lens=cinematic&lang=ru`);
  await page.evaluate(() => window.__studio.ready);
  const stops = await page.evaluate(() => window.__studio.stops);
  assert.equal(stops.length, 3);
  const titleText = await page.locator('[data-block="s01-title"]').textContent();
  assert.match(titleText ?? '', /[А-Яа-яЁё]/);
  await page.close();
});
