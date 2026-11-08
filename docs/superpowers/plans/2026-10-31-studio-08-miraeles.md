<!-- version: p8 | date: 2026-10-31 | status: draft for the owner's review -->
# Molecullage Studio, Plan 8: the Miraeles pilot deck — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or superpowers:subagent-driven-development) to run this plan task by task. Steps use checkbox (`- [ ]`) syntax. Read `.\docs\superpowers\plans\2026-10-31-studio-00-index.md` first; its executor rules apply to every step here. Plan 7 must be finished first: this plan reuses its order of work and its checks.

**Goal:** Build the second full pilot: a Miraeles pitch deck of 12 slides in English and Russian. It opens inside a photorealistic 0.2 mL PCR tube, where MIRA amplification runs among real proteins. The camera then zooms out through the tube to the lateral-flow strip, where gold particles carrying antibodies make the test line. It ends on the whole field workflow. It has two lenses and all four deliveries.

**Architecture:** This is a content plan. It writes job data under `studio/jobs/miraeles/` and runs engine commands from Plans 1–6. It adds no engine code. If a step needs an engine feature that does not exist, STOP and ask the owner.

**Spec:** `.\docs\superpowers\specs\2026-10-31-engine-design.md`, sections 1 (the MIRA-NALFIA example), 4 (nested scale frames, stand-in swap) and 15.

## Global Constraints

- Executor: Claude Sonnet 5.5 High. Follow the index rules 1–15.
- Job folder: `studio/jobs/miraeles/`. Main file: `studio/jobs/miraeles/job.json`. Ledger: `studio/ledger/plan8.md`.
- Folders outside `studio/` are read only, and are always named by absolute path: `.\stage\`, `...\film\`, `...\motion\`, `...\data\pdb\`, `...\struct\`, `...\qa\`, `...\tokens\`, and `.\decks\arc-science-yc\`. Never use a relative path to them.
- Evidence ceiling: `architecture`, `simulated`, `published`, `target` (`.\motion\projects\miraeles.json`). **`measured` is not allowed:** nothing about the reader, the heat block or the reagents has been measured.
- Every `published` fact carries its DOI, checked against Crossref (Task 2 Step 2a). Every `simulated` fact carries the absolute path of its compute file (the `compute` field in `.\motion\miraeles\miraeles.film.json` names it). Each fact has one level only.
- Facts come only from the sources in Task 2. Every other fact, including each mechanism detail and each structure, is a GATE question to the owner.
- The picture never shows more than the facts. Where the mechanism is drawn from the owner's description and not from a cited figure, the object carries `architecture`, and the notes say so.
- Structures:
  - `.\data\pdb\1IGT.pdb` is local, an intact IgG.
  - Any other structure (the recombinase, its helper proteins, the polymerase, streptavidin) needs a GATE before download, with the owner choosing the PDB id.
  - Never commit `1A34-assembly1.cif`, `181L*` or `1A34*` from `.\data\pdb\`.
- The tube and strip shapes come from the sources the owner approved for Plan 2 (index section 4). They do not come from guesses.
- Lenses: `journal` and `cinematic`. Languages: `en` and `ru`, with the term list and the refused-word lists, as in Plan 7.
- Roles: use only the 12 roles that both lenses style (Plan 2): `plastic`, `liquid`, `antibody`, `protein`, `nucleic-acid`, `gold`, `strip`, `line`, `diagram`, `tile`, `shape`, `label`. A role is a design name. A material is a preset id (`polypropylene`, `water`, `gold`, `glass`, `nitrocellulose`) that the lens sets through `RoleStyle.preset`. Never use `plastic-pp` or `liquid-water` as a role. A new role is a STOP: ask the owner.
- Many-copy objects (amplicons, gold particles) use the `copies` field of Plan 2: `{ kind: 'array'|'scatter', count, step?, box?, minDist?, seed?, field? }`.
- The site opens over http only (the Vercel link, or `npm run preview`), never from `file://`.
- Every commit follows the commit GATE of Task 0. Nothing is pushed.
- All commands run from `studio/`.

## Review Focus

