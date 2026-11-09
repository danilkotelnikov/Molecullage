// Builds self-contained .glb kit assets for studio/jobs/miraeles:
// - thermos.glb: packed from ../../library/models/plastic_thermos_polyhaven/plastic_thermos_2k.gltf (CC0-1.0)
// - strip.glb: lateral-flow strip body (sample pad, conjugate pad, nitrocellulose membrane, absorbent pad)
// - amplicon.glb: double-helical DNA amplicon segment for molecular sandwich stop
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const THERMOS_DIR = path.resolve(DIR, '..', '..', 'library', 'models', 'plastic_thermos_polyhaven');

function packSingleMeshGlb(geometry, outFile) {
  const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry;
  if (!nonIndexed.getAttribute('normal')) nonIndexed.computeVertexNormals();
  const posAttr = nonIndexed.getAttribute('position');
  const normAttr = nonIndexed.getAttribute('normal');
  const count = posAttr.count;
  const posArr = new Float32Array(count * 3);
  const normArr = new Float32Array(count * 3);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];

  for (let i = 0; i < count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);
    posArr[i * 3] = x;
    posArr[i * 3 + 1] = y;
    posArr[i * 3 + 2] = z;
    if (x < min[0]) min[0] = x;
    if (y < min[1]) min[1] = y;
    if (z < min[2]) min[2] = z;
    if (x > max[0]) max[0] = x;
    if (y > max[1]) max[1] = y;
    if (z > max[2]) max[2] = z;

    normArr[i * 3] = normAttr.getX(i);
    normArr[i * 3 + 1] = normAttr.getY(i);
    normArr[i * 3 + 2] = normAttr.getZ(i);
  }

  const posBuf = Buffer.from(posArr.buffer);
  const normBuf = Buffer.from(normArr.buffer);
  const binChunkData = Buffer.concat([posBuf, normBuf]);
  const binPad = (4 - (binChunkData.length % 4)) % 4;
  const binPadded = binPad ? Buffer.concat([binChunkData, Buffer.alloc(binPad)]) : binChunkData;

  const gltf = {
    asset: { version: '2.0', generator: 'molecullage-studio-kit' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, mode: 4 }] }],
    buffers: [{ byteLength: binChunkData.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: posBuf.length, target: 34962 },
      { buffer: 0, byteOffset: posBuf.length, byteLength: normBuf.length, target: 34962 },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count, type: 'VEC3', min, max },
      { bufferView: 1, componentType: 5126, count, type: 'VEC3' },
    ],
  };

  const jsonBytes = Buffer.from(JSON.stringify(gltf), 'utf8');
  const jsonPad = (4 - (jsonBytes.length % 4)) % 4;
  const jsonPadded = jsonPad ? Buffer.concat([jsonBytes, Buffer.alloc(jsonPad, 0x20)]) : jsonBytes;

  const totalLength = 12 + 8 + jsonPadded.length + 8 + binPadded.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // glTF
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonPadded.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4); // JSON

  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binPadded.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4); // BIN

  fs.writeFileSync(outFile, Buffer.concat([header, jsonHeader, jsonPadded, binHeader, binPadded]));
}

