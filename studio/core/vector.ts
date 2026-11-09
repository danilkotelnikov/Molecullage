import { evidenceError } from './world.ts';
import type { Level, Source, World } from './world.ts';

export type VectorType = 'path' | 'shape' | 'arrow' | 'label' | 'image' | 'group';

export type VectorObject = {
  id: string;
  type: VectorType;
  frame: string | null;
  box: [number, number, number, number];
  d?: string;
  shape?: 'rect' | 'ellipse';
  from?: [number, number];
  to?: [number, number];
  text?: { en: string; ru?: string };
  href?: string;
  children?: string[];
  roles: string[];
  source: Source;
  evidence: Level;
  window: [number, number];
};

const VALID_TYPES = new Set<VectorType>(['path', 'shape', 'arrow', 'label', 'image', 'group']);

export function validateVectors(vectors: VectorObject[], world: World): string[] {
  const errors: string[] = [];
  if (!Array.isArray(vectors)) return ['vectors must be an array'];

  const worldIds = new Set((world?.objects ?? []).map((o) => o.id));
  const frameIds = new Set((world?.frames ?? []).map((f) => f.id));
  const vecIds = new Set<string>();
  const byId = new Map<string, VectorObject>();

  for (const v of vectors) {
    if (!v || typeof v !== 'object') {
      errors.push('vector entry must be an object');
      continue;
    }
    if (!v.id || typeof v.id !== 'string') {
      errors.push('vector needs a non-empty string id');
      continue;
    }
    if (worldIds.has(v.id) || vecIds.has(v.id)) {
      errors.push(`duplicate id "${v.id}"`);
    }
    vecIds.add(v.id);
    byId.set(v.id, v);

    if (!VALID_TYPES.has(v.type)) {
      errors.push(`vector "${v.id}": unknown type "${v.type}"`);
    }
    if (v.frame !== null && !frameIds.has(v.frame)) {
      errors.push(`vector "${v.id}": unknown frame "${v.frame}"`);
    }
    if (!Array.isArray(v.box) || v.box.length !== 4 || !(v.box[2] > 0 && v.box[3] > 0)) {
      errors.push(`vector "${v.id}": box must be [x, y, w, h] with positive width and height`);
    }
    if (!Array.isArray(v.roles) || v.roles.length === 0) {
      errors.push(`vector "${v.id}": roles cannot be empty`);
    }
    if (!Array.isArray(v.window) || v.window.length !== 2 || v.window[0] < 0 || v.window[1] > world.duration || v.window[0] > v.window[1]) {
      errors.push(`vector "${v.id}": window is outside [0, ${world.duration}]`);
    }

    if (v.type === 'path' && (typeof v.d !== 'string' || !v.d.trim())) {
      errors.push(`vector "${v.id}": path needs field "d"`);
    }
    if (v.type === 'shape' && v.shape !== 'rect' && v.shape !== 'ellipse') {
      errors.push(`vector "${v.id}": shape needs field "shape" ('rect' or 'ellipse')`);
    }
    if (v.type === 'arrow') {
      if (!Array.isArray(v.from) || v.from.length !== 2) errors.push(`vector "${v.id}": arrow needs field "from"`);
      if (!Array.isArray(v.to) || v.to.length !== 2) errors.push(`vector "${v.id}": arrow needs field "to"`);
    }
    if (v.type === 'label' && (!v.text || typeof v.text.en !== 'string' || !v.text.en.trim())) {
      errors.push(`vector "${v.id}": label needs field "text" with text.en`);
    }
    if (v.type === 'image' && (typeof v.href !== 'string' || !v.href.trim())) {
      errors.push(`vector "${v.id}": image needs field "href"`);
    }
    if (v.type === 'group' && !Array.isArray(v.children)) {
      errors.push(`vector "${v.id}": group needs field "children"`);
    }

    if (v.source && v.evidence) {
      const evErr = evidenceError(v.id, v.source, v.evidence);
      if (evErr) errors.push(evErr);
    } else {
      errors.push(`vector "${v.id}": source and evidence are required`);
    }
  }

  // Group children existence and cycle check
  for (const v of vectors) {
    if (v.type !== 'group' || !Array.isArray(v.children)) continue;
    for (const childId of v.children) {
      if (!byId.has(childId)) {
        errors.push(`vector "${v.id}": unknown child "${childId}"`);
      }
    }
  }

  const state = new Map<string, 'visiting' | 'done'>();
  let loopReported = false;
  const dfs = (id: string) => {
    if (loopReported) return;
    const st = state.get(id);
    if (st === 'visiting') {
      errors.push(`group loop involving "${id}"`);
      loopReported = true;
      return;
    }
    if (st === 'done') return;
    state.set(id, 'visiting');
    const node = byId.get(id);
    if (node && node.type === 'group' && Array.isArray(node.children)) {
      for (const c of node.children) {
        if (byId.has(c)) dfs(c);
      }
    }
    state.set(id, 'done');
  };
  for (const v of vectors) {
    if (v.type === 'group' && !state.has(v.id)) dfs(v.id);
  }

  return errors;
}
