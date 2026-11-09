import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { frameUrl } from '../core/bake.ts';
import { runBake } from './bake.mjs';
import { ensureStudioServer, launch } from './browser.mjs';
import { checkPage } from './checks.mjs';

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_DIR = path.resolve(TOOLS_DIR, '..');

let srv;
let browser;

before(async () => {
  runBake({ jobId: 'bake-test', shotId: 's-test', studioDir: STUDIO_DIR, fakeSeconds: 0.02 });
  srv = await ensureStudioServer({ studioDir: STUDIO_DIR });
  browser = await launch();
});

after(async () => {
  runBake({ jobId: 'bake-test', shotId: 's-test', studioDir: STUDIO_DIR, fakeSeconds: 0.02 });
  await browser?.close();
  await srv?.close();
});

test('baked t shows the baked frame and edge of shot clamps cleanly', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  try {
    await page.goto(`${srv.url}/index.html?job=bake-test`);
    await page.evaluate(() => window.__studio.ready);

    await page.evaluate(() => window.__studio.seek(2.1));
    assert.equal(await page.evaluate(() => window.__studio.mode()), 'baked');
    const src1 = await page.evaluate(() => document.querySelector('img[data-baked]')?.getAttribute('src'));
    assert.equal(src1, 'cache/bake-test/s-test/00001.png');

    await page.evaluate(() => window.__studio.seek(2.0));
    assert.equal(await page.evaluate(() => window.__studio.mode()), 'baked');
    assert.equal(
      await page.evaluate(() => document.querySelector('img[data-baked]')?.getAttribute('src')),
      'cache/bake-test/s-test/00000.png',
    );

    await page.evaluate(() => window.__studio.seek(2.2));
    assert.equal(await page.evaluate(() => window.__studio.mode()), 'baked');
    assert.equal(
      await page.evaluate(() => document.querySelector('img[data-baked]')?.getAttribute('src')),
      'cache/bake-test/s-test/00002.png',
    );

    await page.evaluate(() => window.__studio.seek(2.2001));
    assert.equal(await page.evaluate(() => window.__studio.mode()), 'live');
  } finally {
    await page.close();
  }
});

test('frames are served through /cache/', async () => {
  assert.equal(frameUrl('bake-test', 's-test', 1), 'cache/bake-test/s-test/00001.png');
  const res = await fetch(`${srv.url}/cache/bake-test/s-test/00001.png`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'image/png');
  const diskBytes = fs.readFileSync(path.join(STUDIO_DIR, 'cache', 'bake-test', 's-test', '00001.png'));
  const netBytes = Buffer.from(await res.arrayBuffer());
  assert.equal(
    crypto.createHash('sha256').update(netBytes).digest('hex'),
    crypto.createHash('sha256').update(diskBytes).digest('hex'),
  );
});

test('missing frame falls back to live and is reported by checkPage', async () => {
  const f1 = path.join(STUDIO_DIR, 'cache', 'bake-test', 's-test', '00001.png');
  const backup = fs.readFileSync(f1);
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  try {
    fs.rmSync(f1, { force: true });
    await page.goto(`${srv.url}/index.html?job=bake-test`);
    await page.evaluate(() => window.__studio.ready);
    await page.evaluate(() => window.__studio.seek(2.1));
    assert.equal(await page.evaluate(() => window.__studio.mode()), 'live');
    const findings = await checkPage(page);
    assert.ok(findings.some((f) => f.kind === 'missing-bake' && f.detail === 's-test frame 1'));
  } finally {
    fs.writeFileSync(f1, backup);
    await page.close();
  }
});
