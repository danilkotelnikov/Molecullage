import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { budgetLine, checkBrief, type Brief } from '../brief.ts';
import { loadJob } from '../job.ts';
import { SHIPPED_LENSES } from '../lenses.ts';

const zoomJobRaw = JSON.parse(
  fs.readFileSync(new URL('../../jobs/zoom-test/job.json', import.meta.url), 'utf8'),
);

const validBrief: Brief = {
  idea: 'Show the Arc Science engine across scales',
  details: 'Walk from architecture to molecular site',
  concepts: ['scale', 'honesty'],
  audience: 'Yandex Cloud science programme lead',
  product: 'arc-science',
  langs: ['en', 'ru'],
  timeBudget: { hours: 8 },
  files: [],
};

const lensIds = ['journal', 'cinematic'];
const projectIds = ['arc-science', 'miraeles'];

describe('brief (Plan 6 Task 1)', () => {
  it('accepts a full brief', () => {
    assert.deepEqual(checkBrief(validBrief, lensIds, projectIds), []);
  });

  it('budget must be between 0.5 and 120 hours', () => {
    const low = checkBrief({ ...validBrief, timeBudget: { hours: 0 } }, lensIds, projectIds);
    const high = checkBrief({ ...validBrief, timeBudget: { hours: 200 } }, lensIds, projectIds);
    assert.ok(low.some((e) => e.includes('timeBudget')));
    assert.ok(high.some((e) => e.includes('timeBudget')));
  });

  it('langs cannot be empty and hold only en or ru', () => {
    const empty = checkBrief({ ...validBrief, langs: [] }, lensIds, projectIds);
    assert.ok(empty.some((e) => e.includes('langs')));
    const bad = checkBrief({ ...validBrief, langs: ['de' as 'en'] }, lensIds, projectIds);
    assert.ok(bad.some((e) => e.includes('"de"')));
  });

  it('unknown lens', () => {
    const errs = checkBrief({ ...validBrief, lens: 'poster' }, lensIds, projectIds);
    assert.ok(errs.some((e) => e.includes('unknown lens "poster"')));
  });

  it('product must have a project file', () => {
    const errs = checkBrief({ ...validBrief, product: 'nope' }, lensIds, projectIds);
    assert.ok(errs.some((e) => e.includes('motion/projects/nope.json')));
  });

  it('budgetLine wording', () => {
    assert.equal(
      budgetLine(validBrief),
      'Time budget: 8 h. Languages: en, ru. Product: arc-science.',
    );
  });

  it('loadJob does not run the brief check', () => {
    const jobWithBadBrief = {
      ...structuredClone(zoomJobRaw),
      brief: { ...validBrief, timeBudget: { hours: 0 } },
    };
    const res = loadJob(jobWithBadBrief, SHIPPED_LENSES);
    assert.equal(res.ok, true);

    const dupWorld = structuredClone(jobWithBadBrief);
    dupWorld.world.objects[1].id = dupWorld.world.objects[0].id;
    const resDup = loadJob(dupWorld, SHIPPED_LENSES);
    assert.equal(resDup.ok, false);
    if (!resDup.ok) {
      assert.equal(resDup.errors.some((e) => e.includes('timeBudget')), false);
    }
  });
});
