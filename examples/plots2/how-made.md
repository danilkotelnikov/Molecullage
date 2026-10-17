# How the plots2 example was made

- Page: `templates/plots2.html`. `plots/example_plots2.py` writes `plots2_layer.svg` (transparent, text as text) and `plots2_layer.js` (the boxes in millimetres and the printed numbers), using matplotlib 3.11.2.
- Panel a: PDB 1MEL (deposited 1996-06-06), C-alpha B-factors of chain A (antibody) and chain L (lysozyme, first copy), read from `data/pdb/1MEL.pdb`.
- Panel b: PDB 4KRL (deposited 2013-05-16), chain B (nanobody 7D12) against chain A (EGFR domain III). For each nanobody residue, the number of EGFR residues with a heavy atom within 4.5 Å.
- Both entries were checked against data.rcsb.org on 2026-10-16. Colours come from `tokens/tokens.base.json` through `plots/pal.py`.
- Build: `node scripts/build_examples.mjs plots2`.
