<!-- version: p1 | date: 2026-10-31 | status: draft for the owner's review -->
# Molecullage Studio, Plan 1: the world and the live deck — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core of Molecullage Studio: one world per job, its clock and timeline, nested scale frames, camera paths, lenses and per-language slide layout. Then use them to play a live browser deck and export an MP4. Test the deep zoom from a tube down to one antibody first.

**Architecture:** The pure core lives in `studio/core/` as TypeScript modules with no browser code. Node 24 runs them directly, and `node --test` tests them. The browser part lives in `studio/web/`. A three.js WebGL 2 renderer draws the world relative to the camera and exposes `window.__studio.seek(t)`. Export drives that page with playwright-core and joins the frames with ffmpeg. Every picture is a pure function of t.

**Tech Stack:**
- Node 24.14 (runs TypeScript by stripping types) and TypeScript 7 for type checks.
- Vite 8.3.4 and TypeScript 7.0.2, the versions in `.\stage\package-lock.json`.
- three 0.186.1, the version pinned in the w03 research.
- zod 4.6.7, the version in `.\node_modules\zod\package.json`.
- playwright-core 1.64.1, the version in `.\node_modules\playwright-core\package.json`.
- ffmpeg 8.1.1 (installed) and ChimeraX 1.10 (installed) for the molecule mesh.

**Spec:** `.\docs\superpowers\specs\2026-10-31-engine-design.md` (approved by the owner on 2026-10-31).

**Read first:** `.\docs\superpowers\plans\2026-10-31-studio-00-index.md`. It holds the executor rules, the shared names and the list of what the owner must provide. Then read the spec, then this plan. The executor rules apply to every step below.

## Plan order (this plan is Plan 1 of 9)

The design covers several separate parts. Each plan below ends in working, tested software. The plans follow the order the design and the owner's answers set:

1. **The world and the live deck** (this plan): world, clock, timeline, scale frames, camera paths, lenses, layout layer, live renderer, deck player, MP4 export, deep-zoom test.
2. **3D toolkit modules:** surfaces (exact profiles), copies and effects, moving parts, materials-light-camera. Each comes with documentation, a live demo and a numeric test (spec 7).
3. **Photoreal path:** the world-to-Blender glTF bridge, Cycles from the command line, baked frames played by t, and home-server jobs (spec 7, 11, 14a.1).
4. **Vector layer and raster rebuild:** named vector objects, GSAP as the player of our timeline data for 2D, the tracer, and the overlay score (spec 8, 14).
5. **Editing:** click and change, timeline, words, 3D camera shots; edits as stored changes with undo (spec 10).
6. **Content pipeline and delivery:** research with sources, story, both languages, narration, storyboard stop, PDF and the Vercel link (spec 5, 12).
7. **Arc Science pilot deck** (the owner: first).
8. **Miraeles pilot deck** (the owner: second).
9. **ML model explainer showcase** (the owner).

Plans 2 to 9 are written after Plan 1 runs, so they build on what Plan 1 proves.

## Global Constraints

