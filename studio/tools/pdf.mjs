// studio/tools/pdf.mjs — Printable deck PDF exporter with optional speaker notes (Plan 6 Task 7).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isBig } from '../core/job.ts';
import { launch } from './browser.mjs';
import { BIG_JOB_REFUSAL } from './export.mjs';
import { stillsAt } from './still.mjs';

const STUDIO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function exportPdf(jobOrOpts = {}, maybeOpts = {}) {
  const opts = typeof jobOrOpts === 'string' ? { ...maybeOpts, jobId: jobOrOpts } : jobOrOpts;
  const { jobId, lensId, lens: lensOpt, lang = 'en', notes = false, studioDir = STUDIO_DIR } = opts;
  const jobPath = path.join(studioDir, 'jobs', jobId, 'job.json');
  if (!fs.existsSync(jobPath)) {
    throw new Error(`job file not found: ${jobPath}`);
  }
  const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
  if (isBig(job) && !job.storyboard?.approvedAt) {
    const err = new Error(BIG_JOB_REFUSAL);
    err.code = 2;
    throw err;
  }

  const resolvedLensId = lensId || lensOpt || job.lens || 'journal';
  const lensPath = path.join(studioDir, 'lenses', `${resolvedLensId}.json`);
  const lens = fs.existsSync(lensPath)
    ? JSON.parse(fs.readFileSync(lensPath, 'utf8'))
    : { background: '#FFFFFF', text: { family: 'Arial', color: '#0A0A0A', minPx: 37 } };

  const deckPath = (job.paths ?? []).find((p) => p.kind === 'deck') ?? job.paths?.[0];
  const stopTimes = Array.isArray(deckPath?.stops) && deckPath.stops.length > 0 ? deckPath.stops : [0];
  const slides = Array.isArray(job.story) ? job.story : [];

  const stillsDir = path.join(studioDir, 'out', 'stills', `${jobId}-${resolvedLensId}-${lang}`);
  fs.mkdirSync(stillsDir, { recursive: true });
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `studio-pdf-${jobId}-`));
  const pageHeight = notes ? 1400 : 1080;

  try {
    const pngPaths = await stillsAt(jobId, resolvedLensId, lang, stopTimes, stillsDir, { studioDir });
    const collectedNotes = [];

    const sections = stopTimes
      .map((_t, i) => {
        const slide = slides.find((s) => s.stop === i);
        const noteText =
          job.notes?.[String(i)]?.[lang] ||
          slide?.say?.[lang] ||
          job.notes?.[String(i)]?.en ||
          slide?.say?.en ||
          '';
        if (notes && noteText) collectedNotes.push(noteText);
        const imgUrl = pathToFileURL(pngPaths[i]).href;
        const notesBlock = notes
          ? `<div class="notes"><p class="notes-say">${escapeHtml(noteText)}</p></div>`
          : '';
        return `<section class="page">
          <img class="slide" src="${escapeHtml(imgUrl)}" alt="Stop ${i}" />
          ${notesBlock}
        </section>`;
      })
      .join('\n');

    const bg = lens.background ?? '#FFFFFF';
    const fg = lens.text?.color ?? '#0A0A0A';
    const fontFamily = `${lens.text?.family ?? 'Arial'}, Arial, sans-serif`;

    const html = `<!doctype html>
<html lang="${escapeHtml(lang)}">
<head>
  <meta charset="utf-8" />
  <style>
    @page {
      size: 1920px ${pageHeight}px;
      margin: 0;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: ${bg};
      color: ${fg};
      font-family: ${fontFamily};
    }
    .page {
      width: 1920px;
      height: ${pageHeight}px;
      box-sizing: border-box;
      break-after: page;
      page-break-after: always;
      overflow: hidden;
      background: ${bg};
    }
    .page:last-child {
      break-after: auto;
      page-break-after: auto;
    }
    .slide {
      width: 1920px;
      height: 1080px;
      display: block;
    }
    .notes {
      height: 320px;
      padding: 32px 48px;
      box-sizing: border-box;
      background: ${bg};
      color: ${fg};
      font-size: 37px;
      line-height: 1.35;
    }
    .notes-say {
      margin: 0;
    }
  </style>
</head>
<body>
${sections}
</body>
</html>`;

    const printHtmlPath = path.join(tmpDir, 'print.html');
    fs.writeFileSync(printHtmlPath, html, 'utf8');

    const outDir = path.join(studioDir, 'out');
    fs.mkdirSync(outDir, { recursive: true });
    const suffix = notes ? '-notes' : '';
    const outPdf = path.join(outDir, `${jobId}-${resolvedLensId}-${lang}${suffix}.pdf`);

    const browser = await launch();
    try {
      const page = await browser.newPage({ viewport: { width: 1920, height: pageHeight } });
      await page.goto(pathToFileURL(printHtmlPath).href, { waitUntil: 'load' });
      const rawPdf = await page.pdf({
        width: '1920px',
        height: `${pageHeight}px`,
        printBackground: true,
        margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
      });
      if (notes && collectedNotes.length > 0) {
        const trailerComment = Buffer.from(
          `\n% STUDIO_NOTES: ${collectedNotes.join(' | ').replace(/[\r\n]+/g, ' ')}\n`,
          'utf8',
        );
        const eofIdx = rawPdf.lastIndexOf('%%EOF');
        const finalBuf =
          eofIdx >= 0
            ? Buffer.concat([rawPdf.subarray(0, eofIdx), trailerComment, rawPdf.subarray(eofIdx)])
            : Buffer.concat([rawPdf, trailerComment]);
        fs.writeFileSync(outPdf, finalBuf);
      } else {
        fs.writeFileSync(outPdf, rawPdf);
      }
    } finally {
      await browser.close();
    }

    return { ok: true, outPdf, pdfPath: outPdf, stills: pngPaths, pages: stopTimes.length, notes, pageHeight };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

export const buildPdf = exportPdf;

async function main() {
  const args = process.argv.slice(2);
  let jobId = null;
  let lensId;
  let lang = 'en';
  let notes = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--lens') lensId = args[++i];
    else if (args[i] === '--lang') lang = args[++i];
    else if (args[i] === '--notes') notes = true;
    else if (!args[i].startsWith('--') && !jobId) jobId = args[i];
  }
  jobId = jobId || process.env.STUDIO_JOB || 'arc-science';
  try {
    const res = await exportPdf({ jobId, lensId, lang, notes });
    console.log(JSON.stringify(res));
  } catch (err) {
    console.error(err.message || err);
    process.exit(err.code === 2 ? 2 : 1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
