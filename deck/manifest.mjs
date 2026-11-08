// The deck manifest: read deck.json, check it, and fill in everything the runtime needs (step times, durations, scene times).
// Pure functions, no file or browser access, so that deck/test.mjs can run them. Errors stop the build; warnings are printed.

export const LAYOUTS = ['title', 'section', 'two-column', 'figure', 'number', 'timeline', 'table', 'molecule', 'cards', 'page'];
export const EFFECTS = ['fade-up', 'fade', 'zoom', 'left', 'none'];
export const TRANSITIONS = ['none', 'fade', 'slide', 'rise'];
export const SCENE_KINDS = ['webgl', 'chimerax'];
export const MOTIONS = ['rotate', 'pocket', 'highlight', 'morph'];
export const BLOCK_TYPES = ['text', 'list', 'image', 'device', 'mol', 'svg'];
export const CHIPS = ['ok', 'part', 'plan', 'stop'];   // a status chip of a card: in code, partial, designed not built, stopped
export const FRAMES = ['browser', 'phone', 'laptop'];
/** The accent preset of an audience: two families of the token file. A deck can name any family in `accent` and `second` instead. */
export const AUDIENCES = {
  neutral: { accent: 'indigo', second: 'apricot' },
  cloud: { accent: 'indigo', second: 'mint' },
  academic: { accent: 'maroon', second: 'palelilac' },
  industry: { accent: 'peri', second: 'apricot' },
};

