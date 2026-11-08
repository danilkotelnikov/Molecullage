<!-- version: w03 | date: 2026-10-30 -->
# R6 — UI theme systems, UI kits and animation frameworks for Molecullage

Date checked: 2026-10-30. Worker: research subagent (Sonnet 5.5). No install, no download, no clone. Web reading only.
Extends R1 (`R1_motion_libraries.md`). Rows that R1 already covers carry "R1" and are not re-argued.

## 1. Intro

Molecullage needs one theme object that feeds three outputs: CSS for decks and the editor, print values for PDF figures, and fixed times for film frames. The W3C Design Tokens format reached a stable version on 28 October 2025, so a token file in that format is now a safe base. For animation, the rule stays the same as in R1: a library is useful only if we can set it to an exact time t and get the same pixels each time in headless Chrome.

Evidence marks: V = read in a primary source this session. S = search summary only. U = unverified (memory or inference). "Not found" means I looked and the source did not say.
How I read versions: GitHub API (`releases/latest`, `license`), the npm registry, deps.dev (publish date and licence), project docs, MDN, and webstatus.dev. A version is the latest at the time of reading. Dates are UTC publish dates.

## 2. Table A — themes, tokens and UI kits

Verdicts: adopt / trial / hold / reject. "Editor" means the planned graphical editor. "Figures" means print figures built with the page kit.

