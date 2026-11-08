import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  revolve,
  extrude,
  loft,
  arrayCopies,
  scatter,
  bend,
  pose,
  applyMat4,
} from '../geo/index.ts';
import type { Vec2, Vec3 } from '../geo/index.ts';
import {
  MATERIALS,
  RIGS,
  fovFromLens,
  dofRange,
} from '../look/index.ts';
import {
  createThreeMaterial,
  createThreeRig,
  applyOptics,
} from '../../web/look.ts';

test('revolve generates a 3D lathe mesh with positions, normals, uvs, and indices', () => {
  const profile: Vec2[] = [
    [0, 0],
    [1, 0],
    [1, 2],
    [0, 2],
  ];
  const mesh = revolve(profile, 32);
  assert.ok(mesh.positions instanceof Float32Array);
  assert.ok(mesh.normals instanceof Float32Array);
  assert.ok(mesh.uvs instanceof Float32Array);
  assert.ok(mesh.indices instanceof Uint32Array);

  assert.equal(mesh.positions.length, 4 * 33 * 3);
  assert.equal(mesh.normals.length, mesh.positions.length);
  assert.equal(mesh.uvs.length, 4 * 33 * 2);
  assert.equal(mesh.indices.length, 3 * 32 * 6);

  // Every normal is unit length
  for (let i = 0; i < mesh.normals.length; i += 3) {
    const nLen = Math.hypot(mesh.normals[i], mesh.normals[i + 1], mesh.normals[i + 2]);
    assert.ok(Math.abs(nLen - 1) < 1e-5, `normal at ${i} has length ${nLen}`);
  }

  // Repeated adjacent point is rejected
  assert.throws(
    () =>
      revolve(
        [
          [0, 0],
          [1, 1],
          [1, 1],
        ],
        16,
      ),
    /repeated point/,
  );
});

test('extrude generates a 3D mesh from a 2D polygon with depth and bevel', () => {
  const square: Vec2[] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  const plain = extrude(square, 2, 0);
  const beveled = extrude(square, 2, 0.2);

  assert.ok(plain.positions.length > 0);
  assert.equal(plain.normals.length, plain.positions.length);
  assert.ok(plain.indices.length > 0);
  assert.ok(beveled.positions.length > plain.positions.length);

  // Verify z bounds span [0, 2]
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 2; i < beveled.positions.length; i += 3) {
    if (beveled.positions[i] < minZ) minZ = beveled.positions[i];
    if (beveled.positions[i] > maxZ) maxZ = beveled.positions[i];
  }
  assert.ok(Math.abs(minZ - 0) < 1e-6);
  assert.ok(Math.abs(maxZ - 2) < 1e-6);
});

test('loft connects 3D point rings in open and closed modes', () => {
  const makeRing = (z: number, r: number): Vec3[] => [
    [r, 0, z],
    [0, r, z],
    [-r, 0, z],
    [0, -r, z],
  ];
  const rings = [makeRing(0, 1), makeRing(1, 1.5), makeRing(2, 1)];
  const openMesh = loft(rings, false);
  const closedMesh = loft(rings, true);

  assert.equal(openMesh.indices.length, 2 * 4 * 6);
  assert.equal(closedMesh.indices.length, 3 * 4 * 6);
  assert.equal(closedMesh.normals.length, closedMesh.positions.length);
});

test('arrayCopies and scatter produce deterministic placements with minimum distance', () => {
  const byFn = arrayCopies(4, (i, t) => ({
    position: [i * 2, t, 0] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    scale: [1, 1, 1] as Vec3,
  }));
  assert.equal(byFn.length, 4);
  assert.deepEqual(byFn[0].position, [0, 0, 0]);
  assert.deepEqual(byFn[3].position, [6, 1, 0]);

  const byStep = arrayCopies(3, [1, 0, 0], [0, 0, 0]);
  assert.deepEqual(byStep, [
    [0, 0, 0],
    [1, 0, 0],
    [2, 0, 0],
  ]);

  const bounds = { min: [0, 0, 0] as Vec3, max: [10, 10, 10] as Vec3 };
  const ptsA = scatter(bounds, 50, 0.8, 42);
  const ptsB = scatter(bounds, 50, 0.8, 42);
  assert.equal(ptsA.length, 50);
  assert.deepEqual(ptsA, ptsB);

  for (let i = 0; i < ptsA.length; i++) {
    const [x, y, z] = ptsA[i];
    assert.ok(x >= 0 && x <= 10 && y >= 0 && y <= 10 && z >= 0 && z <= 10);
    for (let j = i + 1; j < ptsA.length; j++) {
      const d = Math.hypot(x - ptsA[j][0], y - ptsA[j][1], z - ptsA[j][2]);
      assert.ok(d >= 0.8 - 1e-9, `pair (${i}, ${j}) closer than minDistance: ${d}`);
    }
  }

  assert.throws(() => scatter({ min: [0, 0, 0], max: [1, 1, 1] }, 500, 0.8, 7), /scatter placed/);
});

test('bend deforms mesh along an axis and preserves positions at zero angle', () => {
  const profile: Vec2[] = [
    [0.2, 0],
    [0.2, 1],
    [0.2, 2],
  ];
  const cyl = revolve(profile, 16);
  const unbent = bend(cyl, 0, 'y');
  assert.deepEqual(Array.from(unbent.positions), Array.from(cyl.positions));

  const bent = bend(cyl, Math.PI / 2, 'y');
  assert.equal(bent.positions.length, cyl.positions.length);
  assert.equal(bent.normals.length, cyl.normals.length);
  let moved = 0;
  for (let i = 0; i < cyl.positions.length; i++) {
    if (Math.abs(bent.positions[i] - cyl.positions[i]) > 1e-3) moved++;
  }
  assert.ok(moved > 10, 'expected bent mesh vertices to move');
});

