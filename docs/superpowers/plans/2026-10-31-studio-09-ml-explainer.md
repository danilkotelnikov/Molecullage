<!-- version: p9 | date: 2026-10-31 | status: draft for the owner's review -->
# Molecullage Studio, Plan 9: the ML model explainer showcase — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or superpowers:subagent-driven-development) to run this plan task by task. Steps use checkbox (`- [ ]`) syntax. Read `.\docs\superpowers\plans\2026-10-31-studio-00-index.md` first; its executor rules apply to every step here. Plan 7 must be finished first.

**Goal:** Build a showcase that explains one machine-learning model part by part, in the style of NVIDIA's explainer videos. The model is the Omniverso structure path: input table, autoencoder, latent, straight path, denoiser, sequence block, generation and judging.
- Each part has a short note on the background idea beside it.
- The showcase shows how the model maps onto the hardware, an NVIDIA A100 80 GB in Yandex Cloud, and why.
- It shows how each step adds to the result.

It ships as a narrated film, a live web page, a PDF and a web link, in English and Russian.

**Architecture:** This is a content plan. It writes job data under `studio/jobs/ml-explainer/`, plus one small calculation script in that folder. It runs engine commands from Plans 1–6, and adds no engine code. If a step needs an engine feature that does not exist, STOP and ask the owner. Plan 7 slide 6 is the short version of this showcase. This plan is the full one.

**Spec:** `.\docs\superpowers\specs\2026-10-31-engine-design.md`, section 1 (the machine-learning example) and section 15 (the ML model explainer as a showcase, the owner).

## Global Constraints

- Executor: Claude Sonnet 5.5 High. Follow the index rules 1–15.
- Job folder: `studio/jobs/ml-explainer/`. Ledger: `studio/ledger/plan9.md`.
- Folders outside `studio/` are read only, and are always named by absolute path: `.\stage\`, `...\film\`, `...\motion\`, `...\data\pdb\`, `...\struct\`, `...\qa\`, `...\tokens\`, and `.\decks\arc-science-yc\`. Never use a relative path to them.
- Evidence ceiling: `architecture`, `published` (`.\motion\projects\omniverso.json`, which exists).
  - No model is trained, so no output, loss curve, accuracy or speed may be shown as a result.
  - Calculated numbers are `architecture`, with a compute path (`jobs/ml-explainer/compute/sizes.mjs`).
- Background notes (attention, the straight path between noise and data, the Adam optimiser) need published sources. An arXiv paper is a source of kind `doi` with the ref `10.48550/arXiv.<id>`. Each source is resolved through the `arxiv` or `pubmed` tools, or Crossref, before it is written, then checked against DataCite (Task 2 Step 3a), and the owner approves the list (Task 2 Step 3). An unresolved identifier is never written. Each fact has one level only.
- Hardware facts beyond "NVIDIA A100 with 80 GB in Yandex Cloud" need a source that the owner approves. That covers memory bandwidth, tensor-core throughput and the number of streaming multiprocessors.
- Picture rule: arrows draw in the direction that data flows, with one focus at a time. A tensor travels along the arrow that carries it (stage spec 5).
- Lenses: `journal` and `cinematic`. Languages: `en` and `ru`, with the term list and the refused-word lists.
- Roles: use only the 12 roles that both lenses style (Plan 2): `plastic`, `liquid`, `antibody`, `protein`, `nucleic-acid`, `gold`, `strip`, `line`, `diagram`, `tile`, `shape`, `label`. A new role is a STOP: ask the owner.
- Many-copy objects (table cells, the noise cloud) use the `copies` field of Plan 2: `{ kind: 'array'|'scatter', count, step?, box?, minDist?, seed?, field? }`.
- The site opens over http only (the Vercel link, or `npm run preview`), never from `file://`.
- Every commit follows the commit GATE of Task 0. Nothing is pushed.
- All commands run from `studio/`.

## Review Focus

