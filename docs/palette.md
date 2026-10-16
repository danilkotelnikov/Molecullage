# Palette

Sample the palette from a figure you are allowed to use, assign roles by colour-vision distance, derive dark tones, and remap by hex at build time.

## 1. Sample

```
py -3 -I palette/sample_palette.py paper.pdf --page 8 --levels 2 --max 18 --out sampled.json
```

A PDF page is rendered at 300 dpi. Pixel colours are grouped by integer division of each channel by `levels`, so a flat fill with a little noise lands in one group. The exact colour that occurs most often in a group is the fill. Anti-aliased edges are mixtures of two fills, each rare and far from both, so `--min-share` (default 0.05 % of the non-white pixels) drops them. White is skipped unless you pass `--keep-white`.
Test: `tests/test_palette.py` plants five fills in a synthetic image, adds noise and an anti-aliased seam, and checks that the sampler returns the planted colours exactly.

Only hex values ship in this repository (`palette/sampled.json`). Page images of the source paper do not. The shipped set was sampled from Fig. 8 of Int. J. Mol. Sci. 2025, 26, 9262 (doi 10.3390/ijms26199262, open access), with plot colours from Figs 1, 4 and 7 of the same paper. The journal may hold the copyright of the typeset figure, so this repository ships the sampled hex values and the sampler, and nothing else from the page.

## 2. Assign roles

```
py -3 -I palette/check_palette.py tokens/tokens.base.json
py -3 -I palette/check_palette.py tokens/tokens.base.json --roles palette/sampled.json
```

The distance is CIEDE2000 between sRGB colours after simulating normal vision, deuteranopia, protanopia and tritanopia (Machado, Oliveira and Fernandes 2009, severity 1.0). A pair is as distinguishable as its worst case. `--roles` searches every assignment of the sampled colours to the four free roles (antigen, light chain, patch, complex), with binder and base fixed, and ranks them by the smallest distance. The shipped six core families reach 11.5. Run the check on any palette you choose by eye.

Keep molecular roles (antigen, binder, light chain, contact patch) apart from diagram roles (stage hues). In a figure with structures, rose, periwinkle, mint and apricot mean binder, light chain, antigen and patch and nothing else.

## 3. Derive dark tones

Text and loops need a dark tone. `palette/colour.py` `darker(hex, L)` lowers the OKLab lightness of the sampled colour to L (0.46 to 0.52 here), keeping hue and chroma where the sRGB gamut allows. These values are derived, not sampled; `tokens/tokens.base.json` says which. White text goes only where white on the fill reaches 4.4:1.

## 4. Build the token file

`palette/make_tokens.py` writes `tokens/tokens.base.json` from `palette/sampled.json`. A token file holds `color.family` (fill and edge per family), `color.alias` (role names for families), `color.data` (six colours for lines on white), `css` (text colours per family), `meta` and `provenance`. Pass another file to the build: `node build/build.mjs page.html 178 my_tokens.json`.

Families: mint (antigen), rose (binder, heavy chain), peri (light chain), apricot (patch), indigo (implemented model, tool blocks), violet (complexes), grey (cream cards), full (white, dashed: designed), green, purple, maroon (stage hues), palemint, palelilac, palepink, palesky (data pills and shading).

## 5. Remap by hex

A token file with `"meta": {"remapFrom": "tokens.base.json"}` recolours a page written against the base file: every family fill and edge hex found in the page, in an inlined SVG layer or in the script, is replaced by the same family of the new file. Pages written with family names (`fam: 'rose'`) need no remap. Heat maps rasterised by the PDF printer cannot be remapped; build colour keys as vector steps.

`templates/palette.html` draws the sheet of any token file: fills, dark tones, contrast and the colour-vision matrix.