| Name | What it does for Molecullage | Version (date) | Licence | Fit (token export / use) | Verdict + reason | Ref |
|---|---|---|---|---|---|---|
| W3C Design Tokens Format Module (DTCG) | Neutral JSON file format for tokens. Base for the Molecullage theme object. | 2025.10, final CG report 28 Oct 2025 (V) | W3C Community Final Specification Agreement (V). Not on the W3C Standards Track (S) | Source of truth. Types: color, dimension (px or rem only), duration (ms or s), cubicBezier, fontFamily, fontWeight, strokeStyle. Aliases `{a.b}`, `$extends`, `$extensions` (V). Colour spaces include srgb, oklch, display-p3 (V). | **Adopt.** Stable, vendor-neutral, supported by Style Dictionary, Tokens Studio, Figma, Penpot (V). Note: no `pt` or `mm` unit, so print sizes go in `$extensions`. | 1, 2, 3, 4 |
| Style Dictionary | Reads tokens, writes CSS variables, JSON, JS. | 5.7.1 (2026-10-24, V) | Apache-2.0 (V) | Reads DTCG since v4. Page says 2025.10 is "not fully supported yet", work in progress for v5 (V). | **Trial.** Test the colour-object and dimension-object parts on our file. If it fails, a 30-line converter beats waiting. | 5, 6 |
| Tokens Studio (Figma plugin 2.13.2; sd-transforms 2.0.3) | Edit tokens in Figma, sync to Git. | plugin 2.13.2 (2026-10-23, V); sd-transforms 2.0.3 (2025-12-10, V) | MIT both (V) | Exports DTCG-style JSON (S). Needs Figma. | **Hold.** Useful only if a designer wants Figma. No Figma in the current flow. | 7, 8 |
| Open Props | CSS custom-property set: sizes, easings, animations, 19 Open Color hue sets, 16-step oklch palette. | 1.7.23 (2026-01-31, V); 2.0.0-beta.5 on `beta` tag (V) | MIT (V) | Ships DTCG 2025.10 resolver JSON, legacy DTCG, Figma tokens and Style Dictionary JSON (V). | **Trial.** Use as a reference for easings and durations and as a test of DTCG export. Do not take its palette. | 9, 10 |
| Tailwind CSS v4 (`@theme`) | Utility CSS. `@theme` turns tokens into CSS variables and utilities (`--color-*`, `--text-*`, `--ease-*`, `--spacing`). | 4.3.3 (2026-07-16, V) | MIT (V) | Each theme variable is also emitted on `:root` (V). `@theme inline` lets one variable point to another (V). | **Trial for the editor only.** Figures and films stay plain CSS. Map tokens with `@theme inline`. | 11, 12 |
| shadcn/ui (CLI + registry) | Copy-in React components styled with CSS variables; own registry to share items. | shadcn CLI 4.23.0 (2026-10-27, V) | MIT (V) | Semantic names `background/foreground`, `primary/primary-foreground`, `chart-1..5`, `--radius` (V). Default colours in oklch (V). Dark mode: `.dark` class overrides (V). The registry page did not show item types (V: not shown). | **Trial for the editor.** Good model for naming. Needs React and Tailwind. | 13, 14, 15 |
| Radix Primitives | Unstyled accessible React widgets. | `radix-ui` 1.8.1 (2026-10-12, V). GitHub has no releases (404) | MIT (V) | No tokens. Styling is up to us. Repo says it is maintained by WorkOS (V). | **Hold.** Base UI covers the same ground and is newer. Keep as fallback. | 16 |
| Radix Colors | 12-step colour scales. Steps 1-2 background, 3-5 component fill, 6-8 borders, 9-10 solid, 11-12 text (V). | 3.0.0 (2023-10-02, V); repo push 2025-12-17 (V) | MIT (V) | Step meaning is a useful rule for editor greys. Alpha and P3 variants: not found on the page I read. | **Trial for editor neutrals.** Not for figure colours. | 17 |
| Base UI | Unstyled React widgets from the Radix, Floating UI and MUI people (V). | 1.9.0 (2026-10-09, V) | MIT (V) | Headless. No tokens. Animation hooks: not found on the page I read. | **Trial for the editor.** Active, v1. | 18 |
| Ark UI | Headless widgets for React, Solid, Vue, Svelte on Zag.js state machines (V). | `@ark-ui/react` 5.40.0 (2026-10-29, V) | MIT (V) | No tokens. | **Hold.** Multi-framework is not a need today. | 19 |
| Park UI | Styled kit on Ark UI + Panda CSS (V). | last release `@park-ui/panda-preset` 0.43.1 (2024-11-22, V) | MIT (V) | Panda CSS stack. | **Reject.** No release for 11 months; adds a second CSS system. | 20 |
| daisyUI | Tailwind plugin. 35 built-in themes as CSS variables in oklch (V). | 5.7.50 (2026-10-13, V) | MIT (V) | Custom theme block with `--color-primary` etc. (V). | **Hold.** Its themes are look presets. Molecullage colours have meaning (antigen, binder), so presets do not fit. | 21 |
| Material Design 3 tokens + material-color-utilities | M3 token system; library makes a theme from one source colour (HCT). | utilities 0.4.0 (2026-01-21, V); repo push 2026-10-19 (V) | Apache-2.0 (V). M3 token page text could not be read (page body empty) — U | `themeFromSourceColor()`, `applyTheme()` write CSS variables (V). | **Hold.** Dynamic colour changes hue per source, which breaks fixed semantic families. Maybe one use: pick an accent for the editor chrome. | 22, 23 |
| Fluent 2 tokens | Two layers: global tokens (raw) and alias tokens (meaning) (V). Supports light, dark, high contrast (V). | `@fluentui/tokens` 1.0.0-alpha.24 (2026-08-11, V) | npm package MIT (V). Repo licence field NOASSERTION (V: mixed). Licence of design assets: not found | Layering idea only. Package is alpha. | **Hold.** Copy the two-layer idea. No dependency. | 24 |
| IBM Carbon tokens | Themes White, Gray 10, Gray 90, Gray 100. Tokens by role (`$layer-01`, `$border-subtle-01`), component tokens (V). | `@carbon/themes` 11.84.0 (2026-10-21, V); Carbon 11.119.0 (V) | Apache-2.0 (V) | Output formats: not stated on the page I read. | **Hold.** Good naming reference for layers. No dependency. | 25 |
| Open Color | 13-step hue sets. | 1.9.1 (2021-08-17, V); repo push 2023-12-10 (V) | MIT (V) | Already inside Open Props. | **Reject.** Stale. Not designed for colour-blind safety. | 26 |
| ColorBrewer | Sequential, diverging, qualitative schemes for maps and charts. | version: not found | Apache-2.0 (V, GitHub API); copyright Brewer, Harrower, Penn State (V) | Hex lists, with colour-blind flags on the site (U). | **Adopt** for data ramps in plots. Keep the credit line. | 27 |
| viridis / cividis | Perceptually even colour maps. Cividis is made for colour-vision deficiency. | viridis colormap file; cividis 2018 paper (V) | viridis page: CC0 (V). Cividis paper: CC0 dedication (V) | 256-step ramps. Grey-print safe (V for viridis). | **Adopt** for continuous data. | 30, 31 |
| Okabe-Ito palette | 8 colours safe for common colour-vision deficiency. | date: not found on the page | Page has no licence. It asks users to credit Masataka Okabe and Kei Ito (V) | Hex values are shown as a picture on the page; only vermilion has numbers (V). Standard hex list from memory (U): E69F00, 56B4E9, 009E73, F0E442, 0072B2, D55E00, CC79A7, 000000. | **Adopt** for categorical data series. Credit the authors. Check the hex list against a printed source before shipping. | 29 |
| Paul Tol schemes | Qualitative (bright, high-contrast, vibrant, muted, medium-contrast, dark, pale, light), diverging (sunset, nightfall, BuRd, PRGn), sequential (YlOrBr, iridescent, incandescent, smooth/discrete rainbow, banded) (V). | Page updated up to 2026-10-29, © 2009–2026 (V) | No licence or terms on the page (V). `tol_colors.py` licence: not found | Bright: #4477AA #EE6677 #228833 #CCBB44 #66CCEE #AA3377 #BBBBBB (V). | **Trial.** Use as reference. Ask Paul Tol or cite before bundling the full set. | 28 |
| CSS `color-mix()`, `oklch()`, `light-dark()`, `prefers-color-scheme` | Make tints and dark variants in the browser from one token. | color-mix: Widely available since May 2023 (V). oklch: Widely available since May 2023 (V). `light-dark()`: Baseline 2024, newly available, May 2024 (V). prefers-color-scheme: Widely available since Jan 2020 (V) | Web standards | `color-mix(in oklch, A 40%, B)`; `oklch(L C H / a)`; `light-dark(a, b)` needs `color-scheme: light dark` (V). Print/CMYK conversion of oklch in Chromium PDF: U. | **Adopt** for decks and editor. For print figures, keep sRGB hex in the token and test the PDF. | 32, 33, 34, 35 |
| Animate UI | Animated Radix/Base UI/React Aria wrappers on Motion. | repo push 2026-10-27 (V) | "MIT + Commons Clause" (R1, V). GitHub API shows NOASSERTION (V) | Hover and spring motion. | **Reject** (R1). | 40, 60 |
| Magic UI | Copy-in animated React components via shadcn CLI. | no GitHub release (404); last commit 2026-10-17 (V) | MIT (V). Pro tier $199 one time (V) | Installed like shadcn. Marketing effects (globe, ripple, shine). | **Reject.** Landing-page effects; no seek. | 36 |
| Aceternity UI | Animated React blocks for landing pages. | not found | Item licence by Aceternity Labs: unlimited end products, no resale or redistribution as a template (V). Statement that free parts are MIT: S only (third-party directory) | Copy-in. Uses Motion (U). | **Reject.** Custom licence, and free tier terms are not confirmed. | 37 |
| Motion Primitives | Motion + Tailwind component snippets. | repo push 2026-09-28 (V); README says beta (V) | MIT (V) | Interactive UI. | **Reject.** Beta; hover/spring motion. | 38 |
| React Bits | Large set of animated components and effects. | repo push 2026-10-19 (V) | MIT + Commons Clause v1.0 (V). Key limit: may not sell, sublicense or redistribute the tools or sounds themselves (V) | Canvas and CSS effects, many self-running. | **Reject.** Commons Clause blocks redistribution inside a free engine. Effects run on their own clock. | 39 |

