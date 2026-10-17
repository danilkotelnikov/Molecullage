"""Plot layer of the redesigned Figure 1: C-alpha B-factors of PDB 1MEL, chain A and chain L.

    py -3 -B molecullage/figures/bfactors/make_bfactors.py        (from examples/sample-project)

Same data as the original (data/pdb/1MEL.pdb, first alternate location, C-alpha atoms). matplotlib draws the axes, ticks and lines as a
transparent SVG at the size of the page; the kit draws the title, the axis captions and the labels at the same millimetre boxes.
Writes bfactors_layer.svg and bfactors_layer.js (window.DATA) next to this file.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]                       # the Molecullage folder
sys.path.insert(0, str(ROOT / "plots"))
from plot_layer import mm_axes, new_plot_canvas, save_plot_layer  # noqa: E402
from pal import EDGE, FILL, INK  # noqa: E402

sys.path.insert(0, str(ROOT / "palette"))
import colour  # noqa: E402

# Line colours: chain A is the rose fill; chain L is a dark tone of the mint fill (OKLab lightness 0.44, derived as in docs/palette.md).
# Rose edge against mint edge is only 3.2 apart for deuteranopes; these two are 16.3 apart (CIEDE2000, worst case).
LINE = {"A": FILL["rose"], "L": colour.darker(FILL["mint"], 0.44)}

W, H = 178.0, 53.5
BOX = dict(x=12.5, t=8.4, w=161.5, h=36.0)   # top-down mm


def bfactors() -> dict[str, list[tuple[int, float]]]:
    out: dict[str, list[tuple[int, float]]] = {"A": [], "L": []}
    for line in (ROOT / "data" / "pdb" / "1MEL.pdb").read_text().splitlines():
        if line.startswith("ATOM") and line[12:16].strip() == "CA" and line[21] in out and line[16] in " A":
            out[line[21]].append((int(line[22:26]), float(line[60:66])))
    return out


def main() -> None:
    s = bfactors()
    fig, _ = new_plot_canvas(W, H)
    ax = mm_axes(fig, BOX["x"], H - BOX["t"] - BOX["h"], BOX["w"], BOX["h"])
    from matplotlib.patches import Rectangle

    ax.add_patch(Rectangle((0, 0), 1, 1, transform=ax.transAxes, facecolor=FILL["palesky"], edgecolor="none", zorder=0, clip_on=False))
    style = {"A": (LINE["A"], FILL["palepink"], "-"), "L": (LINE["L"], FILL["palemint"], (0, (3, 1.6)))}
    for c, (col, pale, ls) in style.items():
        xs, ys = zip(*s[c])
        ax.fill_between(xs, ys, color=pale, alpha=0.6, linewidth=0)
        ax.plot(xs, ys, color=col, lw=1.1, ls=ls)
    ymax = max(y for v in s.values() for _, y in v)
    ax.set_xlim(0, 135)
    ax.set_ylim(0, ymax * 1.15)
    ax.set_xticks(range(0, 136, 20))
    ax.set_yticks(range(0, int(ymax) + 11, 10))
    mean = {c: round(float(np.mean([y for _, y in v])), 1) for c, v in s.items()}
    data = dict(W=W, H=H, a=BOX, bfactor_mean=mean, n_ca={c: len(v) for c, v in s.items()}, colours=dict(A=EDGE["rose"], L=LINE["L"]),
                max={c: max(s[c], key=lambda p: p[1]) for c in s})
    save_plot_layer(fig, HERE / "bfactors_layer.svg")
    (HERE / "bfactors_layer.js").write_text("window.DATA = " + json.dumps(data, indent=1) + ";\n", encoding="utf-8")
    print(json.dumps({k: data[k] for k in ("bfactor_mean", "n_ca", "max")}))


if __name__ == "__main__":
    main()
