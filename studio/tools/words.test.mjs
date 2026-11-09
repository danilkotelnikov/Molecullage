import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runWords } from './words.mjs';
import { readEdits } from './edits-store.mjs';

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_DIR = path.resolve(TOOLS_DIR, '..');

function makeTempStudio() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-words-'));
  const jobDir = path.join(dir, 'jobs', 'zoom-test');
  fs.mkdirSync(jobDir, { recursive: true });
  fs.copyFileSync(
    path.join(STUDIO_DIR, 'jobs', 'zoom-test', 'job.json'),
    path.join(jobDir, 'job.json'),
  );
  return { dir, jobDir };
}

describe('tools/words.mjs (Plan 5 Task 7)', () => {
  it('summary without proposed.json prints objects and instruction', () => {
    const { dir } = makeTempStudio();
    try {
      const res = runWords({ jobId: 'zoom-test', words: 'make tube bigger', studioDir: dir });
      assert.equal(res.code, 0);
      assert.ok(res.output.includes('tube'));
      assert.ok(res.output.includes('proposed.json'));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('dry run prints diff and does not create edits.jsonl', () => {
    const { dir, jobDir } = makeTempStudio();
    try {
      fs.writeFileSync(
        path.join(jobDir, 'proposed.json'),
        JSON.stringify([{ op: 'set', path: '/world/objects/0/size', value: 0.04 }]),
      );
      const res = runWords({ jobId: 'zoom-test', studioDir: dir });
      assert.equal(res.code, 0);
      assert.ok(res.output.includes('/world/objects/0/size'));
      assert.equal(fs.existsSync(path.join(jobDir, 'edits.jsonl')), false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('apply appends edits and renames proposed.json', () => {
    const { dir, jobDir } = makeTempStudio();
    try {
      fs.writeFileSync(
        path.join(jobDir, 'proposed.json'),
        JSON.stringify([{ op: 'set', path: '/world/objects/0/size', value: 0.04 }]),
      );
      const res = runWords({ jobId: 'zoom-test', apply: true, studioDir: dir });
      assert.equal(res.code, 0);
      const edits = readEdits(jobDir);
      assert.equal(edits.length, 1);
      assert.equal(edits[0].by, 'agent');
      assert.equal(fs.existsSync(path.join(jobDir, 'proposed.json')), false);
      const files = fs.readdirSync(jobDir);
      assert.ok(files.some((f) => f.startsWith('proposed.applied-')));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('invalid proposed edit exits 1 and leaves edits.jsonl untouched', () => {
    const { dir, jobDir } = makeTempStudio();
    try {
      fs.writeFileSync(
        path.join(jobDir, 'proposed.json'),
        JSON.stringify([{ op: 'set', path: '/lens', value: 'unknown-lens' }]),
      );
      const res = runWords({ jobId: 'zoom-test', apply: true, studioDir: dir });
      assert.equal(res.code, 1);
      assert.equal(fs.existsSync(path.join(jobDir, 'edits.jsonl')), false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
