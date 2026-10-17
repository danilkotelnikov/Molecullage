"""Plot layer of the B cell figure: matplotlib draws the bars, the matrix and the scatter, the kit page draws every word.

    py -3 -B gallery/04-bcell-pathway/src/make_layer.py          # needs tables/ from src/derive.py

Writes page/layer.svg (transparent, text-free) and page/layer.js (window.DATA: positions in top-down millimetres for the page script).
Everything is drawn on one canvas in millimetres. Each dot is placed from its data value by one linear map, and the four marked dots are checked
against Tables S5 and S9 (assert_named). The page script checks column alignment, text overlap and the position of every count label again in the browser.

b  proportional bars: 4,440 regulators (activators only, both, repressors only) and 17,638 links (activating, repressing), Table S3.
c  matrix: log2 fold change of ten genes the paper names, under rapamycin (Table S5), LY2090314 (S9) and both (S10).
c  scatter: the 303 genes listed in both S5 and S9. Four genes are marked by shapes (circle, square, triangle, diamond): they sit inside the dense
   edge of the cloud, where no straight leader reaches an outside label without touching another dot (checked by search, see claims.md).
"""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
REPO = ROOT.parents[1]
sys.path.insert(0, str(REPO / "plots"))
from pal import EDGE, FILL, INK  # noqa: E402
from plot_layer import save_plot_layer  # noqa: E402
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import Circle, Polygon, Rectangle  # noqa: E402

MM = 1.0 / 25.4
W, H = 178.0, 199.8
# panel b: the role of a regulator (purple activator, apricot repressor). Panel c: the direction of an RNA change (maroon up, mint down). Two pairs, no colour shared.
ROLE_ACT, ROLE_REP = (FILL["peri"], EDGE["peri"]), (FILL["apricot"], EDGE["apricot"])
RNA_UP, RNA_DOWN = (FILL["maroon"], EDGE["maroon"]), (FILL["mint"], EDGE["mint"])
GREY_DOT, SHADE, HAIR = "#6B6B6B", "#EFEFEF", "#777777"

counts = json.loads((ROOT / "tables" / "counts.json").read_text(encoding="utf-8"))
ex = list(csv.DictReader((ROOT / "tables" / "example_genes.csv").open(encoding="utf-8")))
sh = list(csv.DictReader((ROOT / "tables" / "shared_303.csv").open(encoding="utf-8")))

Y = lambda t: H - t   # noqa: E731  top-down mm -> canvas mm

# ------------------------------------------------------------------ layout (top-down mm); the page script reads the same numbers from DATA
NAMED = ["IL4R", "CD86", "BACH2", "BCL6"]                    # genes the paper names that are listed under both drugs
SHAPES = dict(zip(NAMED, ["circle", "square", "triangle", "diamond"]))
LAY = dict(
    bars=dict(x0=44.0, w=70.0, h=6.0, t1=68.4, t2=80.6),
    matrix=dict(label_r=57.0, glyph_x=46.4, cols=[59.5, 82.9, 106.3], hdr_w=19.9, bar_dx=0.3, bar_w=12.6, num_r=19.7, unit=2.6, row=4.4,
                hdr_t=107.6, hdr_h=12.0, head1=124.0, genes1=[128.5, 132.9, 137.3], head2=142.2, genes2=[146.7, 151.1, 155.5, 159.9, 164.3, 168.7, 173.1],
                axis_t=175.8, ticks=[-2, 0, 2], bar_h=2.8),
    scatter=dict(x0=138.5, w=38.0, h=44.0, t0=120.5, xlim=(-3.5, 4.5), ylim=(-3.5, 3.5), xticks=[-2, 0, 2, 4], yticks=[-2, 0, 2], r=0.45, size=0.9),
    legend=dict(t=[175.2, 179.0], x=[139.0, 158.0]),
)
# the count of each corner: anchor in data units; the page aligns the text left or right of it and checks that no dot lies under it
CORNER_AT = {"ul": (-3.40, 1.64), "ur": (4.36, 3.12), "ll": (-3.40, -3.10), "lr": (4.40, -3.10)}


