// Deck runtime. Inlined after timeline.mjs (clamp, lerp, ease, progress, createClock, stops, schedule, qmul, qaxis, pathAt are in scope).
// Rule: every visible thing is a pure function of the slide time t. renderSlide(sl, t) sets it; nothing here reads the wall clock
// except the player below, which only turns real time into clock.advance() calls and is never started by the exporter (window.__DECK_EXPORT).
(() => {
  const D = JSON.parse(document.getElementById('deck-data').textContent);
  const Q = new URLSearchParams(location.search);
  const EXPORT = !!window.__DECK_EXPORT;
  const LIVE = !!window.__DECK_LIVE;
  const MODE = Q.has('presenter') ? 'presenter' : Q.has('embed') ? 'embed' : Q.has('popout') ? 'popout' : 'main';
  const W = 1920, H = 1080;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  document.body.classList.add(MODE);
  if (EXPORT) document.body.classList.add('export');
  document.documentElement.lang = D.lang || 'ru';

  // ---- effects: keyframes of an entrance. Opacity and transform only.
  const EFF = {
    'fade-up': [{ opacity: 0, transform: 'translateY(36px)' }, { opacity: 1, transform: 'none' }],
    fade: [{ opacity: 0 }, { opacity: 1 }],
    zoom: [{ opacity: 0, transform: 'scale(.92)' }, { opacity: 1, transform: 'none' }],
    left: [{ opacity: 0, transform: 'translateX(-48px)' }, { opacity: 1, transform: 'none' }],
    none: [{ opacity: 1 }, { opacity: 1 }],
    draw: [{ strokeDasharray: '1', strokeDashoffset: 1 }, { strokeDasharray: '1', strokeDashoffset: 0 }],   // a path with pathLength="1" draws itself
  };
  const EASING = 'cubic-bezier(.2,.7,.2,1)';
  const pad = (n) => String(Math.floor(n)).padStart(2, '0');

  // ---- slides
  const stage = $('#stage');
  const slides = $$('.slide', stage).map((el, i) => {
    const data = D.slides[i];
    const sl = { el, data, i, tracks: [], counts: [], mols: [], vids: [], stops: null, t: 0 };
    $$('[data-step]', el).forEach((n) => {
      const k = +n.dataset.step;
      const at = k === 0 ? +n.dataset.at || 0 : data.steps[k - 1].at;
      const dur = k === 0 ? +n.dataset.dur || 500 : data.steps[k - 1].dur;
      const a = n.animate(EFF[n.dataset.effect] || EFF['fade-up'], { duration: Math.max(1, dur), delay: at, fill: 'both', easing: EASING });
      a.pause(); a.currentTime = 0;
      sl.tracks.push({ a, at, dur });
      if (n.dataset.out) {   // data-out="ms": leaves at that time of the slide, to opacity data-out-to (default 0); a ghost stays at .2
        const oat = +n.dataset.out, odur = +n.dataset.outDur || 500, to = n.dataset.outTo === undefined ? 0 : +n.dataset.outTo;
        const o = n.animate([{ opacity: 1 }, { opacity: to }], { duration: Math.max(1, odur), delay: oat, fill: 'forwards', easing: 'ease-in-out' });
        o.pause(); o.currentTime = 0;
        sl.tracks.push({ a: o, at: oat, dur: odur });
      }
    });
    $$('[data-count]', el).forEach((n) => {
      const st = n.closest('[data-step]');
      const k = st ? +st.dataset.step : 0;
      const at = k ? data.steps[k - 1].at : 300, dur = 1200;
      sl.counts.push({ n, to: +n.dataset.count, dec: +n.dataset.dec || 0, at, dur, text: n.textContent });
    });
    $$('.mol', el).forEach((n) => {
      const sc = D.scenes[n.dataset.scene];
      const m = { n, key: n.dataset.key, scene: sc, kind: n.dataset.kind, at: +n.dataset.at, dur: +n.dataset.dur, play: n.dataset.play, view: null, over: null, vid: $('video', n) };
      sl.mols.push(m);
      if (m.vid) { sl.vids.push(m); m.vid.muted = true; }
    });
    sl.stops = stops(data.steps, data.end0);
    return sl;
  });
  const N = slides.length;
  const sched = schedule(D.slides.map((s) => ({ duration: s.duration, transition: s.transition })));

  // ---- the molecule viewer (3Dmol.js, vendored)
  const FAM = D.palette;
  const famOf = (name, k) => FAM[name] || FAM[['rose', 'mint', 'peri', 'apricot'][k % 4]];
  const sel = (parts) => parts.map((p) => (p.ranges.length ? { chain: p.chain, resi: p.ranges.map(([a, b]) => (a === b ? String(a) : `${a}-${b}`)) } : { chain: p.chain }));
  function buildMol(m) {
    if (m.view || m.kind !== 'webgl' || !window.$3Dmol) return;
    const sc = m.scene, host = $('.mol-view', m.n);
    if (!host.clientWidth) return;
    const v = $3Dmol.createViewer(host, { backgroundColor: '#FFFFFF', antialias: true });
    v.addModel(sc.pdbText, sc.pdbFormat || 'pdb');
    const chains = [...new Set(v.selectedAtoms({}).map((a) => a.chain).filter((c) => c !== undefined && c !== null).map(String))];
    if (!chains.length) chains.push('');
    chains.forEach((c, k) => {
      const f = famOf(sc.chains[c], k);
      v.setStyle({ chain: c }, { cartoon: { color: f.fill, thickness: 0.35, arrows: true } });
    });
    v.setViewStyle({ style: 'outline', color: '#0A0A0A', width: 0.04 });
    v.zoomTo();
    const base = v.getView().slice(0, 4), q0 = v.getView().slice(4);
    let focus = null;
    const tgt = sc.target ? sel(sc.targetParts) : null;
    if (tgt) { v.zoomTo({ or: tgt }); focus = v.getView().slice(0, 4); focus[3] *= 1.25; v.setView([...base, ...q0]); }
    const d = sc.duration;
    const path = sc.motion === 'pocket' && focus
      ? [{ t: 0, view: base, yaw: 0 }, { t: d * 0.6, view: focus, yaw: 50 }, { t: d, view: focus, yaw: 110 }]
      : sc.motion === 'highlight'
        ? [{ t: 0, view: base, yaw: -35 }, { t: d, view: base, yaw: 35 }]
        : [{ t: 0, view: base, yaw: 0 }, { t: d, view: base, yaw: 360, ease: 'linear' }];
    const hl = (on) => {
      if (!tgt || v.__hl === on) return; v.__hl = on;
      tgt.forEach((s) => {
        const c = chains.indexOf(s.chain);
        const f = famOf(sc.chains[s.chain], c < 0 ? 0 : c);
        v.setStyle(s, on ? { cartoon: { color: f.fill, thickness: 0.35 }, stick: { color: FAM.apricot.fill, radius: 0.28 } } : { cartoon: { color: f.fill, thickness: 0.35, arrows: true } });
      });
    };
    m.view = {
      v, path, q0, hl,
      at(s) {
        const q = pathAt(path, clamp(s, 0, d));
        hl(sc.motion === 'highlight' ? true : (sc.motion === 'pocket' && s >= d * 0.45));
        const qq = qmul(qaxis([0, 1, 0], q.yaw), qmul(qaxis([1, 0, 0], q.pitch), q0));
        v.setView([...q.view, ...qq]);
        v.render();
      },
    };
    v.render();
  }
  const posterTime = (sc) => (sc.poster != null ? sc.poster : sc.motion === 'rotate' ? sc.duration / 8 : sc.duration);

  // ---- pending work the exporter waits for
  const pending = new Set();
  const track = (p) => { pending.add(p); p.finally(() => pending.delete(p)); return p; };
  const seekVid = (v, time) => {
    if (!v.duration || Math.abs(v.currentTime - time) < 0.0005) return;
    track(new Promise((res) => { const done = () => { v.removeEventListener('seeked', done); res(); }; v.addEventListener('seeked', done); v.currentTime = time; setTimeout(res, 4000); }));
  };
  const ready = async () => {
    await document.fonts.ready;
    await Promise.all($$('img').map((im) => (im.complete ? 0 : im.decode().catch(() => 0))));
    while (pending.size) await Promise.all([...pending]);
    await new Promise((r) => setTimeout(r, 0));
  };

  // ---- rendering a slide at time t
  const fmt = (v, dec) => v.toLocaleString('ru-RU', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    function renderSlide(sl, t, still = false) {
    let sig = '';
    if (still) t = sl.data.duration;
    sl.t = t;
    const p4 = (x) => Math.round(x * 2000);
    for (const tr of sl.tracks) { tr.a.currentTime = t; sig += p4(progress(t, tr.at, tr.dur)) + ','; }
    for (const c of sl.counts) { const p = progress(t, c.at, c.dur); c.n.textContent = p >= 1 ? c.text : fmt(c.to * ease('out', p), c.dec); sig += p4(p) + ','; }
    for (const m of sl.mols) {
      if (m.kind === 'webgl') {
        buildMol(m);
        if (!m.view) continue;
        const s = still ? posterTime(m.scene) : m.over !== null ? m.over : t - m.at;
        m.view.at(s); sig += Math.round(clamp(s, 0, m.dur)) + ',';
      } else if (m.vid && m.vid.duration) {
        const len = m.vid.duration;
        if (!EXPORT && !still) { if (MODE === 'main' && m.vid.paused) m.vid.play().catch(() => {}); continue; }   // a live deck lets the loop run by itself
        const x = still ? (m.scene.poster || 0) / 1000 : Math.max(0, t - m.at) / 1000;
        const vt = m.scene.loop === false ? Math.min(x, len - 0.001) : x % len;
        seekVid(m.vid, vt); sig += Math.round(vt * 1000) + ',';
      }
    }
    if (LIVE && !EXPORT) $$('iframe.live[data-src]', sl.el).forEach((f) => { if (!f.src) f.src = f.dataset.src; });
    return sig;
  }
  const show = (...is) => slides.forEach((sl) => sl.el.classList.toggle('on', is.includes(sl.i)));
  const reset = (sl) => { sl.el.style.cssText = ''; };
  function transition(a, b, tr, p) {
    const A = slides[a].el, B = slides[b].el, e = ease('smooth', p);
    A.style.zIndex = 1; B.style.zIndex = 2;
    if (tr.kind === 'slide') { A.style.transform = `translateX(${-e * W}px)`; B.style.transform = `translateX(${(1 - e) * W}px)`; }
    else if (tr.kind === 'rise') { B.style.opacity = e; B.style.transform = `translateY(${(1 - e) * 60}px)`; }
    else B.style.opacity = e;
  }
  /** Apply a state: {kind:'slide', i, t, still?} or {kind:'tr', i, j, p, tr, ti?}. Returns a signature of what is drawn. */
  function apply(st) {
    if (st.kind === 'tr') {
      slides.forEach(reset);
      show(st.i, st.j);
      const s1 = renderSlide(slides[st.i], st.ti ?? slides[st.i].data.duration), s2 = renderSlide(slides[st.j], 0);
      transition(st.i, st.j, st.tr, st.p);
      return `tr|${st.i}|${st.j}|${Math.round(st.p * 2000)}|${s1}|${s2}`;
    }
    slides.forEach(reset);
    show(st.i);
    return `s|${st.i}|` + renderSlide(slides[st.i], st.t, st.still);
  }

  // ---- fit the stage to the window
  function fit() {
    if (EXPORT || document.body.classList.contains('print')) { stage.style.transform = ''; return; }
    const s = Math.min(innerWidth / W, innerHeight / H);
    stage.style.transform = `translate(${(innerWidth - W * s) / 2}px,${(innerHeight - H * s) / 2}px) scale(${s})`;
  }
  addEventListener('resize', () => { fit(); if (MODE === 'main' || MODE === 'embed') redraw(); });

  // ---- the player: real time turned into clock.advance()
  const clock = createClock();
  let cur = { i: 0, k: 0, t: 0 }, playing = null, raf = 0, last = 0;
  const post = (msg) => { for (const w of listeners) { try { w.postMessage(msg, '*'); } catch { /* window closed */ } } };
  const listeners = new Set();
  const publish = (extra = {}) => post({ deck: 1, type: 'state', cur, playing: !!playing, ...extra });
  const hashSet = () => { try { history.replaceState(null, '', `#${cur.i + 1}`); } catch { /* file URL in a sandbox */ } };
  function redraw() { apply({ kind: 'slide', i: cur.i, t: cur.t }); }
  function pump(ts) {
    raf = 0;
    if (!playing) return;
    const dt = last ? Math.min(100, ts - last) : 0; last = ts;
    const going = clock.tick(dt);
    playing.draw(clock.t);
    if (going) raf = requestAnimationFrame(pump); else { const done = playing.done; playing = null; last = 0; done && done(); publish(); }
  }
  function run(from, to, draw, done) {
    clock.play(from, to); playing = { draw, done, to, from }; last = 0;
    draw(from);
    if (!raf) raf = requestAnimationFrame(pump);
  }
  const finish = () => { if (!playing) return false; const p = playing; clock.stop(); playing = null; p.draw(p.to); p.done && p.done(); publish(); return true; };
  slides.forEach((sl) => sl.mols.forEach((m) => { m.over = null; }));
  const clearOver = () => slides.forEach((sl) => sl.mols.forEach((m) => { m.over = null; }));

  function settle(i, k) {   // stop k of slide i, reached without playing
    clearOver();
    cur = { i, k, t: slides[i].stops[k].end }; redraw(); hashSet(); publish();
  }
  function enter(i, withTr) {
    const from = cur.i, leaving = slides[from];
    clearOver();
    const startSlide = () => {
      cur = { i, k: 0, t: 0 };
      const end0 = slides[i].stops[0].end;
      run(0, end0, (t) => { cur.t = t; apply({ kind: 'slide', i, t }); publish(); }, () => { cur.t = end0; });
      hashSet();
    };
    const tr = slides[i].data.transition;
    if (withTr && i === from + 1 && tr.ms > 0 && tr.kind !== 'none') {
      const ti = cur.t;
      run(0, tr.ms, (x) => { const st = { kind: 'tr', i: from, j: i, p: x / tr.ms, tr, ti }; apply(st); publish({ tr: st }); }, startSlide);
    } else startSlide();
  }
  function next() {
    if (finish()) return;
    const sl = slides[cur.i];
    if (cur.k < sl.data.steps.length) {
      const k = cur.k + 1, s = sl.stops[k];
      cur.k = k; clearOver();
      run(s.start, s.end, (t) => { cur.t = t; redraw(); publish(); }, () => { cur.t = s.end; });
    } else if (cur.i < N - 1) enter(cur.i + 1, true);
  }
  function prev() {
    finish();
    if (cur.k > 0) settle(cur.i, cur.k - 1);
    else if (cur.i > 0) settle(cur.i - 1, slides[cur.i - 1].data.steps.length);
  }
  const goto = (i) => { finish(); settle(clamp(i, 0, N - 1), 0); };
  function replayMol(m) {
    finish();
    run(0, m.dur, (s) => { m.over = s; redraw(); }, () => { m.over = m.dur; });
  }

  // ---- DOM events
  const key = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) { e.preventDefault(); ctl('next'); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); ctl('prev'); }
    else if (k === 'Home') ctl('goto', 0);
    else if (k === 'End') ctl('goto', N - 1);
    else if (k === 'o' || k === 'O') document.body.classList.toggle('ov');
    else if (k === 'Escape') document.body.classList.remove('ov');
    else if (k === 'p' || k === 'P') openPresenter();
    else if (k === 'f' || k === 'F') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); }
    else if (k === '?') document.body.classList.toggle('showhelp');
  };
  const ctl = (c, i) => { if (c === 'next') next(); else if (c === 'prev') prev(); else if (c === 'goto') goto(i); };

  function openPresenter() {
    const u = location.href.split('#')[0].split('?')[0] + '?presenter';
    const w = window.open(u, 'deck-presenter', 'width=1500,height=900');
    if (w) listeners.add(w);
    setTimeout(() => publish(), 500);
  }

  function buildOverview() {
    const ov = document.createElement('div'); ov.id = 'ov';
    slides.forEach((sl, i) => {
      const th = document.createElement('div'); th.className = 'th'; th.dataset.i = i;
      const c = sl.clone; c.classList.add('on', 'sl'); c.style.display = 'block'; th.appendChild(c);
      const n = document.createElement('div'); n.className = 'n'; n.textContent = i + 1; th.appendChild(n);
      th.addEventListener('click', () => { document.body.classList.remove('ov'); ctl('goto', i); });
      ov.appendChild(th);
    });
    document.body.appendChild(ov);
    const size = () => $$('.th', ov).forEach((th, i) => { const s = th.clientWidth / W; slides[i].clone.style.transform = `scale(${s})`; th.classList.toggle('cur', i === cur.i); });
    new MutationObserver(size).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    addEventListener('resize', size);
  }

  // ---- main window
  function startMain() {
    $$('.mol-ui button').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const n = b.closest('.mol'), sl = slides.find((s) => s.el.contains(n)), m = sl.mols.find((x) => x.n === n);
      if (b.dataset.act === 'play') replayMol(m);
      else if (b.dataset.act === 'pop') window.open(location.href.split('#')[0].split('?')[0] + '?popout=' + encodeURIComponent(m.scene.id), '_blank', 'width=1200,height=900');
    }));
    document.addEventListener('keydown', key);
    stage.addEventListener('click', (e) => { if (!e.target.closest('.ui') && !e.target.closest('.live')) ctl('next'); });
    addEventListener('message', (e) => {
      const d = e.data;
      if (!d || d.deck !== 1) return;
      if (d.type === 'hello') { listeners.add(e.source); publish(); }
      else if (d.type === 'cmd') ctl(d.cmd, d.i);
    });
    const prog = document.createElement('div'); prog.id = 'prog'; document.body.appendChild(prog);
    const help = document.createElement('div'); help.id = 'help'; help.textContent = D.help || '→ ← next, back   O overview   P presenter   F fullscreen   ? this help'; document.body.appendChild(help);
    if (!EXPORT) buildOverview();
    const n0 = parseInt((location.hash || '').slice(1), 10);
    const i0 = n0 >= 1 && n0 <= N ? n0 - 1 : 0;
    if (EXPORT) return;
    fit();
    if (i0 === 0) enter(0, false); else settle(i0, 0);
    setInterval(() => { prog.style.width = `${((cur.i + (cur.k / (slides[cur.i].data.steps.length + 1))) / N) * 100}%`; }, 200);
    slides.forEach((sl) => sl.vids.forEach((m) => { m.vid.loop = m.scene.loop !== false; }));
  }

  // ---- embed: a frozen slide that follows the state messages of its parent
  function startEmbed() {
    fit();
    addEventListener('message', (e) => {
      if (!e.data || e.data.deck !== 1) return;
      if (e.data.type === 'show') { apply(e.data.st); }
    });
    parent.postMessage({ deck: 1, type: 'embed-ready' }, '*');
    slides.forEach((sl) => sl.vids.forEach((m) => { m.vid.pause(); }));
  }

  // ---- presenter window
  function startPresenter() {
    document.title = (D.title || 'Deck') + ' — presenter';
    stage.style.display = 'none';
    const base = location.href.split('#')[0].split('?')[0];
    const root = document.createElement('div'); root.id = 'pres';
    root.innerHTML = `<style>
      #pres{position:fixed;inset:0;background:#fff;display:grid;grid-template-columns:3fr 2fr;grid-template-rows:auto 1fr auto;gap:12px;padding:12px;font:16px Arial,sans-serif;color:#0A0A0A}
      #pres .top{grid-column:1/3;display:flex;gap:16px;align-items:center;border-bottom:3px solid #0A0A0A;padding-bottom:10px}
      #pres .top b{font-size:34px;font-variant-numeric:tabular-nums}#pres .top .sp{flex:1}
      #pres button{font:700 16px Arial;padding:8px 14px;border:2px solid #0A0A0A;background:#fff;cursor:pointer}
      #pres button:hover{background:#FBB153}
      #pres .l{display:flex;flex-direction:column;gap:10px;min-height:0}
      #pres .r{display:flex;flex-direction:column;gap:10px;min-height:0}
      #pres iframe{width:100%;aspect-ratio:16/9;border:3px solid #0A0A0A;background:#fff;flex:none}
      #pres .r iframe{border-color:#777}
      #pres h3{margin:0;font-size:14px;color:#2B2B2B;text-transform:uppercase;letter-spacing:.05em}
      #pres .notes{flex:1;min-height:0;overflow:auto;font-size:26px;line-height:1.35;border:2px solid #777;padding:14px 18px;white-space:pre-wrap}
      #pres .strip{grid-column:1/3;display:flex;gap:6px;overflow:auto;padding-top:4px}
      #pres .strip div{flex:1 0 auto;min-width:92px;border:2px solid #0A0A0A;padding:4px 8px;cursor:pointer;font-variant-numeric:tabular-nums}
      #pres .strip div.cur{background:#FBB153}#pres .strip div.over{border-color:#AC3F3F;color:#AC3F3F}
      #pres .strip small{display:block;font-size:12px;color:#2B2B2B}
    </style>
    <div class="top"><b id="p-total">00:00</b><span id="p-slide"></span><span id="p-hint"></span><span id="p-time"></span><span class="sp"></span><button id="p-start">Start</button><button id="p-reset">Reset</button><button id="p-prev">←</button><button id="p-next">→</button></div>
    <div class="l"><h3>Now</h3><iframe id="p-cur" src="${base}?embed"></iframe><h3>Notes</h3><div class="notes" id="p-notes"></div></div>
    <div class="r"><h3>Next</h3><iframe id="p-next-f" src="${base}?embed"></iframe></div>
    <div class="strip" id="p-strip"></div>`;
    document.body.appendChild(root);
    const frames = { cur: $('#p-cur'), next: $('#p-next-f') };
    const spent = D.slides.map(() => 0);
    let run_ = false, t0 = 0, total = 0, state = { cur: { i: 0, k: 0, t: 0 } }, lastTick = Date.now();
    const strip = $('#p-strip');
    D.slides.forEach((s, i) => { const d = document.createElement('div'); d.innerHTML = `${i + 1}<small>${(s.title || s.id).slice(0, 18)}</small><span></span>`; d.onclick = () => send('goto', i); strip.appendChild(d); });
    const send = (cmd, i) => { try { (window.opener || parent).postMessage({ deck: 1, type: 'cmd', cmd, i }, '*'); } catch { /* no opener */ } };
    const toFrame = (f, st) => { try { f.contentWindow.postMessage({ deck: 1, type: 'show', st }, '*'); } catch { /* frame not ready */ } };
    const mm = (ms) => `${pad(ms / 60000)}:${pad((ms / 1000) % 60)}`;
    const nextState = (c) => {
      const sl = slides[c.i];
      if (c.k < sl.data.steps.length) return { kind: 'slide', i: c.i, t: sl.stops[c.k + 1].end };
      if (c.i < N - 1) return { kind: 'slide', i: c.i + 1, t: 0 };
      return { kind: 'slide', i: c.i, t: sl.data.duration };
    };
    function paint() {
      const c = state.cur;
      toFrame(frames.cur, state.tr || { kind: 'slide', i: c.i, t: c.t });
      toFrame(frames.next, nextState(c));
      $('#p-slide').textContent = `${c.i + 1} / ${N}` + (slides[c.i].data.steps.length ? `  ·  ${c.k} / ${slides[c.i].data.steps.length}` : '');
      $('#p-notes').textContent = D.slides[c.i].notes || '';
      [...strip.children].forEach((d, i) => d.classList.toggle('cur', i === c.i));
    }
    setInterval(() => {
      const now = Date.now(), dt = now - lastTick; lastTick = now;
      if (run_) { total += dt; spent[state.cur.i] += dt; }
      $('#p-total').textContent = mm(total);
      const c = state.cur.i, plan = D.slides[c].duration;
      $('#p-time').textContent = `slide ${mm(spent[c])} / plan ${mm(plan)}`;
      [...strip.children].forEach((d, i) => { d.lastChild.textContent = ` ${mm(spent[i])}`; d.classList.toggle('over', spent[i] > D.slides[i].duration * 2 && spent[i] > 20000); });
      $('#p-hint').textContent = (!window.opener || window.opener.closed) && parent === window ? '(open from the deck with P)' : '';
    }, 250);
    $('#p-start').onclick = () => { run_ = !run_; $('#p-start').textContent = run_ ? 'Pause' : 'Start'; };
    $('#p-reset').onclick = () => { total = 0; spent.fill(0); };
    $('#p-prev').onclick = () => send('prev'); $('#p-next').onclick = () => send('next');
    document.addEventListener('keydown', (e) => {
      if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); if (!run_) $('#p-start').click(); send('next'); }
      else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); send('prev'); }
    });
    addEventListener('message', (e) => {
      const d = e.data;
      if (!d || d.deck !== 1) return;
      if (d.type === 'state') { state = { cur: d.cur, tr: d.tr, fresh: true }; paint(); }
      else if (d.type === 'embed-ready') paint();
    });
    const hello = () => { try { (window.opener || parent).postMessage({ deck: 1, type: 'hello' }, '*'); } catch { /* no opener */ } };
    hello(); setInterval(() => { if (!state.fresh) hello(); }, 1500);
  }

  // ---- popout: one scene, large, free to turn with the mouse
  function startPopout() {
    const id = Q.get('popout'), sc = D.scenes[id];
    const host = $('#popout');
    document.title = (sc ? sc.title : id) + ' — ' + (D.title || 'Deck');
    if (!sc) { host.textContent = 'No such scene: ' + id; return; }
    const m = { n: null, key: 'pop', scene: sc, kind: sc.kind, at: 0, dur: sc.duration, view: null, over: null, vid: null };
    const box = document.createElement('div'); box.className = 'mol';
    if (m.kind === 'video') { const v = document.createElement('video'); v.className = 'mol-view'; v.src = $(`.mol[data-scene="${id}"] video`).src; v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true; box.appendChild(v); }
    else { const d = document.createElement('div'); d.className = 'mol-view'; box.appendChild(d); }
    host.appendChild(box); m.n = box;
    if (m.kind === 'webgl') {
      const ctlBar = document.createElement('div'); ctlBar.className = 'ctl';
      ctlBar.innerHTML = '<button id="pp">▶</button><span></span>'; host.appendChild(ctlBar);
      requestAnimationFrame(() => {
        buildMol(m);
        if (!m.view) return;
        m.view.at(posterTime(sc));
        $('#pp').onclick = () => { clock.play(0, m.dur); const step = (ts) => { const dt = last ? ts - last : 0; last = ts; const go = clock.tick(dt); m.view.at(clock.t); if (go) requestAnimationFrame(step); else last = 0; }; last = 0; requestAnimationFrame(step); };
      });
    }
  }

  // ---- start
  slides.forEach((sl) => { sl.clone = sl.el.cloneNode(true); });   // before any animation touches the nodes: the overview shows the finished slide
  slides.forEach((sl) => { $$('.mol-ui,video,iframe', sl.clone).forEach((n) => n.remove()); });
  if (MODE === 'main') startMain();
  else if (MODE === 'embed') startEmbed();
  else if (MODE === 'presenter') startPresenter();
  else if (MODE === 'popout') startPopout();
  if (MODE !== 'main') fit();
  if (MODE === 'main' && EXPORT) fit();

  // ---- the exporter's handle
  let plan = null;
  const info = () => ({ total: sched.total, fps: D.fps, slides: D.slides.map((s, i) => ({ i, id: s.id, duration: s.duration, start: sched.startOf(i), title: s.title })), size: [W, H] });
  window.DECK = {
    info, ready, sched,
    /** Draw global video time g (ms). Returns a signature; equal signatures draw identical pixels. */
    seekGlobal(g) { const loc = sched.locate(g); return apply(loc); },
    /** Slide i at time t, or in its still state. */
    seekSlide(i, t, still = false) { return apply({ kind: 'slide', i, t, still }); },
    /** Prepare for PDF: every slide in normal flow in its still state, 3D and video frozen into images. */
    printMode() {
      document.body.classList.add('print'); stage.style.transform = '';
      slides.forEach((sl) => { sl.el.style.cssText = ''; sl.el.classList.add('on'); });
      slides.forEach((sl) => {
        renderSlide(sl, sl.data.duration, true);
        $$('iframe.live', sl.el).forEach((f) => f.remove());
      });
      return ready().then(() => {
        slides.forEach((sl) => sl.mols.forEach((m) => {
          let uri = null;
          if (m.view) uri = m.view.v.pngURI();
          else if (m.vid && m.vid.videoWidth) { const c = document.createElement('canvas'); c.width = m.vid.videoWidth; c.height = m.vid.videoHeight; c.getContext('2d').drawImage(m.vid, 0, 0); uri = c.toDataURL('image/png'); }
          if (uri) { const im = document.createElement('img'); im.className = 'mol-snap'; im.src = uri; $('.mol-view', m.n).style.visibility = 'hidden'; m.n.insertBefore(im, m.n.firstChild); }
        }));
        return Promise.all($$('img.mol-snap').map((im) => im.decode().catch(() => 0)));
      });
    },
    /** A video plan: the slides in `range` (ids; default all) with durations overridden ({default, byId}); never shorter than a slide needs. */
    plan({ durations = {}, range } = {}) {
      const idx = D.slides.map((s, i) => i).filter((i) => !range || range.includes(D.slides[i].id));
      const list = idx.map((i, k) => {
        const s = D.slides[i];
        const d = Math.max(s.need, durations.byId?.[s.id] ?? durations.default ?? s.duration);
        return { i, duration: d, transition: k ? s.transition : { kind: 'none', ms: 0 } };
      });
      plan = { idx, list, sched: schedule(list.map((x) => ({ duration: x.duration, transition: x.transition }))) };
      return { total: plan.sched.total, slides: list.map((x) => ({ i: x.i, duration: x.duration })) };
    },
    seekPlan(g) {
      const loc = plan.sched.locate(g);
      if (loc.kind === 'slide') return apply({ kind: 'slide', i: plan.idx[loc.i], t: loc.t });
      return apply({ kind: 'tr', i: plan.idx[loc.i], j: plan.idx[loc.j], p: loc.p, tr: loc.tr, ti: plan.list[loc.i].duration });
    },
    state: () => cur,
  };
})();
