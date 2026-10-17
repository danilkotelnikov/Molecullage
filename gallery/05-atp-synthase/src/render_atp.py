# ChimeraX script: PDB 9ZFT (ATP synthase monomer, 34 chains) in the flat journal style, each chain in the tone of its subunit (src/colours.json).
# Run from the Molecullage repo root through the lock wrapper, with the art folder of this piece:
#   MOLECULLAGE_ART=C:/.../gallery/05-atp-synthase/art py -3 -B struct/run_cx.py gallery/05-atp-synthase/src/render_atp.py [views=A,B] [sil=3.4] [size=2400]
# Views (all with the rotor axis vertical, F1 head up, the same scale):
#   A   side view, the peripheral-stalk side (chain B, subunit b) to the left, in profile
#   B   A turned 90 degrees about the vertical axis, the stalk side toward the viewer
#   Bb  the other half-turn: stalk side away from the viewer
# Output in the art folder, per view V: atp_V__full.png (colours of the figure, silhouettes), atp_V__id.png (one flat colour per chain, no silhouettes,
# no antialiasing: src/anchors.py decodes it to find which chain owns each pixel), atp_V.anchors.json (projected centroid of the C-alpha atoms of every chain,
# pixel scale), and view.json (rotation and scale). Then run  py -3 -I gallery/05-atp-synthase/src/anchors.py.
# Drawn: the 34 polymer chains as cartoon. Deleted: water, ions (Mg), the nucleotides ATP and ADP, hydrogens. Labels are not drawn here.
# Progress goes to art/render_progress.log; a failure goes to struct/last_error_render_atp.txt.
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
    from chimerax.geometry import Place

    sys.path.insert(0, os.path.join(ROOT, "struct"))
    import style as ST

    a = args(sys.argv)
    views = a.get("views", "A,B").split(",")
    sil = float(a.get("sil", ST.palette()["sil_px"]))
    PW = int(a.get("size", 2400))          # saved width; the window is 2:3, so the height is 1.5 times the width
    PH = PW * 3 // 2
    cif = (os.path.normpath(os.path.join(HERE, "..")) + "/data/pdb/9ZFT.cif").replace("\\", "/")
    COL = json.load(open(os.path.join(HERE, "colours.json"), encoding="utf-8"))
    chain_hex, chain_sub = COL["chain_colour"], COL["chain_subunit"]
    ink = ST.palette()["ink"]

    def comp(h):
        return ST.comp(h)

    def run_(c):
        return run(session, c)

    def light():
        for c in ST.light_commands():
            run_(c)

    def setup():
        for c in ("close", "set bgColor white", "windowsize 600 900", "camera ortho"):
            run_(c)
        light()

    def save(name):
        light()
        run_(f"save {ART}/{name}.png width {PW} height {PH} supersample 3 transparentBackground true".replace("\\", "/"))

    def save_id(name):
        run_("lighting flat")
        run_("lighting depthCue false; material specularReflectivity 0")
        run_("graphics silhouettes false")
        run_(f"save {ART}/{name}.png width {PW} height {PH} supersample 1 transparentBackground true".replace("\\", "/"))

    setup()
    m = run_(f"open {cif}")[0]
    run_("delete solvent; delete ions; delete :ATP,ADP; delete H")   # not "delete ligand": ChimeraX takes the nine UNK residues of chain 3 for a ligand
    run_("hide pseudobonds; label delete; hide atoms; cartoon; cartoon style protein width 2.4 thick 0.55 xsection oval")
    res_of = {}
    for r in m.residues:
        res_of.setdefault(r.chain_id, []).append(r)
    chains = {c.chain_id: c for c in m.chains}
    assert len(res_of) == 34 and set(res_of) == set(chain_hex), (len(res_of), sorted(set(res_of) ^ set(chain_hex)))
    # a chain that ChimeraX does not treat as a polymer chain (chain 3, nine UNK residues) gets no cartoon: draw its atoms as sticks in its tone
    loose = sorted(set(res_of) - set(chains))
    log(f"opened, 34 chains, {len(chains)} with a cartoon; sticks for chains {loose}")
    rep = a.get("rep", "surf")   # surf: one molecular surface per chain (default); cart: cartoon
    if rep == "surf":
        run_("hide cartoons; surface #1 probeRadius 1.4 gridSpacing 0.6; surface transparency 0")   # no "enclose": one surface per chain
        log("surfaces made")

    def ca(cid):
        return np.array([r.find_atom("CA").coord for r in res_of[cid] if r.find_atom("CA") is not None])

    for cid in loose:
        run_(f"show /{cid} atoms; style /{cid} stick; size /{cid} stickRadius 0.6")

    def sub_ca(key):
        return np.concatenate([ca(c) for c, s in chain_sub.items() if s == key])

    def paint_final():
        for cid, h in chain_hex.items():
            run_(f"color /{cid} {comp(h)} target acs")

    lv = [0, 60, 120, 180]            # id colours: three base-4 digits, so that 63 chains could be told apart after the flat-lighting gain (1.158)
    order = sorted(chains)
    id_of = {cid: i + 1 for i, cid in enumerate(order)}

    def paint_id():
        for cid, i in id_of.items():
            r, g, b = lv[i // 16 % 4], lv[i // 4 % 4], lv[i % 4]
            run_(f"color /{cid} #{round(r / ST.FLAT_GAIN):02X}{round(g / ST.FLAT_GAIN):02X}{round(b / ST.FLAT_GAIN):02X} target acs")

    # ---- rotor axis (up) from the C-alpha centroids of the c-ring and of alpha+beta; stalk side from subunit b
    c_ring = sub_ca("c").mean(0)
    f1 = np.concatenate([sub_ca("alpha"), sub_ca("beta")]).mean(0)
    up = f1 - c_ring
    up /= np.linalg.norm(up)
    cb = sub_ca("b").mean(0) - c_ring
    s = cb - (cb @ up) * up
    s /= np.linalg.norm(s)
    XA = -s                          # stalk side to the left
    ZA = np.cross(XA, up)
    frames = {"A": (XA, up, ZA), "B": (ZA, up, s), "Bb": (-ZA, up, -s)}
    allxyz = np.array([x.coord for x in m.atoms])

    def basis(v):
        X, Y, Z = frames[v]
        R = np.stack([X, Y, Z])
        r = allxyz @ R.T
        centre_model = R.T @ ((r.min(0) + r.max(0)) / 2)
        return R, centre_model, r.min(0), r.max(0)

    # one scale for all views: the largest extent of any view
    ext = [basis(v) for v in frames]
    fw = max(max(e[3][0] - e[2][0] for e in ext), max(e[3][1] - e[2][1] for e in ext) * PW / PH) * 1.04
    log(f"field width {fw:.1f} A, px per A {PW / fw:.2f}")
    out = {"views": {}}

    def px(cam, p):
        c = cam.position.inverse() * np.asarray(p)
        return [float(PW / 2 + c[0] * PW / cam.field_width), float(PH / 2 - c[1] * PH / (cam.field_width * PH / PW))]

    for v in views:
        R, centre_model, lo, hi = basis(v)
        paint_final()
        run_("graphics silhouettes true width %s color %s depthJump 0.015" % (sil, ink))
        t0 = -R @ centre_model
        m.position = Place(matrix=[[*R[0], t0[0]], [*R[1], t0[1]], [*R[2], t0[2]]])
        run_("view")
        cam = session.main_view.camera
        z = cam.position.origin()[2]
        cam.position = Place(origin=[0.0, 0.0, z])
        cam.field_width = fw
        save(f"atp_{v}__full")
        anchors = {"W": PW, "H": PH, "px_per_A": PW / fw, "field_width_A": fw}
        cents = {}
        for cid in chains:
            xyz = ca(cid)
            scene = m.position.transform_points(xyz.mean(0)[None, :])[0]
            cents[cid] = {"cent": px(cam, scene), "n_ca": int(len(xyz)), "subunit": chain_sub[cid],
                          "depth": float((m.position.transform_points(xyz.mean(0)[None, :])[0])[2])}
        anchors["chains"] = cents
        anchors["id_levels"] = lv
        anchors["id_of"] = id_of
        anchors["gain"] = ST.FLAT_GAIN
        json.dump(anchors, open(os.path.join(ART, f"atp_{v}.anchors.json"), "w"), indent=1)
        paint_id()
        save_id(f"atp_{v}__id")
        log(f"view {v} saved")
    json.dump({"fw_A": fw, "PW": PW, "PH": PH, "up": up.tolist(), "stalk_dir": s.tolist(), "sil_px": sil, "views": views}, open(os.path.join(ART, "view.json"), "w"), indent=1)
    log("done")


err = os.path.join(ROOT, "struct", "last_error_render_atp.txt")
if os.path.exists(err):
    os.remove(err)
try:
    log("start")
    main(session)  # noqa: F821  (session is injected by ChimeraX)
except BaseException:
    with open(err, "w", encoding="utf-8") as fh:
        fh.write(traceback.format_exc())
    log("FAILED, see struct/last_error_render_atp.txt")
run(session, "exit")  # noqa: F821
