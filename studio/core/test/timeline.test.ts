import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ease, sample, validateTimeline } from '../timeline.ts';
import type { Ease, Track, Timeline } from '../timeline.ts';
import type { World } from '../world.ts';

const EASES: Ease[] = ['linear', 'power2.out', 'power2.inOut', 'power3.out', 'sine.inOut'];

const world: World = {
  id: 'w',
  duration: 10,
  frames: [{ id: 'bench', parent: null, unit: 1e-3, origin: [0, 0, 0] }],
  objects: [
    {
      id: 'igg',
      kind: 'molecule',
      frame: 'bench',
      position: [0, 0, 0],
      size: 1e-8,
      source: { kind: 'pdb', ref: '1IGT' },
      evidence: 'published',
      window: [0, 10],
      roles: ['antibody'],
    },
  ],
};

test('sample holds outside and hits keys exactly', () => {
  const tr: Track = {
    target: 'igg',
    prop: 'opacity',
    keys: [
      { t: 1, v: 0 },
      { t: 3, v: 10, ease: 'linear' },
    ],
  };
  assert.equal(sample(tr, 0), 0);
  assert.equal(sample(tr, 1), 0);
  assert.equal(sample(tr, 3), 10);
  assert.equal(sample(tr, 9), 10);
  assert.equal(sample(tr, 2), 5);
});

test('vector keys interpolate per component', () => {
  const tr: Track = {
    target: 'igg',
    prop: 'position',
    keys: [
      { t: 0, v: [0, 0, 0] },
      { t: 2, v: [2, 4, 6], ease: 'linear' },
    ],
  };
  assert.deepEqual(sample(tr, 1), [1, 2, 3]);
});

test('same t gives the same value', () => {
  const tr: Track = {
    target: 'igg',
    prop: 'opacity',
    keys: [
      { t: 0, v: 0 },
      { t: 4, v: 1 },
    ],
  };
  const first = sample(tr, 1.2345);
  for (let i = 0; i < 1000; i++) assert.equal(sample(tr, 1.2345), first);
});

test('each ease maps 0 to 0 and 1 to 1 and rises monotonically', () => {
  for (const name of EASES) {
    assert.ok(ease(name, 0) === 0, `${name} at 0`);
    assert.ok(ease(name, 1) === 1, `${name} at 1`);
    let prev = -Infinity;
    for (let i = 0; i <= 100; i++) {
      const y = ease(name, i / 100);
      assert.ok(y >= prev, `${name} not monotonic at ${i / 100}`);
      prev = y;
    }
    assert.ok(ease(name, -3) === 0 && ease(name, 7) === 1, `${name} clamps x`);
  }
});

test('validateTimeline rejects unknown target, unsorted keys, mixed arity', () => {
  const ok: Timeline = { tracks: [{ target: 'igg', prop: 'opacity', keys: [{ t: 0, v: 0 }, { t: 1, v: 1 }] }] };
  assert.deepEqual(validateTimeline(ok, world), []);

  const unknown: Timeline = { tracks: [{ target: 'nope', prop: 'opacity', keys: [{ t: 0, v: 0 }] }] };
  const e1 = validateTimeline(unknown, world);
  assert.equal(e1.length, 1);
  assert.ok(e1[0].includes('"nope"'), e1[0]);

  const unsorted: Timeline = { tracks: [{ target: 'igg', prop: 'opacity', keys: [{ t: 2, v: 0 }, { t: 1, v: 1 }] }] };
  const e2 = validateTimeline(unsorted, world);
  assert.equal(e2.length, 1);
  assert.ok(e2[0].includes('order'), e2[0]);

  const mixed: Timeline = { tracks: [{ target: 'igg', prop: 'position', keys: [{ t: 0, v: [0, 0, 0] }, { t: 1, v: 1 }] }] };
  const e3 = validateTimeline(mixed, world);
  assert.equal(e3.length, 1);
  assert.ok(e3[0].includes('shape'), e3[0]);
});
