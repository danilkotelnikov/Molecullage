# How the demo deck was made

- Manifest: `deck.json`, five slides in Russian with speaker notes. The audience is `cloud` (indigo and mint).
- Structure: PDB 1MEL (nanobody and lysozyme, deposited 1996), read from `data/pdb/1MEL.pdb`. Chains B and M are dropped. The loop is residues 99 to 122 of chain A.
- Slide 3: a ChimeraX loop, `kind: "chimerax"`, motion `highlight`, 90 frames at 960 x 720. The build renders it through `struct/loop.py` and keeps the result in `media/loop.mp4`, `media/loop.gif` and `media/loop.json`. The build renders again only when the scene or the render scripts change.
- Slide 4: the same complex in the WebGL viewer (3Dmol.js 2.5.5, inside the HTML file), motion `pocket`: the camera flies to the loop and swings round it.
- Slide 5: the figure from `gallery/02-ebola-pocket/` in a browser frame. The picture is a thumbnail of a figure redrawn with Molecullage from an open paper; the boundary line at the foot says so.
- Slide 2: three numbers that count up, each on its own step. In the video the count runs on the virtual clock.

Build and export:

```
node deck/cli.mjs export examples/deck-demo --format all --out examples/deck-demo/dist
node deck/cli.mjs export examples/deck-demo --format gif --slide viewer --width 960 --fps 15 --out examples/deck-demo/dist
```

What is in `dist/`:

| File | What it is |
|---|---|
| `deck-demo.html` | the whole deck in one file; opens from disk, no network |
| `deck-demo.pdf` | five pages, 1920 x 1080 px each; the 3D slides show their still frame |
| `png/` | one PNG per slide, in its finished state |
| `deck-demo.mp4` | 1920 x 1080, 30 fps, every slide with its transition |
| `deck-demo-viewer.gif` | slide 4 only: the viewer's camera path, 960 px wide, 15 fps |
| `deck-demo-notes.txt`, `deck-demo-notes.pdf` | the speaker notes, as text and as A4 pages with a thumbnail |

Sizes and render times on the machine that made them (Windows 11, software OpenGL for the page, ffmpeg x264):

| Step | Time | Size |
|---|---|---|
| ChimeraX loop, 90 frames at 960 x 720, with MP4 and GIF | 17 s | 1.8 MB and 2.7 MB |
| `deck-demo.html` | under 1 s | 3.69 MB |
| `deck-demo.pdf`, 5 pages | a few seconds | 2.22 MB |
| `png/`, 5 files | a few seconds | 1.3 MB |
| `deck-demo.mp4`, 930 frames (622 drawn, 308 equal to the one before) | 92 s | 6.0 MB |
| `deck-demo-notes.pdf` and `.txt` | a few seconds | 0.5 MB |
| `deck-demo-viewer.gif`, 113 frames | 21 s | 3.0 MB |
| everything above in one `--format all` run, with the loop already cached | about 2 minutes | |

Checks: `node qa/qa_deck.mjs examples/deck-demo` passes (5 slides, no warnings). The contact sheet, the PDF pages and frames of the MP4 were looked at by eye.

The things this deck does not show: the pop-out window, a live page in a device frame, `morph`, and any layout other than the four used. `examples/deck-layouts/` shows all eight layouts.
