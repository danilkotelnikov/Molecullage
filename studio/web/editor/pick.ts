import type { Stage } from '../renderer.ts';

export function pickAt(
  stage: Stage,
  x: number,
  y: number,
): { kind: 'world' | 'vector' | 'block'; id: string } | null {
  if (typeof document !== 'undefined' && typeof document.elementsFromPoint === 'function') {
    const fit = document.getElementById('fit');
    let cx = x;
    let cy = y;
    if (fit) {
      const rect = fit.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        cx = rect.left + (x / 1920) * rect.width;
        cy = rect.top + (y / 1080) * rect.height;
      }
    }
    const els = document.elementsFromPoint(cx, cy);
    for (const el of els) {
      const htmlEl = el as HTMLElement;
      if (htmlEl.dataset?.block) {
        return { kind: 'block', id: htmlEl.dataset.block };
      }
    }
    for (const el of els) {
      const svgEl = el.closest?.('[data-id]') as HTMLElement | null;
      if (svgEl?.dataset?.id) {
        return { kind: 'vector', id: svgEl.dataset.id };
      }
    }
  }
  const worldHit = stage.pick(x, y);
  if (worldHit) {
    return { kind: 'world', id: worldHit };
  }
  return null;
}
