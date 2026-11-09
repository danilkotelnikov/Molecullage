import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { applyEdits, diffJobs } from '../core/edits.ts';
import { SHIPPED_LENSES } from '../core/lenses.ts';
import { appendEdit, readEdits } from './edits-store.mjs';

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_DIR = path.resolve(TOOLS_DIR, '..');

export function runWords(opts) {
  const { jobId, words, apply = false, studioDir = STUDIO_DIR } = opts;
  const jobDir = path.join(studioDir, 'jobs', jobId);
  const jobFile = path.join(jobDir, 'job.json');
  if (!fs.existsSync(jobFile)) {
    console.error(`job file not found: ${jobFile}`);
    return { code: 1, output: `job file not found: ${jobFile}` };
  }

  const baseJob = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
  const storedEdits = readEdits(jobDir);
  const currentJob = storedEdits.length > 0 ? applyEdits(baseJob, storedEdits, SHIPPED_LENSES) : baseJob;
  const proposedFile = path.join(jobDir, 'proposed.json');

  if (!fs.existsSync(proposedFile)) {
    const lines = [];
    if (words) lines.push(`Words: ${words}`);
    lines.push('Objects:');
    for (const o of currentJob.world.objects ?? []) {
      lines.push(`  - ${o.id} (${o.kind}, roles=${(o.roles ?? []).join(',')}, size=${o.size})`);
    }
    lines.push('Vectors:');
    for (const v of currentJob.vectors ?? []) {
      lines.push(`  - ${v.id} (${v.type}, text=${JSON.stringify(v.text ?? null)})`);
    }
    lines.push('Layout blocks:');
    for (const l of currentJob.layout ?? []) {
      for (const b of l.blocks ?? []) {
        lines.push(`  - stop ${l.stop} (${l.lang}) ${b.id}: ${JSON.stringify(b.text)}`);
      }
    }
    lines.push('Tracks:');
    for (const tr of currentJob.timeline?.tracks ?? []) {
      lines.push(`  - ${tr.target}.${tr.prop}: keys=[${(tr.keys ?? []).map((k) => k.t).join(', ')}]`);
    }
    lines.push('Paths:');
    for (const p of currentJob.paths ?? []) {
      lines.push(`  - ${p.id}: keys=[${(p.keys ?? []).map((k) => k.t).join(', ')}]`);
    }
    lines.push(`Write the edits to studio/jobs/${jobId}/proposed.json, then run again.`);
    const output = lines.join('\n');
    console.log(output);
    return { code: 0, output };
  }

  try {
    const rawProposed = JSON.parse(fs.readFileSync(proposedFile, 'utf8'));
    if (!Array.isArray(rawProposed)) {
      throw new Error('proposed.json must be an array of edits');
    }
    const nowIso = new Date().toISOString();
    const proposedEdits = rawProposed.map((e, idx) => ({
      ...e,
      id: e.id ?? `p-${idx}`,
      at: e.at ?? nowIso,
      by: 'agent',
    }));

    const nextJob = applyEdits(baseJob, [...storedEdits, ...proposedEdits], SHIPPED_LENSES);
    const diffs = diffJobs(currentJob, nextJob);
    const lines = diffs.map((d) => `${d.path}: ${JSON.stringify(d.before)} → ${JSON.stringify(d.after)}`);
    const output = lines.join('\n');
    if (output) console.log(output);

    if (apply) {
      for (const e of proposedEdits) {
        appendEdit(jobDir, e);
      }
      const renamed = path.join(jobDir, `proposed.applied-${Date.now()}.json`);
      fs.renameSync(proposedFile, renamed);
    }
    return { code: 0, output };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(msg);
    return { code: 1, output: msg };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const argv = process.argv.slice(2);
  let jobId = 'zoom-test';
  let words;
  let apply = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--words') words = argv[++i];
    else if (a === '--apply') apply = true;
    else if (!a.startsWith('--')) jobId = a;
  }
  const res = runWords({ jobId, words, apply });
  process.exit(res.code);
}
