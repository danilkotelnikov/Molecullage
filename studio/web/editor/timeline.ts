import type { Edit } from '../../core/edits.ts';
import type { Job } from '../../core/job.ts';
import { makeEditId } from './inspector.ts';

export function mountTimeline(
  job: Job,
  root: HTMLElement,
  onEdit: (e: Edit) => Promise<void>,
  seek: (t: number) => void,
): { setTime(t: number): void } {
  const container = document.createElement('div');
  container.dataset.timeline = '';
  Object.assign(container.style, {
    position: 'fixed',
    left: '0',
    right: '0',
    bottom: '0',
    maxHeight: '220px',
    overflowY: 'auto',
    background: '#11161d',
    color: '#e5ecf4',
    padding: '8px',
    fontFamily: 'Arial, sans-serif',
    fontSize: '12px',
    zIndex: '999',
  });

  const ruler = document.createElement('div');
  ruler.dataset.timelineRuler = '';
  Object.assign(ruler.style, {
    position: 'relative',
    height: '20px',
    width: `${Math.max(800, job.world.duration * 100)}px`,
    background: '#1c2430',
    cursor: 'pointer',
    marginBottom: '4px',
  });
  ruler.addEventListener('click', (ev) => {
    const rect = ruler.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    seek(Math.max(0, x / 100));
  });
  container.appendChild(ruler);

  const errorBanner = document.createElement('div');
  errorBanner.dataset.timelineError = '';
  errorBanner.style.color = '#ff6b6b';
  container.appendChild(errorBanner);

  const playhead = document.createElement('div');
  playhead.dataset.playhead = '';
  Object.assign(playhead.style, {
    position: 'absolute',
    top: '0',
    bottom: '0',
    width: '2px',
    background: '#4ea1ff',
    left: '8px',
    pointerEvents: 'none',
  });
  container.appendChild(playhead);

  let editSeq = 0;

  job.timeline.tracks.forEach((tr, ti) => {
    const row = document.createElement('div');
    row.dataset.trackRow = String(ti);
    Object.assign(row.style, {
      position: 'relative',
      height: '24px',
      borderBottom: '1px solid #253040',
    });

    const label = document.createElement('span');
    label.textContent = `${tr.target}.${tr.prop}`;
    row.appendChild(label);

    tr.keys.forEach((k, ki) => {
      const dot = document.createElement('div');
      dot.dataset.track = String(ti);
      dot.dataset.key = String(ki);
      const origLeft = k.t * 100;
      Object.assign(dot.style, {
        position: 'absolute',
        left: `${origLeft}px`,
        top: '7px',
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        background: '#f5b942',
        cursor: 'ew-resize',
      });

      let startX: number | null = null;
      dot.addEventListener('pointerdown', (ev) => {
        startX = ev.clientX;
        dot.setPointerCapture?.(ev.pointerId);
      });
      dot.addEventListener('pointerup', (ev) => {
        if (startX === null) return;
        const dx = ev.clientX - startX;
        startX = null;
        const newT = k.t + dx / 100;
        const edit: Edit = {
          id: makeEditId('timeline', ++editSeq),
          at: new Date().toISOString(),
          by: 'the owner',
          op: 'retime',
          path: `/timeline/tracks/${ti}/keys/${ki}`,
          value: newT,
        };
        void onEdit(edit)
          .then(() => {
            const snapped = Math.round(newT * 30) / 30;
            k.t = snapped;
            dot.style.left = `${snapped * 100}px`;
            errorBanner.textContent = '';
          })
          .catch((err: Error) => {
            dot.style.left = `${k.t * 100}px`;
            errorBanner.textContent = err.message;
          });
      });

      row.appendChild(dot);
    });

    container.appendChild(row);
  });

  root.appendChild(container);

  return {
    setTime(t: number) {
      playhead.style.left = `${8 + t * 100}px`;
    },
  };
}
