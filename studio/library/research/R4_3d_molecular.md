<!-- version: w03 | date: 2026-10-30 -->
# R4 - 3D frameworks, 3D assets and molecular viewers for Molecullage

Worker: research subagent (Sonnet 5.5). Date checked: 2026-10-30. No installs, no binary downloads, no project code edited. No Cammut retain (the orchestrator retains).

## 1. Intro

Molecullage already renders molecules with Mol* and 3Dmol.js, and plans a Blender route for cinematic scenes. This survey asks which 3D engine, which interchange format, which molecular viewer and which asset sources fit an engine where every frame is a pure function of time t. The short answer: use three.js and glTF/GLB as the 3D core, keep Mol* with MolViewSpec and 3Dmol.js for molecules, use Blender for offline cinematic frames, and treat ChimeraX, VMD and BioDigital as licence-gated or closed.

## Evidence marks and method

- **V** = read in a primary source this session (GitHub API through `gh`, npm registry through `npm view`, official docs, repo LICENSE file).
- **S** = search summary or secondary site only.
- **U** = unverified or from memory. I did not check it.
- Versions and dates: GitHub release `published_at`, or npm `time[version]`. npm sizes are `dist.unpackedSize` (bytes on disk after install, with types and source maps). They are not bundle sizes.
- "Deterministic at time t" below is my reading of the design of each tool. I ran no renders this session. Every such claim is marked U unless a source is cited.
- Local facts about what Molecullage already has come from R0 [61]. Licence facts for ChimeraX, VMD, Molecular Nodes, Poly Haven, ambientCG, Sketchfab and others were first read in R2 [62]. I re-read only the points needed for versions and rules.

## 2. Table

Verdict key: **adopt** = use now; **trial** = small test first; **hold** = useful later, no need now; **reject** = do not use.

### 2a. 3D engines and formats

