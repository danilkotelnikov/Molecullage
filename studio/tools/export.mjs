import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { checkJob } from './checks.mjs';

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_DIR = path.resolve(TOOLS_DIR, '..');
const ALLOWED_FORMATS = new Set(['png', 'svg', 'mp4']);

function padFrame(n) {
  return String(n).padStart(5, '0');
}

/**
 * Pure export planner supporting png, svg, and mp4 frame sequence plans.
 * Computes frame timestamps, worker slices, output paths, page query, and ffmpeg arguments.
 */
export function buildExportPlan(job, opts = {}) {
  if (!job || typeof job !== 'object' || !job.world) {
    throw new Error('buildExportPlan requires a valid job with world');
  }

  const rawFormats = Array.isArray(opts.format)
    ? opts.format
    : opts.format
      ? [opts.format]
      : ['mp4'];
  for (const fmt of rawFormats) {
    if (!ALLOWED_FORMATS.has(fmt)) {
      throw new Error(`unsupported export format "${fmt}" (expected png, svg, or mp4)`);
    }
  }
  const formats = [...new Set(rawFormats)];
  const primaryFormat = formats[0];

  const fps = opts.fps ?? 30;
  if (!(fps > 0) || !Number.isFinite(fps)) {
    throw new Error(`invalid fps ${fps}; must be a positive number`);
  }

  const workers = Math.max(1, Math.trunc(opts.workers ?? 1));
  const jobId = opts.jobId ?? job.world.id ?? 'zoom-test';
  const lens = opts.lens ?? job.lens ?? 'journal';
  const lang = opts.lang ?? job.langs?.[0] ?? 'en';
  const deckPath = job.paths?.find((p) => p.kind === 'deck') ?? job.paths?.[0];
  const pathId = opts.path ?? deckPath?.id ?? 'deck';
  const duration = Number(job.world.duration ?? 0);
  if (!(duration > 0)) {
    throw new Error(`job "${jobId}" has non-positive duration ${duration}`);
  }

  const outDir = opts.outDir ?? path.join(STUDIO_DIR, 'out');
  const stem = `${jobId}-${lens}-${lang}`;
  const frameDir = path.join(outDir, 'frames', stem);
  const svgDir = path.join(outDir, 'svg', stem);
  const mp4Path = path.join(outDir, `${stem}.mp4`);
  const checksPath = path.join(outDir, `${stem}.checks.json`);

  const frameCount = Math.max(1, Math.round(duration * fps));
  const frames = [];
  for (let i = 0; i < frameCount; i++) {
    const t = Number((i / fps).toFixed(6));
    const code = padFrame(i);
    const entry = {
      index: i,
      frame: i,
      t,
      pngPath: path.join(frameDir, `${code}.png`),
      svgPath: path.join(svgDir, `${code}.svg`),
    };
    frames.push(entry);
  }

  const stops = (deckPath?.stops ?? [0]).map((stopT, stopIdx) => ({
    stop: stopIdx,
    t: stopT,
    frame: Math.min(frameCount - 1, Math.max(0, Math.round(stopT * fps))),
    pngPath: path.join(outDir, 'stills', stem, `stop-${String(stopIdx).padStart(2, '0')}.png`),
    svgPath: path.join(outDir, 'stills', stem, `stop-${String(stopIdx).padStart(2, '0')}.svg`),
  }));

  const workerSlices = [];
  const baseSlice = Math.floor(frameCount / workers);
  const rem = frameCount % workers;
  let cursor = 0;
  for (let w = 0; w < workers; w++) {
    const count = baseSlice + (w < rem ? 1 : 0);
    if (count <= 0) break;
    workerSlices.push({
      worker: w,
      startFrame: cursor,
      endFrame: cursor + count - 1,
      frames: frames.slice(cursor, cursor + count),
    });
    cursor += count;
  }

  const query = `?job=${encodeURIComponent(jobId)}&lens=${encodeURIComponent(lens)}&lang=${encodeURIComponent(lang)}&path=${encodeURIComponent(pathId)}`;

  const ffmpegArgs = formats.includes('mp4')
    ? [
        '-y',
        '-framerate',
        String(fps),
        '-i',
        path.join(frameDir, '%05d.png'),
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-crf',
        '18',
        mp4Path,
      ]
    : [];

  return {
    jobId,
    format: primaryFormat,
    formats,
    lens,
    lang,
    path: pathId,
    fps,
    workers,
    duration,
    frameCount,
    frames,
    stops,
    workerSlices,
    query,
    outputs: {
      outDir,
      frameDir,
      svgDir: formats.includes('svg') ? svgDir : undefined,
      mp4: formats.includes('mp4') ? mp4Path : undefined,
      checksPath,
    },
    ffmpegArgs,
  };
}

function parseCliArgs(argv) {
  const opts = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--lens') opts.lens = argv[++i];
    else if (a === '--lang') opts.lang = argv[++i];
    else if (a === '--path') opts.path = argv[++i];
    else if (a === '--format') opts.format = argv[++i];
    else if (a === '--fps') opts.fps = Number(argv[++i]);
    else if (a === '--workers') opts.workers = Number(argv[++i]);
    else if (a === '--out') opts.outDir = argv[++i];
    else if (a === '--dry-run' || a === '--plan') opts.dryRun = true;
    else if (!a.startsWith('--')) positional.push(a);
  }
  opts.jobId = positional[0] ?? 'zoom-test';
  return opts;
}

// CLI runner: node tools/export.mjs <job> [--lens <id>] [--lang <en|ru>] [--path <id>] [--format png|svg|mp4] [--fps <n>] [--workers <n>] [--plan]
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const opts = parseCliArgs(process.argv.slice(2));
  const jobDir = path.resolve(STUDIO_DIR, 'jobs', opts.jobId);
  const jobFile = path.join(jobDir, 'job.json');
  if (!fs.existsSync(jobFile)) {
    console.error(`job file not found: ${jobFile}`);
    process.exit(1);
  }
  const job = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
  const check = checkJob(job, { jobDir });
  const plan = buildExportPlan(job, opts);
  fs.mkdirSync(plan.outputs.outDir, { recursive: true });
  fs.writeFileSync(plan.outputs.checksPath, JSON.stringify(check.findings, null, 2));
  console.log(
    JSON.stringify(
      {
        ok: check.ok,
        jobId: plan.jobId,
        formats: plan.formats,
        lens: plan.lens,
        lang: plan.lang,
        path: plan.path,
        fps: plan.fps,
        frameCount: plan.frameCount,
        workers: plan.workerSlices.length,
        checksPath: plan.outputs.checksPath,
      },
      null,
      2,
    ),
  );
  if (!check.ok) process.exit(1);
}

