import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureStudioServer, launch } from './browser.mjs';
import { readEdits } from './edits-store.mjs';
import { SHIPPED_LENSES } from '../core/lenses.ts';

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_DIR = path.resolve(TOOLS_DIR, '..');
const EDIT_JOB_DIR = path.join(STUDIO_DIR, 'jobs', 'edit-test');

let srv;
let browser;
let page;

before(async () => {
  fs.rmSync(EDIT_JOB_DIR, { recursive: true, force: true });
  fs.cpSync(path.join(STUDIO_DIR, 'jobs', 'zoom-test'), EDIT_JOB_DIR, { recursive: true });
  // Set lens to journal so role list test checks SHIPPED_LENSES.journal.roles
  const jobJson = JSON.parse(fs.readFileSync(path.join(EDIT_JOB_DIR, 'job.json'), 'utf8'));
  jobJson.lens = 'journal';
  fs.writeFileSync(path.join(EDIT_JOB_DIR, 'job.json'), JSON.stringify(jobJson, null, 2));

  srv = await ensureStudioServer({ studioDir: STUDIO_DIR });
  browser = await launch();
  page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
});

after(async () => {
  await browser?.close();
  await srv?.close();
  fs.rmSync(EDIT_JOB_DIR, { recursive: true, force: true });
});

beforeEach(async () => {
  fs.rmSync(path.join(EDIT_JOB_DIR, 'edits.jsonl'), { force: true });
  await page.goto(`${srv.url}/index.html?job=edit-test&edit=1`);
  await page.evaluate(() => window.__studio.ready);
});

test('changing a title writes one edit and shows it', async () => {
  await page.mouse.click(250, 800);
  const textInput = page.locator('[data-editor-inspector] input[data-field="text"]');
  await textInput.fill('Hello');
  await textInput.press('Enter');
  await page.waitForTimeout(150);

  const edits = readEdits(EDIT_JOB_DIR);
  assert.equal(edits.length, 1);
  assert.equal(edits[0].op, 'set');
  assert.equal(edits[0].path, '/layout/0/blocks/0/text');
  assert.equal(edits[0].value, 'Hello');

  const domText = await page.locator('[data-block="s01-title"]').textContent();
  assert.equal(domText, 'Hello');

  await page.reload();
  await page.evaluate(() => window.__studio.ready);
  const afterReload = await page.locator('[data-block="s01-title"]').textContent();
  assert.equal(afterReload, 'Hello');
});

test('layout row changes a block box', async () => {
  await page.mouse.click(250, 800);
  const hInput = page.locator('[data-editor-inspector] input[data-field="h"]');
  const oldH = Number(await hInput.inputValue());
  const newH = oldH + 6;
  await hInput.fill(String(newH));
  await hInput.press('Enter');
  await page.waitForTimeout(150);

  const edits = readEdits(EDIT_JOB_DIR);
  assert.equal(edits.length, 1);
  assert.equal(edits[0].path, '/layout/0/blocks/0/box');
  assert.equal(edits[0].value[3], newH);

  const boxH = await page.locator('[data-block="s01-title"]').evaluate((el) => parseFloat(el.style.height));
  assert.equal(boxH, newH);

  await page.reload();
  await page.evaluate(() => window.__studio.ready);
  const reloadH = await page.locator('[data-block="s01-title"]').evaluate((el) => parseFloat(el.style.height));
  assert.equal(reloadH, newH);
});

test('layout row changes block text', async () => {
  await page.mouse.click(250, 800);
  const textInput = page.locator('[data-editor-inspector] input[data-field="text"]');
  await textInput.fill('Hello');
  await textInput.press('Enter');
  await page.waitForTimeout(150);

  const edits = readEdits(EDIT_JOB_DIR);
  assert.equal(edits.length, 1);
  assert.equal(edits[0].path, '/layout/0/blocks/0/text');
});

test('a box outside the safe area is refused', async () => {
  await page.mouse.click(250, 800);
  const xInput = page.locator('[data-editor-inspector] input[data-field="x"]');
  await xInput.fill('1900');
  await xInput.press('Enter');
  await page.waitForTimeout(100);

  const errText = await page.locator('[data-editor-error]').textContent();
  assert.ok(errText && errText.length > 0, 'expected safe-area validation error in inspector');
  assert.equal(readEdits(EDIT_JOB_DIR).length, 0);
});

test('role list holds only the lens roles', async () => {
  await page.evaluate(() => window.__studio.seek(8));
  const pt = await page.evaluate(() => window.__studio.project({ frame: 'nano', pos: [16, 0, 0] }));
  await page.mouse.click(pt[0], pt[1]);

  const opts = await page
    .locator('[data-editor-inspector] select[data-field="role"] option')
    .evaluateAll((els) => els.map((e) => e.value));
  assert.deepEqual(opts, Object.keys(SHIPPED_LENSES.journal.roles));
});

test('a size of zero is refused and nothing is saved', async () => {
  await page.evaluate(() => window.__studio.seek(8));
  const pt = await page.evaluate(() => window.__studio.project({ frame: 'nano', pos: [16, 0, 0] }));
  await page.mouse.click(pt[0], pt[1]);

  const sizeInput = page.locator('[data-editor-inspector] input[data-field="size"]');
  await sizeInput.fill('0');
  await sizeInput.press('Enter');
  await page.waitForTimeout(100);

  const errText = await page.locator('[data-editor-error]').textContent();
  assert.ok(errText && errText.length > 0);
  assert.equal(readEdits(EDIT_JOB_DIR).length, 0);
});

test('Ctrl+Z undoes the last edit', async () => {
  const origTitle = await page.locator('[data-block="s01-title"]').textContent();
  await page.mouse.click(250, 800);
  const textInput = page.locator('[data-editor-inspector] input[data-field="text"]');
  await textInput.fill('Hello');
  await textInput.press('Enter');
  await page.waitForTimeout(150);
  assert.equal(await page.locator('[data-block="s01-title"]').textContent(), 'Hello');

  await page.keyboard.press('Control+z');
  await page.waitForTimeout(150);
  assert.equal(await page.locator('[data-block="s01-title"]').textContent(), origTitle);
  assert.equal(readEdits(EDIT_JOB_DIR).length, 0);
});

test('bad job name is refused', async () => {
  const res = await fetch(`${srv.url}/__edits/..%2Fx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'e-1', at: '2026-10-31T00:00:00Z', by: 'the owner', op: 'set', path: '/lens', value: 'journal' }),
  });
  assert.equal(res.status, 400);
});
