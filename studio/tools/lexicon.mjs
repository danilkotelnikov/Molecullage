import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLexicon } from '../core/prose.ts';

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_DIR = path.resolve(TOOLS_DIR, '..');
const FIXTURE_LEXICON_DIR = path.join(STUDIO_DIR, 'core', 'test', 'fixtures', 'lexicon');
const ARC_LEXICON_DIR = path.join(os.homedir(), 'arc-harness', 'shared', 'lexicon');

export function loadLexicon(dir) {
  const candidates = [
    dir ? (path.isAbsolute(dir) ? dir : path.resolve(STUDIO_DIR, dir)) : null,
    process.env.ARC_LEXICON,
    ARC_LEXICON_DIR,
    FIXTURE_LEXICON_DIR,
  ].filter(Boolean);

  const chosen = candidates.find(
    (d) =>
      fs.existsSync(path.join(d, 'refused.en.txt')) &&
      fs.existsSync(path.join(d, 'refused.ru.txt')) &&
      fs.existsSync(path.join(d, 'terms.en-ru.tsv')) &&
      fs.existsSync(path.join(d, 'anglicisms.ru.tsv')),
  ) ?? FIXTURE_LEXICON_DIR;

  return parseLexicon({
    refusedEn: fs.readFileSync(path.join(chosen, 'refused.en.txt'), 'utf8'),
    refusedRu: fs.readFileSync(path.join(chosen, 'refused.ru.txt'), 'utf8'),
    terms: fs.readFileSync(path.join(chosen, 'terms.en-ru.tsv'), 'utf8'),
    anglicisms: fs.readFileSync(path.join(chosen, 'anglicisms.ru.tsv'), 'utf8'),
  });
}
