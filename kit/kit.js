/* Molecullage kit. Coordinates are millimetres, origin bottom-left, like a plotting canvas.
   Cards are HTML (real text layout, Tabler icon SVGs); connectors are one SVG overlay.
   Usage: const f = new Fig(document.getElementById('fig'), 100, 92, { svgTop: true });
          f.module({x,y,w,h,title,sub:[...],icon:'database',fam:'indigo',dashed:false});
          f.route([[x,y],...],{dashed}); f.plus(x,y); f.dot(x,y); f.bracket(x,y0,y1,'x N'); f.label(x,y,'text');
          f.boundary('one-line claim boundary');   // no argument: the claimBoundary of molecullage.json
   Family names (fam:) come from the token file; see docs/palette.md. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  // ---- Arial-only maths (Nature asks for Arial or Helvetica): a small LaTeX subset to HTML with italic variables and real scripts.
  // Supported: letters, digits, _x _{xy} ^2 ^{-2}, \theta \phi \sigma \mu \tau \lambda \alpha \beta, \to \sim \cdot \times, \mathrm{..}, \, and + = - .
  const GREEK = { theta: 'θ', phi: 'φ', sigma: 'σ', mu: 'μ', tau: 'τ', lambda: 'λ', alpha: 'α', beta: 'β' };
  const OPS = { to: '→', sim: '~', cdot: '·', times: '×' };
  const grp = (s, i) => {
    if (s[i] === '{') { let d = 1, j = i + 1; for (; j < s.length && d; j++) { if (s[j] === '{') d++; else if (s[j] === '}') d--; } return [s.slice(i + 1, j - 1), j]; }
    if (s[i] === '\\') { const m = /^\\([a-zA-Z]+)/.exec(s.slice(i)); if (m) return [m[0], i + m[0].length]; }
    return [s[i], i + 1];
  };
  function M(s) {
    let out = '', i = 0;
    while (i < s.length) {
      const c = s[i];
      if (c === '_' || c === '^') { const [g, n] = grp(s, i + 1); const tag = c === '_' ? 'sub' : 'sup'; out += `<${tag}>${M(g)}</${tag}>`; i = n; }
      else if (c === '\\') {
        const m = /^\\([a-zA-Z]+|.)/.exec(s.slice(i)); i += m[0].length; const nm = m[1];
        if (nm === 'mathrm') { const [g, n] = grp(s, i); out += `<span class="up">${g}</span>`; i = n; }
        else if (nm === ',' || nm === ' ') out += ' ';
        else if (GREEK[nm]) out += `<i>${GREEK[nm]}</i>`;
        else if (OPS[nm]) out += ` ${OPS[nm]} `;
        else out += nm;
      }
      else if (/[a-zA-Z]/.test(c)) { out += `<i>${c}</i>`; i++; }
      else if (c === '-') { out += out && !/[( ]$/.test(out) ? ' − ' : '−'; i++; }
      else if (c === '=' || c === '+') { out += ` ${c} `; i++; }
      else if (c === '{' || c === '}') i++;
      else { out += c; i++; }
    }
    return out;
  }
  const MS = (s, pt) => `<span class="mth"${pt ? ` style="font-size:${pt}pt"` : ''}>${M(s)}</span>`;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  window.M = M; window.MS = MS;
  class Fig {
    // opts.svgTop: draw routes, leaders and ghosts above cards and pictures (pages written to the grammar use it); default draws them under the cards.
    constructor(el, w, h, opts = {}) {
      this.el = el; this.w = w; this.h = h;
      el.style.position = 'relative'; el.style.width = w + 'mm'; el.style.height = h + 'mm';
      this.svg = document.createElementNS(NS, 'svg');
      this.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      this.svg.setAttribute('width', w + 'mm'); this.svg.setAttribute('height', h + 'mm');
      this.svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;pointer-events:none' + (opts.svgTop ? ';z-index:5' : '');
      this.svg.innerHTML = '<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="1.15" markerHeight="1.15" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--line)"/></marker></defs>';
      el.appendChild(this.svg);
      this.n = 0;
    }
    Y(y) { return this.h - y; }
    mk(color) {
      const id = 'c' + color.replace(/[^0-9a-z]/gi, '');
      if (!this.svg.querySelector('#ah-' + id)) {
        const m = document.createElementNS(NS, 'marker');
        m.setAttribute('id', 'ah-' + id); m.setAttribute('viewBox', '0 0 10 10'); m.setAttribute('refX', '9'); m.setAttribute('refY', '5');
        m.setAttribute('markerWidth', '1.15'); m.setAttribute('markerHeight', '1.15'); m.setAttribute('markerUnits', 'userSpaceOnUse'); m.setAttribute('orient', 'auto');
        m.innerHTML = `<path d="M0 0L10 5L0 10z" fill="${color}"/>`;
        this.svg.querySelector('defs').appendChild(m);
      }
      return id;
    }
    // The claim-boundary line: one short line at the bottom edge, in the floor size. Text defaults to molecullage.json "claimBoundary".
    boundary(text, { x = 1.5, color = 'var(--sub)' } = {}) {
      const s = text || (window.CONFIG || {}).claimBoundary || '';
      if (s) this.label(x, 1.6, s, { fs: (window.CONFIG || {}).floorPt || 6.55, color });
    }
    letter(ch, x, y, marker = null) {
      const d = document.createElement('div');
      d.className = 'letter'; d.id = 'panel-' + ch;
      d.style.cssText = `left:${x}mm;top:${this.Y(y)}mm`;
      const ic = marker && window.ICONS ? `<span class="ic mk">${window.ICONS[marker === 'computer' ? 'device-desktop' : 'flask'] || ''}</span>` : '';
      d.innerHTML = `<b>${ch}</b>${ic}`;
      this.el.appendChild(d);
    }
    chip({ x, y, w, h, text, fam = 'indigo', fs = 6.2 }) {
      const d = document.createElement('div');
      d.className = `chipbox fam-${fam}`; d.id = this.id('chip');
      d.style.cssText = `left:${x}mm;top:${this.Y(y + h)}mm;width:${w}mm;height:${h}mm;font-size:${fs}pt`;
      d.textContent = text; this.el.appendChild(d);
    }
    pictogram(icon, x, y, size = 5) {
      const d = document.createElement('div');
      d.className = 'picto'; d.id = this.id('pictogram');
      d.style.cssText = `left:${x}mm;top:${this.Y(y + size)}mm;width:${size}mm;height:${size}mm;font-size:${size * 2.83}pt`;
      d.innerHTML = `<span class="ic">${(window.ICONS || {})[icon] || ''}</span>`; this.el.appendChild(d);
    }
    // Raster render (ChimeraX), trimmed by struct/trim.py; `name` is "<group>__<layer>", size and anchors from window.ART.
    // x, y: bottom-left corner in mm; w: width in mm (height follows the aspect ratio). Returns the bounds like module().
    image({ x, y, w, name, flipX = false }) {
      const a = (window.ART || {})[name];
      if (!a) throw new Error('image not in struct index: ' + name);
      const h = w / a.ar;
      const im = document.createElement('img');
      im.className = 'art'; im.id = this.id('structure'); im.src = `${window.ART_DIR || 'art'}/${name}_t.png`;
      im.style.cssText = `position:absolute;left:${x}mm;top:${this.Y(y + h)}mm;width:${w}mm;height:${h}mm${flipX ? ';transform:scaleX(-1)' : ''}`;
      this.el.appendChild(im);
      const A = a.anchors || {};
      // pt(name): anchor of the render (CDR tip, epitope, ...) as [x, y] in mm; outline: silhouette polyline in mm (closed)
      const pt = (n) => (A[n] ? [x + A[n][0] * w, y + (1 - A[n][1]) * h] : null);
      const outline = a.outline ? a.outline.map(([fx, fy]) => [x + fx * w, y + (1 - fy) * h]) : null;
      return { x, y, w, h, cx: x + w / 2, cy: y + h / 2, l: x, r: x + w, b: y, t: y + h, pt, outline };
    }
    // Dashed silhouette of a missing partner (rule: absence is drawn as a dashed outline in place).
    ghost(poly, { color = 'var(--guide)', width = 0.3, dash = '1.1 0.8' } = {}) {
      this.route(poly.concat([poly[0]]), { head: false, color, width });
      const p = this.svg.lastElementChild; p.style.strokeDasharray = dash; p.style.strokeLinejoin = 'round';
    }
    // State card: a pale frame that holds a picture; the title sits top left (design rule: two kinds of rectangle, state and operation).
    state({ x, y, w, h, title = '', dashed = false }) {
      const d = document.createElement('div');
      d.className = 'state' + (dashed ? ' dashed' : ''); d.id = this.id('state');   // two kinds of rectangle: state (holds a picture) and operation (a module)
      d.style.cssText = `left:${x}mm;top:${this.Y(y + h)}mm;width:${w}mm;height:${h}mm`;
      if (title) d.innerHTML = `<span class="st">${title}</span>`;
      this.el.appendChild(d);
      return { x, y, w, h, cx: x + w / 2, cy: y + h / 2, l: x, r: x + w, b: y, t: y + h };
    }
    // Progress bar: value in [0, 1]; the fill carries the colour, the frame is a hairline.
    bar({ x, y, w, h = 1.8, value = 0, color = 'var(--data0)', edge = 'var(--rule)' }) {
      const d = document.createElement('div');
      d.className = 'bar'; d.id = this.id('bar');
      d.style.cssText = `left:${x}mm;top:${this.Y(y + h)}mm;width:${w}mm;height:${h}mm;border-color:${edge}`;
      d.innerHTML = `<i style="width:${Math.max(0, Math.min(1, value)) * 100}%;background:${color}"></i>`;
      this.el.appendChild(d);
      return { x, y, w, h, cx: x + w / 2, cy: y + h / 2, l: x, r: x + w, b: y, t: y + h };
    }
    box({ x, y, w, h, html, fs = 6.2, color = 'var(--sub)', ha = 'left', bold = false }) {
      const d = document.createElement('div');
      d.className = 'tbox'; d.id = this.id('text');
      d.style.cssText = `left:${x}mm;top:${this.Y(y + h)}mm;width:${w}mm;height:${h}mm;font-size:${fs}pt;color:${color};text-align:${ha};font-weight:${bold ? 700 : 400}`;
      d.innerHTML = html; this.el.appendChild(d);
    }
    band({ x, y, w, h, text, sub = '', fam = 'indigo', dashed = false }) {
      const d = document.createElement('div');
      d.className = `band fam-${fam}` + (dashed ? ' dashed' : ''); d.id = this.id('band');
      d.style.cssText = `left:${x}mm;top:${this.Y(y + h)}mm;width:${w}mm;height:${h}mm`;
      d.innerHTML = `<b>${text}</b>${sub ? `<span>${sub}</span>` : ''}`;
      this.el.appendChild(d);
    }
    group({ x, y, w, h, title = '', fam = 'grey', dashed = false }) {
      const d = document.createElement('div');
      d.className = 'group' + (dashed ? ' dashed' : ''); d.id = this.id('group');
      d.style.cssText = `left:${x}mm;top:${this.Y(y + h)}mm;width:${w}mm;height:${h}mm`;
      if (title) d.innerHTML = `<span class="gt">${title}</span>`;
      this.el.appendChild(d);
    }
    tensor({ x, y, w = 5, h = 3, stripes = ['var(--data0)'], label = '', side = 'right' }) {
      const d = document.createElement('div');
      d.className = 'tensor'; d.id = this.id('tensor');
      d.style.cssText = `left:${x}mm;top:${this.Y(y + h)}mm;width:${w}mm;height:${h}mm`;
      d.innerHTML = stripes.map(c => `<i style="background:${c}"></i>`).join('');
      this.el.appendChild(d);
      if (label) this.label(side === 'right' ? x + w + 1.2 : x - 1.2, y + h / 2, label, { ha: side === 'right' ? 'left' : 'right', fs: 5.8 });
    }
    id(kind) { this.n += 1; return `${kind}-${String(this.n).padStart(3, '0')}`; }
    module({ x, y, w, h, title = '', sub = [], icon = null, fam = 'grey', dashed = false, layout = 'row', gid = null }) {
      const d = document.createElement('div');
      d.className = `card fam-${fam}` + (dashed ? ' dashed' : '');
      d.id = gid || this.id('module');
      d.style.cssText = `left:${x}mm;top:${this.Y(y + h)}mm;width:${w}mm;height:${h}mm`;
      const ic = icon && window.ICONS && window.ICONS[icon] ? `<div class="chip"><span class="ic">${window.ICONS[icon]}</span></div>` : '';
      const tt = (Array.isArray(title) ? title : [title]).filter(Boolean).map(t => `<p class="t">${t}</p>`).join('');
      const ss = (Array.isArray(sub) ? sub : [sub]).filter(Boolean).map(t => `<p class="s">${t}</p>`).join('');
      if (layout === 'tile') {
        d.classList.add('tile');
        const pic = icon && window.ICONS && window.ICONS[icon] ? `<span class="ic big">${window.ICONS[icon]}</span>` : '';
        const t2 = (Array.isArray(title) ? title : [title]).filter(Boolean).map(t => `<p class="t">${t}</p>`).join('');
        const s2 = (Array.isArray(sub) ? sub : [sub]).filter(Boolean).map(t => `<p class="s">${t}</p>`).join('');
        d.innerHTML = `${pic}${t2}${s2}`; this.el.appendChild(d);
        return { x, y, w, h, cx: x + w / 2, cy: y + h / 2, l: x, r: x + w, b: y, t: y + h };
      }
      if (layout === 'plain') {
        d.classList.add('plain');
        const pic = icon && window.ICONS && window.ICONS[icon] ? `<span class="ic big">${window.ICONS[icon]}</span>` : '';
        const t2 = (Array.isArray(title) ? title : [title]).filter(Boolean).map(t => `<p class="t">${t}</p>`).join('');
        const s2 = (Array.isArray(sub) ? sub : [sub]).filter(Boolean).map(t => `<p class="s">${t}</p>`).join('');
        d.innerHTML = `${pic}<div class="tx">${t2}${s2}</div>`; this.el.appendChild(d);
        return { x, y, w, h, cx: x + w / 2, cy: y + h / 2, l: x, r: x + w, b: y, t: y + h };
      }
      d.innerHTML = layout === 'stack'
        ? `<div class="head">${ic}<div class="tx">${tt}</div></div><div class="tx">${ss}</div>`
        : `${ic}<div class="tx${ic ? '' : ' center'}">${tt}${ss}</div>`;
      if (layout === 'stack') d.classList.add('stack');
      this.el.appendChild(d);
      return { x, y, w, h, cx: x + w / 2, cy: y + h / 2, l: x, r: x + w, b: y, t: y + h };
    }
    route(pts, { dashed = false, head = true, color = null, width = null } = {}) {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${this.Y(y)}`).join(''));
      p.setAttribute('class', 'route' + (dashed ? ' dashed' : ''));
      p.setAttribute('id', this.id('route'));
      if (color) { p.style.stroke = color; if (head) { p.setAttribute('marker-end', `url(#ah-${this.mk(color)})`); } }
      else if (head) p.setAttribute('marker-end', 'url(#ah)');
      if (width) p.style.strokeWidth = width;
      this.svg.appendChild(p);
    }
    dot(x, y) {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', x); c.setAttribute('cy', this.Y(y)); c.setAttribute('r', 0.5);
      c.setAttribute('class', 'dot'); c.setAttribute('id', this.id('junction'));
      this.svg.appendChild(c);
    }
    plus(x, y, r = 1.7) {
      const g = document.createElementNS(NS, 'g'); g.setAttribute('id', this.id('plus'));
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', x); c.setAttribute('cy', this.Y(y)); c.setAttribute('r', r); c.setAttribute('class', 'node');
      const k = r * 0.62;
      const a = document.createElementNS(NS, 'path');
      a.setAttribute('d', `M${x - k} ${this.Y(y)}H${x + k}M${x} ${this.Y(y) - k}V${this.Y(y) + k}`); a.setAttribute('class', 'mark');
      g.append(c, a); this.svg.appendChild(g);
    }
    bracket(x, y0, y1, text) {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', `M${x + 1.6} ${this.Y(y0)}H${x}V${this.Y(y1)}H${x + 1.6}`); p.setAttribute('class', 'route nohead');
      p.setAttribute('id', this.id('bracket')); this.svg.appendChild(p);
      this.label(x - 2.6, (y0 + y1) / 2, text, { rot: true, fs: 6.2, color: 'var(--ink)', ha: 'center' });
    }
    label(x, y, text, { fs = 7, color = 'var(--sub)', ha = 'left', rot = false, bold = false, italic = false } = {}) {
      const d = document.createElement('div');
      d.className = 'lab'; d.id = this.id('label'); d.textContent = text;
      const tr = ha === 'center' ? 'translate(-50%,-50%)' : ha === 'right' ? 'translate(-100%,-50%)' : 'translate(0,-50%)';
      d.style.cssText = `left:${x}mm;top:${this.Y(y)}mm;font-size:${fs}pt;color:${color};font-weight:${bold ? 700 : 400};font-style:${italic ? 'italic' : 'normal'};transform:${tr}${rot ? ' rotate(-90deg)' : ''};`;
      this.el.appendChild(d);
    }
    // Text with $maths$ pieces, in Arial throughout. x, y in mm (y up); ha left, center or right. mfs: size of the maths pieces, pt (default 7.2).
    rich(x, y, s, { fs = 7, color = 'var(--sub)', ha = 'left', bold = false, rot = false, mfs = 8.4 } = {}) {
      const d = document.createElement('div');
      d.className = 'lab'; d.id = this.id('label');
      const tr = (ha === 'center' ? 'translate(-50%,-50%)' : ha === 'right' ? 'translate(-100%,-50%)' : 'translate(0,-50%)') + (rot ? ' rotate(-90deg)' : '');
      d.style.cssText = `left:${x}mm;top:${this.Y(y)}mm;font-size:${fs}pt;color:${color};font-weight:${bold ? 700 : 400};transform:${tr}`;
      d.innerHTML = s.split('$').map((p, i) => (i % 2 ? MS(p, mfs) : esc(p))).join('');
      this.el.appendChild(d);
      return d;
    }
    legend(x, y, items, dx = 28) {
      items.forEach(([fam, text, dashed], i) => {
        const s = document.createElement('div');
        s.className = `sw fam-${fam}` + (dashed ? ' dashed' : '');
        s.style.cssText = `left:${x + i * dx}mm;top:${this.Y(y) - 1.5}mm`;
        this.el.appendChild(s);
        this.label(x + i * dx + 5.2, y, text, { fs: 7, color: 'var(--ink)' });
      });
    }
  }
  window.Fig = Fig;
})();
