import type { Ease } from './timeline.ts';

export type RoleStyle = {
  color: string; // #rrggbb
  metalness: number;
  roughness: number;
  opacity?: number;
  asset?: string; // asset swap per role
  // Glass and liquid. These are look choices of the lens and carry no evidence level.
  // The refractive index stays at the renderer default until Plan 2's sourced presets set it.
  transmission?: number; // 0..1, how much light passes through instead of being blended as a flat tint
  thickness?: number; // a fraction of the object's size
  attenuation?: { color: string; distance: number }; // body colour; distance is a fraction of the object's size
  emissive?: { color: string; intensity: number }; // a faint glow from inside, so clear liquid shows on a dark stage
};
export type Lens = {
  id: string;
  background: string;
  text: { family: string; color: string; minPx: number };
  radius: number; // px
  line: number; // px at 1920
  feel: { ease: Ease; speed: number };
  roles: Record<string, RoleStyle>;
  environment?: { hdri: string; intensity: number }; // hdri is a library manifest id
};

const MIN_TEXT_PX = 37;
const MIN_CONTRAST = 4.5;
const HEX = /^#[0-9a-fA-F]{6}$/;

const ROLE_ALIASES: Record<string, string> = {
  surface: 'diagram',
  path: 'line',
  focal: 'gold',
};

/** The first of obj.roles that the lens styles. A role the lens does not style is an error. */
export function resolve(obj: { roles: string[] }, lens: Lens): RoleStyle {
  for (const r of obj.roles) {
    if (Object.prototype.hasOwnProperty.call(lens.roles, r)) return lens.roles[r];
    const alias = ROLE_ALIASES[r];
    if (alias && Object.prototype.hasOwnProperty.call(lens.roles, alias)) return lens.roles[alias];
  }
  throw new Error(`no style for roles [${obj.roles.join(',')}] in lens "${lens.id}"`);
}

const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** The WCAG 2 contrast ratio of two #rrggbb colours. */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function checkLens(lens: Lens): string[] {
  const errors: string[] = [];
  const colours: [string, string][] = [
    ['background', lens.background],
    ['text.color', lens.text.color],
    ...Object.entries(lens.roles).map(([k, v]): [string, string] => [`roles.${k}.color`, v.color]),
  ];
  for (const [name, c] of colours) {
    if (!HEX.test(c)) errors.push(`lens "${lens.id}": ${name} "${c}" is not a #rrggbb colour`);
  }
  if (lens.environment && (!lens.environment.hdri || !(lens.environment.intensity > 0))) {
    errors.push(`lens "${lens.id}": environment needs an hdri id and an intensity above 0`);
  }
  for (const [role, r] of Object.entries(lens.roles)) {
    if (r.transmission !== undefined && !(r.transmission >= 0 && r.transmission <= 1)) {
      errors.push(`lens "${lens.id}": roles.${role}.transmission must be between 0 and 1`);
    }
    if (r.emissive && (!HEX.test(r.emissive.color) || !(r.emissive.intensity >= 0))) {
      errors.push(`lens "${lens.id}": roles.${role}.emissive needs a #rrggbb colour and an intensity of 0 or more`);
    }
    if (r.attenuation && (!HEX.test(r.attenuation.color) || !(r.attenuation.distance > 0))) {
      errors.push(`lens "${lens.id}": roles.${role}.attenuation needs a #rrggbb colour and a distance above 0`);
    }
  }
  if (lens.text.minPx < MIN_TEXT_PX) {
    errors.push(`lens "${lens.id}": text.minPx is ${lens.text.minPx}, it must be at least ${MIN_TEXT_PX}`);
  }
  if (HEX.test(lens.background) && HEX.test(lens.text.color)) {
    const c = contrast(lens.text.color, lens.background);
    if (c < MIN_CONTRAST) {
      errors.push(`lens "${lens.id}": text contrast is ${c.toFixed(2)}, it must be at least ${MIN_CONTRAST}`);
    }
  }
  return errors;
}
