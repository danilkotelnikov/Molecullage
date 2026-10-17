Redesign of Figure 2 and Table 1 of He, Zhao and Xu 2026, Cell Discovery 12:61, DOI 10.1038/s41421-026-00909-1. Licence CC BY 4.0 (read at Europe PMC and in the article). The original is not reproduced here; open it at the DOI.

**The original.** Fig. 2 shows the five engagement modes (a to e) with seven exemplar structures, three of them for Core. The other 29 PDB entries sit as text in Table 1, with no picture of which mode and receptor each belongs to. I did not fetch the figure image (the sheet bars figure downloads), so this rests on the legend and text.

**The redesign.** Panel a puts all 36 entries of Table 1 (27 table rows) in one grid: receptor rows, mode columns, one mark per entry. Colour is the arrestin type, shape the technique, mark size and the printed number the resolution. Panel b, in a frame of its own, renders three entries from PDB coordinates, receptors superposed, one camera, receptor residues within 4.5 Å of arrestin in orange.

**Numbers.** Receptor, arrestin, technique, resolution, PDB id and mode are Table 1, parsed from the Europe PMC XML (`src/table1.py` asserts 27 rows and 36 entries). Every id was read on data.rcsb.org. Counts, marker sizes, contacts and fits are computed here.

**Ten seconds.** Almost every structure is Core; Tail, Loop-engaged, Side-engaged and Membrane-anchored are one receptor each (GCGR, NTSR1, GPR52, ACKR3).

```
py -3 -B gallery/10-arrestin-landscape/fetch_data.py
py -3 -I gallery/10-arrestin-landscape/src/table1.py
py -3 -I gallery/10-arrestin-landscape/src/rcsb_check.py
py -3 -I gallery/10-arrestin-landscape/src/geometry.py
MOLECULLAGE_ART=<abs path>/gallery/10-arrestin-landscape/art py -3 -B struct/run_cx.py gallery/10-arrestin-landscape/src/render_modes.py modes
MOLECULLAGE_ART=gallery/10-arrestin-landscape/art py -3 -I struct/trim.py modes
py -3 -I gallery/10-arrestin-landscape/src/make_data.py
node build/build.mjs gallery/10-arrestin-landscape/page/10-arrestin-landscape.html 178 --out gallery/10-arrestin-landscape --art gallery/10-arrestin-landscape/art
py -3 -I qa/qa_fig.py gallery/10-arrestin-landscape/10-arrestin-landscape
```

---

## Checks and open points (for reviewers)

