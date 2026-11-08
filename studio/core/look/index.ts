import type { Vec3 } from '../geo/index.ts';

export type MaterialPresetName =
  | 'glass'
  | 'brushedSteel'
  | 'anodizedAluminum'
  | 'ceramic'
  | 'mattePlastic'
  | 'lipidMembrane'
  | 'proteinSurface'
  | 'goldFoil';

export type MaterialDescriptor = {
  id: MaterialPresetName;
  color: string;
  roughness: number;
  metalness: number;
  transmission: number;
  ior: number;
  clearcoat: number;
  thickness?: number;
  choice: 'design';
};

export type DirectionalLightDesc = {
  role: 'key' | 'fill' | 'rim';
  kind: 'directional';
  color: string;
  intensity: number;
  position: Vec3;
  target: Vec3;
};

export type AmbientLightDesc = {
  role: 'ambient';
  kind: 'ambient';
  color: string;
  intensity: number;
};

export type RigName = 'studioThreePoint' | 'rimDark' | 'journalFlat' | 'warmBench';

export type RigDescriptor = {
  id: RigName;
  key: DirectionalLightDesc;
  fill: DirectionalLightDesc;
  rim: DirectionalLightDesc;
  ambient: AmbientLightDesc;
  lights: (DirectionalLightDesc | AmbientLightDesc)[];
};

export type DofResult = {
  near: number;
  far: number;
  hyperfocal: number;
  total: number;
};

/** Curated PBR material presets with physical parameters. */
export const MATERIALS: Record<MaterialPresetName, MaterialDescriptor> = {
  glass: {
    id: 'glass',
    color: '#EAF4FF',
    roughness: 0.04,
    metalness: 0.0,
    transmission: 0.94,
    ior: 1.52,
    clearcoat: 1.0,
    thickness: 0.0015,
    choice: 'design',
  },
  brushedSteel: {
    id: 'brushedSteel',
    color: '#C8CFD6',
    roughness: 0.32,
    metalness: 0.96,
    transmission: 0.0,
    ior: 1.5,
    clearcoat: 0.15,
    choice: 'design',
  },
  anodizedAluminum: {
    id: 'anodizedAluminum',
    color: '#3A414A',
    roughness: 0.26,
    metalness: 0.88,
    transmission: 0.0,
    ior: 1.5,
    clearcoat: 0.25,
    choice: 'design',
  },
  ceramic: {
    id: 'ceramic',
    color: '#F6F5F0',
    roughness: 0.18,
    metalness: 0.0,
    transmission: 0.0,
    ior: 1.54,
    clearcoat: 0.85,
    choice: 'design',
  },
  mattePlastic: {
    id: 'mattePlastic',
    color: '#D9DDE2',
    roughness: 0.58,
    metalness: 0.0,
    transmission: 0.0,
    ior: 1.49,
    clearcoat: 0.05,
    choice: 'design',
  },
  lipidMembrane: {
    id: 'lipidMembrane',
    color: '#E6B87D',
    roughness: 0.42,
    metalness: 0.0,
    transmission: 0.22,
    ior: 1.46,
    clearcoat: 0.3,
    thickness: 0.0005,
    choice: 'design',
  },
  proteinSurface: {
    id: 'proteinSurface',
    color: '#D96B52',
    roughness: 0.48,
    metalness: 0.02,
    transmission: 0.0,
    ior: 1.48,
    clearcoat: 0.18,
    choice: 'design',
  },
  goldFoil: {
    id: 'goldFoil',
    color: '#F2C14E',
    roughness: 0.2,
    metalness: 1.0,
    transmission: 0.0,
    ior: 1.0,
    clearcoat: 0.35,
    choice: 'design',
  },
};

function makeRig(
  id: RigName,
  key: Omit<DirectionalLightDesc, 'role' | 'kind'>,
  fill: Omit<DirectionalLightDesc, 'role' | 'kind'>,
  rim: Omit<DirectionalLightDesc, 'role' | 'kind'>,
  ambient: Omit<AmbientLightDesc, 'role' | 'kind'>,
): RigDescriptor {
  const k: DirectionalLightDesc = { role: 'key', kind: 'directional', ...key };
  const f: DirectionalLightDesc = { role: 'fill', kind: 'directional', ...fill };
  const r: DirectionalLightDesc = { role: 'rim', kind: 'directional', ...rim };
  const a: AmbientLightDesc = { role: 'ambient', kind: 'ambient', ...ambient };
  return { id, key: k, fill: f, rim: r, ambient: a, lights: [k, f, r, a] };
}

