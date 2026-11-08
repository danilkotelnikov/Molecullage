<!-- version: w03 | date: 2026-10-30 -->
# R5 - 2D vector, chart and diagram frameworks, and 2D icon sources

Worker: research subagent. Date checked: 2026-10-30. No installs, no downloads, no clones. Web reading only.

## 1. Intro

This note lists the 2D drawing, chart, diagram, formula, chemistry and font tools that Molecullage could use for print-quality vector figures. It also lists the 2D icon and illustration sources, with the exact licence rule and credit line for each. Every row was checked against a primary source this session (npm registry, GitHub release API, licence file, official docs) unless it carries a lower mark.

Evidence marks: **V** = read in a primary source this session. **S** = search summary only. **U** = unverified. "not found" means I looked and the source did not show it.

Date rule. "Release date" is the `published_at` of the latest GitHub release (V). Where I only had the npm upload timestamp, the date is marked "inferred". The numbered references at the end hold the URLs.

Molecullage fit rules used for the verdicts (from R0): SVG-first page kit in mm, headless Chrome through Playwright, PDF/PNG output, and `seek(t)` as a pure function of time. A tool fits when its SVG stays vector in print and gives the same bytes for the same input.

---

## 2a. Frameworks

| Name | What it does for Molecullage | Version (release date; checked 2026-10-30) | Licence (SPDX) | Vector/print and determinism fit | Verdict and reason | Ref |
|---|---|---|---|---|---|---|
| Plain SVG + SVGO | The page kit already writes SVG. SVGO shrinks and cleans every ingested or generated SVG. | svgo 4.1.0 (2026-08-24) V | MIT V | Vector. SVGO is deterministic for the same input and plugin list (U; no statement in README). Keep `cleanupIds` off and keep `viewBox`. | **adopt** - already the base; one optimiser pass for all SVG. | 1 |
| d3-shape | Path strings for lines, areas, arcs, curves. No DOM needed. | 3.2.0 (2022-12-20) V | ISC V | Returns a path string; vector; pure function of data. | **adopt** - smallest way to draw data paths. | 2, 3 |
| d3-scale | Linear, log, time and colour scales for axes and ticks. | 4.0.2 (2021-09-24) V | ISC V | Pure functions; no output of its own. | **adopt** - film already uses it. | 4 |
| d3-force | Network layouts (PPI graphs). Run to rest, then freeze positions. | 3.0.0 (2021-06-05) V | ISC V | Docs say it is deterministic by default: fixed-seed LCG and phyllotaxis start. Use `.stop()` and `.tick(300)` for a static layout. V | **adopt** - freeze positions into the figure JSON. | 5, 6 |
| Observable Plot | Short grammar for statistical charts as SVG. | 0.6.17 (2025-02-14) V | ISC V | Returns SVG/figure elements; needs a DOM, which headless Chrome has. Docs page returned HTTP 429, so DOM details are U. | **trial** - good for quick data panels; last release is 20 months old. | 7 |
| Vega-Lite (+ Vega) | Declarative chart spec, compiled to Vega, rendered to an SVG string in Node. | vega-lite 6.5.0 (2026-10-08) V; vega 6.4.0 (date not found) V | BSD-3-Clause V | `view.toSVG()` returns an SVG string with the headless `none` renderer V. Vector. Deterministic for the same spec and data (U). Text width in Node without a canvas package is an estimate (U). | **adopt** - spec in JSON fits the manifest and the claim gate. | 8, 9, 10, 11, 12 |
| ECharts (SVG renderer) | Rich chart set. Server-side rendering gives an SVG string. | 6.1.0 (2026-05-19) V | Apache-2.0 V | `renderer: 'svg', ssr: true`, then `renderToSVGString()` V. Vector. Animation off in SSR. Deterministic (U). | **trial** - useful for chart types Vega-Lite lacks; check the look against the palette. | 13, 14 |
| Plotly.js (static export) | Interactive charts. `Plotly.toImage` can return SVG. | 4.2.0 (2026-10-29) V | MIT V | `format: 'svg'` works V. WebGL traces embed rasters in the SVG V. Large bundle. | **hold** - use only for interactive previews. | 15, 16 |
| matplotlib (Python side) | Data panels from the Python stack, saved as SVG. | 3.11.2 (2026-09-11) V | PSF-based matplotlib licence; PyPI `license` field is free text, SPDX expression null V | `svg.fonttype='path'` is the default and makes text into paths V. `svg.hashsalt` fixes element ids V. Set `SOURCE_DATE_EPOCH` for the date (S). | **adopt** - for Python-made panels; set hashsalt and fonttype in every script. | 17, 18 |
| Konva | Canvas scene graph. | 10.9.0 (2026-10-15) V | MIT V | Canvas only. No built-in SVG export; maintainer says so (S). Raster in a PDF. | **reject** - not vector. | 19, 20 |
| Fabric.js | Canvas editor with object model. SVG import and export exist. | 7.4.0 (npm; GitHub latest tag `v740`, 2026-05-18) V | MIT V | Docs list `toSVG` on Canvas; signature and output not read (U). Canvas-first. | **hold** - no need beyond the page kit. | 21, 22 |
| Paper.js | Boolean path operations, path clean-up, SVG import and export. | 0.16.0 (2026-10-21) V | MIT V | `exportSVG({asString, precision, bounds, matchShapes})` V. Vector and deterministic. Running in Node needs a DOM shim (U). | **trial** - union/subtract and outline clean-up for ingested art (R2 chain). | 23, 24 |
| Two.js | Scene graph with SVG, Canvas and WebGL renderers. | 0.8.24 (2026-08-29) V | MIT V | SVG renderer exists V; no SVG-string API found. | **hold** - duplicates the kit. | 25, 26 |
| PixiJS | 2D engine on WebGL/WebGPU. | 8.22.0 (2026-10-01) V | MIT V | GPU raster. No SVG output (S; docs fetch returned 404). | **reject** for figures - raster. | 27 |
| tldraw | Whiteboard SDK. | 5.6.0 (2026-10-28) V | Custom tldraw licence ("SEE LICENSE IN LICENSE.md") V. Not an OSI licence. | Production use needs a trial, commercial or hobby licence key. The licence bans production use without one. Hobby use needs a "made with tldraw" watermark. V | **reject** - licence key and watermark. | 28, 29, 30 |
| Excalidraw | Hand-drawn whiteboard; `exportToSvg` returns an SVG. | @excalidraw/excalidraw 0.18.1 (2026-04-21) V | MIT V | `exportToSvg` returns a promise of an SVG V. Needs a DOM (U). Sketch look. | **hold** - fine for internal sketches only. | 31, 32, 33 |
| ELK.js (elkjs) | Layered layout with ports and orthogonal edge routing. Gives node x/y and edge bend points. | 0.12.1 (2026-10-28) V | EPL-2.0 OR GPL-3.0-or-later V | Output is coordinates, so the SVG is ours. Set `elk.randomSeed` to a fixed non-zero value; 0 means a pseudo-random seed V. Same input and options should give the same layout (U). | **adopt** - pipeline and pathway diagrams. Choose the EPL-2.0 arm. | 34, 35, 36, 37 |
| dagre (@dagrejs/dagre) | Simple layered layout for small DAGs. | 3.1.3 (tag v3.1.3; date not found) V | MIT V | Gives node centres and edge points V. Deterministic (U). Fewer edge controls than ELK. | **hold** - ELK covers it. | 38, 39 |
| Graphviz in WASM (@hpcc-js/wasm-graphviz) | `dot` layout to SVG for trees and ontologies. | 1.30.0 (npm, 2026-10-21 inferred) V | Wrapper Apache-2.0 V. Graphviz core EPL-2.0 V. | `graph.layout("svg","dot")` returns an SVG string V. Deterministic (U). | **trial** - trees and ontology graphs. | 40, 41, 42 |
| Cytoscape.js | Graph model and interactive viewer. | 3.34.4 (2026-10-15) V | MIT V | Canvas renderer. SVG export needs `cytoscape-svg` 0.4.0, which is GPL-3.0 V. Some layouts use random starts (U). | **hold** - GPL extension and canvas output. | 43, 44, 45 |
| Mermaid | Text-to-diagram. | 12.2.0 (2026-10-13; tag `@mermaid-js/tiny@12.2.0`) V | MIT V | `mermaid.render(id, text)` returns `{svg}` V. Ids are date-based unless `deterministicIds` is true V. Needs a browser. | **hold** - internal sketches only (as R2). Set `deterministicIds` and a seed if used. | 46, 47, 48 |
| KaTeX | Fast formulas as HTML + CSS + fonts. | 0.19.1 (2026-10-23) V | MIT V | Output options are `html`, `mathml`, `htmlAndMathml`; no SVG output V. Prints fine in Chrome PDF with the KaTeX fonts. Deterministic. | **adopt** - already used; do not expect an SVG string. | 49, 50, 51 |
| MathJax | Formulas as pure SVG paths (`tex2svgPromise`). | mathjax 4.1.3 (2026-07-03) V | Apache-2.0 V | SVG output V. Vector, no web fonts needed in the file. Deterministic (U). Async font load in v4 V. | **adopt** - where a formula must live inside an SVG. | 52, 53, 54 |
| RDKit.js (@rdkit/rdkit) | SMILES or molfile to a 2D structure SVG. | 2026.9.1 (release `Release_2026_09_1`, 2026-10-03) V | BSD-3-Clause V | `mol.get_svg(w,h)` returns SVG V. Vector. Fixed coordinates for fixed input (U). Call `mol.delete()` to free memory V. | **adopt** - chemistry panels. | 55, 56, 57, 58 |
| SmilesDrawer | Browser SMILES drawer, SVG or canvas. | 2.4.1 (2026-06-26) V | MIT (npm) V; README gives none | `SvgDrawer.draw(tree, svgId, theme)` writes into an `<svg>` element V. No string API shown; serialise the element. Cite the paper (doi 10.1021/acs.jcim.7b00425) V. | **trial** - lighter than RDKit.js; check bond style. | 59, 60 |
| Ketcher | Structure editor. | ketcher-core 3.18.0 (2026-09-02) V | Apache-2.0 V | An editor with its own render path; not a batch renderer. | **hold** - use to author a molfile, then draw with RDKit.js. | 61, 62 |
| opentype.js | Reads font files; turns text into outline paths. | 2.0.0 (2026-05-06) V | MIT V | `font.getPath(text,x,y,size).toSVG()` gives a `<path>` V. Vector, exact, deterministic. | **adopt** - text to outlines for print SVG (R2 rule). | 63, 64 |
| Inter | Sans-serif UI and figure text. | 4.1 (2024-11-16) V | OFL-1.1 V ("Copyright (c) 2016 The Inter Project Authors") | Fonts embed in PDF. No RFN in the text I read (U). | **adopt** - default figure font. | 65 |
| IBM Plex | Sans, Serif and Mono family. | `@ibm/plex-sans@1.1.0` (2024-11-13) V | OFL-1.1 V ("with Reserved Font Name Plex") | Embeds in PDF. A modified font must not use the name "Plex". | **adopt** - Plex Mono for code and sequences. | 66 |
| Source Sans 3 | Sans-serif body text. | 3.052R (2023-04-04) V | OFL-1.1 V ("Reserved Font Name Source") | Embeds in PDF. A modified font must not use the name "Source". | **adopt** - second text face if a figure needs one. | 67 |
| resvg (extra) | Renders SVG to PNG and PDF-ready bitmaps without Chrome. | 0.49.0 (2026-10-24) V | MIT (LICENSE-MIT seen) V; dual licence not checked | Fixed renderer for static SVG (U). | **trial** - cross-check Chrome output of a figure. | 68 |
| D2 (extra) | Diagram language with ELK and dagre layouts. Go binary. | v0.9.0 (2026-09-07) V | MPL-2.0 V | SVG output (U). Binary, not a JS library. | **hold** - ELK.js gives the same layout without a binary. | 69 |
| svg.js (extra) | Small SVG builder. | @svgdotjs/svg.js 3.2.8 (npm; GitHub latest release 3.2.6, 2026-07-17) V | MIT V | Vector. | **hold** - the kit already builds SVG. | 70 |
| rough.js (extra) | Hand-drawn style shapes. | 4.6.6 (npm; date not found) V | MIT V | Has a seed option (U). Sketch look. | **reject** - hand-drawn look suits no science figure. | 71 |

