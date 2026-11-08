// The deck's time model. No DOM, no wall clock: the browser runtime inlines this file (the `export` words are stripped),
// and deck/test.mjs imports it in Node. Everything on a slide is a pure function of the slide time t (ms); the global
// schedule maps the time of a whole video to a slide time or to a transition progress.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, u) => a + (b - a) * u;

export const EASE = {
  linear: (p) => p,
  smooth: (p) => p * p * (3 - 2 * p),
  out: (p) => 1 - (1 - p) * (1 - p) * (1 - p),
  inout: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
};
export const ease = (name, p) => (EASE[name] || EASE.smooth)(clamp(p));

/** Progress 0..1 of an event that starts at `at` and lasts `dur`, seen at time t. */
export const progress = (t, at, dur) => (dur <= 0 ? (t >= at ? 1 : 0) : clamp((t - at) / dur));

/**
 * A clock the caller drives. It never reads the wall clock: the browser's player feeds it real deltas,
 * the exporter calls set(). play(from, to) runs from `from` to `to` as advance() is called; tick(dt) returns true while it runs.
 */
export function createClock() {
  const c = { t: 0, target: null, rate: 1 };
  c.set = (t) => { c.t = t; c.target = null; return c.t; };
  c.advance = (dt) => { c.t += dt * c.rate; return c.t; };
  c.play = (from, to) => { c.t = from; c.target = to; return c; };
  c.running = () => c.target !== null;
  c.tick = (dt) => {
    if (c.target === null) return false;
    c.t += dt * c.rate;
    if (c.t >= c.target) { c.t = c.target; c.target = null; return false; }
    return true;
  };
  c.stop = () => { c.target = null; };
  return c;
}

/**
 * Start and end of each stop of a slide. Stop 0 is what plays when the slide appears (end0 = the end of everything bound to step 0);
 * stop k is the build of step k. `steps` is [{at, dur}] for steps 1..n.
 */
export function stops(steps, end0 = 0) {
  return [{ start: 0, end: end0 }, ...steps.map((s) => ({ start: s.at, end: s.at + s.dur }))];
}

/**
 * The schedule of a whole deck for a video. `slides` is [{duration, transition: {kind, ms}}], where the transition is the one
 * that leads INTO that slide (the first slide has none). Slide i holds for its duration; then the transition into slide i+1 runs
 * while slide i stays at its end and slide i+1 stays at t = 0.
 * locate(g) returns {kind:'slide', i, t} or {kind:'tr', i, j, p, tr}.
 */
export function schedule(slides) {
  const segs = [];
  let g = 0;
  slides.forEach((s, i) => {
    segs.push({ kind: 'slide', i, from: g, to: g + s.duration });
    g += s.duration;
    const next = slides[i + 1];
    const ms = next ? (next.transition?.ms ?? 0) : 0;
    if (next && ms > 0 && next.transition.kind !== 'none') { segs.push({ kind: 'tr', i, j: i + 1, from: g, to: g + ms, tr: next.transition }); g += ms; }
  });
  const total = g;
  const locate = (x) => {
    const q = clamp(x, 0, total);
    let k = segs.findIndex((s) => q < s.to);
    if (k < 0) k = segs.length - 1;
    const s = segs[k];
    if (s.kind === 'slide') return { kind: 'slide', i: s.i, t: q - s.from };
    return { kind: 'tr', i: s.i, j: s.j, p: (q - s.from) / (s.to - s.from), tr: s.tr };
  };
  /** Global time at which slide i starts (after the transition into it). */
  const startOf = (i) => segs.find((s) => s.kind === 'slide' && s.i === i).from;
  return { total, segs, locate, startOf, frames: (fps) => Math.max(1, Math.ceil((total * fps) / 1000)) };
}

/** Quaternion helpers for the WebGL camera path: unit quaternions as [x, y, z, w]. */
export const qmul = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];
export const qaxis = (axis, deg) => { const h = (deg * Math.PI) / 360, s = Math.sin(h); return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(h)]; };

/**
 * A camera path is a list of keyframes {t, view, yaw, pitch} in scene time; `view` is a base view (an array of 4 numbers: the position and zoom of the
 * viewer). pathAt(path, s) returns {view, yaw, pitch} at scene time s: linear in the view, smooth in time, held before the first and after the last key.
 */
export function pathAt(path, s) {
  const k = path.findIndex((p) => s < p.t);
  if (k === 0) return { view: path[0].view, yaw: path[0].yaw || 0, pitch: path[0].pitch || 0 };
  if (k < 0) { const e = path[path.length - 1]; return { view: e.view, yaw: e.yaw || 0, pitch: e.pitch || 0 }; }
  const a = path[k - 1], b = path[k], u = ease(b.ease || 'smooth', (s - a.t) / (b.t - a.t));
  return { view: a.view.map((x, n) => lerp(x, b.view[n], u)), yaw: lerp(a.yaw || 0, b.yaw || 0, u), pitch: lerp(a.pitch || 0, b.pitch || 0, u) };
}