## 3. Table B — animation frameworks

Columns "Fit" answers: can we seek to exact t and get the same frame in headless Chrome, and how. R1 rows are listed again only where the question asked for more (licence text, new facts).

| Name | What it does for Molecullage | Version (date) | Licence | Fit: seek(t) in headless Chrome | Verdict + reason | Ref |
|---|---|---|---|---|---|---|
| Motion (motion.dev, ex Framer Motion) | `animate()` for DOM/SVG/values; React hooks. | `motion` 14.9.0 (2026-10-30, V) | MIT (V, deps.dev and GitHub API). **Motion+** is a paid add-on: one-time 399 USD per developer, teams yearly per seat. It adds components (Gallery, Carousel, Ticker, Cursor, AnimateNumber, AnimateText, Typewriter, ScrambleText, AnimateView, Curtains, splitText), examples, an AI kit and "Motion Studio". Its APIs and examples are MIT-licensed. Builder's Licence needed if a product resells Motion+ capability (V) | Partly. Controls from `animate()` expose `time` (R1, V on 14.8). Springs and layout animations depend on frame steps. Use tween with a cubic ease and set `time = t`. | **Trial** as a t-to-value mapper. Do not buy Motion+. | 41, 42, 60 |
| GSAP | Timelines, DrawSVG, MotionPath, SplitText, MorphSVG. Already in `stage/`. | 3.15.0 (2026-04-13, V) | "Standard 'no charge' licence" (Webflow). deps.dev calls it "non-standard" (V). Owner Webflow. Permitted: use "on any website, web application, or digital interface". Prohibited: use "in tools that allow users to build visual animations without code" when such a tool rivals Webflow's animation builder (V, section I "Definitions", gsap.com/standard-license) | Yes. `gsap.timeline({paused:true})`, then `tl.seek(t, true)` (R1, V). Low risk once paused. | **Adopt** for the code-driven engine. **Hold** inside the planned graphical editor until Webflow confirms the clause does not apply. Keep it behind the adapter so anime.js can replace it. | 43, 44, 60 |
| anime.js v4 | Timeline, stagger, SVG, `seek()`. | 4.5.0 (2026-06-22, V) | MIT (V) | Yes. `createTimeline({autoplay:false})`, `tl.seek(ms)`, `muteCallbacks` flag (V). Whether `seek()` repaints while paused: not stated on the page. `engine.update/pause/resume` exist but their behaviour is not documented on the page (V). `useDefaultMainLoop`: not found. | **Trial** as the MIT fallback to GSAP. | 45 |
| lottie-web | Plays Lottie JSON (After Effects, Jitter export). | 5.13.0 (2025-05-21, V); repo push 2025-09-01 (V) | MIT (V) | Yes. `loadAnimation({renderer:'svg', autoplay:false, loop:false})`, then `goToAndStop(value, isFrame)` (V). SVG renderer gives crisp, repeatable output. | **Adopt** (SVG renderer) for imported designer clips. Slow release pace; watch it. | 46 |
| dotLottie web + ThorVG | WASM player for `.lottie` files. ThorVG is the C++ vector engine under it. | dotlottie-web 0.82.0 (2026-10-30, V); ThorVG 1.1.3 (2026-10-15, V) | MIT both (V) | Yes. `autoplay:false`, `setFrame(frame)` renders at once (R1, V in source). Raster is WASM canvas, so pixels may differ by GPU or build. | **Trial** as a second choice to lottie-web. Run the hash-repeat test. | 47, 48, 60 |
| Rive | Runtime plays `.riv`; editor makes them. | `@rive-app/canvas` 2.49.0 (2026-10-29, V) | Runtime: MIT (V, GitHub API). Editor: closed SaaS. Plans per seat per month: Free 0, Cadet 9, Voyager 32, Enterprise 120 (V). Page says free-plan exports play a Rive splash screen (V). Commercial terms: not found | Low-level API: `LinearAnimationInstance.advance(s)` then `apply` (R1, V). Delta-based, so seek = reset + advance(t). | **Hold.** Interactive decks only. Needs editor licence for clean exports. | 49, 60 |
| Theatre.js | Keyframe editor and runtime. | `@theatre/core` 0.7.2 (2024-05-19, V); repo push 2024-08-14 (V) | Apache-2.0 (V) | Yes. `sheet.sequence.position = 1` sets seconds (V). `rafDriver` exists for playback, but how to build a manual driver is not on the page (V). | **Hold.** Good model, but no release for 17 months. | 50 |
| Remotion | React video renderer with frame-based clock. | 4.0.539 (2026-10-26, V) | Remotion License, deps.dev "non-standard" (V). Free: individuals, for-profit organisations with up to 3 employees, non-profits, evaluators. Company License above that. Pricing page: Automators 0.01 USD per render, min 100 USD per month; Creators 25 USD per seat per month; Enterprise from 500 USD per month (V). License text says it will change slightly in Remotion 5.0 (V) | Frame-based by design (U for details). | **Reject** as a dependency. Licence limits a free engine. Molecullage has the same idea. | 51 |
| Motion Canvas | Generator-based canvas animation editor. | `@motion-canvas/core` 3.17.2 (2024-12-14, V); repo push 2026-07-02 (V) | MIT (V) | Own timeline and renderer. | **Reject** as a dependency; read for ideas (editor with preview). | 52 |
| Revideo | Fork of Motion Canvas for headless rendering. | `@revideo/core` 0.11.0 (2026-07-10, V); repo push 2026-07-15 (V) | MIT (V) | Own `renderVideo()`. | **Reject.** Competing engine. | 53 |
| Web Animations API (WAAPI) | Browser-native animation objects. `element.animate()`; `document.getAnimations()`. | Baseline widely available; low 2020-09-16, high 2023-03-16 (V, webstatus). `currentTime` widely available since March 2020 (V, MDN) | Web standard | Yes. Pause, then set `animation.currentTime` in milliseconds (V). `document.timeline.currentTime` is read-only and runs from the page clock (V; "cannot be driven" is MDN-plus-spec reading, U). Visual update waits for the next render, so wait two animation frames after the set (U; the local engines already do this, R0). | **Adopt.** No dependency, works with CSS animations and transitions via `getAnimations()`. | 54, 55, 61 |
| CSS scroll-driven animations | Link an animation to scroll or view progress (`animation-timeline: scroll()` / `view()`). | Baseline "limited": Chrome 115, Edge 115, Safari 26; Firefox has no version listed (V, webstatus) | Web standard | Time becomes scroll position, so seek by setting `scrollTop`. Works in Chrome. Awkward for film. | **Hold.** Not needed; WAAPI gives the same result by time. | 56 |
| View Transitions API | Animated change between two DOM states (slide change). | Baseline newly available, low date 2025-10-14; Chrome 111, Safari 18, Firefox 144 (V, webstatus) | Web standard | No pause or seek on the `ViewTransition` object (MDN page lists members, V). Seek would use `document.getAnimations()` after `transition.ready` (U). | **Hold.** Fine for live deck slide switches. Film uses its own cross-fades. | 57 |
| SMIL (SVG `<animate>`) | Animation inside an SVG file. Works in stand-alone SVG output. | `setCurrentTime` widely available since July 2015 (V, MDN) | Web standard | Yes. `svg.pauseAnimations(); svg.setCurrentTime(sec)` (setCurrentTime in seconds, V). `pauseAnimations` behaviour: page did not describe it (V: not described). | **Trial** for SVG figures that must carry their own motion. | 58 |
| Manim Community | Python maths animation, offline video. | v0.22.1 (2026-10-27, V) | MIT (V) | No browser seek. Offline render to video. Docs front page says nothing on deterministic rendering (V). | **Hold.** Optional offline asset for equation clips. | 59 |