| Name | What it does for Molecullage | Version (released) | Licence (SPDX) | seek(t) / headless fit | Verdict and reason | Source |
|---|---|---|---|---|---|---|
| three.js | Main WebGL engine for 3D scenes, GLB loading, camera moves. Fits next to the existing engines. | r187 / npm 0.187.0 (2026-10-30) V; 21.0 MB unpacked V | MIT V | Good. You call `renderer.render()` yourself, so a `seek(t)` can set mixer time and camera, then render once. Needs WebGL in headless Chrome (section 5). Repeatability across different GPUs: U. | **adopt**. MIT, active (release today), no render loop is forced on you. | [1][2] |
| React Three Fiber (R3F) | React renderer for three.js. | v9.8.2 (2026-10-15) V; 2.4 MB unpacked V | MIT V | Possible with `frameloop="demand"` and manual `advance(t)` (U, from memory). Film and Stage use React, so it would fit there only. | **hold**. Raw three.js gives `seek(t)` with fewer layers. Revisit if a React block needs many 3D parts. | [3] |
| drei (R3F helpers) | Loaders, controls, helpers for R3F. | v10.7.9 (2026-09-25) V; 1.8 MB unpacked V | MIT V | Same as R3F. | **hold**, with R3F. | [4] |
| Babylon.js | Full 3D engine with its own tools. | 9.33.0 on GitHub (2026-10-29) V; `@babylonjs/core` 9.33.1 (2026-10-29) V; 73.3 MB unpacked V | Apache-2.0 V | Can render on demand (U). Duplicates three.js. | **hold**. Large, and overlaps three.js. No gap it fills for us. | [5] |
| PlayCanvas engine | Web 3D engine, linked to a cloud editor. | v2.23.3 (2026-10-15) V; 90.1 MB unpacked V | MIT V | Can render on demand (U). | **hold**. Overlaps three.js; large package. | [6] |
| model-viewer (Google) | `<model-viewer>` web component for GLB display and AR. | v4.4.0 (2026-10-09) V; 43.1 MB unpacked V | Apache-2.0 V | Poor fit. It runs its own render loop and camera controls. Time control through `currentTime` is U. | **hold**. Good for an interactive HTML page. For frames, use three.js directly. | [7] |
| glTF 2.0 / GLB | Master format for meshes, materials, animation. One file, loads in three.js, Blender, Babylon, PlayCanvas. | Spec 2.0.1, dated 2021-10-11 in the spec build V | Spec text: CC-BY-4.0 (SPDX tag in repo README source) V. Sample code in the repo: not checked. | Not an engine. Static data plus animation clips. | **adopt**. Already the planned master format in R2 [62]. | [8][10] |
| KHR extensions | Ratified list includes `KHR_draco_mesh_compression`, `KHR_mesh_quantization`, `KHR_texture_basisu`, `KHR_texture_transform`, `KHR_lights_punctual`, `KHR_animation_pointer`, `KHR_materials_*` (clearcoat, transmission, volume, sheen, ior, iridescence, anisotropy, dispersion, emissive_strength, specular, unlit, variants), `KHR_gaussian_splatting`, `KHR_interactivity`. `EXT_meshopt_compression` is listed as ratified. `KHR_materials_pbrSpecularGlossiness` is archived. | List read 2026-10-30 V | Khronos ratified | Use the `KHR_materials_*` set for glass and plastic looks. Loader support per extension: U. | **adopt** (use ratified ones only). Avoid archived extensions. | [9] |
| Draco | Mesh compression library, used by `KHR_draco_mesh_compression`. | 1.5.9 (2026-10-16) V; npm `draco3d` 1.5.9, 0.85 MB unpacked V | Apache-2.0 V | Decode happens at load time, so it does not touch seek(t). Needs the decoder WASM files served next to the page (U). | **hold**. Meshopt is simpler and also lossless-friendly (U). Use Draco only for a very large static mesh. | [11] |
| meshoptimizer | Mesh and animation compression (`EXT_meshopt_compression`) and simplification. | v1.3 (2026-09-25) V; npm 1.3.0, 0.31 MB unpacked V | MIT V | Decode at load. | **trial**. Test on one GLB for size and load time. | [12] |
| glTF-Transform | Node library and CLI to optimise, compress, dedupe, resize textures in GLB. | npm 4.5.1 (2026-09-28) V | MIT V | Build-time tool. No render. | **adopt** for the ingest step (R2 [62] "Normalise"). | [13] |
| USD / OpenUSD | Scene interchange (Pixar). Only as an export for other tools. | v26.11.1 (2026-10-21) V | "Tomorrow Open Source Technology License 1.0", an Apache-2.0 variant with a changed trademark section V. No SPDX id found. GitHub reports NOASSERTION V. | No browser path of its own. | **hold**. Interchange only. GLB covers our web needs. | [14] |
| three-gpu-pathtracer | Path-traced render in three.js, converges by sample count. | npm 0.0.27 (2026-10-08) V | MIT V | Sample accumulation is repeatable if the sample count and seed are fixed (U). Needs a real GPU (U). | **hold**. Interesting for stills. Pre-1.0. | [59] |

### 2b. Offline renderer

| Name | What it does for Molecullage | Version (released) | Licence (SPDX) | seek(t) / headless fit | Verdict and reason | Source |
|---|---|---|---|---|---|---|
| Blender (Cycles, EEVEE) | Offline cinematic renders from a `.blend` or a Python script. Molecular Nodes (GPL-3.0, per R2 [62]) runs inside it. | 5.2 LTS (2026-07-14) V; 5.1 (2026-03-17); 4.5 LTS (2025-07-15) V | Source: GPL-2.0-or-later. Cycles: Apache-2.0. Binaries: GPL-3.0-or-later V. Your renders and `.blend` files are yours V. | Very good for frames. `blender -b file.blend -f N` renders frame N V, so `N = round(t*fps)`. Cycles with a fixed seed should repeat on one machine (see [19]; "same noise each frame" is implied, not stated). EEVEE needs an OpenGL context; headless status in 5.x: not verified (old reports say a display is needed) S. | **adopt** for offline hero frames and thumbnails (Cycles on CPU or CUDA). EEVEE headless: hold until tested on the WSL/Linux box. | [15][16][17][18][19][20] |

### 2c. Molecular viewers

