# References for the zoom-test scene

Checked 2026-11-01 under the grounded source policy (`library/POLICY.md`). The scene is a test of the deep zoom. It is not a data figure.
The entries with their grounding are in `library/references.json`.

## What is grounded (read in full)

**Antibodies form a coat on the gold surface, in random orientation.**
Conrad M, Proll G, Builes-Münden E, Dietzel A, Wagner S, Gauglitz G. Tools to compare antibody gold nanoparticle conjugates for a small molecule immunoassay. Mikrochim Acta 190:62 (2023). doi:10.1007/s00604-023-05637-x. Full text read in PubMed Central (PMC9859872).
- Direct coating of citrate gold leaves the antibodies randomly oriented on the particle surface.
- The authors compute coverage from an antibody footprint of 14.5 × 8.5 nm. They give about 10 antibodies for a full monolayer on a 20 nm particle and room for 40 on a 40 nm particle. These are their calculations, not measurements.
- They state a layer thickness of 10 to 15 nm (an assumed 15 nm monolayer; about 10 nm measured by light scattering for one conjugate).

**The antibody shape.** PDB 1IGT (whole IgG2a, CC0). The atom file was read. Its longest axis is 147.6 Å (14.8 nm), measured from the coordinates.

**Tube checks.** SPL data sheet #60001 (PDF text read in full): diameter 7.26 mm, height 20.80 mm, volume 0.20 mL. It only checks a tube model; the shape comes from a 3D model (not chosen yet).

## What is not grounded and is not used

- Zhang et al., Talanta 204:875 (2019), doi:10.1016/j.talanta.2019.05.104. Only the abstract was read (full text is behind a paywall). Its claim of about 4 IgG per 15 nm gold particle is therefore ungrounded.
- Zhang et al., Biosens Bioelectron 165:112370 (2020), doi:10.1016/j.bios.2020.112370. Only the abstract was read. The open copy on HAL (hal-02928749) has the right cover page and a body from a different paper, so no usable full text was obtained.

## What the scene draws, and its evidence level

- The IgG shape is `published` (PDB 1IGT). The copies on the particle are `architecture`: a drawn arrangement.
- The gold particle (40 nm), the liquid and the tube are drawn by the engine: `architecture`. The tube is still a placeholder shape until a real 3D model is read.
- Four antibodies are drawn in the part of the particle that is in view. Their number and orientation are an illustration. Conrad's calculation gives room for 40 on the whole particle.
- Each antibody lies about 4 nm above the gold in the drawing, so it touches the surface. Conrad reports a layer of 10 to 15 nm, so a taller layer is more faithful. The drawing is an illustration of a coat, not a measurement of its thickness.