1. **A calculated memory size is wrong or shown without its formula.** Task 2 Step 2 computes every size in one script, with an `assert` self-check against the hand values below. The story cites only those facts.
2. **The film suggests the model is trained or works.** The overclaim read of Task 10 checks every sentence against "no model is trained; no result exists".
3. **A background note cites a paper that does not exist, or the wrong one.** Task 2 Step 3 resolves each identifier and gets the owner's yes. The Task 3 check fails on any fact whose source is not in the approved list.
4. **The hardware picture shows a spec with no source.** For example, a bandwidth figure. The Task 2 Step 4 GATE adds only the approved specs. The Task 3 number check catches any other number.
5. **A tensor travels against the data flow, or two foci move at once.** The Task 6 storyboard and the Task 10 blind read check this. The fix goes into `timeline`.

---

### Task 0: Start

**Files:**
- Create: `studio/ledger/plan9.md`

- [ ] **Step 0: GATE and branch.** Ask the owner: "May I make local commits on branch `studio/plan9`, and run `npm ci` with the approved versions?" His yes to commits is the commit GATE for every commit in this plan. Stop until he answers. Then create the branch with superpowers:using-git-worktrees, cut from the tip of `studio/plan8` (the previous pilot, which holds the code of Plans 1–6). If `studio/plan8` does not exist, cut from `studio/plan7`, or else from `studio/plan6`, and say so in `plan9.md`. Write the tip's commit id in `plan9.md`. Then run `npm ci` in `studio/`. It installs only the versions in the lockfile that the owner approved in Plan 1 (gsap in Plan 4, vercel in Plan 6). Expected: exit code 0, and no change to `studio/package.json` or the lockfile.
- [ ] **Step 1: Read.** Read the index, the design, `studio/ledger/plan7.md` and the hand-overs of Plans 2–6. Copy the shot-id format and the rebuild pass level into `plan9.md`.
- [ ] **Step 2: Recall.** Run `hindsight/recall` with the query "Omniverso autoencoder denoiser architecture parameter counts, Yandex Cloud A100 80 GB", the tags `["project:Omniverso"]` and budget `mid`. Paste the note ids you use. Note `c2307e12` states that Yandex Cloud provides A100 80 GB GPUs on gpu-standard-v3.
- [ ] **Step 3: GATE: time budget.** Ask the owner: "How long may the ML explainer take: a few hours, a working day, overnight or a few days? Please give a number of hours." The brief stores hours (0.5 to 120). If he names only a period, ask him for the hours.

### Task 1: Brief

**Files:**
- Create: `studio/jobs/ml-explainer/job.json` (field `brief`)

- [ ] **Step 1: Write `brief`** in exactly the Plan 6 Brief shape: `{ idea, details, concepts, audience, product, langs, lens?, timeBudget: { hours }, files }`. Fill it with these values:
  - **idea:** "Explain the Omniverso structure model part by part: what each part does, the idea behind it, how it runs on an A100 80 GB, and how each step adds to the result."
  - **details:** "A film with deck stops, 10 stops. Lenses: journal and cinematic. Check-ins: one storyboard stop. Outputs: MP4 film, live web page, PDF, web link."
  - **concepts:** `["autoencoder and latent", "the straight path from noise to data", "denoiser and sequence block", "memory on an A100 80 GB", "generation and judging"]`
  - **audience:** "a senior manager of Yandex Cloud with an engineering background".
  - **product:** `"omniverso"`. This is the product whose evidence ceiling applies; `.\motion\projects\omniverso.json` exists. If it is missing when you run the plan, use `"arc-science"` and say so in the ledger.
  - **langs:** `["en","ru"]`.
  - **lens:** leave it out. Both lenses are delivered, and `details` names them.
  - **timeBudget:** `{ "hours": <the number from Task 0> }`.
  - **files:** `[]`.
- [ ] **Step 2: Validate.** Run `npm run check -- ml-explainer` (Plan 6, Task 3 Step 4a). Write the findings in the ledger; they must all be gone by Task 8.

### Task 2: Research ledger and calculations

**Files:**
- Create: `studio/jobs/ml-explainer/compute/sizes.mjs`, `studio/jobs/ml-explainer/compute/sizes.json`
- Modify: `studio/jobs/ml-explainer/job.json` (field `facts`)

