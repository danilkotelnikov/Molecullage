# ChimeraX script: render groups in the flat journal style. Run through the lock wrapper from the repo root:
#   py -3 -B struct/run_cx.py struct/render.py <group> key=value ...
# Groups and their parameters (defaults can sit in structfig.json under "structures"):
#   complex   binder + antigen. entry, pdb, binder=A (or H,L: first chain is the heavy one), antigen=L, drop=B,M, cdr=<preset|h1:26-32,...>,
#             light_cdr=, contacts=<contacts.csv from struct/contacts.py>, name=<output prefix>.  Layers: full, ag, ab, inset.
#   poses     as complex; the binder moved as a rigid body to two decoy poses. Layers: native, decoy1, decoy2, ens.
#   series    noise-to-structure strip on the C-alpha atoms of one chain: pdb, binder=A, seed=7, sigma=10, t=0,0.25,0.5,0.75,1.
#             x_t = (1 - t) * eps + t * x1 with eps ~ N(0, sigma^2 I) in angstrom and x1 the centred C-alpha coordinates.
#   anatomy   one binder domain (or an Fv) with the loops up: pdb, binder=B, light=A, drop=/C, cdr=, light_cdr=. Layer: main.
#   chains    every chain by assignment: pdb, assign=A:peri,B:rose,C:palelilac,D:palepink. Layer: full.
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cx_common import *  # noqa: E402,F401,F403
import cx_common as CX  # noqa: E402

COLOURS = {"mint": MINT, "rose": ROSE, "peri": PERI, "apricot": APRICOT, "palepink": ST.comp(P["palepink"]), "palelilac": ST.comp(P["palelilac"])}


