# ChimeraX script: the ATP site of PDB 6LZJ (aqMutL N-terminal domain with AMPPCP), flat journal style, close-up of the two glutamates and the water.
# Run from the Molecullage repo root through the lock wrapper, with the art folder of this piece:
#   MOLECULLAGE_ART=C:/.../gallery/12-mutl-kinetics/art py -3 -B struct/run_cx.py gallery/12-mutl-kinetics/src/render_pocket.py [view=x,y,z] [up=x,y,z] [zone=9] [zoom=1.0]
# then  MOLECULLAGE_ART=... py -3 -I struct/trim.py pocket   (crops the layer and writes art/index.pocket.json for the page).
# Output: art/pocket__full.png (2400 x 1800, transparent) and art/pocket.anchors.json (pixel anchors on that canvas).
# Drawn: chain A, ribbon (pale grey, half transparent) only within <zone> A of the water; the side chains of the paper's Glu29 and Glu32 (file residues 22 and 25;
# the paper numbers 7 higher than the file, src/geometry.py checks the offset), the water HOH 565 that touches both, AMPPCP (residue 402) and the Mg ion (401).
# Hydrogen-bond lines (the nearest carboxylate O of each glutamate to the water) are pseudobonds; their distances are computed by src/geometry.py and written by the page.
# Progress goes to art/render_progress.log; a failure goes to struct/last_error_render_pocket.txt (a script error would otherwise leave ChimeraX hanging).
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


def args(argv):
    d = {}
    for a in argv[1:]:
        if "=" in a:
            k, v = a.split("=", 1)
            d[k] = v
    return d


