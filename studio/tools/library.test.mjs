// Checks the material library: manifest fields, licences, files, sizes, checksums, and the lens links.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const studio = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const library = path.join(studio, 'library');
const manifest = JSON.parse(fs.readFileSync(path.join(library, 'manifest.json'), 'utf8'));
const FIELDS = ['id', 'kind', 'file', 'name', 'author', 'source', 'download', 'licence', 'bytes', 'md5', 'fetched'];
const LICENCES = ['CC0-1.0', 'CC-BY-4.0'];

test('every manifest entry has every field, a unique id and an allowed licence', () => {
  assert.ok(manifest.assets.length >= 2);
  const ids = new Set();
  for (const a of manifest.assets) {
    for (const f of FIELDS) assert.ok(a[f] !== undefined && a[f] !== '', `${a.id ?? '?'} lacks ${f}`);
    if (a.manual) {
      // a hand download the owner approved by name: kept for inspection only, so no scene may use it
      assert.equal(a.useBlocked, true, `${a.id}: a hand download with a licence we have not read must be useBlocked`);
      assert.equal(a.download, null, `${a.id}: a hand download has no fetch link`);
    } else {
      assert.ok(LICENCES.includes(a.licence), `${a.id}: licence ${a.licence} is not allowed`);
      assert.ok(a.download.startsWith('https://'), `${a.id}: download is not https`);
    }
    assert.ok(!ids.has(a.id), `duplicate id ${a.id}`);
    ids.add(a.id);
  }
});

test('every library file exists with the stated size and md5', () => {
  for (const a of manifest.assets) {
    const file = path.join(library, a.file);
    assert.ok(fs.existsSync(file), `${a.id}: ${a.file} is missing (run: node tools/library.mjs fetch)`);
    const bytes = fs.readFileSync(file);
    assert.equal(bytes.length, a.bytes, `${a.id}: size`);
    assert.equal(crypto.createHash('md5').update(bytes).digest('hex'), a.md5, `${a.id}: md5`);
  }
});

test('both shipped lenses use a library HDRI', () => {
  const ids = new Set(manifest.assets.map((a) => a.id));
  for (const name of ['journal', 'cinematic']) {
    const lens = JSON.parse(fs.readFileSync(path.join(studio, 'lenses', `${name}.json`), 'utf8'));
    assert.ok(lens.environment, `${name} has no environment`);
    assert.ok(ids.has(lens.environment.hdri), `${name}: hdri "${lens.environment.hdri}" is not in the manifest`);
    assert.ok(lens.environment.intensity > 0, `${name}: intensity`);
  }
});
