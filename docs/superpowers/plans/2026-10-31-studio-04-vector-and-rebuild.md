<!-- version: p4 | date: 2026-10-31 | status: draft for the owner's review -->
# Molecullage Studio, Plan 4: the vector layer and raster rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add named vector objects (paths, shapes, arrows, labels, images, groups) to the world and draw them as an SVG layer that follows t. Play their motion through GSAP from our own timeline data. Then rebuild a raster picture as world and vector objects in a scratch job, and score the rebuild against the original.

**Architecture:**
- `studio/core/vector.ts` holds the vector schema and its checks. It is pure TypeScript, tested with `node --test`.
- `studio/web/vector.ts` draws one SVG layer over the canvas.
  - A vector object with `frame: null` is flat, in slide pixels at 1920×1080.
  - A vector object with a frame is projected through the 3D camera with a new `Stage.project`.
- `studio/web/gsap-player.ts` turns our `Track` data into one paused GSAP timeline and sets it with `tl.time(t, true)`. Our data stays the source of truth: a test checks GSAP against `sample()`.
- The rebuild tools in `studio/tools/rebuild/` do the rest:
  1. read: the agent writes `reading.json`, and a schema checks it;
  2. trace: vtracer, only on the regions marked `trace: true`;
  3. assemble: write the scratch job (never an existing pilot job);
  4. score: render the rebuild, then compute the overlay score in Python. Both pictures are letterboxed into 1920×1080 first, so any picture shape works.

