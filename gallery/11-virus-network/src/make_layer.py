"""Layer of gallery piece 11 (redesign of Fig. 3 of Safi et al. 2026, The EMBO Journal 45(10):3514-3539, doi 10.1038/s44318-026-00770-8).

    py -3 -B gallery/11-virus-network/src/make_layer.py [--refit]

Reads tables/*.csv (written by src/derive.py from the downloaded data) and writes
  page/layer.svg   matplotlib: spokes, dots, strips, nodes, bars, matrix cells, key glyphs, PDB-complex rings (text is drawn by the page)
  page/layer.js    window.DATA: every position in millimetres (top-down, origin top-left of the 178 mm page), every label, every check
  tables/layout_a.json   the solved ring layout (cached; --refit solves again, about a minute)
Deterministic: the ring layout is an exhaustive search (no random numbers); the PDB rings use annealing with random.Random(1).
"""
from __future__ import annotations

import collections
import csv
import itertools
import json
import math
import random
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
GAL = HERE.parent
ROOT = GAL.parents[1]
for p in (HERE, ROOT / "plots", ROOT / "palette"):
    sys.path.insert(0, str(p))
import derive as dv  # noqa: E402
import layout_a as la  # noqa: E402
import pal  # noqa: E402
import colour as COL  # noqa: E402
from plot_layer import FONTS, save_plot_layer  # noqa: E402
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.collections import LineCollection, PatchCollection  # noqa: E402
from matplotlib.colors import LinearSegmentedColormap  # noqa: E402
from matplotlib.font_manager import FontProperties  # noqa: E402
from matplotlib.patches import Arc, Circle, PathPatch, Rectangle, Wedge  # noqa: E402
from matplotlib.path import Path as MPath  # noqa: E402
from matplotlib.textpath import TextPath  # noqa: E402

TAB = GAL / "tables"
OUT = GAL / "page"
MM = 1.0 / 25.4
PT = 72.0 / 25.4                                        # points per millimetre
W = 178.0
FL = 6.55                                               # type floor, pt (the ladder writes 6.5 as 6.55)
H_PAGE = 258.0

# ---------------------------------------------------------------- colours: one meaning each
INK, SUB = pal.INK, pal.SUB
BAIT = pal.FILL["maroon"]                               # a bait: node, and the line between two baits, and the shade of the shared-prey cells (all about baits)
GROUND = "#F1DEE7"                                      # pale ground behind the five baits of one subnetwork
SPOKE = "#9A9A9A"                                       # the only mid grey: a line from a bait to a prey it pulled down
SAND = "#EADFBF"                                        # function: Uncharacterized
# the 14 other functional categories of the paper, in four colour families (our grouping for colour only); tones run dark to light inside a family
FAMILIES = [
    ("DNA, RNA and translation", [("Transcription", "#1D397B"), ("DNA Replication and Repair", "#4B6CB0"), ("Translation and Ribosome Function", "#86A3D6"), ("Nucleotide Metabolism", "#C0D0EC")]),
    ("Proteins and enzymes", [("Protein Modification and Folding", "#8A4B00"), ("Hydrolases", "#E8962A"), ("Transferases", "#F8D2A0")]),
    ("Other metabolism", [("Carbohydrate Metabolism", "#25663A"), ("Oxidation-Reduction", "#01B151"), ("Amino Acid Metabolism", "#8FD3A9"), ("Lipid Metabolism", "#C9EBD6")]),
    ("Structure and assembly", [("Morphogenesis", "#6A1FA8"), ("Structural/Motifs/Protein binding", "#A15BE8"), ("Structural/Motifs/DNA binding", "#D4B4F4")]),
]
FCOL = {"Uncharacterized": SAND} | {c: h for _, cs in FAMILIES for c, h in cs}
assert set(FCOL) == set(dv.FUNC), set(dv.FUNC) ^ set(FCOL)

fp_reg = FontProperties(family=FONTS[0])
fp_bold = FontProperties(family=FONTS[0], weight="bold")


def tw(s: str, fs: float = FL, bold: bool = False) -> float:
    """Width of a string in millimetres, Arial at fs pt."""
    return TextPath((0, 0), s, size=fs, prop=fp_bold if bold else fp_reg).get_extents().width * 25.4 / 72 if s else 0.0


def read_csv(name: str) -> list[dict]:
    with open(TAB / name, encoding="utf-8") as f:
        f.readline()
        return list(csv.DictReader(f))


prey = la.read_prey()
baits_t = {r["bait"]: r for r in read_csv("baits.csv")}
pairs_t = read_csv("bait_pairs.csv")
blinks_t = read_csv("bait_links.csv")
pdb_t = read_csv("pdb_links.csv")
PREY = {r["id"]: r for r in prey}

LABELS: list[dict] = []
CHECKS: list[dict] = []


def lab(i, x, t, s, ha="left", fs=7.0, bold=False, color=INK, **kw):
    assert i not in {L["id"] for L in LABELS}, i
    LABELS.append(dict(id=i, x=round(x, 3), t=round(t, 3), s=s, ha=ha, fs=fs, bold=bold, color=color, **kw))


def chk(gid, cx=None, t=None, l=None, r=None, tol=0.25):
    CHECKS.append(dict(gid=gid, cx=cx, t=t, l=l, r=r, tol=tol))


def mmpt(v):
    return v * PT


def Y(t):
    return H_PAGE - t


fig = plt.figure(figsize=(W * MM, H_PAGE * MM), dpi=100)
fig.patch.set_alpha(0.0)
cv = fig.add_axes([0, 0, 1, 1])
cv.set_xlim(0, W)
cv.set_ylim(0, H_PAGE)
cv.axis("off")

# ================================================================ headline
HEADLINE = "Mimivirus: membrane baits find mostly viral prey (70/88 pairs); nucleoid and factory baits mostly host (305/461)"
assert tw(HEADLINE, 9, True) < W - 4.0, tw(HEADLINE, 9, True)
lab("headline", 1.5, 3.9, HEADLINE, fs=9, bold=True)

