"""Rebuild gallery piece 02-ebola-pocket from the public inputs, step by step. Run from anywhere:

    py -3 -I gallery/02-ebola-pocket/rebuild.py [--skip-render]

Steps (each one is also a script you can run alone, see its docstring):
  1 fetch_data.py            PDB 9PEL, 5JQ7, 9BSV and the paper's Source Data file into data/ (sizes and SHA-256 checked)
  2 src/ligand_graph.py      atoms, bonds, stereo labels and 3D coordinates of the inhibitor from the entry itself
    (src/ligand2d.py          flat 2D coordinates and wedge bonds; needs RDKit, so its result src/ligand2d.json is committed and the step is skipped here)
  3 src/pocket_contacts.py   contacts, hydrogen bond, cation-pi (src/contacts.json, src/contacts.csv)
  4 src/choose_view.py       viewing direction (src/view.json); src/compare_checks.py: 5JQ7 count, DFF lid, chain pairing
  5 src/render_pocket.py     ChimeraX render, close-up and overview (needs ChimeraX 1.10 and a window; --skip-render reuses art/)
  6 struct/trim.py           crop the renders and write their anchors
  7 src/layout.py            tile and leader positions (page/data.js)
  8 node build/build.mjs     PDF and PNG, with the alignment and leader checks of the page
  9 qa/qa_fig.py             QA marks
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
PY = [sys.executable]


def run(cmd, **kw):
    print("\n$", " ".join(str(c) for c in cmd), flush=True)
    r = subprocess.run([str(c) for c in cmd], cwd=REPO, **kw)
    if r.returncode:
        sys.exit(f"step failed with exit code {r.returncode}")


def main() -> None:
    skip_render = "--skip-render" in sys.argv
    env = dict(os.environ, MOLECULLAGE_ART=str(HERE / "art"))
    run(PY + ["-I", HERE / "fetch_data.py"])
    run(PY + ["-I", HERE / "src" / "ligand_graph.py"])
    run(PY + ["-I", HERE / "src" / "pocket_contacts.py"])
    run(PY + ["-I", HERE / "src" / "choose_view.py"])
    run(PY + ["-I", HERE / "src" / "compare_checks.py"])
    if not skip_render:
        run(PY + ["-B", REPO / "struct" / "run_cx.py", HERE / "src" / "render_pocket.py"], env=env)
    run(PY + ["-I", REPO / "struct" / "trim.py", "pocket", "overview"], env=env) if not skip_render else None
    run(PY + ["-I", HERE / "src" / "layout.py"])
    run(["node", REPO / "build" / "build.mjs", HERE / "page" / "02-ebola-pocket.html", "178", "--out", HERE, "--art", HERE / "art"])
    run(PY + ["-I", REPO / "qa" / "qa_fig.py", HERE / "02-ebola-pocket"])


if __name__ == "__main__":
    main()
