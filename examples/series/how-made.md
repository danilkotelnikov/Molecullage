# How the series example was made

- Page: `templates/series.html`. The five frames are renders `series__t0` to `series__t4` in `art/`.
- Data: PDB 1MEL (deposited 1996-06-06), chain A, C-alpha atoms (132 residues with a C-alpha in the file). Checked against data.rcsb.org on 2026-10-16.
- Noise: normal distribution, standard deviation 10 Å per coordinate, seed 7 (NumPy `default_rng`). Frame t is the straight path (1 − t) x_0 + t x_1 for t = 0, 0.25, 0.5, 0.75, 1.
- Render: `struct/render.py series name=series pdb=data/pdb/1MEL.pdb binder=A`, ChimeraX 1.10. Nothing here is a model output.
