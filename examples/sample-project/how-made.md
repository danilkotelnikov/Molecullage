# How the sample project was made

The originals (`figures/`, copied to `before/`):

- `figures/bfactors.png` and `figures/pipeline.png`: `py -3 -B scripts/make_before.py`, plain matplotlib defaults.
- `figures/structure.png`: `ChimeraX --nostatus --script scripts/default_render.cxc`, the default look of ChimeraX 1.10 on PDB 1MEL.

The redesign was run on this folder with the Molecullage MCP tools. Each tool wrote the files named in brackets, under `molecullage/`:

1. Intake: the four answers in `project.json`.
2. `inventory_figures` (`inventory.json`, `INVENTORY.md`). The control file ignores `before/` and `after/` so that the copies are not counted twice.
3. `audit_figure` on each figure, then a blind read by a fresh agent that saw only the old PNGs (`audit.json`, `AUDIT.md`).
4. `plan_redesign` (`plan.json`, `PLAN.md`).
5. `make_brief` for each figure (`figures/<id>/BRIEF.md`).
6. `render_structure` for 1MEL (`art/`), `new_figure` for each page, the pages and `make_bfactors.py` written by hand in `figures/<id>/`, `build_figure`, `qa_figure` at strictness normal.
7. A blind read of the three new PNGs, one round of fixes, a rebuild.
8. `contact_sheet`: `gate.png` for the two prototypes, `contact-sheet.png` for all three.
9. The built PDF and PNG copied to `after/`. `decisions.md` records that nothing is accepted yet.

To rebuild one figure: `node build/build.mjs examples/sample-project/molecullage/figures/pipeline/pipeline.html 178 --out <folder> --art examples/sample-project/molecullage/art`. The B-factor layer is made by `py -3 -B molecullage/figures/bfactors/make_bfactors.py` from the sample folder.

Data: PDB 1MEL, deposited 1996-06-06, checked against data.rcsb.org on 2026-10-16. Tools: ChimeraX 1.10.dev202504170618, matplotlib 3.10.8, Pillow 12.3.0, numpy 2.4.6.
