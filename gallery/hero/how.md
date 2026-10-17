Hero banner of the README: the name, one tagline and five tiles, each a crop of a finished gallery figure (ATP synthase 9ZFT, nitrogenase tree, TAP 9N61, RBD scan, Ebola 9PEL). Tiles share one height and 2 mm gaps; the page asserts both to 0.25 mm. The ATP synthase and Ebola tiles come from the figures' render layers (the final PNGs cross them with leaders); the RBD tile ends at a column boundary, its right frame copied from the left. QA (normal): every mark passes.

```
py -3 -I gallery/hero/src/make_crops.py
node build/build.mjs gallery/hero/page/hero.html 178 --out gallery/hero --art gallery/hero/art
py -3 -I qa/qa_fig.py gallery/hero/hero.png
```
