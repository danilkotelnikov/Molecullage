import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPdf } from './pdf.mjs';
import { BIG_JOB_REFUSAL } from './export.mjs';

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_DIR = path.resolve(TOOLS_DIR, '..');

test('one page per stop and notes appear only with --notes', async () => {
  const noNotes = await buildPdf('zoom-test', {
    lens: 'journal',
    lang: 'en',
    notes: false,
    studioDir: STUDIO_DIR,
  });
  const pdfBuf1 = fs.readFileSync(noNotes.pdfPath);
  const pdfStr1 = pdfBuf1.toString('latin1');
  const pages1 = pdfStr1.match(/\/Type\s*\/Page(?!s)\b/g) ?? [];
  assert.equal(pages1.length, 3);
  assert.equal(pdfStr1.includes('We are inside the liquid now'), false);

  const withNotes = await buildPdf('zoom-test', {
    lens: 'journal',
    lang: 'en',
    notes: true,
    studioDir: STUDIO_DIR,
  });
  const pdfBuf2 = fs.readFileSync(withNotes.pdfPath);
  const pdfStr2 = pdfBuf2.toString('latin1');
  const pages2 = pdfStr2.match(/\/Type\s*\/Page(?!s)\b/g) ?? [];
  assert.equal(pages2.length, 3);
  assert.equal(pdfStr2.includes('We are inside the liquid now'), true);
});

test('big job without approval is refused', async () => {
  const bigDir = path.join(STUDIO_DIR, 'jobs', 'big-pdf-test');
  fs.rmSync(bigDir, { recursive: true, force: true });
  fs.cpSync(path.join(STUDIO_DIR, 'jobs', 'zoom-test'), bigDir, { recursive: true });
  try {
    const jobFile = path.join(bigDir, 'job.json');
    const job = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
    job.paths[0].stops = [0, 1, 2, 3, 4, 6, 8];
    delete job.storyboard;
    fs.writeFileSync(jobFile, JSON.stringify(job, null, 2));

    await assert.rejects(
      () => buildPdf('big-pdf-test', { lens: 'journal', lang: 'en', studioDir: STUDIO_DIR }),
      (err) => {
        assert.equal(err.code, 2);
        assert.ok(err.message.includes(BIG_JOB_REFUSAL));
        return true;
      },
    );
  } finally {
    fs.rmSync(bigDir, { recursive: true, force: true });
  }
});
