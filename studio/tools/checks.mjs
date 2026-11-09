import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cameraAt } from '../core/camera.ts';
import { validateWorld } from '../core/world.ts';
import { validateTimeline } from '../core/timeline.ts';

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_DIR = path.resolve(TOOLS_DIR, '..');
const SAFE_MARGIN = 48;
const STAGE_W = 1920;
const STAGE_H = 1080;

function isBadAssetPath(p) {
  if (typeof p !== 'string' || p.trim().length === 0) return true;
  if (p.startsWith('builtin:')) return false;
  if (p.includes('..') || p.startsWith('/') || p.startsWith('\\') || /^[a-zA-Z]:/.test(p)) return true;
  if (/[\0<>:"|?*]/.test(p)) return true;
  return false;
}

/**
 * Pure and filesystem-optional job checker.
 * Checks frame bounds (world frames, object windows, layout safe area),
 * timeline monotonicity (track keys and camera path keys/stops),
 * camera distances (positive finite camera-to-target distances),
 * and asset paths (traversal/syntax, plus optional existence in opts.jobDir).
 */
export function checkJob(job, opts = {}) {
  const findings = [];
  const add = (kind, id, detail) => {
    findings.push({ kind, id, detail });
  };

  if (!job || typeof job !== 'object') {
    add('frame-bounds', 'job', 'job is not an object');
    return { ok: false, findings, errors: findings.map((f) => f.detail) };
  }

  const world = job.world;
  if (!world || typeof world !== 'object') {
    add('frame-bounds', 'world', 'job.world is missing');
    return { ok: false, findings, errors: findings.map((f) => f.detail) };
  }

  const duration = Number(world.duration ?? 0);
  if (!(duration > 0)) {
    add('frame-bounds', 'world.duration', `world duration ${world.duration} must be positive`);
  }

  const wCheck = validateWorld(world);
  if (!wCheck.ok) {
    for (const err of wCheck.errors) {
      if (err.includes('window') || err.includes('frame') || err.includes('size')) {
        add('frame-bounds', world.id ?? 'world', err);
      } else {
        add('world', world.id ?? 'world', err);
      }
    }
  }

  // 1. Frame bounds: frames, object windows, and layout boxes
  const frameIds = new Set();
  for (const f of world.frames ?? []) {
    frameIds.add(f.id);
    if (!(f.unit > 0) || !Number.isFinite(f.unit)) {
      add('frame-bounds', f.id, `frame "${f.id}" has invalid unit ${f.unit}`);
    }
  }

  for (const obj of world.objects ?? []) {
    if (!frameIds.has(obj.frame)) {
      add('frame-bounds', obj.id, `object "${obj.id}" references unknown frame "${obj.frame}"`);
    }
    if (Array.isArray(obj.window)) {
      const [t0, t1] = obj.window;
      if (t0 < 0 || t1 > duration || t0 > t1) {
        add('frame-bounds', obj.id, `object "${obj.id}" window [${t0}, ${t1}] is outside [0, ${duration}]`);
      }
    }
    if (!(obj.size > 0)) {
      add('frame-bounds', obj.id, `object "${obj.id}" has non-positive size ${obj.size}`);
    }

    // 4. Asset paths check
    const checkAsset = (assetRef, label) => {
      if (isBadAssetPath(assetRef)) {
        add('asset-path', obj.id, `object "${obj.id}" has invalid ${label} "${assetRef}"`);
        return;
      }
      if (opts.jobDir && !assetRef.startsWith('builtin:')) {
        const resolved = path.resolve(opts.jobDir, assetRef);
        const rootWithSep = path.resolve(opts.jobDir) + path.sep;
        if (!resolved.startsWith(rootWithSep) || !fs.existsSync(resolved)) {
          add('asset-path', obj.id, `object "${obj.id}" missing ${label} file "${assetRef}"`);
        }
      }
    };
    if (obj.asset !== undefined) checkAsset(obj.asset, 'asset');
    if (obj.standIn && obj.standIn.asset !== undefined) checkAsset(obj.standIn.asset, 'standIn.asset');
  }

  for (const lay of job.layout ?? []) {
    for (const b of lay.blocks ?? []) {
      const [x, y, w, h] = b.box ?? [0, 0, 0, 0];
      if (!(w > 0 && h > 0 && x >= SAFE_MARGIN && y >= SAFE_MARGIN && x + w <= STAGE_W - SAFE_MARGIN && y + h <= STAGE_H - SAFE_MARGIN)) {
        add(
          'frame-bounds',
          b.id,
          `block "${b.id}" (stop ${lay.stop}, ${lay.lang}) box [${x},${y},${w},${h}] is outside safe bounds`,
        );
      }
    }
  }

  // 2. Timeline monotonicity: tracks and camera paths
  if (job.timeline && Array.isArray(job.timeline.tracks)) {
    const worldWithVectors = Array.isArray(job.vectors)
      ? { ...world, objects: [...(world.objects ?? []), ...job.vectors.map((v) => ({ id: v.id }))] }
      : world;
    const tlErrors = validateTimeline(job.timeline, worldWithVectors);
    for (const err of tlErrors) {
      add('timeline-monotonicity', 'timeline', err);
    }
    for (const tr of job.timeline.tracks) {
      const keys = tr.keys ?? [];
      for (let i = 0; i < keys.length; i++) {
        if (keys[i].t < 0 || (duration > 0 && keys[i].t > duration)) {
          add(
            'timeline-monotonicity',
            `${tr.target}.${tr.prop}`,
            `track "${tr.target}.${tr.prop}" key ${i} at t=${keys[i].t} is outside [0, ${duration}]`,
          );
        }
        if (i > 0 && !(keys[i].t > keys[i - 1].t)) {
          add(
            'timeline-monotonicity',
            `${tr.target}.${tr.prop}`,
            `track "${tr.target}.${tr.prop}" keys are not strictly increasing at index ${i} (${keys[i - 1].t} -> ${keys[i].t})`,
          );
        }
      }
    }
  }

  // 3. Camera distances and path monotonicity
  const minDistance = opts.minCameraDistance ?? 1e-12;
  const maxDistance = opts.maxCameraDistance ?? 1e3;
  for (const camPath of job.paths ?? []) {
    const keys = camPath.keys ?? [];
    if (keys.length === 0) {
      add('camera-distance', camPath.id, `camera path "${camPath.id}" has no keys`);
      continue;
    }
    for (let i = 1; i < keys.length; i++) {
      if (!(keys[i].t > keys[i - 1].t)) {
        add(
          'timeline-monotonicity',
          camPath.id,
          `camera path "${camPath.id}" keys are not strictly increasing at index ${i}`,
        );
      }
    }
    const stops = camPath.stops ?? [];
    for (let i = 1; i < stops.length; i++) {
      if (!(stops[i] > stops[i - 1])) {
        add(
          'timeline-monotonicity',
          camPath.id,
          `camera path "${camPath.id}" stops are not strictly increasing at index ${i}`,
        );
      }
    }
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (!frameIds.has(k.at?.frame) || !frameIds.has(k.target?.frame)) {
        add('frame-bounds', camPath.id, `camera path "${camPath.id}" key ${i} references unknown frame`);
        continue;
      }
      try {
        const sampleCam = cameraAt(world, camPath, k.t);
        if (
          !Number.isFinite(sampleCam.distance) ||
          sampleCam.distance < minDistance ||
          sampleCam.distance > maxDistance
        ) {
          add(
            'camera-distance',
            camPath.id,
            `camera path "${camPath.id}" key ${i} distance ${sampleCam.distance}m is outside [${minDistance}, ${maxDistance}]`,
          );
        }
      } catch (e) {
        add('camera-distance', camPath.id, e instanceof Error ? e.message : String(e));
      }
    }
  }

  return {
    ok: findings.length === 0,
    findings,
    errors: findings.map((f) => f.detail),
  };
}

/** DOM layout checker for a rendered Playwright page at the current stop. */
export async function checkPage(page, minPx = 37) {
  return page.evaluate((minFontPx) => {
    const out = [];
    const lang = document.documentElement.lang || 'en';

    const bakedImg = document.querySelector('img[data-baked]');
    if (bakedImg && bakedImg.dataset.missingBake) {
      out.push({
        id: 'baked',
        lang,
        kind: 'missing-bake',
        detail: bakedImg.dataset.missingBake,
      });
    }

    const blocks = document.querySelectorAll('[data-block]');
    for (const el of blocks) {
      const id = el.getAttribute('data-block') || '';
      if (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) {
        out.push({
          id,
          lang,
          kind: 'overflow',
          detail: `block "${id}" overflows (${el.scrollWidth}x${el.scrollHeight} > ${el.clientWidth}x${el.clientHeight})`,
        });
      }
      const style = window.getComputedStyle(el);
      const px = parseFloat(style.fontSize || '0');
      if (px < minFontPx - 0.1) {
        out.push({
          id,
          lang,
          kind: 'small-text',
          detail: `block "${id}" font-size ${px}px is below ${minFontPx}px`,
        });
      }
      const left = parseFloat(style.left || '0');
      const top = parseFloat(style.top || '0');
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (left < 48 || top < 48 || left + width > 1920 - 48 || top + height > 1080 - 48) {
        out.push({
          id,
          lang,
          kind: 'offscreen',
          detail: `block "${id}" box [${left},${top},${width},${height}] is outside safe area`,
        });
      }
    }

    const vecLabels = document.querySelectorAll('[data-id][data-vector-type="label"]');
    for (const el of vecLabels) {
      const style = window.getComputedStyle(el);
      if (style.display === 'none') continue;
      const id = el.getAttribute('data-id') || '';
      const px = parseFloat(el.getAttribute('font-size') || style.fontSize || '0');
      if (px < minFontPx - 0.1) {
        out.push({
          id,
          lang,
          kind: 'small-text',
          detail: `vector label "${id}" font-size ${px}px is below ${minFontPx}px`,
        });
      }
      const boxW = parseFloat(el.getAttribute('data-box-w') || '0');
      const boxH = parseFloat(el.getAttribute('data-box-h') || '0');
      if (typeof el.getBBox === 'function' && boxW > 0 && boxH > 0) {
        const bb = el.getBBox();
        if (bb.width > boxW + 1 || bb.height > boxH + 1) {
          out.push({
            id,
            lang,
            kind: 'overflow',
            detail: `vector label "${id}" overflows (${bb.width.toFixed(1)}x${bb.height.toFixed(1)} > ${boxW}x${boxH})`,
          });
        }
      }
    }

    return out;
  }, minPx);
}

// CLI runner: node tools/checks.mjs <jobIdOrPath>
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const arg = process.argv[2] ?? 'zoom-test';
  const jobDir = fs.existsSync(arg) && fs.statSync(arg).isDirectory()
    ? path.resolve(arg)
    : path.resolve(STUDIO_DIR, 'jobs', arg);
  const jobFile = fs.existsSync(arg) && fs.statSync(arg).isFile()
    ? path.resolve(arg)
    : path.join(jobDir, 'job.json');

  if (!fs.existsSync(jobFile)) {
    console.error(`job file not found: ${jobFile}`);
    process.exit(1);
  }
  const job = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
  const res = checkJob(job, { jobDir: path.dirname(jobFile) });
  if (!res.ok) {
    for (const f of res.findings) {
      console.error(`[${f.kind}] ${f.id}: ${f.detail}`);
    }
    process.exit(1);
  }
  console.log(`ok (${path.basename(path.dirname(jobFile))})`);
}
