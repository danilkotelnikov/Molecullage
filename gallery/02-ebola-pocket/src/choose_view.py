"""Choose the viewing direction of the close-up from the coordinates, so that the choice is a computation and not a guess.

    py -3 -I gallery/02-ebola-pocket/src/choose_view.py

Candidates: 4000 directions spread evenly over the sphere (Fibonacci lattice). For each direction the inhibitor and the 20 contact residues are projected on
the screen plane. Score = hull area of the inhibitor (more face-on is better) + 0.6 x mean nearest-neighbour distance of the leader targets (labelled atoms
should not pile up) - 1.4 x share of inhibitor atoms hidden behind protein atoms (backbone atoms of the residues within 9 A count fully, contact side chains
count 0.4). Constraints: the cation-pi connector and the hydrogen bond are at least 2.0 A long on the screen, the quinoline ring is turned no more than
65 degrees from face-on, and every point that gets an end dot (closest-contact atom of each residue, the guanidinium centre, N15, the ring centre, N39) is at
least 0.85 A from every other on the screen (at the close-up scale of 1.83 mm per A that is 1.55 mm, above the 1.5 mm the page asserts), and no end dot lies
closer than 0.6 A to the lines that continue to the inhibitor (hydrogen bond, cation-pi, Ser41). The screen "up" is the long axis of the inhibitor's shadow turned to the horizontal. Writes src/view.json (read by render_pocket.py).
"""
from __future__ import annotations

import json
from pathlib import Path

import gemmi
import numpy as np
from scipy.spatial import ConvexHull

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
NUL = "\0"
C = json.loads((HERE / "contacts.json").read_text(encoding="utf-8"))
st = gemmi.read_structure(str(ROOT / "data" / "pdb" / "9PEL.cif"))
m = st[0]
lig = next(r for r in m["A"] if r.name == "A1CIK")
P = lambda a: np.array([a.pos.x, a.pos.y, a.pos.z])
LA = {a.name: P(a) for a in lig if a.element.name != "H"}
lig_xyz = np.array(list(LA.values()))
contact_keys = {(r["chain"], r["num"]) for r in C["residues"]}
nearest = {(r["chain"], r["num"]): r["res_atom_nearest"] for r in C["residues"]}
anchor_xyz, side_xyz, back_xyz, anchor_keys = [], [], [], []
for ch in ("A", "a"):
    for res in m[ch]:
        if res.name == "A1CIK":
            continue
        want = "B" if (ch, res.seqid.num) == ("a", 551) else "A"   # the alternative conformation ChimeraX shows (highest occupancy)
        atoms = [a for a in res if a.element.name != "H" and a.altloc in (NUL, want)]
        if not atoms or min(np.linalg.norm(lig_xyz - P(a), axis=1).min() for a in atoms) > 9.0:
            continue
        k = (ch, res.seqid.num)
        for a in atoms:
            if a.name in ("N", "CA", "C", "O"):
                back_xyz.append(P(a))
            elif k in contact_keys:
                side_xyz.append(P(a))
        if k in contact_keys:
            anchor_xyz.append(P(next(a for a in atoms if a.name == nearest[k])))
            anchor_keys.append(k)
back_xyz, side_xyz, anchor_xyz = np.array(back_xyz), np.array(side_xyz), np.array(anchor_xyz)
# the two named interactions
thr = P(next(a for a in next(r for r in m["a"] if r.seqid.num == 519) if a.name == "OG1"))
arg = next(r for r in m["A"] if r.seqid.num == 64)
cat = np.mean([P(next(a for a in arg if a.name == n)) for n in ("NE", "NH1", "NH2")], axis=0)
ring = min(C["cation_pi"], key=lambda c: c["dist"])
ring_xyz = np.array([LA[n] for n in ring["ring"]])
ring_c = ring_xyz.mean(0)
ring_n = np.linalg.svd(ring_xyz - ring_c)[2][2]
n15 = LA["N15"]
n39 = LA["N39"]
dot_xyz = np.array([x for x, k in zip(anchor_xyz, anchor_keys) if k != ("A", 64)] + [cat, n15, ring_c, n39])   # every point that gets an end dot (Arg64: its guanidinium centre)
MIN_SEP = 0.85   # angstrom on the screen: at the scale of the close-up (1.83 mm per angstrom) the end dots are then at least 1.55 mm apart
ser41_og = next(P(a) for a in next(r for r in m["A"] if r.seqid.num == 41) if a.name == "OG")
SPECIAL = [(thr, n15), (cat, ring_c), (ser41_og, n39)]   # the three lines that continue to the inhibitor
others = [x for x, k in zip(anchor_xyz, anchor_keys) if k not in (("A", 64), ("a", 519), ("A", 41))]
MIN_LINE = 0.6   # angstrom: no other end dot closer than this to one of those lines (1.1 mm)


