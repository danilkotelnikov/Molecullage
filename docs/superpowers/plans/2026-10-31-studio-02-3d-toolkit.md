<!-- version: p2 | date: 2026-10-31 | status: draft for the owner's review -->
# Molecullage Studio, Plan 2: the 3D toolkit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking. Read `2026-10-31-studio-00-index.md` (executor rules) before Task 0.

**Goal:** Build the four 3D modules of the design: surfaces, copies and effects, moving parts, and materials-light-camera. Give each module its documentation, a live demo and a numeric test. Let a job hold thousands of copies of one object (`WorldObject.copies`, drawn with `THREE.InstancedMesh`). Style the 12 shared colour roles in both lenses. Then replace the approximate PCR tube of Plan 1 with an exact profile from a source the owner approves.

**Architecture:** The geometry and look maths are pure TypeScript in `studio/core/geo/` and `studio/core/look/`, tested with `node --test`, with no three.js import. `studio/web/look.ts` turns the look presets into three.js materials, lights and camera settings. A demo page per module drives one small scene by `seek(t)` and reports a numeric check. `npm run demos` runs every check in headless Chrome.

**Tech Stack:** The same as Plan 1. No new packages: three 0.186.1, Node 24 `node --test`, playwright-core and Vite. Every playwright test starts its browser with `launch()` from `studio/tools/browser.mjs` (Plan 1 Task 7).

**Spec:** `docs/superpowers/specs/2026-10-31-engine-design.md`, sections 7 and 9. Plan 1 must be done first.

## Global Constraints

