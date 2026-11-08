// Tests of the deck module: the manifest checker, the virtual clock and the schedule (no browser), then one frame-exactness
// test in headless Chromium: the same video time must draw the same pixels, however the deck got there.
//   npm run deck:test            (add --no-browser to skip the Chromium part)
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createClock, schedule, stops, pathAt, progress, ease } from './runtime/timeline.mjs';
import { resolve, parseTarget } from './manifest.mjs';
import { slideHtml } from './layouts.mjs';
import { buildDeck } from './build.mjs';
import { findPdb } from './mol.mjs';
import { REPO } from '../build/config.mjs';

let n = 0;
const t = (name, fn) => { fn(); n++; console.log(`pass  ${name}`); };

// ---- virtual clock
t('clock: advance, set, play to a target', () => {
  const c = createClock();
  assert.equal(c.advance(16.5), 16.5);
  c.set(100); assert.equal(c.t, 100);
  c.play(200, 500);
  assert.equal(c.tick(100), true); assert.equal(c.t, 300);
  assert.equal(c.tick(250), false); assert.equal(c.t, 500);   // stops exactly at the target, never past it
  assert.equal(c.running(), false);
  assert.equal(c.tick(100), false); assert.equal(c.t, 500);
});

t('clock: the same deltas give the same time, in any grouping', () => {
  const a = createClock(), b = createClock();
  for (let i = 0; i < 60; i++) a.advance(1000 / 60);
  b.advance(500); b.advance(500);
  assert.ok(Math.abs(a.t - b.t) < 1e-9);
});

t('progress and easing are pure and clamped', () => {
  assert.equal(progress(0, 100, 500), 0);
  assert.equal(progress(350, 100, 500), 0.5);
  assert.equal(progress(9999, 100, 500), 1);
  assert.equal(progress(50, 100, 0), 0);
  assert.equal(ease('smooth', 0.5), 0.5);
  assert.equal(ease('out', 2), 1);
});

t('schedule: slides, transitions and the lookup of a video time', () => {
  const s = schedule([{ duration: 1000, transition: null }, { duration: 2000, transition: { kind: 'fade', ms: 500 } }, { duration: 1000, transition: { kind: 'none', ms: 500 } }]);
  assert.equal(s.total, 1000 + 500 + 2000 + 1000);                      // a "none" transition takes no time
  assert.deepEqual(s.locate(0), { kind: 'slide', i: 0, t: 0 });
  assert.deepEqual(s.locate(999), { kind: 'slide', i: 0, t: 999 });
  const mid = s.locate(1250);
  assert.equal(mid.kind, 'tr'); assert.equal(mid.i, 0); assert.equal(mid.j, 1); assert.equal(mid.p, 0.5);
  assert.deepEqual(s.locate(1500), { kind: 'slide', i: 1, t: 0 });
  assert.equal(s.startOf(2), 3500);
  assert.equal(s.locate(1e9).i, 2);                                      // past the end: the last slide
  assert.equal(s.frames(30), 135);
});

t('stops: stop 0 is the entrance, stop k the build of step k', () => {
  assert.deepEqual(stops([{ at: 900, dur: 500 }, { at: 1600, dur: 500 }], 600), [{ start: 0, end: 600 }, { start: 900, end: 1400 }, { start: 1600, end: 2100 }]);
});

t('camera path: held before and after, smooth between', () => {
  const path = [{ t: 0, view: [0, 0, 0, 100], yaw: 0 }, { t: 1000, view: [10, 0, 0, 50], yaw: 90, ease: 'linear' }];
  assert.deepEqual(pathAt(path, -5).view, [0, 0, 0, 100]);
  assert.equal(pathAt(path, 500).yaw, 45);
  assert.deepEqual(pathAt(path, 500).view, [5, 0, 0, 75]);
  assert.equal(pathAt(path, 5000).yaw, 90);
});