**Where the sheet and the paper differ.** Fig. 2 has five modes, not four: Core, Tail, Loop-engaged, Side-engaged, Membrane-anchored (the paper's summary sentence lists the same five; the table has a Membrane-anchored row for ACKR3 9E82). The table has 27 rows but 36 PDB ids, because cells hold several values. The Fig. 2 legend names seven exemplars (4ZWJ, 9WSV, 9LXR; 8JRV; 8ZYU; 9IJR; 9E82), not six, so 29 entries are not exemplars, not 20. The figure draws all 36.

**Mode rule and headline.** The mode is the first word of Table 1's "Conformation or other features" entry, so "Core and dimer-2:2", "Core conformation 1-like" and "Core and ligand-free" count as Core. Those extra notes (ligand-free, dimer 2:2 and 2:1, monomer, GPR1 conformations 1 to 4) are not drawn; `tables/table1.csv` keeps them. "Core is 29 of 36" is Table 1's classing: four receptors (PTH1R, mGlu3R, mGlu8R, APJR; 8 of the 29 entries) carry a dagger because the text describes them differently, and the subtitle says so.

**Table and text disagree (the figure draws the table).** PTH1R 9LXR and 9LXP are Core in the table. The text says the two show tail-engaged and core-engaged states, and elsewhere calls the cryo-EM states core-engaged (9LXR is Core in Fig. 2a; ref. 40 is titled for core engagement): the paper is not consistent with itself. The text calls mGluR engagement a shallow, peripheral interface (table: "Core and dimer"), and the APJR 2:1 and 2:2 complexes tail-dominant or shallow-core (table: Core; the dagger sits on the whole APJR row, so it also covers the monomer 9KUV).

**RCSB check** (`tables/rcsb_check.csv`, read 2026-10-17). Resolution: all 36 agree to two decimals (4ZWJ 3.302, 5W0P 3.013). Technique: 35 agree. 5DGY is XFEL in the table; RCSB lists X-ray diffraction at a synchrotron source. It is drawn as a hollow square, which the key explains. No title contradicts the table once "arrestin-2" is read as β-arrestin 1, as the paper does. Some are silent: 6U1N names no receptor, 9MBA names neither partner, 4ZWJ and 9KUV say "arrestin" without a type. The MOR titles say "arrestin-1" (9WSV) and "arrestin2" (9WSX); the table gives βarr1 for both, and the 9WSV file names Beta-arrestin-1. The 9UYM entity is a βarr2–βarr1 chimera (RCSB entity name); the figure follows the table (βarr2). Release dates run from 2015-07-29 (4ZWJ) to 2026-03-04 (9LXP); the table has no dates.

**Panel b.** Only 3 of 5 modes are rendered (9WSV MOR Core, 8JRV GCGR Tail, 8ZYU NTSR1 Loop-engaged); in one fixed view at this size I could not tell Side-engaged and Membrane-anchored from Core, and the lipid boundary of Membrane-anchored is not in the coordinates. Each render is one receptor chain and one arrestin chain of the entry (9WSV R and C, 8JRV R and A, 8ZYU R and B); the Tail render only looks doubled because the helices overlap in a flat view. Orange residues are every receptor residue with a heavy atom within 4.5 Å of an arrestin heavy atom (`tables/contacts.csv`): 32, 21 and 30, modified residues included. An earlier count (26, 16, 26) had dropped phosphoserine and phosphothreonine (SEP, TPO), which are the tail contacts; only those two names were non-standard amino acids in the receptor and arrestin chains (the other hetero groups are water, PIP2 and SBI-553). Orange sits on intracellular loops, helix ends, the helix after TM7 and the C-terminal tail. The receptors of 8JRV and 9WSV end in the C-terminal tail of V2R (RCSB entity names; the paper describes such tail grafts): 12 of the 21 and 12 of the 32 orange residues are V2R residues (UniProt P30518 ranges of the entries, 1343 to 1371 and 352 to 378). The renders do not mark the finger loop, ICL3 or the C-terminus, and the finger loop is hidden behind helices in the Core render.

Receptors are superposed on the MOR chain of 9WSV (BLOSUM62 alignment, Cα fit on helices that start at TM1 or later, pruning to 3 Å: 1.29 Å over 45 pairs for GCGR, 1.26 Å over 131 for NTSR1). Up is the mean transmembrane helix axis, away from the arrestin. The view is turned 330° about it, the turn (every 10°) that keeps most contact residues unhidden (22, 29 and 33 % of the contacts of 9WSV, 8JRV, 8ZYU, crude test in `tables/view_scan.csv`) while the Tail arrestin stays 24 Å to the right of the receptor. Antibody fragments, nanobodies, peptides and ligands are deleted; residues before TM1 are not drawn (GCGR 27 to 127, MOR 63 to 64, NTSR1 57 to 58). The 9WSV receptor is a MOR construct with the V2R tail. Orientation and loop positions are not checked against the paper's Fig. 2 image.

**Reading choices.** Arrestin colours (navy, purple, rose) have a smallest colour-vision distance of 20.3 (CIEDE2000, `palette/check_palette.py`); orange means receptor residues in panel b only. Mark diameter is linear in resolution, 4.0 mm at 2.65 Å (best in the table) to 1.8 mm at 7.70 Å; a square has the area of the circle. All three X-ray entries are Arr1, so colour and shape agree there; the key says so. The three entries drawn in b carry a ring in a. Row order and the five modes are stated on the figure: the four non-Core receptors come first in the order of the Tail, Loop-engaged, Side-engaged and Membrane-anchored columns, then the rest in Table 1 order.

**Build checks** (`checkAlign`, 0.25 mm, measured on the rendered page): mark centres and sizes, rings, text edges and rows per slot and sub-row, printed id and resolution against the data, 1 mm clear between a label and the next mark or the cell edge, row labels, column headers, key markers, frame, render positions and sizes, captions on the image edge, everything inside the frame, no text on text, nothing within 1 mm of the page edge.

**QA** (`qa_fig.py`, normal): ink 13.7 %, empty cells 5.4 %, longest empty band 1.2 %, largest blank 3.1 %, smallest type 6.55 pt, render 30.4 mm, Arial only, one page, 178 mm. Words 478 against 130 (warning): 36 marks carry an id and a resolution each (about 110 words), plus receptor labels, key, definitions and notes; I cut the notes but a 36-entry landscape has no honest 130-word version.
