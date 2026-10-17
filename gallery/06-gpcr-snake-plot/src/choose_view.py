"""Pick the view of the 3D panel from the coordinates; write src/view.json.

    py -3 -I gallery/06-gpcr-snake-plot/src/choose_view.py [--print]

The receptor axis stays upright (extracellular side up), as in the snake plot. The free choices are the turn about that axis (phi, 1 degree steps) and a tilt of the
camera about the horizontal screen axis (tilt, 2 degree steps, at most 30 degrees; negative = looking down on the extracellular side). The four sticks (anchor =
centroid of the side-chain heavy atoms) should be seen, and apart from each other, because each gets a numbered badge on a short leader:
  - hidden: another CA lies within 3.0 A of the anchor on the screen and nearer the viewer (the stick would sit behind a ribbon); summed over the four sites,
  - apart: the smallest distance between two anchors on the screen, angstrom.
Views are ranked by the summed hiding (rounded to 0.5 A), then by the largest smallest distance. The three sites at the inner end (73, 359, 415) lie within 10 A of
each other, so only a few views separate them.
view.json holds phi, tilt, the scale of the picture (mm per angstrom), R (rows: screen right, screen up, towards the viewer, in the 7F61 frame) and the origin of the rotation.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from structure import load  # noqa: E402

OUT = Path(__file__).resolve().parent / "view.json"
S3D = 1.10               # mm per angstrom in the 3D picture
TILT_MAX = 30            # degrees


def basis(axis, phi):
    a = np.cross(axis, [1.0, 0, 0])
    if np.linalg.norm(a) < 0.1:
        a = np.cross(axis, [0, 0, 1.0])
    a /= np.linalg.norm(a)
    b = np.cross(axis, a)
    d = np.cos(phi) * a + np.sin(phi) * b          # towards the viewer
    return np.stack([np.cross(axis, d), axis, d])  # screen right, up, towards the viewer


def tilted(R, tau_deg):
    t = np.radians(tau_deg)
    x, y, d = R
    return np.stack([x, np.cos(t) * y + np.sin(t) * d, -np.sin(t) * y + np.cos(t) * d])


def main():
    S = load()
    nums = np.array(sorted(S["ca"]))
    ca = np.array([S["ca"][i] for i in nums])
    table = []
    for deg in range(360):
        R0 = basis(S["axis"], np.radians(deg))
        for tau in range(-TILT_MAX, TILT_MAX + 1, 2):
            R = tilted(R0, tau)
            P = (ca - S["origin"]) @ R.T
            an = [(s["side"] - S["origin"]) @ R.T for s in S["sites"]]
            hid = []
            for s, a in zip(S["sites"], an):
                near = (np.hypot(P[:, 0] - a[0], P[:, 1] - a[1]) < 3.0) & (nums != s["num"])
                hid.append(float(max(0.0, (P[near, 2] - a[2]).max())) if near.any() else 0.0)
            apart = min(float(np.hypot(an[i][0] - an[j][0], an[i][1] - an[j][1])) for i in range(4) for j in range(i + 1, 4))
            table.append((round(2 * sum(hid)) / 2, -round(apart, 2), deg, tau, [round(h, 1) for h in hid]))
    table.sort()
    if "--print" in sys.argv:
        for r in table[:6]:
            print(r)
    hid, napart, deg, tau, each = table[0]
    R = tilted(basis(S["axis"], np.radians(deg)), tau)
    json.dump(dict(phi_deg=deg, tilt_deg=tau, scale_mm_per_A=S3D, hidden_A=each, apart_A=-napart, R=R.tolist(), centre=S["origin"].tolist(), axis=S["axis"].tolist()),
              open(OUT, "w"), indent=1)
    print("phi", deg, "tilt", tau, "hidden (A)", each, "smallest distance between two sticks %.2f A = %.1f mm" % (-napart, -napart * S3D))


if __name__ == "__main__":
    main()