// ---- manifest
const good = () => ({
  title: 'T', audience: 'cloud', duration: 4000,
  scenes: { s1: { kind: 'webgl', pdb: '1MEL', motion: 'pocket', target: 'A:99-122,130;L:30', duration: 3000 } },
  slides: [
    { layout: 'title', title: 'Hello' },
    { layout: 'two-column', title: 'Two', left: { type: 'list', build: true, items: ['a', 'b', 'c'] }, right: 'text' },
    { layout: 'molecule', title: 'Mol', scene: 's1', bullets: { build: true, items: ['x', 'y'] } },
    { layout: 'number', title: 'N', items: [{ value: '5', label: 'five' }, { value: '7', label: 'seven' }] },
    { layout: 'table', title: 'Tb', columns: ['a', 'b'], rows: [['1', '2'], ['3', '4']], build: true },
    { layout: 'cards', title: 'Cd', items: [{ title: 'A', text: 'one', chip: 'in code', kind: 'ok' }, { title: 'B', text: 'two' }] },
  ],
});

t('manifest: a good deck resolves, with ids, steps and times', () => {
  const r = resolve(good());
  assert.deepEqual(r.errors, []);
  const [title, two, mol, num, tb, cd] = r.deck.slides;
  assert.equal(title.id, 's1');
  assert.equal(two.steps.length, 3);
  assert.ok(two.steps.every((s, k) => k === 0 || s.at > two.steps[k - 1].at), 'step times increase');
  assert.ok(two.duration >= two.steps[2].at + two.steps[2].dur);
  assert.equal(mol.steps.length, 2);
  assert.ok(mol.steps[0].at >= mol.mols[0].at + mol.mols[0].dur, 'bullets wait for an auto-playing scene');
  assert.equal(num.steps.length, 2);
  assert.equal(tb.rowSteps.length, 2);
  assert.equal(cd.steps.length, 2);
  assert.equal(r.deck.accent, 'indigo');
});

t('manifest: the checker finds the faults', () => {
  const bad = (edit) => { const m = good(); edit(m); return resolve(m).errors.join(' | '); };
  assert.match(bad((m) => { m.slides[0].layout = 'poster'; }), /layout "poster"/);
  assert.match(bad((m) => { m.slides[2].scene = 'nope'; }), /scene/);
  assert.match(bad((m) => { m.scenes.s1.target = 'A:x'; }), /target/);
  assert.match(bad((m) => { m.scenes.s1.pdb = 'not a pdb'; }), /pdb/);
  assert.match(bad((m) => { m.scenes.s1.motion = 'morph'; }), /second structure/);
  assert.match(bad((m) => { m.slides[3].items = Array(5).fill({ value: '1' }); }), /at most 4/);
  assert.match(bad((m) => { m.slides[5].items = [{ title: 'only' }]; }), /2 to 6/);
  assert.match(bad((m) => { m.slides[5].items[0].kind = 'huge'; }), /kind/);
  assert.match(bad((m) => { m.slides[4].rows[1] = ['only one']; }), /row 2/);
  assert.match(bad((m) => { m.slides[1].timing = [100, 200]; }), /timing/);
  assert.match(bad((m) => { m.slides[0].id = m.slides[1].id = 'same'; }), /twice/);
  assert.match(bad((m) => { m.slides[1].transition = { kind: 'spin' }; }), /transition/);
  assert.match(bad((m) => { m.audience = 'nobody'; }), /audience/);
  assert.match(bad((m) => { m.size = [1280, 720]; }), /1920/);
  assert.match(bad((m) => { m.slides[1].left = { type: 'image', src: 'http://x/y.png', alt: 'a' }; }), /relative/);
  assert.match(bad((m) => { m.slides = []; }), /slides/);
});

t('manifest: an audience flag changes the accent and drops the slides of others', () => {
  const m = good(); m.slides[3].only = ['academic'];
  const a = resolve(m, { audience: 'academic' }), c = resolve(m, { audience: 'cloud' });
  assert.equal(a.deck.accent, 'maroon');
  assert.equal(a.deck.slides.length, 6);
  assert.equal(c.deck.slides.length, 5);
  assert.deepEqual(resolve(m).errors, []);                               // resolving does not change the input
  assert.equal(m.slides[3].only[0], 'academic');
});

