import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDeckController } from '../../web/deck.ts';
import type { Job } from '../job.ts';
import { checkJob } from '../../tools/checks.mjs';
import { buildExportPlan } from '../../tools/export.mjs';

function makeTestJob(): Job {
  return {
    world: {
      id: 'zoom-test',
      duration: 12,
      frames: [
        { id: 'bench', parent: null, unit: 1e-3, origin: [0, 0, 0] },
        { id: 'nano', parent: 'bench', unit: 1e-9, origin: [0, 0, 0] },
      ],
      objects: [
        {
          id: 'igg',
          kind: 'molecule',
          frame: 'nano',
          position: [0, 0, 0],
          size: 1e-8,
          source: { kind: 'pdb', ref: '1IGT' },
          evidence: 'published',
          window: [0, 12],
          roles: ['antibody'],
          asset: 'igg.glb',
          standIn: { asset: 'builtin:sphere', swapAt: 2e-7 },
        },
      ],
    },
    timeline: {
      tracks: [
        {
          target: 'igg',
          prop: 'opacity',
          keys: [
            { t: 0, v: 0.5 },
            { t: 6, v: 0.8 },
            { t: 12, v: 1 },
          ],
        },
      ],
    },
    paths: [
      {
        id: 'deck',
        kind: 'deck',
        stops: [0, 4, 8],
        keys: [
          { t: 0, at: { frame: 'bench', pos: [0, 0, 50] }, target: { frame: 'bench', pos: [0, 0, 0] }, fov: 40 },
          { t: 4, at: { frame: 'nano', pos: [0, 0, 200] }, target: { frame: 'nano', pos: [0, 0, 0] }, fov: 40 },
          { t: 8, at: { frame: 'nano', pos: [0, 0, 30] }, target: { frame: 'nano', pos: [0, 0, 0] }, fov: 40 },
        ],
      },
    ],
    lens: 'journal',
    langs: ['en', 'ru'],
    layout: [
      {
        stop: 0,
        lang: 'en',
        blocks: [{ id: 's00-title', role: 'title', text: 'Bench view', box: [96, 820, 900, 100] }],
      },
      {
        stop: 0,
        lang: 'ru',
        blocks: [{ id: 's00-title', role: 'title', text: 'Вид на пробирку', box: [96, 820, 900, 100] }],
      },
      {
        stop: 1,
        lang: 'en',
        blocks: [{ id: 's01-title', role: 'title', text: 'Inside liquid', box: [96, 820, 900, 100] }],
      },
      {
        stop: 1,
        lang: 'ru',
        blocks: [{ id: 's01-title', role: 'title', text: 'Внутри жидкости', box: [96, 820, 900, 100] }],
      },
      {
        stop: 2,
        lang: 'en',
        blocks: [{ id: 's02-title', role: 'title', text: 'Antibody coat', box: [96, 820, 900, 100] }],
      },
      {
        stop: 2,
        lang: 'ru',
        blocks: [{ id: 's02-title', role: 'title', text: 'Оболочка антител', box: [96, 820, 900, 100] }],
      },
    ],
    notes: {
      0: { en: 'First stop note', ru: 'Заметка к первому слайду' },
    },
  };
}

test('createDeckController steps beats and handles ArrowRight, ArrowLeft, Space, and L', () => {
  const ctrl = createDeckController(makeTestJob());
  assert.equal(ctrl.stopIndex, 0);
  assert.equal(ctrl.t(), 0);
  assert.equal(ctrl.lang, 'en');

  // ArrowRight steps to stop 1 (t = 4)
  ctrl.onKey('ArrowRight');
  assert.equal(ctrl.stopIndex, 1);
  assert.equal(ctrl.t(), 4);

  // Space advances and toggles play state
  ctrl.onKey(' ');
  assert.equal(ctrl.stopIndex, 2);
  assert.equal(ctrl.t(), 8);
  assert.equal(ctrl.playing, true);

  // Next at final stop clamps to last stop
  ctrl.next();
  assert.equal(ctrl.stopIndex, 2);
  assert.equal(ctrl.t(), 8);

  // ArrowLeft steps back to stop 1, then stop 0, and clamps at 0
  ctrl.onKey('ArrowLeft');
  assert.equal(ctrl.stopIndex, 1);
  assert.equal(ctrl.t(), 4);
  ctrl.prev();
  assert.equal(ctrl.stopIndex, 0);
  ctrl.prev();
  assert.equal(ctrl.stopIndex, 0);

  // Language switch
  ctrl.onKey('L');
  assert.equal(ctrl.lang, 'ru');
  ctrl.onKey('l');
  assert.equal(ctrl.lang, 'en');
});

