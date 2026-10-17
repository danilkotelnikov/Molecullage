# structure

**Message.** The antibody fragment binds lysozyme through its loops, which face the lysozyme residues drawn with side chains.

**Template.** templates/structures.html of Molecullage, one panel, on a pale panel (palesky token).

**Data.** PDB 1MEL, deposited 1996-06-06, checked against data.rcsb.org on 2026-10-16. Chain A (antibody fragment) and chain L (lysozyme); chains B and M, the second copy, are dropped. Render: `render_structure`, group complex, binder A, antigen L, drop B,M, cdr 1mel_vhh, ChimeraX 1.10.dev202504170618, flat style. Output in `molecullage/art/`. The original Figure 3 was a default ChimeraX screenshot of all four chains.

**Claim boundary.** Deposited structure PDB 1MEL. Flat render, ChimeraX 1.10.

**QA.** qa_figure, strictness normal: ink 80.9 %, cells 0.8 %, band 3.6 %, blank 3.6 %, type 6.55 pt, render width 168 mm, Arial only, width 178.1 mm. All checks pass.

**Reads.** Blind read, round 1 (2026-10-17, fresh agent, PNG only). Found: the darker red loops were not explained; the title said "Nanobody" and the key said "antibody fragment"; stick colour differs from the key swatch. Fixed: the subtitle explains the darker red, the title says "Antibody fragment", the key says "with side chains". Open: a second render with `contacts=` would show the hydrogen bonds; `render_structure` does not pass that key. Round 2 not run yet.

**Ten-second sentence.** Lysozyme on the left, the antibody fragment on the right, touching at a few loops.
