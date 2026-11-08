import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadJob } from '../job.ts';
import type { Lens } from '../lens.ts';

const lens: Lens = {
  id: 'journal',
  background: '#FFFFFF',
  text: { family: 'Arial', color: '#0A0A0A', minPx: 37 },
  radius: 4,
  line: 2.5,
  feel: { ease: 'power2.out', speed: 1 },
  roles: { antibody: { color: '#E16F6B', metalness: 0, roughness: 0.6 } },
};
const lenses = { journal: lens };

const block = (id: string, text: string, over: Record<string, unknown> = {}) => ({
  id,
  role: 'title',
  text,
  box: [96, 96, 1200, 120],
  ...over,
});

const goodJob = (): Record<string, any> => ({
  world: {
    id: 'w',
    duration: 8,
    frames: [
      { id: 'bench', parent: null, unit: 1e-3, origin: [0, 0, 0] },
      { id: 'nano', parent: 'bench', unit: 1e-9, origin: [0, 0, 0] },
    ],
    objects: [
      {
        id: 'igg',
        kind: 'molecule',
        frame: 'nano',
        position: [0, 0, 0],
        size: 1e-8,
        source: { kind: 'pdb', ref: '1IGT' },
        evidence: 'published',
        window: [0, 8],
        roles: ['antibody'],
      },
    ],
  },
  timeline: { tracks: [{ target: 'igg', prop: 'opacity', keys: [{ t: 4, v: 0 }, { t: 8, v: 1 }] }] },
  paths: [
    {
      id: 'deck',
      kind: 'deck',
      stops: [0, 4],
      keys: [
        { t: 0, at: { frame: 'bench', pos: [0, 0, 50] }, target: { frame: 'bench', pos: [0, 0, 0] }, fov: 40 },
        { t: 4, at: { frame: 'nano', pos: [0, 0, 30] }, target: { frame: 'nano', pos: [0, 0, 0] }, fov: 40 },
      ],
    },
  ],
  lens: 'journal',
  langs: ['en', 'ru'],
  layout: [
    { stop: 0, lang: 'en', blocks: [block('s01-title', 'A tube')] },
    { stop: 0, lang: 'ru', blocks: [block('s01-title', 'Пробирка')] },
    { stop: 1, lang: 'en', blocks: [block('s02-title', 'An antibody')] },
    { stop: 1, lang: 'ru', blocks: [block('s02-title', 'Антитело')] },
  ],
  notes: { 0: { en: 'Start here.' } },
});

const errorsOf = (input: unknown): string[] => {
  const r = loadJob(input, lenses);
  assert.equal(r.ok, false);
  return r.ok ? [] : r.errors;
};

test('loads a valid job', () => {
  const r = loadJob(goodJob(), lenses);
  assert.equal(r.ok, true, r.ok ? '' : r.errors.join('\n'));
  if (r.ok) {
    assert.equal(r.job.paths[0].stops.length, 2);
    assert.equal(r.job.layout.length, 4);
  }
});

test('every stop needs every language', () => {
  const job = goodJob();
  job.layout = job.layout.filter((l: any) => !(l.stop === 1 && l.lang === 'ru'));
  const errors = errorsOf(job);
  assert.ok(errors.some((e) => e.includes('stop 1 has no ru layout')), errors.join('\n'));
});

test('boxes stay inside the 1920x1080 safe area', () => {
  const job = goodJob();
  job.layout[0].blocks = [block('s01-title', 'A tube', { box: [1900, 96, 400, 120] })];
  const errors = errorsOf(job);
  assert.ok(errors.some((e) => e.includes('s01-title') && e.includes('safe area')), errors.join('\n'));
});

test('unknown lens', () => {
  const job = goodJob();
  job.lens = 'poster';
  const errors = errorsOf(job);
  assert.ok(errors.some((e) => e.includes('unknown lens "poster"')), errors.join('\n'));
});

test('collects errors from world and timeline', () => {
  const job = goodJob();
  job.world.objects[0].frame = 'x';
  job.timeline.tracks[0].target = 'nope';
  const errors = errorsOf(job);
  assert.ok(errors.some((e) => e.includes('unknown frame "x"')), errors.join('\n'));
  assert.ok(errors.some((e) => e.includes('"nope"')), errors.join('\n'));
});

test('a bad camera path is reported', () => {
  const job = goodJob();
  job.paths[0].keys[1].t = 0; // not increasing
  const errors = errorsOf(job);
  assert.ok(errors.some((e) => e.includes('path "deck"') && e.includes('order')), errors.join('\n'));
});
