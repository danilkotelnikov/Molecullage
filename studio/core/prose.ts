export type Lexicon = {
  refusedEn: string[];
  refusedRu: string[];
  terms: { en: string; ru: string; avoidEn: string[]; avoidRu: string[] }[];
  anglicisms: { word: string; ru: string }[];
};

function nonCommentLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parseLexicon(files: {
  refusedEn: string;
  refusedRu: string;
  terms: string;
  anglicisms: string;
}): Lexicon {
  const refusedEn = nonCommentLines(files.refusedEn);
  const refusedRu = nonCommentLines(files.refusedRu);

  const termLines = nonCommentLines(files.terms).slice(1);
  const terms = termLines.map((line) => {
    const cols = line.split('\t');
    const en = (cols[0] ?? '').trim();
    const ru = (cols[1] ?? '').trim();
    const avoidEn = (cols[2] ?? '')
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);
    const avoidRu = (cols[3] ?? '')
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);
    return { en, ru, avoidEn, avoidRu };
  });

  const angLines = nonCommentLines(files.anglicisms).slice(1);
  const anglicisms = angLines.map((line) => {
    const cols = line.split('\t');
    return {
      word: (cols[0] ?? '').trim(),
      ru: (cols[1] ?? '').trim(),
    };
  });

  return { refusedEn, refusedRu, terms, anglicisms };
}

export function proseFindings(text: string, lang: 'en' | 'ru', lex: Lexicon): string[] {
  const findings: string[] = [];
  if (!text) return findings;

  if (lang === 'en') {
    for (const phrase of lex.refusedEn) {
      if (!phrase) continue;
      const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(phrase)}(?![\\p{L}\\p{N}])`, 'gui');
      for (const m of text.matchAll(re)) {
        findings.push(`en: "${m[0]}" — refused word`);
      }
    }
    for (const term of lex.terms) {
      for (const avoid of term.avoidEn) {
        if (!avoid) continue;
        const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(avoid)}(?![\\p{L}\\p{N}])`, 'gui');
        for (const m of text.matchAll(re)) {
          findings.push(`en: "${m[0]}" — use "${term.en}"`);
        }
      }
    }
  } else {
    for (const stem of lex.refusedRu) {
      if (!stem) continue;
      const re = new RegExp(`(?<![\\p{L}])${escapeRe(stem)}[\\p{L}]*`, 'gui');
      for (const m of text.matchAll(re)) {
        findings.push(`ru: "${m[0]}" — refused word`);
      }
    }
    for (const term of lex.terms) {
      for (const avoid of term.avoidRu) {
        if (!avoid) continue;
        const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(avoid)}(?![\\p{L}\\p{N}])`, 'gui');
        for (const m of text.matchAll(re)) {
          findings.push(`ru: "${m[0]}" — use "${term.ru}"`);
        }
      }
    }
    for (const ang of lex.anglicisms) {
      if (!ang.word) continue;
      const re = new RegExp(`(?<![\\p{L}])${escapeRe(ang.word)}[\\p{L}]*`, 'gui');
      for (const m of text.matchAll(re)) {
        findings.push(`ru: "${m[0]}" — use "${ang.ru}"`);
      }
    }
  }

  return findings;
}
