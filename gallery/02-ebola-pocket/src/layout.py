"""Layout of gallery piece 02-ebola-pocket. Every position on the page is computed here and written to page/data.js; the page only draws it and re-checks it.

    py -3 -I gallery/02-ebola-pocket/src/layout.py

Inputs: src/contacts.json (pocket_contacts.py), src/ligand2d.json (ligand2d.py), art/index.pocket.json and art/index.overview.json (struct/trim.py after
src/render_pocket.py). Output: page/data.js (window.DATA, millimetres, origin top-left: x to the right, t downward).

One tile per contact residue (name, number, chain), the same tiles in both panels, on a frame around the picture, slots on a fixed pitch. Every tile has exactly
one line, in the style of its interaction (hydrogen bond dashed, cation-pi thick, hydrophobic thin, polar only dotted).
Panel b (2D): the line runs from the tile to an inhibitor atom the residue touches: N15 for the hydrogen bond, the ring centre for the cation-pi, N39 for the
polar contact, and for a hydrophobic contact a carbon atom that makes a carbon-carbon pair with the residue (contacts.json, cc_lig_atoms).
Panel a (3D): the line runs from the tile to an atom of the residue that touches the inhibitor (the closest one unless it is hidden or too near another end).
The three special tiles continue in the same line from that atom to the inhibitor end point (N15, ring centre, N39), as in panel b.
Tile slots and end atoms are chosen together by simulated annealing (fixed seed): short lines, no crossing, ends at least 1.5 mm apart, no line over an
atom label, as few crossings of the skeleton bonds as possible. The page checks these again.
"""
from __future__ import annotations

import json
import math
import random
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
C = json.loads((HERE / "contacts.json").read_text(encoding="utf-8"))
L2 = json.loads((HERE / "ligand2d.json").read_text(encoding="utf-8"))
RES = C["residues"]
rid = lambda r: f"{r['chain']}{r['num']}"
TILE_W, TILE_H = 13.0, 3.7
PAGE_H = 141.5
BOX_A = (1.5, 10.5, 86.0, 90.0)   # x, t, w, h
BOX_B = (91.0, 10.5, 85.5, 90.0)
MIN_DOT = 1.5                     # mm between two end points

HB = {(h["chain"], h["num"]): h for h in C["hbond_candidates"] if h["accepted"]}
CP: dict = {}
for c in C["cation_pi"]:
    k = (c["chain"], c["num"])
    if k not in CP or c["dist"] < CP[k]["dist"]:
        CP[k] = c


def kind_of(r) -> str:
    k = (r["chain"], r["num"])
    if k in HB:
        return "hbond"
    if k in CP:
        return "cation_pi"
    return "contact" if "hydrophobic" in r["types"] else "polar"


KIND = [kind_of(r) for r in RES]


def seg_cross(p, q, r, s) -> bool:
    """Proper intersection of segments pq and rs (a shared end point does not count)."""
    def o(a, b, c):
        return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    return o(r, s, p) * o(r, s, q) < 0 and o(p, q, r) * o(p, q, s) < 0


def exit_point(s):
    """Where a line leaves a tile of this slot: the middle of the edge that faces the picture."""
    return {"L": (s["x"] + TILE_W, s["ct"]), "R": (s["x"], s["ct"]), "T": (s["cx"], s["t"] + TILE_H), "B": (s["cx"], s["t"])}[s["side"]]


