<!-- version: i8 | date: 2026-11-09 | status: Plans 1–9 built; i8 records completion of Plans 8 (Miraeles) and 9 (Omniverso ML explainer) -->
# Molecullage Studio: plan index, shared names and executor rules

Read this file first, then the design (`.\docs\superpowers\specs\2026-10-31-engine-design.md`), then the one plan you are running. The plan documents live in `.\docs\superpowers\plans\`. Read and update them there, by absolute path. The plans are written for **Claude Sonnet 5.5 High** as the executor. They are strict on purpose: follow them as written.

## 1. The plans and their order

| # | File | Builds | Needs | Status |
|---|---|---|---|---|
| 1 | `2026-10-31-molecullage-studio-plan1-world-and-live-deck.md` | World, clock, timeline, scale frames, camera paths, lenses, layout layer, live renderer, deck player, MP4 export, deep-zoom test | — | built (tasks 0–9) |
| 2 | `2026-10-31-studio-02-3d-toolkit.md` | Surfaces, copies and effects, moving parts, materials-light-camera; docs and demos for each | 1 | built |
| 3 | `2026-10-31-studio-03-photoreal.md` | World-to-Blender bridge, Cycles renders, baked frames by t, home-server jobs | 1, 2 | built |
| 4 | `2026-10-31-studio-04-vector-and-rebuild.md` | Named vector layer, GSAP player for 2D, raster rebuild with an overlay score | 1 | built |
| 5 | `2026-10-31-studio-05-editing.md` | Edits with undo; click and change; timeline; words; 3D camera shots | 1, 4 | built |
| 6 | `2026-10-31-studio-06-content-and-delivery.md` | Brief, research ledger, story, both languages, narration, storyboard stop, PDF, Vercel link | 1, 3, 5 | built |
| 7 | `2026-10-31-studio-07-arc-science.md` | The Arc Science pilot deck | 1–6 | built |
| 8 | `2026-10-31-studio-08-miraeles.md` | The Miraeles pilot deck | 7 | built |
| 9 | `2026-10-31-studio-09-ml-explainer.md` | The ML model explainer showcase | 7 | built |

Run the plans in this order. Do not start a plan until the plans it needs are done and the owner has seen their hand-over.

## 2. Shared names (the contract between plans)

A plan may use only the names below from earlier plans, with exactly these signatures. A plan that adds a name to this table adds it in its own Interfaces blocks. The index is updated at that plan's hand-over.

### Plan 1 (core, `studio/core/`; browser, `studio/web/`)
- `world.ts`:
  - types `Level`, `Source`, `Frame`, `WorldObject`, `World`;
  - `validateWorld(input: unknown): {ok:true; world:World} | {ok:false; errors:string[]}`. It also refuses `size <= 0`;
  - `evidenceError(id: string, source: Source, level: Level): string | null`. `validateWorld` uses it. Plans 4 and 6 reuse it and do not write their own.
- `timeline.ts`:
  - types `Ease`, `Key`, `Track`, `Timeline`;
  - `ease(name, x)`, `sample(track, t)`, `validateTimeline(tl, world): string[]`.
- `frames.ts`:
  - type `Place`;
  - `rootOf(world, frame)`, `toCamera(world, p, cam): Float32Array`, `convert(world, p, toFrame)`.
- `camera.ts`:
  - types `CameraKey`, `CameraPath`;
  - `cameraAt(world, path, t)`, `stopIndexAt(path, t)`, `swapAlpha(distance, swapAt)`.
- `lens.ts`:
  - types `RoleStyle`, `Lens`;
  - `resolve(obj, lens): RoleStyle`, `contrast(a, b)`, `checkLens(lens): string[]`.
- `job.ts`:
  - types `Block`, `StopLayout`, `Job`;
  - `loadJob(input, lenses)`. It is pure: it runs in the browser too, so it reads no files and no environment. It does not call `checkBrief`, `checkFacts` or `checkStory`. Those checks run only in `tools/check.mjs` (Node), which reads `motion/projects/<product>.json` and the lexicon and passes them in (`checkFacts(job, allowed)`, `checkStory(job, lex)`).
- `lens.ts` also has (added 2026-11-01, Plan 1 Step 5c, all optional): `Lens.environment?: { hdri: string /* a library manifest id */; intensity: number }` and, on `RoleStyle`, `transmission?: number`, `thickness?: number` (a fraction of the object's size), `attenuation?: { color: string; distance: number /* a fraction of the object's size */ }` and `emissive?: { color: string; intensity: number }`. They are look choices of the lens, with no evidence level. Render units are camera distances; the far plane is `distance·1e6`. The test job `studio-plan1/studio/jobs/stage-test` is an empty stage (the lens backdrop alone), used as the reference of the "no frame is blank" test.
- The material library (added 2026-11-01, Plan 1 Step 5c): the folder `studio/library/` holds `manifest.json` (`id`, `kind`, `file`, `name`, `author`, `source`, `download`, `licence`, `bytes`, `md5`, `fetched`; licences `CC0-1.0` or `CC-BY-4.0` only). The command `node tools/library.mjs fetch` downloads missing manifest files and checks size and md5. First assets are `hdri-studio-small-09` and `hdri-studio-small-03` (Poly Haven, CC0). Later plans add textures and models to the same manifest, and each download needs the owner's yes.
- The grounded source policy, 231-source index and eight-domain atlas (added 2026-11-01, consolidated at commit `bd96b6d` on 2026-11-08) live under `studio/library/` and `studio/tools/`. `POLICY.md` and `references.json` record `kind`, `licence`, `status`, `grounding`, `values` when grounded, and `claimedValues` otherwise. `sources.json` holds 231 sources built by `tools/build-sources.mjs` from `research/R1` to `R6` and `sources.extra.json`. `access.json` and `tools/access.mjs` (`signInQueue`) rank sign-in sources. `atlas/domains/*.json`, `tools/atlas.mjs` (`validateDomain`, `loadDomains`, `rollup`) and `tools/atlas-gate.mjs` (`longestShared`, `support`, `freezeState`, `diffFreeze`) maintain the eight-domain software and model atlas (`dcc-3d`, `cad-geometry`, `motion-video`, `design-2d`, `realtime-render`, `science-viz`, `gen-3d`, `gen-vector`). `node tools/search.mjs` runs offline search (`--live` for open services), and `npm run check:studio` runs all seven Studio library and atlas test suites. Plan 6's `checkFacts` reuses the grounding rule: a fact may rest only on a `full-text` or `primary-data` entry.
- `web/renderer.ts`:
  - `createStage(canvas, job, lens, path, assets, environment?): Stage` (`environment` is an optional `THREE.Texture` made from the lens HDRI);
  - type `Stage = { seek(t): Promise<void>; duration; stops; lang }`;
  - `window.__studio`.
  - Every layout block element carries `data-block="<block id>"`. Any world object drawn or picked as DOM carries `data-id="<object id>"`.
- `web/deck.ts`: `mountDeck(stage, job, root)`.
- `web/vite.config.ts`: the one Vite config of the Studio (see "One Vite config" below).
- `web/index.html` page query: `?job=<id>&lens=<id>&lang=<en|ru>&path=<id>`.
  - `job` defaults to `zoom-test`; `lens` to `job.lens`; `lang` to the first of `job.langs`; `path` to the first path of kind `deck`.
  - Every id must match `^[a-z0-9-]{1,40}$`; otherwise the page shows `bad job id` and stops.
- `tools/export.mjs`: the command `npm run export -- <job> --lens <id> --lang <en|ru> --path <id> --fps <n> --workers <n>`. The defaults of `--lens`, `--lang` and `--path` are the page defaults. The command passes them in the page query.
- `tools/checks.mjs`: `checkPage(page)`.
- `tools/browser.mjs`: `launch(): Promise<Browser>`. It starts headless Chrome with software WebGL 2 (code copied from `.\film\tools\render.mjs`). **Every playwright test and tool in Plans 1 to 9 gets its browser from `launch()`.** Nobody calls `chromium.launch` elsewhere.
- Text size ladder by block role, at 1920 px wide (Plan 1 Task 7; `.\stage\SPEC.md` section 3): `title` 51 px, `label` 42 px, `note` 37 px. The size scales with the 1920×1080 transform. The lens `text.minPx` (37) stays the lower limit.
- `STUDIO_JOB` env for `tools/pixels.test.mjs`.
- The `zoom-test` job (later tests use these values):
  - duration 12 s;
  - deck path `deck` with keys at t = 0, 4, 8 and stops `[0, 4, 8]`;
  - key 0 is 0.05 m from the tube (frame `bench`); key 4 is 2 µm inside the liquid (frame `tube`); key 8 is 30 nm from `igg` (frame `nano`). `igg` moves with `gold-1` and ends in contact with its surface, so the key 4 and key 8 targets are `igg` at that time (nano `[8,0,0]` and `[16,0,0]`). Antibodies coat the particle (`coat-01` … `coat-03`); see Plan 1 Step 5b and `jobs/zoom-test/REFERENCES.md`. `WorldObject.rotation?: [number, number, number]` (Euler XYZ, radians) was added;
  - timeline track 0: `gold-1` `position`, keys t=0 `[0,0,0]` and t=8 `[40,0,0]` (nm);
  - timeline track 1: `igg` `opacity`, keys t=6 `0` and t=8 `1`.

### Plans 2–9
Each plan lists the names it produces in its own Interfaces blocks, under the folders below:

| Plan | Folders |
|---|---|
| 2 | `studio/core/geo/` (surfaces, copies, rig), `studio/core/look/` (materials, lights, optics), `studio/web/look.ts`, `studio/docs/`, `studio/web/demos/`; edits `studio/web/vite.config.ts` (adds the demo pages as inputs) |
| 3 | `studio/core/bake.ts`, `studio/web/gltf.ts`, `studio/blender/`, `studio/tools/bake.mjs`, `studio/tools/remote.mjs` |
| 4 | `studio/core/vector.ts`, `studio/web/vector.ts`, `studio/web/gsap-player.ts`, `studio/tools/rebuild/`; scratch jobs from `npm run rebuild` |
| 5 | `studio/core/edits.ts`, `studio/web/editor/`, `studio/tools/words.mjs` |
| 6 | `studio/core/brief.ts`, `studio/core/facts.ts`, `studio/core/story.ts`, `studio/tools/narrate.mjs`, `studio/tools/storyboard.mjs`, `studio/tools/pdf.mjs`, `studio/tools/site.mjs` |
| 7–9 | `studio/jobs/arc-science/`, `studio/jobs/miraeles/`, `studio/jobs/ml-explainer/` (job data only, no engine code) |

The job file grows by optional fields only. No plan may rename or remove a field that an earlier plan defined.

### Shared conventions

**One Vite config.** Plan 1 Task 7 creates `studio/web/vite.config.ts` once. Later plans only add to it (inputs, plugins). Nobody creates `studio/vite.config.ts` or a second config.
- `root` is the `web` folder, `base` is `'./'`, and `build.outDir` is `web/dist`.
- `build.rollupOptions.input` lists `index.html`. Later plans add their pages to this list.
- `server.fs.allow` is `['..']`.
- The plugin `studioFiles()` serves `/jobs/`, `/lenses/`, `/library/` and `/cache/` from `studio/jobs`, `studio/lenses`, `studio/library` and `studio/cache`, in dev and in preview. It reads the file on each request, so a newly appended `edits.jsonl` is served at once.
- Scripts: `"dev": "vite --config web/vite.config.ts"`, `"build": "vite build --config web/vite.config.ts"`, `"preview": "vite preview --config web/vite.config.ts --port 4380 --host 127.0.0.1"`. Tests run `npm run build`, then `npm run preview` in the background.
- Plan 5 registers `editsPlugin` in this file. It does not create a new config and does not change the `dev` script.
- Plan 6 `npm run site` copies `web/dist`, `jobs/<job>/`, `lenses/` and the PNG frames of `cache/<job>/` (not the `.key` files) into `studio/out/site/<job>/`. The site is opened over http (the Vercel link, or `npm run preview`), never from `file://`.

**Lens roles.** Both shipped lenses style exactly these 12 roles: `plastic`, `liquid`, `antibody`, `protein`, `nucleic-acid`, `gold`, `strip`, `line`, `diagram`, `tile`, `shape`, `label`.
- Roles are design names. Material presets have their own ids (`polypropylene`, `water`, `gold`, `glass`, `nitrocellulose`), set through `RoleStyle.preset`.
- Plans 7–9 use only these 12 roles. A new role is a STOP (rule 6). Plan 8 does not use `plastic-pp` or `liquid-water` as roles.

**Evidence in facts and sources.**
- An arXiv paper is a source of kind `doi` with ref `10.48550/arXiv.<id>`. Each one needs the Crossref/DataCite check step that sets `checked`.
- Each fact has one evidence level only.
- `usedBy` holds block ids and world object ids. Block ids follow `s<NN>-<role>`, for example `s03-title` and `s03-label-2`. The storyboard task creates the blocks with these ids.
- Plan 2 materials: a refractive index needs a cited source. Roughness, transmission and base colour are look choices of the lens. They carry `"choice": "design"` and no evidence level, and they make no claim.

**Rebuild flow (Plans 4, 5, 7–9).**
1. The agent writes `studio/jobs/<scratch-job>/reading.json` by the Plan 4 schema.
2. `npm run rebuild -- <png> --job <scratch-job>` writes the scratch job. It never writes an existing pilot job: it refuses if `job.json` exists and lacks `"rebuild": true`.
3. `npm run score -- <scratch-job> --against <png>`. `score` letterboxes the original into 1920×1080, padding with the lens background, so any picture shape works.
4. `npm run rebuild -- <png> --job <scratch-job> --into <job> --stop <n> [--only <id>[,<id>...]]` writes `studio/jobs/<job>/proposed.json` (Plan 5). It holds `add` edits for the scratch job's objects and vectors, placed at stop n, and prints the diff. With `--only`, just the named objects and vectors (and their children) are proposed.
5. After the owner's yes: `npm run edit -- <job> --apply`.

### Planned names from Plans 2–6 (checked against each other on 2026-10-31)

Each plan's own Interfaces blocks are the full definition. This table is the cross-plan summary that later plans rely on.

| Plan | Job fields added | Other shared names | Commands |
|---|---|---|---|
| 2 | `WorldObject.geometry?: { kind: 'revolve'; file: string /* profile json under studio/jobs/<job>/ */ }`, `WorldObject.copies?: { kind: 'array'\|'scatter'; count: number; step?: Vec3; box?: [Vec3, Vec3]; minDist?: number; seed?: number; field?: Field }` (drawn with `THREE.InstancedMesh` in `renderer.ts`; `validateWorld` refuses `count` < 1 or > 100000, and `scatter` without `box`), `RoleStyle.preset?`, `Lens.rig?`, `CameraKey.optics?` | `MeshData`, `revolve`, `loft`, `extrude`, `measure`, `isClosed`, `mulberry32`, `arrayCopies`, `scatter`, `fieldWeight`, `pose`, `bend`, `MATERIALS`, `RIGS`, `fovFromLens`, `dofRange`, `makeMaterial`, `makeLights`, `applyOptics`, `window.__demo`, `window.__look = { makeMaterial, makeLights, applyOptics }` (set on test and demo pages only; the look tests call it) | `npm run demos` |
| 3 | `shots?: Shot[]` with `Shot = { id; path; t0; t1; fps; render: 'live'\|'baked'; settings: RenderSettings }`; `budget?: { secondsPerFrame }` | `DRAFT` and `FINAL` render settings (`FINAL`: 1920×1080, 256 samples, denoise on; Plans 7–9 switch a shot to `FINAL` before the full bake), `bakeKey`, `framePath`, `frameUrl(jobId, shotId, frame)` (a relative URL `cache/<job>/<shot>/<NNNNN>.png` with no leading slash, so the Plan 6 site under `deck/` resolves it), `frameAt`, `timeOf`, `exportAt`, `Stage.three`, `window.__studio.snapshot`, `window.__studio.mode`, check kind `missing-bake`, test jobs `bake-test` and `cube-test` (`studio/jobs/cube-test/job.json` and `cube.camera.json`: one 1 cm cube, one deck path with one stop), and the copy job `zoom-final` (a copy of `zoom-test` plus one baked `FINAL` shot `tube-to-liquid`; `zoom-test` itself never gets a baked shot) | `npm run bake -- <job> --shot <id> [--lens] [--draft] [--approved] [--export-only]`; `npm run remote -- <job> --shot <id> --task encode\|render [--dry]` |
| 4 | `vectors?: VectorObject[]` | `validateVectors`, `Stage.project`, `createGsapPlayer`, `createVectorLayer`, `Reading`, `Part`, `checkReading`, `traceParts`, `assemble`, `score.py` (`mad_score`, `edge_iou`), attributes `data-id` and `data-block`; the scratch job from `assemble` has one path of kind `deck` with one stop at t = 0 (id `deck`), so the page default and `score` work without `path=` | `npm run rebuild -- <png> --job <scratch-job>` (always writes a scratch job; see "Rebuild flow"); `npm run score -- <job> --against <png>` |
| 5 | none; per-job file `edits.jsonl` | `Edit`, `SHIPPED_LENSES`, `applyEdits(job, edits, lenses?)`, `undo`, `diffJobs`, `readEdits`, `appendEdit`, `undoLast`, `Stage.pick`, `Stage.freeCamera`, `Stage.cameraPlace`, `mountEditor` (its inspector has a layout row: selecting a block allows `set /layout/<i>/blocks/<j>/box` (x, y, w, h) and `set /layout/<i>/blocks/<j>/text`), `mountTimeline`, `mountCameraTool`, `editsPlugin` (registered in `studio/web/vite.config.ts`) | `npm run edit -- <job> --words "<text>" [--apply]`; `npm run edit -- <job> --apply` applies `proposed.json` after the owner's yes; `npm run rebuild -- <png> --job <scratch-job> --into <job> --stop <n> [--only <id>[,<id>...]]` (writes `studio/jobs/<job>/proposed.json`; with `--only`, just the named scratch objects and vectors and their children are proposed); page flags `?edit=1`, `?edits=0`; export flag `--no-edits` |
| 6 | `brief?: Brief` (with `product`), `facts?: Fact[]` (with `checked?`), `story?: Slide[]`, `storyboard?: { approvedAt; note? }` | `checkBrief(b, lensIds, projectIds)`, `budgetLine`, `checkFacts(job, allowed)`, `checkStory(job, lex)`, `parseLexicon` and `proseFindings` (pure, `core/prose.ts`), `loadLexicon` (Node only, `tools/lexicon.mjs`), `isBig`, `stillsAt`, `buildNarration`, `siteFiles`; uses `evidenceError` from Plan 1 and the page query from Plan 1. These checks run only in `tools/check.mjs` | `npm run check -- <job>` (exit 0 clean, 1 findings), `npm run brief -- <job> [--done]`, `npm run narrate -- <job> --lang <l> [--engine sapi\|fish] [--approved]`, `npm run storyboard`, `npm run pdf -- <job> --lens <id> --lang <l> [--notes]`, `npm run site`, `npm run publish -- <job> --approved`; export flag `--voice` |

**Files that several plans change.** `web/renderer.ts`, `web/index.html`, `core/job.ts`, `tools/export.mjs`, `tools/checks.mjs` and `package.json` are changed by more than one plan. A later plan changes them by addition only:
- new optional fields;
- new methods;
- new flags;
- new check kinds;
- new scripts.
It keeps every earlier test passing. If an earlier test breaks, stop and ask (rule 6).

## 3. Executor rules (strict)

1. **Read, then act.** Read this index, the design and your plan fully before the first step. Read every file a task names before you edit it.
2. **One task at a time, in order.** Do not skip, merge or reorder tasks. Do not start the next task until the current task's verification passes.
3. **Exact names.** Use the file paths, function names, types and values the plan gives, letter for letter. Do not rename, and do not add public names the plan does not list.
4. **No new packages.** Install only the packages a plan's approval gate lists, at the exact versions it lists, after the owner's yes. `npm ci` installs only the lockfile versions that the owner approved in Plan 1 (and in Plan 4 for gsap, Plan 6 for vercel).
5. **Tests first.** Write the test, run it and see it fail, then write the code, run it and see it pass. Paste the command and the pass line into the plan ledger.
6. **Stop and ask when:**
   - a test cannot pass as written;
   - a step is unclear;
   - a needed file or tool is missing;
   - a check fails twice;
   - the step needs something outside your plan.
   Send the owner one short plain-English question, then wait. Never guess and never work around a test.
7. **Gates.** Steps marked **GATE** need the owner's yes in chat: installs, commits, downloads, renders longer than 30 minutes, publishing, and anything shown to other people. A yes covers only that gate.
8. **Honesty.** Every object carries a source and an evidence level (design 6). Never invent a number, a citation, a structure or a measurement. If a plan needs a value it does not give, stop and ask.
9. **Ledger.** Keep `studio/ledger/plan<N>.md`. Give each task four lines: start time, the commands run with their pass or fail line, the files changed, and the end time. Update the file in place.
10. **Cammut.** Before each plan: run `hindsight/recall` with tags `project:Omniverso` and `topic:molecullage-studio`. After each task: run `hindsight/retain`, one short fact, with tags `["project:Omniverso","date:YYYY-MM-DD","source:claude-code","topic:molecullage-studio"]`. Check it with `get_operation`, then read it back. Never store secrets.
11. **Helpers.** A helper agent gets one task, the plan text of that task, and the Interfaces it consumes. Helper agents always run on Sonnet 5.5 or Haiku 5.5, never on Opus or Fable (the owner's model table). Use Sonnet 5.5 for building and review, and Haiku 5.5 only for mechanical work (re-running exports, moving files). A fresh reviewer checks every task before the next one starts.
12. **Machine care.** Run at most two heavy processes at once. Give long renders low priority. Do not scan whole disks. Delete scratch files at the end of each task.
13. **Figures and anti-overplating.** Every slide picture, diagram or figure built for Plans 4 and 7 to 9 follows the Molecullage figure rule and the 5-gate anti-overplating workflow (`docs/grammar.md` rules 39 to 56). This includes the `nestedBoxes` detector in `build/build.mjs`, the `overplate` mark in `qa/qa_fig.py`, the blind read, the notes file and the Cammut note. Every 2D icon, 3D model, HDRI, structure and paper must resolve through `studio/library/sources.json` and `studio/library/references.json` (rule 53).
14. **House style.** Write all text plainly in English, with short sentences and no promotional words. Russian appears only in job content and the term list.
15. **Never push.** Never force anything, delete branches or edit another session's files.
16. **Branches.** Each plan's Task 0 creates its branch `studio/plan<N>`.
    - Plan 1 cuts `studio/plan1` from `main`.
    - Plan N (N ≥ 2) cuts `studio/plan<N>` from the tip of `studio/plan<N−1>`, so the earlier code is present.
    - Each Task 0 asks the owner for a yes for local commits on that branch and for `npm ci` with the approved versions (the commit GATE). Every commit step of the plan follows that yes.
    - After the branch is cut, the Task 0 of Plans 2 to 9 runs `npm ci` in `studio/`, because a fresh worktree has no `node_modules`.
17. **Outside folders are read only, by absolute path.** These are `.\stage\`, `...\film\`, `...\motion\`, `...\data\pdb\`, `...\struct\`, `...\qa\`, `...\tokens\`, and the Arc Science `concept/` folder (`roadmap.md` v8, `arc-harness-agent-design.md` v3, `arc-native-transition.md`, `tree-hoh.md`, `super-agent-validation.md`), which supersedes the retired `decks/arc-science-yc` and `motion/projects/arc-science.json` paths. Never use a relative path to them. The one named exception is Plan 6 Task 5: it writes a temporary beat folder `.\film\src\beats\_studio-<job>-<lang>\` (and the matching `film\narration\_studio-<job>-<lang>\`), which the existing narration tool needs, and deletes both in a `finally` block. Plan 6 Task 0 asks the owner for a yes to this write. Plan documents are read and updated in the plans folder named at the top of this file.
18. **One Vite config.** See "One Vite config" in section 2. Do not create another one.
19. **Checks live in Node.** `loadJob` is pure (it runs in the browser). Brief, facts and story checks run only in `tools/check.mjs`.
20. **Sending a file to the owner.** Send the file to the owner (with the file-sending tool if you have one; otherwise give its full path).
21. **Path base.** Commands run from `studio/`. A path written `studio/...` in a plan is relative to the repository root, and tools resolve it from their own file location (`import.meta.url`), never from the working directory. Python tests run with `py -3 -I -m unittest discover -s <dir>`.

## 4. What the owner must provide (collected from all plans)

Each plan also needs a yes for local commits on its own branch, `studio/plan<N>`, and for `npm ci` in `studio/` with the versions he approved (Plans 2 to 9).

| Plan | Item | Why |
|---|---|---|
| 1 | Install yes for three 0.186.1, @types/three (the release that matches), vite 8.3.4, typescript 7.0.2 (from `.\stage\package-lock.json`), zod 4.6.7 and playwright-core 1.64.1 (from `.\node_modules`); go or no-go on the deep-zoom stills | Gate; core risk |
| 2 | A source he approves for the 0.2 mL PCR tube: product, height, stated volume and wall thickness. A source for the lateral-flow strip layout. An answer if a refractive-index source fails its sanity range | Exact profiles and materials need real values |
| 3 | A standing rule that any render estimated over 30 minutes needs his yes. For the home server: host, user and folder, with no passwords and SSH already working, plus the Blender path there or "encoding only". A yes for the first remote run and for the final full-HD photoreal bake | Gates; remote jobs |
| 4 | Install yes for gsap 3.15.0 (from `.\stage\package-lock.json`) and vtracer (exact PyPI version). Five raster mock-ups with their sources, and a yes before committing them. Pass levels for `mad_score` and `edge_iou` once he has seen the first scores | Gate; test set; quality bar |
| 6 | Install yes for the vercel CLI at an exact version. His own `npx vercel login`. Whether to turn off Vercel Deployment Protection, so anyone with the link can open it. A yes for the temporary write into `film\src\beats\_studio-<job>-<lang>\` (Task 5). A yes for each paid Fish Audio run, each big-job storyboard and each publish, starting with a trial of `zoom-test` | Gates; publishing |
| 7 Arc Science | A time budget. Whether the hour split (4,260 h Omniverso, 2,140 h others) and any price may be shown. One sourced fact each for Snöggo, RNAv-G and Arc Chemistry. The CDR3 residue range of 1MEL if no source states it. The path to the Omniverso architecture figure, and leave to use it | Facts unconfirmed in `decks/arc-science-yc/TO-CONFIRM.md` |
| 8 Miraeles | A time budget and the audience. The Miraeles pipeline folder with the modelled numbers. Whether DOI 10.1186/s42483-026-00442-9 supports 39–42 °C. The compute file behind "six steps, 7–9 active minutes". The tube scene: proteins with PDB ids and leave to download, amplicon tags, what sits on the gold and on the test and control lines, the gold size, and whether 1IGT may stand in. The literature figure to rebuild and its licence | Honesty; downloads |
| 9 ML explainer | A time budget. Approval of the background references once checked (arXiv 1706.03762, 2209.03003, 2210.02747, 1412.6980, and a source for the autoencoder idea). Whether A100 specs beyond 80 GB may be shown, from NVIDIA's datasheet | Honesty |
| 7–9 | Approval of each storyboard; a yes for each bake over 30 minutes and each publish | Storyboard stop; gates |
