Redesign of Figures 1A, 2A, 4A and 5A of Lee J, Manon V, Chen J 2025, Immunity 58(9):2166-2175.e4, DOI 10.1016/j.immuni.2025.08.003. Licence CC BY 4.0 (read at Europe PMC and in the article). The original is not reproduced here; open it at the DOI.

**Hard to read.** The cycle is cut across four figures, each opening with its own small schematic; no panel shows the six states in order or which PDB entry realises each. The images could not be fetched (Europe PMC: HTTP 403), so this rests on legends and text.

**Redesign.** One clockwise loop of ChimeraX renders of 9N61 to 9N66, superposed on the TAP2 transmembrane core, one camera, one scale. Order follows the paper's cycle except box 2 (9N62, grey), which the paper does not place.

**Numbers.** Resolution, ligands and titles: the mmCIF files; a genotype appears only where a title gives it. The 9N62 model has Glu632 and no mutation record; 9N63 and 9N64 record E632Q (the paper's E631Q is an off-by-one slip). The Fig. 5B legend calls 9N65 outward-facing; text and entry say inward-facing, the figure follows the entry. NBD gap: Cα distance, TAP1 Asp674 to TAP2 His661, computed from coordinates: 5.8 and 5.9 Å (9N63, 9N64) to 9.4 Å (9N66), an opening of 3.5 to 3.7 Å, matching the paper's about 3 Å.

**Ten seconds.** "One transporter drawn six times in a loop; its two lower domains move apart, together, slightly open, apart."

**QA.** All marks pass except words (314, budget 130): six labelled boxes, key, credit.

```
py -3 -B gallery/01-tap-cycle/fetch_data.py
py -3 -I gallery/01-tap-cycle/src/geometry.py
py -3 -I gallery/01-tap-cycle/src/make_data.py
MOLECULLAGE_ART=<abs path>/gallery/01-tap-cycle/art py -3 -B struct/run_cx.py gallery/01-tap-cycle/src/render_tap.py tap
MOLECULLAGE_ART=gallery/01-tap-cycle/art py -3 -I struct/trim.py tapif tapof
node build/build.mjs gallery/01-tap-cycle/page/01-tap-cycle.html 178 --out gallery/01-tap-cycle --art gallery/01-tap-cycle/art
```
