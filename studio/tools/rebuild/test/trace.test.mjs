import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { traceParts, parseTracedSvg } from '../trace.mjs';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PNG = path.join(TEST_DIR, 'fixture.png');
const FIXTURE_READING = path.join(TEST_DIR, 'fixture.reading.json');

test('circle part traces to SVG and parses to VectorObjects', async () => {
  const reading = JSON.parse(fs.readFileSync(FIXTURE_READING, 'utf8'));
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-trace-'));
  try {
    const { vectors, findings } = await traceParts(reading, FIXTURE_PNG, tmpDir);
    const svgPath = path.join(tmpDir, 'circle.svg');
    assert.ok(fs.existsSync(svgPath));
    const svgText = fs.readFileSync(svgPath, 'utf8').trim();
    assert.ok(svgText.startsWith('<svg') || svgText.startsWith('<?xml'));
    assert.equal(findings.length, 0);

    const p1 = vectors.find((v) => v.id === 'circle-p1');
    assert.ok(p1);
    assert.equal(p1.type, 'path');
    assert.ok(p1.d && p1.d.length > 0);
    assert.deepEqual(p1.roles, ['focal']);
    assert.equal(p1.source.kind, 'file');

    const grp = vectors.find((v) => v.id === 'circle');
    assert.ok(grp);
    assert.equal(grp.type, 'group');
    assert.ok(grp.children.length >= 1);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('blank region produces a no-paths finding', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-trace-blank-'));
  try {
    const reading = {
      image: FIXTURE_PNG,
      width: 1200,
      height: 800,
      source: { kind: 'file', ref: 'fixture.png' },
      evidence: 'architecture',
      parts: [
        {
          id: 'blank',
          kind: 'shape',
          box: [950, 600, 100, 100],
          form: 'vector',
          trace: true,
          roles: ['focal'],
        },
      ],
    };
    const { vectors, findings } = await traceParts(reading, FIXTURE_PNG, tmpDir);
    assert.deepEqual(findings, [{ id: 'blank', kind: 'no-paths' }]);
    const grp = vectors.find((v) => v.id === 'blank');
    assert.ok(grp);
    assert.deepEqual(grp.children, []);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('parseTracedSvg drops the background path and translates by box', () => {
  const svg = `<svg width="140" height="140">
    <path d="M 0 0 L 140 0 L 140 140 L 0 140 Z" fill="#ffffff"/>
    <path d="M 10 10 L 50 50" fill="#1a1a1a"/>
  </svg>`;
  const res = parseTracedSvg(svg, 'circle', [230, 480, 140, 140]);
  assert.equal(res.length, 1);
  assert.ok(res[0].d.startsWith('M 240 490'), `unexpected d: ${res[0].d}`);
});