def canvas():
    fig = plt.figure(figsize=(W * MM, H * MM), dpi=100)
    fig.patch.set_alpha(0.0)
    cv = fig.add_axes([0, 0, 1, 1])
    cv.set_xlim(0, W)
    cv.set_ylim(0, H)
    cv.axis("off")
    return fig, cv


def rect(cv, x, t0, w, h, fc, ec=INK, lw=0.5, z=2):
    cv.add_patch(Rectangle((x, Y(t0 + h)), w, h, facecolor=fc, edgecolor=ec, linewidth=lw, zorder=z, joinstyle="miter"))


def line(cv, xs, ts, color=INK, lw=0.5, z=3, **kw):
    cv.plot(xs, [Y(t) for t in ts], color=color, lw=lw, solid_capstyle="butt", zorder=z, **kw)


def glyph(cv, kind, cx, ct, s=1.05, z=6):
    """A black shape with a white rim, centred on (cx, ct) in top-down mm: circle, square, triangle or diamond."""
    kw = dict(facecolor=INK, edgecolor="white", linewidth=0.35, zorder=z)
    if kind == "circle":
        cv.add_patch(Circle((cx, Y(ct)), s, **kw))
    elif kind == "square":
        cv.add_patch(Rectangle((cx - s * 0.9, Y(ct) - s * 0.9), s * 1.8, s * 1.8, **kw))
    elif kind == "triangle":
        cv.add_patch(Polygon([(cx, Y(ct - s * 1.25)), (cx - s * 1.2, Y(ct + s * 0.9)), (cx + s * 1.2, Y(ct + s * 0.9))], closed=True, joinstyle="miter", **kw))
    elif kind == "diamond":
        cv.add_patch(Polygon([(cx, Y(ct - s * 1.3)), (cx + s * 1.3, Y(ct)), (cx, Y(ct + s * 1.3)), (cx - s * 1.3, Y(ct))], closed=True, joinstyle="miter", **kw))
    else:
        raise ValueError(kind)


# ------------------------------------------------------------------ b: proportional bars
def draw_bars(cv, D):
    B = LAY["bars"]
    out = {}
    for key, t0, parts, total in (("regulators", B["t1"], [("act", counts["activators_only"]), ("both", counts["both_roles"]), ("rep", counts["repressors_only"])], counts["regulators"]),
                                  ("links", B["t2"], [("act", counts["activating_links"]), ("rep", counts["repressing_links"])], counts["links"])):
        assert sum(v for _, v in parts) == total, key
        x, segs = B["x0"], []
        for name, v in parts:
            w = B["w"] * v / total
            if name == "both":
                q = B["h"] / 4                     # both roles: a purple band above, an apricot band below, white between for the number and the word
                rect(cv, x, t0, w, q, ROLE_ACT[0], lw=0)
                rect(cv, x, t0 + B["h"] - q, w, q, ROLE_REP[0], lw=0)
                rect(cv, x, t0 + q, w, B["h"] - 2 * q, "white", lw=0)
                rect(cv, x, t0, w, B["h"], "none")
            else:
                rect(cv, x, t0, w, B["h"], (ROLE_ACT if name == "act" else ROLE_REP)[0])
            segs.append(dict(name=name, value=v, x=round(x, 3), w=round(w, 3), cx=round(x + w / 2, 3)))
            x += w
        assert abs(x - (B["x0"] + B["w"])) < 1e-6
        out[key] = dict(t=t0, h=B["h"], segs=segs, total=total)
    D["bars"] = out


# ------------------------------------------------------------------ c: matrix of named genes
def fnum(s):
    return None if s == "" else float(s)


