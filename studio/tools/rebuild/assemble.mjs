import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const REBUILD_DIR = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_DIR = path.resolve(REBUILD_DIR, '..', '..');
const REPO_ROOT = path.resolve(STUDIO_DIR, '..');

export function letterbox(w, h) {
  const s = Math.min(1920 / w, 1080 / h);
  const ox = (1920 - w * s) / 2;
  const oy = (1080 - h * s) / 2;
  return { s, ox, oy };
}

function mapBox(box, lb) {
  return [
    box[0] * lb.s + lb.ox,
    box[1] * lb.s + lb.oy,
    box[2] * lb.s,
    box[3] * lb.s,
  ];
}

function mapPathD(d, lb) {
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
      out.push(String(Number((isRel ? x * lb.s : x * lb.s + lb.ox).toFixed(3))));
    } else if (upper === 'V') {
      const y = Number(tokens[i++]);
      out.push(String(Number((isRel ? y * lb.s : y * lb.s + lb.oy).toFixed(3))));
    } else {
      const x = Number(tokens[i++]);
      const y = Number(tokens[i++]);
      out.push(
        String(Number((isRel ? x * lb.s : x * lb.s + lb.ox).toFixed(3))),
        String(Number((isRel ? y * lb.s : y * lb.s + lb.oy).toFixed(3))),
      );
    }
  }
  return out.join(' ');
}

