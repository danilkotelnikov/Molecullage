# ChimeraX script: the BA.2.86 RBD of PDB 8QSQ (chain A) coloured by the mean effect of mutations at each site, with ACE2 (chain B) as a separate pale layer.
# Run from the Molecullage repo root through the lock wrapper (a ChimeraX window opens; --offscreen has no OpenGL on Windows):
#   MOLECULLAGE_ART=C:/.../gallery/07-rbd-mutational-scan/art py -3 -B struct/run_cx.py gallery/07-rbd-mutational-scan/src/render_scan.py mode=final az=30 roll=25
#   MOLECULLAGE_ART=...  py -3 -B struct/run_cx.py gallery/07-rbd-mutational-scan/src/render_scan.py mode=probe azs=0,30,60,...   (id maps only, to pick the view)
# Needs src/render_input.json (py -3 -I src/render_prep.py): one hex per RBD residue and background. Then: py -3 -I src/anchors.py ; py -3 -I struct/trim.py scan.
# Output in the art folder (2400 x 1800, transparent): scan__ace2.png (the surface of the ACE2 residues within ACE2_ZONE of the RBD, flat pale grey), scan__kp.png and scan__lp.png (the RBD
# surface in the scale colours of src/scale.py, the same camera), zoom__ace2/kp/lp.png (the same orientation enlarged Z times on the three hotspot residues), scanid_final.png and
# zoomid_final.png (flat colour maps of the three hotspot sites, for src/anchors.py), scan.anchors.json (the box of the enlargement on the overview).
# View: screen up = from the RBD towards ACE2 (direction between the contact atoms); the line of sight lies in the plane across that direction at azimuth `az`.
# Progress goes to art/render_progress.log; a failure goes to struct/last_error_render_scan.txt (a script error would otherwise leave ChimeraX hanging).
import json
import os
import sys
import traceback

