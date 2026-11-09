import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { cameraAt } from '../core/camera.ts';
import type { Stage } from './renderer.ts';

export type CameraJson = {
  fovDeg: number;
  aspect: number;
  near: number;
  far: number;
  focus?: number;
  fstop?: number;
  sensorMm: [number, number];
  exportScale: number;
  background: string;
};

export async function exportAt(
  stage: Stage,
  t: number,
): Promise<{ glb: ArrayBuffer; camera: CameraJson }> {
  await stage.seek(t);
  const camPath = stage.job.paths.find((p) => p.id === stage.pathId) ?? stage.job.paths[0];
  const cam = cameraAt(stage.job.world, camPath, t);
  const exportScale = 1 / cam.distance;

  const exportScene = new THREE.Scene();

  const threeCam = stage.three.camera;
  threeCam.updateMatrixWorld(true);

  for (const child of stage.three.scene.children) {
    if (!(child instanceof THREE.Group) || !child.visible) continue;
    const groupNode = new THREE.Group();
    groupNode.name = child.name;
    groupNode.position.copy(child.position);
    groupNode.rotation.copy(child.rotation);
    groupNode.scale.copy(child.scale);
    groupNode.updateMatrix();
    groupNode.applyMatrix4(threeCam.matrixWorldInverse);

    let addedPart = false;
    for (const part of child.children) {
      if (!part.visible) continue;
      let hasVisibleMesh = false;
      part.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && m.visible) {
          const mat = m.material as THREE.MeshStandardMaterial;
          if (!mat || mat.opacity === undefined || mat.opacity > 0.002) {
            hasVisibleMesh = true;
          }
        }
      });
      if (!hasVisibleMesh) continue;

      const clonedPart = part.clone(true);
      clonedPart.name = part.name && part.name.endsWith(':standIn') ? part.name : '';
      groupNode.add(clonedPart);
      addedPart = true;
    }
    if (addedPart) {
      exportScene.add(groupNode);
    }
  }

  exportScene.updateMatrixWorld(true);
  const exporter = new GLTFExporter();
  const glb = (await exporter.parseAsync(exportScene, { binary: true, trs: true })) as ArrayBuffer;
  const userData = threeCam.userData ?? {};
  const sensorMm: [number, number] = Array.isArray(userData.sensorMm) && userData.sensorMm.length === 2
    ? [Number(userData.sensorMm[0]), Number(userData.sensorMm[1])]
    : [36, 24];

  const camera: CameraJson = {
    fovDeg: cam.fov,
    aspect: 1920 / 1080,
    near: threeCam.near,
    far: threeCam.far,
    ...(typeof userData.focus === 'number' ? { focus: userData.focus * exportScale } : {}),
    ...(typeof userData.fstop === 'number' ? { fstop: userData.fstop } : {}),
    sensorMm,
    exportScale,
    background: stage.lens.background,
  };

  return { glb, camera };
}
