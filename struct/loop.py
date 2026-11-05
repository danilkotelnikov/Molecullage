# ChimeraX script: a looping animation of one structure (or two, for a morph) as a PNG sequence in the flat journal style.
# Run through the lock wrapper from the repo root (deck/mol.mjs does this):
#   py -3 -B struct/run_cx.py struct/loop.py loop name=mel pdb=tmp/mel.pdb motion=rotate frames=90 size=960x720 framesdir=tmp/mel-frames map=A:rose,L:mint
# motion:  rotate     a full turn about the vertical axis
#          highlight  the residues of target= as sticks, the structure swinging 35 degrees either way
#          pocket     zoom to target=, swing 25 degrees either way around it, zoom back out
#          morph      pdb= to to= (a second conformation of the same chains), there and back
# target= is chain:residues joined with +, for example A:99-122+L:30. map= is chain:family, families rose mint peri apricot palepink palelilac.
# Writes <framesdir>/f0000.png ... on a white background, same camera for every frame. The last frame is one step before the first, so the loop closes.
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cx_common import *  # noqa: E402,F401,F403
import cx_common as CX  # noqa: E402
from chimerax.geometry import Place, rotation  # noqa: E402

FAMILIES = {"mint": MINT, "rose": ROSE, "peri": PERI, "apricot": APRICOT, "palepink": ST.comp(P["palepink"]), "palelilac": ST.comp(P["palelilac"])}
ORDER = ["rose", "mint", "peri", "apricot"]


def spec_of(target):
    """A:99-122+L:30 -> '/A:99-122 /L:30'"""
    return " ".join("/" + part for part in target.split("+"))


def frame(session, fdir, i, w, h):
    set_light(session)
    cmd(session, f"save {fdir}/f{i:04d}.png width {w} height {h} supersample 3 transparentBackground false")


def smooth(u):
    return u * u * (3 - 2 * u)


def paint(session, m, mapping):
    cartoon_style(session)
    for k, c in enumerate(m.chains):
        fam = mapping.get(c.chain_id) or ORDER[k % len(ORDER)]
        cmd(session, f"color /{c.chain_id} {FAMILIES[fam]} target c")


def group_loop(session, p):
    n = int(p.get("frames", 90))
    w, h = (int(x) for x in p.get("size", "960x720").split("x"))
    fdir = p["framesdir"]
    os.makedirs(fdir, exist_ok=True)
    mapping = dict(x.split(":") for x in p["map"].split(",")) if p.get("map") else {}
    motion = p.get("motion", "rotate")
    setup(session)
    cmd(session, f"windowsize 900 {round(900 * h / w)}")
    m = open_clean(session, p["pdb"], p.get("drop", ""))
    if motion == "morph":
        m2 = open_clean(session, p["to"], p.get("drop", ""))
        cmd(session, f"matchmaker #{m2.id_string} to #{m.id_string}")
    paint(session, m, mapping)
    if motion == "morph":
        paint(session, m2, mapping)
        cmd(session, f"morph #{m.id_string} #{m2.id_string} frames {n // 2} play false")
        mid = [x for x in session.models if x not in (m, m2) and getattr(x, "num_coordsets", 1) > 1][0]
        cmd(session, f"hide #{m.id_string},{m2.id_string} models")
    cmd(session, f"cofr #{mid.id_string if motion == 'morph' else m.id_string}")
    cmd(session, "view")
    cmd(session, "zoom 0.92")
    cam = session.main_view.camera
    tgt = spec_of(p["target"]) if p.get("target") else None
    if tgt and motion in ("highlight", "pocket"):
        cmd(session, f"show {tgt} atoms; style {tgt} stick; size {tgt} stickRadius 0.22; color {tgt} {APRICOT} target c; color {tgt} & C {APRICOT_E} target a")

    if motion == "rotate":
        for i in range(n):
            frame(session, fdir, i, w, h)
            cmd(session, f"turn y {360.0 / n}")
    elif motion == "highlight":
        amp = 35.0
        cmd(session, f"turn y {-amp * math.sin(0)}")
        for i in range(n):
            frame(session, fdir, i, w, h)
            cmd(session, f"turn y {amp * (math.sin(2 * math.pi * (i + 1) / n) - math.sin(2 * math.pi * i / n))}")
    elif motion == "pocket":
        # Only ChimeraX's own view command moves the camera: it keeps the near and far planes right, which setting the camera by hand did not.
        # `view target pad f` fits the target with a border of fraction f, so the field width is T / (1 - f); the zoom runs through f.
        fw0 = cam.field_width
        cmd(session, f"view {tgt} pad 0")
        tw = cam.field_width
        pad_end = 0.25
        fw1 = tw / (1 - pad_end)
        a, b, amp = int(n * 0.3), int(n * 0.7), 25.0
        yaw_prev = 0.0
        for i in range(n):
            if i < a:
                u, yaw = smooth(i / a), 0.0
            elif i < b:
                u, yaw = 1.0, amp * math.sin(2 * math.pi * (i - a) / (b - a))   # swing: starts and ends at rest, so the loop closes
            else:
                u, yaw = smooth(1 - (i - b) / (n - b)), 0.0
            fw = fw0 + (fw1 - fw0) * u
            cmd(session, f"turn y {yaw - yaw_prev:.5f} center {tgt}")
            yaw_prev = yaw
            cmd(session, f"view {tgt} pad {max(0.0, 1 - tw / fw):.5f}")
            frame(session, fdir, i, w, h)
    elif motion == "morph":
        half = n // 2
        for i in range(n):
            j = i if i <= half else n - i
            cmd(session, f"coordset #{mid.id_string} {min(j, mid.num_coordsets - 1) + 1}")
            frame(session, fdir, i, w, h)
    else:
        raise SystemExit(f"unknown motion {motion!r}")


run_main(session, {"loop": group_loop}, sys.argv, "loop")  # noqa: F821  (session is injected by ChimeraX)
