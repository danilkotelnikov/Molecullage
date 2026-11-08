<!-- version: p5 | date: 2026-10-31 | status: draft for the owner's review -->
# Molecullage Studio, Plan 5: editing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the owner change any part of a job by hand in four ways: click and change, a timeline, words, and the 3D camera. Store every change as an edit with undo. A new render never loses a hand edit.

**Architecture:**
- An edit is a small JSON change addressed by a JSON Pointer into the job.
- The base `job.json` never changes. Edits live in `studio/jobs/<job>/edits.jsonl`, one edit per line.
- Every page and every export loads the base job and replays the edits with the pure `applyEdits`. That is why a new render keeps every hand edit.
- The editor is a set of panels in `studio/web/editor/`. It opens with `?job=<id>&edit=1`, and it saves edits through a small Vite plugin (`editsPlugin`) that is registered in the one config, `studio/web/vite.config.ts` (Plan 1 Task 7).
- Words become edits outside the engine. The Claude Code session writes the proposed edits. `npm run edit` checks them, shows a diff, and applies them on `--apply`. There is no model call inside the engine.
- A raster rebuild joins a pilot job the same way: `npm run rebuild -- <png> --job <scratch> --into <job> --stop <n>` writes `proposed.json` with `add` edits, and `npm run edit -- <job> --apply` applies them after the owner's yes.

**Tech Stack:**
- Everything from Plans 1 and 4.
- OrbitControls from `three/examples/jsm/controls/OrbitControls.js`, which ships inside the three package already installed.
- No new packages.
- Every playwright test and tool starts its browser with `launch()` from `studio/tools/browser.mjs` (made in Plan 1 Task 7); do not write another launch call.
- No new Vite config and no change to the `dev` script: `editsPlugin` goes into the existing `studio/web/vite.config.ts`.

**Spec:** `docs/superpowers/specs/2026-10-31-engine-design.md`, section 10 (approved by the owner on 2026-10-31). Index and executor rules: `docs/superpowers/plans/2026-10-31-studio-00-index.md`.

## Global Constraints

- Every Global Constraint of Plans 1 and 4 applies here unchanged.
- The edit shape is exactly `{ id: string; at: string; by: 'the owner'|'agent'; op: 'set'|'add'|'remove'|'retime'; path: string; value?: unknown }`. `at` is an ISO 8601 time, and `path` is a JSON Pointer (RFC 6901, with `~0` for `~` and `~1` for `/`).
- `applyEdits` is pure: it never changes its input. It checks the result with `loadJob`. An edit that makes the job invalid is refused whole, with every error listed. A partly applied edit list is never returned.
- The base `job.json` is never written by the editor, the words tool or any export.
- `edits.jsonl` is only appended to, one complete line at a time. Undo appends nothing. It removes the last line by rewriting the file through a temporary file and a rename, so a crash never leaves half a file.
- The engine makes no network call to a language model. Words are turned into edits by the Claude Code session (design 14a.2).
- Time edits snap to frames: t is rounded to the nearest 1/30 s (Plan 1 export uses 30 fps).
- Every commit step needs the commit yes from Task 0 Step 2. Without it, stop before committing.
- A rebuild is added to a pilot job only as `proposed.json`, shown to the owner as a diff, and applied after his yes. It never overwrites a pilot job.
- The editor writes our own timeline data. GSAP stays a player (design 14). The editor is for the owner and his team only; it is not offered to outside clients while GSAP is in use.

## Review Focus

1. **An edit whose path points nowhere,** such as an object index beyond the end. It is refused with a message naming the edit id and the path. The job is unchanged. Pinned in Task 1 (`missing path is refused and the job is unchanged`).
2. **A retime that moves a key past its neighbour.** It is refused with `retime breaks key order`. It does not reorder the keys silently. Pinned in Task 1 (`retime keeps key order`).
3. **A half-written last line in `edits.jsonl`,** after a crash. `readEdits` stops with the file name and line number. It never skips the line silently. Pinned in Task 2 (`corrupt line stops with its line number`).
4. **Undo with no edits left.** It returns an empty list and leaves the file as it is. Pinned in Task 1 (`undo on empty is empty`) and Task 2 (`undo on an empty file keeps it`).
5. **Re-exporting after a hand edit.** The video shows the edited title. Pinned in Task 2 (`edit survives re-render`).
6. **A rebuild proposal that clashes or lands at the wrong stop.** Rebuilt ids get the scratch job's name as a prefix, so no id repeats. The window is that of stop n and no other. A stop out of range, or a scratch job that is not a rebuild, stops the command with nothing written. Pinned in Task 8.

