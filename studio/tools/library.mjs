// The material library tool. Usage: node tools/library.mjs fetch | verify
//   fetch   downloads the manifest files that are missing, then checks size and md5. It needs the network.
//   verify  checks the files that are there. It needs no network.
// A download is checked before it is kept. Run `fetch` only for files the owner has said yes to.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const library = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'library');
const manifest = JSON.parse(fs.readFileSync(path.join(library, 'manifest.json'), 'utf8'));
const md5 = (bytes) => crypto.createHash('md5').update(bytes).digest('hex');
const problem = (a, bytes) =>
  bytes.length !== a.bytes ? `size ${bytes.length}, expected ${a.bytes}` : md5(bytes) !== a.md5 ? 'md5 differs' : null;

const mode = process.argv[2];
if (mode !== 'fetch' && mode !== 'verify') {
  console.error('usage: node tools/library.mjs fetch | verify');
  process.exit(2);
}

let bad = 0;
for (const a of manifest.assets) {
  const file = path.join(library, a.file);
  let bytes = fs.existsSync(file) ? fs.readFileSync(file) : null;
  if (!bytes && mode === 'fetch' && a.download) {
    console.log(`fetching ${a.id} (${a.bytes} bytes) from ${a.download}`);
    const res = await fetch(a.download);
    if (!res.ok) throw new Error(`${a.id}: HTTP ${res.status}`);
    bytes = Buffer.from(await res.arrayBuffer());
    const why = problem(a, bytes);
    if (why) throw new Error(`${a.id}: the download is wrong (${why}); nothing was kept`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, bytes);
  }
  const why = bytes ? problem(a, bytes) : 'missing';
  console.log(`${why ? 'BAD ' : 'ok  '} ${a.id}${why ? `: ${why}` : ''}`);
  if (why) bad++;
}
process.exit(bad ? 1 : 0);
