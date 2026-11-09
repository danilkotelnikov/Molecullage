import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { checkFacts } from '../facts.ts';
import { evidenceError, type Level } from '../world.ts';
import { loadJob, type Job } from '../job.ts';
import { SHIPPED_LENSES } from '../lenses.ts';

const zoomJobRaw = JSON.parse(
  fs.readFileSync(new URL('../../jobs/zoom-test/job.json', import.meta.url), 'utf8'),
) as Job;

const allowed: Level[] = ['architecture', 'published', 'target'];

function cleanLayoutJob(): Job {
  const job = structuredClone(zoomJobRaw);
  for (const lay of job.layout) {
    lay.blocks = [
      { id: `s${lay.stop}-title`, role: 'title', text: lay.lang === 'en' ? 'Sample tube' : 'Пробирка', box: [100, 100, 600, 80] },
    ];
  }
  return job;
}

describe('facts (Plan 6 Task 2)', () => {
  it('accepts linked numbers', () => {
    const job = cleanLayoutJob();
    job.layout[0].blocks[0] = { id: 's1-title', role: 'title', text: 'A100 with 80 GB', box: [100, 100, 600, 80] };
    job.layout[1].blocks[0] = { id: 's1-title', role: 'title', text: 'A100 с 80 ГБ', box: [100, 100, 600, 80] };
    job.facts = [
      {
        id: 'gpu-mem',
        text: { en: 'A100 has 80 GB memory', ru: 'У A100 80 ГБ памяти' },
        level: 'architecture',
        source: { kind: 'url', ref: 'https://cloud.yandex.ru/docs' },
        usedBy: ['s1-title'],
      },
    ];
    assert.deepEqual(checkFacts(job, allowed), []);
  });

  it('flags an unlinked number in one language', () => {
    const job = cleanLayoutJob();
    job.layout[1].blocks[0] = { id: 's2-title', role: 'title', text: '80 ГБ', box: [100, 100, 600, 80] };
    job.facts = [];
    const errs = checkFacts(job, allowed);
    assert.ok(errs.some((e) => e.includes('s2-title') && e.includes('ru')));
  });

  it('flags a number object with no fact', () => {
    const job = cleanLayoutJob();
    job.world.objects.push({
      id: 'n1',
      kind: 'number',
      frame: 'room',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      size: 0.01,
      roles: ['focal'],
      source: { kind: 'url', ref: 'https://cloud.yandex.ru/docs' },
      evidence: 'architecture',
      window: [0, 8],
    });
    job.facts = [];
    const errs = checkFacts(job, allowed);
    assert.ok(errs.some((e) => e.includes('n1')));
  });

  it('level must be allowed for the product', () => {
    const job = cleanLayoutJob();
    job.facts = [
      {
        id: 'f-meas',
        text: { en: 'Measured value', ru: 'Измеренное значение' },
        level: 'measured',
        source: { kind: 'file', ref: 'bench.json' },
        usedBy: [job.layout[0].blocks[0].id],
      },
    ];
    const errs = checkFacts(job, allowed);
    assert.ok(errs.some((e) => e.includes('measured') && e.includes('not allowed')));
  });

  it('doi facts need a checked date', () => {
    const job = cleanLayoutJob();
    job.facts = [
      {
        id: 'f-doi',
        text: { en: 'Published structure', ru: 'Опубликованная структура' },
        level: 'published',
        source: { kind: 'doi', ref: '10.1038/nsb0996-803' },
        usedBy: [job.layout[0].blocks[0].id],
      },
    ];
    assert.ok(checkFacts(job, allowed).some((e) => e.includes('checked')));
    job.facts[0].checked = '2026-10-31';
    assert.deepEqual(checkFacts(job, allowed), []);
  });

  it('usedBy must point at something real', () => {
    const job = cleanLayoutJob();
    job.facts = [
      {
        id: 'f-ghost',
        text: { en: 'Fact', ru: 'Факт' },
        level: 'architecture',
        source: { kind: 'url', ref: 'https://example.org' },
        usedBy: ['ghost'],
      },
    ];
    assert.ok(checkFacts(job, allowed).some((e) => e.includes('ghost')));
  });

  it('engine facts stop at architecture', () => {
    const job = cleanLayoutJob();
    const engSrc = { kind: 'engine' as const, ref: 'studio' };
    job.facts = [
      {
        id: 'f-eng',
        text: { en: 'Engine fact', ru: 'Факт движка' },
        level: 'published',
        source: engSrc,
        usedBy: [job.layout[0].blocks[0].id],
      },
    ];
    const errs = checkFacts(job, allowed);
    assert.ok(errs.includes(evidenceError('f-eng', engSrc, 'published')!));
  });

  it('loadJob does not run the facts check', () => {
    const job = cleanLayoutJob();
    job.facts = [
      {
        id: 'f-meas',
        text: { en: 'Measured', ru: 'Измерено' },
        level: 'measured',
        source: { kind: 'file', ref: 'bench.json' },
        usedBy: [job.layout[0].blocks[0].id],
      },
    ];
    assert.equal(loadJob(job, SHIPPED_LENSES).ok, true);
  });
});
