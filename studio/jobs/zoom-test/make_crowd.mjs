// Writes the 80 "buffer" spheres and their fade-out tracks into job.json. Run once: node jobs/zoom-test/make_crowd.mjs
// The spheres are sampled decoration around the antibody (frame nano, positions in nm). They are not data.
// Seeded, so a rerun gives the same job.json. Plan 2's `copies` replaces them.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), 'job.json');
const job = JSON.parse(fs.readFileSync(file, 'utf8'));

const mulberry32 = (a) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const rand = mulberry32(20261031);
const between = (lo, hi) => lo + (hi - lo) * rand();

const COUNT = 80;
const BOX = [1000, 560, 1000]; // half sizes in nm
const KEEP_CLEAR = 160; // nm around the antibody, so stop 3 stays clean
const GOLD_CLEAR = 90; // nm from the centre of a gold sphere
const APART = 70; // nm between sphere centres

// Drop an earlier run, then add the new one.
job.world.objects = job.world.objects.filter((o) => !o.id.startsWith('buffer-'));
job.timeline.tracks = job.timeline.tracks.filter((t) => !t.target.startsWith('buffer-'));

const gold = job.world.objects.filter((o) => o.id.startsWith('gold-')).map((o) => o.position);
const placed = [];
while (placed.length < COUNT) {
  const p = BOX.map((h) => Math.round(between(-h, h)));
  const far = (q, d) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) > d;
  if (!far([0, 0, 0], KEEP_CLEAR)) continue;
  if (!gold.every((g) => far(g, GOLD_CLEAR))) continue;
  if (!placed.every((q) => far(q, APART))) continue;
  placed.push(p);
}

placed.forEach((position, i) => {
  const id = `buffer-${String(i + 1).padStart(2, '0')}`;
  job.world.objects.push({
    id,
    kind: 'mesh',
    frame: 'nano',
    position,
    size: Math.round(between(12, 28)) * 1e-9,
    source: { kind: 'engine', ref: '' },
    evidence: 'architecture',
    window: [0, 12],
    roles: ['protein'],
    asset: 'builtin:sphere',
  });
  job.timeline.tracks.push({ target: id, prop: 'opacity', keys: [{ t: 5.5, v: 1 }, { t: 7, v: 0 }] });
});

fs.writeFileSync(file, JSON.stringify(job, null, 2) + '\n');
console.log(`wrote ${COUNT} buffer spheres`);