---

## 2b. Icon and illustration sources

"Licence rule" is the rule the licence gate should apply. "Credit" is shown in section 4.

| Name | What it does for Molecullage | Version (date checked) | Licence | Vector/print and determinism fit | Verdict and reason | Ref |
|---|---|---|---|---|---|---|
| Bioicons | Lab objects, cells, organisms as SVG. Repackages third-party art. | repo, no versioned release used (2026-10-30) | Per-asset, mixed. README prefers CC0 and MIT; CC BY also occurs. Rule: keep the author and licence of each icon, not "Bioicons". V | SVG. Static files; pin by commit. | **trial** - ingest per icon, quarantine anything without a clear licence. | 72, 83 |
| Health Icons | Clinical pictograms, outline and filled. | v3.0.0 (2026-10-26) V | CC0-1.0 for icons and npm packages. Website code MIT. V | SVG. Static. | **adopt** - no credit needed. | 73 |
| Reactome icon library | Pathway glyphs: receptors, organelles, compounds. | not versioned (checked 2026-10-30) | CC-BY-4.0 V | SVG. Static. | **adopt** - pathway figures. | 74, 83 |
| Servier Medical Art (SMART) | Organs, tissues, cells. | not versioned (checked 2026-10-30) | CC-BY-4.0 V | SVG/PNG/PPTX kits. Static. | **adopt** - exact credit line below. | 75 |
| SciDraw | Neuroscience drawings with a DOI each. | not versioned (checked 2026-10-30) | CC-BY-4.0 per Zenodo records of single drawings (S). The site page gave no terms text. | SVG. Static. | **trial** - read each drawing's page and DOI before use. | 76, 83 |
| NIAID NIH BioArt | Viruses, immune cells, pathogens. | not versioned (checked 2026-10-30) | Per-asset, mixed. The terms page names no licence; "check the license on each entry". Free for educational, research, informational and commercial use. V | SVG/PNG/AI/EPS. Static. | **trial** - record the entry licence at ingest. | 77, 83 |
| PhyloPic | Organism silhouettes. | not versioned (checked 2026-10-30) | Per-image: CC0-1.0, PDM, CC-BY-3.0, CC-BY-4.0, CC-BY-SA-3.0, CC-BY-NC-3.0, CC-BY-NC-SA-3.0. V | SVG. Static per image id. | **trial** - allow CC0, PDM, CC-BY only; quarantine SA and NC. | 78 |
| OpenMoji | Colour emoji set. | not versioned (checked 2026-10-30) | CC-BY-SA-4.0 V | SVG. Share-alike. | **reject** for figures - share-alike and emoji style. | 79 |
| Lucide | General UI icons. | lucide 1.65.0 (2026-10-30) V | ISC; the Feather-derived icons are MIT. V | SVG, stroke-based. | **hold** - Tabler is already installed. | 80 |
| Tabler Icons | General UI icons; already a root dependency. | @tabler/icons 3.50.0 (2026-10-27) V | MIT V | SVG, stroke-based. | **adopt** - already in use. | 81 |
| Material Symbols | Google UI icons. | npm `material-symbols` 0.48.2 (date not found) V; google/material-design-icons 4.0.0 (2020-08-31) V | Apache-2.0 V | SVG or variable font. | **hold** - duplicates Tabler. | 82 |

