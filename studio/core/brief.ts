export type Brief = {
  idea: string;
  details: string;
  concepts: string[];
  audience: string;
  product: string;
  langs: ('en' | 'ru')[];
  lens?: string;
  timeBudget: { hours: number };
  files: string[];
};

export function checkBrief(b: Brief, lensIds: string[], projectIds: string[]): string[] {
  const errors: string[] = [];
  if (!b || typeof b !== 'object') return ['brief must be an object'];
  if (typeof b.idea !== 'string' || !b.idea.trim()) errors.push('brief.idea is required');
  if (typeof b.details !== 'string' || !b.details.trim()) errors.push('brief.details is required');
  if (!Array.isArray(b.concepts) || b.concepts.length === 0) errors.push('brief.concepts must be a non-empty array');
  if (typeof b.audience !== 'string' || !b.audience.trim()) errors.push('brief.audience is required');
  if (typeof b.product !== 'string' || !b.product.trim()) {
    errors.push('brief.product is required');
  } else if (!projectIds.includes(b.product)) {
    errors.push(`brief.product "${b.product}" has no project file motion/projects/${b.product}.json`);
  }

  if (!Array.isArray(b.langs) || b.langs.length === 0) {
    errors.push('brief.langs cannot be empty');
  } else {
    for (const l of b.langs) {
      if (l !== 'en' && l !== 'ru') {
        errors.push(`brief.langs: unsupported language "${l}" (only en or ru)`);
      }
    }
  }

  if (b.lens !== undefined && !lensIds.includes(b.lens)) {
    errors.push(`unknown lens "${b.lens}"`);
  }

  const hours = b.timeBudget?.hours;
  if (!(typeof hours === 'number' && Number.isFinite(hours) && hours >= 0.5 && hours <= 120)) {
    errors.push(`brief.timeBudget.hours (${hours}) must be between 0.5 and 120 hours`);
  }

  if (!Array.isArray(b.files)) {
    errors.push('brief.files must be an array');
  }
  return errors;
}

export function budgetLine(b: Brief): string {
  return `Time budget: ${b.timeBudget.hours} h. Languages: ${b.langs.join(', ')}. Product: ${b.product}.`;
}
