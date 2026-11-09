import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureStudioServer, launch } from './browser.mjs';
import { readEdits } from './edits-store.mjs';
import { applyEdits } from '../core/edits.ts';
import { SHIPPED_LENSES } from '../core/lenses.ts';

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_DIR = path.resolve(TOOLS_DIR, '..');
const CAM_JOB_DIR = path.join(STUDIO_DIR, 'jobs', 'camera-test');

let srv;
let browser;
let page;

before(async () => {
  fs.rmSync(CAM_JOB_DIR, { recursive: true, force: true });
  fs.cpSync(path.join(STUDIO_DIR, 'jobs', 'zoom-test'), CAM_JOB_DIR, { recursive: true });
  srv = await ensureStudioServer({ studioDir: STUDIO_DIR });
  browser = await launch();
  page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
});

after(async () => {
  await browser?.close();
  await srv?.close();
  fs.rmSync(CAM_JOB_DIR, { recursive: true, force: true });
});

beforeEach(async () => {
  fs.rmSync(path.join(CAM_JOB_DIR, 'edits.jsonl'), { force: true });
  await page.goto(`${srv.url}/index.html?job=camera-test&edit=1`);
  await page.evaluate(() => window.__studio.ready);
});

async function canvasPixels(p) {
  return p.evaluate(() => {
    const src = document.getElementById('c');
    const c = document.createElement('canvas');
    c.width = 192;
    c.height = 108;
    const g = c.getContext('2d');
    g.drawImage(src, 0, 0, c.width, c.height);
    return Array.from(g.getImageData(0, 0, c.width, c.height).data);
  });
}

function meanDiff(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i += 4) {
    sum +=
      Math.abs(a[i] - b[i]) +
      Math.abs(a[i + 1] - b[i + 1]) +
      Math.abs(a[i + 2] - b[i + 2]);
  }
  return sum / ((a.length / 4) * 3 * 255);
}

test('free camera does not change the job', async () => {
  await page.evaluate(() => window.__studio.seek(4));
  const beforeImg = await canvasPixels(page);

  await page.keyboard.press('c');
  await page.mouse.move(960, 540);
  await page.mouse.down();
  await page.mouse.move(1100, 460, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.press('c');
  await page.waitForTimeout(100);

  assert.equal(readEdits(CAM_JOB_DIR).length, 0);
  const afterImg = await canvasPixels(page);
  assert.ok(meanDiff(beforeImg, afterImg) < 0.002);
});

test('save shot inserts a sorted camera key', async () => {
  await page.evaluate(() => window.__studio.seek(5));
  await page.locator('button[data-save-shot]').click();
  await page.waitForTimeout(150);

  const edits = readEdits(CAM_JOB_DIR);
  assert.equal(edits.length, 1);
  assert.equal(edits[0].op, 'add');
  assert.equal(edits[0].path, '/paths/0/keys/2');

  const baseJob = JSON.parse(fs.readFileSync(path.join(CAM_JOB_DIR, 'job.json'), 'utf8'));
  const updated = applyEdits(baseJob, edits, SHIPPED_LENSES);
  const times = updated.paths[0].keys.map((k) => k.t);
  assert.deepEqual(times, [0, 4, 5, 8]);
});

test('save shot on an existing key time sets it', async () => {
  await page.evaluate(() => window.__studio.seek(4));
  await page.locator('button[data-save-shot]').click();
  await page.waitForTimeout(150);

  const edits = readEdits(CAM_JOB_DIR);
  assert.equal(edits.length, 1);
  assert.equal(edits[0].op, 'set');
  assert.equal(edits[0].path, '/paths/0/keys/1');
});

test('the saved shot plays back', async () => {
  await page.evaluate(() => window.__studio.seek(5));
  await page.keyboard.press('c');
  await page.mouse.move(960, 540);
  await page.mouse.down();
  await page.mouse.move(1120, 480, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(50);

  const freeImg = await canvasPixels(page);
  await page.locator('button[data-save-shot]').click();
  await page.waitForTimeout(150);

  await page.reload();
  await page.evaluate(() => window.__studio.ready);
  await page.evaluate(() => window.__studio.seek(5));
  const replayImg = await canvasPixels(page);
  const diff = meanDiff(freeImg, replayImg);
  assert.ok(diff < 0.01, `expected mean pixel difference < 0.01, got ${diff}`);
});