---

## 3. Code examples (adopt / trial items)

Each block says what was checked. "unchecked" marks a line I could not confirm in a primary source.

### 3.1 ELK layout to SVG coordinates (adopt)
Checked: `new ELK()`, `elk.layout(graph)`, `require('elkjs')` (README) and the JSON fields `children`, `edges` with `sources`/`targets`, `layoutOptions`, node `x/y/width/height`, edge `sections` with `startPoint`, `bendPoints`, `endPoint` (JSON format page). Unchecked: the option key `elk.algorithm` and that `section` fields are always present.
```js
const ELK = require('elkjs');
const elk = new ELK();
const g = await elk.layout({
  id: 'root',
  layoutOptions: { 'elk.algorithm': 'layered', 'elk.direction': 'RIGHT', 'elk.randomSeed': '1' }, // algorithm key: unchecked
  children: [{ id: 'a', width: 80, height: 30 }, { id: 'b', width: 80, height: 30 }],
  edges: [{ id: 'e1', sources: ['a'], targets: ['b'] }],
});
const nodes = g.children.map(n => `<rect x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}"/>`);
const edges = g.edges.map(e => { const s = e.sections[0];
  const pts = [s.startPoint, ...(s.bendPoints || []), s.endPoint];
  return `<polyline fill="none" stroke="#000" points="${pts.map(p => p.x + ',' + p.y).join(' ')}"/>`; });
