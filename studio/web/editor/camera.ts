import type { CameraKey } from '../../core/camera.ts';
import type { Edit } from '../../core/edits.ts';
import type { Job } from '../../core/job.ts';
import type { Stage } from '../renderer.ts';
import { makeEditId } from './inspector.ts';

export function mountCameraTool(
  stage: Stage,
  job: Job,
  pathId: string,
  onEdit: (e: Edit) => Promise<void>,
  now: () => number,
): void {
  let free = false;
  let seq = 0;

  window.addEventListener('keydown', (ev) => {
    if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement || ev.target instanceof HTMLSelectElement) {
      return;
    }
    if (ev.key === 'c' || ev.key === 'C') {
      free = !free;
      stage.freeCamera(free);
    }
  });

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.dataset.saveShot = '';
  btn.textContent = 'Save shot';
  Object.assign(btn.style, {
    position: 'fixed',
    right: '16px',
    bottom: '16px',
    zIndex: '1000',
    padding: '6px 12px',
  });

  btn.addEventListener('click', () => {
    const curJob = stage.job ?? job;
    const pIdx = curJob.paths.findIndex((p) => p.id === pathId);
    if (pIdx < 0) return;
    const camPath = curJob.paths[pIdx];
    const t = Math.round(now() * 30) / 30;
    const place = stage.cameraPlace();
    const keyVal: CameraKey = {
      t,
      at: place.at,
      target: place.target,
      fov: place.fov,
    };
    if (free) {
      free = false;
      stage.freeCamera(false);
    }

    const existingIdx = camPath.keys.findIndex((k) => Math.abs(k.t - t) < 1e-6);
    if (existingIdx >= 0) {
      const edit: Edit = {
        id: makeEditId(stage.jobId, ++seq),
        at: new Date().toISOString(),
        by: 'the owner',
        op: 'set',
        path: `/paths/${pIdx}/keys/${existingIdx}`,
        value: keyVal,
      };
      void onEdit(edit);
    } else {
      let insertIdx = camPath.keys.findIndex((k) => k.t > t);
      if (insertIdx < 0) insertIdx = camPath.keys.length;
      const edit: Edit = {
        id: makeEditId(stage.jobId, ++seq),
        at: new Date().toISOString(),
        by: 'the owner',
        op: 'add',
        path: `/paths/${pIdx}/keys/${insertIdx}`,
        value: keyVal,
      };
      void onEdit(edit);
    }
  });

  document.body.appendChild(btn);
}
