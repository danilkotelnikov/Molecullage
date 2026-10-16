# palette

**Message.** Every family of the shipped palette, its dark tone, its contrast and its worst-case colour-vision distance, on one sheet.

**Template.** `templates/palette.html`. It reads `window.TOKENS`, the token file of the build, and computes contrast and CIEDE2000 itself (same method as `palette/colour.py`), so the sheet follows any token file: `node build/build.mjs templates/palette.html 178 my_tokens.json`.

**Provenance.** The fills are sampled from the flat colours of Fig. 8 of Int. J. Mol. Sci. 2025, 26, 9262 (doi 10.3390/ijms26199262, open access), with plot colours from Figs 1, 4 and 7 of the same paper. Only hex values are in this repository. The method: render the page at 300 dpi, group pixel colours at 2 levels, keep the most frequent exact colour of each group (`palette/sample_palette.py`).
Dark tones for text and loops are derived, not sampled: the sampled colour with its OKLab lightness lowered to 0.46 to 0.52 (`palette/colour.py`, `darker`). `tokens/tokens.base.json` marks each edge as sampled or derived. `palette/sampled.json` lists the 18 sampled values.

**Numbers.** The six core families (mint, rose, peri, apricot, indigo, violet) have a smallest worst-case CIEDE2000 of 11.5 over normal vision, deuteranopia, protanopia and tritanopia (Machado, Oliveira and Fernandes 2009, severity 1.0). The pair is apricot against violet under tritanopia. White text goes on peri, indigo, purple and maroon only.

**Claim boundary.** The line at the foot names the source and the figures used.

**QA (normal).** Fails on empty cells, band and blank rectangle, and words 274 is a warning, because it is a reference sheet with large margins around its tables. The README does not use it as the demo.

**Ten-second sentence.** Fifteen families of colour with their dark tones, and six of them are kept apart for every kind of colour vision.
