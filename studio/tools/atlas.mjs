// The software atlas. Usage: node tools/atlas.mjs [check|report|features]
// Reads library/atlas/domains/*.json (one file per domain), checks the shape, and rolls the capabilities up into features.
// It never fetches anything. The entries are research notes in our own words; they are not product text.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DOMAINS = ['dcc-3d', 'cad-geometry', 'motion-video', 'design-2d', 'realtime-render', 'science-viz', 'gen-3d', 'gen-vector'];
export const AREAS = [
  'modeling-surface', 'modeling-polygon', 'modeling-subd', 'modeling-sculpt', 'modeling-procedural', 'modeling-parametric-cad',
  'modeling-scan-reconstruction', 'uv-texturing', 'materials-shading', 'lighting', 'camera-lens', 'rendering-offline',
  'rendering-realtime', 'rigging-skeleton', 'animation-keyframe', 'animation-procedural', 'animation-character',
  'simulation-rigid', 'simulation-soft-cloth', 'simulation-fluid-particles', 'effects-cloners-fields', 'compositing-node',
  'colour-grading', 'editing-timeline', 'audio', 'motion-graphics', 'typography', 'vector-drawing', 'raster-painting',
  'raster-editing', 'layout-publishing', 'diagramming', 'data-visualisation', 'molecular-visualisation',
  'scientific-computation', 'scripting-automation', 'pipeline-interchange', 'collaboration-versioning', 'ai-generative',
  'ai-assist', 'export-delivery', 'interaction-prototyping', 'other',
];
const KINDS = ['application', 'library', 'engine', 'model', 'format', 'service'];
const LICENCES = ['proprietary', 'open-source', 'source-available', 'freemium', 'unknown'];
const STATUS = ['active', 'discontinued', 'unknown'];
const BASIS = ['manual', 'paper', 'source', 'patent', 'observed', 'release-notes', 'model-card', 'search-excerpt'];
const STUDY = ['open-source-readable', 'public-docs-only', 'closed', 'unknown'];
const MAX_WORDS = 45;
const words = (s) => String(s).trim().split(/\s+/).filter(Boolean).length;
const https = (u) => typeof u === 'string' && /^https:\/\/[^\s/]+\.[^\s/]+/.test(u);

/** Returns a list of problems in one domain file. Empty means the shape is right. */
export function validateDomain(d, name = d?.domain) {
  const bad = [];
  const at = (where, msg) => bad.push(`${name}: ${where}: ${msg}`);
  if (!d || typeof d !== 'object') return [`${name}: not an object`];
  if (!d.domain) at('domain', 'missing');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.checked ?? '')) at('checked', 'needs a YYYY-MM-DD date');
  const en = d.enumeration;
  if (!en || !Array.isArray(en.frames) || !en.frames.length || !en.frames.every((f) => f.name && https(f.url))) at('enumeration.frames', 'needs at least one {name, https url}: the list the sweep started from');
  if (!en || !Array.isArray(en.excluded)) at('enumeration.excluded', 'needs a list (may be empty) of {name, reason}');
  if (!Array.isArray(d.entries) || !d.entries.length) return [...bad, `${name}: entries: needs at least one`];
  const ids = new Set();
  for (const e of d.entries) {
    const w = `entry ${e?.id ?? '?'}`;
    if (!e.id || !/^[a-z0-9][a-z0-9.-]*$/.test(e.id)) at(w, 'id must be kebab-case');
    if (ids.has(e.id)) at(w, 'duplicate id');
    ids.add(e.id);
    if (!e.name) at(w, 'name missing');
    if (!KINDS.includes(e.kind)) at(w, `kind "${e.kind}" not in ${KINDS}`);
    if (!STATUS.includes(e.status)) at(w, `status "${e.status}"`);
    if (!LICENCES.includes(e.licence?.type)) at(w, `licence.type "${e.licence?.type}"`);
    if (!https(e.url)) at(w, 'url must be an https link');
    if (!/^\d{4}-\d{2}-\d{2}/.test(e.verified ?? '')) at(w, 'verified must start with a date and say how');
    if (!STUDY.includes(e.rea?.studyable)) at(w, `rea.studyable "${e.rea?.studyable}"`);
    if (!Array.isArray(e.rea?.public_sources)) at(w, 'rea.public_sources must be a list');
    const caps = e.capabilities ?? [];
    if (e.kind !== 'format' && !caps.length) at(w, 'needs at least one capability');
    for (const c of caps) {
      const cw = `${w} / ${c?.feature ?? '?'}`;
      if (!AREAS.includes(c.area)) at(cw, `area "${c.area}" not in the list`);
      if (!/^[a-z0-9][a-z0-9-]*$/.test(c.feature ?? '')) at(cw, 'feature must be a kebab-case slug');
      if (!c.does || words(c.does) > MAX_WORDS) at(cw, `does must be 1 to ${MAX_WORDS} words, in our own words`);
      if (!https(c.source)) at(cw, 'source must be an https link');
      if (!BASIS.includes(c.basis)) at(cw, `basis "${c.basis}"`);
    }
    if (e.kind === 'model' && !e.model?.hardware) at(w, 'a model entry needs model.hardware (cpu_ok, min_vram_gb)');
  }
  return bad;
}

export function loadDomains(dir) {
  const out = {};
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) out[f.slice(0, -5)] = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  return out;
}

/** Groups capabilities by feature slug: which products show it, in which area. */
export function rollup(domains) {
  const map = new Map();
  for (const [dn, d] of Object.entries(domains))
    for (const e of d.entries ?? [])
      for (const c of e.capabilities ?? []) {
        const f = map.get(c.feature) ?? { feature: c.feature, areas: new Set(), products: new Set(), domains: new Set(), does: c.does };
        f.areas.add(c.area); f.products.add(e.id); f.domains.add(dn);
        map.set(c.feature, f);
      }
  return [...map.values()]
    .map((f) => ({ feature: f.feature, areas: [...f.areas], domains: [...f.domains], products: [...f.products].sort(), does: f.does }))
    .sort((a, b) => b.products.length - a.products.length || a.feature.localeCompare(b.feature));
}

const here = path.dirname(fileURLToPath(import.meta.url));
export const ATLAS_DIR = path.resolve(here, '..', 'library', 'atlas', 'domains');

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const domains = loadDomains(ATLAS_DIR);
  const cmd = process.argv[2] ?? 'report';
  if (cmd === 'check') {
    const bad = DOMAINS.filter((n) => !domains[n]).map((n) => `${n}: file missing`).concat(Object.entries(domains).flatMap(([n, d]) => validateDomain(d, n)));
    console.log(bad.length ? bad.join('\n') : 'atlas ok');
    process.exitCode = bad.length ? 1 : 0;
  } else if (cmd === 'features') {
    console.log(JSON.stringify(rollup(domains), null, 2));
  } else {
    const feats = rollup(domains);
    for (const [n, d] of Object.entries(domains)) {
      const caps = d.entries.reduce((s, e) => s + (e.capabilities?.length ?? 0), 0);
      console.log(`${n.padEnd(16)} entries ${String(d.entries.length).padStart(3)}  capabilities ${String(caps).padStart(4)}  excluded ${d.enumeration?.excluded?.length ?? 0}`);
    }
    console.log(`features (distinct slugs): ${feats.length}; seen in 3+ products: ${feats.filter((f) => f.products.length >= 3).length}`);
  }
}
