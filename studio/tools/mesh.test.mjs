// Checks the mesh toolkit on a sphere, where volume and distances are known.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stats, deviation } from './mesh.mjs';
import { sphere } from './shapes.mjs';

test('stats gives the triangle count, the longest side and a volume near 4/3 pi r^3', () => {
  const s = stats(sphere(10));
  assert.equal(s.triangles, 48 * 96 * 2);
  assert.ok(Math.abs(s.longest - 20) < 0.1);
  const exact = (4 / 3) * Math.PI * 1000;
  assert.ok(Math.abs(s.volume / exact - 1) < 0.01, `volume ratio ${s.volume / exact}`);
});

test('a mesh deviates by zero from itself', () => {
  const d = deviation(sphere(10, 16), sphere(10, 16), 1);
  assert.ok(d.max < 1e-9);
});

test('a sphere 1 unit larger than its reference deviates by about 1', () => {
  const d = deviation(sphere(11, 32), sphere(10, 32), 0.5);
  assert.ok(d.max > 0.9 && d.max < 1.2, `max ${d.max}`);
  assert.ok(Math.abs(d.mean - 1) < 0.1, `mean ${d.mean}`);
});