**Sources:**
- A. `.\motion\films\arc-science-pitch-2.film.json`, scenes om-02a-input to om-07-judging.
- B. `.\motion\films\arc-science-pitch-2.notes.md`, the section "Data and sources".
- C. The notes of `.\decks\arc-science-yc\deck.json`, slide `13-resources`.
- D. Cammut note `c2307e12` (A100 80 GB on gpu-standard-v3).

- [ ] **Step 1: Write the model facts** from A, copying each wording exactly. Every one is at level `architecture` and has a file source pointing at its scene. A file `ref` is the repository path under `.\`, resolved against that folder. Write `usedBy` from the story table of Task 3, with block ids by the convention `s<NN>-<role>` (`<NN>` is the stop number in two digits, `<role>` is `title`, `part`, `note`, `hw` or `label-1` to `label-3`, for example `s04-title`, `s04-note`) and world object ids. Task 4 Step 3 creates exactly these blocks.

| id | Scene | Content |
|---|---|---|
| `m-input` | om-02a-input | Each residue becomes 169 numbers: 111 atom positions, a 37-entry atom mask, 21 residue-type entries; 1MEL chain A gives 132 × 169 = 22,308 numbers |
| `m-latent` | om-02a-input | The encoder compresses each row to 8 numbers: 1,056 in all; not trained, shape only |
| `m-ae` | om-02-autoencoder | 12 encoder blocks, latent 8, bypass of 3 centred coordinates, 12 decoder blocks; 255,873,676 parameters |
| `m-dn` | om-03-denoiser | Noisy state of 11 numbers per residue projected to 768; pair builder to 256 pair features; time condition 256; 14 sequence blocks; velocity heads 3 and 8; 153,102,091 parameters |
| `m-block` | om-04-block | Hidden stream 768; attention with pair bias; gated feed-forward; shift, scale and gate from the condition |
| `m-path` | om-05-path | Straight path: at time t each point holds 1 − t of noise and t of data; velocity = data − noise |
| `m-gen` | om-06-generation | Generation moves noise along the path in small steps; the decoder rebuilds atoms; no candidate exists yet |
| `m-judge` | om-07-judging | The judge compares candidates with the target and an off-target panel; eight kinds of result; a solver picks exactly N |
| `m-status` | as-99-end | The two base networks exist as code; no model is trained; no result |
| `h-a100` | C and D | The request is for NVIDIA A100 GPUs with 80 GB memory in Yandex Cloud (gpu-standard-v3) |

- [ ] **Step 2: Write `compute/sizes.mjs`.** It reads no input. It writes `compute/sizes.json` and asserts these values. Each value is calculated from the counts in Step 1:

| key | Formula | Value |
|---|---|---|
| `aeFp32Bytes` | 255,873,676 × 4 | 1,023,494,704 |
| `aeBf16Bytes` | 255,873,676 × 2 | 511,747,352 |
| `dnFp32Bytes` | 153,102,091 × 4 | 612,408,364 |
| `dnBf16Bytes` | 153,102,091 × 2 | 306,204,182 |
| `pairValues` | 132 × 132 × 256 | 4,460,544 |
| `pairFp32Bytes` | 4,460,544 × 4 | 17,842,176 |
| `hiddenValues` | 132 × 768 | 101,376 |
| `aeTrainBytes` | 255,873,676 × 16 | 4,093,978,816 |
| `dnTrainBytes` | 153,102,091 × 16 | 2,449,633,456 |

  The training values assume 16 bytes per parameter: a 4-byte fp32 weight, a 4-byte gradient and two 4-byte Adam moments. Write that assumption at the top of the file, with the Adam source from Step 3.
  Run `node jobs/ml-explainer/compute/sizes.mjs`.
  Expected: the script prints `ok` and writes `sizes.json`.
  Then add one `architecture` fact per value you show, each with source `{kind:'file', ref:'studio/jobs/ml-explainer/compute/sizes.json#<key>'}`. Show sizes in the story as GB with two decimals: 1.02 GB, 0.51 GB, 0.61 GB, 0.31 GB, 4.09 GB, 2.45 GB; and 17.8 MB for the pair tensor.
- [ ] **Step 3: GATE: background sources.** Each candidate must resolve to the identifier given. If it does not, drop it. Each approved paper is written as a source `{kind:'doi', ref:'10.48550/arXiv.<id>'}` (for example `10.48550/arXiv.1706.03762`).
  - Resolve these with the `arxiv` tool:
    - attention: Vaswani et al. 2017, "Attention Is All You Need", arXiv:1706.03762;
    - the straight path: Liu et al. 2022, "Flow Straight and Fast", arXiv:2209.03003, and Lipman et al. 2022, "Flow Matching for Generative Modeling", arXiv:2210.02747;
    - Adam: Kingma and Ba 2014, arXiv:1412.6980.
  - Find a source for the autoencoder idea in A by searching the `arxiv` tool. Propose one, and add it only after the owner's yes.
  - Send the owner the resolved list: titles, authors, years and identifiers. Ask: "May the background notes cite these?" Write `b-attention`, `b-path`, `b-adam` and `b-ae` as `published` facts only for the approved entries. Each note's text is one sentence written from the paper's abstract.
- [ ] **Step 3a: Check each approved identifier against DataCite.** arXiv DOIs are registered with DataCite. For each, fetch `https://api.datacite.org/dois/10.48550/arxiv.<id>` (lower-case `arxiv`) with WebFetch (curl is denied). The title must match the paper that the owner approved. If it does not match, drop the fact. If it matches, set `checked` to today's date on the fact. Record each fetch and title in `plan9.md`. An unchecked DOI is an error (Plan 6 `checkFacts`).
- [ ] **Step 4: GATE: hardware specs.** Ask the owner: "Beyond '80 GB memory', may the film show more A100 specs, such as memory bandwidth? If so, may I take them from NVIDIA's A100 datasheet page, read on the web without downloading?" Add an `h-*` fact only for each approved spec, with source `{kind:'url', ref:<page URL>}` and level `architecture`. A `url` source cannot carry `published` (Plan 1 `evidenceError`), and the text says that NVIDIA states the value.
- [ ] **Step 5: Check the ceiling** with the Plan 7 Task 2 Step 4 command, with `arc-science` replaced by `ml-explainer` in the job path, and `arc-science` replaced by `omniverso` in the project path (`./motion/projects/omniverso.json`).
  Expected: `ok`.

