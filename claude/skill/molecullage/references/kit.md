# Page kit reference

A figure page is an HTML file with one element of class `fig`. The build adds the kit to the page; you write the page script.

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

Coordinates are millimetres with the origin at the bottom left, as on a plotting canvas. Most pages define a local `Tp = (t) => H - t` so that they can think from the top down. Every call returns its bounds `{x, y, w, h, cx, cy, l, r, b, t}`; block calls also return `pt('l'|'r'|'t'|'b')`, the middle of each side, so that arrows can start and end on a block.

## Fig (kit/kit.js)

| Call | Draws |
|---|---|
| `new Fig(el, w, h, {svgTop})` | the canvas; `svgTop` draws routes and leaders above cards and pictures |
| `letter(ch, x, y)` | panel letter, 9 pt bold |
| `module({x,y,w,h,title,sub,icon,fam,dashed,layout})` | card in row, stack, tile or plain layout; `icon` is a Tabler icon name |
| `state({x,y,w,h,title,dashed})` | pale frame that holds a picture |
| `image({x,y,w,name,flipX})` | a cropped render by name (`group__layer`); returns `pt(anchor)` and `outline` |
| `ghost(poly)` | dashed outline of a missing partner |
| `band({x,y,w,h,text,sub,fam,dashed})` | chevron band; status by fill |
| `group({x,y,w,h,title,fam,dashed})` | rounded container with a corner title |
| `bar`, `tensor`, `chip`, `pictogram` | small shapes for data |
| `route(pts,{dashed,head,color,width})`, `dot`, `plus`, `bracket` | connectors |
| `label`, `rich(x,y,'text $t_x$',{fs,ha,bold,rot,mfs})` | text; `rich` writes `$maths$` in Arial italic with real scripts |
| `legend(x,y,[[fam,text,dashed]...],dx)` | a row of colour swatches with their names |
| `boundary(text)` | the claim-boundary line at the foot; with no argument it reads `claimBoundary` from `molecullage.json` |

Maths subset: letters, digits, `_x`, `_{xy}`, `^2`, `\theta \phi \sigma \mu \tau \lambda \alpha \beta`, `\to \sim \cdot \times`, `\mathrm{..}`, `\,`, `+ = -`. Pass `mfs` 8.4 so that the scripts come to 6.5 pt.

## Blocks (kit/kit_blocks.js)

- `tool({x,y,w,h,title,sub,fam,dashed,repeat})` draws a tool block: a saturated rectangle with a bold name, for a step that computes something. `repeat` is a number or a text such as `'N'`, and draws a stack of offset copies.
- `pill({x,y,w,h,text,sub,fam,dashed})` draws a pill, a rounded label for a piece of data, such as the poses that pass from one step to the next.
- `stage({x,y,w,h,text,fam})` draws a stage strip, a coloured bar that names a stage of a pipeline. It stands upright by default. To lay it flat across the top of a column, as the pipeline template does, reset the rotation of its text (`span.style.transform = 'none'`).
- `badge({x,y,n,fam})` draws a numbered circle that gives the reading order.
- `note({x,y,w,text,fs,color,ha})` writes wrapped text, anchored at its top left.

## What the build gives the page

The build sets `window.TOKENS` (the token file), `window.CONFIG` (`claimBoundary`, `typeLadder`, `strictness`), `window.ART` (the render index with sizes and anchors) and `window.ICONS`. It also replaces three directives in the page source: `<!--INLINE_SVG layer.svg-->` (a plot layer), `<!--INLINE_JS data.js-->` (a data file that sets `window.DATA`) and `<i data-icon="name"></i>` (an icon). Paths are relative to the page.

## Build

```
node build/build.mjs templates/pipeline.html 178 --out examples/pipeline
```

The arguments are the page, the width in mm (default `widthMm[0]` of `molecullage.json`, else 178), the token file (default `palette` of the config), the `--out` folder (default `out/`) and the `--art` folder (default `art`). The build writes `<name>.html`, `.pdf` (one page, live text) and `.png` (600 dpi). It prints one line of JSON with the size, the text sizes it found and the cards whose content overflows. It needs Chrome, Edge or Chromium; set `MOLECULLAGE_CHROME` if it finds none.

## Writing pages

- Write HTML, JS and Python with a file tool, not through a shell heredoc. A heredoc changes backslashes, and the maths in `rich` needs them.
- Do not name a top-level variable `top`, `name` or `status`. Pages share the window scope, and `const top` collides with `window.top`.
- When you inline source with `String.replace`, pass a replacer function. A replacement string expands `$'` inside the inlined source.
