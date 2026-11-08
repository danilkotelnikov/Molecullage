import { z } from 'zod';
import { validateWorld } from './world.ts';
import type { World } from './world.ts';
import { validateTimeline } from './timeline.ts';
import type { Timeline } from './timeline.ts';
import type { CameraPath } from './camera.ts';
import { checkLens } from './lens.ts';
import type { Lens } from './lens.ts';

export type Block = {
  id: string;
  role: 'title' | 'label' | 'note';
  text: string;
  box: [number, number, number, number]; // x, y, w, h in px at 1920x1080
};
export type StopLayout = { stop: number; lang: 'en' | 'ru'; blocks: Block[] };
export type Job = {
  world: World;
  timeline: Timeline;
  paths: CameraPath[];
  lens: string;
  langs: ('en' | 'ru')[];
  layout: StopLayout[];
  notes: Record<number, Partial<Record<'en' | 'ru', string>>>;
};

const SAFE = 48; // px margin inside the 1920x1080 frame
const W = 1920;
const H = 1080;

const lang = z.enum(['en', 'ru']);
const vec3 = z.tuple([z.number(), z.number(), z.number()]);
const place = z.strictObject({ frame: z.string().min(1), pos: vec3 });
const ease = z.enum(['linear', 'power2.out', 'power2.inOut', 'power3.out', 'sine.inOut']);
const pathSchema = z.strictObject({
  id: z.string().min(1),
  kind: z.enum(['deck', 'film', 'poster', 'web']),
  keys: z.array(
    z.strictObject({ t: z.number(), at: place, target: place, fov: z.number().positive(), ease: ease.optional() }),
  ),
  stops: z.array(z.number()),
});
const blockSchema = z.strictObject({
  id: z.string().min(1),
  role: z.enum(['title', 'label', 'note']),
  text: z.string(),
  box: z.tuple([z.number(), z.number(), z.number(), z.number()]),
});
const timelineShape = z.strictObject({
  tracks: z.array(
    z.strictObject({
      target: z.string().min(1),
      prop: z.string().min(1),
      keys: z.array(
        z.strictObject({ t: z.number(), v: z.union([z.number(), z.array(z.number())]), ease: ease.optional() }),
      ),
    }),
  ),
});
// Later plans add optional fields, so the job object itself is loose. The world is checked by validateWorld.
const jobSchema = z.looseObject({
  world: z.unknown(),
  timeline: timelineShape,
  paths: z.array(pathSchema),
  lens: z.string().min(1),
  langs: z.array(lang).min(1),
  layout: z.array(z.strictObject({ stop: z.number().int().min(0), lang, blocks: z.array(blockSchema) })),
  notes: z.record(z.string(), z.strictObject({ en: z.string().optional(), ru: z.string().optional() })).default({}),
});

/** Pure: runs in the browser as well as in Node. It reads no files and no environment. */
export function loadJob(
  input: unknown,
  lenses: Record<string, Lens>,
): { ok: true; job: Job } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const parsed = jobSchema.safeParse(input);
  if (!parsed.success) {
    errors.push(...parsed.error.issues.map((i) => `${i.path.join('.') || 'job'}: ${i.message}`));
  }

  const rawWorld = (input as { world?: { objects?: unknown } } | null)?.world;
  const w = validateWorld(rawWorld);
  if (!w.ok) errors.push(...w.errors);
  if (!parsed.success) return { ok: false, errors };

  const job = parsed.data;
  const worldForTimeline = w.ok
    ? w.world
    : ({ objects: Array.isArray(rawWorld?.objects) ? rawWorld.objects : [] } as unknown as World);
  errors.push(...validateTimeline(job.timeline as Timeline, worldForTimeline));

  // camera paths
  const frameIds = w.ok ? new Set(w.world.frames.map((f) => f.id)) : null;
  const pathIds = new Set<string>();
  for (const p of job.paths) {
    if (pathIds.has(p.id)) errors.push(`duplicate path id "${p.id}"`);
    pathIds.add(p.id);
    if (p.keys.length === 0) errors.push(`path "${p.id}" has no keys`);
    for (let k = 1; k < p.keys.length; k++) {
      if (!(p.keys[k].t > p.keys[k - 1].t)) {
        errors.push(`path "${p.id}": keys are not in increasing time order at key ${k}`);
        break;
      }
    }
    for (let k = 1; k < p.stops.length; k++) {
      if (!(p.stops[k] > p.stops[k - 1])) {
        errors.push(`path "${p.id}": stops are not in increasing time order at stop ${k}`);
        break;
      }
    }
    if (p.kind === 'deck' && p.stops.length === 0) errors.push(`deck path "${p.id}" has no stops`);
    if (frameIds) {
      p.keys.forEach((key, k) => {
        for (const f of [key.at.frame, key.target.frame]) {
          if (!frameIds.has(f)) errors.push(`path "${p.id}" key ${k} uses unknown frame "${f}"`);
        }
      });
    }
  }

  // lens
  const lens = Object.prototype.hasOwnProperty.call(lenses, job.lens) ? lenses[job.lens] : undefined;
  if (!lens) errors.push(`unknown lens "${job.lens}"`);
  else errors.push(...checkLens(lens));

  // layout: every stop of the first deck path needs every language
  const deck = job.paths.find((p) => p.kind === 'deck');
  const seen = new Set<string>();
  for (const l of job.layout) {
    const key = `${l.stop}/${l.lang}`;
    if (seen.has(key)) errors.push(`duplicate layout for stop ${l.stop} in ${l.lang}`);
    seen.add(key);
    if (!job.langs.includes(l.lang)) errors.push(`layout for stop ${l.stop} uses language "${l.lang}", which the job does not list`);
    if (deck && l.stop >= deck.stops.length) {
      errors.push(`layout refers to stop ${l.stop}, but deck path "${deck.id}" has ${deck.stops.length} stops`);
    }
    const ids = new Set<string>();
    for (const b of l.blocks) {
      if (ids.has(b.id)) errors.push(`duplicate block id "${b.id}" in stop ${l.stop} (${l.lang})`);
      ids.add(b.id);
      const [x, y, bw, bh] = b.box;
      if (!(bw > 0 && bh > 0 && x >= SAFE && y >= SAFE && x + bw <= W - SAFE && y + bh <= H - SAFE)) {
        errors.push(`block "${b.id}" (stop ${l.stop}, ${l.lang}) is outside the 1920x1080 safe area (${SAFE} px margin)`);
      }
    }
  }
  if (deck) {
    deck.stops.forEach((_, i) => {
      for (const lg of job.langs) {
        if (!seen.has(`${i}/${lg}`)) errors.push(`stop ${i} has no ${lg} layout`);
      }
    });
  }
  for (const k of Object.keys(job.notes)) {
    if (!/^\d+$/.test(k)) errors.push(`notes key "${k}" is not a stop number`);
  }

  if (errors.length || !w.ok) return { ok: false, errors };
  return { ok: true, job: { ...job, world: w.world } as unknown as Job };
}
