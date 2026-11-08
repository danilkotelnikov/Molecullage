// Checks the decimation tool: small shapes with known answers, then the real live antibody file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { decimate, checkLimits, components, smoothNormals, LIMITS } from './decimate.mjs';
import { readGlb, stats } from './mesh.mjs';
import { sphere } from './shapes.mjs';

const root = new URL('../jobs/zoom-test/', import.meta.url);

/** Two merged meshes. */
function merge(a, b) {
  const indices = Uint32Array.from([...a.indices, ...Array.from(b.indices, (i) => i + a.positions.length / 3)]);
  return { positions: Float64Array.from([...a.positions, ...b.positions]), indices };
}

/** A big sphere (16,384 triangles, radius 40) with a dent 3 units deep at the top, and a small sphere (256 triangles) beside it. */
function dentedPair() {
  const big = sphere(40, 64);
  for (let i = 0; i < big.positions.length; i += 3) {
    const d = Math.hypot(big.positions[i], big.positions[i + 1] - 40, big.positions[i + 2]);
    if (d < 12) {
      const f = 1 - (3 * (1 + Math.cos((Math.PI * d) / 12))) / 2 / 40; // pulls the point towards the centre, by 3 at the dent's middle
      for (let k = 0; k < 3; k++) big.positions[i + k] *= f;
    }
  }
  return merge(big, sphere(3, 8, [70, 0, 0]));
}

test('components splits a mesh into its connected pieces', () => {
  const parts = components(dentedPair());
  assert.deepEqual(parts.map((p) => p.length / 3).sort((a, b) => b - a), [16384, 256]);
});

test('smooth normals of a sphere point away from the centre', () => {
  const s = sphere(10, 24);
  const n = smoothNormals(s);
  for (let i = 0; i < s.positions.length; i += 3) {
    const dot = (n[i] * s.positions[i] + n[i + 1] * s.positions[i + 1] + n[i + 2] * s.positions[i + 2]) / 10;
    if (Math.hypot(n[i], n[i + 1], n[i + 2]) > 0.5) assert.ok(dot > 0.9, `vertex ${i / 3}: ${dot}`);
  }
});

test('a dented sphere and a small island: fewer triangles, island kept, limits met', async () => {
  const ref = dentedPair();
  const light = await decimate(ref, { cap: 0.5, minBody: 3000 });
  const before = stats(ref).triangles;
  const after = stats(light).triangles;
  assert.ok(after < before / 5, `${before} -> ${after}`);
  const island = components(light).filter((p) => p.length / 3 === 256);
  assert.equal(island.length, 1, 'the 256-triangle island is untouched');
  const r = checkLimits(light, ref);
  assert.ok(r.ok, JSON.stringify(r));
  assert.ok(r.max < LIMITS.maxDeviation && r.volumeRatio > 0.95 && r.volumeRatio < 1.05);
});

test('a cap that is far too large fails the limit check', async () => {
  const ref = dentedPair();
  const light = await decimate(ref, { cap: 25, minBody: 3000 });
  const r = checkLimits(light, ref);
  assert.equal(r.ok, false);
  assert.ok(r.problems.length > 0);
});

test('a mesh with no triangles fails the limit check and does not throw', () => {
  const r = checkLimits({ positions: new Float64Array(0), indices: new Uint32Array(0) }, sphere(10, 8));
  assert.equal(r.ok, false);
});

test('the live antibody is low-poly: under 40,000 triangles and under 2 MB', () => {
  const file = new URL('igg.glb', root);
  const s = stats(readGlb(fs.readFileSync(file)));
  assert.ok(s.triangles < 40000, `${s.triangles} triangles`);
  assert.ok(fs.statSync(file).size < 2 * 1024 * 1024, `${fs.statSync(file).size} bytes`);
});

// The reference is not committed. Build it with jobs/zoom-test/make_igg_reference.cxc to run this test.
const reference = new URL('igg_reference.glb', root);
test('the live antibody stays within 3 A and 5% volume of the full reference surface', { skip: !fs.existsSync(reference) && 'jobs/zoom-test/igg_reference.glb is not built', timeout: 600000 }, () => {
  const r = checkLimits(readGlb(fs.readFileSync(new URL('igg.glb', root))), readGlb(fs.readFileSync(reference)));
  console.log(`igg.glb vs reference: ${r.triangles} triangles, max ${r.max.toFixed(2)} A, p99 ${r.p99.toFixed(2)}, mean ${r.mean.toFixed(2)}, volume ratio ${r.volumeRatio.toFixed(3)}`);
  assert.ok(r.ok, r.problems.join('; '));
});
