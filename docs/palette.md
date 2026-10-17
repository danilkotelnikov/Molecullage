# Colour palette

The palette comes from a figure you are allowed to use. You sample its flat fills, give the colours roles so that they stay apart for colour-blind readers, derive dark tones for text, and recolour pages by hex at build time.

## 1. Sample the colours

```
py -3 -I palette/sample_palette.py paper.pdf --page 8 --levels 2 --max 18 --out sampled.json
```

The sampler renders a PDF page at 300 dpi. It groups pixel colours by integer division of each channel by `levels`, so a flat fill with a little noise falls into one group. In each group, the exact colour that occurs most often is the fill. Anti-aliased edges are mixtures of two fills; each mixture is rare and far from both fills, so `--min-share` (default 0.05 % of the non-white pixels) drops them. An average, such as a k-means centre, would mix the edges into the fill and return a colour that is not on the page. White is skipped unless you pass `--keep-white`. On a synthetic image with five planted fills, noise and an anti-aliased seam, the sampler returned the planted colours exactly.

I sampled the shipped set from Fig. 8 of my paper, Int. J. Mol. Sci. 2025, 26, 9262 (doi 10.3390/ijms26199262, open access), with plot colours from Figs 1, 4 and 7 of the same paper. Only the hex values are in this repository (`palette/sampled.json`). Page images of the paper are not: the repository ships the sampled values and the sampler, and nothing else from the typeset page.

## 2. Assign roles

```
py -3 -I palette/check_palette.py tokens/tokens.base.json
py -3 -I palette/check_palette.py tokens/tokens.base.json --roles palette/sampled.json
```

The check measures the CIEDE2000 distance between sRGB colours after simulating normal vision, deuteranopia, protanopia and tritanopia (Machado, Oliveira and Fernandes 2009, severity 1.0). A pair is only as easy to tell apart as its worst case. With `--roles`, the script tries every assignment of the sampled colours to the four free roles (antigen, light chain, patch, complex), with binder and base fixed, and ranks the assignments by their smallest distance. The six core families of the shipped palette reach 11.5. Run the check on any palette you pick by eye as well: two colours that look different to you can look the same to a colour-blind reader.

Keep molecular roles (antigen, binder, light chain, contact patch) apart from diagram roles (stage hues). In a figure with structures, rose, periwinkle, mint and apricot mean binder, light chain, antigen and patch, and nothing else. If a pipeline stage is also mint, the reader takes it for the antigen.

## 3. Derive dark tones

Text and loops need a dark tone of each fill. `palette/colour.py` `darker(hex, L)` lowers the OKLab lightness of the sampled colour to L (0.46 to 0.52 here) and keeps hue and chroma where the sRGB gamut allows. These tones are derived, not sampled, and `tokens/tokens.base.json` says which is which. White text goes only on fills where white reaches 4.5:1 (the purple #9B51E1 does, at 4.51).

## 4. Build the token file

`palette/make_tokens.py` writes `tokens/tokens.base.json` from `palette/sampled.json`. A token file holds `color.family` (fill and edge per family), `color.alias` (role names for families), `color.data` (six colours for lines on white), `css` (text colours per family), `meta` and `provenance`. To build with another file, pass it to the build: `node build/build.mjs page.html 178 my_tokens.json`.

The families are mint (antigen), rose (binder, heavy chain), peri (light chain), apricot (patch), indigo (implemented model, tool blocks), violet (complexes), grey (cream cards), full (white, dashed: designed), green, purple and maroon (stage hues), and palemint, palelilac, palepink and palesky (data labels and shading).

## 5. Recolour by hex

A token file with `"meta": {"remapFrom": "tokens.base.json"}` recolours a page written against the base file. The build finds every family fill and edge hex in the page, in an inlined SVG layer or in the script, and replaces it with the same family of the new file. Pages written with family names (`fam: 'rose'`) need no remap. The PDF printer turns heat maps into pixels, and pixels cannot be remapped, so build colour keys as vector steps.

`templates/palette.html` draws the sheet of any token file: fills, dark tones, contrast and the colour-vision matrix.
