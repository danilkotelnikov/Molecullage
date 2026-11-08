<!-- version: p3 | date: 2026-10-31 | status: draft for the owner's review -->
# Molecullage Studio, Plan 3: the photoreal path — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking. Read `2026-10-31-studio-00-index.md` (executor rules) before Task 0.

**Goal:** Give each scene a second render path. The world is exported at time t to glTF, Blender renders it with Cycles from the command line, and the frames are stored in a cache keyed by content. The deck and the video then play those baked frames by t. CPU-heavy work can run on the owner's Linux home server.

**Architecture:**
- `studio/core/bake.ts` is pure: shot ranges, frame numbers, cache keys and the time budget.
- `studio/web/gltf.ts` exports the live scene at t, in camera space, rescaled so the camera's target sits at distance 1. This keeps Blender's numbers small at every scale (design 4, camera-relative).
- `studio/blender/render_world.py` renders one frame.
- `studio/tools/bake.mjs` ties the parts together and skips frames whose key is unchanged.
- The renderer shows a baked frame when t falls inside a baked shot.

**Tech Stack:**
- Plan 1 and Plan 2 tools.
- Blender 5.2.2 at `<local-path>`. A working headless example is `.\struct\denoise\render_blender_assets.py` (read only, by absolute path).
- `GLTFExporter` from three 0.186.1 (`three/examples/jsm/exporters/GLTFExporter.js`).
- Windows OpenSSH (`ssh`, `scp`) for the home server.
- No new packages.
- Every playwright test and tool starts its browser with `launch()` from `studio/tools/browser.mjs` (made in Plan 1 Task 7). Do not write another launch call.
- Folders outside `studio/` are read only, by absolute path (`.\struct\`, `...\stage\`, `...\film\`, `...\tokens\`). Never use a relative path to them.

**Spec:** `docs/superpowers/specs/2026-10-31-engine-design.md`, sections 7, 11 and 14a.1. Plans 1 and 2 must be done first.

## Global Constraints

- Every Global Constraint of Plans 1 and 2 holds here.
- In a photoreal shot, the live deck shows baked frames, and the camera follows the saved path (design 14a.1).
- "The same t gives the same picture" holds inside each path. The live path is a stand-in for the photoreal one (design 14a.1).
- Any single bake whose estimated total time is over 30 minutes is a **GATE**. Show the owner the estimate and wait for his yes (index rule 7).
- Each bake records the seconds per frame. A shot has a budget (`Job.budget.secondsPerFrame`). A frame over 1.5× the budget stops the bake with a plain message.
- Credentials are never written to any file, log or command line. The home server is reached with the owner's own SSH key and settings. Only host, user and folder are stored, in `studio/remote.json`, which git ignores.
- Blender and remote work run at low priority: `start /low` on Windows, `nice -n 10` on Linux. At most one Blender process runs at a time on the laptop (house rule: two heavy processes).
- The cache folder `studio/cache/` is ignored by git and never committed.
- Baked frames reach the page over HTTP through the relative URL `cache/...` (served at `/cache/` by the dev and preview servers), which `studioFiles()` in `studio/web/vite.config.ts` already serves in dev and preview (Plan 1 Task 7). This plan does not change the Vite config.
- Every commit step needs the commit yes from Task 0 Step 1. Without it, stop before committing.

## Review Focus

1. **A t at the exact start or end of a baked shot.** The first frame plays at t0, and the last frame holds at t1, with no gap or flicker into the live path. Pinned in Task 1 (`frameAt clamps at the shot edges`) and Task 5 (`edge of a shot shows a baked frame`).
2. **A change to the world, the lens or the render settings.** Every affected frame bakes again. A change to an unrelated shot bakes nothing. Pinned in Task 1 (`key changes only with its inputs`) and Task 4 (`changed lens re-bakes, other shot does not`).
3. **A baked frame that is missing at play time.** The page shows the live picture and does not freeze. The export check reports `missing-bake` with the shot and frame. Pinned in Task 5 (`missing frame falls back and is reported`).
4. **A deep-zoom shot at 30 nm in Blender.** The object is in view and not clipped, because the export rescales the scene so the target sits at distance 1. Pinned in Task 2 (`export rescales the target to distance 1`) and Task 3 (`render shows the object at nano scale`).
5. **A final-quality bake started by mistake or without a check.** `FINAL` (1920×1080, 256 samples, denoise on) is a separate settings value from `DRAFT`. A bake with `FINAL` shows its estimate first, and over 30 minutes it stops for the owner's yes. Pinned in Task 1 (`FINAL and DRAFT values`) and Task 4 (`estimate gate stops without --approved`).
6. **The home server is unreachable, or Blender is missing there.** The command stops with a plain message naming the failed step. It never leaves a half-copied job reported as done. Pinned in Task 6 (`remote stops cleanly when the host is down`).

---

### Task 0: Approval gate

**Files:** `studio/.gitignore` (add `cache/`, `remote.json`).

- [ ] **Step 1: GATE.** Ask the owner for four things, in one plain message:
  1. a yes to commits on this branch and to `npm ci` with the approved versions (the commit GATE: every commit step below needs it; `npm ci` installs only the versions in the lockfile that the owner approved in Plan 1);
  2. a standing rule for Blender renders: estimates under 30 minutes may run, and longer ones need his yes each time;
  3. the home server's host name, user name and the folder to use. Ask for no password or key; his SSH must already work from this laptop;
  4. the path of Blender on the home server, or a yes to use CPU work there for encoding only.
  Record the answers in `studio/ledger/plan3.md`. Write only host, user, folder and the Blender path into `studio/remote.json`.
- [ ] **Step 2: Create the branch** `studio/plan3` from the tip of branch `studio/plan2`, not from `main`, so the code of Plans 1 and 2 is present. Use a new worktree. In it, run `npm ci` in `studio/`. Expected: it exits 0 and installs nothing outside the lockfile.
- [ ] **Step 3: Check Blender.** Run `"<blender path>" -b --version`. Expected: a line starting with `Blender 5.2.2`. If not, stop and ask.
- [ ] **Step 4: Add the two lines to `studio/.gitignore`.** Then run `npm test`. Expected: all PASS.

### Task 1: Shots, frames, cache keys and the budget

**Files:**
- Create: `studio/core/bake.ts`
- Modify: `studio/core/job.ts` (`Job` gains `shots?: Shot[]` and `budget?: { secondsPerFrame: number }`; `loadJob` checks them)
- Test: `studio/core/test/bake.test.ts`

**Interfaces:**
- Consumes: `Job`, `World`, `Lens` (Plan 1).
- Produces:
  - `type RenderSettings = { width: number; height: number; samples: number; denoise: boolean; device: 'GPU'|'CPU' }`
  - `type Shot = { id: string; path: string; t0: number; t1: number; fps: number; render: 'live'|'baked'; settings: RenderSettings }`
  - `DRAFT: RenderSettings`, which is `{ width: 960, height: 540, samples: 16, denoise: true, device: 'GPU' }`
  - `FINAL: RenderSettings`, which is `{ width: 1920, height: 1080, samples: 256, denoise: true, device: 'GPU' }`. Plans 7–9 switch a shot's `settings` to `FINAL` before the full bake.
  - `shotAt(job: Job, path: string, t: number): Shot | null`, the first baked shot of that path whose [t0, t1] holds t.
  - `frameCount(shot: Shot): number`, which is `floor((t1 − t0)·fps) + 1`.
  - `frameAt(shot: Shot, t: number): number`, which is `clamp(round((t − t0)·fps), 0, frameCount − 1)`.
  - `timeOf(shot: Shot, frame: number): number`, which is `t0 + frame/fps`.
  - `canonical(value: unknown): string`, JSON with object keys sorted at every level.
  - `bakeKey(job: Job, lens: Lens, shot: Shot, frame: number): string`, the sha256 hex of `canonical({ world: job.world, timeline: job.timeline, path: <the shot's CameraPath>, lens, settings: shot.settings, t: timeOf(shot, frame).toFixed(6) })`. Use `node:crypto`; in the browser, use `crypto.subtle`, which gives the same bytes.
  - `framePath(jobId: string, shotId: string, frame: number): string`, which gives `studio/cache/<jobId>/<shotId>/<frame as 5 digits>.png` (the file on disk).
  - `frameUrl(jobId: string, shotId: string, frame: number): string`, which gives the relative URL `cache/<jobId>/<shotId>/<frame as 5 digits>.png` (the URL the page loads; no leading slash, so a site served from a folder such as `deck/` resolves it against the page).
  - `overBudget(seconds: number, budget: number): boolean`, which is `seconds > 1.5 × budget`.
- New job checks:
  - shots of one path must not overlap (`a.t0 < b.t1 && b.t0 < a.t1`; shots that only touch at one t are allowed, and `shotAt` returns the earlier one at that t);
  - `t0 < t1` and `fps` in [1, 120];
  - `path` must name an existing camera path;
  - `budget.secondsPerFrame > 0`.

- [ ] **Step 1: Write the failing tests:**
  - `frameAt clamps at the shot edges`. Shot t0 = 2, t1 = 4, fps 30. Assert:
    - `frameCount` = 61;
    - `frameAt(2)` = 0, `frameAt(4)` = 60, `frameAt(1)` = 0, `frameAt(9)` = 60;
    - `frameAt(2.0166)` = 0, and `frameAt(2.0167)` = 1.
  - `shotAt finds the shot or null`. Two shots, [0, 2] and [5, 6]. Assert t = 3 gives null, and t = 5 gives the second shot.
  - `key changes only with its inputs`. Assert:
    - the same inputs give the same key;
    - changing one object's position, the lens background, `samples` or the frame each gives a different key;
    - reordering the keys inside `world.frames[0]` gives the same key.
  - `framePath pads the frame`: `framePath('zoom-test','s1',7)` equals `studio/cache/zoom-test/s1/00007.png`, and `frameUrl('zoom-test','s1',7)` equals `cache/zoom-test/s1/00007.png` (relative, no leading slash). A second assertion: `frameUrl(...)` never starts with `/`.
  - `FINAL and DRAFT values`: `DRAFT` equals `{ width: 960, height: 540, samples: 16, denoise: true, device: 'GPU' }`, and `FINAL` equals `{ width: 1920, height: 1080, samples: 256, denoise: true, device: 'GPU' }`.
  - `overlapping shots are rejected`: `loadJob` returns an error containing `shots "a" and "b" overlap`. Shots [0, 1] and [1, 2] on one path are accepted.
  - `overBudget`: 15 against a budget of 10 is false, and 15.01 against 10 is true.
- [ ] **Step 2: Run** `node --test core/test/bake.test.ts` in `studio/`. Expected: FAIL.
- [ ] **Step 3: Implement** `bake.ts` and the job checks.
- [ ] **Step 4: Run** `npm test` and `npm run typecheck`. Expected: all PASS.
- [ ] **Step 5: Commit** (needs the Task 0 yes) with the message `studio: shots, frame numbers, content cache keys, budget`.

### Task 2: Export the world at t to glTF

**Files:**
- Create: `studio/web/gltf.ts`
- Modify: `studio/web/renderer.ts`. `Stage` gains `three: { scene: THREE.Scene; camera: THREE.PerspectiveCamera }`, and `window.__studio` gains `snapshot(t)`.
- Test: `studio/tools/gltf.test.mjs`

**Interfaces:**
- Consumes: `Stage` (Plan 1); `applyOptics`, with `cam.userData.focus` and `fstop` (Plan 2); `cameraAt` (Plan 1).
- Produces:
  - `type CameraJson = { fovDeg: number; aspect: number; near: number; far: number; focus?: number; fstop?: number; sensorMm: [number, number] /* from CameraKey.optics, default [36, 24] */; exportScale: number; background: string /* lens background, #rrggbb */ }`
  - `exportAt(stage: Stage, t: number): Promise<{ glb: ArrayBuffer; camera: CameraJson }>`
  - `window.__studio.snapshot(t: number): Promise<{ glbBase64: string; camera: CameraJson }>`

**The algorithm that the tests do not fix:**
- Seek to t.
- Clone the scene. The camera is at the origin, because the renderer works camera-relative.
- Set `exportScale = 1 / cameraAt(...).distance`. Multiply every object position and scale, every light position and size, `near`, `far` and `focus` by `exportScale`. Keep `fovDeg`, which does not change with scale.
- Export with `GLTFExporter.parseAsync(scene, { binary: true })`.
- Hidden objects, or objects with opacity 0 from `swapAlpha`, are left out. Objects with partial opacity keep their opacity in the material alpha.

- [ ] **Step 1: Write the failing tests** in `gltf.test.mjs`. Use playwright-core (browser from `launch()` in `studio/tools/browser.mjs`) on `vite preview` port 4380, with the zoom-test job.
  - `snapshot is a valid glb`: decode `glbBase64`. Assert the first 4 bytes are `glTF`, and the version uint32 at byte 4 is 2.
  - `camera json carries background and sensor`: `background` equals the lens background, and `sensorMm` is `[36, 24]` when the key has no optics.
  - `export rescales the target to distance 1`: at the stop-3 time (camera 30 nm from the antibody), the antibody node's translation length in the glb JSON chunk is 1 within 1e-3, and `camera.exportScale` is 1/3e-8 within 0.1%.
  - `hidden stand-ins are left out`: at a distance where `swapAlpha` is 0, the glb has no node named `igg:standIn`.
  - `same t gives the same glb`: two snapshots at t = 2 have byte-equal glb data.
- [ ] **Step 2: Run** `npm run build`, preview, then `node --test tools/gltf.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `exportAt` and `snapshot`. Name each glTF node `<object id>` or `<object id>:standIn`.
- [ ] **Step 4: Run** the test and all the Plan 1 and Plan 2 tool tests. Expected: PASS.
- [ ] **Step 5: Commit** with the message `studio: export the world at t to glb, camera-relative and rescaled`.

### Task 3: Render one frame in Blender

**Files:**
- Create: `studio/blender/render_world.py`, `studio/blender/fixtures/cube.glb` (generated in Step 1), `studio/jobs/cube-test/job.json` (one 1 cm cube mesh, one `deck` path with one stop), `studio/jobs/cube-test/cube.camera.json` (generated in Step 1), `studio/tools/blender.test.mjs`

**Interfaces:**
- Consumes: the glb and `CameraJson` from Task 2; `RenderSettings` from Task 1; the browser from `launch()` (`studio/tools/browser.mjs`, Plan 1 Task 7) in the nano-scale test.
- Produces:
  - The command line: `<blender> -b --factory-startup -P studio/blender/render_world.py -- --glb <file> --camera <json> --out <png> --width W --height H --samples S --device GPU|CPU [--denoise]`
  - On success it prints one line `RENDER_OK seconds=<float>` and exits with 0. On any error it prints `RENDER_FAIL <reason>` and exits with 1.

**Script rules:**
1. Clear the scene, then import the glb with `bpy.ops.import_scene.gltf`.
2. Make a camera at the origin looking down −Z, the glTF camera convention:
   - `sensor_fit = 'VERTICAL'`;
   - `sensor_height = sensorMm[1]`;
   - `lens = sensorMm[1] / (2·tan(fovDeg/2))`;
   - `clip_start = near`, `clip_end = far`;
   - when `focus` is set: `dof.use_dof = True`, `focus_distance = focus`, `aperture_fstop = fstop`.
3. Cycles settings:
   - `samples` from the argument;
   - `use_denoising` from the argument;
   - device `GPU` when asked and available, otherwise `CPU`, with a printed note `device fell back to CPU`.
4. Render with `film_transparent = False` and the world colour equal to `CameraJson.background`.
5. Write the PNG with `bpy.ops.render.render(write_still=True)`.

Follow the import and render calls of `.\struct\denoise\render_blender_assets.py` (read only).

- [ ] **Step 1: Make the fixture.** Write the job `studio/jobs/cube-test/job.json`: one frame in metres; one object of kind `mesh` (a cube, `size` 0.01 m, so 1 cm); one camera path `deck` with one key and one stop, the camera 0.05 m from the cube. Run a one-off export in the preview page (`?job=cube-test`) with `window.__studio.snapshot(0)`, and save the glb as `studio/blender/fixtures/cube.glb` and the camera JSON as `studio/jobs/cube-test/cube.camera.json`. The `renders a small frame` test uses these two files.
- [ ] **Step 2: Write the failing tests** in `blender.test.mjs`. Spawn Blender with `start /low` on Windows.
  - `renders a small frame`: cube fixture, 64×64, 8 samples, CPU. Assert:
    - the exit code is 0;
    - the output has a line matching `/RENDER_OK seconds=\d/`;
    - the PNG exists, and its IHDR width and height are 64;
    - the run takes under 120 s.
  - `fails loudly on a bad glb`: a text file passed as `--glb`. Assert exit code 1 and a line starting `RENDER_FAIL`.
  - `render shows the object at nano scale`: snapshot the zoom-test at stop 3, render 128×72 with 8 samples on CPU. Assert more than 2% of the pixels differ from the background colour.
- [ ] **Step 3: Run** `node --test tools/blender.test.mjs`. Expected: FAIL.
- [ ] **Step 4: Implement** `render_world.py`.
- [ ] **Step 5: Run** the test. Expected: PASS, 3 tests.
- [ ] **Step 6: Commit** with the message `studio: headless Cycles render of one exported frame`.

### Task 4: The bake command

**Files:**
- Create: `studio/tools/bake.mjs`, `studio/jobs/bake-test/job.json` (a copy of the zoom-test job with the shots below; it stays on disk for Tasks 5 and 6)
- Modify: `studio/package.json` (add the script `"bake": "node tools/bake.mjs"`)
- Test: `studio/tools/bake.test.mjs`

**Interfaces:**
- Consumes: `bakeKey`, `framePath`, `frameCount`, `timeOf`, `overBudget`, `DRAFT` (Task 1); `snapshot` (Task 2); `render_world.py` (Task 3).
- Produces:
  - The command `npm run bake -- <job> --shot <id> [--lens <id>] [--draft] [--approved]`.
  - The files `studio/cache/<job>/<shot>/<NNNNN>.png`, `<NNNNN>.key`, `log.jsonl` (one line per frame: `{ frame, key, seconds, device, at }`) and `bake.json` (`{ shot, lens, settings, frames, estimateMinutes }`).

**How it works:**
1. Load the job. Pick the lens (the default is the job's `lens`). Use `DRAFT` settings when `--draft` is given.
2. Open one preview page with playwright-core, with the browser from `launch()` in `studio/tools/browser.mjs`.
3. For each frame:
   - compute the key;
   - if `<NNNNN>.png` and `<NNNNN>.key` exist and the key is equal, skip the frame;
   - otherwise snapshot at `timeOf`, write the glb and the camera JSON to `studio/cache/<job>/<shot>/tmp/`, run Blender, write the PNG and the key, and append to the log.
4. After the first rendered frame, estimate the total: the first frame's seconds × the frames left.
   - If the estimate is over 30 minutes and `--approved` is missing, stop with `estimate <m> min is over 30 min: ask the owner, then run again with --approved`.
5. If a frame is `overBudget`, stop with `frame <n> took <s> s, budget is <b> s`.
6. The environment variable `STUDIO_FAKE_SECONDS=<n>` replaces the measured seconds, for tests only.
7. Delete `tmp/` at the end.

- [ ] **Step 1: Write the failing tests** in `bake.test.mjs`. First make the job `studio/jobs/bake-test/` (a copy of zoom-test) with three shots, all on path `deck`, fps 10, settings `DRAFT` (the tests set 32×18, 4 samples, CPU). `s-test` is `render: 'baked'`. `A` and `B` are `render: 'live'`, so the export of `bake-test` in Task 5 reports no missing bakes; `bake` bakes the shot named by `--shot` whatever its `render` value is:
  - `A`: t 0–1 (11 frames);
  - `B`: t 1–2 (11 frames);
  - `s-test`: t 2–2.2 (3 frames).
  `bake-test` itself persists for Tasks 5 and 6. Tests that change a job work on a temporary copy `studio/jobs/bake-test-tmp/` (and its cache folder) and delete only that copy.
  - `first run renders all frames`: bake `s-test` from the copy. Three PNG files and three log lines.
  - `second run renders nothing`: the log gains no lines, and the output says `0 rendered, 3 cached`.
  - `changed lens re-bakes, other shot does not`: in the copy, bake shot A and shot B, both with lens `journal` (11 rendered each). Bake A again with `--lens cinematic`: 11 rendered, because the key changed with the lens. Bake B again with `--lens journal`: 0 rendered, 11 cached.
  - `estimate gate stops without --approved`: `STUDIO_FAKE_SECONDS=1200` with `s-test` (3 frames) gives an estimate of 40 min. Assert the exit code is 2 and the message contains `ask the owner`.
  - `budget stop`: in the copy, `budget.secondsPerFrame = 1` with `STUDIO_FAKE_SECONDS=5`. Assert the exit code is 3 and the message contains `budget is 1 s`.
- [ ] **Step 2: Run** `node --test tools/bake.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `bake.mjs`, with exit codes 0 (done), 1 (error), 2 (estimate gate) and 3 (budget stop).
- [ ] **Step 4: Run** the test. Expected: PASS, 5 tests. Check that `studio/jobs/bake-test/job.json` is unchanged (`git diff --stat` shows no change to it).
- [ ] **Step 5: Commit** (needs the Task 0 yes) with the message `studio: bake command with content cache, estimate gate and budget`.

### Task 5: Play baked frames by t

**Files:**
- Modify: `studio/web/renderer.ts` (baked playback), `studio/tools/checks.mjs` (add `missing-bake`)
- Test: `studio/tools/baked.test.mjs`

**Interfaces:**
- Consumes: `shotAt`, `frameAt`, `framePath` (Task 1); the bake output (Task 4).
- Produces:
  - Renderer behaviour: when `shotAt(job, path, t)` is a baked shot, `seek(t)` shows the image at `frameUrl(...)` (served by `/cache/`) as a full-viewport image over the canvas, and the layout layer stays on top. Otherwise it shows the live canvas.
  - `checkPage` gains the finding kind `'missing-bake'`, with `detail = "<shot> frame <n>"`.
  - `window.__studio.mode(): 'live' | 'baked'`, for tests.

- [ ] **Step 1: Write the failing tests** in `baked.test.mjs`. Use the browser from `launch()` (`studio/tools/browser.mjs`). Bake the 3-frame test shot `s-test` (t 2–2.2) of the job `bake-test` first (Task 4 command).
  - `baked t shows the baked frame`: at t = 2.1, `mode()` is `baked`. The visible image hash equals the hash of `00001.png`.
  - `edge of a shot shows a baked frame`: t = 2 shows `00000.png`, and t = 2.2 shows `00002.png`. At t = 2.2001, `mode()` is `live`.
  - `frames are served through /cache/`: fetch `/cache/bake-test/s-test/00001.png` from the preview server. Assert status 200 and content type `image/png`. Also assert that `frameUrl('bake-test','s-test',1)` is `cache/bake-test/s-test/00001.png` and that the page loads exactly that relative URL (read `img.getAttribute('src')`).
  - `missing frame falls back and is reported`: delete `00001.png`. At t = 2.1, `mode()` is `live`, and `checkPage` returns `{ kind: 'missing-bake', detail: 's-test frame 1' }`.
  - `seek back gives the fresh-page pixels` still holds across a baked shot: the Plan 1 test, extended to a t inside the shot.
- [ ] **Step 2: Run** `node --test tools/baked.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** the playback and the check. Load images with `await img.decode()` inside `seek`, so the frame is on screen before `seek` resolves.
- [ ] **Step 4: Run** this test, then all the tool tests of Plans 1–3. Expected: all PASS.
- [ ] **Step 5: Run the MP4 export** of the test copy job that holds the baked shot, not of zoom-test: `npm run export -- bake-test --lens journal --lang en --fps 10`. Expected: the checks show no findings, and the MP4 holds the 3 baked frames.
- [ ] **Step 6: Commit** (needs the Task 0 yes) with the message `studio: play baked frames by t, report missing bakes`.

### Task 6: CPU work on the home server

**Files:**
- Create: `studio/tools/remote.mjs`
- Modify: `studio/package.json` (add the script `"remote": "node tools/remote.mjs"`), `studio/tools/bake.mjs` (add the `--export-only` flag)
- Test: `studio/tools/remote.test.mjs`

**Interfaces:**
- Consumes: `studio/remote.json` (Task 0): `{ host: string; user: string; folder: string; blender?: string }`. It also uses the bake files (Task 4).
- Produces: the command `npm run remote -- <job> --shot <id> --task encode|render [--dry]`.
  - `encode`: copy the shot's PNG frames to the server, run `nice -n 10 ffmpeg -framerate <fps> -i %05d.png -c:v libx264 -pix_fmt yuv420p -crf 18 out.mp4` there, and copy `out.mp4` back to `studio/out/<job>-<shot>.mp4`.
  - `render`: copy the frame glbs and the camera JSONs (written by `bake.mjs --export-only`, which this task adds), then run `render_world.py` with `--device CPU` under `nice -n 10` for each frame, then copy the PNGs back into the cache.

**How it works:**
- Every remote step runs `ssh -o BatchMode=yes <user>@<host> "<command>"` or `scp -B`. BatchMode makes it fail at once instead of asking for a password.
- The work folder is `<folder>/<job>/<shot>/<run id>/`. A run is reported done only after the final copy back succeeds and the file sizes match.
- On any failure, print `remote stopped at step <name>: <reason>` and exit 1. Do not delete the local cache.
- `--dry` prints each command it would run, one per line, and runs nothing.

- [ ] **Step 1: Write the failing tests** in `remote.test.mjs`:
  - `dry run prints the plan`: with a test `remote.json` (`host: example.invalid`), assert the printed lines contain `ssh -o BatchMode=yes`, the folder, and `nice -n 10`, and contain no `password` and no `-i `.
  - `remote stops cleanly when the host is down`: real run against `example.invalid`. Assert exit code 1, a message starting `remote stopped at step connect`, and an unchanged local cache.
  - `bake --export-only writes glb and camera files and renders nothing`.
- [ ] **Step 2: Run** `node --test tools/remote.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `remote.mjs` and the `--export-only` flag of `bake.mjs`.
- [ ] **Step 4: Run** the test. Expected: PASS, 3 tests.
- [ ] **Step 5: GATE.** Ask the owner for a yes to try the real server once. Run `npm run remote -- bake-test --shot s-test --task encode`. Expected: `studio/out/bake-test-s-test.mp4` exists, and ffprobe reports 3 frames. Record the result in the ledger.
- [ ] **Step 6: Commit** (needs the Task 0 yes) with the message `studio: CPU work on the home server over SSH`.

### Task 7: Hand-over

- [ ] **Step 1: GATE.** Make the copy job `studio/jobs/zoom-final/job.json`: a copy of `zoom-test` plus one shot `{ id: 'tube-to-liquid', path: 'deck', t0: 0, t1: 4, fps: 30, render: 'baked', settings: FINAL }`. `zoom-test` itself never gets a baked shot, so it stays small. Show the owner the estimate first (`npm run bake -- zoom-final --shot tube-to-liquid`, without `--approved`), and run the full bake only after his yes. Then export the MP4 (`npm run export -- zoom-final --lens journal --lang en --fps 30`), and send three stills and the MP4 to the owner (with the file-sending tool if you have one; otherwise give their full paths).
- [ ] **Step 2: Finish the ledger** `studio/ledger/plan3.md`, with the commands, pass lines, the seconds per frame measured on GPU and CPU, and the remote test result.
- [ ] **Step 3: Update section 2 of** `.\docs\superpowers\plans\2026-10-31-studio-00-index.md` under "Plan 3". Add every name produced above with its exact signature (including `DRAFT`, `FINAL`, `framePath` and `frameUrl`), the new job fields `shots` and `budget`, the test jobs `bake-test` (shots `A`, `B`, `s-test`), `cube-test` and `zoom-final` (shot `tube-to-liquid`), and the commands `bake` and `remote`.
- [ ] **Step 4: Retain one Cammut note.** Plan 3 is done; record the test count, the measured seconds per frame, and the remote result. Check it with `get_operation`, then read it back.
- [ ] **Step 5: Tell the owner** in plain words what works. Name the branch `studio/plan3`. Do not push.
