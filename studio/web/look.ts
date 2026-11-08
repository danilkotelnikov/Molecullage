import * as THREE from 'three';
import {
  MATERIALS,
  RIGS,
  fovFromLens,
  dofRange,
} from '../core/look/index.ts';
import type {
  MaterialDescriptor,
  MaterialPresetName,
  RigDescriptor,
  RigName,
} from '../core/look/index.ts';

/**
 * Converts a `MATERIALS` preset name or descriptor into a `THREE.MeshPhysicalMaterial`.
 */
export function createThreeMaterial(
  presetOrName: MaterialPresetName | MaterialDescriptor,
  overrides: Partial<MaterialDescriptor> = {},
): THREE.MeshPhysicalMaterial {
  const base: MaterialDescriptor =
    typeof presetOrName === 'string' ? MATERIALS[presetOrName] : presetOrName;
  if (!base) {
    throw new Error(`unknown material preset "${String(presetOrName)}"`);
  }
  const desc = { ...base, ...overrides };
  const isTransmissive = desc.transmission > 0;
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(desc.color),
    roughness: desc.roughness,
    metalness: desc.metalness,
    transmission: desc.transmission,
    ior: desc.ior,
    clearcoat: desc.clearcoat,
    thickness: desc.thickness ?? 0,
    transparent: isTransmissive,
    depthWrite: !isTransmissive,
    side: THREE.DoubleSide,
  });
}

/** Alias matching the Plan 2 shared contract name. */
export const makeMaterial = createThreeMaterial;

/**
 * Converts a `RIGS` lighting rig name or descriptor into a `THREE.Group`
 * containing `THREE.DirectionalLight` (key, fill, rim) and `THREE.AmbientLight` nodes.
 */
export function createThreeRig(
  rigOrName: RigName | RigDescriptor,
  scale = 1,
): THREE.Group {
  const rig: RigDescriptor = typeof rigOrName === 'string' ? RIGS[rigOrName] : rigOrName;
  if (!rig) {
    throw new Error(`unknown light rig "${String(rigOrName)}"`);
  }

  const group = new THREE.Group();
  group.name = `rig:${rig.id}`;

  for (const lightDesc of [rig.key, rig.fill, rig.rim]) {
    const dir = new THREE.DirectionalLight(new THREE.Color(lightDesc.color), lightDesc.intensity);
    dir.name = lightDesc.role;
    dir.position.set(
      lightDesc.position[0] * scale,
      lightDesc.position[1] * scale,
      lightDesc.position[2] * scale,
    );
    dir.target.position.set(
      lightDesc.target[0] * scale,
      lightDesc.target[1] * scale,
      lightDesc.target[2] * scale,
    );
    group.add(dir, dir.target);
  }

  const ambient = new THREE.AmbientLight(new THREE.Color(rig.ambient.color), rig.ambient.intensity);
  ambient.name = 'ambient';
  group.add(ambient);

  return group;
}

/** Alias matching the Plan 2 shared contract name. */
export const makeLights = createThreeRig;

/**
 * Applies physical camera lens optics (`focalMm`, `sensorHeightMm`, `fStop`, `focusDistM`, `cocMm`)
 * to a `THREE.PerspectiveCamera`.
 */
export function applyOptics(
  camera: THREE.PerspectiveCamera,
  opts: { focalMm: number; sensorHeightMm?: number; fStop?: number; focusDistM?: number; cocMm?: number },
): void {
  camera.fov = fovFromLens(opts.focalMm, opts.sensorHeightMm ?? 24);
  camera.updateProjectionMatrix();
  if (opts.fStop && opts.focusDistM) {
    camera.userData.dof = dofRange(opts.focalMm, opts.fStop, opts.focusDistM, opts.cocMm ?? 0.03);
  }
}