## 4. Proposed Molecullage theme-token object (PROPOSAL, not adopted)

Status: **proposal**. Colours and type ladder come from `tokens/tokens.base.json` and `molecullage.json` (read locally). Motion durations come from `motion/core/motion.js` (`DUR`, `STAG_S`, `STAG_L`, `FADE_IN`, `FADE_OUT`). Stroke widths, spacing and the cubic-bezier easings are my proposals (U). Find them marked "proposal" in `$description`.
DTCG 2025.10 allows `px` and `rem` only (V). Print sizes in pt go in `$extensions["com.molecullage"].pt`; the px value is pt × 96 / 72.

```json
{
  "$description": "Molecullage theme, PROPOSAL w03. Colours: tokens.base.json. Type ladder: molecullage.json. Durations: motion.js. Strokes, space, easings: proposal.",
  "color": {
    "$type": "color",
    "ink":   { "$value": { "colorSpace": "srgb", "components": [0.0392, 0.0392, 0.0392], "hex": "#0a0a0a" } },
    "sub":   { "$value": { "colorSpace": "srgb", "components": [0.1686, 0.1686, 0.1686], "hex": "#2b2b2b" } },
    "guide": { "$value": { "colorSpace": "srgb", "components": [0.4667, 0.4667, 0.4667], "hex": "#777777" } },
    "white": { "$value": { "colorSpace": "srgb", "components": [1, 1, 1], "hex": "#ffffff" } },
    "family": {
      "mint":    { "fill": { "$value": { "colorSpace": "srgb", "components": [0.5686, 0.8431, 0.6706], "hex": "#91d7ab" } }, "edge": { "$value": { "colorSpace": "srgb", "components": [0.1922, 0.498, 0.2706], "hex": "#317f45" } } },
      "rose":    { "fill": { "$value": { "colorSpace": "srgb", "components": [0.8824, 0.4353, 0.4196], "hex": "#e16f6b" } }, "edge": { "$value": { "colorSpace": "srgb", "components": [0.6745, 0.2471, 0.2471], "hex": "#ac3f3f" } } },
      "peri":    { "fill": { "$value": { "colorSpace": "srgb", "components": [0.6078, 0.3176, 0.8824], "hex": "#9b51e1" } }, "edge": { "$value": { "colorSpace": "srgb", "components": [0.4784, 0.1608, 0.7333], "hex": "#7a29bb" } } },
      "apricot": { "fill": { "$value": { "colorSpace": "srgb", "components": [0.9843, 0.6941, 0.3255], "hex": "#fbb153" } }, "edge": { "$value": { "colorSpace": "srgb", "components": [0.6039, 0.3373, 0], "hex": "#9a5600" } } },
      "indigo":  { "fill": { "$value": { "colorSpace": "srgb", "components": [0.1137, 0.2235, 0.4824], "hex": "#1d397b" } }, "edge": { "$value": "{color.family.indigo.fill}" } },
      "violet":  { "fill": { "$value": { "colorSpace": "srgb", "components": [0.9451, 0.7647, 0.8667], "hex": "#f1c3dd" } }, "edge": { "$value": { "colorSpace": "srgb", "components": [0.6078, 0.1765, 0.3804], "hex": "#9b2d61" } } }
    }
  },
  "font": { "family": { "$type": "fontFamily", "sans": { "$value": ["Arial", "Liberation Sans", "Helvetica", "sans-serif"] } } },
  "type": {
    "$type": "dimension",
    "letter": { "$value": { "value": 12,      "unit": "px" }, "$extensions": { "com.molecullage": { "pt": 9 } } },
    "math":   { "$value": { "value": 11.2,    "unit": "px" }, "$extensions": { "com.molecullage": { "pt": 8.4 } } },
    "title":  { "$value": { "value": 10,      "unit": "px" }, "$extensions": { "com.molecullage": { "pt": 7.5 } } },
    "label":  { "$value": { "value": 9.3333,  "unit": "px" }, "$extensions": { "com.molecullage": { "pt": 7 } } },
    "floor":  { "$value": { "value": 8.6667,  "unit": "px" }, "$extensions": { "com.molecullage": { "pt": 6.5, "rule": "no printed text below this" } } }
  },
  "stroke": {
    "$type": "dimension",
    "hair": { "$value": { "value": 0.3333, "unit": "px" }, "$extensions": { "com.molecullage": { "pt": 0.25 } } },
    "base": { "$value": { "value": 0.6667, "unit": "px" }, "$extensions": { "com.molecullage": { "pt": 0.5 } } },
    "bold": { "$value": { "value": 1.3333, "unit": "px" }, "$extensions": { "com.molecullage": { "pt": 1 } } }
  },
  "space": {
    "$type": "dimension",
    "s1": { "$value": { "value": 1.89,  "unit": "px" }, "$extensions": { "com.molecullage": { "mm": 0.5 } } },
    "s2": { "$value": { "value": 3.78,  "unit": "px" }, "$extensions": { "com.molecullage": { "mm": 1 } } },
    "s3": { "$value": { "value": 7.56,  "unit": "px" }, "$extensions": { "com.molecullage": { "mm": 2 } } },
    "s4": { "$value": { "value": 15.12, "unit": "px" }, "$extensions": { "com.molecullage": { "mm": 4 } } }
  },
  "motion": {
    "duration": { "$type": "duration",
      "xs": { "$value": { "value": 240, "unit": "ms" } }, "s": { "$value": { "value": 400, "unit": "ms" } },
      "m":  { "$value": { "value": 640, "unit": "ms" } }, "l": { "$value": { "value": 900, "unit": "ms" } },
      "stagger-s": { "$value": { "value": 120, "unit": "ms" } }, "stagger-l": { "$value": { "value": 300, "unit": "ms" } } },
    "ease": { "$type": "cubicBezier",
      "out":   { "$value": [0.215, 0.61, 0.355, 1], "$description": "CSS match for easeCubicOut (approximation; film uses the polynomial)" },
      "inOut": { "$value": [0.645, 0.045, 0.355, 1], "$description": "CSS match for easeCubicInOut (approximation)" } }
  }
}
```