---

### Task 0: Approval gate

**Files:** none

- [ ] **Step 1: Check that Plan 4 is done.** `studio/ledger/plan4.md` must show Task 9 finished. Run `npm test` in `studio/`. Expected: all PASS.
- [ ] **Step 2: GATE.** Plan 5 needs no new package. Ask the owner for a yes to commits on this branch (`studio/plan5`) and to `npm ci` with the approved versions (the commit GATE: every commit step below needs it; `npm ci` installs only the versions in the lockfile that the owner approved in Plans 1 and 4). Stop until he answers.
- [ ] **Step 3: Create the branch** `studio/plan5` from the tip of branch `studio/plan4`, not from `main`, so the code of Plans 1 to 4 is present. Use a new worktree. In it, run `npm ci` in `studio/`. Expected: it exits 0 and installs nothing outside the lockfile.

### Task 1: Edits, JSON Pointer, undo and diff

**Files:**
- Create: `studio/core/edits.ts`, `studio/core/lenses.ts`
- Test: `studio/core/test/edits.test.ts`

**Interfaces:**
- Consumes: `Job`, `loadJob` (Plan 1 Task 6); `Lens` (Plan 1 Task 5); `VectorObject` (Plan 4 Task 1).
- Produces:
  - `type Edit = { id: string; at: string; by: 'the owner'|'agent'; op: 'set'|'add'|'remove'|'retime'; path: string; value?: unknown }`
  - `SHIPPED_LENSES: Record<string, Lens>`, in `lenses.ts`. It reads `../lenses/journal.json` and `../lenses/cinematic.json` with `import … with { type: 'json' }`.
  - `getAt(doc: unknown, path: string): unknown`. It throws `Error('no value at <path>')`.
  - `applyEdits(job: Job, edits: Edit[], lenses: Record<string, Lens> = SHIPPED_LENSES): Job`
  - `undo(edits: Edit[]): Edit[]`. It returns every edit but the last; an empty list stays empty.
  - `diffJobs(a: Job, b: Job): { path: string; before: unknown; after: unknown }[]`. Leaves only, in document order.
- **What each op means:**
  - `set` replaces the value at `path`. The parent must exist.
  - `add` inserts `value` into an array at index `path` (the last token is a number, or `-` for the end), or creates a new object key.
  - `remove` deletes the array item or key at `path`.
  - `retime` needs `path` to point at an object with a numeric `t`: a timeline key or a camera key. It sets `t = round(value·30)/30`. The new t must be greater than the previous key's t and less than the next key's t in the same array. Otherwise the edit is refused with `retime breaks key order`.
  - Each edit is applied to a deep copy (`structuredClone`). After the whole list, the result goes through `loadJob(result, lenses)`. On failure, throw `Error('edits make the job invalid: ' + errors.join('; '))`.
  - A failure inside one edit throws `Error('edit <id>: <reason>')`.

- [ ] **Step 1: Write the failing tests** in `edits.test.ts`. Use the zoom-test job of Plan 1, loaded from `studio/jobs/zoom-test/job.json`.
  - `set changes a title`: `set /layout/0/blocks/0/text` to `"Tube"`. The result has the new text, and the input is deep-equal to a copy taken before.
  - `add appends an object`: add to `/world/objects/-` a gold sphere with a new id. The result has one more object and passes `loadJob`.
  - `remove deletes a block`.
  - `pointer escapes work`: a key named `a/b~c` is reached by `/notes/a~1b~0c`. Test this on `getAt` with a plain object.
  - `retime snaps to frames`: retime `/timeline/tracks/0/keys/1` to 1.017. Assert t = 31/30 within 1e-12.
  - `retime keeps key order`: retime `/timeline/tracks/0/keys/0` (t = 0) to 9, past key 1 (t = 8). The error contains `retime breaks key order`.
  - `missing path is refused and the job is unchanged`: `set /world/objects/99/size`. The error contains the edit id and `/world/objects/99`. The input is unchanged.
  - `invalid result is refused whole`: two edits, where the second sets a duplicate id. The error contains `duplicate id`, and nothing is returned.
  - `undo on empty is empty`, and `undo drops the last edit`.
  - `diffJobs lists changed leaves`: after the `set` above, the diff is exactly `[{ path: '/layout/0/blocks/0/text', before: <old>, after: 'Tube' }]`.
