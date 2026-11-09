import { applyEdits, type Edit } from '../../core/edits.ts';
import type { Job } from '../../core/job.ts';
import { SHIPPED_LENSES } from '../../core/lenses.ts';
import type { Stage } from '../renderer.ts';
import { mountCameraTool } from './camera.ts';
import { renderInspector } from './inspector.ts';
import { pickAt } from './pick.ts';
import { mountTimeline } from './timeline.ts';

export function mountEditor(
  stage: Stage,
  job: Job,
  root: HTMLElement,
  save: (e: Edit) => Promise<void>,
  undoRequest?: () => Promise<void>,
): { selected(): string | null; close(): void } {
  const baseJob = structuredClone(job);
  let currentJob = structuredClone(job);
  const edits: Edit[] = [];
  let picked: { kind: 'world' | 'vector' | 'block'; id: string } | null = null;
  let currentT = 0;

  const panel = document.createElement('div');
  panel.dataset.editorInspector = '';
  Object.assign(panel.style, {
    position: 'fixed',
    right: '16px',
    top: '16px',
    width: '320px',
    background: 'rgba(18, 24, 34, 0.94)',
    color: '#fff',
    padding: '12px',
    borderRadius: '8px',
    zIndex: '1000',
    fontFamily: 'Arial, sans-serif',
    fontSize: '13px',
  });
  root.appendChild(panel);

  const origSeek = stage.seek.bind(stage);
  const tl = mountTimeline(
    currentJob,
    root,
    async (edit) => {
      await submitEdit(edit);
    },
    (t) => {
      currentT = t;
      tl.setTime(t);
      void stage.seek(t);
    },
  );

  stage.seek = async (t: number) => {
    currentT = t;
    tl.setTime(t);
    await origSeek(t);
  };

  async function submitEdit(edit: Edit): Promise<void> {
    const candidate = [...edits, edit];
    const nextJob = applyEdits(baseJob, candidate, SHIPPED_LENSES);
    await save(edit);
    edits.push(edit);
    currentJob = nextJob;
    Object.assign(stage.job, nextJob);
    await stage.seek(currentT);
    renderInspector(panel, stage, () => currentJob, () => edits.length, picked, () => currentT, submitEdit);
  }

  mountCameraTool(
    stage,
    currentJob,
    stage.pathId,
    async (edit) => {
      await submitEdit(edit);
    },
    () => currentT,
  );

  const fit = document.getElementById('fit');
  const onStageClick = (ev: MouseEvent) => {
    if (!fit) return;
    if (panel.contains(ev.target as Node)) return;
    const rect = fit.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * 1920;
    const y = ((ev.clientY - rect.top) / rect.height) * 1080;
    picked = pickAt(stage, x, y);
    renderInspector(panel, stage, () => currentJob, () => edits.length, picked, () => currentT, submitEdit);
  };
  fit?.addEventListener('click', onStageClick);

  const onKeyDown = (ev: KeyboardEvent) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') {
      ev.preventDefault();
      if (edits.length > 0) {
        edits.pop();
        currentJob = applyEdits(baseJob, edits, SHIPPED_LENSES);
        Object.assign(stage.job, currentJob);
        if (undoRequest) {
          void undoRequest().then(() => stage.seek(currentT));
        } else {
          void stage.seek(currentT);
        }
        renderInspector(panel, stage, () => currentJob, () => edits.length, picked, () => currentT, submitEdit);
      }
    }
  };
  window.addEventListener('keydown', onKeyDown);

  return {
    selected() {
      return picked?.id ?? null;
    },
    close() {
      fit?.removeEventListener('click', onStageClick);
      window.removeEventListener('keydown', onKeyDown);
      panel.remove();
    },
  };
}