| Name | What it does for Molecullage | Version (released) | Licence (SPDX) | seek(t) / headless fit | Verdict and reason | Source |
|---|---|---|---|---|---|---|
| Mol* (molstar) | Web molecule viewer, already in `stage` (5.13). Has a Node headless context and the `mvs-render` CLI. | npm 5.13.1 (2026-10-08) V; GitHub v5.13.0 (2026-10-04) V; 84.4 MB unpacked V | MIT V | Good. Set the camera and state, then capture. Headless in Node needs the native `gl` and `canvas` packages; in v6 dev they become optional peers V. Headless fixes for WebGL in v5.12.0 V. | **adopt** (already used). Keep the `__structReady` wait. | [21][22][23] |
| MolViewSpec (MVS) | JSON description of a molecular view (`.mvsj`) or zip (`.mvsx`). One view file per figure; Mol* loads it. | Spec v1; JS part ships in Mol*; Python `molviewspec` 1.8.1 (2025-12-22) V; repo pushed 2026-09-22 V | MIT V (repo and PyPI) | Static scene description. Camera and focus set in the file. Animation of a view over t: U (the spec has snapshots; I did not read that part). | **adopt**. Matches the R2 plan to store one `view.mvsj` per structure. | [24][25][26][27][28] |
| 3Dmol.js | Light WebGL viewer, already vendored in `motion/vendor`. | npm 2.5.5 (2026-05-22) V; 20.7 MB unpacked V | BSD-3-Clause (LICENSE text and npm) V. GitHub API shows NOASSERTION because the file mixes notices. | Good. Already driven by `seek(t)` in the motion engine [61]. | **adopt** (already used) for flat, silhouette styles. | [29][30] |
| NGL Viewer | WebGL molecule viewer. | npm 2.5.0 (2026-09-03) V; the GitHub "latest release" is v0.9.3 from 2016 V (tags are not kept up to date) | MIT V | Similar to 3Dmol.js (U). | **hold**. Mol* and 3Dmol.js already cover it. | [31][32] |
| UCSF ChimeraX | Current flat journal renders (`struct/render.py`). Scriptable. | 1.12 production (2026-06-11) V; 1.11 was 2025-12-16 V | Free for academic, government, nonprofit and personal use; commercial use needs a separate licence V ([33] from R2, [37]). No SPDX id. | Good as a batch tool: `ChimeraX --nogui --offscreen --script x.py --exit`. `--offscreen` works on Linux only V. `save image.png width W height H supersample 3` V. | **adopt** for research figures with a licence gate. **hold** for pitch or product material until the owner decides (R2 open question). | [33][34][35][36][37] |
| PyMOL open-source | Fallback renderer, Python scripts. | Tag v3.1.0; last commit 2026-10-07 V. v3.1.0 date 2025-02-01 S (Wikipedia). I found no GitHub Releases page. | Permissive text: use, modify, distribute, keep notices; trademark rules for derived software V. Closest SPDX: HPND (my reading; GitHub says NOASSERTION). | Command-line `-c -q` mode: U (from memory). | **trial** as a fallback only. | [38][39] |
| VMD | MD trajectory viewer. | 1.9.3 shown as latest on the official page, 2.0.0 alpha for Unix listed S. The official site refused my TLS fetch, so version and date: not found V. | Non-commercial and internal business use only, per R2 [62] V and the University of Illinois licensing page S. | Tcl/Python scripting, Tachyon/OptiX output (R2). Not tested. | **reject** for product work. Academic figures only. | [40][62] |
| Gaussian splatting viewers | Show captured scenes as splats. No current figure needs them. | Spark 2.4.0 (2026-10-20) V; SuperSplat v3.7.0 (2026-10-26) V; GaussianSplats3D v0.4.7 (2025-01-25) V; antimatter15/splat no releases V; SPZ format v3.0.0 (2026-05-05) V | MIT for all five V | Spark is a three.js add-on (U on seek behaviour). `KHR_gaussian_splatting` is now on the ratified list V. | **hold**. If one is needed, Spark (active, MIT). Reject GaussianSplats3D (no release since 2025-01) and antimatter15/splat (demo, no releases). | [41][42][43][44][45][9] |
| vtk.js | Volume and scientific rendering in the browser. | npm 38.0.4 (2026-10-28) V | BSD-3-Clause V | Unknown. | **hold**. Only for volume data (cryo-EM maps, MRI) if Mol* volumes fall short. | [60] |

### 2d. Asset sources

