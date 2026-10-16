# Helpers for the ChimeraX render scripts (flat journal style, colours from the token file). Imported by render.py:
#   import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from cx_common import *
# Run through the lock wrapper (a ChimeraX window opens; --offscreen has no OpenGL on Windows):
#   py -3 -B struct/run_cx.py struct/render.py complex entry=1MEL pdb=data/pdb/1MEL.pdb binder=A antigen=L drop=B,M cdr=1mel_vhh
# Output: <art>/<name>__<layer>.png (transparent, 2400 x 1800, one shared camera per group) and <art>/<name>.anchors.json
# (pixel anchors on the full canvas). struct/trim.py crops all layers of a group to one box and writes index.<name>.json.
# CDR loops are taken by sequence index (position in the chain). The epitope is every antigen residue with any atom within
# EPITOPE_A angstrom of the binder.
import json
import os
import sys
import tempfile

import numpy as np
from chimerax.core.commands import run
from chimerax.geometry import Place

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import style as ST  # noqa: E402

P = ST.palette()
W, H, EPITOPE_A = ST.W, ST.H, ST.EPITOPE_A
OUT = str(ST.art_dir())
os.makedirs(OUT, exist_ok=True)
TMP = tempfile.mkdtemp().replace("\\", "/")
MINT, ROSE, ROSE_E, PERI, PERI_E = (ST.comp(P[k]) for k in ("mint", "rose", "rose_e", "peri", "peri_e"))
APRICOT, APRICOT_E = ST.comp(P["apricot"]), ST.comp(P["apricot_e"])
ROSE_MID = ST.comp(ST.mix(P["rose"], P["rose_e"], 0.45))   # tint of the transparent cartoon in the noise series


def cmd(session, text):
    return run(session, text)


def setup(session):
    for c in ST.setup_commands(P):
        cmd(session, c)


def set_light(session):
    for c in ST.light_commands(P):
        cmd(session, c)


def chain_residues(chain, rng):
    a, b = rng
    return [r for r in chain.residues[a - 1:b] if r is not None]


def spec(chain_id, residues):
    return " ".join(f"/{chain_id}:{r.number}{r.insertion_code}" for r in residues)


def ca_array(residues):
    return np.array([r.find_atom("CA").coord for r in residues if r is not None and r.find_atom("CA") is not None])


def open_clean(session, path, drop=""):
    m = cmd(session, f"open {path}")[0]
    if drop:
        cmd(session, f"delete /{drop.lstrip('/')}")   # drop is a chain list such as B,M (no leading slash: Git Bash rewrites those)
    cmd(session, "delete solvent; delete ligand; delete ions; delete H")
    # ChimeraX draws the gaps of a model as dashed "missing structure" pseudobonds with a label such as "6 residues". That text would be baked into the PNG.
    cmd(session, "hide pseudobonds; label delete")
    return m


def chains_of(m):
    return {c.chain_id: c for c in m.chains}


def color_chain(session, chain, fill, edge, cdrs):
    cmd(session, f"color /{chain.chain_id} {fill} target c")
    for rng in cdrs.values():
        cmd(session, f"color {spec(chain.chain_id, chain_residues(chain, rng))} {edge} target c")


def cartoon_style(session):
    cmd(session, "hide atoms; cartoon; cartoon style protein width 2.4 thick 0.55 xsection oval")


def show_epitope(session, ag_id, binder_ids):
    cmd(session, f"select (/{ag_id} & (/{binder_ids} :<{EPITOPE_A})) & protein")
    cmd(session, f"color sel {APRICOT} target c; show sel atoms; style sel stick; size sel stickRadius 0.22; color sel & C {APRICOT_E} target a; ~select")


def _place(R, centre):
    t0 = -R @ centre
    return Place(matrix=[[*R[0], t0[0]], [*R[1], t0[1]], [*R[2], t0[2]]])


def orient_complex(binder_res, antigen_res, tip_res):
    """Antigen on the left, binder on the right; the tip (CDR3 or the interface residues) faces the antigen; framework above."""
    cab, cag, ct = ca_array(binder_res), ca_array(antigen_res), ca_array(tip_res)
    x = cab.mean(0) - cag.mean(0)
    x /= np.linalg.norm(x)
    up = cab.mean(0) - ct.mean(0)
    up -= up.dot(x) * x
    up /= np.linalg.norm(up)
    R = np.stack([x, up, np.cross(x, up)])
    return _place(R, np.concatenate([cab, cag]).mean(0))


def orient_cdr_up(fw_res, cdr_res):
    """Anatomy view: the CDR loops point up; the first principal axis of the domain lies along x."""
    cf, cc = ca_array(fw_res), ca_array(cdr_res)
    up = cc.mean(0) - cf.mean(0)
    up /= np.linalg.norm(up)
    allca = np.concatenate([cf, cc]) - np.concatenate([cf, cc]).mean(0)
    _, _, vt = np.linalg.svd(allca - np.outer(allca @ up, up), full_matrices=False)
    x = vt[0] - vt[0].dot(up) * up
    x /= np.linalg.norm(x)
    R = np.stack([x, up, np.cross(x, up)])
    return _place(R, np.concatenate([cf, cc]).mean(0))


def interface_residues(session, a_spec, b_spec):
    """Residues of a_spec within EPITOPE_A of b_spec, as Residue objects (model coordinates)."""
    cmd(session, f"select ({a_spec} & ({b_spec} :<{EPITOPE_A})) & protein")
    res = list(session.selection.items("residues")[0]) if session.selection.items("residues") else []
    cmd(session, "~select")
    return res


def tp(pos, pts):
    """Model coordinates -> scene coordinates through a Place."""
    return pos.transform_points(np.atleast_2d(np.asarray(pts, float)))


def scene_to_px(session, pts):
    """Scene coordinates -> pixels of the saved W x H image (orthographic camera, horizontal field of view fixed)."""
    cam = session.main_view.camera
    inv = cam.position.inverse()
    scale = W / cam.field_width
    out = []
    for p in pts:
        c = inv * np.asarray(p)
        out.append([float(W / 2 + c[0] * scale), float(H / 2 - c[1] * scale)])
    return out


def save_layer(session, name, layer):
    set_light(session)
    cmd(session, ST.save_command(f"{OUT}/{name}__{layer}.png"))


def write_anchors(name, data):
    data["canvas"] = [W, H]
    with open(os.path.join(OUT, f"{name}.anchors.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1)


def run_main(session, groups, argv, stem):
    """Entry point of a render script: run the group named in argv, write last_error_<stem>.txt on failure, always exit."""
    import traceback

    err = os.path.join(HERE, f"last_error_{stem}.txt")
    if os.path.exists(err):
        os.remove(err)
    group, kv = ST.parse_args(argv[1:])
    try:
        if group not in groups:
            raise SystemExit(f"unknown group {group!r}; groups: {', '.join(groups)}")
        groups[group](session, ST.group_params(group, kv))
    except BaseException:
        with open(err, "w", encoding="utf-8") as f:
            f.write(traceback.format_exc())
    run(session, "exit")
