import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rootOf, toCamera, convert } from '../frames.ts';
import type { World } from '../world.ts';

const world: World = {
  id: 'w',
  duration: 10,
  frames: [
    { id: 'bench', parent: null, unit: 1e-3, origin: [0, 0, 0] },
    { id: 'tube', parent: 'bench', unit: 1e-3, origin: [10, 0, 0] },
    { id: 'nano', parent: 'tube', unit: 1e-9, origin: [0, 5, 0] },
  ],
  objects: [],
};

const near = (a: number, b: number, tol: number, what: string) =>
  assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} vs ${b}`);

test('rootOf composes nested frames', () => {
  const r = rootOf(world, 'nano');
  near(r.scale, 1e-9, 1e-24, 'scale');
  near(r.offset[0], 0.01, 1e-12, 'offset x');
  near(r.offset[1], 0.005, 1e-12, 'offset y');
  near(r.offset[2], 0, 1e-12, 'offset z');
  assert.deepEqual(rootOf(world, 'bench'), { scale: 1e-3, offset: [0, 0, 0] });
});

test('camera-relative stays precise across 7 orders', () => {
  const obj = { frame: 'nano', pos: [3, 0, 0] as [number, number, number] };
  const cam = { frame: 'nano', pos: [0, 0, 10] as [number, number, number] };
  const expected = [3e-9, 0, -1e-8];
  const norm = Math.hypot(...expected);
  const rel = (v: ArrayLike<number>) => Math.hypot(v[0] - expected[0], v[1] - expected[1], v[2] - expected[2]) / norm;

  const got = toCamera(world, obj, cam);
  assert.ok(got instanceof Float32Array);
  assert.ok(rel(got) < 1e-6, `camera-relative error ${rel(got)}`);

  // The naive way: cast both root positions to float32, then subtract.
  const r = rootOf(world, 'nano');
  const toRoot = (p: number[]) => p.map((c, i) => Math.fround(r.offset[i] + r.scale * c));
  const a = toRoot(obj.pos);
  const b = toRoot(cam.pos);
  const naive = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  assert.ok(rel(naive) > 1e-2, `naive error ${rel(naive)} should be large`);
});

test('toCamera works across frames', () => {
  // Object 1 mm along x of the bench; camera 1 mm further along x, also in the bench frame.
  const v = toCamera(world, { frame: 'bench', pos: [1, 0, 0] }, { frame: 'bench', pos: [2, 0, 0] });
  near(v[0], -1e-3, 1e-9, 'x');
  // Same point written in two frames gives zero.
  const p = convert(world, { frame: 'nano', pos: [4, 5, 6] }, 'bench');
  const z = toCamera(world, { frame: 'nano', pos: [4, 5, 6] }, { frame: 'bench', pos: p });
  assert.ok(Math.hypot(z[0], z[1], z[2]) < 1e-12);
});

test('convert round-trips', () => {
  const input: [number, number, number] = [3, 7, 10];
  const inBench = convert(world, { frame: 'nano', pos: input }, 'bench');
  const back = convert(world, { frame: 'bench', pos: inBench }, 'nano');
  const err = Math.hypot(back[0] - input[0], back[1] - input[1], back[2] - input[2]);
  assert.ok(err < 1e-9 * Math.hypot(...input), `round-trip error ${err}`);
});
