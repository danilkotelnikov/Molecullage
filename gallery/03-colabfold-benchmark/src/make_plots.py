"""Plot layer of gallery piece 03 (redesign of Fig. 2 of Mirdita et al. 2022, Nature Methods 19:679-682).

    py -3 -B gallery/03-colabfold-benchmark/src/make_plots.py

Reads data/41592_2022_1488_MOESM4_ESM.xlsx (Source Data Fig. 2; run fetch_data.py first), checks it against the numbers the paper prints,
and writes
  page/plots_layer.svg   matplotlib: plot areas, axes, ticks, data marks, key glyphs (text kept as text, transparent)
  page/plots_layer.js    window.DATA: every box and column position in millimetres (top-down) and the printed numbers
  tables/*.csv           the numbers the figure plots, in the order they are drawn

All positions are millimetres from the top-left corner of the 178 mm page. The page script (page/03-colabfold-benchmark.html) draws titles, axis
captions, the key texts and the printed numbers at the positions in window.DATA and checks them against the rendered layer.

Sheet names in the xlsx are shifted against the figure: sheet "fig2c" holds the proteome run times (panel d of the figure) and sheet "fig2d" holds
the DockQ values (panel c of the figure). This script reads them by what they contain and asserts the headers.
"""
from __future__ import annotations

import csv
import json
import statistics
import sys
from pathlib import Path

import numpy as np
import openpyxl
from matplotlib.patches import Rectangle

HERE = Path(__file__).resolve().parent
GAL = HERE.parent
ROOT = GAL.parents[1]
sys.path.insert(0, str(ROOT / "plots"))
from plot_layer import FONTS, mm_axes, new_plot_canvas, save_plot_layer  # noqa: E402
import pal  # noqa: E402

XLSX = GAL / "data" / "41592_2022_1488_MOESM4_ESM.xlsx"
OUT_PAGE = GAL / "page"
OUT_TAB = GAL / "tables"

# ------------------------------------------------------------------ palette: one hex per software + sequence database, the same in every panel
INK, SUB, RULE = pal.INK, pal.SUB, pal.RULE
GUIDE = pal.load()["guide"]                      # token color.guide, #777777
PLOT_AREA = pal.FILL["palesky"]                  # plot-area background, as in examples/plots2
SERIES = {                                       # key: the method name used in the xlsx, in the order of the paper's legend
    "AlphaFold2": dict(c=GUIDE, m="o", ms=2.4),
    "AlphaFold-Colab": dict(c=pal.EDGE["apricot"], m="s", ms=2.1),
    "ColabFold-AlphaFold2-BFD/MGnify": dict(c=pal.FILL["indigo"], m="D", ms=2.2),
    "ColabFold-AlphaFold2-ColabFoldDB": dict(c=pal.EDGE["mint"], m="^", ms=2.7),
    "ColabFold-RoseTTAFold-BFD/MGnify": dict(c=pal.FILL["peri"], m="v", ms=2.7),
}
C_AF, C_COLAB, C_BFD, C_CFDB, C_RF = (SERIES[k]["c"] for k in SERIES)
BFD_SEARCH_KEY = {"af2": "AlphaFold2", "af2colab": "AlphaFold-Colab", "bfd": "ColabFold-AlphaFold2-BFD/MGnify", "colabfolddb": "ColabFold-AlphaFold2-ColabFoldDB"}

# ------------------------------------------------------------------ numbers printed in the paper's text (copied as written)
PAPER_FM_MEANS = {"ColabFold-AlphaFold2-BFD/MGnify": 0.826, "ColabFold-AlphaFold2-ColabFoldDB": 0.818, "AlphaFold2": 0.79,
                  "AlphaFold-Colab": 0.744, "ColabFold-RoseTTAFold-BFD/MGnify": 0.62}
PAPER_ALL_MEANS = {"ColabFold-AlphaFold2-BFD/MGnify": 0.887, "ColabFold-AlphaFold2-ColabFoldDB": 0.886, "AlphaFold2": 0.888,
                   "ColabFold-RoseTTAFold-BFD/MGnify": 0.754}     # all 91 domains; AlphaFold-Colab left out by the paper

