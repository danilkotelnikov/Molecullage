import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cameraAt, stopIndexAt, swapAlpha } from '../camera.ts';
import type { CameraPath } from '../camera.ts';
import { convert, rootOf } from '../frames.ts';
import type { World } from '../world.ts';

const world: World = {
  id: 'w',
  duration: 8,
  frames: [
    { id: 'bench', parent: null, unit: 1e-3, origin: [0, 0, 0] },
    { id: 'tube', parent: 'bench', unit: 1e-3, origin: [10, 0, 0] },
    { id: 'nano', parent: 'tube', unit: 1e-9, origin: [0, 5, 0] },
  ],
  objects: [],
};

// Key 0: 0.05 m from the tube centre, written in the bench frame.
// Key 1: 20 nm from the antibody, written in the nano frame.
const path: CameraPath = {
  id: 'deck',
  kind: 'deck',
  stops: [0, 4, 8],
  keys: [
    { t: 0, at: { frame: 'bench', pos: [10, 0, 50] }, target: { frame: 'tube', pos: [0, 0, 0] }, fov: 40, ease: 'linear' },
    { t: 4, at: { frame: 'nano', pos: [0, 0, 20] }, target: { frame: 'nano', pos: [0, 0, 0] }, fov: 40, ease: 'linear' },
  ],
};

test('zoom distance is continuous at a frame change', () => {
  const ds: number[] = [];
  for (let i = 0; i <= 400; i++) ds.push(cameraAt(world, path, (i * 4) / 400).distance);
  for (let i = 1; i < ds.length; i++) {
    assert.ok(Math.abs(Math.log(ds[i]) - Math.log(ds[i - 1])) < 0.1, `jump at sample ${i}`);
  }
  assert.ok(Math.abs(ds[0] - 0.05) < 1e-9, `distance(0) = ${ds[0]}`);
  assert.ok(Math.abs(ds[400] - 2e-8) < 1e-15, `distance(4) = ${ds[400]}`);
});

test('zoom distance is logarithmic', () => {
  const d = cameraAt(world, path, 2).distance;
  const want = Math.sqrt(0.05 * 2e-8);
  assert.ok(Math.abs(d - want) / want < 0.01, `distance(2) = ${d}, want ${want}`);
});

test('the camera place is consistent with the distance', () => {
  for (const t of [0, 1, 2, 3, 4]) {
    const c = cameraAt(world, path, t);
    const a = convert(world, c.at, c.target.frame);
    const s = rootOf(world, c.target.frame).scale;
    const dist = Math.hypot(a[0] - c.target.pos[0], a[1] - c.target.pos[1], a[2] - c.target.pos[2]) * s;
    assert.ok(Math.abs(dist - c.distance) / c.distance < 1e-6, `t=${t}: ${dist} vs ${c.distance}`);
  }
});

test('stopIndexAt', () => {
  assert.equal(stopIndexAt(path, 3.9), 0);
  assert.equal(stopIndexAt(path, 4), 1);
  assert.equal(stopIndexAt(path, 100), 2);
  assert.equal(stopIndexAt(path, -1), 0);
});

test('swapAlpha', () => {
  const s = 1e-6;
  assert.equal(swapAlpha(2.5e-7, s), 0);
  assert.equal(swapAlpha(1e-9, s), 0);
  assert.equal(swapAlpha(4e-6, s), 1);
  assert.equal(swapAlpha(1, s), 1);
  assert.ok(Math.abs(swapAlpha(1e-6, s) - 0.5) < 1e-9);
  let prev = -1;
  for (let i = 0; i <= 200; i++) {
    const a = swapAlpha(s * Math.pow(10, -2 + (4 * i) / 200), s);
    assert.ok(a >= prev, `swapAlpha decreased at step ${i}`);
    prev = a;
  }
});
