/* structfig kit, block grammar of a stage-coded pipeline figure: tool blocks, data pills, stage strips, step badges.
   Loaded after kit.js by build.mjs. Coordinates in millimetres, origin bottom-left (y up), as in kit.js. Text colour on dark families comes from the tokens CSS.
     f.tool({x,y,w,h,title,sub,fam,dashed,repeat})  saturated block with a bold name and one plain line; repeat: n draws n-1 offset copies behind it and a x n badge
     f.pill({x,y,w,h,text,sub,fam,dashed})            rounded data object (pale family): what flows between the blocks
     f.stage({x,y,w,h,text,fam})                      strip, text rotated by default, one per stage (left edge of a block column; reset the rotation to lay it flat on top of a column)
     f.badge({x,y,n,fam})                             numbered circle for a reading order
     f.note({x,y,w,text,fs,color,ha})                 wrapped plain-language text block (top-left anchored at x, y = top edge)
   Each returns bounds {x,y,w,h,cx,cy,l,r,b,t} plus pt(side) = anchor on the side: 'l','r','t','b' in mm. */
(function () {
  const F = window.Fig.prototype;
  const bounds = (x, y, w, h) => ({
    x, y, w, h, cx: x + w / 2, cy: y + h / 2, l: x, r: x + w, b: y, t: y + h,
    pt(s) { return s === 'l' ? [x, y + h / 2] : s === 'r' ? [x + w, y + h / 2] : s === 't' ? [x + w / 2, y + h] : [x + w / 2, y]; },
  });
  F.tool = function ({ x, y, w, h, title, sub = '', fam = 'indigo', dashed = false, repeat = 0, fs = 7.5 }) {
    if (repeat) {   // repeat: a number n, or a text such as 'N' for a toy size; up to two copies behind the block
      for (let k = Math.min(typeof repeat === 'number' ? repeat - 1 : 2, 2); k >= 1; k--) {   // up to two copies behind: a stack means "repeated"
        const d = document.createElement('div');
        d.className = `card tool fam-${fam}`; d.id = this.id('module');
        d.style.cssText = `left:${x + k * 1.0}mm;top:${this.Y(y + h - k * 1.0)}mm;width:${w}mm;height:${h}mm`;
        this.el.appendChild(d);
      }
    }
    const d = document.createElement('div');
    d.className = `card tool fam-${fam}` + (dashed ? ' dashed' : ''); d.id = this.id('module');
    d.style.cssText = `left:${x}mm;top:${this.Y(y + h)}mm;width:${w}mm;height:${h}mm;justify-content:center;text-align:center`;
    d.innerHTML = `<div class="tx center"><p class="t" style="font-size:${fs}pt">${title}${repeat ? ` <span class="rep">×${repeat}</span>` : ''}</p>${sub ? `<p class="s">${sub}</p>` : ''}</div>`;
    this.el.appendChild(d);
    return bounds(x, y, w, h);
  };
  F.pill = function ({ x, y, w, h = 4.6, text, sub = '', fam = 'palemint', dashed = false, fs = 7 }) {
    const d = document.createElement('div');
    d.className = `pill fam-${fam}` + (dashed ? ' dashed' : ''); d.id = this.id('pill');
    d.style.cssText = `left:${x}mm;top:${this.Y(y + h)}mm;width:${w}mm;height:${h}mm;font-size:${fs}pt;border-radius:${Math.min(h / 2, 3)}mm`;
    d.innerHTML = `<span>${text}</span>${sub ? `<em>${sub}</em>` : ''}`;
    this.el.appendChild(d);
    return bounds(x, y, w, h);
  };
  F.stage = function ({ x, y, w = 4.4, h, text, fam = 'indigo', fs = 7.5 }) {
    const d = document.createElement('div');
    d.className = `stage fam-${fam}`; d.id = this.id('stage');
    d.style.cssText = `left:${x}mm;top:${this.Y(y + h)}mm;width:${w}mm;height:${h}mm;font-size:${fs}pt`;
    d.innerHTML = `<span>${text}</span>`;
    this.el.appendChild(d);
    return bounds(x, y, w, h);
  };
  F.badge = function ({ x, y, n, fam = 'indigo', r = 1.9 }) {
    const d = document.createElement('div');
    d.className = `badge fam-${fam}`; d.id = this.id('badge');
    d.style.cssText = `left:${x - r}mm;top:${this.Y(y + r)}mm;width:${2 * r}mm;height:${2 * r}mm;font-size:7pt`;
    d.textContent = n; this.el.appendChild(d);
    return bounds(x - r, y - r, 2 * r, 2 * r);
  };
  F.note = function ({ x, y, w, text, fs = 7, color = 'var(--ink)', ha = 'left', bold = false }) {
    const d = document.createElement('div');
    d.className = 'tbox'; d.id = this.id('text');
    d.style.cssText = `left:${x}mm;top:${this.Y(y)}mm;width:${w}mm;font-size:${fs}pt;color:${color};text-align:${ha};font-weight:${bold ? 700 : 400};line-height:1.22`;
    d.innerHTML = text.split('$').map((p, i) => (i % 2 ? window.MS(p, fs * 1.2) : p)).join('');
    this.el.appendChild(d);
    return d;
  };
})();
