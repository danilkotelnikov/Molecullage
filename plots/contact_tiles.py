"""Typed contact tile map: columns are binder residues in contact (grouped by loop), rows are antigen residues, one tile per residue pair.

    py -3 -B plots/contact_tiles.py --contacts examples/contacts/data/contacts.csv --loops A:1mel_vhh \
        --out examples/contacts/contacts_layer --height 108

Reads contacts.csv from struct/contacts.py. Writes <out>.svg (transparent layer, text as text) and <out>.js (window.DATA: the layout in mm and
the counts) for templates/contacts.html. Tile colour and letter are the interaction type reported by the tool
(h hydrogen bond, p polar contact, w weak hydrogen bond, c carbonyl contact, phi hydrophobic, pi ring contact). A pair with several types is a
split tile (vertical stripes in key order). A cream tile is a pair within the cut-off with no specific type. A star marks a hydrogen bond with a
backbone N or O. --loops lists chain:preset or chain:h1:26-32,h2:52-57 (see struct/style.py); a residue outside every loop goes to group "other".
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from pathlib import Path

from matplotlib.patches import Polygon, Rectangle

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / "struct"))
from plot_layer import new_plot_canvas, save_plot_layer  # noqa: E402
from pal import FILL, EDGE, INK, mix  # noqa: E402
import style  # noqa: E402

ORDER = ["hbond", "polar", "weak_hbond", "carbonyl", "hydrophobic", "ring"]
CODE = {"hbond": "h", "polar": "p", "weak_hbond": "w", "carbonyl": "c", "hydrophobic": "φ", "ring": "π"}
FACE = {"hbond": (FILL["indigo"], "#FFFFFF"), "polar": (FILL["maroon"], "#FFFFFF"), "weak_hbond": (FILL["violet"], INK),
        "carbonyl": (FILL["palesky"], INK), "hydrophobic": (FILL["green"], INK), "ring": (FILL["palelilac"], INK)}
CREAM = FILL["grey"]
GRID = mix(INK, "#FFFFFF", 0.86)
LAB = 6.55
THREE = lambda s: s[:3].capitalize() + s[3:]  # noqa: E731  ILE29 -> Ile29


def shades(k: int) -> list[tuple[str, str]]:
    """(fill, text) for the loops of chain number k: first binder chain in the rose family, the second in the periwinkle family."""
    if k == 0:
        return [(FILL["palepink"], INK), (FILL["rose"], INK), (mix(EDGE["rose"], INK, 0.35), "#FFFFFF")]
    return [(FILL["palelilac"], INK), (FILL["peri"], "#FFFFFF"), (mix(EDGE["peri"], INK, 0.35), "#FFFFFF")]


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--contacts", required=True)
    ap.add_argument("--loops", nargs="*", default=[], help="chain:preset ...")
    ap.add_argument("--out", required=True, help="prefix of the .svg and .js files")
    ap.add_argument("--width", type=float, default=178.0)
    ap.add_argument("--height", type=float, default=108.0)
    ap.add_argument("--grid-right", type=float, default=96.0, help="right edge of the tile grid, mm")
    a = ap.parse_args()

    rows_in = list(csv.DictReader(open(a.contacts, encoding="utf-8")))
    loops = {}
    for item in a.loops:
        chain, spec = item.split(":", 1)
        loops[chain] = style.parse_cdr(spec)
    chains = sorted({r["binder_chain"] for r in rows_in}, key=lambda c: [x for x in loops].index(c) if c in loops else 99)

    def group_of(chain: str, num: int) -> str:
        for name, (lo, hi) in loops.get(chain, {}).items():
            if lo <= num <= hi:
                return f"{chain}:{name}"
        return f"{chain}:other"

    cols = sorted({(chains.index(r["binder_chain"]), int(r["binder_num"]), r["binder_chain"], r["binder_res"]) for r in rows_in})
    rows = sorted({(int(r["antigen_num"]), r["antigen_chain"], r["antigen_res"]) for r in rows_in})
    groups: list[str] = []
    for _, n, c, _ in cols:
        g = group_of(c, n)
        if g not in groups:
            groups.append(g)
    W, H = a.width, a.height
    GL, X0, T0, GG = 1.5, 15.0, 30.0, 1.8
    CH = 3.0
    CW = min(4.2, max(3.2, (a.grid_right - X0 - GG * (len(groups) - 1)) / len(cols)))
    Tf = lambda t: H - t  # noqa: E731  top-down mm -> canvas y
    fig, cv = new_plot_canvas(W, H)

    def rect(x, t, w, h, fc="none", ec="none", lw=0.0, z=2):
        cv.add_patch(Rectangle((x, Tf(t + h)), w, h, fc=fc, ec=ec, lw=lw, zorder=z))

    def text(x, t, s, fs=LAB, ha="center", va="center", color=INK, bold=False, rot=0):
        cv.text(x, Tf(t), s, fontsize=fs, ha=ha, va=va, color=color, fontweight="bold" if bold else "normal", rotation=rot, zorder=6)

    def star(cx, ct, r=0.68):
        pts = [(cx + (r if i % 2 == 0 else r * 0.42) * math.cos(math.pi / 2 + i * math.pi / 5), Tf(ct) + (r if i % 2 == 0 else r * 0.42) * math.sin(math.pi / 2 + i * math.pi / 5)) for i in range(10)]
        cv.add_patch(Polygon(pts, closed=True, fc="#FFFFFF", ec="none", zorder=7))

    def tile(x, t, kinds, backbone=False):
        w, h = CW - 0.5, CH - 0.5
        x, t = x + 0.25, t + 0.25
        if not kinds:
            rect(x, t, w, h, fc=CREAM, ec=INK, lw=0.4, z=3)
            return
        n = len(kinds)
        for i, k in enumerate(kinds):
            rect(x + i * w / n, t, w / n, h, fc=FACE[k][0], z=3)
        rect(x, t, w, h, ec=INK, lw=0.4, z=4)
        for i in range(1, n):
            cv.plot([x + i * w / n] * 2, [Tf(t), Tf(t + h)], color=INK, lw=0.4, zorder=4, solid_capstyle="butt")
        for i, k in enumerate(kinds):
            cx = x + (i + 0.5) * w / n
            if n == 1:
                text(cx, t + h / 2 + 0.05, CODE[k], fs=7, color=FACE[k][1], bold=True)
                if backbone and k == "hbond":
                    star(x + w - 0.8, t + 0.8)
            elif n == 2:
                if backbone and k == "hbond":
                    star(cx, t + h / 2, r=0.8)
                else:
                    text(cx, t + h / 2 + 0.05, CODE[k], fs=LAB, color=FACE[k][1], bold=True)

    colx, x = {}, X0
    prev = None
    for ci, n, c, _ in cols:
        g = group_of(c, n)
        if prev is not None and g != prev:
            x += GG
        colx[(c, n)] = x
        x += CW
        prev = g
    gx1 = x
    rowt = {(c, n): T0 + i * CH for i, (n, c, _) in enumerate(rows)}
    gt1 = T0 + len(rows) * CH
    for g in groups:                                              # faint cell grid under the tiles
        xs = [colx[(c, n)] for _, n, c, _ in cols if group_of(c, n) == g]
        x0, x1 = min(xs), max(xs) + CW
        for i in range(round((x1 - x0) / CW) + 1):
            cv.plot([x0 + i * CW] * 2, [Tf(T0), Tf(gt1)], color=GRID, lw=0.35, zorder=1, solid_capstyle="butt")
        for i in range(len(rows) + 1):
            cv.plot([x0, x1], [Tf(T0 + i * CH)] * 2, color=GRID, lw=0.35, zorder=1, solid_capstyle="butt")
    for r in rows_in:
        kinds = [k for k in ORDER if k in r["types"].split(";")]
        tile(colx[(r["binder_chain"], int(r["binder_num"]))], rowt[(r["antigen_chain"], int(r["antigen_num"]))], kinds, r["backbone_hbond"] == "yes")
    STRIP_T, STRIP_H = 14.6, 6.2
    strips = []
    for g in groups:                                              # loop strip above the columns: name and span on two lines
        chain, name = g.split(":")
        xs = [colx[(c, n)] for _, n, c, _ in cols if group_of(c, n) == g]
        x0, x1 = min(xs), max(xs) + CW
        k = chains.index(chain)
        order = list(loops.get(chain, {}))
        fill, tc = shades(k)[order.index(name)] if name in order and order.index(name) < 3 else (FILL["grey"], INK)
        span = f"{loops[chain][name][0]}–{loops[chain][name][1]}" if name in order else ""
        rect(x0, STRIP_T, x1 - x0, STRIP_H, fc=fill, ec=INK, lw=0.5, z=3)
        label = (f"{chain}-" if len(chains) > 1 else "") + (name.upper() if name != "other" else "other")
        text((x0 + x1) / 2, STRIP_T + (2.1 if span else 3.1), label, fs=7, bold=True, color=tc)
        if span:
            text((x0 + x1) / 2, STRIP_T + 4.7, span, fs=LAB, color=tc)
        strips.append(dict(group=g, x0=round(x0, 2), x1=round(x1, 2)))
    for ci, n, c, name in cols:
        text(colx[(c, n)] + CW / 2, T0 - 0.9, THREE(name) + str(n), va="bottom", rot=90)
    for n, c, name in rows:
        text(X0 - 1.0, rowt[(c, n)] + CH / 2 + 0.05, THREE(name) + str(n), ha="right")
    # key swatches (labels are in the page)
    KEY = dict(x=99.5, t=76.6, dx=41.5, dy=4.9)
    sw = [(["hbond"], False, 0, 0), (["polar"], False, 0, 1), (["weak_hbond"], False, 0, 2), (["carbonyl"], False, 0, 3), (["hydrophobic"], False, 0, 4),
          (["ring"], False, 1, 0), ([], False, 1, 1), (["hbond", "hydrophobic"], False, 1, 2), (["hbond"], True, 1, 3)]
    for kinds, bb, c, r_ in sw:
        tile(KEY["x"] + c * KEY["dx"], KEY["t"] + r_ * KEY["dy"], kinds, bb)
    meta = json.loads((Path(a.contacts).parent / "contacts.meta.json").read_text(encoding="utf-8")) if (Path(a.contacts).parent / "contacts.meta.json").exists() else {}
    data = dict(W=W, H=H, grid=dict(x0=X0, x1=round(gx1, 2), t0=T0, t1=round(gt1, 2), cw=round(CW, 2), ch=CH), strips=strips, key=KEY,
                n_cols=len(cols), n_rows=len(rows), n_pairs=len(rows_in), tool=meta.get("tool", ""), cutoff=meta.get("cutoff_A", 4.5), types=meta.get("types", {}),
                hbond_pairs=meta.get("hbond_pairs", 0), loops={c: {k: list(v) for k, v in d.items()} for c, d in loops.items()})
    out = Path(a.out)
    save_plot_layer(fig, out.with_suffix(".svg"))
    out.with_suffix(".js").write_text("window.DATA = " + json.dumps(data, indent=1) + ";\n", encoding="utf-8")
    print(json.dumps({k: data[k] for k in ("n_cols", "n_rows", "n_pairs", "tool")}))


if __name__ == "__main__":
    main()
