import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateVectors, type VectorObject } from '../vector.ts';
import { evidenceError, type World } from '../world.ts';
import { loadJob } from '../job.ts';
import { SHIPPED_LENSES } from '../lenses.ts';

const zoomJobRaw = JSON.parse(
  fs.readFileSync(new URL('../../jobs/zoom-test/job.json', import.meta.url), 'utf8'),
);

const world: World = zoomJobRaw.world;
const src = { kind: 'url' as const, ref: 'https://example.org/spec' };

describe('vector (Plan 4 Task 1)', () => {
  it('accepts one of each type', () => {
    const vectors: VectorObject[] = [
      { id: 'v-path', type: 'path', frame: null, box: [10, 10, 50, 50], d: 'M0 0 L10 10', roles: ['path'], source: src, evidence: 'architecture', window: [0, 8] },
      { id: 'v-shape', type: 'shape', frame: null, box: [20, 20, 60, 40], shape: 'rect', roles: ['surface'], source: src, evidence: 'architecture', window: [0, 8] },
      { id: 'v-arrow', type: 'arrow', frame: null, box: [0, 0, 100, 20], from: [0, 10], to: [100, 10], roles: ['path'], source: src, evidence: 'architecture', window: [0, 8] },
      { id: 'v-label', type: 'label', frame: null, box: [50, 50, 120, 30], text: { en: 'Hello' }, roles: ['focal'], source: src, evidence: 'architecture', window: [0, 8] },
      { id: 'v-image', type: 'image', frame: null, box: [80, 80, 100, 100], href: 'crops/pic.png', roles: ['surface'], source: src, evidence: 'architecture', window: [0, 8] },
      { id: 'v-group', type: 'group', frame: null, box: [10, 10, 100, 100], children: ['v-path', 'v-shape'], roles: ['context'], source: src, evidence: 'architecture', window: [0, 8] },
    ];
    assert.deepEqual(validateVectors(vectors, world), []);
  });

  it('ids are unique across world objects and vectors', () => {
    const vectors: VectorObject[] = [
      { id: 'igg', type: 'shape', frame: null, box: [10, 10, 50, 50], shape: 'rect', roles: ['surface'], source: src, evidence: 'architecture', window: [0, 8] },
    ];
    const errs = validateVectors(vectors, world);
    assert.ok(errs.some((e) => e.includes('duplicate id "igg"')));
  });

  it('each type needs its fields', () => {
    const vectors: VectorObject[] = [
      { id: 'p1', type: 'path', frame: null, box: [10, 10, 50, 50], roles: ['path'], source: src, evidence: 'architecture', window: [0, 8] },
      { id: 'a1', type: 'arrow', frame: null, box: [10, 10, 50, 50], from: [0, 0], roles: ['path'], source: src, evidence: 'architecture', window: [0, 8] },
      { id: 'l1', type: 'label', frame: null, box: [10, 10, 50, 50], roles: ['focal'], source: src, evidence: 'architecture', window: [0, 8] },
      { id: 'i1', type: 'image', frame: null, box: [10, 10, 50, 50], roles: ['surface'], source: src, evidence: 'architecture', window: [0, 8] },
      { id: 's1', type: 'shape', frame: null, box: [10, 10, 50, 50], roles: ['surface'], source: src, evidence: 'architecture', window: [0, 8] },
    ];
    const errs = validateVectors(vectors, world);
    assert.equal(errs.length, 5);
  });

  it('group children exist and do not loop', () => {
    const unknownChild: VectorObject[] = [
      { id: 'g1', type: 'group', frame: null, box: [10, 10, 50, 50], children: ['missing'], roles: ['context'], source: src, evidence: 'architecture', window: [0, 8] },
    ];
    assert.ok(validateVectors(unknownChild, world).some((e) => e.includes('unknown child')));

    const loopVecs: VectorObject[] = [
      { id: 'A', type: 'group', frame: null, box: [10, 10, 50, 50], children: ['B'], roles: ['context'], source: src, evidence: 'architecture', window: [0, 8] },
      { id: 'B', type: 'group', frame: null, box: [10, 10, 50, 50], children: ['A'], roles: ['context'], source: src, evidence: 'architecture', window: [0, 8] },
    ];
    assert.ok(validateVectors(loopVecs, world).some((e) => e.includes('group loop')));
  });

  it('unknown frame is rejected', () => {
    const vectors: VectorObject[] = [
      { id: 'v1', type: 'shape', frame: 'x', box: [10, 10, 50, 50], shape: 'rect', roles: ['surface'], source: src, evidence: 'architecture', window: [0, 8] },
    ];
    assert.ok(validateVectors(vectors, world).some((e) => e.includes('unknown frame "x"')));
  });

  it('engine-drawn vectors cap at architecture', () => {
    const engSource = { kind: 'engine' as const, ref: 'studio' };
    const vectors: VectorObject[] = [
      { id: 'v1', type: 'shape', frame: null, box: [10, 10, 50, 50], shape: 'rect', roles: ['surface'], source: engSource, evidence: 'published', window: [0, 8] },
    ];
    const errs = validateVectors(vectors, world);
    assert.deepEqual(errs, [evidenceError('v1', engSource, 'published')]);
  });

  it('loadJob checks vectors', () => {
    const badJob = {
      ...structuredClone(zoomJobRaw),
      vectors: [
        { id: 'v-bad', type: 'path', frame: null, box: [10, 10, 50, 50], roles: ['path'], source: src, evidence: 'architecture', window: [0, 8] },
      ],
    };
    const res = loadJob(badJob, SHIPPED_LENSES);
    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.ok(res.errors.some((e) => e.includes('v-bad')));
    }
  });
});
