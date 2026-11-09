import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildNarration, runNarrate } from './narrate.mjs';

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_DIR = path.resolve(TOOLS_DIR, '..');
const REPO_ROOT = path.resolve(STUDIO_DIR, '..');

describe('tools/narrate.mjs (Plan 6 Task 5)', () => {
  const sampleJob = {
    world: { duration: 30 },
    paths: [{ id: 'deck', kind: 'deck', stops: [0, 10, 20], keys: [] }],
    story: [
      { stop: 0, title: { en: 'One', ru: 'Один' }, say: { en: 'First short sentence.', ru: 'Первая короткая фраза.' }, facts: [] },
      { stop: 1, title: { en: 'Two', ru: 'Два' }, say: { en: 'Second short sentence.', ru: 'Вторая короткая фраза.' }, facts: [] },
      { stop: 2, title: { en: 'Three', ru: 'Три' }, say: { en: 'Third short sentence.', ru: 'Третья короткая фраза.' }, facts: [] },
    ],
  };

  it('sentences start 0.6 s after each stop', () => {
    const entries = buildNarration(sampleJob, 'en');
    assert.deepEqual(entries.map((e) => e.a), [0.6, 10.6, 20.6]);
  });

  it('every entry has say for fish', () => {
    const entries = buildNarration(sampleJob, 'en');
    for (let i = 0; i < entries.length; i++) {
      assert.ok(entries[i].say.length > 0);
      assert.equal(entries[i].say, sampleJob.story[i].say.en);
      assert.equal(entries[i].text, entries[i].say);
    }
  });

  it('says that run into the next stop are refused', () => {
    const longJob = structuredClone(sampleJob);
    longJob.paths[0].stops = [0, 5, 20];
    longJob.story[0].say.en = Array.from({ length: 40 }, () => 'word').join(' ');
    assert.throws(() => buildNarration(longJob, 'en'), /runs into stop 1/);
  });

  it('fish needs --approved', () => {
    const res = runNarrate({ jobId: 'zoom-test', lang: 'ru', engine: 'fish', approved: false });
    assert.equal(res.code, 2);
    assert.equal(res.message, 'Fish Audio is a paid voice. Ask the owner, then add --approved.');
  });

  it('windows voice end to end', () => {
    const res = runNarrate({ jobId: 'zoom-test', lang: 'en', engine: 'sapi' });
    assert.equal(res.code, 0);
    assert.equal(fs.existsSync(res.wavOut), true);
    assert.equal(fs.existsSync(res.cuesOut), true);
    const cues = JSON.parse(fs.readFileSync(res.cuesOut, 'utf8'));
    assert.equal(cues.length, 3);
    for (const c of cues) {
      assert.ok(c.words.length > 0);
    }
    const beatsDir = path.join(REPO_ROOT, 'film', 'src', 'beats');
    if (fs.existsSync(beatsDir)) {
      const leftover = fs.readdirSync(beatsDir).filter((f) => f.startsWith('_studio-'));
      assert.deepEqual(leftover, []);
    }
  });
});