def draw_matrix(cv, D):
    M = LAY["matrix"]
    genes = {r["gene"]: r for r in ex}
    order = [("Group 1 genes", M["head1"], M["genes1"], ["MSH2", "MSH6", "E2F2"]),
             ("Immune response genes", M["head2"], M["genes2"], ["IL4R", "CD86", "CD79A", "CD79B", "BACH2", "BCL6", "AICDA"])]
    rows_out, missing = [], 0
    for ci, c0 in enumerate(M["cols"]):
        z = c0 + M["bar_dx"] + M["bar_w"] / 2
        for ts in (M["genes1"], M["genes2"]):          # the zero line runs beside the gene rows only, never through a heading
            end = M["axis_t"] if ts is M["genes2"] else ts[-1] + M["row"] / 2
            line(cv, [z, z], [ts[0] - M["row"] / 2, end], color=HAIR, lw=0.4, z=1)
        line(cv, [z - M["bar_w"] / 2, z + M["bar_w"] / 2], [M["axis_t"]] * 2, color=INK, lw=0.5)
        for tk in M["ticks"]:
            line(cv, [z + tk * M["unit"]] * 2, [M["axis_t"], M["axis_t"] + 1.1], color=INK, lw=0.5)
        assert abs(M["ticks"][-1] * M["unit"]) <= M["bar_w"] / 2 + 1e-9
        assert M["bar_dx"] + M["bar_w"] < M["num_r"] - 5.0 and M["num_r"] <= M["hdr_w"], "number column sits right of its own bars and inside its head"
    assert M["cols"][1] - M["cols"][0] >= M["hdr_w"] + 3.0, "gap between mini-panels"
    keys = ("log2FC_rapamycin_S5", "log2FC_LY2090314_S9", "log2FC_both_S10")
    for title, head_t, ts, gs in order:
        rows_out.append(dict(kind="head", text=title, t=head_t))
        for g, t in zip(gs, ts):
            r = genes[g]
            vals = [fnum(r[k]) for k in keys]
            for ci, v in enumerate(vals):
                z = M["cols"][ci] + M["bar_dx"] + M["bar_w"] / 2
                if v is None:
                    missing += 1
                    continue
                assert abs(v) * M["unit"] <= M["bar_w"] / 2, (g, v)
                w = abs(v) * M["unit"]
                col = RNA_UP if v > 0 else RNA_DOWN
                rect(cv, z if v > 0 else z - w, t - M["bar_h"] / 2, w, M["bar_h"], col[0], ec=col[1], lw=0.5)
            if g in SHAPES:
                glyph(cv, SHAPES[g], M["glyph_x"], t)
            rows_out.append(dict(kind="gene", gene=g, t=t, vals=vals, shape=SHAPES.get(g)))
    # rapamycin direction of the two sets as the paper says: group 1 genes down, immune genes up
    for r in ex:
        v = float(r["log2FC_rapamycin_S5"])
        assert (v < 0) == (r["set"] == "Group 1 genes"), r["gene"]
    gene_rows = [r for r in rows_out if r["kind"] == "gene"]
    both_missing = sum(1 for r in gene_rows if r["vals"][2] is None)
    D["matrix"] = dict(M, rows=rows_out, missing=missing, n_genes=len(gene_rows), both_missing=both_missing, zero=[c + M["bar_dx"] + M["bar_w"] / 2 for c in M["cols"]])


# ------------------------------------------------------------------ c: scatter
def draw_scatter(cv, D):
    S = LAY["scatter"]
    x0, w, t0 = S["x0"], S["w"], S["t0"]
    (xa, xb), (ya, yb) = S["xlim"], S["ylim"]
    k = w / (xb - xa)                                 # mm per log2 unit along x
    h = S["h"]
    ky = h / (yb - ya)                                # mm per log2 unit along y (taller than wide: the axes are labelled)
    fx = lambda v: x0 + (v - xa) * k                  # noqa: E731
    ft = lambda v: t0 + (yb - v) * ky                 # noqa: E731  data value -> top-down mm
    for (u0, u1, v0, v1) in ((0, xb, ya, 0), (xa, 0, 0, yb)):     # shaded quadrants: the two where the drugs move a gene in opposite directions
        rect(cv, fx(u0), ft(v1), fx(u1) - fx(u0), ft(v0) - ft(v1), SHADE, ec="none", lw=0, z=0)
    line(cv, [x0, x0 + w], [ft(0)] * 2, color=HAIR, lw=0.4, z=1)
    line(cv, [fx(0)] * 2, [t0, t0 + h], color=HAIR, lw=0.4, z=1)
    line(cv, [x0, x0], [t0, t0 + h], color=INK, lw=0.5)
    line(cv, [x0, x0 + w], [t0 + h] * 2, color=INK, lw=0.5)
    for tk in S["xticks"]:
        line(cv, [fx(tk)] * 2, [t0 + h, t0 + h + 1.1], color=INK, lw=0.5)
    for tk in S["yticks"]:
        line(cv, [x0 - 1.1, x0], [ft(tk)] * 2, color=INK, lw=0.5)
    pts = [(float(r["log2FC_rapamycin_S5"]), float(r["log2FC_LY2090314_S9"]), r["gene"]) for r in sh]
    assert len(pts) == counts["shared_genes"] == 303
    for (a, b, g) in pts:
        assert xa < a < xb and ya < b < yb, g
        if g not in NAMED:
            cv.add_patch(Circle((fx(a), Y(ft(b))), S["r"], facecolor=GREY_DOT, edgecolor="none", alpha=0.75, zorder=4))
    D["scatter"] = dict(S, k=k, ky=ky, ft0=ft(0), fx0=fx(0), xt=[(tk, fx(tk)) for tk in S["xticks"]], yt=[(tk, ft(tk)) for tk in S["yticks"]])
    return pts, fx, ft


