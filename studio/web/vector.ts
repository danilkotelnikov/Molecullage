import type { Job } from '../core/job.ts';
import { resolve, type Lens } from '../core/lens.ts';
import type { VectorObject } from '../core/vector.ts';
import { createGsapPlayer } from './gsap-player.ts';
import type { Stage } from './renderer.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function createVectorLayer(
  svg: SVGSVGElement,
  stage: Stage,
  job: Job,
  lens: Lens,
): { draw(t: number): void } {
  svg.replaceChildren();
  svg.setAttribute('viewBox', '0 0 1920 1080');
  svg.setAttribute('width', '1920');
  svg.setAttribute('height', '1080');

  const vectors = job.vectors ?? [];
  const byId = new Map<string, VectorObject>(vectors.map((v) => [v.id, v]));
  const childIds = new Set<string>();
  for (const v of vectors) {
    if (v.type === 'group' && v.children) {
      for (const cid of v.children) childIds.add(cid);
    }
  }

  const els = new Map<string, SVGElement>();

  function buildElement(v: VectorObject): SVGElement {
    const existing = els.get(v.id);
    if (existing) return existing;

    const style = resolve(v, lens);
    const strokeW = lens.line ?? 2;
    let el: SVGElement;

    if (v.type === 'group') {
      const g = document.createElementNS(SVG_NS, 'g');
      for (const cid of v.children ?? []) {
        const childVec = byId.get(cid);
        if (childVec) g.appendChild(buildElement(childVec));
      }
      el = g;
    } else if (v.type === 'path') {
      const p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('d', v.d ?? '');
      p.setAttribute('fill', style.color);
      p.setAttribute('stroke', style.color);
      p.setAttribute('stroke-width', String(strokeW));
      el = p;
    } else if (v.type === 'shape') {
      if (v.shape === 'ellipse') {
        const e = document.createElementNS(SVG_NS, 'ellipse');
        const [x, y, w, h] = v.box;
        e.setAttribute('cx', String(v.frame ? 0 : x + w / 2));
        e.setAttribute('cy', String(v.frame ? 0 : y + h / 2));
        e.setAttribute('rx', String(w / 2));
        e.setAttribute('ry', String(h / 2));
        e.setAttribute('fill', style.color);
        el = e;
      } else {
        const r = document.createElementNS(SVG_NS, 'rect');
        const [x, y, w, h] = v.box;
        r.setAttribute('x', String(v.frame ? -w / 2 : x));
        r.setAttribute('y', String(v.frame ? -h / 2 : y));
        r.setAttribute('width', String(w));
        r.setAttribute('height', String(h));
        r.setAttribute('rx', String(lens.radius ?? 0));
        r.setAttribute('fill', style.color);
        el = r;
      }
    } else if (v.type === 'arrow') {
      let defs = svg.querySelector('defs');
      if (!defs) {
        defs = document.createElementNS(SVG_NS, 'defs');
        svg.prepend(defs);
      }
      const markerId = `arrow-head-${v.id}`;
      if (!defs.querySelector(`#${CSS.escape(markerId)}`)) {
        const marker = document.createElementNS(SVG_NS, 'marker');
        marker.setAttribute('id', markerId);
        marker.setAttribute('viewBox', '0 0 12 8');
        marker.setAttribute('refX', '12');
        marker.setAttribute('refY', '4');
        marker.setAttribute('markerUnits', 'userSpaceOnUse');
        marker.setAttribute('markerWidth', '12');
        marker.setAttribute('markerHeight', '8');
        marker.setAttribute('orient', 'auto');
        const poly = document.createElementNS(SVG_NS, 'polygon');
        poly.setAttribute('points', '0,0 12,4 0,8');
        poly.setAttribute('fill', style.color);
        marker.appendChild(poly);
        defs.appendChild(marker);
      }
      const p = document.createElementNS(SVG_NS, 'path');
      const [x1, y1] = v.from ?? [v.box[0], v.box[1]];
      const [x2, y2] = v.to ?? [v.box[0] + v.box[2], v.box[1] + v.box[3]];
      p.setAttribute('d', `M${x1} ${y1} L${x2} ${y2}`);
      p.setAttribute('stroke', style.color);
      p.setAttribute('stroke-width', String(Math.max(strokeW, 4)));
      p.setAttribute('fill', 'none');
      p.setAttribute('marker-end', `url(#${markerId})`);
      el = p;
    } else if (v.type === 'label') {
      const txt = document.createElementNS(SVG_NS, 'text');
      const [x, y, w, h] = v.box;
      const fontSize = Math.max(lens.text.minPx, Math.min(Math.floor(h * 0.72), 44));
      txt.setAttribute('x', String(v.frame ? -w / 2 : x));
      txt.setAttribute('y', String((v.frame ? -h / 2 : y) + fontSize));
      txt.setAttribute('fill', lens.text.color);
      txt.setAttribute('font-family', `${lens.text.family}, Arial, sans-serif`);
      txt.setAttribute('font-size', `${fontSize}px`);
      txt.dataset.boxW = String(w);
      txt.dataset.boxH = String(h);
      txt.textContent = v.text?.[stage.lang] ?? v.text?.en ?? '';
      el = txt;
    } else {
      const img = document.createElementNS(SVG_NS, 'image');
      const [x, y, w, h] = v.box;
      img.setAttribute('x', String(v.frame ? -w / 2 : x));
      img.setAttribute('y', String(v.frame ? -h / 2 : y));
      img.setAttribute('width', String(w));
      img.setAttribute('height', String(h));
      const href = v.href ?? '';
      img.setAttribute('href', href.startsWith('http') || href.startsWith('/') || href.startsWith('jobs/') ? href : `jobs/${stage.jobId}/${href}`);
      el = img;
    }

    el.dataset.id = v.id;
    el.dataset.vectorType = v.type;
    els.set(v.id, el);
    return el;
  }

  for (const v of vectors) {
    if (!childIds.has(v.id)) {
      svg.appendChild(buildElement(v));
    }
  }

  const player = createGsapPlayer(svg, job.timeline.tracks);

  return {
    draw(t: number) {
      for (const v of vectors) {
        const el = els.get(v.id);
        if (!el) continue;

        if (v.type === 'label') {
          el.textContent = v.text?.[stage.lang] ?? v.text?.en ?? '';
        }

        const inWin = t >= v.window[0] && t <= v.window[1];
        if (!inWin) {
          el.style.display = 'none';
          continue;
        }

        if (v.frame !== null) {
          const p0 = stage.project({ frame: v.frame, pos: [0, 0, 0] });
          if (!p0) {
            el.style.display = 'none';
            continue;
          }
          const p1 = stage.project({ frame: v.frame, pos: [1, 0, 0] });
          const unitPx = p1 ? Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) : 1;
          const [bx, by, bw, bh] = v.box;
          const cx = p0[0] + (bx + bw / 2);
          const cy = p0[1] + (by + bh / 2);
          el.style.display = '';
          el.dataset.baseX = String(cx);
          el.dataset.baseY = String(cy);
          el.dataset.baseScale = '1';
          el.dataset.hasBaseTransform = '1';
          el.dataset.unitPx = String(unitPx);
          el.style.transform = `matrix(1, 0, 0, 1, ${cx}, ${cy})`;
          el.setAttribute('transform', `matrix(1 0 0 1 ${cx} ${cy})`);
        } else {
          el.style.display = '';
          el.dataset.baseX = '0';
          el.dataset.baseY = '0';
          el.dataset.baseScale = '1';
          el.dataset.hasBaseTransform = '0';
        }
      }
      player.set(t);
    },
  };
}
