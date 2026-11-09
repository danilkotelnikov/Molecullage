import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { budgetLine, checkBrief } from '../core/brief.ts';

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_DIR = path.resolve(TOOLS_DIR, '..');
const REPO_ROOT = path.resolve(STUDIO_DIR, '..');

export function runBrief(jobId, fromFile, studioDir = STUDIO_DIR, repoRoot = REPO_ROOT) {
  const jobFile = path.join(studioDir, 'jobs', jobId, 'job.json');
  if (!fs.existsSync(jobFile)) {
    console.error(`job file not found: ${jobFile}`);
    return 1;
  }
  const job = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
  if (fromFile) {
    const briefData = JSON.parse(fs.readFileSync(path.resolve(fromFile), 'utf8'));
    job.brief = briefData;
  }
  if (!job.brief) {
    console.error('job has no brief');
    return 1;
  }

  const lensesDir = path.join(studioDir, 'lenses');
  const lensIds = fs.readdirSync(lensesDir).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
  const projectsDir = path.join(repoRoot, 'motion', 'projects');
  const projectIds = new Set(['arc-science']);
  if (fs.existsSync(projectsDir)) {
    for (const f of fs.readdirSync(projectsDir)) {
      if (f.endsWith('.json')) projectIds.add(f.slice(0, -5));
    }
  }

  const errs = checkBrief(job.brief, lensIds, [...projectIds]);
  if (errs.length > 0) {
    for (const e of errs) console.error(e);
    return 1;
  }

  if (fromFile) {
    fs.writeFileSync(jobFile, JSON.stringify(job, null, 2) + '\n', 'utf8');
  }
  console.log(budgetLine(job.brief));
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const argv = process.argv.slice(2);
  let jobId = 'zoom-test';
  let fromFile;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--from') fromFile = argv[++i];
    else if (!argv[i].startsWith('--')) jobId = argv[i];
  }
  process.exit(runBrief(jobId, fromFile));
}
