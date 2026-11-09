import { loadJob, type Job } from './job.ts';
import type { Lens } from './lens.ts';
import { SHIPPED_LENSES } from './lenses.ts';

export type Edit = {
  id: string;
  at: string;
  by: 'the owner' | 'agent';
  op: 'set' | 'add' | 'remove' | 'retime';
  path: string;
  value?: unknown;
};

function decodeToken(token: string): string {
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

function parsePointer(path: string): string[] {
  if (path === '') return [];
  if (!path.startsWith('/')) {
    throw new Error(`no value at ${path}`);
  }
  return path.slice(1).split('/').map(decodeToken);
}

export function getAt(doc: unknown, path: string): unknown {
  const tokens = parsePointer(path);
  let cur: unknown = doc;
  for (const tok of tokens) {
    if (cur === null || typeof cur !== 'object') {
      throw new Error(`no value at ${path}`);
    }
    if (Array.isArray(cur)) {
      const idx = Number(tok);
      if (!Number.isInteger(idx) || idx < 0 || idx >= cur.length) {
        throw new Error(`no value at ${path}`);
      }
      cur = cur[idx];
    } else {
      const rec = cur as Record<string, unknown>;
      if (!(tok in rec)) {
        throw new Error(`no value at ${path}`);
      }
      cur = rec[tok];
    }
  }
  return cur;
}

function resolveParent(doc: unknown, path: string): { parent: unknown; token: string } {
  const tokens = parsePointer(path);
  if (tokens.length === 0) {
    throw new Error(`no value at ${path}`);
  }
  const parentPath = tokens.length === 1 ? '' : '/' + tokens.slice(0, -1).map((t) => t.replace(/~/g, '~0').replace(/\//g, '~1')).join('/');
  const parent = getAt(doc, parentPath);
  if (parent === null || typeof parent !== 'object') {
    throw new Error(`no value at ${path}`);
  }
  return { parent, token: tokens[tokens.length - 1] };
}

function applyOneEdit(doc: Job, edit: Edit): void {
  const { op, path, value } = edit;
  if (op === 'set') {
    const { parent, token } = resolveParent(doc, path);
    if (Array.isArray(parent)) {
      const idx = Number(token);
      if (!Number.isInteger(idx) || idx < 0 || idx >= parent.length) {
        throw new Error(`no value at ${path}`);
      }
      parent[idx] = structuredClone(value);
    } else {
      const rec = parent as Record<string, unknown>;
      rec[token] = structuredClone(value);
    }
    return;
  }

  if (op === 'add') {
    const { parent, token } = resolveParent(doc, path);
    if (Array.isArray(parent)) {
      if (token === '-') {
        parent.push(structuredClone(value));
      } else {
        const idx = Number(token);
        if (!Number.isInteger(idx) || idx < 0 || idx > parent.length) {
          throw new Error(`no value at ${path}`);
        }
        parent.splice(idx, 0, structuredClone(value));
      }
    } else {
      const rec = parent as Record<string, unknown>;
      rec[token] = structuredClone(value);
    }
    return;
  }

  if (op === 'remove') {
    const { parent, token } = resolveParent(doc, path);
    if (Array.isArray(parent)) {
      const idx = Number(token);
      if (!Number.isInteger(idx) || idx < 0 || idx >= parent.length) {
        throw new Error(`no value at ${path}`);
      }
      parent.splice(idx, 1);
    } else {
      const rec = parent as Record<string, unknown>;
      if (!(token in rec)) {
        throw new Error(`no value at ${path}`);
      }
      delete rec[token];
    }
    return;
  }

  if (op === 'retime') {
    const { parent, token } = resolveParent(doc, path);
    if (!Array.isArray(parent)) {
      throw new Error(`no value at ${path}`);
    }
    const idx = Number(token);
    if (!Number.isInteger(idx) || idx < 0 || idx >= parent.length) {
      throw new Error(`no value at ${path}`);
    }
    const item = parent[idx] as Record<string, unknown>;
    if (!item || typeof item !== 'object' || typeof item.t !== 'number') {
      throw new Error(`no numeric t at ${path}`);
    }
    const numVal = Number(value);
    if (!Number.isFinite(numVal)) {
      throw new Error(`retime value must be finite`);
    }
    const snapped = Math.round(numVal * 30) / 30;
    if (idx > 0) {
      const prev = parent[idx - 1] as Record<string, unknown>;
      if (typeof prev?.t === 'number' && snapped <= prev.t) {
        throw new Error('retime breaks key order');
      }
    }
    if (idx < parent.length - 1) {
      const next = parent[idx + 1] as Record<string, unknown>;
      if (typeof next?.t === 'number' && snapped >= next.t) {
        throw new Error('retime breaks key order');
      }
    }
    item.t = snapped;
    return;
  }

  throw new Error(`unknown op ${String(op)}`);
}

export function applyEdits(
  job: Job,
  edits: Edit[],
  lenses: Record<string, Lens> = SHIPPED_LENSES
): Job {
  const copy = structuredClone(job);
  for (const edit of edits) {
    try {
      applyOneEdit(copy, edit);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`edit ${edit.id}: ${msg}`);
    }
  }
  const check = loadJob(copy, lenses);
  if (!check.ok) {
    throw new Error('edits make the job invalid: ' + check.errors.join('; '));
  }
  return check.job;
}

export function undo(edits: Edit[]): Edit[] {
  if (edits.length === 0) return [];
  return edits.slice(0, -1);
}

function isLeaf(v: unknown): boolean {
  return v === null || typeof v !== 'object';
}

function escapeToken(t: string): string {
  return t.replace(/~/g, '~0').replace(/\//g, '~1');
}

export function diffJobs(
  a: Job,
  b: Job
): { path: string; before: unknown; after: unknown }[] {
  const diffs: { path: string; before: unknown; after: unknown }[] = [];

  function walk(va: unknown, vb: unknown, path: string): void {
    if (Object.is(va, vb)) return;
    if (isLeaf(va) || isLeaf(vb)) {
      diffs.push({ path, before: va, after: vb });
      return;
    }
    if (Array.isArray(va) && Array.isArray(vb)) {
      const maxLen = Math.max(va.length, vb.length);
      for (let i = 0; i < maxLen; i++) {
        walk(va[i], vb[i], `${path}/${i}`);
      }
      return;
    }
    if (Array.isArray(va) !== Array.isArray(vb)) {
      diffs.push({ path, before: va, after: vb });
      return;
    }
    const ra = va as Record<string, unknown>;
    const rb = vb as Record<string, unknown>;
    const keys = new Set([...Object.keys(ra), ...Object.keys(rb)]);
    for (const k of keys) {
      walk(ra[k], rb[k], `${path}/${escapeToken(k)}`);
    }
  }

  walk(a, b, '');
  return diffs;
}
