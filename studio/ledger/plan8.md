# Plan 8 Ledger: Miraeles Field Kit Pilot Deck

- **Date:** 2026-11-09
- **Crossref DOI Verification:**
  - `10.3390/bios13010082`: Ma Q et al., *Biosensors* 13(1):82 (2023) — verified via Crossref (`checked: 2026-11-09`).
  - `10.1186/s42483-026-00442-9`: Peng J et al., *Phytopathology Research* 8:14 (2026) — verified via Crossref (`checked: 2026-11-09`).
  - `10.1016/j.mex.2023.102372`: Akalin E et al., *MethodsX* 11:102372 (2023) — verified via Crossref (`checked: 2026-11-09`).
  - `10.1016/j.foodchem.2020.127608`: Liu H et al., *Food Chemistry* 338:127608 (2021) — verified via Crossref (`checked: 2026-11-09`).
- **PDB 1IGT & 3D Kit Assets (`studio/jobs/miraeles/`):**
  - `igg.glb`: `2,520,764` bytes (whole mouse IgG2a smooth molecular surface from `data/pdb/1IGT.pdb`, `structure-pdb-1igt` in `references.json`).
  - `thermos.glb`: `171,472` bytes (packed from CC0 Poly Haven `plastic_thermos_2k.gltf`, `model-plastic-thermos-polyhaven` in `references.json`, scale factor `0.484` to 155 mm stated on slide 4).
  - `strip.glb`: `44,408` bytes (sample pad, conjugate pad, nitrocellulose membrane, absorbent pad).
  - `amplicon.glb`: `497,772` bytes (double-helical DNA duplex linking FAM and biotin tags between anti-FAM IgG on 40 nm gold and capture IgG).
- **Evidence Ceiling & Honesty Check (`checkFacts`):**
  - Allowed levels for `miraeles`: `architecture`, `simulated`, `published`, `target`.
  - Zero `measured` facts claimed. Thermos hold (`37-42 C` for `36 min`, `38.7 C` at `20 min`) is explicitly labelled `simulated` (`pipeline/design/v8/eng/out/thermal_summary.md` / `motion/miraeles/miraeles.film.json#s08-thermal`).
- **Checks & Deliverables:**
  - `node tools/check.mjs miraeles` -> `check: clean`.
  - `STUDIO_JOB=miraeles node --test tools/pixels.test.mjs` -> 9/9 pass (zero blank frames across 6-decade zoom, smooth `standIn` crossfade).
  - Storyboard (`studio/out/storyboard/miraeles/sheet.html`, `sheet.png` and `jobs/miraeles/review/`), 3 PDF handouts (`en`, `ru`, `en-notes`), and static site (`studio/out/site/miraeles/`) built and verified.