### 4a. Mapping to CSS variables

One small script (or Style Dictionary) walks the tree and writes `--mol-<path>` variables:

- `color.family.mint.fill` becomes `--mol-color-family-mint-fill: #91d7ab;` (use `hex` when present, else `oklch(...)` from the components).
- `type.floor` becomes `--mol-type-floor: 8.6667px;` and `--mol-type-floor-pt: 6.5pt;` (from the extension).
- `motion.duration.m` becomes `--mol-motion-duration-m: 640ms;`. `motion.ease.out` becomes `--mol-motion-ease-out: cubic-bezier(0.215, 0.61, 0.355, 1);`.
- Tailwind (editor only): `@theme inline { --color-mint: var(--mol-color-family-mint-fill); --ease-out: var(--mol-motion-ease-out); }` (pattern V in Tailwind docs).
- Dark mode: a second file for the dark film look, chosen with `color-scheme` and `light-dark()` in CSS (V). The DTCG Resolver module (2025.10, named in a search summary, S) is the standard way to express modes; read its text before using it.
- Colour-mix for tints: `color-mix(in oklch, var(--mol-color-family-mint-fill) 30%, white)` (V syntax).

### 4b. Mapping to the PDF and print side

- The page kit works in mm and prints through Playwright. Use the `pt` extension for CSS `font-size` and `stroke-width` in print CSS. Playwright reads `pt` directly, so no scaling step is needed (U for Playwright, standard CSS for the unit).
- `qa/qa_fig.py` and `audit_raster.py` can read `type.floor.pt` (6.5) instead of a number inside the script. This keeps one source of truth.
- Film and deck use px at 1920 wide (film `MIN_TEXT` 28, `LINE` 3 in `film/src/kit/tokens.js`, read locally). Those are separate scale tokens in px, not a conversion of the print pt. Add a `film` group later.
- sRGB hex stays in the file for print. Whether Chromium's PDF writer converts oklch to sRGB or to another profile: not tested (U). Test one figure before using oklch in print.
- Data series colours: take `Okabe-Ito` for categories and `viridis` or `cividis` for continuous values, as separate `color.data.*` tokens with credit in `$description`. The core six family colours were chosen as a semantic set, not as a colour-blind-safe set; `core_six_worst_case` in `tokens.base.json` (tritan pair, apricot against violet) says so.

## 5. Minimal `seek(t)` examples for adopt and trial animation items

`t` is in seconds. Every example sets state and renders once. Wait for fonts and two animation frames before the screenshot, as the local engines do (R0, V in local code).

**5.1 WAAPI (adopt).** Marks: `currentTime` in ms and works while paused: V (MDN). Two-frame wait: U.
```js
const a = el.animate([{ opacity: 0 }, { opacity: 1 }],
  { duration: 1000, fill: 'both', easing: 'linear' });
a.pause();                                   // no clock
const seek = async (t) => {
  document.getAnimations().forEach(x => { x.pause(); x.currentTime = t * 1000; });
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
};
await seek(0.5);                             // opacity 0.5
```

