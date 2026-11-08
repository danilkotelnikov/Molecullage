// Search over the Studio's source index and references, and live search of open public services.
// Offline:  node tools/search.mjs pcr tube --kind model --no-login --limit 10
// Live:     node tools/search.mjs gold nanoparticle antibody --live pubmed,sketchfab [--add]
// Live search only lists. It downloads no model. --add writes the hits to library/references.json as candidates.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { licenceClass } from './sources.mjs';

const library = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'library');
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(library, name), 'utf8'));

/** Licence classes that may be used in a pitch (not non-commercial, not no-derivatives, not unknown). */
export const USABLE = ['open-free', 'attribution', 'code-permissive', 'per-item', 'share-alike'];
const GROUNDED = ['full-text', 'primary-data'];

/** The sources index and the references, as one list. */
export function loadAll() {
  const sources = readJson('sources.json').sources.map((s) => ({ ...s, origin: s.origin ?? { file: 'sources.json' } }));
  const refs = readJson('references.json').entries.map((e) => ({
    ...e,
    use: e.note,
    licenceClass: licenceClass(e.licence === 'unknown' ? '' : e.licence),
    origin: { file: 'references.json' },
  }));
  return [...refs, ...sources];
}

const words = (q) => q.toLowerCase().split(/[^a-z0-9.]+/).filter(Boolean);
const hay = (e, k) => String(e[k] ?? '').toLowerCase();

/** Ranked search. Every word of the query must appear somewhere in the entry. */
export function searchIndex(entries, query, f = {}) {
  const ws = words(query);
  if (ws.length === 0) return [];
  const out = [];
  for (const e of entries) {
    if (f.kind && e.kind !== f.kind) continue;
    if (f.licenceClass && e.licenceClass !== f.licenceClass) continue;
    if (f.usable && !USABLE.includes(e.licenceClass)) continue;
    if (f.noLogin && (/login|account/i.test(e.access ?? '') || e.status === 'needs-login')) continue;
    if (f.status && e.status !== f.status) continue;
    if (f.grounded && !GROUNDED.includes(e.grounding)) continue;
    const all = [e.name, e.subject, e.id, e.kind, e.use, e.section, e.licenceText].map((x) => String(x ?? '').toLowerCase()).join(' ');
    if (!ws.every((w) => all.includes(w))) continue;
    let score = 0;
    for (const w of ws) {
      if (hay(e, 'name').includes(w)) score += 5;
      if (hay(e, 'subject').includes(w)) score += 5;
      if (hay(e, 'id').includes(w)) score += 3;
      if (hay(e, 'kind').includes(w)) score += 2;
      if (hay(e, 'use').includes(w) || hay(e, 'section').includes(w)) score += 1;
    }
    if (e.origin?.file === 'references.json') score += 1; // a reference already checked beats a catalogue row
    out.push({ ...e, score });
  }
  return out.sort((a, b) => b.score - a.score);
}

// ---- live connectors: each takes (query, fetchFn) and returns candidate reference entries ----
const need = (res, what) => {
  if (!res.ok) throw new Error(`${what}: HTTP ${res.status}`);
  return res.json();
};
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