- Every Global Constraint of Plan 1 holds here.
- All geometry is in metres (design 4). A profile point `[r, z]` is a radius and a height in metres.
- A surface or rig output is a pure function of its inputs. A copies or field output is a pure function of its inputs, its seed and t. No `Math.random`; use `mulberry32(seed)` from `studio/core/geo/random.ts`.
- Every refractive index records its source: URL, access date and the quoted value. An index without a source is a **GATE**: ask the owner before using it (index rule 8).
- Roughness, transmission, thickness, metalness and base colour are look choices of the lens. Each preset records them with `choice: 'design'` and no evidence level. They make no claim about the real material.
- Both shipped lenses style exactly these 12 roles: `plastic`, `liquid`, `antibody`, `protein`, `nucleic-acid`, `gold`, `strip`, `line`, `diagram`, `tile`, `shape`, `label`. A role is a design name. A material preset has its own id (`polypropylene`, `water`, `gold`, `glass`, `nitrocellulose`), set through `RoleStyle.preset`. A new role is a STOP: ask the owner.
- Folders outside `studio/` are read only, by absolute path: `.\film\`, `...\tokens\`, `...\data\pdb\`, `...\struct\`. Never use a relative path to them.
- Every module exports `SETTINGS: Setting[]`. Its document lists each setting with unit, range and default. A test enforces this.
- The words "Rhino", "Cinema 4D" and "Maya" never appear in code, file names or product text (design 14, trademark). Docs may say "known from" in the design only.
- No bounce, elastic or overshoot in any demo motion (Plan 1 eases only).

## Review Focus

1. **An open or self-touching profile** (a gap at the top, or two points at the same place). `revolve` closes a profile only when its end points lie on the axis. It throws on repeated points instead of making a broken mesh. The tube is one closed outline, so both ends lie on the axis. Pinned in Task 1 (`revolve rejects repeated points`) and Task 7 (`tube outline is closed`).
2. **A scatter that cannot fit** (too many copies for the box and the minimum distance). It throws and names how many copies it placed. It never returns overlapping copies. Pinned in Task 2 (`scatter reports when it cannot fit`).
3. **A joint angle past its limit.** The angle is clamped and the joint is named in `clamped`. The mesh never folds through itself. Pinned in Task 3 (`pose clamps and reports`).
4. **A camera with a long lens focused close.** The depth-of-field numbers stay finite and ordered: near < focus < far, or far = Infinity past the hyperfocal distance. Pinned in Task 4 (`dof is ordered and finite`).
5. **A glass or liquid object seen against a dark lens background.** It stays visible: the transmission and the edge highlight differ from the background. Pinned in Task 5 (`glass is visible on the cinematic lens`).
6. **Too many or too few copies.** `validateWorld` refuses `count` below 1 or above 100000, and a `scatter` without a `box`. A scatter of 1000 copies renders as one `InstancedMesh` with 1000 instances, and the same t gives the same pixels. Pinned in Task 5 (`world-copies.test.ts` and `1000 scatter copies render`).
7. **A lens that lacks a role, or a plan that invents one.** Both lenses style the same 12 roles, and Plans 7–9 use only those. Pinned in Task 5 (`both lenses style the 12 roles`).

---

### Task 0: Approval gate and sources

**Files:** none changed.

- [ ] **Step 1: GATE.** Ask the owner for three things, in one plain message:
  1. a source for the 0.2 mL PCR tube dimensions: a maker's drawing or datasheet he approves, with the product name;
  2. a source for the lateral-flow strip layout, such as a maker's datasheet or a paper figure;
  3. a yes to commits on this branch and to `npm ci` with the approved versions (the commit GATE: every commit step below needs this yes; without it, stop before the first commit). `npm ci` installs only the versions in the lockfile that the owner approved in Plan 1.
  Stop until he answers. Record his answers in `studio/ledger/plan2.md`.
- [ ] **Step 2: Create the branch** `studio/plan2` from the tip of branch `studio/plan1`, not from `main`, so the Plan 1 code is present. Use a new worktree (superpowers:using-git-worktrees). In the new worktree, run `npm ci` in `studio/`. Expected: it exits 0 and installs nothing outside the lockfile.
- [ ] **Step 3: Run** `npm test` and the Plan 1 tool tests in `studio/`. Expected: all PASS. If any fail, stop and ask (index rule 6).

### Task 1: Surfaces

**Files:**
- Create: `studio/core/geo/mesh.ts`, `studio/core/geo/surfaces.ts`, `studio/core/geo/random.ts`
- Test: `studio/core/test/surfaces.test.ts`

**Interfaces:**
- Produces:
  - In `mesh.ts`:
    - `type MeshData = { positions: Float64Array; indices: Uint32Array; units: 'm' }`. Positions are xyz triples in metres; triangles are counter-clockwise from outside.
    - `measure(mesh: MeshData): { bbox: [[number,number,number],[number,number,number]]; area: number /* m² */; volume: number /* m³ */ }`.
    - `isClosed(mesh: MeshData): boolean`. It is true when every edge is shared by exactly two triangles.
  - In `surfaces.ts`:
    - `type Profile = [number, number][]`, points `[r, z]` from bottom to top.
    - `revolve(profile: Profile, segments: number): MeshData`
    - `type Section = { z: number; outline: [number, number][] }`. The outline is closed and counter-clockwise, and every section has the same point count.
    - `loft(sections: Section[], caps: boolean): MeshData`
    - `extrude(outline: [number, number][], depth: number): MeshData`
    - `SETTINGS: Setting[]`
  - In `random.ts`:
    - `type Setting = { name: string; unit: string; range: [number, number] | string[]; default: number | string }`
    - `mulberry32(seed: number): () => number`. Its output is in [0, 1). Use the standard algorithm, as in `.\film\src\kit\motion.js` (read only).

**The algorithm that the tests do not fix:**
- `revolve` builds rings at angles 2πk/segments.
- A profile point with r = 0 becomes one pole vertex, not a ring.
- `measure.volume` is the sum of the signed volumes of the tetrahedra (origin, a, b, c), summed over the triangles. It throws `mesh is not closed` when `isClosed` is false.
- `measure.area` is the sum of the triangle areas.

- [ ] **Step 1: Write the failing tests:**
  - `revolve makes a closed cylinder`. Profile `[[0,0],[1,0],[1,2],[0,2]]`, 512 segments. Assert:
    - `isClosed` is true;
    - the volume equals 2π within 0.1%;
    - the area equals 6π within 0.1%;
    - the bbox is `[[-1,-1,0],[1,1,2]]` within 1e-9.
  - `revolve keeps real metres`. A 1 mm radius cylinder, 10 mm tall. Assert the volume is π·1e-9·1e-2 = 3.1416e-11 m³ within 0.1%.
  - `revolve rejects repeated points`. Two equal neighbours. Assert a throw containing `repeated point at index`.
  - `revolve rejects an open profile`. The ends are not on the axis. Assert a throw containing `profile must start and end on the axis`.
  - `extrude a unit square`. Depth 2. Assert the volume is 2 within 1e-12, the area is 10 within 1e-12, and the mesh is closed.
  - `loft two equal circles equals a cylinder`. Two 256-point circles of r = 1 at z = 0 and z = 2, with caps. Assert the volume equals 2π within 0.1%.
  - `measure throws on an open mesh`. Loft without caps. Assert a throw containing `mesh is not closed`.
- [ ] **Step 2: Run** `node --test core/test/surfaces.test.ts` in `studio/`. Expected: FAIL, because the modules are missing.
- [ ] **Step 3: Implement** `mesh.ts`, `random.ts` and `surfaces.ts`, with the signatures above. `SETTINGS` lists `segments` (unit `count`, range [8, 4096], default 256).
- [ ] **Step 4: Run** the test. Expected: PASS, 7 tests.
- [ ] **Step 5: Commit** with the message `studio: exact surfaces (revolve, loft, extrude) with measure`.

### Task 2: Copies and fields

**Files:**
- Create: `studio/core/geo/copies.ts`
- Test: `studio/core/test/copies.test.ts`

**Interfaces:**
- Consumes: `mulberry32`, `Setting` (Task 1).
- Produces:
  - `type Vec3 = [number, number, number]`
  - `arrayCopies(count: number, step: Vec3, start?: Vec3): Vec3[]`
  - `scatter(seed: number, count: number, box: { min: Vec3; max: Vec3 }, minDist: number): Vec3[]`
  - The field type:
    ```
    type Field =
      | { kind: 'linear'; from: Vec3; to: Vec3; width: number; t0: number; t1: number }
      | { kind: 'radial'; center: Vec3; radius: number; width: number; t0: number; t1: number }
      | { kind: 'noise'; seed: number; scale: number; speed: number }
    ```
  - `fieldWeight(field: Field, p: Vec3, t: number): number`, with the result in [0, 1].
  - `SETTINGS: Setting[]`

**The algorithm that the tests do not fix:**
- `scatter` uses dart throwing. Try up to `30 × count` random points, and keep a point only if it lies at least `minDist` from every kept point. If fewer than `count` are kept, throw `scatter placed <k> of <count>`.
- **Linear field.** A plane moves from `from` to `to` as t goes from t0 to t1, with linear progress clamped to 0..1. The weight is the smoothstep of the signed distance of p ahead of the plane, over [−width/2, +width/2].
- **Radial field.** The front radius is `radius·progress`. The weight is the smoothstep of (front − |p − center|) over [−width/2, +width/2].
- **Noise field.** 3D value noise at `p·scale + [0, 0, t·speed]`. The lattice values come from `mulberry32` hashed by seed and lattice coordinates, with trilinear interpolation and smoothstep weights.

- [ ] **Step 1: Write the failing tests:**
  - `array spaces copies evenly`. `arrayCopies(4, [1,0,0])`. Assert the result equals `[[0,0,0],[1,0,0],[2,0,0],[3,0,0]]`.
  - `scatter is repeatable and keeps its distance`. Seed 7, 200 copies, a 1 m cube, minDist 0.05. Assert:
    - two calls give identical arrays;
    - every pair is at least 0.05 apart;
    - every point lies inside the box.
  - `scatter reports when it cannot fit`. 1000 copies, minDist 0.5, unit cube. Assert a throw matching `/scatter placed \d+ of 1000/`.
  - `linear field sweeps over time`. At the point midway between `from` and `to`, sample at 21 times from t0 to t1. Assert the weight rises monotonically from 0 to 1.
  - `radial field grows from the center`. At t1, assert the weight is 1 at the center and 0 at radius + width.
  - `noise is seeded and bounded`. Assert:
    - the same seed, p and t give the same value;
    - another seed gives a different value at that point;
    - 1000 samples all lie in [0, 1].
- [ ] **Step 2: Run** `node --test core/test/copies.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `copies.ts`. `SETTINGS` lists `count`, `minDist` (m), `width` (m), `scale` (1/m) and `speed` (1/s), each with a range and a default.
- [ ] **Step 4: Run** the test. Expected: PASS, 6 tests.
- [ ] **Step 5: Commit** with the message `studio: copies, scatter and fields as functions of t`.

