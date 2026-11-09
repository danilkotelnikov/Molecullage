import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runBake } from './bake.mjs';

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_DIR = path.resolve(TOOLS_DIR, '..');

function withTempBakeJob(fn) {
  const tmpJobId = 'bake-test-tmp';
  const srcJobDir = path.join(STUDIO_DIR, 'jobs', 'bake-test');
  const dstJobDir = path.join(STUDIO_DIR, 'jobs', tmpJobId);
  const dstCacheDir = path.join(STUDIO_DIR, 'cache', tmpJobId);
  fs.rmSync(dstJobDir, { recursive: true, force: true });
  fs.rmSync(dstCacheDir, { recursive: true, force: true });
  fs.mkdirSync(dstJobDir, { recursive: true });
  fs.cpSync(srcJobDir, dstJobDir, { recursive: true });
  const jobJson = JSON.parse(fs.readFileSync(path.join(dstJobDir, 'job.json'), 'utf8'));
  jobJson.world.id = tmpJobId;
  for (const s of jobJson.shots ?? []) {
    s.settings = { width: 32, height: 18, samples: 4, denoise: false, device: 'CPU' };
  }
  fs.writeFileSync(path.join(dstJobDir, 'job.json'), JSON.stringify(jobJson, null, 2));
  try {
    return fn({ tmpJobId, dstJobDir, dstCacheDir, jobJson });
  } finally {
    fs.rmSync(dstJobDir, { recursive: true, force: true });
    fs.rmSync(dstCacheDir, { recursive: true, force: true });
  }
}

test('first run renders all frames and second run renders nothing', () => {
  withTempBakeJob(({ tmpJobId, dstCacheDir }) => {
    const r1 = runBake({ jobId: tmpJobId, shotId: 's-test', studioDir: STUDIO_DIR, fakeSeconds: 0.05 });
    assert.equal(r1.code, 0);
    assert.equal(r1.rendered, 3);
    assert.equal(r1.cached, 0);
    const shotCache = path.join(dstCacheDir, 's-test');
    const pngs = fs.readdirSync(shotCache).filter((f) => f.endsWith('.png'));
    assert.equal(pngs.length, 3);
    const logLines1 = fs.readFileSync(path.join(shotCache, 'log.jsonl'), 'utf8').trim().split(/\r?\n/);
    assert.equal(logLines1.length, 3);

    const r2 = runBake({ jobId: tmpJobId, shotId: 's-test', studioDir: STUDIO_DIR, fakeSeconds: 0.05 });
    assert.equal(r2.code, 0);
    assert.equal(r2.rendered, 0);
    assert.equal(r2.cached, 3);
    assert.ok(r2.message.includes('0 rendered, 3 cached'));
    const logLines2 = fs.readFileSync(path.join(shotCache, 'log.jsonl'), 'utf8').trim().split(/\r?\n/);
    assert.equal(logLines2.length, 3);
  });
});

test('changed lens re-bakes, other shot does not', () => {
  withTempBakeJob(({ tmpJobId }) => {
    const a1 = runBake({ jobId: tmpJobId, shotId: 'A', lensId: 'journal', studioDir: STUDIO_DIR, fakeSeconds: 0.02 });
    const b1 = runBake({ jobId: tmpJobId, shotId: 'B', lensId: 'journal', studioDir: STUDIO_DIR, fakeSeconds: 0.02 });
    assert.equal(a1.rendered, 11);
    assert.equal(b1.rendered, 11);

    const a2 = runBake({ jobId: tmpJobId, shotId: 'A', lensId: 'cinematic', studioDir: STUDIO_DIR, fakeSeconds: 0.02 });
    assert.equal(a2.rendered, 11);

    const b2 = runBake({ jobId: tmpJobId, shotId: 'B', lensId: 'journal', studioDir: STUDIO_DIR, fakeSeconds: 0.02 });
    assert.equal(b2.rendered, 0);
    assert.equal(b2.cached, 11);
  });
});

test('estimate gate stops without --approved', () => {
  withTempBakeJob(({ tmpJobId }) => {
    const res = runBake({ jobId: tmpJobId, shotId: 's-test', studioDir: STUDIO_DIR, fakeSeconds: 1200 });
    assert.equal(res.code, 2);
    assert.ok(res.message.includes('ask the owner'));
  });
});

test('budget stop halts when frame exceeds 1.5x budget', () => {
  withTempBakeJob(({ tmpJobId, dstJobDir, jobJson }) => {
    jobJson.budget = { secondsPerFrame: 1 };
    fs.writeFileSync(path.join(dstJobDir, 'job.json'), JSON.stringify(jobJson, null, 2));
    const res = runBake({ jobId: tmpJobId, shotId: 's-test', studioDir: STUDIO_DIR, fakeSeconds: 5 });
    assert.equal(res.code, 3);
    assert.ok(res.message.includes('budget is 1 s'));
  });
});