- Code lives in a new `studio/` folder of the Molecullage repository (spec, top; the owner).
- Every frame is a pure function of t. The same t always gives the same picture (spec 6). No `Date.now`, no `Math.random` without a seed, and no animation loop inside a scene. Only the player in `studio/web/deck.ts` advances t.
- Evidence levels are exactly `measured`, `published`, `simulated`, `architecture`, `target` (spec 6; `motion/core/schema.js`).
- An object drawn by the engine with no outside source may carry at most `architecture` (spec 6, house rule "Honesty in pitch material").
- Text on screen is at least 37 px at 1920 px wide (spec 9 readability; `stage/SPEC.md` 3).
- Text contrast is at least 4.5:1 against its background (spec 9 readability).
- The live path uses WebGL 2. WebGPU is not used in Plan 1 (spec 14).
- Pin every new package to an exact version. Each new install needs the owner's yes first (house rule; spec 14).
- Commits happen only after the owner gives a yes for local commits on the plan branch (the commit GATE in Task 0). Never push (house rule).
- Folders outside `studio/` are read only, and are named by absolute path, never by a relative path: `.\stage\`, `...\film\`, `...\motion\`, `...\data\pdb\`, `...\struct\`, `...\qa\`, `...\tokens\`, and `.\decks\arc-science-yc\`. Index rule 17 names the single exception (Plan 6 narration); Plan 1 has none.
- The plan documents are read and updated at `.\docs\superpowers\plans\`.
- To give a file to the owner, send the file to the owner (with the file-sending tool if you have one; otherwise give its full path).
- Never commit `data/pdb/1A34-assembly1.cif`, `data/pdb/181L*` or `1A34*` (house rule).
- At most two heavy processes at once. Run frame export with `--workers 2` or fewer (house rule).
- Write user-facing text, comments and messages in plain English: short sentences, no promotional words (house style).

## Review Focus

1. **A t exactly on a key, before the first key, or after the last key.** The value holds: the first key's value before it, the last key's value after it, and the key's own value on it. Pinned in Task 2 (`sample holds outside and hits keys exactly`).
2. **A camera path that moves between frames whose units differ by 10⁷.** The image stays steady, with no jump at the frame change. Pinned in Task 3 (`camera-relative stays precise across 7 orders`) and Task 4 (`zoom distance is continuous at a frame change`).
3. **A world object whose role no lens styles.** Resolution fails with a message naming the role and the lens. It does not fall back to a default colour. Pinned in Task 5 (`resolve names the missing role`).
4. **Russian text longer than its English box.** The export check reports the overflowing block by id and language. Pinned in Task 9 (`flags Russian overflow`).
5. **Seeking backwards or jumping far ahead in the deck.** The page shows exactly what a fresh page shows at that t. Pinned in Task 7 (`seek back gives the fresh-page pixels`).
6. **A world object with size zero or below, or an evidence level that the source cannot carry.** `validateWorld` refuses both, with one shared message from `evidenceError`. Pinned in Task 1 (`rejects size zero or below`, `evidenceError reports the rules`). Plans 4 and 6 reuse `evidenceError`.
7. **A bad job id in the page query.** The page shows `bad job id` and stops. It does not load anything. Pinned in Task 7 (`bad job id shows an error`).
8. **A layout block that a later tool must find in the page.** Every block element carries `data-block="<block id>"`. Pinned in Task 7 (`layout blocks carry data-block`).
9. **`loadJob` must stay pure.** It runs in the browser too, so it reads no files and no environment. Brief, facts and story checks (Plan 6) run only in `tools/check.mjs`.

---

### Task 0: Package and approval gate

**Files:**
- Create: `studio/package.json`, `studio/tsconfig.json`, `studio/README.md`
- Test: none (setup only)

- [ ] **Step 1: GATE. Ask the owner for two yeses.** Stop until both are answered.
  - First, the install of these packages into `studio/`, at these exact versions:
    - `three@0.186.1`;
    - `@types/three` at the release that matches three 0.186.1 (run `npm view @types/three versions` and take the 0.186.x release; if there is none, stop and ask);
    - `vite@8.3.4` and `typescript@7.0.2` (read from `.\stage\package-lock.json`);
    - `zod@4.6.7` (read from `.\node_modules\zod\package.json`);
    - `playwright-core@1.64.1` (read from `.\node_modules\playwright-core\package.json`).
  - Second, the commit GATE: local commits on branch `studio/plan1`. Every commit step in this plan follows this yes.
- [ ] **Step 2: Create the branch `studio/plan1` from `main`,** in its own worktree (superpowers:using-git-worktrees). `main` has uncommitted edits by others; do not stash or touch them.
- [ ] **Step 3: Write `studio/package.json`.** Set `"type": "module"` and `"private": true`, with the six pinned packages. Add the scripts:
  - `"test": "node --test core/test/*.test.ts"`
  - `"typecheck": "tsc --noEmit"`
  - `"dev": "vite --config web/vite.config.ts"`
  - `"build": "vite build --config web/vite.config.ts"`
  - `"preview": "vite preview --config web/vite.config.ts --port 4380 --host 127.0.0.1"`
  - `"export": "node tools/export.mjs"`
- [ ] **Step 4: Write `studio/tsconfig.json`.** Copy `.\stage\tsconfig.json`, then add `"allowImportingTsExtensions": true`. Set `include` to `["core", "web"]`, and drop `jsx`.
- [ ] **Step 5: Run `npm install` in `studio/`.** Expected: six packages added, no audit errors.
- [ ] **Step 5a: Create `studio/ledger/plan1.md`.** Give it one heading per task, and fill in the Task 0 lines (index rule 9). Run `hindsight/recall` with tags `project:Omniverso` and `topic:molecullage-studio`, and note in the ledger which notes you used.
- [ ] **Step 6: Commit** (commit GATE). `git add studio/package.json studio/package-lock.json studio/tsconfig.json studio/README.md`, then `git commit -m "studio: package and settings"`.

### Task 1: World schema

**Files:**
- Create: `studio/core/world.ts`
- Test: `studio/core/test/world.test.ts`

**Interfaces:**
- Produces:
  - `type Level = 'measured'|'published'|'simulated'|'architecture'|'target'`
  - `type Source = { kind: 'doi'|'pdb'|'url'|'file'|'engine'; ref: string }`
  - `type Frame = { id: string; parent: string|null; unit: number /* metres per unit */; origin: [number,number,number] /* in parent units */ }`
  - `type WorldObject = { id: string; kind: 'molecule'|'mesh'|'surface'|'vector'|'text'|'number'|'chart'|'image'|'group'; frame: string; position: [number,number,number]; size: number /* metres */; source: Source; evidence: Level; window: [number,number]; roles: string[]; asset?: string; standIn?: { asset: string; swapAt: number /* camera distance, metres */ } }`
  - `type World = { id: string; duration: number; frames: Frame[]; objects: WorldObject[] }`
  - `validateWorld(input: unknown): { ok: true; world: World } | { ok: false; errors: string[] }`
  - `evidenceError(id: string, source: Source, level: Level): string | null`. It returns the error text for one object, or `null` when the pair is allowed. `validateWorld` calls it for every object. Plans 4 and 6 reuse it; they do not write their own.

**Rules `evidenceError` applies:**
- A source of kind `engine` allows at most `architecture`. The error text is `engine-drawn object "<id>" cannot be <level>`.
- Level `published` needs a source of kind `doi` or `pdb`. The error text is `object "<id>" is published but its source is not a doi or pdb`.
- Every other pair returns `null`.

`validateWorld` also refuses `size <= 0`, with the error `object "<id>" has size <= 0`.

- [ ] **Step 1: Write the failing tests** in `world.test.ts`:
  - `accepts a two-frame world`: a root frame `bench` (unit 1e-3, parent null), a child frame `nano` (unit 1e-9, parent `bench`), and object `igg` (kind `molecule`, source `{kind:'pdb', ref:'1IGT'}`, evidence `published`, window `[0, 10]`, duration 10). Expect `ok === true`.
  - `rejects duplicate ids`: two objects with id `a`. Expect one error containing `duplicate id "a"`.
  - `rejects an unknown frame`: an object in frame `x`. Expect an error containing `unknown frame "x"`.
  - `rejects a frame cycle or two roots`: Expect an error containing `exactly one root frame`, or one containing `frame cycle`.
  - `rejects a window outside the duration`: `window: [8, 12]` with duration 10. Expect an error containing `window`.
  - `caps engine-drawn objects at architecture`: source `{kind:'engine', ref:''}` with evidence `published`. Expect an error containing `engine-drawn object "<id>" cannot be published`.
  - `published needs a doi or pdb source`: source kind `url` with evidence `published`. Expect an error.
  - `rejects size zero or below`: an object with `size: 0`, and another with `size: -1`. Expect an error containing `size <= 0` for each.
  - `evidenceError reports the rules`:
    - `evidenceError('a', {kind:'pdb', ref:'1IGT'}, 'published') === null`;
    - `evidenceError('a', {kind:'engine', ref:''}, 'architecture') === null`;
    - `evidenceError('a', {kind:'engine', ref:''}, 'published')` contains `engine-drawn object "a" cannot be published`;
    - `evidenceError('a', {kind:'url', ref:'x'}, 'published')` contains `not a doi or pdb`;
    - `evidenceError('a', {kind:'engine', ref:''}, 'measured')` contains `cannot be measured`.
- [ ] **Step 2: Run** `node --test core/test/world.test.ts` in `studio/`. Expected: FAIL, because `validateWorld` is not defined.
- [ ] **Step 3: Implement `evidenceError` and `validateWorld`** in `world.ts`. Use zod (installed in `studio/`) for the shape, then run the cross checks: ids, frames, a single root with no cycle, windows, `size > 0`, and `evidenceError` for each object. Collect all errors; do not stop at the first one.
- [ ] **Step 4: Run** the same command. Expected: PASS, 9 tests.
- [ ] **Step 5: Commit** `studio/core/world.ts` and `studio/core/test/world.test.ts` with the message `studio: world schema and checks`.

### Task 2: Timeline and sampling

**Files:**
- Create: `studio/core/timeline.ts`
- Test: `studio/core/test/timeline.test.ts`

**Interfaces:**
- Consumes: `World` (Task 1).
- Produces:
  - `type Ease = 'linear'|'power2.out'|'power2.inOut'|'power3.out'|'sine.inOut'`
  - `type Key = { t: number; v: number | number[]; ease?: Ease }`. `ease` describes the segment that arrives at this key; the default is `power2.inOut`.
  - `type Track = { target: string; prop: string; keys: Key[] }`
  - `type Timeline = { tracks: Track[] }`
  - `ease(name: Ease, x: number): number`, with x clamped to 0..1.
  - `sample(track: Track, t: number): number | number[]`
  - `validateTimeline(tl: Timeline, world: World): string[]` (an empty array means valid)

The ease formulas are the standard ones:
- `power2.out` = 1 − (1 − x)²
- `power2.inOut` = x < 0.5 ? 2x² : 1 − (−2x + 2)²/2
- `power3.out` = 1 − (1 − x)³
- `sine.inOut` = −(cos(πx) − 1)/2

The design and the stage motion standard forbid bounce, elastic and overshoot, so no ease of that kind is offered.

- [ ] **Step 1: Write the failing tests:**
  - `sample holds outside and hits keys exactly`: track keys `{t:1, v:0}`, `{t:3, v:10}`. Assert:
    - `sample(tr, 0) === 0`, `sample(tr, 1) === 0`, `sample(tr, 3) === 10`, `sample(tr, 9) === 10`;
    - `sample(tr, 2) === 5` with ease `linear`.
  - `vector keys interpolate per component`: `[0,0,0]` to `[2,4,6]`, linear, t at midpoint. Assert `[1,2,3]`.
  - `same t gives the same value`: call `sample` 1000 times at t = 1.2345. Assert all results are identical.
  - `each ease maps 0 to 0 and 1 to 1 and rises monotonically` on 101 points.
  - `validateTimeline rejects unknown target, unsorted keys, mixed arity`: one error string for each case.
- [ ] **Step 2: Run** `node --test core/test/timeline.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `ease`, `sample` and `validateTimeline` in `timeline.ts`. `sample` finds the segment by binary search.
- [ ] **Step 4: Run** the test. Expected: PASS, 5 tests.
- [ ] **Step 5: Commit** with the message `studio: timeline data and sampling`.