### Task 3: Moving parts

**Files:**
- Create: `studio/core/geo/rig.ts`
- Test: `studio/core/test/rig.test.ts`

**Interfaces:**
- Consumes: `MeshData` (Task 1), `Vec3` (Task 2).
- Produces:
  - `type Joint = { id: string; parent: string | null; pivot: Vec3 /* parent space, m */; axis: Vec3 /* unit */; limits: [number, number] /* radians */ }`
  - `type Rig = { joints: Joint[] }`
  - `type Mat4 = Float64Array`, 16 values in column-major order.
  - `pose(rig: Rig, angles: Record<string, number>): { matrices: Record<string, Mat4>; clamped: string[] }`
  - `applyMat4(m: Mat4, p: Vec3): Vec3`
  - `bend(mesh: MeshData, opts: { axis: 'x'|'y'|'z'; angle: number /* radians */; range: [number, number] /* m along axis */ }): MeshData`
  - `SETTINGS: Setting[]`

**The algorithm that the tests do not fix:**
- The world matrix of a joint is parent world × T(pivot) × R(axis, clamped angle). R is the Rodrigues rotation.
- `bend` uses length L = range[1] − range[0] and radius ρ = L / angle.
  - A point at axis coordinate s inside the range is placed on an arc of radius ρ at angle θ = angle·(s − range[0])/L.
  - Points before the range stay where they are.
  - Points after the range follow the end of the arc rigidly.
  - With angle 0 the mesh is unchanged.