# ------------------------------------------------------------------ layout, millimetres from the top-left corner
W, H = 178.0, 168.5
X0, X1, CW = 1.5, 91.0, 85.5                     # left and right panel edges, panel width (gap 4 mm, outer margin 1.5 mm)
T1, T2 = 19.0, 89.3                              # top of the two panel rows
BOX = {                                          # (x, t, w, h) of every plot area, top-down
    "a": dict(x=X0 + 13.0, t=T1 + 15.0, w=71.0, h=36.0),
    "b": dict(x=X1 + 13.0, t=T1 + 15.0, w=71.0, h=36.0),
    "d": dict(x=X1 + 13.5, t=T2 + 20.6, w=40.0, h=42.5),
}
CBOX = [dict(x=X0 + 9.0 + i * 26.0, t=T2 + 20.6, w=22.0, h=42.5) for i in range(3)]      # panel c: three bar columns
BOX["c"] = dict(x=CBOX[0]["x"], t=CBOX[0]["t"], w=CBOX[2]["x"] + CBOX[2]["w"] - CBOX[0]["x"], h=42.5)
A_PITCH, A_PAD, A_GAP = 7.0, 1.2, 3.0            # panel a: column pitch, pad inside a block, gap between blocks
YA = (0.2, 1.01)                                 # panel a y range (TM-score)
MM = 25.4
KEY = dict(heading_t=2.8, rows_t=[6.4, 9.6, 12.8, 16.0], glyph_dx=1.8, text_dx=4.6)


def mm_box(fig, b, **kw):
    return mm_axes(fig, b["x"], H - b["t"] - b["h"], b["w"], b["h"], **kw)


def read_sheets():
    wb = openpyxl.load_workbook(XLSX, data_only=True)

    def rows(name, header):
        it = wb[name].iter_rows(values_only=True)
        h = tuple(next(it))
        assert h[1:] == header, f"sheet {name}: unexpected header {h}"
        return [r[1:] for r in it]

    return dict(
        a=rows("fig2a", ("target", "tmscore", "method", "is_fm", "cancelled")),
        b=rows("fig2b", ("target", "time", "length", "method", "linetype", "name")),
        c=rows("fig2d", ("target", "dockq", "db", "pairing")),          # DockQ: panel c of the figure
        d=rows("fig2c", ("id", "run", "value", "linetype")),            # proteome run time: panel d of the figure
    )


def swarm(ymm, dia, halfw):
    """Deterministic strip layout: x offsets (mm) for the dots of one column. Dots are placed from the lowest up; each takes the offset (grid of 0.2 mm,
    inside +-halfw) that is farthest from the dots already placed, the one nearest the centre among equals. Where the column is full, dots overlap a little.
    Returns the offsets and the number of dots that sit closer than 0.6 dia to another."""
    order = np.argsort(ymm, kind="stable")
    cand = np.round(np.arange(-halfw, halfw + 1e-9, 0.2), 3)
    placed = []
    xs = np.zeros(len(ymm))
    for i in order:
        if not placed:
            got = 0.0
        else:
            px = np.array([q[0] for q in placed])
            py = np.array([q[1] for q in placed])
            dmin = np.sqrt((cand[:, None] - px[None, :]) ** 2 + (ymm[i] - py[None, :]) ** 2).min(axis=1)
            cap = min(dmin.max(), dia)                                   # distances beyond one dot diameter are equal: prefer the centre
            ok = np.where(dmin >= cap - 1e-9)[0]
            got = float(cand[ok[np.argmin(np.abs(cand[ok]))]])
        xs[i] = got
        placed.append((got, ymm[i]))
    px, py = xs, np.asarray(ymm)
    close = 0
    for i in range(len(xs)):
        d = np.sqrt((px - px[i]) ** 2 + (py - py[i]) ** 2)
        d[i] = 9
        close += int(d.min() < 0.6 * dia)
    return xs, close


def pale(ax, gid, box_axes=(0, 0, 1, 1)):
    r = Rectangle(box_axes[:2], box_axes[2], box_axes[3], transform=ax.transAxes, facecolor=PLOT_AREA, edgecolor="none", zorder=0, clip_on=False)
    r.set_gid(gid)
    ax.add_patch(r)
    return r


