import type { World } from './world.ts';

type Vec3 = [number, number, number];
export type Place = { frame: string; pos: Vec3 };

/**
 * A point p in the frame is `offset + scale * p` in root metres.
 * `scale` is the frame's own unit (metres per unit). All arithmetic is float64.
 */
export function rootOf(world: World, frame: string): { scale: number; offset: Vec3 } {
  const byId = new Map(world.frames.map((f) => [f.id, f]));
  const f = byId.get(frame);
  if (!f) throw new Error(`unknown frame "${frame}"`);
  if (f.parent === null) return { scale: f.unit, offset: [0, 0, 0] };
  const up = rootOf(world, f.parent);
  return {
    scale: f.unit,
    offset: [
      up.offset[0] + up.scale * f.origin[0],
      up.offset[1] + up.scale * f.origin[1],
      up.offset[2] + up.scale * f.origin[2],
    ],
  };
}

const inRoot = (world: World, p: Place): Vec3 => {
  const r = rootOf(world, p.frame);
  return [r.offset[0] + r.scale * p.pos[0], r.offset[1] + r.scale * p.pos[1], r.offset[2] + r.scale * p.pos[2]];
};

/** p minus cam, in metres. Computed in float64, then cast to float32 at the end. */
export function toCamera(world: World, p: Place, cam: Place): Float32Array {
  if (p.frame === cam.frame) {
    // Same frame: subtract in the frame's own small numbers, then scale. Exact at any depth.
    const s = rootOf(world, p.frame).scale;
    return Float32Array.from([s * (p.pos[0] - cam.pos[0]), s * (p.pos[1] - cam.pos[1]), s * (p.pos[2] - cam.pos[2])]);
  }
  const a = inRoot(world, p);
  const b = inRoot(world, cam);
  return Float32Array.from([a[0] - b[0], a[1] - b[1], a[2] - b[2]]);
}

export function convert(world: World, p: Place, toFrame: string): Vec3 {
  if (p.frame === toFrame) return [p.pos[0], p.pos[1], p.pos[2]];
  const m = inRoot(world, p);
  const t = rootOf(world, toFrame);
  return [(m[0] - t.offset[0]) / t.scale, (m[1] - t.offset[1]) / t.scale, (m[2] - t.offset[2]) / t.scale];
}