1. **A simulated value shown as a measurement.** For example, the 42-minute heat window or the 74% transfer. Every such fact keeps level `simulated` and its compute path. The overclaim read in Task 10 checks the wording ("model, not measured" stays in the notes and the source line).
2. **A wrong or invented mechanism step.** For example, which antibody sits on the gold, or which tag binds the test line. Task 2 Step 3 turns each unknown into a GATE question. The Task 10 overclaim read checks the picture against the facts.
3. **The zoom from nanometres to centimetres jumps or shows a blank frame.** Frames `nano`, `tube` and `bench` span 10⁷. Rerun the Plan 1 pixel test on this job (Task 5 Step 3), and look at the Task 6 storyboard frames.
4. **Gold particles or copies that move differently on a second render.** Copies must be seeded (Plan 2). Task 7 Step 2 exports twice and compares one frame hash.
5. **Russian overflow on the long workflow slides.** Task 8 must end with empty `checks.json` files for `ru`.

---

### Task 0: Start

**Files:**
- Create: `studio/ledger/plan8.md`

- [ ] **Step 0: GATE and branch.** Ask the owner: "May I make local commits on branch `studio/plan8`, and run `npm ci` with the approved versions?" His yes to commits is the commit GATE for every commit in this plan. Stop until he answers. Then create the branch with superpowers:using-git-worktrees, cut from the tip of `studio/plan7` (the previous pilot, which holds the code of Plans 1–6). If `studio/plan7` does not exist, cut from `studio/plan6` and say so in `plan8.md`. Write the tip's commit id in `plan8.md`. Then run `npm ci` in `studio/`. It installs only the versions in the lockfile that the owner approved in Plan 1 (gsap in Plan 4, vercel in Plan 6). Expected: exit code 0, and no change to `studio/package.json` or the lockfile.
- [ ] **Step 1: Read.** Read the index, the design, `studio/ledger/plan7.md`, and the hand-overs of Plans 2–6. Copy into `plan8.md`:
  - the shot-id format (Plan 3);
  - the copies and field functions (Plan 2);
  - the tube and strip profile sources (Plan 2);
  - the rebuild pass level (Plan 4).
- [ ] **Step 2: Recall.** Run `hindsight/recall` with the query "Miraeles MIRA NALFIA pitch facts, heat block, reader, panels", the tags `["project:Omniverso"]` and budget `mid`. Paste the note ids you use.
- [ ] **Step 3: GATE: time budget.** Ask the owner: "How long may the Miraeles deck take: a few hours, a working day, overnight or a few days? Please give a number of hours." Record the number of hours. The brief stores hours (0.5 to 120). If he names only a period, ask him for the hours.

### Task 1: Brief

**Files:**
- Create: `studio/jobs/miraeles/job.json` (field `brief`)

- [ ] **Step 1: Write `brief`** in exactly the Plan 6 Brief shape: `{ idea, details, concepts, audience, product, langs, lens?, timeBudget: { hours }, files }`. Fill it with these values:
  - **idea:** "Miraeles combines MIRA and NALFIA to identify pathogens and to genotype farm animals and plants, far from a laboratory."
  - **details:** "A 12-slide pitch deck. Lenses: journal and cinematic. Check-ins: one storyboard stop. Outputs: live deck, MP4, PDF, web link. The audience is the owner's choice, so confirm it in the Task 6 storyboard."
  - **concepts:** `["MIRA amplification at one temperature", "NALFIA strip reading", "the heat block and its modelled window", "marker panels", "what is measured and what is not"]`
  - **audience:** "a senior manager of a cloud or agritech partner".
  - **product:** `"miraeles"`.
  - **langs:** `["en","ru"]`.
  - **lens:** leave it out. Both lenses are delivered, and `details` names them.
  - **timeBudget:** `{ "hours": <the number from Task 0> }`.
  - **files:** `[]`.
- [ ] **Step 2: Validate.** Run `npm run check -- miraeles` (Plan 6, Task 3 Step 4a). Write the findings in the ledger; they must all be gone by Task 8.
  Expected: no findings with the prefix `brief:`.

### Task 2: Research ledger