### Task 3: Story in both languages

**Files:**
- Modify: `studio/jobs/ml-explainer/job.json` (fields `story` and `notes`)

- [ ] **Step 1: Write `story`:** 10 stops. Each stop shows the part (left), its background note (beside it) and its hardware line (bottom). The hardware line is shown only where a size fact exists.

| stop | Title (en) | Facts | Picture |
|---|---|---|---|
| 0 | One model, part by part | m-status | The whole path as a dim map; each part lights up later |
| 1 | From atoms to numbers | m-input | The 132 × 169 table builds row by row from 1MEL chain A |
| 2 | The autoencoder | m-ae, m-latent, b-ae | Encoder ×12 → latent 8 → decoder ×12, with the bypass; the latent strip shows shape only |
| 3 | On the GPU: the autoencoder | aeFp32Bytes, aeBf16Bytes, aeTrainBytes, h-a100 | The weights fill a bar inside an 80 GB memory block |
| 4 | The straight path | m-path, b-path | The noise cloud settles on 1MEL as t goes from 0 to 1, with velocity arrows (the same seeded illustration as pitch 2; it is labelled as an illustration) |
| 5 | The denoiser | m-dn | Noisy state → pair builder → condition → 14 blocks → velocity heads |
| 6 | Inside one block | m-block, b-attention | The hidden stream; attention reads all residues, guided by pair features |
| 7 | On the GPU: the denoiser | dnFp32Bytes, dnBf16Bytes, dnTrainBytes, pairFp32Bytes, hiddenValues, h-a100 | Weights, training state and one pair tensor inside the 80 GB block |
| 8 | Generation | m-gen | Small steps along the path; decoder; six empty candidate slots |
| 9 | Judging, and where the work stands | m-judge, m-status, b-adam where it is used | Judge, solver; the built parts solid and the designed parts dashed |

  Write `say.en` and `say.ru` from the cited facts only. The "why A100 80 GB" sentence on stops 3 and 7 states only arithmetic. For example: the training state of both networks, 6.54 GB, is about 8% of 80 GB, and the rest holds the activations of a batch. Before you use these numbers, add two keys to `sizes.mjs`, each with its assert:
  - `sumTrainBytes` = 6,543,612,272;
  - `share80` = 8.2, computed as `sumTrainBytes / 80e9 × 100` rounded to one decimal.
  Add their two facts. Their texts must contain "6.54 GB" and "8%", so that the Step 2 check passes.
