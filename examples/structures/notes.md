# structures

**Message.** Different objects go in different panels, in one style and one colour code.

**Template.** `templates/structures.html`. Renders: `scripts/render_examples.py` (ChimeraX 1.10, flat lighting, silhouettes, 2400 x 1800 transparent PNG, shared crop per render).

**Data.** All entries are public PDB entries, checked against data.rcsb.org on 2026-10-16.

| Panel | Entry | Deposited | Chains | Drawn as |
|---|---|---|---|---|
| a | 1MEL | 1996-06-06 | A (single-domain antibody, 148 residues), L (lysozyme, 129) | first copy; antibody rose with loops in the dark tone; epitope sticks apricot (antigen residues within 4.5 Å of the antibody) |
| b | 7Z0X | 2022-02-23 | H (Fab heavy, 237), L (Fab light, 216), R (spike S1 domain, 205) | heavy rose, light periwinkle, antigen mint; no loops marked |
| c | 1IGT | 1996-10-25 | A and C (214 residues, light chains), B and D (444, heavy chains) | A periwinkle, B rose, C and D in the pale tones |

The record for 7Z0X says Fab: heavy and light chain bound to the S1 domain. It is drawn and labelled as a Fab.
Panel c uses two tones for each of two roles, so the render has four hues (rose, periwinkle and their pale tones). A fifth hue would break the rule of at most four hues per render.

**Claim boundary.** "Deposited structures from the PDB. Colours follow the role, not the entry."

**QA (normal).** Pass on ink 17.8 %, empty cells 20.8 %, band 4.0 % (the limit), blank 4.1 %, type 6.55 pt, smallest picture 54 mm, words 57. The renders hide the dashed missing-structure lines of ChimeraX and their labels.

**Ten-second sentence.** Three antibody structures, each in its own frame: a nanobody with lysozyme, a Fab with a spike domain, and a whole IgG.
