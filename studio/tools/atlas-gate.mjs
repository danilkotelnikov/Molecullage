// Mechanical gate for the software atlas. Usage:
//   node tools/atlas-gate.mjs links     fetch each cited page once, test every capability against its page
//   node tools/atlas-gate.mjs sample    pick a seeded sample for the human-style reviewer
//   node tools/atlas-gate.mjs freeze    store the hash of every atlas file in library/atlas/FREEZE.json
//   node tools/atlas-gate.mjs verify    recompute the hashes and name every file that changed
// It only reads public pages, politely (2 requests per host at a time). It saves no page text.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadDomains, ATLAS_DIR } from './atlas.mjs';

const ROOT = path.resolve(ATLAS_DIR, '..');
const STOP = new Set('about above after again being below between could does doing during each from have having into more most other over same should some such than that their them then there these they this those through under until very were what when where which while will with would your'.split(' '));

export const normalise = (s) => String(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** Longest run of words that `does` shares with the page, as a count of words. */
export function longestShared(does, page) {
  const a = normalise(does).split(' ');
  const hay = ` ${normalise(page)} `;
  let best = 0;
  for (let i = 0; i < a.length; i++)
    for (let n = Math.max(best + 1, 1); i + n <= a.length; n++) {
      if (hay.includes(` ${a.slice(i, i + n).join(' ')} `)) best = n; else break;
    }
  return best;
}

/** Share of the content words of the claim (words of 5+ letters) that the page contains. */
export function support(cap, page) {
  const words = [...new Set(normalise(`${cap.does} ${cap.feature.replace(/-/g, ' ')}`).split(' '))].filter((w) => w.length >= 5 && !STOP.has(w));
  if (!words.length) return 1;
  const hay = normalise(page);
  return words.filter((w) => hay.includes(w.slice(0, Math.max(5, w.length - 2)))).length / words.length;
}

export function htmlToText(h) {
  return h.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ');
}

export function mulberry32(seed) {
  let a = [...String(seed)].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0), 7);
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
export function atlasFiles(root = ROOT) {
  const out = [];
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name !== 'review') walk(p); }
    else if (/\.(json|md)$/.test(e.name) && e.name !== 'FREEZE.json') out.push(path.relative(root, p).replace(/\\/g, '/'));
  });
  walk(root);
  return out.sort();
}
export function freezeState(root = ROOT) {
  return Object.fromEntries(atlasFiles(root).map((f) => [f, sha(fs.readFileSync(path.join(root, f)))]));
}
export function diffFreeze(frozen, now) {
  const bad = [];
  for (const f of new Set([...Object.keys(frozen), ...Object.keys(now)])) {
    if (!(f in frozen)) bad.push(`new file ${f}`); else if (!(f in now)) bad.push(`missing ${f}`); else if (frozen[f] !== now[f]) bad.push(`changed ${f}`);
  }
  return bad;
}

/** Runs fn over the urls, at most `global` at once and `perHost` per host. Resolves to [[url, result], ...]. */
export function mapLimit(items, perHost, global, fn) {
  const busy = new Map(); const pending = items.map((_, i) => i); const results = [];
  let running = 0;
  return new Promise((resolve) => {
    const pump = () => {
      while (running < global) {
        const at = pending.findIndex((i) => (busy.get(new URL(items[i]).host) ?? 0) < perHost);
        if (at < 0) break;
        const it = items[pending.splice(at, 1)[0]]; const host = new URL(it).host;
        busy.set(host, (busy.get(host) ?? 0) + 1); running++;
        fn(it).catch((e) => ({ error: String(e) })).then((r) => {
          results.push([it, r]); busy.set(host, busy.get(host) - 1); running--; pump();
        });
      }
      if (!pending.length && !running) resolve(results);
    };
    pump();
  });
}

async function fetchPage(url) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 25000);
  try {
    const r = await fetch(url, { signal: ctl.signal, redirect: 'follow', headers: { 'user-agent': 'molecullage-atlas-check/1.0 (research; contact via repo owner)', accept: 'text/html,text/plain,application/json;q=0.9,*/*;q=0.5' } });
    const type = r.headers.get('content-type') ?? '';
    if (!r.ok) return { status: r.status, ok: false };
    if (!/text|json|xml|html/.test(type)) return { status: r.status, ok: true, nonText: true, type };
    const raw = (await r.text()).slice(0, 3_000_000);
    return { status: r.status, ok: true, text: /html/.test(type) ? htmlToText(raw) : raw };
  } catch (e) { return { status: 0, ok: false, error: e.name }; } finally { clearTimeout(t); }
}

