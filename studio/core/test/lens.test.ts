import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, contrast, checkLens } from '../lens.ts';
import type { Lens } from '../lens.ts';
import type { WorldObject } from '../world.ts';

const ROLES_12 = [
  'plastic', 'liquid', 'antibody', 'protein', 'nucleic-acid', 'gold',
  'strip', 'line', 'diagram', 'tile', 'shape', 'label',
];

const loadLens = (name: string): Lens =>
  JSON.parse(readFileSync(new URL(`../../lenses/${name}.json`, import.meta.url), 'utf8'));

const baseLens = (over: Partial<Lens> = {}): Lens => ({
  id: 'journal',
  background: '#FFFFFF',
  text: { family: 'Arial', color: '#0A0A0A', minPx: 37 },
  radius: 4,
  line: 2.5,
  feel: { ease: 'power2.out', speed: 1 },
  roles: { antibody: { color: '#E16F6B', metalness: 0, roughness: 0.6 } },
  ...over,
});

const objectWithRoles = (roles: string[]): WorldObject => ({
  id: 'o',
  kind: 'molecule',
  frame: 'bench',
  position: [0, 0, 0],
  size: 1e-8,
  source: { kind: 'pdb', ref: '1IGT' },
  evidence: 'published',
  window: [0, 1],
  roles,
});

test('resolve picks the first styled role', () => {
  const style = resolve(objectWithRoles(['ab-heavy', 'antibody']), baseLens());
  assert.equal(style.color, '#E16F6B');
});

test('resolve names the missing role', () => {
  assert.throws(
    () => resolve(objectWithRoles(['enzyme']), baseLens()),
    (e: Error) => e.message.includes('no style for roles [enzyme] in lens "journal"'),
  );
});

test('contrast gives 21 for black on white and 1 for the same colour', () => {
  assert.ok(Math.abs(contrast('#000000', '#FFFFFF') - 21) < 0.01);
  assert.equal(contrast('#336699', '#336699'), 1);
});

test('checkLens flags small text and low contrast', () => {
  const small = checkLens(baseLens({ text: { family: 'Arial', color: '#0A0A0A', minPx: 30 } }));
  assert.ok(small.some((e) => e.includes('37')), small.join('\n'));
  const faint = checkLens(baseLens({ background: '#888888', text: { family: 'Arial', color: '#777777', minPx: 37 } }));
  assert.ok(faint.some((e) => e.includes('4.5')), faint.join('\n'));
  assert.deepEqual(checkLens(baseLens()), []);
});

test('both shipped lenses pass checkLens and style the same roles', () => {
  const journal = loadLens('journal');
  const cinematic = loadLens('cinematic');
  assert.deepEqual(checkLens(journal), []);
  assert.deepEqual(checkLens(cinematic), []);
  assert.deepEqual(Object.keys(journal.roles).sort(), [...ROLES_12].sort());
  assert.deepEqual(Object.keys(cinematic.roles).sort(), [...ROLES_12].sort());
  assert.equal(cinematic.roles.gold.metalness, 1);
  assert.equal(cinematic.roles.gold.roughness, 0.25);
  assert.equal(journal.id, 'journal');
  assert.equal(cinematic.id, 'cinematic');
});

test('checkLens validates the environment and the glass fields', () => {
  const ok = baseLens({ environment: { hdri: 'hdri-studio-small-03', intensity: 1 } });
  assert.deepEqual(checkLens(ok), []);
  const badEnv = checkLens(baseLens({ environment: { hdri: '', intensity: 0 } }));
  assert.ok(badEnv.some((e) => e.includes('environment')), badEnv.join(', '));
  const glass = (over: object) =>
    baseLens({ roles: { antibody: { color: '#E16F6B', metalness: 0, roughness: 0.6, ...over } } });
  assert.deepEqual(checkLens(glass({ transmission: 1, thickness: 0.4, attenuation: { color: '#1F6BFF', distance: 0.35 } })), []);
  const badT = checkLens(glass({ transmission: 1.5 }));
  assert.ok(badT.some((e) => e.includes('transmission')), badT.join(', '));
  const badA = checkLens(glass({ transmission: 1, attenuation: { color: 'blue', distance: 0 } }));
  assert.ok(badA.some((e) => e.includes('attenuation')), badA.join(', '));
});

test('checkLens validates the glow of a role', () => {
  const role = (emissive: object) =>
    baseLens({ roles: { antibody: { color: '#E16F6B', metalness: 0, roughness: 0.6, emissive } as any } });
  assert.deepEqual(checkLens(role({ color: '#1F6BFF', intensity: 0.5 })), []);
  const bad = checkLens(role({ color: 'blue', intensity: -1 }));
  assert.ok(bad.some((e) => e.includes('emissive')), bad.join(', '));
});
