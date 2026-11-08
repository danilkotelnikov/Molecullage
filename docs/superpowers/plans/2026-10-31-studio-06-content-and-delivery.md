<!-- version: p6 | date: 2026-10-31 | status: draft for the owner's review -->
# Molecullage Studio, Plan 6: content and delivery — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give a job its words and its ways out. That means a brief with a time budget, a research ledger of facts with sources, a story in English and Russian with prose checks, narration, a storyboard stop for big jobs, a PDF handout, a static site, and a gated Vercel publish. It ends with a fresh-reader check of both languages.

**Architecture:** The checks are pure TypeScript in `studio/core/` (`brief.ts`, `facts.ts`, `story.ts`, `prose.ts`). `loadJob` runs in the browser too, so it reads no files and calls none of these checks. They run only in `studio/tools/check.mjs` (Node). That tool reads the project file and the lexicon files, and passes their content in. The tools in `studio/tools/` drive the Plan 1 page through playwright-core. Each one gets its browser from `launch()` in `studio/tools/browser.mjs` (Plan 1 Task 7), never from `chromium.launch`:
- `narrate.mjs` wraps the existing film narration tool;
- `storyboard.mjs` and `pdf.mjs` capture stills at the stop times;
- `site.mjs` copies a finished job into a static folder and deploys it only with the owner's yes.

**Tech Stack:** As in Plan 1 (Node 24.14, TypeScript 7, Vite 8, three 0.186.1, zod, playwright-core, ffmpeg 8.1.1). Additions:
- Python 3 with `.\film\tools\narrate.py` (Windows voices) and `fishvoice.py` in the same folder (Fish Audio through Composio), both existing;
- the Vercel CLI at one exact version (GATE).

**Spec:** `.\docs\superpowers\specs\2026-10-31-engine-design.md`, sections 2, 5 (stages 1–4, 9, 10), 6, 12 and 15.

**Read first:** `.\docs\superpowers\plans\2026-10-31-studio-00-index.md`. Then read the spec, Plan 1, Plan 5 and this plan. The executor rules of the index apply to every step below.

## Global Constraints