**Files:**
- Modify: `studio/jobs/miraeles/job.json` (field `facts`)

**Sources:** read them, and take text only from them.
- A. `.\motion\miraeles\miraeles.film.json`: 15 scenes, with steps and claims (DOIs and compute paths in place).
- B. The compute files that A names (`pipeline/design/v8/eng/out/thermal_summary.md`, `pipeline/assay/vpcr_report.md`, `pipeline/design/v8/eng/out/bom_summary.json`, `pipeline/design/v8/eng/out/fluid_ode.json`), found by Step 1.
- C. `.\data\pdb\1IGT.pdb` and `1IGT.record.json` in the same folder.

- [ ] **Step 1: GATE: compute files.** Search for the folder of source B with `find <user-home> -maxdepth 6 -path "*pipeline/design/v8/eng/out" -type d 2>/dev/null | head -3`. If nothing is found, ask the owner where the Miraeles pipeline folder is. Record the absolute path in `plan8.md`. Every `simulated` fact's `source.ref` is the absolute path of its compute file under it.
- [ ] **Step 2: Write these facts** from source A. Copy each claim text and its DOI or compute path exactly. Each fact has one level and one source. Write `usedBy` from the story table of Task 3, with block ids by the convention `s<NN>-<role>` (`<NN>` is the stop number in two digits, `<role>` is `title` or `label-1` to `label-3`, for example `s05-title`, `s05-label-2`) and world object ids. Task 4 Step 3 creates exactly these blocks.

| id | Scene in A | level |
|---|---|---|
| `f-what` | s01-cover: MIRA plus NALFIA, pathogens and genotyping, farm animals and plants | architecture |
| `f-pcr` | s02-problem claim (doi 10.3390/bios13010082) | published |
| `f-mira` | s03-mira claim: 39 °C for 10 minutes; strip within 5 minutes (doi 10.1186/s42483-026-00442-9) | published |
| `f-temp` | s03-mira step: MIRA works at 39 to 42 °C | published (same doi; GATE: confirm that this doi supports the 39–42 °C range, else ask) |
| `f-nalfia` | s04-nalfia claim (doi 10.1016/j.mex.2023.102372) | published |
| `f-lines` | s04-nalfia step: a test line appears when the tagged product is present; a control line shows that the liquid flowed | published (same doi) |
| `f-modules` | s05-workflow: four modules; heating and reading are separate | architecture |
| `f-reader` | s06-reader steps | architecture |
| `f-wax` | s07-heat steps: 150–200 g wax, melts at 40–41 °C | architecture |
| `f-window` | s08-thermal claim: 42 min at 0.097 W/K, 19 min at 0.188 W/K | simulated (compute: thermal_summary.md) |
| `f-panels` | s09-panels claim | simulated (compute: vpcr_report.md) |
| `f-plants-a` | s10-plants, first claim (its own doi) | published |
| `f-plants-b` | s10-plants, second claim (its own doi) | published |
| `f-animals` | s11-animals: nothing for animals is designed or tested yet | target |
| `f-steps` | s12-field step: six operator steps, about 7–9 active minutes | simulated (GATE: ask which compute file supports it) |
| `f-cost` | s12-field claim: 13.4–32.8 RUB per sample, excluding the listed items | simulated (compute: bom_summary.json) |
| `f-pump` | s13-status claim: 74% after 10 squeezes (model, not measured) | simulated (compute: fluid_ode.json) |
| `f-status` | s13-status steps: nothing measured; reader, wax and reagent untested | target |
| `f-limits` | s14-limits steps: missing internal control; first experiments | target |
| `f-igg` | IgG antibody structure, PDB 1IGT (C) | published (`{kind:'pdb', ref:'1IGT'}`) |

