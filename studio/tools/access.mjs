// The sign-in queue. Usage: node tools/access.mjs [--json]
// Lists the sources that need an account or a key, says whether a script can use them without a browser,
// and what the owner has to do. It reads library/access.json and library/sources.json. It never signs in.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const AUTONOMOUS = ['yes-with-your-token', 'yes-with-paid-key', 'unverified', 'no'];

/** Joins each access entry to its source and puts the ones a script can use first. */
export function signInQueue(sources, access) {
  const byId = new Map(sources.map((s) => [s.id, s]));
  const rank = (a) => AUTONOMOUS.indexOf(a.autonomous);
  return access
    .map((a) => ({ ...a, name: byId.get(a.id)?.name ?? a.id, url: byId.get(a.id)?.url }))
    .sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id));
}

const line = (e) =>
  [
    `${e.name}  [${e.signIn}${e.free ? ', free' : ', paid'}]  script without a browser: ${e.autonomous}`,
    `  sign up:  ${e.signUpUrl}`,
    e.tokenUrl ? `  token:    ${e.tokenUrl}  (set ${e.tokenEnv})` : e.tokenEnv ? `  key name: ${e.tokenEnv}` : null,
    `  how:      ${e.how}`,
    `  limits:   ${e.limits}`,
    `  checked:  ${e.verified}`,
  ]
    .filter(Boolean)
    .join('\n');

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const lib = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'library');
  const { sources } = JSON.parse(fs.readFileSync(path.join(lib, 'sources.json'), 'utf8'));
  const { sources: access } = JSON.parse(fs.readFileSync(path.join(lib, 'access.json'), 'utf8'));
  const queue = signInQueue(sources, access);
  console.log(process.argv.includes('--json') ? JSON.stringify(queue, null, 2) : queue.map(line).join('\n\n'));
}
