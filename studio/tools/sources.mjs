// Reads the markdown tables of the earlier source research and turns each row into a source entry.
// Pure functions: no file or network access here. tools/build-sources.mjs does the reading and writing.

/** A licence text -> a class the search can filter on. */
export function licenceClass(text = '') {
  const s = text.toLowerCase();
  if (/per (icon|entry|item|model|asset|image)|check each|varies|mixed|each (entry|item)/.test(s)) return 'per-item';
  if (/\bnc\b|non-?commercial|-nc\b/.test(s)) return 'non-commercial';
  if (/\bnd\b|-nd\b|no ?deriv/.test(s)) return 'no-derivatives';
  if (/share-?alike|-sa\b|\bsa\b/.test(s)) return 'share-alike';
  if (/agpl|lgpl|gpl|copyleft/.test(s)) return 'copyleft';
  if (/cc0|public domain|\bpdm\b|unlicense/.test(s)) return 'open-free';
  if (/cc[ -]by|attribution/.test(s)) return 'attribution';
  if (/\bmit\b|apache|\bbsd\b|\bisc\b|\bofl\b|\bmpl\b|zlib/.test(s)) return 'code-permissive';
  return 'check';
}

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

// The kind of a source, from the research file and the section it sits in.
function kindFor(file, section) {
  if (file.startsWith('R2')) {
    if (/^A\./.test(section)) return 'vector-icons';
    if (/^B\./.test(section)) return '3d-models-materials-hdri';
    if (/^C\./.test(section)) return 'molecular-computational';
    if (/^D\./.test(section)) return 'graph-schematic-vector-engines';
    if (/^E\./.test(section)) return 'generative-3d';
    return 'asset-source';
  }
  if (file.startsWith('R4')) return '3d-molecular-tools';
  if (file.startsWith('R5')) return /^2b/i.test(section) ? 'icon-illustration-sources' : '2d-frameworks-fonts';
  if (file.startsWith('R1')) return 'motion-libraries';
  if (file.startsWith('R6')) return 'ui-themes-motion';
  return 'other';
}

const cells = (line) =>
  line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim());

const FIRST_URL = /https?:\/\/[^\s)|·<>]+/;
const clean = (s) => s.replace(/\*\*/g, '').replace(/\[(.*?)\]\((.*?)\)/g, '$1').trim();

/** Parses every table of a research file. `file` is the file name, used for the kind and the origin. */
export function parseTables(markdown, file) {
  const lines = markdown.split(/\r?\n/);
  const out = [];
  let section = '';
  for (let i = 0; i < lines.length; i++) {
    const h = /^#{2,3}\s+(.*)$/.exec(lines[i]);
    if (h) section = h[1].trim();
    if (!/^\|\s*(Name|Library)\s*\|/i.test(lines[i])) continue;
    const head = cells(lines[i]).map((c) => c.toLowerCase());
    const col = (re) => head.findIndex((c) => re.test(c));
    const idx = {
      licence: col(/licen/),
      url: col(/^(url|source|ref)\b/),
      formats: col(/formats|output/),
      use: col(/best molecullage use|best use|what it does/),
      verdict: col(/verdict/),
      tier: col(/tier/),
      evidence: col(/^ev\.?$|evidence/),
      access: col(/bulk|api|access/),
    };
    for (let j = i + 2; j < lines.length && /^\|/.test(lines[j]); j++) {
      const c = cells(lines[j]);
      const name = clean(c[0] ?? '');
      if (!name || /^-+$/.test(name)) continue;
      const get = (k) => (idx[k] >= 0 ? clean(c[idx[k]] ?? '') : '');
      const url = (FIRST_URL.exec(lines[j]) ?? [''])[0].replace(/[.,;]+$/, '');
      const licenceText = get('licence');
      const formats = get('formats')
        ? get('formats')
            .split(/[,;/]|\band\b/)
            .map((x) => x.trim())
            .filter(Boolean)
        : [];
      out.push({
        id: `${slug(name)}`,
        name,
        kind: kindFor(file, section),
        section,
        licenceText,
        licenceClass: licenceClass(licenceText),
        url,
        formats,
        use: get('use'),
        verdict: get('verdict'),
        tier: get('tier'),
        evidence: get('evidence'),
        access: get('access'),
        origin: { file, line: j + 1 },
      });
    }
  }
  return out;
}