- [ ] **Step 2a: Check every DOI against Crossref.** The DOIs are `10.3390/bios13010082`, `10.1186/s42483-026-00442-9`, `10.1016/j.mex.2023.102372` and the two of `f-plants-a` and `f-plants-b`. For each, fetch `https://api.crossref.org/works/<doi>` with WebFetch (curl is denied). The title must fit the claim it supports. If a DOI does not resolve or does not fit, drop its facts and ask the owner. If it fits, set `checked` to today's date on every fact that uses it. Record each fetch and title in `plan8.md`. An unchecked DOI is an error (Plan 6 `checkFacts`).
- [ ] **Step 3: GATE: the inside-the-tube scene.** Ask the owner these questions in one message. Write each answer as a fact with its source, or drop that object. A new `doi` fact needs the same Crossref check as Step 2a.
  1. Which proteins should appear in the tube (recombinase, single-strand binding protein, polymerase), and which PDB ids? May I download them?
  2. What tags does the amplicon carry (for example, a hapten at one end and biotin at the other), and what is the source?
  3. What sits on the gold particles: an anti-hapten antibody or streptavidin? What sits on the test line and the control line? What is the source?
  4. What gold particle diameter should be shown, and from what source?
  5. May 1IGT stand in for the antibody on the gold, labelled "IgG (PDB 1IGT), shown as a stand-in"?
- [ ] **Step 4: Check the ceiling** with the Plan 7 Task 2 Step 4 command, with `arc-science` replaced by `miraeles` in both paths (the job path and the project path). Then check that every `simulated` fact has a compute path that exists on disk:
  ```bash
  node -e 'const fs=require("fs"),j=require("./jobs/miraeles/job.json");const bad=j.facts.filter(f=>f.level==="simulated"&&!(f.source&&fs.existsSync(f.source.ref)));console.log(bad.length?"BAD "+bad.map(f=>f.id).join(","):"ok");process.exit(bad.length?1:0)'
  ```
  Expected: `ok` both times.

### Task 3: Story in both languages

**Files:**
- Modify: `studio/jobs/miraeles/job.json` (fields `story` and `notes`)

- [ ] **Step 1: Write `story`:** 12 slides, `stop` 0–11:

| stop | Title (en) | Facts | What the picture does |
|---|---|---|---|
| 0 | Miraeles | f-what | The photoreal tube on a bench, in the `bench` frame |
| 1 | Why diagnosis on a farm is slow | f-pcr | A lab PCR set-up beside a farm (engine-drawn, architecture) |
| 2 | Inside the tube: MIRA at one temperature | f-mira, f-temp, f-igg, Task 2 Step 3 facts | **Continuous zoom** from `bench` through `tube` into `nano`: the proteins act on DNA |
| 3 | The tagged product | Step 3 facts | Amplicons with their tags, as copies (Plan 2) |
| 4 | From tube to strip | f-modules, f-reader | **Continuous zoom out** from `nano` to `tube`, then the camera moves to the reader and strip in `bench` |
| 5 | NALFIA: reading the strip | f-nalfia, f-lines | The liquid flows; gold particles gather at the test line and the control line (copies with a field, seeded) |
| 6 | The heat block | f-wax | The wax block with the tube placed |
| 7 | How long the heat lasts | f-window | The modelled temperature window; the curve comes from the compute file only |
| 8 | Markers for three panels | f-panels | Panel table; "chosen in silico" stays in the notes |
| 9 | Plants and animals | f-plants-a, f-plants-b, f-animals | Precedents (published) beside targets |
| 10 | In the field | f-steps, f-cost, f-pump | The six steps and the cost line, both as calculations |
| 11 | What is measured and what comes next | f-status, f-limits | Built, modelled and target parts, kept apart by line style |

  Write `say.en` and `say.ru` from the cited facts only. The Russian wording comes from source A where it exists.
- [ ] **Step 2: Check numbers and fact use** with the Plan 7 Task 3 Step 2 command, with `arc-science` replaced by `miraeles`.
  Expected: `ok`.
- [ ] **Step 3: Check refused words** with the Plan 7 Task 3 Step 3 command, with `arc-science` replaced by `miraeles`.
  Expected: `ok`.

### Task 4: World

**Files:**
- Create: `studio/jobs/miraeles/make_igg_glb.cxc`, `studio/jobs/miraeles/*.glb` (one per approved structure)
- Modify: `studio/jobs/miraeles/job.json` (fields `world`, `layout` and a placeholder path)