- [ ] **Step 2: Check numbers and fact use** with the Plan 7 Task 3 Step 2 command, with `ml-explainer`.
  Expected: `ok`. A GB value that is rounded from a byte fact must also appear as that rounded text in the fact's `text.en` and `text.ru`.
- [ ] **Step 3: Check refused words** with the Plan 7 Task 3 Step 3 command, with `ml-explainer`.
  Expected: `ok`.

### Task 4: World

**Files:**
- Create: `studio/jobs/ml-explainer/make_1mel_glb.cxc`, `studio/jobs/ml-explainer/1mel.glb`
- Modify: `studio/jobs/ml-explainer/job.json` (fields `world`, `layout` and a placeholder path)

- [ ] **Step 1: Make the 1MEL mesh.** Copy the Plan 7 ChimeraX script and make only the full complex, `1mel.glb`.
  Expected: the file is under 15 MB.
- [ ] **Step 2: Write `world`.**
  - Frames:
    - `board` (1e-3, root), for diagrams, tables and the memory block;
    - `complex` (1e-9, inside `board`), for 1MEL and the noise cloud.
  - Objects:
    - each model part, as a named vector object (Plan 4) at `architecture`, with the roles `diagram`, `tile` or `shape`;
    - the input table, as `copies` of cells (Plan 2, `kind: 'array'`), with the role `tile`;
    - 1MEL, with source pdb and level `published`, with the role `antibody`;
    - the noise cloud, as seeded `copies` (Plan 2, `kind: 'scatter'`, `seed` 7; the box and `minDist` follow the sigma of 10 Å in source B), engine-drawn, at `architecture`, with the role `protein`;
    - the 80 GB memory block, with bars scaled exactly to `sizes.json`, with the roles `shape` and `label`.
  - Use only the 12 roles of the Global Constraints. If another role is needed, STOP and ask.
  - Add each object id to the `usedBy` of the facts it shows.
- [ ] **Step 3: Write `layout`.** For each stop and language, give the title `s<NN>-title`, the part label `s<NN>-part`, the background note (one sentence) `s<NN>-note` and the hardware line `s<NN>-hw`, with exactly the ids that the facts' `usedBy` name.
  - The id suffix names the purpose. The block `role` is always one of Plan 1's three: `s<NN>-title` has role `title`; `s<NN>-part` and `s<NN>-hw` have role `label` (42 px); `s<NN>-note` has role `note` (37 px).
  - Keep everything inside the safe area.
- [ ] **Step 4: Validate before the storyboard yes.** A job with 10 stops is big (Plan 6), so `npm run export` refuses it until the owner approves the storyboard. Validate with the check command and stills, as in Plan 7 Task 4 Step 4:
  - write a placeholder deck path `deck-main` with 10 stops at t = 0, 6, 12 … 54 s (Task 5 replaces it);
  - run `npm run check -- ml-explainer`. Expected: findings only for fields that later tasks fill; none for `brief`, `facts` or `story`;
  - cut one still per stop with `stillsAt('ml-explainer', 'journal', 'en', <the 10 stop times>, 'studio/out/stills/ml-explainer-draft')` (Plan 6, `tools/still.mjs`). Expected: 10 PNG files and no blank frame.
- [ ] **Step 5: Commit** `job.json`, the `.cxc` script and `1mel.glb`. This follows the commit GATE of Task 0.

### Task 5: Motion

**Files:**
- Modify: `studio/jobs/ml-explainer/job.json` (fields `timeline` and `paths`)

- [ ] **Step 1: Write the path** `film-main` (kind `film`) and the path `deck-main` (kind `deck`), over the same world, with the 10 stops.
  - The camera moves only from `board` into `complex` at stop 4 and back.
  - Each stop holds at least 2.0 s plus 0.3 s per word.
