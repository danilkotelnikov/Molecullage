import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildStoryboard } from './storyboard.mjs';
import { BIG_JOB_REFUSAL } from './export.mjs';

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_DIR = path.resolve(TOOLS_DIR, '..');

test('sheet has one still per stop', async () => {
  const res = await buildStoryboard('zoom-test', { studioDir: STUDIO_DIR });
  assert.equal(res.stills.length, 3);
  for (const p of res.stills) {
    assert.ok(fs.existsSync(p), `missing still ${p}`);
  }
  assert.ok(fs.existsSync(res.sheetHtml));
  assert.ok(fs.existsSync(res.sheetPng));
  const html = fs.readFileSync(res.sheetHtml, 'utf8');
  const figures = html.match(/<figure\b/g) ?? [];
  assert.equal(figures.length, 3);
});

test('big job without approval cannot export', () => {
  const bigDir = path.join(STUDIO_DIR, 'jobs', 'big-export-test');
  fs.rmSync(bigDir, { recursive: true, force: true });
  fs.cpSync(path.join(STUDIO_DIR, 'jobs', 'zoom-test'), bigDir, { recursive: true });
  try {
    const jobFile = path.join(bigDir, 'job.json');
    const job = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
    job.paths[0].stops = [0, 1, 2, 3, 4, 6, 8];
    delete job.storyboard;
    fs.writeFileSync(jobFile, JSON.stringify(job, null, 2));

    const r1 = spawnSync(process.execPath, [path.join(TOOLS_DIR, 'export.mjs'), 'big-export-test', '--plan'], {
      cwd: STUDIO_DIR,
      encoding: 'utf8',
    });
    assert.equal(r1.status, 2);
    assert.ok((r1.stderr + r1.stdout).includes(BIG_JOB_REFUSAL));

    job.storyboard = { approvedAt: '2026-10-31T12:00:00Z', note: 'Approved' };
    fs.writeFileSync(jobFile, JSON.stringify(job, null, 2));

    const r2 = spawnSync(process.execPath, [path.join(TOOLS_DIR, 'export.mjs'), 'big-export-test', '--plan'], {
      cwd: STUDIO_DIR,
      encoding: 'utf8',
    });
    assert.equal(r2.status, 0, r2.stderr || r2.stdout);
  } finally {
    fs.rmSync(bigDir, { recursive: true, force: true });
  }
});