- [ ] **Step 1: Write the failing tests:**
  - `hinge opens a lid`. The joint `lid` has pivot `[0,0,0.02]`, axis `[1,0,0]` and limits `[0, 2]`; angle π/2. Assert that `applyMat4` maps the point `[0, 0.003, 0]` (in lid space) to `[0, 0, 0.023]` within 1e-12.
  - `chains compose`. A child joint 1 m along y of a parent rotated π/2 about z. Assert the child's origin ends at `[-1, 0, 0]` within 1e-12.
  - `pose clamps and reports`. Angle 3 on limits `[0, 2]`. Assert `clamped` is `['lid']`, and that the matrix equals the matrix at angle 2.
  - `bend by zero changes nothing`. Assert the positions are identical.
  - `bend keeps length along the axis`. A 1 m strip of 100 segments, bent π/2 over its full range. Assert the polyline length of its centre line is 1 within 1%.
- [ ] **Step 2: Run** `node --test core/test/rig.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `rig.ts`. `SETTINGS` lists `angle` (rad, range [−2π, 2π], default 0).
- [ ] **Step 4: Run** the test. Expected: PASS, 5 tests.
- [ ] **Step 5: Commit** with the message `studio: joints, pose with limits, bend`.

### Task 4: Materials, light rigs and optics (pure data)

**Files:**
- Create: `studio/core/look/materials.ts`, `studio/core/look/lights.ts`, `studio/core/look/optics.ts`
- Test: `studio/core/test/look.test.ts`

**Interfaces:**
- Consumes: `Setting` (Task 1), `Vec3` (Task 2).
- Produces:
  - The material preset type:
    ```
    type MaterialPreset = {
      id: 'polypropylene'|'glass'|'water'|'gold'|'nitrocellulose';
      ior: number; metalness: number; roughness: number; transmission: number;
      thickness?: number /* m */;
      baseColor: [number, number, number] /* linear RGB */;
      choice: 'design' /* metalness, roughness, transmission, thickness and baseColor are look choices; no evidence level */;
      source?: { url: string; accessed: string /* YYYY-MM-DD */; quote: string } /* source of `ior` only; required for every preset except gold */;
    }
    ```
  - `MATERIALS: Record<MaterialPreset['id'], MaterialPreset>`
  - `type Light = { kind: 'area'|'point'|'directional'|'ambient'; position: Vec3; target: Vec3; intensity: number; color: [number,number,number]; size?: number /* m */ }`
  - `type LightRig = { id: 'three-point'|'softbox-top'|'rim-dark'; lights: Light[] }`
  - `RIGS: Record<LightRig['id'], LightRig>`
  - `type Optics = { focalMm: number; sensorMm: [number, number]; focus: number /* m */; fstop: number; cocMm?: number }`
  - `fovFromLens(focalMm: number, sensorMm: [number, number]): number`, the vertical field of view in degrees.
  - `dofRange(o: Optics): { near: number; far: number /* m, Infinity allowed */; hyperfocal: number }`
  - `SETTINGS: Setting[]`, in each of the three files.

**Values and their sources:**
- **Refractive index (cited).** For polypropylene, glass, water and nitrocellulose, fetch the refractive index at 589 nm from refractiveindex.info, or a datasheet, with WebFetch. Record the URL, the date and the exact quoted value in `source`.
- **Design choices (not cited).** Roughness, transmission, thickness, metalness and base colour are look choices of the lens. Pick values that read well in both lenses, and set `choice: 'design'` on the preset. They carry no evidence level and make no claim about the real material. Take base colours from the tokens in `.\tokens\` where a token fits.
- **Sanity ranges.** Each refractive index must fall in its range:
  - polypropylene 1.47–1.51;
  - glass (soda-lime) 1.50–1.53;
  - water 1.33–1.34;
  - nitrocellulose 1.49–1.52.
- **Gold.** Use metalness 1 and a base colour that is a design choice. Gold's `ior` is not used, and is set to 1.0. Gold needs no `source`.
- **GATE:** if a page cannot be read, or a value falls outside its range, stop and ask the owner.
- **Light rigs (Claude's call, no outside fact).** In the three-point rig, the key-to-fill intensity ratio is 2:1 and the rim is 1.5× the fill. In `softbox-top`, one area light of 0.6 m sits 0.5 m above the target. In `rim-dark`, two rims at ±120° plus an ambient of 0.05.
- **Optics formulas.** `fov = 2·atan(h / (2f))` in degrees. Hyperfocal H = f²/(N·c) + f, with c defaulting to 0.03 mm. Near = s(H − f)/(H + s − 2f). Far = s(H − f)/(H − s) when s < H, and Infinity otherwise. All lengths are in mm inside the formula, and the results are in m.

- [ ] **Step 1: Write the failing tests:**
  - `every preset has a source and a sane ior`. For each preset except gold, assert `source.url` starts with `https://`, `accessed` matches `/^\d{4}-\d{2}-\d{2}$/`, and the ior lies in its sanity range. Gold is checked for metalness 1 instead.
  - `look values are marked as design choices`. For all five presets, assert `choice` is `'design'`, and that no preset has an `evidence` field.
  - `transmissive presets have thickness`. Glass and water have transmission > 0 and a thickness > 0.
  - `fov of a 50 mm lens on full frame`. Sensor `[36, 24]`. Assert 26.99° within 0.01.
  - `hyperfocal of 50 mm at f/8`. Assert 10.467 m within 0.001.
  - `dof is ordered and finite`. 100 mm, f/2.8, focus 0.3 m. Assert near < 0.3 < far, and both are finite. Focus 50 m with 24 mm at f/8: assert far is Infinity.
  - `three-point rig keeps its ratios`. Assert key/fill = 2 and rim/fill = 1.5, within 1e-12.
