import { z } from 'zod';
import { evidenceError } from '../../core/world.ts';
import type { Level, Source } from '../../core/world.ts';

export type Part = {
  id: string;
  kind: 'shape' | 'arrow' | 'text' | 'molecule' | 'object' | 'texture' | 'background';
  box: [number, number, number, number];
  form: 'vector' | 'structure' | 'model' | 'text' | 'pixels';
  text?: { en: string; ru?: string };
  ref?: string;
  trace?: boolean;
  vector?: {
    type: 'path' | 'shape' | 'arrow';
    d?: string;
    shape?: 'rect' | 'ellipse';
    from?: [number, number];
    to?: [number, number];
  };
  roles: string[];
};

export type Reading = {
  image: string;
  width: number;
  height: number;
  source: Source;
  evidence: Level;
  parts: Part[];
};

const sourceSchema = z.strictObject({
  kind: z.enum(['pdb', 'doi', 'url', 'file', 'engine']),
  ref: z.string().min(1),
  note: z.string().optional(),
});

const levelSchema = z.enum(['measured', 'published', 'simulated', 'architecture', 'target']);

const partSchema = z.strictObject({
  id: z.string().min(1),
  kind: z.enum(['shape', 'arrow', 'text', 'molecule', 'object', 'texture', 'background']),
  box: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  form: z.enum(['vector', 'structure', 'model', 'text', 'pixels']),
  text: z.strictObject({ en: z.string().min(1), ru: z.string().optional() }).optional(),
  ref: z.string().optional(),
  trace: z.boolean().optional(),
  vector: z
    .strictObject({
      type: z.enum(['path', 'shape', 'arrow']),
      d: z.string().optional(),
      shape: z.enum(['rect', 'ellipse']).optional(),
      from: z.tuple([z.number(), z.number()]).optional(),
      to: z.tuple([z.number(), z.number()]).optional(),
    })
    .optional(),
  roles: z.array(z.string().min(1)).min(1),
});

const readingSchema = z.strictObject({
  image: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  source: sourceSchema,
  evidence: levelSchema,
  parts: z.array(partSchema),
});

export function checkReading(
  input: unknown,
): { ok: true; reading: Reading } | { ok: false; errors: string[] } {
  const parsed = readingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => `${i.path.join('.') || 'reading'}: ${i.message}`),
    };
  }
  const r = parsed.data as unknown as Reading;
  const errors: string[] = [];

  const evErr = evidenceError('reading', r.source, r.evidence);
  if (evErr) errors.push(evErr);

  const ids = new Set<string>();
  for (const p of r.parts) {
    if (ids.has(p.id)) errors.push(`duplicate part id "${p.id}"`);
    ids.add(p.id);

    const [x, y, w, h] = p.box;
    if (!(w > 0 && h > 0 && x >= 0 && y >= 0 && x + w <= r.width && y + h <= r.height)) {
      errors.push(`part "${p.id}" box [${x},${y},${w},${h}] is outside image ${r.width}x${r.height}`);
    }

    if (p.form === 'text' && (!p.text || !p.text.en.trim())) {
      errors.push(`part "${p.id}": form 'text' requires field 'text'`);
    }
    if (p.form === 'structure') {
      if (!p.ref || !/^[0-9][A-Za-z0-9]{3}$/.test(p.ref)) {
        errors.push(`part "${p.id}": form 'structure' requires a 4-character PDB id in 'ref'`);
      }
    }
    if (p.form === 'model' && (!p.ref || !p.ref.trim())) {
      errors.push(`part "${p.id}": form 'model' requires field 'ref'`);
    }
    if (p.trace) {
      if (p.form !== 'vector' || (p.kind !== 'shape' && p.kind !== 'texture')) {
        errors.push(`part "${p.id}": trace: true is allowed only on form 'vector' with kind 'shape' or 'texture'`);
      }
    } else if (p.form === 'vector') {
      if (!p.vector) {
        errors.push(`part "${p.id}": form 'vector' without trace requires field 'vector'`);
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, reading: r };
}
