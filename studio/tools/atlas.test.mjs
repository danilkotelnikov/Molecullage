// Checks the atlas shape rules on small made-up data, then checks the real domain files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateDomain, loadDomains, rollup, DOMAINS, ATLAS_DIR } from './atlas.mjs';

const entry = (over = {}) => ({
  id: 'demo', name: 'Demo', kind: 'application', status: 'active', licence: { type: 'open-source', name: 'MIT' },
  url: 'https://example.com/', verified: '2026-11-02, manual page read',
  capabilities: [{ area: 'modeling-polygon', feature: 'edge-loop-cut', does: 'Cuts a ring of new edges around a mesh.', source: 'https://example.com/m', basis: 'manual' }],
  rea: { studyable: 'public-docs-only', public_sources: [] }, ...over,
});
const dom = (e = entry()) => ({ domain: 'demo', checked: '2026-11-02', enumeration: { frames: [{ name: 'a list', url: 'https://example.com/list' }], excluded: [] }, entries: [e] });

test('a well-formed domain passes', () => assert.deepEqual(validateDomain(dom()), []));
test('an unknown area, a long text and an http link are refused', () => {
  const e = entry({ capabilities: [{ area: 'magic', feature: 'x', does: 'word '.repeat(60), source: 'http://example.com', basis: 'manual' }] });
  const bad = validateDomain(dom(e)).join('\n');
  assert.match(bad, /area "magic"/);
  assert.match(bad, /1 to 45 words/);
  assert.match(bad, /source must be an https/);
});
test('a duplicate id and a missing frame list are refused', () => {
  const d = dom(); d.entries.push(entry()); d.enumeration.frames = [];
  const bad = validateDomain(d).join('\n');
  assert.match(bad, /duplicate id/);
  assert.match(bad, /enumeration.frames/);
});
test('a model entry needs hardware facts', () => assert.match(validateDomain(dom(entry({ kind: 'model' }))).join('\n'), /model.hardware/));
test('rollup counts the products that show one feature', () => {
  const d = dom(); d.entries.push(entry({ id: 'other' }));
  const r = rollup({ demo: d });
  assert.equal(r.length, 1);
  assert.deepEqual(r[0].products, ['demo', 'other']);
});
test('every domain file of the atlas exists and has the right shape', () => {
  const all = loadDomains(ATLAS_DIR);
  const bad = DOMAINS.filter((n) => !all[n]).map((n) => `${n}: file missing`).concat(Object.entries(all).flatMap(([n, d]) => validateDomain(d, n)));
  assert.deepEqual(bad, []);
});
