# How the sequence example was made

- Page: `templates/sequence.html`. `make_data.py` writes `data.js` from `data/pdb/1MEL.record.json` and `data/pdb/1MEL.pdb`.
- Data: PDB 1MEL (X-ray, 2.5 Å, deposited 1996-06-06), chain A, the single-domain antibody, 148 residues. Checked against data.rcsb.org on 2026-10-16.
- Contact track: the 18 chain A residues with a heavy atom within 4.5 Å of lysozyme chain L, read from `examples/contacts/data/contacts.csv`.
- Loop spans (26 to 32, 52 to 57, 99 to 122) are chosen for this example by sequence index. They are not an annotation scheme.
- Close-up render: ChimeraX 1.10 (`art/mel__*`). Build: `node scripts/build_examples.mjs sequence`.
