import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureStudioServer, launch } from './browser.mjs';
import { readEdits } from './edits-store.mjs';

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_DIR = path.resolve(TOOLS_DIR, '..');
const TL_JOB_DIR = path.join(STUDIO_DIR, 'jobs', 'timeline-test');

let srv;
let browser;
let page;

before(async () => {
  fs.rmSync(TL_JOB_DIR, { recursive: true, force: true });
  fs.cpSync(path.join(STUDIO_DIR, 'jobs', 'zoom-test'), TL_JOB_DIR, { recursive: true });
  srv = await ensureStudioServer({ studioDir: STUDIO_DIR });
  browser = await launch();
  page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
});

after(async () => {
  await browser?.close();
  await srv?.close();
  fs.rmSync(TL_JOB_DIR, { recursive: true, force: true });
});

beforeEach(async () => {
  fs.rmSync(path.join(TL_JOB_DIR, 'edits.jsonl'), { force: true });
  await page.goto(`${srv.url}/index.html?job=timeline-test&edit=1`);
  await page.evaluate(() => window.__studio.ready);
});

test('one row per track', async () => {
  const jobJson = JSON.parse(fs.readFileSync(path.join(TL_JOB_DIR, 'job.json'), 'utf8'));
  const rows = await page.locator('[data-track-row]').count();
  assert.equal(rows, jobJson.timeline.tracks.length);
});

test('drag 60 px right retimes by 0.6 s', async () => {
  const dot = page.locator('[data-track="0"][data-key="1"]');
  const box = await dot.boundingBox();
  assert.ok(box);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 60, cy);
  await page.mouse.up();
  await page.waitForTimeout(150);

  const edits = readEdits(TL_JOB_DIR);
  assert.equal(edits.length, 1);
  assert.equal(edits[0].op, 'retime');
  assert.equal(edits[0].path, '/timeline/tracks/0/keys/1');
  assert.ok(Math.abs(edits[0].value - 8.6) < 1e-6);
});

test('drag past the next key is refused', async () => {
  const dot = page.locator('[data-track="0"][data-key="0"]');
  const box = await dot.boundingBox();
  assert.ok(box);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 900, cy);
  await page.mouse.up();
  await page.waitForTimeout(100);

  const errText = await page.locator('[data-timeline-error]').textContent();
  assert.ok(errText && errText.length > 0);
  const leftStyle = await dot.evaluate((el) => el.style.left);
  assert.equal(leftStyle, '0px');
  assert.equal(readEdits(TL_JOB_DIR).length, 0);
});

test('clicking the ruler seeks', async () => {
  const ruler = page.locator('[data-timeline-ruler]');
  const box = await ruler.boundingBox();
  assert.ok(box);
  await page.mouse.click(box.x + 250, box.y + box.height / 2);
  await page.waitForTimeout(100);

  const playheadLeft = await page.locator('[data-playhead]').evaluate((el) => parseFloat(el.style.left));
  assert.ok(Math.abs(playheadLeft - 258) < 2, `expected playhead near 258px, got ${playheadLeft}`);
});
