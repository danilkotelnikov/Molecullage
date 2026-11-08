import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import type { Job } from '../core/job.ts';
import type { Lens } from '../core/lens.ts';

// Asset ids in a job file:
//   "builtin:tube"    an approximate 0.2 mL tube, made by THREE.LatheGeometry (Plan 2 replaces it with an exact profile)
//   "builtin:sphere"  a sphere
//   anything else     a .glb file in jobs/<job>/
// Every asset is centred at its bounding box and scaled so that its longest side is 1.
// The renderer then scales it to the object's size in metres.

/** The asset ids that a job uses, exact assets and stand-ins. */
export function assetIds(job: Job): string[] {
  const ids = new Set<string>();
  for (const o of job.world.objects) {
    if (o.asset) ids.add(o.asset);
    if (o.standIn) ids.add(o.standIn.asset);
  }
  return [...ids];
}

// Outline of the tube in mm: (radius, height). It starts at the outer tip, goes up the outer wall,
// across the rim and down the inner wall. About 20 mm tall, 6 mm across the rim, 0.5 mm wall. No drawing exists yet.
const TUBE_PROFILE: [number, number][] = [
  [0, -10],
  [0.4, -9.75],
  [0.7, -9.0],
  [3.0, 2.0],
  [3.0, 10],
  [2.5, 10],
  [2.5, 2.0],
  [0.2, -9.0],
  [0.15, -9.3],
  [0, -9.5],
];

// The liquid in the bottom of the tube, in mm: a closed body from the tip up to a surface at y = -4, just inside the wall.
const LIQUID_PROFILE: [number, number][] = [[0, -9.5], [0.15, -9.3], [0.19, -9.0], [1.2, -4.0], [0, -4.0]];

function unit(object: THREE.Object3D): THREE.Object3D {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const longest = Math.max(size.x, size.y, size.z);
  if (!(longest > 0)) throw new Error('asset has no size');
  const centre = box.getCenter(new THREE.Vector3());
  const inner = new THREE.Group();
  inner.add(object);
  inner.position.copy(centre).multiplyScalar(-1);
  const outer = new THREE.Group();
  outer.add(inner);
  outer.scale.setScalar(1 / longest);
  return outer;
}

const mesh = (geometry: THREE.BufferGeometry) => new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());

function builtin(id: string): THREE.Object3D {
  switch (id) {
    case 'builtin:tube':
      return unit(mesh(new THREE.LatheGeometry(TUBE_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)), 64)));
    case 'builtin:liquid':
      return unit(mesh(new THREE.LatheGeometry(LIQUID_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)), 64)));
    case 'builtin:sphere':
      return unit(mesh(new THREE.SphereGeometry(0.5, 48, 24)));
    default:
      throw new Error(`unknown built-in asset "${id}"`);
  }
}

/** The lens HDRI from the material library (library/manifest.json), or null when the lens has none. */
export async function loadEnvironment(lens: Lens): Promise<THREE.Texture | null> {
  if (!lens.environment) return null;
  const res = await fetch('library/manifest.json');
  if (!res.ok) throw new Error(`library/manifest.json: ${res.status}`);
  const manifest = (await res.json()) as { assets: { id: string; file: string }[] };
  const asset = manifest.assets.find((x) => x.id === lens.environment!.hdri);
  if (!asset) throw new Error(`lens "${lens.id}": hdri "${lens.environment.hdri}" is not in the library`);
  const texture = await new RGBELoader().loadAsync(`library/${asset.file}`);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  return texture;
}

/** Loads the assets. `base` is the URL folder of the job, for example "jobs/zoom-test/". */
export async function loadAssets(base: string, ids: Iterable<string>): Promise<Map<string, THREE.Object3D>> {
  const out = new Map<string, THREE.Object3D>();
  const loader = new GLTFLoader();
  for (const id of ids) {
    if (id.startsWith('builtin:')) {
      out.set(id, builtin(id));
    } else {
      const gltf = await loader.loadAsync(base + id);
      gltf.scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && !m.geometry.getAttribute('normal')) m.geometry.computeVertexNormals();
      });
      out.set(id, unit(gltf.scene));
    }
  }
  return out;
}
