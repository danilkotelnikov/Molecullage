// Rebuild every example from its template: data files first (Python), then the pages.
//   node scripts/build_examples.mjs [name ...]          # default: all
// The renders in art/ come from scripts/render_examples.py (needs ChimeraX); the repository ships them, so this runs without ChimeraX.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { REPO, pythonCmd } from '../build/config.mjs';
import { build } from '../build/build.mjs';

const DATA = {
  sequence: [['examples/sequence/make_data.py']],
  dates: [['examples/dates/make_data.py']],
  plots2: [['plots/example_plots2.py']],
  contacts: [['plots/contact_tiles.py', '--contacts', 'examples/contacts/data/contacts.csv', '--loops', 'A:1mel_vhh', '--out', 'examples/contacts/contacts_layer', '--height', '108']],
};
const ALL = ['palette', 'pipeline', 'sequence', 'contacts', 'series', 'dates', 'plots2', 'structures'];
const names = process.argv.slice(2).length ? process.argv.slice(2) : ALL;
const [py, ...lead] = pythonCmd();
for (const n of names) {
  for (const args of DATA[n] || []) {
    const r = spawnSync(py, [...lead, '-B', ...args], { cwd: REPO, stdio: 'inherit' });
    if (r.status) throw new Error(`data step failed: ${args[0]}`);
  }
  const res = await build({ page: path.join(REPO, 'templates', `${n}.html`), outDir: path.join(REPO, 'examples', n), artDir: path.join(REPO, 'art') });
  console.log(n, res.widthMm + ' x ' + res.heightMm + ' mm', res.errors.length ? 'ERRORS ' + res.errors : 'ok');
}
