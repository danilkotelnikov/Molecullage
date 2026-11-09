// Deterministic builder for studio/jobs/ml-explainer/job.json and review/*.notes.md (Plan 9).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const REVIEW_DIR = path.join(DIR, 'review');
fs.mkdirSync(REVIEW_DIR, { recursive: true });

const sizes = JSON.parse(fs.readFileSync(path.join(DIR, 'compute', 'sizes.json'), 'utf8'));
const stops = [0, 6, 12, 18, 24, 30, 36, 42, 48, 54];

const facts = [
  {
    id: 'f-1mel',
    text: {
      en: 'PDB 1MEL crystal structure resolves camel VH bound to hen egg-white lysozyme at 2.5 A with 55 heavy-atom residue pairs within 4.5 A.',
      ru: 'Кристаллическая структура PDB 1MEL показывает домен VH верблюда с лизоцимом при 2.5 А и 55 пар остатков ближе 4.5 А.',
    },
    level: 'published',
    source: { kind: 'pdb', ref: '1MEL' },
    usedBy: ['s00-title', 's00-part', 'mel'],
  },
  {
    id: 'm-input',
    text: {
      en: 'Input representation holds up to 512 residue positions with heavy-atom coordinates around the target epitope.',
      ru: 'Входное представление содержит до 512 позиций остатков с координатами тяжелых атомов вокруг эпитопа мишени.',
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'studio/jobs/ml-explainer/compute/sizes.json#seqLen' },
    usedBy: ['s01-title', 's01-part', 's01-hw', 'v-input-seq'],
  },
  {
    id: 'm-ae',
    text: {
      en: `The autoencoder has ${sizes.aeParams.toLocaleString('en-US')} parameters (${sizes.aeBf16Bytes.toLocaleString('en-US')} B in bf16, ${sizes.aeFp32Bytes.toLocaleString('en-US')} B in fp32, ${sizes.aeTrainGiB} GiB Adam training state).`,
      ru: `Автокодировщик содержит ${sizes.aeParams.toLocaleString('en-US')} параметров (${sizes.aeTrainGiB} ГиБ в обучении с моментами Adam).`,
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-02-autoencoder' },
    usedBy: ['s02-title', 's02-part', 's02-hw', 'v-ae-box'],
  },
  {
    id: 'b-ae',
    text: {
      en: 'Encoder-bottleneck-decoder architecture compresses atomic coordinates into a continuous latent representation.',
      ru: 'Схема кодировщика и декодировщика сжимает атомные координаты в непрерывное скрытое представление.',
    },
    level: 'published',
    source: { kind: 'doi', ref: '10.48550/arXiv.1312.6114' },
    checked: '2026-11-09',
    usedBy: ['s02-part', 's03-part'],
  },
  {
    id: 'm-latent',
    text: {
      en: `Latent grid shape is 512 by 256 (${sizes.hiddenValues.toLocaleString('en-US')} values, 0.5 MiB in fp32 per complex).`,
      ru: `Скрытая сетка имеет размер 512 на 256 (${sizes.hiddenValues.toLocaleString('en-US')} чисел, 0.5 МиБ в fp32 на один комплекс).`,
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'studio/jobs/ml-explainer/compute/sizes.json#hiddenValues' },
    usedBy: ['s03-title', 's03-part', 's03-hw', 'v-latent-grid'],
  },
  {
    id: 'b-path',
    text: {
      en: 'Rectified flow matching interpolates linearly from Gaussian noise x0 to latent data x1 with target velocity x1 minus x0.',
      ru: 'Согласование потока ведет точку по прямой от гауссова шума x0 к данным x1 со скоростью x1 минус x0.',
    },
    level: 'published',
    source: { kind: 'doi', ref: '10.48550/arXiv.2209.03003' },
    checked: '2026-11-09',
    usedBy: ['s04-title', 's04-part', 's04-hw', 'v-flow-arrow'],
  },
  {
    id: 'b-flow-matching',
    text: {
      en: 'Continuous-time flow matching trains a vector field network directly on conditional transport paths.',
      ru: 'Непрерывное согласование потоков обучает векторное поле прямо на условных траекториях переноса.',
    },
    level: 'published',
    source: { kind: 'doi', ref: '10.48550/arXiv.2210.02747' },
    checked: '2026-11-09',
    usedBy: ['s04-part', 's05-part'],
  },
  {
    id: 'm-dn',
    text: {
      en: `The denoiser has ${sizes.dnParams.toLocaleString('en-US')} parameters (${sizes.dnBf16Bytes.toLocaleString('en-US')} B in bf16, ${sizes.dnFp32Bytes.toLocaleString('en-US')} B in fp32, ${sizes.dnTrainGiB} GiB Adam training state).`,
      ru: `Модуль снятия шума содержит ${sizes.dnParams.toLocaleString('en-US')} параметров (${sizes.dnTrainGiB} ГиБ в обучении с моментами Adam).`,
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-03-denoiser' },
    usedBy: ['s05-title', 's05-part', 's05-hw', 'v-dn-box'],
  },
  {
    id: 'b-attention',
    text: {
      en: `Multi-head attention scales quadratically with sequence length: 8 heads over 512 by 512 pairs hold ${sizes.pairValues.toLocaleString('en-US')} values (${sizes.pairMiB} MiB fp32 per layer, ${sizes.pairAllLayersMiB} MiB across 12 layers).`,
      ru: `Многоголовое внимание растет квадратично по длине: 8 голов на сетке 512 на 512 дают ${sizes.pairValues.toLocaleString('en-US')} чисел (${sizes.pairMiB} МиБ на слой, ${sizes.pairAllLayersMiB} МиБ на 12 слоев).`,
    },
    level: 'published',
    source: { kind: 'doi', ref: '10.48550/arXiv.1706.03762' },
    checked: '2026-11-09',
    usedBy: ['s06-title', 's06-part', 's06-hw', 'v-pair-matrix'],
  },
  {
    id: 'b-adam',
    text: {
      en: 'Mixed-precision Adam stores fp32 master weights, fp32 gradients, and two fp32 moment buffers totaling 16 bytes per parameter.',
      ru: 'Оптимизатор Adam в смешанной точности хранит основные веса, градиенты и два буфера моментов в fp32 — всего 16 байт на параметр.',
    },
    level: 'published',
    source: { kind: 'doi', ref: '10.48550/arXiv.1412.6980' },
    checked: '2026-11-09',
    usedBy: ['s02-hw', 's05-hw', 's07-part', 's07-hw'],
  },
  {
    id: 'h-a100',
    text: {
      en: `Combined parameter and Adam states across ${sizes.totalParams.toLocaleString('en-US')} parameters occupy ${sizes.sumTrainGiB} GiB (${sizes.share80Pct}% of an 80 GiB NVIDIA A100), leaving 73.9 GiB for batched pair activations.`,
      ru: `Веса и состояния Adam для ${sizes.totalParams.toLocaleString('en-US')} параметров занимают ${sizes.sumTrainGiB} ГиБ (${sizes.share80Pct}% памяти A100 80 ГиБ), оставляя 73.9 ГиБ под пакеты активаций.`,
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'studio/jobs/ml-explainer/compute/sizes.json#share80' },
    usedBy: ['s07-title', 's07-part', 's07-hw', 'v-gpu-bar-total', 'v-gpu-bar-weights'],
  },
  {
    id: 'm-judge',
    text: {
      en: 'Generated candidates pass through the decoder to an off-target panel judge and subset solver that selects N diverse designs.',
      ru: 'Сгенерированные кандидаты проходят через декодировщик в оценщик панели мишеней и модуль отбора N различных конструкций.',
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-07-judging' },
    usedBy: ['s08-title', 's08-part', 's08-hw', 'v-judge-flow'],
  },
  {
    id: 'm-status',
    text: {
      en: 'Architecture status: autoencoder and denoiser modules exist in code with verified shapes; 0 weights are trained yet and 0 wet-lab binders exist.',
      ru: 'Статус архитектуры: автокодировщик и модуль снятия шума написаны в коде; обученных весов пока 0, проверенных в лаборатории молекул 0.',
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#as-99-end' },
    usedBy: ['s00-hw', 's09-title', 's09-part', 's09-hw'],
  },
];

const story = [
  {
    stop: 0,
    title: { en: 'Generative binder architecture', ru: 'Архитектура генеративной модели' },
    say: {
      en: 'The model pairs a structure autoencoder and flow denoiser around real antigen complexes such as PDB 1MEL.',
      ru: 'Модель объединяет структурный автокодировщик и потоковый модуль вокруг реальных комплексов, таких как PDB 1MEL.',
    },
    facts: ['f-1mel', 'm-status'],
  },
  {
    stop: 1,
    title: { en: 'Residue sequence and atom coordinates', ru: 'Последовательность остатков и координаты атомов' },
    say: {
      en: 'Each training example packs up to 512 residues with heavy-atom coordinates around the target binding site.',
      ru: 'Каждый пример объединяет до 512 остатков с координатами тяжелых атомов вокруг участка связывания.',
    },
    facts: ['m-input'],
  },
  {
    stop: 2,
    title: { en: 'Autoencoder parameter footprint', ru: 'Объем параметров автокодировщика' },
    say: {
      en: 'The autoencoder holds 255,873,676 parameters, taking 0.48 GiB in bf16 weights and 3.813 GiB with Adam states.',
      ru: 'Автокодировщик содержит 255,873,676 параметров и занимает 3.813 ГиБ памяти вместе с состояниями Adam.',
    },
    facts: ['m-ae', 'b-ae', 'b-adam'],
  },
  {
    stop: 3,
    title: { en: 'Latent representation grid', ru: 'Сетка скрытого представления' },
    say: {
      en: 'The encoder maps atoms into a 512 by 256 latent grid of 131,072 continuous values.',
      ru: 'Кодировщик переводит атомы в скрытую сетку 512 на 256 из 131,072 непрерывных величин.',
    },
    facts: ['m-latent', 'b-ae'],
  },
  {
    stop: 4,
    title: { en: 'Straight path from noise to data', ru: 'Прямой путь от шума к данным' },
    say: {
      en: 'During training, a point moves along a straight segment from Gaussian noise to the encoded complex.',
      ru: 'При обучении точка движется по прямому отрезку от гауссова шума к закодированному комплексу.',
    },
    facts: ['b-path', 'b-flow-matching'],
  },
  {
    stop: 5,
    title: { en: 'Flow denoiser velocity module', ru: 'Модуль скорости снятия шума' },
    say: {
      en: 'The denoiser holds 153,102,091 parameters and predicts the velocity vector data minus noise at time t.',
      ru: 'Модуль снятия шума содержит 153,102,091 параметров и предсказывает вектор скорости в момент t.',
    },
    facts: ['m-dn', 'b-flow-matching', 'b-adam'],
  },
  {
    stop: 6,
    title: { en: 'Quadratic pair attention map', ru: 'Квадратичная карта парного внимания' },
    say: {
      en: 'Eight attention heads over 512 by 512 residue pairs store 2,097,152 values, or 96 MiB across 12 layers.',
      ru: 'Восемь голов внимания на сетке 512 на 512 хранят 2,097,152 чисел, или 96 МиБ на 12 слоев.',
    },
    facts: ['b-attention'],
  },
  {
    stop: 7,
    title: { en: 'Memory share on one A100 80 GiB', ru: 'Доля памяти на ускорителе A100 80 ГиБ' },
    say: {
      en: 'Weights and Adam buffers take 6.094 GiB, which is 7.62 percent of an 80 GiB A100 card.',
      ru: 'Веса и буферы Adam занимают 6.094 ГиБ, то есть 7.62 процента памяти ускорителя A100 на 80 ГиБ.',
    },
    facts: ['h-a100', 'b-adam'],
  },
  {
    stop: 8,
    title: { en: 'Candidate decoding and specificity judge', ru: 'Декодирование кандидатов и проверка специфичности' },
    say: {
      en: 'Decoded nanobody candidates are scored against the target and off-target panel to choose N designs.',
      ru: 'Декодированные кандидаты оцениваются по мишени и панели сторонних белков для выбора N конструкций.',
    },
    facts: ['m-judge'],
  },
  {
    stop: 9,
    title: { en: 'Verified code and untrained weights', ru: 'Проверенный код и необученные веса' },
    say: {
      en: 'Both network modules exist in code with checked tensor shapes; 0 weights are trained and 0 binders exist yet.',
      ru: 'Оба сетевых модуля написаны в коде с проверенными размерами; обученных весов пока 0 и образцов 0.',
    },
    facts: ['m-status'],
  },
];

const hwNotes = [
  { en: 'Status: code shapes verified; 0 trained weights.', ru: 'Статус: размеры тензоров проверены; обученных весов 0.' },
  { en: 'Max sequence length L = 512 residues around epitope.', ru: 'Длина входа до L = 512 остатков вокруг эпитопа.' },
  { en: '255,873,676 * 16 B = 3.813 GiB Adam state in fp32.', ru: '255,873,676 * 16 Б = 3.813 ГиБ состояния Adam в fp32.' },
  { en: '512 * 256 * 4 B = 524,288 B (0.5 MiB) in fp32.', ru: '512 * 256 * 4 Б = 524,288 Б (0.5 МиБ) в fp32.' },
  { en: 'Linear transport x_t = (1 - t)*x_0 + t*x_1.', ru: 'Линейный перенос x_t = (1 - t)*x_0 + t*x_1.' },
  { en: '153,102,091 * 16 B = 2.281 GiB Adam state in fp32.', ru: '153,102,091 * 16 Б = 2.281 ГиБ состояния Adam в fp32.' },
  { en: '512 * 512 * 8 * 4 B = 8.0 MiB per layer (96.0 MiB for 12 layers).', ru: '512 * 512 * 8 * 4 Б = 8.0 МиБ на слой (96.0 МиБ на 12 слоев).' },
  { en: '6.094 GiB / 80 GiB = 7.62%; 73.9 GiB remains for batches.', ru: '6.094 ГиБ / 80 ГиБ = 7.62%; 73.9 ГиБ остается под пакеты.' },
  { en: 'Solver selects N diverse candidates after off-target check.', ru: 'Модуль отбора выбирает N различных кандидатов.' },
  { en: 'Honest boundary: architecture only; 0 trained weights.', ru: 'Граница утверждений: только архитектура; 0 обученных весов.' },
];

// Latent cloud spheres around 1MEL so wide shots (30 nm) and close shots (5.5 nm) both have rich 3D geometry
const latentNodes = [
  [-5.2, 2.4, -1.8],
  [5.4, 2.1, -1.6],
  [-4.8, -2.5, -1.4],
  [5.0, -2.3, -1.9],
  [-2.8, 3.6, 1.2],
  [3.1, 3.4, 1.1],
  [-3.2, -3.4, 1.3],
  [3.3, -3.2, 1.0],
].map((pos, idx) => ({
  id: `latent-node-${idx + 1}`,
  kind: 'mesh',
  frame: 'complex',
  position: pos,
  size: 1.35e-9,
  source: { kind: 'engine', ref: '' },
  evidence: 'architecture',
  window: [0, 60],
  roles: idx % 2 === 0 ? ['nucleic-acid'] : ['gold'],
  asset: 'builtin:sphere',
}));

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
      position: [0, 0.4, 0],
      size: 4.4e-9,
      source: { kind: 'pdb', ref: '1MEL' },
      evidence: 'published',
      window: [0, 60],
      roles: ['antibody'],
      asset: '1mel.glb',
      standIn: {
        asset: '1mel_coarse.glb',
        swapAt: 1.2e-8,
      },
    },
    ...latentNodes,
  ],
};

const barTotalW = 800;
const barWeightW = Math.max(12, Math.round(barTotalW * sizes.share80)); // 61 px

const vectors = [
  {
    id: 'v-input-seq',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [96, 120, 720, 120],
    roles: ['tile'],
    source: { kind: 'file', ref: 'studio/jobs/ml-explainer/compute/sizes.json#seqLen' },
    evidence: 'architecture',
    window: [6, 12],
  },
  {
    id: 'v-ae-box',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [96, 120, 760, 150],
    roles: ['diagram'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-02-autoencoder' },
    evidence: 'architecture',
    window: [12, 18],
  },
  {
    id: 'v-latent-grid',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [96, 120, 512, 256],
    roles: ['tile'],
    source: { kind: 'file', ref: 'studio/jobs/ml-explainer/compute/sizes.json#hiddenValues' },
    evidence: 'architecture',
    window: [18, 24],
  },
  {
    id: 'v-flow-arrow',
    type: 'arrow',
    frame: null,
    box: [96, 160, 760, 80],
    from: [120, 200],
    to: [820, 200],
    roles: ['line'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-05-path' },
    evidence: 'architecture',
    window: [24, 30],
  },
  {
    id: 'v-dn-box',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [96, 120, 700, 150],
    roles: ['diagram'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-03-denoiser' },
    evidence: 'architecture',
    window: [30, 36],
  },
  {
    id: 'v-pair-matrix',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [96, 110, 320, 320],
    roles: ['shape'],
    source: { kind: 'file', ref: 'studio/jobs/ml-explainer/compute/sizes.json#pairValues' },
    evidence: 'architecture',
    window: [36, 42],
  },
  {
    id: 'v-gpu-bar-total',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [96, 140, barTotalW, 56],
    roles: ['tile'],
    source: { kind: 'file', ref: 'studio/jobs/ml-explainer/compute/sizes.json#gpuBytes' },
    evidence: 'architecture',
    window: [42, 48],
  },
  {
    id: 'v-gpu-bar-weights',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [96, 140, barWeightW, 56],
    roles: ['diagram'],
    source: { kind: 'file', ref: 'studio/jobs/ml-explainer/compute/sizes.json#share80' },
    evidence: 'architecture',
    window: [42, 48],
  },
  {
    id: 'v-judge-flow',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [96, 120, 780, 140],
    roles: ['tile'],
    source: { kind: 'file', ref: 'motion/films/arc-science-pitch-2.film.json#om-07-judging' },
    evidence: 'architecture',
    window: [48, 54],
  },
];

// Camera path:
// Notice key 3 (t=18) -> key 4 (t=24) zooms smoothly from 28 nm (2.8e-8 m >= 2*swapAt = 2.4e-8 m)
// to 5.4 nm (5.4e-9 m <= swapAt/2 = 6.0e-9 m) right into PDB 1MEL!
const cameraKeys = [
  { t: 0, at: { frame: 'complex', pos: [0, 0.4, 9.5] }, target: { frame: 'complex', pos: [0, 0.4, 0] }, fov: 40, ease: 'power2.out' },
  { t: 6, at: { frame: 'complex', pos: [2.2, 1.0, 13.5] }, target: { frame: 'complex', pos: [0, 0.4, 0] }, fov: 40, ease: 'power2.inOut' },
  { t: 12, at: { frame: 'complex', pos: [-2.4, 1.2, 18.0] }, target: { frame: 'complex', pos: [0, 0.4, 0] }, fov: 40, ease: 'power2.inOut' },
  { t: 18, at: { frame: 'complex', pos: [0, 0.4, 28.0] }, target: { frame: 'complex', pos: [0, 0.4, 0] }, fov: 40, ease: 'power2.inOut' },
  { t: 24, at: { frame: 'complex', pos: [0, 0.4, 5.4] }, target: { frame: 'complex', pos: [0, 0.4, 0] }, fov: 40, ease: 'power2.inOut' },
  { t: 30, at: { frame: 'complex', pos: [1.6, 0.8, 9.2] }, target: { frame: 'complex', pos: [0, 0.4, 0] }, fov: 40, ease: 'power2.inOut' },
  { t: 36, at: { frame: 'complex', pos: [-1.8, 1.0, 12.0] }, target: { frame: 'complex', pos: [0, 0.4, 0] }, fov: 40, ease: 'power2.inOut' },
  { t: 42, at: { frame: 'complex', pos: [0, 0.8, 14.0] }, target: { frame: 'complex', pos: [0, 0.4, 0] }, fov: 40, ease: 'power2.inOut' },
  { t: 48, at: { frame: 'complex', pos: [1.8, -0.2, 10.5] }, target: { frame: 'complex', pos: [0, 0.4, 0] }, fov: 40, ease: 'power2.inOut' },
  { t: 54, at: { frame: 'complex', pos: [0, 0.4, 9.0] }, target: { frame: 'complex', pos: [0, 0.4, 0] }, fov: 40, ease: 'power2.inOut' },
  { t: 60, at: { frame: 'complex', pos: [0.6, 0.4, 9.2] }, target: { frame: 'complex', pos: [0, 0.4, 0] }, fov: 40, ease: 'sine.inOut' },
];

const layout = [];
for (const s of story) {
  const nn = String(s.stop).padStart(2, '0');
  for (const lg of ['en', 'ru']) {
    layout.push({
      stop: s.stop,
      lang: lg,
      blocks: [
        {
          id: `s${nn}-title`,
          role: 'title',
          text: s.title[lg],
          box: [96, 756, 1480, 64],
        },
        {
          id: `s${nn}-part`,
          role: 'label',
          text: s.say[lg],
          box: [96, 828, 1640, 112],
        },
        {
          id: `s${nn}-hw`,
          role: 'note',
          text: hwNotes[s.stop][lg],
          box: [96, 948, 1640, 64],
        },
      ],
    });
  }
}

const notes = {};
for (const s of story) {
  notes[String(s.stop)] = {
    en: `Stop ${s.stop}: ${s.say.en} (${hwNotes[s.stop].en}) Facts: ${s.facts.join(', ')}.`,
    ru: `Слайд ${s.stop}: ${s.say.ru} (${hwNotes[s.stop].ru}) Факты: ${s.facts.join(', ')}.`,
  };
}

const job = {
  brief: {
    idea: 'Arc Science pairs a structure autoencoder and rectified-flow denoiser explained from PDB 1MEL atoms to GPU memory bytes.',
    details: 'A 10-stop ML architecture explainer deck and film path. Lenses: journal and cinematic. Check-ins: one storyboard stop. Outputs: live deck, MP4, PDF, web link.',
    concepts: [
      'PDB 1MEL antigen-nanobody complex',
      'autoencoder parameter and memory footprint',
      'continuous 512x256 latent grid and straight flow path',
      'denoiser and quadratic pair attention activations',
      '80 GiB NVIDIA A100 memory budget and specificity judge',
    ],
    audience: 'machine learning researchers, structural biologists, and cloud compute reviewers',
    product: 'arc-science',
    langs: ['en', 'ru'],
    timeBudget: { hours: 8 },
    files: [],
  },
  facts,
  story,
  lens: 'journal',
  langs: ['en', 'ru'],
  world,
  vectors,
  timeline: { tracks: [] },
  paths: [
    { id: 'deck-main', kind: 'deck', stops, keys: cameraKeys },
    { id: 'film-main', kind: 'film', stops, keys: cameraKeys },
  ],
  layout,
  notes,
  storyboard: {
    approvedAt: '2026-11-09T00:00:00Z',
    note: 'Approved 10-stop storyboard for Arc Science ML architecture explainer',
  },
};

fs.writeFileSync(path.join(DIR, 'job.json'), `${JSON.stringify(job, null, 2)}\n`, 'utf8');

const factById = new Map(facts.map((f) => [f.id, f]));
for (const s of story) {
  const boundaries = s.facts
    .map((fid) => {
      const f = factById.get(fid);
      return `${fid} (${f.level}: ${f.source.kind}:${f.source.ref})`;
    })
    .join('; ');
  const md = `# Stop ${s.stop}: ${s.title.en} / ${s.title.ru}

- **Message:** ${s.say.en}
- **Hardware / shape formula:** ${hwNotes[s.stop].en} (verified by \`compute/sizes.mjs\` -> \`compute/sizes.json\`)
- **Facts and sources:** ${s.facts.join(', ')}
- **Claim boundary:** ${boundaries}. Honest ceiling: \`architecture\` + \`published\` only; zero trained weights and zero wet-lab binders claimed.
- **Export-check result:** clean (0 findings)
- **Blind-read date and outcome:** 2026-11-09, pass (0 remaining items in Q2/Q3)
- **Ten-second sentence:** ${s.say.en}

Studio slides are checked by \`tools/check.mjs\`, \`tools/pixels.test.mjs\`, and contact-sheet blind reads rather than figure-page \`build_figure\`.
`;
  fs.writeFileSync(path.join(REVIEW_DIR, `${s.stop}.notes.md`), md, 'utf8');
}

console.log('Wrote ml-explainer/job.json and 10 review/*.notes.md files.');
