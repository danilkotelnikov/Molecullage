// The nine layouts. Each takes a resolved slide (deck/manifest.mjs) and a context and returns the slide's HTML.
//   ctx.asset(src)  -> the URL (or data URI) of a file in the deck folder
//   ctx.scene(id)   -> { kind: 'webgl' | 'video', src?, title }  what the build decided for a scene
//   ctx.deck        -> the resolved deck
// A node that builds with a step carries data-step="k" (k >= 1); the runtime reads the times from the slide's `steps`.
// Entrance animations at slide start carry data-step="0", data-at and data-dur.

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Small markup for slide text: **bold**, _{sub}, ^{sup}, a line break for \n. Everything else is text. */
export const rich = (s) => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  .replace(/_\{([^}]+)\}/g, '<sub>$1</sub>')
  .replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>')
  .replace(/\n/g, '<br>');

const stepAttr = (o, dflt = 'fade-up') => (o.step ? ` data-step="${o.step}" data-effect="${esc(o.effect || dflt)}"` : '');
const enter = (at, effect = 'fade-up', dur = 500) => ` data-step="0" data-at="${at}" data-dur="${dur}" data-effect="${effect}"`;

const head = (s) => `<header class="hd"><div class="bar"></div>${s.kicker ? `<div class="kicker">${rich(s.kicker)}</div>` : ''}<h1${enter(0)}>${rich(s.title)}</h1>${s.subtitle ? `<p class="sub"${enter(150)}>${rich(s.subtitle)}</p>` : ''}</header>`;

function device(b, ctx) {
  const frame = b.frame || 'browser';
  const shot = b.src ? `<img class="shot" src="${esc(ctx.asset(b.src))}" alt="${esc(b.alt || b.title || '')}">` : `<div class="shot none">${esc(b.title || 'Live view')}</div>`;
  const live = b.url ? `<iframe class="live" data-src="${esc(b.url)}" title="${esc(b.title || b.url)}" tabindex="-1"></iframe>` : '';
  const bar = frame === 'phone' ? '<div class="notch"></div>' : `<div class="dots"><i class="d1"></i><i class="d2"></i><i class="d3"></i></div><div class="url">${esc(b.title || b.url || '')}</div>`;
  return `<figure class="device ${frame}"${stepAttr(b, 'fade')}><div class="top">${bar}</div><div class="screen">${shot}${live}</div>${frame === 'laptop' ? '<div class="base"></div>' : ''}${b.caption ? `<figcaption>${rich(b.caption)}</figcaption>` : ''}</figure>`;
}