**5.2 GSAP (adopt).** Marks: `paused:true` and `seek(position, suppressEvents)`: V (R1, gsap.com docs).
```js
const tl = gsap.timeline({ paused: true });
tl.to('#a', { x: 200, duration: 1, ease: 'power2.out' })
  .to('#b', { opacity: 0, duration: 0.5 }, 0.8);
const seek = (t) => tl.seek(t, true);        // true = suppress events
seek(0.75);
```
Optional: `gsap.ticker.lagSmoothing(0)` so the clock never shifts (R1 notes the `0` argument as unverified).

**5.3 lottie-web (adopt).** Marks: `loadAnimation` options, `goToAndStop(value, isFrame)`, event `DOMLoaded`: V (lottie-web README, this session). `frameRate` property: U.
```js
const anim = lottie.loadAnimation({
  container: document.getElementById('clip'),
  renderer: 'svg', loop: false, autoplay: false, path: 'clip.json'
});
anim.addEventListener('DOMLoaded', () => {
  window.seek = (t) => anim.goToAndStop(Math.round(t * anim.frameRate), true); // isFrame = true
  window.seek(1.2);
});
```

**5.4 anime.js v4 (trial).** Marks: `createTimeline({autoplay:false})`, `.seek(ms, muteCallbacks)`: V (animejs.com). Repaint while paused: not stated, test it.
```js
import { createTimeline } from 'animejs';
const tl = createTimeline({ autoplay: false })
  .add('#a', { x: '15rem', duration: 800 })
  .add('#b', { opacity: 0, duration: 400 }, 600);
const seek = (t) => tl.seek(t * 1000, true);  // ms; true = mute callbacks
seek(0.5);
```

**5.5 Motion (trial).** Marks: `animate()` controls with `time`: V in R1 on 14.8; not re-read on 14.9.
```js
import { animate } from 'motion';
const a = animate('#a', { x: 200 }, { duration: 1, ease: 'easeOut' }); // tween, no spring
a.pause();
const seek = (t) => { a.time = t; };         // seconds
seek(0.4);
```

**5.6 dotLottie web (trial).** Marks: `setFrame(frame)`, `totalFrames`, `duration`: V in R1 (source). Event name `'load'`: U.
```js
import { DotLottie } from '@lottiefiles/dotlottie-web';
const d = new DotLottie({ canvas, src: 'clip.lottie', autoplay: false, loop: false });
d.addEventListener('load', () => {
  window.seek = (t) => d.setFrame((t / d.duration) * d.totalFrames);
  window.seek(1);
});
```

**5.7 SMIL in SVG (trial).** Marks: `setCurrentTime(seconds)`: V (MDN). `pauseAnimations()` as a prior step: described only by name (V: not described), so test it.
```js
const svg = document.querySelector('svg');
svg.pauseAnimations();
const seek = (t) => svg.setCurrentTime(t);   // seconds
seek(2.5);
```

Hold-and-reject items (Theatre.js, Rive, Remotion, Manim) have no example here. R1 holds the Rive and Theatre.js lines (`sheet.sequence.position = 1`, V again this session).

## 6. Notes and gaps

1. **GSAP and the planned editor.** The restricted use is "tools that allow users to build visual animations without code" that rival Webflow's builder. A Molecullage graphical editor that lets users place and time shapes without code may fall in that class. Ask Webflow in writing before GSAP ships inside the editor. The code-driven engine is a permitted use today (V). Keep anime.js ready.
2. **DTCG limits.** No `pt` or `mm` unit in 2025.10 (V). The proposal uses `$extensions`. The Style Dictionary page says 2025.10 is only partly supported (V).
3. **Existing token file.** `tokens/tokens.base.json` (version 1.0.0) already holds the colours in a non-DTCG shape, plus a `css` string. The proposal is a DTCG version of the same values. A converter (`palette/make_tokens.py` is the existing maker) should write both files.
4. **Not found:** ColorBrewer version number; Magic UI release tag; Aceternity free-tier licence text; Paul Tol licence; Okabe-Ito licence; Fluent 2 asset licence; Rive commercial terms for exports; Material 3 token page text; animation hooks of Base UI; alpha and P3 variants of Radix Colors.
5. **Unverified items worth a test run:** two-frame wait after WAAPI seek; `anime.js` repaint on paused `seek()`; lottie-web `frameRate`; dotLottie `'load'` event name; Chromium PDF handling of oklch; hash repeatability of dotLottie WASM raster across machines.
6. **Stale or weak projects:** Park UI (no release since 2024-11), Open Color (2021), Theatre.js (2024-05), Motion Canvas (npm 2024-12), lottie-web (npm 2025-05, slow).

## 7. References (Vancouver style; accessed 2026-10-30)