- Every rule of Plan 1's Global Constraints still holds.
- Folders outside `studio/` are read only, and are always named by absolute path, never by a relative path: `.\stage\`, `...\film\`, `...\motion\`, `...\data\pdb\`, `...\struct\`, `...\qa\`, `...\tokens\`, and `.\decks\arc-science-yc\`. The one exception is the temporary beat folder `.\film\src\beats\_studio-<job>-<lang>\` of Task 5, which the existing narration tool needs inside `film/`. It is the single named exception in index rule 17. Task 0 asks the owner for a yes to it, and Task 5 deletes the folder in a `finally` block.
- The plan documents are read and updated at `.\docs\superpowers\plans\`.
- Evidence levels are exactly `measured`, `published`, `simulated`, `architecture`, `target`. A fact from source kind `engine` may carry at most `architecture`. A `published` fact needs a source of kind `doi` or `pdb` (spec 6; Plan 1 Task 1).
- A product shows only the levels in `.\motion\projects\<product>.json` under `allowed`. For example, `arc-science` allows `architecture`, `published` and `target` (house rule "Honesty in pitch material").
- Every DOI is checked against Crossref by the Claude session before it is written, and the fact records `checked` as an ISO date. An unchecked DOI is an error (omniverso-prose rule 5).
- Every text that holds a digit, on a slide block or as a world object of kind `number`, links to a fact. No number appears without a source (house rule).
- Lexicon files live in `<local-path>`: `refused.en.txt`, `refused.ru.txt`, `terms.en-ru.tsv` and `anglicisms.ru.tsv`. Override the folder with the environment variable `ARC_LEXICON`. Only `tools/lexicon.mjs` reads them. Tests use fixture copies, never the live files.
- A job is **big** when it has more than 6 stops in any deck path, or any baked shot. A big job cannot export, make a PDF or build a site until `job.storyboard.approvedAt` is set after the owner's yes (the owner, 31 Oct).
- Paid voice calls (Fish Audio through Composio) need the owner's yes each time. The Windows voice is free and needs no gate.
- Publishing needs the owner's yes for every publish. Anyone with the long link can open it (the owner, 31 Oct). Never put names, e-mails or other personal data in a URL, a file name or a query string (house rule).
- The site folder holds only the files Task 8 lists: no ledger, no `.env`, no keys, no notes files, and no source PDB files.
- The site is opened over http only: the Vercel link, or `npm run preview` in `studio/`. It is never opened from `file://`, because the page fetches its job, lens and frame files.
- Every commit step follows the commit GATE of Task 0 (the owner's yes for local commits on `studio/plan6`). Nothing is pushed.

## Review Focus

1. **A number on a slide with no fact behind it.** For example, "80 GB" in a Russian title while the English title has none. The check names the block id and the language. Pinned in Task 2 (`flags an unlinked number in one language`).
   - **Checks that never run.** `loadJob` does not call them, so only `npm run check` finds these errors. Pinned in Task 1 (`loadJob does not run the brief check`) and Task 3 Step 4a (`check.mjs runs all three checks`).
2. **A Russian refused stem inside an inflected word.** For example, "уникальная" against the stem "уникальн". It is found, case-insensitively, at the start of a word only. Pinned in Task 3 (`refused Russian stem matches inflections only at word start`).
3. **A narration sentence that runs past the next stop.** Narration stops with an error naming the stop. It does not overlap the voices. Pinned in Task 5 (`says that run into the next stop are refused`).
4. **A big job exported before its storyboard is approved.** Export, PDF and site refuse with one plain sentence that names the missing approval. Pinned in Task 6 (`big job without approval cannot export`).
5. **A secret or private file slipping into the published folder.** The site builder refuses and names the file. Pinned in Task 8 (`refuses env and key files`).

---

### Task 0: Approval gate and branch

**Files:**
- Modify: `studio/package.json` (scripts; the Vercel CLI after the GATE)
- Test: none (setup only)

- [ ] **Step 1: GATE.** Run `npm view vercel version` and note the version it prints. Ask the owner for four yeses:
  - the install of `vercel@<that exact version>` into `studio/` as a dev dependency;
  - local commits on branch `studio/plan6`, and `npm ci` in `studio/` with the versions he approved in Plans 1 and 4 (this is the commit GATE for every commit step in this plan);
  - a temporary write into `.\film\src\beats\_studio-<job>-<lang>\` (and the matching `narration` folder) in Task 5, deleted again when the run ends. This is the single named exception to index rule 17;
  - his own sign-in with `npx vercel login` in a terminal. The executor never types his credentials.
  Stop until all four are answered.
- [ ] **Step 2: Create the branch and worktree** with superpowers:using-git-worktrees. Cut branch `studio/plan6` from the tip of `studio/plan5`, so the code of Plans 1–5 is present. Run `git log --oneline -1 studio/plan5` first and write the commit id in `studio/ledger/plan6.md`. If `studio/plan5` does not exist, STOP and ask.
- [ ] **Step 2a: Run `npm ci` in `studio/`.** A fresh worktree has no `node_modules`. `npm ci` installs only the versions in the lockfile that the owner approved. Expected: no package is added or changed, and `npm test` runs.
- [ ] **Step 3: Add the scripts** to `studio/package.json`:
  - `"brief": "node tools/brief.mjs"`
  - `"narrate": "node tools/narrate.mjs"`
  - `"storyboard": "node tools/storyboard.mjs"`
  - `"pdf": "node tools/pdf.mjs"`
  - `"site": "node tools/site.mjs build"`
  - `"publish": "node tools/site.mjs publish"`
- [ ] **Step 4: Install** with `npm install --save-dev --save-exact vercel@<version>` in `studio/`. Expected: one package added, and `package.json` shows the exact version with no `^`.
- [ ] **Step 5: Commit** `studio/package.json` and `studio/package-lock.json` with the message `studio: plan 6 scripts and Vercel CLI`. This follows the commit GATE of Step 1.

### Task 1: Brief and time budget

**Files:**
- Create: `studio/core/brief.ts`, `studio/tools/brief.mjs`
- Modify: `studio/core/job.ts` (add the optional `brief` field to the `Job` type and its schema; `loadJob` does not call `checkBrief`)
- Test: `studio/core/test/brief.test.ts`

**Interfaces:**
- Consumes: `Job`, `loadJob` (Plan 1 Task 6).
- Produces:
  - `type Brief = { idea: string; details: string; concepts: string[]; audience: string; product: string; langs: ('en'|'ru')[]; lens?: string; timeBudget: { hours: number }; files: string[] }`
  - The job field `brief?: Brief`.
  - `checkBrief(b: Brief, lensIds: string[], projectIds: string[]): string[]` (an empty array means valid). It is pure: `projectIds` is the list of project file names without `.json`, and `tools/check.mjs` reads it from `.\motion\projects\`.
  - `budgetLine(b: Brief): string`. It returns `Time budget: <hours> h. Languages: <en, ru>. Product: <product>.`
  - The command `npm run brief -- <job>`. It prints `budgetLine` and appends `start <ISO time> budget <hours> h` to `studio/ledger/job-<job>.md`.
  - The command `npm run brief -- <job> --done`. It appends `done <ISO time> took <hours, 1 decimal> h of <budget> h`.

- [ ] **Step 1: Write the failing tests** in `brief.test.ts`:
  - `accepts a full brief`: idea, details, two concepts, audience `"Yandex Cloud science programme lead"`, product `arc-science`, langs `['en','ru']`, timeBudget `{hours: 8}`, files `[]`. Expect `[]`.
  - `budget must be between 0.5 and 120 hours`: `{hours: 0}` and `{hours: 200}` each give an error containing `timeBudget`.
  - `langs cannot be empty and hold only en or ru`: `[]` gives an error containing `langs`; `['de']` gives one containing `"de"`.
  - `unknown lens`: lens `poster` with lensIds `['journal','cinematic']`. Expect an error containing `unknown lens "poster"`.
  - `product must have a project file`: product `nope` with `projectIds` `['arc-science','miraeles']`. Expect an error containing `motion/projects/nope.json`.
  - `budgetLine wording`: assert the exact string `Time budget: 8 h. Languages: en, ru. Product: arc-science.`
  - `loadJob does not run the brief check`: a job whose brief has `hours: 0`. `loadJob` returns `ok: true`. The same job with a duplicate world id returns only the world error, not a brief error. The brief errors appear only through `checkBrief` and `npm run check`.
- [ ] **Step 2: Run** `node --test core/test/brief.test.ts` in `studio/`. Expected: FAIL, because `checkBrief` is not defined.
- [ ] **Step 3: Implement** `checkBrief` and `budgetLine` in `brief.ts`. In `job.ts`, only add the optional `brief` field. Write `tools/brief.mjs` with `node:fs` only.
- [ ] **Step 4: Run** `npm test` and `npm run typecheck`. Expected: PASS, with no type errors.
- [ ] **Step 5: Commit** with the message `studio: brief and time budget`. This follows the commit GATE of Task 0.

### Task 2: Research ledger of facts

**Files:**
- Create: `studio/core/facts.ts`
- Modify: `studio/core/job.ts` (add the optional `facts` field to the `Job` type and its schema; `loadJob` does not call `checkFacts`)
- Test: `studio/core/test/facts.test.ts`

**Interfaces:**
- Consumes: `Level`, `Source`, `WorldObject`, and `evidenceError(id: string, source: Source, level: Level): string | null` (all Plan 1 Task 1; this plan does not add or change `evidenceError`); `Job`, `Block` (Plan 1 Task 6).
- Produces:
  - `type Fact = { id: string; text: { en: string; ru: string }; level: Level; source: Source; usedBy: string[]; checked?: string /* ISO date, required when source.kind is 'doi' */ }`
  - The job field `facts?: Fact[]`.
  - `checkFacts(job: Job, allowed: Level[]): string[]`. It is pure: `tools/check.mjs` reads `allowed` from the project file and passes it in (Task 3 Step 4a).

**What `checkFacts` checks (all errors collected):**
- Fact ids are unique.
- `evidenceError` passes for every fact.
- Every fact's level is in `allowed`.
- A fact with source kind `doi` has `checked` as a valid ISO date.
- Every id in `usedBy` names an existing layout block id or world object id.
- Every block in every language whose text contains a digit (`/\d/`) is in some fact's `usedBy`.
- Every world object of kind `number` is in some fact's `usedBy`.

- [ ] **Step 1: Write the failing tests** in `facts.test.ts`:
  - `accepts linked numbers`: the block `s1-title` (en `"A100 with 80 GB"`, ru `"A100 с 80 ГБ"`) is used by the fact `gpu-mem` (source `{kind:'url', ref:'https://cloud.yandex.ru/docs'}`, level `architecture`). Expect `[]`.
  - `flags an unlinked number in one language`: only the Russian block `s2-title` holds `"80 ГБ"`, and no fact lists `s2-title`. Expect an error containing both `s2-title` and `ru`.
  - `flags a number object with no fact`: a world object `n1` of kind `number`. Expect an error containing `n1`.
  - `level must be allowed for the product`: allowed `['architecture','published','target']` and a fact at `measured`. Expect an error containing `measured` and `not allowed`.
  - `doi facts need a checked date`: a doi source without `checked`. Expect an error containing `checked`; with `checked: '2026-10-31'` the error is gone.
  - `usedBy must point at something real`: `usedBy: ['ghost']`. Expect an error containing `ghost`.
  - `engine facts stop at architecture`: source kind `engine` at level `published`. Expect the same message that Plan 1's `evidenceError` gives for an object (the test calls `evidenceError` and compares).
  - `loadJob does not run the facts check`: a job with a fact at a level the product does not allow still returns `ok: true` from `loadJob`.
- [ ] **Step 2: Run** `node --test core/test/facts.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `checkFacts` in `facts.ts`, and import `evidenceError` from `world.ts`. In `job.ts`, only add the optional `facts` field. The read of `motion/projects/<product>.json` and the error `facts need a brief with a product` belong to `tools/check.mjs` (Task 3 Step 4a).
- [ ] **Step 4: Run** `npm test`. Expected: PASS, including every Plan 1 world test.
- [ ] **Step 5: Commit** with the message `studio: research ledger of facts`. This follows the commit GATE of Task 0.

### Task 3: Story and prose checks

**Files:**
- Create: `studio/core/story.ts`, `studio/core/prose.ts`, `studio/tools/lexicon.mjs`
- Create the fixtures in `studio/core/test/fixtures/lexicon/`. They copy the form of the real files in `<local-path>` (read on 2026-10-31). Files are UTF-8, lines end with LF, and the separator in the two TSV files is one TAB character. Write these lines exactly:
  - `refused.en.txt`: no header row. Line 1 is the comment `# One phrase per line, lower case. Added to the Omniverso prose guard's own list.`. Then one phrase per line: `leverage`, `unlock`, `holistic`.
  - `refused.ru.txt`: no header row. Line 1 is a comment that starts with `# ` (the real file explains that each line is a word start). Then one stem per line: `инновационн`, `уникальн`.
  - `terms.en-ru.tsv`: header row `english<TAB>russian<TAB>avoid_en<TAB>avoid_ru<TAB>note` (five columns). Then the row `antibody<TAB>антитело<TAB>Ab<TAB>АТ`. The real antibody row has four fields and no note, so the fixture keeps four fields. In the real file, several avoid words in one cell are separated by `|` (for example `VHH binder|single-domain thing`); the loader splits on `|`. The `note` column may be missing.
  - `anglicisms.ru.tsv`: header row `anglicism<TAB>russian` (two columns). Then the row `датасет<TAB>набор данных`.
  - The real TSV files have no `#` lines, and the first line of each is the header row. The loader skips `#` lines in all files, and the first line of each TSV.
- Modify: `studio/core/job.ts` (add the optional `story` field to the `Job` type and its schema; `loadJob` does not call `checkStory`)
- Test: `studio/core/test/story.test.ts`

**Interfaces:**
- Consumes: `Job`, `StopLayout` (Plan 1 Task 6); `Fact` (Task 2); `stopIndexAt` (Plan 1 Task 4).
- Produces:
  - `type Slide = { stop: number; title: { en: string; ru: string }; say: { en: string; ru: string }; facts: string[] }`
  - The job field `story?: Slide[]`.
  - `type Lexicon = { refusedEn: string[]; refusedRu: string[]; terms: { en: string; ru: string; avoidEn: string[]; avoidRu: string[] }[]; anglicisms: { word: string; ru: string }[] }`
  - `parseLexicon(files: { refusedEn: string; refusedRu: string; terms: string; anglicisms: string }): Lexicon`, in `prose.ts`. It is pure: each value is the text of one file.
  - `loadLexicon(dir?: string): Lexicon`, in `tools/lexicon.mjs` (Node only; reads the four files and calls `parseLexicon`). The default folder is `process.env.ARC_LEXICON`, or else `<local-path>`.
  - `proseFindings(text: string, lang: 'en'|'ru', lex: Lexicon): string[]`
  - `checkStory(job: Job, lex: Lexicon): string[]`. It is pure: `tools/check.mjs` calls `loadLexicon()` and passes the result in.

**Matching rules (the tests pin them):**
- English refused phrases match whole words, case-insensitively.
- Russian refused stems and anglicisms match at the start of a word, case-insensitively, with any ending. Word starts are found with the regular expression `(?<![\p{L}])`, with the flag `u`.
- `avoidEn` and `avoidRu` items match as whole words.
- Each finding reads `<lang>: "<matched text>" — <reason>`. The reason is `refused word`, `use "<term>"` or `use "<ru>"`.

**What `checkStory` checks:** every stop of every deck path has exactly one slide; every slide's `facts` ids exist in `job.facts`; and every `title` and `say`, in both languages, passes `proseFindings` with no findings.

- [ ] **Step 1: Write the failing tests** in `story.test.ts`. A helper in the test reads the four fixture files with `node:fs` and calls `parseLexicon`:
  - `refused Russian stem matches inflections only at word start`: `"уникальная платформа"` gives one finding; `"неуникальный"` gives none.
  - `English refused words match whole words`: `"we leverage GPUs"` gives one finding; `"leverages"` gives none, because the list holds `leverage` as a whole phrase.
  - `avoid lists suggest the term`: the Russian `"АТ связывает"` gives the finding `ru: "АТ" — use "антитело"`.
  - `anglicisms suggest the Russian word`: `"датасета"` gives a finding containing `use "набор данных"`.
  - `every stop needs one slide`: a deck with 3 stops and slides for stops 0 and 1. Expect an error containing `stop 2 has no slide`; two slides for stop 1 give `stop 1 has 2 slides`.
  - `slide facts must exist`: `facts: ['nope']`. Expect an error containing `nope`.
  - `clean story passes`: 2 stops, plain titles and says in both languages. Expect `[]`.
  - `parseLexicon skips comments and header rows`: with the fixtures, `refusedEn` deep-equals `['leverage','unlock','holistic']`, `refusedRu` deep-equals `['инновационн','уникальн']`, `terms` holds one entry with `avoidEn: ['Ab']` and `avoidRu: ['АТ']`, and `anglicisms` holds `{ word: 'датасет', ru: 'набор данных' }`.
  - `loadJob does not run the story check`: a job whose story has a refused word still returns `ok: true` from `loadJob`.
- [ ] **Step 2: Run** `node --test core/test/story.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `prose.ts` (`parseLexicon`, `proseFindings`), `story.ts` (`checkStory`) and `tools/lexicon.mjs` (`loadLexicon`). In `job.ts`, only add the optional `story` field.
- [ ] **Step 4: Run** `npm test` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 4a: Add the job check command.** Create `studio/tools/check.mjs` and the script `"check": "node tools/check.mjs"`. This is the only place where the three checks run, and the only place that reads project and lexicon files.
  - `npm run check -- <job>` reads `studio/jobs/<job>/job.json` and applies `edits.jsonl` if Plan 5 is done. It reads the lens files from `studio/lenses/`, as the Plan 1 export does.
  - It runs `loadJob(json, lenses)` first.
  - If the job has a `brief`:
    - it lists the file names in `.\motion\projects\` and calls `checkBrief(brief, lensIds, projectIds)`;
    - it reads `.\motion\projects\<product>.json`, takes `allowed`, and calls `checkFacts(job, allowed)` when the job has `facts`.
  - If the job has `facts` but no `brief`, it prints `facts: need a brief with a product`.
  - If the job has a `story`, it calls `loadLexicon()` and `checkStory(job, lex)`.
  - It prints one finding per line, with the prefix `brief:`, `facts:`, `story:` or `job:`.
  - Exit code 0 means clean, and the last line is `check: clean`. Exit code 1 means there are findings.
  - Test in `tools/check.test.mjs`:
    - `clean job exits 0`, run on the zoom-test job with a minimal brief, facts and story added in a copy;
    - `bad fact exits 1 and names it`, the same copy with a fact id removed. Expect a line `story: ... nope`, or one naming the removed id;
    - `check.mjs runs all three checks`: one copy with `hours: 0`, a fact at a level the product does not allow, and a refused word in a title. Expect one line each with the prefixes `brief:`, `facts:` and `story:`, and exit code 1;
    - `facts without a brief`: expect `facts: need a brief with a product`;
    - `loadLexicon reads the folder`: `loadLexicon('core/test/fixtures/lexicon')` returns the same `Lexicon` as the `parseLexicon` test above;
    - `reads the allowed levels of a project`: for product `arc-science`, the `allowed` array read from the project file deep-equals `['architecture','published','target']`.
  - Run `node --test tools/check.test.mjs`. Expected: PASS.
  - Plans 7–9 use this command to validate their jobs.
- [ ] **Step 4b: Give `zoom-test` a story.** Write a `story` of 3 slides into `studio/jobs/zoom-test/job.json`, one slide per stop (`stop` 0, 1, 2). Plan 6 Tasks 5, 6 and 9 use it. The Plan 1 tests stay valid, because `story` is optional.
  - `title` is the title block of that stop's layout, in each language (copy the text of the block with role `title`).
  - `say` restates, in one plain sentence per language, what that stop shows: the tube, the liquid in the tube, the antibody. Use at most 6 words per sentence in each language, so no sentence runs into the next stop (Task 5 estimates 0.42 s per English word and 0.5 s per Russian word).
  - `say` and `title` hold no digit. This keeps the facts check clean without a fact.
  - `facts` is `[]` for every slide.
  - Run `npm run check -- zoom-test`. Expected: no `story:` line, exit code 0 and the last line `check: clean`. Then run `npm test` and `node --test tools/pixels.test.mjs`. Expected: PASS (Plan 1 tests unchanged).
- [ ] **Step 5: Commit** with the message `studio: story and prose checks`. Include `tools/check.mjs`, `tools/lexicon.mjs`, the tests and the `story` added to `studio/jobs/zoom-test/job.json`. This follows the commit GATE of Task 0.

### Task 4: Check the query error page

Plan 1 Task 7 already makes `index.html` read `?job=<id>&lens=<id>&lang=<en|ru>&path=<id>`, with the defaults and the id pattern `^[a-z0-9-]{1,40}$`; any other id shows `bad job id`. Plan 1 Task 9 export already takes `--lens`, `--lang` and `--path`. This task adds nothing to them. It pins the error page, because every tool in this plan opens a page by query.

**Files:**
- Test: `studio/tools/query.test.mjs`
- Modify: none. If the test fails, the gap is in Plan 1 Task 7: STOP and tell the owner, and do not patch `index.html` here.

**Interfaces:**
- Consumes: the page URL of Plan 1 Task 7, and `window.__studio`.
- Produces: no new interface.

- [ ] **Step 1: Write the tests** in `query.test.mjs` (`node:test` with `launch()` from `studio/tools/browser.mjs`, against `npm run preview` in `studio/`, which serves `web/dist` on `127.0.0.1:4380`):
  - `rejects a bad job id`: open `?job=../x`, `?job=Zoom`, and a 41-character id. For each, assert the page shows `bad job id`, and that no request goes to `/jobs/`, `/lenses/` or `/cache/` for that id.
  - `a valid query still loads`: open `?job=zoom-test&lens=cinematic&lang=ru`. Assert `__studio.stops.length === 3` and that the first title block holds Russian text.
- [ ] **Step 2: Run** `npm run build`, start `npm run preview` in the background, then run `node --test tools/query.test.mjs`. Expected: PASS, because Plan 1 built the behaviour.
- [ ] **Step 3: Stop the preview** and run the Plan 1 pixel tests. Expected: PASS.
- [ ] **Step 4: Commit** `query.test.mjs` with the message `studio: pin the query error page`. This follows the commit GATE of Task 0.

### Task 5: Narration and audio in the video

**Files:**
- Create: `studio/tools/narrate.mjs`
- Modify: `studio/tools/export.mjs`. Add `--voice`: when `studio/out/audio/<job>-<lang>.wav` exists, mux it in with `-i <wav> -c:a aac -b:a 192k -shortest`.
- Test: `studio/tools/narrate.test.mjs`

**Interfaces:**
- Consumes: `Job`, `Slide` (Task 3); `job.paths` stops (Plan 1).
- Produces:
  - The command `npm run narrate -- <job> --lang <en|ru> [--engine sapi|fish] [--approved]`.
  - The output `studio/out/audio/<job>-<lang>.wav`.
  - The cues file `studio/jobs/<job>/cues.<lang>.json`, in the film format `[{ a, b, text, words: [{ w, t0 }] }]`, with absolute seconds.
  - `buildNarration(job: Job, lang: 'en'|'ru'): { a: number; text: string; say: string }[]`. It is exported from `narrate.mjs` for the test. Each slide's `say[lang]` becomes one narration entry that starts at `stops[i] + 0.6` s. `text` is what the subtitles show; `say` is the spoken string. Both come from `Slide.say[lang]`. Every entry carries `say`, because `film/tools/narrate.py` stops with an error under `--engine fish` when any entry lacks `say`, and it speaks `say` when present.

**How it runs (the tests pin the refusals; the steps fix the paths):**
1. Build the narration list. Refuse with `say for stop <i> runs into stop <i+1>` when the estimated length passes the next stop. The estimate is 0.42 s per word for English and 0.5 s for Russian.
2. Write a temporary beat folder `.\film\src\beats\_studio-<job>-<lang>\`. It holds `narration.json` (the entries of `buildNarration`, each with `a`, `text` and `say`) and a one-line `scene.jsx` with `export const META = { duration: <world.duration> };`. The narration tool reads only from its own `src/beats/` folder, so this is the one write outside `studio/`.
3. Run `py -3 -X utf8 .\film\tools\narrate.py _studio-<job>-<lang> --lang <lang> --no-music`. With `--engine fish`, add `--engine fish`. Fish takes the voice and word times from `say` of each entry, so a missing `say` stops the run.
4. Copy `.\film\src\beats\_studio-<job>-<lang>\cues.json` to `studio/jobs/<job>/cues.<lang>.json`. Copy `.\film\out\audio\_studio-<job>-<lang>-<lang>.wav` to `studio/out/audio/<job>-<lang>.wav`.
5. In a `finally` block, delete `.\film\src\beats\_studio-<job>-<lang>\`, `.\film\narration\_studio-<job>-<lang>\` and the copied-from wav. Nothing of the job stays inside `film/`.

- [ ] **Step 1: Write the failing tests** in `narrate.test.mjs`:
  - `sentences start 0.6 s after each stop`: a job with stops `[0, 10, 20]`. Assert that `a` equals `[0.6, 10.6, 20.6]`.
  - `every entry has say for fish`: for the same job, assert that every entry has a non-empty `say` that equals its slide's `say[lang]`, and that `text` equals `say`.
  - `says that run into the next stop are refused`: a 40-word English say before a stop 5 s later. Expect a throw whose message contains `runs into stop 1`.
  - `fish needs --approved`: running `node tools/narrate.mjs zoom-test --lang ru --engine fish` exits with code 2 and prints `Fish Audio is a paid voice. Ask the owner, then add --approved.`.
  - `windows voice end to end` (Windows only; skip elsewhere):
    - run narration for `zoom-test --lang en`;
    - assert the wav exists and the cues file has one cue per stop;
    - assert that every cue has `words.length > 0`;
    - assert that no `film/src/beats/_studio-*` folder remains.
- [ ] **Step 2: Run** `node --test tools/narrate.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `narrate.mjs` as the steps above describe. Add the `--voice` flag to `export.mjs`.
- [ ] **Step 4: Run** the narration test. Then run `npm run export -- zoom-test --lens journal --lang en --fps 10 --workers 2 --voice`, and check it with `ffprobe -v error -show_streams studio/out/zoom-test-journal-en.mp4`. Expected: PASS, and ffprobe lists one video stream and one audio stream.
- [ ] **Step 5: GATE before any Fish run.** A Fish voice run happens only after the owner says yes for that job and language. Then follow `.\film\tools\fishvoice.py` with `need`, `job` and `import-url`, as its header describes. Record the yes in the ledger.
- [ ] **Step 6: Commit** `narrate.mjs`, the `export.mjs` change and the test, with the message `studio: narration and audio in the video`. This follows the commit GATE of Task 0.

### Task 6: Storyboard stop for big jobs

**Files:**
- Create: `studio/tools/storyboard.mjs`, `studio/tools/still.mjs`
- Modify:
  - `studio/core/job.ts`: add the optional `storyboard` field, and export `isBig`.
  - `studio/tools/export.mjs`: refuse a big job without approval.
- Test: `studio/tools/storyboard.test.mjs`, `studio/core/test/big.test.ts`

**Interfaces:**
- Consumes: the page URL by query (Plan 1 Task 7; Task 4 pins its error page); `window.__studio.seek` (Plan 1); `Slide` (Task 3).
- Produces:
  - The job field `storyboard?: { approvedAt: string /* ISO time */; note?: string }`.
  - `isBig(job: Job): boolean`. It is true when any deck path has more than 6 stops, or when any entry of `job.shots` (Plan 3: `shots?: Shot[]`) has `render: 'baked'`.
  - `stillsAt(job: string, lens: string, lang: string, times: number[], outDir: string): Promise<string[]>`, in `still.mjs`. It gets its browser from `launch()` (`studio/tools/browser.mjs`), opens the page by query, calls `seek(t)` for each time, saves `outDir/stop-<NN>.png` at 1920×1080 and returns the paths.
  - The command `npm run storyboard -- <job> [--lens <id>]`. It writes `studio/out/storyboard/<job>/sheet.html` and `sheet.png`. The sheet holds one still per stop, three across, with the stop number, the English and Russian titles and the English say under each.
  - The refusal message `This is a big job. Its storyboard needs the owner's approval first (job.storyboard.approvedAt).`, used by export, PDF and site.

- [ ] **Step 1: Write the failing tests:**
  - In `core/test/big.test.ts`:
    - `seven stops make a job big, six do not`;
    - `a baked shot makes a job big`: `shots: [{ id: 's1', path: 'deck', t0: 0, t1: 2, fps: 30, render: 'baked', settings: DRAFT }]` gives true. The same shot with `render: 'live'` gives false.
  - In `tools/storyboard.test.mjs`:
    - `sheet has one still per stop`: storyboard of `zoom-test`. Assert that 3 PNGs exist and `sheet.html` holds 3 `<figure>` elements.
    - `big job without approval cannot export`: a copy of `zoom-test` with 7 stops. Export exits with code 2 and prints the refusal message. With `storyboard.approvedAt` set, it proceeds.
- [ ] **Step 2: Run** `node --test core/test/big.test.ts tools/storyboard.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `isBig`, `still.mjs` and `storyboard.mjs` (a sheet HTML with inline CSS, screenshotted by playwright for `sheet.png`; the browser comes from `launch()`). Add the refusal to `export.mjs`.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: GATE (procedure, per big job).** Send the file `sheet.png` to the owner (with the file-sending tool if you have one; otherwise give its full path). Ask him one question: approve, or what to change. Only after his yes, set `storyboard.approvedAt` to the current ISO time in the job file, with his words as `note`.
- [ ] **Step 6: Commit** with the message `studio: storyboard stop for big jobs`. This follows the commit GATE of Task 0.

### Task 7: PDF handout

**Files:**
- Create: `studio/tools/pdf.mjs`
- Test: `studio/tools/pdf.test.mjs`

**Interfaces:**
- Consumes: `stillsAt` (Task 6); `job.notes` (Plan 1 Task 6); `isBig` (Task 6).
- Produces: the command `npm run pdf -- <job> --lens <id> --lang <en|ru> [--notes]`. It writes:
  - `studio/out/<job>-<lens>-<lang>.pdf`;
  - the stills in `studio/out/stills/<job>-<lens>-<lang>/`.

**Pages:**
- Without `--notes`, there is one page of 1920×1080 px per stop. The stop's still fills the page.
- With `--notes`, each page is 1920×1400 px: the still on top, and the stop's notes in that language below, in the lens font at 37 px.
- The PDF is made with one `page.pdf({ width, height, printBackground: true })` call on a print page of `<img>` elements with `break-after: page`. The browser comes from `launch()` (`studio/tools/browser.mjs`).

- [ ] **Step 1: Write the failing tests** in `pdf.test.mjs`:
  - `one page per stop`: the PDF of `zoom-test` in journal, en. Count `/Type /Page` matches that are not followed by `s`. Expect 3.
  - `notes appear only with --notes`: extract the text with `pdftotext` if it is on the path; if not, search the raw PDF for the notes string encoded by Chromium's PDF writer. The note of stop 1 is present with `--notes` and absent without.
  - `big job without approval is refused`, with the same message as Task 6.
- [ ] **Step 2: Run** `node --test tools/pdf.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `pdf.mjs`.
- [ ] **Step 4: Run** the test. Expected: PASS.
- [ ] **Step 5: Commit** with the message `studio: PDF handout`. This follows the commit GATE of Task 0.

### Task 8: Static site and gated publish

**Files:**
- Create: `studio/tools/site.mjs`
- Test: `studio/tools/site.test.mjs`

**Interfaces:**
- Consumes:
  - the built web folder (`npm run build` output, `studio/web/dist/`);
  - `studio/jobs/<job>/`, `studio/lenses/` and the PNG frames of `studio/cache/<job>/` (Plan 3). These are the folders that the Plan 1 `studioFiles()` plugin serves at `/jobs/`, `/lenses/` and `/cache/`;
  - the MP4 and PDF from `studio/out/`;
  - `isBig` (Task 6).
- Produces:
  - The command `npm run site -- <job>`. It builds `studio/out/site/<job>/`. It runs `npm run build` first when `web/dist` is missing.
  - The command `npm run publish -- <job> --approved`. It runs `npx vercel deploy studio/out/site/<job> --yes`, prints the deployment URL, and appends `publish <ISO time> <url>` to `studio/ledger/job-<job>.md`.
  - `siteFiles(job: string): string[]`. It lists what goes into the site, and is exported for the test.

**The site folder holds exactly these files:**
- `index.html`: links to the deck, the videos and the PDFs, in plain HTML;
- `deck/`: the copied `web/dist` (its `index.html` and assets), plus, beside that `index.html` so that the relative URLs of `base: './'` resolve:
  - `deck/jobs/<job>/`: `job.json`, `edits.jsonl` when it exists, its asset files and `cues.*.json`;
  - `deck/lenses/`: the lens JSON files;
  - `deck/cache/<job>/`: the `*.png` frames only. The `*.key` files of the cache (Plan 3) are skipped without a refusal, because they are cache keys and not secrets;
- `media/`: the `<job>-*.mp4` and `<job>-*.pdf` files;
- `robots.txt`: `User-agent: *` and `Disallow: /`;
- a `<meta name="robots" content="noindex">` tag on every HTML page.

The site is opened over http: the Vercel link, or `npm run preview` in `studio/`. It is never opened from `file://`.

Before writing, the builder refuses any source file in `jobs/<job>/` and `out/` that matches `/\.(env|pem|key|p12)$|\.notes\.md$|ledger|\.pdb$|\.cif$/i`. The refusal names the file. The `cache/<job>/` folder is not scanned for this: only its `*.png` files are listed, and `*.key` files are skipped.

- [ ] **Step 1: Write the failing tests** in `site.test.mjs`:
  - `builds the listed files only`: build `zoom-test`. Assert that the folder tree equals `siteFiles('zoom-test')`, that `robots.txt` has `Disallow: /`, and that every `.html` file holds the noindex tag.
  - `copies lenses and cache frames, skips key files`: in a test copy of the cache folder, put `f0001.png` and `f0001.key`. Assert that `deck/cache/<job>/f0001.png` exists, that `f0001.key` is absent, that the exit code is 0, and that `deck/lenses/journal.json` exists.
  - `refuses env and key files`: put `secret.env` in a test copy of the job folder. Expect exit code 2 and a message containing `secret.env`.
  - `publish needs --approved`: `npm run publish -- zoom-test` without the flag exits with code 2 and prints `Publishing needs the owner's yes. Ask him, then add --approved.` The test never runs a real deploy.
  - `the deck in the site plays`: serve the site folder with `python -m http.server 4390 --bind 127.0.0.1`. Open `http://127.0.0.1:4390/deck/index.html?job=zoom-test` in a browser from `launch()`. Assert that `__studio.stops.length === 3`. The test never opens the folder from `file://`.
- [ ] **Step 2: Run** `node --test tools/site.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `site.mjs` (`build` and `publish` subcommands).
- [ ] **Step 4: Run** the test. Expected: PASS.
- [ ] **Step 5: GATE, the first real publish.** Ask the owner for a yes to publish `zoom-test` as a trial. Tell him that new Vercel projects may turn on "Deployment Protection", which makes viewers sign in to Vercel. If he wants the link open to anyone with it, he turns that off himself in the Vercel project settings. Run `npm run publish -- zoom-test --approved` only after his yes. Send him the URL. The link works over http; the site is not meant to be opened from disk.
- [ ] **Step 6: Commit** with the message `studio: static site and gated publish`. This follows the commit GATE of Task 0.

### Task 9: Fresh-reader check of both languages

**Files:**
- Create: `studio/jobs/<job>/review.md`, one per job reviewed (this task reviews `zoom-test`)
- Test: the procedure below; the check is the reader's answers

- [ ] **Step 1: Make the stills** with `npm run pdf -- zoom-test --lens journal --lang en` and the same with `--lang ru`.
- [ ] **Step 2: Start one fresh helper per language** (Sonnet 5.5). Give each helper only the stills of its language and the text of `.\qa\blind_read.md`, with no notes, no job file and no story. Each answers the three questions for each still.
- [ ] **Step 3: Write `review.md`.** Put each reader's answers under its language, with the date. List every item of questions 2 and 3 as a checkbox.
- [ ] **Step 4: Fix every item.** Fix it in the job data (story, layout, world), never by hiding it. Make the stills again, and run a fresh reader again until questions 2 and 3 are empty. Record each round in `review.md`.
- [ ] **Step 5: Commit** `review.md` and the fixed job files, with the message `studio: zoom-test reviewed in both languages`. This follows the commit GATE of Task 0.

### Task 10: Hand-over

- [ ] **Step 1: Run every check.** Run `npm test`, `npm run typecheck` and `node --test tools/*.test.mjs` in `studio/`. Paste the pass lines into `studio/ledger/plan6.md`.
- [ ] **Step 2: Update the index.** In `.\docs\superpowers\plans\2026-10-31-studio-00-index.md` section 2, add a "Plan 6" list. It names:
  - `Brief`, `checkBrief(b, lensIds, projectIds)`, `budgetLine`;
  - `Fact`, `checkFacts(job, allowed)` (it reuses Plan 1's `evidenceError`; Plan 6 adds none);
  - `Slide`, `Lexicon`, `parseLexicon` (core), `loadLexicon` (`tools/lexicon.mjs`), `proseFindings`, `checkStory(job, lex)`;
  - `isBig`, `stillsAt`, `buildNarration`, `siteFiles`;
  - the job fields `brief`, `facts`, `story`, `storyboard`. `loadJob` does not run their checks; `npm run check` does;
  - the commands `brief`, `check`, `narrate`, `storyboard`, `pdf`, `site` and `publish`.
- [ ] **Step 3: Retain one Cammut note.** Record what Plan 6 built, the test result, the trial publish URL (if the owner approved it) and the fresh-reader outcome. Check it with `get_operation`, then read it back.
- [ ] **Step 4: Tell the owner in plain words.** Say what works and where the PDF and site folder are. Say whether the trial link is live. Say what Plan 7 needs from him: the Arc Science facts and sources, and the storyboard approval. Do not push.
