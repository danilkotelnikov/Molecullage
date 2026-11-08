import { convert, rootOf } from './frames.ts';
import type { Place } from './frames.ts';
import { ease } from './timeline.ts';
import type { Ease } from './timeline.ts';
import type { World } from './world.ts';

type Vec3 = [number, number, number];

export type CameraKey = { t: number; at: Place; target: Place; fov: number; ease?: Ease };
export type CameraPath = {
  id: string;
  kind: 'deck' | 'film' | 'poster' | 'web';
  keys: CameraKey[];
  stops: number[]; // times
};

const len = (v: Vec3) => Math.hypot(v[0], v[1], v[2]);
const lerp = (a: number, b: number, e: number) => a + (b - a) * e;
const place = (p: Place): Place => ({ frame: p.frame, pos: [p.pos[0], p.pos[1], p.pos[2]] });

/** a minus b in metres, float64. Same-frame places subtract in the frame's own small numbers. */
function between(world: World, a: Place, b: Place): Vec3 {
  const s = rootOf(world, b.frame).scale;
  const c = convert(world, a, b.frame);
  return [(c[0] - b.pos[0]) * s, (c[1] - b.pos[1]) * s, (c[2] - b.pos[2]) * s];
}

function atKey(world: World, k: CameraKey) {
  return { at: place(k.at), target: place(k.target), fov: k.fov, distance: len(between(world, k.at, k.target)) };
}

export function cameraAt(
  world: World,
  path: CameraPath,
  t: number,
): { at: Place; target: Place; fov: number; distance: number } {
  const keys = path.keys;
  if (keys.length === 0) throw new Error(`camera path "${path.id}" has no keys`);
  if (t <= keys[0].t) return atKey(world, keys[0]);
  if (t >= keys[keys.length - 1].t) return atKey(world, keys[keys.length - 1]);
  let i = 0;
  while (keys[i + 1].t <= t) i++;
  const k0 = keys[i];
  const k1 = keys[i + 1];
  const x = (t - k0.t) / (k1.t - k0.t);
  const e = ease(k1.ease ?? 'power2.inOut', x);

  // Work in the frame of the later key's target.
  const F = k1.target.frame;
  const scale = rootOf(world, F).scale;
  const T0 = convert(world, k0.target, F);
  const T1 = k1.target.pos;
  const T: Vec3 = [lerp(T0[0], T1[0], e), lerp(T0[1], T1[1], e), lerp(T0[2], T1[2], e)];

  // The camera sits at distance d from the target. d moves in log space, the direction by normalised lerp.
  const o0 = between(world, k0.at, k0.target);
  const o1 = between(world, k1.at, k1.target);
  const d0 = len(o0);
  const d1 = len(o1);
  if (!(d0 > 0 && d1 > 0)) throw new Error(`camera path "${path.id}" has a key with the camera at its target`);
  const d = Math.exp(lerp(Math.log(d0), Math.log(d1), e));
  const mix: Vec3 = [
    lerp(o0[0] / d0, o1[0] / d1, e),
    lerp(o0[1] / d0, o1[1] / d1, e),
    lerp(o0[2] / d0, o1[2] / d1, e),
  ];
  const m = len(mix);
  const dir: Vec3 = m > 1e-12 ? [mix[0] / m, mix[1] / m, mix[2] / m] : [o1[0] / d1, o1[1] / d1, o1[2] / d1];
  const f = d / scale;
  let at: Place = { frame: F, pos: [T[0] + dir[0] * f, T[1] + dir[1] * f, T[2] + dir[2] * f] };
  let target: Place = { frame: F, pos: T };

  // Before mid-segment the result is written in the earlier key's target frame.
  if (x < 0.5 && k0.target.frame !== F) {
    const G = k0.target.frame;
    at = { frame: G, pos: convert(world, at, G) };
    target = { frame: G, pos: convert(world, target, G) };
  }
  return { at, target, fov: lerp(k0.fov, k1.fov, e), distance: d };
}

export function stopIndexAt(path: CameraPath, t: number): number {
  let idx = 0;
  path.stops.forEach((s, i) => {
    if (s <= t) idx = i;
  });
  return idx;
}

/** 0 for the exact asset, 1 for the stand-in. A smoothstep of ln(distance/swapAt) over -ln 2 .. +ln 2. */
export function swapAlpha(distance: number, swapAt: number): number {
  if (!(distance > 0)) return 0;
  const s = (Math.log(distance / swapAt) + Math.LN2) / (2 * Math.LN2);
  const c = s <= 0 ? 0 : s >= 1 ? 1 : s;
  return c * c * (3 - 2 * c);
}
