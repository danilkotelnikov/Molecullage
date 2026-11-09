import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseLexicon, proseFindings } from '../prose.ts';
import { checkStory } from '../story.ts';
import { loadJob, type Job } from '../job.ts';
import { SHIPPED_LENSES } from '../lenses.ts';

function readFixtureLexicon() {
  const base = new URL('./fixtures/lexicon/', import.meta.url);
  return parseLexicon({
    refusedEn: fs.readFileSync(new URL('refused.en.txt', base), 'utf8'),
    refusedRu: fs.readFileSync(new URL('refused.ru.txt', base), 'utf8'),
    terms: fs.readFileSync(new URL('terms.en-ru.tsv', base), 'utf8'),
    anglicisms: fs.readFileSync(new URL('anglicisms.ru.tsv', base), 'utf8'),
  });
}

const zoomJobRaw = JSON.parse(
  fs.readFileSync(new URL('../../jobs/zoom-test/job.json', import.meta.url), 'utf8'),
) as Job;

describe('story and prose (Plan 6 Task 3)', () => {
  const lex = readFixtureLexicon();

  it('refused Russian stem matches inflections only at word start', () => {
    assert.equal(proseFindings('уникальная платформа', 'ru', lex).length, 1);
    assert.equal(proseFindings('неуникальный', 'ru', lex).length, 0);
  });

  it('English refused words match whole words', () => {
    assert.equal(proseFindings('we leverage GPUs', 'en', lex).length, 1);
    assert.equal(proseFindings('leverages', 'en', lex).length, 0);
  });

  it('avoid lists suggest the term', () => {
    assert.deepEqual(proseFindings('АТ связывает', 'ru', lex), [
      'ru: "АТ" — use "антитело"',
    ]);
  });

  it('anglicisms suggest the Russian word', () => {
    const f = proseFindings('датасета', 'ru', lex);
    assert.equal(f.length, 1);
    assert.ok(f[0].includes('use "набор данных"'));
  });

  it('every stop needs one slide', () => {
    const job = structuredClone(zoomJobRaw);
    job.story = [
      { stop: 0, title: { en: 'Tube', ru: 'Пробирка' }, say: { en: 'The tube sits on the bench.', ru: 'Пробирка стоит на столе.' }, facts: [] },
      { stop: 1, title: { en: 'Liquid', ru: 'Раствор' }, say: { en: 'The liquid holds the sample.', ru: 'В растворе находится образец.' }, facts: [] },
    ];
    const errs = checkStory(job, lex);
    assert.ok(errs.some((e) => e.includes('stop 2 has no slide')));

    job.story.push(
      { stop: 1, title: { en: 'Extra', ru: 'Лишний' }, say: { en: 'Extra slide.', ru: 'Лишний слайд.' }, facts: [] },
      { stop: 2, title: { en: 'Antibody', ru: 'Антитело' }, say: { en: 'The antibody binds the target.', ru: 'Антитело связывает мишень.' }, facts: [] },
    );
    const errs2 = checkStory(job, lex);
    assert.ok(errs2.some((e) => e.includes('stop 1 has 2 slides')));
  });

  it('slide facts must exist', () => {
    const job = structuredClone(zoomJobRaw);
    job.story = [
      { stop: 0, title: { en: 'Tube', ru: 'Пробирка' }, say: { en: 'The tube.', ru: 'Пробирка.' }, facts: ['nope'] },
      { stop: 1, title: { en: 'Liquid', ru: 'Раствор' }, say: { en: 'The liquid.', ru: 'Раствор.' }, facts: [] },
      { stop: 2, title: { en: 'Antibody', ru: 'Антитело' }, say: { en: 'The antibody.', ru: 'Антитело.' }, facts: [] },
    ];
    assert.ok(checkStory(job, lex).some((e) => e.includes('nope')));
  });

  it('clean story passes', () => {
    const job = structuredClone(zoomJobRaw);
    job.paths[0].stops = [0, 4];
    job.story = [
      { stop: 0, title: { en: 'Tube', ru: 'Пробирка' }, say: { en: 'The tube sits on the bench.', ru: 'Пробирка стоит на столе.' }, facts: [] },
      { stop: 1, title: { en: 'Antibody', ru: 'Антитело' }, say: { en: 'The antibody binds the target.', ru: 'Антитело связывает мишень.' }, facts: [] },
    ];
    assert.deepEqual(checkStory(job, lex), []);
  });

  it('parseLexicon skips comments and header rows', () => {
    assert.deepEqual(lex.refusedEn, ['leverage', 'unlock', 'holistic']);
    assert.deepEqual(lex.refusedRu, ['инновационн', 'уникальн']);
    assert.deepEqual(lex.terms, [
      { en: 'antibody', ru: 'антитело', avoidEn: ['Ab'], avoidRu: ['АТ'] },
    ]);
    assert.deepEqual(lex.anglicisms, [{ word: 'датасет', ru: 'набор данных' }]);
  });

  it('loadJob does not run the story check', () => {
    const job = structuredClone(zoomJobRaw);
    job.story = [
      { stop: 0, title: { en: 'We leverage GPUs', ru: 'Пробирка' }, say: { en: 'The tube.', ru: 'Пробирка.' }, facts: [] },
    ];
    assert.equal(loadJob(job, SHIPPED_LENSES).ok, true);
  });
});
