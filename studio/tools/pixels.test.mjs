// Pixel tests of the live page. Needs `npm run build` and then `npm run preview` (127.0.0.1:4380) running.
// STUDIO_JOB picks the job (default zoom-test).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureStudioServer, launch } from './browser.mjs';
import { validateWorld } from '../core/world.ts';
import { cameraAt } from '../core/camera.ts';

const studio = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JOB = process.env.STUDIO_JOB ?? 'zoom-test';
let BASE = 'http://127.0.0.1:4380/';
const readJson = (...p) => JSON.parse(fs.readFileSync(path.join(studio, ...p), 'utf8'));
const jobJson = readJson('jobs', JOB, 'job.json');
const deckPath = jobJson.paths.find((p) => p.kind === 'deck');
const lang0 = jobJson.langs[0];
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

let srv;
let browser;
before(async () => {
  srv = await ensureStudioServer({ studioDir: studio, reuseExisting: true });
  BASE = `${srv.url}/`;
  browser = await launch();
});
after(async () => {
  await browser?.close();
  await srv?.close();
});

async function openPage(query = '') {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto(`${BASE}index.html?job=${JOB}${query}`);
  await page.evaluate(() => window.__studio.ready);
  return page;
}
const seek = (page, t) => page.evaluate((x) => window.__studio.seek(x), t);
const dataUrl = (page) => page.evaluate(() => document.querySelector('canvas').toDataURL());

test('browser launches with WebGL 2', async () => {
  const page = await browser.newPage();
  const ok = await page.evaluate(() => !!document.createElement('canvas').getContext('webgl2'));
  await page.close();
  assert.equal(ok, true);
});

test('stage is ready and reports the job stops', async () => {
  const page = await openPage();
  const stops = await page.evaluate(() => window.__studio.stops);
  const duration = await page.evaluate(() => window.__studio.duration);
  await page.close();
  assert.deepEqual(stops, deckPath.stops);
  assert.equal(duration, jobJson.world.duration);
});

test('same t gives the same pixels', async () => {
  const page = await openPage();
  await seek(page, 2.0);
  const a = sha(await dataUrl(page));
  await seek(page, 2.0);
  const b = sha(await dataUrl(page));
  await page.close();
  assert.equal(a, b);
});

test('seek back gives the fresh-page pixels', async () => {
  const pageA = await openPage();
  await seek(pageA, 6);
  await seek(pageA, 1);
  const a = sha(await dataUrl(pageA));
  await pageA.close();
  const pageB = await openPage();
  await seek(pageB, 1);
  const b = sha(await dataUrl(pageB));
  await pageB.close();
  assert.equal(a, b);
});

test('no frame is blank across the zoom', async () => {
  // The reference is the empty stage with the same lens: the backdrop alone. A frame is blank when 2% or less of its pixels differ from it.
  const refPage = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await refPage.goto(`${BASE}index.html?job=stage-test&lens=${jobJson.lens}`);
  await refPage.evaluate(() => window.__studio.ready);
  await refPage.evaluate(() => window.__studio.seek(0));
  const refUrl = await dataUrl(refPage);
  await refPage.close();

  const page = await openPage();
  await page.evaluate(async (url) => {
    const img = new Image();
    img.src = url;
    await img.decode();
    const o = document.createElement('canvas');
    o.width = img.width;
    o.height = img.height;
    const x = o.getContext('2d');
    x.drawImage(img, 0, 0);
    window.__ref = x.getImageData(0, 0, o.width, o.height).data;
  }, refUrl);
  const duration = jobJson.world.duration;
  const blank = [];
  for (let i = 0; i <= 60; i++) {
    const t = (duration * i) / 60;
    await seek(page, t);
    const ratio = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      const o = document.createElement('canvas');
      o.width = c.width;
      o.height = c.height;
      const x = o.getContext('2d');
      x.drawImage(c, 0, 0);
      const d = x.getImageData(0, 0, o.width, o.height).data;
      const ref = window.__ref;
      let n = 0;
      for (let k = 0; k < d.length; k += 4) {
        if (Math.abs(d[k] - ref[k]) > 4 || Math.abs(d[k + 1] - ref[k + 1]) > 4 || Math.abs(d[k + 2] - ref[k + 2]) > 4) n++;
      }
      return n / (o.width * o.height);
    });
    if (!(ratio > 0.02)) blank.push(`t=${t.toFixed(2)} (${(ratio * 100).toFixed(3)}%)`);
  }
  await page.close();
  assert.deepEqual(blank, [], `frames with 2% or less of their pixels off the empty stage: ${blank.join(', ')}`);
});

