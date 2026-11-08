import { z } from 'zod';

export type Level = 'measured' | 'published' | 'simulated' | 'architecture' | 'target';
export type Source = { kind: 'doi' | 'pdb' | 'url' | 'file' | 'engine'; ref: string };
export type Frame = {
  id: string;
  parent: string | null;
  unit: number; // metres per unit
  origin: [number, number, number]; // in parent units
};
export type WorldObject = {
  id: string;
  kind: 'molecule' | 'mesh' | 'surface' | 'vector' | 'text' | 'number' | 'chart' | 'image' | 'group';
  frame: string;
  position: [number, number, number];
  size: number; // metres
  source: Source;
  evidence: Level;
  window: [number, number];
  roles: string[];
  asset?: string;
  standIn?: { asset: string; swapAt: number }; // swapAt: camera distance, metres
  rotation?: [number, number, number]; // turns the object: x, y, z angles in radians (Euler XYZ)
};
export type World = { id: string; duration: number; frames: Frame[]; objects: WorldObject[] };

// Levels from strongest to weakest, as in motion/core/schema.js.
const LEVELS: Level[] = ['measured', 'published', 'simulated', 'architecture', 'target'];

const vec3 = z.tuple([z.number(), z.number(), z.number()]);
const frameSchema = z.strictObject({
  id: z.string().min(1),
  parent: z.string().min(1).nullable(),
  unit: z.number(),
  origin: vec3,
});
const objectSchema = z.strictObject({
  id: z.string().min(1),
  kind: z.enum(['molecule', 'mesh', 'surface', 'vector', 'text', 'number', 'chart', 'image', 'group']),
  frame: z.string().min(1),
  position: vec3,
  size: z.number(),
  source: z.strictObject({ kind: z.enum(['doi', 'pdb', 'url', 'file', 'engine']), ref: z.string() }),
  evidence: z.enum(LEVELS as [Level, ...Level[]]),
  window: z.tuple([z.number(), z.number()]),
  roles: z.array(z.string().min(1)),
  asset: z.string().min(1).optional(),
  standIn: z.strictObject({ asset: z.string().min(1), swapAt: z.number().positive() }).optional(),
  rotation: vec3.optional(),
});
const worldSchema = z.strictObject({
  id: z.string().min(1),
  duration: z.number().positive(),
  frames: z.array(frameSchema).min(1),
  objects: z.array(objectSchema),
});

/** The error text for one object, or null when the source and level pair is allowed. */
export function evidenceError(id: string, source: Source, level: Level): string | null {
  if (source.kind === 'engine' && LEVELS.indexOf(level) < LEVELS.indexOf('architecture')) {
    return `engine-drawn object "${id}" cannot be ${level}`;
  }
  if (level === 'published' && source.kind !== 'doi' && source.kind !== 'pdb') {
    return `object "${id}" is published but its source is not a doi or pdb`;
  }
  return null;
}

export function validateWorld(input: unknown): { ok: true; world: World } | { ok: false; errors: string[] } {
  const parsed = worldSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join('.') || 'world'}: ${i.message}`) };
  }
  const world = parsed.data as World;
  const errors: string[] = [];

  const frameIds = new Set<string>();
  for (const f of world.frames) {
    if (frameIds.has(f.id)) errors.push(`duplicate frame id "${f.id}"`);
    frameIds.add(f.id);
    if (f.unit <= 0) errors.push(`frame "${f.id}" has unit <= 0`);
  }
  const roots = world.frames.filter((f) => f.parent === null);
  if (roots.length !== 1) errors.push(`exactly one root frame is required (found ${roots.length})`);
  for (const f of world.frames) {
    if (f.parent !== null && !frameIds.has(f.parent)) errors.push(`frame "${f.id}" has unknown parent "${f.parent}"`);
  }
  const byId = new Map(world.frames.map((f) => [f.id, f]));
  const inCycle = new Set<string>();
  for (const f of world.frames) {
    const seen = new Set<string>();
    for (let cur: Frame | undefined = f; cur; cur = cur.parent === null ? undefined : byId.get(cur.parent)) {
      if (seen.has(cur.id)) {
        if (!inCycle.has(cur.id)) errors.push(`frame cycle through "${cur.id}"`);
        // mark the whole loop as reported
        for (let m: Frame | undefined = cur; m && !inCycle.has(m.id); m = m.parent === null ? undefined : byId.get(m.parent)) inCycle.add(m.id);
        break;
      }
      seen.add(cur.id);
    }
  }

  const ids = new Set<string>();
  const dupes = new Set<string>();
  for (const o of world.objects) {
    if (ids.has(o.id) && !dupes.has(o.id)) {
      errors.push(`duplicate id "${o.id}"`);
      dupes.add(o.id);
    }
    ids.add(o.id);
    if (!frameIds.has(o.frame)) errors.push(`object "${o.id}" has unknown frame "${o.frame}"`);
    if (o.size <= 0) errors.push(`object "${o.id}" has size <= 0`);
    const [a, b] = o.window;
    if (a > b) errors.push(`object "${o.id}" window [${a},${b}] starts after it ends`);
    else if (a < 0 || b > world.duration) errors.push(`object "${o.id}" window [${a},${b}] is outside 0..${world.duration}`);
    const ev = evidenceError(o.id, o.source, o.evidence);
    if (ev) errors.push(ev);
  }

  return errors.length ? { ok: false, errors } : { ok: true, world };
}
