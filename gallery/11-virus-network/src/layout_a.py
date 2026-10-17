"""Layout of panel a of gallery piece 11: baits on a ring, prey on an outer ring grouped by region. Deterministic: no random numbers (ties break by id).

    baits       ten nodes on a ring of radius R_BAIT: the five VM baits on one half, the five NVF baits on the other, both turned by one angle rho
    prey        one position per prey on a ring of radius R_PREY, in eight region sections; inside a section, prey sorted by the circular mean angle of the
                baits that pulled them down, then by function, then by id
    gaps        GAP_DEG between sections, and one wide empty sector BIG_GAP (bottom of the ring) that holds the names of the strips
    search      every order of the eight sections (the first one fixed), the four orientations of the two bait groups and the turn rho of the baits:
                the choice with the smallest summed angular span of the spokes is kept (exhaustive, no random numbers)
    angles      degrees clockwise from 12 o'clock
"""
from __future__ import annotations

import itertools
import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import derive as dv  # noqa: E402

GAP_DEG = 2.4                     # empty arc between two region sections
BIG_GAP = 38.0                    # the empty sector for the strip names, centred on 180 degrees (bottom)
GAP_CENTRE = 180.0
T0 = GAP_CENTRE + BIG_GAP / 2     # the first section starts where the wide gap ends
FIDX = {f: i for i, f in enumerate(dv.FUNC)}


def read_prey():
    """Rows of tables/prey.csv (written by derive.py) as dicts."""
    import csv
    with open(dv.TAB / "prey.csv", encoding="utf-8") as f:
        f.readline()
        rows = list(csv.DictReader(f))
    for r in rows:
        r["baits_l"] = r["baits"].split(";")
    return rows


def pol(r, th, cx=0.0, cy=0.0):
    """Angle clockwise from 12 o'clock to (x right, t down) millimetres."""
    a = math.radians(th)
    return cx + r * math.sin(a), cy - r * math.cos(a)


def circ_mean(angles):
    a = np.radians(np.asarray(angles, float))
    return math.degrees(math.atan2(np.sin(a).sum(), np.cos(a).sum())) % 360


def circ_dist(a, b):
    d = abs(a - b) % 360
    return min(d, 360 - d)


def bait_angles(vm_rev: bool, nvf_rev: bool, rho: float, spread=30.0):
    """Five baits of one lobe at equal steps on its half ring (VM centred on 270, NVF on 90), then both turned by rho."""
    out = {}
    for lobe, centre, rev in ((dv.VM, 270.0, vm_rev), (dv.NVF, 90.0, nvf_rev)):
        order = list(reversed(lobe)) if rev else list(lobe)
        for i, b in enumerate(order):
            out[b] = (centre + (i - 2) * spread + rho) % 360
    return out


def inner_sorted(rows, region, bang):
    ps = [r for r in rows if r["region"] == region]
    ps.sort(key=lambda r: (round(circ_mean([bang[b] for b in r["baits_l"]]), 6), FIDX.get(r["function"], -1), r["id"]))
    return ps


def pitch_of(n_prey, n_regions=8):
    return (360.0 - BIG_GAP - GAP_DEG * (n_regions - 1)) / n_prey


def block_layout(rows, bang, order):
    """Angle of every prey, and the angular extent of every section, for a block order; the first section starts at T0."""
    pitch = pitch_of(len(rows), len(order))
    pos, blocks, t = {}, {}, T0
    for g in order:
        ps = inner_sorted(rows, g, bang)
        for k, r in enumerate(ps):
            pos[r["id"]] = (t + (k + 0.5) * pitch) % 360
        blocks[g] = dict(a=t % 360, b=(t + len(ps) * pitch) % 360, n=len(ps), mid=(t + len(ps) * pitch / 2) % 360)
        t += len(ps) * pitch + GAP_DEG
    return pos, blocks, pitch


def span(rows, pos, bang):
    return sum(circ_dist(pos[r["id"]], bang[b]) for r in rows for b in r["baits_l"])


def crossings(rows, pos, bang, rb, rp):
    """Number of pairs of spokes (bait centre to prey) that cross, counted exactly with segment tests."""
    seg, who = [], []
    for r in rows:
        for b in r["baits_l"]:
            x0, y0 = pol(rb, bang[b]); x1, y1 = pol(rp, pos[r["id"]])
            seg.append((x0, y0, x1, y1)); who.append((b, r["id"]))
    A = np.array(seg)

    def orient(ax, ay, bx, by, cx, cy):
        return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)

    cnt = 0
    for i in range(len(seg)):
        ax, ay, bx, by = A[i]
        cx, cy, dx, dy = A[i + 1:].T
        o1 = orient(ax, ay, bx, by, cx, cy); o2 = orient(ax, ay, bx, by, dx, dy)
        o3 = orient(cx, cy, dx, dy, ax, ay); o4 = orient(cx, cy, dx, dy, bx, by)
        share = np.array([(who[i][0] == w[0]) or (who[i][1] == w[1]) for w in who[i + 1:]], dtype=bool)    # spokes of one bait, or of one prey, meet at a point
        cnt += int((((o1 * o2) < 0) & ((o3 * o4) < 0) & ~share).sum())
    return cnt


def solve(rows, spread=30.0, rhos=tuple(range(-42, 43, 6))):
    """Exhaustive search; returns (span, vm_rev, nvf_rev, rho, order)."""
    regions = dv.REGIONS
    pitch = pitch_of(len(rows), len(regions))
    best = None
    for vm_rev, nvf_rev in itertools.product((False, True), repeat=2):
        for rho in rhos:
            bang = bait_angles(vm_rev, nvf_rev, rho, spread)
            inner, offs, ebs = {}, {}, {}
            for g in regions:
                ps = inner_sorted(rows, g, bang)
                inner[g] = ps
                offs[g] = np.array([(k + 0.5) * pitch for k, r in enumerate(ps) for _ in r["baits_l"]])
                ebs[g] = np.array([bang[b] for r in ps for b in r["baits_l"]])
            for perm in itertools.permutations(regions[1:]):
                order = (regions[0],) + perm
                t, o, e = T0, [], []
                for g in order:
                    o.append(offs[g] + t); e.append(ebs[g])
                    t += len(inner[g]) * pitch + GAP_DEG
                o = np.concatenate(o); e = np.concatenate(e)
                d = np.abs((o - e) % 360)
                tot = float(np.minimum(d, 360 - d).sum())
                if best is None or tot < best[0] - 1e-9:
                    best = (tot, vm_rev, nvf_rev, rho, order)
    return best


if __name__ == "__main__":
    import time
    t = time.time()
    print(solve(read_prey()), round(time.time() - t, 1), "s")