def draw_named(cv, pts, fx, ft):
    S = LAY["scatter"]
    byname = {g: (a, b) for a, b, g in pts}
    out = []
    for g in NAMED:
        a, b = byname[g]
        glyph(cv, SHAPES[g], fx(a), ft(b), S["size"])
        out.append(dict(gene=g, shape=SHAPES[g], value=(a, b), centre=(fx(a), ft(b))))
    return out


def assert_named(named, ex_rows, fx, ft):
    """Each marked dot sits at the log2 fold changes of Table S5 (x) and S9 (y) of its gene, to 0.05 mm, and those are the values printed in the matrix."""
    rows = {r["gene"]: r for r in ex_rows}
    for N in named:
        g = N["gene"]
        a, b = float(rows[g]["log2FC_rapamycin_S5"]), float(rows[g]["log2FC_LY2090314_S9"])
        assert abs(N["centre"][0] - fx(a)) < 0.05 and abs(N["centre"][1] - ft(b)) < 0.05, g
    assert len({N["shape"] for N in named}) == 4


def draw_legend(cv, D):
    L = LAY["legend"]
    cells = [(NAMED[0], L["x"][0], L["t"][0]), (NAMED[1], L["x"][1], L["t"][0]), (NAMED[2], L["x"][0], L["t"][1]), (NAMED[3], L["x"][1], L["t"][1])]
    for g, x, t in cells:
        glyph(cv, SHAPES[g], x, t, LAY["scatter"]["size"])
    D["legend"] = dict(L, cells=[dict(gene=g, x=x, t=t) for g, x, t in cells])


def main() -> None:
    fig, cv = canvas()
    D = {"W": W, "H": H, "counts": {k: v for k, v in counts.items() if k != "source"}}
    draw_bars(cv, D)
    draw_matrix(cv, D)
    pts, fx, ft = draw_scatter(cv, D)
    nm = draw_named(cv, pts, fx, ft)
    assert_named(nm, ex, fx, ft)
    draw_legend(cv, D)
    D["named"] = [dict(gene=N["gene"], shape=N["shape"], centre=[round(v, 3) for v in N["centre"]]) for N in nm]
    D["points_mm"] = [[round(fx(a), 3), round(ft(b), 3)] for a, b, g in pts]          # every dot, top-down mm: the page checks that no label sits on one
    D["corner_at"] = {k: [round(fx(u), 3), round(ft(v), 3)] for k, (u, v) in CORNER_AT.items()}
    reps = list(csv.DictReader((ROOT / "tables" / "reporters_47.csv").open(encoding="utf-8")))
    groups: dict[str, list[str]] = {}
    for r in reps:
        groups.setdefault(r["group_in_figure"], []).append(r["label_in_figure"])
    assert sum(len(v) for v in groups.values()) == 47
    D["groups"] = [dict(name=k, genes=v) for k, v in groups.items()]
    page = ROOT / "page"
    page.mkdir(exist_ok=True)
    save_plot_layer(fig, page / "layer.svg")
    (page / "layer.js").write_text("window.DATA = " + json.dumps(D, indent=1) + ";\n", encoding="utf-8")
    print("layer written; matrix cells not listed:", D["matrix"]["missing"], "; marked dots:", [(N["gene"], N["shape"]) for N in nm])


if __name__ == "__main__":
    main()