def style_axes(ax):
    ax.patch.set_alpha(0.0)
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    ax.tick_params(length=2.0, width=0.5, pad=1.8, labelsize=6.55)
    for s in ("left", "bottom"):
        ax.spines[s].set_linewidth(0.5)
        ax.spines[s].set_color(pal.LINE)


def write_csv(name, header, rows, note):
    OUT_TAB.mkdir(exist_ok=True)
    with open(OUT_TAB / name, "w", newline="", encoding="utf-8") as f:
        f.write("# " + note + "\n")
        w = csv.writer(f, lineterminator="\n")
        w.writerow(header)
        w.writerows(rows)


def main() -> None:
    S = read_sheets()
    SRC = "Mirdita et al. 2022, Nature Methods 19:679-682, doi 10.1038/s41592-022-01488-1 (CC BY 4.0), Source Data Fig. 2, sheet "
    fig, cv = new_plot_canvas(W, H)
    D = dict(W=W, H=H, X0=X0, X1=X1, CW=CW, T1=T1, T2=T2, box={k: v for k, v in BOX.items()}, cbox=CBOX, key=KEY, a={}, b={}, c={}, d={}, series={})
    for k, v in SERIES.items():
        D["series"][k] = dict(c=v["c"], m=v["m"])

    # ---------------------------------------------------------------- a: TM-score of 91 domains, five setups
    A = S["a"]
    assert all(not r[4] for r in A), "a cancelled prediction is flagged"
    tm = {}
    for target, v, m, fm, _ in A:
        tm.setdefault(m, {})[target] = (v, bool(fm))
    assert {m: len(t) for m, t in tm.items()} == {"AlphaFold2": 91, "AlphaFold-Colab": 28, "ColabFold-AlphaFold2-BFD/MGnify": 91, "ColabFold-AlphaFold2-ColabFoldDB": 91, "ColabFold-RoseTTAFold-BFD/MGnify": 91}
    n_fm = sum(1 for t, (v, fm) in tm["AlphaFold2"].items() if fm)
    assert n_fm == 28 and len(tm["AlphaFold2"]) == 91
    mean_fm = {m: statistics.mean(v for v, fm in t.values() if fm) for m, t in tm.items()}
    mean_all = {m: statistics.mean(v for v, fm in t.values()) for m, t in tm.items()}
    for m, p in PAPER_FM_MEANS.items():
        assert round(mean_fm[m], 3) == p, (m, mean_fm[m], p)
    for m, p in PAPER_ALL_MEANS.items():
        assert round(mean_all[m], 3) == p, (m, mean_all[m], p)
    mean_63 = {m: statistics.mean(v for v, fm in t.values() if not fm) for m, t in tm.items() if m != "AlphaFold-Colab"}   # computed here: the 63 dots drawn in the right block
    assert {m: round(v, 3) for m, v in mean_63.items()} == {"AlphaFold2": 0.932, "ColabFold-AlphaFold2-BFD/MGnify": 0.914, "ColabFold-AlphaFold2-ColabFoldDB": 0.915, "ColabFold-RoseTTAFold-BFD/MGnify": 0.813}
    cols_fm = list(SERIES)                                     # five columns
    cols_ot = [k for k in SERIES if k != "AlphaFold-Colab"]    # four columns (AlphaFold-Colab ran the free-modelling domains only)
    ba = BOX["a"]
    ax = mm_box(fig, ba)
    style_axes(ax)
    ax.set_xlim(0, ba["w"])
    ax.set_ylim(*YA)
    ax.spines["bottom"].set_visible(False)
    ax.set_xticks([])
    ax.set_yticks([0.2, 0.4, 0.6, 0.8, 1.0])
    ax.set_yticklabels(["0.2", "0.4", "0.6", "0.8", "1.0"])
    w_fm = 2 * A_PAD + len(cols_fm) * A_PITCH
    w_ot = 2 * A_PAD + len(cols_ot) * A_PITCH
    assert w_fm + A_GAP + w_ot <= ba["w"] + 1e-6, (w_fm, w_ot)
    blocks = [("fm", 0.0, w_fm, cols_fm, True), ("ot", w_fm + A_GAP, w_ot, cols_ot, False)]
    ypx = ba["h"] / (YA[1] - YA[0])
    over_total, a_cols, a_rows = 0, [], []
    for key, bx, bw, cols, is_fm in blocks:
        r = Rectangle((bx, YA[0]), bw, YA[1] - YA[0], facecolor=PLOT_AREA, edgecolor="none", zorder=0, clip_on=False)
        r.set_gid(f"a_block_{key}")
        ax.add_patch(r)
        for v in (0.4, 0.6, 0.8, 1.0):
            ax.plot([bx, bx + bw], [v, v], color="white", lw=0.6, zorder=1, solid_capstyle="butt")
        for i, m in enumerate(cols):
            cx = bx + A_PAD + (i + 0.5) * A_PITCH
            pts = [(t, v) for t, (v, fm) in tm[m].items() if fm == is_fm]
            assert len(pts) == (28 if is_fm else 63), (m, key, len(pts))
            ys = np.array([(v - YA[0]) * ypx for _, v in pts])
            dia = SERIES[m]["ms"] / 72 * MM + 0.1
            xs, over = swarm(ys, dia, 2.6)
            over_total += over
            s = SERIES[m]
            ax.plot(cx + xs, [v for _, v in pts], linestyle="none", marker=s["m"], ms=s["ms"], mfc=s["c"], mec="white", mew=0.3, zorder=3, clip_on=False)
            for (t, v), x in zip(pts, xs):
                a_rows.append((t, m, "free-modelling" if is_fm else "other", f"{v:.5f}"))
            mv = PAPER_FM_MEANS[m] if is_fm else mean_63[m]       # left block: the mean the paper states for the 28 domains; right block: the mean of the 63 dots, computed here
            mb, = ax.plot([cx - 0.42 * A_PITCH, cx + 0.42 * A_PITCH], [mv, mv], color=INK, lw=1.0, solid_capstyle="butt", zorder=4)
            mb.set_gid(f"a_mean_{len(a_cols)}")
            a_cols.append(dict(block=key, m=m, x=ba["x"] + cx, mean=f"{mv:.3f}", mean_t=ba["t"] + ba["h"] - (mv - YA[0]) * ypx,
                               mean91=(None if is_fm or m not in PAPER_ALL_MEANS else f"{PAPER_ALL_MEANS[m]:.3f}")))
    print("dots closer than 0.6 diameters to a neighbour:", over_total, "of 392")
    D["a"] = dict(cols=a_cols, blocks=[dict(key=k, x=ba["x"] + bx, w=bw) for k, bx, bw, _, _ in blocks], n_fm=n_fm, n_other=63, box_bottom=ba["t"] + ba["h"],
                  mean_fm_computed={m: round(v, 5) for m, v in mean_fm.items()}, mean_all_computed={m: round(v, 5) for m, v in mean_all.items()}, mean_63_computed={m: round(v, 5) for m, v in mean_63.items()})
    write_csv("fig2a_means.csv", ["setup", "free_modelling_28_paper", "free_modelling_28_computed", "other_63_computed", "all_91_paper", "all_91_computed"],
              [(m, PAPER_FM_MEANS[m], f"{mean_fm[m]:.5f}", (f"{mean_63[m]:.5f}" if m in mean_63 else ""), PAPER_ALL_MEANS.get(m, ""), (f"{mean_all[m]:.5f}" if m in PAPER_ALL_MEANS else "")) for m in SERIES],
              SRC + "fig2a. Paper columns are the numbers printed in the paper's text; computed columns are plain means of the sheet values. Only the 63-domain means are not in the paper.")
    write_csv("fig2a_tmscore.csv", ["domain", "setup", "group", "tmscore"], a_rows, SRC + "fig2a. Group = is_fm of the sheet (free-modelling target or not).")

    # ---------------------------------------------------------------- b: search (MSA generation) time against protein length, 20 free-modelling targets
    B = S["b"]
    assert {r[3] for r in B} == set(BFD_SEARCH_KEY) and {r[4] for r in B} == {"MSA generation"}
    bb = BOX["b"]
    ax = mm_box(fig, bb)
    style_axes(ax)
    ax.set_xscale("log")
    ax.set_yscale("log")
    XB, YB = (80, 1200), (0.1, 400)
    ax.set_xlim(*XB)
    ax.set_ylim(*YB)
    ax.set_xticks([100, 200, 500, 1000])
    ax.set_xticklabels(["100", "200", "500", "1,000"])
    ax.set_yticks([0.1, 1, 10, 100])
    ax.set_yticklabels(["0.1", "1", "10", "100"])
    ax.minorticks_off()
    pale(ax, "b_area")
    for v in (1, 10, 100):
        ax.plot(XB, [v, v], color="white", lw=0.6, zorder=1)
    for v in (200, 500, 1000):
        ax.plot([v, v], YB, color="white", lw=0.6, zorder=1)
    b_rows = []
    lens = {}
    secs = {}
    for key in ("af2colab", "bfd", "colabfolddb", "af2"):                         # drawing order: AlphaFold2 (grey) last, so that it sits on top of AlphaFold-Colab
        sub = sorted(((r[2], r[1], r[0]) for r in B if r[3] == key))          # (length, seconds, target)
        secs[key] = {tg: sec for _, sec, tg in sub}
        z = 4 if key == "af2" else 2
        assert len(sub) == 20
        s = SERIES[BFD_SEARCH_KEY[key]]
        xs = [a for a, _, _ in sub]
        ys = [sec / 60.0 for _, sec, _ in sub]
        ax.plot(xs, ys, color=s["c"], lw=0.7, zorder=z)
        ax.plot(xs, ys, linestyle="none", marker=s["m"], ms=s["ms"], mfc=s["c"], mec="white", mew=0.3, zorder=z + 0.5)
        for (ln, sec, tg) in sub:
            lens.setdefault(tg, set()).add(ln)
            b_rows.append((tg, ln, BFD_SEARCH_KEY[key], f"{sec}", f"{sec / 60.0:.4f}"))
    assert all(len(v) == 1 for v in lens.values()) and len(lens) == 20
    write_csv("fig2b_search_time.csv", ["target", "length_aa", "setup", "seconds_as_in_sheet", "minutes_plotted"], b_rows,
              SRC + "fig2b (rows with linetype MSA generation; the sheet has no model-run rows). Minutes = seconds / 60.")
    tg20 = sorted(secs["af2"])
    med = lambda a, b: statistics.median(secs[a][t] / secs[b][t] for t in tg20)          # median over the 20 targets of the ratio of search times, computed here
    ratios = {f"{a}/{b}": med(a, b) for a in ("af2", "af2colab") for b in ("bfd", "colabfolddb")}
    print("median search-time ratios:", {k: round(v, 3) for k, v in ratios.items()})
    write_csv("fig2b_ratios.csv", ["pair", "median_ratio_of_search_times_20_targets"], [(k, f"{v:.3f}") for k, v in ratios.items()],
              SRC + "fig2b. Per target, seconds of the first setup divided by seconds of the second (af2 = AlphaFold2, af2colab = AlphaFold-Colab, bfd = ColabFold BFD/MGnify, colabfolddb = ColabFold ColabFoldDB); median over the 20 targets. Computed here, not in the paper.")
    D["b"] = dict(xlim=XB, ylim=YB, n_targets=20, lengths=[min(v) for v in lens.values()], ratios={k: round(v, 3) for k, v in ratios.items()},
                  ratio_af2=f"{ratios['af2/bfd']:.0f}", ratio_colab=f"{ratios['af2colab/bfd']:.0f}")

    # ---------------------------------------------------------------- c: DockQ of 17 complexes, three columns, rows sorted by the AlphaFold-multimer value
    C = S["c"]
    modes = [("AlphaFold-multimer", C_AF), ("ColabFold-unpaired+paired-multimer", C_BFD), ("ColabFold-unpaired+paired-residue-index", C_BFD)]
    dq = {m: {r[0]: r[1] for r in C if r[2] == m} for m, _ in modes}
    assert all(len(v) == 17 for v in dq.values()) and len({tuple(sorted(v)) for v in dq.values()}) == 1
    order = sorted(dq["AlphaFold-multimer"], key=lambda t: -dq["AlphaFold-multimer"][t])
    c_rows = [(t, *[f"{dq[m][t]}" for m, _ in modes]) for t in order]
    write_csv("fig2c_dockq.csv", ["target", "AlphaFold-multimer", "ColabFold multimer mode", "ColabFold residue-index mode"], c_rows,
              SRC + "fig2d (the sheet names are shifted against the figure: the sheet fig2d is panel c). Rows sorted by the AlphaFold-multimer value, high to low.")
    for j, ((m, col), cb) in enumerate(zip(modes, CBOX)):
        ax = mm_box(fig, cb)
        style_axes(ax)
        ax.set_xlim(0, 1)
        ax.set_ylim(len(order) - 0.5, -0.5)
        pale(ax, f"c_area_{j}")
        for v in (0.5, 1.0):
            ax.plot([v, v], [-0.5, len(order) - 0.5], color="white", lw=0.6, zorder=1)
        vals = [dq[m][t] for t in order]
        bars = ax.barh(range(len(order)), vals, height=0.74, color=col, edgecolor="none", zorder=2)
        for i, bar in enumerate(bars):
            bar.set_gid(f"c_bar_{j}_{i}")
        ax.set_xticks([0, 0.5, 1])
        ax.set_xticklabels(["0", "0.5", "1"])
        ax.spines["left"].set_visible(True)
        if j == 0:
            ax.set_yticks(range(len(order)))
            ax.set_yticklabels(order)
            ax.tick_params(axis="y", length=0, pad=2.2)
        else:
            ax.set_yticks([])
    D["c"] = dict(order=order, n=17, row_pitch=BOX["c"]["h"] / 17)

    # ---------------------------------------------------------------- d: proteome run time, cumulative, log axis in hours
    Dd = S["d"]
    runs = {}
    for i, run, val, lt in Dd:
        runs.setdefault(run, []).append((i, val, lt))
    spec = [("AlphaFold2 reduced_dbs (sampled)", C_AF, "dashed", 1.0), ("ColabFold Recompile", C_CFDB, "solid", 0.9),
            ("ColabFold Default", C_CFDB, "solid", 0.9), ("ColabFold Stop >= 85", C_CFDB, "solid", 0.9)]
    assert set(runs) == {r[0] for r in spec} and all(len(v) == 1762 for v in runs.values())
    for run, pts in runs.items():
        assert [p[0] for p in pts] == list(range(1, 1763)) and all(b[1] >= a[1] for a, b in zip(pts, pts[1:])), run
        assert {p[2] for p in pts} == {"dashed" if run.startswith("AlphaFold2") else "solid"}
    bd = BOX["d"]
    ax = mm_box(fig, bd)
    style_axes(ax)
    XD, YD = (0, 1762), (1, 10000)
    ax.set_xlim(*XD)
    ax.set_yscale("log")
    ax.set_ylim(*YD)
    ax.set_xticks([0, 500, 1000, 1500])
    ax.set_xticklabels(["0", "500", "1,000", "1,500"])
    ax.set_yticks([1, 10, 100, 1000, 10000])
    ax.set_yticklabels(["1", "10", "100", "1,000", "10,000"])
    ax.minorticks_off()
    pale(ax, "d_area")
    for v in (10, 100, 1000):
        ax.plot(XD, [v, v], color="white", lw=0.6, zorder=1)
    for v in (500, 1000, 1500):
        ax.plot([v, v], YD, color="white", lw=0.6, zorder=1)
    t_search_h = runs["ColabFold Default"][0][1] / 3600.0          # first value of the three ColabFold runs: 6,780 s = 113 min
    assert abs(runs["ColabFold Default"][0][1] - 6780) < 1e-9 and runs["ColabFold Stop >= 85"][0][1] == runs["ColabFold Recompile"][0][1] == 6780
    ax.plot(XD, [t_search_h, t_search_h], color=SUB, lw=0.5, ls=(0, (1, 1.5)), zorder=2)
    d_lines = {}
    ypx_d = bd["h"] / np.log10(YD[1] / YD[0])
    for run, col, ls, lw in spec:
        pts = [(i, v / 3600.0) for i, v, _ in runs[run] if v > 0]       # a log axis cannot show the first value of the extrapolated line (0 s)
        ln, = ax.plot([p[0] for p in pts], [p[1] for p in pts], color=col, lw=lw, ls=(0, (3.2, 1.8)) if ls == "dashed" else "-", zorder=3, solid_capstyle="butt", dash_capstyle="butt")
        gid = "d_line_" + run.split()[1 if run.startswith("ColabFold") else 0].lower().replace(">=", "ge")
        ln.set_gid(gid)
        end_i, end_h = pts[-1]
        d_lines[run] = dict(gid=gid, end_x=bd["x"] + bd["w"] * (end_i - XD[0]) / (XD[1] - XD[0]), end_t=bd["t"] + bd["h"] - ypx_d * np.log10(end_h / YD[0]),
                            hours=end_h, label=f"{end_h:,.0f} h")
    write_csv("fig2d_proteome_end_values.csv", ["run", "last_protein_number", "seconds_as_in_sheet", "hours_plotted"],
              [(r, 1762, f"{runs[r][-1][1]}", f"{runs[r][-1][1] / 3600.0:.4f}") for r, *_ in spec],
              SRC + "fig2c (the sheet names are shifted against the figure: the sheet fig2c is panel d). Only the last point of each of the four lines; the full curves are read from the xlsx at build time (1,762 values per run, cumulative seconds).")
    D["d"] = dict(xlim=XD, ylim=YD, lines=d_lines, search_min=runs["ColabFold Default"][0][1] / 60.0, search_t=bd["t"] + bd["h"] - ypx_d * np.log10(t_search_h / YD[0]))
    assert round(d_lines["ColabFold Stop >= 85"]["hours"]) == 48 and round(runs["ColabFold Default"][0][1] / 60) == 113

    # ---------------------------------------------------------------- key glyphs (text is drawn by the page)
    def glyph(x, t, s, gid):
        g, = cv.plot([x], [H - t], linestyle="none", marker=s["m"], ms=s["ms"] * 1.45, mfc=s["c"], mec="white", mew=0.3, zorder=5)
        g.set_gid(gid)

    ks = [("af2", "AlphaFold2", X0, 0), ("afmm", "AlphaFold2", X0, 1), ("afcolab", "AlphaFold-Colab", X0, 2), ("bfd", "ColabFold-AlphaFold2-BFD/MGnify", X1, 0),
          ("db", "ColabFold-AlphaFold2-ColabFoldDB", X1, 1), ("rf", "ColabFold-RoseTTAFold-BFD/MGnify", X1, 2)]     # afmm: AlphaFold-multimer has the AlphaFold2 grey
    kg = []
    for kid, m, x, r in ks:
        gx, gt = x + KEY["glyph_dx"], KEY["rows_t"][r]
        glyph(gx, gt, SERIES[m], f"key_glyph_{len(kg)}")
        kg.append(dict(id=kid, m=m, x=gx, t=gt, col=0 if x == X0 else 1, row=r))
    D["keyglyphs"] = kg
    # glyphs under the columns of panel a (same marker as in the key)
    GT = T1 + 53.2
    for i, c in enumerate(D["a"]["cols"]):
        glyph(c["x"], GT, SERIES[c["m"]], f"a_glyph_{i}")
    D["a"]["glyph_t"] = GT

    OUT_PAGE.mkdir(exist_ok=True)
    save_plot_layer(fig, OUT_PAGE / "plots_layer.svg")
    (OUT_PAGE / "plots_layer.js").write_text("window.DATA = " + json.dumps(D, indent=1) + ";\n", encoding="utf-8")
    print(json.dumps(dict(fonts=FONTS, fm_means={m[:22]: round(v, 3) for m, v in mean_fm.items()}, d_end_hours={k[:20]: round(v["hours"], 2) for k, v in d_lines.items()},
                          dockq_first_last=[order[0], order[-1]])))


if __name__ == "__main__":
    main()
