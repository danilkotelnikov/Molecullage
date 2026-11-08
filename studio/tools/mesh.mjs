// Mesh toolkit for the accuracy checks: read a .glb, count triangles, and measure how far one mesh drifts from another.
// Units are those of the file (ChimeraX writes angstroms). No dependencies.

const mul = (a, b) => {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
};
const IDENT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const local = (n) => {
  if (n.matrix) return n.matrix;
  const t = n.translation ?? [0, 0, 0];
  const s = n.scale ?? [1, 1, 1];
  const q = n.rotation ?? [0, 0, 0, 1];
  const [x, y, z, w] = q;
  return [
    (1 - 2 * (y * y + z * z)) * s[0], 2 * (x * y + z * w) * s[0], 2 * (x * z - y * w) * s[0], 0,
    2 * (x * y - z * w) * s[1], (1 - 2 * (x * x + z * z)) * s[1], 2 * (y * z + x * w) * s[1], 0,
    2 * (x * z + y * w) * s[2], 2 * (y * z - x * w) * s[2], (1 - 2 * (x * x + y * y)) * s[2], 0,
    t[0], t[1], t[2], 1,
  ];
};

/** Reads a .glb buffer into one list of vertices and triangles, with every node transform applied. */
export function readGlb(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('not a glb file');
  const jsonLen = dv.getUint32(12, true);
  const json = JSON.parse(Buffer.from(buf.subarray(20, 20 + jsonLen)).toString('utf8'));
  const binStart = 20 + jsonLen + 8;
  const pos = [];
  const idx = [];
  const read = (acc) => {
    const a = json.accessors[acc];
    const v = json.bufferViews[a.bufferView];
    const off = binStart + (v.byteOffset ?? 0) + (a.byteOffset ?? 0);
    const comp = { SCALAR: 1, VEC3: 3 }[a.type];
    const stride = v.byteStride ?? comp * ({ 5126: 4, 5125: 4, 5123: 2 }[a.componentType]);
    const out = new Array(a.count * comp);
    for (let i = 0; i < a.count; i++) {
      for (let k = 0; k < comp; k++) {
        const p = off + i * stride + k * ({ 5126: 4, 5125: 4, 5123: 2 }[a.componentType]);
        out[i * comp + k] = a.componentType === 5126 ? dv.getFloat32(p, true) : a.componentType === 5125 ? dv.getUint32(p, true) : dv.getUint16(p, true);
      }
    }
    return out;
  };
  const visit = (i, parent) => {
    const n = json.nodes[i];
    const m = mul(parent, local(n));
    if (n.mesh !== undefined) {
      for (const p of json.meshes[n.mesh].primitives) {
        const base = pos.length / 3;
        const v = read(p.attributes.POSITION);
        for (let k = 0; k < v.length; k += 3) {
          const [x, y, z] = [v[k], v[k + 1], v[k + 2]];
          pos.push(m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]);
        }
        const ix = p.indices !== undefined ? read(p.indices) : v.map((_, k) => k).filter((_, k) => k % 3 === 0);
        for (const j of ix) idx.push(base + j);
      }
    }
    for (const c of n.children ?? []) visit(c, m);
  };
  for (const r of json.scenes[json.scene ?? 0].nodes) visit(r, IDENT);
  return { positions: Float64Array.from(pos), indices: Uint32Array.from(idx) };
}

/** Triangle count, vertex count, bounding box, longest side and absolute enclosed volume (the sum over closed pieces). */
export function stats(m) {
  const p = m.positions;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < p.length; i += 3) for (let k = 0; k < 3; k++) {
    min[k] = Math.min(min[k], p[i + k]);
    max[k] = Math.max(max[k], p[i + k]);
  }
  let vol = 0;
  const t = m.indices;
  for (let i = 0; i < t.length; i += 3) {
    const [a, b, c] = [t[i] * 3, t[i + 1] * 3, t[i + 2] * 3];
    vol += (p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) - p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c])) / 6;
  }
  return { triangles: t.length / 3, vertices: p.length / 3, min, max, longest: Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]), volume: Math.abs(vol) };
}

/** Points on the surface, about `spacing` apart (the vertices plus a lattice inside each triangle). */
export function surfaceSamples(m, spacing) {
  const p = m.positions;
  const t = m.indices;
  const out = Array.from(p);
  for (let i = 0; i < t.length; i += 3) {
    const [a, b, c] = [t[i] * 3, t[i + 1] * 3, t[i + 2] * 3];
    const e1 = [p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]];
    const e2 = [p[c] - p[a], p[c + 1] - p[a + 1], p[c + 2] - p[a + 2]];
    const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const area = Math.hypot(...cr) / 2;
    const n = Math.max(1, Math.ceil(Math.sqrt(area) / spacing));
    if (n < 2) continue;
    for (let u = 0; u <= n; u++) for (let v = 0; v <= n - u; v++) {
      if ((u === 0 && v === 0) || (u === n && v === 0) || (u === 0 && v === n)) continue;
      const fu = u / n;
      const fv = v / n;
      out.push(p[a] + e1[0] * fu + e2[0] * fv, p[a + 1] + e1[1] * fu + e2[1] * fv, p[a + 2] + e1[2] * fu + e2[2] * fv);
    }
  }
  return Float64Array.from(out);
}

/** A hash grid for nearest-point queries. */
function grid(points, cell) {
  const map = new Map();
  const key = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
  for (let i = 0; i < points.length; i += 3) {
    const k = key(points[i], points[i + 1], points[i + 2]);
    (map.get(k) ?? map.set(k, []).get(k)).push(i);
  }
  return (x, y, z, maxR = 6) => {
    let best = Infinity;
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    const cz = Math.floor(z / cell);
    for (let r = 0; r <= maxR; r++) {
      for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) for (let k = -r; k <= r; k++) {
        if (Math.max(Math.abs(i), Math.abs(j), Math.abs(k)) !== r) continue;
        for (const q of map.get(`${cx + i},${cy + j},${cz + k}`) ?? []) {
          const d = (points[q] - x) ** 2 + (points[q + 1] - y) ** 2 + (points[q + 2] - z) ** 2;
          if (d < best) best = d;
        }
      }
      if (best <= (r * cell) ** 2) break; // nothing farther out can be closer
    }
    return Math.sqrt(best);
  };
}

const percentile = (a, q) => {
  const s = Float64Array.from(a).sort();
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};

/** How far the vertices of `a` lie from the surface of `b`: { max, p99, mean }, in file units. */
export function distanceToSurface(a, b, spacing = 1) {
  const near = grid(surfaceSamples(b, spacing), 2 * spacing);
  const d = [];
  for (let i = 0; i < a.positions.length; i += 3) d.push(near(a.positions[i], a.positions[i + 1], a.positions[i + 2]));
  return { max: d.reduce((m, x) => Math.max(m, x), 0), p99: percentile(d, 0.99), mean: d.reduce((s, x) => s + x, 0) / d.length };
}

/** The two-way deviation of a light mesh from a reference: the worse of light-to-reference and reference-to-light. */
export function deviation(light, reference, spacing = 1) {
  const a = distanceToSurface(light, reference, spacing);
  const b = distanceToSurface(reference, light, spacing);
  return { max: Math.max(a.max, b.max), p99: Math.max(a.p99, b.p99), mean: Math.max(a.mean, b.mean) };
}
