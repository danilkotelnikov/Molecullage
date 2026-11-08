export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

export type Mesh3D = {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
};

export type CopyTransform = {
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
};

export type ScatterBounds =
  | { min: Vec3; max: Vec3 }
  | [Vec3, Vec3];

export type SkeletonJoint = {
  id: string;
  parent: string | null;
  pivot?: Vec3;
  position?: Vec3;
  axis?: Vec3;
  limits?: [number, number];
};

export type Skeleton =
  | { joints: SkeletonJoint[] }
  | SkeletonJoint[];

export type PoseResult = {
  matrices: Record<string, Float32Array>;
  positions: Record<string, Vec3>;
  clamped: string[];
};

/** Deterministic mulberry32 PRNG returning values in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Computes vertex normals by area-weighted face normal accumulation. */
export function computeVertexNormals(positions: Float32Array, indices: Uint32Array): Float32Array {
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i] * 3;
    const i1 = indices[i + 1] * 3;
    const i2 = indices[i + 2] * 3;

    const ax = positions[i0];
    const ay = positions[i0 + 1];
    const az = positions[i0 + 2];
    const bx = positions[i1] - ax;
    const by = positions[i1 + 1] - ay;
    const bz = positions[i1 + 2] - az;
    const cx = positions[i2] - ax;
    const cy = positions[i2 + 1] - ay;
    const cz = positions[i2 + 2] - az;

    const nx = by * cz - bz * cy;
    const ny = bz * cx - bx * cz;
    const nz = bx * cy - by * cx;

    normals[i0] += nx;
    normals[i0 + 1] += ny;
    normals[i0 + 2] += nz;
    normals[i1] += nx;
    normals[i1 + 1] += ny;
    normals[i1 + 2] += nz;
    normals[i2] += nx;
    normals[i2 + 1] += ny;
    normals[i2 + 2] += nz;
  }

  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.hypot(normals[i], normals[i + 1], normals[i + 2]);
    if (len > 1e-12) {
      normals[i] /= len;
      normals[i + 1] /= len;
      normals[i + 2] /= len;
    } else {
      normals[i] = 0;
      normals[i + 1] = 1;
      normals[i + 2] = 0;
    }
  }
  return normals;
}

/**
 * Generates a 3D lathe mesh by revolving a 2D profile `[r, y][]` around the Y axis.
 */
export function revolve(profile2D: Vec2[], segments = 32): Mesh3D {
  if (!Array.isArray(profile2D) || profile2D.length < 2) {
    throw new Error('revolve requires at least 2 profile points');
  }
  const segs = Math.max(3, Math.trunc(segments));
  for (let i = 1; i < profile2D.length; i++) {
    const [r0, y0] = profile2D[i - 1];
    const [r1, y1] = profile2D[i];
    if (Math.hypot(r1 - r0, y1 - y0) < 1e-12) {
      throw new Error(`repeated point at index ${i}`);
    }
  }

  const ringCount = profile2D.length;
  const cols = segs + 1;
  const vertexCount = ringCount * cols;
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);

  for (let i = 0; i < ringCount; i++) {
    const [r, y] = profile2D[i];
    if (r < 0) throw new Error(`negative radius at index ${i}`);
    const v = ringCount > 1 ? i / (ringCount - 1) : 0;
    for (let j = 0; j <= segs; j++) {
      const u = j / segs;
      const theta = u * Math.PI * 2;
      const idx = i * cols + j;
      positions[idx * 3] = r * Math.cos(theta);
      positions[idx * 3 + 1] = y;
      positions[idx * 3 + 2] = r * Math.sin(theta);
      uvs[idx * 2] = u;
      uvs[idx * 2 + 1] = v;
    }
  }

  const quadCount = (ringCount - 1) * segs;
  const indices = new Uint32Array(quadCount * 6);
  let ptr = 0;
  for (let i = 0; i < ringCount - 1; i++) {
    for (let j = 0; j < segs; j++) {
      const a = i * cols + j;
      const b = i * cols + j + 1;
      const c = (i + 1) * cols + j + 1;
      const d = (i + 1) * cols + j;
      indices[ptr++] = a;
      indices[ptr++] = d;
      indices[ptr++] = b;
      indices[ptr++] = b;
      indices[ptr++] = d;
      indices[ptr++] = c;
    }
  }

  const normals = computeVertexNormals(positions, indices);
  return { positions, normals, uvs, indices };
}