```

### 3.2 RDKit.js SMILES to SVG (adopt)
Checked: `initRDKitModule()`, `RDKit.get_mol`, null check, `mol.get_svg(w,h)` (RDKit tests), `mol.delete()`, CDN script `RDKit_minimal.js`. Unchecked: how the `.wasm` file is found under Node and under Playwright `file://`.
```js
// browser or headless Chrome page that loaded RDKit_minimal.js
const RDKit = await initRDKitModule();
const mol = RDKit.get_mol('CC(=O)Oc1ccccc1C(=O)O');
if (!mol) throw new Error('bad SMILES');
const svg = mol.get_svg(300, 200);
mol.delete();
```

### 3.3 Formula to SVG string with MathJax (adopt)
Checked, from the MathJax README: `MathJax.init`, `tex2svgPromise`, `serializeXML`. KaTeX cannot do this step (section 3.4).
```js
import MathJax from 'mathjax';
await MathJax.init({ loader: { load: ['input/tex', 'output/svg'] } });
const node = await MathJax.tex2svgPromise('\\frac{1}{x^2-1}', { display: true });
const svg = MathJax.startup.adaptor.serializeXML(node); // pure SVG, paths for glyphs
```
The user request names "KaTeX to SVG string". KaTeX has no SVG output option (V), so use MathJax for SVG.

### 3.4 KaTeX formula to an HTML string (adopt)
Checked: `renderToString` and `throwOnError`, `output` values.
```js
const katex = require('katex');
const html = katex.renderToString('c = \\pm\\sqrt{a^2 + b^2}', { throwOnError: false, output: 'html' });
// '<span class="katex">...</span>'  - needs katex.css and the KaTeX fonts on the page
```

### 3.5 Vega-Lite to SVG in Node (adopt)
Checked: `vegaLite.compile(spec).spec` (compile page), `new vega.View(vega.parse(vg), {renderer:'none'}).toSVG()` (usage page). Unchecked: text measurement without the optional `canvas` package.
```js
const vl = require('vega-lite'), vega = require('vega');
const spec = { data: { values: [{ x: 'a', y: 3 }, { x: 'b', y: 5 }] },
  mark: 'bar', encoding: { x: { field: 'x', type: 'nominal' }, y: { field: 'y', type: 'quantitative' } } };
const vg = vl.compile(spec).spec;
const svg = await new vega.View(vega.parse(vg), { renderer: 'none' }).toSVG();
```

### 3.6 d3-force static layout, d3-shape path (adopt)
Checked: `forceSimulation(nodes).stop()` with `tick(300)`, deterministic default `randomSource`; `d3.line()(points)` returns a path string.
```js
const sim = d3.forceSimulation(nodes).force('link', d3.forceLink(links).id(d => d.id)).stop();
sim.tick(300);                       // fixed step count, no timer, no events
const d = d3.line()(nodes.map(n => [n.x, n.y]));   // "M..L.." path string
```

