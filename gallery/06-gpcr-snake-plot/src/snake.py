"""Geometry of the snake plot of H3R (PDB 7F61 chain A, the construct of the paper), in page millimetres (x right, t down from the top of the page).

    from snake import build
    G = build(S)                 # S = structure.load()

Nothing is placed by eye except the column pitch, the zigzag and the loop style:
  - the seven helices stand in columns TM1..TM7 left to right. A residue of a helix sits at the height of its CA projected on the axis of its own
    helix, expressed along the receptor axis of 7F61 (t = T0 - SCALE * z). The helix axis (least-squares line through the CA atoms of the helix) removes the
    wobble of single CA atoms, so the rise per residue is smooth (about 1.5 A). Residues alternate 0.75 mm left and right of the column line.
  - a loop is a circular arc between its two helix ends, residues evenly spaced along the arc (spacing LOOP_D); ECL2 (16 residues) is a hairpin with rounded corners
    whose height is solved so that the spacing is LOOP_D too. ICL loops bulge down, ECL loops up. Loop shapes are schematic: only the order of residues and the
    two ends are data.
  - the deleted ICL3 (residues 237 to 340 in the paper's construct) is two stubs that hang from TM5 and TM6 and a dashed arc between their ends; the length of
    the arc is a drawing choice, not a measure of the loop.
  - residues 1 to 26 are not in 7F61: the N-terminus is a short stub that ends in a dashed line and the N11Q marker. Helix 8 (416 to 432) is a short row along the inner
    face of the membrane, to the right under TM7, as in GPCRdb snake plots; residue 433 follows it.
Every residue of the construct that 7F61 has (27 to 236 and 341 to 433) gets one circle; build() asserts the count and that no two circles overlap.
"""
from __future__ import annotations

import math

import numpy as np

SCALE = 0.95             # mm per angstrom, vertical scale of the helices
PITCH = 10.0             # mm between helix columns
ZIG = 0.75               # mm, half width of the zigzag
R_BEAD = 0.9             # mm, residue circle radius
R_SITE = 1.2             # mm, radius of a site residue circle
R_BADGE = 1.3            # mm, radius of a numbered badge
LOOP_D = 2.0             # mm, target spacing of residues along a loop
H8_D = 1.45              # mm, spacing along helix 8 (a helix seen from the side)
DELETED = (237, 340)
LONG = 24


def helix_height(S, h):
    """Height (angstrom, along the receptor axis) of the residues of helix h: a straight-line fit of the CA height z against the residue number.
    A single CA wobbles by about one angstrom around the helix axis and a bent helix compresses the ends, so the line gives an even rise per residue;
    it keeps the mean height and the slope of the real helix. Returns {residue: height} and the largest distance between the fit and the real CA height."""
    idx = [i for i in range(h["start"], h["end"] + 1) if i in S["ca"]]
    zs = np.array([S["z"][i] for i in idx])
    k, c = np.polyfit(np.array(idx, float), zs, 1)
    fit = {i: float(c + k * i) for i in range(h["start"], h["end"] + 1)}
    dev = float(np.max(np.abs(zs - np.array([fit[i] for i in idx]))))
    return fit, dev


def arc_points(p0, p1, n_inner, bulge_sign, d=LOOP_D):
    """n_inner residues from p0 to p1 along a circular arc; bulge_sign +1 bulges to the left of the direction p0 -> p1 as drawn on paper (t down)."""
    p0, p1 = np.asarray(p0, float), np.asarray(p1, float)
    chord = np.linalg.norm(p1 - p0)
    steps = n_inner + 1
    L = steps * d
    u = (p1 - p0) / chord
    nrm = np.array([-u[1], u[0]]) * bulge_sign          # t is down: (-uy, ux) points down for a chord pointing right, so +1 = down
    if L <= chord * 1.02:
        return [p0 + (p1 - p0) * (k / steps) for k in range(1, steps)], dict(chord=chord, arc=chord, sag=0.0)
    lo, hi = 1e-6, chord * 3.0
    for _ in range(80):
        h = 0.5 * (lo + hi)
        R = (chord ** 2 / 4 + h ** 2) / (2 * h)
        theta = 2 * math.asin(min(1.0, chord / (2 * R)))
        if h > R:
            theta = 2 * math.pi - theta
        if R * theta < L:
            lo = h
        else:
            hi = h
    h = 0.5 * (lo + hi)
    R = (chord ** 2 / 4 + h ** 2) / (2 * h)
    mid = (p0 + p1) / 2
    centre = mid + nrm * (h - R)
    ang = lambda p: math.atan2(p[1] - centre[1], p[0] - centre[0])
    a0, a1, ap = ang(p0), ang(p1), ang(mid + nrm * h)
    norm = lambda a: (a + math.pi) % (2 * math.pi) - math.pi
    s1, sm = norm(a1 - a0), norm(ap - a0)
    if not (min(0, s1) <= sm <= max(0, s1)):
        s1 = s1 - 2 * math.pi if s1 > 0 else s1 + 2 * math.pi
    pts = [centre + R * np.array([math.cos(a0 + s1 * k / steps), math.sin(a0 + s1 * k / steps)]) for k in range(1, steps)]
    return pts, dict(chord=chord, arc=abs(s1) * R, sag=h)


