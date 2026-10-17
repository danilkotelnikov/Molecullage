"""Plot layer of gallery piece 06-gpcr-snake-plot: the dot plot of the EC50 values of Tables 1 and 2 (panel c).

    py -3 -B gallery/06-gpcr-snake-plot/src/make_plots.py

Reads src/ec50_tables.py (copied as printed; src/check_tables.py compares it with the article text) and writes
  page/plot_layer.svg    matplotlib: pale plot areas, grid lines at the decades, two axes (under each block), tick labels, dots, diamonds and error bars
                         (ids dot_<row>, bar_<row>)
  page/plot_data.js      window.PLOT: every row, column and box position in page millimetres (x right, t down) and the printed numbers
  tables/ec50_published.csv   the numbers the figure plots, in the order they are drawn, with the table they come from
Nothing is fitted or recomputed. The log axis starts at 0.1 and ends at 500 micromolar. Error bars are mean +- SD as printed; the lower end of every bar is above zero (asserted).
A filled circle with a bar is a mean of three experiments; a filled diamond without a bar is a value from a single experiment (the shape differs from the circles of the snake plot).
The page script (page/06-gpcr-snake-plot.html) draws names, badges, numbers and captions at the positions in window.PLOT and checks them against this layer.
"""
from __future__ import annotations

import csv
import json
import math
import sys
from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from matplotlib.patches import Circle, Polygon, Rectangle

HERE = Path(__file__).resolve().parent
GAL = HERE.parent
ROOT = GAL.parents[1]
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(ROOT / "plots"))
from common import H, INK, W  # noqa: E402
from ec50_tables import DOUBLE, SINGLE  # noqa: E402
from plot_layer import MM, save_plot_layer  # noqa: E402
import pal  # noqa: E402

DOT = pal.FILL["indigo"]                      # one colour: a measured EC50
AREA = pal.FILL["palesky"]
GRID = "#FFFFFF"

# ------------------------------------------------------------------ geometry, page millimetres (t down from the top of the page)
PITCH = 5.0                                   # row pitch
SITE_GAP = 1.3                                # extra gap between the sites of the single-mutant block
T_COLHEAD = 13.6                              # row of the tick labels of the top axis and of the column headings over the numbers
T_AX_TOP = 16.2                               # the axis line of the top axis (ticks point up)
T_GROUP_A = 19.4                              # centre of the heading of block A
X_BADGE = (105.8, 108.9)
X_NAME = 111.7
X0, X1 = 133.0, 157.5                         # plot area, left and right
V0, V1 = 0.1, 500.0                           # micromolar, log axis
DP1, DP2 = 163.0, 171.4                       # decimal point of the mean, decimal point of the SD
X_ND = 161.2                                  # centre of "ND"
R_DOT = 0.8
CAP = 0.8                                     # half length of an error-bar cap
TICKS = (0.1, 1, 10, 100)


def xv(v: float) -> float:
    return X0 + (X1 - X0) * (math.log10(v) - math.log10(V0)) / (math.log10(V1) - math.log10(V0))


def split_number(s: str):
    """'36.3' -> ('36', '.3'); '148' -> ('148', '')  (the page right-aligns the first part and left-aligns the second on the decimal point)."""
    if "." in s:
        a, b = s.split(".")
        return a, "." + b
    return s, ""