/** A drawing of the deck folder, put into the page itself so that its parts can build and animate. data-s="k" is the k-th step of the block. */
function svg(b, ctx) {
  // <image href="img/x.png"> of the deck folder becomes a data URI (or the preview's URL); no other link is allowed
  const IMG = /(<image\b[^>]*?\s)href="([^"#:\/][^":]*)"/g;
  const src0 = ctx.text(b.src).replace(/<\?xml[^>]*\?>/g, '').trim();
  if (!/^<svg[\s>]/.test(src0) || /<script|<foreignObject|\son[a-z]+\s*=|javascript:|href\s*=\s*["'](?!#)/i.test(src0.replace(IMG, '$1'))) throw new Error(`${b.src}: not a plain SVG (scripts, handlers and links are not allowed)`);
  const raw = src0.replace(IMG, (_, a, h) => `${a}href="${esc(ctx.asset(h))}"`);
  const body = raw.replace(/data-s="(\d+)"/g, (_, k) => {
    const n = b.stepNums?.[+k - 1];
    if (!n) throw new Error(`${b.src}: data-s="${k}" but the block has "steps": ${b.steps || 0}`);
    return `data-step="${n}" data-effect="fade"`;
  });
  return `<div class="svgblk"${stepAttr(b, 'fade')}>${body}</div>`;
}

function mol(b, ctx) {
  const sc = ctx.scene(b.scene);
  const m = ctx.molOf(b.key);
  const inner = sc.kind === 'video'
    ? `<video class="mol-view" src="${esc(ctx.asset(sc.src))}" muted playsinline preload="auto"${sc.loop === false ? '' : ' loop'}></video>`
    : '<div class="mol-view"></div>';
  return `<div class="mol ${sc.kind}" data-scene="${esc(b.scene)}" data-key="${esc(b.key)}" data-kind="${sc.kind}" data-at="${m.at}" data-dur="${m.dur}" data-play="${m.play}"${stepAttr(b, 'fade')}>${inner}`
    + `<div class="ui mol-ui">${sc.kind === 'webgl' ? '<button data-act="play" title="▶">▶</button>' : ''}<button data-act="pop" title="⤢">⤢</button></div>`
    + `<div class="mol-cap">${esc(sc.title)}</div></div>`;
}

function block(b, ctx) {
  switch (b.type) {
    case 'text': return `<p class="tx"${stepAttr(b)}>${rich(b.text)}</p>`;
    case 'list': return `<${b.ordered ? 'ol' : 'ul'} class="ls">${b.items.map((it) => `<li${stepAttr(it)}>${rich(it.text)}</li>`).join('')}</${b.ordered ? 'ol' : 'ul'}>`;
    case 'image': return `<figure class="img"${stepAttr(b, 'fade')}><img src="${esc(ctx.asset(b.src))}" alt="${esc(b.alt || '')}">${b.caption ? `<figcaption>${rich(b.caption)}</figcaption>` : ''}</figure>`;
    case 'device': return device(b, ctx);
    case 'svg': return svg(b, ctx);
    case 'mol': return mol(b, ctx);
    default: return '';
  }
}
const col = (v, ctx) => [].concat(v || []).map((b) => block(b, ctx)).join('');

const card = (it, ctx) => `<div class="card"${stepAttr(it)}><div class="ph">${it.src ? `<img src="${esc(ctx.asset(it.src))}" alt="${esc(it.alt || it.title)}">` : ''}${it.chip ? `<span class="chip ${esc(it.kind)}">${rich(it.chip)}</span>` : ''}</div><div class="nm">${rich(it.title)}</div>${it.text ? `<div class="ln">${rich(it.text)}</div>` : ''}${it.note ? `<div class="nt">${rich(it.note)}</div>` : ''}</div>`;

export const LAYOUT_HTML = {
  title: (s) => `<div class="band"></div><div class="mid"><div class="kicker"${enter(0, 'fade')}>${rich(s.kicker || '')}</div><h1${enter(100)}>${rich(s.title)}</h1>${s.subtitle ? `<p class="sub"${enter(350)}>${rich(s.subtitle)}</p>` : ''}</div>${s.meta ? `<div class="meta"${enter(600, 'fade')}>${rich(s.meta)}</div>` : ''}`,
  section: (s, ctx) => `<div class="band"></div><div class="mid"><div class="num"${enter(0, 'fade')}>${String(ctx.index + 1).padStart(2, '0')}</div><h1${enter(150)}>${rich(s.title)}</h1>${s.subtitle ? `<p class="sub"${enter(400)}>${rich(s.subtitle)}</p>` : ''}</div>`,
  'two-column': (s, ctx) => `${head(s)}<div class="cols" style="--split:${esc(s.split || '1fr 1fr')}"><div class="c l">${col(s.left, ctx)}</div><div class="c r">${col(s.right, ctx)}</div></div>`,
  figure: (s, ctx) => `${head(s)}<div class="fig-area">${col(s.figure, ctx)}</div>${s.caption ? `<p class="cap"${enter(400, 'fade')}>${rich(s.caption)}</p>` : ''}`,
  number: (s) => `${head(s)}<div class="nums n${s.items.length}">${s.items.map((it) => {
    const raw = String(it.value);
    const count = it.countup !== false && /^[0-9]+([.,][0-9]+)?$/.test(raw);
    return `<div class="stat"${stepAttr(it)}><div class="v"${count ? ` data-count="${esc(raw.replace(',', '.'))}" data-dec="${(raw.split(/[.,]/)[1] || '').length}"` : ''}>${esc(raw)}</div>${it.unit ? `<div class="u">${rich(it.unit)}</div>` : ''}<div class="l">${rich(it.label || '')}</div></div>`;
  }).join('')}</div>`,
  timeline: (s) => `${head(s)}<div class="tl n${s.items.length}"><div class="axis"></div>${s.items.map((it) => `<div class="ev"${stepAttr(it)}><div class="when">${rich(it.when)}</div><i class="node"></i><div class="what">${rich(it.title || '')}</div>${it.text ? `<div class="more">${rich(it.text)}</div>` : ''}</div>`).join('')}</div>`,
  cards: (s, ctx) => `${head(s)}<div class="cards n${s.items.length}">${s.items.map((it) => card(it, ctx)).join('')}</div>${s.caption ? `<p class="cap"${enter(400, 'fade')}>${rich(s.caption)}</p>` : ''}`,
  table: (s) => `${head(s)}<table class="tb"><thead><tr>${s.columns.map((c) => `<th>${rich(c)}</th>`).join('')}</tr></thead><tbody>${s.rows.map((r, k) => `<tr${s.rowSteps ? ` data-step="${s.rowSteps[k]}" data-effect="fade"` : ''}${s.highlight === k ? ' class="hl"' : ''}>${r.map((c) => `<td>${rich(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>${s.caption ? `<p class="cap"${enter(400, 'fade')}>${rich(s.caption)}</p>` : ''}`,
  page: pageHtml,
  molecule: (s, ctx) => `<div class="mcols"><div class="mtext">${head(s)}${s.bullets ? block({ type: 'list', ...s.bullets, items: s.bullets.items }, ctx) : ''}${s.caption ? `<p class="cap"${enter(400, 'fade')}>${rich(s.caption)}</p>` : ''}</div><div class="mstage">${mol({ scene: s.scene, key: s.molKey, ...(s.stageStep ? {} : {}) }, ctx)}</div></div>`,
};

/** A figure page: the finished picture is the slide. A raster page with `reveal` is one <image> drawn once and used again for the part outside the regions and for each region, clipped; each region carries its step. */
function pageHtml(s, ctx) {
  if (s.pageBlock) return `<div class="pgwrap">${svg(s.pageBlock, ctx)}</div>`;
  const src = esc(ctx.asset(s.page));
  if (!s.reveal || !s.reveal.length) return `<img class="pgimg" src="${src}" alt="${esc(s.alt)}">`;
  const W = 1920, H = 1080, id = `pg${ctx.index}`;
  const box = (r) => { const [x, y, w, h] = r.map((v, k) => v * (k % 2 ? H : W)); return `M${x.toFixed(1)} ${y.toFixed(1)}h${w.toFixed(1)}v${h.toFixed(1)}h${(-w).toFixed(1)}z`; };
  const clips = [`<clipPath id="${id}c0"><path clip-rule="evenodd" d="M0 0H${W}V${H}H0z${s.reveal.map((r) => box(r.rect)).join('')}"/></clipPath>`]
    .concat(s.reveal.map((r, k) => `<clipPath id="${id}c${k + 1}"><path d="${box(r.rect)}"/></clipPath>`));
  const uses = [`<use href="#${id}" clip-path="url(#${id}c0)"/>`].concat(s.reveal.map((r, k) => `<use href="#${id}" clip-path="url(#${id}c${k + 1})"${stepAttr(r, 'fade')}/>`));
  return `<svg class="pgimg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(s.alt)}"><defs><image id="${id}" href="${src}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid meet"/>${clips.join('')}</defs>${uses.join('')}</svg>`;
}

/** One slide as a <section>. `index` is the slide's position, `count` the number of slides. */
export function slideHtml(s, index, ctx) {
  const c = { ...ctx, index, molOf: (key) => s.mols.find((m) => m.key === key) };
  const foot = s.layout === 'page' ? (ctx.deck.counter ? `<div class="pgn">${index + 1} / ${ctx.deck.slides.length}</div>` : '') : `<div class="foot"><span class="bd">${esc(ctx.deck.boundary)}</span><span class="pg">${index + 1} / ${ctx.deck.slides.length}</span></div>`;
  return `<section class="slide L-${s.layout}${s.size === 'large' ? ' large' : s.size === 'full' ? ' full' : ''}" data-i="${index}" data-id="${esc(s.id)}"><div class="in">${LAYOUT_HTML[s.layout](s, c)}${s.caption && ['two-column', 'number', 'timeline'].includes(s.layout) ? `<p class="cap"${enter(400, 'fade')}>${rich(s.caption)}</p>` : ''}</div>${['title', 'section'].includes(s.layout) ? '' : foot}</section>`;
}
