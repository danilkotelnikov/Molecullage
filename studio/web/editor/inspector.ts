import { stopIndexAt } from '../../core/camera.ts';
import type { Edit } from '../../core/edits.ts';
import type { Job } from '../../core/job.ts';
import { SHIPPED_LENSES } from '../../core/lenses.ts';
import type { Stage } from '../renderer.ts';

function seededHex(jobId: string, count: number): string {
  let h = 2166136261 ^ count;
  for (let i = 0; i < jobId.length; i++) {
    h ^= jobId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) & 0xffff).toString(16).padStart(4, '0');
}

export function makeEditId(jobId: string, count: number): string {
  return `e-${Date.now()}-${seededHex(jobId, count)}`;
}

export function renderInspector(
  panel: HTMLElement,
  stage: Stage,
  getJob: () => Job,
  getEditCount: () => number,
  picked: { kind: 'world' | 'vector' | 'block'; id: string } | null,
  currentT: () => number,
  submitEdit: (e: Edit) => Promise<void>,
): void {
  panel.replaceChildren();
  const errorEl = document.createElement('div');
  errorEl.dataset.editorError = '';
  errorEl.style.color = '#ff6b6b';
  panel.appendChild(errorEl);

  if (!picked) return;
  const job = getJob();

  const buildEdit = (path: string, value: unknown): Edit => ({
    id: makeEditId(stage.jobId, getEditCount()),
    at: new Date().toISOString(),
    by: 'the owner',
    op: 'set',
    path,
    value,
  });

  if (picked.kind === 'block') {
    const camPath = job.paths.find((p) => p.id === stage.pathId) ?? job.paths[0];
    const stop = stopIndexAt(camPath, currentT());
    const layIdx = job.layout.findIndex((l) => l.stop === stop && l.lang === stage.lang);
    if (layIdx < 0) return;
    const blkIdx = job.layout[layIdx].blocks.findIndex((b) => b.id === picked.id);
    if (blkIdx < 0) return;
    const blk = job.layout[layIdx].blocks[blkIdx];

    const row = document.createElement('div');
    row.dataset.inspectorKind = 'block';

    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.dataset.field = 'text';
    textInput.value = blk.text;
    textInput.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        void submitEdit(buildEdit(`/layout/${layIdx}/blocks/${blkIdx}/text`, textInput.value)).catch((err: Error) => {
          errorEl.textContent = err.message;
        });
      }
    });
    row.appendChild(textInput);

    const coords = ['x', 'y', 'w', 'h'] as const;
    const numInputs: HTMLInputElement[] = [];
    coords.forEach((name, idx) => {
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.dataset.field = name;
      inp.value = String(blk.box[idx]);
      inp.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          const box: [number, number, number, number] = [
            Number(numInputs[0].value),
            Number(numInputs[1].value),
            Number(numInputs[2].value),
            Number(numInputs[3].value),
          ];
          void submitEdit(buildEdit(`/layout/${layIdx}/blocks/${blkIdx}/box`, box)).catch((err: Error) => {
            errorEl.textContent = err.message;
          });
        }
      });
      numInputs.push(inp);
      row.appendChild(inp);
    });

    panel.appendChild(row);
    return;
  }

  if (picked.kind === 'vector') {
    const vecIdx = (job.vectors ?? []).findIndex((v) => v.id === picked.id);
    if (vecIdx < 0) return;
    const vec = job.vectors![vecIdx];
    const row = document.createElement('div');
    row.dataset.inspectorKind = 'vector';

    if (vec.type === 'label') {
      const textInput = document.createElement('input');
      textInput.type = 'text';
      textInput.dataset.field = 'text';
      textInput.value = vec.text?.[stage.lang] ?? vec.text?.en ?? '';
      textInput.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          void submitEdit(buildEdit(`/vectors/${vecIdx}/text/${stage.lang}`, textInput.value)).catch((err: Error) => {
            errorEl.textContent = err.message;
          });
        }
      });
      row.appendChild(textInput);
    }

    const coords = ['x', 'y', 'w', 'h'] as const;
    const numInputs: HTMLInputElement[] = [];
    coords.forEach((name, idx) => {
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.dataset.field = name;
      inp.value = String(vec.box[idx]);
      inp.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          const box: [number, number, number, number] = [
            Number(numInputs[0].value),
            Number(numInputs[1].value),
            Number(numInputs[2].value),
            Number(numInputs[3].value),
          ];
          void submitEdit(buildEdit(`/vectors/${vecIdx}/box`, box)).catch((err: Error) => {
            errorEl.textContent = err.message;
          });
        }
      });
      numInputs.push(inp);
      row.appendChild(inp);
    });

    panel.appendChild(row);
    return;
  }

  if (picked.kind === 'world') {
    const objIdx = job.world.objects.findIndex((o) => o.id === picked.id);
    if (objIdx < 0) return;
    const obj = job.world.objects[objIdx];
    const row = document.createElement('div');
    row.dataset.inspectorKind = 'world';

    const roleSelect = document.createElement('select');
    roleSelect.dataset.field = 'role';
    const roleKeys = Object.keys(SHIPPED_LENSES[job.lens]?.roles ?? SHIPPED_LENSES.journal.roles);
    for (const rk of roleKeys) {
      const opt = document.createElement('option');
      opt.value = rk;
      opt.textContent = rk;
      if (obj.roles[0] === rk) opt.selected = true;
      roleSelect.appendChild(opt);
    }
    roleSelect.addEventListener('change', () => {
      void submitEdit(buildEdit(`/world/objects/${objIdx}/roles/0`, roleSelect.value)).catch((err: Error) => {
        errorEl.textContent = err.message;
      });
    });
    row.appendChild(roleSelect);

    const sizeInput = document.createElement('input');
    sizeInput.type = 'number';
    sizeInput.dataset.field = 'size';
    sizeInput.value = String(obj.size);
    sizeInput.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        void submitEdit(buildEdit(`/world/objects/${objIdx}/size`, Number(sizeInput.value))).catch((err: Error) => {
          errorEl.textContent = err.message;
        });
      }
    });
    row.appendChild(sizeInput);

    panel.appendChild(row);
  }
}
