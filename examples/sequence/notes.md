# sequence

**Message.** One chain as letters, with the tracks that say which residues have coordinates, sit in a loop, or touch the partner.

**Template.** `templates/sequence.html`, data in `data.js`, made by `make_data.py`. Build: `node scripts/build_examples.mjs sequence`.

**Data.** PDB 1MEL (deposited 1996-06-06, X-ray, 2.5 Å), chain A, the single-domain antibody; entity 1 has 148 residues. Checked against data.rcsb.org on 2026-10-16.
- Sequence: entity sequence of the RCSB record. Position n is residue number n of chain A; `make_data.py` asserts that every resolved residue has the letter of that position.
- Observed: 127 positions with atoms of occupancy above 0 (2 to 72 and 78 to 133). Occupancy 0: 5 positions (73 to 77). No coordinates: 16 positions (1 and 134 to 148). The key says which gap is which.
- Loops: spans chosen for this example (26 to 32, 52 to 57, 99 to 122 by sequence index). They are not an annotation scheme.
- Contact: 18 residues of chain A with a heavy atom within 4.5 Å of lysozyme chain L, from `examples/contacts/data/contacts.csv`. All lie in the loops, and the script asserts that the three sets are nested.

**Panels.** a, a render of the chain with the loop names on real residues (leaders end on the residue in the middle of each loop). b, the viewer: letters shaded by the deepest set, tracks under each row. c, the nested sets with counts.

**Claim boundary.** "Structure: PDB 1MEL. Loop spans and the contact cut-off are chosen, not annotations."

**QA (normal).** Pass on ink 24.0 %, empty cells 16.7 %, band 3.0 %, blank 4.5 %, type 6.55 pt, picture width 32.5 mm. Words 289 against 130 is a warning: the viewer has one letter per cell, and the letters count as words.

**Ten-second sentence.** A 148-residue chain, mostly observed, with three loops of which half the residues touch lysozyme.
