// Command line of the deck module.
//   node deck/cli.mjs new <folder> [--audience cloud] [--title "..."]      a starter deck with notes
//   node deck/cli.mjs build <deck> [--audience a] [--out dir] [--fetch]      check, render 3D loops, write the standalone HTML
//   node deck/cli.mjs preview <deck> [--port 4177] [--open]                  live preview with hot reload and presenter view
//   node deck/cli.mjs export <deck> --format html|pdf|png|mp4|gif|notes|sheet|all [--fps 30] [--width 1920] [--duration ms] [--slide id,id] [--out dir]
//   node deck/cli.mjs audit <deck> [--strictness normal|strict|loose] [--sheet file.png] [--json]
//   node deck/cli.mjs shot <url> <file.png> [--width 1280] [--height 800]    a screenshot of a running UI, for a device frame
//   node deck/cli.mjs validate <deck>                                        read deck.json and print the errors and warnings only
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import { findChrome } from '../build/config.mjs';
import { buildDeck, loadDeck } from './build.mjs';
import { exportPdf, exportPng, exportVideo, exportNotes, exportSheet } from './export.mjs';
import { startPreview } from './preview.mjs';

const STARTER = (title, audience) => ({
  title, lang: 'ru', audience, boundary: 'Что здесь данные, а что иллюстрация: одна строка.', duration: 6000, transition: { kind: 'fade', ms: 500 },
  slides: [
    { layout: 'title', kicker: 'Название проекта', title, subtitle: 'Одна строка о том, что вы покажете', meta: 'Автор · дата', notes: 'Здесь пишите, что говорить. Заметки видны в окне докладчика и в PDF заметок.' },
    { layout: 'number', title: 'Одно число на слайд', items: [{ value: '3', label: 'пример числа' }, { value: '12', label: 'ещё одно число' }], notes: 'Числа считаются от нуля при появлении.' },
    { layout: 'two-column', title: 'Две колонки', left: { type: 'list', build: true, items: ['Первый пункт', 'Второй пункт', 'Третий пункт'] }, right: 'Справа текст, рисунок, рамка устройства или сцена с молекулой.', notes: 'Каждый пункт слева появляется по нажатию.' },
  ],
});

function parse(argv) {
  const flags = {}, pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const nxt = argv[i + 1]; if (nxt === undefined || nxt.startsWith('--')) flags[k] = true; else { flags[k] = nxt; i++; } } else pos.push(a);
  }
  return { flags, pos };
}

const HELP = fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n');

export async function main(argv) {
  const { flags, pos } = parse(argv);
  const [cmd, target] = pos;
  const log = (m) => console.log(m);
  if (!cmd || flags.help) { console.log(HELP); return 0; }
  if (cmd === 'new') {
    if (!target) throw new Error('usage: new <folder>');
    const dir = path.resolve(target);
    if (fs.existsSync(path.join(dir, 'deck.json'))) throw new Error(`${dir}/deck.json exists; choose another folder.`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'deck.json'), JSON.stringify(STARTER(flags.title || 'Название презентации', flags.audience || 'neutral'), null, 2) + '\n');
    log(`Wrote ${path.join(dir, 'deck.json')}. Next: node deck/cli.mjs preview ${target}`);
    return 0;
  }
  if (cmd === 'validate') {
    const d = loadDeck(target, { audience: flags.audience });
    d.warnings.forEach((w) => log(`warning: ${w}`));
    d.errors.forEach((e) => log(`ERROR: ${e}`));
    log(d.errors.length ? `${d.errors.length} error(s)` : `ok: ${d.deck.slides.length} slides, ${Object.keys(d.deck.scenes).length} scenes`);
    return d.errors.length ? 1 : 0;
  }
  if (cmd === 'preview') {
    await startPreview(target || '.', { port: +flags.port || 4177, audience: flags.audience, open: !!flags.open, infoFile: typeof flags['info-file'] === 'string' ? flags['info-file'] : undefined, log });
    return new Promise(() => {});   // runs until stopped
  }
  if (cmd === 'shot') {
    const [, url, file] = pos;
    if (!/^https?:\/\//i.test(url || '') || !file) throw new Error('usage: shot <http(s) url> <file.png> [--width 1280] [--height 800]');
    const browser = await chromium.launch({ executablePath: findChrome(), headless: true });
    try {
      const pg = await browser.newPage({ viewport: { width: +flags.width || 1280, height: +flags.height || 800 } });
      await pg.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
      await pg.screenshot({ path: file, type: 'png' });
    } finally { await browser.close(); }
    log(`wrote ${file}`);
    return 0;
  }
  if (cmd === 'audit') {
    const { auditDeck } = await import('../qa/qa_deck.mjs');
    const r = await auditDeck(target, { strictness: flags.strictness, audience: flags.audience, sheet: typeof flags.sheet === 'string' ? flags.sheet : undefined });
    if (flags.json) log(JSON.stringify(r));
    else { log(`${r.ok ? 'pass' : 'FAIL'}  ${r.slides.length} slides, strictness ${r.strictness}`); r.failures.forEach((f) => log(`  FAIL  ${f}`)); r.warnings.forEach((w) => log(`  warn  ${w}`)); }
    return r.ok || r.strictness === 'loose' ? 0 : 1;
  }
  if (cmd === 'build' || cmd === 'export') {
    const format = cmd === 'build' ? 'html' : String(flags.format || 'html');
    const formats = format === 'all' ? ['html', 'pdf', 'png', 'mp4', 'notes'] : format.split(',');
    const b = buildDeck(target, { audience: flags.audience, out: flags.out, fetch: !!flags.fetch, live: !!flags.live, log });
    log(`html: ${b.file} (${(b.bytes / 1e6).toFixed(2)} MB)`);
    const out = path.dirname(b.file), base = b.name;
    const ids = typeof flags.slide === 'string' ? flags.slide.split(',') : undefined;
    const durations = flags.duration ? { default: +flags.duration } : undefined;
    for (const f of formats) {
      if (f === 'html') continue;
      if (f === 'pdf') await exportPdf(b.file, path.join(out, `${base}.pdf`), { log });
      else if (f === 'png') await exportPng(b.file, path.join(out, 'png'), { only: ids, scale: +flags.scale || 1, name: base, log });
      else if (f === 'mp4' || f === 'gif') await exportVideo(b.file, path.join(out, `${base}${ids ? '-' + ids.join('-') : ''}.${f}`), { fps: +flags.fps || (f === 'gif' ? 15 : 30), width: +flags.width || 1920, format: f, durations, range: ids, log });
      else if (f === 'notes') await exportNotes(b.file, b.deck, out, { name: `${base}-notes`, log });
      else if (f === 'sheet') await exportSheet(b.file, path.join(out, `${base}-sheet.png`), { log });
      else throw new Error(`unknown format "${f}"; use html, pdf, png, mp4, gif, notes, sheet or all`);
    }
    return 0;
  }
  throw new Error(`unknown command "${cmd}"\n${HELP}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then((c) => process.exit(c)).catch((e) => { console.error(String(e.message || e)); process.exit(1); });
}