# ================================================================ panel a: baits on a ring, prey on an outer ring grouped by region
TA = 9.0                                                # top of panel a
CX, CY = 60.0, 75.5
RB, RP = 15.5, 44.0
SPREAD = 30.0
NODE_D = 6.4
TR = dict(fun=(RP + 1.6, RP + 4.0), org=(RP + 4.5, RP + 6.1), arc=RP + 8.0, badge=RP + 12.0)
FUN_C, ORG_C = RP + 2.8, RP + 5.3

LAYOUT_JSON = TAB / "layout_a.json"
key = dict(spread=SPREAD, gap=la.GAP_DEG, big=la.BIG_GAP, rb=RB, rp=RP, n=len(prey), v=2)
if LAYOUT_JSON.exists() and "--refit" not in sys.argv and json.loads(LAYOUT_JSON.read_text())["key"] == key:
    LAY = json.loads(LAYOUT_JSON.read_text())
else:
    best = la.solve(prey, SPREAD)
    LAY = dict(key=key, span=best[0], vm_rev=best[1], nvf_rev=best[2], rho=best[3], order=list(best[4]))
BANG = la.bait_angles(LAY["vm_rev"], LAY["nvf_rev"], LAY["rho"], SPREAD)
POS, BLOCKS, PITCH = la.block_layout(prey, BANG, LAY["order"])
SPAN = la.span(prey, POS, BANG)
if "crossings" not in LAY:
    LAY["crossings"] = la.crossings(prey, POS, BANG, RB, RP)
    pos0, _, _ = la.block_layout(prey, BANG, tuple(sorted(dv.REGIONS)))
    LAY["crossings_alpha"] = la.crossings(prey, pos0, BANG, RB, RP)
LAYOUT_JSON.write_text(json.dumps(LAY, indent=1), encoding="utf-8")
print("ring layout: orientation", LAY["vm_rev"], LAY["nvf_rev"], "turn", LAY["rho"], "deg; summed angular span", round(SPAN), "deg; spoke crossings", LAY["crossings"],
      "(sections in alphabetical order, same inside sort:", LAY["crossings_alpha"], ")")


def xy(r, th):
    return la.pol(r, th, CX, CY)


def wedge(r0, r1, th, wdeg, **kw):
    a0 = th - wdeg / 2
    return Wedge((CX, Y(CY)), r1, 90 - (a0 + wdeg), 90 - a0, width=r1 - r0, **kw)


# lobes: pale ground behind each group of five baits
LOBE_MID = {}
for lobe, names in (("VM", dv.VM), ("NVF", dv.NVF)):
    angs = [BANG[b] for b in names]
    mid = la.circ_mean(angs)
    half = max(la.circ_dist(a, mid) for a in angs) + 17.0
    LOBE_MID[lobe] = mid
    a0 = (mid - half) % 360
    cv.add_patch(Wedge((CX, Y(CY)), RB + 5.4, 90 - (a0 + 2 * half), 90 - a0, width=10.8, facecolor=GROUND, edgecolor="none", zorder=1, gid=f"lobe_{lobe}"))

# spokes: one per bait-prey link
segs = []
for r in prey:
    x1, t1 = xy(RP, POS[r["id"]])
    for b in r["baits_l"]:
        x0, t0_ = xy(RB, BANG[b])
        segs.append([(x0, Y(t0_)), (x1, Y(t1))])
assert len(segs) == 539
cv.add_collection(LineCollection(segs, colors=SPOKE, linewidths=mmpt(0.13), zorder=2, gid="spokes"))

# bait to bait links: arcs bowed into the ring, none within 1.6 mm of a bait that is not one of its ends
bl = collections.Counter()
for r in blinks_t:
    bl[frozenset((r["bait"], r["found_bait"]))] += 1
assert len(bl) == 8 and sum(bl.values()) == 10
BPOS = {b: xy(RB, BANG[b]) for b in dv.BAITS}
CLEAR = NODE_D / 2 + 1.6