def rounded(poly, r):
    """Polyline with every interior corner cut by a quadratic curve of reach r; returns a dense list of points."""
    poly = [np.asarray(p, float) for p in poly]
    out = [poly[0]]
    for a, b, c in zip(poly, poly[1:], poly[2:]):
        ra = min(r, np.linalg.norm(b - a) / 2)
        rc = min(r, np.linalg.norm(c - b) / 2)
        pa = b + (a - b) / np.linalg.norm(a - b) * ra
        pc = b + (c - b) / np.linalg.norm(c - b) * rc
        for k in range(0, 13):
            s = k / 12
            out.append((1 - s) ** 2 * pa + 2 * s * (1 - s) * b + s ** 2 * pc)
    out.append(poly[-1])
    return out


def along(path, n_inner):
    """n_inner points at equal arc length strictly inside the path (the ends of the path are residues too, so there are n_inner + 1 equal steps)."""
    seg = [np.linalg.norm(b - a) for a, b in zip(path, path[1:])]
    cum = np.concatenate([[0], np.cumsum(seg)])
    L = cum[-1]
    pts = []
    for k in range(1, n_inner + 1):
        s = L * k / (n_inner + 1)
        j = int(np.searchsorted(cum, s, side="right") - 1)
        j = min(j, len(seg) - 1)
        f = (s - cum[j]) / seg[j] if seg[j] else 0
        pts.append(path[j] + (path[j + 1] - path[j]) * f)
    return pts, L


def sites_layout(S, beads, cols, loops):
    """Bead and badge of each site. The badge (numbered circle) touches the site circle on the side that faces the corridor. Which side faces the corridor is
    fixed by the zigzag phase set in build()."""
    out = []
    for s in S["sites"]:
        b = beads[s["num"]]
        side = +1 if b["x"] > (cols[int(b["where"][2]) - 1] if b["where"].startswith("TM") else b["x"]) else -1
        if b["where"] == "ECL2":
            side = -1                                       # F193 sits on the right leg of the hairpin; its corridor is on its left
        xb = b["x"] + side * (R_SITE + 0.1 + R_BADGE)
        out.append(dict(n=s["n"], num=s["num"], wt=s["wt"], mut=s["mut"], bw=s["bw"], where=s["where"], bead=(b["x"], b["t"]), badge=(xb, b["t"])))
    return out