def read_contacts(path):
    import csv

    with open(path, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def paint(session, ch, binders, ag, cdr, lcdr):
    cartoon_style(session)
    cmd(session, f"color /{ag} {MINT} target c")
    color_chain(session, ch[binders[0]], ROSE, ROSE_E, cdr)
    for b in binders[1:]:
        color_chain(session, ch[b], PERI, PERI_E, lcdr)
    show_epitope(session, ag, ",".join(binders))


def residues_of(ch, ids):
    return [r for i in ids for r in ch[i].residues if r is not None]


def load(session, p, pdb=None):
    binders = p["binder"].split(",")
    m = open_clean(session, pdb or p["pdb"], "" if pdb else p.get("drop", ""))
    ch = chains_of(m)
    return m, ch, binders, p["antigen"]


def group_complex(session, p):
    name, cdr, lcdr = p["name"], ST.parse_cdr(p.get("cdr", "none")), ST.parse_cdr(p.get("light_cdr", "none"))
    setup(session)
    m, ch, binders, ag = load(session, p)
    paint(session, ch, binders, ag, cdr, lcdr)
    bres, ares = residues_of(ch, binders), residues_of(ch, [ag])
    tip = chain_residues(ch[binders[0]], cdr["h3"]) if "h3" in cdr else interface_residues(session, f"/{binders[0]}", f"/{ag}")
    m.position = orient_complex(bres, ares, tip)
    cmd(session, "view")
    cmd(session, "zoom 0.92")
    save_layer(session, name, "full")
    anchors = {}
    pos = m.position
    for k, rng in cdr.items():
        res = chain_residues(ch[binders[0]], rng)
        anchors[f"cdr_{k}"] = scene_to_px(session, tp(pos, res[len(res) // 2].find_atom("CA").coord))[0]
    anchors["antigen"] = scene_to_px(session, [np.mean(tp(pos, ca_array(ares)), axis=0)])[0]
    anchors["binder"] = scene_to_px(session, [np.mean(tp(pos, ca_array(bres)), axis=0)])[0]
    ep = interface_residues(session, f"/{ag}", f"/{','.join(binders)}")
    if ep:
        anchors["epitope"] = scene_to_px(session, [np.mean(tp(pos, ca_array(ep)), axis=0)])[0]
        anchors["epitope_n"] = len(ep)
    write_anchors(name, anchors)
    cmd(session, f"hide /{ag} cartoons; hide /{ag} atoms")
    save_layer(session, name, "ag")
    cmd(session, f"show /{ag} cartoons; hide /{','.join(binders)} cartoons; hide /{','.join(binders)} atoms")
    save_layer(session, name, "ab")
    # close-up of the interface, same orientation: loop (or interface) residues of the binder and the epitope as sticks
    cmd(session, f"show /{','.join(binders)} cartoons")
    show_epitope(session, ag, ",".join(binders))
    rows = read_contacts(p["contacts"]) if p.get("contacts") else []
    if rows:
        byres = {(r.chain_id, r.number): r for r in m.residues}
        keys = {(r["binder_chain"], int(r["binder_num"])) for r in rows} | {(r["antigen_chain"], int(r["antigen_num"])) for r in rows}
        for c, n in sorted(keys):
            colour = APRICOT_E if c == ag else ROSE_E
            s = f"/{c}:{n}"
            cmd(session, f"show {s} atoms; style {s} stick; size {s} stickRadius 0.22; color {s} & C {colour} target a")
        hb = [r for r in rows if r.get("hb_binder_atom") and r.get("hb_antigen_atom")]
        pbg = m.pseudobond_group("hydrogen bonds", create_type="normal")
        for r in hb:
            a = byres[(r["binder_chain"], int(r["binder_num"]))].find_atom(r["hb_binder_atom"])
            b = byres[(r["antigen_chain"], int(r["antigen_num"]))].find_atom(r["hb_antigen_atom"])
            if a is not None and b is not None:
                pb = pbg.new_pseudobond(a, b)
                pb.color = [10, 10, 10, 255]
                pb.radius = 0.14
        pbg.dashes = 6
        focus = f"{' '.join(f'/{c}:{n}' for c, n in sorted(keys))}"
    else:
        sel = spec(binders[0], tip)
        cmd(session, f"show {sel} atoms; style {sel} stick; size {sel} stickRadius 0.22; color {sel} & C {ROSE_E} target a")
        focus = f"{sel} | (/{ag} & (/{binders[0]} :<{EPITOPE_A}))"
    cmd(session, f"view {focus}")
    cmd(session, "zoom 1.1")
    save_layer(session, name, "inset")
    inset = {}
    for r in rows:
        for c, n in ((r["binder_chain"], int(r["binder_num"])), (r["antigen_chain"], int(r["antigen_num"]))):
            inset[f"ca_{c}_{n}"] = scene_to_px(session, tp(pos, byres[(c, n)].find_atom("CA").coord))[0]
    for r in rows:
        if r.get("hb_binder_atom") and r.get("hb_antigen_atom"):
            k = f"{r['binder_num']}_{r['antigen_num']}"
            inset[f"hbv_{k}"] = scene_to_px(session, tp(pos, byres[(r["binder_chain"], int(r["binder_num"]))].find_atom(r["hb_binder_atom"]).coord))[0]
            inset[f"hbl_{k}"] = scene_to_px(session, tp(pos, byres[(r["antigen_chain"], int(r["antigen_num"]))].find_atom(r["hb_antigen_atom"]).coord))[0]
    write_anchors(f"{name}_inset", inset)


def displaced_pdb(session, p, tag, axis, angle_deg, shift):
    """Write a PDB in which the binder chains are moved as a rigid body about the centre of the interface residues (decoy pose)."""
    cmd(session, "close")
    m, ch, binders, ag = load(session, p)
    atoms = m.residues.atoms
    sel = atoms.filter(np.array([a.residue.chain_id in binders for a in atoms]))
    xyz = sel.coords
    c = ca_array(interface_residues(session, f"/{binders[0]}", f"/{ag}")).mean(0)
    a = np.asarray(axis, float)
    a /= np.linalg.norm(a)
    th = np.deg2rad(angle_deg)
    K = np.array([[0, -a[2], a[1]], [a[2], 0, -a[0]], [-a[1], a[0], 0]])
    Rm = np.eye(3) + np.sin(th) * K + (1 - np.cos(th)) * K @ K
    sel.coords = (xyz - c) @ Rm.T + c + np.asarray(shift, float)
    path = f"{TMP}/{tag}.pdb"
    cmd(session, f"save {path} models #1")
    return path


def group_poses(session, p):
    name, cdr, lcdr = p["name"], ST.parse_cdr(p.get("cdr", "none")), ST.parse_cdr(p.get("light_cdr", "none"))
    setup(session)
    m, ch, binders, ag = load(session, p)
    bres, ares = residues_of(ch, binders), residues_of(ch, [ag])
    tip = chain_residues(ch[binders[0]], cdr["h3"]) if "h3" in cdr else interface_residues(session, f"/{binders[0]}", f"/{ag}")
    place = orient_complex(bres, ares, tip)
    inv = place.inverse()
    ax_x, ax_up, ax_z = (inv.transform_vector(v) for v in ([1, 0, 0], [0, 1, 0], [0, 0, 1]))
    variants = {"native": None, "decoy1": displaced_pdb(session, p, "decoy1", ax_z, 28, ax_up * 4.0),
                "decoy2": displaced_pdb(session, p, "decoy2", ax_up, -35, ax_x * 6.0 + ax_z * 3.0)}
    fixed = None
    for vname, path in variants.items():
        setup(session)
        m, ch, binders, ag = load(session, p, path)
        paint(session, ch, binders, ag, cdr, lcdr)
        m.position = place
        if fixed is None:
            cmd(session, "view")
            cmd(session, "zoom 0.78")
            fixed = (session.main_view.camera.position, session.main_view.camera.field_width)
        else:
            session.main_view.camera.position, session.main_view.camera.field_width = fixed
        save_layer(session, name, vname)
    setup(session)
    m, ch, binders, ag = load(session, p)
    paint(session, ch, binders, ag, cdr, lcdr)
    m.position = place
    for k, vname in enumerate(("decoy1", "decoy2")):
        mk, chk, bk, agk = load(session, p, variants[vname])
        cmd(session, f"delete #{k + 2}/{agk}")
        cartoon_style(session)
        color_chain(session, chk[bk[0]], ROSE, ROSE_E, cdr)
        mk.position = place
        cmd(session, f"transparency #{k + 2} 55 target c")
    session.main_view.camera.position, session.main_view.camera.field_width = fixed
    save_layer(session, name, "ens")


def group_series(session, p):
    name, seed, sigma = p["name"], int(p.get("seed", 7)), float(p.get("sigma", 10.0))
    ts = [float(x) for x in str(p.get("t", "0,0.25,0.5,0.75,1")).split(",")]
    chain = p["binder"]
    setup(session)
    open_clean(session, p["pdb"])
    cmd(session, f"delete ~/{chain}")
    m = [x for x in session.models if hasattr(x, "atoms")][0]
    res = [r for r in m.residues if r.find_atom("CA") is not None]
    x1 = np.array([r.find_atom("CA").coord for r in res])
    names, nums = [r.name for r in res], [r.number for r in res]   # read now: close deletes the residues
    mean = x1.mean(0)
    x1 = x1 - mean
    eps = np.random.default_rng(seed).normal(size=x1.shape) * sigma
    _, _, vt = np.linalg.svd(x1, full_matrices=False)
    R = vt.copy()
    if np.linalg.det(R) < 0:
        R[2] *= -1
    place0 = Place(matrix=[[*R[0], 0], [*R[1], 0], [*R[2], 0]])
    t_full = -R @ mean
    place_full = Place(matrix=[[*R[0], t_full[0]], [*R[1], t_full[1]], [*R[2], t_full[2]]])

    def write_pdb(path, xyz):
        lines = ["ATOM  %5d  CA  %3s A%4d    %8.3f%8.3f%8.3f  1.00  0.00           C" % (i, n, num % 10000, *c) for i, (n, num, c) in enumerate(zip(names, nums, xyz), 1)]
        open(path, "w").write(chr(10).join(lines + ["END"]) + chr(10))

    fixed = None
    for i, t in enumerate(ts):
        cmd(session, "close")
        if t < 1.0:
            path = f"{TMP}/frame_{i}.pdb"
            write_pdb(path, (1 - t) * eps + t * x1)
            cmd(session, f"open {path}")
            mm = [x for x in session.models if hasattr(x, "atoms")][0]
            mm.position = place0
            cmd(session, "hide cartoons; hide pseudobonds; hide bonds; show @CA atoms; style sphere; size atomRadius 0.95")
            cmd(session, f"color @CA {ROSE} target a")
        else:
            mm = open_clean(session, p["pdb"])
            cmd(session, f"delete ~/{chain}; delete ~protein; hide atoms")
            cmd(session, "cartoon; cartoon style protein width 2.4 thick 0.55 xsection oval")
            cmd(session, f"color /{chain} {ROSE_MID} target c; transparency /{chain} 45 target c")
            cmd(session, "cartoon suppressBackboneDisplay false")
            cmd(session, f"show @CA atoms; style sphere; size atomRadius 0.95; color @CA {ROSE} target a")
            mm.position = place_full
        if fixed is None:
            cmd(session, "view")
            cmd(session, "zoom 0.8")
            fixed = (session.main_view.camera.position, session.main_view.camera.field_width)
        else:
            session.main_view.camera.position, session.main_view.camera.field_width = fixed
        save_layer(session, name, f"t{i}")
    write_anchors(name, {"t": ts, "seed": seed, "sigma_A": sigma})


def group_anatomy(session, p):
    name, cdr, lcdr = p["name"], ST.parse_cdr(p.get("cdr", "none")), ST.parse_cdr(p.get("light_cdr", "none"))
    setup(session)
    m = open_clean(session, p["pdb"], p.get("drop", ""))
    ch = chains_of(m)
    cartoon_style(session)
    heavy = ch[p["binder"]]
    color_chain(session, heavy, ROSE, ROSE_E, cdr)
    fw = [r for r in heavy.residues if r is not None]
    loops = [r for rng in cdr.values() for r in chain_residues(heavy, rng)]
    if p.get("light"):
        light = ch[p["light"]]
        color_chain(session, light, PERI, PERI_E, lcdr)
        fw += [r for r in light.residues if r is not None]
        loops += [r for rng in lcdr.values() for r in chain_residues(light, rng)]
    m.position = orient_cdr_up(fw, loops)
    cmd(session, "view")
    cmd(session, "zoom 0.92")
    save_layer(session, name, "main")
    pos, anch = m.position, {}
    for c, d in ((heavy, cdr), (ch.get(p.get("light", "")), lcdr)):
        for k, rng in d.items():
            res = chain_residues(c, rng)
            anch[f"cdr_{k}"] = scene_to_px(session, tp(pos, res[len(res) // 2].find_atom("CA").coord))[0]
    write_anchors(name, anch)


def group_chains(session, p):
    name = p["name"]
    assign = dict(x.split(":") for x in p["assign"].split(","))
    setup(session)
    m = open_clean(session, p["pdb"], p.get("drop", ""))
    cartoon_style(session)
    for c, colour in assign.items():
        cmd(session, f"color /{c} {COLOURS[colour]} target c")
    ca = ca_array([r for r in m.residues])
    c0 = ca - ca.mean(0)
    _, _, vt = np.linalg.svd(c0, full_matrices=False)
    R = vt.copy()
    if np.linalg.det(R) < 0:
        R[2] *= -1
    m.position = CX._place(R, ca.mean(0))
    cmd(session, "view")
    cmd(session, "zoom 0.92")
    save_layer(session, name, "full")
    write_anchors(name, {})


GROUPS = {"complex": group_complex, "poses": group_poses, "series": group_series, "anatomy": group_anatomy, "chains": group_chains}
run_main(session, GROUPS, sys.argv, "render")  # noqa: F821  (session is injected by ChimeraX)