function makeSolidPng(width, height) {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
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
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  const rowLen = 1 + w * 4;
  const raw = Buffer.alloc(rowLen * h);
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function writeCropPng(readingImage, box, outFile) {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const imgCandidates = [
    path.resolve(REPO_ROOT, readingImage),
    path.resolve(STUDIO_DIR, readingImage),
    path.resolve(readingImage),
  ];
  const srcImg = imgCandidates.find((p) => fs.existsSync(p));
  if (srcImg) {
    const [x, y, w, h] = box.map((v) => Math.max(1, Math.round(v)));
    const py = spawnSync(
      'py',
      [
        '-3',
        '-I',
        '-c',
        `from PIL import Image; im = Image.open(r'''${srcImg}'''); im.crop((${x}, ${y}, ${x + w}, ${y + h})).save(r'''${outFile}''')`,
      ],
      { encoding: 'utf8' },
    );
    if (py.status === 0 && fs.existsSync(outFile)) return;
  }
  fs.writeFileSync(outFile, makeSolidPng(box[2], box[3]));
}

export async function assemble(reading, traced, outDir) {
  const lb = letterbox(reading.width, reading.height);
  const vectors = [];
  const report = [];
  const cropsDir = path.join(outDir, 'crops');
  fs.mkdirSync(cropsDir, { recursive: true });

  const tracedById = new Map(traced.map((v) => [v.id, v]));

  for (const part of reading.parts ?? []) {
    const lBox = mapBox(part.box, lb);

    if (part.form === 'vector') {
      if (part.trace) {
        const grp = tracedById.get(part.id);
        if (grp) {
          for (const cid of grp.children ?? []) {
            const child = tracedById.get(cid);
            if (child) {
              vectors.push({
                ...child,
                box: mapBox(child.box, lb),
                d: child.d ? mapPathD(child.d, lb) : undefined,
                window: [0, 10],
              });
            }
          }
          if ((grp.children ?? []).length === 0) {
            report.push({ id: part.id, kind: 'no-paths' });
          }
          vectors.push({
            ...grp,
            box: lBox,
            window: [0, 10],
          });
        }
      } else if (part.vector) {
        const pv = part.vector;
        const vecObj = {
          id: part.id,
          type: pv.type,
          frame: null,
          box: lBox,
          ...(pv.d ? { d: mapPathD(pv.d, lb) } : {}),
          ...(pv.shape ? { shape: pv.shape } : {}),
          ...(pv.from ? { from: [pv.from[0] * lb.s + lb.ox, pv.from[1] * lb.s + lb.oy] } : {}),
          ...(pv.to ? { to: [pv.to[0] * lb.s + lb.ox, pv.to[1] * lb.s + lb.oy] } : {}),
          roles: part.roles,
          source: reading.source,
          evidence: reading.evidence,
          window: [0, 10],
        };
        vectors.push(vecObj);
      }
      continue;
    }

    if (part.form === 'text') {
      vectors.push({
        id: part.id,
        type: 'label',
        frame: null,
        box: lBox,
        text: part.text,
        roles: part.roles,
        source: reading.source,
        evidence: reading.evidence,
        window: [0, 10],
      });
      continue;
    }

    if (part.form === 'pixels') {
      const cropFile = path.join(cropsDir, `${part.id}.png`);
      writeCropPng(reading.image, part.box, cropFile);
      vectors.push({
        id: part.id,
        type: 'image',
        frame: null,
        box: lBox,
        href: `crops/${part.id}.png`,
        roles: part.roles,
        source: reading.source,
        evidence: reading.evidence,
        window: [0, 10],
      });
      continue;
    }

    if (part.form === 'model') {
      const cropFile = path.join(cropsDir, `${part.id}.png`);
      writeCropPng(reading.image, part.box, cropFile);
      report.push({ id: part.id, kind: 'model-as-pixels' });
      vectors.push({
        id: part.id,
        type: 'image',
        frame: null,
        box: lBox,
        href: `crops/${part.id}.png`,
        roles: part.roles,
        source: reading.source,
        evidence: reading.evidence,
        window: [0, 10],
      });
      continue;
    }

    if (part.form === 'structure') {
      const pdbRef = part.ref ?? '';
      const pdbUpper = path.join(REPO_ROOT, 'data', 'pdb', `${pdbRef.toUpperCase()}.pdb`);
      const pdbLower = path.join(REPO_ROOT, 'data', 'pdb', `${pdbRef.toLowerCase()}.pdb`);
      const pdbFile = fs.existsSync(pdbUpper) ? pdbUpper : fs.existsSync(pdbLower) ? pdbLower : null;
      if (!pdbFile) {
        throw new Error(`${pdbRef}.pdb not found in data/pdb/`);
      }
      const cropFile = path.join(cropsDir, `${part.id}.png`);
      const wPx = Math.max(64, Math.round(part.box[2] * lb.s));
      const hPx = Math.max(64, Math.round(part.box[3] * lb.s));
      const tmplPath = path.join(REBUILD_DIR, 'render_structure.cxc.tmpl');
      const chimeraxCandidates = [
        process.env.CHIMERAX_EXE,
        'C:\\Program Files\\ChimeraX 1.10.dev202504170618\\bin\\ChimeraX-console.exe',
        'C:\\Program Files\\ChimeraX\\bin\\ChimeraX-console.exe',
      ].filter((p) => p && fs.existsSync(p));

      let renderedViaCxc = false;
      if (chimeraxCandidates.length > 0 && fs.existsSync(tmplPath) && process.env.STUDIO_SKIP_CHIMERAX !== '1') {
        const tmpl = fs.readFileSync(tmplPath, 'utf8');
        const cxcText = tmpl
          .replace(/\{\{PDB\}\}/g, pdbFile.replace(/\\/g, '/'))
          .replace(/\{\{OUT\}\}/g, cropFile.replace(/\\/g, '/'))
          .replace(/\{\{W\}\}/g, String(wPx))
          .replace(/\{\{H\}\}/g, String(hPx));
        const cxcFile = path.join(cropsDir, `${part.id}.cxc`);
        fs.writeFileSync(cxcFile, cxcText, 'utf8');
        const cxcRes = spawnSync(chimeraxCandidates[0], ['--nogui', '--script', cxcFile, '--exit'], {
          encoding: 'utf8',
        });
        fs.rmSync(cxcFile, { force: true });
        if (cxcRes.status === 0 && fs.existsSync(cropFile)) {
          renderedViaCxc = true;
        }
      }
      if (!renderedViaCxc) {
        fs.writeFileSync(cropFile, makeSolidPng(wPx, hPx));
      }
      report.push({ id: part.id, kind: 'structure-render' });
      vectors.push({
        id: part.id,
        type: 'image',
        frame: null,
        box: lBox,
        href: `crops/${part.id}.png`,
        roles: part.roles,
        source: { kind: 'pdb', ref: pdbRef },
        evidence: 'published',
        window: [0, 10],
      });
    }
  }

  const job = {
    rebuild: true,
    world: {
      id: 'rebuild',
      duration: 10,
      frames: [{ id: 'root', parent: null, unit: 1, origin: [0, 0, 0] }],
      objects: [],
    },
    timeline: { tracks: [] },
    paths: [
      {
        id: 'deck',
        kind: 'deck',
        keys: [
          {
            t: 0,
            at: { frame: 'root', pos: [0, 0, 2] },
            target: { frame: 'root', pos: [0, 0, 0] },
            fov: 40,
          },
        ],
        stops: [0],
      },
    ],
    lens: 'journal',
    langs: ['en'],
    layout: [{ stop: 0, lang: 'en', blocks: [] }],
    notes: {},
    vectors,
  };

  return { job, report };
}