def make_slots(box, left, right, top, bottom, band_top=0.0, pitch_v=TILE_H + 1.05, gap_h=1.2):
    """Slots of a frame: `left`/`right` tiles per side column (centred below band_top), `top`/`bottom` per row."""
    x0, t0, pw, ph = box
    slots = []
    avail_top, avail_bot = t0 + band_top, t0 + ph
    for n, xx, side in ((left, x0, "L"), (right, x0 + pw - TILE_W, "R")):
        span = n * pitch_v - (pitch_v - TILE_H)
        c0 = avail_top + (avail_bot - avail_top - span) / 2
        slots += [dict(x=xx, t=c0 + i * pitch_v, side=side) for i in range(n)]
    pitch_h = TILE_W + gap_h
    inner0, inner1 = x0 + TILE_W + 1.6, x0 + pw - TILE_W - 1.6
    for row, n, tt in (("T", top, t0), ("B", bottom, t0 + ph - TILE_H)):
        if n:
            span = n * pitch_h - gap_h
            r0 = inner0 + (inner1 - inner0 - span) / 2
            slots += [dict(x=r0 + i * pitch_h, t=tt, side=row) for i in range(n)]
    for s in slots:
        s["cx"], s["ct"] = s["x"] + TILE_W / 2, s["t"] + TILE_H / 2
    return slots


def seg_point_dist(p, a, b):
    """Distance from point p to segment ab (plain floats: this runs inside the search loop)."""
    ax, ay = a
    dx, dy = b[0] - ax, b[1] - ay
    dd = dx * dx + dy * dy
    u = 0.0 if dd < 1e-12 else max(0.0, min(1.0, ((p[0] - ax) * dx + (p[1] - ay) * dy) / dd))
    return math.hypot(p[0] - (ax + u * dx), p[1] - (ay + u * dy))


def anneal(n, slots, cands, cost, seed, iters, restarts=4):
    """State: residue i -> (slot j, candidate index c). cands[i] is the list of its possible end choices. cost(state) -> (score, info). Best of several runs."""
    m = len(slots)
    gbest = None
    for rs in range(restarts):
        rnd = random.Random(seed * 100 + rs)
        order = list(range(m))
        rnd.shuffle(order)
        state = {i: (order[i], 0) for i in range(n)}
        cs = cost(state)
        best, bs = dict(state), cs
        free = [j for j in range(m) if j not in {v[0] for v in state.values()}]
        for it in range(iters):
            temp = 10.0 * (1 - it / iters) + 0.05
            new = dict(state)
            i = rnd.randrange(n)
            r = rnd.random()
            fr = None
            if r < 0.3 and len(cands[i]) > 1:
                new[i] = (state[i][0], rnd.randrange(len(cands[i])))
            elif r < 0.5 and free:
                fr = rnd.randrange(len(free))
                new[i] = (free[fr], state[i][1])
            else:
                i2 = rnd.randrange(n)
                if i2 == i:
                    continue
                new[i], new[i2] = (state[i2][0], state[i][1]), (state[i][0], state[i2][1])   # swap the slots, each residue keeps its own end choice
            sc = cost(new)
            if sc[0] < cs[0] or rnd.random() < math.exp((cs[0] - sc[0]) / temp):
                if fr is not None:
                    free[fr] = state[i][0]
                state, cs = new, sc
                if cs[0] < bs[0]:
                    best, bs = dict(state), cs
        if gbest is None or bs[0] < gbest[1][0]:
            gbest = (best, bs)
    return gbest


def crossings(polys):
    """Number of crossings between segments of different polylines."""
    segs = [[(p[k], p[k + 1]) for k in range(len(p) - 1)] for p in polys]
    n = 0
    for a in range(len(segs)):
        for b in range(a + 1, len(segs)):
            n += sum(1 for s in segs[a] for t in segs[b] if seg_cross(s[0], s[1], t[0], t[1]))
    return n


def dot_violations(dots):
    """dots: list of (owner, (x, t)). Pairs of different owners closer than MIN_DOT."""
    n = 0
    for a in range(len(dots)):
        for b in range(a + 1, len(dots)):
            if dots[a][0] != dots[b][0] and math.dist(dots[a][1], dots[b][1]) < MIN_DOT:
                n += 1
    return n


