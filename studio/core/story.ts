import type { Job } from './job.ts';
import { proseFindings, type Lexicon } from './prose.ts';

export type Slide = {
  stop: number;
  title: { en: string; ru: string };
  say: { en: string; ru: string };
  facts: string[];
};

export function checkStory(job: Job, lex: Lexicon): string[] {
  const errors: string[] = [];
  const slides = job.story ?? [];
  const factIds = new Set((job.facts ?? []).map((f) => f.id));

  const deckPaths = job.paths.filter((p) => p.kind === 'deck');
  for (const path of deckPaths) {
    const stopCount = path.stops.length;
    for (let i = 0; i < stopCount; i++) {
      const matching = slides.filter((s) => s.stop === i);
      if (matching.length === 0) {
        errors.push(`stop ${i} has no slide`);
      } else if (matching.length > 1) {
        errors.push(`stop ${i} has ${matching.length} slides`);
      }
    }
  }

  for (const slide of slides) {
    for (const fid of slide.facts ?? []) {
      if (!factIds.has(fid)) {
        errors.push(`slide stop ${slide.stop}: unknown fact "${fid}"`);
      }
    }
    for (const lang of ['en', 'ru'] as const) {
      const titleText = slide.title?.[lang] ?? '';
      const sayText = slide.say?.[lang] ?? '';
      for (const f of proseFindings(titleText, lang, lex)) {
        errors.push(`slide stop ${slide.stop} title ${f}`);
      }
      for (const f of proseFindings(sayText, lang, lex)) {
        errors.push(`slide stop ${slide.stop} say ${f}`);
      }
    }
  }

  return errors;
}
