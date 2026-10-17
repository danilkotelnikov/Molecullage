"""Rebuild gallery piece 06-gpcr-snake-plot from the inputs, step by step, from anywhere in the repository.

    py -3 -B gallery/06-gpcr-snake-plot/src/rebuild.py [--skip-render] [--skip-online]

Steps, in order (each stops the run when it fails):
  1  fetch_data.py       download 7F61.cif, check size and SHA-256
  2  check_numbering.py  the numbering of the paper is the numbering of 7F61
  3  check_tables.py     src/ec50_tables.py against the article text at Europe PMC (needs the network; --skip-online leaves it out)
  4  choose_view.py      turn, tilt and place of the 3D picture -> src/view.json
  5  render_h3r.py       ChimeraX render (a real window opens; one ChimeraX at a time; --skip-render keeps the render in art/)
  6  struct/trim.py      crop the render and write the index
  7  make_plots.py       dot plot layer and data
  8  layout.py           snake plot layer, leaders, tables
  9  build.mjs           page -> PDF and PNG; stops on a failed alignment check
 10  qa_fig.py           the QA marks (normal strictness)
"""
import os
import subprocess
import sys
from pathlib import Path

GAL = Path(__file__).resolve().parents[1]
ROOT = GAL.parents[1]
SRC = GAL / "src"
PY = [sys.executable]


def run(label, cmd, env=None):
    print(f"--- {label}", flush=True)
    r = subprocess.run(cmd, cwd=ROOT, env={**os.environ, **(env or {})})
    if r.returncode:
        sys.exit(f"step failed: {label}")


def main(argv):
    art = {"MOLECULLAGE_ART": str(GAL / "art")}
    run("1 fetch_data", PY + ["-I", str(GAL / "fetch_data.py")])
    run("2 check_numbering", PY + ["-I", str(SRC / "check_numbering.py")])
    if "--skip-online" not in argv:
        run("3 check_tables", PY + ["-I", str(SRC / "check_tables.py")])
    run("4 choose_view", PY + ["-I", str(SRC / "choose_view.py")])
    if "--skip-render" not in argv:
        run("5 render_h3r", PY + ["-B", str(ROOT / "struct" / "run_cx.py"), str(SRC / "render_h3r.py")], art)
        run("6 trim", PY + ["-B", str(ROOT / "struct" / "trim.py"), "h3r"], art)
    run("7 make_plots", PY + ["-B", str(SRC / "make_plots.py")])
    run("8 layout", PY + ["-I", str(SRC / "layout.py")])
    run("9 build", ["node", "build/build.mjs", str(GAL / "page" / "06-gpcr-snake-plot.html"), "178", "--out", str(GAL), "--art", str(GAL / "art")])
    run("10 qa", PY + ["-I", "qa/qa_fig.py", str(GAL / "06-gpcr-snake-plot")])


if __name__ == "__main__":
    main(sys.argv[1:])
