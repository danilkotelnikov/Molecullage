import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureStudioServer, launch } from './browser.mjs';

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_DIR = path.resolve(TOOLS_DIR, '..');

let srv;
let browser;
let page;

before(async () => {
  srv = await ensureStudioServer({ studioDir: STUDIO_DIR });
  browser = await launch();
  page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto(`${srv.url}/index.html?job=vector-test`);
  await page.evaluate(() => window.__studio.ready);
});

after(async () => {
  await browser?.close();
  await srv?.close();
});

test('clicking the title picks its block', async () => {
  await page.evaluate(() => window.__studio.seek(0));
  const hit = await page.evaluate(() => window.__studio.pickAt(250, 800));
  assert.deepEqual(hit, { kind: 'block', id: 's01-title' });
});

test('clicking the arrow picks the vector', async () => {
  await page.evaluate(() => window.__studio.seek(2));
  const hit = await page.evaluate(() => window.__studio.pickAt(200, 200));
  assert.deepEqual(hit, { kind: 'vector', id: 'v-arrow' });
});

test('clicking the antibody picks the world object', async () => {
  await page.evaluate(() => window.__studio.seek(8));
  const pt = await page.evaluate(() => window.__studio.project({ frame: 'nano', pos: [16, 0, 0] }));
  assert.ok(pt, 'expected projected point for igg');
  const hit = await page.evaluate(([x, y]) => window.__studio.pickAt(x, y), pt);
  assert.deepEqual(hit, { kind: 'world', id: 'igg' });
});

test('empty space picks nothing', async () => {
  await page.evaluate(() => window.__studio.seek(0));
  const hit = await page.evaluate(() => window.__studio.pickAt(20, 20));
  assert.equal(hit, null);
});
