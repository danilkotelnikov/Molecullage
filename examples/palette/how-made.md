# How the palette example was made

- Page: `templates/palette.html`. It reads the token file of the build and computes contrast and CIEDE2000 itself, so it follows any token file: `node build/build.mjs templates/palette.html 178 my_tokens.json`.
- Source of the colours: the flat fills of Fig. 8 of Int. J. Mol. Sci. 2025, 26, 9262 (doi 10.3390/ijms26199262, open access), with plot colours from Figs 1, 4 and 7. Only hex values are in this repository.
- Sampling: page at 300 dpi, pixel colours grouped at 2 levels, the most frequent exact colour of each group kept (`palette/sample_palette.py`, 18 values in `palette/sampled.json`).
- Dark tones are derived, not sampled: OKLab lightness lowered to 0.46 to 0.52 (`palette/colour.py`). The token file marks each edge as sampled or derived.
- Colour-vision check: Machado, Oliveira and Fernandes 2009, severity 1.0 (`palette/check_palette.py`).
- This is a reference sheet with wide margins, so it fails the empty-space checks at strictness normal. That is expected for a sheet of swatches.
