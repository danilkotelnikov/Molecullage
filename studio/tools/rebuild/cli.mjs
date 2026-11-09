import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { applyEdits, diffJobs } from '../../core/edits.ts';
import { SHIPPED_LENSES } from '../../core/lenses.ts';
import { readEdits } from '../edits-store.mjs';
import { checkReading } from './reading.ts';
import { traceParts } from './trace.mjs';
import { assemble } from './assemble.mjs';
import { proposeInto } from './into.mjs';

const REBUILD_DIR = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_DIR = path.resolve(REBUILD_DIR, '..', '..');

export async function runRebuildCli(argv, studioDir = STUDIO_DIR) {
  let pngArg = '';
  let scratchJob = '';
  let readingArg = '';
  let intoJob = null;
  let stop = null;
  let only = undefined;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--job' || a === '--out') scratchJob = argv[++i];
    else if (a === '--reading') readingArg = argv[++i];
    else if (a === '--into') intoJob = argv[++i];
    else if (a === '--stop') stop = Number(argv[++i]);
    else if (a === '--only') only = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (!a.startsWith('--') && !pngArg) pngArg = a;
  }

  if (!scratchJob) {
    console.error('missing --job <scratch-job>');
    return 1;
  }

  const scratchDir = path.join(studioDir, 'jobs', scratchJob);
  const scratchJobFile = path.join(scratchDir, 'job.json');

  if (intoJob !== null) {
    if (!fs.existsSync(scratchJobFile)) {
      console.error(`scratch job not found: ${scratchJobFile}`);
      return 1;
    }
    const scratch = JSON.parse(fs.readFileSync(scratchJobFile, 'utf8'));
    const targetDir = path.join(studioDir, 'jobs', intoJob);
    const targetJobFile = path.join(targetDir, 'job.json');
    if (!fs.existsSync(targetJobFile)) {
      console.error(`target job not found: ${targetJobFile}`);
      return 1;
    }
    const proposedFile = path.join(targetDir, 'proposed.json');
    if (fs.existsSync(proposedFile)) {
      console.error('proposed.json exists: apply it or delete it');
      return 1;
    }

    try {
      const target = JSON.parse(fs.readFileSync(targetJobFile, 'utf8'));
      const existingEdits = readEdits(targetDir);
      const currentTarget = existingEdits.length > 0 ? applyEdits(target, existingEdits, SHIPPED_LENSES) : target;
      const proposed = proposeInto(scratch, scratchJob, currentTarget, stop, only);
      const stamped = proposed.map((e) => ({ ...e, at: new Date().toISOString() }));
      const nextTarget = applyEdits(target, [...existingEdits, ...stamped], SHIPPED_LENSES);
      const diffs = diffJobs(currentTarget, nextTarget);
      fs.writeFileSync(proposedFile, JSON.stringify(proposed, null, 2) + '\n', 'utf8');
      for (const d of diffs) {
        console.log(`${d.path}: ${JSON.stringify(d.before)} → ${JSON.stringify(d.after)}`);
      }
      console.log(`Show the owner this diff. After his yes, run: npm run edit -- ${intoJob} --apply`);
      return 0;
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      return 1;
    }
  }

  if (fs.existsSync(scratchJobFile)) {
    const existing = JSON.parse(fs.readFileSync(scratchJobFile, 'utf8'));
    if (existing.rebuild !== true) {
      console.error(`${scratchJob} is not a rebuild job`);
      return 1;
    }
  }

  fs.mkdirSync(scratchDir, { recursive: true });
  const readingFile = path.join(scratchDir, 'reading.json');
  if (readingArg) {
    const srcReading = path.isAbsolute(readingArg)
      ? readingArg
      : fs.existsSync(path.resolve(studioDir, readingArg))
        ? path.resolve(studioDir, readingArg)
        : path.resolve(studioDir, '..', readingArg);
    if (fs.existsSync(srcReading) && path.resolve(srcReading) !== path.resolve(readingFile)) {
      fs.copyFileSync(srcReading, readingFile);
    }
  }
  if (!fs.existsSync(readingFile)) {
    console.error(`reading.json not found: ${readingFile}`);
    return 1;
  }

  const rawReading = JSON.parse(fs.readFileSync(readingFile, 'utf8'));
  const checked = checkReading(rawReading);
  if (!checked.ok) {
    console.error(checked.errors.join('\n'));
    return 1;
  }

  const pngPath = path.isAbsolute(pngArg)
    ? pngArg
    : fs.existsSync(path.resolve(studioDir, pngArg))
      ? path.resolve(studioDir, pngArg)
      : path.resolve(studioDir, '..', pngArg);

  const traceOut = path.join(scratchDir, 'traced');
  const { vectors: traced, findings: traceFindings } = await traceParts(checked.reading, pngPath, traceOut);
  const { job, report: asmReport } = await assemble(checked.reading, traced, scratchDir);
  const report = [...traceFindings, ...asmReport.filter((r) => !traceFindings.some((f) => f.id === r.id && f.kind === r.kind))];

  fs.writeFileSync(scratchJobFile, JSON.stringify(job, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(scratchDir, 'report.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(scratchDir, 'rebuild-report.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(report));
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runRebuildCli(process.argv.slice(2)).then((code) => process.exit(code));
}
