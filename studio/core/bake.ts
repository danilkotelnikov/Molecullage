import type { Job } from './job.ts';
import type { Lens } from './lens.ts';
import type { CameraPath } from './camera.ts';

export type RenderSettings = {
  width: number;
  height: number;
  samples: number;
  denoise: boolean;
  device: 'GPU' | 'CPU';
};

export type Shot = {
  id: string;
  path: string;
  t0: number;
  t1: number;
  fps: number;
  render: 'live' | 'baked';
  settings: RenderSettings;
};

export const DRAFT: RenderSettings = {
  width: 960,
  height: 540,
  samples: 16,
  denoise: true,
  device: 'GPU',
};

export const FINAL: RenderSettings = {
  width: 1920,
  height: 1080,
  samples: 256,
  denoise: true,
  device: 'GPU',
};

const K256 = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

function sha256Hex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const bitLen = bytes.length * 8;
  const padLen = ((bytes.length + 9 + 63) & ~63);
  const buf = new Uint8Array(padLen);
  buf.set(bytes);
  buf[bytes.length] = 0x80;
  const view = new DataView(buf.buffer);
  view.setUint32(padLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(padLen - 4, bitLen >>> 0, false);

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const w = new Uint32Array(64);

  for (let off = 0; off < padLen; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K256[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7].map((v) => v.toString(16).padStart(8, '0')).join('');
}

/** The first baked shot on `path` whose [t0, t1] interval contains `t`. */
export function shotAt(job: Job, path: string, t: number): Shot | null {
  for (const s of job.shots ?? []) {
    if (s.path === path && s.render === 'baked' && t >= s.t0 && t <= s.t1) {
      return s;
    }
  }
  return null;
}

export function frameCount(shot: Shot): number {
  return Math.floor((shot.t1 - shot.t0) * shot.fps) + 1;
}

export function frameAt(shot: Shot, t: number): number {
  const n = frameCount(shot);
  const raw = Math.round((t - shot.t0) * shot.fps);
  return Math.max(0, Math.min(n - 1, raw));
}

export function timeOf(shot: Shot, frame: number): number {
  return shot.t0 + frame / shot.fps;
}

/** Deterministic JSON with object keys sorted recursively at every level. */
export function canonical(value: unknown): string {
  const sortKeys = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === 'object') {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(v as Record<string, unknown>).sort()) {
        const val = (v as Record<string, unknown>)[k];
        if (val !== undefined) out[k] = sortKeys(val);
      }
      return out;
    }
    return v;
  };
  return JSON.stringify(sortKeys(value));
}

export function bakeKey(job: Job, lens: Lens, shot: Shot, frame: number): string {
  const camPath = job.paths.find((p) => p.id === shot.path) ?? null;
  const payload = canonical({
    world: job.world,
    timeline: job.timeline,
    path: camPath,
    lens,
    settings: shot.settings,
    t: timeOf(shot, frame).toFixed(6),
  });
  return sha256Hex(payload);
}

export function framePath(jobId: string, shotId: string, frame: number): string {
  const pad = String(frame).padStart(5, '0');
  return `studio/cache/${jobId}/${shotId}/${pad}.png`;
}

export function frameUrl(jobId: string, shotId: string, frame: number): string {
  const pad = String(frame).padStart(5, '0');
  return `cache/${jobId}/${shotId}/${pad}.png`;
}

export function overBudget(seconds: number, budget: number): boolean {
  return seconds > 1.5 * budget;
}

export function validateShots(
  shots: Shot[] | undefined,
  paths: CameraPath[],
  budget?: { secondsPerFrame: number },
): string[] {
  const errors: string[] = [];
  if (budget !== undefined) {
    if (!(typeof budget.secondsPerFrame === 'number' && Number.isFinite(budget.secondsPerFrame) && budget.secondsPerFrame > 0)) {
      errors.push('budget.secondsPerFrame must be greater than 0');
    }
  }
  if (!shots) return errors;
  const pathIds = new Set(paths.map((p) => p.id));
  const seenIds = new Set<string>();
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    if (seenIds.has(s.id)) errors.push(`duplicate shot id "${s.id}"`);
    seenIds.add(s.id);
    if (!pathIds.has(s.path)) errors.push(`shot "${s.id}" references unknown path "${s.path}"`);
    if (!(s.t0 < s.t1)) errors.push(`shot "${s.id}": t0 (${s.t0}) must be less than t1 (${s.t1})`);
    if (!(s.fps >= 1 && s.fps <= 120)) errors.push(`shot "${s.id}": fps (${s.fps}) must lie in [1, 120]`);
    for (let j = 0; j < i; j++) {
      const prev = shots[j];
      if (prev.path === s.path && prev.t0 < s.t1 && s.t0 < prev.t1) {
        errors.push(`shots "${prev.id}" and "${s.id}" overlap on path "${s.path}"`);
      }
    }
  }
  return errors;
}
