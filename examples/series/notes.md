# series

**Message.** A structure can be shown as a path from noise to the real chain, with the value of t written under every frame.

**Template.** `templates/series.html`. Renders: `struct/render.py series name=series pdb=data/pdb/1MEL.pdb binder=A`.

**Data.** PDB 1MEL (deposited 1996-06-06), chain A, C-alpha atoms (132 residues with a C-alpha in the file). Checked against data.rcsb.org on 2026-10-16.

**Noise law, as the code uses it.** x_1 is the centred C-alpha coordinate array. x_0 is drawn from a normal distribution with standard deviation 10 Å per coordinate (seed 7, NumPy `default_rng`). Frame t is the straight interpolation x_t = (1 − t) x_0 + t x_1 for t = 0, 0.25, 0.5, 0.75, 1.
Every frame is drawn in the same orientation (the principal axes of x_1) and with one camera, so the frames line up. Frames t < 1 are spheres only. The last frame adds the real cartoon as a transparent tint.

**Claim boundary.** "Illustration: noise of 10 Å per coordinate, seed 7, on the deposited chain A of PDB 1MEL." Nothing here is a model output.

**QA (normal).** Pass on ink 65.6 %, empty cells 7.5 %, band 3.5 %, blank 1.4 %, type 6.55 pt, picture width 32 mm, words 62. Each frame sits on a pale field, because the noise has no outline of its own.

**Ten-second sentence.** A scatter of dots slowly turns into the shape of a nanobody as t goes from 0 to 1.
