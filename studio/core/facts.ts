import { evidenceError } from './world.ts';
import type { Level, Source } from './world.ts';
import type { Job } from './job.ts';

export type Fact = {
  id: string;
  text: { en: string; ru: string };
  level: Level;
  source: Source;
  usedBy: string[];
  checked?: string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?$/;

export function checkFacts(job: Job, allowed: Level[]): string[] {
  const errors: string[] = [];
  const facts = job.facts ?? [];

  const validTargets = new Set<string>();
  for (const obj of job.world?.objects ?? []) validTargets.add(obj.id);
  for (const v of job.vectors ?? []) validTargets.add(v.id);
  for (const lay of job.layout ?? []) {
    for (const blk of lay.blocks ?? []) validTargets.add(blk.id);
  }

  const seenFactIds = new Set<string>();
  const coveredTargets = new Set<string>();

  for (const f of facts) {
    if (!f || typeof f !== 'object') {
      errors.push('fact must be an object');
      continue;
    }
    if (seenFactIds.has(f.id)) errors.push(`duplicate fact id "${f.id}"`);
    seenFactIds.add(f.id);

    const evErr = evidenceError(f.id, f.source, f.level);
    if (evErr) errors.push(evErr);

    if (!allowed.includes(f.level)) {
      errors.push(`fact "${f.id}": level "${f.level}" is not allowed for this product`);
    }

    if (f.source?.kind === 'doi') {
      if (typeof f.checked !== 'string' || !ISO_DATE.test(f.checked)) {
        errors.push(`fact "${f.id}": doi source needs a valid ISO "checked" date`);
      }
    }

    for (const targetId of f.usedBy ?? []) {
      if (!validTargets.has(targetId)) {
        errors.push(`fact "${f.id}": usedBy references unknown id "${targetId}"`);
      } else {
        coveredTargets.add(targetId);
      }
    }
  }

  for (const lay of job.layout ?? []) {
    for (const blk of lay.blocks ?? []) {
      if (/\d/.test(blk.text) && !coveredTargets.has(blk.id)) {
        errors.push(`block "${blk.id}" (${lay.lang}, stop ${lay.stop}) holds a number but is not linked in any fact's usedBy`);
      }
    }
  }

  for (const obj of job.world?.objects ?? []) {
    if (obj.kind === 'number' && !coveredTargets.has(obj.id)) {
      errors.push(`number object "${obj.id}" is not linked in any fact's usedBy`);
    }
  }

  return errors;
}