/**
 * Generates an extruded 3D mesh from a 2D polygon along the Z axis with optional bevel.
 */
export function extrude(polygon2D: Vec2[], depth: number, bevel = 0): Mesh3D {
  if (!Array.isArray(polygon2D) || polygon2D.length < 3) {
    throw new Error('extrude requires a polygon with at least 3 vertices');
  }
  if (!(depth > 0)) {
    throw new Error('extrude requires positive depth');
  }

  const b = Math.max(0, Math.min(bevel, depth * 0.45));
  let cx = 0;
  let cy = 0;
  for (const [x, y] of polygon2D) {
    cx += x;
    cy += y;
  }
  cx /= polygon2D.length;
  cy /= polygon2D.length;

  const scalePolygon = (inset: number): Vec2[] =>
    polygon2D.map(([x, y]) => {
      const dx = x - cx;
      const dy = y - cy;
      const len = Math.hypot(dx, dy);
      if (len < 1e-9 || inset === 0) return [x, y];
      const f = Math.max(0.1, (len - inset) / len);
      return [cx + dx * f, cy + dy * f];
    });

  const layers: { z: number; poly: Vec2[] }[] =
    b > 0
      ? [
          { z: 0, poly: scalePolygon(b) },
          { z: b, poly: scalePolygon(0) },
          { z: depth - b, poly: scalePolygon(0) },
          { z: depth, poly: scalePolygon(b) },
        ]
      : [
          { z: 0, poly: scalePolygon(0) },
          { z: depth, poly: scalePolygon(0) },
        ];

  const rings: Vec3[][] = layers.map(({ z, poly }) => poly.map(([x, y]): Vec3 => [x, y, z]));
  const sideMesh = loft(rings, false);

  const posList: number[] = Array.from(sideMesh.positions);
  const uvList: number[] = Array.from(sideMesh.uvs);
  const idxList: number[] = Array.from(sideMesh.indices);

  // Add bottom and top triangle-fan caps around centroid
  const addCap = (poly: Vec2[], z: number, flip: boolean) => {
    const centerIdx = posList.length / 3;
    posList.push(cx, cy, z);
    uvList.push(0.5, 0.5);
    const ringStart = posList.length / 3;
    for (const [x, y] of poly) {
      posList.push(x, y, z);
      uvList.push(x, y);
    }
    const n = poly.length;
    for (let i = 0; i < n; i++) {
      const i0 = ringStart + i;
      const i1 = ringStart + ((i + 1) % n);
      if (flip) {
        idxList.push(centerIdx, i1, i0);
      } else {
        idxList.push(centerIdx, i0, i1);
      }
    }
  };

  addCap(layers[0].poly, 0, true);
  addCap(layers[layers.length - 1].poly, depth, false);

  const positions = new Float32Array(posList);
  const uvs = new Float32Array(uvList);
  const indices = new Uint32Array(idxList);
  const normals = computeVertexNormals(positions, indices);
  return { positions, normals, uvs, indices };
}

/**
 * Lofts a 3D surface between an ordered sequence of 3D point rings.
 * When `closed` is true, connects the last ring back to the first ring.
 */
export function loft(rings: Vec3[][], closed = false): Mesh3D {
  if (!Array.isArray(rings) || rings.length < 2) {
    throw new Error('loft requires at least 2 rings');
  }
  const ptsPerRing = rings[0].length;
  if (ptsPerRing < 3) {
    throw new Error('loft requires at least 3 points per ring');
  }
  for (let r = 1; r < rings.length; r++) {
    if (rings[r].length !== ptsPerRing) {
      throw new Error(`loft ring ${r} has ${rings[r].length} points, expected ${ptsPerRing}`);
    }
  }

  const ringCount = rings.length;
  const totalRings = closed ? ringCount + 1 : ringCount;
  const cols = ptsPerRing + 1;
  const vertexCount = totalRings * cols;
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);

  for (let r = 0; r < totalRings; r++) {
    const ring = rings[r % ringCount];
    const v = totalRings > 1 ? r / (totalRings - 1) : 0;
    for (let p = 0; p <= ptsPerRing; p++) {
      const pt = ring[p % ptsPerRing];
      const u = p / ptsPerRing;
      const idx = r * cols + p;
      positions[idx * 3] = pt[0];
      positions[idx * 3 + 1] = pt[1];
      positions[idx * 3 + 2] = pt[2];
      uvs[idx * 2] = u;
      uvs[idx * 2 + 1] = v;
    }
  }

  const quadCount = (totalRings - 1) * ptsPerRing;
  const indices = new Uint32Array(quadCount * 6);
  let ptr = 0;
  for (let r = 0; r < totalRings - 1; r++) {
    for (let p = 0; p < ptsPerRing; p++) {
      const a = r * cols + p;
      const b = r * cols + p + 1;
      const c = (r + 1) * cols + p + 1;
      const d = (r + 1) * cols + p;
      indices[ptr++] = a;
      indices[ptr++] = b;
      indices[ptr++] = d;
      indices[ptr++] = b;
      indices[ptr++] = c;
      indices[ptr++] = d;
    }
  }

  const normals = computeVertexNormals(positions, indices);
  return { positions, normals, uvs, indices };
}

