# Plan 6 Ledger: Brief, Facts, Prose, Narration, Storyboard, PDF & Static Site

- **Date:** 2026-11-09
- **Core Content Checks (`core/test/brief.test.ts`, `facts.test.ts`, `story.test.ts`, `big.test.ts`):** 27/27 pass (`checkBrief`, `budgetLine`, `checkFacts`, `parseLexicon`, `proseFindings`, `checkStory`, `isBig`).
- **Job Check CLI (`tools/check.test.mjs`):** 6/6 pass (`node tools/check.mjs zoom-test` -> `check: clean`).
- **Query Error Page (`tools/query.test.mjs`):** 2/2 pass (`bad job id` shown with zero `/jobs/`, `/lenses/`, `/cache/` requests on invalid IDs; valid query loads Russian layout).
- **Windows SAPI Narration (`tools/narrate.test.mjs`):** 5/5 pass (`buildNarration` timing, `say` validation, `--engine fish` approval gate, end-to-end Windows SAPI `.wav` + word-timed `cues.en.json` generation with full temp cleanup in `film/`).
- **Storyboard & Big-Job Gate (`tools/storyboard.test.mjs`):** 2/2 pass (renders 1920x1080 stop stills and contact `sheet.html`/`sheet.png` with 3 `<figure>` cells; refuses unapproved big jobs with exit code 2).
- **PDF Handout (`tools/pdf.test.mjs`):** 2/2 pass (generates 3-page Chromium PDFs via `page.pdf`; includes speaker notes only with `--notes`; refuses unapproved big jobs).
- **Static Site & Publish Gate (`tools/site.test.mjs`):** 4/4 pass (`siteFiles`, skips `.key` cache files, refuses `.env`/`.key`/`.pdb` files in job dir, refuses unapproved `publish`).