test('createDeckController supports frame seeking and viewport resize', () => {
  const ctrl = createDeckController(makeTestJob());
  const st = ctrl.seekFrame(150, 30); // 150 / 30 = 5.0 s -> stopIndex 1 (stop at t=4)
  assert.equal(st.t, 5);
  assert.equal(st.stopIndex, 1);

  const clamped = ctrl.seek(999);
  assert.equal(clamped.t, 12);
  assert.equal(clamped.stopIndex, 2);

  const fit = ctrl.resize(960, 540);
  assert.equal(fit.scale, 0.5);
  assert.equal(fit.offsetX, 0);
  assert.equal(fit.offsetY, 0);
  assert.ok(fit.transform.includes('scale(0.5)'));
});

test('checkJob accepts a clean job and flags frame-bounds, timeline-monotonicity, camera-distance, and asset-path issues', () => {
  const clean = checkJob(makeTestJob());
  assert.equal(clean.ok, true, clean.errors.join('\n'));
  assert.equal(clean.findings.length, 0);

  const bad = makeTestJob();
  // 1. Frame bounds violation: layout block outside 1920x1080 safe area
  bad.layout[0].blocks[0].box = [10, 10, 2000, 100];
  // 2. Timeline monotonicity violation: non-increasing track keys
  bad.timeline.tracks[0].keys = [
    { t: 5, v: 0 },
    { t: 2, v: 1 },
  ];
  // 3. Camera distance violation: camera at target (distance 0)
  bad.paths[0].keys[0].at = { frame: 'bench', pos: [0, 0, 0] };
  // 4. Asset path traversal violation
  bad.world.objects[0].asset = '../secret.glb';

  const report = checkJob(bad);
  assert.equal(report.ok, false);
  const kinds = new Set(report.findings.map((f: { kind: string }) => f.kind));
  assert.ok(kinds.has('frame-bounds'), `expected frame-bounds in ${[...kinds].join(',')}`);
  assert.ok(kinds.has('timeline-monotonicity'), `expected timeline-monotonicity in ${[...kinds].join(',')}`);
  assert.ok(kinds.has('camera-distance'), `expected camera-distance in ${[...kinds].join(',')}`);
  assert.ok(kinds.has('asset-path'), `expected asset-path in ${[...kinds].join(',')}`);
});

test('buildExportPlan builds png, svg, and mp4 frame plans and worker slices', () => {
  const job = makeTestJob();
  const mp4Plan = buildExportPlan(job, {
    jobId: 'zoom-test',
    format: ['mp4', 'png', 'svg'],
    lens: 'cinematic',
    lang: 'ru',
    fps: 10,
    workers: 2,
  });

  assert.equal(mp4Plan.frameCount, 120);
  assert.equal(mp4Plan.frames.length, 120);
  assert.equal(mp4Plan.workerSlices.length, 2);
  assert.equal(mp4Plan.workerSlices[0].frames.length, 60);
  assert.equal(mp4Plan.workerSlices[1].frames.length, 60);
  assert.equal(mp4Plan.stops.length, 3);
  assert.ok(mp4Plan.query.includes('lens=cinematic&lang=ru&path=deck'));
  assert.ok(mp4Plan.outputs.mp4?.endsWith('zoom-test-cinematic-ru.mp4'));
  assert.ok(mp4Plan.outputs.svgDir?.includes('zoom-test-cinematic-ru'));
  assert.ok(mp4Plan.ffmpegArgs.includes('libx264'));

  assert.throws(() => buildExportPlan(job, { format: 'gif' as any }), /unsupported export format/);
});