- [ ] **Step 2: Run** `node --test core/test/look.test.ts`. Expected: FAIL.
- [ ] **Step 3: Fetch the four refractive-index sources** and write `materials.ts` with the recorded values and the design choices. Then write `lights.ts` and `optics.ts`.
- [ ] **Step 4: Run** the test. Expected: PASS, 7 tests.
- [ ] **Step 5: Commit** with the message `studio: material presets with sources, light rigs, optics`.

### Task 5: The look and the copies in three.js, and new job fields

**Files:**
- Create: `studio/web/look.ts`
- Modify:
  - `studio/core/lens.ts`: `RoleStyle` gains `preset?: MaterialPreset['id']`; `Lens` gains `rig?: LightRig['id']`.
  - `studio/core/camera.ts`: `CameraKey` gains `optics?: Optics`.
  - `studio/core/world.ts`: `WorldObject` gains `geometry?` and `copies?` (below). `validateWorld` checks `copies`.
  - `studio/web/renderer.ts`: use `makeMaterial`, `makeLights` and `applyOptics`. Draw `copies` with `THREE.InstancedMesh`. Add `window.__studio.instances(id)`.
  - `studio/lenses/journal.json`, `studio/lenses/cinematic.json`: add presets, rigs and the seven new roles.
- Test: `studio/tools/look.test.mjs`, `studio/core/test/world-copies.test.ts`

