// studio/tools/still.mjs — Captures 1920x1080 PNG stills at stop timestamps via headless Chromium (Plan 6 Task 6).
import fs from 'node:fs';
import path from 'node:path';
import { ensureStudioServer, launch } from './browser.mjs';

export async function stillsAt(job, lens = 'journal', lang = 'en', times = [0], outDir, opts = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  const srv = await ensureStudioServer({ job, studioDir: opts.studioDir, forceNew: Boolean(opts.studioDir) });
  const browser = await launch();
  const paths = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const url = `${srv.url}/?job=${encodeURIComponent(job)}&lens=${encodeURIComponent(lens)}&lang=${encodeURIComponent(lang)}`;
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__studio !== undefined, null, { timeout: 15000 });
    await page.evaluate(() => window.__studio.ready);

    for (let i = 0; i < times.length; i++) {
      const t = Number(times[i] ?? 0);
      await page.evaluate((timeSec) => window.__studio.seek(timeSec), t);
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const p = path.join(outDir, `stop-${String(i).padStart(2, '0')}.png`);
      await page.screenshot({ path: p });
      paths.push(p);
    }
  } finally {
    await browser.close();
    await srv.close();
  }
  return paths;
}