| Name | What it does for Molecullage | Version / state (checked) | Licence | Fit | Verdict and reason | Source |
|---|---|---|---|---|---|---|
| Poly Haven | HDRIs, PBR textures, models. Public API. | API live: `api.polyhaven.com/assets?t=models` returns a JSON dictionary V | CC0; "any purpose, including commercial work"; no credit needed V. Terms of Service forbid scraping the website (assets stay CC0) V. | Use the API, not page scraping. | **adopt** | [47][48] |
| ambientCG | PBR materials, HDRIs, models. | API v2 `full_json`, `type` = 3DModel, HDRI, Material and others, `limit` 1-250 V | CC0 1.0; credit optional V | Use `full_json` with `include=downloadData`. | **adopt** | [49][50] |
| Sketchfab | Hand-picked CC models. | Active. KitBash bought it on 2026-08-12 per Wikipedia S. A third-party guide says downloads and CC0 still work in Sept 2026 S. | Per model. Editorial licence = no commercial or promotional use V. | Download API needs an OAuth user token; links expire in 300 s; formats glTF, GLB, USDZ only V. | **trial**, hand-pick only and cache the file with its licence text. Ownership change adds risk: keep a local copy. | [51][52][53][54][55] |
| NIH 3D | Science models (cells, anatomy, molecules). | Site live. | Per entry. "Many" are public domain or CC-BY. Uploaders choose the licence. NIH 3D does not enforce it V. | Formats: not found on the pages I read. | **trial**, per model, licence check each. | [56] |
| Smithsonian 3D | Specimens, instruments. | Site returned 403 to my fetch. | CC0 where marked "CC0" S. One object page says non-commercial only S. | Formats: glTF, GLB, OBJ, USD per a Smithsonian slide S. | **trial**, CC0 items only. Check each item. | [57] |
| BioDigital | Interactive 3D anatomy. | Terms updated October 2024 V. | Closed. "Copying or storing of any Content for other than personal, non-commercial use is expressly prohibited" V. Commercial use needs a Business plan and extra licence V/S. | No export path. | **reject** | [58] |

## 3. Minimal examples (adopt and trial items)

### 3.1 three.js: load a GLB and render at time t (**unchecked**)

I verified the version and licence of three.js. I did not check these calls against the r187 docs. Run the code once before relying on it. Check the import path `three/addons/...` and `AnimationMixer.setTime`.

```js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(1920, 1080);
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.1, 100);
const gltf = await new GLTFLoader().loadAsync('model.glb');
scene.add(gltf.scene, new THREE.HemisphereLight(0xffffff, 0x444444, 2));
const mixer = new THREE.AnimationMixer(gltf.scene);
if (gltf.animations[0]) mixer.clipAction(gltf.animations[0]).play();

window.SCENE = { seek(t) {            // pure function of t: no clock, no rAF
  mixer.setTime(t);
  camera.position.set(4 * Math.cos(t * 0.5), 1.5, 4 * Math.sin(t * 0.5));
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
} };
```

### 3.2 Headless Chrome with software WebGL (flags **checked**, Playwright call **unchecked**)

Chromium docs give the WebGL fallback flags and say SwiftShader "is not intended for running untrusted content" [46]. Render only your own pages.

```js
import { chromium } from 'playwright-core';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto('file:///C:/path/to/page.html');
await page.evaluate(() => window.SCENE.seek(1.5));
await page.screenshot({ path: 'frame_0045.png' });
```

The flags that the existing Molecullage renderers use now: not checked.

### 3.3 Blender: render one frame from the command line (**checked** against the manual [17][18])

```
blender -b scene.blend --factory-startup -E CYCLES -o //frames/f_#### -f 45
```

- `-b` runs without the interface. `-E` picks the engine (`-E help` lists them). `-f 45` renders frame 45 [18].
- Arguments run in the order given. Put `-f` or `-a` last [17].
- With a script, add `--python render.py -- extra args`. Everything after `--` reaches `sys.argv` [18].
- `-o` with `//` and `####` as a path pattern: **unchecked** (from memory).
- For frame at time t: `frame = round(t * fps)`.

### 3.4 Mol*: MolViewSpec view, loaded in the viewer and rendered headless

Viewer URL (checked [25]):

```
https://molstar.org/viewer/?mvs-format=mvsj&mvs-url=<URL of your .mvsj>
```

JS API (checked [25]): `molstar.Viewer` has `loadMvsFromUrl` and `loadMvsData`; for more control use `MVSData.fromMVSJ` then `loadMVS(plugin, mvsData, { replaceExisting: true })`.

