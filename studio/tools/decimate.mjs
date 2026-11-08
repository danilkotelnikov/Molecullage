// Makes the low-poly live mesh from the full source surface, and checks it against the accepted limits.
// Usage: node tools/decimate.mjs <reference.glb> <out.glb> [--cap 0.5] [--min-body 3000]
// Big pieces (min-body triangles or more) are simplified with meshoptimizer; the error cap is in file units (angstroms).
// Small pieces (the islands) are kept as they are: dropping them breaks the distance limit.
// Exit code 1 when the result is outside the limits (library/POLICY.md rule 8, accepted by the owner on 2026-11-01).
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { MeshoptSimplifier } from 'meshoptimizer';
import { readGlb, stats, deviation } from './mesh.mjs';
import { writeGlb } from './glb.mjs';

export const LIMITS = { maxDeviation: 3, volumeMin: 0.95, volumeMax: 1.05 };

/** The connected pieces of a mesh, each as a list of triangle indices. */
export function components(mesh) {
  const parent = new Int32Array(mesh.positions.length / 3).map((_, i) => i);
  const find = (x) => {
    while (parent[x] !== x) x = parent[x] = parent[parent[x]];
    return x;
  };
  const t = mesh.indices;
  for (let i = 0; i < t.length; i += 3) {
    parent[find(t[i])] = find(t[i + 1]);
    parent[find(t[i + 1])] = find(t[i + 2]);
  }
  const pieces = new Map();
  for (let i = 0; i < t.length; i += 3) {
    const root = find(t[i]);
    (pieces.get(root) ?? pieces.set(root, []).get(root)).push(t[i], t[i + 1], t[i + 2]);
  }
  return [...pieces.values()].map((p) => Uint32Array.from(p));
}

/** Keeps only the vertices that the triangles use. Without this the vertex list still holds the old surface and a measurement reads 0. */
export function compact(positions, indices) {
  const newIndex = new Map();
  const out = [];
  const mapped = Uint32Array.from(indices, (i) => {
    if (!newIndex.has(i)) {
      newIndex.set(i, out.length / 3);
      out.push(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
    }
    return newIndex.get(i);
  });
  return { positions: Float64Array.from(out), indices: mapped };
}

/** Smooth vertex normals: the area-weighted mean of the faces around each vertex. */
export function smoothNormals(mesh) {
  const p = mesh.positions;
  const n = new Float64Array(p.length);
  const t = mesh.indices;
  for (let i = 0; i < t.length; i += 3) {
    const [a, b, c] = [t[i] * 3, t[i + 1] * 3, t[i + 2] * 3];
    const e1 = [p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]];
    const e2 = [p[c] - p[a], p[c + 1] - p[a + 1], p[c + 2] - p[a + 2]];
    const f = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    for (const v of [a, b, c]) for (let k = 0; k < 3; k++) n[v + k] += f[k];
  }
  for (let i = 0; i < n.length; i += 3) {
    const len = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1; // a vertex of only flat triangles keeps a zero normal
    for (let k = 0; k < 3; k++) n[i + k] /= len;
  }
  return Float32Array.from(n);
}

/** Simplifies the big pieces to the error cap and keeps the small ones. Returns a compact mesh. */
export async function decimate(mesh, { cap = 0.5, minBody = 3000 } = {}) {
  await MeshoptSimplifier.ready;
  const pieces = components(mesh);
  const big = pieces.filter((p) => p.length / 3 >= minBody);
  const kept = pieces.filter((p) => p.length / 3 < minBody);
  if (big.length) {
    const body = Uint32Array.from(big.flatMap((p) => Array.from(p)));
    const [simplified] = MeshoptSimplifier.simplify(body, Float32Array.from(mesh.positions), 3, 12, cap, ['ErrorAbsolute']);
    kept.push(simplified);
  }
  return compact(mesh.positions, kept.flatMap((p) => Array.from(p)));
}

/** Measures `light` against `reference` and compares with the limits. */
export function checkLimits(light, reference, limits = LIMITS, spacing = 1) {
  const ls = stats(light);
  if (ls.triangles === 0) return { ok: false, triangles: 0, max: Infinity, p99: Infinity, mean: Infinity, volumeRatio: 0, problems: ['no triangles left'] };
  const d = deviation(light, reference, spacing);
  const volumeRatio = ls.volume / stats(reference).volume;
  const problems = [];
  if (!(d.max <= limits.maxDeviation)) problems.push(`max deviation ${d.max.toFixed(2)} is over ${limits.maxDeviation}`);
  if (!(volumeRatio >= limits.volumeMin && volumeRatio <= limits.volumeMax)) problems.push(`volume ratio ${volumeRatio.toFixed(3)} is outside ${limits.volumeMin} to ${limits.volumeMax}`);
  return { ok: problems.length === 0, triangles: ls.triangles, ...d, volumeRatio, problems };
}

async function main(argv) {
  const files = [];
  const opt = { cap: 0.5, minBody: 3000 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--cap') opt.cap = Number(argv[++i]);
    else if (argv[i] === '--min-body') opt.minBody = Number(argv[++i]);
    else files.push(argv[i]);
  }
  if (files.length !== 2 || !(opt.cap > 0) || !(opt.minBody > 0)) {
    console.error('usage: node tools/decimate.mjs <reference.glb> <out.glb> [--cap 0.5] [--min-body 3000]');
    return 2;
  }
  const reference = readGlb(fs.readFileSync(files[0]));
  const light = await decimate(reference, opt);
  const glb = writeGlb({ positions: light.positions, normals: smoothNormals(light), indices: light.indices });
  fs.writeFileSync(files[1], glb);
  const r = checkLimits(readGlb(glb), reference); // measure what was written, float32 rounding included
  console.log(`reference ${stats(reference).triangles} triangles -> ${r.triangles} triangles, ${glb.length} bytes (cap ${opt.cap}, min-body ${opt.minBody})`);
  console.log(`deviation max ${r.max.toFixed(2)} A, p99 ${r.p99.toFixed(2)} A, mean ${r.mean.toFixed(2)} A; volume ratio ${r.volumeRatio.toFixed(3)}`);
  console.log(r.ok ? 'PASS: within 3 A and 5% volume' : `FAIL: ${r.problems.join('; ')}`);
  return r.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await main(process.argv.slice(2));
