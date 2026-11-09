# Plan 7 Ledger: Arc Science (Arc Harness) Pilot Deck

- **Date:** 2026-11-09
- **Crossref DOI Check (`10.1038/nsb0996-803`):** Resolved ("Crystal structure of a camel single-domain VH antibody fragment in complex with lysozyme", Desmyter et al., 1996). `checked` set to `2026-11-09` on `f-1mel`, `f-contacts`, `f-cdr3`.
- **PDB 1MEL Reference & Meshes:**
  - `structure-pdb-1mel` registered in `studio/library/references.json` (`tools/references.test.mjs` 1/1 pass).
  - Real headless ChimeraX 1.10 exports via `studio/jobs/arc-science/make_1mel_glb.cxc`:
    - `1mel.glb`: `1,505,796` bytes (cartoon complex of camelid VHH + lysozyme).
    - `1mel_site.glb`: `9,329,352` bytes (CDR3 `/A:99-118` sticks + lysozyme side chains within 6 Å).
    - `1mel_contacts.glb`: `165,016` bytes (55 Cα-Cα pseudobond cylinders at radius 0.1 Å from `motion/films/assets/contacts_1MEL.json`).
- **Time Budget:** 8 hours recorded in `brief.timeBudget`.
- **Ceiling Check (`checkFacts`):** `ok` (`architecture`, `published`, `target` within `motion/projects/arc-science.json`).
- **Numbers & Fact Use Check (`checkStory`):** `ok`.
- **Refused Words & Prose Check (`node tools/check.mjs arc-science`):** `ok` (`check: clean`).
- **Storyboard, PDF Handouts & Static Site:**
  - `studio/out/storyboard/arc-science/sheet.html` and `sheet.png` (12 stops rendered at 1920x1080 via headless Chrome).
  - `studio/out/arc-science-journal-en.pdf` (12 pages, 1920x1080), `arc-science-journal-ru.pdf` (12 pages, 1920x1080), `arc-science-journal-en-notes.pdf` (12 pages, 1920x1400 with speaker notes).
  - `studio/out/site/arc-science/` built and verified with `noindex` and `robots.txt`.