def fib(n):
    i = np.arange(n) + 0.5
    phi = np.arccos(1 - 2 * i / n)
    th = np.pi * (1 + 5 ** 0.5) * i
    return np.stack([np.cos(th) * np.sin(phi), np.sin(th) * np.sin(phi), np.cos(phi)], axis=1)


def frame(z):
    """screen axes for viewer direction z: x is the long axis of the inhibitor's shadow, y completes a right-handed frame (x, y, z)."""
    ref = np.array([0, 0, 1.0]) if abs(z[2]) < 0.9 else np.array([1.0, 0, 0])
    a = np.cross(ref, z)
    a /= np.linalg.norm(a)
    b = np.cross(z, a)
    p = (lig_xyz - lig_xyz.mean(0)) @ np.stack([a, b]).T
    w, v = np.linalg.eigh(np.cov(p.T))
    major = v[:, 1]
    x = major[0] * a + major[1] * b
    y = np.cross(z, x)
    return x, y


def score(z):
    x, y = frame(z)
    pr = lambda X: np.stack([X @ x, X @ y], axis=1)
    pl = pr(lig_xyz)
    area = ConvexHull(pl).volume

    def hidden(occ, lat):   # inhibitor atoms with a protein atom in front of them (larger z) and laterally closer than lat
        zl = lig_xyz @ z
        po, zo = pr(occ), occ @ z
        d = np.linalg.norm(pl[:, None, :] - po[None, :, :], axis=2)
        return ((d < lat) & (zo[None, :] > zl[:, None] + 0.8)).any(axis=1)

    pa = pr(anchor_xyz)
    dd = np.linalg.norm(pa[:, None] - pa[None, :], axis=2) + np.eye(len(pa)) * 99
    cat_len = np.linalg.norm(pr(cat[None])[0] - pr(ring_c[None])[0])
    hb_len = np.linalg.norm(pr(thr[None])[0] - pr(n15[None])[0])
    tilt = np.degrees(np.arccos(abs(ring_n @ z)))
    pd = pr(dot_xyz)
    dd2 = np.linalg.norm(pd[:, None] - pd[None, :], axis=2) + np.eye(len(pd)) * 99
    sep = dd2.min()
    po = pr(np.array(others))
    near_line = 99.0
    for u, v in SPECIAL:
        a_, b_ = pr(u[None])[0], pr(v[None])[0]
        d = b_ - a_
        t = np.clip(((po - a_) @ d) / max(d @ d, 1e-9), 0, 1)
        near_line = min(near_line, float(np.linalg.norm(po - (a_ + t[:, None] * d), axis=1).min()))
    return area, hidden(back_xyz, 1.5).mean(), hidden(side_xyz, 1.2).mean(), dd.min(axis=1).mean(), cat_len, hb_len, tilt, bool(cat_len >= 2.0 and hb_len >= 2.0 and tilt <= 65.0 and sep >= MIN_SEP and near_line >= MIN_LINE), sep, near_line


Z = fib(4000)
S = [score(z) for z in Z]
area_max = max(s[0] for s in S)
nn_max = max(s[3] for s in S)
tot = np.array([s[0] / area_max + 0.6 * s[3] / nn_max - 1.4 * (s[1] + 0.4 * s[2]) if s[7] else -9.0 for s in S])
order = np.argsort(tot)[::-1]
print("top five (hull area A^2, hidden by backbone, hidden by side chains, anchor NN A, cation len A, hbond len A, ring tilt deg; then smallest gap between end dots A, nearest end dot to a special line A):")
for i in order[:5]:
    print(np.round(Z[i], 3), [round(float(v), 2) for v in S[i][:7]], round(float(S[i][8]), 2), round(float(S[i][9]), 2), round(float(tot[i]), 3))
z = Z[order[0]]
x, y = frame(z)
(HERE / "view.json").write_text(json.dumps({"z_to_viewer": z.tolist(), "up": y.tolist(), "x": x.tolist(), "score": float(tot[order[0]]), "parts": [float(v) for v in S[order[0]][:7]]}, indent=1), encoding="utf-8")
print("wrote src/view.json")
