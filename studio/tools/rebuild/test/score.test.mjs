import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runRebuildCli } from '../cli.mjs';
import { runScore } from '../score.mjs';
import { loadJob } from '../../../core/job.ts';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_DIR = path.resolve(TEST_DIR, '..', '..', '..');
const FIXTURE_PNG = path.join(TEST_DIR, 'fixture.png');
const FIXTURE_READING = path.join(TEST_DIR, 'fixture.reading.json');
const JOURNAL_LENS = JSON.parse(fs.readFileSync(path.join(STUDIO_DIR, 'lenses', 'journal.json'), 'utf8'));

test('end-to-end rebuild of fixture.png scores >= 0.75 MAD and >= 0.25 edge IoU', async () => {
  const code1 = await runRebuildCli([
    FIXTURE_PNG,
    '--reading',
    FIXTURE_READING,
    '--out',
    'rebuild-fixture',
  ]);
  assert.equal(code1, 0);

  const jobDir = path.join(STUDIO_DIR, 'jobs', 'rebuild-fixture');
  const jobJson = JSON.parse(fs.readFileSync(path.join(jobDir, 'job.json'), 'utf8'));
  const loaded = loadJob(jobJson, { journal: JOURNAL_LENS });
  assert.equal(loaded.ok, true);
  assert.ok(fs.existsSync(path.join(jobDir, 'report.json')));

  const code2 = await runScore('rebuild-fixture', FIXTURE_PNG, STUDIO_DIR);
  assert.equal(code2, 0);

  assert.ok(fs.existsSync(path.join(STUDIO_DIR, 'out', 'rebuild-fixture', 'rebuild.png')));
  const score = JSON.parse(fs.readFileSync(path.join(jobDir, 'score.json'), 'utf8'));
  assert.ok(score.mad_score >= 0.75, `expected mad_score >= 0.75, got ${score.mad_score}`);
  assert.ok(score.edge_iou >= 0.25, `expected edge_iou >= 0.25, got ${score.edge_iou}`);
  assert.equal(Object.keys(score.parts).length, 4);

  const chk = spawnSync(process.execPath, [path.join(STUDIO_DIR, 'tools', 'check.mjs'), 'rebuild-fixture'], {
    cwd: STUDIO_DIR,
    encoding: 'utf8',
  });
  assert.equal(chk.status, 0, chk.stderr || chk.stdout);
});
