# Field notes

Practical notes on building structural-biology figures with HTML pages, matplotlib and ChimeraX. Each note says what to do, and what broke when it was not done.

## The order of work

1. Study the field first. Read 20 to 40 published figures of the same kind, and write down rules you can measure: the share of ink, empty bands, type sizes, words per figure. Keep them in a rule file (`docs/grammar.md`) and in a QA script. Limits close to those in `qa/qa_fig.py` are a guide, not a law.
2. Use one object per figure. One real structure appears in the same orientation and colours at every stage. A second object goes in a separate panel.
3. Build two prototypes, then stop and ask. Show the old figure next to the new one with the QA numbers, get a yes, and only then build the rest. This saves a late round of "what you draw is odd".
4. Build each figure as a page. Pages are HTML in millimetre coordinates, with the origin at the bottom left as on a plotting canvas. A small kit draws the parts: cards, data labels, coloured stage bars, arrows, labels, and maths in Arial. Headless Chromium prints a vector PDF with live Arial text and a 600 dpi PNG. Plots come from matplotlib as SVG layers placed at the same millimetre boxes. Structures come from ChimeraX as transparent PNG renders, placed by anchors.
5. Run three independent checks, in this order.
   - An overclaim read of the page text and the notes, against the manuscript and the code.
   - A blind read: a reader who sees only the PNG, with no notes, says what it shows. The reader answers three questions: what does it show, what could you not interpret, what looks wrong. Typical finds: a legend that does not match the tiles, a half-filled disc that suggests the wrong number, a point at an outlier value, a list written as a range, a pointer that ends on the wrong loop.
   - The QA script.

   Fix, rebuild and read again. Authors do not certify their own figures. Prefer a reader who is not the author: a person, or a different model. If none is available, use a fresh reader with an adversarial brief, and write in the notes that the reader is the same kind of model as the author.
6. When you hand a figure to an agent, give it one figure and a written brief: the palette, the drawing rules, the figure's spec, the files it may write and the files it must not touch, the old figure and its notes, and a ten-second sentence to write at the end. After the blind read, resume the same agent with a precise list of fixes; it keeps its context. Ask agents to write their reports as they go.

## Palette: sample it

- Take your own paper or the lab's reference figure, and render the page at 300 dpi. For flat fills, take the most frequent exact pixel colour of each group (grouped at 2 levels), not a k-means average: anti-aliased edges pull the averages away from the real fills. Keep colours in pairs: a strong tool colour with white bold text, a pale fill for data labels, a dark tone for text.
- Assign roles by trying every assignment of the sampled colours, and keep the one with the largest worst-case CIEDE2000 distance after simulating deuteranopia, protanopia and tritanopia (Machado 2009, severity 1). Compare the result with any palette picked by eye.
- Keep molecular roles (antigen, binder, light chain, contact patch) apart from diagram roles (stage hues). Never let two things differ only by red against green; add a label, a position or a shape. Derive dark text tones by lowering the OKLab lightness of the sampled colour, and say that they are derived. Put white text only where its contrast is at least 4.5; green needs dark text.
- Recolour by hex at build time. Pages written once against a base palette are then recoloured by a token file without edits.

## Type and layout

- Type sizes: panel letters 9 pt bold, titles and block names 7.5 pt bold, labels 7 pt, a 6.5 pt floor for ticks and scripts, maths 8.4 pt. Arial only, including maths. Write a small converter for a subset of LaTeX. Avoid the tilde operator, which falls back to Cambria Math. Set scripts at 0.78 em.
- Words: a figure with too many words is slow to read, and one with too few cannot be read alone. Put plain words where the reader needs them: a short title per panel (at most 6 words), a name on every block, one plain sub-line on blocks whose job is not obvious, arrows labelled with what passes along them, a "Look for:" line on maths plates, and a colour key. Spell out abbreviations. Write sets of links as lists ("A1, A3"), never as ranges.
- Grid: 1.5 mm margin, shared column edges, no empty band over 4 % of the height. White space is allowed where it is the message (a mask is a gap).
- A set of blocks that reads well in a pipeline coded by stage: stage strips (a coloured bar at the top of each column), saturated tool blocks with white bold names, pills (rounded labels for data) with real or placeholder sizes, numbered step badges, an enlarged panel for one block joined by two dashed zoom lines, and a key for the pill colours. In three columns, read the columns as a snake (down, up, down), so that each hand-over is a short horizontal arrow.

## Structures with ChimeraX

- ChimeraX needs a real window on Windows: `--offscreen` has no OpenGL there. Use `windowsize`, `camera ortho`, `lighting flat`, no specular, silhouettes, a transparent 2400 x 1800 PNG, one camera per group and one shared crop, so that the layers stack.
- Flat lighting multiplies every colour by about 1.158. Divide the palette by that factor before you send it, and the pixels then equal the palette (`struct/style.py`, `comp`).
- Assigning coordinates in place does not redraw: write PDB frames and reopen them. Lighting resets when a model is opened: set it before every save. A script error leaves ChimeraX hanging: wrap the script in try/except and always `exit`. Run through a lock wrapper (one ChimeraX at a time, 10 minute limit).
- Turn off label output in the render script (`label delete`, `2dlabels delete`, `label height` off). A residue or atom label that ChimeraX adds by itself is baked into the PNG and cannot be removed later.
- For each render, write anchors (loop midpoints, patch centres, contact residues), so that the page can place leaders on real residues. Check that each leader lands on the loop it names.
- Noise-to-structure series: C-alpha spheres on the straight path x_t = (1 − t) x_0 + t x_1; the last frame adds a transparent tinted cartoon. State the noise law the code uses.
- Typed contacts: PDBe Arpeggio gives typed contacts; generic contact lists do not. Arpeggio needs hydrogens, and with Open Babel's default hydrogens it may find none of the inter-chain hydrogen bonds. Add hydrogens in ChimeraX first (`addh hbond true`). Mark backbone atoms with a star, show overlaps as split tiles, and say what "no specific type" means.
- Check every PDB id, chain and date against the RCSB record before a figure draws it.

## Things that break, and the fix

- Heredocs, and Python inside heredocs, mangle backslashes. Write HTML, JS and Python with a file tool.
- `String.replace` with a replacement string expands `$'` inside inlined source. Use a replacer function.
- Git Bash rewrites a chain list such as `/B,M` on the command line as a Windows path. Write `B,M` and add the slash in code.
- ChimeraX reads a backslash in a path inside a `--script` argument as an escape. Send forward slashes.
- A top-level `const top` in a page script collides with `window.top`. Pick other names.
- SVG routes are hidden under HTML cards. Put the SVG layer on top (`svgTop`).
- Heat maps that the PDF printer turns into pixels cannot be recoloured. Build colour keys as 40 vector steps.
- A CSS size of 6.5 pt prints as 6.495 pt in the PDF. Write 6.55 for the floor, or allow a tolerance in QA.
- A footnote or label placed in a spot that looks free lands on a time label or a column. Read the PNG at full size after every build, and run the blind read.

## Content rules

- Every picture shows a real object (a render, a sequence, a computed table) or a clearly named example. A maths plate gets a plain title, a real or labelled example, and a "Look for" line. Define a symbol on the figure the first time it appears.
- Draw status by fill: implemented is a solid hue, designed is white and dashed.
- Real public data can illustrate a concept. Check every id and date. Say what is computed, and with which tool and version.
- Write placeholder sizes as symbols ("d numbers"), and say in the footnote that they are placeholders.
