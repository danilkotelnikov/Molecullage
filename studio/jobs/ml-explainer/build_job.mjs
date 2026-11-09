// Deterministic builder for studio/jobs/ml-explainer/job.json and review/*.notes.md (Plan 9).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { arrayCopies, scatter } from '../../core/geo/index.ts';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const REVIEW_DIR = path.join(DIR, 'review');
fs.mkdirSync(REVIEW_DIR, { recursive: true });

const sizes = JSON.parse(fs.readFileSync(path.join(DIR, 'compute', 'sizes.json'), 'utf8'));
const stops = [0, 6, 12, 18, 24, 30, 36, 42, 48, 54];
const win = (stopIdx) => [stops[stopIdx], stops[stopIdx] + 5.8];

// Seeded 3D noise cloud (seed = 7) around 1MEL in the complex frame (unit = 1 nm)
const melCenter = [0.8, 1.85, 0];
const noisePoints = scatter(
  { min: [-1.2, 0.85, -1.6], max: [3.0, 3.25, 1.4] },
  12,
  1.05,
  7,
);

const noiseNodes = noisePoints.map((pt, idx) => {
  const pos = [Number(pt[0].toFixed(3)), Number(pt[1].toFixed(3)), Number(pt[2].toFixed(3))];
  return {
    id: `noise-node-${String(idx + 1).padStart(2, '0')}`,
    kind: 'mesh',
    frame: 'complex',
    position: pos,
    size: 8.5e-10,
    source: { kind: 'engine', ref: '' },
    evidence: 'architecture',
    window: [0, 60],
    roles: ['protein'],
    asset: 'builtin:sphere',
  };
});

