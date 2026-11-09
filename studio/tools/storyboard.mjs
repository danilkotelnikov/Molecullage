// studio/tools/storyboard.mjs — Contact-sheet storyboard builder for blind reads (Plan 6 Task 6).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch } from './browser.mjs';
import { stillsAt } from './still.mjs';

const STUDIO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function buildStoryboard(jobOrOpts = {}, maybeOpts = {}) {
  const opts = typeof jobOrOpts === 'string' ? { ...maybeOpts, jobId: jobOrOpts } : jobOrOpts;
  const { jobId, lensId, studioDir = STUDIO_DIR } = opts;
  const jobPath = path.join(studioDir, 'jobs', jobId, 'job.json');
  const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
  const resolvedLensId = lensId || job.lens || 'journal';
  const lensPath = path.join(studioDir, 'lenses', `${resolvedLensId}.json`);
  const lens = fs.existsSync(lensPath)
    ? JSON.parse(fs.readFileSync(lensPath, 'utf8'))
    : { background: '#FFFFFF', text: { family: 'Arial', color: '#0A0A0A', minPx: 37 } };

  const outDir = path.join(studioDir, 'out', 'storyboard', jobId);
  const reviewDir = path.join(studioDir, 'jobs', jobId, 'review');
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(reviewDir, { recursive: true });

  const deckPath = (job.paths ?? []).find((p) => p.kind === 'deck') ?? job.paths?.[0];
  const stopTimes = Array.isArray(deckPath?.stops) && deckPath.stops.length > 0 ? deckPath.stops : [0];
  const pngPaths = await stillsAt(jobId, resolvedLensId, 'en', stopTimes, outDir, { studioDir });

  const slides = Array.isArray(job.story) ? job.story : [];
  const layouts = Array.isArray(job.layout) ? job.layout : [];

  const cards = stopTimes
    .map((t, i) => {
      const slide = slides.find((s) => s.stop === i);
      const enLayout = layouts.find((l) => l.stop === i && l.lang === 'en');
      const ruLayout = layouts.find((l) => l.stop === i && l.lang === 'ru');
      const enTitle =
        slide?.title?.en ||
        enLayout?.blocks?.find((b) => b.role === 'title')?.text ||
        `Stop ${i + 1}`;
      const ruTitle =
        slide?.title?.ru ||
        ruLayout?.blocks?.find((b) => b.role === 'title')?.text ||
        '';
      const sayText = slide?.say?.en || job.notes?.[String(i)]?.en || '';
      const fileName = path.basename(pngPaths[i]);
      return `    <figure class="cell">
      <img src="${escapeHtml(fileName)}" alt="Stop ${i}" />
      <figcaption class="meta">
        <div class="stop-index">${i + 1} · t = ${Number(t).toFixed(1)}s</div>
        <div class="title-en">${escapeHtml(enTitle)}</div>
        <div class="title-ru">${escapeHtml(ruTitle)}</div>
        <p class="say">${escapeHtml(sayText)}</p>
      </figcaption>
    </figure>`;
    })
    .join('\n');

  const bg = lens.background ?? '#FFFFFF';
  const fg = lens.text?.color ?? '#0A0A0A';
  const fontFamily = `${lens.text?.family ?? 'Arial'}, Arial, sans-serif`;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Storyboard — ${escapeHtml(jobId)}</title>
  <style>
    body {
      margin: 0;
      padding: 24px;
      width: 1920px;
      box-sizing: border-box;
      background: ${bg};
      color: ${fg};
      font-family: ${fontFamily};
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
    .cell {
      margin: 0;
      border: 1px solid ${fg}33;
      padding: 12px;
    }
    .cell img {
      width: 100%;
      height: auto;
      display: block;
    }
    .meta {
      margin-top: 8px;
    }
    .stop-index {
      font-size: 13px;
      opacity: 0.7;
    }
    .title-en {
      font-weight: 700;
      font-size: 18px;
      margin-top: 4px;
    }
    .title-ru {
      font-size: 15px;
      opacity: 0.8;
    }
    .say {
      font-size: 14px;
      line-height: 1.4;
      margin: 6px 0 0;
    }
  </style>
</head>
<body>
  <div class="grid">
${cards}
  </div>
</body>
</html>
`;

  const sheetHtml = path.join(outDir, 'sheet.html');
  fs.writeFileSync(sheetHtml, html, 'utf8');

  const sheetPng = path.join(outDir, 'sheet.png');
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto(pathToFileURL(sheetHtml).href, { waitUntil: 'load' });
    await page.screenshot({ path: sheetPng, fullPage: true });
  } finally {
    await browser.close();
  }

  return { ok: true, outDir, sheetHtml, sheetPng, stops: stopTimes.length, pngPaths, stills: pngPaths };
}

async function main() {
  const args = process.argv.slice(2);
  let jobId = null;
  let lensId;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--lens') lensId = args[++i];
    else if (!args[i].startsWith('--') && !jobId) jobId = args[i];
  }
  jobId = jobId || process.env.STUDIO_JOB || 'arc-science';
  const res = await buildStoryboard({ jobId, lensId });
  console.log(JSON.stringify(res));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