Smallest `.mvsj` (structure follows the format description on the MVS docs page [24]; **partly checked**: my fetch tool assembled the example from the page, so run `npx mvs-validate view.mvsj` before use):

```json
{ "metadata": { "title": "Minimal view", "version": "1" },
  "root": { "kind": "root", "children": [
    { "kind": "download", "params": { "url": "https://www.ebi.ac.uk/pdbe/entry-files/1cbs.bcif" },
      "children": [ { "kind": "parse", "params": { "format": "bcif" },
        "children": [ { "kind": "structure", "params": { "type": "model" },
          "children": [ { "kind": "component", "params": { "selector": "polymer" },
            "children": [ { "kind": "representation", "params": { "type": "cartoon" },
              "children": [ { "kind": "color", "params": { "color": "green" } } ] } ] } ] } ] } ] } ] } }
```

Render to PNG in Node (command **checked** [25]; a search result [S] says the npm route needs `npm install molstar canvas gl jpeg-js pngjs`):

```
node lib/commonjs/cli/mvs/mvs-render.js -i examples/mvs/1cbs.mvsj -o out/1cbs.png --size 800x600
```

The docs example also shows a `--molj` flag whose meaning the page does not explain [25]. The npm package lists `mvs-render`, `mvs-validate` and `mvs-print-schema` as bins V [22]. One search result says `mvs-render` skips `label*` nodes (S); the changelog says label support was added to the headless context in v3.44.0 V [23]. I could not settle this. Test labels before use.

### 3.5 MolViewSpec from Python (chain **checked** on the docs page [26]; `get_state().dumps()` from a search result, **S**)

```python
from molviewspec import create_builder          # pip install molviewspec  (1.8.1)

builder = create_builder()
structure = (builder.download(url="https://files.rcsb.org/download/1CBS.cif")
                    .parse(format="mmcif").model_structure())
structure.component(selector="polymer").representation().color(color="blue")
open("1cbs.mvsj", "w").write(builder.get_state().dumps())
```

The RCSB file URL is my choice (RCSB file server is named in R2 [62]). The docs page uses a helper `_url_for_mmcif("1tqn")`.

### 3.6 3Dmol.js (**unchecked**)

Already in `motion/vendor` [61]. Basic call from memory:

```js
const v = $3Dmol.createViewer(el, { backgroundColor: 'white' });
v.addModel(pdbText, 'pdb'); v.setStyle({}, { cartoon: { color: 'spectrum' } });
v.zoomTo(); v.render();
```

### 3.7 ChimeraX offscreen render (options **checked** [35][36])

```
ChimeraX --nogui --offscreen --script render.py --exit
```

Inside the script: `run(session, 'save out.png width 1600 height 1200 supersample 3 transparentBackground true')`. The `run(session, ...)` helper is **unchecked**. `--offscreen` works on Linux only [35], so run it in WSL.

### 3.8 gltf-transform: shrink a GLB (**unchecked**)

```
npx @gltf-transform/cli optimize in.glb out.glb --compress meshopt
```

I checked that the CLI package exists (4.5.1, MIT). I did not check the `optimize` flags.

### 3.9 Poly Haven and ambientCG listings (URLs **checked**)

```
https://api.polyhaven.com/assets?t=models
https://ambientcg.com/api/v2/full_json?type=HDRI&include=downloadData&limit=20
```

The Poly Haven per-asset file endpoint: not checked. ambientCG `type`, `include` and `limit` parameters: checked [50].

## 4. Licence notes

If Molecullage stays free and open, these rules apply.

**Copyleft**
- Blender is GPL-2.0-or-later (binaries GPL-3.0-or-later). Renders and `.blend` files you make are yours. Python scripts you publish that use `bpy` must be GPL-compatible [16]. Keep Blender as a separate process (CLI call). Publish Blender scripts under GPL.
- Molecular Nodes is GPL-3.0 (R2 [62]). Same rule: call it inside Blender, publish scripts under GPL.
- Potrace and Z-Anatomy (CC BY-SA 4.0) are share-alike items from R2. They are not in this survey but come into the 3D asset flow.

