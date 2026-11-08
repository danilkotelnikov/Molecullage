// Checks the references database (library/references.json): fields, statuses, licences, links to the manifest.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const library = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'library');
const db = JSON.parse(fs.readFileSync(path.join(library, 'references.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(library, 'manifest.json'), 'utf8'));

const KINDS = ['model', 'datasheet', 'hdri', 'structure', 'paper', 'texture'];
// candidate: found, not checked. needs-login: only an account can download it. approved: the owner said yes.
// fetched: in the library. verified: read and checked, nothing to download. rejected: not usable.
const STATUSES = ['candidate', 'needs-login', 'approved', 'fetched', 'verified', 'rejected'];
const FIELDS = ['id', 'kind', 'subject', 'name', 'source', 'licence', 'status', 'checked', 'note'];

test('every entry has every field, a unique id, a known kind and a known status', () => {
  assert.ok(db.entries.length >= 8);
  const ids = new Set();
  for (const e of db.entries) {
    for (const f of FIELDS) assert.ok(e[f] !== undefined && e[f] !== '', `${e.id ?? '?'} lacks ${f}`);
    assert.ok(KINDS.includes(e.kind), `${e.id}: kind ${e.kind}`);
    assert.ok(STATUSES.includes(e.status), `${e.id}: status ${e.status}`);
    assert.ok(e.source.startsWith('https://'), `${e.id}: source is not https`);
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(e.checked), `${e.id}: checked date`);
    assert.ok(!ids.has(e.id), `duplicate id ${e.id}`);
    ids.add(e.id);
  }
});

test('an unknown licence is fetched only for inspection with a named yes, and then no scene may use it', () => {
  for (const e of db.entries) {
    if (e.licence === 'unknown') {
      const inspect = e.status === 'fetched' && e.approvedBy && e.useBlocked === true;
      assert.ok(inspect || ['candidate', 'needs-login', 'rejected'].includes(e.status), `${e.id}: unknown licence but status ${e.status}`);
    }
  }
});

test('a fetched entry is in the manifest, with the same licence', () => {
  const byId = new Map(manifest.assets.map((a) => [a.id, a]));
  for (const e of db.entries.filter((x) => x.status === 'fetched' && x.kind !== 'structure')) {
    const m = byId.get(e.manifest);
    assert.ok(m, `${e.id}: manifest id "${e.manifest}" not found`);
    assert.equal(m.licence, e.licence, `${e.id}: licence differs from the manifest`);
  }
});

test('a paper has a DOI, and a model has a format list', () => {
  for (const e of db.entries) {
    if (e.kind === 'paper') assert.ok(/^10\.\d{4,}\//.test(e.doi ?? ''), `${e.id}: doi`);
    if (e.kind === 'model') assert.ok(Array.isArray(e.formats) && e.formats.length > 0, `${e.id}: formats`);
  }
});

test('the database holds a PCR tube model candidate and the SPL data sheet', () => {
  assert.ok(db.entries.some((e) => e.kind === 'model' && /PCR tube/i.test(e.subject)));
  assert.ok(db.entries.some((e) => e.id === 'datasheet-spl-60001' && e.status === 'verified'));
});

// ---- Grounding (the owner's source policy, 2026-10-19): only a source read in full text can carry a claim. ----
// full-text: the whole text was read. primary-data: the data file itself was read (a structure).
// abstract-only: only the abstract was read. not-obtained: no full text could be obtained. n/a: nothing to read (a model, a lighting file).
const GROUNDING = ['full-text', 'primary-data', 'abstract-only', 'not-obtained', 'n/a'];
const GROUNDED = ['full-text', 'primary-data'];

test('every entry states its grounding, and the kind fits it', () => {
  for (const e of db.entries) {
    assert.ok(GROUNDING.includes(e.grounding), `${e.id}: grounding "${e.grounding}"`);
    if (['paper', 'datasheet'].includes(e.kind)) assert.ok(['full-text', 'abstract-only', 'not-obtained'].includes(e.grounding), `${e.id}: a ${e.kind} cannot be ${e.grounding}`);
    if (e.kind === 'structure') assert.equal(e.grounding, ['fetched', 'verified', 'approved'].includes(e.status) ? 'primary-data' : e.grounding === 'primary-data' ? 'primary-data' : 'not-obtained', `${e.id}: a structure is read (primary-data) or not obtained`);
    if (['model', 'hdri', 'texture'].includes(e.kind)) assert.equal(e.grounding, 'n/a', `${e.id}`);
  }
});

test('only a grounded entry may carry values; an ungrounded one keeps them as claimed values', () => {
  for (const e of db.entries) {
    if (e.values) assert.ok(GROUNDED.includes(e.grounding), `${e.id}: values need full text or primary data`);
    if (e.claimedValues) assert.ok(!GROUNDED.includes(e.grounding), `${e.id}: claimedValues on a grounded entry`);
  }
});

test('a full-text entry says where and when the text was read', () => {
  for (const e of db.entries.filter((x) => x.grounding === 'full-text')) {
    assert.ok(typeof e.readFrom === 'string' && e.readFrom.startsWith('https://'), `${e.id}: readFrom`);
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(e.read ?? ''), `${e.id}: read date`);
  }
});

test('every real object of every job has a grounded reference', () => {
  const jobsDir = path.resolve(library, '..', 'jobs');
  for (const name of fs.readdirSync(jobsDir)) {
    const file = path.join(jobsDir, name, 'job.json');
    if (!fs.existsSync(file)) continue;
    const job = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const o of job.world.objects) {
      if (o.source.kind === 'pdb') {
        const e = db.entries.find((x) => x.kind === 'structure' && x.source.toLowerCase().endsWith(`/${o.source.ref.toLowerCase()}`));
        assert.ok(e && GROUNDED.includes(e.grounding), `${name}/${o.id}: PDB ${o.source.ref} has no grounded entry`);
      }
      if (o.source.kind === 'doi') {
        const e = db.entries.find((x) => x.kind === 'paper' && x.doi === o.source.ref);
        assert.ok(e && e.grounding === 'full-text', `${name}/${o.id}: DOI ${o.source.ref} is not read in full text`);
      }
    }
  }
});
