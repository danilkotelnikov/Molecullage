import type { Lens } from './lens.ts';
import journal from '../lenses/journal.json' with { type: 'json' };
import cinematic from '../lenses/cinematic.json' with { type: 'json' };

export const SHIPPED_LENSES: Record<string, Lens> = {
  journal: journal as unknown as Lens,
  cinematic: cinematic as unknown as Lens,
};
