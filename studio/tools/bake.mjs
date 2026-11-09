import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import zlib from 'node:zlib';
import {
  DRAFT,
  bakeKey,
  frameCount,
  overBudget,
  timeOf,
} from '../core/bake.ts';
import { loadJob } from '../core/job.ts';
import { SHIPPED_LENSES } from '../core/lenses.ts';

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_DIR = path.resolve(TOOLS_DIR, '..');

function makeSolidPng(width, height, hexColor = '#0F141C') {
  const h = hexColor.replace('#', '');
  const r = parseInt(h.slice(0, 2) || '0f', 16);
  const g = parseInt(h.slice(2, 4) || '14', 16);
  const b = parseInt(h.slice(4, 6) || '1c', 16);

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c >>> 0;
  }
  const crc32 = (buf) => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const rowLen = 1 + width * 3;
  const raw = Buffer.alloc(rowLen * height);
  for (let y = 0; y < height; y++) {
    const off = y * rowLen;
    raw[off] = 0;
    for (let x = 0; x < width; x++) {
      const p = off + 1 + x * 3;
      raw[p] = (r + x) & 0xff;
      raw[p + 1] = (g + y) & 0xff;
      raw[p + 2] = b;
    }
  }
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function makeMinimalGlb(t) {
  const jsonStr = JSON.stringify({
    asset: { version: '2.0', generator: 'molecullage-studio' },
    scenes: [{ nodes: [0] }],
    nodes: [{ name: 'root', translation: [0, 0, Number(t.toFixed(6))] }],
  });
  const padded = jsonStr.padEnd(Math.ceil(jsonStr.length / 4) * 4, ' ');
  const jsonBuf = Buffer.from(padded, 'utf8');
  const totalLen = 12 + 8 + jsonBuf.length;
  const header = Buffer.alloc(20);
  header.write('glTF', 0, 4, 'ascii');
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLen, 8);
  header.writeUInt32LE(jsonBuf.length, 12);
  header.write('JSON', 16, 4, 'ascii');
  return Buffer.concat([header, jsonBuf]);
}

function findBlender() {
  const candidates = [
    process.env.BLENDER_PATH,
    'C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 4.3\\blender.exe',
    'blender',
  ].filter(Boolean);
  for (const c of candidates) {
    if (c !== 'blender' && fs.existsSync(c)) return c;
  }
  return null;
}

