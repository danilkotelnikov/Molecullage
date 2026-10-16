# contacts

**Message.** Which nanobody residue touches which lysozyme residue, by which kind of contact, and where that sits in the structure.

**Template.** `templates/contacts.html`. Tile layer: `plots/contact_tiles.py`. Table: `struct/contacts.py`. Close-up: `struct/render.py complex ... contacts=...`.

**Tool that computed the contacts.** PDBe Arpeggio 1.4.4, installed in a venv under the repository (`.venv-tools`, with `openbabel-wheel`). Hydrogens were added by ChimeraX 1.10 (`addh hbond true`) before Arpeggio ran, because Open Babel's default hydrogens gave no inter-chain hydrogen bond for this entry.
The tool is written to `data/contacts.meta.json` and to the figure's claim-boundary line. If Arpeggio is not installed, `contacts.py` falls back to ChimeraX `hbonds` and `contacts`; the types are then only "hbond" and "no specific type".

**Data.** PDB 1MEL (deposited 1996-06-06), chain A (single-domain antibody, 148 residues) against chain L (hen egg-white lysozyme, 129 residues), the first copy of each. Checked against data.rcsb.org on 2026-10-16.
- A residue pair is listed when the smallest heavy-atom distance is at most 4.5 Å (own geometry, `contacts.py`). Result: 55 pairs, 18 antibody residues, 24 lysozyme residues, 69 atom pairs reported by the tool.
- Types are the Arpeggio classes found on any atom pair of the two residues, up to 5.0 Å: hydrogen bond (9 pairs), polar contact (10), weak hydrogen bond (10), carbonyl (2), hydrophobic (13), ring (1). 28 pairs carry no type. Ionic contacts, if any, are counted as polar.
- Seven of the nine hydrogen-bond pairs have a backbone N or O on one side; they carry the star.
- Loop strips use the chosen spans of `struct/style.py` ("1mel_vhh"); they are not an annotation scheme.

**Close-up.** Flat style, antigen left, antibody right, loop 3 facing the antigen. Sticks are the 42 contact residues; the nine hydrogen bonds are dashed lines between the shortest hydrogen-bond atom pair of each residue pair. Leaders end on C-alpha atoms of contact residues in H1, H2 and H3 (anchors of the render).
A second table for PDB 1VFB (Fv of an IgG1 with lysozyme, deposited 1993-12-03; chains A light, B heavy, C lysozyme) is in `data_1vfb/` (39 residue pairs, 9 with a hydrogen bond) and was made with the same command: `py -3 -I struct/contacts.py data/pdb/1VFB.pdb --binder B,A --antigen C --out examples/contacts/data_1vfb`. The page is wired to the 1MEL table only.

**Claim boundary.** "Contacts of a deposited complex, not predicted." plus the tool name.

**QA (normal).** Pass on ink 18.9 %, empty cells 5.4 %, band 1.2 %, blank 1.9 %, type 6.55 pt, picture width 77 mm. Words 182 against 130: a warning (the key and 42 residue labels).

**Ten-second sentence.** Loop 3 holds 41 of the 55 pairs and all nine hydrogen bonds; about half of the pairs have a named interaction type.