def main(session):
    import json

    import numpy as np

    sys.path.insert(0, os.path.join(ROOT, "struct"))
    import cx_common as CX
    from cx_common import ST, W, H, cmd, setup, save_layer, scene_to_px, write_anchors, OUT

    log("imports done; art folder " + OUT)
    G = json.load(open(os.path.join(HERE, "..", "tables", "6lzj_geometry.json"), encoding="utf-8"))
    pdb = (os.path.normpath(os.path.join(HERE, "..")) + "/data/6LZJ.pdb").replace("\\", "/")
    a = args(sys.argv)
    FAM = ST.tokens()["color"]["family"]
    GUIDE = ST.tokens()["color"]["guide"]
    RIBBON = ST.comp(ST.mix("#FFFFFF", GUIDE, float(a.get("rib", 0.6))))        # neutral pale grey: no family colour is spent on the protein
    C29 = ST.comp(FAM["apricot"]["fill"])                   # Glu29: the apricot fill of the colour key (residue 29 and the E29x variants)
    C32 = ST.comp(FAM["peri"]["fill"])                      # Glu32: the purple fill of the colour key (residue 32 and the E32x variants)
    CLIG = ST.comp(ST.mix(GUIDE, ST.tokens()["color"]["ink"], float(a.get("lc", 0.8))))   # AMPPCP: near-black, so that no grey of the plots is reused
    CMG = ST.comp(FAM["mint"]["fill"])                      # Mg ion: mint
    CWAT = ST.comp("#FFFFFF")
    n29, n32, nw, nl, nm = G["file_number"]["Glu29"], G["file_number"]["Glu32"], G["water"]["number"], G["ligand"]["number"], G["mg"]["number"]

    zone = float(a.get("zone", 9))
    setup(session)
    m = cmd(session, f"open {pdb}")[0]
    log("opened")
    cmd(session, f"delete solvent & ~:{nw}")                # every water except the one that touches both glutamates
    cmd(session, "delete H")
    cmd(session, "hide pseudobonds; label delete")
    cmd(session, "hide atoms; hide cartoons")
    res = {(r.chain_id, r.number): r for r in m.residues}
    A = lambda num, name: next(x for x in res[("A", num)].atoms if x.name == name)
    w_o, e29, e32 = A(nw, "O"), A(n29, "OE1") if G["Glu29_to_water"]["atom"] == "OE1" else A(n29, "OE2"), A(n32, "OE1") if G["Glu32_to_water"]["atom"] == "OE1" else A(n32, "OE2")
    assert e29.name == G["Glu29_to_water"]["atom"] and e32.name == G["Glu32_to_water"]["atom"]
    assert abs(np.linalg.norm(w_o.scene_coord - e29.scene_coord) - G["Glu29_to_water"]["A"]) < 0.01 and abs(np.linalg.norm(w_o.scene_coord - e32.scene_coord) - G["Glu32_to_water"]["A"]) < 0.01
    key = {"glu29": [x for x in res[("A", n29)].atoms if x.name in ("CB", "CG", "CD", "OE1", "OE2")], "glu32": [x for x in res[("A", n32)].atoms if x.name in ("CB", "CG", "CD", "OE1", "OE2")]}
    lig = list(res[("A", nl)].atoms)
    phos = [x for x in lig if x.name in ("PA", "PB", "PG")]
    mg = next(iter(res[("A", nm)].atoms))
    pts = np.array([x.scene_coord for x in key["glu29"] + key["glu32"] + [w_o, mg] + phos])

    def unit(v):
        return v / np.linalg.norm(v)

    def vec(s):
        return np.array([float(x) for x in s.split(",")])

    c = pts.mean(0)
    vt = np.linalg.svd(pts - c, full_matrices=False)[2]
    bulk = np.array([x.scene_coord for x in m.atoms if x.name == "CA"]).mean(0)
    if "view" in a or "up" in a:                            # explicit directions: z toward the viewer, y up
        z = unit(vec(a["view"])) if "view" in a else vt[2]
        ref = vec(a["up"]) if "up" in a else vt[1]
        y = unit(ref - (ref @ z) * z)
        x = np.cross(y, z)
    else:
        # plane view: x from the Glu29 carboxylate carbon to the Glu32 one, y toward the gamma-phosphorus of AMPPCP (the water in between), z toward the viewer
        cd29 = np.asarray(A(n29, "CD").scene_coord)
        cd32 = np.asarray(A(n32, "CD").scene_coord)
        pg = np.asarray(next(q for q in lig if q.name == "PG").scene_coord)
        x = unit(cd32 - cd29)
        wv = np.asarray(w_o.scene_coord)
        y = unit((pg - wv) - ((pg - wv) @ x) * x)
        z = np.cross(x, y)
        if (bulk - c) @ z > 0:                              # keep the protein bulk behind the site: turn the view by 180 degrees about y
            x, z = -x, -z
        if int(a.get("flipx", 0)):
            x, z = -x, -z
    R = np.stack([x, y, z])
    th = np.deg2rad(float(a.get("roty", 0)))                  # optional turn of the view about the vertical screen axis (degrees)
    if th:
        Ry = np.array([[np.cos(th), 0, np.sin(th)], [0, 1, 0], [-np.sin(th), 0, np.cos(th)]])
        R = Ry @ R
    m.position = CX._place(R, c)
    log("oriented")

    cmd(session, "cartoon style protein width 1.9 thick 0.45 xsection oval; cartoon suppressBackboneDisplay false")
    cmd(session, f"color protein {RIBBON} target c")
    cmd(session, "hide cartoons")
    cmd(session, f"show ((:{nw} :<{zone}) & protein) cartoons")
    cmd(session, f"transparency protein {int(a.get('rtr', 40))} target c")
    for num, col in ((n29, C29), (n32, C32)):
        s = f"/A:{num}"
        cmd(session, f"show {s}@CB,CG,CD,OE1,OE2 atoms; style {s} stick; size {s} stickRadius {a.get('gw', 0.27)}; color {s} {col} target a")
    cmd(session, f"show :{nl} atoms; style :{nl} stick; size :{nl} stickRadius {a.get('lw', 0.13)}; color :{nl} {CLIG} target a")
    cmd(session, f"show :{nm} atoms; style :{nm} sphere; size :{nm} atomRadius 0.75; color :{nm} {CMG} target a")
    cmd(session, f"show :{nw} atoms; style :{nw} sphere; size :{nw} atomRadius 0.62; color :{nw} {CWAT} target a")
    pbg = m.pseudobond_group("hydrogen bonds", create_type="normal")
    for at in (e29, e32):
        pb = pbg.new_pseudobond(at, w_o)
        pb.color = [10, 10, 10, 255]
        pb.radius = 0.1
    pbg.dashes = 6
    cmd(session, f"view :{n29},{n32},{nw},{nm} | :{nl}")
    cmd(session, f"zoom {a.get('zoom', 1.0)}")
    log("styled")
    save_layer(session, "pocket", "full")
    log("saved pocket")

    cam = session.main_view.camera
    anchors = {"px_per_A": W / cam.field_width, "field_width_A": cam.field_width}
    px = lambda obj: scene_to_px(session, [obj.scene_coord if hasattr(obj, "scene_coord") else np.asarray(obj)])[0]
    for k, v in {"glu29_CD": A(n29, "CD"), "glu29_OE": e29, "glu29_CB": A(n29, "CB"), "glu32_CD": A(n32, "CD"), "glu32_OE": e32, "glu32_CB": A(n32, "CB"), "water": w_o, "mg": mg,
                 "lig_PG": next(x for x in lig if x.name == "PG"), "lig_PB": next(x for x in lig if x.name == "PB"), "lig_PA": next(x for x in lig if x.name == "PA"),
                 "lig_C3B": next(x for x in lig if x.name == "C3B"), "lig_N6": next(x for x in lig if x.name == "N6"), "lig_C2": next(x for x in lig if x.name == "C2")}.items():
        anchors[k] = px(v)
    anchors["hb29_mid"] = px((e29.scene_coord + w_o.scene_coord) / 2)
    anchors["hb32_mid"] = px((e32.scene_coord + w_o.scene_coord) / 2)
    # which atoms is each leader allowed to end on: a flag when a sphere or a stick of another object lies in front of the atom (camera z larger = nearer)
    inv = cam.position.inverse()
    camxyz = lambda p: np.asarray(inv * np.asarray(p))
    occl = []
    for name, obj, rad in (("water", w_o, 0.62), ("mg", mg, 0.75)):
        occl.append((name, camxyz(obj.scene_coord), rad))
    for owner, atoms_, rad in (("glu29", key["glu29"], 0.22), ("glu32", key["glu32"], 0.22), ("lig", lig, 0.2)):
        for at in atoms_:
            occl.append((owner, camxyz(at.scene_coord), rad))
    flags = {}
    for k, obj, owner in (("glu29_CD", A(n29, "CD"), "glu29"), ("glu32_CD", A(n32, "CD"), "glu32"), ("water", w_o, "water"), ("mg", mg, "mg"), ("lig_PB", next(x for x in lig if x.name == "PB"), "lig")):
        cc = camxyz(obj.scene_coord)
        flags[k] = [o for o, p, r in occl if o != owner and np.hypot(*(p[:2] - cc[:2])) < r + 0.15 and p[2] > cc[2] + 0.2]
    anchors["in_front_of"] = flags
    write_anchors("pocket", anchors)
    json.dump({"R": R.tolist(), "centre_model": c.tolist(), "zone_A": zone, "args": a}, open(os.path.join(OUT, "pocket.view.json"), "w"), indent=1)
    log("done; in front of: " + json.dumps(flags))


err = os.path.join(ROOT, "struct", "last_error_render_pocket.txt")
if os.path.exists(err):
    os.remove(err)
try:
    log("start")
    main(session)  # noqa: F821  (session is injected by ChimeraX)
except BaseException:
    with open(err, "w", encoding="utf-8") as fh:
        fh.write(traceback.format_exc())
    log("FAILED, see struct/last_error_render_pocket.txt")
run(session, "exit")  # noqa: F821