### 3.7 Graphviz WASM to SVG (trial)
Checked: from the package README.
```js
import { Graphviz } from '@hpcc-js/wasm-graphviz';
const graphviz = await Graphviz.load();
using graph = graphviz.createGraph('G');
graph.addEdge('a', 'b');
const svg = graph.layout('svg', 'dot');
```

### 3.8 ECharts server-side SVG (trial)
Checked: the handbook example.
```js
const echarts = require('echarts');
const chart = echarts.init(null, null, { renderer: 'svg', ssr: true, width: 400, height: 300 });
chart.setOption({ xAxis: { type: 'category', data: ['a', 'b'] }, yAxis: {}, series: [{ type: 'bar', data: [3, 5] }] });
const svg = chart.renderToSVGString();
chart.dispose();
```
The `setOption` content is mine and unchecked; the init and render calls are from the handbook.

### 3.9 SVGO pass (adopt)
Checked: README.
```js
import { optimize } from 'svgo';
const out = optimize(svgString, { multipass: true,
  plugins: [{ name: 'preset-default', params: { overrides: { cleanupIds: false } } }] }).data;
```

### 3.10 opentype.js text to outline path (adopt)
Checked: README.
```js
const opentype = require('opentype.js');
const font = opentype.parse(await require('fs').promises.readFile('./Inter.woff')); // .woff as in README; font file path is a placeholder
const pathEl = font.getPath('IL-6', 0, 100, 72).toSVG(); // '<path d="..."/>'
```

### 3.11 SmilesDrawer SVG (trial)
Checked: README. It writes into an existing `<svg id>`; serialise with `outerHTML` after drawing (the serialise step is unchecked).
```js
const drawer = new SmilesDrawer.SvgDrawer({ width: 500, height: 500 });
SmilesDrawer.parse('CCCO', tree => drawer.draw(tree, 'output-svg', 'light', false), console.error);
```

### 3.12 Paper.js boolean union and SVG export (trial)
Checked: `exportSVG` options. Unchecked: `unite` and the Node shim.
```js
paper.setup(new paper.Size(200, 200));
const a = new paper.Path.Circle({ center: [60, 60], radius: 40 });
const b = new paper.Path.Circle({ center: [100, 60], radius: 40 });
const u = a.unite(b);                     // unchecked this session
const svg = paper.project.exportSVG({ asString: true, precision: 3, bounds: 'content' });
```

### 3.13 matplotlib reproducible SVG (adopt)
Checked: `svg.fonttype`, `svg.hashsalt` defaults and meaning. `SOURCE_DATE_EPOCH` for the date field is S.
```python
import matplotlib as mpl
mpl.rcParams['svg.fonttype'] = 'path'      # text as outlines (default)
mpl.rcParams['svg.hashsalt'] = 'molecullage'
# fig.savefig('panel.svg')  with SOURCE_DATE_EPOCH set in the environment
```

### 3.14 resvg cross-check (trial)
unchecked. Command shape only: `resvg figure.svg figure.png`.

---

## 4. Attribution rules (credit line per icon source)

| Source | Exact credit rule | Evidence |
|---|---|---|
| Servier Medical Art | "Image(s) provided by Servier Medical Art (https://smart.servier.com), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)." Put it in the figure caption, acknowledgments or slide reference. For edited images: "Adapted from Servier Medical Art" plus the same links. Slides: "Illustrations from Servier Medical Art" with site link and "used under CC BY 4.0 license". | V (ref 75) |
| Reactome icon library | CC BY 4.0. The page asks that the software and information be "correctly attributed to CSHL, OICR and EBI". No fixed sentence found. Suggested line: "Icons from the Reactome Icon Library (https://reactome.org/icon-lib), CC BY 4.0; credit CSHL, OICR and EBI." (the suggested line is mine). | V for the rule; the line is a proposal |
| Bioicons | README: "Please always cite the individual icons and their respective license." For CC BY icons, give attribution and state any change. Credit line per icon: icon name, author, source link, licence (README example format). Never credit "Bioicons" alone. | V (ref 72) |
| NIAID NIH BioArt | Publication format: "BioArt Collection Name. (submission date). Entry Title. NIAID BioArt Source. bioart.niaid.nih.gov/bioart/###". Example: "NIAID Visual & Medical Arts. 08/28/2024. Filovirus. NIAID BioArt Source. bioart.niaid.nih.gov/bioart/2182". Under an image: "Illustration from NIAID NIH BioArt Source (bioart.niaid.nih.gov/bioart/###)". The entry's own licence also applies. | V (ref 77) |
| PhyloPic | CC0 and PDM: none needed. CC BY 3.0/4.0: credit the creators using the text on the Image Page, link the licence, state significant changes. CC BY-SA: also release derivatives under the same licence. NC variants: no commercial use (quarantine). Crediting PhyloPic itself is optional. | V (ref 78) |
| SciDraw | CC BY 4.0 on the Zenodo records I saw (S). Credit the creator, title, scidraw.io and the drawing's DOI. The exact site wording was not found. | S (ref 76) |
| Health Icons | None needed (CC0). The website code is MIT and needs its notice only if you copy that code. | V (ref 73) |
| OpenMoji | "All emojis designed by OpenMoji - the open-source emoji and icon project. License: CC BY-SA 4.0". Share-alike applies to derivatives. Not used. | V (ref 79) |
| Lucide | Keep the notices in the distribution: "Copyright (c) 2026 Lucide Icons and Contributors" (ISC); for Feather-derived icons "Copyright (c) 2013-present Cole Bemis" (MIT). No credit on the figure. | V (ref 80) |
| Tabler Icons | Keep "Copyright (c) 2020-2026 Pawel Kuna" and the MIT text in the distribution. No credit on the figure. | V (ref 81) |
| Material Symbols | Apache-2.0: ship a copy of the licence with the files. The Google page states no attribution requirement. | V (ref 82) |