t('manifest: a too-short duration is extended and said so', () => {
  const m = good(); m.slides[1].duration = 1000;
  const r = resolve(m);
  assert.ok(r.deck.slides[1].duration > 1000);
  assert.ok(r.warnings.some((w) => /too short/.test(w)));
});

t('manifest: an svg block takes steps in order and its own timeline ends the entrance', () => {
  const m = good();
  m.slides.push({ layout: 'figure', title: 'Drawing', figure: { type: 'svg', src: 'a.svg', steps: 3, ms: 9000 } });
  const r = resolve(m), s = r.deck.slides[6];
  assert.deepEqual(r.errors, []);
  assert.deepEqual(s.figure.stepNums, [1, 2, 3]);
  assert.equal(s.steps.length, 3);
  assert.equal(s.end0, 9000);                                           // the drawing plays on entry
  assert.ok(s.steps[0].at >= 9000, 'builds wait for the drawing');
  m.slides[6].figure.src = 'a.png';
  assert.match(resolve(m).errors.join(' | '), /svg/);
});

t('layouts: a card shows its picture and chip; an svg takes images of the deck folder and nothing else', () => {
  const r = resolve(good()), cd = r.deck.slides[5];
  const ctx = { deck: r.deck, asset: (x) => `data:image/png;base64,${x.length}`, text: () => '<svg viewBox="0 0 9 9"><image href="img/a.png" width="9" height="9"/></svg>', scene: () => null };
  const html = slideHtml({ ...cd, items: cd.items.map((it) => ({ ...it, src: 'img/a.png' })) }, 5, ctx);
  assert.match(html, /class="chip ok"/);
  assert.match(html, /<img src="data:image\/png;base64,9"/);
  const m = good(); m.slides.push({ layout: 'figure', title: 'D', figure: { type: 'svg', src: 'a.svg' } });
  const sv = resolve(m).deck.slides[6];
  assert.match(slideHtml(sv, 6, ctx), /<image href="data:image\/png;base64,9"/);
  assert.throws(() => slideHtml(sv, 6, { ...ctx, text: () => '<svg><image href="http://x/y.png"/></svg>' }), /not a plain SVG/);
  assert.throws(() => slideHtml(sv, 6, { ...ctx, text: () => '<svg><a href="img/x.html"/></svg>' }), /not a plain SVG/);
});