def place_label(seg, pts, segs, box, rects, boxes, w=5.6, h=3.0):
    """Centre of a small distance label beside a segment. Not over a tile (rects), another label (boxes), an end dot (pts) or another line (segs);
    as near to its own segment as the free space allows."""
    a, b = np.array(seg[0], float), np.array(seg[1], float)
    d = (b - a) / max(np.linalg.norm(b - a), 1e-9)
    nrm = np.array([-d[1], d[0]])
    best = None
    for mult in (1.0, 1.5, 2.2, 3.2):
        off = (abs(nrm[0]) * w / 2 + abs(nrm[1]) * h / 2 + 0.7) * mult
        for fr in (0.5, 0.35, 0.65, 0.2, 0.8):
            for sg in (1, -1):
                c = a + (b - a) * fr + sg * nrm * off
                x0, x1, t0, t1 = c[0] - w / 2, c[0] + w / 2, c[1] - h / 2, c[1] + h / 2
                if not (box[0] < x0 and x1 < box[0] + box[2] and box[1] < t0 and t1 < box[1] + box[3]):
                    continue
                if any(x0 < r[0] + r[2] and r[0] < x1 and t0 < r[1] + r[3] and r[1] < t1 for r in rects):
                    continue
                if any(x0 < q[0] + q[2] / 2 + w / 2 and q[0] - q[2] / 2 - w / 2 < x1 and t0 < q[1] + q[3] / 2 + h / 2 and q[1] - q[3] / 2 - h / 2 < t1 for q in boxes):
                    continue
                if any(x0 - q[2] < q[0] < x1 + q[2] and t0 - q[2] < q[1] < t1 + q[2] for q in pts):   # q = (x, t, margin)
                    continue
                # a segment of another line through the label box
                hit = False
                for s_ in segs:
                    if s_ == seg:
                        continue
                    if any(seg_point_dist((x, t), s_[0], s_[1]) < 0.5 for x in (x0, c[0], x1) for t in (t0, c[1], t1)):
                        hit = True
                        break
                if hit:
                    continue
                if best is None:
                    best = (c, mult)
        if best is not None:
            break
    if best is None:
        raise SystemExit("no free place for a distance label")
    boxes.append((float(best[0][0]), float(best[0][1]), w, h))
    return [round(float(best[0][0]), 3), round(float(best[0][1]), 3)]


# ------------------------------------------------------------------------------------------------------------------ panel b: the 2D diagram
def skeleton(bl, centre, phi_deg):
    """Atoms rotated by phi and scaled to bl mm per bond. Rotation only: a mirror image would swap the wedge and hash bonds."""
    A = {a["name"]: np.array([a["x"], a["y"]]) for a in L2["atoms"]}
    ph = math.radians(phi_deg)
    Rm = np.array([[math.cos(ph), -math.sin(ph)], [math.sin(ph), math.cos(ph)]])
    P = {k: Rm @ v for k, v in A.items()}
    xs = np.array([v[0] for v in P.values()]); ys = np.array([v[1] for v in P.values()])
    cx0, cy0 = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
    return {k: np.array([centre[0] + (v[0] - cx0) * bl, centre[1] - (v[1] - cy0) * bl]) for k, v in P.items()}, (xs.max() - xs.min()) * bl, (ys.max() - ys.min()) * bl


def best_phi():
    """Rotation that makes the skeleton as tall and narrow as possible (the panel is taller than wide)."""
    A = np.array([[a["x"], a["y"]] for a in L2["atoms"]])
    best = (0, -1.0)
    for deg in range(0, 180, 2):
        ph = math.radians(deg)
        Q = A @ np.array([[math.cos(ph), -math.sin(ph)], [math.sin(ph), math.cos(ph)]]).T
        ratio = (Q[:, 1].max() - Q[:, 1].min()) / (Q[:, 0].max() - Q[:, 0].min())
        if ratio > best[1]:
            best = (deg, ratio)
    return float(best[0])


