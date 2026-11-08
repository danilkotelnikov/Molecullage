// Checks the pure parts of the atlas gate on made-up text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { longestShared, support, htmlToText, mulberry32, freezeState, diffFreeze, mapLimit } from './atlas-gate.mjs';

test('mapLimit runs every url once and never exceeds the per-host limit', async () => {
  const urls = Array.from({ length: 12 }, (_, i) => `https://${i % 3 ? 'a' : 'b'}.example/p${i}`);
  let now = 0, peak = 0; const live = {};
  const out = await mapLimit(urls, 2, 5, async (u) => {
    const h = new URL(u).host; live[h] = (live[h] ?? 0) + 1; peak = Math.max(peak, live[h]); now++;
    await new Promise((r) => setTimeout(r, 5)); live[h]--; return new URL(u).pathname;
  });
  assert.equal(out.length, 12);
  assert.deepEqual(out.map(([u]) => u).sort(), [...urls].sort());
  assert.ok(peak <= 2, `peak ${peak}`);
  assert.equal(now, 12);
});

const page = 'The Loft command creates a surface that passes through several curves. Options let you close the surface and set continuity.';

test('a sentence copied from the page shares many words; a rewrite shares few', () => {
  assert.ok(longestShared('creates a surface that passes through several curves', page) >= 8);
  assert.ok(longestShared('Builds a skin across a set of profile curves.', page) < 4);
});
test('support is high for a claim the page backs and low for one it does not', () => {
  const ok = { does: 'Makes a surface through several curves with chosen continuity.', feature: 'loft-surface' };
  const no = { does: 'Simulates turbulent fluid with adaptive voxel grids.', feature: 'fluid-solver' };
  assert.ok(support(ok, page) >= 0.6);
  assert.ok(support(no, page) < 0.3);
});
test('html is reduced to text without scripts', () => assert.equal(htmlToText('<p>a<script>x()</script><b>b</b></p>').trim(), 'a b'));
test('the seeded generator repeats', () => {
  const a = mulberry32('s'); const b = mulberry32('s');
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
});
test('the freeze names a changed, a new and a missing file', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-'));
  fs.writeFileSync(path.join(d, 'a.json'), '1'); fs.writeFileSync(path.join(d, 'b.md'), '2');
  const frozen = freezeState(d);
  fs.writeFileSync(path.join(d, 'a.json'), '9'); fs.rmSync(path.join(d, 'b.md')); fs.writeFileSync(path.join(d, 'c.md'), '3');
  assert.deepEqual(diffFreeze(frozen, freezeState(d)).sort(), ['changed a.json', 'missing b.md', 'new file c.md']);
  fs.rmSync(d, { recursive: true });
});