def main():
    rows = []
    t = T_GROUP_A + 4.4
    prev_site = None
    for label, sites, mean, sd, n, tab in SINGLE:
        if prev_site is not None and sites != prev_site:
            t += SITE_GAP
        prev_site = sites
        rows.append(dict(id=label, group="A", label=label, sites=list(sites), mean=mean, sd=sd, n=n, table=tab, t=t))
        t += PITCH
    a_top, a_bot = rows[0]["t"] - PITCH / 2, rows[-1]["t"] + PITCH / 2
    t_group_b = a_bot + 6.4
    t = t_group_b + 4.4
    for label, sites, mean, sd, n, tab in DOUBLE:
        rows.append(dict(id=label.replace(" + ", "_"), group="B", label=label, sites=list(sites), mean=mean, sd=sd, n=n, table=tab, t=t))
        t += PITCH
    b_top, b_bot = [r for r in rows if r["group"] == "B"][0]["t"] - PITCH / 2, rows[-1]["t"] + PITCH / 2
    t_ax = b_bot + 1.0
    for r in rows:
        if r["mean"] is None:
            r.update(x=None, lo=None, hi=None)
            continue
        m = float(r["mean"])
        r["x"] = xv(m)
        if r["sd"] is not None:
            s = float(r["sd"])
            assert m - s > 0, r["id"]
            r["lo"], r["hi"] = xv(m - s), xv(m + s)
        else:
            r["lo"] = r["hi"] = None
        assert X0 < r["x"] < X1 and (r["hi"] is None or r["hi"] < X1)

    # ------------------------------------------------------------------ matplotlib layer on a millimetre canvas (origin bottom-left)
    fig = plt.figure(figsize=(W * MM, H * MM), dpi=100)
    fig.patch.set_alpha(0.0)
    cv = fig.add_axes([0, 0, 1, 1])
    cv.set_xlim(0, W)
    cv.set_ylim(0, H)
    cv.axis("off")
    Y = lambda tt: H - tt

    def marker_full(gid, x, tt):
        c = Circle((x, Y(tt)), R_DOT, facecolor=DOT, edgecolor=DOT, lw=0.5, zorder=5)
        c.set_gid(gid)
        cv.add_patch(c)

    def marker_single(gid, x, tt):
        d = R_DOT * 1.3
        p = Polygon([(x, Y(tt) + d), (x + d, Y(tt)), (x, Y(tt) - d), (x - d, Y(tt))], closed=True, facecolor=DOT, edgecolor=DOT, lw=0.5, zorder=5)
        p.set_gid(gid)
        cv.add_patch(p)

    def barcaps(gid, x0_, x1_, tt):
        bar = Line2D([x0_, x1_], [Y(tt)] * 2, color=DOT, lw=0.45, zorder=4, solid_capstyle="butt")
        bar.set_gid("bar_" + gid)
        cv.add_line(bar)
        for k, xe in enumerate((x0_, x1_)):
            cap = Line2D([xe, xe], [Y(tt) - CAP, Y(tt) + CAP], color=DOT, lw=0.45, zorder=4, solid_capstyle="butt")
            cap.set_gid(f"cap{k}_{gid}")
            cv.add_line(cap)

    for gid, (top, bot) in (("area_A", (a_top, a_bot)), ("area_B", (b_top, b_bot))):
        p = Rectangle((X0, Y(bot)), X1 - X0, bot - top, facecolor=AREA, edgecolor="none", zorder=0)
        p.set_gid(gid)
        cv.add_patch(p)
    for v in TICKS:
        for gid, (top, bot) in (("A", (a_top, a_bot)), ("B", (b_top, b_bot))):
            ln = Line2D([xv(v)] * 2, [Y(top), Y(bot)], color=GRID, lw=0.9, zorder=1, solid_capstyle="butt")
            ln.set_gid(f"grid_{gid}_{v}")
            cv.add_line(ln)
    for r in rows:
        ln = Line2D([X0, X1], [Y(r["t"])] * 2, color=GRID, lw=0.35, zorder=1, solid_capstyle="butt")
        ln.set_gid(f"rowline_{r['id']}")
        cv.add_line(ln)
    for g, tax, sgn in (("A", T_AX_TOP, -1), ("B", t_ax, 1)):       # the axis is drawn twice: over block A (ticks and labels above) and under block B
        ax_line = Line2D([X0, X1], [Y(tax)] * 2, color=INK, lw=0.5, zorder=3, solid_capstyle="butt")
        ax_line.set_gid(f"axis_{g}")
        cv.add_line(ax_line)
        for v in TICKS:
            tk = Line2D([xv(v)] * 2, [Y(tax), Y(tax + sgn * 1.4)], color=INK, lw=0.5, zorder=3, solid_capstyle="butt")
            tk.set_gid(f"tick_{g}_{v}")
            cv.add_line(tk)
            cv.text(xv(v), Y(tax + sgn * 1.9), f"{v:g}", ha="center", va="bottom" if sgn < 0 else "top", fontsize=6.55, color=INK, gid=f"ticklab_{g}_{v}")
    for r in rows:
        if r["x"] is None:
            continue
        if r["lo"] is not None:
            barcaps(r["id"], r["lo"], r["hi"], r["t"])
        (marker_full if r["n"] == 3 else marker_single)(f"dot_{r['id']}", r["x"], r["t"])
    # key glyphs
    key_t = t_ax + 12.6
    key = dict(t=[key_t, key_t + 3.5, key_t + 7.0], x_glyph=X_BADGE[0] - 1.0)
    gx = key["x_glyph"] + 2.2
    barcaps("key", gx - 2.0, gx + 2.0, key["t"][0])
    marker_full("key_dot_full", gx, key["t"][0])
    marker_single("key_dot_single", gx, key["t"][1])
    key["x_gx"] = gx
    save_plot_layer(fig, GAL / "page" / "plot_layer.svg")

    # ------------------------------------------------------------------ data for the page
    for r in rows:
        if r["mean"] is not None:
            r["mean_int"], r["mean_frac"] = split_number(r["mean"])
        if r["sd"] is not None:
            r["sd_int"], r["sd_frac"] = split_number(r["sd"])
    P = dict(W=W, H=H, rows=rows, groups=dict(A=dict(top=a_top, bot=a_bot, head_t=T_GROUP_A), B=dict(top=b_top, bot=b_bot, head_t=t_group_b)), t_ax=t_ax, t_ax_top=T_AX_TOP,
             t_colhead=T_COLHEAD, x_badge=list(X_BADGE), x_name=X_NAME, x0=X0, x1=X1, dp1=DP1, dp2=DP2, x_nd=X_ND, ticks=[[v, xv(v)] for v in TICKS], r_dot=R_DOT,
             pitch=PITCH, key=key, v0=V0, v1=V1, bottom=key_t + 7.0 + 1.5)
    (GAL / "page" / "plot_data.js").write_text("window.PLOT = " + json.dumps(P, separators=(",", ":")) + ";\n", encoding="utf-8")
    (GAL / "tables").mkdir(exist_ok=True)
    with open(GAL / "tables" / "ec50_published.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["row", "sites_changed", "table", "EC50_uM_as_printed", "SD_uM_as_printed", "independent_experiments", "drawn_as"])
        for r in rows:
            w.writerow([r["label"], "+".join(map(str, r["sites"])), r["table"], r["mean"] or "ND", r["sd"] or "", r["n"] or "", "no mark (ND)" if r["mean"] is None else
                        ("diamond, no bar" if r["n"] == 1 else "circle and +-SD bar")])
    print("rows", len(rows), "| block A t %.1f to %.1f | block B t %.1f to %.1f | axis t %.1f | key to t %.1f" % (a_top, a_bot, b_top, b_bot, t_ax, P["bottom"]))


if __name__ == "__main__":
    main()
