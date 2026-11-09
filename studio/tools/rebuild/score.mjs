import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SHIPPED_LENSES } from '../../core/lenses.ts';
import { ensureStudioServer, launch } from '../browser.mjs';

const REBUILD_DIR = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_DIR = path.resolve(REBUILD_DIR, '..', '..');

export async function runScore(jobId, againstPng, studioDir = STUDIO_DIR) {
  const jobDir = path.join(studioDir, 'jobs', jobId);
  const jobFile = path.join(jobDir, 'job.json');
  const readingFile = path.join(jobDir, 'reading.json');
  if (!fs.existsSync(jobFile) || !fs.existsSync(readingFile)) {
    console.error(`missing job.json or reading.json in ${jobDir}`);
    return 1;
  }

  const job = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
  const lens = SHIPPED_LENSES[job.lens] ?? SHIPPED_LENSES.journal;
  const origPath = path.isAbsolute(againstPng)
    ? againstPng
    : fs.existsSync(path.resolve(studioDir, againstPng))
      ? path.resolve(studioDir, againstPng)
      : path.resolve(studioDir, '..', againstPng);

  const outPng = path.join(studioDir, 'out', jobId, 'rebuild.png');
  fs.mkdirSync(path.dirname(outPng), { recursive: true });

  // Render stop 0 of the rebuilt job at 1920x1080 in headless Chrome via launch()
  const srv = await ensureStudioServer({ job: jobId, studioDir, forceNew: studioDir !== STUDIO_DIR });
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto(`${srv.url}/?job=${encodeURIComponent(jobId)}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__studio !== undefined, null, { timeout: 15000 });
    await page.evaluate(() => window.__studio.ready);
    await page.evaluate(() => window.__studio.seek(0));
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.screenshot({ path: outPng });
  } finally {
    await browser.close();
    await srv.close();
  }

  const scoreOut = path.join(jobDir, 'score.json');
  const r2 = spawnSync(
    'py',
    ['-3', '-I', path.join(REBUILD_DIR, 'score.py'), origPath, outPng, readingFile, scoreOut, '--bg', lens.background],
    { cwd: studioDir, encoding: 'utf8' },
  );
  if (r2.status !== 0) {
    console.error(r2.stderr || r2.stdout);
    return 1;
  }

  const scoreData = JSON.parse(fs.readFileSync(scoreOut, 'utf8'));
  console.log(`mad_score=${scoreData.mad_score.toFixed(4)} edge_iou=${scoreData.edge_iou.toFixed(4)}`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const argv = process.argv.slice(2);
  let jobId = '';
  let against = '';
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--against') against = argv[++i];
    else if (!a.startsWith('--') && !jobId) jobId = a;
  }
  runScore(jobId, against).then(
    (code) => process.exit(code),
    (err) => {
      console.error(err.message || err);
      process.exit(1);
    },
  );
}
