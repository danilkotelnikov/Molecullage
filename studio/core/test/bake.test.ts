import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  DRAFT,
  FINAL,
  bakeKey,
  frameAt,
  frameCount,
  framePath,
  frameUrl,
  overBudget,
  shotAt,
  type Shot,
} from '../bake.ts';
import { loadJob, type Job } from '../job.ts';
import { SHIPPED_LENSES } from '../lenses.ts';

const zoomJobRaw = JSON.parse(
  fs.readFileSync(new URL('../../jobs/zoom-test/job.json', import.meta.url), 'utf8'),
) as Job;

describe('bake (Plan 3 Task 1)', () => {
  it('frameAt clamps at the shot edges', () => {
    const shot: Shot = {
      id: 's1',
      path: 'deck',
      t0: 2,
      t1: 4,
      fps: 30,
      render: 'baked',
      settings: DRAFT,
    };
    assert.equal(frameCount(shot), 61);
    assert.equal(frameAt(shot, 2), 0);
    assert.equal(frameAt(shot, 4), 60);
    assert.equal(frameAt(shot, 1), 0);
    assert.equal(frameAt(shot, 9), 60);
    assert.equal(frameAt(shot, 2.0166), 0);
    assert.equal(frameAt(shot, 2.0167), 1);
  });

  it('shotAt finds the shot or null', () => {
    const s1: Shot = { id: 's1', path: 'deck', t0: 0, t1: 2, fps: 30, render: 'baked', settings: DRAFT };
    const s2: Shot = { id: 's2', path: 'deck', t0: 5, t1: 6, fps: 30, render: 'baked', settings: DRAFT };
    const job: Job = { ...structuredClone(zoomJobRaw), shots: [s1, s2] };
    assert.equal(shotAt(job, 'deck', 3), null);
    assert.deepEqual(shotAt(job, 'deck', 5), s2);
  });

  it('key changes only with its inputs', () => {
    const shot: Shot = { id: 's1', path: 'deck', t0: 0, t1: 2, fps: 30, render: 'baked', settings: DRAFT };
    const job1: Job = { ...structuredClone(zoomJobRaw), shots: [shot] };
    const lens1 = structuredClone(SHIPPED_LENSES.journal);
    const kBase = bakeKey(job1, lens1, shot, 0);
    assert.equal(bakeKey(job1, lens1, shot, 0), kBase);

    const jobMoved = structuredClone(job1);
    jobMoved.world.objects[0].position = [1, 2, 3];
    assert.notEqual(bakeKey(jobMoved, lens1, shot, 0), kBase);

    const lensBg = structuredClone(lens1);
    lensBg.background = '#123456';
    assert.notEqual(bakeKey(job1, lensBg, shot, 0), kBase);

    const shotSamples: Shot = { ...shot, settings: { ...DRAFT, samples: 64 } };
    assert.notEqual(bakeKey(job1, lens1, shotSamples, 0), kBase);
    assert.notEqual(bakeKey(job1, lens1, shot, 1), kBase);

    const jobReordered = structuredClone(job1);
    const f0 = jobReordered.world.frames[0];
    jobReordered.world.frames[0] = {
      unit: f0.unit,
      origin: f0.origin,
      parent: f0.parent,
      id: f0.id,
    };
    assert.equal(bakeKey(jobReordered, lens1, shot, 0), kBase);
  });

  it('framePath pads the frame and frameUrl is relative', () => {
    assert.equal(framePath('zoom-test', 's1', 7), 'studio/cache/zoom-test/s1/00007.png');
    assert.equal(frameUrl('zoom-test', 's1', 7), 'cache/zoom-test/s1/00007.png');
    assert.equal(frameUrl('zoom-test', 's1', 7).startsWith('/'), false);
  });

  it('FINAL and DRAFT values', () => {
    assert.deepEqual(DRAFT, { width: 960, height: 540, samples: 16, denoise: true, device: 'GPU' });
    assert.deepEqual(FINAL, { width: 1920, height: 1080, samples: 256, denoise: true, device: 'GPU' });
  });

  it('overlapping shots are rejected while touching shots pass', () => {
    const sA: Shot = { id: 'a', path: 'deck', t0: 0, t1: 1.5, fps: 30, render: 'baked', settings: DRAFT };
    const sB: Shot = { id: 'b', path: 'deck', t0: 1.0, t1: 2.0, fps: 30, render: 'baked', settings: DRAFT };
    const bad = loadJob({ ...structuredClone(zoomJobRaw), shots: [sA, sB] }, SHIPPED_LENSES);
    assert.equal(bad.ok, false);
    if (!bad.ok) {
      assert.ok(bad.errors.some((e) => e.includes('shots "a" and "b" overlap')));
    }

    const sTouch1: Shot = { id: 'a', path: 'deck', t0: 0, t1: 1, fps: 30, render: 'baked', settings: DRAFT };
    const sTouch2: Shot = { id: 'b', path: 'deck', t0: 1, t1: 2, fps: 30, render: 'baked', settings: DRAFT };
    const good = loadJob({ ...structuredClone(zoomJobRaw), shots: [sTouch1, sTouch2] }, SHIPPED_LENSES);
    assert.equal(good.ok, true);
  });

  it('overBudget checks 1.5x threshold', () => {
    assert.equal(overBudget(15, 10), false);
    assert.equal(overBudget(15.01, 10), true);
  });
});
