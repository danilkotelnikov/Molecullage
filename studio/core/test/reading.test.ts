import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { checkReading } from '../../tools/rebuild/reading.ts';

const fixtureReading = JSON.parse(
  fs.readFileSync(new URL('../../tools/rebuild/test/fixture.reading.json', import.meta.url), 'utf8'),
);

describe('reading (Plan 4 Task 4)', () => {
  it('accepts the fixture reading', () => {
    const res = checkReading(fixtureReading);
    assert.equal(res.ok, true);
  });

  it('rejects a box outside the image', () => {
    const copy = structuredClone(fixtureReading);
    copy.parts[0].box = [1100, 700, 200, 200];
    const res = checkReading(copy);
    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.ok(res.errors.some((e) => e.includes(copy.parts[0].id) && e.includes('1200x800')));
    }
  });

  it('structure needs a PDB id', () => {
    const copy = structuredClone(fixtureReading);
    copy.parts.push({
      id: 'mol1',
      kind: 'molecule',
      box: [10, 10, 100, 100],
      form: 'structure',
      ref: 'gold',
      roles: ['protein'],
    });
    const res = checkReading(copy);
    assert.equal(res.ok, false);
  });

  it('trace only on shapes and textures', () => {
    const copy = structuredClone(fixtureReading);
    copy.parts.push({
      id: 'bad-trace',
      kind: 'text',
      box: [10, 10, 100, 40],
      form: 'vector',
      trace: true,
      roles: ['focal'],
    });
    const res = checkReading(copy);
    assert.equal(res.ok, false);
  });

  it('vector without trace needs vector data', () => {
    const copy = structuredClone(fixtureReading);
    copy.parts.push({
      id: 'no-vec',
      kind: 'shape',
      box: [10, 10, 100, 100],
      form: 'vector',
      roles: ['surface'],
    });
    const res = checkReading(copy);
    assert.equal(res.ok, false);
  });
});