def bez(pa, pb, bow, n=60):
    mx, mt = (pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2
    ux, ut = CX - mx, CY - mt
    L = math.hypot(ux, ut) or 1.0
    c = (mx + ux / L * 2 * bow, mt + ut / L * 2 * bow)
    s = np.linspace(0, 1, n)[:, None]
    P = (1 - s) ** 2 * np.array(pa) + 2 * (1 - s) * s * np.array(c) + s ** 2 * np.array(pb)
    return c, P


BBLINKS = []
for pr, n in sorted(bl.items(), key=lambda kv: sorted(kv[0])):
    a, b = sorted(pr, key=dv.BAITS.index)
    for bow in (0.0, 1.5, 3.0, 4.5, 6.0, 7.5, 9.0, 10.5, 12.0):
        c, P = bez(BPOS[a], BPOS[b], bow)
        others = [BPOS[o] for o in dv.BAITS if o not in (a, b)]
        dmin = min(math.hypot(P[i, 0] - o[0], P[i, 1] - o[1]) for i in range(len(P)) for o in others)
        if dmin >= CLEAR:
            break
    assert dmin >= CLEAR, (a, b, dmin)
    codes = [MPath.MOVETO, MPath.CURVE3, MPath.CURVE3]
    verts = [(BPOS[a][0], Y(BPOS[a][1])), (c[0], Y(c[1])), (BPOS[b][0], Y(BPOS[b][1]))]
    cv.add_patch(PathPatch(MPath(verts, codes), facecolor="none", edgecolor=BAIT, linewidth=mmpt(0.95 if n == 2 else 0.4), capstyle="butt", zorder=3, gid=f"bblink_{a}_{b}"))
    BBLINKS.append(dict(gid=f"bblink_{a}_{b}", a=a, b=b, bow=bow, both=n == 2, dmin=round(dmin, 2)))
print("bait links: bow and nearest third bait (mm):", [(q["a"], q["b"], q["bow"], q["dmin"]) for q in BBLINKS])

# prey dots
cv.scatter([xy(RP, POS[r["id"]])[0] for r in prey], [Y(xy(RP, POS[r["id"]])[1]) for r in prey], s=mmpt(0.44) ** 2, c=INK, linewidths=0, zorder=4, gid="prey_dots")

# function strip (viral prey) and organism strip
fcount = collections.Counter(r["function"] for r in prey if r["organism"] == "viral")
nocat = sum(1 for r in prey if r["organism"] == "viral" and not r["function"])
fun_p, fun_c, org_v, org_h = [], [], [], []
for r in prey:
    th = POS[r["id"]]
    if r["organism"] == "viral":
        fun_p.append(wedge(TR["fun"][0], TR["fun"][1], th, PITCH * 0.92))
        fun_c.append(FCOL[r["function"]] if r["function"] else "#FFFFFF")
        org_v.append(wedge(TR["org"][0], TR["org"][1], th, PITCH))
    else:
        org_h.append(wedge(TR["org"][0], TR["org"][1], th, PITCH))
cv.add_collection(PatchCollection(fun_p, facecolors=fun_c, edgecolors=[INK if c == "#FFFFFF" else "none" for c in fun_c], linewidths=mmpt(0.08), zorder=4, gid="strip_function"))
cv.add_collection(PatchCollection(org_v, facecolors=SUB, edgecolors="none", zorder=4, gid="strip_viral"))
cv.add_collection(PatchCollection(org_h, facecolors="#FFFFFF", edgecolors=INK, linewidths=mmpt(0.09), zorder=4, gid="strip_host"))

# region arcs with end ticks, and the numbered badges
ORDER_CW = list(LAY["order"])
REG_NUM = {g: i + 1 for i, g in enumerate(ORDER_CW)}
for g, b in BLOCKS.items():
    L = (b["b"] - b["a"]) % 360
    cv.add_patch(Arc((CX, Y(CY)), 2 * TR["arc"], 2 * TR["arc"], theta1=90 - (b["a"] + L), theta2=90 - b["a"], color=INK, lw=mmpt(0.4), zorder=5, gid=f"arc_{g}", capstyle="butt"))
    for th in (b["a"], b["b"]):
        xa, ta = xy(TR["arc"] - 0.9, th); xb, tb = xy(TR["arc"] + 0.9, th)
        cv.plot([xa, xb], [Y(ta), Y(tb)], color=INK, lw=mmpt(0.4), solid_capstyle="butt", zorder=5)
BADGES = []
for g, b in BLOCKS.items():
    x, t = xy(TR["badge"], b["mid"])
    BADGES.append(dict(n=REG_NUM[g], x=round(x, 3), t=round(t, 3), region=g))

# names of the strips, on the strips, in the empty sector at the bottom: guide lines continue the strips across it
g0, g1 = la.GAP_CENTRE - la.BIG_GAP / 2 + 1.0, la.GAP_CENTRE + la.BIG_GAP / 2 - 1.0
for r_ in (TR["fun"][0], TR["fun"][1], TR["org"][0], TR["org"][1]):
    cv.add_patch(Arc((CX, Y(CY)), 2 * r_, 2 * r_, theta1=90 - g1, theta2=90 - g0, color=INK, lw=mmpt(0.1), zorder=4))
cv.add_patch(Arc((CX, Y(CY)), 2 * TR["arc"], 2 * TR["arc"], theta1=90 - g1, theta2=90 - g0, color=INK, lw=mmpt(0.25), zorder=4))
for name, text, r_c, dx in (("fun", "function", FUN_C, -10.8), ("org", "organism", ORG_C, 0.0), ("reg", "region", TR["arc"], 10.8)):
    lab(f"track-{name}", CX + dx, CY + math.sqrt(r_c ** 2 - dx ** 2), text, ha="center", fs=FL, bg=True)

# lobe names beside the lobes, expanded where they appear
for lobe, big, expansion in (("VM", "VM subnetwork", "virion-membrane"), ("NVF", "NVF subnetwork", "nucleoid and VF")):
    lx, lt = xy(RB + 5.4 + 1.6, LOBE_MID[lobe])
    ha = "right" if lx < CX else "left"
    lab(f"lobe-{lobe}", lx, lt - 1.55, big, ha=ha, fs=FL, bold=True, bg=True)
    lab(f"lobe-{lobe}-x", lx, lt + 1.55, expansion, ha=ha, fs=FL, bg=True)

# bait nodes, on top
for b in dv.BAITS:
    x, t = BPOS[b]
    cv.add_patch(Circle((x, Y(t)), NODE_D / 2, facecolor=BAIT, edgecolor="#FFFFFF", linewidth=mmpt(0.25), zorder=6, gid=f"bait_{b}"))
    lab(f"bait-{b}", x, t, b, ha="center", fs=FL, color="#FFFFFF", ref=f"bait_{b}")
    chk(f"bait_{b}", cx=x, t=t)

lab("title-a", 1.5 + 4.6, TA + 2.2, "Mimivirus: ten baits, 433 prey, by region", fs=7.5, bold=True)
lab("sub1-a", 1.5 + 4.6, TA + 5.8, "Bait: a tagged virus protein pulled down from infected amoeba cells (Acanthamoeba castellanii).", fs=7, color=SUB)
lab("sub2-a", 1.5 + 4.6, TA + 9.0, "Prey: a protein found with a bait. L and R names are virus genes; ids of five digits, amoeba genes.", fs=7, color=SUB)

# ================================================================ the key box beside panel a
KX, KW = 119.0, 57.5
KT_TOP = TA - 0.5
xi = KX + 1.9
rowp = 2.8
kt = TA + 2.2


def kglyph_label(i, t, text, color=INK, bold=False, x=None):
    lab(i, (xi + 5.4) if x is None else x, t, text, fs=FL, bold=bold, color=color)


lab("k-head-a", xi, kt, "Ring and baits", fs=7, bold=True)
kt += 3.1
cv.add_patch(Circle((xi + 1.7, Y(kt)), 1.4, facecolor=BAIT, edgecolor="#FFFFFF", linewidth=mmpt(0.15), zorder=6, gid="kg_bait")); chk("kg_bait", cx=xi + 1.7, t=kt)
kglyph_label("k-bait", kt, "Bait: a tagged virus protein"); kt += rowp
cv.plot([xi, xi + 3.4], [Y(kt), Y(kt)], color=BAIT, lw=mmpt(0.4), solid_capstyle="butt", zorder=6, gid="kg_thin"); chk("kg_thin", cx=xi + 1.7, t=kt)
kglyph_label("k-thin", kt, "One bait pulled down the other"); kt += rowp
cv.plot([xi, xi + 3.4], [Y(kt), Y(kt)], color=BAIT, lw=mmpt(0.95), solid_capstyle="butt", zorder=6, gid="kg_thick"); chk("kg_thick", cx=xi + 1.7, t=kt)
kglyph_label("k-thick", kt, "Each pulled down the other"); kt += rowp
cv.plot([xi, xi + 2.8], [Y(kt), Y(kt)], color=SPOKE, lw=mmpt(0.13), solid_capstyle="butt", zorder=6, gid="kg_spoke")
cv.scatter([xi + 3.2], [Y(kt)], s=mmpt(0.44) ** 2, c=INK, linewidths=0, zorder=6, gid="kg_dot")
kglyph_label("k-spoke", kt, "Line to a dot: prey that bait pulled down"); kt += rowp
cv.add_patch(Rectangle((xi, Y(kt) - 1.0), 3.4, 2.0, facecolor=GROUND, edgecolor="none", zorder=6, gid="kg_ground")); chk("kg_ground", cx=xi + 1.7, t=kt)
kglyph_label("k-ground", kt, "Ground: the five baits of a subnetwork"); kt += rowp + 1.5

lab("k-head-b", xi, kt, "Ring sections: region of prey", fs=7, bold=True)
RK_V, RK_H = KX + KW - 9.2, KX + KW - 1.9
kt += 3.0
lab("k-rch-v", RK_V, kt, "viral", ha="right", fs=FL, color=SUB)
lab("k-rch-h", RK_H, kt, "host", ha="right", fs=FL, color=SUB)
kt += rowp - 0.3
cnt_rg = collections.Counter((r["region"], r["organism"]) for r in prey)
for g in ORDER_CW:
    n_ = REG_NUM[g]
    BADGES.append(dict(n=n_, x=round(xi + 1.7, 3), t=round(kt, 3), region=g, key=True))
    lab(f"rk-name-{n_}", xi + 4.4, kt, dv.REGION_NAME[g], fs=FL)
    lab(f"rk-v-{n_}", RK_V, kt, str(cnt_rg[(g, "viral")]), ha="right", fs=FL)
    lab(f"rk-h-{n_}", RK_H, kt, str(cnt_rg[(g, "host")]), ha="right", fs=FL)
    kt += rowp + 0.3
kt += 0.2
lab("k-def1", xi, kt, "VF-IL: internal layer of the viral factory (VF).", fs=FL, color=SUB); kt += rowp
lab("k-def2", xi, kt, "Membrane: predicted transmembrane domain.", fs=FL, color=SUB); kt += rowp + 1.5

lab("k-head-c", xi, kt, "Strips on the ring", fs=7, bold=True); kt += 3.1
cv.add_patch(Rectangle((xi, Y(kt) - 0.8), 3.4, 1.6, facecolor=SUB, edgecolor="none", zorder=6, gid="kg_viral")); chk("kg_viral", cx=xi + 1.7, t=kt)
kglyph_label("k-viral", kt, "organism: viral prey"); kt += rowp
cv.add_patch(Rectangle((xi, Y(kt) - 0.8), 3.4, 1.6, facecolor="#FFFFFF", edgecolor=INK, linewidth=mmpt(0.1), zorder=6, gid="kg_host")); chk("kg_host", cx=xi + 1.7, t=kt)
kglyph_label("k-host", kt, "organism: host prey (amoeba protein)"); kt += rowp + 1.5

lab("k-head-d", xi, kt, "Function of viral prey (number)", fs=7, bold=True); kt += 3.1
K_NUM = KX + KW - 1.9
FK = []


def swatch(i, t, colour, outline=False):
    cv.add_patch(Rectangle((xi + 1.0, Y(t) - 0.95), 3.2, 1.9, facecolor=colour, edgecolor=INK if outline else "none", linewidth=mmpt(0.1), zorder=6, gid=i))
    chk(i, cx=xi + 2.6, t=t)


swatch("fkw_unch", kt, SAND)
lab("fk-name-unch", xi + 5.4, kt, "Uncharacterized", fs=FL); lab("fk-n-unch", K_NUM, kt, str(fcount["Uncharacterized"]), ha="right", fs=FL)
FK.append(dict(f="Uncharacterized", n=fcount["Uncharacterized"]))
kt += rowp
for fi, (fname, cats) in enumerate(FAMILIES):
    lab(f"fk-fam-{fi}", xi, kt, fname, fs=FL, bold=True); kt += rowp - 0.1
    for ci, (c, hexc) in enumerate(cats):
        swatch(f"fkw_{fi}_{ci}", kt, hexc)
        lab(f"fk-name-{fi}-{ci}", xi + 5.4, kt, c, fs=FL); lab(f"fk-n-{fi}-{ci}", K_NUM, kt, str(fcount[c]), ha="right", fs=FL)
        FK.append(dict(f=c, n=fcount[c]))
        kt += rowp - 0.1
    kt += 0.2
swatch("fkw_none", kt, "#FFFFFF", outline=True)
lab("fk-white", xi + 5.4, kt, f"No category: host {sum(1 for r in prey if r['organism'] == 'host')}, viral {nocat}", fs=FL)
kt += rowp
assert sum(fcount.values()) == 144 and sum(q["n"] for q in FK) + nocat == 144
cv.add_patch(Rectangle((KX, Y(kt + 0.4)), KW, kt + 0.4 - KT_TOP, facecolor="none", edgecolor="#3A3A3A", linewidth=mmpt(0.25), zorder=2, gid="key_frame"))
KEY_BOTTOM = kt + 0.4
print("key box bottom", round(KEY_BOTTOM, 1), "ring bottom", round(CY + TR["badge"] + 1.6, 1))
RING_BOTTOM = CY + TR["badge"] + 1.6

# ================================================================ panel b: prey per bait, panel c: shared prey
T2 = max(KEY_BOTTOM, RING_BOTTOM) + 2.0
rows_b = list(dv.BAITS)
RPB, GAPB = 2.9, 1.2
B_ROW0 = T2 + 17.8
BAR0 = 21.0
bscale = 30.0 / max(int(baits_t[b]["total"]) for b in rows_b)
COLS_B = (62.0, 69.4, 77.0)                             # right edges of the viral, host, all columns
lab("title-b", 1.5 + 4.6, T2 + 2.2, "Prey per bait", fs=7.5, bold=True)
lab("sub1-b", 1.5 + 4.6, T2 + 5.8, "Dark: viral prey. White: host prey. Sorted by total within a subnetwork.", fs=FL, color=SUB)
lab("sub2-b", 1.5 + 4.6, T2 + 8.7, "VM: virion-membrane baits. NVF: nucleoid and viral-factory baits.", fs=FL, color=SUB)
lab("sub3-b", 1.5 + 4.6, T2 + 11.6, "Rows add up to 549 bait-prey pairs for 433 prey, as several baits can pull down one prey.", fs=FL, color=SUB)
lab("sub4-b", 1.5 + 4.6, T2 + 14.5, "Counts include baits found by other baits.", fs=FL, color=SUB)
for k, s in zip(COLS_B, ("viral", "host", "all")):
    lab(f"b-head-{s}", k, T2 + 14.5, s, ha="right", fs=FL, color=SUB)
b_t = {}
for i, b in enumerate(rows_b):
    t = B_ROW0 + i * RPB + (GAPB if i >= 5 else 0)
    b_t[b] = t
    v, h, tot = (int(baits_t[b][k]) for k in ("viral", "host", "total"))
    lab(f"b-name-{b}", 19.0, t, b, ha="right", fs=7.0)
    cv.add_patch(Rectangle((BAR0, Y(t) - 0.95), v * bscale, 1.9, facecolor=SUB, edgecolor="none", zorder=3, gid=f"bar_v_{b}"))
    cv.add_patch(Rectangle((BAR0 + v * bscale, Y(t) - 0.95), h * bscale, 1.9, facecolor="#FFFFFF", edgecolor=INK, linewidth=mmpt(0.12), zorder=3, gid=f"bar_h_{b}"))
    chk(f"bar_v_{b}", l=BAR0, t=t)
    chk(f"bar_h_{b}", r=BAR0 + (v + h) * bscale, t=t)
    for k, val in zip(COLS_B, (v, h, tot)):
        lab(f"b-num-{b}-{k:.0f}", k, t, str(val), ha="right", fs=FL)
# subnetwork brackets and names
for name, names in (("VM", dv.VM), ("NVF", dv.NVF)):
    t0_, t1_ = b_t[names[0]], b_t[names[-1]]
    cv.plot([8.9, 8.9], [Y(t0_ - 1.3), Y(t1_ + 1.3)], color=INK, lw=mmpt(0.3), solid_capstyle="butt", zorder=3, gid=f"b_br_{name}")
    lab(f"b-grp-{name}", 1.5, (t0_ + t1_) / 2, name, fs=7.0, bold=True)
# bar scale: a thin axis under the bars
t_ax = b_t["L410"] + 3.0
cv.plot([BAR0, BAR0 + 200 * bscale], [Y(t_ax), Y(t_ax)], color=INK, lw=mmpt(0.2), solid_capstyle="butt", zorder=3, gid="b_axis")
for v in (0, 100, 200):
    x = BAR0 + v * bscale
    cv.plot([x, x], [Y(t_ax), Y(t_ax + 0.9)], color=INK, lw=mmpt(0.2), solid_capstyle="butt", zorder=3, gid=f"b_tick_{v}")
    lab(f"b-tick-{v}", x, t_ax + 2.9, str(v), ha="center", fs=FL, refx=f"b_tick_{v}")
lab("b-axis", BAR0 + 200 * bscale + 3.0, t_ax + 2.9, "prey (viral + host)", fs=FL, color=SUB)
B_BOTTOM = t_ax + 4.4

# ---- panel c: lower-triangle matrix, bait names on both axes
CXL = 96.0
CELL_W, CELL_H, GAPC = 6.4, 3.2, 1.3
x0m = CXL + 10.4
M0 = T2 + 17.0
lab("title-c", CXL + 4.6, T2 + 2.2, "Prey shared by two baits", fs=7.5, bold=True)
lab("sub1-c", CXL + 4.6, T2 + 5.8, "Number: prey both baits pulled down; darker is more.", fs=FL, color=SUB)
lab("sub2-c", CXL + 4.6, T2 + 8.7, "Triangle: one bait pulled down the other; two: each did.", fs=FL, color=SUB)
cmap = LinearSegmentedColormap.from_list("shared", ["#FFFFFF", "#E7B9CF", BAIT])
cmax = max(int(r["shared_partners"]) for r in pairs_t)
pair = {frozenset((r["bait_a"], r["bait_b"])): (int(r["shared_partners"]), int(r["direct_connections"])) for r in pairs_t}


def col_x(j):
    return x0m + j * CELL_W + (GAPC if j >= 5 else 0)


def row_t(i):
    return M0 + (i - 1) * CELL_H + (GAPC if i >= 5 else 0)


c_cells = {}
for i in range(1, 10):
    for j in range(i):
        bi, bj = rows_b[i], rows_b[j]
        val, dc = pair.get(frozenset((bi, bj)), (0, 0))
        x0, t0_ = col_x(j), row_t(i)
        fc = cmap(val / cmax)
        hexfc = "#%02X%02X%02X" % tuple(round(255 * c) for c in fc[:3])
        cv.add_patch(Rectangle((x0, Y(t0_ + CELL_H)), CELL_W, CELL_H, facecolor=hexfc, edgecolor="#FFFFFF" if val else "#D0D0D0", linewidth=mmpt(0.15), zorder=2, gid=f"cell_{bi}_{bj}"))
        c_cells[(i, j)] = val
        tcol = "#FFFFFF" if COL.contrast(hexfc, "#FFFFFF") > COL.contrast(hexfc, INK) else INK
        lab(f"c-num-{bi}-{bj}", x0 + CELL_W / 2, t0_ + CELL_H / 2, str(val), ha="center", fs=FL, color=tcol if val else SUB, ref=f"cell_{bi}_{bj}")
        chk(f"cell_{bi}_{bj}", cx=x0 + CELL_W / 2, t=t0_ + CELL_H / 2)
        for d in range(dc):                                    # triangles in the corners: top left for one direction, bottom right added for both
            if d == 0:
                tri = [(x0 + 0.15, Y(t0_ + 0.15)), (x0 + 1.85, Y(t0_ + 0.15)), (x0 + 0.15, Y(t0_ + 1.85))]
            else:
                tri = [(x0 + CELL_W - 0.15, Y(t0_ + CELL_H - 0.15)), (x0 + CELL_W - 1.85, Y(t0_ + CELL_H - 0.15)), (x0 + CELL_W - 0.15, Y(t0_ + CELL_H - 1.85))]
            cv.add_patch(plt.Polygon(tri, closed=True, facecolor=INK, edgecolor="#FFFFFF", linewidth=mmpt(0.08), zorder=4, gid=f"tri_{bi}_{bj}_{d}"))
for i in range(1, 10):
    lab(f"c-row-{rows_b[i]}", x0m - 0.9, row_t(i) + CELL_H / 2, rows_b[i], ha="right", fs=FL)
M_BOT = row_t(9) + CELL_H
for j in range(9):
    lab(f"c-col-{rows_b[j]}", col_x(j) + CELL_W / 2, M_BOT + 2.3, rows_b[j], ha="center", fs=FL)
for name, j0, j1 in (("VM", 0, 4), ("NVF", 5, 8)):
    xa, xb = col_x(j0), col_x(j1) + CELL_W
    cv.plot([xa + 0.4, xb - 0.4], [Y(M_BOT + 4.3), Y(M_BOT + 4.3)], color=INK, lw=mmpt(0.3), solid_capstyle="butt", zorder=3, gid=f"c_br_{name}")
    lab(f"c-grp-{name}", (xa + xb) / 2, M_BOT + 6.4, name + " baits", ha="center", fs=FL, bold=True)
# the shade scale, in the empty upper right of the matrix
sx0, st0 = x0m + 4 * CELL_W + 4.0, M0 + 1.2
nstep = 9
for k in range(nstep):
    fc = cmap(k / (nstep - 1))
    cv.add_patch(Rectangle((sx0 + k * 2.4, Y(st0 + 2.0)), 2.4, 2.0, facecolor=fc, edgecolor="none", zorder=2, gid=f"scale_{k}"))
lab("c-scale-0", sx0, st0 + 4.0, "0", ha="center", fs=FL)
lab("c-scale-1", sx0 + nstep * 2.4, st0 + 4.0, str(cmax), ha="center", fs=FL)
lab("c-scale-t", sx0 + nstep * 2.4 / 2, st0 - 1.9, "shared prey", ha="center", fs=FL, color=SUB)
C_BOTTOM = M_BOT + 7.8

# ================================================================ panel d: PDB complexes as rings
T_D = max(B_BOTTOM, C_BOTTOM) + 2.0
PDB_ORDER = ["7a09", "6zj3", "7dvq", "rnap_core", "rnap_other"]
cplx = {}
for k in PDB_ORDER:
    es = [(r["protein_a"], r["protein_b"]) for r in pdb_t if r["complex"] == k]
    cplx[k] = dict(edges=es, nodes=sorted({x for e in es for x in e}))


def organism(n):
    return PREY[n]["organism"] if n in PREY else "viral"


def short_id(n):
    return PREY[n]["short"] if n in PREY else dv.short(n)


def n_cross(order, edges):
    pos = {v: i for i, v in enumerate(order)}
    ch = [(min(pos[a], pos[b]), max(pos[a], pos[b])) for a, b in edges]
    c = 0
    for i in range(len(ch)):
        a, b = ch[i]
        for j in range(i + 1, len(ch)):
            c_, d = ch[j]
            if len({a, b, c_, d}) < 4:
                continue
            if (a < c_ < b) != (a < d < b):
                c += 1
    return c


def ring_order(nodes, edges, seed=1, steps=5000):
    rng = random.Random(seed)
    cur = list(nodes)
    best = list(cur)
    bc = cc = n_cross(cur, edges)
    for s in range(steps):
        T = 2.0 * (1 - s / steps) + 0.05
        i, j = rng.sample(range(len(cur)), 2)
        cur[i], cur[j] = cur[j], cur[i]
        nc = n_cross(cur, edges)
        if nc <= cc or rng.random() < math.exp((cc - nc) / T):
            cc = nc
            if nc < bc:
                bc, best = nc, list(cur)
        else:
            cur[i], cur[j] = cur[j], cur[i]
    improved = True
    while improved:                                        # then every pair swap that lowers the crossing count
        improved = False
        for i in range(len(best)):
            for j in range(i + 1, len(best)):
                best[i], best[j] = best[j], best[i]
                nc = n_cross(best, edges)
                if nc < bc:
                    bc, improved = nc, True
                else:
                    best[i], best[j] = best[j], best[i]
    deg = collections.Counter(x for e in edges for x in e)
    top = max(best, key=lambda v: (deg[v], v))
    k = best.index(top)
    return best[k:] + best[:k], bc


ND = 1.6                                                # node diameter in the rings
LBL_H = 2.3
LAB_PITCH = 2.4                                         # vertical pitch of the label columns beside a ring
LAB_GAP = 3.0                                           # ring radius to the first letter of a label
RING_SP = 2.7                                           # arc distance between neighbouring nodes, mm
RING_MIN = {"rnap_core": 6.2}


def side_ring(k):
    c = cplx[k]
    order, bc = ring_order(c["nodes"], c["edges"])
    n = len(order)
    R = max(RING_MIN.get(k, 5.0), RING_SP * n / (2 * math.pi))
    nodes = []
    for i, v in enumerate(order):
        th = 360.0 * i / n
        x, t = la.pol(R, th)
        nodes.append(dict(id=v, th=th, x=x, t=t, s=short_id(v), org=("bait" if v in dv.BAITS else (organism(v) if v in PREY else "viral_np"))))
    nr = math.ceil(n / 2)
    for side, group in (("r", nodes[:nr]), ("l", nodes[nr:])):
        srt = sorted(group, key=lambda q: (q["t"], q["x"]))
        m = len(srt)
        for j, q in enumerate(srt):
            q["side"] = side
            q["lt"] = (j - (m - 1) / 2) * LAB_PITCH
            q["lx"] = (R + LAB_GAP) * (1 if side == "r" else -1)
    wl = max([tw(q["s"]) for q in nodes if q["side"] == "l"] + [0])
    wr = max([tw(q["s"]) for q in nodes if q["side"] == "r"] + [0])
    half_h = max(R + ND / 2, (max(sum(1 for q in nodes if q["side"] == s) for s in "rl") - 1) / 2 * LAB_PITCH + LBL_H / 2)
    return dict(order=order, crossings=bc, R=R, nodes=nodes, left=R + LAB_GAP + wl, right=R + LAB_GAP + wr, half_h=half_h, edges=c["edges"])


RINGS = {k: side_ring(k) for k in PDB_ORDER}
for k, g in RINGS.items():
    print(f"ring {k}: {len(g['nodes'])} nodes, {len(g['edges'])} links, chord crossings {g['crossings']}, radius {g['R']:.1f} mm, width {g['left'] + g['right']:.1f}, half height {g['half_h']:.1f}")
# the 8 'core' proteins are among the 17 'not core' ones, and no link is in both sets
core_n, other_n = set(cplx["rnap_core"]["nodes"]), set(cplx["rnap_other"]["nodes"])
core_e = {frozenset(e) for e in cplx["rnap_core"]["edges"]}
other_e = {frozenset(e) for e in cplx["rnap_other"]["edges"]}
assert core_n < other_n and len(core_n) == 8 and len(other_n) == 17 and not (core_e & other_e)

lab("title-d", 1.5 + 4.6, T_D + 2.2, "Proteins homologous to PDB complex chains", fs=7.5, bold=True)
lab("sub1-d", 1.5 + 4.6, T_D + 5.6, "Line: the two PDB chains these proteins match are in contact (Methods: under 8 Å). PDB: Protein Data Bank.", fs=7, color=SUB)
lab("sub2-d", 1.5 + 4.6, T_D + 8.8, "Circle: protein, dark if viral prey, white if host prey. Maroon: bait. Square: viral protein that no bait pulled down.", fs=7, color=SUB)
lab("sub3-d", 1.5 + 4.6, T_D + 12.0, "Ids: 14831 is amoeba gene BAESF_14831.mRNA.1. The paper chose the PDB entries sharing most chains with these proteins.", fs=7, color=SUB)
HEAD = {
    "7a09": ("7a09", "human 43S pre-initiation complex", "16 host proteins, 29 links"),
    "6zj3": ("6zj3", "Euglena gracilis ribosome", "17 host proteins, 20 links"),
    "7dvq": ("7dvq", "human minor spliceosome", "12 host proteins, 22 links"),
    "rnap_core": ("RNA polymerase", "'core' set (file name)", "8 viral proteins, 14 links"),
    "rnap_other": ("RNA polymerase", "'not core' set (file name)", "17 proteins incl. the 8; 35 links"),
}
for k in PDB_ORDER:
    assert HEAD[k][2].split()[0] == str(len(RINGS[k]["nodes"])) or k == "rnap_other"
    assert f"{len(RINGS[k]['edges'])} links" in HEAD[k][2]
widths = {k: RINGS[k]["left"] + RINGS[k]["right"] for k in PDB_ORDER}
head_w = {k: max(tw(HEAD[k][0], 7.5, True), tw(HEAD[k][1]), tw(HEAD[k][2])) for k in PDB_ORDER}
panel_w = {k: max(widths[k], head_w[k]) for k in PDB_ORDER}
avail = W - 1.5 - 3.5
gap_d = (avail - sum(panel_w.values())) / (len(PDB_ORDER) - 1)
print("panel d: widths", {k: round(float(v), 1) for k, v in panel_w.items()}, "free gap between panels", round(float(gap_d), 2), "mm")
assert gap_d >= 1.2, "panel d does not fit"
D_BODY_H = max(g["half_h"] for g in RINGS.values()) * 2
x_cursor = 1.5
PDB_POS = {}
HEAD_T = T_D + 17.0
for k in PDB_ORDER:
    g = RINGS[k]
    ring_cx = x_cursor + (g["left"] if widths[k] >= head_w[k] else g["left"] + (head_w[k] - widths[k]) / 2)
    PDB_POS[k] = dict(x_left=x_cursor, cx=ring_cx, w=panel_w[k])
    lab(f"d-id-{k}", x_cursor, HEAD_T, HEAD[k][0], fs=7.5, bold=True)
    lab(f"d-nm-{k}", x_cursor, HEAD_T + 3.0, HEAD[k][1], fs=FL, color=SUB)
    lab(f"d-ct-{k}", x_cursor, HEAD_T + 5.8, HEAD[k][2], fs=FL, color=SUB)
    x_cursor += panel_w[k] + gap_d
D_CY = HEAD_T + 8.4 + D_BODY_H / 2
D_BOTTOM = D_CY + D_BODY_H / 2
for k in PDB_ORDER:
    g, P = RINGS[k], PDB_POS[k]
    cx0, cy0 = P["cx"], D_CY
    pos = {q["id"]: (cx0 + q["x"], cy0 + q["t"]) for q in g["nodes"]}
    segs = [[(pos[a][0], Y(pos[a][1])), (pos[b][0], Y(pos[b][1]))] for a, b in g["edges"]]
    cv.add_collection(LineCollection(segs, colors=INK, linewidths=mmpt(0.3), capstyle="round", zorder=3, gid=f"chords_{k}"))
    for q in g["nodes"]:
        x, t = pos[q["id"]]
        fc = BAIT if q["org"] == "bait" else (SUB if q["org"] in ("viral", "viral_np") else "#FFFFFF")
        ec = "#FFFFFF" if q["org"] == "bait" else INK
        if q["org"] == "viral_np":
            cv.add_patch(Rectangle((x - ND * 0.46, Y(t) - ND * 0.46), ND * 0.92, ND * 0.92, facecolor=fc, edgecolor=ec, linewidth=mmpt(0.12), zorder=5, gid=f"pn_{k}_{q['id']}"))
        else:
            cv.add_patch(Circle((x, Y(t)), ND / 2, facecolor=fc, edgecolor=ec, linewidth=mmpt(0.12), zorder=5, gid=f"pn_{k}_{q['id']}"))
        lx, lt = cx0 + q["lx"], cy0 + q["lt"]
        end = lx - (0.6 if q["side"] == "r" else -0.6)
        cv.plot([x, end], [Y(t), Y(lt)], color="#9A9A9A", lw=mmpt(0.12), zorder=2, solid_capstyle="butt", gid=f"ld_{k}_{q['id']}")
        lab(f"d-lab-{k}-{q['id']}", lx, lt, q["s"], ha=("left" if q["side"] == "r" else "right"), fs=FL, color=INK)
        CHECKS.append(dict(gid=f"ld_{k}_{q['id']}", box=[min(x, end), max(x, end), min(t, lt), max(t, lt)], tol=0.3))
        chk(f"pn_{k}_{q['id']}", cx=x, t=t)
NOTE_T = D_BOTTOM + 3.2
x_rn = PDB_POS["rnap_core"]["x_left"]
lab("d-rnap1", x_rn, NOTE_T, "RNA polymerase entries (legend): poxvirus 6rfl, 7amv;", fs=FL, color=SUB)
lab("d-rnap2", x_rn, NOTE_T + 2.9, "African swine fever virus 8q3k; human 7und, 7nvu, 7ena.", fs=FL, color=SUB)
lab("d-n1", 1.5, NOTE_T, "140 further viral proteins were pulled down by no bait and are not shown.", fs=FL, color=SUB)
lab("d-n2", 1.5, NOTE_T + 2.9, "R443: the Results give 9 viral membrane partners; the file flags 8 (L446 is not flagged).", fs=FL, color=SUB)
D_END = NOTE_T + 4.4
assert x_rn + tw("African swine fever virus 8q3k; human 7und, 7nvu, 7ena.") < W - 2.0
assert 1.5 + tw("R443: the Results give 9 viral membrane partners; the file flags 8 (L446 is not flagged).") < x_rn - 1.0

# ================================================================ foot
CREDIT = "After Fig. 3 of Safi et al., EMBO J 2026, doi:10.1038/s44318-026-00770-8, CC BY 4.0. Data: Zenodo 17313812. Redesigned; values computed from published data."
BOUND = "Every count the paper prints matches the network file and Source data Fig. 3. Ring: one section per region; inside it, prey follow the baits that pulled them down."
assert 1.5 + tw(CREDIT) < W - 2.0 and 1.5 + tw(BOUND) < W - 2.0, (tw(CREDIT), tw(BOUND))
lab("boundary", 1.5, H_PAGE - 5.6, BOUND, fs=FL, color=SUB)
lab("credit", 1.5, H_PAGE - 2.3, CREDIT, fs=FL, color=SUB)
print("rows: T2", round(T2, 1), "B_BOTTOM", round(B_BOTTOM, 1), "C_BOTTOM", round(C_BOTTOM, 1), "T_D", round(T_D, 1), "D_BOTTOM", round(D_BOTTOM, 1))
print("last content row at t =", round(D_END, 1), "page height", H_PAGE)
assert D_END < H_PAGE - 8.0, "content runs into the foot line"

# ---- the numbers printed are the numbers of the tables (asserted again on the PDF by verify_pdf.py)
assert sum(int(baits_t[b]["total"]) for b in dv.BAITS) == 549 and sum(int(baits_t[b]["viral"]) + int(baits_t[b]["host"]) for b in dv.BAITS) == 549
assert sum(v for v in cnt_rg.values()) == 433 and sum(1 for r in prey if r["organism"] == "viral") == 144 and sum(1 for r in prey if r["organism"] == "host") == 289 and nocat == 3
_sum = lambda names, k: sum(int(baits_t[b][k]) for b in names)
assert (_sum(dv.VM, "viral"), _sum(dv.VM, "total"), _sum(dv.NVF, "host"), _sum(dv.NVF, "total")) == (70, 88, 305, 461), "headline numbers"
assert len(c_cells) == 45 and all(val == pair.get(frozenset((rows_b[i], rows_b[j])), (0, 0))[0] for (i, j), val in c_cells.items())
assert sum(len(RINGS[k]["edges"]) for k in PDB_ORDER) == len(pdb_t) == 14 + 29 + 20 + 22 + 35
# colour check, printed for how.md: smallest CIEDE2000 between two colours of the function strip, over four vision types
cols = sorted(set(FCOL.values()))
mn = min(COL.min_de([a, b])[0] for a, b in itertools.combinations(cols, 2))
print("function colours: smallest CIEDE2000 between two of them over four vision types:", round(mn, 1))

# ================================================================ write
OUT.mkdir(exist_ok=True)
save_plot_layer(fig, OUT / "layer.svg")
DATA = dict(W=W, H=H_PAGE, TOL=0.25, labels=LABELS, checks=CHECKS, badges=BADGES, bblinks=BBLINKS, node_d=NODE_D, clear=CLEAR, bait_ids={b: 1 for b in dv.BAITS},
            letters=[dict(ch="a", x=1.5, t=TA + 2.2), dict(ch="b", x=1.5, t=T2 + 2.2), dict(ch="c", x=CXL, t=T2 + 2.2), dict(ch="d", x=1.5, t=T_D + 2.2)],
            layout=dict(span=round(SPAN), crossings=LAY["crossings"], crossings_alpha=LAY["crossings_alpha"]))
(OUT / "layer.js").write_text("window.DATA = " + json.dumps(DATA, indent=1) + ";\n", encoding="utf-8")
print("wrote layer.svg and layer.js:", len(LABELS), "labels,", len(CHECKS), "checks")