test('stand-in fades in, never pops', async () => {
  const standObj = jobJson.world.objects.find((o) => o.standIn);
  assert.ok(standObj, 'the job has no object with a standIn');
  const swapAt = standObj.standIn.swapAt;
  const v = validateWorld(jobJson.world);
  assert.equal(v.ok, true);
  const world = v.world;
  const wanted = [swapAt / 2, swapAt, swapAt * 2];
  const keys = deckPath.keys;
  let pair = null;
  for (let i = 0; i + 1 < keys.length && !pair; i++) {
    const d0 = cameraAt(world, deckPath, keys[i].t).distance;
    const d1 = cameraAt(world, deckPath, keys[i + 1].t).distance;
    if (Math.min(d0, d1) <= wanted[0] && Math.max(d0, d1) >= wanted[2]) pair = [i, d0, d1];
  }
  assert.ok(pair, 'stand-in distances not reached');
  const [i, d0, d1] = pair;
  const timeAt = (D) => {
    // bisection on the segment; the distance moves one way along it
    let lo = keys[i].t;
    let hi = keys[i + 1].t;
    for (let n = 0; n < 60; n++) {
      const mid = (lo + hi) / 2;
      const d = cameraAt(world, deckPath, mid).distance;
      if (d0 > d1 ? d > D : d < D) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  const page = await openPage();
  const dt = 1 / 30;
  for (const D of wanted) {
    const t = timeAt(D);
    const change = await page.evaluate(
      async ([t0, t1]) => {
        const grab = () => {
          const c = document.querySelector('canvas');
          const o = document.createElement('canvas');
          o.width = c.width;
          o.height = c.height;
          const x = o.getContext('2d');
          x.drawImage(c, 0, 0);
          return x.getImageData(0, 0, o.width, o.height).data;
        };
        await window.__studio.seek(t0);
        const a = grab();
        await window.__studio.seek(t1);
        const b = grab();
        let sum = 0;
        for (let k = 0; k < a.length; k += 4) {
          sum += Math.max(Math.abs(a[k] - b[k]), Math.abs(a[k + 1] - b[k + 1]), Math.abs(a[k + 2] - b[k + 2])) / 255;
        }
        return sum / (a.length / 4);
      },
      [t - dt, t + dt],
    );
    assert.ok(change < 0.25, `pixel change ${change} around distance ${D} (t=${t})`);
  }
  await page.close();
});

test('bad job id shows an error', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(`${BASE}index.html?job=Bad_ID!`);
  await page.waitForFunction(() => document.body.innerText.includes('bad job id'));
  const studioDefined = await page.evaluate(() => typeof window.__studio !== 'undefined');
  await page.close();
  assert.equal(studioDefined, false);
});

test('layout blocks carry data-block', async () => {
  const page = await openPage();
  for (let s = 0; s < deckPath.stops.length; s++) {
    await seek(page, deckPath.stops[s]);
    const want = jobJson.layout.filter((l) => l.stop === s && l.lang === lang0).flatMap((l) => l.blocks);
    for (const b of want) {
      const found = await page.evaluate((id) => document.querySelectorAll(`[data-block="${id}"]`).length, b.id);
      assert.equal(found, 1, `block ${b.id} of stop ${s}`);
    }
  }
  await page.close();
});

test('block text sizes follow the role ladder', async () => {
  const page = await openPage();
  const px = { title: '51px', label: '42px', note: '37px' };
  const want = jobJson.layout.filter((l) => l.stop === 0 && l.lang === lang0).flatMap((l) => l.blocks);
  assert.ok(want.length > 0);
  for (const b of want) {
    const size = await page.evaluate((id) => getComputedStyle(document.querySelector(`[data-block="${id}"]`)).fontSize, b.id);
    assert.equal(size, px[b.role], `block ${b.id} (${b.role})`);
  }
  await page.close();
});
