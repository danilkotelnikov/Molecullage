# How the contacts example was made

- Page: `templates/contacts.html`. `plots/contact_tiles.py` draws the tile layer with matplotlib 3.11.2 (`contacts_layer.svg` and `.js`) from `data/contacts.csv`.
- Data: PDB 1MEL (deposited 1996-06-06), chain A (single-domain antibody) against chain L (hen egg-white lysozyme), first copy of each. Checked against data.rcsb.org on 2026-10-16.
- Table: `struct/contacts.py` lists residue pairs within 4.5 Å. Contact types come from PDBe Arpeggio 1.4.4, run after ChimeraX 1.10 added hydrogens (`addh hbond true`). The tool and version are in `data/contacts.meta.json`.
- Close-up: ChimeraX 1.10, `struct/render.py complex ... contacts=examples/contacts/data/contacts.csv`.
- Build: `node scripts/build_examples.mjs contacts`.