**Non-commercial or restricted**
- ChimeraX: free for academic, government, nonprofit and personal use. Commercial use needs a separate licence [33][37]. A free and open Molecullage can still call ChimeraX as an optional tool. Any figure made for a company pitch needs the commercial licence or another renderer.
- VMD: non-commercial and internal business use only [62][40]. Do not bundle it.
- Allen Cell content: non-commercial (R2 [62]).
- BioDigital: closed, personal non-commercial use only [58].

**Per asset**
- Sketchfab: licence per model. The "Editorial" licence forbids commercial or promotional use [53]. Store the licence text with each file.
- NIH 3D: uploader sets the licence; NIH does not enforce it [56]. Smithsonian: only items marked CC0 [57].
- CC0 sources (Poly Haven, ambientCG) need no credit [47][49]. Record the source anyway, as R2 recommends.

**Permissive code**
- MIT: three.js, R3F, drei, PlayCanvas, Mol*, MolViewSpec, NGL, meshoptimizer, glTF-Transform, Spark, SuperSplat, SPZ, three-gpu-pathtracer.
- Apache-2.0: Babylon.js, model-viewer, Draco.
- BSD-3-Clause: 3Dmol.js, vtk.js.
- PyMOL open-source: permissive notice text, close to HPND, with trademark conditions [38].
- OpenUSD: Apache-2.0 variant with its own trademark section, no SPDX id [14].
- The glTF spec text is CC-BY-4.0 [10]. The file format itself is free to use.

**Not checked**
- Licences of the models inside each sample repo, and of Draco/meshopt WASM decoder files at their CDN hosts.
- The VMD licence text in this session (TLS error). I rely on R2 and a university page.

## 5. Headless WebGL notes

- Chromium documents two SwiftShader routes: `--use-gl=angle --use-angle=swiftshader` (OpenGL ES driver) and `--use-gl=angle --use-angle=swiftshader-webgl --enable-unsafe-swiftshader` (WebGL fallback) [46].
- Chromium says WebGL availability is not guaranteed. Handle a failed context [46] S.
- A secondary source says `--disable-gpu` breaks WebGL on recent Chrome and that Playwright uses `--enable-unsafe-swiftshader`. I did not check Playwright's code. S.
- Software rendering is slow. Plan one fresh page per frame batch and a hash per frame, as `stage/tools/render.mjs` does now [61].
- Software WebGL output can differ in small ways from a GPU render. Pick one render path per deliverable and keep it fixed. U.
- Blender EEVEE: old reports say a display or software OpenGL is needed [20]. No 5.x statement found. Cycles on CPU needs no display (S).

## 6. What I could not verify

- VMD current version and date (official site refused TLS). Also the VMD licence text this session.
- PyMOL v3.1.0 exact release date from a primary source (Wikipedia only). No GitHub Releases page.
- Smithsonian 3D pages (403). NIH 3D file formats and API.
- Sketchfab ownership change (Wikipedia only) and its effect on the Download API.
- BioDigital API and embed terms (terms page only; no API terms found).
- All `seek(t)` repeatability claims: no render was run.
- three.js, 3Dmol.js, gltf-transform and ChimeraX script calls in section 3: unchecked as marked.
- R3F `advance(t)`, model-viewer `currentTime`, Draco decoder hosting, MVS animation of a view: from memory (U).
- Whether `mvs-render` draws labels (sources disagree).
- glTF repo sample-code licence (GitHub API: NOASSERTION).
- npm dates for `@playcanvas/supersplat` (not an npm package; GitHub release used).

## 7. References

Accessed 2026-10-30 for all. Where a number says "via gh" the data came from `gh api` (GitHub REST). Where it says "via npm" it came from `npm view` (registry).

