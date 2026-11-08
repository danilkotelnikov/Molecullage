import { createRequire } from 'node:module';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { chromium } = require('playwright-core');
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file:///' + process.argv[2] + '#2'); await p.waitForTimeout(1200);
for (const t of ['Why did the connection fail', 'How large can an answer be', 'When do state cards refresh', 'Which reranker is live', 'banana smoothie recipe']) {
  await p.fill('#cq-in', t); await p.press('#cq-in', 'Enter'); await p.waitForTimeout(300);
  const r = await p.evaluate(() => ({ merged: [...document.querySelectorAll('.cq-m span')].map((e) => e.textContent), keep: [...document.querySelectorAll('.cq-c.keep span')].map((e) => e.textContent), lists: [...document.querySelectorAll('.cq-l')].map((l) => l.querySelectorAll('.cq-r.hit').length) }));
  console.log(t, '|', 'lists', r.lists.join(','), '| merged', r.merged.length, '| keep', r.keep.join(', '));
}
const typed = await p.evaluate(() => cur); await p.focus('#cq-in'); await p.keyboard.type('p k '); console.log('slide unchanged after typing', typed === await p.evaluate(() => cur), 'value', await p.inputValue('#cq-in'));
console.log('errors', errs.length, errs[0] || ''); await b.close();
