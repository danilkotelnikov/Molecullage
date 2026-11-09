import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DRAFT } from '../bake.ts';
import { isBig, type Job } from '../job.ts';

const zoomJobRaw = JSON.parse(
  fs.readFileSync(new URL('../../jobs/zoom-test/job.json', import.meta.url), 'utf8'),
) as Job;

describe('isBig (Plan 6 Task 6)', () => {
  it('seven stops make a job big, six do not', () => {
    const six = structuredClone(zoomJobRaw);
    six.paths[0].stops = [0, 1, 2, 3, 4, 5];
    assert.equal(isBig(six), false);

    const seven = structuredClone(zoomJobRaw);
    seven.paths[0].stops = [0, 1, 2, 3, 4, 5, 6];
    assert.equal(isBig(seven), true);
  });

  it('a baked shot makes a job big', () => {
    const baked = structuredClone(zoomJobRaw);
    baked.shots = [{ id: 's1', path: 'deck', t0: 0, t1: 2, fps: 30, render: 'baked', settings: DRAFT }];
    assert.equal(isBig(baked), true);

    const live = structuredClone(zoomJobRaw);
    live.shots = [{ id: 's1', path: 'deck', t0: 0, t1: 2, fps: 30, render: 'live', settings: DRAFT }];
    assert.equal(isBig(live), false);
  });
});
