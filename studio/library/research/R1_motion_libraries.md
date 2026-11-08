<!-- version: w03 | date: 2026-10-30 -->
# R1 — Animation libraries for the Molecullage seek(t) engine

Date: 2026-10-30. Worker: research subagent 6193a1e7. No project code changed.

## How this was checked

- Firecrawl (composio) had no credits (HTTP 402). I fetched pages directly with PowerShell `Invoke-WebRequest`.
- Licences come from the GitHub licence API (`api.github.com/repos/<repo>/license`) or the raw LICENSE file.
- Raw page dumps sit in `<local-path>`.
- "verified" means I read the text in this session. "unverified" means a search summary with redirect-only links, or my memory.

## 1. What the four given sources say

### 1a. spell.sh — "15 Best React Animation Libraries Compared (2026)", 10 Jan 2026
URL: https://spell.sh/blog/best-react-animation-libraries (verified).
It names 15 items:
1. Motion (formerly Framer Motion)
2. React Spring
3. GSAP (with `useGSAP`)
4. Motion One (now merged into Motion)
5. AutoAnimate
6. React Transition Group
7. React Move
8. Tailwind CSS + animate utilities
9. CSS spring animations via `linear()` easing
10. Lenis
11. Locomotive Scroll
12. Three.js / React Three Fiber
13. Lottie (lottie-react)
14. Rive
15. Spell UI (the blog owner's own component kit)

The article is a UI guide. It does not discuss frame-exact rendering or seeking.
It says some GSAP plugins need a paid licence. That is out of date (see 1d).

### 1b. Animate UI — primitives
URL: https://animate-ui.com/docs/primitives (verified).
- "Animated versions of Radix UI, Base UI and React Aria primitives." Built on Motion. Page updated 10/23/2026.
- Licence: "MIT + Commons Clause License Condition" (verified, https://github.com/imskyleen/animate-ui/blob/main/LICENSE.md).
- Commons Clause: you may not "sell or redistribute the components themselves in their original form".
- Fit: these are interactive UI widgets (dialogs, tabs, buttons). Most rely on hover and spring motion. Not useful for a film or a figure.

### 1c. Jitter — templates
URL: https://jitter.video/templates/all/ (verified).
- 300+ templates. Page says templates and Jitter are "completely free to use".
- FAQ: commercial use is allowed. More export formats and higher resolution need the paid "Max" plan.
- Export: "4K, GIF, Lottie" (verified in the page menu).
- Jitter is a closed web editor. No source code. Templates are not open files. Exact template licence text: unverified (only the FAQ was read).
- Many templates are bounce-style ("Fruit Bounce", "Bouncy Icons", "Elastic Text"). These break the no-bounce rule.
- Fit: a designer can draw a clip in Jitter, export Lottie, and Molecullage seeks it with lottie-web. Treat it as an asset source only.

### 1d. GSAP — licence and plugins
- npm `gsap` latest is 3.15.0. Its licence field reads: "Standard 'no charge' license: https://gsap.com/standard-license." (verified, https://registry.npmjs.org/gsap/latest).
- GitHub README: "GSAP is now 100% FREE including ALL of the bonus plugins like SplitText, MorphSVG ... even for commercial use" (verified, https://raw.githubusercontent.com/greensock/GSAP/master/README.md).
- Standard licence page, effective 30 April 2025, last modified 30 May 2025 (verified, https://gsap.com/standard-license/):
  - Owner is Webflow.
  - Permitted: use on any website, web application or digital interface.
  - Prohibited: use "in tools that allow users to build visual animations without code" that compete with Webflow's visual animation builder.
  - Webflow may change the terms by posting them. Old versions keep the old terms.
  - FAQ: formerly members-only plugins (SplitText, MorphSVG) are free in commercial projects.
- GSAP is not open source in the OSI sense. GitHub's licence API returns 404 for the repo (no SPDX licence).
- Plugin list from the gsap.com footer (verified): ScrollTrigger, ScrollSmoother, ScrollTo, DrawSVG, MorphSVG, MotionPath, MotionPathHelper, Flip, Draggable, Inertia, Observer, SplitText, ScrambleText, Text Replace, Physics2D, PhysicsProps, GSDevTools.
- CustomEase, CustomBounce, CustomWiggle, EasePack: not on the page I read. Status unverified, from memory they ship in the same free package.

> Risk for the owner: Molecullage is code-driven, so it is a permitted use. If Molecullage ever gets a visual no-code timeline editor for other users, the "Prohibited Uses" clause could apply. Ask Webflow first in that case.

## 2. Library table

Columns: clock = can an outside clock drive it while paused. Det. risk = risk of different pixels for the same t in headless Chrome.

| Library | Licence (exact) | URL | Clock | Surface | Det. risk | Best use | Verdict |
|---|---|---|---|---|---|---|---|
| GSAP 3.15 core + plugins | Standard "no charge" licence (Webflow), not OSI | https://gsap.com/standard-license/ | Yes. `paused:true`, `tl.seek()`, `tl.progress()`, `tl.time()`; global `gsap.updateRoot()` | DOM, SVG, any JS object | Low once paused and seeked | Film and deck: DrawSVG line reveals, MotionPath, SplitText captions, MorphSVG | Adopt. Best seekable timeline; watch licence clause |
| Motion (framer-motion) 14.8 | MIT | https://github.com/motiondivision/motion | Partly. `animate()` controls expose `animation.time = 0.5`, `stop()`; motion values have `set()` and `jump()` | DOM, SVG | Medium. Springs and layout animations depend on frame deltas | Film UI built in React 19; use `useTransform` of one time value | Adapt. Use only as a value mapper fed by t; no springs |
| Motion One | MIT (merged into Motion) | https://spell.sh/blog/best-react-animation-libraries | Same as Motion | DOM | Same | none | Reject. Merged into Motion |
| React Spring | MIT | https://github.com/pmndrs/react-spring | Poor. Physics springs have no duration; progress is integration over steps | DOM, SVG, R3F | High | none | Reject. Spring physics; conflicts with no-bounce |
| AutoAnimate | MIT | https://github.com/formkit/auto-animate | No. Fires on DOM changes | DOM | High | none | Reject. Event-driven |
| React Transition Group | BSD-3-Clause | https://github.com/reactjs/react-transition-group | No. Only mount/unmount states | DOM + CSS | High | none | Reject. Not an animator |
| React Move | MIT; last push Jan 2023 | https://github.com/sghall/react-move | No public seek (unverified) | DOM, SVG | Medium | none | Reject. Stale; D3 interpolate is enough |
| Tailwind animate / CSS keyframes | MIT (Tailwind, unverified) | https://spell.sh/blog/best-react-animation-libraries | Yes via negative `animation-delay` + `animation-play-state: paused` (unverified, from memory) | DOM | Medium | Poster/deck static states only | Reject for film. Prefer JS t-mapping |
| CSS `linear()` springs | Web standard | https://spell.sh/blog/best-react-animation-libraries | Same as CSS | DOM | Medium | none | Reject. Spring look breaks no-bounce |
| Lenis | MIT | https://github.com/darkroomengineering/lenis | No. Scroll inertia | DOM scroll | High | none | Reject. Scroll, not time |
| Locomotive Scroll | MIT | https://github.com/locomotivemtl/locomotive-scroll | No | DOM scroll | High | none | Reject. Scroll, not time |
| three.js | MIT | https://github.com/mrdoob/three.js | Yes. You call render yourself. `Clock` deprecated since r183 | WebGL/WebGPU | Medium. GPU, antialias, driver | Film: 3D cells, organelles, devices | Adopt. Drive with t, never with Clock |
| React Three Fiber | MIT | https://github.com/pmndrs/react-three-fiber | Yes. `frameloop="never"` + `advance(timestamp, runGlobalEffects?)` | WebGL | Medium | Film 3D shots in React | Adopt |
| drei | MIT | https://github.com/pmndrs/drei | Inherits R3F; some helpers self-animate (unverified) | WebGL | Medium | Text, environment, camera helpers | Adapt. Audit each helper for internal clocks |
| lottie-web | MIT; last push Sep 2025 | https://github.com/airbnb/lottie-web | Yes. `autoplay:false`, `goToAndStop(value, isFrame)` | SVG, canvas, html | Low with SVG renderer | Film and deck: designer clips (Jitter, After Effects) | Adopt |
| lottie-react | MIT | https://github.com/Gamote/lottie-react | Wraps lottie-web | SVG | Low | React wrapper | Adapt. Call lottie-web directly for control |
| dotLottie web | MIT | https://github.com/LottieFiles/dotlottie-web | Yes. `autoplay:false`, `setFrame(frame)` renders at once; `totalFrames`, `duration` | Canvas (WASM) | Low–medium (WASM raster) | `.lottie` files | Adapt. Second choice to lottie-web SVG |
| Rive web runtime | MIT (runtime). Editor is a paid product (unverified) | https://github.com/rive-app/rive-wasm | Yes with low-level API: `LinearAnimationInstance.advance(sec)` then `.apply(mix)` | Canvas/WebGL2 (WASM) | Medium. Advance is delta-based | Interactive deck only | Adapt. Seek = reset + advance(t) |
| anime.js v4 | MIT | https://github.com/juliangarnier/anime | Yes. `seek()` on animations and timelines; engine has `update()`, `pause()`, `timeUnit`, `fps` | DOM, SVG, JS objects, three.js adapter | Low when paused and seeked | Light MIT alternative to GSAP | Adopt as fallback if GSAP licence ever bites |
| Theatre.js | Apache-2.0; last push Aug 2024 | https://github.com/theatre-js/theatre | Yes. `sheet.sequence.position = 1` (seconds) | Any JS values, R3F | Low | Hand-keyframed camera paths with the studio UI | Adapt. Good model; maintenance risk |
| Remotion | Custom "Remotion License": free for individuals, for-profits with up to 3 employees, non-profits; others need a Company License | https://github.com/remotion-dev/remotion/blob/main/LICENSE.md | Yes. Frame-based by design (unverified details) | React DOM | Low | Reference design only | Reject as dependency. Licence; Molecullage already has the same idea |
| Motion Canvas | MIT; active (Jul 2026) | https://github.com/motion-canvas/motion-canvas | Own generator timeline and renderer | Canvas 2D | Low | Math/diagram explainers | Reject as dependency; read for ideas |
| Revideo | MIT; repo moved to midrender/revideo | https://github.com/midrender/revideo | Own `renderVideo()` headless renderer | Canvas 2D | Low | none | Reject. Competing engine |
| Manim CE / 3b1b manim | MIT / MIT | https://github.com/ManimCommunity/manim | Python, own frame loop | Cairo/OpenGL offline | Low | Offline equation clips imported as video | Reject in the browser; optional offline asset |
| Vivus | MIT; last push Jul 2022 | https://github.com/maxwellito/vivus | Yes. `start:'manual'`, `setFrameProgress(0..1)` | SVG strokes | Low | Line-draw reveal | Reject. GSAP DrawSVG or own dashoffset covers it |
| Paper.js | MIT | https://github.com/paperjs/paper.js | You can redraw per call; `onFrame` is rAF (unverified) | Canvas 2D | Low | Vector geometry ops (boolean paths) | Adapt only for geometry, not timing |
| two.js | MIT | https://github.com/jonobr1/two.js | `update()` manual render (unverified) | SVG/Canvas/WebGL | Low | none | Reject. Overlap with plain SVG |
| PixiJS v8 | MIT | https://github.com/pixijs/pixijs | Yes. `Ticker` has `autoStart`, `start`, `stop`, `update` | WebGL/WebGPU 2D | Medium | Many-particle 2D layers | Adapt if particles are needed |
| Mol* | MIT | https://github.com/molstar/molstar | Has an animation manager (unverified; docs page 404) | WebGL | Medium | Molecular turntables | Unverified. Prefer ChimeraX frames for now |
| Animate UI | MIT + Commons Clause | https://github.com/imskyleen/animate-ui | Inherits Motion | DOM | High (springs, hover) | none | Reject. Interactive UI kit |
| Spell UI | Unknown (repo not found) | https://spell.sh/blog/best-react-animation-libraries | Unknown | DOM | High | none | Reject. Marketing kit, licence unknown |
| Jitter | Closed SaaS; free tier; Max plan for more exports | https://jitter.video/templates/all/ | Via exported Lottie | Lottie/video | Low after export | Designer clip source | Adapt as asset source only |

Licence sources: GitHub licence API results in this session for every repo above except GSAP (404) and Spell UI (404).

## 3. Adapter design

Goal: every library becomes a pure function of t. `window.SCENE.seek(t)` calls each adapter. No adapter owns a clock.

```ts
export interface TimelineAdapter {
  id: string;
  duration: number;              // seconds
  prepare(): Promise<void>;      // load assets, fonts, WASM; stop internal clocks
  seek(t: number): void | Promise<void>; // set state for local time t, render once
  dispose?(): void;
}

// Scene: clips placed on the master timeline
type Clip = { start: number; adapter: TimelineAdapter };
async function seekScene(clips: Clip[], t: number) {
  for (const c of clips) {
    const local = Math.min(Math.max(t - c.start, 0), c.adapter.duration);
    await c.adapter.seek(local);
  }
}
```

Rules for every adapter:
- `prepare()` must turn off autoplay and any rAF loop.
- `seek(t)` must give the same pixels for the same t, in any call order (forward, backward, jump).
- If a library only supports delta steps, `seek` resets to 0 and steps in fixed increments.

### Mapping per library

| Library | prepare() | seek(t) | duration |
|---|---|---|---|
| GSAP | build `gsap.timeline({paused:true})`; optionally `gsap.ticker.remove(gsap.updateRoot)` | `tl.seek(t, true)` or `tl.progress(t / tl.duration())` | `tl.duration()` |
| Motion | `const a = animate(el, kf, {duration, ease})`; `a.pause()` | `a.time = t` | `a.duration` |
| Motion values | `const v = motionValue(0)` | `v.jump(f(t))` (breaks velocity, ends animations) | from scene spec |
| lottie-web | `loadAnimation({renderer:'svg', autoplay:false, loop:false})`, await `DOMLoaded` (event name unverified) | `anim.goToAndStop(t * 1000, false)` (time in ms; unit unverified) or frame `t * fps` with `isFrame=true` | frames / fps |
| dotLottie | `new DotLottie({canvas, src, autoplay:false})`, await `load` | `d.setFrame(t / d.duration * d.totalFrames)` | `d.duration` |
| Rive | low-level API, instance `LinearAnimationInstance`; do not start `rive.requestAnimationFrame` | reset artboard, `inst.time = 0` (unverified), `inst.advance(t)`, `inst.apply(1)`, `artboard.advance(0)`, draw | animation duration |
| Theatre.js | `getProject(..., {state})` with saved JSON; never call `sequence.play()` | `sheet.sequence.position = t` | sequence length (unverified API) |
| anime.js v4 | create with `autoplay:false`; engine manual mode (`useDefaultMainLoop`, unverified) | `tl.seek(t * 1000)` (ms is the default `timeUnit`, unverified) | `tl.duration` |
| R3F | `<Canvas frameloop="never">` | set scene state from t, then `advance(t * 1000, true)` | scene spec |
| three.js | no `setAnimationLoop`; no `Clock` | set transforms from t; `renderer.render(scene, camera)` | scene spec |
| PixiJS | `app.ticker.stop()` or `autoStart=false` | set sprite state from t; `app.render()` (unverified) | scene spec |

## 4. Concrete code hints (API names checked in docs this session)

1. GSAP timeline: create with `paused: true` (verified, https://gsap.com/docs/v3/GSAP/Timeline/). Seek with `.seek(position, suppressEvents)`. It "jumps to a specific time (or label) without affecting whether or not the instance is paused" (verified, https://gsap.com/docs/v3/GSAP/Timeline/seek()/). Pass `suppressEvents=true` so callbacks do not fire on jumps.
2. GSAP global clock: `gsap.updateRoot()` exists for manual root updates (verified page, https://gsap.com/docs/v3/GSAP/gsap.updateRoot()/). Pairing it with `gsap.ticker.remove(gsap.updateRoot)` is unverified (search summary only). Also call `gsap.ticker.lagSmoothing(0)` so the start time never shifts; lagSmoothing is documented as moving the ticker start time (verified, https://gsap.com/docs/v3/GSAP/gsap.ticker/). The `0` argument is unverified.
3. Motion: `animate()` returns playback controls; `animation.time = 0.5` sets the playhead; `duration` is readable (verified, https://motion.dev/docs/animate). Use `type: "tween"` with a cubic ease. Do not use `type: "spring"`; its docs describe a default `bounce: 0.25`.
4. Motion value: `jump()` "resets velocity to 0" and "ends active animations" (verified, https://motion.dev/docs/motion-value). Use `jump`, not `set`, inside `seek`.
5. lottie-web: `goToAndStop(value, isFrame)`; `isFrame` default false means time-based (verified, https://github.com/airbnb/lottie-web README). Use `renderer: 'svg'` for crisp vector output and `autoplay: false`.
6. dotLottie: `setFrame(frame)` sets and renders at once; `totalFrames` and `duration` (seconds) are getters (verified in source, https://github.com/LottieFiles/dotlottie-web/blob/main/packages/web/src/dotlottie.ts).
7. Rive: low-level API uses `LinearAnimationInstance`; call `.advance(seconds)` then `.apply(mix)`; the docs loop uses `rive.requestAnimationFrame` (verified, https://rive.app/docs/runtimes/web/low-level-api-usage). Skip that loop. For seek, reset and advance by t.
8. Theatre.js: `sheet.sequence.position = 1` sets the playhead in seconds (verified, https://www.theatrejs.com/docs/latest/api/core).
9. R3F: `frameloop` accepts `always | demand | never` (verified, r3f canvas docs). `advance(timestamp, runGlobalEffects?)` advances "one tick, given that frameloop === 'never'" (verified, https://github.com/pmndrs/react-three-fiber/blob/master/docs/API/hooks.mdx). Inside `useFrame`, read t from the scene store, not from `delta`.
10. three.js: `THREE.Clock` is "Deprecated: since r183" (verified, https://threejs.org/docs/pages/Clock.html). Do not use Clock or `getDelta()`; compute pose from t.
11. Vivus (if ever needed): `start: 'manual'` and `setFrameProgress(progress)` with 0..1 (verified, Vivus README via GitHub API).
12. PixiJS: `Ticker` has `autoStart` (default false on new tickers), `start`, `stop`, `update` (verified, https://pixijs.download/release/docs/ticker.Ticker.html).

## 5. Headless-Chrome determinism notes

These are general engineering notes. All are unverified in this session (from memory). Check before relying on them.
- Await `document.fonts.ready` in `prepare()` before the first frame.
- For WebGL capture, create the context with `preserveDrawingBuffer: true`, or read pixels in the same task as render.
- Never read `performance.now()` or `Date.now()` inside a seek path.
- Seed any random function (particles, jitter) with a fixed seed.
- Prefer SVG renderers over WASM canvas when output must match across GPUs.
- Test each adapter with seek order 0 → 5 → 2 → 5. Compare frame hashes for t=5.

## 6. Recommendation, in one list

- Adopt: GSAP (core, DrawSVG, MotionPath, SplitText, MorphSVG), lottie-web (SVG), three.js + R3F with `frameloop="never"`.
- Fallback with MIT licence: anime.js v4.
- Adapt carefully: Motion (as a t-to-value mapper only), dotLottie, Rive low-level, Theatre.js (camera keyframes), PixiJS.
- Reject: React Spring, AutoAnimate, React Transition Group, React Move, Lenis, Locomotive Scroll, Animate UI, Spell UI, CSS spring `linear()`, Remotion (licence), Revideo and Motion Canvas (competing engines), Vivus (covered by GSAP).
- Jitter: asset source only, via Lottie export; reject bounce templates.
- Open: Mol* animation API not verified (docs page 404). ChimeraX frame export stays the default for molecules.
