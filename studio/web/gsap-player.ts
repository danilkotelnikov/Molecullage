import gsap from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { sample, type Track } from '../core/timeline.ts';

gsap.registerPlugin(DrawSVGPlugin);

function pathLengthFallback(el: Element): number {
  const geom = el as SVGGeometryElement;
  if (typeof geom.getTotalLength === 'function') {
    try {
      const len = geom.getTotalLength();
      if (Number.isFinite(len) && len > 0) return len;
    } catch {
      // fallback below
    }
  }
  const d = el.getAttribute('d') ?? '';
  const m = d.match(/M\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+L\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/i);
  if (m) {
    return Math.hypot(Number(m[3]) - Number(m[1]), Number(m[4]) - Number(m[2]));
  }
  if (el.tagName.toLowerCase() === 'line') {
    const x1 = Number(el.getAttribute('x1') ?? 0);
    const y1 = Number(el.getAttribute('y1') ?? 0);
    const x2 = Number(el.getAttribute('x2') ?? 0);
    const y2 = Number(el.getAttribute('y2') ?? 0);
    return Math.hypot(x2 - x1, y2 - y1);
  }
  return 100;
}

export function createGsapPlayer(
  root: SVGSVGElement,
  tracks: Track[],
): { set(t: number): void; kill(): void } {
  const tl = gsap.timeline({ paused: true });
  const byTarget = new Map<string, Track[]>();

  for (const tr of tracks) {
    if (!['opacity', 'x', 'y', 'scale', 'draw'].includes(tr.prop)) continue;
    const list = byTarget.get(tr.target) ?? [];
    list.push(tr);
    byTarget.set(tr.target, list);

    const el = root.querySelector<SVGElement>(`[data-id="${tr.target}"]`);
    if (el && tr.keys.length > 0) {
      const k0 = tr.keys[0];
      if (tr.prop === 'opacity') {
        tl.set(el, { opacity: Number(k0.v) }, 0);
        for (let i = 1; i < tr.keys.length; i++) {
          const prev = tr.keys[i - 1];
          const cur = tr.keys[i];
          tl.to(
            el,
            { opacity: Number(cur.v), duration: cur.t - prev.t, ease: cur.ease ?? 'linear' },
            prev.t,
          );
        }
      }
    }
  }

  return {
    set(t: number) {
      tl.time(t, true);
      for (const [targetId, targetTracks] of byTarget.entries()) {
        const el = root.querySelector<SVGElement>(`[data-id="${targetId}"]`);
        if (!el) continue;

        let tx = Number(el.dataset.baseX ?? 0);
        let ty = Number(el.dataset.baseY ?? 0);
        let sc = Number(el.dataset.baseScale ?? 1);
        let hasTransform = el.dataset.hasBaseTransform === '1';

        for (const tr of targetTracks) {
          const val = Number(sample(tr, t));
          if (tr.prop === 'opacity') {
            el.style.opacity = String(val);
          } else if (tr.prop === 'x') {
            tx += val;
            hasTransform = true;
          } else if (tr.prop === 'y') {
            ty += val;
            hasTransform = true;
          } else if (tr.prop === 'scale') {
            sc *= val;
            hasTransform = true;
          } else if (tr.prop === 'draw') {
            const total = pathLengthFallback(el);
            const frac = Math.max(0, Math.min(1, val));
            const drawn = frac * total;
            el.style.strokeDasharray = `${drawn}px ${total}px`;
            el.style.strokeDashoffset = '0px';
          }
        }

        if (hasTransform) {
          el.style.transform = `matrix(${sc}, 0, 0, ${sc}, ${tx}, ${ty})`;
          el.setAttribute('transform', `matrix(${sc} 0 0 ${sc} ${tx} ${ty})`);
        }
      }
    },
    kill() {
      tl.kill();
      byTarget.clear();
    },
  };
}