- [ ] **Step 2: Run** `node --test core/test/edits.test.ts` in `studio/`. Expected: FAIL.
- [ ] **Step 3: Implement** `lenses.ts` and `edits.ts` as described above.
- [ ] **Step 4: Run** `npm test` and `npm run typecheck`. Expected: all PASS, no type errors.
- [ ] **Step 5: Commit** (needs the Task 0 yes) with the message `studio: edits with JSON Pointer, undo and diff`.

### Task 2: The edit store, and loading edits everywhere

**Files:**
- Create: `studio/tools/edits-store.mjs`
- Modify: `studio/web/index.html` and its script (load the edits after `job.json`)
- Modify: `studio/tools/export.mjs` (the page already applies the edits; add a `--no-edits` flag for comparison)
- Test: `studio/tools/edits-store.test.mjs`

**Interfaces:**
- Consumes: `Edit`, `applyEdits`, `undo` (Task 1); the export command (Plan 1 Task 9).
- Produces:
  - `readEdits(jobDir: string): Edit[]`. A missing file gives `[]`. A bad line throws `Error('<file>:<line>: bad edit line')`.
  - `appendEdit(jobDir: string, edit: Edit): void`. It writes one line plus `\n` with `fs.appendFileSync`.
  - `undoLast(jobDir: string): Edit | null`. It rewrites the file without the last line: write `edits.jsonl.tmp`, then `fs.renameSync`. It returns the removed edit, or `null` when there was none.
  - In the page: after `job.json`, fetch `jobs/<job>/edits.jsonl` (a 404 means no edits), then run `applyEdits` before `createStage`. With `?edits=0`, the page skips this step. `--no-edits` in export adds `?edits=0`.

- [ ] **Step 1: Write the failing tests** (the export test uses the browser from `launch()`):
  - `round trip`: append two edits, then `readEdits`. The result is deep-equal to both.
  - `corrupt line stops with its line number`: a file whose line 2 is `{"id":"x",` gives an error containing `edits.jsonl:2`.
  - `undo removes the last line atomically`: after `undoLast`, `readEdits` returns one edit, and no `.tmp` file remains.
  - `undo on an empty file keeps it`: `undoLast` returns `null`, and the file bytes are unchanged.
  - `edit survives re-render`: in a copy of the zoom-test job (`edit-test`), append `set /layout/0/blocks/0/text` = "Edited". Export at 10 fps, with `--lang en` and lens `journal`. A frame at stop 0 shows "Edited" in the page text; read `document.body.innerText` during the export run. The export with `--no-edits` shows the old title.
