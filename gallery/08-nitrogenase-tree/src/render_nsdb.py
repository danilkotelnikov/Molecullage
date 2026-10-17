# ChimeraX script: the three deposited DDKK entries of panel b (3U7Q, 4WES, 8BOQ) in one common view and one camera, flat journal style.
# Run through the lock wrapper from the repo root (see how.md for the whole sequence):
#   set MOLECULLAGE_ART=<absolute path>/gallery/08-nitrogenase-tree/art
#   py -3 -B struct/run_cx.py gallery/08-nitrogenase-tree/src/render_nsdb.py nsdb
# Needs tables/inset_frames.json and tables/insertion_spans.json (src/spans.py).
# Draws only the D and K chains (the AnfG chains C and F of 8BOQ, waters, metal clusters and other ligands are not drawn).
# The view: down the pseudo two-fold axis of 3U7Q, from the side on which all three segments are exposed (the other side hides most of the K extension).
# D chains light grey, K chains mid grey (derived from the token colour "guide"), the inserted segment in the token colour indigo.
# Output: <art>/nsdb__<ID>.png (transparent, 2400 x 1800, one camera for all three) and <art>/nsdb_<ID>.anchors.json:
#   hi (a pixel of the inserted segment on the visible side), dlab and klab (a visible pixel of a D and of a K chain), px_per_A.
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

TAB = os.path.join(MYDIR, "..", "tables")
FR = json.load(open(os.path.join(TAB, "inset_frames.json"), encoding="utf-8"))
SP = json.load(open(os.path.join(TAB, "insertion_spans.json"), encoding="utf-8"))
DATA = os.path.abspath(os.path.join(MYDIR, "..", "data")).replace("\\", "/")
IDS = ["3U7Q", "4WES", "8BOQ"]
CH = {"3U7Q": ("A,C", "B,D"), "4WES": ("A,C", "B,D"), "8BOQ": ("A,D", "B,E")}   # D chains, K chains (auth ids)
DELETE = {"8BOQ": "C,F"}                                                         # AnfG
TOK = ST.tokens()["color"]
GUIDE = TOK["guide"]
D_COL = ST.comp(ST.mix("#FFFFFF", GUIDE, 0.20))
K_COL = ST.comp(ST.mix("#FFFFFF", GUIDE, 0.80))
HI_COL = ST.comp(TOK["family"]["indigo"]["fill"])
FLIP = os.environ.get("NSDB_FLIP", "1") == "1"      # default: seen from the side of the two-fold axis where the three segments are exposed
STYLE = os.environ.get("NSDB_STYLE", "surface")      # "surface" (default) or "cartoon"


def log(msg):
    f = os.environ.get("NSDB_LOG")
    if f:
        import time

        with open(f, "a", encoding="utf-8") as fh:
            fh.write(f"{time.strftime('%H:%M:%S')} {msg}\n")


def runs(nums):
    """[1,2,3,7,8] -> '1-3,7-8' (ChimeraX residue list)."""
    nums = sorted(nums)
    out, a, b = [], nums[0], nums[0]
    for n in nums[1:]:
        if n == b + 1:
            b = n
        else:
            out.append(f"{a}-{b}"); a = b = n
    out.append(f"{a}-{b}")
    return ",".join(out)


def cam_coords(session, pts):
    inv = session.main_view.camera.position.inverse()
    return np.array([inv * np.asarray(p) for p in pts])


def front_px(session, m, residues, others):
    """Pixel of the residue (CA) of `residues` that is the most central one among those not hidden behind another CA of the model.
    A CA is hidden when another CA of `others` lies within 3 A of it in the picture plane and nearer the camera by more than 1 A."""
    cam = session.main_view.camera
    scale = W / cam.field_width
    mine = [(r, r.find_atom("CA")) for r in residues if r.find_atom("CA") is not None]
    P = cam_coords(session, [tp(m.position, a.coord)[0] for _, a in mine])
    Q = cam_coords(session, [tp(m.position, a.coord)[0] for a in others])
    ok = []
    for i in range(len(P)):
        d = np.linalg.norm(Q[:, :2] - P[i, :2], axis=1)
        hidden = np.any((d < 3.0) & (Q[:, 2] > P[i, 2] + 1.0))
        ok.append(not hidden)
    ok = np.array(ok)
    assert ok.any(), "no visible residue"
    c = P[ok, :2].mean(0)
    k = int(np.argmin(np.where(ok, np.linalg.norm(P[:, :2] - c, axis=1), 1e9)))
    return [float(W / 2 + P[k, 0] * scale), float(H / 2 - P[k, 1] * scale)]


def group_nsdb(session, p):
    log("start")
    setup(session)
    models = {}
    for i in IDS:
        models[i] = cmd(session, f"open {DATA}/{i}.cif")[0]
        log(f"opened {i}")
    cmd(session, "delete solvent; delete H; delete ions; delete ligand")
    for i, m in models.items():
        if i in DELETE:
            cmd(session, f"delete {m.atomspec}/{DELETE[i]}")
    cmd(session, "hide pseudobonds; label delete")
    cmd(session, "hide atoms; cartoon; cartoon style protein width 2.4 thick 0.55 xsection oval")
    for i, m in models.items():
        s = m.atomspec
        dch, kch = CH[i]
        if STYLE == "surface":                       # one molecular surface per chain: shows what is exposed
            cmd(session, f"surface {s} gridSpacing 0.6; hide {s} cartoons")
        cmd(session, f"color {s}/{dch} {D_COL} target acs; color {s}/{kch} {K_COL} target acs")
        sp = SP[i]
        for ch, nums in sp["modelled"].items():
            cmd(session, f"color {s}/{ch}:{runs(nums)} {HI_COL} target acs")
        mat = np.array(FR[i]["matrix"])
        if FLIP:                                     # look from the other side of the pseudo two-fold axis: turn the view by 180 degrees about y
            mat = np.diag([-1.0, 1.0, -1.0]) @ mat
        m.position = Place(matrix=mat[:3, :4])
    log("styled")
    cmd(session, "view")
    cmd(session, "zoom 0.95")
    fixed = (session.main_view.camera.position, session.main_view.camera.field_width)
    for i in IDS:
        for j, m in models.items():
            m.display = (j == i)
        m = models[i]
        session.main_view.camera.position, session.main_view.camera.field_width = fixed
        save_layer(session, "nsdb", i)
        log(f"saved {i}")
        dch, kch = CH[i]
        res = {(r.chain_id, r.number): r for r in m.residues}
        cas = [r.find_atom("CA") for r in m.residues if r.find_atom("CA") is not None]
        anchors = {}
        sp = SP[i]
        for ch, nums in sp["modelled"].items():          # first copy of the segment that has a visible residue
            try:
                anchors["hi"] = front_px(session, m, [res[(ch, n)] for n in nums], cas)
                anchors["hi_chain"] = ch
                break
            except AssertionError:
                continue
        assert "hi" in anchors, "inserted segment not visible"
        d_res = [r for r in m.residues if r.chain_id == dch.split(",")[0]]
        k_res = [r for r in m.residues if r.chain_id == kch.split(",")[0]]
        anchors["dlab"] = front_px(session, m, d_res, cas)
        anchors["klab"] = front_px(session, m, k_res, cas)
        anchors["px_per_A"] = W / fixed[1]
        write_anchors(f"nsdb_{i}", anchors)
    log("done")


GROUPS = {"nsdb": group_nsdb}
run_main(session, GROUPS, sys.argv, "render_nsdb")  # noqa: F821  (session is injected by ChimeraX)
