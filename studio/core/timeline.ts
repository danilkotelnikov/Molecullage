import type { World } from './world.ts';

export type Ease = 'linear' | 'power2.out' | 'power2.inOut' | 'power3.out' | 'sine.inOut';
/** `ease` describes the segment that arrives at this key. The default is power2.inOut. */
export type Key = { t: number; v: number | number[]; ease?: Ease };
export type Track = { target: string; prop: string; keys: Key[] };
export type Timeline = { tracks: Track[] };

const EASES: Ease[] = ['linear', 'power2.out', 'power2.inOut', 'power3.out', 'sine.inOut'];

// No bounce, elastic or overshoot is offered, by design (stage motion standard).
export function ease(name: Ease, x: number): number {
  const c = x <= 0 ? 0 : x >= 1 ? 1 : x;
  switch (name) {
    case 'linear':
      return c;
    case 'power2.out':
      return 1 - (1 - c) * (1 - c);
    case 'power2.inOut':
      return c < 0.5 ? 2 * c * c : 1 - ((-2 * c + 2) * (-2 * c + 2)) / 2;
    case 'power3.out':
      return 1 - (1 - c) * (1 - c) * (1 - c);
    case 'sine.inOut':
      return (1 - Math.cos(Math.PI * c)) / 2;
  }
}

const copy = (v: number | number[]): number | number[] => (Array.isArray(v) ? v.slice() : v);

export function sample(track: Track, t: number): number | number[] {
  const keys = track.keys;
  if (t <= keys[0].t) return copy(keys[0].v);
  const last = keys[keys.length - 1];
  if (t >= last.t) return copy(last.v);
  // binary search: the segment i..i+1 with keys[i].t <= t < keys[i+1].t
  let lo = 0;
  let hi = keys.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (keys[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const a = keys[lo];
  const b = keys[hi];
  const e = ease(b.ease ?? 'power2.inOut', (t - a.t) / (b.t - a.t));
  if (Array.isArray(a.v) && Array.isArray(b.v)) return a.v.map((x, i) => x + ((b.v as number[])[i] - x) * e);
  return (a.v as number) + ((b.v as number) - (a.v as number)) * e;
}

const arity = (v: number | number[]) => (Array.isArray(v) ? v.length : 0);

export function validateTimeline(tl: Timeline, world: World): string[] {
  const errors: string[] = [];
  const ids = new Set(world.objects.map((o) => o.id));
  tl.tracks.forEach((tr, i) => {
    const name = `track ${i} (${tr.target}.${tr.prop})`;
    if (!ids.has(tr.target)) errors.push(`${name}: target "${tr.target}" is not a world object`);
    if (tr.keys.length === 0) {
      errors.push(`${name}: has no keys`);
      return;
    }
    for (let k = 1; k < tr.keys.length; k++) {
      if (!(tr.keys[k].t > tr.keys[k - 1].t)) {
        errors.push(`${name}: keys are not in increasing time order at key ${k}`);
        break;
      }
    }
    if (tr.keys.some((k) => arity(k.v) !== arity(tr.keys[0].v))) {
      errors.push(`${name}: keys mix value shapes (a number and a list, or lists of different length)`);
    }
    for (const k of tr.keys) {
      if (k.ease !== undefined && !EASES.includes(k.ease)) errors.push(`${name}: unknown ease "${k.ease}"`);
    }
  });
  return errors;
}