### Task 3: Nested scale frames, camera-relative

**Files:**
- Create: `studio/core/frames.ts`
- Test: `studio/core/test/frames.test.ts`

**Interfaces:**
- Consumes: `World`, `Frame` (Task 1).
- Produces:
  - `rootOf(world: World, frame: string): { scale: number; offset: [number,number,number] }`. A point p in the frame is `offset + scale·p` in root metres, computed in float64.
  - `type Place = { frame: string; pos: [number,number,number] }`
  - `toCamera(world: World, p: Place, cam: Place): Float32Array`. It returns p minus cam, in metres, computed in float64 and then cast to float32.
  - `convert(world: World, p: Place, toFrame: string): [number,number,number]`

- [ ] **Step 1: Write the failing tests:**
  - `rootOf composes nested frames`. Frames:
    - `bench` (unit 1e-3, root);
    - `tube` (unit 1e-3, origin `[10,0,0]` in bench);
    - `nano` (unit 1e-9, origin `[0,5,0]` in tube).
    Assert that `rootOf(w,'nano').scale` equals 1e-9 within 1e-24, and that the offset equals `[0.010, 0.005, 0]` within 1e-12.
  - `camera-relative stays precise across 7 orders`. Object at nano `[3,0,0]`; camera at nano `[0,0,10]`. Assert:
    - `toCamera` gives `[3e-9, 0, -1e-8]` with relative error below 1e-6;
    - a naive float32 cast of both root positions, followed by subtraction, has relative error above 1e-2. This proves the camera-relative method is needed.
  - `convert round-trips`: nano to bench and back. Assert the error is below 1e-9 of the input.
- [ ] **Step 2: Run** `node --test core/test/frames.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `rootOf`, `toCamera` and `convert` in `frames.ts`. Do all the arithmetic in plain JS numbers (float64). Cast with `Float32Array.from` only at the end of `toCamera`.
- [ ] **Step 4: Run** the test. Expected: PASS, 3 tests.
- [ ] **Step 5: Commit** with the message `studio: nested scale frames, camera-relative`.

### Task 4: Camera paths, deep zoom and the stand-in swap

**Files:**
- Create: `studio/core/camera.ts`
- Test: `studio/core/test/camera.test.ts`

**Interfaces:**
- Consumes: `toCamera`, `convert` (Task 3); `ease` (Task 2).
- Produces:
  - `type CameraKey = { t: number; at: Place; target: Place; fov: number; ease?: Ease }`
  - `type CameraPath = { id: string; kind: 'deck'|'film'|'poster'|'web'; keys: CameraKey[]; stops: number[] /* times */ }`
  - `cameraAt(world: World, path: CameraPath, t: number): { at: Place; target: Place; fov: number; distance: number /* metres */ }`
  - `stopIndexAt(path: CameraPath, t: number): number`
  - `swapAlpha(distance: number, swapAt: number): number`. It returns 0 for the exact asset and 1 for the stand-in.

**The algorithm that the tests do not fix:**
- Between two keys, convert both camera places and both targets into the frame of the later key's target.
- Interpolate the target position linearly with the eased time.
- Interpolate the camera's distance to its target in log space: d = exp(lerp(ln d0, ln d1, e)).
- Interpolate its direction with a normalised lerp.
- The result's `at.frame` is the later key's target frame from mid-segment on, and the earlier key's before.
- `swapAlpha` is a smoothstep of ln(distance/swapAt) over [−ln 2, +ln 2]. The swap therefore fades across a factor of 4 in distance, centred on `swapAt`.

- [ ] **Step 1: Write the failing tests:**
  - `zoom distance is continuous at a frame change`.
    - Key 1 at t = 0 has its camera 0.05 m from the tube in frame `bench`. Key 2 at t = 4 has its camera 20 nm from `igg` in frame `nano`. Ease is `linear`.
    - Sample 401 points. Assert that ln(distance) changes by less than 0.1 between neighbours.
    - Assert that distance(0) = 0.05 within 1e-9, and that distance(4) = 2e-8 within 1e-15.
  - `zoom distance is logarithmic`: at t = 2, assert that distance equals sqrt(0.05 · 2e-8) within 1%.
  - `stopIndexAt` with stops `[0, 4, 8]`. Assert: t = 3.9 gives 0, t = 4 gives 1, t = 100 gives 2.
  - `swapAlpha` with swapAt 1e-6. Assert:
    - 0 at 2.5e-7 and below;
    - 1 at 4e-6 and above;
    - 0.5 at 1e-6 within 1e-9;
    - the value never decreases as distance grows.
- [ ] **Step 2: Run** `node --test core/test/camera.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `cameraAt`, `stopIndexAt` and `swapAlpha` in `camera.ts`, as the algorithm above describes.
- [ ] **Step 4: Run** `npm test`. Expected: PASS, all tests of Tasks 1–4.
- [ ] **Step 5: Commit** with the message `studio: camera paths, log zoom, stand-in swap`.