def build(S, x0=12.5, t_top=15.0):
    """Beads and drawing items in page millimetres. t_top: page t of the highest point of the snake (the top run of ECL2)."""
    seq, z = S["seq"], S["z"]
    tm = S["tm"]
    cols = [x0 + k * PITCH for k in range(7)]
    zh, devs = {}, []
    for h in tm:
        f, d = helix_height(S, h)
        zh.update(f)
        devs.append(d)
    assert max(devs) < 3.6, devs
    beads = {}

    def put(i, x, t, kind, where):
        assert i not in beads, i
        beads[i] = dict(num=i, aa=seq[i], x=float(x), t=float(t), kind=kind, where=where, resolved=(i in S["ca"]))

    # --- helices; t0 is set below once the highest point is known, so build with t0 = 0 and shift at the end
    for k, h in enumerate(tm):
        for j, i in enumerate(range(h["start"], h["end"] + 1)):
            phase = 1 if k == 5 else 0                             # TM6 starts on the other side so that S359 sits on the side of its corridor
            side = ZIG if (j + phase) % 2 == 0 else -ZIG
            put(i, cols[k] + side, -SCALE * zh[i], "tm", f"TM{k + 1}")
    P = lambda i: np.array([beads[i]["x"], beads[i]["t"]])
    first = lambda k: tm[k]["start"]
    last = lambda k: tm[k]["end"]
    loops = {}

    def loop(name, a, b, bulge, d=LOOP_D):
        n = b - a - 1
        pts, info = arc_points(P(a), P(b), n, bulge, d)
        for i, p in zip(range(a + 1, b), pts):
            put(i, p[0], p[1], "loop", name)
        loops[name] = dict(a=a, b=b, n=n, chord=float(info["chord"]), arc=float(info["arc"]))

    loop("ICL1", last(0), first(1), +1, d=2.4)      # a little looser than the others so that the circle next to TM2 clears its neighbour
    loop("ECL1", last(1), first(2), -1)
    loop("ICL2", last(2), first(3), +1)
    loop("ECL3", last(5), first(6), -1)

    # --- ECL2: hairpin. up from TM4's top, across, down the corridor between TM4 and TM5, then into TM5's first residue
    a, b = last(3), first(4)
    n2 = b - a - 1
    pa, pb = P(a), P(b)
    x_leg = cols[3] + 6.8
    lo, hi = 2.0, 40.0
    for _ in range(60):
        rise = 0.5 * (lo + hi)
        t_run = min(pa[1], pb[1]) - rise
        poly = [pa, np.array([pa[0], t_run]), np.array([x_leg, t_run]), np.array([x_leg, pb[1] - 3.2]), pb]
        path = rounded(poly, 2.4)
        L = sum(np.linalg.norm(q - p) for p, q in zip(path, path[1:]))
        if L < (n2 + 1) * LOOP_D:
            lo = rise
        else:
            hi = rise
    pts, L = along(path, n2)
    for i, p in zip(range(a + 1, b), pts):
        put(i, p[0], p[1], "loop", "ECL2")
    loops["ECL2"] = dict(a=a, b=b, n=n2, chord=float(np.linalg.norm(pa - pb)), arc=float(L), rise=float(rise), x_leg=float(x_leg))

    # --- ICL3: stubs hang straight down from TM5 and TM6; the dashed arc joins their ends
    d5, d6 = last(4), first(5)
    a_stub = list(range(d5 + 1, DELETED[0]))
    b_stub = list(range(DELETED[1] + 1, d6))
    assert a_stub and b_stub and d6 in seq
    p5, p6 = P(d5), P(d6)
    for k, i in enumerate(a_stub):
        put(i, p5[0], p5[1] + LOOP_D * (k + 1), "loop", "ICL3a")
    for k, i in enumerate(reversed(b_stub)):                       # 347 is nearest TM6
        put(i, p6[0], p6[1] + LOOP_D * (k + 1), "loop", "ICL3b")
    tip5, tip6 = P(a_stub[-1]), P(b_stub[0])
    gap = dict(p0=tip5.tolist(), p1=tip6.tolist(), deleted=list(DELETED), n_deleted=DELETED[1] - DELETED[0] + 1)

    # --- N terminus: residues before TM1 go up and left, then a dashed stub ends at the N11Q marker
    nt = list(range(tm[0]["start"] - 1, min(seq) - 1, -1))
    p = P(tm[0]["start"])
    ang = math.radians(150)
    dirv = np.array([math.cos(ang), -math.sin(ang)])
    for k, i in enumerate(nt):
        q = p + dirv * LOOP_D * (k + 1)
        put(i, q[0], q[1], "loop", "Nterm")
    nstub = dict(p0=(p + dirv * LOOP_D * len(nt)).tolist(), dir=dirv.tolist(), dash_len=3.5)

    # --- C terminus: after TM7 (ends at 416) the chain turns and runs to the right as helix 8 along the inner face of the membrane, a zigzag row under TM7;
    #     the last residue (433) follows the row
    ct = list(range(tm[6]["end"] + 1, max(seq) + 1))
    p = P(tm[6]["end"])
    t_row = p[1] + 4.2
    h8 = []
    for k, i in enumerate(ct):
        if k == 0:
            x, t = cols[6] + 1.4, p[1] + 2.4
        else:
            x, t = cols[6] + 1.4 + H8_D * k, t_row + (0.65 if k % 2 else -0.65)
        put(i, x, t, "loop", "Cterm")
    h8 = dict(first=ct[0], last=min(432, ct[-1]), t_row=float(t_row))

    # --- shift so that the highest point is at t_top, then record
    tmin = min(b["t"] for b in beads.values())
    shift = t_top - (tmin - R_BEAD)
    for b in beads.values():
        b["t"] += shift
    gap["p0"][1] += shift
    gap["p1"][1] += shift
    nstub["p0"][1] += shift
    h8["t_row"] += shift
    # --- checks: one circle per residue of the construct, none for the deleted ones, and no two circles overlap
    want = [i for i in sorted(seq) if not (DELETED[0] <= i <= DELETED[1])]
    assert sorted(beads) == want, (len(beads), len(want))
    inrec = set()
    for rid, a_, b_ in S["records"]:
        inrec.update(range(a_, b_ + 1))
    xy = np.array([[beads[i]["x"], beads[i]["t"]] for i in sorted(beads)])
    ids = sorted(beads)
    D = np.hypot(xy[:, None, 0] - xy[None, :, 0], xy[:, None, 1] - xy[None, :, 1]) + np.eye(len(ids)) * 99
    near = np.argwhere(D < 2 * R_BEAD * 0.9)
    close = sorted({(ids[i], ids[j]) for i, j in near if i < j})
    for i, b_ in beads.items():
        b_["helix_record"] = i in inrec
    sites = sites_layout(S, beads, cols, loops)
    return dict(sites=sites, beads=beads, loops=loops, cols=cols, shift=float(shift), a_stub=a_stub, b_stub=b_stub, nt=nt, ct=ct, gap=gap, nstub=nstub, h8=h8, overlaps=close,
                tm=[(h["start"], h["end"]) for h in tm], fit_dev=[round(d, 2) for d in devs])


if __name__ == "__main__":
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from structure import load

    S = load()
    G = build(S)
    ts = [b["t"] for b in G["beads"].values()]
    xs = [b["x"] for b in G["beads"].values()]
    print("beads", len(G["beads"]), "x %.1f - %.1f" % (min(xs), max(xs)), "t %.1f - %.1f" % (min(ts), max(ts)), "overlapping pairs", len(G["overlaps"]), G["overlaps"][:10])
    for k, v in G["loops"].items():
        print(k, {a: (round(b, 1) if isinstance(b, float) else b) for a, b in v.items()})
