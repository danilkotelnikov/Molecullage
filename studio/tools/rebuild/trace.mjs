import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REBUILD_DIR = path.dirname(fileURLToPath(import.meta.url));

function translatePathD(d, dx, dy) {
  const tokens = d.match(/[a-zA-Z]|-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g) ?? [];
  const out = [];
  let cmd = 'M';
  let i = 0;

  while (i < tokens.length) {
    const tok = tokens[i];
    if (/^[a-zA-Z]$/.test(tok)) {
      cmd = tok;
      out.push(tok);
      i++;
      continue;
    }
    const upper = cmd.toUpperCase();
    const isRel = cmd !== upper;
    if (upper === 'Z') {
      i++;
      continue;
    }
    if (upper === 'H') {
      const x = Number(tokens[i++]);
      out.push(String(Number((isRel ? x : x + dx).toFixed(3))));
    } else if (upper === 'V') {
      const y = Number(tokens[i++]);
      out.push(String(Number((isRel ? y : y + dy).toFixed(3))));
    } else {
      const x = Number(tokens[i++]);
      const y = Number(tokens[i++]);
      out.push(
        String(Number((isRel ? x : x + dx).toFixed(3))),
        String(Number((isRel ? y : y + dy).toFixed(3))),
      );
    }
  }
  return out.join(' ');
}

function bboxFromD(d, fallbackBox) {
  const tokens = d.match(/[a-zA-Z]|-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g) ?? [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let curX = 0;
  let curY = 0;
  let cmd = 'M';
  let i = 0;

  const mark = (x, y) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };

  while (i < tokens.length) {
    const tok = tokens[i];
    if (/^[a-zA-Z]$/.test(tok)) {
      cmd = tok;
      i++;
      continue;
    }
    const upper = cmd.toUpperCase();
    const isRel = cmd !== upper;
    if (upper === 'H') {
      const x = Number(tokens[i++]);
      curX = isRel ? curX + x : x;
      mark(curX, curY);
    } else if (upper === 'V') {
      const y = Number(tokens[i++]);
      curY = isRel ? curY + y : y;
      mark(curX, curY);
    } else if (upper !== 'Z') {
      const x = Number(tokens[i++]);
      const y = Number(tokens[i++]);
      curX = isRel ? curX + x : x;
      curY = isRel ? curY + y : y;
      mark(curX, curY);
    } else {
      i++;
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return fallbackBox;
  return [minX, minY, Math.max(1, maxX - minX), Math.max(1, maxY - minY)];
}

export function parseTracedSvg(svg, partId, box) {
  const pathTags = svg.match(/<path\b[^>]*\/?>/gi) ?? [];
  const bgMatch = svg.match(/data-bg="([^"]+)"/i);
  const bgHex = bgMatch ? bgMatch[1].toLowerCase() : null;
  const bgFills = new Set(['#ffffff', '#fbfaf7', ...(bgHex ? [bgHex] : [])]);
  const vectors = [];

  for (const tag of pathTags) {
    const dMatch = tag.match(/\bd="([^"]+)"/i);
    if (!dMatch || !dMatch[1].trim()) continue;
    const fillMatch = tag.match(/\bfill="([^"]+)"/i);
    if (fillMatch && bgFills.has(fillMatch[1].toLowerCase())) continue;

    let tx = 0;
    let ty = 0;
    const trMatch = tag.match(/\btransform="translate\(\s*(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)\s*\)"/i);
    if (trMatch) {
      tx = Number(trMatch[1]);
      ty = Number(trMatch[2]);
    }

    const dx = box[0] + tx;
    const dy = box[1] + ty;
    const translatedD = translatePathD(dMatch[1], dx, dy);
    const pathBox = bboxFromD(translatedD, [box[0] + tx, box[1] + ty, box[2], box[3]]);
    if (box[2] > 0 && box[3] > 0 && pathBox[2] * pathBox[3] >= 0.9 * box[2] * box[3] && pathTags.length > 1) {
      continue;
    }
    vectors.push({
      id: `${partId}-p${vectors.length + 1}`,
      type: 'path',
      frame: null,
      box: pathBox,
      d: translatedD,
      roles: ['focal'],
      source: { kind: 'engine', ref: 'vtracer' },
      evidence: 'architecture',
      window: [0, 10],
    });
  }

  return vectors;
}

export async function traceParts(reading, pngPath, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const vectors = [];
  const findings = [];

  for (const part of reading.parts ?? []) {
    if (!part.trace) continue;
    const svgOut = path.join(outDir, `${part.id}.svg`);
    const [x, y, w, h] = part.box;
    const res = spawnSync(
      'py',
      ['-3', '-I', path.join(REBUILD_DIR, 'trace_region.py'), path.resolve(pngPath), String(x), String(y), String(w), String(h), svgOut],
      { encoding: 'utf8' },
    );
    if (res.status !== 0) {
      throw new Error(`trace_region.py failed for ${part.id}: ${res.stderr || res.stdout}`);
    }
    const svgText = fs.readFileSync(svgOut, 'utf8');
    const childPaths = parseTracedSvg(svgText, part.id, part.box).map((cp) => ({
      ...cp,
      roles: part.roles,
      source: reading.source,
      evidence: reading.evidence,
    }));

    if (childPaths.length === 0) {
      findings.push({ id: part.id, kind: 'no-paths' });
    }
    vectors.push(...childPaths);
    vectors.push({
      id: part.id,
      type: 'group',
      frame: null,
      box: part.box,
      children: childPaths.map((c) => c.id),
      roles: part.roles,
      source: reading.source,
      evidence: reading.evidence,
      window: [0, 10],
    });
  }

  return { vectors, findings };
}