### Task 5: Lenses and the readability guard

**Files:**
- Create: `studio/core/lens.ts`, `studio/lenses/journal.json`, `studio/lenses/cinematic.json`
- Test: `studio/core/test/lens.test.ts`

**Interfaces:**
- Consumes: `WorldObject` (Task 1), `Ease` (Task 2).
- Produces:
  - `type RoleStyle = { color: string /* #rrggbb */; metalness: number; roughness: number; opacity?: number; asset?: string /* asset swap per role */ }`
  - `type Lens = { id: string; background: string; text: { family: string; color: string; minPx: number }; radius: number /* px */; line: number /* px at 1920 */; feel: { ease: Ease; speed: number }; roles: Record<string, RoleStyle> }`
  - `resolve(obj: WorldObject, lens: Lens): RoleStyle`. It takes the first of `obj.roles` that the lens styles.
  - `contrast(a: string, b: string): number`, the WCAG 2 contrast ratio.
  - `checkLens(lens: Lens): string[]`

**The two lenses (Claude's call; spec 9 presets 4 and 6):**
- `journal`: white background `#FFFFFF`; text `#0A0A0A` in Arial; radius 4; line 2.5; feel `power2.out`, speed 1. Roles: `plastic`, `antibody`, `gold`, `strip`, `label`, with colours from `.\tokens\` (read only).
- `cinematic`: background `#0B0D12`; text `#F2F2F2` in Geist; radius 14; line 2; feel `sine.inOut`, speed 0.8. The same roles, with `gold` at metalness 1 and roughness 0.25.

- [ ] **Step 1: Write the failing tests:**
  - `resolve picks the first styled role`: an object with roles `['ab-heavy','antibody']` and a lens that styles only `antibody`. Expect the antibody style.
  - `resolve names the missing role`: roles `['enzyme']`. Expect a throw whose message contains `no style for roles [enzyme] in lens "journal"`.
  - `contrast` gives 21 for `#000000` against `#FFFFFF` within 0.01, and 1 for a colour against itself.
  - `checkLens flags small text and low contrast`: minPx 30 gives an error containing `37`; text `#777777` on `#888888` gives an error containing `4.5`.
  - `both shipped lenses pass checkLens and style the same roles`: load both JSON files. Assert that `checkLens` returns an empty array, and that their role keys are equal sets.
- [ ] **Step 2: Run** `node --test core/test/lens.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `lens.ts` and write the two JSON files.
- [ ] **Step 4: Run** the test. Expected: PASS, 5 tests.
- [ ] **Step 5: Commit** with the message `studio: lenses and readability guard`.

### Task 6: Job file and slide layout layer

**Files:**
- Create: `studio/core/job.ts`
- Test: `studio/core/test/job.test.ts`

**Interfaces:**
- Consumes: `validateWorld` (Task 1), `validateTimeline` (Task 2), `CameraPath` (Task 4), `Lens` and `checkLens` (Task 5).
- Produces:
  - `type Block = { id: string; role: 'title'|'label'|'note'; text: string; box: [number,number,number,number] /* x,y,w,h in px at 1920×1080 */ }`
  - `type StopLayout = { stop: number; lang: 'en'|'ru'; blocks: Block[] }`
  - `type Job = { world: World; timeline: Timeline; paths: CameraPath[]; lens: string; langs: ('en'|'ru')[]; layout: StopLayout[]; notes: Record<number, Partial<Record<'en'|'ru', string>>> }`
  - `loadJob(input: unknown, lenses: Record<string, Lens>): { ok: true; job: Job } | { ok: false; errors: string[] }`

`loadJob` is pure. It runs in the browser as well as in Node, so it reads no files and no environment. It checks the world, timeline, paths, lens and layout only. Later plans' content checks (brief, facts, story) do not run inside it; they run only in `tools/check.mjs`.

- [ ] **Step 1: Write the failing tests:**
  - `loads a valid job`: one deck path with 2 stops, langs `['en','ru']`, and a layout for each stop in both languages.
  - `every stop needs every language`: the Russian layout of stop 1 is missing. Expect an error containing `stop 1 has no ru layout`.
  - `boxes stay inside the 1920x1080 safe area`: the safe margin is 48 px. A box at x = 1900 gives an error naming the block id.
  - `unknown lens`: lens `poster`. Expect an error containing `unknown lens "poster"`.
  - `collects errors from world and timeline`: a bad world and a bad timeline together. Expect both errors in one result.
- [ ] **Step 2: Run** `node --test core/test/job.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `loadJob` in `job.ts`. It runs every check and returns all the errors.
- [ ] **Step 4: Run** `npm test` and `npm run typecheck`. Expected: all tests PASS, and no type errors.
- [ ] **Step 5: Commit** with the message `studio: job file and per-language layout layer`.

### Task 7: Live renderer and the deep-zoom test scene

**Files:**
- Create:
  - `studio/web/vite.config.ts`
  - `studio/web/index.html`
  - `studio/web/renderer.ts`
  - `studio/web/assets.ts`
  - `studio/jobs/zoom-test/job.json`
  - `studio/jobs/zoom-test/make_igg_glb.cxc`
  - `studio/tools/browser.mjs`
  - `studio/tools/pixels.test.mjs`
- Produced asset (committed): `studio/jobs/zoom-test/igg.glb`

**Interfaces:**
- Consumes: `loadJob` (Task 6), `cameraAt` and `swapAlpha` (Task 4), `toCamera` (Task 3), `sample` (Task 2), `resolve` (Task 5).
- Produces:
  - `createStage(canvas: HTMLCanvasElement, job: Job, lens: Lens, path: string, assets: Map<string, THREE.Object3D>): Stage`
  - `type Stage = { seek(t: number): Promise<void>; duration: number; stops: number[]; lang: 'en'|'ru' }`
  - `window.__studio: { seek(t: number): Promise<void>; duration: number; stops: number[]; ready: Promise<void> }`. Its shape matches `.\stage\SPEC.md` 2, so the export tools work alike.
- `launch(): Promise<Browser>` in `studio/tools/browser.mjs`. It starts headless Chrome through playwright-core with software WebGL 2. **Every playwright test and tool in Plans 1 to 9 gets its browser from this function.** Nobody calls `chromium.launch` anywhere else. The code is copied from `.\film\tools\render.mjs` (read only, line 47):
  ```js
  import fs from 'node:fs';
  import { chromium } from 'playwright-core';
  const chromePath = () => {
    const c = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
      '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
    const p = c.find((x) => x && fs.existsSync(x));
    if (!p) throw new Error('Chrome not found. Set CHROME_PATH to the Chrome or Chromium executable.');
    return p;
  };
  export const launch = () => chromium.launch({ executablePath: chromePath(), headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'] });
  ```
  The one change from `render.mjs`: a missing Chrome throws an error. `render.mjs` exits the process instead.
- The page query of `index.html`: `?job=<id>&lens=<id>&lang=<en|ru>&path=<id>`.
  - `job` defaults to `zoom-test`.
  - `lens` defaults to `job.lens`.
  - `lang` defaults to the first of `job.langs`.
  - `path` defaults to the first path of kind `deck`.
  - Every id must match `^[a-z0-9-]{1,40}$` (`lang` must be `en` or `ru`). If one does not, the page shows the text `bad job id` and stops. It loads nothing.
- `studio/web/vite.config.ts`, the one Vite config of the whole Studio. Later plans only add to it.
  - `root` is the `web` folder, and `base` is `'./'`.
  - `build.outDir` is `web/dist`, and `build.rollupOptions.input` lists `index.html` (later plans add their pages to this list).
  - `server.fs.allow` is `['..']`.
  - A small plugin `studioFiles()` serves `/jobs/`, `/lenses/` and `/cache/` from `studio/jobs`, `studio/lenses` and `studio/cache`, in both dev and preview (`configureServer` and `configurePreviewServer` middleware). It reads the file on each request, so a newly appended `edits.jsonl` is served at once.

**What the scene holds (`zoom-test/job.json`):**
- Frames:
  - `bench` (mm, root);
  - `tube` (mm, inside bench);
  - `nano` (nm, inside tube).
- `tube`: a mesh made by `THREE.LatheGeometry` from an approximate 0.2 mL tube profile, with source `engine` and evidence `architecture`. The profile is about 20 mm tall with an outer rim of about 6 mm. It has no manufacturer drawing yet; Plan 2 replaces it.
- `igg`: antibody 1IGT, as a molecular surface mesh. Source `{kind:'pdb', ref:'1IGT'}`, evidence `published`. Its stand-in is a sphere 15 nm across, with `swapAt` = 2e-7 m.
- `gold-1` … `gold-5`: spheres 40 nm across, source `engine`, evidence `architecture`.
- `liquid` (added 2026-10-31, the owner said yes): a closed body of liquid in the bottom of the tube (a lathe of the inner wall up to a surface at y = −4 mm, `builtin:liquid`, role `liquid`, source `engine`, evidence `architecture`). Without it, the frames between 1.6 s and 5.8 s show only empty liquid and the "no frame is blank" test cannot pass. The `nano` frame origin is `[0,-9,0]` (tube mm), 9 mm below the tube centre near the tip, so the walls stay inside the far plane while the camera zooms in.
- `buffer-01` … `buffer-80` (added 2026-10-31 after the owner's feedback on stop 2): small spheres, 12 to 28 nm across, role `protein`, source `engine`, evidence `architecture`, window `[0, 12]`. They are sampled decoration, not data. Their positions come from `studio/jobs/zoom-test/make_crowd.mjs` (seeded, written once into `job.json`). Each has an `opacity` track that fades it from 1 at t = 5.5 to 0 at t = 7, so stop 3 stays clean. Plan 2's `copies` replaces them.
- Duration 12 s. One deck path `deck` with keys at t = 0, 4 and 8, and stops `[0, 4, 8]`:
  1. key 0 (t = 0): the camera is 0.05 m from the tube (frame `bench`);
  2. key 4 (t = 4): the camera is 2 µm inside the liquid (frame `tube`);
  3. key 8 (t = 8): the camera is 30 nm from `igg` (frame `nano`).
  The distances are camera-to-target distances. Keys 4 and 8 take the `igg` position as target; key 0 takes the tube centre.
- The timeline holds two tracks:
  - track 0: `{ target: 'gold-1', prop: 'position', keys: [{t:0, v:[0,0,0]}, {t:8, v:[40,0,0]}] }`, values in nm (frame `nano`);
  - track 1: `{ target: 'igg', prop: 'opacity', keys: [{t:6, v:0}, {t:8, v:1}] }`.
- Russian and English titles at each stop.
- Later plans' tests rely on these exact values (path keys 0, 4, 8; seek t = 5.0; track keys path `/timeline/tracks/0/keys/1`). Do not change them.

**Renderer rules:**
- `THREE.WebGLRenderer` with `{ antialias: true, preserveDrawingBuffer: true, logarithmicDepthBuffer: true }`.
- The camera always sits at the origin. Each object's position comes from `toCamera` every frame.
- The near plane is `distance/1000`. The far plane is `distance·1e6` (changed 2026-11-01): a closed container such as the liquid must stay in view while the camera is deep inside it, or the medium vanishes in one frame. The depth buffer is logarithmic.
- Render units are camera distances: one unit is the distance from the camera to its target.
- Glass and liquid (roles with `transmission`) use `MeshPhysicalMaterial`, do not write depth, and refract the lens backdrop. The backdrop is a soft screen-fixed gradient made from the lens colours (a light pool on a dark lens, darker edges on a light lens). Among glass objects, a later object in the job's list draws over an earlier one, so list the liquid after its tube.
- Opacity of the exact asset and its stand-in comes from `swapAlpha`.
- Layout blocks are absolutely positioned HTML over the canvas. They are scaled by one CSS transform from 1920×1080.
- **Text size ladder by block role,** at 1920 px wide (the ladder in `.\stage\SPEC.md` section 3): `title` 51 px, `label` 42 px, `note` 37 px. The block's CSS `font-size` is that number in layout pixels. The size scales only with the 1920×1080 transform. The lens `text.minPx` (37) stays the lower limit.
- Every layout block element carries `data-block="<block id>"`. Later plans find blocks by this attribute. Any world object that the page draws or lets the owner pick as DOM (the vectors of Plan 4) carries `data-id="<object id>"`.

- [ ] **Step 1: Make the antibody mesh.** Run ChimeraX headless:
  `"C:\Program Files\ChimeraX 1.10.dev202504170618\bin\ChimeraX-console.exe" --nogui --script studio/jobs/zoom-test/make_igg_glb.cxc`
  The script opens `.\data\pdb\1IGT.pdb` (read only, absolute path), runs `surface resolution 6`, and saves `igg.glb` with `save igg.glb`.
  Expected: `igg.glb` exists and is under 15 MB.
- [ ] **Step 2: Write the failing pixel tests** in `studio/tools/pixels.test.mjs`. Use `node:test` and `launch()` from `studio/tools/browser.mjs` (which does not exist yet), against `npm run preview` on 127.0.0.1:4380.
  - `browser launches with WebGL 2`: start a browser with `launch()`, open a blank page, and evaluate `!!document.createElement('canvas').getContext('webgl2')`. It must be `true`.
  - The test reads the job id from `process.env.STUDIO_JOB`, with the default `zoom-test`. It opens `index.html?job=<id>`, and reads the expected stop count from `jobs/<id>/job.json`.
  - `stage is ready and reports the job's stops`: 3 for zoom-test.
  - `same t gives the same pixels`: seek 2.0 twice on one page. The SHA-256 of `canvas.toDataURL()` must be equal.
  - `seek back gives the fresh-page pixels`: on page A, seek 6, then 1. On a fresh page B, seek 1. The hashes must be equal.
  - `no frame is blank across the zoom`: seek 61 points over the duration. Every frame must have more than 2% of its pixels differing from the background.
  - `stand-in fades in, never pops`: read `swapAt` from the first object that has `standIn` in the current job (`jobs/<id>/job.json`). Use three distances: `swapAt/2`, `swapAt` and `swapAt·2`. Use the page-default path, and the consecutive key pair whose camera-distance range contains `swapAt/2`, `swapAt` and `swapAt·2`. If no pair contains all three, the test fails with `stand-in distances not reached`. For each distance, find the time t inside that key pair where the camera distance equals it. Do this in the test with `cameraAt` from `core/camera.ts` and a bisection. Seek the page to each t. The mean pixel change between neighbouring frames must stay below 25%. For zoom-test, `swapAt` is 2e-7, so the distances are 1e-7, 2e-7 and 4e-7. Keys 4 and 8 (2 µm and 30 nm from `igg`) contain all three.
  - `bad job id shows an error`: open `index.html?job=Bad_ID!`. The page text contains `bad job id`, and `window.__studio` is undefined.
  - `layout blocks carry data-block`: for the current stop and language, every block listed in `jobs/<id>/job.json` has an element `[data-block="<block id>"]` in the page.
  - `block text sizes follow the role ladder`: for every block of the current stop, the computed `font-size` of its element is `51px` for `title`, `42px` for `label` and `37px` for `note`.
- [ ] **Step 3: Run** `npm run build`, then `npm run preview` in the background, then `node --test tools/pixels.test.mjs`. Expected: FAIL, because there is no `browser.mjs` and no stage.
- [ ] **Step 4: Implement** `tools/browser.mjs` (the code in the Interfaces block), `web/vite.config.ts` (as in the Interfaces block), `renderer.ts` (`createStage`), `assets.ts` (a glTF loader, plus the lathe and sphere builders) and `index.html`. The page reads the query `?job=<id>&lens=<id>&lang=<en|ru>&path=<id>` with the defaults and the id check from the Interfaces block. It loads `jobs/<id>/job.json` through the `studioFiles()` plugin, and sets `window.__studio`. Block text sizes follow the ladder in the Renderer rules.
- [ ] **Step 5: Run** `npm run build` again, then the pixel tests. Expected: PASS, 9 tests.
- [ ] **Step 5b: Look and composition pass** (added 2026-10-31 after the owner rejected the first stills: "bad coloring and composition", "badly designed text headers", gold sphere cut off at stop 3, too much empty space at stop 2, "I cannot control the camera"). the owner chose the look: **dark and glossy, like an Apple launch film.** Make these changes, then rerun the 9 pixel tests (they must still pass):
  - Lens `cinematic` becomes the dark glossy look: background `#050507`, text `#F5F5F7`, low roughness, a cool rim light behind the subject, glass-like tube, deep blue liquid. Keep its 12 roles and `gold` at metalness 1, roughness 0.25. The job's default `lens` becomes `cinematic`. The `journal` lens keeps its calm look.
  - Text headers: the block stack sits at the lower left (title, label, note), clear of the subject. Title weight 700 with tight letter spacing. Label and note use the same colour at 70% and 55% (contrast stays above 4.5:1). The font sizes of the role ladder do not change.
  - Stop 3 (corrected 2026-11-01 after the owner: "an antibody cannot be inside a gold particle; it is coated with antibodies"; I had not checked the references): antibodies form a coat on the surface of the gold particle. The references are in `studio/jobs/zoom-test/REFERENCES.md` (Zhang 2019, doi 10.1016/j.talanta.2019.05.104, about 4 IgG per 15 nm particle, measured; Zhang 2020, doi 10.1016/j.bios.2020.112370; Conrad 2023, doi 10.1007/s00604-023-05637-x). `igg` now carries a `position` track that moves with `gold-1` and ends in contact with its surface: `[0,0,0]` at t = 0 and `[16,0,0]` at t = 8 (gold centre 40 nm minus a contact distance of 24 nm). The camera keys follow `igg`: key 4 target nano `[8,0,0]`, key 8 target nano `[16,0,0]`, key 8 `at` nano `[-14,0,0]` (30 nm from `igg`, from the −x side) and `fov` 62. Three more antibodies, `coat-01` … `coat-03` (same asset, stand-in and `opacity` track as `igg`, evidence `architecture`, an own `rotation`), sit on the same surface 30° around `igg` and move with `gold-1`. The number and the orientation are an illustration. `WorldObject` gets the optional field `rotation?: [number, number, number]` (Euler XYZ, radians). `gold-1` keeps its values from "What the scene holds".
  - Rule for every scene (added 2026-11-01): before a scene shows a real object, read the references for how it is built, put the sources in a `REFERENCES.md` beside the job, and mark what is an illustration.
  - Stop 2: the 80 `buffer` spheres of "What the scene holds" fill the liquid view.
  - Show the new stills to the owner again. The go/no-go of Step 6 comes after this step.
- [ ] **Step 5c: Material library and real light** (added 2026-11-01). the owner, on the second set of stills: "it does not even look like liquid. Maybe you will compose a database of materials, textures, ready models and fuse them in the engine." He said yes to the two downloads below, and to doing this before the deck player. The liquid looked wrong because it was a flat see-through tint. Real liquid and glass refract and mirror a real light, so this step adds real light from a library and a refracting material.
  - The library is the folder `studio/library/` with `manifest.json`. Each asset has `id`, `kind` (`hdri` for now), `file`, `name`, `author`, `source` (page URL), `download` (file URL), `licence` (SPDX; only `CC0-1.0` or `CC-BY-4.0` are allowed), `bytes`, `md5` and `fetched` (date). First two assets, both Poly Haven, CC0, 13 MB in all: `hdri-studio-small-09` (`hdri/studio_small_09_2k.hdr`, 6,312,947 bytes, md5 `b056fea247bc84b81d2e0987d44c87d8`, Sergej Majboroda) and `hdri-studio-small-03` (`hdri/studio_small_03_2k.hdr`, 6,673,807 bytes, md5 `ec6591c2a18e9bbb27206b99b28dade5`, Greg Zaal).
  - Test first, `studio/tools/library.test.mjs`: every manifest entry has all fields; its licence is allowed; its file exists with the stated size and md5; every `environment.hdri` of a lens in `studio/lenses/` is a manifest id.
  - `studio/tools/library.mjs fetch` downloads only the manifest files that are missing, then checks size and md5. It is the project's own checked download (curl and wget are blocked by house rules). It runs only for files the owner said yes to.
  - `Lens` gets the optional field `environment?: { hdri: string /* a manifest id */; intensity: number }`. `RoleStyle` gets the optional fields `transmission?: number`, `thickness?: number` (a fraction of the object's size), `attenuation?: { color: string; distance: number /* a fraction of the object's size */ }` and `emissive?: { color: string; intensity: number }` (a faint glow from inside, so clear liquid shows on a dark stage). They are look choices of the lens and carry no evidence level. `checkLens` checks them (transmission 0 to 1, colours `#rrggbb`, distances above 0). The refractive index stays at the three.js default until Plan 2's sourced presets set it.
  - Renderer: the HDRI (loaded with `RGBELoader`, then `PMREMGenerator`) replaces the built-in room. `createStage` gets the optional 6th parameter `environment?: THREE.Texture`. A role with `transmission` becomes a `MeshPhysicalMaterial`; its attenuation distance is divided by the camera distance each frame (render units are camera distances). `vite.config.ts` serves `/library/` from `studio/library`.
  - Lenses: `cinematic` uses `hdri-studio-small-03` (more contrast), `journal` uses `hdri-studio-small-09` (soft). `plastic` and `liquid` get `transmission`; `liquid` also gets `attenuation`, `emissive` and roughness 0.28. Rerun the 9 pixel tests, then show new stills.
  - The "no frame is blank" test now compares each frame with an empty stage that has the same lens and backdrop: the job `studio/jobs/stage-test/job.json` (no objects, one deck path with one stop). A frame is blank when 2% or less of its pixels differ from that reference. The software browser draws the glass slowly: this test takes about 4 minutes.
- [ ] **Step 5d: Grounded source policy, source index and search** (added 2026-11-01). the owner: "No dimensions! 3D models of PCR tubes exist. Make a references DB." Then: "make it a grounded policy within the engine workflow, list all the possible sources, index them and make a machinery for the search." This joins his source policy of 2026-10-19 (read every source in full text; an abstract is not evidence; no full text means ungrounded) and his licence policy of 2026-10-30. It is built in `studio/library/` and `studio/tools/`:
  - `library/POLICY.md` holds the ten rules. `library/references.json` holds the chosen or considered items, each with `licence`, `status` and `grounding` (`full-text`, `primary-data`, `abstract-only`, `not-obtained`, `n/a`). `library/sources.json` is the index of 227 sources (assets, models, vectors, structures, papers, schematics, tools), built by `node tools/build-sources.mjs` from the research tables R1, R2, R4, R5 and R6 and from `library/sources.extra.json`.
  - `node tools/search.mjs <words> [--kind k] [--class c] [--usable] [--no-login] [--status s] [--grounded] [--limit n]` searches both offline. `--live pubmed,sketchfab,polyhaven,rcsb` lists candidates from open services and downloads nothing; `--add` records them as candidates with `grounding: not-obtained`.
  - Tests: `tools/references.test.mjs` (fields; an unknown licence is never approved; only a grounded entry may carry values; a full-text entry says where and when it was read; every PDB or DOI object of every job has a grounded entry), `tools/sources.test.mjs`, `tools/search.test.mjs` (offline ranking and filters; every connector with a fake response shaped like the real one).
  - Gap found while building it: the two gold-antibody papers I first cited were read only as abstracts, so they are ungrounded. Conrad 2023 (full text, PMC9859872) is the grounded source for the antibody coat (random orientation, 14.5 × 8.5 nm footprint, room for 40 antibodies on a 40 nm particle, by the authors' calculation).
  - Open: the PCR tube model itself. The real CAD models are on 3D ContentCentral and GrabCAD; both need an account, which only the owner can make. Until a model is read, the tube stays a placeholder and no tube numbers are claimed.
- [ ] **Step 6: Show the owner three stills,** one at each stop, in both lenses, and keep the live page open in the browser pane. Send the files to the owner (with the file-sending tool if you have one; otherwise give their full paths). This is the design's go/no-go for the deep zoom (spec 15). If he rejects the zoom, stop and revise the plan before Task 8. (The tube and liquid are not photoreal here on purpose: Plan 2 makes the exact tube and materials, Plan 3 the photoreal frames.)
- [ ] **Step 7: Commit** the web files, `studio/tools/browser.mjs`, the zoom-test job and `igg.glb`, with the message `studio: live renderer and deep-zoom test scene`.

### Task 8: Deck player

**Files:**
- Create: `studio/web/deck.ts`
- Modify: `studio/web/index.html` (mount the player)
- Test: `studio/tools/deck.test.mjs`

**Interfaces:**
- Consumes: `Stage` (Task 7), `stopIndexAt` (Task 4), `Job.notes` (Task 6).
- Produces: `mountDeck(stage: Stage, job: Job, root: HTMLElement): { next(): void; prev(): void; goto(stop: number): void; t(): number }`. The player is the only place where t advances in real time.

**Keys:**
- Next: Right, PageDown, Space and Enter. Previous: Left and PageUp.
- If a move between stops is still running, the first press finishes it at the stop. It does not jump to the next stop (lesson from the v2 deck, `build_v3.mjs`).
- `P` opens a presenter window with the current stop, the next stop, the notes for the current language, and a timer.
- `L` switches between English and Russian.
- On-screen controls (added 2026-10-31, because the owner said "I cannot control the camera"): a small bar at the bottom edge with a Back button, a Next button, a time slider that scrubs the whole path, and an EN/RU button. The bar shows when the mouse moves and hides after 3 seconds without movement, and it is not part of the exported frames. Dragging the camera freely comes with Plan 5.

- [ ] **Step 1: Write the failing tests** in `deck.test.mjs`. The tests get their browser from `launch()` in `studio/tools/browser.mjs`.
  - `next during a move finishes the move`: press Right, wait 100 ms, press Right. Assert the stop index is 1 and t equals `stops[1]`.
  - `PageDown and Enter step like Right`.
  - `prev at stop 0 stays at 0`.
  - `L switches the layout language`: the title text changes from the English string to the Russian string in `job.json`.
  - `presenter window shows notes for the current stop`.
- [ ] **Step 2: Run** `npm run build`, then `npm run preview` in the background (skip if it already runs), then `node --test tools/deck.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `mountDeck` in `deck.ts`. Use `requestAnimationFrame` in this file only. Each tick calls `stage.seek(t)`.
- [ ] **Step 4: Run** `npm run build` again, then the deck and pixel tests. Expected: PASS.
- [ ] **Step 5: Commit** with the message `studio: deck player with presenter view`.

### Task 9: MP4 export and the export checks

**Files:**
- Create: `studio/tools/export.mjs`, `studio/tools/checks.mjs`
- Test: `studio/tools/export.test.mjs`

**Interfaces:**
- Consumes: `window.__studio` (Task 7); the layout blocks in the page (Task 6, 7).
- Produces:
  - The command `npm run export -- <job> --lens <id> --lang <en|ru> --path <id> --fps 30 --workers 2`. It writes `studio/out/<job>-<lens>-<lang>.mp4` and `studio/out/<job>-<lens>-<lang>.checks.json`.
    - `--lens`, `--lang` and `--path` default as the page query does: `job.lens`, the first of `job.langs`, and the first path of kind `deck`.
    - The command passes the three values to the page in the query `index.html?job=<job>&lens=<id>&lang=<l>&path=<id>`. The page is served by `npm run preview` (run `npm run build` first).
  - `checkPage(page): Promise<{ id: string; lang: string; kind: 'overflow'|'small-text'|'offscreen'; detail: string }[]>`

**How it works:**
- Each worker gets its browser from `launch()` in `studio/tools/browser.mjs` (never `chromium.launch`), opens its own page and takes a contiguous slice of frames, so a frame never depends on an earlier frame.
- PNG frames go to `studio/out/frames/`. ffmpeg joins them with `-c:v libx264 -pix_fmt yuv420p -crf 18`.
- The checks run at every stop: block overflow (`scrollHeight > clientHeight + 1`), computed font size below the lens `minPx`, and any block outside the viewport.

- [ ] **Step 1: Write the failing tests** in `export.test.mjs`:
  - `exports an mp4 of the right length`: zoom-test job, journal lens, en, 10 fps. Assert the file exists and ffprobe reports a duration equal to the job duration within 0.2 s.
  - `two workers give the same frames as one`: hash frame 17 from a 1-worker run and from a 2-worker run. Assert they are equal.
  - `flags Russian overflow`: a test job copy where the Russian title of stop 2 is three times longer than its box. Assert `checks.json` holds `{ id: '<title id>', lang: 'ru', kind: 'overflow' }`.
  - `clean job has no findings`: the zoom-test job in both languages gives an empty findings list.
  - `flags pass through to the page`: run `--lens cinematic --lang ru --path deck --fps 2`. Assert that `zoom-test-cinematic-ru.mp4` exists, and that the page URL the export opened holds `lens=cinematic&lang=ru&path=deck`.
- [ ] **Step 2: Run** `node --test tools/export.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `export.mjs` and `checks.mjs`.
- [ ] **Step 4: Run** `npm test`, `npm run typecheck` and all the `tools/*.test.mjs` files. Expected: all PASS.
- [ ] **Step 5: Write `studio/README.md`.** Explain what Plan 1 built, how to run a job, how to export, and the evidence rule. Use plain words, and keep it under 80 lines.
- [ ] **Step 6: Commit** with the message `studio: MP4 export and export checks`.

### Task 10: Hand-over

- [ ] **Step 1: Run a fresh-reader check.** A fresh agent sees only the exported MP4 stills, one per stop. It answers the three questions of `qa/blind_read.md`. Fix every item of questions 2 and 3, then export again.
- [ ] **Step 2: Retain one Cammut note** with the result: tests passed, the go/no-go outcome, and the blind-read outcome. Use the tags `["project:Omniverso","date:YYYY-MM-DD","source:claude-code","topic:molecullage-studio"]`. Check it with `get_operation`, then read it back.
- [ ] **Step 3: Check the ledger.** `studio/ledger/plan1.md` must hold four lines for every task (index rule 9).
- [ ] **Step 4: Update the index.** In section 2, make the Plan 1 names match the code exactly. Change a name only if the code differs, and note each change in the ledger.
- [ ] **Step 5: Tell the owner what works.** Say what is left for Plan 2, and which branch holds the work. Send the MP4 to the owner (with the file-sending tool if you have one; otherwise give its full path). Do not push.