def label_of(a):
    """Text drawn for an atom (None for a plain carbon) and the radius, mm, that bonds and lines keep clear of its centre."""
    if a["element"] == "C":
        return None, 0.0
    if a["element"] == "Cl":
        return "Cl", 2.1
    if a["h"] > 0:
        return a["element"] + "H" * min(a["h"], 1), 2.1
    return a["element"], 1.5


def build_panel_b(box=BOX_B, bl=4.8):
    x0, t0, pw, ph = box
    sk, sw, sh = skeleton(bl, (x0 + pw / 2, t0 + ph / 2 - 1.0), best_phi())
    ainfo = {a["name"]: a for a in L2["atoms"]}
    lab = {n: label_of(a) for n, a in ainfo.items()}
    slots = make_slots(box, 8, 8, 4, 4)
    bonds = [(b["a"], b["b"]) for b in L2["bonds"]]
    names = list(sk)
    Q = np.array([sk[n] for n in names])
    is_label = np.array([lab[n][0] is not None for n in names])
    n = len(RES)

    # end choices of each tile
    cands = []
    for i, r in enumerate(RES):
        k = (r["chain"], r["num"])
        if KIND[i] == "hbond":
            cands.append([HB[k]["lig_atom"]])
        elif KIND[i] == "cation_pi":
            cands.append(["ring:" + ",".join(CP[k]["ring"])])
        elif KIND[i] == "polar":
            cands.append(sorted(r["lig_atoms"], key=lambda a: -r["lig_atoms"][a]))
        else:
            cands.append(list(r["cc_lig_atoms"]))   # carbons with a carbon-carbon pair to this residue

    def end_pos(an, ex):
        """(centre of the target, where the line ends): the line stops short of a labelled atom."""
        if an.startswith("ring:"):
            c = np.mean([sk[x] for x in an[5:].split(",")], axis=0)
            return c, c
        c = sk[an]
        rad = lab[an][1]
        if rad:
            u = (np.array(ex) - c) / np.linalg.norm(np.array(ex) - c)
            return c, c + u * (rad + 0.2)
        return c, c

    memo = {}

    def line_info(i, j, ci):
        """Everything that depends on one line only: its end, and its own cost (length, skeleton crossings, runs over atoms)."""
        key = (i, j, ci)
        if key not in memo:
            an = cands[i][ci]
            ex = exit_point(slots[j])
            c, e = end_pos(an, ex)
            e = (float(e[0]), float(e[1]))
            skip = {(u, v) for u, v in bonds if an.startswith("ring:") and u in an[5:].split(",") and v in an[5:].split(",")}
            skel = sum(1 for u, v in bonds if (u, v) not in skip and an not in (u, v) and seg_cross(ex, e, sk[u], sk[v]))
            a_, d = np.array(ex), np.array(e) - np.array(ex)
            u_ = np.clip(((Q - a_) @ d) / max(d @ d, 1e-9), 0, 1)
            dist = np.linalg.norm(Q - (a_ + u_[:, None] * d), axis=1)
            own = np.array([an == nm or (an.startswith("ring:") and nm in an[5:].split(",")) for nm in names])
            near = 40.0 * np.sum((dist < 2.4) & is_label & ~own) + 12.0 * np.sum((dist < 0.9) & ~is_label & ~own)
            memo[key] = (ex, e, an, c, math.dist(ex, e) + 40 * skel + float(near), skel)
        return memo[key]

    def parts(state):
        return [line_info(i, state[i][0], state[i][1] % len(cands[i]))[:4] for i in range(n)]

    def cost(state):
        li = [line_info(i, state[i][0], state[i][1] % len(cands[i])) for i in range(n)]
        polys = [[p[0], p[1]] for p in li]
        cr = crossings(polys)
        dv = dot_violations([(i, li[i][1]) for i in range(n)])
        same = n - len({p[2] for p in li})
        skel = sum(p[5] for p in li)
        return sum(p[4] for p in li) + 250 * cr + 120 * dv + 25 * same, (cr, skel, dv, same)

    best, bs = anneal(n, slots, cands, cost, seed=11, iters=9000)
    ps = parts(best)
    tiles = []
    for i, r in enumerate(RES):
        j, ci = best[i]
        ex, e, an, c = ps[i]
        s = slots[j]
        t = dict(id=rid(r), chain=r["chain"], num=r["num"], name3=r["name3"], subunit=r["subunit"], x=round(s["x"], 3), t=round(s["t"], 3), w=TILE_W, h=TILE_H, side=s["side"],
                 kind=KIND[i], target=an, contacted=list(r["lig_atoms"]), cc_atoms=list(r["cc_lig_atoms"]), types=r["types"],
                 x1=round(ex[0], 3), t1=round(ex[1], 3), x2=round(e[0], 3), t2=round(e[1], 3), cx=round(float(c[0]), 3), ct=round(float(c[1]), 3))
        k = (r["chain"], r["num"])
        if KIND[i] == "hbond":
            t["dist"] = HB[k]["dist"]
        elif KIND[i] == "cation_pi":
            t["dist"] = CP[k]["dist"]
        elif KIND[i] == "polar":
            t["dist"] = r["d_min"]
        tiles.append(t)
    # distance labels beside their lines
    segs = [((t["x1"], t["t1"]), (t["x2"], t["t2"])) for t in tiles]
    pts = [(float(sk[a["name"]][0]), float(sk[a["name"]][1]), 2.0 if lab[a["name"]][0] else 0.7) for a in L2["atoms"]] + [(t["x2"], t["t2"], 0.8) for t in tiles]
    rects, boxes = [(t["x"], t["t"], t["w"], t["h"]) for t in tiles], []
    for t, sg in zip(tiles, segs):
        if "dist" in t:
            t["lx"], t["lt"] = place_label(sg, pts, segs, box, rects, boxes)
    print(f"panel b: score {bs[0]:.1f}; line crossings {bs[1][0]}, skeleton crossings {bs[1][1]}, end points closer than {MIN_DOT} mm {bs[1][2]}, atoms shared by two lines {bs[1][3]}; skeleton {sw:.1f} x {sh:.1f} mm")
    atoms = []
    for a in L2["atoms"]:
        text, rad = lab[a["name"]]
        atoms.append(dict(name=a["name"], element=a["element"], x=round(float(sk[a["name"]][0]), 3), t=round(float(sk[a["name"]][1]), 3), label=text, rad=rad))
    shared = sorted({p[2] for p in ps if sum(1 for q in ps if q[2] == p[2]) > 1})
    return dict(atoms=atoms, bonds=[dict(a=b["a"], b=b["b"], order=b["order"].upper()) for b in L2["bonds"]], rings=[r["atoms"] for r in L2["rings"]],
                wedges=L2["wedges"], tiles=sorted(tiles, key=lambda t: (t["subunit"] != "GP1", t["num"])), shared_atoms=shared, tile_w=TILE_W, tile_h=TILE_H)