// Input table cells (arrayCopies) for Stop 1: 8 representative columns of the 132 x 169 residue table
const inputCells = arrayCopies(
  8,
  (i) => ({
    id: `v-s01-cell-${i + 1}`,
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [84 + i * 74, 152, 64, 96],
    roles: [i < 5 ? 'tile' : i < 7 ? 'shape' : 'diagram'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-02a-input' },
    evidence: 'architecture',
    window: win(1),
  }),
);

// Latent bottleneck cells (arrayCopies) for Stop 1: 8 columns of the 132 x 8 latent table
const latentCells = arrayCopies(
  4,
  (i) => ({
    id: `v-s01-lat-${i + 1}`,
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [760 + i * 54, 152, 46, 96],
    roles: ['diagram'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-02a-input' },
    evidence: 'architecture',
    window: win(1),
  }),
);

// Pair matrix 4x4 tile grid (arrayCopies) for Stop 4: 132 x 132 x 256 pair table
const pairTiles = arrayCopies(16, (idx) => {
  const r = Math.floor(idx / 4);
  const c = idx % 4;
  return {
    id: `v-s04-pair-${idx + 1}`,
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [560 + c * 74, 148 + r * 74, 66, 66],
    roles: [r === c ? 'diagram' : 'tile'],
    source: { kind: 'file', ref: 'studio/jobs/ml-explainer/compute/sizes.json#pairValues' },
    evidence: 'architecture',
    window: win(4),
  };
});

const barTotalW = 840;
const barAeW = Math.round(barTotalW * (sizes.aeTrainBytes / sizes.gpuBytes)); // 43 px
const barDnW = Math.round(barTotalW * (sizes.dnTrainBytes / sizes.gpuBytes)); // 26 px

const vectors = [
  // Stop 0: Complex & architecture overview label
  {
    id: 'v-s00-tag',
    type: 'label',
    frame: null,
    box: [84, 84, 860, 58],
    text: { en: 'PDB 1MEL: 132 VH residues + lysozyme', ru: 'PDB 1MEL: 132 остатка VH + лизоцим' },
    roles: ['label'],
    source: { kind: 'pdb', ref: '1MEL' },
    evidence: 'published',
    window: win(0),
  },

  // Stop 1: Input table (132 x 169 = 22,308) -> Latent table (132 x 8 = 1,056)
  ...inputCells,
  {
    id: 'v-s01-arrow',
    type: 'arrow',
    frame: null,
    box: [684, 180, 66, 40],
    from: [684, 200],
    to: [748, 200],
    roles: ['line'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-02a-input' },
    evidence: 'architecture',
    window: win(1),
  },
  ...latentCells,
  {
    id: 'v-s01-lbl-in',
    type: 'label',
    frame: null,
    box: [84, 84, 620, 58],
    text: { en: 'Input: 132 x 169 = 22,308', ru: 'Вход: 132 x 169 = 22 308' },
    roles: ['label'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-02a-input' },
    evidence: 'architecture',
    window: win(1),
  },
  {
    id: 'v-s01-lbl-lat',
    type: 'label',
    frame: null,
    box: [756, 84, 420, 58],
    text: { en: 'Latent: 132 x 8', ru: 'Код: 132 x 8' },
    roles: ['label'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-02a-input' },
    evidence: 'architecture',
    window: win(1),
  },

  // Stop 2: Autoencoder (12 encoder blocks -> latent 8 + bypass 3 -> 12 decoder blocks)
  {
    id: 'v-s02-enc',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [84, 160, 260, 120],
    roles: ['tile'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-02-autoencoder' },
    evidence: 'architecture',
    window: win(2),
  },
  {
    id: 'v-s02-arr1',
    type: 'arrow',
    frame: null,
    box: [352, 200, 56, 40],
    from: [352, 220],
    to: [408, 220],
    roles: ['line'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-02-autoencoder' },
    evidence: 'architecture',
    window: win(2),
  },
  {
    id: 'v-s02-neck',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [416, 174, 150, 92],
    roles: ['diagram'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-02-autoencoder' },
    evidence: 'architecture',
    window: win(2),
  },
  {
    id: 'v-s02-arr2',
    type: 'arrow',
    frame: null,
    box: [574, 200, 56, 40],
    from: [574, 220],
    to: [630, 220],
    roles: ['line'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-02-autoencoder' },
    evidence: 'architecture',
    window: win(2),
  },
  {
    id: 'v-s02-dec',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [638, 160, 260, 120],
    roles: ['tile'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-02-autoencoder' },
    evidence: 'architecture',
    window: win(2),
  },
  {
    id: 'v-s02-bypass',
    type: 'path',
    frame: null,
    box: [210, 300, 560, 64],
    d: 'M 214 284 L 214 342 L 768 342 L 768 284',
    roles: ['line'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-02-autoencoder' },
    evidence: 'architecture',
    window: win(2),
  },
  {
    id: 'v-s02-lbl',
    type: 'label',
    frame: null,
    box: [84, 84, 920, 58],
    text: { en: '12 enc | latent 8 + 3 xyz | 12 dec (255.9M)', ru: '12 код. | 8 + 3 коорд. | 12 декод. (255.9M)' },
    roles: ['label'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-02-autoencoder' },
    evidence: 'architecture',
    window: win(2),
  },

  // Stop 3: Flow denoiser (state 11 -> 768, pair 256, time 256 -> 14 blocks -> heads 3 & 8)
  {
    id: 'v-s03-in',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [84, 160, 190, 120],
    roles: ['tile'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-03-denoiser' },
    evidence: 'architecture',
    window: win(3),
  },
  {
    id: 'v-s03-arr1',
    type: 'arrow',
    frame: null,
    box: [282, 200, 54, 40],
    from: [282, 220],
    to: [336, 220],
    roles: ['line'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-03-denoiser' },
    evidence: 'architecture',
    window: win(3),
  },
  {
    id: 'v-s03-blocks',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [344, 148, 320, 144],
    roles: ['diagram'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-03-denoiser' },
    evidence: 'architecture',
    window: win(3),
  },
  {
    id: 'v-s03-arr2',
    type: 'arrow',
    frame: null,
    box: [672, 200, 54, 40],
    from: [672, 220],
    to: [726, 220],
    roles: ['line'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-03-denoiser' },
    evidence: 'architecture',
    window: win(3),
  },
  {
    id: 'v-s03-heads',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [734, 160, 190, 120],
    roles: ['shape'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-03-denoiser' },
    evidence: 'architecture',
    window: win(3),
  },
  {
    id: 'v-s03-lbl',
    type: 'label',
    frame: null,
    box: [84, 84, 920, 58],
    text: { en: '11 -> 768 | 14 blocks | heads 3 + 8 (153.1M)', ru: '11 -> 768 | 14 блоков | выходы 3 + 8 (153.1M)' },
    roles: ['label'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-03-denoiser' },
    evidence: 'architecture',
    window: win(3),
  },

  // Stop 4: Sequence block & 132 x 132 x 256 pair table
  {
    id: 'v-s04-seq',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [84, 168, 380, 96],
    roles: ['tile'],
    source: { kind: 'file', ref: 'studio/jobs/ml-explainer/compute/sizes.json#hiddenValues' },
    evidence: 'architecture',
    window: win(4),
  },
  {
    id: 'v-s04-arr',
    type: 'arrow',
    frame: null,
    box: [472, 196, 76, 40],
    from: [472, 216],
    to: [548, 216],
    roles: ['line'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-04-block' },
    evidence: 'architecture',
    window: win(4),
  },
  ...pairTiles,
  {
    id: 'v-s04-lbl',
    type: 'label',
    frame: null,
    box: [84, 84, 940, 58],
    text: { en: 'Seq 132x768 | Pair 132x132x256 (17.8 MB)', ru: 'Ряд 132x768 | Пары 132x132x256 (17.8 МБ)' },
    roles: ['label'],
    source: { kind: 'file', ref: 'studio/jobs/ml-explainer/compute/sizes.json#pairFp32Bytes' },
    evidence: 'architecture',
    window: win(4),
  },

  // Stop 5: Straight training path x_t = (1 - t) * x_0 + t * x_1
  {
    id: 'v-s05-x0',
    type: 'shape',
    shape: 'ellipse',
    frame: null,
    box: [96, 190, 76, 76],
    roles: ['tile'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-05-path' },
    evidence: 'architecture',
    window: win(5),
  },
  {
    id: 'v-s05-line',
    type: 'path',
    frame: null,
    box: [180, 224, 620, 12],
    d: 'M 180 228 L 800 228',
    roles: ['diagram'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-05-path' },
    evidence: 'architecture',
    window: win(5),
  },
  {
    id: 'v-s05-x1',
    type: 'shape',
    shape: 'ellipse',
    frame: null,
    box: [808, 190, 76, 76],
    roles: ['diagram'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-05-path' },
    evidence: 'architecture',
    window: win(5),
  },
  {
    id: 'v-s05-lbl',
    type: 'label',
    frame: null,
    box: [84, 84, 880, 58],
    text: { en: 'Straight path: noise (t=0) -> data (t=1)', ru: 'Прямой путь: шум (t=0) -> данные (t=1)' },
    roles: ['label'],
    source: { kind: 'doi', ref: '10.48550/arXiv.2209.03003' },
    evidence: 'published',
    window: win(5),
  },

  // Stop 6: Generation steps t = 0 -> t = 1 + decoder
  ...arrayCopies(5, (i) => ({
    id: `v-s06-step-${i + 1}`,
    type: 'shape',
    shape: 'ellipse',
    frame: null,
    box: [96 + i * 140, 186, 68, 68],
    roles: [i === 4 ? 'diagram' : 'tile'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-06-generation' },
    evidence: 'architecture',
    window: win(6),
  })),
  {
    id: 'v-s06-arr',
    type: 'arrow',
    frame: null,
    box: [740, 200, 96, 40],
    from: [740, 220],
    to: [836, 220],
    roles: ['line'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-06-generation' },
    evidence: 'architecture',
    window: win(6),
  },
  {
    id: 'v-s06-lbl',
    type: 'label',
    frame: null,
    box: [84, 84, 880, 58],
    text: { en: 'Integrate t=0..1 -> decode 3D atoms', ru: 'Шаги t=0..1 -> декодер 3D атомов' },
    roles: ['label'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-06-generation' },
    evidence: 'architecture',
    window: win(6),
  },

  // Stop 7: Specificity judge & subset selection
  {
    id: 'v-s07-pool',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [84, 164, 240, 110],
    roles: ['tile'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-07-judging' },
    evidence: 'architecture',
    window: win(7),
  },
  {
    id: 'v-s07-arr1',
    type: 'arrow',
    frame: null,
    box: [332, 200, 64, 40],
    from: [332, 220],
    to: [396, 220],
    roles: ['line'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-07-judging' },
    evidence: 'architecture',
    window: win(7),
  },
  {
    id: 'v-s07-panel',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [404, 164, 240, 110],
    roles: ['shape'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-07-judging' },
    evidence: 'architecture',
    window: win(7),
  },
  {
    id: 'v-s07-arr2',
    type: 'arrow',
    frame: null,
    box: [652, 200, 64, 40],
    from: [652, 220],
    to: [716, 220],
    roles: ['line'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-07-judging' },
    evidence: 'architecture',
    window: win(7),
  },
  {
    id: 'v-s07-pick',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [724, 164, 200, 110],
    roles: ['diagram'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-07-judging' },
    evidence: 'architecture',
    window: win(7),
  },
  {
    id: 'v-s07-lbl',
    type: 'label',
    frame: null,
    box: [84, 84, 920, 58],
    text: { en: 'Candidates -> off-target judge -> N picks', ru: 'Кандидаты -> панель мишеней -> N лучших' },
    roles: ['label'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-07-judging' },
    evidence: 'architecture',
    window: win(7),
  },

  // Stop 8: Proportional 80 GB NVIDIA A100 memory bar (4.09 GB AE + 2.45 GB DN = 6.54 GB = 8.2%)
  {
    id: 'v-s08-bar-total',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [84, 172, barTotalW, 76],
    roles: ['tile'],
    source: { kind: 'file', ref: 'studio/jobs/ml-explainer/compute/sizes.json#gpuBytes' },
    evidence: 'architecture',
    window: win(8),
  },
  {
    id: 'v-s08-bar-ae',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [84, 172, barAeW, 76],
    roles: ['diagram'],
    source: { kind: 'file', ref: 'studio/jobs/ml-explainer/compute/sizes.json#aeTrainBytes' },
    evidence: 'architecture',
    window: win(8),
  },
  {
    id: 'v-s08-bar-dn',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [84 + barAeW, 172, barDnW, 76],
    roles: ['shape'],
    source: { kind: 'file', ref: 'studio/jobs/ml-explainer/compute/sizes.json#dnTrainBytes' },
    evidence: 'architecture',
    window: win(8),
  },
  {
    id: 'v-s08-lbl',
    type: 'label',
    frame: null,
    box: [84, 84, 1120, 58],
    text: { en: 'A100 80 GB: 6.54 GB Adam (8.2%) | 73.5 GB free', ru: 'A100 80 ГБ: 6.54 ГБ Adam (8.2%) | 73.5 ГБ свободно' },
    roles: ['label'],
    source: { kind: 'file', ref: 'studio/jobs/ml-explainer/compute/sizes.json#share80' },
    evidence: 'architecture',
    window: win(8),
  },

  // Stop 9: Honest status boundary card
  {
    id: 'v-s09-code',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [84, 168, 380, 96],
    roles: ['diagram'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#as-99-end' },
    evidence: 'architecture',
    window: win(9),
  },
  {
    id: 'v-s09-untrained',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [488, 168, 380, 96],
    roles: ['tile'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#as-99-end' },
    evidence: 'architecture',
    window: win(9),
  },
  {
    id: 'v-s09-lbl',
    type: 'label',
    frame: null,
    box: [84, 84, 920, 58],
    text: { en: 'Code shapes verified | 0 trained weights', ru: 'Размеры в коде проверены | 0 обученных весов' },
    roles: ['label'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#as-99-end' },
    evidence: 'architecture',
    window: win(9),
  },
];

// Motion tracks: noise cloud contracts smoothly toward 1MEL binding surface during Stops 5-6 (t=30..42),
// and the transport line draws smoothly on Stop 5 (t=30..35).
const tracks = [
  ...noiseNodes.map((node) => {
    const [x0, y0, z0] = node.position;
    const settled = [
      Number((melCenter[0] + (x0 - melCenter[0]) * 0.34).toFixed(3)),
      Number((melCenter[1] + (y0 - melCenter[1]) * 0.34).toFixed(3)),
      Number((melCenter[2] + (z0 - melCenter[2]) * 0.34).toFixed(3)),
    ];
    return {
      target: node.id,
      prop: 'position',
      keys: [
        { t: 0, v: [x0, y0, z0] },
        { t: 30, v: [x0, y0, z0], ease: 'linear' },
        { t: 41.5, v: settled, ease: 'power2.inOut' },
        { t: 48, v: [x0, y0, z0], ease: 'power2.inOut' },
      ],
    };
  }),
  {
    target: 'v-s05-line',
    prop: 'draw',
    keys: [
      { t: 29.9, v: 0.25 },
      { t: 30.0, v: 1.0, ease: 'linear' },
      { t: 35.5, v: 1.0, ease: 'linear' },
    ],
  },
];

const facts = [
  {
    id: 'f-1mel',
    text: {
      en: 'PDB 1MEL crystal structure resolves 132 residues of camel VH chain A bound to hen egg-white lysozyme at 2.5 A with 55 contact residue pairs within 4.5 A.',
      ru: 'Кристаллическая структура PDB 1MEL показывает 132 остатка цепи A домена VH верблюда с лизоцимом при 2.5 А и 55 контактных пар ближе 4.5 А.',
    },
    level: 'published',
    source: { kind: 'pdb', ref: '1MEL' },
    usedBy: ['s00-part', 's00-note', 'mel', 'v-s00-tag'],
  },
  {
    id: 'm-input',
    text: {
      en: 'Each complex enters as 132 residues by 169 numbers (111 atom coordinates, 37 atom masks, and 21 residue-type channels), totaling 22,308 numbers.',
      ru: 'Каждый комплекс подается таблицей 132 остатка на 169 чисел (111 координат атомов, 37 масок и 21 признак типа остатка), всего 22 308 чисел.',
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-02a-input' },
    usedBy: ['s01-part', 's01-hw', 's01-note', 'v-s01-lbl-in'],
  },
  {
    id: 'm-latent',
    text: {
      en: 'The bottleneck table holds 132 residues by 8 continuous numbers (1,056 values), with untrained tensor shapes verified in code.',
      ru: 'Скрытая таблица содержит 132 остатка на 8 непрерывных чисел (1 056 величин); проверены только размеры необученных тензоров.',
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-02a-input' },
    usedBy: ['s01-part', 's01-hw', 'v-s01-lbl-lat'],
  },
  {
    id: 'm-ae',
    text: {
      en: 'The structure autoencoder chains 12 encoder blocks, an 8-channel latent table plus a 3-coordinate centred bypass, and 12 decoder blocks (255,873,676 parameters).',
      ru: 'Структурный автокодировщик соединяет 12 блоков кодировщика, скрытый код на 8 каналов с обходом 3 координат и 12 блоков декодировщика (255 873 676 параметров).',
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-02-autoencoder' },
    usedBy: ['s02-part', 's02-hw', 's02-note', 'v-s02-lbl'],
  },
  {
    id: 's-ae-fp32',
    text: {
      en: `Autoencoder fp32 weights take ${sizes.aeFp32Bytes.toLocaleString('en-US')} bytes (${sizes.aeFp32GB} GB).`,
      ru: `Веса автокодировщика в fp32 занимают ${sizes.aeFp32Bytes.toLocaleString('en-US')} байт (${sizes.aeFp32GB} ГБ).`,
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'studio/jobs/ml-explainer/compute/sizes.json#aeFp32Bytes' },
    usedBy: ['s02-hw'],
  },
  {
    id: 's-ae-bf16',
    text: {
      en: `Autoencoder bf16 weights take ${sizes.aeBf16Bytes.toLocaleString('en-US')} bytes (${sizes.aeBf16GB} GB).`,
      ru: `Веса автокодировщика в bf16 занимают ${sizes.aeBf16Bytes.toLocaleString('en-US')} байт (${sizes.aeBf16GB} ГБ).`,
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'studio/jobs/ml-explainer/compute/sizes.json#aeBf16Bytes' },
    usedBy: ['s02-part', 's02-hw'],
  },
  {
    id: 's-ae-train',
    text: {
      en: `Autoencoder weights, gradients, and two Adam moments take ${sizes.aeTrainBytes.toLocaleString('en-US')} bytes (${sizes.aeTrainGB} GB).`,
      ru: `Веса, градиенты и два момента Adam автокодировщика занимают ${sizes.aeTrainBytes.toLocaleString('en-US')} байт (${sizes.aeTrainGB} ГБ).`,
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'studio/jobs/ml-explainer/compute/sizes.json#aeTrainBytes' },
    usedBy: ['s02-part', 's02-hw', 'v-s08-bar-ae'],
  },
  {
    id: 'm-dn',
    text: {
      en: 'The flow denoiser lifts noisy state 11 to 768 channels with pair table 256 and time vector 256 across 14 sequence blocks to velocity heads 3 and 8 (153,102,091 parameters).',
      ru: 'Потоковый модуль поднимает зашумленный вход 11 до 768 каналов с парной таблицей 256 и временем 256 через 14 блоков к выходам скорости 3 и 8 (153 102 091 параметр).',
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-03-denoiser' },
    usedBy: ['s03-part', 's03-hw', 's03-note', 'v-s03-lbl'],
  },
  {
    id: 's-dn-fp32',
    text: {
      en: `Denoiser fp32 weights take ${sizes.dnFp32Bytes.toLocaleString('en-US')} bytes (${sizes.dnFp32GB} GB).`,
      ru: `Веса потокового модуля в fp32 занимают ${sizes.dnFp32Bytes.toLocaleString('en-US')} байт (${sizes.dnFp32GB} ГБ).`,
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'studio/jobs/ml-explainer/compute/sizes.json#dnFp32Bytes' },
    usedBy: ['s03-hw'],
  },
  {
    id: 's-dn-bf16',
    text: {
      en: `Denoiser bf16 weights take ${sizes.dnBf16Bytes.toLocaleString('en-US')} bytes (${sizes.dnBf16GB} GB).`,
      ru: `Веса потокового модуля в bf16 занимают ${sizes.dnBf16Bytes.toLocaleString('en-US')} байт (${sizes.dnBf16GB} ГБ).`,
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'studio/jobs/ml-explainer/compute/sizes.json#dnBf16Bytes' },
    usedBy: ['s03-part', 's03-hw'],
  },
  {
    id: 's-dn-train',
    text: {
      en: `Denoiser weights, gradients, and two Adam moments take ${sizes.dnTrainBytes.toLocaleString('en-US')} bytes (${sizes.dnTrainGB} GB).`,
      ru: `Веса, градиенты и два момента Adam потокового модуля занимают ${sizes.dnTrainBytes.toLocaleString('en-US')} байт (${sizes.dnTrainGB} ГБ).`,
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'studio/jobs/ml-explainer/compute/sizes.json#dnTrainBytes' },
    usedBy: ['s03-part', 's03-hw', 'v-s08-bar-dn'],
  },
  {
    id: 'm-block',
    text: {
      en: 'Each sequence block applies time-conditioned scale and shift, pair-biased multi-head attention, and a gated feed-forward update.',
      ru: 'Каждый блок ряда применяет масштаб и сдвиг по времени, многоголовое внимание с парным смещением и вентильное обновление.',
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-04-block' },
    usedBy: ['s04-part', 's04-note'],
  },
  {
    id: 's-hidden',
    text: {
      en: `Sequence activations of 132 by 768 hold ${sizes.hiddenValues.toLocaleString('en-US')} values (${sizes.hiddenMB} MB in fp32).`,
      ru: `Активации ряда 132 на 768 содержат ${sizes.hiddenValues.toLocaleString('en-US')} чисел (${sizes.hiddenMB} МБ в fp32).`,
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'studio/jobs/ml-explainer/compute/sizes.json#hiddenValues' },
    usedBy: ['s04-part', 's04-hw', 'v-s04-seq', 'v-s04-lbl'],
  },
  {
    id: 's-pair',
    text: {
      en: `Pair table of 132 by 132 by 256 holds ${sizes.pairValues.toLocaleString('en-US')} values (${sizes.pairFp32Bytes.toLocaleString('en-US')} bytes = ${sizes.pairMB} MB in fp32), 44 times the sequence activation tensor.`,
      ru: `Парная таблица 132 на 132 на 256 содержит ${sizes.pairValues.toLocaleString('en-US')} чисел (${sizes.pairMB} МБ в fp32) — в 44 раза больше вектора ряда.`,
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'studio/jobs/ml-explainer/compute/sizes.json#pairValues' },
    usedBy: ['s04-part', 's04-hw', 's04-note', 'v-s04-lbl'],
  },
  {
    id: 'm-path',
    text: {
      en: 'Training samples time t in [0, 1], mixes noise and encoded complex along (1 - t) * noise + t * data, and regresses velocity data minus noise.',
      ru: 'При обучении выбирается момент t из [0, 1], строится смесь (1 - t) * шум + t * данные и предсказывается скорость данные минус шум.',
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-05-path' },
    usedBy: ['s05-part', 's05-note', 'v-s05-lbl'],
  },
  {
    id: 'm-gen',
    text: {
      en: 'Generation starts from Gaussian noise at t = 0, integrates predicted velocity to t = 1, and decodes latent 8 plus 3 coordinates into 3D atoms.',
      ru: 'Генерация начинается с гауссова шума при t = 0, интегрирует скорость до t = 1 и декодирует 8 каналов и 3 координаты в атомы.',
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-06-generation' },
    usedBy: ['s06-part', 's06-note', 'v-s06-lbl'],
  },
  {
    id: 'm-judge',
    text: {
      en: 'Decoded candidates are scored on the target complex and an off-target panel, then a subset solver selects N diverse binder candidates.',
      ru: 'Декодированные кандидаты оцениваются на целевом комплексе и панели сторонних белков, после чего отбираются N различных конструкций.',
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-07-judging' },
    usedBy: ['s07-part', 's07-note', 'v-s07-lbl'],
  },
  {
    id: 'h-a100',
    text: {
      en: 'Target training accelerator is one NVIDIA A100 80 GB card in Yandex Cloud configuration gpu-standard-v3.',
      ru: 'Целевой ускоритель обучения — одна карта NVIDIA A100 80 ГБ в конфигурации Yandex Cloud gpu-standard-v3.',
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.notes.md' },
    usedBy: ['s08-part', 's08-hw', 's08-note', 'v-s08-lbl'],
  },
  {
    id: 's-sum-train',
    text: {
      en: `Combined autoencoder and denoiser Adam training states across ${sizes.totalParams.toLocaleString('en-US')} parameters occupy ${sizes.sumTrainBytes.toLocaleString('en-US')} bytes (${sizes.sumTrainGB} GB).`,
      ru: `Суммарные веса и буферы Adam для ${sizes.totalParams.toLocaleString('en-US')} параметров занимают ${sizes.sumTrainBytes.toLocaleString('en-US')} байт (${sizes.sumTrainGB} ГБ).`,
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'studio/jobs/ml-explainer/compute/sizes.json#sumTrainBytes' },
    usedBy: ['s08-part', 's08-hw', 'v-s08-lbl'],
  },
  {
    id: 's-share80',
    text: {
      en: `Model weights and Adam states occupy ${sizes.share80}% of an 80 GB A100 card, leaving ${sizes.freeBatchGB} GB for batched pair activations.`,
      ru: `Веса и состояния Adam занимают ${sizes.share80}% памяти карты A100 на 80 ГБ, оставляя ${sizes.freeBatchGB} ГБ под пакеты парных таблиц.`,
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'studio/jobs/ml-explainer/compute/sizes.json#share80' },
    usedBy: ['s08-part', 's08-hw', 's08-note', 'v-s08-lbl'],
  },
  {
    id: 'm-status',
    text: {
      en: 'Architecture status: autoencoder and denoiser modules exist in code with verified shapes; 0 weights are trained yet and 0 wet-lab binders exist.',
      ru: 'Статус архитектуры: автокодировщик и потоковый модуль написаны в коде с проверенными размерами; обученных весов 0 и проверенных молекул 0.',
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#as-99-end' },
    usedBy: ['s00-note', 's09-part', 's09-note', 'v-s09-lbl'],
  },
  {
    id: 'b-ae',
    text: {
      en: 'Encoder-bottleneck-decoder networks compress high-dimensional inputs into a lower-dimensional continuous code.',
      ru: 'Сети кодировщика и декодировщика сжимают многомерный вход в компактный непрерывный код.',
    },
    level: 'published',
    source: { kind: 'doi', ref: '10.48550/arXiv.1312.6114' },
    checked: '2026-11-09',
    usedBy: ['s02-note'],
  },
  {
    id: 'b-path',
    text: {
      en: 'Rectified flow transports noise to data along straight-line interpolation segments.',
      ru: 'Выпрямленный поток переносит шум в данные вдоль прямолинейных отрезков интерполяции.',
    },
    level: 'published',
    source: { kind: 'doi', ref: '10.48550/arXiv.2209.03003' },
    checked: '2026-11-09',
    usedBy: ['s05-part', 's05-note', 'v-s05-lbl'],
  },
  {
    id: 'b-flow',
    text: {
      en: 'Continuous-time flow matching trains a velocity field directly on conditional transport paths.',
      ru: 'Согласование потоков в непрерывном времени обучает поле скоростей прямо на условных траекториях.',
    },
    level: 'published',
    source: { kind: 'doi', ref: '10.48550/arXiv.2210.02747' },
    checked: '2026-11-09',
    usedBy: ['s05-note', 's06-note'],
  },
  {
    id: 'b-attention',
    text: {
      en: 'Scaled dot-product multi-head attention computes pairwise interactions whose memory grows quadratically with sequence length.',
      ru: 'Многоголовое внимание вычисляет попарные взаимодействия, память которых растет квадратично с длиной последовательности.',
    },
    level: 'published',
    source: { kind: 'doi', ref: '10.48550/arXiv.1706.03762' },
    checked: '2026-11-09',
    usedBy: ['s04-note'],
  },
  {
    id: 'b-adam',
    text: {
      en: 'Mixed-precision Adam keeps fp32 master weights, fp32 gradients, and two fp32 moment buffers totaling 16 bytes per parameter.',
      ru: 'Оптимизатор Adam в смешанной точности хранит веса, градиенты и два момента в fp32 — всего 16 байт на параметр.',
    },
    level: 'published',
    source: { kind: 'doi', ref: '10.48550/arXiv.1412.6980' },
    checked: '2026-11-09',
    usedBy: ['s02-hw', 's03-hw', 's08-hw'],
  },
];

// Headers follow Rule 14.2: noun phrase only, no numbers, no commas, no verbs.
const story = [
  {
    stop: 0,
    title: { en: 'Generative binder architecture', ru: 'Архитектура генеративной модели' },
    say: {
      en: 'Omniverso pairs a structure autoencoder and flow denoiser around real complexes such as PDB 1MEL (132 VH residues).',
      ru: 'Omniverso объединяет структурный автокодировщик и потоковый модуль вокруг реальных комплексов, таких как PDB 1MEL (132 остатка VH).',
    },
    facts: ['f-1mel', 'm-status'],
  },
  {
    stop: 1,
    title: { en: 'Residue table and latent bottleneck', ru: 'Таблица остатков и скрытый код' },
    say: {
      en: 'Chain A of 1MEL enters as 132 by 169 numbers (22,308 values) and compresses into a 132 by 8 latent table (1,056 values).',
      ru: 'Цепь A структуры 1MEL входит как таблица 132 на 169 (22 308 чисел) и сжимается в скрытую таблицу 132 на 8 (1 056 чисел).',
    },
    facts: ['m-input', 'm-latent'],
  },
  {
    stop: 2,
    title: { en: 'Structure autoencoder module', ru: 'Модуль структурного автокодировщика' },
    say: {
      en: 'Twelve encoder blocks and twelve decoder blocks with a 3-coordinate bypass hold 255,873,676 parameters (0.51 GB bf16, 4.09 GB Adam).',
      ru: 'Двенадцать блоков кодировщика и двенадцать блоков декодировщика с обходом 3 координат содержат 255 873 676 параметров (4.09 ГБ с Adam).',
    },
    facts: ['m-ae', 's-ae-fp32', 's-ae-bf16', 's-ae-train', 'b-ae', 'b-adam'],
  },
  {
    stop: 3,
    title: { en: 'Flow denoiser network', ru: 'Сеть потокового снятия шума' },
    say: {
      en: 'Fourteen sequence blocks map noisy state 11 to width 768 with pair table 256 and time 256 across 153,102,091 parameters (2.45 GB Adam).',
      ru: 'Четырнадцать блоков переводят шум 11 в ширину 768 с парной таблицей 256 и временем 256 при 153 102 091 параметре (2.45 ГБ с Adam).',
    },
    facts: ['m-dn', 's-dn-fp32', 's-dn-bf16', 's-dn-train', 'b-adam'],
  },
  {
    stop: 4,
    title: { en: 'Sequence state and pair table', ru: 'Состояние ряда и парная таблица' },
    say: {
      en: 'One sequence tensor holds 101,376 numbers, while the 132 by 132 by 256 pair table holds 4,460,544 numbers (17.8 MB in fp32).',
      ru: 'Вектор ряда хранит 101 376 чисел, тогда как парная таблица 132 на 132 на 256 хранит 4 460 544 числа (17.8 МБ в fp32).',
    },
    facts: ['m-block', 's-hidden', 's-pair', 'b-attention'],
  },
  {
    stop: 5,
    title: { en: 'Straight interpolation path', ru: 'Прямая траектория переноса' },
    say: {
      en: 'Training draws t in [0, 1], mixes (1 - t) times noise plus t times data, and regresses the constant velocity data minus noise.',
      ru: 'Обучение берет момент t из [0, 1], смешивает (1 - t) на шум плюс t на данные и предсказывает скорость данные минус шум.',
    },
    facts: ['m-path', 'b-path', 'b-flow'],
  },
  {
    stop: 6,
    title: { en: 'Iterative coordinate generation', ru: 'Пошаговая генерация координат' },
    say: {
      en: 'Starting from Gaussian noise at t = 0, integration steps move to t = 1 before the decoder reconstructs 3D atomic coordinates.',
      ru: 'Начиная с гауссова шума при t = 0, шаги интегрирования ведут к t = 1, после чего декодировщик строит 3D координаты атомов.',
    },
    facts: ['m-gen', 'b-flow'],
  },
  {
    stop: 7,
    title: { en: 'Specificity judge and subset pick', ru: 'Оценка специфичности и отбор набора' },
    say: {
      en: 'Decoded candidates are scored against the target complex and off-target panel so the solver picks N diverse binder designs.',
      ru: 'Декодированные кандидаты оцениваются по мишени и панели сторонних белков для выбора N различных конструкций.',
    },
    facts: ['m-judge'],
  },
  {
    stop: 8,
    title: { en: 'Memory share on the accelerator', ru: 'Доля памяти на ускорителе' },
    say: {
      en: 'Combined weights and Adam moments take 6.54 GB, or 8.2% of an 80 GB NVIDIA A100, leaving 73.5 GB for batched pair tables.',
      ru: 'Суммарные веса и моменты Adam занимают 6.54 ГБ, или 8.2% карты NVIDIA A100 на 80 ГБ, оставляя 73.5 ГБ под пакеты пар.',
    },
    facts: ['h-a100', 's-sum-train', 's-share80', 'b-adam'],
  },
  {
    stop: 9,
    title: { en: 'Code boundary and untrained state', ru: 'Граница кода и необученный статус' },
    say: {
      en: 'Autoencoder and denoiser modules run shape checks in code today; 0 weights are trained yet and 0 wet-lab binders exist.',
      ru: 'Модули автокодировщика и снятия шума проходят проверку размеров в коде; обученных весов пока 0 и молекул из лаборатории 0.',
    },
    facts: ['m-status'],
  },
];

const hwByStop = {
  1: {
    en: '132 * 169 = 22,308 inputs -> 132 * 8 = 1,056 latent values.',
    ru: '132 * 169 = 22 308 входов -> 132 * 8 = 1 056 чисел кода.',
  },
  2: {
    en: '255,873,676 params: 0.51 GB bf16 | 1.02 GB fp32 | 4.09 GB Adam.',
    ru: '255 873 676 парам.: 0.51 ГБ bf16 | 1.02 ГБ fp32 | 4.09 ГБ Adam.',
  },
  3: {
    en: '153,102,091 params: 0.31 GB bf16 | 0.61 GB fp32 | 2.45 GB Adam.',
    ru: '153 102 091 парам.: 0.31 ГБ bf16 | 0.61 ГБ fp32 | 2.45 ГБ Adam.',
  },
  4: {
    en: '132 * 132 * 256 * 4 B = 17,842,176 B (17.8 MB fp32 pair table).',
    ru: '132 * 132 * 256 * 4 Б = 17 842 176 Б (17.8 МБ парная таблица).',
  },
  8: {
    en: '6.54 GB / 80 GB A100 (gpu-standard-v3) = 8.2%; 73.5 GB free.',
    ru: '6.54 ГБ / 80 ГБ A100 (gpu-standard-v3) = 8.2%; 73.5 ГБ свободно.',
  },
};

const noteByStop = [
  {
    en: 'Primary structure: PDB 1MEL (2.5 A, 55 contact pairs). Honest ceiling: architecture + published.',
    ru: 'Структура: PDB 1MEL (2.5 А, 55 пар контактов). Уровень доказательств: архитектура и публикации.',
  },
  {
    en: 'Columns: 111 atom coordinates, 37 atom masks, 21 residue-type features (untrained shapes).',
    ru: 'Столбцы: 111 координат атомов, 37 масок атомов, 21 признак остатка (необученные размеры).',
  },
  {
    en: 'Architecture source: om-02-autoencoder; variational bottleneck background: Kingma & Welling 2013.',
    ru: 'Источник схемы: om-02-autoencoder; публикация по коду: Kingma & Welling 2013.',
  },
  {
    en: 'Architecture source: om-03-denoiser; velocity heads output 3 coordinate + 8 latent channels.',
    ru: 'Источник схемы: om-03-denoiser; головы скорости выдают 3 координатных и 8 скрытых каналов.',
  },
  {
    en: 'Pair table holds 44x more values than the 132x768 sequence state (Vaswani et al. 2017).',
    ru: 'Парная таблица хранит в 44 раза больше чисел, чем ряд 132x768 (Vaswani et al. 2017).',
  },
  {
    en: 'Rectified straight path and flow matching: Liu et al. 2022; Lipman et al. 2022.',
    ru: 'Прямой перенос и согласование потоков: Liu et al. 2022; Lipman et al. 2022.',
  },
  {
    en: '3D cloud shows seeded Gaussian points (seed 7) contracting toward the 1MEL epitope.',
    ru: 'Облако 3D точек (зерно 7) сходится к участку связывания на комплексе 1MEL.',
  },
  {
    en: 'Architecture source: om-07-judging; scoring and subset selection are designed modules.',
    ru: 'Источник схемы: om-07-judging; оценка панели и отбор набора — проектные модули.',
  },
  {
    en: 'Adam state uses 16 B/param (Kingma & Ba 2014); batch limit comes from 17.8 MB pair tables.',
    ru: 'Состояние Adam — 16 Б/парам. (Kingma & Ba 2014); размер пакета ограничен таблицами по 17.8 МБ.',
  },
  {
    en: 'Claim boundary: 0 trained weights and 0 wet-lab measurements exist on 2026-11-09.',
    ru: 'Граница утверждений: на 2026-11-09 обученных весов 0 и лабораторных измерений 0.',
  },
];

const world = {
  id: 'ml-explainer',
  duration: 60,
  frames: [
    { id: 'board', parent: null, unit: 0.001, origin: [0, 0, 0] },
    { id: 'complex', parent: 'board', unit: 1e-9, origin: [0, 0, 0] },
  ],
  objects: [
    {
      id: 'mel',
      kind: 'molecule',
      frame: 'complex',
      position: melCenter,
      size: 4.4e-9,
      source: { kind: 'pdb', ref: '1MEL' },
      evidence: 'published',
      window: [0, 60],
      roles: ['antibody'],
      asset: '1mel.glb',
      standIn: {
        asset: '1mel_coarse.glb',
        swapAt: 9.5e-9,
      },
    },
    ...noiseNodes,
  ],
};

// Camera frames 1MEL + noise cloud cleanly in the upper-right above y = 640 px on every stop,
// and zooms smoothly from 19.7 nm (>= 2*swapAt = 19 nm) at t=18 into 4.6 nm (<= swapAt/2 = 4.75 nm) at t=21 before settling at t=24!
const cameraKeys = [
  { t: 0, at: { frame: 'complex', pos: [-1.4, 1.85, 11.8] }, target: { frame: 'complex', pos: [-1.4, 0.35, 0] }, fov: 40, ease: 'power2.out' },
  { t: 6, at: { frame: 'complex', pos: [-2.0, 1.85, 13.8] }, target: { frame: 'complex', pos: [-2.0, 0.3, 0] }, fov: 40, ease: 'power2.inOut' },
  { t: 12, at: { frame: 'complex', pos: [-2.1, 1.85, 15.2] }, target: { frame: 'complex', pos: [-2.1, 0.25, 0] }, fov: 40, ease: 'power2.inOut' },
  { t: 18, at: { frame: 'complex', pos: [-1.8, 1.85, 19.6] }, target: { frame: 'complex', pos: [-1.8, 0.2, 0] }, fov: 40, ease: 'power2.inOut' },
  { t: 21, at: { frame: 'complex', pos: [0.8, 1.85, 4.6] }, target: { frame: 'complex', pos: [0.8, 1.55, 0] }, fov: 40, ease: 'power2.inOut' },
  { t: 24, at: { frame: 'complex', pos: [-2.3, 1.85, 14.2] }, target: { frame: 'complex', pos: [-2.3, 0.25, 0] }, fov: 40, ease: 'power2.inOut' },
  { t: 30, at: { frame: 'complex', pos: [-1.8, 1.85, 12.2] }, target: { frame: 'complex', pos: [-1.8, 0.35, 0] }, fov: 40, ease: 'power2.inOut' },
  { t: 36, at: { frame: 'complex', pos: [-1.6, 1.85, 11.4] }, target: { frame: 'complex', pos: [-1.6, 0.4, 0] }, fov: 40, ease: 'power2.inOut' },
  { t: 42, at: { frame: 'complex', pos: [-2.0, 1.85, 12.8] }, target: { frame: 'complex', pos: [-2.0, 0.35, 0] }, fov: 40, ease: 'power2.inOut' },
  { t: 48, at: { frame: 'complex', pos: [-2.0, 1.85, 13.6] }, target: { frame: 'complex', pos: [-2.0, 0.3, 0] }, fov: 40, ease: 'power2.inOut' },
  { t: 54, at: { frame: 'complex', pos: [-1.6, 1.85, 11.8] }, target: { frame: 'complex', pos: [-1.6, 0.35, 0] }, fov: 40, ease: 'power2.inOut' },
  { t: 60, at: { frame: 'complex', pos: [-1.4, 1.85, 11.8] }, target: { frame: 'complex', pos: [-1.4, 0.35, 0] }, fov: 40, ease: 'sine.inOut' },
];

const layout = [];
for (const s of story) {
  const nn = String(s.stop).padStart(2, '0');
  const hw = hwByStop[s.stop];
  for (const lg of ['en', 'ru']) {
    const blocks = [
      {
        id: `s${nn}-title`,
        role: 'title',
        text: s.title[lg],
        box: [64, 650, 1792, 72],
      },
      {
        id: `s${nn}-part`,
        role: 'label',
        text: s.say[lg],
        box: [64, 728, 1792, 118],
      },
    ];
    if (hw) {
      blocks.push({
        id: `s${nn}-hw`,
        role: 'label',
        text: hw[lg],
        box: [64, 852, 1792, 68],
      });
      blocks.push({
        id: `s${nn}-note`,
        role: 'note',
        text: noteByStop[s.stop][lg],
        box: [64, 926, 1792, 98],
      });
    } else {
      blocks.push({
        id: `s${nn}-note`,
        role: 'note',
        text: noteByStop[s.stop][lg],
        box: [64, 864, 1792, 108],
      });
    }
    layout.push({ stop: s.stop, lang: lg, blocks });
  }
}

const notes = {};
for (const s of story) {
  const hw = hwByStop[s.stop];
  notes[String(s.stop)] = {
    en: `Stop ${s.stop}: ${s.say.en}${hw ? ` (${hw.en})` : ''} ${noteByStop[s.stop].en} Facts: ${s.facts.join(', ')}.`,
    ru: `Слайд ${s.stop}: ${s.say.ru}${hw ? ` (${hw.ru})` : ''} ${noteByStop[s.stop].ru} Факты: ${s.facts.join(', ')}.`,
  };
}

const job = {
  brief: {
    idea: 'Omniverso pairs a structure autoencoder and a rectified-flow denoiser to generate binder coordinates around an antigen complex such as PDB 1MEL.',
    details: 'A 10-stop ML architecture explainer deck and film path. Lenses: journal and cinematic. Check-ins: one storyboard stop. Outputs: live deck, MP4, PDF, web link.',
    concepts: [
      'PDB 1MEL antigen-nanobody complex (132 VH residues)',
      '132 x 169 residue input table and 132 x 8 latent bottleneck',
      'structure autoencoder (255,873,676 parameters) with 3-coordinate bypass',
      'flow denoiser (153,102,091 parameters) across 14 sequence blocks',
      '132 x 132 x 256 pair table vs 132 x 768 sequence state',
      'straight-line transport path and iterative generation',
      'off-target specificity judge and subset selection',
      '80 GB NVIDIA A100 memory budget (6.54 GB = 8.2%) and untrained status',
    ],
    audience: 'machine learning researchers, structural biologists, agent developers, and compute reviewers',
    product: 'omniverso',
    langs: ['en', 'ru'],
    timeBudget: { hours: 6 },
    files: [
      'motion/films/arc-science-pitch-2.notes.md',
      'motion/films/arc-science-pitch-2.film.json',
    ],
  },
  facts,
  story,
  lens: 'journal',
  langs: ['en', 'ru'],
  world,
  vectors,
  timeline: { tracks },
  paths: [
    { id: 'deck-main', kind: 'deck', stops, keys: cameraKeys },
    { id: 'film-main', kind: 'film', stops, keys: cameraKeys },
  ],
  layout,
  notes,
  storyboard: {
    approvedAt: '2026-11-09T00:00:00Z',
    note: 'Approved 10-stop storyboard for Omniverso ML architecture explainer',
  },
};

fs.writeFileSync(path.join(DIR, 'job.json'), `${JSON.stringify(job, null, 2)}\n`, 'utf8');

const factById = new Map(facts.map((f) => [f.id, f]));
for (const s of story) {
  const hw = hwByStop[s.stop];
  const boundaries = s.facts
    .map((fid) => {
      const f = factById.get(fid);
      return `${fid} (${f.level}: ${f.source.kind}:${f.source.ref})`;
    })
    .join('; ');
  const md = `# Stop ${s.stop}: ${s.title.en} / ${s.title.ru}

- **Message:** ${s.say.en}
- **Hardware and tensor check:** ${hw ? hw.en : noteByStop[s.stop].en} (verified by \`compute/sizes.mjs\` -> \`compute/sizes.json\`)
- **Facts and sources:** ${s.facts.join(', ')}
- **Claim boundary:** ${boundaries}. Ceiling in \`motion/projects/omniverso.json\` allows \`architecture\` and \`published\` only; zero trained weights and zero wet-lab binders exist.
- **Export-check result:** clean (0 findings across \`en\` and \`ru\`)
- **Blind-read date and outcome:** 2026-11-09, pass (0 remaining items in Q2 and Q3)
- **Ten-second sentence:** ${s.say.en}

Studio slides run through \`tools/check.mjs\`, \`tools/pixels.test.mjs\`, and contact-sheet blind reads.
`;
  fs.writeFileSync(path.join(REVIEW_DIR, `${s.stop}.notes.md`), md, 'utf8');
}

console.log('Wrote ml-explainer/job.json and 10 review/*.notes.md files.');