export const SIZE = [1920, 1080];
const DEFAULT = { duration: 6000, fps: 30, transition: { kind: 'fade', ms: 500 }, sceneMs: 6000, lead: 900, build: 500, gap: 700, tail: 800, sceneAt: 500 };
const SLIDE_KEYS = ['id', 'layout', 'title', 'subtitle', 'kicker', 'meta', 'notes', 'duration', 'transition', 'only', 'timing', 'left', 'right', 'split', 'figure', 'caption', 'items', 'columns', 'rows', 'scene', 'bullets', 'build', 'highlight', 'unit', 'size', 'page', 'reveal', 'steps', 'ms', 'alt'];
const RE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const RE_PDB = /^([A-Za-z0-9]{4}|[A-Za-z0-9_./-]+\.(pdb|cif|ent))$/;
const RE_PART = /^[A-Za-z0-9]{1,4}(:[0-9]+(-[0-9]+)?(,[0-9]+(-[0-9]+)?)*)?$/;
const RE_SRC = /^(?![A-Za-z]+:)[^\0<>"|?*]+$/;   // a path relative to the deck folder, no scheme

/** "A:99-122,130;L:30" -> [{chain:'A', ranges:[[99,122],[130,130]]}, {chain:'L', ranges:[[30,30]]}]. A chain alone means the whole chain (ranges empty). */
export function parseTarget(text) {
  return String(text).split(';').map((part) => {
    if (!RE_PART.test(part)) throw new Error(`target "${text}" is not like A:99-122 or A:99-122,130;L:30`);
    const [chain, rest] = part.split(':');
    const ranges = rest ? rest.split(',').map((r) => { const [a, b] = r.split('-').map(Number); return [a, b ?? a]; }) : [];
    return { chain, ranges };
  });
}

const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
const blocks = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

/** Turn a block written as a bare string into {type:'text', text}. Returns a new block. */
export function asBlock(b) {
  if (typeof b === 'string') return { type: 'text', text: b };
  return b;
}

/** The blocks of a slide in reading order. Only these can carry a `step`. */
export function blocksOf(s) {
  switch (s.layout) {
    case 'two-column': return [...blocks(s.left), ...blocks(s.right)];
    case 'figure': return blocks(s.figure);
    case 'page': return s.pageBlock ? [s.pageBlock] : [];
    case 'molecule': return s.bullets ? [{ type: 'list', ...(isObj(s.bullets) ? s.bullets : { items: s.bullets }), __ref: 'bullets' }] : [];
    default: return [];
  }
}

/**
 * Check the manifest and resolve it. Returns { deck, errors, warnings }.
 * opts.audience overrides the manifest's audience (one manifest, one deck per audience).
 */
export function resolve(raw0, opts = {}) {
  const raw = raw0 && typeof raw0 === 'object' ? structuredClone(raw0) : raw0;
  const errors = [], warnings = [];
  const err = (m) => errors.push(m), warn = (m) => warnings.push(m);
  if (!isObj(raw)) return { deck: null, errors: ['deck.json must hold one JSON object'], warnings };
  const audience = opts.audience || raw.audience || 'neutral';
  if (!AUDIENCES[audience] && !(raw.accent && raw.second)) err(`audience "${audience}" is not one of ${Object.keys(AUDIENCES).join(', ')}; or give accent and second`);
  const pre = AUDIENCES[audience] || AUDIENCES.neutral;
  if (raw.size && (raw.size[0] !== SIZE[0] || raw.size[1] !== SIZE[1])) err(`size must be ${SIZE.join(' x ')}: the page is drawn at that size and scaled for other screens`);
  const tr0 = { ...DEFAULT.transition, ...(raw.transition || {}) };
  if (!TRANSITIONS.includes(tr0.kind)) err(`transition kind "${tr0.kind}" is not one of ${TRANSITIONS.join(', ')}`);
  const fps = raw.fps ?? DEFAULT.fps;
  if (!(fps >= 1 && fps <= 120)) err('fps must be between 1 and 120');
  const deck = {
    title: String(raw.title || 'Deck'), lang: raw.lang || 'ru', audience, accent: raw.accent || pre.accent, second: raw.second || pre.second,
    boundary: raw.boundary || '', counter: raw.counter !== false, author: raw.author || '', fps, transition: tr0, duration: raw.duration ?? DEFAULT.duration, scenes: {}, slides: [],
  };

  // scenes
  for (const [id, sc] of Object.entries(raw.scenes || {})) {
    const w = `scene "${id}"`;
    if (!RE_ID.test(id)) { err(`${w}: the id must be letters, digits, _ or -`); continue; }
    if (!isObj(sc)) { err(`${w} must be an object`); continue; }
    const kind = sc.kind || 'webgl';
    if (!SCENE_KINDS.includes(kind)) err(`${w}: kind "${kind}" is not one of ${SCENE_KINDS.join(', ')}`);
    if (!sc.pdb || !RE_PDB.test(sc.pdb)) err(`${w}: pdb must be a four-character PDB code or a .pdb or .cif path inside the deck folder`);
    const motion = sc.motion || 'rotate';
    if (!MOTIONS.includes(motion)) err(`${w}: motion "${motion}" is not one of ${MOTIONS.join(', ')}`);
    if (motion === 'morph' && !(sc.to && RE_PDB.test(sc.to))) err(`${w}: a morph needs "to", the second structure`);
    if ((motion === 'pocket' || motion === 'highlight') && !sc.target) err(`${w}: motion "${motion}" needs "target", for example "A:99-122"`);
    for (const key of ['target', 'focus']) if (sc[key]) { try { parseTarget(sc[key]); } catch (e) { err(`${w}: ${e.message}`); } }
    const duration = sc.duration ?? DEFAULT.sceneMs;
    if (!(duration >= 500 && duration <= 120000)) err(`${w}: duration must be 500 to 120000 ms`);
    deck.scenes[id] = { id, kind, motion, duration, frames: sc.frames, size: sc.size, chains: sc.chains || {}, target: sc.target, focus: sc.focus, drop: sc.drop || '', pdb: sc.pdb, to: sc.to, title: sc.title || id, fallback: sc.fallback !== false, poster: sc.poster, loop: sc.loop !== false };
  }

  const used = new Set();
  const slides = Array.isArray(raw.slides) ? raw.slides : null;
  if (!slides || !slides.length) { err('slides must be a list with at least one slide'); return { deck, errors, warnings }; }
  slides.forEach((s0, idx) => {
    const n = idx + 1;
    const w = `slide ${n}${s0 && s0.id ? ` (${s0.id})` : ''}`;
    if (!isObj(s0)) { err(`${w} must be an object`); return; }
    if (s0.only && !s0.only.includes(audience)) return;   // left out for this audience
    const s = { ...s0 };
    s.id = s.id || `s${n}`;
    if (!RE_ID.test(s.id)) err(`${w}: id "${s.id}" must be letters, digits, _ or -`);
    if (used.has(s.id)) err(`${w}: id "${s.id}" is used twice`);
    used.add(s.id);
    if (!LAYOUTS.includes(s.layout)) { err(`${w}: layout "${s.layout}" is not one of ${LAYOUTS.join(', ')}`); return; }
    for (const k of Object.keys(s)) if (!SLIDE_KEYS.includes(k)) warn(`${w}: "${k}" is not a key of a slide (ignored)`);
    if (!s.title && !['title', 'page'].includes(s.layout)) warn(`${w}: no title`);
    s.notes = s.notes ? String(s.notes) : '';
    const tr = { ...tr0, ...(s.transition || {}) };
    if (!TRANSITIONS.includes(tr.kind)) err(`${w}: transition kind "${tr.kind}" is not one of ${TRANSITIONS.join(', ')}`);
    s.transition = tr;

    // page: one finished picture at the size of the slide (a figure page). A .svg builds in steps like an svg block; a raster picture reveals regions.
    if (s.layout === 'page') {
      if (!(typeof s.page === 'string' && RE_SRC.test(s.page) && /\.(png|jpe?g|webp|svg)$/i.test(s.page))) err(`${w}: a page slide needs "page", a .png, .jpg, .webp or .svg path relative to the deck folder`);
      else if (/\.svg$/i.test(s.page)) s.pageBlock = { type: 'svg', src: s.page, steps: s.steps, ms: s.ms };
      else if (s.steps || s.ms) warn(`${w}: "steps" and "ms" belong to an .svg page; use "reveal" for a raster picture`);
      if (s.reveal != null) {
        if (s.pageBlock) err(`${w}: "reveal" is for a raster page; an .svg page builds by data-s="k" and "steps"`);
        else if (!Array.isArray(s.reveal) || s.reveal.length > 12 || s.reveal.some((r) => !isObj(r) || !Array.isArray(r.rect) || r.rect.length !== 4 || r.rect.some((v) => !(v >= 0 && v <= 1)) || !(r.rect[2] > 0 && r.rect[3] > 0) || r.rect[0] + r.rect[2] > 1.0001 || r.rect[1] + r.rect[3] > 1.0001)) err(`${w}: "reveal" is a list of at most 12 {"rect": [x, y, w, h]}, fractions of the page from 0 to 1`);
      }
      s.alt = String(s.alt || s.title || '');
    }

    // blocks: strings become text blocks, each block is checked
    const fixBlocks = (v) => (v == null ? undefined : Array.isArray(v) ? v.map(asBlock) : asBlock(v));
    if (s.layout === 'two-column') { s.left = fixBlocks(s.left); s.right = fixBlocks(s.right); if (!s.left || !s.right) err(`${w}: two-column needs left and right`); }
    if (s.layout === 'figure') { s.figure = fixBlocks(s.figure); if (!s.figure) err(`${w}: figure needs "figure": an image, device or mol block`); }
    for (const b of blocksOf(s).map((x) => x)) {
      if (!isObj(b) || !BLOCK_TYPES.includes(b.type)) { err(`${w}: a block needs "type" from ${BLOCK_TYPES.join(', ')}`); continue; }
      if (b.type === 'image' && !(b.src && RE_SRC.test(b.src))) err(`${w}: an image block needs "src", a path relative to the deck folder`);
      if (b.type === 'image' && !b.alt) warn(`${w}: image "${b.src}" has no alt text`);
      if (b.type === 'device') {
        if (b.frame && !FRAMES.includes(b.frame)) err(`${w}: device frame "${b.frame}" is not one of ${FRAMES.join(', ')}`);
        if (!b.src && !b.url) err(`${w}: a device block needs "src" (a screenshot) or "url" (a live page) or both`);
        if (b.src && !RE_SRC.test(b.src)) err(`${w}: device src must be a path relative to the deck folder`);
        if (b.url && !/^https?:\/\//i.test(b.url)) err(`${w}: device url must start with http:// or https://`);
        if (b.url && !b.src) warn(`${w}: device has a live url but no screenshot "src"; exports will show a placeholder`);
      }
      if (b.type === 'mol') { if (!deck.scenes[b.scene]) err(`${w}: mol block names scene "${b.scene}", which is not in "scenes"`); }
      if (b.type === 'svg') {
        if (!(b.src && RE_SRC.test(b.src) && /\.svg$/i.test(b.src))) err(`${w}: an svg block needs "src", a .svg path relative to the deck folder`);
        if (b.steps != null && !(Number.isInteger(b.steps) && b.steps >= 0 && b.steps <= 12)) err(`${w}: svg steps must be a whole number from 0 to 12`);
        if (b.ms != null && !(b.ms >= 500 && b.ms <= 120000)) err(`${w}: svg ms must be 500 to 120000`);
      }
      if (b.effect && !EFFECTS.includes(b.effect)) err(`${w}: effect "${b.effect}" is not one of ${EFFECTS.join(', ')}`);
    }
    if (s.layout === 'molecule') {
      if (!deck.scenes[s.scene]) err(`${w}: molecule layout needs "scene" naming an entry of "scenes"`);
    }
    if (s.layout === 'number' || s.layout === 'timeline') {
      if (!Array.isArray(s.items) || !s.items.length) err(`${w}: ${s.layout} needs "items"`);
      else if (s.layout === 'number' && s.items.length > 4) err(`${w}: number takes at most 4 items`);
      else if (s.layout === 'timeline' && s.items.length > 7) err(`${w}: timeline takes at most 7 items`);
      else for (const it of s.items) if (!isObj(it) || (s.layout === 'number' ? it.value == null : !it.when)) err(`${w}: each item needs ${s.layout === 'number' ? '"value"' : '"when"'}`);
    }
    if (s.layout === 'cards') {
      if (!Array.isArray(s.items) || s.items.length < 2 || s.items.length > 6) err(`${w}: cards takes 2 to 6 "items"`);
      else for (const it of s.items) {
        if (!isObj(it) || !it.title) err(`${w}: each card needs "title"`);
        else {
          if (it.src && !RE_SRC.test(it.src)) err(`${w}: card "${it.title}": src must be a path relative to the deck folder`);
          if (it.src && !it.alt) warn(`${w}: card "${it.title}": image has no alt text (the title is used)`);
          if (it.chip && !CHIPS.includes(it.kind)) err(`${w}: card "${it.title}": a chip needs "kind" from ${CHIPS.join(', ')}`);
        }
      }
    }
    if (s.layout === 'table') {
      if (!Array.isArray(s.columns) || !s.columns.length) err(`${w}: table needs "columns"`);
      else if (!Array.isArray(s.rows) || !s.rows.length) err(`${w}: table needs "rows"`);
      else {
        if (s.columns.length > 6) err(`${w}: table takes at most 6 columns`);
        if (s.rows.length > 8) err(`${w}: table takes at most 8 rows`);
        s.rows.forEach((r, k) => { if (!Array.isArray(r) || r.length !== s.columns.length) err(`${w}: row ${k + 1} has ${Array.isArray(r) ? r.length : 'no'} cells, expected ${s.columns.length}`); });
      }
    }

    // steps: every list item with build, every item of a number or timeline slide, a table row with build
    let nSteps = 0;
    const assign = (o) => { o.step = ++nSteps; };
    for (const b of blocksOf(s)) {
      if (!isObj(b)) continue;
      const target = b.__ref === 'bullets' ? (isObj(s.bullets) ? s.bullets : (s.bullets = { items: s.bullets })) : b;
      if (b.type === 'list') {
        target.items = (target.items || []).map((it) => (typeof it === 'string' ? { text: it } : { ...it }));
        if (!target.items.length) err(`${w}: a list block needs "items"`);
        if (target.build) target.items.forEach(assign);
      } else if (b.type === 'svg') b.stepNums = Array.from({ length: b.steps || 0 }, () => ++nSteps);   // the groups of the drawing that say data-s="k"
      else if (b.build || b.step === true) assign(b);
    }
    if (s.layout === 'page' && Array.isArray(s.reveal)) s.reveal = s.reveal.map((r) => ({ ...r, step: ++nSteps }));   // each region appears at one step, in list order
    if (s.layout === 'number' || s.layout === 'timeline' || s.layout === 'cards') {
      s.items = (s.items || []).map((it) => ({ ...it }));
      if (s.build !== false) s.items.forEach(assign);
    }
    if (s.layout === 'table' && s.build) { s.rowSteps = s.rows.map(() => ++nSteps); }

    // mol scenes on this slide
    s.mols = [];
    const molBlocks = blocksOf(s).filter((b) => isObj(b) && b.type === 'mol');
    if (s.layout === 'molecule' && deck.scenes[s.scene]) molBlocks.push({ type: 'mol', scene: s.scene, __own: true });
    const own = molBlocks.length;
    molBlocks.forEach((b, k) => {
      const sc = deck.scenes[b.scene];
      if (!sc) return;
      const play = b.play || 'auto';
      if (!['auto', 'button'].includes(play)) err(`${w}: mol play must be "auto" or "button"`);
      s.mols.push({ key: `m${k}`, scene: b.scene, at: b.at, dur: sc.duration, play, own: !!b.__own });
      b.key = `m${k}`;
      if (b.__own) s.molKey = `m${k}`;
    });

    // times
    const dflt = s.duration ?? deck.duration;
    const entranceEnd = 600;
    const svgMs = blocksOf(s).filter((b) => isObj(b) && b.type === 'svg' && b.ms).map((b) => b.ms);   // a drawing with its own timeline plays on entry
    const autoEnd = Math.max(entranceEnd, ...svgMs, ...s.mols.filter((m) => m.play === 'auto').map((m) => (m.at ?? DEFAULT.sceneAt) + m.dur));
    s.end0 = autoEnd;
    const lead = nSteps ? Math.max(DEFAULT.lead, s.mols.some((m) => m.play === 'auto') || svgMs.length ? autoEnd + 300 : 0) : 0;
    let timing = Array.isArray(s.timing) ? s.timing : null;
    if (timing && timing.length !== nSteps) { err(`${w}: timing has ${timing.length} times for ${nSteps} steps`); timing = null; }
    if (timing && timing.some((x, k) => !(x >= 0) || (k && x <= timing[k - 1]))) { err(`${w}: timing must be increasing times in ms`); timing = null; }
    let gap = DEFAULT.gap;
    if (!timing && nSteps) gap = Math.max(DEFAULT.gap, Math.floor((dflt - lead - DEFAULT.build - DEFAULT.tail) / Math.max(1, nSteps - 1 || 1)));
    if (!timing && nSteps > 1) gap = Math.min(gap, 2500);
    s.steps = Array.from({ length: nSteps }, (_, k) => ({ at: timing ? timing[k] : lead + k * gap, dur: DEFAULT.build }));
    let cursor = s.steps.length ? s.steps[s.steps.length - 1].at + DEFAULT.build : entranceEnd;
    s.mols.forEach((m) => { if (m.at == null) { m.at = m.play === 'button' ? cursor + 400 : DEFAULT.sceneAt; if (m.play === 'button') cursor = m.at + m.dur; } });
    const need = Math.max(entranceEnd, cursor, ...s.mols.map((m) => m.at + m.dur)) + DEFAULT.tail;
    s.need = need;
    s.duration = Math.max(dflt, need);
    if (s.duration > dflt && s0.duration != null) warn(`${w}: duration ${dflt} ms is too short for its animations; using ${s.duration} ms`);
    s.autoplay = s.mols.filter((m) => m.play === 'auto').map((m) => m.key);
    deck.slides.push(s);
  });
  if (!deck.slides.length) err('no slide is left for this audience');
  return { deck, errors, warnings };
}

/** Words in a string, for the word budget. */
export const wordCount = (s) => (String(s || '').match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;
