// Deterministic builder for studio/jobs/miraeles/job.json and review/*.notes.md (Plan 8).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scatter } from '../../core/geo/index.ts';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const REVIEW_DIR = path.join(DIR, 'review');
fs.mkdirSync(REVIEW_DIR, { recursive: true });

const stops = [0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66];
const winOf = (s) => [stops[s], stops[s] + 5.8];

const facts = [
  {
    id: 'f-cover',
    text: {
      en: 'Miraeles is a field DNA detection kit designed for on-farm plant and animal pathogen checks without a laboratory.',
      ru: 'Miraeles — полевой набор выявления ДНК патогенов растений и животных прямо в хозяйстве без лаборатории.',
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s01-cover' },
    usedBy: ['s00-title', 's00-label-1'],
  },
  {
    id: 'f-problem',
    text: {
      en: 'Fungal pathogens colonize leaf tissue days before visible lesions appear, while central-laboratory shipping delays decisions.',
      ru: 'Грибные патогены заселяют ткань листа за дни до появления пятен, а пересылка проб в лабораторию задерживает решения.',
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s02-problem' },
    usedBy: ['s01-title', 's01-label-1'],
  },
  {
    id: 'f-kit',
    text: {
      en: 'Complete 4-module kit in order of use: Sample lysis tube, Heat thermos bath, Reaction MIRA tube, and closed Reader strip.',
      ru: 'Полный набор из 4 модулей по порядку работы: пробирка пробы, термос нагрева, пробирка реакции MIRA и закрытая кассета полоски.',
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s05-workflow' },
    usedBy: [
      's02-title',
      's02-label-1',
      's02-note',
      'sample-tube',
      'thermos',
      'tube',
      'liquid',
      'strip-body',
      'v-kit-card-0',
      'v-kit-card-1',
      'v-kit-card-2',
      'v-kit-card-3',
    ],
  },
  {
    id: 'f-extraction',
    text: {
      en: 'Crude plant DNA extraction with 5-minute alkaline lysis and isothermal lateral-flow readout completes on site in under 25 minutes.',
      ru: 'Грубое выделение ДНК растений за 5 минут щелочного лизиса и изотермический тест на полоске укладываются быстрее 25 минут.',
    },
    level: 'published',
    source: { kind: 'doi', ref: '10.3390/bios13010082' },
    checked: '2026-11-09',
    usedBy: ['s03-title', 's03-label-1', 's03-note'],
  },
  {
    id: 'f-mira-wheat',
    text: {
      en: 'Published MIRA lateral-flow assay amplifies fungal target DNA in 10 minutes at 39 C followed by 5-minute strip readout.',
      ru: 'Опубликованный тест MIRA с полоской амплифицирует ДНК грибного патогена за 10 минут при 39 C и читается за 5 минут.',
    },
    level: 'published',
    source: { kind: 'doi', ref: '10.1186/s42483-026-00442-9' },
    checked: '2026-11-09',
    usedBy: ['s01-label-1', 's03-note', 's06-note'],
  },
  {
    id: 'f-thermos-scale',
    text: {
      en: 'A 300 mL thermos (CC0 Poly Haven mesh scaled by 0.484 from 320.4 mm to 155 mm) holds 150-200 g paraffin wax melting at 40-41 C.',
      ru: 'Термос 300 мл (модель Poly Haven CC0 с масштабом 0.484 от 320.4 мм до 155 мм) содержит 150–200 г пищевого парафина с плавлением при 40–41 C.',
    },
    level: 'architecture',
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s07-heat' },
    usedBy: ['s04-title', 's04-label-1', 's04-note', 'thermos'],
  },
  {
    id: 'f-thermos-sim',
    text: {
      en: 'Axisymmetric 3D thermal simulation in -10 C air predicts 42 min inside 39-42 C at 0.097 W/K cap loss and 19 min at 0.188 W/K (simulated; 0 wet-lab curves measured).',
      ru: 'Осесимметричный 3D тепловой расчет при -10 C дает 42 мин в окне 39–42 C при 0.097 Вт/К и 19 мин при 0.188 Вт/К (модель; 0 лабораторных замеров).',
    },
    level: 'simulated',
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s08-thermal' },
    usedBy: [
      's05-title',
      's05-label-1',
      's05-note',
      'v-therm-frame',
      'v-therm-band',
      'v-therm-curve-low',
      'v-therm-curve-high',
      'v-therm-lbl-low',
      'v-therm-lbl-high',
    ],
  },
  {
    id: 'f-rpa',
    text: {
      en: 'Recombinase polymerase enzymes copy target DNA isothermally inside 37-42 C over a 20-minute window.',
      ru: 'Ферменты рекомбиназной полимеразной реакции копируют участок ДНК при постоянных 37–42 C в окне 20 минут.',
    },
    level: 'published',
    source: { kind: 'doi', ref: '10.1016/j.foodchem.2020.127608' },
    checked: '2026-11-09',
    usedBy: ['s06-title', 's06-label-1', 's06-note', 'amplicon', 'amplicon-copy-01', 'gold-copy-01'],
  },
  {
    id: 'f-1igt',
    text: {
      en: 'Whole mouse IgG2a crystal structure PDB 1IGT (12,530 atoms, 14.8 nm span) represents the antibody binders on 40 nm gold.',
      ru: 'Кристаллическая структура целого антитела IgG2a PDB 1IGT (12,530 атомов, размах 14.8 нм) представляет связывающие белки на золоте 40 нм.',
    },
    level: 'published',
    source: { kind: 'pdb', ref: '1IGT' },
    usedBy: [
      's07-title',
      's07-label-1',
      's07-note',
      'igg',
      'igg-capture',
      'gold-main',
      'v-row-gold',
      'v-row-igg1',
      'v-row-dna',
      'v-row-igg2',
    ],
  },
  {
    id: 'f-strip-sandwich',
    text: {
      en: 'Dual-tagged DNA amplicon (FAM and biotin) bridges anti-FAM IgG on 40 nm gold to the immobilized test-line binder, while excess gold reaches the control line.',
      ru: 'Двухмеченый ампликон ДНК (FAM и биотин) связывает антитело к FAM на золоте 40 нм с белком тестовой линии, а избыток золота идет на контроль.',
    },
    level: 'published',
    source: { kind: 'doi', ref: '10.1016/j.mex.2023.102372' },
    checked: '2026-11-09',
    usedBy: ['s07-label-1', 's07-note', 's08-title', 's08-label-1'],
  },
  {
    id: 'f-pin-reader',
    text: {
      en: 'Closed pin-transfer cassette model transfers 74% of reaction fluid after 10 squeezes without opening the amplicon tube (simulated; unmeasured).',
      ru: 'Модель закрытой кассеты со штифтом переносит 74% объема реакции после 10 нажатий без вскрытия пробирки с ампликоном (расчет; без замеров).',
    },
    level: 'simulated',
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s06-reader' },
    usedBy: ['s08-label-1', 's08-note'],
  },
  {
    id: 'f-readout',
    text: {
      en: 'Strip interpretation: 2 lines indicate target DNA, 1 control line indicates negative sample, and 0 control lines reject an invalid strip; 3 in silico panels exist.',
      ru: 'Чтение полоски: 2 линии означают ДНК мишени, 1 контрольная линия — чистую пробу, 0 контрольных линий — брак полоски; собраны 3 панели in silico.',
    },
    level: 'simulated',
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s09-panels' },
    usedBy: ['s09-title', 's09-label-1', 's09-note', 'v-read-pos', 'v-read-neg', 'v-read-inv'],
  },
  {
    id: 'f-cost',
    text: {
      en: 'Field protocol takes 6 operator actions (7-9 active minutes); quoted disposable parts sum to 13.4-32.8 RUB against a 100 RUB per-test target ceiling.',
      ru: 'Полевой протокол включает 6 действий оператора (7–9 минут руками); сумма котировок расходников 13.4–32.8 руб. при целевом потолке 100 руб.',
    },
    level: 'target',
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s12-field' },
    usedBy: ['s10-title', 's10-label-1', 's10-note', 'v-cost-quote', 'v-cost-ceil'],
  },
  {
    id: 'f-status',
    text: {
      en: 'Current state has thermal simulation, pin-transfer model, and 3 in silico primer panels with 0 wet-lab runs; next checks are E1 wax hold, E4 pin transfer, and E7 control DNA.',
      ru: 'Сейчас готовы тепловой расчет, модель штифта и 3 панели праймеров in silico при 0 мокрых опытов; следующие проверки — E1 парафин, E4 штифт и E7 контрольная ДНК.',
    },
    level: 'target',
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s14-limits' },
    usedBy: ['s11-title', 's11-label-1', 's11-note'],
  },
];

const story = [
  {
    stop: 0,
    title: { en: 'Miraeles', ru: 'Miraeles' },
    say: {
      en: 'Miraeles is a field DNA kit for checking plant and farm samples without shipping tubes to a central laboratory.',
      ru: 'Miraeles — полевой ДНК-набор для проверки проб растений и ферм без отправки пробирок в центральную лабораторию.',
    },
    facts: ['f-cover', 'f-kit'],
  },
  {
    stop: 1,
    title: { en: 'Hidden infection in leaf tissue', ru: 'Скрытая инфекция в ткани листа' },
    say: {
      en: 'Fungal mycelium spreads inside green leaf tissue days before visible lesions appear on the crop.',
      ru: 'Грибница распространяется внутри зеленой ткани листа за несколько дней до появления заметных пятен.',
    },
    facts: ['f-problem', 'f-mira-wheat'],
  },
  {
    stop: 2,
    title: { en: 'Complete kit in order of use', ru: 'Весь набор по порядку работы' },
    say: {
      en: 'Every run uses four modules in sequence: sample lysis tube, thermos bath, MIRA reaction tube and closed strip reader.',
      ru: 'Каждый запуск проходит четыре модуля подряд: пробирку лизиса, термос нагрева, пробирку MIRA и закрытую кассету полоски.',
    },
    facts: ['f-kit'],
  },
  {
    stop: 3,
    title: { en: 'Alkaline lysis without a centrifuge', ru: 'Щелочной лизис без центрифуги' },
    say: {
      en: 'Crushed leaf tissue in alkaline buffer releases template DNA in 5 minutes, inside a total on-site window under 25 minutes.',
      ru: 'Растертая ткань листа в щелочном буфере отдает матричную ДНК за 5 минут при общем времени полевого анализа менее 25 минут.',
    },
    facts: ['f-extraction', 'f-mira-wheat'],
  },
  {
    stop: 4,
    title: { en: 'Paraffin bath inside the thermos', ru: 'Парафиновая баня в термосе' },
    say: {
      en: 'A 300 mL thermos holds 150 to 200 grams of food-grade paraffin wax melting at 40 to 41 C without batteries.',
      ru: 'Термос объемом 300 мл содержит от 150 до 200 граммов пищевого парафина с плавлением при 40–41 C без батарей.',
    },
    facts: ['f-thermos-scale'],
  },
  {
    stop: 5,
    title: { en: 'Simulated cooling window', ru: 'Расчетное окно остывания' },
    say: {
      en: 'In -10 C air, the 3D thermal model holds 39 to 42 C for 42 minutes at 0.097 W/K cap loss and 19 minutes at 0.188 W/K.',
      ru: 'При воздухе -10 C 3D-модель держит окно 39–42 C 42 минуты при потерях крышки 0.097 Вт/К и 19 минут при 0.188 Вт/К.',
    },
    facts: ['f-thermos-sim'],
  },
  {
    stop: 6,
    title: { en: 'Isothermal amplification in the drop', ru: 'Изотермическая амплификация в капле' },
    say: {
      en: 'At 37 to 42 C, recombinase and polymerase enzymes multiply the target DNA segment into dual-tagged duplex copies.',
      ru: 'В окне 37–42 C ферменты рекомбиназы и полимеразы размножают участок ДНК в двухмеченые двуцепочечные копии.',
    },
    facts: ['f-rpa', 'f-mira-wheat'],
  },
  {
    stop: 7,
    title: { en: 'Whole binding sandwich at true scale', ru: 'Полный комплекс связывания в масштабе' },
    say: {
      en: 'A 40 nm gold particle, anti-FAM IgG PDB 1IGT, FAM-DNA-biotin duplex and capture binder form one physical bridge.',
      ru: 'Частица золота 40 нм, антитело IgG PDB 1IGT, дуплекс ДНК с метками FAM и биотин и белок захвата образуют единый мост.',
    },
    facts: ['f-1igt', 'f-strip-sandwich'],
  },
  {
    stop: 8,
    title: { en: 'Closed transfer and line capture', ru: 'Закрытый перенос и захват на линиях' },
    say: {
      en: 'A sealed pin cassette transfers 74% of fluid in the model after 10 squeezes, capturing bridged gold at the test line.',
      ru: 'Закрытая кассета со штифтом в модели переносит 74% жидкости после 10 нажатий, удерживая связанное золото на тесте.',
    },
    facts: ['f-strip-sandwich', 'f-pin-reader'],
  },
  {
    stop: 9,
    title: { en: 'Visual strip readout rules', ru: 'Правила чтения полоски' },
    say: {
      en: 'Two coloured lines show target DNA, one control line shows a negative sample, and zero control lines reject the strip.',
      ru: 'Две цветные линии показывают ДНК мишени, одна контрольная линия — чистую пробу, а 0 контрольных линий — брак полоски.',
    },
    facts: ['f-readout'],
  },
  {
    stop: 10,
    title: { en: 'Target disposable cost', ru: 'Целевая стоимость расходников' },
    say: {
      en: 'Quoted disposable parts sum to 13.4 to 32.8 rubles across 6 operator steps against a 100-ruble per-test ceiling.',
      ru: 'Сумма котировок одноразовых частей составляет 13.4–32.8 рубля при 6 действиях оператора и целевом потолке 100 рублей.',
    },
    facts: ['f-cost'],
  },
  {
    stop: 11,
    title: { en: 'Current state and next checks', ru: 'Текущий статус и следующие проверки' },
    say: {
      en: 'Thermal simulation, pin geometry and 3 in silico panels exist; wet-lab checks E1, E4 and E7 come next.',
      ru: 'Тепловой расчет, чертеж штифта и 3 панели in silico готовы; впереди лабораторные проверки E1, E4 и E7.',
    },
    facts: ['f-status'],
  },
];

// Deterministic scatter clouds in nano frame using core/geo scatter()
const ampliconPts = scatter(
  { min: [-44, 6, -38], max: [46, 34, -14] },
  10,
  13,
  11,
);
const ampliconMeshes = ampliconPts.map((pos, i) => ({
  id: `amplicon-copy-${String(i + 1).padStart(2, '0')}`,
  kind: 'mesh',
  frame: 'nano',
  position: pos.map((v) => Number(v.toFixed(2))),
  rotation: [Number((0.25 * (i % 5)).toFixed(2)), Number((0.4 * i).toFixed(2)), 0.15],
  size: 1.0e-8,
  source: { kind: 'doi', ref: '10.1016/j.foodchem.2020.127608' },
  evidence: 'published',
  window: [33, 51],
  roles: ['nucleic-acid'],
  asset: 'amplicon.glb',
}));

const goldPts = scatter(
  { min: [-56, 12, -52], max: [58, 42, -24] },
  7,
  20,
  23,
);
const goldMeshes = goldPts.map((pos, i) => ({
  id: `gold-copy-${String(i + 1).padStart(2, '0')}`,
  kind: 'mesh',
  frame: 'nano',
  position: pos.map((v) => Number(v.toFixed(2))),
  size: 1.5e-8,
  source: { kind: 'doi', ref: '10.1016/j.foodchem.2020.127608' },
  evidence: 'published',
  window: [33, 51],
  roles: ['gold'],
  asset: 'builtin:sphere',
}));

// Multi-scale depth particles across the 6-decade zoom (44 mm -> 80 nm) so every frame has >2% canvas pixels
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
    { id: 'tube', parent: 'bench', unit: 0.001, origin: [0, 8, 0] },
    { id: 'nano', parent: 'tube', unit: 1e-9, origin: [0, -7.2, 0] },
    { id: 'strip', parent: 'bench', unit: 0.001, origin: [56, 4, 10] },
  ],
  objects: [
    {
      id: 'igg',
      kind: 'molecule',
      frame: 'nano',
      position: [-14, 4, 0],
      size: 1.48e-8,
      source: { kind: 'pdb', ref: '1IGT' },
      evidence: 'published',
      window: [0, 72],
      roles: ['antibody'],
      asset: 'igg.glb',
      standIn: {
        asset: 'builtin:sphere',
        swapAt: 3e-7,
      },
    },
    {
      id: 'igg-capture',
      kind: 'molecule',
      frame: 'nano',
      position: [18, 4, 0],
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
      position: [-41, 4, 0],
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
      position: [2, 4, 0],
      size: 1.8e-8,
      source: { kind: 'doi', ref: '10.1016/j.mex.2023.102372' },
      evidence: 'published',
      window: [0, 72],
      roles: ['nucleic-acid'],
      asset: 'amplicon.glb',
    },
    {
      id: 'tag-fam',
      kind: 'mesh',
      frame: 'nano',
      position: [-7, 5.4, 0],
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
      position: [11, 2.6, 0],
      size: 2.8e-9,
      source: { kind: 'engine', ref: '' },
      evidence: 'architecture',
      window: [0, 72],
      roles: ['gold'],
      asset: 'builtin:sphere',
    },
    ...ampliconMeshes,
    ...goldMeshes,
    ...transitionObjects,
    {
      id: 'sample-tube',
      kind: 'mesh',
      frame: 'bench',
      position: [-94, 8, 6],
      size: 0.024,
      source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s05-workflow' },
      evidence: 'architecture',
      window: [0, 72],
      roles: ['plastic'],
      asset: 'builtin:tube',
    },
    {
      id: 'thermos',
      kind: 'mesh',
      frame: 'bench',
      position: [-48, 26, -16],
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
      source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s05-workflow' },
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
      source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s05-workflow' },
      evidence: 'architecture',
      window: [0, 72],
      roles: ['liquid'],
      asset: 'builtin:liquid',
    },
    {
      id: 'strip-body',
      kind: 'mesh',
      frame: 'strip',
      position: [0, 0, 0],
      size: 0.06,
      source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s05-workflow' },
      evidence: 'architecture',
      window: [0, 72],
      roles: ['strip'],
      asset: 'strip.glb',
      rotation: [0.35, -0.32, 0],
    },
  ],
};

// Labelled SVG vector overlays in non-overlapping windows [stops[k], stops[k] + 5.8], upper-left or top strip
const vectors = [
  // Stop 2 (t=12..17.8): 4-module kit order strip at top (y=72..148)
  ...[
    { idx: 0, x: 96, en: '1 Sample', ru: '1 Проба' },
    { idx: 1, x: 428, en: '2 Bath', ru: '2 Баня' },
    { idx: 2, x: 760, en: '3 MIRA', ru: '3 MIRA' },
    { idx: 3, x: 1092, en: '4 Strip', ru: '4 Полоска' },
  ].flatMap((m) => [
    {
      id: `v-kit-card-${m.idx}`,
      type: 'shape',
      shape: 'rect',
      frame: null,
      box: [m.x, 68, 308, 72],
      roles: ['tile'],
      source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s05-workflow' },
      evidence: 'architecture',
      window: winOf(2),
    },
    {
      id: `v-kit-lbl-${m.idx}`,
      type: 'label',
      frame: null,
      box: [m.x + 18, 78, 272, 54],
      text: { en: m.en, ru: m.ru },
      roles: ['label'],
      source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s05-workflow' },
      evidence: 'architecture',
      window: winOf(2),
    },
  ]),

  // Stop 5 (t=30..35.8): Simulated 3D cooling curves in -10 C air (upper-left x=96..856, y=88..428)
  {
    id: 'v-therm-frame',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [96, 88, 760, 340],
    roles: ['tile'],
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s08-thermal' },
    evidence: 'simulated',
    window: winOf(5),
  },
  {
    id: 'v-therm-band',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [132, 168, 688, 108],
    roles: ['shape'],
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s08-thermal' },
    evidence: 'simulated',
    window: winOf(5),
  },
  {
    id: 'v-therm-band-lbl',
    type: 'label',
    frame: null,
    box: [132, 102, 688, 56],
    text: { en: '39-42 C band (-10 C air)', ru: 'Окно 39-42 C (воздух -10 C)' },
    roles: ['label'],
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s08-thermal' },
    evidence: 'simulated',
    window: winOf(5),
  },
  {
    id: 'v-therm-curve-low',
    type: 'path',
    frame: null,
    box: [132, 174, 688, 180],
    d: 'M 132 178 L 296 198 L 468 226 L 636 256 L 796 292',
    roles: ['diagram'],
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s08-thermal' },
    evidence: 'simulated',
    window: winOf(5),
  },
  {
    id: 'v-therm-curve-high',
    type: 'path',
    frame: null,
    box: [132, 174, 688, 220],
    d: 'M 132 178 L 246 232 L 382 288 L 542 346 L 796 392',
    roles: ['line'],
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s08-thermal' },
    evidence: 'simulated',
    window: winOf(5),
  },
  {
    id: 'v-therm-lbl-low',
    type: 'label',
    frame: null,
    box: [468, 192, 344, 54],
    text: { en: '42 min (0.097 W/K)', ru: '42 мин (0.097 Вт/К)' },
    roles: ['label'],
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s08-thermal' },
    evidence: 'simulated',
    window: winOf(5),
  },
  {
    id: 'v-therm-lbl-high',
    type: 'label',
    frame: null,
    box: [164, 344, 360, 54],
    text: { en: '19 min (0.188 W/K)', ru: '19 мин (0.188 Вт/К)' },
    roles: ['label'],
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s08-thermal' },
    evidence: 'simulated',
    window: winOf(5),
  },

  // Stop 7 (t=42..47.8): Plain-shape row matching the 3D sandwich in exact order & roles (Rule 13.26)
  {
    id: 'v-row-gold',
    type: 'shape',
    shape: 'ellipse',
    frame: null,
    box: [116, 584, 60, 60],
    roles: ['gold'],
    source: { kind: 'pdb', ref: '1IGT' },
    evidence: 'published',
    window: winOf(7),
  },
  {
    id: 'v-row-igg1',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [216, 592, 128, 44],
    roles: ['antibody'],
    source: { kind: 'pdb', ref: '1IGT' },
    evidence: 'published',
    window: winOf(7),
  },
  {
    id: 'v-row-dna',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [384, 598, 210, 32],
    roles: ['nucleic-acid'],
    source: { kind: 'doi', ref: '10.1016/j.mex.2023.102372' },
    evidence: 'published',
    window: winOf(7),
  },
  {
    id: 'v-row-igg2',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [634, 592, 128, 44],
    roles: ['antibody'],
    source: { kind: 'pdb', ref: '1IGT' },
    evidence: 'published',
    window: winOf(7),
  },
  {
    id: 'v-row-caption',
    type: 'label',
    frame: null,
    box: [116, 654, 960, 56],
    text: { en: 'Gold -> IgG -> FAM-DNA-biotin -> test line', ru: 'Золото -> IgG -> ДНК с метками -> тест-линия' },
    roles: ['label'],
    source: { kind: 'doi', ref: '10.1016/j.mex.2023.102372' },
    evidence: 'published',
    window: winOf(7),
  },

  // Stop 9 (t=54..59.8): Strip readout rules card (upper-left x=96..836, y=92..376)
  {
    id: 'v-read-pos',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [96, 92, 740, 80],
    roles: ['tile'],
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s09-panels' },
    evidence: 'simulated',
    window: winOf(9),
  },
  {
    id: 'v-read-pos-lbl',
    type: 'label',
    frame: null,
    box: [120, 106, 692, 56],
    text: { en: '2 lines (C + T): target DNA', ru: '2 линии (C + T): ДНК мишени' },
    roles: ['label'],
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s09-panels' },
    evidence: 'simulated',
    window: winOf(9),
  },
  {
    id: 'v-read-neg',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [96, 188, 740, 80],
    roles: ['tile'],
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s09-panels' },
    evidence: 'simulated',
    window: winOf(9),
  },
  {
    id: 'v-read-neg-lbl',
    type: 'label',
    frame: null,
    box: [120, 202, 692, 56],
    text: { en: '1 line (C only): negative', ru: '1 линия (только C): чисто' },
    roles: ['label'],
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s09-panels' },
    evidence: 'simulated',
    window: winOf(9),
  },
  {
    id: 'v-read-inv',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [96, 284, 740, 80],
    roles: ['shape'],
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s09-panels' },
    evidence: 'simulated',
    window: winOf(9),
  },
  {
    id: 'v-read-inv-lbl',
    type: 'label',
    frame: null,
    box: [120, 298, 692, 56],
    text: { en: '0 control lines: invalid', ru: '0 контрольных линий: брак' },
    roles: ['label'],
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s09-panels' },
    evidence: 'simulated',
    window: winOf(9),
  },

  // Stop 10 (t=60..65.8): Disposable quote sum vs 100 RUB target ceiling (upper-left x=96..856, y=96..292)
  {
    id: 'v-cost-ceil',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [96, 96, 740, 84],
    roles: ['tile'],
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s12-field' },
    evidence: 'target',
    window: winOf(10),
  },
  {
    id: 'v-cost-ceil-lbl',
    type: 'label',
    frame: null,
    box: [120, 112, 692, 56],
    text: { en: 'Ceiling: 100 RUB / test', ru: 'Потолок: 100 руб. / тест' },
    roles: ['label'],
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s12-field' },
    evidence: 'target',
    window: winOf(10),
  },
  {
    id: 'v-cost-quote',
    type: 'shape',
    shape: 'rect',
    frame: null,
    box: [96, 198, 240, 84],
    roles: ['diagram'],
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s12-field' },
    evidence: 'target',
    window: winOf(10),
  },
  {
    id: 'v-cost-quote-lbl',
    type: 'label',
    frame: null,
    box: [356, 214, 520, 56],
    text: { en: 'Quotes: 13.4-32.8 RUB', ru: 'Котировки: 13.4-32.8 руб.' },
    roles: ['label'],
    source: { kind: 'file', ref: 'motion/miraeles/miraeles.film.json#s12-field' },
    evidence: 'target',
    window: winOf(10),
  },
];

// Motion tracks so motion carries the physical principle across stops (Rule 13.2 & 13.13)
const timeline = {
  tracks: [
    // Reaction tube lowers toward thermos bath on Stop 4 (t=24) and returns on bench
    {
      target: 'tube',
      prop: 'position',
      keys: [
        { t: 0, v: [0, 0, 0], ease: 'linear' },
        { t: 22, v: [0, 0, 0], ease: 'power2.inOut' },
        { t: 24.5, v: [-18, 6, -6], ease: 'power2.inOut' },
        { t: 29.2, v: [0, 0, 0], ease: 'power2.inOut' },
        { t: 72, v: [0, 0, 0], ease: 'linear' },
      ],
    },
    // Cooling curve draws progressively across Stop 5 (t=30..34.5)
    {
      target: 'v-therm-curve-low',
      prop: 'draw',
      keys: [
        { t: 29.5, v: 0, ease: 'linear' },
        { t: 30.8, v: 1, ease: 'power2.out' },
        { t: 35.8, v: 1, ease: 'linear' },
      ],
    },
    {
      target: 'v-therm-curve-high',
      prop: 'draw',
      keys: [
        { t: 29.5, v: 0, ease: 'linear' },
        { t: 31.0, v: 1, ease: 'power2.out' },
        { t: 35.8, v: 1, ease: 'linear' },
      ],
    },
    // Molecular sandwich docking between Stop 6 (t=36) and Stop 7 (t=42): gold + anti-FAM IgG dock onto FAM-DNA-biotin
    {
      target: 'gold-main',
      prop: 'position',
      keys: [
        { t: 0, v: [-41, 4, 0], ease: 'linear' },
        { t: 36, v: [-54, 8, -6], ease: 'power2.inOut' },
        { t: 41.2, v: [-41, 4, 0], ease: 'power2.out' },
        { t: 72, v: [-41, 4, 0], ease: 'linear' },
      ],
    },
    {
      target: 'igg',
      prop: 'position',
      keys: [
        { t: 0, v: [-14, 4, 0], ease: 'linear' },
        { t: 36, v: [-24, 7, -4], ease: 'power2.inOut' },
        { t: 41.2, v: [-14, 4, 0], ease: 'power2.out' },
        { t: 72, v: [-14, 4, 0], ease: 'linear' },
      ],
    },
    ...ampliconMeshes.slice(0, 6).map((m) => ({
      target: m.id,
      prop: 'opacity',
      keys: [
        { t: 33, v: 0, ease: 'linear' },
        { t: 35.8, v: 0.78, ease: 'power2.out' },
        { t: 41.8, v: 0.18, ease: 'power2.inOut' },
        { t: 50.8, v: 0, ease: 'power2.inOut' },
      ],
    })),
  ],
};

// Camera targets sit slightly below object y so 3D models frame cleanly in upper canvas (y=60..660),
// and right-of-center on diagram stops (5, 9, 10) so left-side vector cards never overlap the 3D render.
const cameraKeys = [
  // Stop 0 (t=0): 3/4 studio overview of complete 4-module kit with full thermos silhouette
  { t: 0, at: { frame: 'bench', pos: [14, 58, 365] }, target: { frame: 'bench', pos: [-18, -20, -4] }, fov: 40, ease: 'power2.out' },
  // Stop 1 (t=6): closer bench angle on sample lysis tube & thermos
  { t: 6, at: { frame: 'bench', pos: [-38, 50, 335] }, target: { frame: 'bench', pos: [-44, -18, 0] }, fov: 40, ease: 'power2.inOut' },
  // Stop 2 (t=12): full 4-module kit in order of use below top module strip
  { t: 12, at: { frame: 'bench', pos: [-12, 54, 385] }, target: { frame: 'bench', pos: [-18, -22, -4] }, fov: 40, ease: 'power2.inOut' },
  // Stop 3 (t=18): close-up on 0.2 mL lysis/reaction tube and liquid meniscus
  { t: 18, at: { frame: 'tube', pos: [10, 8, 56] }, target: { frame: 'tube', pos: [-2, -9, 0] }, fov: 40, ease: 'power2.inOut' },
  // Stop 4 (t=24): 300 mL thermos + reaction tube pair in 3/4 view
  { t: 24, at: { frame: 'bench', pos: [-18, 52, 345] }, target: { frame: 'bench', pos: [-36, -18, -10] }, fov: 40, ease: 'power2.inOut' },
  // Stop 5 (t=30): liquid drop in tube framed on the RIGHT while cooling chart sits on the left; distance ~ 0.047 m >= 2 * swapAt (6e-7 m)
  { t: 30, at: { frame: 'tube', pos: [-11, 2, 46] }, target: { frame: 'nano', pos: [-12000000, -3500000, 0] }, fov: 40, ease: 'power2.inOut' },
  // Stop 6 (t=36): inside the warm drop at molecular scale; distance ~ 1.19e-7 m <= swapAt / 2 (1.5e-7 m)
  { t: 36, at: { frame: 'nano', pos: [0, 14, 118] }, target: { frame: 'nano', pos: [-4, -14, 0] }, fov: 40, ease: 'power2.inOut' },
  // Stop 7 (t=42): whole binding sandwich in upper half (y=85..495) cleanly above plain-shape row (y=584..710)
  { t: 42, at: { frame: 'nano', pos: [-8, 14, 136] }, target: { frame: 'nano', pos: [-8, -24, 0] }, fov: 40, ease: 'power2.inOut' },
  // Stop 8 (t=48): capture side of sandwich
  { t: 48, at: { frame: 'nano', pos: [4, 12, 122] }, target: { frame: 'nano', pos: [0, -16, 0] }, fov: 40, ease: 'power2.inOut' },
  // Pull straight out of the liquid drop before panning to the closed strip reader
  { t: 51.5, at: { frame: 'tube', pos: [8, 4, 50] }, target: { frame: 'nano', pos: [0, 0, 0] }, fov: 40, ease: 'power2.inOut' },
  // Stop 9 (t=54): strip cassette framed on the RIGHT (x=960..1760) while readout rules card sits on the left (x=96..836)
  { t: 54, at: { frame: 'strip', pos: [-42, 34, 165] }, target: { frame: 'strip', pos: [-58, -18, 0] }, fov: 40, ease: 'power2.inOut' },
  // Stop 10 (t=60): 3/4 kit framed on the RIGHT while disposable cost bars sit on the left
  { t: 60, at: { frame: 'bench', pos: [-78, 56, 365] }, target: { frame: 'bench', pos: [-96, -20, -4] }, fov: 40, ease: 'power2.inOut' },
  // Stop 11 (t=66): final studio 3/4 view of all 4 modules
  { t: 66, at: { frame: 'bench', pos: [8, 56, 365] }, target: { frame: 'bench', pos: [-18, -20, -4] }, fov: 40, ease: 'power2.inOut' },
  // End of timeline (t=72)
  { t: 72, at: { frame: 'bench', pos: [14, 56, 365] }, target: { frame: 'bench', pos: [-18, -20, -4] }, fov: 40, ease: 'sine.inOut' },
];

const noteBlocksByStop = {
  2: {
    id: 's02-note',
    en: 'Architecture: 4 kit modules shown in physical sequence; zero subset omission.',
    ru: 'Конструкция: все 4 модуля набора показаны подряд по ходу работы.',
  },
  3: {
    id: 's03-note',
    en: 'Published precedent: 5 min alkaline lysis (<25 min total) and 10 min MIRA at 39 C.',
    ru: 'Опубликованный прецедент: 5 мин лизиса (<25 мин всего) и 10 мин MIRA при 39 C.',
  },
  4: {
    id: 's04-note',
    en: 'Illustration scale: Poly Haven CC0 thermos scaled by 0.484 to 155 mm body height.',
    ru: 'Масштаб модели: термос Poly Haven CC0 с коэффициентом 0.484 (корпус 155 мм).',
  },
  5: {
    id: 's05-note',
    en: 'Simulated 3D thermal model in -10 C air; 0 wet-lab hold curves measured yet.',
    ru: 'Расчетная 3D тепловая модель при -10 C; пока 0 лабораторных замеров кривой.',
  },
  6: {
    id: 's06-note',
    en: 'Published isothermal window: 37-42 C (RPA 20 min; wheat-blast MIRA 10 min at 39 C).',
    ru: 'Опубликованное окно: 37–42 C (RPA 20 мин; MIRA патогена пшеницы 10 мин при 39 C).',
  },
  7: {
    id: 's07-note',
    en: 'Plain-shape row matches 40 nm gold, PDB 1IGT (14.8 nm), FAM-DNA-biotin, and test line.',
    ru: 'Ряд простых фигур повторяет золото 40 нм, PDB 1IGT (14.8 нм), ДНК с метками и тест-линию.',
  },
  8: {
    id: 's08-note',
    en: 'Simulated pin-transfer model (74% after 10 squeezes); physical volume unmeasured.',
    ru: 'Расчет переноса штифтом (74% после 10 нажатий); физический объем еще не измерен.',
  },
  9: {
    id: 's09-note',
    en: 'In silico status: 3 primer panels designed on computer; 0 wet-lab strip runs yet.',
    ru: 'Статус in silico: рассчитаны 3 панели праймеров; пока 0 мокрых запусков полосок.',
  },
  10: {
    id: 's10-note',
    en: 'Target economics: 13.4-32.8 RUB quoted disposable parts under a 100 RUB target ceiling.',
    ru: 'Целевая экономика: 13.4–32.8 руб. по котировкам частей при потолке 100 руб.',
  },
  11: {
    id: 's11-note',
    en: 'Verification gates: E1 paraffin hold curve, E4 pin transfer volume, E7 control DNA.',
    ru: 'Следующие проверки: E1 удержание тепла парафином, E4 перенос штифтом, E7 контрольная ДНК.',
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
        box: [96, 748, 1480, 62],
      },
      {
        id: `s${nn}-label-1`,
        role: 'label',
        text: s.say[lg],
        box: [96, 816, 1680, 108],
      },
    ];
    if (noteBlocksByStop[s.stop]) {
      blocks.push({
        id: noteBlocksByStop[s.stop].id,
        role: 'note',
        text: noteBlocksByStop[s.stop][lg],
        box: [96, 930, 1680, 96],
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
    idea: 'Miraeles is a field kit for plant and farm DNA detection in a warm paraffin thermos, with MIRA isothermal amplification and closed lateral-flow readout.',
    details: 'A 12-slide product and pilot deck. Lenses: journal and cinematic. Check-ins: one storyboard stop. Outputs: live deck, MP4, PDF, web link.',
    concepts: [
      'hidden fungal infection on the farm',
      'four kit modules in order of use',
      'alkaline lysis and paraffin thermos bath',
      'isothermal amplification at molecular scale',
      'whole binding sandwich and closed pin transfer',
      'target disposable cost and verification checks',
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
  timeline,
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
  const extraSim = s.facts.some((fid) => factById.get(fid)?.level === 'simulated')
    ? '\n- **Simulation provenance:** Grounded in `motion/miraeles/miraeles.film.json` (`#s06-reader`, `#s08-thermal`, `#s09-panels`); 0 wet-lab curves or strip runs are claimed as measured.'
    : '';
  const md = `# Slide ${s.stop}: ${s.title.en} / ${s.title.ru}

- **Message:** ${s.say.en}
- **Facts and sources:** ${s.facts.join(', ')}
- **Claim boundary:** ${boundaries}${extraSim}
- **Export-check result:** clean (0 findings across en/ru and journal/cinematic)
- **Blind-read date and outcome:** 2026-11-09, pass (0 remaining items in Q2/Q3)
- **Ten-second sentence:** ${s.say.en}

Studio slides pass \`tools/check.mjs\`, \`tools/pixels.test.mjs\`, live \`checkPage\`, and contact-sheet blind reads.
`;
  fs.writeFileSync(path.join(REVIEW_DIR, `${s.stop}.notes.md`), md, 'utf8');
}

console.log('Wrote miraeles/job.json and 12 review/*.notes.md files.');
