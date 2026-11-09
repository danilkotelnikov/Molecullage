// Deterministic parameter & GPU memory calculator for studio/jobs/ml-explainer (Plan 9 Task 3).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));

const ae = 255_873_676;
const dn = 153_102_091;
const L = 132; // 1MEL chain A residues
const inputCols = 169; // 111 atom coords + 37 atom mask + 21 residue type
const latentCols = 8;
const bypassCols = 3;
const hiddenCols = 768;
const pairCols = 256;
const aeEncBlocks = 12;
const aeDecBlocks = 12;
const dnBlocks = 14;
const gpuBytes = 80_000_000_000; // 80 GB NVIDIA A100 (gpu-standard-v3)

const sizes = {
  aeParams: ae,
  dnParams: dn,
  totalParams: ae + dn,
  residues: L,
  inputCols,
  inputValues: L * inputCols,
  latentCols,
  latentValues: L * latentCols,
  bypassCols,
  aeEncBlocks,
  aeDecBlocks,
  dnBlocks,
  hiddenCols,
  pairCols,
  gpuBytes,
  aeFp32Bytes: ae * 4,
  aeBf16Bytes: ae * 2,
  dnFp32Bytes: dn * 4,
  dnBf16Bytes: dn * 2,
  pairValues: L * L * pairCols,
  pairFp32Bytes: L * L * pairCols * 4,
  hiddenValues: L * hiddenCols,
  hiddenFp32Bytes: L * hiddenCols * 4,
  aeTrainBytes: ae * 16,
  dnTrainBytes: dn * 16,
  sumTrainBytes: (ae + dn) * 16,
  aeFp32GB: Number(((ae * 4) / 1e9).toFixed(2)),
  aeBf16GB: Number(((ae * 2) / 1e9).toFixed(2)),
  aeTrainGB: Number(((ae * 16) / 1e9).toFixed(2)),
  dnFp32GB: Number(((dn * 4) / 1e9).toFixed(2)),
  dnBf16GB: Number(((dn * 2) / 1e9).toFixed(2)),
  dnTrainGB: Number(((dn * 16) / 1e9).toFixed(2)),
  sumTrainGB: Number((((ae + dn) * 16) / 1e9).toFixed(2)),
  freeBatchGB: Number(((gpuBytes - (ae + dn) * 16) / 1e9).toFixed(1)),
  pairMB: Number(((L * L * pairCols * 4) / 1e6).toFixed(1)),
  hiddenMB: Number(((L * hiddenCols * 4) / 1e6).toFixed(2)),
  share80: Number(((((ae + dn) * 16) / gpuBytes) * 100).toFixed(1)),
  share80Ratio: Number((((ae + dn) * 16) / gpuBytes).toFixed(6)),
};

assert.equal(sizes.inputValues, 22_308);
assert.equal(sizes.latentValues, 1_056);
assert.equal(sizes.aeFp32Bytes, 1_023_494_704);
assert.equal(sizes.aeBf16Bytes, 511_747_352);
assert.equal(sizes.dnFp32Bytes, 612_408_364);
assert.equal(sizes.dnBf16Bytes, 306_204_182);
assert.equal(sizes.pairValues, 4_460_544);
assert.equal(sizes.pairFp32Bytes, 17_842_176);
assert.equal(sizes.hiddenValues, 101_376);
assert.equal(sizes.aeTrainBytes, 4_093_978_816);
assert.equal(sizes.dnTrainBytes, 2_449_633_456);
assert.equal(sizes.sumTrainBytes, 6_543_612_272);
assert.ok(sizes.share80 > 8.1 && sizes.share80 < 8.3);

fs.writeFileSync(path.join(DIR, 'sizes.json'), `${JSON.stringify(sizes, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(sizes));
