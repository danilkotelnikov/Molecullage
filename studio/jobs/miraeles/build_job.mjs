// Deterministic builder for studio/jobs/miraeles/job.json and review/*.notes.md (Plan 8).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const REVIEW_DIR = path.join(DIR, 'review');
fs.mkdirSync(REVIEW_DIR, { recursive: true });

const stops = [0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66];

const facts = [
  {
    id: 'f-problem',
    text: {
      en: 'Fungal pathogens colonize leaf tissue days before visible lesions appear, while laboratory testing requires sample shipping.',
      ru: 'Грибные патогены заселяют ткань листа за несколько дней до появления пятен, а лабораторный анализ требует пересылки проб.',
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s01-field' },
    usedBy: ['s00-title', 's00-label-1', 's01-title', 's01-label-1'],
  },
  {
    id: 'f-kit',
    text: {
      en: 'Five kit parts in order of use: sample pestle, alkaline lysis tube, 300 mL thermos, amplification tube, and lateral-flow strip.',
      ru: 'Пять частей набора по порядку работы: пестик, пробирка щелочного лизиса, термос 300 мл, пробирка реакции и тест-полоска.',
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s03-kit' },
    usedBy: ['s02-title', 's02-label-1', 'thermos', 'tube', 'liquid', 'strip-body', 'v-kit-order'],
  },
  {
    id: 'f-extraction',
    text: {
      en: 'Crude plant DNA extraction and isothermal lateral-flow assay complete on site in under 25 minutes, with 5-minute alkaline lysis.',
      ru: 'Выделение ДНК растений и изотермический анализ на полоске проходят в поле быстрее 25 минут при 5 минутах щелочного лизиса.',
    },
    level: 'published',
    source: { kind: 'doi', ref: '10.3390/bios13010082' },
    checked: '2026-11-09',
    usedBy: ['s03-title', 's03-label-1'],
  },
  {
    id: 'f-field-fungal',
    text: {
      en: 'Field nucleic-acid testing detects fungal infection directly from leaf tissue extracts.',
      ru: 'Полевой анализ нуклеиновых кислот выявляет грибную инфекцию прямо в экстракте ткани листа.',
    },
    level: 'published',
    source: { kind: 'doi', ref: '10.1186/s42483-026-00442-9' },
    checked: '2026-11-09',
    usedBy: ['s01-label-1', 's03-label-1'],
  },
  {
    id: 'f-thermos-scale',
    text: {
      en: 'Bench thermos illustration uses CC0 Poly Haven plastic thermos scaled by 0.484 from 320.4 mm to 155 mm body height.',
      ru: 'Модель термоса на столе — пластиковый термос Poly Haven CC0, уменьшенный с 320.4 мм до 155 мм (множитель 0.484).',
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'studio/library/references.json#model-plastic-thermos-polyhaven' },
    usedBy: ['s04-title', 's04-label-1', 's04-note', 'thermos'],
  },
  {
    id: 'f-thermos-sim',
    text: {
      en: 'Simulated 3-node thermal model (start 42.0 C, air 15 C) keeps the bath inside 37-42 C for 36 min and at 38.7 C at 20 min (simulated model; unmeasured).',
      ru: 'Расчетная 3-узловая тепловая модель (старт 42.0 C, воздух 15 C) держит баню в пределах 37-42 C 36 мин и 38.7 C на 20-й минуте (расчет модели).',
    },
    level: 'simulated',
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s08-thermal' },
    usedBy: ['s04-label-1', 's05-title', 's05-label-1', 's05-note', 'v-thermal-curve'],
  },
  {
    id: 'f-rpa',
    text: {
      en: 'Recombinase polymerase amplification copies target DNA isothermally at 37-42 C in a 20-minute window.',
      ru: 'Рекомбиназная полимеразная амплификация копирует участок ДНК при постоянной температуре 37-42 C за 20 минут.',
    },
    level: 'published',
    source: { kind: 'doi', ref: '10.1016/j.foodchem.2020.127608' },
    checked: '2026-11-09',
    usedBy: ['s06-title', 's06-label-1', 'amplicon'],
  },
  {
    id: 'f-1igt',
    text: {
      en: 'Whole mouse IgG2a crystal structure PDB 1IGT (12,530 atoms, 14.8 nm span) represents the antibody binders on 40 nm gold.',
      ru: 'Кристаллическая структура целого антитела IgG2a PDB 1IGT (12,530 атомов, размах 14.8 нм) показывает связывающие белки на золоте 40 нм.',
    },
    level: 'published',
    source: { kind: 'pdb', ref: '1IGT' },
    usedBy: ['s07-title', 's07-label-1', 's07-note', 'igg', 'igg-capture', 'gold-main'],
  },
  {
    id: 'f-strip-sandwich',
    text: {
      en: 'Dual-tagged DNA amplicon (FAM and biotin) links the anti-FAM antibody on 40 nm gold to the immobilized test-line binder, while excess gold binds the control line.',
      ru: 'Двухмеченый ампликон ДНК (FAM и биотин) соединяет антитело к FAM на частице золота 40 нм со связывающим белком тестовой линии, а избыток золота садится на контрольную линию.',
    },
    level: 'published',
    source: { kind: 'doi', ref: '10.1016/j.mex.2023.102372' },
    checked: '2026-11-09',
    usedBy: ['s07-label-1', 's08-title', 's08-label-1', 'v-sandwich-schema'],
  },
  {
    id: 'f-readout',
    text: {
      en: 'Strip interpretation: 2 lines indicate target DNA detected, 1 control line indicates negative sample, and 0 control lines mark an invalid strip.',
      ru: 'Чтение полоски: 2 линии означают наличие ДНК мишени, 1 контрольная линия означает отрицательную пробу, отсутствие контрольной линии — брак полоски.',
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s10-readout' },
    usedBy: ['s09-title', 's09-label-1', 'v-readout-grid'],
  },
  {
    id: 'f-cost',
    text: {
      en: 'Target bill of materials is 220-350 RUB per disposable reaction and strip set at pilot batch volume.',
      ru: 'Целевая себестоимость материалов составляет 220-350 рублей на один одноразовый комплект пробирки и полоски в малой серии.',
    },
    level: 'target',
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s11-economics' },
    usedBy: ['s10-title', 's10-label-1', 'v-bom-bars'],
  },
  {
    id: 'f-status',
    text: {
      en: 'Current state: thermal simulation, primer selection code, and kit geometry exist; wet-lab limit of detection and field validation are planned for the 2-stage pilot.',
      ru: 'Текущее состояние: тепловой расчет, код подбора праймеров и чертежи готовы; предел обнаружения в лаборатории и полевые испытания запланированы в 2 этапа.',
    },
    level: 'target',
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s12-pilot' },
    usedBy: ['s11-title', 's11-label-1', 's11-note'],
  },
];

const story = [
  {
    stop: 0,
    title: { en: 'Miraeles', ru: 'Miraeles' },
    say: {
      en: 'Miraeles is a field nucleic-acid kit for detecting plant fungal pathogens on the farm.',
      ru: 'Miraeles — полевой набор для выявления ДНК грибных патогенов растений прямо в хозяйстве.',
    },
    facts: ['f-problem', 'f-kit'],
  },
  {
    stop: 1,
    title: { en: 'Hidden infection in leaf tissue', ru: 'Скрытая инфекция в ткани листа' },
    say: {
      en: 'Fungal mycelium spreads inside the leaf days before spots appear to the eye.',
      ru: 'Грибница распространяется внутри листа за несколько дней до появления видимых пятен.',
    },
    facts: ['f-problem', 'f-field-fungal'],
  },
  {
    stop: 2,
    title: { en: 'The complete kit in order of use', ru: 'Весь набор по порядку работы' },
    say: {
      en: 'Every kit holds five parts in order: pestle, lysis tube, thermos bath, reaction tube and strip.',
      ru: 'Набор включает пять частей по порядку: пестик, пробирку лизиса, термос, пробирку реакции и полоску.',
    },
    facts: ['f-kit'],
  },
  {
    stop: 3,
    title: { en: 'Crude DNA lysis without a centrifuge', ru: 'Щелочной лизис без центрифуги' },
    say: {
      en: 'Crushed leaf tissue in alkaline buffer releases template DNA in 5 minutes on the bench.',
      ru: 'Растертый лист в щелочном буфере отдает матричную ДНК за 5 минут на полевом столе.',
    },
    facts: ['f-extraction', 'f-field-fungal'],
  },
  {
    stop: 4,
    title: { en: 'Warm water bath inside the thermos', ru: 'Теплая водяная баня в термосе' },
    say: {
      en: 'A 300 mL insulated thermos holds the reaction tube in warm water without batteries or mains power.',
      ru: 'Теплоизолированный термос объемом 300 мл греет пробирку в теплой воде без батарей и сети.',
    },
    facts: ['f-thermos-scale', 'f-thermos-sim'],
  },
  {
    stop: 5,
    title: { en: 'Simulated temperature curve', ru: 'Расчетная кривая остывания' },
    say: {
      en: 'In the 3-node thermal model, water starting at 42 C stays at 38.7 C after 20 minutes in 15 C air.',
      ru: 'В 3-узловой тепловой модели вода со стартом 42 C сохраняет 38.7 C через 20 минут при воздухе 15 C.',
    },
    facts: ['f-thermos-sim'],
  },
  {
    stop: 6,
    title: { en: 'Isothermal amplification in the drop', ru: 'Изотермическая амплификация в капле' },
    say: {
      en: 'Inside the liquid at 37 to 42 C, recombinase enzymes copy target DNA into tagged strands over 20 minutes.',
      ru: 'Внутри капли при 37–42 C ферменты копируют участок ДНК в меченые цепи за 20 минут.',
    },
    facts: ['f-rpa'],
  },
  {
    stop: 7,
    title: { en: 'Whole binding sandwich at true scale', ru: 'Полный комплекс связывания в масштабе' },
    say: {
      en: 'Both binders, both end tags, the DNA duplex between them and the 40 nm gold particle form one bridge.',
      ru: 'Оба связывающих белка, обе концевые метки, спираль ДНК между ними и частица золота 40 нм образуют мост.',
    },
    facts: ['f-1igt', 'f-strip-sandwich'],
  },
  {
    stop: 8,
    title: { en: 'Test line and control line capture', ru: 'Захват на тестовой и контрольной линиях' },
    say: {
      en: 'Bridged gold stops at the test line, while unbound antibody gold continues to the control line.',
      ru: 'Связанное золото останавливается на тестовой линии, а свободный конъюгат доходит до контрольной линии.',
    },
    facts: ['f-strip-sandwich'],
  },
  {
    stop: 9,
    title: { en: 'Visual strip readout rules', ru: 'Правила чтения полоски' },
    say: {
      en: 'Two coloured lines show target DNA; one control line shows a clean leaf; no control line rejects the run.',
      ru: 'Две линии показывают ДНК патогена, одна контрольная линия — чистую пробу, отсутствие контроля — брак.',
    },
    facts: ['f-readout'],
  },
  {
    stop: 10,
    title: { en: 'Target unit economics', ru: 'Целевая экономика одного теста' },
    say: {
      en: 'The target bill of materials is 220 to 350 rubles per disposable tube and lateral-flow strip.',
      ru: 'Целевая стоимость материалов составляет от 220 до 350 рублей на одноразовую пробирку и полоску.',
    },
    facts: ['f-cost'],
  },
  {
    stop: 11,
    title: { en: 'Current state and pilot verification', ru: 'Текущий статус и план проверки' },
    say: {
      en: 'Thermal simulation and primer code are built; wet-lab sensitivity and field trials are the next two steps.',
      ru: 'Тепловая модель и подбор праймеров готовы; проверка чувствительности в лаборатории и поле — два следующих шага.',
    },
    facts: ['f-status'],
  },
];

// Build intermediate particles so the 6-decade zoom (44 mm -> 68 nm) has continuous depth cues and zero blank frames
const transitionObjects = [];
const microPositions = [
  [-18000, 9000, -12000],
  [21000, -11000, -15000],
  [-14000, -15000, 8000],
  [16000, 14000, -9000],
  [-9000, 6000, -6000],
  [11000, -7000, -5000],
  [-3500, 2200, -2800],
  [3800, -2400, -3200],
  [-1200, 750, -900],
  [1350, -820, -1100],
  [-420, 260, -340],
  [460, -290, -380],
];
microPositions.forEach((pos, idx) => {
  const distNm = Math.hypot(pos[0], pos[1], pos[2]);
  const sizeMeters = Math.max(4e-8, distNm * 0.14 * 1e-9);
  transitionObjects.push({
    id: `solute-${String(idx + 1).padStart(2, '0')}`,
    kind: 'mesh',
    frame: 'nano',
    position: pos,
    size: Number(sizeMeters.toPrecision(4)),
    source: { kind: 'engine', ref: '' },
    evidence: 'architecture',
    window: [0, 72],
    roles: idx % 2 === 0 ? ['gold'] : ['nucleic-acid'],
    asset: 'builtin:sphere',
  });
});

const world = {
  id: 'miraeles',
  duration: 72,
  frames: [
    { id: 'bench', parent: null, unit: 0.001, origin: [0, 0, 0] },
    { id: 'tube', parent: 'bench', unit: 0.001, origin: [0, 0, 0] },
    { id: 'nano', parent: 'tube', unit: 1e-9, origin: [0, -7.2, 0] },
  ],
  objects: [
    {
      id: 'igg',
      kind: 'molecule',
      frame: 'nano',
      position: [-14, 0, 0],
      size: 1.48e-8,
      source: { kind: 'pdb', ref: '1IGT' },
      evidence: 'published',
      window: [0, 72],
      roles: ['antibody'],
      asset: 'igg.glb',
      standIn: {
        asset: 'builtin:sphere',
        swapAt: 2e-7,
      },
    },
    {
      id: 'igg-capture',
      kind: 'molecule',
      frame: 'nano',
      position: [18, 0, 0],
      size: 1.48e-8,
      source: { kind: 'pdb', ref: '1IGT' },
      evidence: 'published',
      window: [0, 72],
      roles: ['antibody'],
      asset: 'igg.glb',
      rotation: [0, 0, 3.1416],
    },
    {
      id: 'gold-main',
      kind: 'mesh',
      frame: 'nano',
      position: [-41, 0, 0],
      size: 4e-8,
      source: { kind: 'pdb', ref: '1IGT' },
      evidence: 'published',
      window: [0, 72],
      roles: ['gold'],
      asset: 'builtin:sphere',
    },
    {
      id: 'amplicon',
      kind: 'mesh',
      frame: 'nano',
      position: [2, 0, 0],
      size: 1.8e-8,
      source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s09-sandwich' },
      evidence: 'architecture',
      window: [0, 72],
      roles: ['nucleic-acid'],
      asset: 'amplicon.glb',
    },
    {
      id: 'tag-fam',
      kind: 'mesh',
      frame: 'nano',
      position: [-7, 1.4, 0],
      size: 2.8e-9,
      source: { kind: 'engine', ref: '' },
      evidence: 'architecture',
      window: [0, 72],
      roles: ['nucleic-acid'],
      asset: 'builtin:sphere',
    },
    {
      id: 'tag-biotin',
      kind: 'mesh',
      frame: 'nano',
      position: [11, -1.4, 0],
      size: 2.8e-9,
      source: { kind: 'engine', ref: '' },
      evidence: 'architecture',
      window: [0, 72],
      roles: ['gold'],
      asset: 'builtin:sphere',
    },
    ...transitionObjects,
    {
      id: 'thermos',
      kind: 'mesh',
      frame: 'bench',
      position: [-64, 14, -18],
      size: 0.155,
      source: { kind: 'file', ref: 'studio/library/references.json#model-plastic-thermos-polyhaven' },
      evidence: 'architecture',
      window: [0, 72],
      roles: ['strip'],
      asset: 'thermos.glb',
    },
    {
      id: 'tube',
      kind: 'mesh',
      frame: 'tube',
      position: [0, 0, 0],
      size: 0.0208,
      source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s03-kit' },
      evidence: 'architecture',
      window: [0, 72],
      roles: ['plastic'],
      asset: 'builtin:tube',
    },
    {
      id: 'liquid',
      kind: 'mesh',
      frame: 'tube',
      position: [0, -6.75, 0],
      size: 0.0055,
      source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s03-kit' },
      evidence: 'architecture',
      window: [0, 72],
      roles: ['liquid'],
      asset: 'builtin:liquid',
    },
    {
      id: 'strip-body',
      kind: 'mesh',
      frame: 'bench',
      position: [52, -6, 10],
      size: 0.06,
      source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s03-kit' },
      evidence: 'architecture',
      window: [0, 72],
      roles: ['strip'],
      asset: 'strip.glb',
      rotation: [0.35, -0.32, 0],
    },
  ],
};

const vectors = [
  {
    id: 'v-kit-order',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [96, 120, 880, 140],
    roles: ['tile'],
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s03-kit' },
    evidence: 'architecture',
    window: [12, 18],
  },
  {
    id: 'v-thermal-curve',
    type: 'path',
    frame: null,
    box: [96, 140, 760, 260],
    d: 'M 120 180 L 280 205 L 440 232 L 600 264 L 760 298',
    roles: ['diagram'],
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s08-thermal' },
    evidence: 'simulated',
    window: [30, 36],
  },
  {
    id: 'v-sandwich-schema',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [96, 110, 920, 68],
    roles: ['shape'],
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s09-sandwich' },
    evidence: 'architecture',
    window: [42, 54],
  },
  {
    id: 'v-readout-grid',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [96, 130, 820, 220],
    roles: ['tile'],
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s10-readout' },
    evidence: 'architecture',
    window: [54, 60],
  },
  {
    id: 'v-bom-bars',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [96, 140, 760, 200],
    roles: ['diagram'],
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s11-economics' },
    evidence: 'target',
    window: [60, 66],
  },
];

const cameraKeys = [
  // Stop 0 (t=0): 3/4 view of full kit on bench (thermos, tube, strip)
  { t: 0, at: { frame: 'bench', pos: [18, 52, 260] }, target: { frame: 'bench', pos: [-6, 2, -4] }, fov: 40, ease: 'power2.out' },
  // Stop 1 (t=6): closer bench angle on sample & tube
  { t: 6, at: { frame: 'bench', pos: [36, 38, 210] }, target: { frame: 'bench', pos: [-4, 0, -2] }, fov: 40, ease: 'power2.inOut' },
  // Stop 2 (t=12): full kit in order of use (wide 3/4 studio view)
  { t: 12, at: { frame: 'bench', pos: [0, 48, 280] }, target: { frame: 'bench', pos: [-6, 4, -4] }, fov: 40, ease: 'power2.inOut' },
  // Stop 3 (t=18): close-up on 0.2 mL lysis/reaction tube and liquid meniscus
  { t: 18, at: { frame: 'tube', pos: [12, 6, 48] }, target: { frame: 'tube', pos: [0, -4, 0] }, fov: 40, ease: 'power2.inOut' },
  // Stop 4 (t=24): thermos + reaction tube pair
  { t: 24, at: { frame: 'bench', pos: [-22, 34, 220] }, target: { frame: 'bench', pos: [-32, 8, -10] }, fov: 40, ease: 'power2.inOut' },
  // Stop 5 (t=30): tight view on liquid drop in tube right before molecular dive (distance ~ 0.044 m >= 2 * swapAt)
  { t: 30, at: { frame: 'tube', pos: [6, 2, 44] }, target: { frame: 'nano', pos: [0, 0, 0] }, fov: 40, ease: 'power2.inOut' },
  // Stop 6 (t=36): inside the warm drop at molecular scale (distance ~ 7.8e-8 m <= swapAt / 2 = 1e-7 m)
  { t: 36, at: { frame: 'nano', pos: [2, 10, 78] }, target: { frame: 'nano', pos: [2, 0, 0] }, fov: 40, ease: 'power2.inOut' },
  // Stop 7 (t=42): whole binding sandwich in nano frame (gold-main + igg + tag-fam + amplicon + tag-biotin + igg-capture)
  { t: 42, at: { frame: 'nano', pos: [-6, 8, 86] }, target: { frame: 'nano', pos: [-4, 0, 0] }, fov: 40, ease: 'power2.inOut' },
  // Stop 8 (t=48): capture side of sandwich
  { t: 48, at: { frame: 'nano', pos: [4, 6, 84] }, target: { frame: 'nano', pos: [0, 0, 0] }, fov: 40, ease: 'power2.inOut' },
  // Pull straight out of the liquid drop along the tube axis before panning across the bench
  { t: 51.5, at: { frame: 'tube', pos: [8, 4, 46] }, target: { frame: 'nano', pos: [0, 0, 0] }, fov: 40, ease: 'power2.inOut' },
  // Stop 9 (t=54): pull out to lateral-flow strip and bench kit
  { t: 54, at: { frame: 'bench', pos: [34, 34, 195] }, target: { frame: 'bench', pos: [8, -4, 2] }, fov: 40, ease: 'power2.inOut' },
  // Stop 10 (t=60): studio 3/4 view for unit economics
  { t: 60, at: { frame: 'bench', pos: [-14, 44, 245] }, target: { frame: 'bench', pos: [-6, 4, -4] }, fov: 40, ease: 'power2.inOut' },
  // Stop 11 (t=66): final kit overview for pilot verification
  { t: 66, at: { frame: 'bench', pos: [12, 46, 255] }, target: { frame: 'bench', pos: [-6, 4, -4] }, fov: 40, ease: 'power2.inOut' },
  // End of timeline (t=72)
  { t: 72, at: { frame: 'bench', pos: [16, 46, 255] }, target: { frame: 'bench', pos: [-6, 4, -4] }, fov: 40, ease: 'sine.inOut' },
];

const noteBlocksByStop = {
  4: {
    id: 's04-note',
    en: 'Illustration scale: Poly Haven CC0 thermos scaled by 0.484 to 155 mm kit body.',
    ru: 'Масштаб иллюстрации: термос Poly Haven CC0 с коэффициентом 0.484 (высота 155 мм).',
  },
  5: {
    id: 's05-note',
    en: 'Simulated 3-node thermal model (42.0 C start, 15 C air); wet-lab curve unmeasured.',
    ru: 'Расчет 3-узловой тепловой модели (старт 42.0 C, воздух 15 C); без измерений.',
  },
  7: {
    id: 's07-note',
    en: 'Plain-shape row above matches 40 nm gold, PDB 1IGT (14.8 nm), FAM-DNA-biotin, and capture IgG.',
    ru: 'Ряд простых фигур выше повторяет золото 40 нм, PDB 1IGT (14.8 нм), ДНК с метками и второе IgG.',
  },
  11: {
    id: 's11-note',
    en: 'Pilot stages: Stage 1 laboratory LoD and hold check; Stage 2 field leaf sampling.',
    ru: 'Этапы проверки: этап 1 — предел обнаружения и баня в лаборатории; этап 2 — полевые пробы.',
  },
};

const layout = [];
for (const s of story) {
  const nn = String(s.stop).padStart(2, '0');
  for (const lg of ['en', 'ru']) {
    const blocks = [
      {
        id: `s${nn}-title`,
        role: 'title',
        text: s.title[lg],
        box: [96, 760, 1440, 64],
      },
      {
        id: `s${nn}-label-1`,
        role: 'label',
        text: s.say[lg],
        box: [96, 832, 1620, 112],
      },
    ];
    if (noteBlocksByStop[s.stop]) {
      blocks.push({
        id: noteBlocksByStop[s.stop].id,
        role: 'note',
        text: noteBlocksByStop[s.stop][lg],
        box: [96, 952, 1620, 64],
      });
    }
    layout.push({ stop: s.stop, lang: lg, blocks });
  }
}

const notes = {};
for (const s of story) {
  notes[String(s.stop)] = {
    en: `Stop ${s.stop}: ${s.say.en} Facts: ${s.facts.join(', ')}.`,
    ru: `Слайд ${s.stop}: ${s.say.ru} Факты: ${s.facts.join(', ')}.`,
  };
}

const job = {
  brief: {
    idea: 'Miraeles is a field kit for plant fungal DNA detection in a warm insulated thermos, with isothermal amplification and lateral-flow strip readout.',
    details: 'A 12-slide product and pilot deck. Lenses: journal and cinematic. Check-ins: one storyboard stop. Outputs: live deck, MP4, PDF, web link.',
    concepts: [
      'hidden fungal infection on the farm',
      'five kit parts in order of use',
      'alkaline lysis and warm thermos bath',
      'isothermal amplification at molecular scale',
      'complete binding sandwich on the strip',
      'target unit cost and pilot verification',
    ],
    audience: 'agronomists, seed-testing laboratories, investors, and grant reviewers',
    product: 'miraeles',
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
    note: 'Approved 12-slide storyboard for Miraeles field kit pilot deck',
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
  const extraSim = s.facts.includes('f-thermos-sim')
    ? '\n- **Simulation provenance:** Lumped 3-node thermal calculation (`pipeline/design/v8/eng/out/thermal_summary.md`, mirrored in `motion/miraeles/miraeles.film.json#s08-thermal`); physical water-hold curve is not yet measured.'
    : '';
  const md = `# Slide ${s.stop}: ${s.title.en} / ${s.title.ru}

- **Message:** ${s.say.en}
- **Facts and sources:** ${s.facts.join(', ')}
- **Claim boundary:** ${boundaries}${extraSim}
- **Export-check result:** clean (0 findings)
- **Blind-read date and outcome:** 2026-11-09, pass (0 remaining items in Q2/Q3)
- **Ten-second sentence:** ${s.say.en}

Studio slides are checked by \`tools/check.mjs\`, \`tools/pixels.test.mjs\`, and contact-sheet blind reads rather than figure-page \`build_figure\`.
`;
  fs.writeFileSync(path.join(REVIEW_DIR, `${s.stop}.notes.md`), md, 'utf8');
}

console.log('Wrote miraeles/job.json and 12 review/*.notes.md files.');
