import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isBig } from '../core/job.ts';
import { BIG_JOB_REFUSAL } from './export.mjs';
import { buildSite, publishSite, siteFiles } from './site.mjs';

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_DIR = path.resolve(TOOLS_DIR, '..');

function makeTempStudioWithZoomTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-site-'));
  const jobDir = path.join(dir, 'jobs', 'zoom-test');
  const lensesDir = path.join(dir, 'lenses');
  const distDir = path.join(dir, 'web', 'dist');
  fs.mkdirSync(jobDir, { recursive: true });
  fs.mkdirSync(lensesDir, { recursive: true });
  fs.mkdirSync(distDir, { recursive: true });

  fs.copyFileSync(
    path.join(STUDIO_DIR, 'jobs', 'zoom-test', 'job.json'),
    path.join(jobDir, 'job.json'),
  );
  fs.copyFileSync(
    path.join(STUDIO_DIR, 'jobs', 'zoom-test', 'igg.glb'),
    path.join(jobDir, 'igg.glb'),
  );
  for (const f of fs.readdirSync(path.join(STUDIO_DIR, 'lenses'))) {
    if (f.endsWith('.json')) {
      fs.copyFileSync(path.join(STUDIO_DIR, 'lenses', f), path.join(lensesDir, f));
    }
  }
  fs.writeFileSync(
    path.join(distDir, 'index.html'),
    '<!doctype html><html><head><title>Deck</title></head><body></body></html>',
  );
  return { dir, jobDir };
}

describe('tools/site.mjs and big-job refusal (Plan 6 Tasks 6-8)', () => {
  it('builds the listed files only, copies cache pngs and skips key files', () => {
    const { dir } = makeTempStudioWithZoomTest();
    try {
      const cacheDir = path.join(dir, 'cache', 'zoom-test', 's1');
      fs.mkdirSync(cacheDir, { recursive: true });
      fs.writeFileSync(path.join(cacheDir, 'f0001.png'), 'png');
      fs.writeFileSync(path.join(cacheDir, 'f0001.key'), 'secret-hash');

      const res = buildSite('zoom-test', dir);
      assert.equal(res.code, 0);
      const files = siteFiles('zoom-test', dir);
      assert.ok(files.includes('index.html'));
      assert.ok(files.includes('robots.txt'));
      assert.ok(files.includes('deck/lenses/journal.json'));
      assert.ok(files.includes('deck/cache/zoom-test/s1/f0001.png'));
      assert.equal(files.some((f) => f.endsWith('.key')), false);

      const robots = fs.readFileSync(path.join(dir, 'out', 'site', 'zoom-test', 'robots.txt'), 'utf8');
      assert.ok(robots.includes('Disallow: /'));

      for (const f of files.filter((x) => x.endsWith('.html'))) {
        const html = fs.readFileSync(path.join(dir, 'out', 'site', 'zoom-test', f), 'utf8');
        assert.ok(html.includes('noindex'));
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('refuses env and key files in job folder', () => {
    const { dir, jobDir } = makeTempStudioWithZoomTest();
    try {
      fs.writeFileSync(path.join(jobDir, 'secret.env'), 'TOKEN=1');
      const res = buildSite('zoom-test', dir);
      assert.equal(res.code, 2);
      assert.ok(res.message.includes('secret.env'));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('big job without storyboard approval is refused', () => {
    const { dir, jobDir } = makeTempStudioWithZoomTest();
    try {
      const j = JSON.parse(fs.readFileSync(path.join(jobDir, 'job.json'), 'utf8'));
      j.paths[0].stops = [0, 1, 2, 3, 4, 5, 6];
      assert.equal(isBig(j), true);
      fs.writeFileSync(path.join(jobDir, 'job.json'), JSON.stringify(j));
      const res = buildSite('zoom-test', dir);
      assert.equal(res.code, 2);
      assert.equal(res.message, BIG_JOB_REFUSAL);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('publish needs --approved', () => {
    const res = publishSite('zoom-test', false);
    assert.equal(res.code, 2);
    assert.equal(res.message, "Publishing needs the owner's yes. Ask him, then add --approved.");
  });
});
