# Presentations with Molecullage Deck

A deck is one folder with one file, `deck.json`. The file lists the slides, the speaker notes, the animation steps and the 3D scenes. The deck module turns it into a page of 1920 x 1080 pixels, the same Arial and the same palette as the figures, and from that page it makes a standalone HTML file, a PDF, a set of PNG files, an MP4 or GIF, and the notes. Slides are written for Russian first; any language in Arial's Latin and Cyrillic letters works.

Tested on Windows 11 with Node 24, Chrome, ffmpeg and ChimeraX 1.10. The Linux and macOS commands are the same but I have not run them.

## Start in one minute

```
node deck/cli.mjs new talks/my-talk --title "Название доклада"
npm run deck:preview -- talks/my-talk
```

The first command writes `talks/my-talk/deck.json` with three slides. The second starts a preview on `http://127.0.0.1:4177/`. Edit `deck.json` and the open pages reload by themselves. The slide number stays, because it is in the address.

| Key | What it does |
|---|---|
| Right, Space, Page Down | next step, then next slide |
| Left, Page Up | back |
| Home, End | first and last slide |
| O | overview: every slide in a grid; click one to jump |
| P | open the presenter window |
| F | full screen |
| ? | the list of keys |

The presenter window shows the current slide, the next slide, the speaker notes, a timer and the time spent on each slide. It follows the main window, and the main window follows it. Press the keys in either one.

## The folder

```
my-talk/
  deck.json        the manifest
  media/           renders of the 3D loops (made by the build, safe to keep)
  dist/            exports (HTML, PDF, PNG, MP4, notes)
  out/             the preview and the audit write here (ignored by git)
```

Files named in `deck.json` (images, PDB files) are paths relative to the deck folder. They may also lie inside the Molecullage folder, for example `../../gallery/02-ebola-pocket/02-ebola-pocket.thumb.png`. Anything else is refused.

## deck.json

```json
{
  "title": "Название доклада",
  "lang": "ru",
  "audience": "cloud",
  "boundary": "Что здесь данные, а что иллюстрация: одна строка.",
  "fps": 30,
  "transition": { "kind": "fade", "ms": 500 },
  "duration": 6000,
  "scenes": { },
  "slides": [ ]
}
```

| Key | Meaning |
|---|---|
| `title` | The name of the deck. It heads the notes PDF. |
| `audience` | `neutral`, `cloud`, `academic` or `industry`. Picks two colour families (see "One deck for several audiences"). |
| `accent`, `second` | Instead of `audience`: two families of the token file, for example `"accent": "indigo"`. |
| `boundary` | The one line at the foot of every slide: what is real data and what is a drawing. At most 14 words. |
| `fps` | Frames per second of the video. Default 30. |
| `transition` | Between slides: `none`, `fade`, `slide` or `rise`, and its length in ms. A slide may set its own. |
| `duration` | How long a slide stays, in ms, before the video moves on. Default 6000. |
| `scenes` | The 3D scenes (below). |
| `slides` | The list of slides. |

Mistakes in the file stop the build with a message that names the slide and the key. Warnings (a slide with no title, an image with no alt text, a duration too short for its animation) are printed and the build goes on. `node deck/cli.mjs validate <deck>` prints only these.

## The ten layouts

Every slide has a `layout`, a `title` and `notes`. The other keys depend on the layout.

