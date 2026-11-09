import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readEdits, appendEdit, undoLast } from './edits-store.mjs';

describe('tools/edits-store.mjs (Plan 5 Task 2)', () => {
  it('append, read, and undoLast round-trip in a temp folder', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'edits-store-'));
    try {
      assert.deepEqual(readEdits(dir), []);
      const e1 = { id: 'e1', at: '2026-10-31T00:00:00Z', by: 'the owner', op: 'set', path: '/lens', value: 'journal' };
      const e2 = { id: 'e2', at: '2026-10-31T00:00:01Z', by: 'the owner', op: 'set', path: '/lens', value: 'cinematic' };
      appendEdit(dir, e1);
      appendEdit(dir, e2);
      assert.deepEqual(readEdits(dir), [e1, e2]);
      const removed = undoLast(dir);
      assert.deepEqual(removed, e2);
      assert.deepEqual(readEdits(dir), [e1]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