1. Design Tokens Format Module 2025.10. Design Tokens Community Group, W3C. 2025 Oct 28. https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/ [accessed 2026-10-30].
2. Design Tokens specification reaches first stable version. Design Tokens Community Group, W3C. 2025 Oct 28. https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/ [accessed 2026-10-30].
3. Design Tokens Color Module 2025.10. designtokens.org. https://www.designtokens.org/tr/2025.10/color/ [accessed 2026-10-30].
4. Design Tokens FAQ and home page (status text, "First stable version 2025.10 now available"). designtokens.org. https://designtokens.org/ ; FAQ https://www.designtokens.org/faq/ (FAQ by search summary only) [accessed 2026-10-30].
5. Design Tokens (DTCG) support. Style Dictionary documentation. https://styledictionary.com/info/dtcg/ [accessed 2026-10-30].
6. amzn/style-dictionary: releases/latest and license. GitHub REST API. https://api.github.com/repos/amzn/style-dictionary/releases/latest ; /license [accessed 2026-10-30].
7. tokens-studio/figma-plugin: releases/latest and license. GitHub REST API. https://api.github.com/repos/tokens-studio/figma-plugin/releases/latest [accessed 2026-10-30].
8. tokens-studio/sd-transforms: releases/latest and license. GitHub REST API. https://api.github.com/repos/tokens-studio/sd-transforms/releases/latest [accessed 2026-10-30].
9. Open Props. Adam Argyle. https://open-props.style/ [accessed 2026-10-30].
10. argyleink/open-props license and releases (GitHub API); open-props dist-tags (npm registry https://registry.npmjs.org/-/package/open-props/dist-tags); open-props 1.7.23 (deps.dev https://api.deps.dev/v3/systems/npm/packages/open-props/versions/1.7.23) [accessed 2026-10-30].
11. Theme variables (@theme). Tailwind CSS documentation. https://tailwindcss.com/docs/theme [accessed 2026-10-30].
12. tailwindlabs/tailwindcss: releases/latest and license. GitHub REST API. https://api.github.com/repos/tailwindlabs/tailwindcss/releases/latest [accessed 2026-10-30].
13. Theming. shadcn/ui documentation. https://ui.shadcn.com/docs/theming [accessed 2026-10-30].
14. Registry introduction. shadcn/ui documentation. https://ui.shadcn.com/docs/registry [accessed 2026-10-30].
15. shadcn-ui/ui: releases/latest and license. GitHub REST API. https://api.github.com/repos/shadcn-ui/ui/releases/latest [accessed 2026-10-30].
16. radix-ui/primitives (GitHub REST API https://api.github.com/repos/radix-ui/primitives); radix-ui 1.8.1 (npm registry https://registry.npmjs.org/radix-ui/latest; deps.dev https://api.deps.dev/v3/systems/npm/packages/radix-ui/versions/1.8.1) [accessed 2026-10-30].
17. Understanding the scale. Radix Colors documentation. https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale ; @radix-ui/colors 3.0.0 (npm registry https://registry.npmjs.org/@radix-ui/colors) ; repo https://api.github.com/repos/radix-ui/colors [accessed 2026-10-30].
18. Base UI: README https://raw.githubusercontent.com/mui/base-ui/master/README.md ; quick start https://base-ui.com/react/overview/quick-start ; releases https://api.github.com/repos/mui/base-ui/releases/latest [accessed 2026-10-30].
19. Ark UI: README https://raw.githubusercontent.com/chakra-ui/ark/main/README.md ; releases https://api.github.com/repos/chakra-ui/ark/releases/latest ; npm @ark-ui/react https://registry.npmjs.org/@ark-ui/react/latest [accessed 2026-10-30].
20. chakra-ui/park-ui: releases/latest and license. GitHub REST API. https://api.github.com/repos/chakra-ui/park-ui/releases/latest [accessed 2026-10-30].
21. daisyUI themes. daisyUI documentation. https://daisyui.com/docs/themes/ ; releases https://api.github.com/repos/saadeghi/daisyui/releases/latest [accessed 2026-10-30].
22. material-color-utilities (TypeScript) README. Material Foundation. https://raw.githubusercontent.com/material-foundation/material-color-utilities/main/typescript/README.md ; repo https://api.github.com/repos/material-foundation/material-color-utilities ; version https://api.deps.dev/v3/systems/npm/packages/%40material%2Fmaterial-color-utilities/versions/0.4.0 [accessed 2026-10-30].
23. Design tokens – Material Design 3. Google. https://m3.material.io/foundations/design-tokens/overview (page body returned empty) [accessed 2026-10-30].
24. Design tokens. Fluent 2 design system, Microsoft. https://fluent2.microsoft.design/design-tokens ; microsoft/fluentui https://api.github.com/repos/microsoft/fluentui/license ; @fluentui/tokens https://api.deps.dev/v3/systems/npm/packages/%40fluentui%2Ftokens/versions/1.0.0-alpha.24 [accessed 2026-10-30].
25. Color tokens. Carbon Design System, IBM. https://carbondesignsystem.com/elements/color/tokens/ ; carbon-design-system/carbon https://api.github.com/repos/carbon-design-system/carbon/releases/latest ; @carbon/themes https://api.deps.dev/v3/systems/npm/packages/%40carbon%2Fthemes/versions/11.84.0 [accessed 2026-10-30].
26. yeun/open-color (GitHub REST API https://api.github.com/repos/yeun/open-color); open-color 1.9.1 (deps.dev https://api.deps.dev/v3/systems/npm/packages/open-color/versions/1.9.1) [accessed 2026-10-30].
27. ColorBrewer 2.0. Brewer C, Harrower M, The Pennsylvania State University. https://colorbrewer2.org/ ; licence via https://api.github.com/repos/axismaps/colorbrewer/license [accessed 2026-10-30].
28. Colour schemes. Tol P. SRON. https://sronpersonalpages.nl/~pault/ [accessed 2026-10-30].
29. Color Universal Design (CUD): how to make figures and presentations that are friendly to colorblind people. Okabe M, Ito K. https://jfly.uni-koeln.de/color/ [accessed 2026-10-30].
30. A better default colormap for matplotlib (viridis colormaps page). van der Walt S, Smith N. https://bids.github.io/colormap/ [accessed 2026-10-30].
31. Nuñez JR, Anderton CR, Renslow RS. Optimizing colormaps with consideration for color vision deficiency to enable accurate interpretation of scientific data. PLoS ONE. 2018;13(7):e0199239. doi:10.1371/journal.pone.0199239. https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0199239 [accessed 2026-10-30].
32. color-mix(). MDN Web Docs. https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix [accessed 2026-10-30].
33. oklch(). MDN Web Docs. https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch [accessed 2026-10-30].
34. light-dark(). MDN Web Docs. https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark [accessed 2026-10-30].
35. prefers-color-scheme. MDN Web Docs. https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme [accessed 2026-10-30].
36. Magic UI: installation https://magicui.design/docs/installation ; repo https://api.github.com/repos/magicuidesign/magicui ; licence https://api.github.com/repos/magicuidesign/magicui/license ; commits https://api.github.com/repos/magicuidesign/magicui/commits?per_page=1 [accessed 2026-10-30].
37. Licence. Aceternity UI, Aceternity Labs LLC. https://ui.aceternity.com/licence ; home https://ui.aceternity.com ; free-tier claim from web search summary only (marketplace.aceternity.com/licence; tinystartups.com/tools/aceternity-ui) [accessed 2026-10-30].
38. Motion Primitives. ibelick. README https://raw.githubusercontent.com/ibelick/motion-primitives/main/README.md ; repo https://api.github.com/repos/ibelick/motion-primitives [accessed 2026-10-30].
39. React Bits. David Haz. LICENSE https://raw.githubusercontent.com/DavidHDev/react-bits/main/LICENSE.md ; repo https://api.github.com/repos/DavidHDev/react-bits [accessed 2026-10-30].
40. Animate UI. imskyleen. README https://raw.githubusercontent.com/imskyleen/animate-ui/main/README.md ; repo https://api.github.com/repos/imskyleen/animate-ui [accessed 2026-10-30].
41. motion 14.9.0 (deps.dev https://api.deps.dev/v3/systems/npm/packages/motion/versions/14.9.0 ; npm registry https://registry.npmjs.org/motion) ; motiondivision/motion licence https://api.github.com/repos/motiondivision/motion/license [accessed 2026-10-30].
42. Motion+. Motion. https://motion.dev/plus [accessed 2026-10-30].
43. gsap 3.15.0 (deps.dev https://api.deps.dev/v3/systems/npm/packages/gsap/versions/3.15.0 ; npm registry https://registry.npmjs.org/gsap) [accessed 2026-10-30].
44. GSAP Standard "No Charge" License. Webflow / GreenSock. https://gsap.com/standard-license/ [accessed 2026-10-30].
45. anime.js: releases https://api.github.com/repos/juliangarnier/anime/releases/latest ; timeline seek https://animejs.com/documentation/timeline/timeline-methods/seek ; engine https://animejs.com/documentation/engine [accessed 2026-10-30].
46. lottie-web: README https://raw.githubusercontent.com/airbnb/lottie-web/master/README.md ; repo https://api.github.com/repos/airbnb/lottie-web ; 5.13.0 https://api.deps.dev/v3/systems/npm/packages/lottie-web/versions/5.13.0 [accessed 2026-10-30].
47. dotlottie-web 0.82.0. LottieFiles. https://api.deps.dev/v3/systems/npm/packages/%40lottiefiles%2Fdotlottie-web/versions/0.82.0 ; npm registry https://registry.npmjs.org/@lottiefiles/dotlottie-web [accessed 2026-10-30].
48. ThorVG. thorvg/thorvg releases and license. https://api.github.com/repos/thorvg/thorvg/releases/latest [accessed 2026-10-30].
49. Rive: rive-wasm licence https://api.github.com/repos/rive-app/rive-wasm/license ; pricing https://rive.app/pricing ; web runtime docs https://rive.app/docs/runtimes/web/web-js ; @rive-app/canvas 2.49.0 https://api.deps.dev/v3/systems/npm/packages/%40rive-app%2Fcanvas/versions/2.49.0 [accessed 2026-10-30].
50. Theatre.js: core API https://www.theatrejs.com/docs/latest/api/core ; repo https://api.github.com/repos/theatre-js/theatre ; @theatre/core 0.7.2 https://api.deps.dev/v3/systems/npm/packages/%40theatre%2Fcore/versions/0.7.2 [accessed 2026-10-30].
51. Remotion: LICENSE https://raw.githubusercontent.com/remotion-dev/remotion/main/LICENSE.md ; licence and pricing https://www.remotion.pro/license ; remotion 4.0.539 https://api.deps.dev/v3/systems/npm/packages/remotion/versions/4.0.539 [accessed 2026-10-30].
52. Motion Canvas: repo https://api.github.com/repos/motion-canvas/motion-canvas ; @motion-canvas/core 3.17.2 https://api.deps.dev/v3/systems/npm/packages/%40motion-canvas%2Fcore/versions/3.17.2 [accessed 2026-10-30].
53. Revideo: repo https://api.github.com/repos/midrender/revideo ; @revideo/core 0.11.0 https://api.deps.dev/v3/systems/npm/packages/%40revideo%2Fcore/versions/0.11.0 [accessed 2026-10-30].
54. Animation: currentTime property. MDN Web Docs. https://developer.mozilla.org/en-US/docs/Web/API/Animation/currentTime [accessed 2026-10-30].
55. Document: timeline property. MDN Web Docs. https://developer.mozilla.org/en-US/docs/Web/API/Document/timeline [accessed 2026-10-30].
56. CSS scroll-driven animations. MDN Web Docs. https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll-driven_animations ; support data https://api.webstatus.dev/v1/features/scroll-driven-animations [accessed 2026-10-30].
57. View Transition API. MDN Web Docs. https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API ; support data https://api.webstatus.dev/v1/features/view-transitions [accessed 2026-10-30].
58. SVGSVGElement: setCurrentTime() method. MDN Web Docs. https://developer.mozilla.org/en-US/docs/Web/API/SVGSVGElement/setCurrentTime [accessed 2026-10-30].
59. Manim Community: docs https://docs.manim.community/en/stable/ ; releases https://api.github.com/repos/ManimCommunity/manim/releases/latest ; licence https://api.github.com/repos/ManimCommunity/manim/license [accessed 2026-10-30].
60. R1 — Animation libraries for the Molecullage seek(t) engine. Local file `<local-path>` (version w02, 2026-10-30).
61. Web Animations support data. webstatus.dev. https://api.webstatus.dev/v1/features/web-animations [accessed 2026-10-30].
