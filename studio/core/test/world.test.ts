import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWorld, evidenceError } from '../world.ts';

const frames = [
  { id: 'bench', parent: null, unit: 1e-3, origin: [0, 0, 0] },
  { id: 'nano', parent: 'bench', unit: 1e-9, origin: [0, 0, 0] },
];

const obj = (over: Record<string, unknown> = {}) => ({
  id: 'igg',
  kind: 'molecule',
  frame: 'nano',
  position: [0, 0, 0],
  size: 1e-8,
  source: { kind: 'pdb', ref: '1IGT' },
  evidence: 'published',
  window: [0, 10],
  roles: ['antibody'],
  ...over,
});

const world = (over: Record<string, unknown> = {}) => ({
  id: 'w',
  duration: 10,
  frames,
  objects: [obj()],
  ...over,
});

const errorsOf = (input: unknown): string[] => {
  const r = validateWorld(input);
  assert.equal(r.ok, false);
  return r.ok ? [] : r.errors;
};

test('accepts a two-frame world', () => {
  const r = validateWorld(world());
  assert.equal(r.ok, true);
});

test('rejects duplicate ids', () => {
  const errors = errorsOf(world({ objects: [obj({ id: 'a' }), obj({ id: 'a' })] }));
  assert.equal(errors.filter((e) => e.includes('duplicate id "a"')).length, 1);
});

test('rejects an unknown frame', () => {
  const errors = errorsOf(world({ objects: [obj({ frame: 'x' })] }));
  assert.ok(errors.some((e) => e.includes('unknown frame "x"')), errors.join('\n'));
});

test('rejects a frame cycle or two roots', () => {
  const twoRoots = errorsOf(
    world({ frames: [frames[0], { id: 'other', parent: null, unit: 1, origin: [0, 0, 0] }, frames[1]] }),
  );
  assert.ok(twoRoots.some((e) => e.includes('exactly one root frame')), twoRoots.join('\n'));
  const cycle = errorsOf(
    world({
      frames: [
        frames[0],
        { id: 'a', parent: 'b', unit: 1, origin: [0, 0, 0] },
        { id: 'b', parent: 'a', unit: 1, origin: [0, 0, 0] },
        frames[1],
      ],
    }),
  );
  assert.ok(cycle.some((e) => e.includes('frame cycle')), cycle.join('\n'));
});

test('rejects a window outside the duration', () => {
  const errors = errorsOf(world({ objects: [obj({ window: [8, 12] })] }));
  assert.ok(errors.some((e) => e.includes('window')), errors.join('\n'));
});

test('caps engine-drawn objects at architecture', () => {
  const errors = errorsOf(
    world({ objects: [obj({ id: 'tube', source: { kind: 'engine', ref: '' }, evidence: 'published' })] }),
  );
  assert.ok(errors.some((e) => e.includes('engine-drawn object "tube" cannot be published')), errors.join('\n'));
});

test('published needs a doi or pdb source', () => {
  const errors = errorsOf(
    world({ objects: [obj({ source: { kind: 'url', ref: 'https://example.org' }, evidence: 'published' })] }),
  );
  assert.ok(errors.length > 0);
});

test('rejects size zero or below', () => {
  const errors = errorsOf(world({ objects: [obj({ id: 'zero', size: 0 }), obj({ id: 'neg', size: -1 })] }));
  assert.ok(errors.some((e) => e.includes('"zero"') && e.includes('size <= 0')), errors.join('\n'));
  assert.ok(errors.some((e) => e.includes('"neg"') && e.includes('size <= 0')), errors.join('\n'));
});

test('evidenceError reports the rules', () => {
  assert.equal(evidenceError('a', { kind: 'pdb', ref: '1IGT' }, 'published'), null);
  assert.equal(evidenceError('a', { kind: 'engine', ref: '' }, 'architecture'), null);
  assert.ok(evidenceError('a', { kind: 'engine', ref: '' }, 'published')?.includes('engine-drawn object "a" cannot be published'));
  assert.ok(evidenceError('a', { kind: 'url', ref: 'x' }, 'published')?.includes('not a doi or pdb'));
  assert.ok(evidenceError('a', { kind: 'engine', ref: '' }, 'measured')?.includes('cannot be measured'));
});

test('accepts a rotation of three numbers and refuses any other', () => {
  assert.equal(validateWorld(world({ objects: [obj({ rotation: [0.5, 1, 2] })] })).ok, true);
  const errors = errorsOf(world({ objects: [obj({ rotation: [0.5, 1] })] }));
  assert.ok(errors.some((e) => e.includes('rotation')), errors.join(', '));
});