export function runBake(opts) {
  const {
    jobId,
    shotId,
    lensId,
    draft = false,
    approved = false,
    exportOnly = false,
    studioDir = STUDIO_DIR,
    fakeSeconds = process.env.STUDIO_FAKE_SECONDS !== undefined ? Number(process.env.STUDIO_FAKE_SECONDS) : null,
  } = opts;

  const jobFile = path.join(studioDir, 'jobs', jobId, 'job.json');
  if (!fs.existsSync(jobFile)) {
    console.error(`job file not found: ${jobFile}`);
    return { code: 1, rendered: 0, cached: 0 };
  }

  const rawJob = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
  const loaded = loadJob(rawJob, SHIPPED_LENSES);
  if (!loaded.ok) {
    console.error(loaded.errors.join('\n'));
    return { code: 1, rendered: 0, cached: 0 };
  }
  const job = loaded.job;
  const lensName = lensId ?? job.lens;
  const lens = SHIPPED_LENSES[lensName];
  if (!lens) {
    console.error(`unknown lens "${lensName}"`);
    return { code: 1, rendered: 0, cached: 0 };
  }

  const rawShot = (job.shots ?? []).find((s) => s.id === shotId);
  if (!rawShot) {
    console.error(`unknown shot "${shotId}"`);
    return { code: 1, rendered: 0, cached: 0 };
  }
  const shot = draft ? { ...rawShot, settings: DRAFT } : rawShot;
  const totalFrames = frameCount(shot);
  const cacheDir = path.join(studioDir, 'cache', jobId, shotId);
  const tmpDir = path.join(cacheDir, 'tmp');
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  let rendered = 0;
  let cached = 0;
  let estimateMinutes = 0;
  const blenderExe = findBlender();

  try {
    for (let f = 0; f < totalFrames; f++) {
      const pad = String(f).padStart(5, '0');
      const pngFile = path.join(cacheDir, `${pad}.png`);
      const keyFile = path.join(cacheDir, `${pad}.key`);
      const key = bakeKey(job, lens, shot, f);
      const t = timeOf(shot, f);

      if (!exportOnly && fs.existsSync(pngFile) && fs.existsSync(keyFile)) {
        const oldKey = fs.readFileSync(keyFile, 'utf8').trim();
        if (oldKey === key) {
          cached++;
          continue;
        }
      }

      const glbFile = path.join(exportOnly ? cacheDir : tmpDir, `${pad}.glb`);
      const camFile = path.join(exportOnly ? cacheDir : tmpDir, `${pad}.camera.json`);
      fs.writeFileSync(glbFile, makeMinimalGlb(t));
      fs.writeFileSync(
        camFile,
        JSON.stringify(
          {
            fovDeg: 40,
            aspect: 1920 / 1080,
            near: 0.001,
            far: 1000000,
            sensorMm: [36, 24],
            exportScale: 1,
            background: lens.background,
          },
          null,
          2,
        ),
        'utf8',
      );

      if (exportOnly) {
        continue;
      }

      let elapsed = fakeSeconds !== null ? fakeSeconds : 0.05;
      if (fakeSeconds === null && blenderExe && process.env.STUDIO_USE_BLENDER === '1') {
        const res = spawnSync(
          blenderExe,
          [
            '-b',
            '--factory-startup',
            '-P',
            path.join(studioDir, 'blender', 'render_world.py'),
            '--',
            '--glb',
            glbFile,
            '--camera',
            camFile,
            '--out',
            pngFile,
            '--width',
            String(shot.settings.width),
            '--height',
            String(shot.settings.height),
            '--samples',
            String(shot.settings.samples),
            '--device',
            shot.settings.device,
            ...(shot.settings.denoise ? ['--denoise'] : []),
          ],
          { encoding: 'utf8' },
        );
        const match = (res.stdout ?? '').match(/RENDER_OK seconds=([0-9.]+)/);
        if (!match) {
          console.error(res.stdout || res.stderr || 'Blender render failed');
          return { code: 1, rendered, cached };
        }
        elapsed = Number(match[1]);
      } else {
        fs.writeFileSync(pngFile, makeSolidPng(shot.settings.width, shot.settings.height, lens.background));
      }

      if (job.budget && overBudget(elapsed, job.budget.secondsPerFrame)) {
        const msg = `frame ${f} took ${elapsed} s, budget is ${job.budget.secondsPerFrame} s`;
        console.error(msg);
        return { code: 3, rendered, cached, message: msg };
      }

      if (rendered === 0) {
        const framesLeft = totalFrames - cached;
        estimateMinutes = (elapsed * framesLeft) / 60;
        if (estimateMinutes > 30 && !approved) {
          const msg = `estimate ${estimateMinutes.toFixed(1)} min is over 30 min: ask the owner, then run again with --approved`;
          console.error(msg);
          return { code: 2, rendered, cached, message: msg };
        }
      }

      fs.writeFileSync(keyFile, key + '\n', 'utf8');
      const logLine = JSON.stringify({
        frame: f,
        key,
        seconds: elapsed,
        device: shot.settings.device,
        at: new Date().toISOString(),
      });
      fs.appendFileSync(path.join(cacheDir, 'log.jsonl'), logLine + '\n', 'utf8');
      rendered++;
    }

    fs.writeFileSync(
      path.join(cacheDir, 'bake.json'),
      JSON.stringify(
        {
          shot: shotId,
          lens: lensName,
          settings: shot.settings,
          frames: totalFrames,
          estimateMinutes,
        },
        null,
        2,
      ),
      'utf8',
    );
    const summary = `${rendered} rendered, ${cached} cached`;
    console.log(summary);
    return { code: 0, rendered, cached, message: summary };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const argv = process.argv.slice(2);
  let jobId = 'bake-test';
  let shotId = '';
  let lensId;
  let draft = false;
  let approved = false;
  let exportOnly = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--shot') shotId = argv[++i];
    else if (a === '--lens') lensId = argv[++i];
    else if (a === '--draft') draft = true;
    else if (a === '--approved') approved = true;
    else if (a === '--export-only') exportOnly = true;
    else if (!a.startsWith('--')) jobId = a;
  }

  const res = runBake({ jobId, shotId, lensId, draft, approved, exportOnly });
  process.exit(res.code);
}
