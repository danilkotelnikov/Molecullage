# Plan 4 Ledger: 2D Vector Layer, GSAP 3.15.0 & Figure Rebuild Pipeline

- **Date:** 2026-11-09
- **Core Unit Tests (`core/test/vector.test.ts`, `core/test/reading.test.ts`):** 23/23 pass (`validateVectors`, `recolourSvg`, `samplePath`, `checkReading`).
- **GSAP 3.15.0 + DrawSVGPlugin (`tools/gsap.test.mjs`):** 2/2 pass (`opacity`, `x`, `scale` match `sample()` within `1e-3` across 50 seeded times; `draw: 0.5` sets `stroke-dasharray` to half of path length `200`, seek-back matches fresh load).
- **Live Vector Layer (`tools/vector.test.mjs`):** 3/3 pass (`v-arrow` draws across `[1, 1.5, 2]` with `stroke-dasharray` `0 -> 112 -> 224` and identical SVG at same `t`; `igg-name` follows `nano` frame and hides behind camera at `t = 11`; Russian label renders and passes `checkPage`).
- **Rebuild Pipeline (`tools/rebuild/test/trace.test.mjs`, `assemble.test.mjs`, `score.test.mjs`, `test_score.py`):**
  - `trace.test.mjs`: 3/3 pass (`vtracer` 0.6.11 region tracing, `no-paths` finding on blank region, background path removal).
  - `assemble.test.mjs`: 4/4 pass (letterbox mapping into 1920x1080, `pixels` crop, `model-as-pixels` fallback, missing PDB refusal).
  - `test_score.py`: 4/4 pass (Pillow `LANCZOS` resize, greyscale `L` MAD score, Sobel edge IoU at threshold `64.0`).
  - `score.test.mjs`: 1/1 pass (headless Chrome render of `rebuild-fixture` achieves `mad_score=0.9929 >= 0.75` and `edge_iou=0.3612 >= 0.25`; `node tools/check.mjs rebuild-fixture` exits 0).
