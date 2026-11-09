// Deterministic parameter & GPU memory calculator for studio/jobs/ml-explainer (Plan 9 Task 3).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));

const ae = 255_873_676;
const dn = 153_102_091;
const L = 512;
const D = 256;
const H = 8;
const layers = 12;
const gpuGiB = 80;
const gib = 1024 ** 3;
const mib = 1024 ** 2;
const gpuBytes = gpuGiB * gib;

const sizes = {
  aeParams: ae,
  dnParams: dn,
  totalParams: ae + dn,
  seqLen: L,
  latentDim: D,
  heads: H,
  layers,
  gpuGiB,
  gpuBytes,
  aeFp32Bytes: ae * 4,
  aeBf16Bytes: ae * 2,
  dnFp32Bytes: dn * 4,
  dnBf16Bytes: dn * 2,
  pairValues: L * L * H,
  pairFp32Bytes: L * L * H * 4,
  pairAllLayersFp32Bytes: L * L * H * 4 * layers,
  hiddenValues: L * D,
  hiddenFp32Bytes: L * D * 4,
  aeTrainBytes: ae * 16,
  dnTrainBytes: dn * 16,
  sumTrainBytes: (ae + dn) * 16,
  aeTrainGiB: Number(((ae * 16) / gib).toFixed(3)),
  dnTrainGiB: Number(((dn * 16) / gib).toFixed(3)),
  sumTrainGiB: Number((((ae + dn) * 16) / gib).toFixed(3)),
  pairMiB: Number(((L * L * H * 4) / mib).toFixed(1)),
  pairAllLayersMiB: Number(((L * L * H * 4 * layers) / mib).toFixed(1)),
  share80: Number((((ae + dn) * 16) / gpuBytes).toFixed(6)),
  share80Pct: Number(((((ae + dn) * 16) / gpuBytes) * 100).toFixed(2)),
};

assert.equal(sizes.totalParams, 408_975_767);
assert.equal(sizes.aeFp32Bytes, 1_023_494_704);
assert.equal(sizes.aeBf16Bytes, 511_747_352);
assert.equal(sizes.dnFp32Bytes, 612_408_364);
assert.equal(sizes.dnBf16Bytes, 306_204_182);
assert.equal(sizes.pairValues, 2_097_152);
assert.equal(sizes.pairFp32Bytes, 8_388_608);
assert.equal(sizes.hiddenValues, 131_072);
assert.equal(sizes.aeTrainBytes, 4_093_978_816);
assert.equal(sizes.dnTrainBytes, 2_449_633_456);
assert.equal(sizes.sumTrainBytes, 6_543_612_272);
assert.ok(sizes.share80 > 0.076 && sizes.share80 < 0.077);

fs.writeFileSync(path.join(DIR, 'sizes.json'), `${JSON.stringify(sizes, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(sizes));
