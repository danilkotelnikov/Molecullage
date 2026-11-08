// Checks that a mesh written by writeGlb reads back the same through readGlb.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeGlb } from './glb.mjs';
import { readGlb, stats } from './mesh.mjs';
import { sphere } from './shapes.mjs';

test('a sphere written as a glb reads back with the same counts and positions', () => {
  const s = sphere(10, 24);
  const buf = writeGlb({ positions: s.positions, indices: s.indices });
  assert.equal(buf.readUInt32LE(0), 0x46546c67, 'glTF magic');
  assert.equal(buf.readUInt32LE(8), buf.length, 'length in the header');
  assert.equal(buf.length % 4, 0);
  const back = readGlb(buf);
  assert.equal(back.positions.length, s.positions.length);
  assert.deepEqual(Array.from(back.indices), Array.from(s.indices));
  for (let i = 0; i < s.positions.length; i++) assert.ok(Math.abs(back.positions[i] - s.positions[i]) < 1e-5, `position ${i}`);
  assert.equal(stats(back).triangles, stats(s).triangles);
});

test('normals are stored when given and left out when not', () => {
  const s = sphere(10, 8);
  const json = (b) => JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString('utf8'));
  assert.equal(json(writeGlb({ positions: s.positions, indices: s.indices })).meshes[0].primitives[0].attributes.NORMAL, undefined);
  const withNormals = writeGlb({ positions: s.positions, normals: s.positions, indices: s.indices });
  assert.equal(json(withNormals).meshes[0].primitives[0].attributes.NORMAL, 1);
  assert.equal(readGlb(withNormals).positions.length, s.positions.length);
});