- [ ] **Step 1: Make the meshes.** Make 1IGT as in Plan 1 Task 7 Step 1, and make each structure approved in Task 2 Step 3 the same way. Use the ChimeraX command from Plan 1.
  Expected: one `.glb` per structure, each under 15 MB.
- [ ] **Step 2: Write `world`.**
  - Frames:
    - `bench` (1e-3, root);
    - `tube` (1e-3, inside bench, at the tube's place);
    - `nano` (1e-9, inside tube, inside the liquid);
    - `strip` (1e-3, inside bench, at the reader).
  - Objects:
    - the tube, from the Plan 2 exact profile (the source the owner approved), with the role `plastic` (the lens sets the preset `polypropylene`);
    - the liquid, with the role `liquid` (the lens sets the preset `water`);
    - the proteins, from Step 1, with the role `protein` (the IgG with the role `antibody`);
    - the amplicons, as `copies` (`scatter`, seeded) with the role `nucleic-acid`;
    - the gold particles, as `copies` (`scatter`, seeded) with the role `gold` and a `field` that moves them toward the lines;
    - the strip, from the Plan 2 strip layout, with the role `strip`;
    - the reader and heat block, engine-drawn, at `architecture`, with the roles `shape` and `label`.
  - Each protein in `nano` gets a `standIn` with `swapAt` 1.2e-7 m. The zoom ends 60 nm from the nearest protein, so the pixel test (Task 5 Step 3) needs 60, 120 and 240 nm, and the zoom reaches all three. `standIn.asset` is an asset file (a sphere mesh file, as `igg` has in Plan 1 Task 7), never an object id.
  - Use only the 12 roles of the Global Constraints. If another role is needed, STOP and ask.
  - Add each object id to the `usedBy` of the facts it shows.
- [ ] **Step 3: Write `layout`** for the 12 stops in `en` and `ru`, as in Plan 7 Task 4 Step 3: a title block `s<NN>-title` and up to 3 label blocks `s<NN>-label-<k>`, with exactly the ids that the facts' `usedBy` name.
- [ ] **Step 4: Validate before the storyboard yes.** A job with 12 stops is big (Plan 6), so `npm run export` refuses it until the owner approves the storyboard. Validate with the check command and stills, as in Plan 7 Task 4 Step 4:
  - write a placeholder deck path `deck-main` with 12 stops at t = 0, 6, 12 … 66 s (Task 5 replaces it);
  - run `npm run check -- miraeles`. Expected: findings only for fields that later tasks fill; none for `brief`, `facts` or `story`;
  - cut one still per stop with `stillsAt('miraeles', 'journal', 'en', <the 12 stop times>, 'studio/out/stills/miraeles-draft')` (Plan 6, `tools/still.mjs`). Expected: 12 PNG files and no blank frame.
- [ ] **Step 5: Commit** `job.json`, the `.cxc` script and the `.glb` files. This follows the commit GATE of Task 0.

### Task 5: Motion and the camera path

**Files:**
- Modify: `studio/jobs/miraeles/job.json` (fields `timeline` and `paths`)

- [ ] **Step 1: Write the deck path** `deck-main` with 12 stops.
  - The zoom in (stop 1→2) goes from 0.05 m off the tube in `bench` to 60 nm off the nearest protein in `nano`, over 4.0 s, with ease `power2.inOut`.
  - The zoom out (stop 3→4) runs the reverse over 4.0 s. A 2.0 s move in `bench` to the strip follows.
- [ ] **Step 2: Write the tracks.** The proteins act and the amplicons appear on stop 2. The tags show on stop 3. The flow and the particle gathering run on stop 5. All copies use the seeded `copies` field of Plan 2. Use eases `power2.out` and `power2.inOut` only, with one focus at a time.
- [ ] **Step 3: Rerun the zoom pixel test** on this job, as in Plan 7 Task 5 Step 3 (`STUDIO_JOB=miraeles`). The test reads `swapAt` from the first object that has `standIn`. It uses the page-default path and the consecutive key pair whose camera-distance range contains `swapAt/2`, `swapAt` and `swapAt·2` (60, 120 and 240 nm).
  Expected: PASS. If it fails with `stand-in distances not reached`, STOP and ask.
- [ ] **Step 4: Commit** `job.json`. This follows the commit GATE of Task 0.

### Task 6: Storyboard stop (GATE)

- [ ] **Step 1:** Run `npm run storyboard -- miraeles`.
  Expected: a contact sheet with 12 frames.
- [ ] **Step 2: GATE.** Send the contact sheet to the owner (with the file-sending tool if you have one; otherwise give its full path). Ask: "Is this storyboard right, including the audience and the scene inside the tube?" Apply each change and ask again. Do not start Task 7 before his yes. After his yes, set `storyboard.approvedAt` in `job.json` with his words as `note` (Plan 6 Task 6). Export, PDF and site stay refused until then.

### Task 7: Lenses, live renders and the photoreal shots

- [ ] **Step 1: Export** the four combinations of lens (`journal`, `cinematic`) and language (`en`, `ru`) at 30 fps, `--workers 2`, one at a time.
- [ ] **Step 2: Check that the copies are seeded.**
  - Export `journal`/`en` a second time.
  - Cut frame `5 × 30 + 15` from both MP4s: `ffmpeg -y -i <mp4> -vf "select=eq(n\,165)" -frames:v 1 <png>`.
  - Compare the two files with `sha256sum <png1> <png2>`.
  Expected: the hashes are equal.
- [ ] **Step 3: Bake the two zoom shots and the strip close-up.**
  - Add three shots to `job.json`, in Plan 3's `Shot` shape: ids `zoom-in`, `zoom-out` and `strip`.
  - Each has `path: "deck-main"`, `fps: 30`, `render: "baked"` and Plan 3's `DRAFT` settings.
  - Each takes its `t0` and `t1` from that segment in `timeline`.
  - Run `npm run bake -- miraeles --shot <id> --draft` for each id.
  - Then estimate the full time as frames × time per frame, summed over the three, using the `FINAL` settings (Plan 3).
- [ ] **Step 4: GATE when the estimate is above 30 minutes.** Ask the owner. On a yes, switch each shot's `settings` from `DRAFT` to Plan 3's `FINAL` (1920×1080, 256 samples, denoise on) in `job.json`, then bake without `--draft`, at low priority.
- [ ] **Step 5: Commit** `job.json`. This follows the commit GATE of Task 0.

### Task 8: Fix the export findings

- [ ] **Step 1:** Fix each `overflow`, `small-text` and `offscreen` finding, as in Plan 7 Task 8.
- [ ] **Step 2:** Re-export the four combinations.
  Expected: every `checks.json` is empty.
- [ ] **Step 3: Commit** `job.json`. This follows the commit GATE of Task 0.

### Task 9: Raster rebuild of a literature mechanism figure

The rebuild always goes through a scratch job, never into the pilot job directly (Plan 4, Plan 5). The scratch job here is `miraeles-fig`.

- [ ] **Step 1: GATE: the figure.** Ask the owner which literature figure of the MIRA-NALFIA mechanism to rebuild, and confirm that its licence allows reuse with credit (for example CC BY). Without a licence that allows it, rebuild one of the owner's own Miraeles figures instead.
- [ ] **Step 2: Write `reading.json`.** Look at the picture. Write `studio/jobs/miraeles-fig/reading.json` by the Plan 4 schema (`studio/tools/rebuild/reading.ts`, Plan 4 Task 4). Run `checkReading` on it. Expected: `ok: true`.
- [ ] **Step 3: Rebuild into the scratch job.** Run `npm run rebuild -- <png> --job miraeles-fig`. Expected: `studio/jobs/miraeles-fig/job.json` with named vector objects, and a `rebuild-report.json`.
- [ ] **Step 4: Score.** Run `npm run score -- miraeles-fig --against <png>`. Expected: at or above the Plan 4 pass level. Allow at most two fix rounds (fix `reading.json`, rebuild, score), then STOP and ask.
- [ ] **Step 5: Propose the objects for slide 5.** Run `npm run rebuild -- <png> --job miraeles-fig --into miraeles --stop 5`. Expected: `studio/jobs/miraeles/proposed.json` with `add` edits placed at stop 5, and a printed diff.
- [ ] **Step 6: GATE, then apply.** Show the owner the diff. After his yes, run `npm run edit -- miraeles --apply`.
- [ ] **Step 7:** Add a credit line with the figure's source, author and licence to the notes of slide 5.
- [ ] **Step 8: Commit** `job.json`, `edits.jsonl` and the scratch job folder. This follows the commit GATE of Task 0.

### Task 10: Review: overclaim read, then blind read

**Files:**
- Create: `studio/jobs/miraeles/review/stills/*.png`, `studio/jobs/miraeles/review/<stop>.notes.md`

- [ ] **Step 1: Cut the stills,** as in Plan 7 Task 10 Step 1, with `miraeles`.
- [ ] **Step 2: Overclaim read.** A fresh Sonnet agent gets `story`, `facts`, the English stills and this rule: "measured is not allowed; simulated must read as a model". It lists every overclaim. Fix each one, re-export, and cut the stills again.
- [ ] **Step 3: Blind read,** as in Plan 7 Task 10 Step 3, with `.\qa\blind_read.md`. Fix every item of questions 2 and 3. Repeat until a round finds nothing.
- [ ] **Step 4: Notes files,** as in Plan 7 Task 10 Step 4. Each notes file also gives the compute path of every simulated number on its slide.

### Task 11: Deliveries

- [ ] **Step 1:** Run `npm run narrate -- miraeles --lang en`, then `--lang ru`. Re-export with narration.
- [ ] **Step 2:** Run `npm run pdf -- miraeles --lens journal --lang en` and the same for `ru`.
  Expected: two PDFs of 12 pages.
- [ ] **Step 3:** Run `npm run site -- miraeles`.
  Expected: the folder `studio/out/site/miraeles/`. Serve it over http (`python -m http.server 4390 --bind 127.0.0.1` in that folder) and check that the deck plays. Do not open it from `file://`.
- [ ] **Step 4: GATE.** Ask: "May I publish the Miraeles deck to Vercel?" On a yes, run `npm run publish -- miraeles --approved` and record the link. Without his yes, do not run it.
- [ ] **Step 5: Commit** the changed job files and `plan8.md`. This follows the commit GATE of Task 0.

### Task 12: One hand edit in each of the four ways

Make each edit, re-export, and confirm by eye that it is visible and survives a second export, as in Plan 7 Task 12.

- [ ] **Step 1: Click and change:** in the studio editor, click the English title block `s05-title` of stop 5, make the title box 6 px taller and change its text to "NALFIA: how the strip is read". The inspector's layout row sets only the box and the text. It has no colour or size field: a colour change goes through a role, so this step does not change colour. The box change shows in `edits.jsonl`.
- [ ] **Step 2: Timeline:** start the particle gathering on stop 5 0.5 s later.
- [ ] **Step 3: Words:** run `npm run edit -- miraeles --words "hold the inside-the-tube view one second longer"`. Write the edits to `studio/jobs/miraeles/proposed.json`, run the command again to print the diff, and show the diff to the owner. After his yes, run `npm run edit -- miraeles --apply`.
  Expected: stop 2 holds 1.0 s longer.
- [ ] **Step 4: 3D camera:** in the editor, move the camera at stop 6 to show the tube in the wax, save the shot, and set it as stop 6's key.
- [ ] **Step 5:** Re-export the four combinations.
  Expected: all four edits are visible, and every `checks.json` is empty.
- [ ] **Step 6: Commit** `edits.jsonl` and the changed job files. This follows the commit GATE of Task 0.

### Task 13: Hand-over

- [ ] **Step 1:** Complete `studio/ledger/plan8.md`, with every answer from the owner and every open item.
- [ ] **Step 2:** Run `hindsight/retain` with one note: the Miraeles pilot status, the output paths, the blind-read outcome and the link. Use the index tags. Check it with `get_operation`, then read it back.
- [ ] **Step 3:** Tell the owner what was built, where the four deliveries are and what is open. Nothing is pushed.