**Tech Stack:**
- Everything from Plan 1.
- gsap 3.15.0 with DrawSVGPlugin. The version is read from `.\stage\package-lock.json` (`node_modules/gsap` resolves to 3.15.0).
- zod and playwright-core at the versions Plan 1 pinned (no new install). Every playwright test and tool starts its browser with `launch()` from `studio/tools/browser.mjs` (made in Plan 1 Task 7); do not write another launch call.
- vtracer, the Python package, MIT, at the exact version approved at the gate.
- Python 3 with Pillow and numpy (already used by the tools in `.\film\tools\`).
- ChimeraX 1.10, for flat structure renders.

**Spec:** `docs/superpowers/specs/2026-10-31-engine-design.md`, sections 8 and 14 (approved by the owner on 2026-10-31). Index and executor rules: `docs/superpowers/plans/2026-10-31-studio-00-index.md`.

## Global Constraints

- Every Global Constraint of Plan 1 applies here unchanged.
- GSAP is a player only. No GSAP object is saved, and nothing reads state back from GSAP into the job (design 14).
- GSAP 3.15.0 is used under the GSAP Standard Licence. The studio must not offer a no-code visual animation builder to outside users with it (design 14). Plan 4 adds no editor.
- The tracer runs only on parts with `kind` `shape` or `texture` and `trace: true`. Diagrams are rebuilt as named objects (design 8, 14).
- A rebuilt object takes the source and evidence level of the original picture. An object the engine adds on its own is capped at `architecture` (design 6).
- Folders outside `studio/` are read only, by absolute path: `.\stage\`, `...\data\pdb\`, `...\film\`, `...\tokens\`. Never use a relative path to them.
- Every commit step needs the commit yes from Task 0 Step 1. Without it, stop before committing.
- A rebuild only writes a scratch job (`"rebuild": true` in its `job.json`). It never overwrites a pilot job.
- Score metric (fixed here):
  - Letterbox each picture into 1920×1080: scale it by `s = min(1920/w, 1080/h)` with Pillow LANCZOS, centre it, and pad with the lens background colour (`journal`: `#FFFFFF`). The poster job of Task 6 places the picture with the same `s` and offset, so the rebuild render is already 1920×1080. Then convert to grey (Pillow mode `L`).
  - `mad_score = 1 − mean(|A − B|) / 255`.
  - `edge_iou = |EA ∩ EB| / |EA ∪ EB|`, where E is the set of pixels whose Sobel magnitude exceeds 64. If both sets are empty, `edge_iou = 1`.
- The pass level of the score is not set by this plan. the owner sets it after he sees the scores of his five mock-ups (Task 8).
- Every SVG element from the vector layer carries `data-id="<object id>"`. Every layout block element carries `data-block="<block id>"`. Plan 5 relies on both.

## Review Focus

1. **A reading box that runs outside the picture.** The reading check names the part id and the picture size. Pinned in Task 4 (`rejects a box outside the image`).
2. **A traced region that yields no paths,** such as a blank crop. The part becomes an empty group, and the assemble report lists a `no-paths` finding. It does not crash. Pinned in Task 5 (`blank region gives an empty group and a finding`).
3. **An original of another shape (portrait, square, very wide).** Both pictures are letterboxed into 1920×1080 with the same scale and offset. Neither is stretched. A rebuild image that is not 1920×1080 stops the score with an error naming both sizes. Pinned in Task 6 (`letterbox of 1200x800`) and Task 7 (`test_letterbox_portrait`, `test_rebuild_size`).
   Also: a rebuild may not overwrite a pilot job. Pinned in Task 6 (`refuses to overwrite a non-rebuild job`).
4. **A label in Russian on a vector object.** The text is drawn with the lens font, and the export check measures it like any layout block. Pinned in Task 3 (`Russian label draws and is measured`).
5. **A vector object in a frame that the camera has passed,** so it is behind the camera. It is hidden. It must not be drawn mirrored at a wrong place. Pinned in Task 3 (`object behind the camera is hidden`).

---

### Task 0: Approval gate

**Files:** none

- [ ] **Step 1: GATE.** Ask the owner for a yes to commits on this branch (`studio/plan4`) and to `npm ci` with the approved versions (the commit GATE: every commit step below needs it; `npm ci` installs only the versions in the lockfile that the owner approved in Plan 1). Stop until he answers.
- [ ] **Step 2: Create the branch** `studio/plan4` from the tip of branch `studio/plan3`, not from `main`, so the code of Plans 1 to 3 is present. Use a new worktree. In it, run `npm ci` in `studio/`. Expected: it exits 0 and installs nothing outside the lockfile. (`gsap` is added later, in Step 6, under its own gate.)
- [ ] **Step 3: Check that Plan 1 is done.** `studio/ledger/plan1.md` must show Task 10 finished. Run `npm test` in `studio/`. Expected: all PASS.
- [ ] **Step 4: Look up the latest vtracer release on PyPI.** Write the exact version into `studio/ledger/plan4.md`.
- [ ] **Step 5: GATE.** Ask the owner for a yes to install two things:
  - `gsap@3.15.0` into `studio/` (the version that `.\stage\package-lock.json` resolves for `node_modules/gsap`; open the file and confirm it before asking);
  - `vtracer==<version from Step 4>` into the Python that `py -3` runs.
  Stop until he answers.
- [ ] **Step 6: Install both.** Run `npm install gsap@3.15.0 --save-exact` in `studio/`, then `py -3 -m pip install vtracer==<exact>`.
- [ ] **Step 7: Check the tracer's settings.** Run `py -3 -I -c "import vtracer; help(vtracer.convert_image_to_svg_py)"`. Expected: the help lists `colormode`, `mode`, `filter_speckle`, `color_precision`, `layer_difference`, `corner_threshold`, `length_threshold`, `splice_threshold` and `path_precision`. If any name differs, stop and ask (executor rule 6).
- [ ] **Step 8: Commit** (needs the Step 1 yes) `studio/package.json` and `studio/package-lock.json` with the message `studio: add gsap for the vector player`.

### Task 1: Vector schema and the job field `vectors`

**Files:**
- Create: `studio/core/vector.ts`
- Modify: `studio/core/job.ts` (validate the optional `vectors` field)
- Test: `studio/core/test/vector.test.ts`

**Interfaces:**
- Consumes: `Source`, `Level`, `World`, `evidenceError` (Plan 1 Task 1); `Job`, `loadJob` (Plan 1 Task 6). `evidenceError(id: string, source: Source, level: Level): string | null` is exported by Plan 1; this plan imports it and does not reimplement it.
- Produces:
  - `type VectorType = 'path'|'shape'|'arrow'|'label'|'image'|'group'`
  - `type VectorObject = { id: string; type: VectorType; frame: string|null; box: [number,number,number,number]; d?: string; shape?: 'rect'|'ellipse'; from?: [number,number]; to?: [number,number]; text?: { en: string; ru?: string }; href?: string; children?: string[]; roles: string[]; source: Source; evidence: Level; window: [number,number] }`
    - `box` is in px at 1920×1080 when `frame` is null.
    - When `frame` is set, `box` is centred on the frame's origin, in that frame's units.
  - `validateVectors(vectors: VectorObject[], world: World): string[]`
  - `Job` gains the optional field `vectors?: VectorObject[]`. `loadJob` runs `validateVectors` when the field is present.

- [ ] **Step 1: Write the failing tests** in `vector.test.ts`, using the two-frame world of Plan 1's `world.test.ts`:
  - `accepts one of each type`: a path with `d: "M0 0 L10 10"`; a shape `rect`; an arrow with `from`/`to`; a label with `text.en`; an image with `href`; and a group whose `children` name two of them. Expect `[]`.
  - `ids are unique across world objects and vectors`: a vector with id `igg`, the same as a world object. Expect an error containing `duplicate id "igg"`.
  - `each type needs its fields`. Expect one error per missing field:
    - a path without `d`;
    - an arrow without `to`;
    - a label without `text`;
    - an image without `href`;
    - a shape without `shape`.
  - `group children exist and do not loop`: an unknown child gives `unknown child`; A containing B containing A gives `group loop`.
  - `unknown frame is rejected`: `frame: 'x'` gives `unknown frame "x"`.
  - `engine-drawn vectors cap at architecture`: source `engine` with evidence `published` gives exactly the string that `evidenceError(id, source, 'published')` returns.
  - `loadJob checks vectors`: a job with one bad vector. `loadJob` returns `ok: false` with the vector error inside.
- [ ] **Step 2: Run** `node --test core/test/vector.test.ts` in `studio/`. Expected: FAIL.
- [ ] **Step 3: Implement** `validateVectors` in `vector.ts`. Call `evidenceError` from `world.ts` for each vector; import it, do not copy it. Add the optional field to `Job`, and call `validateVectors` from `loadJob`.
- [ ] **Step 4: Run** `npm test` and `npm run typecheck`. Expected: all PASS, no type errors.
- [ ] **Step 5: Commit** (needs the Task 0 yes) with the message `studio: vector objects and the vectors job field`.

### Task 2: GSAP player

**Files:**
- Create: `studio/web/gsap-player.ts`, `studio/web/test/gsap.html`
- Modify: `studio/web/vite.config.ts` (the one config of Plan 1 Task 7: add `test/gsap.html` to `build.rollupOptions.input`)
- Test: `studio/tools/gsap.test.mjs`

**Interfaces:**
- Consumes: `Track`, `sample`, `Ease` (Plan 1 Task 2).
- Produces:
  - `createGsapPlayer(root: SVGSVGElement, tracks: Track[]): { set(t: number): void; kill(): void }`
  - **Props it understands:**
    - `opacity` (number);
    - `x`, `y` (px, SVG translate);
    - `scale` (number);
    - `draw` (0..1: the fraction of the stroke drawn from its start).
  - **Ease names:**
    - `linear` → `none`;
    - every other `Ease` name passes through unchanged;
    - `power2.out`, `power2.inOut`, `power3.out` and `sine.inOut` are GSAP names.
  - **Target lookup:** `root.querySelector('[data-id="<track.target>"]')`.

**How it works:**
- Build one `gsap.timeline({ paused: true })`.
- For each pair of neighbouring keys k0, k1, add `tl.fromTo(el, from(k0), to(k1, ease of k1), k0.t)` with `duration = k1.t − k0.t`.
- Before the first key, set the first key's value at position 0 with `tl.set`.
- `draw` maps to `drawSVG: "0% <v·100>%"`. Register DrawSVGPlugin once at module load.
- `set(t)` calls `tl.time(t, true)`.

- [ ] **Step 1: Write the failing tests** in `gsap.test.mjs`. Use `node:test` with playwright-core (browser from `launch()` in `studio/tools/browser.mjs`), and open `gsap.html` through `npm run build` then `npm run preview` (port 4380), as in Plan 1 Task 7.
  - `opacity follows sample()`. One track `opacity` with keys 0→0, 2→1, 4→0.25, using mixed eases. Use 50 seeded t values in [−1, 5] (mulberry32, seed 7). Assert that the element's computed opacity equals `sample(track, t)` within 1e-4.
  - `x and scale follow sample()`: the same check on the transform matrix, within 1e-3 px.
  - `draw 0.5 shows half the stroke`. Path `M0 0 L200 0`, key `draw` 0→0 at t 0 and 1→1 at t 1, linear. At t = 0.5, read the first number of the computed `stroke-dasharray`. Assert it is 100 within 1 px.
  - `seek back equals fresh`: set 3 then 1 on one page, and set 1 on a fresh page. Assert that the outer HTML of the SVG is equal.
- [ ] **Step 2: Run** `node --test tools/gsap.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `createGsapPlayer`, and a test page that mounts one SVG with three elements.
- [ ] **Step 4: Run** the test. Expected: PASS, 4 tests.
- [ ] **Step 5: Commit** (needs the Task 0 yes) with the message `studio: GSAP player for our timeline data`.

### Task 3: Vector layer and `Stage.project`

**Files:**
- Create: `studio/web/vector.ts`, `studio/jobs/vector-test/job.json`
- Modify: `studio/web/renderer.ts` (add `project` to `Stage`), `studio/web/index.html` (mount the layer), `studio/tools/checks.mjs` (measure vector labels)
- Test: `studio/tools/vector.test.mjs`

**Interfaces:**
- Consumes:
  - `Stage`, `createStage` (Plan 1 Task 7);
  - `VectorObject` (Task 1);
  - `createGsapPlayer` (Task 2);
  - `resolve`, `Lens` (Plan 1 Task 5).
- Produces:
  - `Stage` gains `project(p: Place): [number, number] | null`. It gives screen px at 1920×1080, or `null` when the point is behind the camera or outside the near and far planes.
  - `createVectorLayer(svg: SVGSVGElement, stage: Stage, job: Job, lens: Lens): { draw(t: number): void }`
- **Drawing rules:**
  - Colours and stroke widths come from `resolve(obj, lens)` and `lens.line`. Corner radius for `rect` comes from `lens.radius`.
  - Labels use `lens.text.family` and `lens.text.color`, at the font size that fits the box height. The size never goes below `lens.text.minPx`.
  - An object outside its `window` gets `display: none`.
  - An object in a frame is placed at `stage.project({frame, pos: [0,0,0]})` offset by its box centre. It is scaled by the projected size of 1 frame unit. It is hidden when `project` returns `null`.
  - `draw(t)` places every element first, then calls `player.set(t)`.
  - `checkPage` (Plan 1) also measures every `[data-id]` label for overflow and small text.

**The test job (`vector-test/job.json`):** the zoom-test world of Plan 1, plus these vectors:
- a flat title label (English and Russian);
- a flat arrow drawn on with `draw` from 0 to 1 between t 1 and 2;
- a label `igg-name` in frame `nano`, next to the antibody.

- [ ] **Step 1: Write the failing tests** in `vector.test.mjs` (browser from `launch()`, as in Task 2):
  - `flat arrow draws on over its keys`: the first dash number is 0 at t 1, half the length at t 1.5, and the full length at t 2, each within 1 px.
  - `label follows its object through the zoom`: at 20 points across the zoom, compare the label's screen centre with `stage.project` of `igg`. The distance stays under 2 px plus the box offset.
  - `object behind the camera is hidden`: at a t where the camera has passed the `nano` origin, `igg-name` has `display: none`.
  - `Russian label draws and is measured`: switch to `ru`. The label shows the Russian text. `checkPage` returns no finding for it, and it does return an overflow finding when the box width is set to 10 px in a copy of the job.
  - `same t gives the same SVG`: seek 1.7 twice. Assert the outer HTML is equal.
- [ ] **Step 2: Run** `npm run build`, then serve on 4380 as in Plan 1, then run `node --test tools/vector.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `Stage.project` with `Vector3.project` on the three camera. Return `null` when the camera-space z is not negative or the depth is outside [−1, 1]. Then write `createVectorLayer`, the label measuring and the test job.
- [ ] **Step 4: Run** the vector tests and every Plan 1 test file. Expected: all PASS.
- [ ] **Step 5: Commit** (needs the Task 0 yes) with the message `studio: vector layer drawn by t, projected into frames`.

### Task 4: Reading schema

**Files:**
- Create: `studio/tools/rebuild/reading.ts`
- Create: `studio/tools/rebuild/test/make_fixture.py`
- Create: `studio/tools/rebuild/test/fixture.png` (written by the script)
- Create: `studio/tools/rebuild/test/fixture.reading.json`
- Test: `studio/core/test/reading.test.ts` (it lives in `core/test/` so that `npm test` runs it; it imports `../../tools/rebuild/reading.ts` and reads the fixture files by a path built from `import.meta.url`)

**Interfaces:**
- Consumes: `Source`, `Level` (Plan 1 Task 1).
- Produces:
  - `type Part = { id: string; kind: 'shape'|'arrow'|'text'|'molecule'|'object'|'texture'|'background'; box: [number,number,number,number] /* px in the original */; form: 'vector'|'structure'|'model'|'text'|'pixels'; text?: { en: string; ru?: string }; ref?: string; trace?: boolean; vector?: { type: 'path'|'shape'|'arrow'; d?: string; shape?: 'rect'|'ellipse'; from?: [number,number]; to?: [number,number] }; roles: string[] }`
  - `type Reading = { image: string; width: number; height: number; source: Source; evidence: Level; parts: Part[] }`
  - `checkReading(input: unknown): { ok: true; reading: Reading } | { ok: false; errors: string[] }`
- **Rules:**
  - Ids are unique, and every box lies inside the image.
  - `form: 'text'` needs `text`.
  - `form: 'structure'` needs a `ref` that matches `/^[0-9][A-Za-z0-9]{3}$/` (a PDB id).
  - `form: 'model'` needs `ref`.
  - `trace: true` is allowed only with `form: 'vector'` and `kind` `shape` or `texture`.
  - `form: 'vector'` without `trace` needs `vector`.

**The fixture:** `make_fixture.py` draws a 1200×800 white picture with Pillow:
- a navy rectangle at (100,100,300,200);
- a black arrow from (450,200) to (700,200), 6 px wide, with a triangle head;
- the word "Gold" in Arial 48 px at (800,170), with the font file `C:\Windows\Fonts\arial.ttf`;
- a filled circle of radius 60 at (300,550), for tracing.

`fixture.reading.json` names these four parts. The source is `{kind:'file', ref:'studio/tools/rebuild/test/fixture.png'}`, with evidence `architecture`.

- [ ] **Step 1: Run** `py -3 -I studio/tools/rebuild/test/make_fixture.py`. Expected: `fixture.png` exists and is 1200×800.
- [ ] **Step 2: Write the failing tests:**
  - `accepts the fixture reading`.
  - `rejects a box outside the image`: box (1100,700,200,200). Expect an error containing the part id and `1200x800`.
  - `structure needs a PDB id`: `ref: 'gold'`. Expect an error.
  - `trace only on shapes and textures`: a `text` part with `trace: true`. Expect an error.
  - `vector without trace needs vector data`: Expect an error.
- [ ] **Step 3: Run** `node --test core/test/reading.test.ts` in `studio/`. Expected: FAIL.
- [ ] **Step 4: Implement** `checkReading` with zod plus the rules above.
- [ ] **Step 5: Run** the test, then `npm test`. Expected: PASS, 5 tests in `reading.test.ts`, and `npm test` lists that file.
- [ ] **Step 6: Commit** (needs the Task 0 yes) with the message `studio: rebuild reading schema and fixture`.

### Task 5: Trace

**Files:**
- Create: `studio/tools/rebuild/trace.mjs`, `studio/tools/rebuild/trace_region.py`
- Test: `studio/tools/rebuild/test/trace.test.mjs`

**Interfaces:**
- Consumes: `Reading`, `Part` (Task 4); `VectorObject` (Task 1).
- Produces:
  - `traceParts(reading: Reading, pngPath: string, outDir: string): Promise<{ vectors: VectorObject[]; findings: { id: string; kind: 'no-paths' }[] }>`
  - `parseTracedSvg(svg: string, partId: string, box: [number,number,number,number]): VectorObject[]`

**How it works:**
- `trace_region.py <png> <x> <y> <w> <h> <out.svg>` crops the box with Pillow and saves the crop.
- It then calls `vtracer.convert_image_to_svg_py` with these settings:
  - `colormode='color'`, `mode='spline'`;
  - `filter_speckle=4`, `color_precision=6`, `layer_difference=16`;
  - `corner_threshold=60`, `length_threshold=4.0`, `splice_threshold=45`, `path_precision=3`.
- `parseTracedSvg` reads every `<path d="…" fill="…" transform="translate(a,b)"/>`. It gives each path the id `<partId>-p<n>`, shifted by the box origin and by the translate. The paths go into a group with the part id.
- The background fill, meaning the colour of the crop's corner pixel, is dropped.

- [ ] **Step 1: Write the failing tests:**
  - `parseTracedSvg reads paths and translates them`: a fixed SVG string with two paths, one translated by (5,7). Assert two vectors with ids `c-p1` and `c-p2`, with the box origin and the translate applied.
  - `traces the fixture circle into a group`: run `traceParts` on the fixture. Assert one group `circle` with at least one child path, and a child bounding box within 3 px of the circle's box.
  - `blank region gives an empty group and a finding`: add a part with `trace: true` over a white area. Assert the group has `children: []` and the findings hold `{ id, kind: 'no-paths' }`.
- [ ] **Step 2: Run** `node --test tools/rebuild/test/trace.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `trace_region.py`, `parseTracedSvg` and `traceParts`. Spawn Python as `py -3 -I`. Measure the bounding box with the SVG path's own numbers; do not use a browser.
- [ ] **Step 4: Run** the test. Expected: PASS, 3 tests.
- [ ] **Step 5: Commit** (needs the Task 0 yes) with the message `studio: trace marked regions with vtracer`.

### Task 6: Assemble the rebuild job

**Files:**
- Create: `studio/tools/rebuild/assemble.mjs`, `studio/tools/rebuild/render_structure.cxc.tmpl`, `studio/tools/rebuild/cli.mjs`
- Modify: `studio/package.json` (add the script `"rebuild": "node tools/rebuild/cli.mjs"`), `studio/core/job.ts` (`Job` gains the optional field `rebuild?: true`; `loadJob` accepts it)
- Test: `studio/tools/rebuild/test/assemble.test.mjs`

**Interfaces:**
- Consumes:
  - `checkReading` (Task 4);
  - `traceParts` (Task 5);
  - `validateVectors` (Task 1);
  - `loadJob` (Plan 1 Task 6).
- Produces:
  - `letterbox(w: number, h: number): { s: number; ox: number; oy: number }`, exported from `assemble.mjs`. `s = min(1920/w, 1080/h)`, `ox = (1920 − w·s)/2`, `oy = (1080 − h·s)/2`. A box `[x,y,bw,bh]` of the original maps to `[x·s+ox, y·s+oy, bw·s, bh·s]`.
  - `assemble(reading: Reading, traced: VectorObject[], outDir: string): Promise<{ job: Job; report: { id: string; kind: 'no-paths'|'model-as-pixels'|'structure-render' }[] }>`. The job has `"rebuild": true`.
  - The command `npm run rebuild -- <png> --job <scratch-job>`.
    - It reads `studio/jobs/<scratch-job>/reading.json`, writes `studio/jobs/<scratch-job>/job.json` and `studio/jobs/<scratch-job>/rebuild-report.json`, and prints the report.
    - It refuses to start if `studio/jobs/<scratch-job>/job.json` exists and does not hold `"rebuild": true`. The message contains `not a rebuild job`. It never touches a pilot job.
  - Plan 5 adds `--into <job> --stop <n>` to this command.
- **The reading step is explicit.** Before the command runs, the agent looks at the picture and writes `studio/jobs/<scratch-job>/reading.json` by the Task 4 schema, then runs `checkReading` on it. The command does not guess a reading.
- **How each form becomes objects.** All box coordinates go through `letterbox(reading.width, reading.height)`.
  - **vector:** the traced group, or one vector from `part.vector`.
  - **text:** a `label` vector.
  - **pixels:** an `image` vector of the crop, saved as `studio/jobs/<scratch-job>/crops/<id>.png`.
  - **structure:** ChimeraX renders `ref` to a transparent PNG at the box size. It runs headless with `render_structure.cxc.tmpl`, which opens `.\data\pdb\<ref>.pdb` and stops with an error when the file is missing; it never fetches. The result is an `image` vector with source `{kind:'pdb', ref}` and evidence `published`, and the report says `structure-render`.
  - **model:** an `image` crop of the original, and the report says `model-as-pixels`. Plan 2 assets replace these later.
  - Every object takes `reading.source` and `reading.evidence`, except structure renders.
  - The job has one camera path of kind `deck` (id `deck`) with one stop at t = 0 (id `deck`), flat (the poster), lens `journal`, and the language `en`. The page default and `score` therefore work without `path=`. The world has one root frame and no world objects. The poster shows the picture letterboxed: the vectors sit at their letterboxed boxes on the lens background.

- [ ] **Step 1: Write the failing tests:**
  - `letterbox of 1200x800`: `s` is 1.35, `ox` is 150 and `oy` is 0, each within 1e-9. A 800×1200 picture gives `s` 0.9, `ox` 600, `oy` 0.
  - `assembles the fixture`: the job passes `loadJob`, and holds `"rebuild": true`. Its only path has kind `deck`, with one stop at t = 0 and id `deck`. It has a label with text "Gold", an arrow, a rect and a group `circle`. The rect (100,100,300,200) has the box (285,135,405,270) within 1e-9, because `s` is 1.35 and the offset is (150, 0).
  - `model part becomes pixels with a report line`.
  - `structure part renders from the local PDB`: `ref: '1IGT'`. The report says `structure-render`, and the crop PNG exists with the box size.
  - `missing local PDB stops with a clear error`: `ref: '9ZZZ'`. The error contains `9ZZZ.pdb not found`.
  - `refuses to overwrite a non-rebuild job`: a folder `studio/jobs/pilot-copy/` with a `job.json` that lacks `"rebuild": true`. The command exits 1 with `not a rebuild job`, and the file is unchanged.
- [ ] **Step 2: Run** `node --test tools/rebuild/test/assemble.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `letterbox`, `assemble`, the ChimeraX template, the `rebuild` field and the command line.
- [ ] **Step 4: Write `reading.json`, then rebuild.** Copy `fixture.reading.json` to `studio/jobs/rebuild-fixture/reading.json` (for the fixture this is the reading step). Run `npm run rebuild -- tools/rebuild/test/fixture.png --job rebuild-fixture`. Expected: `job.json` is written, and the report holds no `no-paths` lines.
- [ ] **Step 5: Run** the test. Expected: PASS, 6 tests.
- [ ] **Step 6: Commit** (needs the Task 0 yes) with the message `studio: assemble a rebuild into a scratch job`.

### Task 7: Score

**Files:**
- Create: `studio/tools/rebuild/score.py`, `studio/tools/rebuild/score.mjs`
- Modify: `studio/package.json` (add the script `"score": "node tools/rebuild/score.mjs"`)
- Test: `studio/tools/rebuild/test/test_score.py`, `studio/tools/rebuild/test/score.test.mjs`

**Interfaces:**
- Consumes: `window.__studio` (Plan 1 Task 7); `Reading` (Task 4).
- Produces:
  - `score.py <original.png> <rebuild.png> <reading.json> <out.json> [--bg #rrggbb]`. The original is letterboxed into 1920×1080 on the background `--bg` (default `#FFFFFF`). The rebuild must be 1920×1080, or it raises `ValueError` naming both sizes. It writes `{ mad_score: number, edge_iou: number, parts: [{ id, mad_score }] }`, with parts sorted by `mad_score` from lowest to highest.
  - The command `npm run score -- <job> --against <png>`. It renders stop 0 of the job (page default path, no `path=`) at 1920×1080 to `studio/out/<job>/rebuild.png`, using the browser from `launch()`, runs `score.py` with the lens background, writes `studio/jobs/<job>/score.json` and prints the two numbers.
  - The metric is the one in Global Constraints. Sobel uses the 3×3 kernels on the grey picture as float, with magnitude = sqrt(gx² + gy²). Each part's `mad_score` uses the part's box mapped through the same letterbox scale and offset.

- [ ] **Step 1: Write the failing Python tests** in `test_score.py` (run from `studio/` with `py -3 -I -m unittest discover -s tools/rebuild/test`):
  - `test_identical`: a picture against itself gives `mad_score == 1.0` and `edge_iou == 1.0`.
  - `test_inverted`: black against white gives `mad_score == 0.0`.
  - `test_both_blank`: two white pictures give `edge_iou == 1.0`.
  - `test_shift`: the fixture against itself shifted 10 px right gives `edge_iou` below 0.5 and `mad_score` above 0.9.
  - `test_rebuild_size`: a rebuild of 1200×800 raises `ValueError` with both sizes in the message.
  - `test_letterbox_portrait`: an 800×1200 original (white, black square) against a 1920×1080 white picture that holds the same original resized to 720×1080 at x = 600. Expect `mad_score` 1.0 and `edge_iou` 1.0, each within 1e-9.
  - `test_parts_sorted`: the worst part comes first.
- [ ] **Step 2: Run** `py -3 -I -m unittest discover -s tools/rebuild/test` in `studio/`. Expected: FAIL.
- [ ] **Step 3: Implement** `score.py` with Pillow and numpy only.
- [ ] **Step 4: Run** `py -3 -I -m unittest discover -s tools/rebuild/test` in `studio/`. Expected: PASS, 7 tests.
- [ ] **Step 5: Write `score.test.mjs`** with the test `scores the fixture rebuild`. It runs `npm run score -- rebuild-fixture --against tools/rebuild/test/fixture.png`. Assert that `score.json` exists and that both numbers lie in [0, 1].
- [ ] **Step 6: Implement** `score.mjs`. Run `score.test.mjs`. Expected: PASS.
- [ ] **Step 7: Write the fixture's two numbers** into `studio/ledger/plan4.md`.
- [ ] **Step 8: Commit** (needs the Task 0 yes) with the message `studio: overlay score for rebuilds`.

### Task 8: the owner's five mock-ups

These five jobs are scratch jobs (`"rebuild": true`). They never overwrite a pilot job.

**Files:**
- Create: `studio/jobs/rebuild-m1/` … `studio/jobs/rebuild-m5/` (`reading.json`, `job.json`, `score.json`, `rebuild-report.json`, `crops/`)

- [ ] **Step 1: GATE.** Ask the owner for five raster mock-ups and the source of each: the image-model prompt, or the paper's DOI and figure number. Stop until they arrive. Save them as `studio/jobs/rebuild-m<n>/original.png`.
- [ ] **Step 2: Write `reading.json` for each mock-up** (the explicit reading step of Task 6). Write it by looking at the picture, following the rules of Task 4. Mark `trace: true` only on icons and textures. Run the check on each through `checkReading`. Expected: `ok: true`.
- [ ] **Step 3: Rebuild each one.** Run `npm run rebuild -- studio/jobs/rebuild-m<n>/original.png --job rebuild-m<n>`, then `npm run score -- rebuild-m<n> --against studio/jobs/rebuild-m<n>/original.png`.
- [ ] **Step 4: Write a table into `studio/ledger/plan4.md`.** One row per mock-up: `mad_score`, `edge_iou`, the three worst parts, and the report lines.
- [ ] **Step 5: GATE.** Show the owner each original beside its rebuild at stop 0, with the table. Ask him to set the pass levels for `mad_score` and `edge_iou`. Write his two numbers into the ledger and into `studio/tools/rebuild/PASS.json`, as `{ "mad_score": <n>, "edge_iou": <n>, "set_by": "the owner", "date": "<date>" }`.
- [ ] **Step 6: Commit** (needs the Task 0 yes) the five job folders and `PASS.json` with the message `studio: rebuild scores on five mock-ups`. Commit the originals only if the owner said yes to that in Step 1.

### Task 9: Hand-over

- [ ] **Step 1: Run every test.** In `studio/`, run `npm test` (it includes `core/test/reading.test.ts`), `npm run typecheck`, all of `studio/tools/**/*.test.mjs`, and the Python tests with `py -3 -I -m unittest discover -s tools/rebuild/test`. Expected: all PASS. Paste the pass lines into the ledger.
- [ ] **Step 2: Update section 2 of** `.\docs\superpowers\plans\2026-10-31-studio-00-index.md`. Under a new heading "Plan 4", list every name this plan produced, with its exact signature:
  - `VectorType`, `VectorObject`, `validateVectors`;
  - `Job.vectors`, `Job.rebuild`, `Stage.project`;
  - `createGsapPlayer`, `createVectorLayer`;
  - `Part`, `Reading`, `checkReading`;
  - `traceParts`, `parseTracedSvg`, `letterbox`, `assemble`;
  - the `rebuild` and `score` commands (scratch jobs only, letterbox 1920×1080; Plan 5 adds `--into`);
  - the `data-id` and `data-block` attributes.
- [ ] **Step 3: Retain one Cammut note** with the test results, the five scores and the owner's pass levels. Check it with `get_operation`, then read it back.
- [ ] **Step 4: Tell the owner** what works and where the rebuild pictures are. List the `model-as-pixels` parts that wait for Plan 2 assets. Do not push.
