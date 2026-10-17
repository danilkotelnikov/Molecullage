"""Render the ChimeraX inset of piece 12 and crop it. Run from the Molecullage repo root (ChimeraX 1.10 must be installed; a window opens briefly):

    py -3 -B gallery/12-mutl-kinetics/src/rebuild_art.py [key=value ...]      # words go to render_pocket.py: view= up= zone= zoom= flipx= rib= rtr= lw= gw=

Calls the lock wrapper struct/run_cx.py with src/render_pocket.py (art folder: gallery/12-mutl-kinetics/art), then struct/trim.py. Needs data/6LZJ.pdb (fetch_data.py)
and tables/6lzj_geometry.json (src/geometry.py).
"""
import os
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
GAL = HERE.parent
ROOT = GAL.parents[1]
env = dict(os.environ, MOLECULLAGE_ART=str(GAL / "art"))
subprocess.run([sys.executable, "-B", str(ROOT / "struct" / "run_cx.py"), str(HERE / "render_pocket.py"), *sys.argv[1:]], cwd=ROOT, env=env, check=True)
subprocess.run([sys.executable, "-I", str(ROOT / "struct" / "trim.py"), "pocket"], cwd=ROOT, env=env, check=True)
print((GAL / "art" / "render_progress.log").read_text(encoding="utf-8").splitlines()[-1])