test('pose computes hierarchical forward kinematics and clamps joint limits', () => {
  const skeleton = [
    { id: 'shoulder', parent: null, pivot: [0, 0, 0] as Vec3, axis: [0, 0, 1] as Vec3, limits: [-Math.PI, Math.PI] as [number, number] },
    { id: 'elbow', parent: 'shoulder', pivot: [0, 1, 0] as Vec3, axis: [0, 0, 1] as Vec3, limits: [0, 2] as [number, number] },
  ];

  // Rotate shoulder +90 deg around Z: elbow at (0, 1, 0) in shoulder space moves to (-1, 0, 0)
  const res = pose(skeleton, { shoulder: Math.PI / 2, elbow: 3.5 });
  assert.deepEqual(res.clamped, ['elbow']);
  assert.ok(Math.abs(res.positions.elbow[0] - -1) < 1e-6);
  assert.ok(Math.abs(res.positions.elbow[1] - 0) < 1e-6);
  assert.ok(Math.abs(res.positions.elbow[2] - 0) < 1e-6);

  const tipWorld = applyMat4(res.matrices.shoulder, [0, 1, 0]);
  assert.ok(Math.abs(tipWorld[0] - -1) < 1e-6);
});

test('MATERIALS and RIGS provide all curated PBR presets and lighting rigs', () => {
  const expectedMaterials = [
    'glass',
    'brushedSteel',
    'anodizedAluminum',
    'ceramic',
    'mattePlastic',
    'lipidMembrane',
    'proteinSurface',
    'goldFoil',
  ] as const;

  for (const name of expectedMaterials) {
    const m = MATERIALS[name];
    assert.ok(m, `missing material ${name}`);
    assert.match(m.color, /^#[0-9a-fA-F]{6}$/);
    assert.ok(m.roughness >= 0 && m.roughness <= 1);
    assert.ok(m.metalness >= 0 && m.metalness <= 1);
    assert.ok(m.transmission >= 0 && m.transmission <= 1);
    assert.ok(m.ior >= 1 && m.ior <= 2.5);
    assert.ok(m.clearcoat >= 0 && m.clearcoat <= 1);
  }
  assert.ok(MATERIALS.glass.transmission > 0.8);
  assert.equal(MATERIALS.goldFoil.metalness, 1.0);

  const expectedRigs = ['studioThreePoint', 'rimDark', 'journalFlat', 'warmBench'] as const;
  for (const name of expectedRigs) {
    const r = RIGS[name];
    assert.ok(r, `missing rig ${name}`);
    assert.equal(r.key.role, 'key');
    assert.equal(r.fill.role, 'fill');
    assert.equal(r.rim.role, 'rim');
    assert.equal(r.ambient.role, 'ambient');
    assert.equal(r.lights.length, 4);
  }
});

test('fovFromLens, dofRange, and studio/web/look.ts Three.js helpers work accurately', () => {
  // 50mm lens on 24mm high full-frame sensor -> ~26.99 deg vertical FOV
  const fov50 = fovFromLens(50, 24);
  assert.ok(Math.abs(fov50 - 26.9914) < 0.01, `got ${fov50}`);

  // Close focus (100mm, f/2.8, 0.3m focus) -> ordered finite near < focus < far
  const closeDof = dofRange(100, 2.8, 0.3, 0.03);
  assert.ok(closeDof.near > 0 && closeDof.near < 0.3);
  assert.ok(closeDof.far > 0.3 && Number.isFinite(closeDof.far));
  assert.ok(closeDof.total > 0 && Number.isFinite(closeDof.total));

  // Focus beyond hyperfocal (24mm, f/8, 50m focus) -> far = Infinity
  const farDof = dofRange(24, 8, 50, 0.03);
  assert.equal(farDof.far, Infinity);

  // Three.js helpers in studio/web/look.ts
  const glassMat = createThreeMaterial('glass');
  assert.ok(glassMat instanceof THREE.MeshPhysicalMaterial);
  assert.ok(Math.abs(glassMat.ior - MATERIALS.glass.ior) < 1e-5);
  assert.ok(Math.abs(glassMat.transmission - MATERIALS.glass.transmission) < 1e-5);

  const rigGroup = createThreeRig('studioThreePoint', 2);
  assert.ok(rigGroup instanceof THREE.Group);
  const keyLight = rigGroup.getObjectByName('key') as THREE.DirectionalLight;
  const ambLight = rigGroup.getObjectByName('ambient') as THREE.AmbientLight;
  assert.ok(keyLight instanceof THREE.DirectionalLight);
  assert.ok(ambLight instanceof THREE.AmbientLight);
  assert.ok(Math.abs(keyLight.position.x - RIGS.studioThreePoint.key.position[0] * 2) < 1e-6);

  const cam = new THREE.PerspectiveCamera();
  applyOptics(cam, { focalMm: 50, sensorHeightMm: 24, fStop: 4, focusDistM: 2 });
  assert.ok(Math.abs(cam.fov - fov50) < 1e-4);
  assert.ok(cam.userData.dof.near < 2 && cam.userData.dof.far > 2);
});