**Interfaces:**
- Consumes: `MATERIALS`, `RIGS`, `fovFromLens`, `dofRange` (Task 4); `Field`, `Vec3`, `arrayCopies`, `scatter`, `fieldWeight` (Task 2); `RoleStyle`, `Lens`, `validateWorld` (Plan 1).
- Produces:
  - `makeMaterial(style: RoleStyle): THREE.MeshPhysicalMaterial`. When `style.preset` is set, the preset gives ior, metalness, roughness, transmission and thickness, and the style's `color` is the tint.
  - `makeLights(rigId: LightRig['id'], scale: number): THREE.Group`. Positions and sizes are multiplied by `scale`, the shot's camera distance.
  - `applyOptics(cam: THREE.PerspectiveCamera, o: Optics): void`. It sets the fov from `fovFromLens` and records focus and f-stop in `cam.userData` for Plan 3.
  - `WorldObject.copies?: { kind: 'array'|'scatter'; count: number; step?: Vec3; box?: [Vec3, Vec3]; minDist?: number; seed?: number; field?: Field }`.
    - `array` needs `step`. `scatter` needs `box`; `minDist` defaults to 0 and `seed` to 1.
    - Copy positions are offsets from `position`, in the object's frame units.
    - The renderer draws all copies of one object as one `THREE.InstancedMesh` with `count` instances.
    - With a `field`, each instance is scaled by `fieldWeight(field, p, t)`. A weight of 0 hides the copy.
  - `window.__studio.instances(id: string): { count: number; scales: number[] } | null`, for tests and the copies demo. `scales[i]` is the instance scale divided by `size`.
  - `WorldObject.geometry?: { kind: 'revolve'; file: string /* profile json under studio/jobs/<job>/ */ }`. Task 7 uses it. The renderer and `assets.ts` build the mesh from the profile file. `validateWorld` refuses a `geometry.file` that is empty or contains `..`.
  - `window.__look = { makeMaterial, makeLights, applyOptics }`, set by `look.ts` on every test page and demo page. The look tests and the look demo call it. It is not set on the main page of a published job.
  - `validateWorld` refuses `copies.count` below 1 or above 100000, and `kind: 'scatter'` without `box`, and `kind: 'array'` without `step`.
- New optional job fields: `WorldObject.geometry`, `WorldObject.copies`, `RoleStyle.preset`, `Lens.rig`, `CameraKey.optics`. All existing jobs stay valid.
- **The 12 roles (both lenses).** Plan 1 styles `plastic`, `antibody`, `gold`, `strip`, `label`. This task adds `liquid`, `protein`, `nucleic-acid`, `line`, `diagram`, `tile`, `shape`. The presets are set through `RoleStyle.preset`: `plastic` → `polypropylene`, `liquid` → `water`, `gold` → `gold`, `strip` → `nitrocellulose`. The other roles have no preset. Colours come from `.\tokens\`. Only `gold` is both a role name and a preset id.

- [ ] **Step 1: Write the failing tests.**
  - In `world-copies.test.ts` (`node --test`), on the two-frame world of Plan 1's `world.test.ts`:
    - `accepts array and scatter copies`: one `array` (count 5, step `[1,0,0]`) and one `scatter` (count 1000, box `[[-1,-1,-1],[1,1,1]]`). Expect `[]`.
    - `refuses count below 1`: count 0. Expect an error containing `copies.count`.
    - `refuses count above 100000`: count 100001. Expect an error containing `copies.count`.
    - `refuses scatter without box`. Expect an error containing `box`.
    - `refuses array without step`. Expect an error containing `step`.
  - In `look.test.mjs`, with playwright-core against `vite preview` on port 4380, as in Plan 1. Start the browser with `launch()` from `studio/tools/browser.mjs` (made in Plan 1 Task 7); do not write another launch call. The tests call `window.__look` in the page:
    - `material numbers match the preset`: in the page, `window.__look.makeMaterial({…, preset:'water'})` has `ior`, `transmission` and `thickness` equal to `MATERIALS.water`.
    - `glass is visible on the cinematic lens`. A glass sphere over the cinematic background. Assert the mean absolute pixel difference inside the sphere's screen disc is more than 3% from the background colour.
    - `rig scales with the shot`: `window.__look.makeLights('softbox-top', 1e-8)` puts the area light 5e-9 m above the target, within 1e-20.
    - `old jobs still load`: the Plan 1 `zoom-test/job.json`, unchanged, passes `loadJob`.
    - `both lenses style the 12 roles`: the role keys of `journal.json` and of `cinematic.json` are both equal to the set `plastic, liquid, antibody, protein, nucleic-acid, gold, strip, line, diagram, tile, shape, label`. Every `preset` value is a key of `MATERIALS`, and the only role key that is also a preset id is `gold`.
    - `1000 scatter copies render`: in a copy of zoom-test, one sphere with `copies: { kind: 'scatter', count: 1000, seed: 3, box: [[-1,-1,-1],[1,1,1]], minDist: 0.01 }` in the camera's view. Assert that more than 1% of the pixels differ from the lens background.
    - `copies draw the same pixels at the same t`: the same job, seek 1.0, hash the pixels, seek 2.0, seek 1.0, hash again. The two hashes are equal. Use a `linear` field on the copies so that t matters.
    - `count instances exist`: `instances(id).count` is 1000 for the scatter object and 5 for an `array` object of count 5.
- [ ] **Step 2: Run** `node --test core/test/world-copies.test.ts`, then `npm run build`, preview, and `node --test tools/look.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `look.ts`, the field additions and the `InstancedMesh` drawing. Update the two lens files with the 12 roles. In `journal`: `plastic` uses `polypropylene`, `liquid` uses `water`, `gold` uses `gold`, `strip` uses `nitrocellulose`, and the rig is `three-point`. In `cinematic`: the same presets, with the rig `rim-dark`.
- [ ] **Step 4: Run** `npm test`, `npm run typecheck`, `look.test.mjs` and all the Plan 1 tool tests. Expected: all PASS.
- [ ] **Step 5: Commit** (needs the Task 0 yes) with the message `studio: physical looks, light rigs, lens optics and instanced copies in the renderer`.

