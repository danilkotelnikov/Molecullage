// Record the deck as video: node record.mjs deck.html outdir name:from-to [name:from-to ...]
//   node record.mjs "C:/x/deck.html" "C:/x/videos" memory:6-10 harness:2-5
// Slides are numbered as in the deck (1 = first). Each job opens a headed Chrome on the GPU, starts the deck's own autoplay
// at slide `from`, lets it run to the end of slide `to`, then leaves outdir/name.mp4 (H.264, 1440x900, 30 fps).
// The frames come from the browser's own screencast and go straight into ffmpeg, so Playwright's video helper is not needed.
// Headed Chrome on the GPU keeps the animation clock honest. Close other heavy work first: a busy machine drops frames.
// Env: W, H (size), FPS, FFMPEG (path), MAXMIN (guard in minutes per job, default 25), GIF=1 (also write a looping GIF of 8 s, from 3 s on).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { chromium } = require('playwright-core');
const [file, out, ...jobs] = process.argv.slice(2);
if (!file || !out || !jobs.length) { console.log('usage: node record.mjs deck.html outdir name:from-to ...'); process.exit(2); }
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const W = +process.env.W || 1440, H = +process.env.H || 900, FPS = +process.env.FPS || 30, MAXMS = (+process.env.MAXMIN || 25) * 60000;
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', `--window-size=${W},${H + 140}`] });
for (const job of jobs) {
  const [name, range] = job.split(':'); const [a, b] = range.split('-').map(Number);
  const mp4 = path.join(out, name + '.mp4');
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, colorScheme: 'dark' });
  const p = await ctx.newPage(); p.setDefaultTimeout(180000);
  p.on('pageerror', (e) => console.log(name, 'pageerror', e.message));
  const cdp = await ctx.newCDPSession(p);
  const ff = spawn(FFMPEG, ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4], { stdio: ['pipe', 'ignore', 'pipe'] });
  let ffErr = ''; ff.stderr.on('data', (d) => { ffErr = (ffErr + d).slice(-600); }); ff.stdin.on('error', () => {});
  const ffDone = new Promise((res) => ff.on('close', res));
  let last = null;
  cdp.on('Page.screencastFrame', (f) => { last = Buffer.from(f.data, 'base64'); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  await p.goto('file:///' + file + '#' + a, { timeout: 180000 }); await p.waitForTimeout(4000);
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  while (!last) await p.waitForTimeout(50);
  // one frame every 1/FPS of wall time: the video lasts as long as the recording did
  let t0 = Date.now(), written = 0;
  const pump = setInterval(() => { const due = Math.floor((Date.now() - t0) * FPS / 1000); while (written < due && ff.stdin.writableLength < 8e6) { ff.stdin.write(last); written++; } }, 15);
  await p.evaluate(() => { hold = false; touched = false; playing = true; schedule(slides[cur]); });   // the deck's own autoplay, across slides
  const s0 = Date.now(); let state = '';
  while (Date.now() - s0 < MAXMS) {
    await p.waitForTimeout(1000);
    state = await p.evaluate(() => `${cur + 1}:${step}:${playing}`);
    const [c, , pl] = state.split(':');
    if (+c > b || pl === 'false') break;
  }
  await p.waitForTimeout(1500);
  await p.evaluate(() => { playing = false; hold = true; });
  clearInterval(pump); await cdp.send('Page.stopScreencast').catch(() => {}); ff.stdin.end();
  const ffCode = await ffDone;
  await ctx.close();
  if (ffCode !== 0 || !fs.existsSync(mp4) || fs.statSync(mp4).size === 0) throw new Error(`${name}: ffmpeg failed with code ${ffCode}${ffErr ? ` (${ffErr.trim()})` : ''}`);
  console.log(name, 'slides', a + '-' + b, 'ended at', state, 'frames', written, fs.existsSync(mp4) ? Math.round(fs.statSync(mp4).size / 1024) + ' KB' : 'none', ffErr.includes('Error') ? ffErr : '');
  if (process.env.GIF && fs.existsSync(mp4)) {
    spawnSync(FFMPEG, ['-y', '-ss', '3', '-t', '8', '-i', mp4, '-vf', 'fps=12,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse', path.join(out, name + '.gif')], { encoding: 'utf8' });
  }
}
await browser.close();
