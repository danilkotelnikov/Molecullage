# pipeline

**Message.** A block pipeline reads in ten seconds when strong colour computes, pale colour flows and every arrow says what flows.

**Template.** `templates/pipeline.html`. Build: `node build/build.mjs templates/pipeline.html 178 --out examples/pipeline`.

**Panels.**
- a, three columns, one per stage. Design (sequence design, structure prediction), Screen (docking, filters), Evaluate (scores). Each column has a stage strip on top, two tool blocks and the data pills between them. The columns read as a snake, down, up, down, so that each hand-over is a short horizontal arrow. Numbered badges give the reading order, 1 to 6.
- b, one step of the Screen column, enlarged and joined to its block by two dashed zoom lines: docking, with three inputs (candidate model, binding site, settings), a block that samples n poses, a block that scores them, and two outputs (docked poses, pose scores).

**Data.** None. The tools are named by type and no product is named. The sizes are placeholders: d numbers per item, n poses. One picture gives the diagram an object: `vhh__main` is the deposited structure PDB 1MEL chain A (deposited 1996-06-06), the candidate in panel b.

**Colour use.** Indigo stage strips and tool blocks with white bold names. Pale pills for data: pink for structures and poses, mint for sequences, lilac for scores, cream for everything else. Cream numbered badges.

**Claim boundary.** "Sizes are placeholders: d numbers per item, n poses. Structure: PDB 1MEL." It names no model and no result.

**QA (normal).** Pass on ink 30.6 %, empty cells 15.0 %, longest empty band 2.3 %, largest empty rectangle 5.1 %, smallest type 6.55 pt, picture width 20.6 mm, words 128 against a budget of 130.

**Ten-second sentence.** Three stages pass data from design to screening to scores; the enlarged panel shows what happens inside the docking step.