| `layout` | What it holds |
|---|---|
| `title` | `kicker` (small line above), `title`, `subtitle`, `meta` (author, date). |
| `section` | `title`, `subtitle`. The section number counts itself. |
| `two-column` | `left` and `right`, each a block or a list of blocks. A bare string is a text block. |
| `figure` | `figure`, one block (an image, a device frame or a 3D scene), and a one-line `caption`. |
| `number` | `items`: up to 4 of `{ "value": "8", "label": "…" }`. The value counts up from zero when it appears. |
| `timeline` | `items`: up to 7 of `{ "when": "…", "title": "…", "text": "…" }`. |
| `table` | `columns` (up to 6) and `rows` (up to 8, one cell for each column). `"build": true` shows a row per step. |
| `molecule` | `scene`, the name of a scene, and `bullets`: a list that sits beside the molecule. |
| `cards` | `items`: 2 to 6 cards of `{ "title": "…", "text": "one line", "src": "img/a.png", "alt": "…", "note": "caption", "chip": "in code", "kind": "ok" }`. A card is a picture (4:3), a name and a line; the optional chip sits in the picture's corner and `kind` is `ok` (dark, in code), `part` (apricot), `plan` (white, dashed) or `stop` (rose). One style serves a gallery and a status slide. Cards build one by one. |
| `page` | `page`: a `.png`, `.jpg`, `.webp` or `.svg` of the deck folder, a finished figure at slide size (16:9). No engine title or footer: the figure holds its own title and claim line. A small slide counter sits in the bottom right corner (leave about 17 x 6 mm free there; `"counter": false` in the deck turns it off). `title` and `alt` are only the text for readers of the file. A raster page can `reveal` regions in order: `[{ "rect": [x, y, w, h] }, …]`, fractions of the page from 0 to 1; what lies outside the regions shows from the start. An `.svg` page builds by `data-s="k"` with `"steps": n`, and plays its own clock with `"ms"`, as an `svg` block does. |

Text may use `**bold**`, `_{sub}` and `^{sup}` (`H_{2}O`, `10^{-9}`). `\n` starts a new line.

### Blocks