async function links(only) {
  const all = loadDomains(ATLAS_DIR);
  const domains = only ? Object.fromEntries(Object.entries(all).filter(([n]) => only.includes(n))) : all;
  const caps = [];
  for (const [dn, d] of Object.entries(domains)) for (const e of d.entries) for (const c of e.capabilities ?? []) caps.push({ domain: dn, entry: e.id, feature: c.feature, does: c.does, source: c.source, basis: c.basis, area: c.area });
  const urls = [...new Set(caps.map((c) => c.source))];
  console.log(`${caps.length} capabilities, ${urls.length} distinct pages`);
  const pages = new Map(await mapLimit(urls, 2, 8, fetchPage));
  const file = path.join(ROOT, 'review', 'links.json');
  const kept = only && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).rows.filter((r) => !only.includes(r.domain)) : [];
  const fresh = caps.map((c) => {
    const p = pages.get(c.source) ?? { ok: false, status: -1 };
    const row = { ...c, status: p.status, reachable: !!p.ok };
    if (p.text) { row.copyWords = longestShared(c.does, p.text); row.support = +support(c, p.text).toFixed(2); }
    else row.unreadable = p.ok ? 'non-text' : `http ${p.status}${p.error ? ' ' + p.error : ''}`;
    return row;
  });
  const rows = [...kept, ...fresh];
  const sum = (f) => rows.filter(f).length;
  const summary = {
    capabilities: rows.length, pages: new Set(rows.map((r) => r.source)).size,
    unreachablePages: new Set(rows.filter((r) => !r.reachable).map((r) => r.source)).size,
    byDomain: Object.fromEntries([...new Set(rows.map((r) => r.domain))].map((d) => { const x = rows.filter((r) => r.domain === d); return [d, { n: x.length, unreadable: x.filter((r) => r.unreadable).length, copied: x.filter((r) => (r.copyWords ?? 0) >= 8).length, weak: x.filter((r) => r.support < 0.5).length }]; })),
    copied: sum((r) => (r.copyWords ?? 0) >= 8),
    weak: sum((r) => r.support !== undefined && r.support < 0.5),
    read: sum((r) => r.support !== undefined),
    supported: sum((r) => r.support >= 0.5 && (r.copyWords ?? 0) < 8),
  };
  fs.mkdirSync(path.join(ROOT, 'review'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'review', 'links.json'), JSON.stringify({ checked: new Date().toISOString(), summary, rows }, null, 1));
  console.log(JSON.stringify(summary));
}

function sample(perDomain = 8, seed = 'atlas-2026-11-02') {
  const f = path.join(ROOT, 'review', 'links.json');
  const rows = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).rows : [];
  const by = {}; rows.forEach((r) => (by[r.domain] ??= []).push(r));
  const rnd = mulberry32(seed); const out = [];
  for (const [dn, list] of Object.entries(by)) {
    const flagged = list.filter((r) => r.support < 0.5 || r.copyWords >= 8 || r.unreadable).sort(() => rnd() - 0.5);
    const rest = list.filter((r) => !flagged.includes(r)).sort(() => rnd() - 0.5);
    const pick = [...flagged.slice(0, Math.ceil(perDomain / 2)), ...rest].slice(0, perDomain);
    pick.forEach((r) => out.push({ domain: dn, entry: r.entry, feature: r.feature, does: r.does, source: r.source, basis: r.basis, autoFlag: r.unreadable ?? (r.copyWords >= 8 ? 'copy' : r.support < 0.5 ? 'weak' : 'none') }));
  }
  fs.writeFileSync(path.join(ROOT, 'review', 'sample.json'), JSON.stringify(out, null, 1));
  console.log(`sample of ${out.length} written`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2];
  if (cmd === 'links') await links(process.argv[3]?.startsWith('--domains=') ? process.argv[3].slice(10).split(',') : null);
  else if (cmd === 'sample') sample(Number(process.argv[3] ?? 8));
  else if (cmd === 'freeze') { fs.writeFileSync(path.join(ROOT, 'FREEZE.json'), JSON.stringify({ frozen: new Date().toISOString(), files: freezeState() }, null, 1)); console.log('frozen', atlasFiles().length, 'files'); }
  else if (cmd === 'verify') {
    const bad = diffFreeze(JSON.parse(fs.readFileSync(path.join(ROOT, 'FREEZE.json'), 'utf8')).files, freezeState());
    console.log(bad.length ? bad.join('\n') : 'freeze intact'); process.exitCode = bad.length ? 1 : 0;
  } else console.log('usage: atlas-gate.mjs links|sample|freeze|verify');
}