- [ ] **Step 2: Write the tracks.**
  - Each tensor travels along the arrow that carries it, in the direction of flow.
  - Each part lights up only when its stop starts. One focus moves at a time.
  - The memory bars on stops 3 and 7 grow to their exact values from `sizes.json`.
  - Use eases `power2.out`, `power2.inOut` and `linear` (for draw-on only).
- [ ] **Step 3: Commit** `job.json`. This follows the commit GATE of Task 0.

### Task 6: Storyboard stop (GATE)

- [ ] **Step 1:** Run `npm run storyboard -- ml-explainer`.
- [ ] **Step 2: GATE.** Send the contact sheet to the owner (with the file-sending tool if you have one; otherwise give its full path). Ask: "Is this explainer storyboard right?" Apply each change and ask again. Do not start Task 7 before his yes. After his yes, set `storyboard.approvedAt` in `job.json` with his words as `note` (Plan 6 Task 6). Export, PDF and site stay refused until then.

### Task 7: Lenses and renders

- [ ] **Step 1: Export** the four combinations of lens and language at 30 fps, `--workers 2`, one at a time.
- [ ] **Step 2:** Add one shot to `job.json`, in Plan 3's `Shot` shape: `{ "id": "mel-close", "path": "film-main", "t0": <stop-4 start>, "t1": <stop-4 end>, "fps": 30, "render": "baked", "settings": <Plan 3 DRAFT values> }`. Run `npm run bake -- ml-explainer --shot mel-close --draft`. Estimate the full time as frames × time per frame, using the `FINAL` settings (Plan 3).
- [ ] **Step 3: GATE when the estimate is above 30 minutes.** Ask the owner. On a yes, switch the shot's `settings` from `DRAFT` to Plan 3's `FINAL` (1920×1080, 256 samples, denoise on) in `job.json`, then bake in full at low priority.
- [ ] **Step 4: Commit** `job.json`. This follows the commit GATE of Task 0.

### Task 8: Fix the export findings

- [ ] **Step 1:** Fix every `overflow`, `small-text` and `offscreen` finding, then re-export.
  Expected: every `checks.json` is empty.
- [ ] **Step 2: Commit** `job.json`. This follows the commit GATE of Task 0.

### Task 9: Raster rebuild of the architecture figure

The rebuild always goes through a scratch job, never into the pilot job directly (Plan 4, Plan 5). The scratch job here is `ml-explainer-fig`.

- [ ] **Step 1: The figure file.** Use the PNG path that the owner gave in Plan 7 Task 9 Step 1, the Omniverso figure `fig_arch_h` (see `studio/ledger/plan7.md`). If Plan 7 skipped it, ask the owner now for the path and for leave to use it.
- [ ] **Step 2: Write `reading.json`.** Look at the picture. Write `studio/jobs/ml-explainer-fig/reading.json` by the Plan 4 schema (`studio/tools/rebuild/reading.ts`, Plan 4 Task 4), with the three panels a (autoencoder), b (denoiser) and c (block) as named parts. Run `checkReading` on it. Expected: `ok: true`.
- [ ] **Step 3: Rebuild into the scratch job.** Run `npm run rebuild -- <png> --job ml-explainer-fig`. Expected: `studio/jobs/ml-explainer-fig/job.json` with named objects for panels a, b and c, and a `rebuild-report.json`.
- [ ] **Step 4: Score.** Run `npm run score -- ml-explainer-fig --against <png>`. Expected: at or above the Plan 4 pass level. Allow at most two fix rounds (fix `reading.json`, rebuild, score), then STOP and ask.
- [ ] **Step 5: Propose the panels, one stop at a time.** Stops 2, 5 and 6 use panels a, b and c. For each pair (stop 2 with panel a, stop 5 with panel b, stop 6 with panel c):
  - read the object and vector ids of that panel in `studio/jobs/ml-explainer-fig/job.json`;
  - run `npm run rebuild -- <png> --job ml-explainer-fig --into ml-explainer --stop <n> --only <panel id>[,<panel id>...]`. `--only` proposes just the named scratch objects and vectors and their children. Expected: `studio/jobs/ml-explainer/proposed.json` with `add` edits for that panel only, and a printed diff;
  - show the owner the diff. After his yes, run `npm run edit -- ml-explainer --apply`.
