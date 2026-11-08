# Plan 1 ledger (index rule 9)

Cammut notes used before the plan (recall, tags project:Omniverso and topic:molecullage-studio): the round-2 fix note (launch() copied to browser.mjs, text ladder 51/42/37, stand-in test by key pair), the Plan 1 and index fix notes, and the commit note for 32832e0. No note was stale for Plan 1.

Deviation notes:
- `@types/three` has no 0.186.1 release. The plan says take the 0.186.x release, so 0.186.0 is pinned (the owner said yes to 0.186.0).
- `studio/.gitignore` (node_modules, web/dist, out) was added so no build output is committed. It is not in the Task 0 file list.
- `npm install` added 27 packages in total: the six direct ones plus their own dependencies.

## Task 0: Package and approval gate
- Start: 2026-10-31 21:01
- Commands: GATE answered yes (install at the six pinned versions; local commits on studio/plan1). `git worktree add .../studio-plan1 -b studio/plan1 main` PASS. `npm install` PASS (added 27 packages, 0 vulnerabilities). `npm ls --depth=0` PASS (three 0.186.1, @types/three 0.186.0, vite 8.3.4, typescript 7.0.2, zod 4.6.7, playwright-core 1.64.1).
- Files: studio/package.json, studio/package-lock.json, studio/tsconfig.json, studio/README.md, studio/.gitignore, studio/ledger/plan1.md
- End: 2026-10-31 21:03

## Task 1: World schema
- Start: 2026-10-31 21:03
- Commands: `node --test core/test/world.test.ts` FAIL first (module missing), then PASS (tests 9, pass 9, fail 0).
- Files: studio/core/world.ts, studio/core/test/world.test.ts. Schemas use zod strictObject, so an unknown field is an error. Frame `unit <= 0` is also refused.
- End: 2026-10-31 21:03

## Task 2: Timeline and sampling
- Start: 2026-10-31 21:04
- Commands: `node --test core/test/timeline.test.ts` FAIL first (module missing), then PASS (tests 5, pass 5, fail 0).
- Files: studio/core/timeline.ts, studio/core/test/timeline.test.ts. `validateTimeline` also reports an empty key list and an unknown ease name.
- End: 2026-10-31 21:04

## Task 3: Nested scale frames, camera-relative
- Start: 2026-10-31 21:05
- Commands: `node --test core/test/frames.test.ts` FAIL first (module missing), then PASS (tests 4, pass 4, fail 0). The camera-relative result had error below 1e-6; the naive float32 way had error above 1e-2.
- Files: studio/core/frames.ts, studio/core/test/frames.test.ts. One test more than the plan (`toCamera works across frames`); `toCamera` subtracts inside the frame when both places share one frame.
- End: 2026-10-31 21:05

## Task 4: Camera paths, deep zoom and the stand-in swap
- Start: 2026-10-31 21:06
- Commands: `node --test core/test/camera.test.ts` FAIL first (module missing), then PASS (tests 5, pass 5, fail 0). `npm test` PASS (tests 23, pass 23, fail 0).
- Files: studio/core/camera.ts, studio/core/test/camera.test.ts. One test more than the plan (`the camera place is consistent with the distance`). A camera key with the camera at its target throws an error.
- End: 2026-10-31 21:06

## Task 5: Lenses and the readability guard
- Start: 2026-10-31 21:07
- Commands: `node --test core/test/lens.test.ts` FAIL first (module missing), then PASS (tests 5, pass 5, fail 0). `npm test` PASS (tests 28, pass 28, fail 0).
- Files: studio/core/lens.ts, studio/core/test/lens.test.ts, studio/lenses/journal.json, studio/lenses/cinematic.json. Both lenses style exactly the 12 roles of the index (the Task 5 text lists only five; the index rule wins). Colours of the journal lens come from `tokens\tokens.base.json` (read only); the cinematic colours are my design choices (lens values, no claim). `checkLens` also reports a colour that is not #rrggbb.
- End: 2026-10-31 21:07

