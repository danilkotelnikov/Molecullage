# ChimeraX script: the three rendered entries in one superposition and one camera, flat journal style.
# Run through the lock wrapper from the repo root (see how.md for the whole sequence):
#   MOLECULLAGE_ART=<abs path>/gallery/10-arrestin-landscape/art py -3 -B struct/run_cx.py gallery/10-arrestin-landscape/src/render_modes.py modes
# Needs tables/geometry.json (src/geometry.py): one 3 x 4 matrix per entry that carries it into the common view frame (receptors superposed on the
# 9WSV receptor, transmembrane axis vertical, extracellular side up), the contact residues of the receptor and the residues before TM1 (not drawn).
# Output: <art>/modes__<ID>.png (transparent, 2400 x 1800, the same camera for all three) and <art>/modes.anchors.json (pixels per angstrom).
# struct/trim.py crops the three images to one box, so the receptor sits at the same place in all of them.
import json
import os
import sys

import numpy as np

MYDIR = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(MYDIR, "..", "..", ".."))
sys.path.insert(0, os.path.join(REPO, "struct"))
from cx_common import *  # noqa: E402,F401,F403
import cx_common as CX  # noqa: E402
from chimerax.geometry import Place  # noqa: E402

GEOM = json.load(open(os.path.join(MYDIR, "..", "tables", "geometry.json"), encoding="utf-8"))
DATA = os.path.abspath(os.path.join(MYDIR, "..", "data")).replace("\\", "/")
IDS = list(GEOM["entries"])
FAM = ST.tokens()["color"]["family"]
CREAM = ST.comp(FAM["grey"]["fill"])        # receptor
SIL_PX = float(os.environ.get("MODES_SIL_PX", "7"))   # silhouette width in px of the 2400 px canvas: the renders are printed at about 36 mm
ONLY = os.environ.get("MODES_ONLY", "")


def ranges(nums):
    out, s, p = [], None, None
    for n in sorted(nums):
        if s is None:
            s = p = n
        elif n - p <= 1:
            p = n
        else:
            out.append((s, p))
            s = p = n
    if s is not None:
        out.append((s, p))
    return ",".join(f"{a}-{b}" if a != b else f"{a}" for a, b in out)


def save_plain(session, name):
    set_light(session)
    cmd(session, f"graphics silhouettes true width {SIL_PX} color {P['ink']} depthJump 0.015")
    cmd(session, ST.save_command(f"{OUT}/modes__{name}.png"))


def group_modes(session, p):
    setup(session)
    models = {}
    for i in IDS:
        g = GEOM["entries"][i]
        m = cmd(session, f"open {DATA}/{i}.cif")[0]
        models[i] = m
        s = m.atomspec
        cmd(session, f"delete {s} & ~/{g['rec_chain']},{g['arr_chain']}")
    cmd(session, "delete solvent; delete ligand; delete ions; delete H")
    cmd(session, "hide pseudobonds; label delete")
    cmd(session, "hide atoms; cartoon; cartoon style protein width 2.4 thick 0.55 xsection oval")
    for i, m in models.items():
        g = GEOM["entries"][i]
        s = m.atomspec
        rc, ac = g["rec_chain"], g["arr_chain"]
        cmd(session, f"color {s}/{rc} {CREAM} target c; color {s}/{ac} {PERI} target c")
        cmd(session, f"color {s}/{rc}:{ranges(g['receptor_contacts'])} {APRICOT} target c")
        cmd(session, f"hide {s}/{rc}:1-{g['hide_before'] - 1} cartoons")      # extracellular N-terminal segment before TM1 is not drawn
        mat = np.array(g["matrix_to_view"])
        m.position = Place(matrix=mat[:3, :4])
    cmd(session, "view")
    cmd(session, "zoom 0.95")
    fixed = (session.main_view.camera.position, session.main_view.camera.field_width)
    for i in IDS:
        if ONLY and i not in ONLY.split(","):
            continue
        for j, m in models.items():
            m.display = (j == i)
        session.main_view.camera.position, session.main_view.camera.field_width = fixed
        save_plain(session, i)
    write_anchors("modes", {"px_per_A": W / fixed[1]})


GROUPS = {"modes": group_modes}
run_main(session, GROUPS, sys.argv, "render_modes")  # noqa: F821  (session is injected by ChimeraX)