export const connectors = {
  async polyhaven(query, f = fetch) {
    const assets = await need(await f('https://api.polyhaven.com/assets'), 'Poly Haven');
    const ws = words(query);
    const KIND = { 0: 'hdri', 1: 'texture', 2: 'model' };
    return Object.entries(assets)
      .filter(([id, a]) => {
        const all = [id, a.name, ...(a.categories ?? []), ...(a.tags ?? [])].join(' ').toLowerCase();
        return ws.every((w) => all.includes(w));
      })
      .sort((a, b) => (b[1].download_count ?? 0) - (a[1].download_count ?? 0))
      .slice(0, 20)
      .map(([id, a]) => ({
        id: `polyhaven-${slug(id)}`,
        kind: KIND[a.type] ?? 'model',
        subject: a.name,
        name: `${a.name} (Poly Haven, ${Object.keys(a.authors ?? {}).join(', ') || 'author not listed'})`,
        source: `https://polyhaven.com/a/${id}`,
        licence: 'CC0-1.0',
        formats: a.type === 0 ? ['HDR', 'EXR'] : a.type === 1 ? ['PBR maps'] : ['glTF', 'blend'],
        status: 'candidate',
        grounding: 'n/a',
        note: 'Found by live search. Poly Haven states that all its assets are CC0. File names and sizes are not read yet.',
      }));
  },

  async sketchfab(query, f = fetch) {
    const url = `https://api.sketchfab.com/v3/search?type=models&q=${encodeURIComponent(query)}&downloadable=true&count=24`;
    const body = await need(await f(url), 'Sketchfab');
    const lic = (label = '') =>
      /cc0|public domain/i.test(label) ? 'CC0-1.0'
      : /sharealike/i.test(label) ? 'CC-BY-SA (version not read)'
      : /noncommercial/i.test(label) ? 'CC-BY-NC (version not read)'
      : /noderiv/i.test(label) ? 'CC-BY-ND (version not read)'
      : /attribution/i.test(label) ? 'CC-BY (version not read)'
      : label || 'unknown';
    return (body.results ?? []).map((m) => ({
      id: `sketchfab-${slug(m.viewerUrl.split('/').pop())}`,
      kind: 'model',
      subject: m.name,
      name: `${m.name} (Sketchfab, ${m.user?.displayName ?? 'author not listed'})`,
      source: m.viewerUrl,
      licence: lic(m.license?.label),
      formats: ['glTF', 'GLB', 'USDZ'],
      status: 'needs-login',
      grounding: 'n/a',
      note: `Found by live search. ${m.faceCount ?? '?'} faces, glb ${m.archives?.glb?.size ?? '?'} bytes. A Sketchfab download needs an account. Licence label: ${m.license?.label ?? 'none'}.`,
    }));
  },

  async rcsb(query, f = fetch) {
    const q = { query: { type: 'terminal', service: 'full_text', parameters: { value: query } }, return_type: 'entry', request_options: { paginate: { start: 0, rows: 10 } } };
    const hits = await need(await f(`https://search.rcsb.org/rcsbsearch/v2/query?json=${encodeURIComponent(JSON.stringify(q))}`), 'RCSB search');
    const out = [];
    for (const h of hits.result_set ?? []) {
      const core = await need(await f(`https://data.rcsb.org/rest/v1/core/entry/${h.identifier}`), 'RCSB entry');
      out.push({
        id: `structure-pdb-${h.identifier.toLowerCase()}`,
        kind: 'structure',
        subject: core.struct?.title ?? h.identifier,
        name: `PDB ${h.identifier}`,
        source: `https://www.rcsb.org/structure/${h.identifier}`,
        licence: 'CC0-1.0',
        status: 'candidate',
        grounding: 'not-obtained',
        note: 'Found by live search. The structure file has not been read yet.',
      });
    }
    return out;
  },

  async pubmed(query, f = fetch) {
    const s = await need(await f(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=10&term=${encodeURIComponent(query)}`), 'PubMed search');
    const ids = s.esearchresult?.idlist ?? [];
    if (ids.length === 0) return [];
    const sum = await need(await f(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(',')}`), 'PubMed summary');
    return ids
      .map((id) => ({ id, r: sum.result?.[id] }))
      .filter(({ r }) => r)
      .map(({ id, r }) => ({ id, r, doi: (r.articleids ?? []).find((a) => a.idtype === 'doi')?.value }))
      .filter((x) => x.doi) // a paper needs a DOI
      .map(({ id, r, doi }) => ({
        id: `paper-pmid-${id}`,
        kind: 'paper',
        subject: r.title,
        name: `${r.title} ${r.source} (${r.pubdate})`,
        source: `https://doi.org/${doi}`,
        doi,
        licence: 'per article (not read)',
        status: 'candidate',
        grounding: 'not-obtained',
        note: 'Found by live search. Only the PubMed record was seen. The full text has not been read, so nothing may be taken from it yet.',
      }));
  },
};

/** Adds candidates to a references database object. Skips an id or a source that is already there. */
export function addCandidates(db, candidates, date) {
  const added = [];
  for (const c of candidates) {
    if (db.entries.some((e) => e.id === c.id || e.source === c.source)) continue;
    const entry = { ...c, checked: date, note: c.note ?? 'Found by live search. Not checked.' };
    db.entries.push(entry);
    added.push(entry);
  }
  return added;
}

// ---- command line ----
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (name) => {
    const i = args.indexOf(`--${name}`);
    if (i < 0) return undefined;
    const v = args[i + 1];
    args.splice(i, v && !v.startsWith('--') ? 2 : 1);
    return v && !v.startsWith('--') ? v : true;
  };
  const filters = { kind: opt('kind'), licenceClass: opt('class'), usable: !!opt('usable'), noLogin: !!opt('no-login'), status: opt('status'), grounded: !!opt('grounded') };
  const limit = Number(opt('limit') ?? 15);
  const live = opt('live');
  const add = !!opt('add');
  const asJson = !!opt('json');
  const query = args.join(' ');

  if (live) {
    const found = [];
    for (const name of String(live).split(',')) {
      if (!connectors[name]) throw new Error(`no connector "${name}". Known: ${Object.keys(connectors).join(', ')}`);
      const r = await connectors[name](query);
      console.log(`${name}: ${r.length} hits`);
      found.push(...r);
    }
    found.slice(0, 40).forEach((c) => console.log(`- ${c.id} | ${c.licence} | ${c.status} | ${c.name}\n    ${c.source}`));
    if (add) {
      const f = path.join(library, 'references.json');
      const db = JSON.parse(fs.readFileSync(f, 'utf8'));
      const added = addCandidates(db, found, new Date().toISOString().slice(0, 10));
      fs.writeFileSync(f, JSON.stringify(db, null, 2) + '\n');
      console.log(`added ${added.length} candidates to references.json`);
    }
  } else {
    const hits = searchIndex(loadAll(), query, filters).slice(0, limit);
    if (asJson) console.log(JSON.stringify(hits, null, 2));
    else if (hits.length === 0) console.log('no hits');
    else hits.forEach((h) => console.log(`${String(h.score).padStart(3)}  ${h.id} | ${h.kind} | ${h.licenceClass} | ${h.status ?? h.access ?? ''} | ${h.name}\n     ${h.url ?? h.source ?? ''}`));
  }
}