/** Studio lighting rigs with key, fill, rim, and ambient lights. */
export const RIGS: Record<RigName, RigDescriptor> = {
  studioThreePoint: makeRig(
    'studioThreePoint',
    { color: '#FFFDF8', intensity: 2.0, position: [2.5, 3.2, 2.8], target: [0, 0, 0] },
    { color: '#DCE8FF', intensity: 1.0, position: [-2.8, 1.6, 2.2], target: [0, 0, 0] },
    { color: '#A8CBFF', intensity: 1.5, position: [-1.8, 2.6, -3.2], target: [0, 0, 0] },
    { color: '#FFFFFF', intensity: 0.35 },
  ),
  rimDark: makeRig(
    'rimDark',
    { color: '#F5F7FF', intensity: 1.4, position: [1.6, 2.2, 2.0], target: [0, 0, 0] },
    { color: '#6E85B2', intensity: 0.45, position: [-2.2, 1.0, 1.6], target: [0, 0, 0] },
    { color: '#8AB8FF', intensity: 2.6, position: [-2.4, 2.4, -3.5], target: [0, 0, 0] },
    { color: '#1A2030', intensity: 0.12 },
  ),
  journalFlat: makeRig(
    'journalFlat',
    { color: '#FFFFFF', intensity: 1.5, position: [1.2, 2.4, 3.5], target: [0, 0, 0] },
    { color: '#F4F7FA', intensity: 1.1, position: [-1.8, 1.8, 3.0], target: [0, 0, 0] },
    { color: '#E2E8F0', intensity: 0.7, position: [0.0, 2.5, -2.5], target: [0, 0, 0] },
    { color: '#FFFFFF', intensity: 0.65 },
  ),
  warmBench: makeRig(
    'warmBench',
    { color: '#FFEBD2', intensity: 2.1, position: [2.8, 3.4, 2.2], target: [0, 0, 0] },
    { color: '#E8F0FF', intensity: 0.9, position: [-2.4, 1.5, 2.4], target: [0, 0, 0] },
    { color: '#FFD6A5', intensity: 1.4, position: [-1.5, 2.2, -2.8], target: [0, 0, 0] },
    { color: '#FFF6EA', intensity: 0.3 },
  ),
};

/**
 * Computes vertical field of view in degrees from focal length (mm) and sensor height (mm).
 */
export function fovFromLens(focalMm: number, sensorHeightMm: number | [number, number] = 24): number {
  if (!(focalMm > 0)) {
    throw new Error('fovFromLens requires a positive focal length in mm');
  }
  const h = Array.isArray(sensorHeightMm) ? sensorHeightMm[1] : sensorHeightMm;
  if (!(h > 0)) {
    throw new Error('fovFromLens requires a positive sensor height in mm');
  }
  return 2 * Math.atan(h / (2 * focalMm)) * (180 / Math.PI);
}

/**
 * Computes depth-of-field near, far, hyperfocal, and total range in metres.
 */
export function dofRange(
  focalMm: number,
  fStop: number,
  focusDistM: number,
  cocMm = 0.03,
): DofResult {
  if (!(focalMm > 0) || !(fStop > 0) || !(focusDistM > 0) || !(cocMm > 0)) {
    throw new Error('dofRange requires positive focalMm, fStop, focusDistM, and cocMm');
  }
  const fM = focalMm / 1000;
  const cM = cocMm / 1000;
  const hyperfocal = (fM * fM) / (fStop * cM) + fM;
  const s = focusDistM;

  const near = (s * (hyperfocal - fM)) / (hyperfocal + s - 2 * fM);
  const far = s < hyperfocal ? (s * (hyperfocal - fM)) / (hyperfocal - s) : Infinity;
  const total = far === Infinity ? Infinity : far - near;

  return { near, far, hyperfocal, total };
}

