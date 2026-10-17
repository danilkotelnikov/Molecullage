# ChimeraX script: the six TAP entries in one superposition and one camera, flat journal style, protein and ligands in separate layers.
# Run through the lock wrapper from the repo root (see how.md for the whole sequence):
#   set MOLECULLAGE_ART=gallery/01-tap-cycle/art   (the art folder of this piece)
#   py -3 -B struct/run_cx.py gallery/01-tap-cycle/src/render_tap.py tap
# Needs tables/tap_geometry.json (src/geometry.py): one 4 x 4 matrix per entry that carries the entry into the common view frame
# (superposition on the TAP2 transmembrane core, ER lumen up, TAP1 left, TAP2 right).
# Output: <art>/<group>__<ID>.png (protein, transparent, 2400 x 1800) and <art>/<group>__<ID>_lig.png (nucleotides and peptide only, same camera),
# <art>/<group>_<ID>.anchors.json (pixel positions on the canvas: the two C-alpha atoms of the NBD gap, and a visible pixel of each ligand).
# group is tapif for the inward-facing entries and tapof for the outward-facing ones: struct/trim.py gives each group its own crop box, so the
# entries of one group stay registered and the scale (one camera for all six) is the same everywhere.
import json
import os
import sys

import numpy as np

MYDIR = os.path.dirname(os.path.abspath(__file__))   # cx_common has its own HERE (the struct folder): keep this name apart
REPO = os.path.abspath(os.path.join(MYDIR, "..", "..", ".."))
sys.path.insert(0, os.path.join(REPO, "struct"))
from cx_common import *  # noqa: E402,F401,F403
import cx_common as CX  # noqa: E402
from chimerax.geometry import Place  # noqa: E402

GEOM = json.load(open(os.path.join(MYDIR, "..", "tables", "tap_geometry.json"), encoding="utf-8"))
DATA = os.path.abspath(os.path.join(MYDIR, "..", "data")).replace("\\", "/")
IDS = list(GEOM["entries"])
GROUP = {"9N61": "tapif", "9N62": "tapif", "9N65": "tapif", "9N63": "tapof", "9N64": "tapof", "9N66": "tapof"}
NUC = "ATP,ADP"          # nucleotide residue names in the entries (ligand names read from the mmCIF)
SHOW = os.environ.get("TAP_ONLY", "")   # exploration only: a comma list of entries to render
BALL = 0.62              # sphere radius as a fraction of the van der Waals radius (ligands only)
ADP_COL = ST.comp(ST.tokens()["color"]["family"]["palemint"]["fill"])   # ATP is mint, ADP the pale tone of the same family


def log(msg):
    """Progress lines to the file named in $TAP_LOG (exploration; the render itself writes only the PNG and anchor files)."""
    f = os.environ.get("TAP_LOG")
    if f:
        import time

        with open(f, "a", encoding="utf-8") as fh:
            fh.write(f"{time.strftime('%H:%M:%S')} {msg}\n")


def visible_px(session, atoms, radius_px):
    """Pixel of the ligand closest to its centre: the atom projection nearest the centroid (the sphere there is drawn, so the pixel is ligand)."""
    xy = np.array(scene_to_px(session, atoms.scene_coords))
    c = xy.mean(0)
    k = int(np.argmin(np.linalg.norm(xy - c, axis=1)))
    return [float(xy[k][0]), float(xy[k][1])]


def group_tap(session, p):
    log("start")
    setup(session)
    models = {}
    for i in IDS:
        models[i] = cmd(session, f"open {DATA}/{i}.cif")[0]
        log(f"opened {i}")
    cmd(session, "delete solvent; delete H; delete ions")
    cmd(session, "hide pseudobonds; label delete")
    cmd(session, "hide atoms; cartoon; cartoon style protein width 2.4 thick 0.55 xsection oval")
    for i, m in models.items():
        s = m.atomspec
        cmd(session, f"color {s}/A {PERI} target c; color {s}/B {APRICOT} target c")
        cmd(session, f"style {s}:{NUC} sphere; size {s}:{NUC} atomRadius {BALL * 1.7:.2f}; color {s}:ATP {MINT} target a; color {s}:ADP {ADP_COL} target a")
        if any(c.chain_id == "C" for c in m.chains):
            cmd(session, f"hide {s}/C cartoons; style {s}/C sphere; size {s}/C atomRadius {BALL * 1.7:.2f}; color {s}/C {ROSE} target a")
        mat = np.array(GEOM["entries"][i]["matrix_to_view"])
        m.position = Place(matrix=mat[:3, :4])
    log("styled")
    cmd(session, "view")
    cmd(session, "zoom 0.95")
    fixed = (session.main_view.camera.position, session.main_view.camera.field_width)
    log("camera fixed")
    ids = [i for i in IDS if not SHOW or i in SHOW.split(",")]
    for i in ids:
        for j, m in models.items():
            m.display = (j == i)
        m = models[i]
        s = m.atomspec
        lig_spec = f"{s}:{NUC}" + (f" | {s}/C" if any(c.chain_id == "C" for c in m.chains) else "")
        session.main_view.camera.position, session.main_view.camera.field_width = fixed
        # protein layer: ligands hidden
        cmd(session, f"hide {lig_spec} atoms")
        save_layer(session, GROUP[i], i)
        # ligand layer: cartoons hidden, ligand atoms shown
        cmd(session, f"hide {s} cartoons; show {lig_spec} atoms")
        session.main_view.camera.position, session.main_view.camera.field_width = fixed
        save_layer(session, GROUP[i], f"{i}_lig")
        cmd(session, f"cartoon {s}")
        cmd(session, f"hide {s}/C cartoons") if any(c.chain_id == "C" for c in m.chains) else None
        log(f"saved {i}")
        pos = m.position
        res = {(r.chain_id, r.number): r for r in m.residues}
        gp = GEOM["gap_pair"]
        anchors = {}
        for key, ch in (("gapA", "A"), ("gapB", "B")):
            anchors[key] = scene_to_px(session, tp(pos, res[(ch, gp[ch])].find_atom("CA").coord))[0]
        for key, ch in (("nucA", "A"), ("nucB", "B"), ("pep", "C")):
            at = [a for r in m.residues if r.chain_id == ch and (r.name in NUC.split(",") or ch == "C") for a in r.atoms]
            if at:
                from chimerax.atomic import Atoms

                anchors[key] = visible_px(session, Atoms(at), 0)
        anchors["px_per_A"] = W / fixed[1]          # canvas pixels per angstrom (orthographic camera): the same for all six entries
        write_anchors(f"{GROUP[i]}_{i}", anchors)


GROUPS = {"tap": group_tap}
run_main(session, GROUPS, sys.argv, "render_tap")  # noqa: F821  (session is injected by ChimeraX)