### Task 6: Documentation and demos for each module

**Files:**
- Create:
  - `studio/docs/surfaces.md`, `studio/docs/copies.md`, `studio/docs/rig.md`, `studio/docs/look.md`
  - `studio/web/demos/surfaces.html`, `studio/web/demos/copies.html`, `studio/web/demos/rig.html`, `studio/web/demos/look.html`
  - `studio/tools/demos.test.mjs`
- Modify: `studio/package.json` (add the script `"demos": "node --test tools/demos.test.mjs"`), `studio/web/vite.config.ts` (the one config of Plan 1 Task 7: add the four demo pages to `build.rollupOptions.input`; never create `studio/vite.config.ts`).

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: each demo page sets `window.__demo = { seek(t: number): Promise<void>; duration: number; check(): Promise<{ pass: boolean; note: string }> }`.

**What each demo shows and checks:**

| Demo | Scene | `check()` passes when |
|---|---|---|
| surfaces | A revolved tube, a lofted cap and an extruded strip; t turns the camera | `measure` of each mesh matches its doc table within 0.1% |
| copies | One sphere object with `copies` (200 scattered instances) that a linear field fades in over 0–4 s | The count of `instances(id).scales` above 0.5 at t = 2 equals the count with `fieldWeight` > 0.5 at t = 2 |
| rig | A lid on a hinge that opens 0 → 1.8 rad over 0–3 s | The lid's top point matches `applyMat4` within 1e-9 m |
| look | Five spheres, one per material preset, under each rig | Each sphere's mean pixel colour differs from its neighbours by more than 3% |

**Each document has:**
1. a one-sentence purpose;
2. a table with one row per entry of the module's `SETTINGS`: name, unit, range and default;
3. a worked example in code;
4. the link to its demo;
5. for `look.md`, the source table of the refractive indices, and a second table of the design choices (roughness, transmission, thickness, metalness, base colour) with the note that they make no claim;
6. for `copies.md`, the `WorldObject.copies` field with its limits (count 1 to 100000) and a job example.

Write each document in plain words, under 120 lines.

- [ ] **Step 1: Write the failing tests** in `demos.test.mjs`. It starts the browser with `launch()` from `studio/tools/browser.mjs` (Plan 1 Task 7):
  - `every demo check passes`: run `check()` for all four pages. Assert `pass` is true.
  - `every demo is a function of t`: seek 0, half the duration, 0. The pixel hashes at the two zeros must be equal.
  - `every setting is documented`: for each module, assert every `SETTINGS[i].name` appears in a table row of its doc, with its unit.
- [ ] **Step 2: Run** `npm run demos`. Expected: FAIL.
- [ ] **Step 3: Write** the four demo pages and the four documents.
- [ ] **Step 4: Run** `npm run build`, then `npm run preview` in the background (port 4380), then `npm run demos`. Expected: PASS, 3 tests.
- [ ] **Step 5: Commit** (needs the Task 0 yes) with the message `studio: docs and live demos for surfaces, copies, rig and look`.

### Task 7: The exact PCR tube in the zoom test

**Files:**
- Create: `studio/jobs/zoom-test/tube.profile.json`
- Modify: `studio/jobs/zoom-test/job.json`, `studio/web/assets.ts` (build meshes from `WorldObject.geometry`)
- Test: `studio/core/test/tube.test.ts`