- [ ] **Step 2: Run** `node --test tools/edits-store.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** the store and the page loading.
- [ ] **Step 4: Run** the store tests and every Plan 1 and Plan 4 test. Expected: all PASS.
- [ ] **Step 5: Commit** (needs the Task 0 yes) with the message `studio: edit store, edits replayed on every load`.

### Task 3: Picking an object

**Files:**
- Create: `studio/web/editor/pick.ts`
- Modify: `studio/web/renderer.ts`. Add `pick` to `Stage`, and set `mesh.userData.id = obj.id` on every world mesh.
- Test: `studio/tools/pick.test.mjs`

**Interfaces:**
- Consumes: `Stage` (Plan 1 Task 7); the `data-id` and `data-block` attributes (Plan 4 Task 3).
- Produces:
  - `Stage` gains `pick(x: number, y: number): string | null`. x and y are in px at 1920×1080. It raycasts the visible meshes and returns the nearest hit's `userData.id`.
  - `pickAt(stage: Stage, x: number, y: number): { kind: 'world'|'vector'|'block'; id: string } | null`
- **Order of checks:**
  1. layout block (`document.elementsFromPoint`, the first element with `data-block`);
  2. vector (`data-id` inside the vector layer);
  3. world (`stage.pick`).
  The first hit wins.

- [ ] **Step 1: Write the failing tests** (browser from `launch()`) with the `vector-test` job of Plan 4:
  - `clicking the title picks its block`: at the title box centre. Expect `{ kind: 'block', id: <title id> }`.
  - `clicking the arrow picks the vector`: at a point on the arrow line, at t 2.
  - `clicking the antibody picks the world object`: at t = 8 (the third stop, 30 nm from the antibody), at the projected centre of `igg`. Expect `{ kind: 'world', id: 'igg' }`.
  - `empty space picks nothing`: a corner of the background gives `null`.
- [ ] **Step 2: Run** `node --test tools/pick.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `Stage.pick` with `THREE.Raycaster`, and `pickAt` in `pick.ts`.
- [ ] **Step 4: Run** the test. Expected: PASS, 4 tests.
- [ ] **Step 5: Commit** (needs the Task 0 yes) with the message `studio: pick world objects, vectors and blocks`.

### Task 4: Inspector and saving

**Files:**
- Create: `studio/web/editor/index.ts`, `studio/web/editor/inspector.ts`, `studio/tools/edits-server.mjs`
- Modify: `studio/web/vite.config.ts` (import `editsPlugin` and add it to `plugins`; this is the config Plan 1 Task 7 created, so no new config file), `studio/web/index.html` (mount the editor when the query has `edit=1`)
- Do not change the `dev` script in `studio/package.json`.
- Test: `studio/tools/inspector.test.mjs`

**Interfaces:**
- Consumes: `pickAt` (Task 3); `Edit`, `applyEdits` (Task 1); `appendEdit`, `undoLast` (Task 2); `SHIPPED_LENSES` (Task 1).
- Produces:
  - `mountEditor(stage: Stage, job: Job, root: HTMLElement, save: (e: Edit) => Promise<void>): { selected(): string | null; close(): void }`
  - `editsPlugin(jobsDir: string): import('vite').Plugin`, in `edits-server.mjs`. It serves:
    - `POST /__edits/<job>` with an `Edit` body: it calls `appendEdit` and returns 204;
    - `POST /__edits/<job>/undo`: it calls `undoLast` and returns the removed edit as JSON, or 204.
    - It refuses a job name that does not match `/^[a-z0-9-]+$/`, with 400.
- **What the inspector can change:**

  | Field | Edit |
  |---|---|
  | Block text, in the current language | `set /layout/<i>/blocks/<j>/text` |
  | Block box (x, y, w, h in px at 1920×1080) | `set /layout/<i>/blocks/<j>/box`, value `[x, y, w, h]` |
  | Vector text | `set /vectors/<i>/text/<lang>` |
  | Colour role | `set /world/objects/<i>/roles/0`, chosen from the lens's role keys only |
  | Size (metres, world) | `set /world/objects/<i>/size` |
  | Box (vectors) | `set /vectors/<i>/box` |
  | Position (frame units) | `set /world/objects/<i>/position` |

  **The layout row.** Selecting a layout block (a pick of kind `block`) shows a row with the text field and four number fields, x, y, w and h. `<i>` is the layout entry of the current stop and language, and `<j>` is the index of the block whose `id` equals the picked `data-block`. The row has no size and no colour field: the font size follows the block role (Plan 1 Task 7), and a colour change goes through a role.

  Each change builds one `Edit`:
  - `id` is `e-<at in ms>-<4 seeded hex>`, seeded from the job id and the count of edits;
  - `by` is `'the owner'`;
  - `at` is `new Date().toISOString()`. This is the only place the editor reads the clock; it never changes a picture.

  Each change first runs `applyEdits` on the current edits plus the new one. The edit is saved only if that passes. If it fails, the error shows in the panel. Ctrl+Z calls undo.
