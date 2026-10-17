# ChimeraX script: PDB 7F61 chain A (H3R) and its ligand 1IB in the flat journal style, turned about the receptor axis as chosen by src/choose_view.py.
# Run from the Molecullage repo root through the lock wrapper, with the art folder of this piece:
#   MOLECULLAGE_ART=C:/.../gallery/06-gpcr-snake-plot/art py -3 -B struct/run_cx.py gallery/06-gpcr-snake-plot/src/render_h3r.py
# Output in the art folder: h3r__full.png (2400 x 1800, transparent) and h3r.anchors.json (pixel anchors); then run  py -3 -I struct/trim.py h3r
# Drawn: chain A as a translucent ribbon, the four residues of the paper (73, 193, 359, 415) as sticks, ligand 1IB (antagonist PF03654746) as sticks.
# Not drawn: chain B (BRIL fusion), cholesterol (CLR), water, ions. Labels are not drawn here: the page adds them from the anchors.
# Progress goes to art/render_progress.log; a failure goes to struct/last_error_render_h3r.txt (a script error would otherwise leave ChimeraX hanging).
import os
import sys
import traceback

from chimerax.core.commands import run

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", "..", ".."))
ART = os.environ.get("MOLECULLAGE_ART") or os.path.join(HERE, "..", "art")
os.makedirs(ART, exist_ok=True)
LOG = os.path.join(ART, "render_progress.log")


def log(msg):
    with open(LOG, "a", encoding="utf-8") as fh:
        fh.write(msg + "\n")


def main(session):
    import json

    import numpy as np

    sys.path.insert(0, os.path.join(ROOT, "struct"))
    import cx_common as CX
    from cx_common import ST, W, H, cmd, setup, save_layer, scene_to_px, write_anchors, OUT

    log("imports done; art folder " + OUT)
    cif = (os.path.normpath(os.path.join(HERE, "..")) + "/data/pdb/7F61.cif").replace("\\", "/")
    V = json.load(open(os.path.join(HERE, "view.json"), encoding="utf-8"))
    R, centre = np.array(V["R"]), np.array(V["centre"])
    FAM = ST.tokens()["color"]["family"]
    RIB = ST.comp(FAM["mint"]["fill"])
    SITE = ST.comp(FAM["apricot"]["fill"])
    LIG = ST.comp(FAM["rose"]["fill"])
    SITES = [73, 193, 359, 415]

    setup(session)
    m = cmd(session, f"open {cif}")[0]
    log("opened")
    cmd(session, "delete /B")                                  # chain B: the BRIL fusion protein
    cmd(session, "delete solvent; delete ions; delete H; delete :CLR")   # water, ions, hydrogens, cholesterol
    cmd(session, "hide pseudobonds; label delete")             # the dashed 'missing structure' bond of the unresolved ICL3 would carry a text label
    chains = sorted({r.chain_id for r in m.residues})
    assert chains == ["A"], chains
    lig = [r for r in m.residues if r.name == "1IB"]
    assert len(lig) == 1, len(lig)
    names = {r.number: r.name for r in m.residues if r.number in SITES and r.polymer_type == r.PT_AMINO}
    assert names == {73: "LEU", 193: "PHE", 359: "SER", 415: "CYS"}, names
    m.position = CX._place(R, centre)                          # scene coordinates = R (p - centre): x right, y up (receptor axis), z towards the viewer
    cmd(session, "hide atoms; hide cartoons; cartoon /A")
    cmd(session, "cartoon style protein width 2.2 thick 0.5 xsection oval; cartoon suppressBackboneDisplay true")
    cmd(session, f"color /A {RIB} target c; transparency /A 45 target c")
    for n in SITES:
        s = f"/A:{n}"
        cmd(session, f"show {s} & (sidechain | @CA) atoms; style {s} stick; size {s} stickRadius 0.55; color {s} {SITE} target a")
    cmd(session, f"show :1IB atoms; style :1IB stick; size :1IB stickRadius 0.36; color :1IB {LIG} target a")
    cmd(session, "view; zoom 0.97")
    save_layer(session, "h3r", "full")
    log("saved")

    cam = session.main_view.camera
    ppa = W / cam.field_width
    res = {r.number: r for r in m.residues if r.chain_id == "A"}

    def px(p):
        return scene_to_px(session, [np.asarray(p, float)])[0]

    anchors = {"px_per_A": ppa, "field_width_A": cam.field_width, "origin": px([0.0, 0.0, 0.0])}
    for i, n in enumerate(SITES, start=1):
        r = res[n]
        side = [a for a in r.atoms if a.name not in ("N", "C", "O", "CA")]
        pts = [a.scene_coord for a in side] or [r.find_atom("CA").scene_coord]
        anchors[f"site{i}_side"] = px(np.mean(pts, axis=0))
        anchors[f"site{i}_ca"] = px(r.find_atom("CA").scene_coord)
    anchors["ligand"] = px(np.mean([a.scene_coord for a in lig[0].atoms], axis=0))
    anchors["ligand_atoms"] = {a.name: px(a.scene_coord) for a in lig[0].atoms}
    write_anchors("h3r", anchors)
    log("done")


err = os.path.join(ROOT, "struct", "last_error_render_h3r.txt")
if os.path.exists(err):
    os.remove(err)
try:
    log("start")
    main(session)  # noqa: F821  (session is injected by ChimeraX)
except BaseException:
    with open(err, "w", encoding="utf-8") as fh:
        fh.write(traceback.format_exc())
    log("FAILED, see struct/last_error_render_h3r.txt")
run(session, "exit")  # noqa: F821