function mergeGeometries(geos) {
  const parts = geos.map((g) => {
    const ni = g.index ? g.toNonIndexed() : g;
    if (!ni.getAttribute('normal')) ni.computeVertexNormals();
    return ni;
  });
  const totalVerts = parts.reduce((s, g) => s + g.getAttribute('position').count, 0);
  const pos = new Float32Array(totalVerts * 3);
  const norm = new Float32Array(totalVerts * 3);
  let offset = 0;
  for (const g of parts) {
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    for (let i = 0; i < p.count; i++) {
      pos[(offset + i) * 3] = p.getX(i);
      pos[(offset + i) * 3 + 1] = p.getY(i);
      pos[(offset + i) * 3 + 2] = p.getZ(i);
      norm[(offset + i) * 3] = n.getX(i);
      norm[(offset + i) * 3 + 1] = n.getY(i);
      norm[(offset + i) * 3 + 2] = n.getZ(i);
    }
    offset += p.count;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
  return merged;
}

// 1. Pack Poly Haven plastic_thermos_2k.gltf + plastic_thermos.bin into self-contained thermos.glb (geometry-only, untextured so lens material paints cleanly)
{
  const gltfJson = JSON.parse(fs.readFileSync(path.join(THERMOS_DIR, 'plastic_thermos_2k.gltf'), 'utf8'));
  const binData = fs.readFileSync(path.join(THERMOS_DIR, 'plastic_thermos.bin'));
  const stripped = {
    asset: gltfJson.asset,
    scene: gltfJson.scene ?? 0,
    scenes: gltfJson.scenes,
    nodes: gltfJson.nodes,
    meshes: gltfJson.meshes.map((m) => ({
      name: m.name,
      primitives: m.primitives.map((p) => ({
        attributes: {
          POSITION: p.attributes.POSITION,
          ...(p.attributes.NORMAL !== undefined ? { NORMAL: p.attributes.NORMAL } : {}),
        },
        ...(p.indices !== undefined ? { indices: p.indices } : {}),
        ...(p.mode !== undefined ? { mode: p.mode } : {}),
      })),
    })),
    buffers: [{ byteLength: binData.length }],
    bufferViews: gltfJson.bufferViews,
    accessors: gltfJson.accessors,
  };
  const jsonBytes = Buffer.from(JSON.stringify(stripped), 'utf8');
  const jsonPad = (4 - (jsonBytes.length % 4)) % 4;
  const jsonPadded = jsonPad ? Buffer.concat([jsonBytes, Buffer.alloc(jsonPad, 0x20)]) : jsonBytes;
  const binPad = (4 - (binData.length % 4)) % 4;
  const binPadded = binPad ? Buffer.concat([binData, Buffer.alloc(binPad)]) : binData;

  const totalLength = 12 + 8 + jsonPadded.length + 8 + binPadded.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonPadded.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binPadded.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);
  fs.writeFileSync(path.join(DIR, 'thermos.glb'), Buffer.concat([header, jsonHeader, jsonPadded, binHeader, binPadded]));
}

// 2. Build lateral-flow strip geometry (backing card + sample pad + conjugate pad + membrane + absorbent pad, 60 x 4 x 1.2 mm proportions)
{
  const backing = new THREE.BoxGeometry(60, 0.4, 4.2, 8, 2, 4);
  backing.translate(0, -0.3, 0);
  const samplePad = new THREE.BoxGeometry(14, 0.7, 4.0, 4, 2, 2);
  samplePad.translate(-23, 0.25, 0);
  const conjPad = new THREE.BoxGeometry(8, 0.65, 4.0, 4, 2, 2);
  conjPad.translate(-12, 0.22, 0);
  const membrane = new THREE.BoxGeometry(24, 0.5, 4.0, 8, 2, 2);
  membrane.translate(4, 0.15, 0);
  const absPad = new THREE.BoxGeometry(14, 0.8, 4.0, 4, 2, 2);
  absPad.translate(23, 0.3, 0);
  const merged = mergeGeometries([backing, samplePad, conjPad, membrane, absPad]);
  packSingleMeshGlb(merged, path.join(DIR, 'strip.glb'));
}

// 3. Build double-helical DNA amplicon segment (two intertwined helical strands + base-pair rungs)
{
  class HelixCurve extends THREE.Curve {
    constructor(phase) {
      super();
      this.phase = phase;
    }
    getPoint(t) {
      const x = (t - 0.5) * 12;
      const angle = t * Math.PI * 6 + this.phase;
      return new THREE.Vector3(x, Math.cos(angle) * 1.0, Math.sin(angle) * 1.0);
    }
  }
  const parts = [
    new THREE.TubeGeometry(new HelixCurve(0), 96, 0.26, 16, false),
    new THREE.TubeGeometry(new HelixCurve(Math.PI), 96, 0.26, 16, false),
  ];
  for (let k = 0; k <= 18; k++) {
    const t = k / 18;
    const x = (t - 0.5) * 12;
    const angle = t * Math.PI * 6;
    const rung = new THREE.CylinderGeometry(0.12, 0.12, 1.9, 10);
    rung.rotateZ(0);
    rung.rotateX(angle + Math.PI / 2);
    rung.translate(x, 0, 0);
    parts.push(rung);
  }
  packSingleMeshGlb(mergeGeometries(parts), path.join(DIR, 'amplicon.glb'));
}

console.log('Built thermos.glb, strip.glb, amplicon.glb');
