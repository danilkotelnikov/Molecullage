// Checks the search machinery offline. Live connectors get fake responses shaped like the real ones.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchIndex, loadAll, connectors, addCandidates, USABLE } from './search.mjs';

const entries = [
  { id: 'polyhaven', name: 'Poly Haven', kind: '3d-models-materials-hdri', licenceClass: 'open-free', use: 'Studio lighting images, textures and models', access: 'open-api', origin: { file: 'x' } },
  { id: 'sketchfab', name: 'Sketchfab', kind: '3d-models-materials-hdri', licenceClass: 'per-item', use: 'Ready 3D models', access: 'open-search, login to download', origin: { file: 'x' } },
  { id: 'biorender', name: 'BioRender', kind: 'vector-icons', licenceClass: 'non-commercial', use: 'Scientific icons', access: 'login', origin: { file: 'x' } },
  { id: 'model-pcr-tube-x', name: 'PCR tube 0.2 mL with cap', subject: '0.2 mL PCR tube with attached cap', kind: 'model', licenceClass: 'check', status: 'needs-login', grounding: 'n/a', origin: { file: 'references' } },
  { id: 'paper-a', name: 'Antibody coverage on gold', subject: 'Antibodies per gold nanoparticle', kind: 'paper', licenceClass: 'check', status: 'verified', grounding: 'full-text', origin: { file: 'references' } },
  { id: 'paper-b', name: 'Antibody gold review', subject: 'Antibodies on gold', kind: 'paper', licenceClass: 'check', status: 'verified', grounding: 'abstract-only', origin: { file: 'references' } },
];

test('a name match ranks above a use match, and no match is dropped', () => {
  const r = searchIndex(entries, 'pcr tube');
  assert.equal(r[0].id, 'model-pcr-tube-x');
  assert.ok(r.every((e) => e.score > 0));
  assert.ok(!r.some((e) => e.id === 'biorender'));
});

test('filters: kind, licence use, login, status and grounding', () => {
  assert.deepEqual(searchIndex(entries, 'gold', { kind: 'paper' }).map((e) => e.id).sort(), ['paper-a', 'paper-b']);
  assert.deepEqual(searchIndex(entries, 'gold', { grounded: true }).map((e) => e.id), ['paper-a']);
  assert.ok(!searchIndex(entries, 'icons', { usable: true }).some((e) => e.id === 'biorender'), 'a non-commercial source is not usable for a pitch');
  assert.ok(!searchIndex(entries, 'models', { noLogin: true }).some((e) => e.id === 'sketchfab'));
  assert.deepEqual(searchIndex(entries, 'tube', { status: 'needs-login' }).map((e) => e.id), ['model-pcr-tube-x']);
});

test('the usable classes exclude non-commercial and no-derivatives', () => {
  assert.ok(USABLE.includes('open-free') && USABLE.includes('attribution'));
  assert.ok(!USABLE.includes('non-commercial') && !USABLE.includes('no-derivatives'));
});

test('an empty query returns nothing', () => {
  assert.deepEqual(searchIndex(entries, '   '), []);
});

test('the real index loads and finds Poly Haven and a PCR tube candidate', () => {
  const all = loadAll();
  assert.ok(all.length > 200);
  assert.ok(searchIndex(all, 'poly haven hdri').some((e) => e.id === 'polyhaven'));
  assert.ok(searchIndex(all, 'pcr tube cap').some((e) => e.id.startsWith('model-pcr-tube')));
});

const json = (body) => async () => ({ ok: true, json: async () => body });

test('the Poly Haven connector keeps matching assets and marks them CC0 candidates', async () => {
  const body = {
    studio_small_09: { name: 'Studio Small 09', type: 0, categories: ['studio'], tags: ['indoor'], authors: { 'Sergej Majboroda': 'All' } },
    forest_cave: { name: 'Forest Cave', type: 0, categories: ['outdoor'], tags: ['forest'], authors: { X: 'All' } },
  };
  const r = await connectors.polyhaven('studio', json(body));
  assert.equal(r.length, 1);
  assert.equal(r[0].licence, 'CC0-1.0');
  assert.equal(r[0].kind, 'hdri');
  assert.equal(r[0].status, 'candidate');
  assert.equal(r[0].source, 'https://polyhaven.com/a/studio_small_09');
});

test('the Sketchfab connector maps licence labels and never treats a login model as fetched', async () => {
  const body = { results: [
    { name: 'PCR Plate', viewerUrl: 'https://sketchfab.com/3d-models/x-1', license: { label: 'CC Attribution' }, user: { displayName: 'A' }, faceCount: 9960, archives: { glb: { size: 1100276 } } },
    { name: 'Tube', viewerUrl: 'https://sketchfab.com/3d-models/x-2', license: { label: 'CC0 Public Domain' }, user: { displayName: 'B' }, faceCount: 100, archives: { glb: { size: 5000 } } },
  ] };
  const r = await connectors.sketchfab('pcr', json(body));
  assert.equal(r.length, 2);
  assert.match(r[0].licence, /^CC-BY/);
  assert.equal(r[1].licence, 'CC0-1.0');
  assert.ok(r.every((e) => e.status === 'needs-login' && e.grounding === 'n/a' && e.kind === 'model'));
});

test('the PubMed connector gives papers with a DOI that are not read yet', async () => {
  let call = 0;
  const f = async () => ({ ok: true, json: async () => (call++ === 0 ? { esearchresult: { idlist: ['111'] } } : { result: { uids: ['111'], 111: { title: 'A title.', source: 'J Test', pubdate: '2020 Jan', articleids: [{ idtype: 'doi', value: '10.1000/abc' }] } } }) });
  const r = await connectors.pubmed('gold', f);
  assert.equal(r.length, 1);
  assert.equal(r[0].doi, '10.1000/abc');
  assert.equal(r[0].grounding, 'not-obtained');
  assert.equal(r[0].status, 'candidate');
});

test('addCandidates skips an entry that is already there and keeps the rest', () => {
  const db = { entries: [{ id: 'a', source: 'https://x/a' }] };
  const added = addCandidates(db, [{ id: 'a', source: 'https://x/a' }, { id: 'b', source: 'https://x/b' }, { id: 'c', source: 'https://x/a' }], '2026-11-01');
  assert.equal(added.length, 1);
  assert.equal(db.entries.length, 2);
  assert.equal(db.entries[1].checked, '2026-11-01');
});

test('the RCSB connector gives structure candidates that are not read yet', async () => {
  const f = async (url) => ({ ok: true, json: async () => (String(url).includes('search.rcsb.org') ? { result_set: [{ identifier: '1IGT' }] } : { struct: { title: 'Intact antibody' } }) });
  const r = await connectors.rcsb('antibody', f);
  assert.equal(r.length, 1);
  assert.equal(r[0].kind, 'structure');
  assert.equal(r[0].grounding, 'not-obtained');
  assert.equal(r[0].source, 'https://www.rcsb.org/structure/1IGT');
});