from chimerax.core.commands import run

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", "..", ".."))
ART = os.environ.get("MOLECULLAGE_ART") or os.path.join(HERE, "..", "art")
os.makedirs(ART, exist_ok=True)
LOG = os.path.join(ART, "render_progress.log")
ACE2_ZONE = 5.0          # ACE2 residues within this many angstrom of the RBD form the pale ACE2 patch
HOT_IDS = {"455": "#E00000", "456": "#0000E0", "493": "#00B000"}   # id-map colours of the hotspot sites (flat map, not part of the figure)


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
    import numpy as np

    sys.path.insert(0, os.path.join(ROOT, "struct"))
    import cx_common as CX
    from cx_common import ST, W, H, cmd, setup, save_layer, scene_to_px, OUT

    a = args(sys.argv)
    mode = a.get("mode", "final")
    az = float(a.get("az", 0))
    azs = [float(x) for x in a.get("azs", "0").split(",")]
    tilt = float(a.get("tilt", 0))
    roll = float(a.get("roll", 0))      # degrees: turns the picture clockwise on the screen (the line of sight does not change)
    zoom = float(a.get("zoom", 1.0))
    log(f"mode {mode}; art folder {OUT}")
    cif = (os.path.normpath(os.path.join(HERE, "..")) + "/data/pdb/8QSQ.cif").replace("\\", "/")
    J = json.load(open(os.path.join(HERE, "render_input.json"), encoding="utf-8"))
    ACE_FILL = ST.comp("#E4E4E4")
    ACE_EDGE = "#8F8F8F"

    setup(session)
    m = cmd(session, f"open {cif}")[0]
    cmd(session, "delete solvent; delete ions; delete H; delete ~protein")
    cmd(session, "hide pseudobonds; label delete; hide atoms; hide cartoons")
    A = [r for r in m.residues if r.chain_id == "A"]
    B = [r for r in m.residues if r.chain_id == "B"]
    assert len(A) == J["last_auth"] - J["first_auth"] + 1 and A[0].number == J["first_auth"], (len(A), A[0].number)
    for site, resname in (("455", "LEU"), ("456", "PHE"), ("493", "GLN")):          # BA.2.86 has L455, F456, Q493 (S, L, E in KP.3.1.1 and LP.8.1)
        got = [r.name for r in A if r.number == J["hotspots_auth"][site]]
        assert got == [resname], (site, J["hotspots_auth"][site], got)
    xa = np.array([x.scene_coord for r in A for x in r.atoms])
    xb = np.array([x.scene_coord for r in B for x in r.atoms])
    d = np.linalg.norm(xa[:, None, :] - xb[None, :, :], axis=2)
    ca = xa[d.min(axis=1) < 5.0]                     # RBD atoms within 5 A of ACE2
    cb = xb[d.min(axis=0) < 5.0]                     # ACE2 atoms within 5 A of the RBD
    n = cb.mean(0) - ca.mean(0)
    n /= np.linalg.norm(n)
    # in-plane basis across n: u along the largest spread of the contact atoms, v the other one
    c2 = np.concatenate([ca, cb])
    q = (c2 - c2.mean(0)) - np.outer((c2 - c2.mean(0)) @ n, n)
    vt = np.linalg.svd(q, full_matrices=False)[2]
    u = vt[0] - (vt[0] @ n) * n
    u /= np.linalg.norm(u)
    v = np.cross(n, u)

    def orientation(az_deg):
        t = np.radians(az_deg)
        z0 = np.cos(t) * v + np.sin(t) * u            # line of sight, in the plane across n
        z = np.cos(np.radians(tilt)) * z0 + np.sin(np.radians(tilt)) * n        # optional tilt up out of that plane
        z /= np.linalg.norm(z)
        y = n - (n @ z) * z
        y /= np.linalg.norm(y)
        x = np.cross(y, z)
        rr = np.radians(roll)
        return np.stack([np.cos(rr) * x + np.sin(rr) * y, -np.sin(rr) * x + np.cos(rr) * y, z])

    centre = np.concatenate([xa, xb[d.min(axis=0) < ACE2_ZONE]]).mean(0)

    def show_ace2(on):
        sB.display = on

    def pose(az_deg):
        R = orientation(az_deg)
        m.position = CX._place(R, centre)
        return R

    ace_near = f"(/B & (/A :<{ACE2_ZONE}))"
    cmd(session, f"surface /A enclose /A; surface {ace_near} enclose {ace_near}")
    from chimerax.atomic import MolecularSurface
    surfs = {s.atoms[0].residue.chain_id: s for s in session.models if isinstance(s, MolecularSurface)}
    assert sorted(surfs) == ["A", "B"], list(surfs)
    sB, surf = surfs["B"], [surfs["A"]]
    cmd(session, f"color /B {ACE_FILL} target s")
    log("surface models: " + ", ".join(s.name for s in surf))

    def paint(bg):
        cmd(session, "color /A #FFFFFF target s")
        for auth, hx in J["colours"][bg].items():
            cmd(session, f"color /A:{auth} {ST.comp(hx)} target s")

    def probe_colours():
        cmd(session, "color /A #FFFFFF target s")
        for site, hx in HOT_IDS.items():
            cmd(session, f"color /A:{J['hotspots_auth'][site]} {hx} target s")

    def set_plain_light():
        for c in ST.light_commands(ST.palette()):
            cmd(session, c)

    if mode == "probe":
        for azv in azs:
            R = pose(azv)
            show_ace2(False)
            cmd(session, "view; zoom 0.9")
            probe_colours()
            cmd(session, "lighting flat; lighting depthCue false; material specularReflectivity 0; graphics silhouettes false")
            cmd(session, ST.save_command(f"{OUT}/scanprobe_{int(azv)}{a.get('tag', '')}.png"))
            log(f"probe saved az={azv}")
        return

    # ---- final: the overview (group scan) and the enlargement of the hotspot sites (group zoom): same orientation, two cameras
    R = pose(az)
    show_ace2(True)
    cmd(session, f"view; zoom {0.95 * zoom}")
    log("overview camera fixed")
    cam = session.main_view.camera
    fw_ov, pos0 = cam.field_width, cam.position
    hs = [x.scene_coord for r in A if r.number in set(J["hotspots_auth"].values()) for x in r.atoms]
    c_in = np.mean(hs, axis=0)                      # centre of the three hotspot residues
    c_px = scene_to_px(session, [c_in])[0]          # their centre on the overview canvas
    ZZ = float(a.get("Z", 6.0))
    bw, bh = W / ZZ, H / ZZ                         # the enlargement covers this box of the overview canvas (pixels)

    def layers(group, with_id):
        # ACE2 layer: only the ACE2 surface near the RBD, grey silhouette
        for s_ in surf:
            s_.display = False
        sB.display = True
        cmd(session, "lighting flat; lighting depthCue false; material specularReflectivity 0")
        cmd(session, f"graphics silhouettes true width {ST.palette()['sil_px']} color {ACE_EDGE} depthJump 0.08")      # a large jump: only the outline of the ACE2 patch, not the folds inside it
        cmd(session, ST.save_command(f"{OUT}/{group}__ace2.png"))
        show_ace2(False)
        for s_ in surf:
            s_.display = True
        for bg, tag in (("KP.3.1.1", "kp"), ("LP.8.1", "lp")):
            paint(bg)
            save_layer(session, group, tag)
        probe_colours()                              # id map: hotspot patches in flat colours, no silhouettes, same camera
        cmd(session, "lighting flat; lighting depthCue false; material specularReflectivity 0; graphics silhouettes false")
        cmd(session, ST.save_command(f"{OUT}/{group}id_final.png"))
        log("saved layers of " + group)

    layers("scan", True)
    import json as _j
    _j.dump({"canvas": [W, H], "box_tl": [c_px[0] - bw / 2, c_px[1] - bh / 2], "box_br": [c_px[0] + bw / 2, c_px[1] + bh / 2], "box_centre": c_px, "zoom": ZZ, "field_width_A": fw_ov},
            open(os.path.join(OUT, "scan.anchors.json"), "w"), indent=1)
    # the enlargement: same orientation, camera moved to the hotspots, field of view 1/Z
    from chimerax.geometry import Place
    z_ax = pos0.axes()[2]
    delta = c_in - pos0.origin()
    cam.position = Place(axes=pos0.axes(), origin=pos0.origin() + (delta - (delta @ z_ax) * z_ax))
    cam.field_width = fw_ov / ZZ
    show_ace2(True)
    layers("zoom", True)
    json.dump({"R": R.tolist(), "centre": centre.tolist(), "n": n.tolist(), "az": az, "tilt": tilt, "roll": roll, "ace2_zone_A": ACE2_ZONE, "args": a}, open(os.path.join(OUT, "scan.view.json"), "w"), indent=1)
    log("done")


err = os.path.join(ROOT, "struct", "last_error_render_scan.txt")
if os.path.exists(err):
    os.remove(err)
try:
    log("start")
    main(session)  # noqa: F821  (session is injected by ChimeraX)
except BaseException:
    with open(err, "w", encoding="utf-8") as fh:
        fh.write(traceback.format_exc())
    log("FAILED, see struct/last_error_render_scan.txt")
run(session, "exit")  # noqa: F821