/**
 * Generates an array of `count` placements using a generator callback `(index, t)` or a step vector.
 */
export function arrayCopies<T = CopyTransform | Vec3>(
  count: number,
  fnOrStep: ((index: number, t: number) => T) | Vec3,
  start: Vec3 = [0, 0, 0],
): T[] {
  const n = Math.max(0, Math.trunc(count));
  const out: T[] = [];
  if (typeof fnOrStep === 'function') {
    for (let i = 0; i < n; i++) {
      const t = n > 1 ? i / (n - 1) : 0;
      out.push(fnOrStep(i, t));
    }
    return out;
  }
  const [dx, dy, dz] = fnOrStep;
  for (let i = 0; i < n; i++) {
    out.push([start[0] + dx * i, start[1] + dy * i, start[2] + dz * i] as unknown as T);
  }
  return out;
}

/**
 * Deterministic seeded Poisson/rejection scatter inside 3D bounds with a minimum distance guard.
 */
export function scatter(
  bounds: ScatterBounds,
  count: number,
  minDistance = 0,
  seed = 1,
): Vec3[] {
  const n = Math.max(0, Math.trunc(count));
  if (n === 0) return [];
  const [minPt, maxPt]: [Vec3, Vec3] = Array.isArray(bounds) ? bounds : [bounds.min, bounds.max];
  const sx = maxPt[0] - minPt[0];
  const sy = maxPt[1] - minPt[1];
  const sz = maxPt[2] - minPt[2];
  if (sx < 0 || sy < 0 || sz < 0) {
    throw new Error('scatter bounds min must not exceed max');
  }

  const rng = mulberry32(seed);
  const points: Vec3[] = [];
  const minDistSq = minDistance > 0 ? minDistance * minDistance : 0;
  const maxAttempts = Math.max(100, n * 40);

  for (let attempt = 0; attempt < maxAttempts && points.length < n; attempt++) {
    const candidate: Vec3 = [
      minPt[0] + rng() * sx,
      minPt[1] + rng() * sy,
      minPt[2] + rng() * sz,
    ];
    let ok = true;
    if (minDistSq > 0) {
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const dx = candidate[0] - p[0];
        const dy = candidate[1] - p[1];
        const dz = candidate[2] - p[2];
        if (dx * dx + dy * dy + dz * dz < minDistSq) {
          ok = false;
          break;
        }
      }
    }
    if (ok) points.push(candidate);
  }

  if (points.length < n) {
    throw new Error(`scatter placed ${points.length} of ${n} points with minDistance ${minDistance}`);
  }
  return points;
}

/**
 * Bends a mesh by `angleRad` along the chosen axis ('x', 'y', or 'z').
 */
