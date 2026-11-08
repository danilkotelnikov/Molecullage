// Prints the comments of a pull request that a reviewer model may read. Anyone can comment on a public repository, and a
// comment can carry instructions, so a model reads only people with write access and the named bots.
//   REPO=owner/name PR=12 node .github/scripts/pr-trusted-comments.mjs
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PEOPLE = new Set(['OWNER', 'MEMBER', 'COLLABORATOR']);
const BOTS = new Set(['claude[bot]', 'github-actions[bot]', 'macroscopeapp[bot]', 'copilot-pull-request-reviewer[bot]']);

export const trusted = (row) => PEOPLE.has(row.author_association) || BOTS.has(row.user?.login);

export function render(rows) {
  return rows.filter(trusted).filter((r) => r.body).map((r) => `--- ${r.user.login}${r.path ? ` on ${r.path}:${r.line ?? ''}` : ''}\n${r.body}`).join('\n');
}

function fetchAll(route) {
  const r = spawnSync('gh', ['api', '--paginate', '--slurp', route], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`gh api ${route}: ${r.stderr}`);
  return JSON.parse(r.stdout).flat();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { REPO, PR } = process.env;
  console.log(render(['issues/PR/comments', 'pulls/PR/comments', 'pulls/PR/reviews'].flatMap((r) => fetchAll(`repos/${REPO}/${r.replace('PR', PR)}`))));
}