- With `?edit=1`, `index.html` mounts the editor after the deck. The full address is `?job=<id>&edit=1` (the `job` query is Plan 1's).

- [ ] **Step 1: Write the failing tests** (browser from `launch()`) with `npm run dev -- --port 4381 --host 127.0.0.1` and a copy of the zoom-test job named `edit-test` (pages open at `/?job=edit-test&edit=1`):
  - `changing a title writes one edit and shows it`: click the title, type "Hello" in the inspector text field, press Enter. Assert three things: `edits.jsonl` has one `set` line; the page shows "Hello"; a reload still shows "Hello".
  - `layout row changes a block box`: click the title block of stop 0 (English). The row shows its x, y, w and h. Set h to h + 6 and press Enter. Assert that `edits.jsonl` has one `set` line with path `/layout/0/blocks/0/box` and the value `[x, y, w, h + 6]`; that the element with `data-block` of the title has a height of h + 6 px at 1920×1080; and that a reload keeps it.
  - `layout row changes block text`: in the same row, type "Hello" and press Enter. One `set` line with path `/layout/0/blocks/0/text`.
  - `a box outside the safe area is refused`: set x to 1900. The panel shows the error from `loadJob` (the safe-area rule of Plan 1), and `edits.jsonl` is unchanged.
  - `role list holds only the lens roles`: the role field's options equal the keys of `SHIPPED_LENSES.journal.roles`.
  - `a size of zero is refused and nothing is saved`: the panel shows the error, and the file is unchanged. The refusal comes from `validateWorld` in Plan 1 (its test `rejects size zero or below`), reached through `applyEdits`.
  - `Ctrl+Z undoes the last edit`: after the title change, Ctrl+Z restores the old title and leaves the file with zero lines.
  - `bad job name is refused`: `POST /__edits/..%2Fx` returns 400.
- [ ] **Step 2: Run** `node --test tools/inspector.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `edits-server.mjs`, `editor/index.ts` and `inspector.ts`. In `studio/web/vite.config.ts`, register `editsPlugin(fileURLToPath(new URL('../jobs', import.meta.url)))` next to `studioFiles()`.
- [ ] **Step 4: Run** the test, then every earlier test. Expected: all PASS.
- [ ] **Step 5: Commit** (needs the Task 0 yes) with the message `studio: inspector, save and undo`.

### Task 5: Timeline panel

**Files:**
- Create: `studio/web/editor/timeline.ts`
- Test: `studio/tools/timeline-panel.test.mjs`

**Interfaces:**
- Consumes: `Timeline`, `Track` (Plan 1 Task 2); `Edit` (Task 1); `mountEditor` (Task 4).
- Produces: `mountTimeline(job: Job, root: HTMLElement, onEdit: (e: Edit) => Promise<void>, seek: (t: number) => void): { setTime(t: number): void }`
- **Layout:**
  - one row per track, labelled `<target>.<prop>`;
  - the scale is 100 px per second;
  - each key is a 10 px dot with `data-track="<i>"` and `data-key="<k>"`;
  - a playhead line shows the current t.
- **Behaviour:**
  - Dragging a key horizontally and releasing it builds `retime /timeline/tracks/<i>/keys/<k>` with `value = original t + dx/100`.
  - Clicking the ruler calls `seek(t)`.
  - A refused retime shows its error, and the dot jumps back.

- [ ] **Step 1: Write the failing tests** (browser from `launch()`):
  - `one row per track`: the row count equals `job.timeline.tracks.length`.
  - `drag 60 px right retimes by 0.6 s`: key 1 of track 0 moves from t = 8 to t = 8.6, snapped to 1/30 (`/timeline/tracks/0/keys/1`). `edits.jsonl` gets one `retime` line.
  - `drag past the next key is refused`: drag key 0 of track 0 (t = 0) 900 px right, past key 1 (t = 8). The error text shows, the dot returns, and no line is written.
  - `clicking the ruler seeks`: a click at x = 250 px puts the stage at t = 2.5.
- [ ] **Step 2: Run** `node --test tools/timeline-panel.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `mountTimeline`, and mount it from `mountEditor` below the stage.
- [ ] **Step 4: Run** the test. Expected: PASS, 4 tests.
- [ ] **Step 5: Commit** (needs the Task 0 yes) with the message `studio: timeline panel with retime edits`.

### Task 6: 3D camera shots

**Files:**
- Create: `studio/web/editor/camera.ts`
- Modify: `studio/web/renderer.ts`. Add `freeCamera(on: boolean)` and `cameraPlace(): { at: Place; target: Place; fov: number }` to `Stage`.
- Test: `studio/tools/camera-shot.test.mjs`

**Interfaces:**
- Consumes:
  - `cameraAt` (Plan 1 Task 4);
  - `rootOf` (Plan 1 Task 3);
  - `CameraKey` (Plan 1 Task 4);
  - `Edit` (Task 1).
- Produces:
  - `Stage` gains `freeCamera(on: boolean): void` and `cameraPlace(): { at: Place; target: Place; fov: number }`.
  - `mountCameraTool(stage: Stage, job: Job, pathId: string, onEdit: (e: Edit) => Promise<void>, now: () => number): void`
- **Behaviour:**
  - Key `C` toggles the free camera. OrbitControls rotate around the target, and its distance is clamped to [0.1·d, 10·d] of the path's distance at that t.
  - The orbit offset lives in metres. `cameraPlace()` turns it back into frame units by dividing by `rootOf(world, frame).scale`.
  - The "Save shot" button builds a `CameraKey` from `cameraPlace()`, with `t = now()` snapped to 1/30.
    - If a key with that t exists, the edit is `set /paths/<p>/keys/<k>`.
    - If not, the edit is `add /paths/<p>/keys/<insert index>`, where the index keeps the keys sorted.
  - Leaving the free camera returns to the path.

- [ ] **Step 1: Write the failing tests** (browser from `launch()`):
  - `free camera does not change the job`: toggle `C`, drag, toggle `C` again. `edits.jsonl` is unchanged, and the pixels at t equal the pixels before.
  - `save shot inserts a sorted camera key`: at t = 5.0 between keys at 4 and 8, save. There is one `add` line at index 2, and the path keys stay sorted.
  - `save shot on an existing key time sets it`: at t = 4.0. There is one `set` line.
  - `the saved shot plays back`: after reload, seek 5.0. The pixels equal the free-camera view captured when saving, with mean difference below 1%.
- [ ] **Step 2: Run** `node --test tools/camera-shot.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `freeCamera` and `cameraPlace` in `renderer.ts`, then `mountCameraTool` in `camera.ts`.
- [ ] **Step 4: Run** the test, then every earlier test. Expected: all PASS.
- [ ] **Step 5: Commit** (needs the Task 0 yes) with the message `studio: save camera shots as edits`.

### Task 7: Edits from words

**Files:**
- Create: `studio/tools/words.mjs`
- Modify: `studio/package.json` (add the script `"edit": "node tools/words.mjs"`)
- Test: `studio/tools/words.test.mjs`

**Interfaces:**
- Consumes: `applyEdits`, `diffJobs`, `Edit` (Task 1); `readEdits`, `appendEdit` (Task 2).
- Produces: the command `npm run edit -- <job> [--words "<text>"] [--apply]`. `--words` is only needed to print the summary; `--apply` needs only the stored `proposed.json`.

**The three ways it runs:**
1. **No `studio/jobs/<job>/proposed.json`:** it prints the words (when given) and a job summary to stdout, then exits 0. The summary lists:
   - world object ids with kind, roles and size;
   - vector ids with type and text;
   - layout blocks with stop, language, id and text;
   - tracks as `<target>.<prop>` with key times;
   - path ids with key times.
   It then prints one line: `Write the edits to studio/jobs/<job>/proposed.json, then run again.`
2. **`proposed.json` exists, without `--apply`:** it reads the file as an array of edits, fills in any missing `at` and sets `by: 'agent'`. It runs `applyEdits` on the stored edits plus the proposed ones, then prints the `diffJobs` lines as `path: before → after`. On failure it prints the error and exits 1.
3. **With `--apply`:** the same as 2, then each edit goes through `appendEdit`. `proposed.json` is renamed to `proposed.applied-<ms>.json`.

In the pilot, the Claude Code session reads the summary, writes `proposed.json`, shows the owner the diff of way 2, and runs way 3 only after his yes.

- [ ] **Step 1: Write the failing tests:**
  - `summary when nothing is proposed`: stdout contains `igg`, the title block id, and the final instruction line. The exit code is 0.
  - `dry run shows the diff and writes nothing`: a proposal that sets `/world/objects/0/size` to 0.03. stdout contains `/world/objects/0/size:` and `→ 0.03`. `edits.jsonl` is unchanged.
  - `bad proposal exits 1 and writes nothing`.
  - `apply appends with by agent and renames the proposal`.
  - `apply works without --words`: with a stored `proposed.json`, `npm run edit -- <job> --apply` exits 0 and appends the edits.
- [ ] **Step 2: Run** `node --test tools/words.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `words.mjs`.
- [ ] **Step 4: Run** the test. Expected: PASS, 5 tests.
- [ ] **Step 5: Commit** (needs the Task 0 yes) with the message `studio: edits from words through a checked proposal`.

### Task 8: Rebuild into a pilot job

**Files:**
- Create: `studio/tools/rebuild/into.mjs`
- Modify: `studio/tools/rebuild/cli.mjs` (the Plan 4 `rebuild` command gains `--into <job>` and `--stop <n>`)
- Test: `studio/tools/rebuild/test/into.test.mjs`

**Interfaces:**
- Consumes: `Edit`, `applyEdits`, `diffJobs` (Task 1); `readEdits` (Task 2); `Job`, `loadJob` (Plan 1); the scratch job from Plan 4 (`"rebuild": true`, `vectors`, `world.objects`); `letterbox` is not needed here because the scratch vectors are already in 1920×1080 poster coordinates.
- Produces:
  - `proposeInto(scratch: Job, scratchId: string, target: Job, stop: number, only?: string[]): Edit[]`
  - The command `npm run rebuild -- <png> --job <scratch-job> --into <job> --stop <n> [--only <id>[,<id>...]]`. It does not rebuild again: it reads the finished scratch job `studio/jobs/<scratch-job>/job.json` and writes `studio/jobs/<job>/proposed.json`. It prints the `diffJobs` lines and then the line `Show the owner this diff. After his yes, run: npm run edit -- <job> --apply`.
- **Rules of `proposeInto`:**
  - The scratch job must hold `"rebuild": true`; otherwise throw `<scratch-id> is not a rebuild job`.
  - `stop` is an index into the stops of the first `deck` path of the target. If it is out of range, throw `stop <n> not in 0..<k-1>`.
  - The window is `[stops[n], stops[n+1]]`, or `[stops[n], target.world.duration]` for the last stop.
  - If the target has no `vectors` array, the first edit is `add /vectors` with value `[]`.
  - Each scratch vector becomes `add /vectors/-` with `id` set to `<scratchId>-<id>`, the same prefix on every `children` entry, and `window` set to the stop window.
  - Each scratch world object becomes `add /world/objects/-`, with the same id prefix and window, and `frame` set to the first frame of the target whose `parent` is null.
  - Edit ids are `p-<index>` and `by` is `'agent'`. `at` is left out; the `edit` command fills it in.
  - **`only`.** When given, only the scratch vectors and world objects with these ids (the ids as they are in the scratch job, without the prefix) are proposed, together with their children (a group brings its children, to any depth). Without `only`, every scratch object and vector is proposed. An id that matches nothing stops the command with `unknown part "<id>"` and nothing is written. The `add /vectors` edit is still first when the target has no `vectors`.
  - `proposed.json` is written only if `applyEdits(target, readEdits(jobDir) plus these edits)` passes. If `proposed.json` already exists, stop with `proposed.json exists: apply it or delete it`.

- [ ] **Step 1: Write the failing tests** in `into.test.mjs`. Use a copy of zoom-test named `into-test` (stops `[0, 4, 8]`, duration 12, no `vectors`) and the finished `rebuild-fixture` job of Plan 4 as the scratch job.
  - `proposal adds the scratch vectors at stop 1`: `proposed.json` holds the `add /vectors` edit first, then one `add /vectors/-` edit per scratch vector. Every id starts with `rebuild-fixture-`, and every window is `[4, 8]`.
  - `group children get the same prefix`: the group `circle` in the proposal lists children with the `rebuild-fixture-` prefix, and each exists in the proposal.
  - `the last stop ends at the duration`: stop 2 gives the window `[8, 12]`.
  - `diff is printed and nothing is applied`: stdout contains `/vectors/` and the `npm run edit -- into-test --apply` line. `edits.jsonl` does not exist.
  - `a stop out of range stops with nothing written`: stop 3. The exit code is 1, the message contains `stop 3`, and `proposed.json` does not exist.
  - `a pilot job as scratch is refused`: scratch `zoom-test`. The message contains `is not a rebuild job`.
  - `an existing proposal is not overwritten`: run twice. The second run exits 1 with `proposed.json exists`.
  - `--only proposes just the named parts`: run with `--only circle`. Every `add /vectors/-` edit has an id that starts with `rebuild-fixture-circle`, and the group's children are all present. No edit holds the id of the rectangle, the arrow or the text part of the fixture. A run without `--only` holds all of them.
  - `--only with an unknown id stops`: `--only nope`. The exit code is 1, the message contains `unknown part "nope"`, and `proposed.json` does not exist.
  - `apply after the yes`: `npm run edit -- into-test --apply` appends one line per edit with `by: 'agent'`. Loading `into-test` with its edits gives a job with the same number of vectors as the scratch job, all valid under `loadJob`.
- [ ] **Step 2: Run** `node --test tools/rebuild/test/into.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `into.mjs` and the three flags (`--into`, `--stop`, `--only`) in `cli.mjs`.
- [ ] **Step 4: Run** the test. Expected: PASS, 10 tests. Then run every Plan 4 rebuild test again. Expected: PASS.
- [ ] **Step 5: Commit** (needs the Task 0 yes) with the message `studio: propose a rebuild into a pilot job as edits`.

### Task 9: Hand-over

- [ ] **Step 1: Run every test.** Run `npm test`, `npm run typecheck`, all of `studio/tools/**/*.test.mjs` and the Plan 4 Python tests. Expected: all PASS. Paste the pass lines into `studio/ledger/plan5.md`.
- [ ] **Step 2: Make one change in each of the four ways** on a copy of the zoom-test job:
  - a title by click;
  - a key by drag;
  - a size by words;
  - a shot by camera.
  Then export an MP4. Confirm that all four changes are in the video. Write the frame numbers into the ledger.
- [ ] **Step 3: Update section 2 of** `.\docs\superpowers\plans\2026-10-31-studio-00-index.md`. Under a new heading "Plan 5", list every name this plan produced, with its exact signature:
  - `Edit`, `SHIPPED_LENSES`, `getAt`, `applyEdits`, `undo`, `diffJobs`;
  - `readEdits`, `appendEdit`, `undoLast`;
  - `Stage.pick`, `Stage.freeCamera`, `Stage.cameraPlace`;
  - `pickAt`, `mountEditor`, `editsPlugin` (registered in `studio/web/vite.config.ts`), `mountTimeline`, `mountCameraTool`;
  - `proposeInto` and the `rebuild --into <job> --stop <n> [--only <id>[,<id>...]]` flags;
  - the files `edits.jsonl` and `proposed.json`;
  - the `?edit=1` and `?edits=0` page flags, and the `--no-edits` export flag;
  - the `edit` command (`--words` optional, `--apply` applies a stored `proposed.json`).
- [ ] **Step 4: Retain one Cammut note** with the test results and the four-way check. Check it with `get_operation`, then read it back.
- [ ] **Step 5: Tell the owner** how to open the editor (`npm run dev`, then open the printed address with `/?job=<id>&edit=1`) and what each panel does. Say how a rebuild joins a pilot job: `rebuild --into` (with `--only` to take just some parts), then his yes, then `edit --apply`. Do not push.