| `type` | Keys |
|---|---|
| `text` | `text` |
| `list` | `items` (strings), `build` |
| `image` | `src`, `alt` (write it: it is what a screen reader says) |
| `device` | `frame` (`browser`, `phone` or `laptop`), `src` (a screenshot), `url` (a live page, optional), `title` |
| `mol` | `scene`, `play` (`auto` or `button`) |
| `svg` | `src` (an `.svg` file in the deck folder), `steps` (0 to 12), `ms` (length of the drawing's own timeline, 500 to 120000) |

Every block may have `"effect"`: `fade-up` (default), `fade`, `zoom`, `left` or `none`.

### Drawings that build and animate (`svg`)

An `svg` block puts the drawing into the page, so its parts can build like blocks do. Scripts, `foreignObject`, event handlers and links are refused; the one exception is `<image href="img/a.png">` with a path inside the deck folder, which is embedded like any other asset. In the drawing:

- `data-s="k"` on a group makes it appear at key press `k` (up to `steps`). One lane or one panel per press is the usual use.
- `data-step="0"` with `data-at` (ms), `data-dur` (ms) and `data-effect` puts a part on the slide's timeline. When the block has `ms`, that timeline is the entrance, and the slide's `duration` should be longer than `ms` so the last state is held and is the one used for the PDF and PNG.
- Effects are `fade`, `zoom`, `left`, `fade-up` and `draw`. `draw` draws a path along its length; the path needs `pathLength="1"`.
- `data-out="ms"` makes a part leave at that time; `data-out-dur` (default 500) is how long it takes and `data-out-to` (default 0) is the opacity it ends at, so 0.2 leaves a ghost.

The text in a drawing is as large on the slide as it is in the file when the drawing is no wider than the content width (1680 px) and no taller than the free height. Draw it at that size. `examples/deck-demo` has an example. A picture that is a dense scheme (an appendix slide) can take `"size": "full"` on a `figure` slide: the title shrinks, the bar goes and an `svg` block may be 910 px high. A raster picture goes in an `svg` block as `<image href="img/name.png"/>`, which also lets it be taller than an `image` block (600 px).

## Builds, times and animation

A **build** is a step that you trigger with a key press: one list item, one number, one table row. Mark a list with `"build": true`; the items of `number` and `timeline` build by default (`"build": false` turns that off). Steps are numbered in reading order.

Every visible thing in the page is a function of one number: the time in milliseconds since the slide began. A key press does not start a clock that runs on; it moves the time from one stop to the next. The stops are the start (the entrance), then one for each step. This is what lets the exporter draw the same frame every time: it sets the time, it does not wait for it.

Where the manifest does not say, the times are:

- the entrance runs 0 to 600 ms;
- the first step comes 900 ms in, or after a 3D scene that plays by itself has finished;
- steps come at least 700 ms apart, spread over the slide's `duration`;
- a build takes 500 ms.

To set the step times yourself, give `"timing": [900, 2400, 4000]`, one time for each step. If the slide is too short for its steps and scenes, the build makes it longer and prints a warning. That longer time is what the video uses. In the live deck, the key press is the only clock.

## 3D scenes

A scene is declared once under `scenes` and used by name:

```json
"scenes": {
  "loop": { "kind": "chimerax", "pdb": "1MEL", "drop": "B,M", "chains": { "A": "rose", "L": "mint" },
            "motion": "highlight", "target": "A:99-122", "duration": 3000, "size": [960, 720],
            "title": "Петля CDR3 нанотела на лизоциме, PDB 1MEL (рендер ChimeraX)" }
}
```

| Key | Meaning |
|---|---|
| `kind` | `chimerax`: a flat render made by the `struct/` pipeline, shown as a looping video. `webgl`: an interactive viewer (3Dmol.js) inside the page. |
| `pdb` | A four-character PDB code, or a `.pdb` or `.cif` path. The file is looked for in the deck folder, then in `data/pdb/`. With `--fetch` a missing entry is downloaded by `scripts/fetch_pdb.py`. |
| `drop` | Chains to leave out, for example `B,M`. |
| `chains` | Colour family for each chain, for example `{ "A": "rose" }`. |
| `motion` | `rotate`, `pocket` (fly to `target`, then swing round it), `highlight` (`target` as sticks), `morph` (to the structure in `to`; ChimeraX only). |
| `target` | Residues: `A:99-122` or `A:99-122,130;L:30`. A chain alone (`A`) means the whole chain. |
| `duration` | Length of one run of the motion in ms. |
| `title` | The caption under the scene. |

The WebGL viewer has a ▶ button that plays the motion again and a ⤢ button that opens the scene in its own window (`?popout=<scene>`). The viewer is part of the HTML file: it needs no network. In the video the exporter moves the camera along the same path with the same clock as everything else, so a frame is the same in every run.

A ChimeraX scene is rendered once, as a PNG sequence, and cached in `media/<scene>.mp4`, `.gif` and `.json`. The build renders again only when the scene's settings change. The video is cut into frames exactly in the export.

**When ChimeraX or ffmpeg is missing**, the build says so in its log and shows the scene in the WebGL viewer instead. A morph cannot fall back and is shown as a rotation, with a line in the log.

ChimeraX opens a window while it renders. Do not use the computer for another ChimeraX task at that time.

## Device frames

A `device` block puts a screenshot of your interface in a browser, phone or laptop frame. Make the screenshot of a running page with `node deck/cli.mjs shot http://localhost:5173 shots/ui.png`. If the block also has a `url`, the live preview loads that page in the frame, so you can click in it during the talk. Exports always use the screenshot: the result does not depend on a server being up.

## One deck for several audiences

`audience` picks the accent and second colour families:

| `audience` | Accent | Second |
|---|---|---|
| `neutral` | indigo | apricot |
| `cloud` | indigo | mint |
| `academic` | maroon | palelilac |
| `industry` | peri | apricot |

Add `"only": ["academic"]` to a slide to show it for that audience only. Build another version with `--audience industry` and the slides and the colours change; the file stays one. The colours always come from the token file, so every colour is in the palette.

## Speaker notes

The `notes` of a slide are plain text. They appear in the presenter window and in two exports: `<name>-notes.txt` (the notes, one block per slide, with the slide number and title) and `<name>-notes.pdf` (A4, a thumbnail of the slide and its notes beside it).

## Exports

```
node deck/cli.mjs build  <deck>                                   # check, render the loops, write the HTML
node deck/cli.mjs export <deck> --format html|pdf|png|mp4|gif|notes|sheet|all
```

Flags: `--fps 30`, `--width 1920`, `--duration <ms>` (every slide gets this length), `--slide id,id` (only these slides), `--scale 2` (PNG), `--audience a`, `--out dir` (default `<deck>/dist`), `--fetch`.

| Format | What you get |
|---|---|
| `html` | One file, `dist/<name>.html`. CSS, JavaScript, the viewer, images and data are inside it. It opens from a file, with no network. |
| `pdf` | One page per slide, each exactly 1920 x 1080 px (1440 x 810 pt). Text stays text. A video or a 3D scene appears as its still frame. |
| `png` | `dist/png/<name>-NN-<id>.png`, one per slide, in its finished state. The metadata chunks are removed. |
| `mp4` | H.264 video. The exporter sets the time of the page, takes a frame, and sends it to ffmpeg. Frames equal to the last one are not taken again. Slide lengths come from the manifest or from `--duration`. |
| `gif` | The same, as a GIF; default 15 fps. Use `--slide` for one slide. |
| `notes` | The text file and the notes PDF. |
| `sheet` | One PNG with every slide in its finished state: the sheet for the blind read. |

The video needs `ffmpeg` on the path. The browser is the one the build uses for figures (`MOLECULLAGE_CHROME`). The page is drawn with software OpenGL, so the 3D scenes need no graphics card. Network requests are blocked while exporting.

Render times from the demo deck on one Windows 11 machine are in `examples/deck-demo/how-made.md`.

## Checking a deck

```
node deck/cli.mjs audit <deck> [--strictness normal|strict|loose] [--sheet sheet.png]
```

The audit opens the real page and measures it. At `normal` these fail the check: a colour outside the palette; text under 25 px; text outside its slide or cut off; blocks that overlap; contrast under 4.5 to 1 (3 to 1 for text of 56 px or more, or bold text of 42 px or more); a missing image or video. Word counts and type sizes outside the ladder are warnings. `strict` makes them failures. `loose` makes every item a warning and always passes.

The deck type ladder is the figure ladder at 3.8 times, rounded, plus two big sizes:

| Step | px at 1920 x 1080 |
|---|---|
| smallest text | 25 |
| label | 28 |
| body | 36 |
| subtitle | 44 |
| title | 64 |
| display | 110 |
| number | 220 |

The word budget: 70 words on a slide, 12 in a title, 16 in a list item, 14 in the boundary line.

The audit also writes `out/overclaim-pack.md`: every title, text, caption and note of the deck, for a second reader to check against the data. Use it with `qa/overclaim_read.md`. For the blind read, make the sheet and give a reader only that PNG, with `qa/blind_read.md`.

To change the ladder or the budgets for one project, put `deckLadder` and `deckWords` in `molecullage.json`. The values you leave out keep their defaults.

## From Claude Code

| Tool | What it does |
|---|---|
| `new_deck` | Writes a starter `deck.json` into a folder of the project. |
| `build_deck` | Checks the manifest, renders the loops and writes the HTML. |
| `preview_deck` | Starts the live preview and returns its address and process id. |
| `export_deck` | Makes one format, or all. |
| `deck_contact_sheet` | One PNG with every slide, for the blind read. |
| `audit_deck` | The checks above, as JSON. |

All paths must lie inside the project folder.

## Limits

- The page is 1920 x 1080. Other sizes are the same page scaled; there is no 4:3 layout.
- Arial only. Cyrillic needs a system Arial; the audit does not check that every letter has a glyph, so look at the sheet once.
- Ten layouts. If a slide does not fit one, put an `image` of a Molecullage figure in a `figure` slide.
- A morph needs ChimeraX, and a ChimeraX scene cannot be changed in the live preview: edit the scene and build again to render it.
- The pop-out window and a live `url` in a device frame work in a normal browser window; I tested the exports and the preview, not these two against a real second window and a running interface.
- The ChimeraX motions `rotate`, `highlight` and `pocket` are tested on 1MEL. `morph` is tested on a copy of 1MEL with a moved loop, not on two real conformations of one protein; its two structures must have the same chains and residues.
- No sound, no speaker video, no slide numbers you can set by hand.
