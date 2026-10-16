# Kit

A page is an HTML file with one element of class `fig`. The kit is injected by the build; you write the page script.

```html
<div class="page"><div class="fig" id="fig"></div></div>
<script>
const f = new Fig(document.getElementById('fig'), 178, 80, { svgTop: true });   // width, height in mm
f.letter('a', 1.5, 78);
f.tool({ x: 20, y: 40, w: 24, h: 14, title: 'Docking', sub: 'places<br>each model', fam: 'indigo', repeat: 'n' });
f.pill({ x: 60, y: 43, w: 16, h: 8, text: 'Poses', sub: 'd numbers', fam: 'palepink' });
f.route([[44.3, 47], [59.7, 47]]);
f.boundary();
</script>
```

Coordinates are millimetres, origin bottom-left. Most pages define a local `Tp = (t) => H - t` for top-down thinking. Every call returns bounds `{x, y, w, h, cx, cy, l, r, b, t}`; block calls also return `pt('l'|'r'|'t'|'b')`.

## Fig (kit/kit.js)

| Call | Draws |
|---|---|
| `new Fig(el, w, h, {svgTop})` | the canvas; `svgTop` draws routes and leaders above cards and pictures |
| `letter(ch, x, y)` | panel letter, 9 pt bold |
| `module({x,y,w,h,title,sub,icon,fam,dashed,layout})` | card: row, stack, tile or plain layout; `icon` is a Tabler icon name |
| `state({x,y,w,h,title,dashed})` | pale frame that holds a picture |
| `image({x,y,w,name,flipX})` | a trimmed render by name (`group__layer`); returns `pt(anchor)` and `outline` |
| `ghost(poly)` | dashed outline of a missing partner |
| `band({x,y,w,h,text,sub,fam,dashed})` | chevron band; status by fill |
| `group({x,y,w,h,title,fam,dashed})` | rounded container with a corner title |
| `bar`, `tensor`, `chip`, `pictogram` | small glyphs |
| `route(pts,{dashed,head,color,width})`, `dot`, `plus`, `bracket` | connectors |
| `label`, `rich(x,y,'text $t_x$',{fs,ha,bold,rot,mfs})` | text; `rich` writes `$maths$` in Arial italic with real scripts |
| `legend(x,y,[[fam,text,dashed]...],dx)` | swatch row |
| `boundary(text)` | the claim-boundary line at the foot; no argument reads `claimBoundary` of `structfig.json` |

Maths subset: letters, digits, `_x`, `_{xy}`, `^2`, `\theta \phi \sigma \mu \tau \lambda \alpha \beta`, `\to \sim \cdot \times`, `\mathrm{..}`, `\,`, `+ = -`. Pass `mfs` 8.4 so that scripts come to 6.5 pt.

## Blocks (kit/kit_blocks.js)

`tool({x,y,w,h,title,sub,fam,dashed,repeat})` saturated block, bold name; `repeat` is a number or a text such as `'N'` and draws a stack of offset copies. `pill({x,y,w,h,text,sub,fam,dashed})` rounded data object. `stage({x,y,w,h,text,fam})` vertical strip; reset the rotation of its text (`span.style.transform = 'none'`) to lay it flat over a column, as the pipeline template does. `badge({x,y,n,fam})` numbered circle. `note({x,y,w,text,fs,color,ha})` wrapped text, top-left anchored.

## Page helpers the build provides

`window.TOKENS` (the token file), `window.CONFIG` (`claimBoundary`, `typeLadder`, `strictness`), `window.ART` (render index with sizes and anchors), `window.ICONS`. Directives in the page source: `<!--INLINE_SVG layer.svg-->` (a plot layer), `<!--INLINE_JS data.js-->` (a data file that sets `window.DATA`), `<i data-icon="name"></i>` (an icon). Paths are relative to the page.

## Build

```
node build/build.mjs templates/pipeline.html 178 --out examples/pipeline
```

Arguments: page, width in mm (default `widthMm[0]` of `structfig.json`, else 178), token file (default `palette` of the config), `--out` folder (default `out/`), `--art` folder (default `art`). The build writes `<name>.html`, `.pdf` (one page, live text) and `.png` (600 dpi) and prints a JSON line with the size, the text sizes found and the cards whose content overflows. It needs Chrome, Edge or Chromium: set `STRUCTFIG_CHROME` if none is found.

## Writing pages

Write HTML, JS and Python with a file tool, not through a shell heredoc. Do not name a top-level variable `top`, `name` or `status`: pages share the window scope. Use a replacer function when you inline source with `String.replace`.
