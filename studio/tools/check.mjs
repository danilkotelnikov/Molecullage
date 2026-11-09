import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadJob } from '../core/job.ts';
import { applyEdits } from '../core/edits.ts';
import { checkBrief } from '../core/brief.ts';
import { checkFacts } from '../core/facts.ts';
import { checkStory } from '../core/story.ts';
import { readEdits } from './edits-store.mjs';
import { loadLexicon } from './lexicon.mjs';

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_DIR = path.resolve(TOOLS_DIR, '..');
const REPO_ROOT = path.resolve(STUDIO_DIR, '..');

export function readProjectAllowed(product, repoRoot = REPO_ROOT) {
  const projFile = path.join(repoRoot, 'motion', 'projects', `${product}.json`);
  if (fs.existsSync(projFile)) {
    const data = JSON.parse(fs.readFileSync(projFile, 'utf8'));
    if (Array.isArray(data.allowed)) return data.allowed;
  }
  if (product === 'arc-science') {
    return ['architecture', 'published', 'target'];
  }
  return ['architecture', 'published', 'target'];
}

export function runCheck(jobId, opts = {}) {
  const studioDir = opts.studioDir ?? STUDIO_DIR;
  const repoRoot = opts.repoRoot ?? REPO_ROOT;
  const jobDir = path.isAbsolute(jobId) ? jobId : path.join(studioDir, 'jobs', jobId);
  const jobFile = path.join(jobDir, 'job.json');
  const findings = [];

  if (!fs.existsSync(jobFile)) {
    const line = `job: file not found: ${jobFile}`;
    console.log(line);
    return { code: 1, lines: [line] };
  }

  const lensesDir = path.join(studioDir, 'lenses');
  const lenses = {};
  for (const f of fs.readdirSync(lensesDir)) {
    if (f.endsWith('.json')) {
      lenses[f.slice(0, -5)] = JSON.parse(fs.readFileSync(path.join(lensesDir, f), 'utf8'));
    }
  }
  const lensIds = Object.keys(lenses);

  const rawJson = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
  const loaded = loadJob(rawJson, lenses);
  if (!loaded.ok) {
    for (const err of loaded.errors) findings.push(`job: ${err}`);
    for (const l of findings) console.log(l);
    return { code: 1, lines: findings };
  }

  let job = loaded.job;
  const edits = readEdits(jobDir);
  if (edits.length > 0) {
    try {
      job = applyEdits(job, edits, lenses);
    } catch (err) {
      findings.push(`job: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const projectsDir = path.join(repoRoot, 'motion', 'projects');
  const projectIds = new Set(['arc-science']);
  if (fs.existsSync(projectsDir)) {
    for (const f of fs.readdirSync(projectsDir)) {
      if (f.endsWith('.json')) projectIds.add(f.slice(0, -5));
    }
  }

  if (job.brief) {
    for (const err of checkBrief(job.brief, lensIds, [...projectIds])) {
      findings.push(`brief: ${err}`);
    }
    if (job.facts) {
      const allowed = readProjectAllowed(job.brief.product, repoRoot);
      for (const err of checkFacts(job, allowed)) {
        findings.push(`facts: ${err}`);
      }
    }
  } else if (job.facts) {
    findings.push('facts: need a brief with a product');
  }

  if (job.story) {
    const lex = loadLexicon(opts.lexiconDir);
    for (const err of checkStory(job, lex)) {
      findings.push(`story: ${err}`);
    }
  }

  if (findings.length > 0) {
    for (const l of findings) console.log(l);
    return { code: 1, lines: findings };
  }

  console.log('check: clean');
  return { code: 0, lines: ['check: clean'] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const jobId = process.argv[2] ?? 'zoom-test';
  const res = runCheck(jobId);
  process.exit(res.code);
}
