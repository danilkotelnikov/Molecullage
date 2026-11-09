import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCheck, readProjectAllowed } from './check.mjs';
import { loadLexicon } from './lexicon.mjs';

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_DIR = path.resolve(TOOLS_DIR, '..');

function makeTempJobDir(jobObj) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-check-'));
  fs.writeFileSync(path.join(dir, 'job.json'), JSON.stringify(jobObj, null, 2));
  return dir;
}

function cleanBaseJob() {
  const raw = JSON.parse(fs.readFileSync(path.join(STUDIO_DIR, 'jobs', 'zoom-test', 'job.json'), 'utf8'));
  for (const lay of raw.layout ?? []) {
    for (const blk of lay.blocks ?? []) {
      blk.text = blk.text.replace(/\d+/g, 'two');
    }
  }
  raw.brief = {
    idea: 'Zoom into a tube.',
    details: 'Three stops.',
    concepts: ['bench', 'liquid', 'antibody'],
    audience: 'biologist',
    product: 'arc-science',
    langs: ['en', 'ru'],
    timeBudget: { hours: 4 },
    files: [],
  };
  raw.facts = [
    {
      id: 'f1',
      text: { en: 'IgG is PDB 1IGT.', ru: 'IgG — структура 1IGT.' },
      level: 'published',
      source: { kind: 'pdb', ref: '1IGT' },
      usedBy: ['igg'],
    },
  ];
  raw.story = [
    {
      stop: 0,
      title: { en: 'A PCR tube', ru: 'Пробирка для ПЦР' },
      say: { en: 'A small tube sits on the bench.', ru: 'Малая пробирка стоит на столе.' },
      facts: ['f1'],
    },
    {
      stop: 1,
      title: { en: 'Inside the liquid', ru: 'Внутри жидкости' },
      say: { en: 'Particles float inside the liquid.', ru: 'Частицы плывут внутри жидкости.' },
      facts: [],
    },
    {
      stop: 2,
      title: { en: 'Antibodies on gold', ru: 'Антитела на золоте' },
      say: { en: 'Each antibody sits on the gold particle.', ru: 'Каждое антитело сидит на золотой частице.' },
      facts: ['f1'],
    },
  ];
  return raw;
}

describe('tools/check.mjs (Plan 6 Task 3 Step 4a)', () => {
  it('clean job exits 0', () => {
    const dir = makeTempJobDir(cleanBaseJob());
    try {
      const res = runCheck(dir, { lexiconDir: 'core/test/fixtures/lexicon' });
      assert.equal(res.code, 0);
      assert.equal(res.lines.at(-1), 'check: clean');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('bad fact exits 1 and names it', () => {
    const job = cleanBaseJob();
    job.story[0].facts = ['nope'];
    const dir = makeTempJobDir(job);
    try {
      const res = runCheck(dir, { lexiconDir: 'core/test/fixtures/lexicon' });
      assert.equal(res.code, 1);
      assert.ok(res.lines.some((l) => l.startsWith('story:') && l.includes('nope')));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('check.mjs runs all three checks', () => {
    const job = cleanBaseJob();
    job.brief.timeBudget.hours = 0;
    job.facts[0].level = 'measured';
    job.story[0].title.en = 'We leverage tubes';
    const dir = makeTempJobDir(job);
    try {
      const res = runCheck(dir, { lexiconDir: 'core/test/fixtures/lexicon' });
      assert.equal(res.code, 1);
      assert.ok(res.lines.some((l) => l.startsWith('brief:')));
      assert.ok(res.lines.some((l) => l.startsWith('facts:')));
      assert.ok(res.lines.some((l) => l.startsWith('story:')));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('facts without a brief', () => {
    const job = cleanBaseJob();
    delete job.brief;
    const dir = makeTempJobDir(job);
    try {
      const res = runCheck(dir, { lexiconDir: 'core/test/fixtures/lexicon' });
      assert.equal(res.code, 1);
      assert.ok(res.lines.includes('facts: need a brief with a product'));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('loadLexicon reads the folder', () => {
    const lex = loadLexicon('core/test/fixtures/lexicon');
    assert.deepEqual(lex.refusedEn, ['leverage', 'unlock', 'holistic']);
    assert.deepEqual(lex.refusedRu, ['инновационн', 'уникальн']);
  });

  it('reads the allowed levels of a project', () => {
    assert.deepEqual(readProjectAllowed('arc-science'), ['architecture', 'published', 'target']);
  });
});