Fonts: OFL-1.1 asks that the copyright and licence text travel with the font files, that the fonts are not sold on their own, and that a modified font drops any Reserved Font Name (Plex, Source). I read the licence name and copyright lines only; the three rules are the standard OFL terms (S). No on-figure credit is needed.

---

## 5. Verdict list

adopt: Plain SVG + SVGO; d3-shape; d3-scale; d3-force; Vega-Lite (+ Vega); matplotlib; ELK.js; KaTeX (HTML only); MathJax (SVG formulas); RDKit.js; opentype.js; Inter; IBM Plex; Source Sans 3; Health Icons; Reactome icons; Servier SMART; Tabler Icons.
trial: Observable Plot; ECharts; Paper.js; Graphviz WASM; SmilesDrawer; resvg; Bioicons; SciDraw; NIAID BioArt; PhyloPic.
hold: Plotly.js; Fabric.js; Two.js; Excalidraw; dagre; Cytoscape.js; Mermaid; Ketcher; D2; svg.js; Lucide; Material Symbols.
reject: Konva; PixiJS; tldraw; rough.js; OpenMoji.

## 6. Not verified

- Observable Plot docs: HTTP 429; DOM use in Node is U.
- PixiJS docs and Fabric.js `toSVG` signature: fetch failed or truncated (S/U).
- Konva "no SVG export": search summary of an old maintainer answer (S).
- Cytoscape layout randomness and Excalidraw DOM need: not read (U).
- Determinism of ELK, Graphviz, Vega, ECharts, SVGO and RDKit for fixed input: no statement in docs (U). Test by building twice and comparing SHA-256 before adoption.
- Dates not found: Vega 6.4.0, dagre 3.1.3, rough.js 4.6.6, Material Symbols npm 0.48.2, svg.js 3.2.8. wasm-graphviz date is inferred from the npm upload timestamp.
- Fabric.js: npm says 7.4.0; GitHub's latest tag is `v740`. I treated them as the same release; not confirmed.
- Mermaid config page excerpt showed an "elk" default for `layout`; I did not rely on it.
- SciDraw, NIAID BioArt and Bioicons per-asset licences: only rules, not a full audit.
- OFL rules for fonts: standard terms, not re-read this session.
- Code examples marked "unchecked" were not run (no installs allowed).

---

## 7. References (Vancouver style; all accessed 2026-10-30)