t('page: a raster page reveals regions in order, an svg page takes steps, the counter is engine text and the claim line is not', () => {
  const m = good();
  m.slides.push({ layout: 'page', page: 'pages/01.png', alt: 'A', reveal: [{ rect: [0, 0, 0.5, 0.5] }, { rect: [0.5, 0, 0.5, 1] }] });
  m.slides.push({ layout: 'page', page: 'pages/02.svg', steps: 2, ms: 4000 });
  m.slides.push({ layout: 'page', page: 'pages/03.png' });
  const r = resolve(m); assert.deepEqual(r.errors, []);
  const [a, b, c] = r.deck.slides.slice(-3), ctx = { deck: r.deck, asset: () => 'data:image/png;base64,0', text: () => '<svg viewBox="0 0 16 9"><g data-s="1"/><g data-s="2"/></svg>', scene: () => null };
  assert.deepEqual(a.reveal.map((x) => x.step), [1, 2]);
  const ha = slideHtml(a, 6, ctx);
  assert.equal((ha.match(/<image /g) || []).length, 1);                        // the picture is in the page once
  assert.equal((ha.match(/<use /g) || []).length, 3);                          // used for the rest of the page and each region
  assert.match(ha, /<use href="#pg6" clip-path="url\(#pg6c2\)" data-step="2"/);
  assert.match(ha, /class="pgn">7 \//); assert.ok(!/class="foot"/.test(ha));
  assert.match(slideHtml(b, 7, ctx), /data-step="2" data-effect="fade"/);
  assert.match(slideHtml(c, 8, ctx), /<img class="pgimg" src="data:image\/png;base64,0"/);
  m.slides.push({ layout: 'page', page: 'x.pdf' }); m.slides.push({ layout: 'page', page: 'a.png', reveal: [{ rect: [0.6, 0, 0.6, 1] }] });
  assert.equal(resolve(m).errors.length, 2);
  m.slides.length -= 2; m.counter = false;
  assert.ok(!/class="pgn"/.test(slideHtml(resolve(m).deck.slides.at(-1), 8, { ...ctx, deck: resolve(m).deck })));
});

t('target syntax', () => {
  assert.deepEqual(parseTarget('A:99-122,130;L:30'), [{ chain: 'A', ranges: [[99, 122], [130, 130]] }, { chain: 'L', ranges: [[30, 30]] }]);
  assert.throws(() => parseTarget('A:99-'));
});

t('build: traversal path in local structure is rejected', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-sec-'));
  const deckDir = path.join(root, 'deck');
  const outside = path.join(root, 'deck-secrets');
  fs.mkdirSync(deckDir, { recursive: true });
  fs.mkdirSync(outside, { recursive: true });
  fs.writeFileSync(path.join(outside, 'x.pdb'), 'ATOM\n');
  try {
    assert.throws(() => findPdb(deckDir, '../deck-secrets/x.pdb'), /outside the deck folder/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

t('build: default output dir is dist and .cif keeps cif format', () => {
  const root = path.join(REPO, 'tmp', `deck-cif-${Date.now()}`);
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, 'mol.cif'), 'data_x\n#\n');
  fs.writeFileSync(path.join(root, 'deck.json'), JSON.stringify({
    title: 'CIF',
    scenes: { s1: { kind: 'webgl', pdb: 'mol.cif', motion: 'rotate' } },
    slides: [{ layout: 'molecule', title: 'Mol', scene: 's1' }],
  }, null, 2));
  try {
    const b = buildDeck(root, { log: () => {} });
    assert.equal(b.outDir, path.join(root, 'dist'));
    assert.equal(b.scenes.s1.pdbFormat, 'cif');
    assert.match(b.scenes.s1.pdbText, /data_x/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

t('build: traversal path in slide assets is rejected', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-asset-'));
  const deckDir = path.join(root, 'deck');
  const outside = path.join(root, 'deck-secrets');
  fs.mkdirSync(deckDir, { recursive: true });
  fs.mkdirSync(outside, { recursive: true });
  fs.writeFileSync(path.join(outside, 'x.png'), 'not-a-real-png');
  fs.writeFileSync(path.join(deckDir, 'deck.json'), JSON.stringify({
    title: 'Asset',
    slides: [{ layout: 'figure', title: 'A', figure: { type: 'image', src: '../deck-secrets/x.png', alt: 'x' } }],
  }, null, 2));
  try {
    assert.throws(() => buildDeck(deckDir, { log: () => {} }), /outside the deck folder/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// ---- the page: the same time draws the same pixels
if (!process.argv.includes('--no-browser')) {
  const { withDeck } = await import('./export.mjs');
  const b = buildDeck(path.join(REPO, 'examples', 'deck-layouts'), { out: path.join(REPO, 'tmp', 'deck-test'), log: () => {} });
  const hash = (buf) => crypto.createHash('sha1').update(buf).digest('hex');
  await withDeck(b.file, async (page) => {
    const clip = { x: 0, y: 0, width: 1920, height: 1080 };
    const draw = async (g) => { const sig = await page.evaluate(async (g) => { const s = DECK.seekGlobal(g); await DECK.ready(); return s; }, g); return { sig, px: hash(await page.screenshot({ clip })) }; };
    const times = [1200, 13400, 22500, 31000, 41200];   // inside a build, a number count, a table, a transition, a 3D path
    const first = [];
    for (const g of times) first.push(await draw(g));
    await draw(0); await draw(39000);                      // go elsewhere
    for (let k = times.length - 1; k >= 0; k--) {          // come back in the opposite order
      const again = await draw(times[k]);
      assert.deepEqual(again, first[k], `video time ${times[k]} ms drew different pixels the second time`);
    }
    assert.notEqual(first[0].px, first[1].px);
    const same = await draw(times[0]);
    assert.equal(same.sig, first[0].sig);
    n++; console.log('pass  page: the same video time draws the same pixels, in any order of visits');
  });
}
console.log(`\n${n} checks passed.`);
