// Writes one mesh as a binary glTF 2.0 file (.glb): float32 positions, optional float32 normals, uint32 indices.
// No materials, no textures. The live renderer paints its own material over the mesh.

const pad4 = (n) => (n + 3) & ~3;

/** positions and normals: flat x,y,z lists. indices: flat triangle list. Returns a Buffer. */
export function writeGlb({ positions, normals, indices }) {
  const pos = Float32Array.from(positions);
  const nrm = normals ? Float32Array.from(normals) : null;
  const idx = Uint32Array.from(indices);
  if (nrm && nrm.length !== pos.length) throw new Error('normals and positions differ in length');
  if (pos.length % 3 || idx.length % 3) throw new Error('positions and indices must come in threes');
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i++) {
    min[i % 3] = Math.min(min[i % 3], pos[i]);
    max[i % 3] = Math.max(max[i % 3], pos[i]);
  }
  const parts = [pos, ...(nrm ? [nrm] : []), idx];
  const bufferViews = [];
  let offset = 0;
  for (const [k, a] of parts.entries()) {
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: a.byteLength, target: k === parts.length - 1 ? 34963 : 34962 });
    offset += a.byteLength; // every part is a multiple of 4 bytes, so the offsets stay aligned
  }
  const accessors = [{ bufferView: 0, componentType: 5126, count: pos.length / 3, type: 'VEC3', min, max }];
  if (nrm) accessors.push({ bufferView: 1, componentType: 5126, count: nrm.length / 3, type: 'VEC3' });
  accessors.push({ bufferView: parts.length - 1, componentType: 5125, count: idx.length, type: 'SCALAR' });
  const attributes = nrm ? { POSITION: 0, NORMAL: 1 } : { POSITION: 0 };
  const json = {
    asset: { version: '2.0', generator: 'molecullage-studio tools/glb.mjs' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes, indices: accessors.length - 1, mode: 4 }] }],
    accessors,
    bufferViews,
    buffers: [{ byteLength: offset }],
  };
  const jsonBytes = Buffer.from(JSON.stringify(json), 'utf8');
  const jsonLen = pad4(jsonBytes.length);
  const out = Buffer.alloc(12 + 8 + jsonLen + 8 + offset);
  out.writeUInt32LE(0x46546c67, 0); // "glTF"
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(jsonLen, 12);
  out.writeUInt32LE(0x4e4f534a, 16); // "JSON"
  jsonBytes.copy(out, 20);
  out.fill(0x20, 20 + jsonBytes.length, 20 + jsonLen); // JSON chunk is padded with spaces
  const bin = 20 + jsonLen;
  out.writeUInt32LE(offset, bin);
  out.writeUInt32LE(0x004e4942, bin + 4); // "BIN\0"
  let at = bin + 8;
  for (const a of parts) {
    Buffer.from(a.buffer, a.byteOffset, a.byteLength).copy(out, at);
    at += a.byteLength;
  }
  return out;
}
