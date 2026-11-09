import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runRemote } from './remote.mjs';

describe('tools/remote.mjs (Plan 3 Task 6)', () => {
  it('dry run prints ssh and scp commands without connecting', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-remote-'));
    const cfg = path.join(dir, 'remote.json');
    fs.writeFileSync(
      cfg,
      JSON.stringify({ host: '127.0.0.1', user: 'testuser', folder: '/tmp/studio-work', blender: 'blender' }),
    );
    try {
      const enc = runRemote({ jobId: 'bake-test', shotId: 's-test', task: 'encode', dry: true, remoteConfigPath: cfg });
      assert.equal(enc.code, 0);
      assert.ok(enc.lines.some((l) => l.includes('BatchMode=yes') && l.includes('ffmpeg')));
      assert.ok(enc.lines.some((l) => l.startsWith('scp -B')));

      const ren = runRemote({ jobId: 'bake-test', shotId: 's-test', task: 'render', dry: true, remoteConfigPath: cfg });
      assert.equal(ren.code, 0);
      assert.ok(ren.lines.some((l) => l.includes('render_world.py') && l.includes('--device CPU')));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('bad host stops cleanly at connect step', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-remote-bad-'));
    const cfg = path.join(dir, 'remote.json');
    fs.writeFileSync(
      cfg,
      JSON.stringify({ host: 'invalid.host.local.test', user: 'nobody', folder: '/tmp/work' }),
    );
    try {
      const res = runRemote({ jobId: 'bake-test', shotId: 's-test', task: 'encode', dry: false, remoteConfigPath: cfg });
      assert.equal(res.code, 1);
      assert.ok(res.lines[0].startsWith('remote stopped at step connect:'));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