## Task 6: Job file and slide layout layer
- Start: 2026-10-31 21:10
- Commands: `node --test core/test/job.test.ts` FAIL first (module missing), then PASS (tests 6, pass 6, fail 0). `npm test` PASS (tests 34, pass 34, fail 0). `npm run typecheck` first FAILED (only test files, because `node:test`, `node:assert/strict` and `node:fs` had no types). Asked the owner (rule 6). He said yes to `@types/node@24.19.2` (exact, dev only). Then `npm install --save-dev --save-exact @types/node@24.19.2` PASS, `"node"` added to `types` in tsconfig.json, `npm run typecheck` PASS with no errors.
- Files: studio/core/job.ts, studio/core/test/job.test.ts, studio/package.json, studio/package-lock.json, studio/tsconfig.json. One test more than the plan (`a bad camera path is reported`). `loadJob` also checks path keys and stops order, path frames, duplicate ids and block ids, and a layout language the job does not list. `notes` defaults to {} when absent. The job object is loose, so later plans can add optional fields.
- End: 2026-10-31 21:10

## Task 7: Live renderer and the deep-zoom test scene (work in progress, committed after the owner's yes on 2026-11-01)
- Start: 2026-10-31 21:13
- Commands: ChimeraX `make_igg_glb.cxc` PASS after hiding atoms and ribbons (the first run gave 56.8 MB, over the 15 MB limit; the second 12.5 MB). `node --test tools/pixels.test.mjs` FAIL first (no browser.mjs), then 8 of 9 PASS; the empty-frame test could not pass with the scene as listed (the owner said yes to a liquid body, plus a stronger tube tint and the antibody 3 mm lower). Later the test compares against an empty stage (`jobs/stage-test`). Final run: `node --test tools/pixels.test.mjs tools/library.test.mjs` PASS (12 of 12); `npm test` PASS (37 of 37); `npm run typecheck` PASS.
- Files: web/vite.config.ts, web/index.html, web/renderer.ts, web/assets.ts, tools/browser.mjs, tools/pixels.test.mjs, jobs/zoom-test/*, jobs/stage-test/job.json, lenses/*.json, core/world.ts (rotation), core/lens.ts (environment, glass fields).
- Added after the owner's feedback (stills rejected three times; plan Steps 5b to 5d): dark glossy look, header stack, crowd for stop 2, and antibody coat for stop 3. Also added the material library with HDRIs (13 MB, CC0, md5 checked), grounded source policy, 227-source index, and search tool.
- Slow test note: the blank-frame test takes about 4 minutes in the software browser because of the glass; a real GPU is much faster.
- End: 2026-11-01 13:48

## Task 8: Deck player (done)
- Start: 2026-11-08 21:00
- Commands: `node --test core/test/deck-checks.test.ts` PASS (`createDeckController` and `mountDeck` keyboard navigation, beat stepping, frame seeking, and resize).
- Files: studio/web/deck.ts, studio/core/test/deck-checks.test.ts
- End: 2026-11-08 21:06

## Task 9: Export planner and export checks (done)
- Start: 2026-11-08 21:06
- Commands: `node --test core/test/deck-checks.test.ts` PASS (`checkJob`, `checkPage`, and `buildExportPlan` supporting `png`, `svg`, and `mp4` frame sequence plans).
- Files: studio/tools/checks.mjs, studio/tools/export.mjs, studio/core/test/deck-checks.test.ts
- End: 2026-11-08 21:08

## Low-poly antibody trial (2026-11-01)
- Method: meshoptimizer `simplify` with `ErrorAbsolute` on the ChimeraX reference surface (resolution 6, grid spacing 1; 184,276 triangles, four main bodies of 27k to 64k triangles plus 32 small islands of 212 triangles or fewer). Deviation measured with `tools/mesh.mjs` (worse of the two directions, 1 A sample spacing). Run on the four main bodies only (182,988 triangles).
- Result (units are angstroms; cap = the simplifier's error cap): cap 0.5 gives 14,496 triangles, max 2.83, p99 0.88, mean 0.42, volume 0.970 of the reference. Cap 0.75: 9,180 triangles, max 3.71. Cap 1: 6,520, max 3.71, volume 0.937. Cap 1.5: 3,752, max 4.70. Cap 2: 2,412, max 8.06.
- Only cap 0.5 meets the proposed limits (max 3 A, volume within 5%). The tolerance numbers are my proposal; the owner has not confirmed them.
- The 32 small islands were left out of the trial. With them in, the maximum rose to 7 A because each island vanished. Whether they belong to the antibody is not decided.
- The live scene still uses `jobs/zoom-test/igg.glb` (518k triangles). Not yet replaced. No GLB writer for the decimated mesh exists yet.
- Check: `node --test tools/mesh.test.mjs` (3 tests, sphere with known volume and distances) PASS.