export function bend(
  mesh: Mesh3D,
  angleRad: number,
  axis: 'x' | 'y' | 'z' = 'y',
): Mesh3D {
  const srcPos = mesh.positions;
  const positions = new Float32Array(srcPos.length);
  const uvs = new Float32Array(mesh.uvs);
  const indices = new Uint32Array(mesh.indices);

  if (Math.abs(angleRad) < 1e-9 || srcPos.length === 0) {
    positions.set(srcPos);
    const normals = computeVertexNormals(positions, indices);
    return { positions, normals, uvs, indices };
  }

  const primaryIdx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
  const bendPlaneIdx = axis === 'x' ? 1 : 0; // bend in XY (or YX) plane

  let minS = Infinity;
  let maxS = -Infinity;
  for (let i = 0; i < srcPos.length; i += 3) {
    const s = srcPos[i + primaryIdx];
    if (s < minS) minS = s;
    if (s > maxS) maxS = s;
  }

  const length = maxS - minS;
  if (length < 1e-9) {
    positions.set(srcPos);
    const normals = computeVertexNormals(positions, indices);
    return { positions, normals, uvs, indices };
  }

  const radius = length / angleRad;
  for (let i = 0; i < srcPos.length; i += 3) {
    const p: [number, number, number] = [srcPos[i], srcPos[i + 1], srcPos[i + 2]];
    const s = p[primaryIdx];
    const u = p[bendPlaneIdx];
    const theta = ((s - minS) / length) * angleRad;
    const r = radius - u;
    p[primaryIdx] = minS + r * Math.sin(theta);
    p[bendPlaneIdx] = radius - r * Math.cos(theta);
    positions[i] = p[0];
    positions[i + 1] = p[1];
    positions[i + 2] = p[2];
  }

  const normals = computeVertexNormals(positions, indices);
  return { positions, normals, uvs, indices };
}

function identityMat4(): Float32Array {
  const m = new Float32Array(16);
  m[0] = 1;
  m[5] = 1;
  m[10] = 1;
  m[15] = 1;
  return m;
}

function multiplyMat4(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[k * 4 + row] * b[col * 4 + k];
      }
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

function translationRotationMat4(pivot: Vec3, axis: Vec3, angleRad: number): Float32Array {
  const len = Math.hypot(axis[0], axis[1], axis[2]) || 1;
  const ux = axis[0] / len;
  const uy = axis[1] / len;
  const uz = axis[2] / len;
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  const t = 1 - c;

  const m = new Float32Array(16);
  m[0] = t * ux * ux + c;
  m[1] = t * ux * uy + s * uz;
  m[2] = t * ux * uz - s * uy;
  m[3] = 0;

  m[4] = t * ux * uy - s * uz;
  m[5] = t * uy * uy + c;
  m[6] = t * uy * uz + s * ux;
  m[7] = 0;

  m[8] = t * ux * uz + s * uy;
  m[9] = t * uy * uz - s * ux;
  m[10] = t * uz * uz + c;
  m[11] = 0;

  m[12] = pivot[0];
  m[13] = pivot[1];
  m[14] = pivot[2];
  m[15] = 1;
  return m;
}

/** Transforms a 3D point by a column-major 4x4 matrix. */
export function applyMat4(m: Float32Array, p: Vec3): Vec3 {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
  ];
}

/**
 * Evaluates hierarchical forward kinematics for a joint skeleton with optional joint angle limits.
 */
export function pose(skeleton: Skeleton, jointAngles: Record<string, number> = {}): PoseResult {
  const joints = Array.isArray(skeleton) ? skeleton : skeleton.joints;
  const byId = new Map<string, SkeletonJoint>();
  for (const j of joints) byId.set(j.id, j);

  const matrices: Record<string, Float32Array> = {};
  const positions: Record<string, Vec3> = {};
  const clamped: string[] = [];

  const evalJoint = (id: string, visiting = new Set<string>()): Float32Array => {
    if (matrices[id]) return matrices[id];
    const joint = byId.get(id);
    if (!joint) throw new Error(`unknown joint "${id}"`);
    if (visiting.has(id)) throw new Error(`cycle in skeleton at joint "${id}"`);
    visiting.add(id);

    const parentMat = joint.parent ? evalJoint(joint.parent, visiting) : identityMat4();
    const rawAngle = jointAngles[id] ?? 0;
    let angle = rawAngle;
    if (joint.limits) {
      const [lo, hi] = joint.limits;
      if (rawAngle < lo || rawAngle > hi) {
        angle = Math.max(lo, Math.min(hi, rawAngle));
        if (!clamped.includes(id)) clamped.push(id);
      }
    }

    const pivot = joint.pivot ?? joint.position ?? [0, 0, 0];
    const axis = joint.axis ?? [0, 0, 1];
    const localMat = translationRotationMat4(pivot, axis, angle);
    const worldMat = multiplyMat4(parentMat, localMat);
    matrices[id] = worldMat;
    positions[id] = [worldMat[12], worldMat[13], worldMat[14]];
    visiting.delete(id);
    return worldMat;
  };

  for (const j of joints) {
    evalJoint(j.id);
  }

  return { matrices, positions, clamped };
}

