import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
  await page.goto(`${srv.url}/index.html?job=zoom-test`);
  await page.evaluate(() => window.__studio.ready);
});

after(async () => {
  await browser?.close();
  await srv?.close();
});

function parseGlbJson(base64) {
  const buf = Buffer.from(base64, 'base64');
  const magic = buf.subarray(0, 4).toString('ascii');
  const version = buf.readUInt32LE(4);
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  return { buf, magic, version, json };
}

test('snapshot is a valid glb', async () => {
  const snap = await page.evaluate(() => window.__studio.snapshot(0));
  const { magic, version } = parseGlbJson(snap.glbBase64);
  assert.equal(magic, 'glTF');
  assert.equal(version, 2);
});

test('camera json carries background and sensor', async () => {
  const jobJson = JSON.parse(fs.readFileSync(path.join(STUDIO_DIR, 'jobs', 'zoom-test', 'job.json'), 'utf8'));
  const lensJson = JSON.parse(fs.readFileSync(path.join(STUDIO_DIR, 'lenses', `${jobJson.lens}.json`), 'utf8'));
  const snap = await page.evaluate(() => window.__studio.snapshot(0));
  assert.equal(snap.camera.background, lensJson.background);
  assert.deepEqual(snap.camera.sensorMm, [36, 24]);
});

test('export rescales the target to distance 1', async () => {
  const snap = await page.evaluate(() => window.__studio.snapshot(8));
  const { json } = parseGlbJson(snap.glbBase64);
  const iggNode = (json.nodes ?? []).find((n) => n.name === 'igg');
  assert.ok(iggNode, 'expected node named igg');
  const tr = iggNode.translation ?? [0, 0, 0];
  const len = Math.hypot(tr[0], tr[1], tr[2]);
  assert.ok(Math.abs(len - 1) < 1e-3, `expected translation length ~1, got ${len}`);
  const expectedScale = 1 / 3e-8;
  assert.ok(
    Math.abs(snap.camera.exportScale - expectedScale) / expectedScale < 0.001,
    `expected exportScale ~${expectedScale}, got ${snap.camera.exportScale}`,
  );
});

test('hidden stand-ins are left out', async () => {
  const snap = await page.evaluate(() => window.__studio.snapshot(8));
  const { json } = parseGlbJson(snap.glbBase64);
  const standIn = (json.nodes ?? []).find((n) => n.name === 'igg:standIn');
  assert.equal(standIn, undefined);
});

test('same t gives the same glb', async () => {
  const a = await page.evaluate(() => window.__studio.snapshot(2));
  const b = await page.evaluate(() => window.__studio.snapshot(2));
  assert.equal(a.glbBase64, b.glbBase64);
});
