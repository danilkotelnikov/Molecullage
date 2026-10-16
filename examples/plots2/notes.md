# plots2

**Message.** Two data panels can share one page: matplotlib draws the data, the kit draws every label at the same millimetre boxes.

**Template.** `templates/plots2.html`. Layer: `plots/example_plots2.py` writes `plots2_layer.svg` (transparent, text as text) and `plots2_layer.js` (the boxes in mm and the numbers the page prints).

**Data.**
- a, PDB 1MEL (deposited 1996-06-06), C-alpha B-factors of chain A (antibody, 132 residues with a C-alpha; mean 14.4 Å²) and chain L (lysozyme, first copy, 127 residues with a C-alpha; mean 14.8 Å²). Read from the B-factor column of `data/pdb/1MEL.pdb`.
- b, PDB 4KRL (deposited 2013-05-16; chain B nanobody 7D12, 133 residues; chain A the EGFR domain III, 214 residues). For each nanobody residue, the number of EGFR residues with a heavy atom within 4.5 Å of any heavy atom of the residue. 18 nanobody residues touch the antigen; the most is residue 112 with 5. Checked against data.rcsb.org on 2026-10-16.

**Colour.** Chain A in the dark tone of the binder family, chain L in the dark tone of the antigen family (`plots/pal.py` reads them from the token file). The bars use the binder fill.

**Claim boundary.** "Deposited structures PDB 1MEL and 4KRL; values computed from the coordinate files."

**QA (normal).** Pass on ink 55.2 %, empty cells 12.1 %, band 3.3 %, blank 5.9 %, type 6.55 pt, words 96. The plot areas carry a pale tint and the curves a pale fill, which keeps the share of ink of a plot page in the range of a schematic.

**Ten-second sentence.** B-factors wander between 2 and 40 Å² along both chains; contacts concentrate in two stretches of the nanobody.