1. three.js release r187 (published 2026-10-30), mrdoob/three.js, GitHub. https://github.com/mrdoob/three.js/releases/tag/r187 (via GitHub API; licence MIT).
2. three, npm package 0.187.0, MIT, 21030536 bytes unpacked. https://www.npmjs.com/package/three (via npm).
3. react-three-fiber v9.8.2, pmndrs, GitHub; npm @react-three/fiber 9.8.2. https://github.com/pmndrs/react-three-fiber/releases
4. drei v10.7.9, pmndrs, GitHub; npm @react-three/drei 10.7.9. https://github.com/pmndrs/drei/releases
5. Babylon.js 9.33.0, BabylonJS, GitHub; npm @babylonjs/core 9.33.1; licence Apache-2.0. https://github.com/BabylonJS/Babylon.js/releases
6. PlayCanvas engine v2.23.3, GitHub; npm playcanvas 2.23.3; licence MIT. https://github.com/playcanvas/engine/releases
7. model-viewer v4.4.0, Google, GitHub; npm @google/model-viewer 4.4.0; licence Apache-2.0. https://github.com/google/model-viewer/releases
8. glTF 2.0 Specification, version 2.0.1, Khronos Group. https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
9. Khronos glTF extensions README (ratified and archived extension lists), KhronosGroup/glTF. https://github.com/KhronosGroup/glTF/blob/main/extensions/README.md
10. KhronosGroup/glTF README (SPDX tag CC-BY-4.0, spec described as royalty-free). https://github.com/KhronosGroup/glTF
11. Draco 1.5.9, Google, GitHub (2026-10-16), Apache-2.0; npm draco3d 1.5.9. https://github.com/google/draco/releases
12. meshoptimizer v1.3, zeux, GitHub (2026-09-25), MIT; npm meshoptimizer 1.3.0. https://github.com/zeux/meshoptimizer/releases
13. glTF-Transform, D. McCurdy, GitHub, MIT; npm @gltf-transform/core and /cli 4.5.1 (2026-09-28). https://github.com/donmccurdy/glTF-Transform
14. OpenUSD v26.11.1 (2026-10-21), Pixar Animation Studios, GitHub; LICENSE.txt names the Tomorrow Open Source Technology License 1.0. https://github.com/PixarAnimationStudios/OpenUSD
15. Blender release history (5.2 LTS 2026-07-14, 5.1 2026-03-17, 5.0 2025-11-18, 4.5 LTS 2025-07-15), blender.org. https://www.blender.org/download/releases/
16. Blender licence page, blender.org. https://www.blender.org/about/license/
17. Rendering From The Command Line, Blender 5.2 LTS Manual. https://docs.blender.org/manual/en/latest/advanced/command_line/render.html
18. Command Line Arguments, Blender 5.2 LTS Manual. https://docs.blender.org/manual/en/latest/advanced/command_line/arguments.html
19. Cycles Sampling (seed, animated seed), Blender Manual. https://docs.blender.org/manual/en/latest/render/cycles/render_settings/sampling.html
20. "Blender -b command does not work on headless Ubuntu server" #77339, projects.blender.org (2020 report; secondary for EEVEE status). https://projects.blender.org/blender/blender/issues/77339
21. Mol* v5.13.0 (2026-10-04), molstar, GitHub; licence MIT. https://github.com/molstar/molstar/releases
22. molstar, npm 5.13.1 (2026-10-08), MIT, bins incl. mvs-render, mvs-validate, mvs-print-schema. https://www.npmjs.com/package/molstar (via npm)
23. Mol* CHANGELOG (headless entries v3.31.1, v3.44.0, v5.12.0, v6.0.0-dev.0), molstar, GitHub. https://github.com/molstar/molstar/blob/master/CHANGELOG.md
24. MolViewSpec documentation (MVSJ, MVSX, spec v1), molstar.org. https://molstar.org/mol-view-spec-docs/
25. MolViewSpec Mol* extension (URL parameters, JS API, command-line utilities), molstar.org. https://molstar.org/mol-view-spec-docs/mvs-molstar-extension/
26. MolViewSpec primitives page (Python builder examples), molstar.org. https://molstar.org/mol-view-spec-docs/primitives/
27. molstar/mol-view-spec, GitHub (MIT; pushed 2026-09-22). https://github.com/molstar/mol-view-spec
28. molviewspec 1.8.1 (2025-12-22), MIT, PyPI. https://pypi.org/project/molviewspec/
29. 3Dmol.js, GitHub; LICENSE text says BSD-3-Clause; release 2.5.5 (2026-05-22). https://github.com/3dmol/3Dmol.js
30. 3dmol, npm 2.5.5, BSD-3-Clause, 20652518 bytes unpacked. https://www.npmjs.com/package/3dmol (via npm)
31. NGL Viewer, nglviewer, GitHub (MIT; last push 2026-09-03; latest GitHub release tag v0.9.3 from 2016). https://github.com/nglviewer/ngl
32. ngl, npm 2.5.0 (2026-09-03), MIT. https://www.npmjs.com/package/ngl (via npm)
33. UCSF ChimeraX licensing, RBVI (read in R2 [62]; not re-read). https://www.cgl.ucsf.edu/chimerax/docs/licensing.html
34. ChimeraX news (1.12 production 2026-06-11; 1.11 2025-12-16), RBVI. https://plato.cgl.ucsf.edu/chimerax/news.html
35. ChimeraX command-line options (--nogui, --offscreen, --script, --cmd, --exit), RBVI. https://www.cgl.ucsf.edu/chimerax/docs/user/options.html
36. ChimeraX save command (image size, supersample, transparentBackground, .glb), RBVI. https://www.cgl.ucsf.edu/chimerax/docs/user/commands/save.html
37. ChimeraX download page (free for academic, government, nonprofit and personal use). https://www.cgl.ucsf.edu/chimerax/download.html
38. schrodinger/pymol-open-source, GitHub: LICENSE text, tags v3.1.0, v3.0.0, v2.5.0, last commit 2026-10-07. https://github.com/schrodinger/pymol-open-source
39. PyMOL, Wikipedia (3.1.0 stable release 1 Feb 2025; secondary source). https://en.wikipedia.org/wiki/PyMOL
40. VMD, Theoretical and Computational Biophysics Group, University of Illinois (via search result; direct fetch failed on TLS). https://tcbg.illinois.edu/Research/vmd/index.html
41. Spark v2.4.0 (2026-10-20), sparkjsdev, GitHub, MIT; npm @sparkjsdev/spark 2.4.0. https://github.com/sparkjsdev/spark
42. SuperSplat v3.7.0 (2026-10-26), PlayCanvas, GitHub, MIT. https://github.com/playcanvas/supersplat
43. GaussianSplats3D v0.4.7 (2025-01-25), mkkellogg, GitHub, MIT; last push 2025-10-19. https://github.com/mkkellogg/GaussianSplats3D
44. splat, antimatter15, GitHub, MIT; no releases; last push 2025-11-16. https://github.com/antimatter15/splat
45. SPZ v3.0.0 (2026-05-05), Niantic Labs, GitHub, MIT. https://github.com/nianticlabs/spz
46. Using Chromium with SwiftShader, Chromium docs. https://chromium.googlesource.com/chromium/src/+/main/docs/gpu/swiftshader.md
47. Poly Haven licence. https://polyhaven.com/license
48. Poly Haven assets API listing. https://api.polyhaven.com/assets?t=models
49. ambientCG licence (CC0 1.0). https://docs.ambientcg.com/license/
50. ambientCG API v2 `full_json`. https://docs.ambientcg.com/api/v2/full_json/
51. Download API, Sketchfab Developers. https://sketchfab.com/developers/download-api
52. Downloading models, Sketchfab Developers (OAuth 2 token, 300 s link expiry, gltf and usdz). https://sketchfab.com/developers/download-api/downloading-models
53. Sketchfab licences page (Editorial and Standard). https://sketchfab.com/licenses
54. Sketchfab Update: What You Need To Know Now That Fab's Live, Sketchfab blog (2024-25; may be out of date). https://sketchfab.com/blogs/community/sketchfab-update-what-you-need-to-know-now-that-fabs-live/
55. Sketchfab, Wikipedia (KitBash acquisition 2026-08-12; secondary source). https://en.wikipedia.org/wiki/Sketchfab
56. NIH 3D terms. https://3d.nih.gov/terms
57. Smithsonian 3D Open Access, via search summaries (3d.si.edu returned 403). https://3d.si.edu/collections/openaccesshighlights
58. BioDigital Terms of Service (updated October 2024). https://www.biodigital.com/terms
59. three-gpu-pathtracer 0.0.27 (2026-10-08), MIT, npm. https://www.npmjs.com/package/three-gpu-pathtracer (via npm)
60. vtk.js 38.0.4 (2026-10-28), BSD-3-Clause, npm. https://www.npmjs.com/package/vtk.js (via npm)
61. R0 local survey of Molecullage, Cammut and arc-harness (2026-10-30). <local-path>
62. R2 science asset libraries for the Molecullage prefetch catalogue (2026-10-30). <local-path>