- [ ] **Step 6: Commit** `job.json`, `edits.jsonl` and the scratch job folder. This follows the commit GATE of Task 0.

### Task 10: Review: overclaim read, then blind read

**Files:**
- Create: `studio/jobs/ml-explainer/review/stills/*.png`, `studio/jobs/ml-explainer/review/<stop>.notes.md`

- [ ] **Step 1: Cut the stills,** as in Plan 7 Task 10 Step 1, with `ml-explainer`.
- [ ] **Step 2: Overclaim read.** A fresh Sonnet agent gets `story`, `facts`, `compute/sizes.json`, the English stills and this rule: "no model is trained; no result exists; every size is arithmetic from parameter counts". It lists every overclaim. Fix each one, re-export, and cut the stills again.
- [ ] **Step 3: Blind read,** as in Plan 7 Task 10 Step 3, with the questions of `.\qa\blind_read.md`. Fix every item of questions 2 and 3. Repeat until a round finds nothing.
- [ ] **Step 4: Notes files,** as in Plan 7 Task 10 Step 4. Each one also gives the formula of every size shown on its stop.

### Task 11: Deliveries

- [ ] **Step 1:** Run `npm run narrate -- ml-explainer --lang en`, then `--lang ru`. Re-export the path `film-main` with narration in both languages: `npm run export -- ml-explainer --path film-main --lens journal --lang <en|ru> --fps 30 --workers 2 --voice`.
- [ ] **Step 2:** Run `npm run pdf -- ml-explainer --lens journal --lang en` and the same for `ru`.
  Expected: two PDFs of 10 pages.
- [ ] **Step 3:** Run `npm run site -- ml-explainer`.
  Expected: the folder `studio/out/site/ml-explainer/`. Serve it over http (`python -m http.server 4390 --bind 127.0.0.1` in that folder). The live page plays `deck-main`, and the film is linked from it. Do not open it from `file://`.
- [ ] **Step 4: GATE.** Ask: "May I publish the ML explainer to Vercel?" On a yes, run `npm run publish -- ml-explainer --approved` and record the link. Without his yes, do not run it.
- [ ] **Step 5: Commit** the changed job files and `plan9.md`. This follows the commit GATE of Task 0.

### Task 12: One hand edit in each of the four ways

Make each edit, re-export, and confirm by eye that it is visible and survives a second export, as in Plan 7 Task 12.

- [ ] **Step 1: Click and change:** in the studio editor, click the English title block `s06-title` of stop 6, make the title box 6 px taller and change its text to "Inside one block of the denoiser". The inspector's layout row sets only the box and the text. It has no colour or size field: a colour change goes through a role, so this step does not change colour. The box change shows in `edits.jsonl`.
- [ ] **Step 2: Timeline:** on stop 5, start the pair builder's draw-on 0.3 s later.
- [ ] **Step 3: Words:** run `npm run edit -- ml-explainer --words "make the memory bars on stop 7 enter one after another"`. Write the edits to `studio/jobs/ml-explainer/proposed.json`, run the command again to print the diff, and show the diff to the owner. After his yes, run `npm run edit -- ml-explainer --apply`.
  Expected: the bars on stop 7 are staggered.
- [ ] **Step 4: 3D camera:** in the editor, move the camera at stop 4 closer to 1MEL, save the shot, and set it as stop 4's key.
- [ ] **Step 5:** Re-export the four combinations.
  Expected: all four edits are visible, and every `checks.json` is empty.
- [ ] **Step 6: Commit** `edits.jsonl` and the changed job files. This follows the commit GATE of Task 0.

### Task 13: Hand-over

- [ ] **Step 1:** Complete `studio/ledger/plan9.md`, with every answer from the owner and every open item.
- [ ] **Step 2:** Run `hindsight/retain` with one note: the ML explainer status, the output paths, the blind-read outcome and the link. Use the index tags. Check it with `get_operation`, then read it back.
- [ ] **Step 3:** Tell the owner what was built, where the four deliveries are and what is open. Nothing is pushed.
