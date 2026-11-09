import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { proposeInto } from '../into.mjs';
import { runRebuildCli } from '../cli.mjs';
import { applyEdits } from '../../../core/edits.ts';
import { loadJob } from '../../../core/job.ts';
import { SHIPPED_LENSES } from '../../../core/lenses.ts';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_DIR = path.resolve(TEST_DIR, '..', '..', '..');
const INTO_DIR = path.join(STUDIO_DIR, 'jobs', 'into-test');
const FIXTURE_PNG = path.join(TEST_DIR, 'fixture.png');

describe('tools/rebuild/into.mjs (Plan 5 Task 8)', () => {
  before(() => {
    fs.rmSync(INTO_DIR, { recursive: true, force: true });
    fs.cpSync(path.join(STUDIO_DIR, 'jobs', 'zoom-test'), INTO_DIR, { recursive: true });
  });

  after(() => {
    fs.rmSync(INTO_DIR, { recursive: true, force: true });
  });

  beforeEach(() => {
    fs.rmSync(path.join(INTO_DIR, 'proposed.json'), { force: true });
    fs.rmSync(path.join(INTO_DIR, 'edits.jsonl'), { force: true });
    for (const f of fs.readdirSync(INTO_DIR)) {
      if (f.startsWith('proposed.applied-')) {
        fs.rmSync(path.join(INTO_DIR, f), { force: true });
      }
    }
  });

  it('proposal adds the scratch vectors at stop 1', () => {
    const scratchJob = JSON.parse(fs.readFileSync(path.join(STUDIO_DIR, 'jobs', 'rebuild-fixture', 'job.json'), 'utf8'));
    const targetJob = JSON.parse(fs.readFileSync(path.join(INTO_DIR, 'job.json'), 'utf8'));
    const edits = proposeInto(scratchJob, 'rebuild-fixture', targetJob, 1);
    assert.deepEqual(edits[0], {
      id: 'p-0',
      by: 'agent',
      op: 'add',
      path: '/vectors',
      value: [],
    });
    for (const e of edits.slice(1)) {
      assert.equal(e.op, 'add');
      assert.equal(e.path, '/vectors/-');
      assert.ok(e.value.id.startsWith('rebuild-fixture-'));
      assert.deepEqual(e.value.window, [4, 8]);
    }
  });

  it('group children get the same prefix', () => {
    const scratchJob = JSON.parse(fs.readFileSync(path.join(STUDIO_DIR, 'jobs', 'rebuild-fixture', 'job.json'), 'utf8'));
    const targetJob = JSON.parse(fs.readFileSync(path.join(INTO_DIR, 'job.json'), 'utf8'));
    const edits = proposeInto(scratchJob, 'rebuild-fixture', targetJob, 1);
    const vecEdits = edits.filter((e) => e.path === '/vectors/-');
    const ids = new Set(vecEdits.map((e) => e.value.id));
    const grp = vecEdits.find((e) => e.value.id === 'rebuild-fixture-circle');
    assert.ok(grp);
    for (const cid of grp.value.children) {
      assert.ok(cid.startsWith('rebuild-fixture-'));
      assert.ok(ids.has(cid));
    }
  });

  it('the last stop ends at the duration', () => {
    const scratchJob = JSON.parse(fs.readFileSync(path.join(STUDIO_DIR, 'jobs', 'rebuild-fixture', 'job.json'), 'utf8'));
    const targetJob = JSON.parse(fs.readFileSync(path.join(INTO_DIR, 'job.json'), 'utf8'));
    const edits = proposeInto(scratchJob, 'rebuild-fixture', targetJob, 2);
    for (const e of edits.slice(1)) {
      assert.deepEqual(e.value.window, [8, 12]);
    }
  });

  it('diff is printed and nothing is applied', async () => {
    const code = await runRebuildCli([
      FIXTURE_PNG,
      '--job',
      'rebuild-fixture',
      '--into',
      'into-test',
      '--stop',
      '1',
    ]);
    assert.equal(code, 0);
    assert.ok(fs.existsSync(path.join(INTO_DIR, 'proposed.json')));
    assert.equal(fs.existsSync(path.join(INTO_DIR, 'edits.jsonl')), false);
  });

  it('a stop out of range stops with nothing written', async () => {
    const code = await runRebuildCli([
      FIXTURE_PNG,
      '--job',
      'rebuild-fixture',
      '--into',
      'into-test',
      '--stop',
      '3',
    ]);
    assert.equal(code, 1);
    assert.equal(fs.existsSync(path.join(INTO_DIR, 'proposed.json')), false);
  });

  it('a pilot job as scratch is refused', async () => {
    const code = await runRebuildCli([
      FIXTURE_PNG,
      '--job',
      'zoom-test',
      '--into',
      'into-test',
      '--stop',
      '1',
    ]);
    assert.equal(code, 1);
  });

  it('an existing proposal is not overwritten', async () => {
    const c1 = await runRebuildCli([FIXTURE_PNG, '--job', 'rebuild-fixture', '--into', 'into-test', '--stop', '1']);
    assert.equal(c1, 0);
    const c2 = await runRebuildCli([FIXTURE_PNG, '--job', 'rebuild-fixture', '--into', 'into-test', '--stop', '1']);
    assert.equal(c2, 1);
  });

  it('--only proposes just the named parts', async () => {
    const code = await runRebuildCli([
      FIXTURE_PNG,
      '--job',
      'rebuild-fixture',
      '--into',
      'into-test',
      '--stop',
      '1',
      '--only',
      'circle',
    ]);
    assert.equal(code, 0);
    const proposed = JSON.parse(fs.readFileSync(path.join(INTO_DIR, 'proposed.json'), 'utf8'));
    const vecEdits = proposed.filter((e) => e.path === '/vectors/-');
    assert.ok(vecEdits.length >= 2);
    for (const e of vecEdits) {
      assert.ok(e.value.id.startsWith('rebuild-fixture-circle'));
    }
  });

  it('--only with an unknown id stops', async () => {
    const code = await runRebuildCli([
      FIXTURE_PNG,
      '--job',
      'rebuild-fixture',
      '--into',
      'into-test',
      '--stop',
      '1',
      '--only',
      'nope',
    ]);
    assert.equal(code, 1);
    assert.equal(fs.existsSync(path.join(INTO_DIR, 'proposed.json')), false);
  });

  it('apply after the yes', async () => {
    const scratchJob = JSON.parse(fs.readFileSync(path.join(STUDIO_DIR, 'jobs', 'rebuild-fixture', 'job.json'), 'utf8'));
    await runRebuildCli([FIXTURE_PNG, '--job', 'rebuild-fixture', '--into', 'into-test', '--stop', '1']);
    const r = spawnSync(process.execPath, [path.join(STUDIO_DIR, 'tools', 'words.mjs'), 'into-test', '--apply'], {
      cwd: STUDIO_DIR,
      encoding: 'utf8',
    });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    const lines = fs
      .readFileSync(path.join(INTO_DIR, 'edits.jsonl'), 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map((l) => JSON.parse(l));
    for (const l of lines) {
      assert.equal(l.by, 'agent');
    }
    const targetJob = JSON.parse(fs.readFileSync(path.join(INTO_DIR, 'job.json'), 'utf8'));
    const merged = applyEdits(targetJob, lines, SHIPPED_LENSES);
    assert.equal(merged.vectors.length, scratchJob.vectors.length);
    const valid = loadJob(merged, SHIPPED_LENSES);
    assert.equal(valid.ok, true);
  });
});