# ------------------------------------------------------------------------------------------------------------------ panel a: the 3D render
def build_panel_a(box=BOX_A):
    x0, t0, pw, ph = box
    pk = json.loads((ROOT / "art" / "index.pocket.json").read_text(encoding="utf-8"))["pocket__full"]
    ov = json.loads((ROOT / "art" / "index.overview.json").read_text(encoding="utf-8"))["overview__full"]
    A = pk["anchors"]
    occluded = set(pk["meta"]["occluded"])
    hidden = set(pk["meta"]["hidden"])
    band = 33.0                                  # top band of the panel: overview inset
    ix0, ix1 = x0 + TILE_W + 2.0, x0 + pw - TILE_W - 2.0
    img_w = ix1 - ix0
    img_h = img_w / pk["ar"]
    img_t = t0 + band
    bottom_row_t = t0 + ph - TILE_H
    img = dict(x=ix0, t=img_t, w=img_w, h=img_h, name="pocket__full")
    pt = lambda key: (img["x"] + A[key][0] * img_w, img["t"] + A[key][1] * img_h)
    frame = dict(x=img["x"] - 1.0, t=img["t"] - 1.0, w=img_w + 2.0, h=img_h + 2.0)
    assert frame["t"] + frame["h"] <= bottom_row_t - 1.2, (frame, bottom_row_t)
    slots = make_slots(box, 10, 10, 0, 4, band_top=band)
    n = len(RES)
    ring_key = lambda k: "ring_" + "_".join(CP[k]["ring"][:2])

    # per tile: choices of (key of the residue atom, anchor key of the inhibitor end point or None)
    cands, d_min = [], []
    for i, r in enumerate(RES):
        k = (r["chain"], r["num"])
        base = f"cand_{k[0]}_{k[1]}_"
        if KIND[i] == "hbond":
            cands.append([(base + HB[k]["atom"], "lig_" + HB[k]["lig_atom"])])
        elif KIND[i] == "cation_pi":
            cands.append([(f"cat_{k[0]}_{k[1]}", ring_key(k))])
        elif KIND[i] == "polar":
            cands.append([(base + r["res_atom_nearest"], "lig_" + r["lig_atom_nearest"])])
        else:
            cands.append([(base + an, None) for an in r["contact_atoms"]])
        d_min.append(r["d_min"])

    def rank_cost(i, c):
        r = RES[i]
        key = cands[i][c % len(cands[i])][0]
        pen = 0.0
        if key in hidden:
            pen += 400.0   # an atom that is not drawn
        elif key in occluded:
            pen += 12.0    # drawn, but behind another stick; the dot still marks it
        if key.startswith("cand_"):
            an = key.split("_", 3)[3]
            pen += 5.0 * (r["contact_atoms"][an]["d"] - r["d_min"])
        return pen

    memo = {}

    def line_info(i, j, c):
        key = (i, j, c)
        if key not in memo:
            ex = exit_point(slots[j])
            a_key, b_key = cands[i][c]
            pl = [ex, pt(a_key)] + ([pt(b_key)] if b_key else [])
            own = sum(math.dist(pl[k], pl[k + 1]) for k in range(len(pl) - 1)) + rank_cost(i, c)
            memo[key] = (pl, own)
        return memo[key]

    def poly_of(i, state):
        return line_info(i, state[i][0], state[i][1] % len(cands[i]))[0]

    def cost(state):
        li = [line_info(i, state[i][0], state[i][1] % len(cands[i])) for i in range(n)]
        polys = [p[0] for p in li]
        cr = crossings(polys)
        dots = []
        for i, p in enumerate(polys):
            dots += [(i, p[1])] + ([(i, p[2])] if len(p) > 2 else [])
        dv = dot_violations(dots)
        over = 0   # a line should not run over the end point of another tile
        for i, p in enumerate(polys):
            for o, q in dots:
                if o != i and any(seg_point_dist(q, p[k], p[k + 1]) < 0.8 for k in range(len(p) - 1)):
                    over += 1
        return sum(p[1] for p in li) + 250 * cr + 250 * dv + 120 * over, (cr, dv, over)

    best, bs = anneal(n, slots, cands, cost, seed=5, iters=9000)
    tiles = []
    for i, r in enumerate(RES):
        j, c = best[i]
        c %= len(cands[i])
        s = slots[j]
        pl = poly_of(i, best)
        a_key, b_key = cands[i][c]
        t = dict(id=rid(r), chain=r["chain"], num=r["num"], name3=r["name3"], subunit=r["subunit"], x=round(s["x"], 3), t=round(s["t"], 3), w=TILE_W, h=TILE_H, side=s["side"],
                 kind=KIND[i], poly=[[round(float(p[0]), 3), round(float(p[1]), 3)] for p in pl], anchor=a_key, anchor2=b_key,
                 atom=a_key.split("_", 3)[3] if a_key.startswith("cand_") else "guanidinium centre", hidden=a_key in hidden, behind=a_key in occluded)
        if KIND[i] in ("hbond", "cation_pi", "polar"):
            t["dist"] = {"hbond": HB.get((r["chain"], r["num"]), {}).get("dist"), "cation_pi": CP.get((r["chain"], r["num"]), {}).get("dist"), "polar": r["d_min"]}[KIND[i]]
        tiles.append(t)
    segs = [((t["poly"][k][0], t["poly"][k][1]), (t["poly"][k + 1][0], t["poly"][k + 1][1])) for t in tiles for k in range(len(t["poly"]) - 1)]
    pts = [(p[0], p[1], 0.8) for t in tiles for p in t["poly"][1:]]
    rects, boxes = [(t["x"], t["t"], t["w"], t["h"]) for t in tiles], []
    for t in tiles:
        if "dist" in t:
            t["lx"], t["lt"] = place_label((tuple(t["poly"][-2]), tuple(t["poly"][-1])), pts, segs, (frame["x"], frame["t"], frame["w"], frame["h"]), rects, boxes)
    print(f"panel a: score {bs[0]:.1f}; line crossings {bs[1][0]}, end points closer than {MIN_DOT} mm {bs[1][1]}, lines over another end {bs[1][2]}; ends not drawn {sum(1 for t in tiles if t['hidden'])}, ends behind a stick {sum(1 for t in tiles if t['behind'])}")
    # overview inset, centred in the band, with the box of the close-up and two zoom lines
    ov_h = band - 3.0
    ov_w = ov_h * ov["ar"]
    ov_x = x0 + pw / 2 - ov_w / 2
    ov_t = t0 + 0.5
    ppa_p, ppa_o = pk["meta"]["px_per_A"], ov["meta"]["px_per_A"]
    cp_, co_ = A["cent"], ov["anchors"]["cent"]
    left_A, right_A = cp_[0] * pk["w"] / ppa_p, (1 - cp_[0]) * pk["w"] / ppa_p
    up_A, down_A = cp_[1] * pk["h"] / ppa_p, (1 - cp_[1]) * pk["h"] / ppa_p
    bx0, bx1 = co_[0] - left_A * ppa_o / ov["w"], co_[0] + right_A * ppa_o / ov["w"]
    bt0, bt1 = co_[1] - up_A * ppa_o / ov["h"], co_[1] + down_A * ppa_o / ov["h"]
    box_o = dict(x=ov_x + bx0 * ov_w, t=ov_t + bt0 * ov_h, w=(bx1 - bx0) * ov_w, h=(bt1 - bt0) * ov_h)
    mm_per_A = img_w / (pk["w"] / ppa_p)
    scale = dict(len_mm=5.0 * mm_per_A, label="5 Å", x=img["x"] + img_w - 5.0 * mm_per_A, t=img["t"] + img_h - 1.0)
    return dict(img=img, tiles=sorted(tiles, key=lambda t: (t["subunit"] != "GP1", t["num"])), overview=dict(x=ov_x, t=ov_t, w=ov_w, h=ov_h, name="overview__full"),
                box_o=box_o, scale=scale, mm_per_A=mm_per_A, frame=frame)


if __name__ == "__main__":
    pb = build_panel_b()
    pa = build_panel_a()
    out = dict(panel_a=pa, panel_b=pb, box_a=BOX_A, box_b=BOX_B, H=PAGE_H, min_dot=MIN_DOT)
    (ROOT / "page").mkdir(exist_ok=True)
    (ROOT / "page" / "data.js").write_text("window.DATA = " + json.dumps(out) + ";\n", encoding="utf-8")
    print("wrote page/data.js")
