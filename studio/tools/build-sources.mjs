// Builds library/sources.json from the earlier research tables (read only) and library/sources.extra.json.
// Usage: node tools/build-sources.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTables } from './sources.mjs';

const library = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'library');
const RESEARCH = path.join(library, 'research');
const FILES = ['R1_motion_libraries.md', 'R2_science_assets.md', 'R4_3d_molecular.md', 'R5_2d_vector.md', 'R6_ui_themes_motion.md'];

const sources = [];
const seen = new Set();
const add = (s) => {
  let id = s.id || 'source';
  for (let n = 2; seen.has(id); n++) id = `${s.id}-${n}`;
  seen.add(id);
  sources.push({ ...s, id });
};

for (const f of FILES) {
  const rows = parseTables(fs.readFileSync(path.join(RESEARCH, f), 'utf8'), f);
  rows.forEach(add);
  console.log(`${f}: ${rows.length} sources`);
}
const extra = JSON.parse(fs.readFileSync(path.join(library, 'sources.extra.json'), 'utf8'));
const host = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};
for (const s of extra.sources) {
  // an extra entry replaces a table row with the same id or the same website
  for (let i = sources.length - 1; i >= 0; i--) {
    const x = sources[i];
    if (x.id === s.id || x.name.toLowerCase() === s.name.toLowerCase() || (host(s.url) && host(x.url) === host(s.url))) {
      sources.splice(i, 1);
      seen.delete(x.id);
    }
  }
  add({ ...s, origin: { file: 'sources.extra.json' } });
}

const out = { about: 'Index of sources for the Studio. Built by tools/build-sources.mjs. Do not edit by hand; edit sources.extra.json.', built: new Date().toISOString().slice(0, 10), from: [...FILES, 'sources.extra.json'], sources };
fs.writeFileSync(path.join(library, 'sources.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`wrote ${sources.length} sources`);
