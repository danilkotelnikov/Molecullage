// Checks the source index: the table parser, the licence classes, and the built library/sources.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTables, licenceClass } from './sources.mjs';

const library = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'library');

const SAMPLE = `# R2

## A. Vector and icon libraries

| Name | Licence (exact) | URL | Formats | Bulk / API | Tier | Best Molecullage use | Ev. |
|---|---|---|---|---|---|---|---|
| Health Icons | CC0 ("available in the public domain") | https://healthicons.org/ | SVG, PNG | Download all | good | Clinical pictograms | V |
| Bioicons | Per icon: CC0, CC-BY, MIT. | https://bioicons.com/ | SVG | git clone | good | Lab objects | V |

## B. Other

| Name | What it does | Licence (SPDX) | Fit | Verdict | Source |
|---|---|---|---|---|---|
| three.js | Renders 3D in WebGL. | MIT | live | adopt | https://threejs.org/ |
`;

test('the parser reads rows under their section with the right fields', () => {
  const rows = parseTables(SAMPLE, 'R2_science_assets.md');
  assert.equal(rows.length, 3);
  const h = rows.find((r) => r.name === 'Health Icons');
  assert.equal(h.url, 'https://healthicons.org/');
  assert.deepEqual(h.formats, ['SVG', 'PNG']);
  assert.equal(h.evidence, 'V');
  assert.equal(h.section, 'A. Vector and icon libraries');
  assert.equal(h.kind, 'vector-icons');
  assert.equal(h.licenceClass, 'open-free');
  assert.equal(h.origin.file, 'R2_science_assets.md');
  assert.ok(h.origin.line > 0);
  const t = rows.find((r) => r.name === 'three.js');
  assert.equal(t.url, 'https://threejs.org/');
  assert.equal(t.licenceClass, 'code-permissive');
  assert.equal(t.verdict, 'adopt');
});

test('licence classes', () => {
  assert.equal(licenceClass('CC0 1.0 Universal'), 'open-free');
  assert.equal(licenceClass('CC BY 4.0'), 'attribution');
  assert.equal(licenceClass('CC BY-SA 4.0'), 'share-alike');
  assert.equal(licenceClass('CC BY-NC 4.0'), 'non-commercial');
  assert.equal(licenceClass('CC BY-ND 4.0'), 'no-derivatives');
  assert.equal(licenceClass('GPL-3.0-or-later'), 'copyleft');
  assert.equal(licenceClass('Apache-2.0'), 'code-permissive');
  assert.equal(licenceClass('Per icon: CC0, CC-BY, MIT.'), 'per-item');
  assert.equal(licenceClass('Licence not captured.'), 'check');
});

test('the built index has many sources, each with a name, kind, licence class and origin', () => {
  const idx = JSON.parse(fs.readFileSync(path.join(library, 'sources.json'), 'utf8'));
  assert.ok(idx.sources.length >= 100, `only ${idx.sources.length} sources`);
  const ids = new Set();
  for (const s of idx.sources) {
    for (const f of ['id', 'name', 'kind', 'licenceClass']) assert.ok(s[f], `${s.id ?? '?'} lacks ${f}`);
    assert.ok(s.origin?.file, `${s.id}: origin`);
    assert.ok(!ids.has(s.id), `duplicate id ${s.id}`);
    ids.add(s.id);
  }
  const kinds = new Set(idx.sources.map((s) => s.kind));
  for (const k of ['vector-icons', '3d-models-materials-hdri', 'molecular-computational', '3d-molecular-tools']) {
    assert.ok(kinds.has(k), `no source of kind ${k}`);
  }
});

test('the extra sources used in this project are in the index', () => {
  const idx = JSON.parse(fs.readFileSync(path.join(library, 'sources.json'), 'utf8'));
  for (const id of ['polyhaven', 'sketchfab', 'rcsb-pdb', 'pubmed', 'pmc', '3d-contentcentral', 'grabcad']) {
    assert.ok(idx.sources.some((s) => s.id === id), `missing ${id}`);
  }
});
