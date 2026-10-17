# ChimeraX script: the inhibitor pocket of PDB 9PEL in the flat journal style (close-up and overview), same orientation in both.
# Run from the Molecullage repo root through the lock wrapper, with the art folder of this piece:
#   MOLECULLAGE_ART=C:/.../gallery/02-ebola-pocket/art py -3 -B struct/run_cx.py gallery/02-ebola-pocket/src/render_pocket.py [view=auto|x,y,z] [up=x,y,z] [flip=0|1] [zone=9]
# Output in the art folder: pocket__full.png (close-up), overview__full.png (whole GP1/GP2 protomer, same orientation),
# pocket.anchors.json and overview.anchors.json (pixel anchors on the 2400 x 1800 canvas); then run  py -3 -I struct/trim.py pocket overview.
# Drawn: chain A (GP1), chain a (GP2), the inhibitor A1CIK of chain A (residue 401), nothing else (B/b, C/c, glycans and the nanobody are deleted).
# Sticks: the 20 residues of src/contacts.json (heavy atoms within 4.5 A of the inhibitor). Labels are not drawn here: the page adds them from the anchors.
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
    cif = (os.path.normpath(os.path.join(HERE, "..")) + "/data/pdb/9PEL.cif").replace("\\", "/")
    C = json.load(open(os.path.join(HERE, "contacts.json"), encoding="utf-8"))
    FAM = ST.tokens()["color"]["family"]
    GP1_FILL, GP1_DARK = ST.comp(FAM["palemint"]["fill"]), ST.comp(FAM["mint"]["edge"])
    GP2_FILL, GP2_DARK = ST.comp(FAM["palelilac"]["fill"]), ST.comp(FAM["peri"]["edge"])
    LIG = ST.comp(FAM["apricot"]["fill"])

    def vec(s):
        return np.array([float(x) for x in s.split(",")])

    def unit(v):
        return v / np.linalg.norm(v)

    def orientation(lig_xyz, contact_xyz, bulk_xyz, view, up, flip):
        """Rows: screen x, screen y (up), direction to the viewer. Auto: the inhibitor and its contact atoms seen face-on (smallest principal axis toward
        the viewer), the protein bulk behind it. view/up override."""
        pts = np.concatenate([lig_xyz, contact_xyz])
        c = pts.mean(0)
        vt = np.linalg.svd(pts - c, full_matrices=False)[2]
        z = vt[2] if view is None else unit(view)
        if view is None and (bulk_xyz.mean(0) - c) @ z > 0:
            z = -z
        if flip:
            z = -z
        ref = vt[1] if up is None else up
        y = unit(ref - (ref @ z) * z)
        x = np.cross(y, z)
        return np.stack([x, y, z]), c

    a = args(sys.argv)
    zone = float(a.get("zone", 9))
    setup(session)
    m = cmd(session, f"open {cif}")[0]
    log("opened")
    cmd(session, "delete ~(/A | /a)")
    cmd(session, "delete solvent; delete ions; delete H")
    cmd(session, "hide pseudobonds; label delete")
    cmd(session, "hide atoms; hide cartoons")
    lig_res = [r for r in m.residues if r.name == "A1CIK"]
    assert len(lig_res) == 1, len(lig_res)
    lr = lig_res[0]
    lig_atoms = {x.name: x for x in lr.atoms}
    res_by = {(r.chain_id, r.number): r for r in m.residues}
    nearest = {}   # (chain, number) -> atom at the closest pair
    for r in C["residues"]:
        at = [x for x in res_by[(r["chain"], r["num"])].atoms if x.name == r["res_atom_nearest"]]
        assert at, r
        nearest[(r["chain"], r["num"])] = at[0]   # ChimeraX shows the highest-occupancy alternative of an altloc atom
    lig_xyz = np.array([x.scene_coord for x in lr.atoms])
    contact_xyz = np.array([x.scene_coord for k in nearest for x in res_by[k].atoms])
    prot = [x for x in m.atoms if x.residue.name != "A1CIK"]
    near = np.array([x.scene_coord for x in prot if np.min(np.linalg.norm(lig_xyz - x.scene_coord, axis=1)) < 14.0])
    view = vec(a["view"]) if a.get("view", "auto") != "auto" else None
    up = vec(a["up"]) if "up" in a else None
    vj = os.path.join(HERE, "view.json")
    if view is None and os.path.exists(vj):   # src/choose_view.py: the direction picked from the coordinates
        v = json.load(open(vj, encoding="utf-8"))
        view, up = np.array(v["z_to_viewer"]), np.array(v["up"])
        log("view from src/view.json")
    R, centre = orientation(lig_xyz, contact_xyz, near, view, up, int(a.get("flip", 0)))
    m.position = CX._place(R, centre)
    log("oriented")

    # --- close-up
    cmd(session, "cartoon style protein width 1.9 thick 0.45 xsection oval; cartoon suppressBackboneDisplay false")   # this "cartoon" shows all of them ...
    # ribbons: the saturated family fill, made see-through so that it reads as the pale tile colour of the key
    cmd(session, f"color /A {ST.comp(FAM['mint']['fill'])} target c; color /a {ST.comp(FAM['peri']['fill'])} target c")
    cmd(session, "hide cartoons")   # ... so hide them again and show only the neighbourhood of the inhibitor
    cmd(session, f"show ((:A1CIK :<{zone}) & protein) cartoons")
    cmd(session, f"transparency /A {int(a.get('tr1', 45))} target c; transparency /a {int(a.get('tr2', 70))} target c")   # sticks behind a ribbon stay visible, so every leader ends on a visible atom
    for r in C["residues"]:
        s = f"/{r['chain']}:{r['num']}"
        dark = GP1_DARK if r["chain"] == "A" else GP2_DARK
        cmd(session, f"show {s} atoms; style {s} stick; size {s} stickRadius 0.17; color {s} {dark} target a")
        if not all(a in ("N", "CA", "C", "O") for a in r["contact_atoms"]):   # backbone atoms stay hidden, unless the residue touches the inhibitor only with them (Ser65)
            cmd(session, f"hide {s}@N,CA,C,O atoms")
    cmd(session, "show /A:401 atoms; style /A:401 stick; size /A:401 stickRadius 0.25; color /A:401 " + LIG + " target a")
    cmd(session, "view; zoom 0.93")
    log("styled")
    # no hydrogen-bond line is drawn here: the page draws every interaction line, one per tile, in the same style as panel b
    save_layer(session, "pocket", "full")
    log("saved pocket")
    cam = session.main_view.camera
    ppa = W / cam.field_width
    anchors = {"px_per_A": ppa, "field_width_A": cam.field_width}

    def px(obj):
        xyz = obj.scene_coord if hasattr(obj, "scene_coord") else np.asarray(obj)
        return scene_to_px(session, [xyz])[0]

    lig_c = np.mean([x.scene_coord for x in lr.atoms], axis=0)
    anchors["cent"] = px(lig_c)
    for k, at in nearest.items():
        anchors[f"res_{k[0]}_{k[1]}"] = px(at)
    for n, at in lig_atoms.items():
        anchors[f"lig_{n}"] = px(at)
    for c in C["cation_pi"]:
        r = res_by[(c["chain"], c["num"])]
        cat = np.mean([x.scene_coord for x in r.atoms if x.name in (("NE", "NH1", "NH2") if r.name == "ARG" else ("NZ",))], axis=0)
        anchors[f"cat_{c['chain']}_{c['num']}"] = px(cat)
        anchors["ring_" + "_".join(c["ring"][:2])] = px(np.mean([lig_atoms[n].scene_coord for n in c["ring"]], axis=0))
    # every residue atom that touches the inhibitor is a candidate end point of a leader; atoms hidden behind a stick drawn in front are flagged
    cam = session.main_view.camera
    inv = cam.position.inverse()
    camxyz = lambda at: np.asarray(inv * at.scene_coord)
    occluders = []   # (camera xyz, radius, owner)
    for at in lr.atoms:
        occluders.append((camxyz(at), 0.30, "lig"))
        for nb in at.neighbors:
            if nb.name > at.name:
                occluders.append(((camxyz(at) + camxyz(nb)) / 2, 0.30, "lig"))
    for k in nearest:
        for at in res_by[k].atoms:
            occluders.append((camxyz(at), 0.20, k))
            for nb in at.neighbors:
                if nb.residue is at.residue and nb.name > at.name:
                    occluders.append(((camxyz(at) + camxyz(nb)) / 2, 0.20, k))
    occluded, hidden = [], []
    for r in C["residues"]:
        k = (r["chain"], r["num"])
        for an in r["contact_atoms"]:
            at = [x for x in res_by[k].atoms if x.name == an][0]
            anchors[f"cand_{k[0]}_{k[1]}_{an}"] = px(at)
            if not at.display:   # drawn nowhere: a hidden backbone atom
                hidden.append(f"cand_{k[0]}_{k[1]}_{an}")
                continue
            c = camxyz(at)
            for oc, rad, owner in occluders:
                if owner == k and np.linalg.norm(oc - c) < 0.9:
                    continue   # its own neighbours do not hide it
                if np.hypot(*(oc[:2] - c[:2])) < rad + 0.2 and oc[2] > c[2] + 0.25:
                    occluded.append(f"cand_{k[0]}_{k[1]}_{an}")
                    break
    anchors["occluded"] = occluded   # behind a stick or the inhibitor drawn in front of it
    anchors["hidden"] = hidden       # not drawn at all (backbone atoms under the ribbon)
    log(f"candidates {sum(len(r['contact_atoms']) for r in C['residues'])}, behind a stick {len(occluded)}, not drawn {len(hidden)}")
    write_anchors("pocket", anchors)
    # the screen rectangle of the close-up in scene coordinates, for the box drawn on the overview
    fw, fh = cam.field_width, cam.field_width * H / W
    corners = cam.position.transform_points(np.array([[-fw / 2, fh / 2, 0.0], [fw / 2, -fh / 2, 0.0]]))

    # --- overview: the whole protomer (GP1 chain A, GP2 chain a), the inhibitor as spheres, same orientation
    cmd(session, "hide atoms; hide cartoons; show protein cartoons")
    cmd(session, "show /A:401 atoms; style /A:401 sphere; size /A:401 atomRadius 1.9; color /A:401 " + LIG + " target a")
    cmd(session, "view; zoom 0.95")
    save_layer(session, "overview", "full")
    log("saved overview")
    cam = session.main_view.camera
    oa = {"px_per_A": W / cam.field_width, "field_width_A": cam.field_width, "cent": px(lig_c)}
    oa["box_tl"] = scene_to_px(session, [corners[0]])[0]
    oa["box_br"] = scene_to_px(session, [corners[1]])[0]
    write_anchors("overview", oa)
    json.dump({"R": R.tolist(), "centre_model": centre.tolist(), "zone_A": zone, "args": a}, open(os.path.join(OUT, "pocket.view.json"), "w"), indent=1)
    log("done")


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