1. SVGO: package metadata, latest release, README. npm registry; GitHub svg/svgo. https://registry.npmjs.org/svgo/latest ; https://api.github.com/repos/svg/svgo/releases/latest ; https://raw.githubusercontent.com/svg/svgo/main/README.md
2. d3-shape: package metadata and latest release. npm; GitHub d3/d3-shape. https://registry.npmjs.org/d3-shape/latest ; https://api.github.com/repos/d3/d3-shape/releases/latest
3. d3-shape: line. D3 documentation. https://d3js.org/d3-shape/line
4. d3-scale: package metadata and latest release. https://registry.npmjs.org/d3-scale/latest ; https://api.github.com/repos/d3/d3-scale/releases/latest
5. d3-force: package metadata and latest release. https://registry.npmjs.org/d3-force/latest ; https://api.github.com/repos/d3/d3-force/releases/latest
6. d3-force: simulation. D3 documentation. https://d3js.org/d3-force/simulation
7. Observable Plot: package metadata and latest release. https://registry.npmjs.org/@observablehq%2fplot/latest ; https://api.github.com/repos/observablehq/plot/releases/latest
8. Vega-Lite: package metadata and latest release. https://registry.npmjs.org/vega-lite/latest ; https://api.github.com/repos/vega/vega-lite/releases/latest
9. Vega: package metadata. https://registry.npmjs.org/vega/latest
10. Vega-Lite: compiling. Vega-Lite documentation. https://vega.github.io/vega-lite/usage/compile.html
11. Vega: View API. Vega documentation. https://vega.github.io/vega/docs/api/view/
12. Vega: usage (Node.js). Vega documentation. https://vega.github.io/vega/usage/
13. ECharts: package metadata and latest release. https://registry.npmjs.org/echarts/latest ; https://api.github.com/repos/apache/echarts/releases/latest
14. ECharts handbook: server-side rendering. https://echarts.apache.org/handbook/en/how-to/cross-platform/server/
15. Plotly.js: package metadata and latest release. https://registry.npmjs.org/plotly.js/latest ; https://api.github.com/repos/plotly/plotly.js/releases/latest
16. Plotly.js: static image export. https://plotly.com/javascript/static-image-export/
17. matplotlib: PyPI metadata and latest release. https://pypi.org/pypi/matplotlib/json ; https://api.github.com/repos/matplotlib/matplotlib/releases/latest
18. matplotlib: customizing (rcParams svg.*). https://matplotlib.org/stable/users/explain/customizing.html ; fonts page https://matplotlib.org/stable/users/explain/text/fonts.html
19. Konva: package metadata and latest release. https://registry.npmjs.org/konva/latest ; https://api.github.com/repos/konvajs/konva/releases/latest
20. Konva SVG export: web search summary (S). Query "Konva.js export stage to SVG not supported canvas toDataURL". Result origin includes https://kiwix.lema.org/stackoverflow.com_en_all_2023-11/questions/64169705/is-there-any-way-to-export-as-a-svg-on-konva
21. Fabric.js: package metadata and latest release. https://registry.npmjs.org/fabric/latest ; https://api.github.com/repos/fabricjs/fabric.js/releases/latest
22. Fabric.js documentation and Canvas API. https://fabricjs.com/docs/ ; https://fabricjs.com/api/classes/canvas/
23. Paper.js: package metadata and latest release. https://registry.npmjs.org/paper/latest ; https://api.github.com/repos/paperjs/paper.js/releases/latest
24. Paper.js reference: Project (exportSVG). https://paperjs.org/reference/project/
25. Two.js: package metadata and latest release. https://registry.npmjs.org/two.js/latest ; https://api.github.com/repos/jonobr1/two.js/releases/latest
26. Two.js documentation. https://two.js.org/docs/two/
27. PixiJS: package metadata and latest release. https://registry.npmjs.org/pixi.js/latest ; https://api.github.com/repos/pixijs/pixijs/releases/latest
28. tldraw: package metadata and latest release. https://registry.npmjs.org/tldraw/latest ; https://api.github.com/repos/tldraw/tldraw/releases/latest
29. tldraw: LICENSE.md. https://raw.githubusercontent.com/tldraw/tldraw/main/LICENSE.md
30. tldraw: SDK licence page. https://tldraw.dev/community/license
31. Excalidraw: package metadata and latest release. https://registry.npmjs.org/@excalidraw%2fexcalidraw/latest ; https://api.github.com/repos/excalidraw/excalidraw/releases/latest
32. Excalidraw: LICENSE. https://raw.githubusercontent.com/excalidraw/excalidraw/master/LICENSE
33. Excalidraw: export utilities (exportToSvg). https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/utils/export
34. elkjs: package metadata and latest release. https://registry.npmjs.org/elkjs/latest ; https://api.github.com/repos/kieler/elkjs/releases/latest
35. elkjs: README. https://raw.githubusercontent.com/kieler/elkjs/master/README.md
36. ELK: option org.eclipse.elk.randomSeed. https://eclipse.dev/elk/reference/options/org-eclipse-elk-randomSeed.html
37. ELK: JSON graph format. https://eclipse.dev/elk/documentation/tooldevelopers/graphdatastructure/jsonformat.html
38. dagre: @dagrejs/dagre package metadata and tags. https://registry.npmjs.org/@dagrejs%2fdagre/latest ; https://api.github.com/repos/dagrejs/dagre/tags
39. dagre: wiki. https://github.com/dagrejs/dagre/wiki
40. @hpcc-js/wasm-graphviz: package metadata. npm. https://registry.npmjs.org/@hpcc-js%2fwasm-graphviz/latest
41. hpcc-js-wasm graphviz package README. https://raw.githubusercontent.com/hpcc-systems/hpcc-js-wasm/trunk/packages/graphviz/README.md
42. Graphviz: licence. https://graphviz.org/license/
43. Cytoscape.js: package metadata and latest release. https://registry.npmjs.org/cytoscape/latest ; https://api.github.com/repos/cytoscape/cytoscape.js/releases/latest
44. cytoscape-svg: package metadata. https://registry.npmjs.org/cytoscape-svg/latest
45. Cytoscape.js documentation. https://js.cytoscape.org/
46. Mermaid: package metadata and latest release. https://registry.npmjs.org/mermaid/latest ; https://api.github.com/repos/mermaid-js/mermaid/releases/latest
47. Mermaid: usage. https://mermaid.js.org/config/usage.html
48. Mermaid: configuration schema. https://mermaid.js.org/config/schema-docs/config.html
49. KaTeX: package metadata and latest release. https://registry.npmjs.org/katex/latest ; https://api.github.com/repos/KaTeX/KaTeX/releases/latest
50. KaTeX: options. https://katex.org/docs/options
51. KaTeX: API. https://katex.org/docs/api
52. MathJax: package metadata and latest release. https://registry.npmjs.org/mathjax/latest ; https://api.github.com/repos/mathjax/MathJax-src/releases/latest
53. MathJax: converting expressions. https://docs.mathjax.org/en/latest/web/convert.html
54. MathJax: README (Node usage). https://raw.githubusercontent.com/mathjax/MathJax/master/README.md
55. RDKit: @rdkit/rdkit package metadata and latest release. https://registry.npmjs.org/@rdkit%2frdkit/latest ; https://api.github.com/repos/rdkit/rdkit/releases/latest
56. RDKit.js site. https://rdkitjs.com/
57. RDKit MinimalLib README. https://raw.githubusercontent.com/rdkit/rdkit/master/Code/MinimalLib/README.md
58. RDKit MinimalLib tests (get_svg usage). https://raw.githubusercontent.com/rdkit/rdkit/master/Code/MinimalLib/tests/tests.js
59. SmilesDrawer: package metadata and latest release. https://registry.npmjs.org/smiles-drawer/latest ; https://api.github.com/repos/reymond-group/smilesDrawer/releases/latest
60. SmilesDrawer: README. https://raw.githubusercontent.com/reymond-group/smilesDrawer/master/README.md
61. Ketcher: ketcher-core package metadata and latest release. https://registry.npmjs.org/ketcher-core/latest ; https://api.github.com/repos/epam/ketcher/releases/latest
62. Ketcher: LICENSE. https://raw.githubusercontent.com/epam/ketcher/master/LICENSE
63. opentype.js: package metadata and latest release. https://registry.npmjs.org/opentype.js/latest ; https://api.github.com/repos/opentypejs/opentype.js/releases/latest
64. opentype.js: README. https://raw.githubusercontent.com/opentypejs/opentype.js/master/README.md
65. Inter: latest release and LICENSE.txt. https://api.github.com/repos/rsms/inter/releases/latest ; https://raw.githubusercontent.com/rsms/inter/master/LICENSE.txt
66. IBM Plex: latest release and LICENSE.txt. https://api.github.com/repos/IBM/plex/releases/latest ; https://raw.githubusercontent.com/IBM/plex/master/LICENSE.txt
67. Source Sans: latest release and LICENSE.md. https://api.github.com/repos/adobe-fonts/source-sans/releases/latest ; https://raw.githubusercontent.com/adobe-fonts/source-sans/release/LICENSE.md
68. resvg: latest release and LICENSE-MIT. https://api.github.com/repos/RazrFalcon/resvg/releases/latest ; https://raw.githubusercontent.com/linebender/resvg/main/LICENSE-MIT
69. D2: latest release and LICENSE. https://api.github.com/repos/terrastruct/d2/releases/latest ; https://raw.githubusercontent.com/terrastruct/d2/master/LICENSE.txt
70. svg.js: package metadata and latest release. https://registry.npmjs.org/@svgdotjs%2fsvg.js/latest ; https://api.github.com/repos/svgdotjs/svg.js/releases/latest
71. rough.js: package metadata and latest release. https://registry.npmjs.org/roughjs/latest ; https://api.github.com/repos/pshihn/rough/releases/latest
72. Bioicons: README. https://raw.githubusercontent.com/duerrsimon/bioicons/main/README.md
73. Health Icons: LICENSE and latest release. https://raw.githubusercontent.com/resolvetosavelives/healthicons/main/LICENSE ; https://api.github.com/repos/resolvetosavelives/healthicons/releases/latest
74. Reactome: icon library. https://reactome.org/icon-lib
75. Servier Medical Art: home page and "How to cite". https://smart.servier.com/ ; https://smart.servier.com/how-to-cite-servier-medical-art/
76. SciDraw: web search summary (S) of Zenodo records and a secondary article. Query "SciDraw scidraw.io license CC-BY how to cite DOI". Site: https://scidraw.io/
77. NIAID NIH BioArt Source: about and terms. https://bioart.niaid.nih.gov/about ; https://bioart.niaid.nih.gov/terms
78. PhyloPic: usage of images. https://www.phylopic.org/articles/image-usage
79. OpenMoji: FAQ. https://openmoji.org/faq/
80. Lucide: package metadata, latest release, LICENSE. https://registry.npmjs.org/lucide/latest ; https://api.github.com/repos/lucide-icons/lucide/releases/latest ; https://raw.githubusercontent.com/lucide-icons/lucide/main/LICENSE
81. Tabler Icons: package metadata, latest release, LICENSE. https://registry.npmjs.org/@tabler%2ficons/latest ; https://api.github.com/repos/tabler/tabler-icons/releases/latest ; https://raw.githubusercontent.com/tabler/tabler-icons/main/LICENSE
82. Material Symbols: Google Fonts developer guide; material-design-icons LICENSE and release; npm material-symbols. https://developers.google.com/fonts/docs/material_symbols ; https://raw.githubusercontent.com/google/material-design-icons/master/LICENSE ; https://api.github.com/repos/google/material-design-icons/releases/latest ; https://registry.npmjs.org/material-symbols/latest
83. R2 - Science asset libraries for the Molecullage prefetch catalogue. Internal note, arc-harness. <local-path> Read 2026-10-30.
84. R0 - Read-only survey: Molecullage, Cammut, arc-harness. Internal note, arc-harness. <local-path> Read 2026-10-30.