**Interfaces:**
- Consumes: `revolve`, `measure`, `isClosed` (Task 1); the `WorldObject.geometry` field (Task 5).
- Produces: the profile file format:
  ```
  {
    source: { kind: 'doi'|'url'|'file'; ref: string; product: string };
    evidence: Level;
    statedVolumeMl: number; statedHeightMm: number;
    outline: Profile;
    innerStart: number;
  }
  ```
  - `outline` is **one closed outline** in metres. It starts on the axis at the outer bottom (`r = 0`), goes up the outer wall, across the rim, down the inner wall, and ends on the axis at the inner bottom (`r = 0`). Both ends lie on the axis, so the rule of `revolve` holds, and `revolve(outline, n)` is the closed shell.
  - `innerStart` is the index of the first point of the inner wall, the point just after the rim.
  - The cavity profile is derived, not stored: the inner-wall points `outline[innerStart..]` in reverse order (from the inner bottom up to the rim), plus the point `[0, z of the last of them]` that closes it on the axis.

- [ ] **Step 1: Read the source the owner approved** in Task 0. Note every number it gives. Decide the evidence level by the kind of source:
  - A source with a DOI (kind `doi`) may carry the level `published`.
  - A maker's web page or a datasheet file (kind `url` or `file`) carries the level `architecture`.
  - Never use `published` without a DOI.
  Do not round, and do not invent a value. If the source gives no cavity shape, the inner wall is the outer wall moved in by the stated wall thickness. If the source gives no wall thickness either, stop and ask the owner (GATE). Do not write `tube.profile.json` yet.
- [ ] **Step 2: Write the failing tests** in `tube.test.ts`. They read `studio/jobs/zoom-test/tube.profile.json`, which does not exist yet:
  - `tube outline is closed`: the first and last points of `outline` have `r = 0`, and `isClosed(revolve(outline, 512))` is true.
  - `outer height matches the source`: assert the max z of `outline` equals `statedHeightMm / 1000` within 1e-4 m.
  - `cavity volume matches the stated volume`: with the derived cavity profile, `measure(revolve(cavity, 512)).volume` × 1e6 equals `statedVolumeMl` within 10%. The cavity can hold more than the working volume, so the 10% band is set to allow that, and the ledger records the measured number.
  - `cavity profile is closed`: `isClosed(revolve(cavity, 512))` is true.
  - `evidence follows the source kind`: `evidence` is `published` only when `source.kind` is `doi`; for `url` and `file` it is `architecture`.
- [ ] **Step 3: Run** `node --test core/test/tube.test.ts`. Expected: FAIL for all five tests, because `tube.profile.json` is missing.
- [ ] **Step 4: Write `tube.profile.json`**, taking every number from the source (Step 1), with `evidence` set by the Step 1 rule. Then run `node --test core/test/tube.test.ts`. Expected: PASS, 5 tests. If the volume test fails because of the source data, stop and ask the owner; do not change the numbers.
- [ ] **Step 5: Point** the `tube` object in `job.json` at `{ kind: 'revolve', file: 'tube.profile.json' }`. Set its source and evidence from the file. Make `assets.ts` build the shell with `revolve(outline, 256)` from geometry files.
- [ ] **Step 6: Run** `npm test` and all the tool tests from Plan 1 and this plan. Expected: all PASS.
- [ ] **Step 7: Export one still per stop** in both lenses: `npm run export -- zoom-test --lens journal --lang en --fps 1`, and the same for `cinematic`. Show the six stills to the owner next to the Plan 1 stills (send the files to the owner with the file-sending tool if you have one; otherwise give their full paths).
- [ ] **Step 8: Commit** (needs the Task 0 yes) with the message `studio: exact PCR tube from the approved source`.

### Task 8: Hand-over

- [ ] **Step 1: Finish the ledger** `studio/ledger/plan2.md`. Each task gets its commands and pass lines. Add the measured tube volume and its source.
- [ ] **Step 2: Update section 2 of** `.\docs\superpowers\plans\2026-10-31-studio-00-index.md`. Under "Plan 2", add every name produced above with its exact signature, and the five new optional job fields (`WorldObject.geometry`, `WorldObject.copies`, `RoleStyle.preset`, `Lens.rig`, `CameraKey.optics`). Also list:
  - `window.__studio.instances`;
  - the 12 lens roles and the five preset ids (a role is not a preset id, except `gold`);
  - the tube profile format (`outline`, `innerStart`);
  - the note that Plans 8 and 9 build their many-copy objects with `copies`.
- [ ] **Step 3: Retain one Cammut note.** Plan 2 is done; record the test count, the tube source and its evidence level, and the new job fields. Check it with `get_operation`, then read it back.
- [ ] **Step 4: Tell the owner** in plain words what works, and where the demos and documents are (send the files to the owner with the file-sending tool if you have one; otherwise give their full paths). Name the branch `studio/plan2`. Do not push.
