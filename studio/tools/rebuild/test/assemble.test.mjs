import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { traceParts } from '../trace.mjs';
import { assemble } from '../assemble.mjs';
import { loadJob } from '../../../core/job.ts';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_DIR = path.resolve(TEST_DIR, '..', '..', '..');
const FIXTURE_PNG = path.join(TEST_DIR, 'fixture.png');
const FIXTURE_READING = path.join(TEST_DIR, 'fixture.reading.json');
const JOURNAL_LENS = JSON.parse(fs.readFileSync(path.join(STUDIO_DIR, 'lenses', 'journal.json'), 'utf8'));

test('fixture reading assembles into a valid Job', async () => {
  const reading = JSON.parse(fs.readFileSync(FIXTURE_READING, 'utf8'));
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-assemble-'));
  try {
    const { vectors: traced } = await traceParts(reading, FIXTURE_PNG, path.join(tmpDir, 'traced'));
    const { job, report } = await assemble(reading, traced, tmpDir);
    const loaded = loadJob(job, { journal: JOURNAL_LENS });
    assert.equal(loaded.ok, true, loaded.ok ? '' : loaded.errors.join('\n'));
    assert.equal(job.rebuild, true);
    assert.deepEqual(report, []);

    const rect = job.vectors.find((v) => v.id === 'rect');
    assert.ok(rect);
    assert.equal(rect.type, 'shape');
    assert.equal(rect.shape, 'rect');
    assert.deepEqual(rect.box, [285, 135, 405, 270]);

    const arrow = job.vectors.find((v) => v.id === 'arrow');
    assert.ok(arrow);
    assert.equal(arrow.type, 'arrow');
    assert.deepEqual(arrow.from, [757.5, 270]);
    assert.deepEqual(arrow.to, [1095, 270]);

    const title = job.vectors.find((v) => v.id === 'title-gold');
    assert.ok(title);
    assert.equal(title.type, 'label');
    assert.equal(title.text.en, 'Gold');
    assert.equal(title.text.ru, 'Золото');

    const circle = job.vectors.find((v) => v.id === 'circle');
    assert.ok(circle);
    assert.equal(circle.type, 'group');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('pixels part writes a crop and an image vector', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-assemble-px-'));
  try {
    const reading = {
      image: FIXTURE_PNG,
      width: 1200,
      height: 800,
      source: { kind: 'file', ref: 'fixture.png' },
      evidence: 'architecture',
      parts: [
        {
          id: 'photo',
          kind: 'photo',
          box: [100, 100, 200, 150],
          form: 'pixels',
          roles: ['surface'],
        },
      ],
    };
    const { job } = await assemble(reading, [], tmpDir);
    assert.ok(fs.existsSync(path.join(tmpDir, 'crops', 'photo.png')));
    const v = job.vectors.find((x) => x.id === 'photo');
    assert.ok(v);
    assert.equal(v.type, 'image');
    assert.equal(v.href, 'crops/photo.png');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('model part falls back to pixels and reports model-as-pixels', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-assemble-model-'));
  try {
    const reading = {
      image: FIXTURE_PNG,
      width: 1200,
      height: 800,
      source: { kind: 'file', ref: 'fixture.png' },
      evidence: 'architecture',
      parts: [
        {
          id: 'Unknown',
          kind: 'other',
          box: [100, 100, 200, 150],
          form: 'model',
          roles: ['surface'],
        },
      ],
    };
    const { job, report } = await assemble(reading, [], tmpDir);
    assert.ok(fs.existsSync(path.join(tmpDir, 'crops', 'Unknown.png')));
    assert.deepEqual(report, [{ id: 'Unknown', kind: 'model-as-pixels' }]);
    const v = job.vectors.find((x) => x.id === 'Unknown');
    assert.ok(v);
    assert.equal(v.type, 'image');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('missing PDB throws', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-assemble-pdb-'));
  try {
    const reading = {
      image: FIXTURE_PNG,
      width: 1200,
      height: 800,
      source: { kind: 'file', ref: 'fixture.png' },
      evidence: 'architecture',
      parts: [
        {
          id: 'prot',
          kind: 'protein',
          box: [100, 100, 200, 150],
          form: 'structure',
          ref: '9ZZZ',
          roles: ['protein'],
        },
      ],
    };
    await assert.rejects(() => assemble(reading, [], tmpDir), /9ZZZ\.pdb not found in data\/pdb\//);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
