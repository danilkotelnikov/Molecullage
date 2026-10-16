# Lessons

Practical notes on building structure-biology figures with HTML pages, matplotlib and ChimeraX. Each item says what to do, what breaks and how to fix it.

## The working order

1. **Study first.** Read 20 to 40 published figures of the same kind. Write rules you can measure: share of ink, empty bands, type sizes, words per figure. Keep them in a rule file (`docs/grammar.md`) and in a QA script. Limits close to those in `qa/qa_fig.py` are a guide, not a law.
2. **One object per figure.** One real structure appears in the same orientation and colours at every stage. A second object goes in a separate panel.
3. **Two prototypes, then a gate.** Build two figures, show the old one against the new one with the QA numbers, get a yes, then build the rest. This saves a late round of "what you draw is odd".
4. **Build by page.** HTML pages in millimetre coordinates (origin bottom-left, like a plotting canvas), a small kit (cards, pills, stage strips, routes, labels, maths in Arial), headless Chromium for a vector PDF with live Arial text and a 600 dpi PNG. Plots come from matplotlib as SVG layers placed at the same millimetre boxes. Structures come from ChimeraX renders as transparent PNGs placed by anchors.
5. **Independent checks.** Run three, in this order.
   - An overclaim read of the page text and the notes against the manuscript and the code.
   - A blind read. A reader opens only the PNG, with no notes, and answers three questions: what does it show, what could you not interpret, what looks wrong. Typical finds are a legend that does not match the tiles, a half-filled disc that suggests the wrong number, a point at an outlier value, a list written as a range, a pointer that ends on the wrong loop.
   - The QA script.

   Fix, rebuild, read again. Authors do not certify their own figures. Prefer a reader that is not the author: a person, or a different model. If none is available, use a fresh reader with an adversarial brief and write in the notes that the reader is the same kind of model as the author.
6. **Delegation.** Give each figure to one agent with a written brief: the palette, the grammar, the figure's spec, the files it may write and the files it may not touch, the old figure and its notes, and a ten-second sentence to write at the end. Resume the same agent with a precise fix list after the blind read; it keeps its context. Ask agents to write reports as they go.

## Palette: sample it

- Take your own paper or the lab's reference figure. Render the page at 300 dpi. For flat fills use the **mode of exact pixel colours** (grouped at 2 levels), not a k-means mean: antialiased edges blur the centres. Keep pairs: a strong tool colour with white bold text, a pale data pill, a dark tone for text.
- Assign roles by brute force over the sampled colours, maximising the worst CIEDE2000 distance after simulating deuteranopia, protanopia and tritanopia (Machado 2009, severity 1). Compare the result with any palette picked by eye.
- Keep molecular roles (antigen, binder, light chain, contact patch) apart from diagram roles (stage hues). Never let two things differ only by red against green; add a label, a position or a shape. Derive dark text tones by lowering the OKLab lightness of the sampled colour and say they are derived. White text only where contrast is at least 4.5; green needs dark text.
- Remap by hex at build time: pages written once against a base palette are recoloured by a token file without edits.

## Type and layout

- Ladder: panel letters 9 pt bold, titles and block names 7.5 pt bold, labels 7 pt, 6.5 pt floor for ticks and scripts, maths 8.4 pt. Arial only, including maths. Write a small converter for a LaTeX subset. Avoid the tilde operator, which falls back to Cambria Math. Set scripts at 0.78 em.
- Words: a figure with too many words is slow to read, and one with too few cannot be read alone. Put plain words where the reader needs them: a short title per panel (at most 6 words), a name on every block, one plain sub-line on blocks whose job is not obvious, arrows labelled with what flows, a "Look for:" line on maths plates, a colour key. Spell out abbreviations. Write link sets as lists ("A1, A3"), never as ranges.
- Grid: 1.5 mm margin, shared column edges, no empty band over 4 % of the height. White space is allowed where it is the message (a mask is a gap).
- Block grammar that reads well in a stage-coded pipeline: stage strips, saturated tool blocks with white bold names, pale rounded pills for data with real or placeholder sizes, numbered step badges, an enlarged "one block" panel joined by two dashed zoom lines, a key for the pill colours. In three columns, read the columns as a snake (down, up, down) so that each hand-over is a short horizontal arrow.

## Structures with ChimeraX

- ChimeraX needs a real window on Windows; `--offscreen` has no OpenGL there. Use `windowsize`, `camera ortho`, `lighting flat`, no specular, silhouettes, a transparent 2400 x 1800 PNG, one camera per group and one shared crop so layers stack.
- Flat lighting multiplies every colour by about 1.158. Divide the palette by that factor before you send it, and the pixels equal the palette (`struct/style.py`, `comp`).
- Assigning coordinates in place does not redraw: write PDB frames and reopen. Lighting resets when a model is opened: set it before every save. A script error leaves ChimeraX hanging: wrap the script in try/except and always `exit`. Run through a lock wrapper (one ChimeraX at a time, 10 minute limit).
- Hide label output in the render script (`label delete`, `2dlabels delete`, `label height` off). A residue or atom label that ChimeraX adds by itself is baked into the PNG and cannot be removed later.
- Per render, write anchors (loop midpoints, patch centres, contact residues) so the page can place leaders on real residues. Check that each leader lands on the intended loop.
- Noise-to-structure series: C-alpha spheres on the straight path x_t = (1 − t) x_0 + t x_1; the last frame adds a transparent tinted cartoon. State the noise law the code uses.
- Typed contacts: PDBe Arpeggio gives typed contacts; generic contact lists do not. It needs hydrogens, and Open Babel's default hydrogens may find none of the inter-chain hydrogen bonds. Add hydrogens in ChimeraX (`addh hbond true`) first. Show backbone atoms with a star, overlaps as split tiles, and say what "no specific type" means.
- Verify every PDB id, chain and date against the RCSB record before a figure draws it.

## Things that break, and the fix

- Heredocs and Python in heredocs mangle backslashes: write HTML, JS and Python with a file tool.
- `String.replace` with a replacement string expands `$'` inside inlined source: use a replacer function.
- A chain list such as `/B,M` on a Git Bash command line is rewritten as a Windows path: write `B,M` and add the slash in code.
- A backslash in a path inside a ChimeraX `--script` argument is read as an escape: send forward slashes.
- A top-level `const top` in a page script collides with `window.top`: pick other names.
- SVG routes are hidden under HTML cards: put the SVG layer on top (`svgTop`).
- Heat maps rasterised by the PDF printer cannot be remapped: build colour keys as 40 vector steps.
- A CSS size of 6.5 pt prints as 6.495 pt in the PDF: write 6.55 for the floor, or allow a tolerance in QA.
- Text that sits on text: a footnote or a label placed in a free-looking spot lands on a time label or a column. Read the PNG at full size after every build and run the blind read.

## Content rules

- Every picture shows a real object (a render, a sequence, a computed table) or a clearly named example. A maths plate gets a plain title, a real or labelled example and a "Look for" line. Define a symbol on the figure the first time it appears.
- Status is drawn by fill: implemented is a solid hue, designed is white and dashed.
- Real public data can illustrate a concept. Check every id and date. Say what is computed and with which tool and version.
- Placeholder sizes are written as symbols ("d numbers") and the footnote says they are placeholders.
