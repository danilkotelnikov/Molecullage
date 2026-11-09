import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { applyEdits, diffJobs, getAt, undo, type Edit } from '../edits.ts';
import { loadJob, type Job } from '../job.ts';
import { SHIPPED_LENSES } from '../lenses.ts';

const zoomJobRaw = JSON.parse(
  fs.readFileSync(new URL('../../jobs/zoom-test/job.json', import.meta.url), 'utf8'),
) as Job;

describe('edits (Plan 5 Task 1)', () => {
  it('set changes a title without mutating input', () => {
    const input = structuredClone(zoomJobRaw);
    const snapshot = structuredClone(zoomJobRaw);
    const edit: Edit = {
      id: 'e1',
      at: '2026-10-31T00:00:00Z',
      by: 'the owner',
      op: 'set',
      path: '/layout/0/blocks/0/text',
      value: 'Tube',
    };
    const res = applyEdits(input, [edit]);
    assert.equal(res.layout[0].blocks[0].text, 'Tube');
    assert.deepEqual(input, snapshot);
  });

  it('add appends an object', () => {
    const input = structuredClone(zoomJobRaw);
    const edit: Edit = {
      id: 'e2',
      at: '2026-10-31T00:00:00Z',
      by: 'the owner',
      op: 'add',
      path: '/world/objects/-',
      value: {
        id: 'gold-sphere',
        kind: 'mesh',
        frame: input.world.frames[0].id,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        size: 0.01,
        roles: ['focal'],
        source: { kind: 'engine', ref: 'studio' },
        evidence: 'architecture',
        window: [0, 8],
      },
    };
    const res = applyEdits(input, [edit]);
    assert.equal(res.world.objects.length, input.world.objects.length + 1);
    assert.equal(loadJob(res, SHIPPED_LENSES).ok, true);
  });

  it('remove deletes a block', () => {
    const input = structuredClone(zoomJobRaw);
    const edit: Edit = {
      id: 'e3',
      at: '2026-10-31T00:00:00Z',
      by: 'the owner',
      op: 'remove',
      path: '/layout/0/blocks/0',
    };
    const res = applyEdits(input, [edit]);
    assert.equal(res.layout[0].blocks.length, input.layout[0].blocks.length - 1);
  });

  it('pointer escapes work', () => {
    const doc = { notes: { 'a/b~c': 'escaped-val' } };
    assert.equal(getAt(doc, '/notes/a~1b~0c'), 'escaped-val');
  });

  it('retime snaps to frames', () => {
    const input = structuredClone(zoomJobRaw);
    const edit: Edit = {
      id: 'e4',
      at: '2026-10-31T00:00:00Z',
      by: 'the owner',
      op: 'retime',
      path: '/timeline/tracks/0/keys/1',
      value: 1.017,
    };
    const res = applyEdits(input, [edit]);
    assert.ok(Math.abs(res.timeline.tracks[0].keys[1].t - 31 / 30) < 1e-12);
  });

  it('retime keeps key order', () => {
    const input = structuredClone(zoomJobRaw);
    const edit: Edit = {
      id: 'e5',
      at: '2026-10-31T00:00:00Z',
      by: 'the owner',
      op: 'retime',
      path: '/timeline/tracks/0/keys/0',
      value: 9,
    };
    assert.throws(() => applyEdits(input, [edit]), /retime breaks key order/);
  });

  it('missing path is refused and the job is unchanged', () => {
    const input = structuredClone(zoomJobRaw);
    const snapshot = structuredClone(zoomJobRaw);
    const edit: Edit = {
      id: 'e-missing',
      at: '2026-10-31T00:00:00Z',
      by: 'the owner',
      op: 'set',
      path: '/world/objects/99/size',
      value: 0.02,
    };
    assert.throws(
      () => applyEdits(input, [edit]),
      (err: Error) => err.message.includes('e-missing') && err.message.includes('/world/objects/99'),
    );
    assert.deepEqual(input, snapshot);
  });

  it('invalid result is refused whole', () => {
    const input = structuredClone(zoomJobRaw);
    const edits: Edit[] = [
      { id: 'e1', at: '2026-10-31T00:00:00Z', by: 'the owner', op: 'set', path: '/layout/0/blocks/0/text', value: 'Valid' },
      { id: 'e2', at: '2026-10-31T00:00:00Z', by: 'the owner', op: 'set', path: '/world/objects/1/id', value: input.world.objects[0].id },
    ];
    assert.throws(() => applyEdits(input, edits), /duplicate id/);
  });

  it('undo on empty is empty, and undo drops the last edit', () => {
    assert.deepEqual(undo([]), []);
    const e1: Edit = { id: 'e1', at: '2026-10-31T00:00:00Z', by: 'the owner', op: 'set', path: '/lens', value: 'journal' };
    const e2: Edit = { id: 'e2', at: '2026-10-31T00:00:00Z', by: 'the owner', op: 'set', path: '/lens', value: 'cinematic' };
    assert.deepEqual(undo([e1, e2]), [e1]);
  });

  it('diffJobs lists changed leaves', () => {
    const input = structuredClone(zoomJobRaw);
    const oldText = input.layout[0].blocks[0].text;
    const edited = applyEdits(input, [
      { id: 'e1', at: '2026-10-31T00:00:00Z', by: 'the owner', op: 'set', path: '/layout/0/blocks/0/text', value: 'Tube' },
    ]);
    assert.deepEqual(diffJobs(input, edited), [
      { path: '/layout/0/blocks/0/text', before: oldText, after: 'Tube' },
    ]);
  });
});
