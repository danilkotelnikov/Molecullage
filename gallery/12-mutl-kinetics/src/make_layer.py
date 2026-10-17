"""Plot layer and page data of gallery piece 12 (redesign of Fig. 1D and E of Fukui et al., eLife 15:RP111443, doi 10.7554/eLife.111443, CC BY 4.0).

    py -3 -B gallery/12-mutl-kinetics/src/make_layer.py        # needs tables/ (derive.py, geometry.py) and art/index.pocket.json (rebuild_art.py)

Reads only the small derived tables, never a downloaded file. Writes
  page/layer.svg   matplotlib: dot-plot axes, tile plots, bands, key glyphs (text kept as text, transparent)
  page/layer.js    window.DATA: every position in millimetres (top-down, origin top-left), every text with its anchor, every expected mark position
The page (page/12-mutl-kinetics.html) draws all words at the positions of window.DATA and measures the rendered result against the same numbers.

Panels (reading order):
  a  Table 1 ranked by kcat/Km: dot and printed value, fold lower than wild type, kcat and Km with the +- printed in Table 1; the seven N.D. variants as a compact list
  b  the PDB 6LZJ inset (ChimeraX), the colour key and the notes
  c  five tiles in rank order: y = kapp / kcat of that variant (Table 1 kcat, as printed), x = ATP concentration in mM from 0 to the highest measured;
     dots = mean of three runs from the source-data file, bars = SD; solid line = Michaelis-Menten curve with the Table 1 Km, dashed line = unweighted
     least-squares refit of the plotted means (computed here), dotted lines = kcat (y = 1) and Km (x = Km, y = 0.5) where inside the range.
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np
from matplotlib.patches import Rectangle

HERE = Path(__file__).resolve().parent
GAL = HERE.parent
ROOT = GAL.parents[1]
sys.path.insert(0, str(ROOT / "plots"))
from plot_layer import FONTS, mm_axes, new_plot_canvas, save_plot_layer  # noqa: E402
import pal  # noqa: E402

TAB = GAL / "tables"
OUT = GAL / "page"
DER = json.loads((TAB / "derived.json").read_text(encoding="utf-8"))
GEO = json.loads((TAB / "6lzj_geometry.json").read_text(encoding="utf-8"))
ART = json.loads((GAL / "art" / "index.pocket.json").read_text(encoding="utf-8"))["pocket__full"]
V = DER["variants"]
RANK = DER["rank"]
MEAS = RANK[:5]                                                 # WT, E32A, E29Q, E32Q, E32V: the five variants Table 1 has numbers for, ranked by kcat/Km
assert set(MEAS) == set(DER["det"]) and MEAS[0] == "WT"

# ------------------------------------------------------------------ colours: one meaning each
INK, SUB, LINE, GUIDE = pal.INK, pal.SUB, pal.LINE, pal.load()["guide"]
CLS = {                                                       # which residue is replaced
    "wt": dict(fill=pal.FILL["indigo"], dark=pal.EDGE["indigo"], text="none (wild type)"),
    "g29": dict(fill=pal.FILL["apricot"], dark=pal.EDGE["apricot"], text="Glu29"),
    "g32": dict(fill=pal.FILL["peri"], dark=pal.EDGE["peri"], text="Glu32"),
}
ND_FILL = pal.mix("#FFFFFF", GUIDE, 0.10)                      # band behind a variant whose activity was not detected (a state, not a data mark)
ND_EDGE = pal.mix("#FFFFFF", GUIDE, 0.50)
DOTTED = pal.mix("#FFFFFF", GUIDE, 0.70)                       # guide lines (dotted)
RULE = pal.mix("#FFFFFF", GUIDE, 0.35)
FL = 6.55                                                      # type floor, pt

# ------------------------------------------------------------------ layout, millimetres from the top-left corner
W = 178.0
LX0, LX1 = 1.5, 91.5                                           # panel a
RX0, RX1 = 94.5, 176.5                                         # panel b
T_HEAD = 2.6
T_A = 6.8                                                      # top of panels a and b
# panel a columns
NAME_R = LX0 + 15.0                                            # row names end here
AX1 = dict(x=LX0 + 16.5, w=22.0, lo=0.1, hi=200.0, ticks=[0.1, 1, 10, 100], lab=["0.1", "1", "10", "100"], key="kcatkm", head="kcat/Km", unit="per M per s")
VAL_R = AX1["x"] + AX1["w"] + 7.6                              # printed kcat/Km values end here
FOLD_X = VAL_R + 3.0                                           # fold lower, left edge
RULE1 = FOLD_X + 12.2
AX2 = dict(x=RULE1 + 1.8, w=11.0, lo=0.05, hi=1.1, ticks=[0.1, 1], lab=["0.1", "1"], key="kcat", err="kcat_err", head="kcat", unit="per min")
RULE2 = AX2["x"] + AX2["w"] + 1.7
AX3 = dict(x=RULE2 + 1.8, w=11.4, lo=0.08, hi=12.0, ticks=[0.1, 1, 10], lab=["0.1", "1", "10"], key="km", err="km_err", head="Km", unit="mM")
assert AX3["x"] + AX3["w"] <= LX1 + 1e-6, AX3["x"] + AX3["w"]
COLS = [AX1, AX2, AX3]
T_ROWS = T_A + 24.6
PM = 5.4                                                       # pitch of the five measured rows
BAND_X0, BAND_X1 = AX1["x"] - 0.4, AX3["x"] + AX3["w"]

DATA = dict(W=W, texts=[], rects=[], boxes={}, dots={}, leaders=[])
TXT = DATA["texts"]


def text(id_, x, t, s, ha="left", bold=False, fs=7.0, color=INK, rot=False, within=None, mfs=None):
    """One text of the page. x is the anchor (left edge, centre or right edge by ha), t the centre line; within = (l, t, r, b) the box the text must stay inside."""
    TXT.append(dict(id=id_, x=round(x, 3), t=round(t, 3), s=s, ha=ha, bold=bold, fs=fs, color=color, rot=rot, within=within, mfs=mfs))


def sig2(v):
    """Two significant digits: 97, 100, 160, 170."""
    return int(round(v, -int(math.floor(math.log10(abs(v)))) + 1))


def fmt2(v):
    """Two significant digits without exponent: 0.00099, 0.0010, 0.0031, 0.58, 0."""
    if v == 0:
        return "0"
    d = 2 - math.floor(math.log10(abs(v))) - 1
    return f"{v:.{max(d, 0)}f}"


# vertical stack of panel a below the measured rows: ticks and units, then the N.D. list
T_AX_BOT = T_ROWS + len(MEAS) * PM
T_ND = T_AX_BOT + 8.0
ND_ROWS = [("E29A", 1), ("E29V", 1), ("E29K", 1), ("E29G", 1), ("E32K", 2), ("E29Q/E32Q", 1), ("E32G", 2)]      # the last has its own small group
H1, H2 = 3.7, 6.5                                              # row heights of one-line and two-line N.D. entries
ndpos = {}
tcur = T_ND + 6.4                                              # two heading lines first
for name, nl in ND_ROWS:
    if name == "E32G":
        tcur += 3.6                                            # heading of the small second group
        ndpos["E32G-head"] = tcur - 1.9
    ndpos[name] = (tcur, H1 if nl == 1 else H2)
    tcur += H1 if nl == 1 else H2
T_A_END = tcur
# panel b (right): inset, caption, key, notes
IMG = dict(x=RX0 + 12.0, t=T_A + 11.6, w=41.0)
IMG["h"] = IMG["w"] / ART["ar"]
T_CAP = IMG["t"] + IMG["h"] + 2.0
T_NAMES = T_CAP + 5 * 2.75 + 2.6
T_NOTES = T_NAMES + 15.2
# panel c: tiles
T_C = max(T_A_END, T_NOTES + 17.4) + 2.2
TW = (RX1 - LX0 - 4 * 1.2) / 5
TILE_PLOT_T, TILE_PLOT_H, PL, PR = 5.4, 13.4, 9.6, 1.4
TILE_H = 34.0
T_TILES = T_C + 14.6
H = round(T_TILES + TILE_H + 2.0 + 8.4, 1)
assert H <= 170.0, H
DATA["H"] = H

fig, cv = new_plot_canvas(W, H)


def rect(gid, x, t, w, h, fc, ec="none", lw=0.0, z=1):
    r = Rectangle((x, H - t - h), w, h, facecolor=fc, edgecolor=ec, linewidth=lw, zorder=z, clip_on=False)      # lw in points
    r.set_gid(gid)
    cv.add_patch(r)
    DATA["rects"].append(dict(id=gid, x=x, t=t, w=w, h=h))
    return r


def two_tone(gid, x, t, w, h, z=3, horizontal=True):
    """Both residues replaced: the Glu29 colour and the Glu32 colour side by side (top and bottom halves, or left and right)."""
    if horizontal:
        rect(gid + "-1", x, t, w, h / 2, CLS["g29"]["fill"], z=z)
        rect(gid + "-2", x, t + h / 2, w, h / 2, CLS["g32"]["fill"], z=z)
    else:
        rect(gid + "-1", x, t, w / 2, h, CLS["g29"]["fill"], z=z)
        rect(gid + "-2", x + w / 2, t, w / 2, h, CLS["g32"]["fill"], z=z)


def axes(x, t, w, h):
    ax = mm_axes(fig, x, H - t - h, w, h)
    ax.patch.set_alpha(0.0)
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    for s in ("left", "bottom"):
        ax.spines[s].set_linewidth(0.5)
        ax.spines[s].set_color(LINE)
    ax.tick_params(length=1.6, width=0.5, pad=1.4, labelsize=FL, colors=INK)
    ax.minorticks_off()
    return ax


def invisible_area(gid, x, t, w, h):
    ar = Rectangle((x, H - t - h), w, h, facecolor="none", edgecolor="none", transform=cv.transData, zorder=0)
    ar.set_gid(gid)
    cv.add_patch(ar)


# ================================================================== headline
text("headline", LX0, T_HEAD, "Four variants stay active, about 100 to 170 times less efficient than wild-type MutL. For seven, no activity was detected.", bold=True, fs=7.5)

# ================================================================== panel a: Table 1, ranked
text("a-letter", LX0, T_A + 2.2, "a", bold=True, fs=9)
text("a-title", LX0 + 4.6, T_A + 2.2, "Efficiency, ranked high to low", bold=True, fs=7.5)
text("a-sub1", LX0 + 4.6, T_A + 5.8, "kcat/Km: catalytic efficiency (paper's term), no error given.", color=SUB)
text("a-sub2", LX0 + 4.6, T_A + 8.8, "kcat: top speed. Km: ATP concentration at half of it.", color=SUB)
text("a-sub3", LX0 + 4.6, T_A + 11.8, "Dots: Table 1 as published. Bars: its ± on kcat and Km.", color=SUB)
wtv = V["WT"]["kcatkm"]
x_wt = AX1["x"] + AX1["w"] * (math.log10(wtv) - math.log10(AX1["lo"])) / (math.log10(AX1["hi"]) - math.log10(AX1["lo"]))
rowt = [T_ROWS + (i + 0.5) * PM for i in range(len(MEAS))]
DATA["dotplot"] = dict(rows=[dict(name=n, t=rowt[i]) for i, n in enumerate(MEAS)], cols=[dict(x=c["x"], w=c["w"], lo=c["lo"], hi=c["hi"]) for c in COLS], t0=T_ROWS, pitch=PM, n=len(MEAS))
cdots = {}
for ci, c in enumerate(COLS):
    ax = axes(c["x"], T_ROWS, c["w"], len(MEAS) * PM)
    ax.set_xscale("log")
    ax.set_xlim(c["lo"], c["hi"])
    ax.set_ylim(len(MEAS) - 0.5, -0.5)
    ax.set_yticks([])
    ax.spines["left"].set_visible(False)
    ax.set_xticks(c["ticks"])
    ax.set_xticklabels(c["lab"])
    ax.minorticks_off()
    for tk in c["ticks"]:
        ax.plot([tk, tk], [-0.5, len(MEAS) - 0.5], color="#E4E4E4", lw=0.5, zorder=0)
    if ci == 0:
        ax.plot([wtv, wtv], [-0.6, len(MEAS) - 0.5], color=DOTTED, lw=0.7, ls=(0, (1, 1.4)), zorder=1, clip_on=False)
    invisible_area(f"area-col{ci}", c["x"], T_ROWS, c["w"], len(MEAS) * PM)
    DATA["boxes"][f"col{ci}"] = dict(x=c["x"], t=T_ROWS, w=c["w"], h=len(MEAS) * PM)
    for i, n in enumerate(MEAS):
        v = V[n]
        cl = CLS[v["cls"]]
        val = v[c["key"]]
        if "err" in c:
            lo_, hi_ = val - v[c["err"]], val + v[c["err"]]
            assert lo_ > 0
            ax.plot([lo_, hi_], [i, i], color=cl["dark"], lw=0.6, zorder=3, solid_capstyle="butt", clip_on=False)
            for e in (lo_, hi_):
                ax.plot([e, e], [i - 0.17, i + 0.17], color=cl["dark"], lw=0.6, zorder=3, solid_capstyle="butt", clip_on=False)
        extrap = (c["key"] == "km" and val > v["xmax"])         # Km above the highest ATP concentration measured: read off a curve that does not reach it
        d_, = ax.plot([val], [i], linestyle="none", marker="o", ms=3.4, mfc="white" if extrap else cl["fill"], mec=cl["dark"], mew=0.5, zorder=5, clip_on=False)
        d_.set_gid(f"cdot-{ci}-{n}")
        cdots[f"{ci}-{n}"] = dict(id=f"cdot-{ci}-{n}", x=c["x"] + c["w"] * (math.log10(val) - math.log10(c["lo"])) / (math.log10(c["hi"]) - math.log10(c["lo"])), t=rowt[i])
        if extrap:
            text(f"extrap-{n}", cdots[f"{ci}-{n}"]["x"] + 1.9, rowt[i] - 0.3, "*", fs=7.0, bold=True)
DATA["cdots"] = cdots
for ci, c in enumerate(COLS):
    cx_ = c["x"] + c["w"] / 2
    text(f"head-{ci}", cx_, T_ROWS - 7.0, c["head"], ha="center", bold=True, fs=7.0)
    text(f"unit-{ci}", cx_, T_AX_BOT + 5.2, c["unit"], ha="center", fs=FL, color=SUB, within=(c["x"] - 1.0, 0, c["x"] + c["w"] + 1.0, 999))
text("wt-label", x_wt, T_ROWS - 2.4, "WT", ha="center", fs=FL, color=SUB)
text("val-h1", VAL_R, T_ROWS - 6.4, "kcat/Km", ha="right", fs=FL, color=SUB)
text("val-h2", VAL_R, T_ROWS - 3.6, "value", ha="right", fs=FL, color=SUB)
text("fold-h1", FOLD_X, T_ROWS - 6.4, "fold lower", fs=FL, color=SUB)
text("fold-h2", FOLD_X, T_ROWS - 3.6, "than WT", fs=FL, color=SUB)
for x_ in (RULE1, RULE2):
    cv.plot([x_, x_], [H - (T_ROWS - 7.6), H - (T_AX_BOT + 7.0)], color=RULE, lw=0.4)
for i, n in enumerate(MEAS):
    v = V[n]
    text(f"row-{n}", NAME_R, rowt[i], n + (" †" if n in ("E32A", "E32Q") else ""), ha="right", bold=True, fs=7.0)
    text(f"val-{n}", VAL_R, rowt[i], v["kcatkm_s"], ha="right", fs=7.0)
    if n != "WT":
        text(f"fold-{n}", FOLD_X, rowt[i], str(sig2(v["ratio"])), fs=7.0)
DATA["ratio_rows"] = {n: sig2(V[n]["ratio"]) for n in MEAS if n != "WT"}
assert list(DATA["ratio_rows"].values()) == sorted(DATA["ratio_rows"].values()), DATA["ratio_rows"]    # ranked high to low efficiency = increasing fold lower

# N.D. list: the paper's reason, the highest mean kapp of the source-data file (computed), the ATP range tested
KAPP_R, ATP_R = BAND_X1 - 17.0, BAND_X1 - 1.2                  # the two numeric columns of the N.D. list, right edges
text("nd-h1", LX0, T_ND + 1.4, "N.D.: activity not detected (Table 1); no kcat or Km is given.", fs=FL, color=INK, bold=True)
text("nd-hk", KAPP_R, T_ND + 4.4, "top kapp, per min", ha="right", fs=FL, color=SUB)
text("nd-ha", ATP_R, T_ND + 4.4, "top ATP, mM", ha="right", fs=FL, color=SUB)
REASON = {
    "E29A": ["below the detection limit"], "E29V": ["below the detection limit"], "E29K": ["below the detection limit"], "E29G": ["below the detection limit"],
    "E29Q/E32Q": ["complete loss of ATPase activity"],
    "E32K": ["complete loss of ATPase activity;", "charge reversal likely perturbs the site (paper)"],
    "E32G": ["structure likely disrupted", "(circular dichroism spectrum)"],
}
text("nd-h3", LX0, ndpos["E32G-head"], "Structure disrupted (paper): not a clean test of Glu32.", fs=FL, color=INK, bold=True)
for name, nl in ND_ROWS:
    t0, h = ndpos[name]
    v = V[name]
    cl = v["cls"]
    rect(f"ndband-{name}", BAND_X0, t0, BAND_X1 - BAND_X0, h - 0.5, ND_FILL, ec=ND_EDGE, lw=0.35, z=1)
    if cl == "both":
        two_tone(f"ndstripe-{name}", BAND_X0, t0, 1.4, h - 0.5, horizontal=True)
    else:
        rect(f"ndstripe-{name}", BAND_X0, t0, 1.4, h - 0.5, CLS[cl]["fill"], z=3)
    wb = (BAND_X0, t0 - 0.2, BAND_X1, t0 + h)
    tc = t0 + (h - 0.5) / 2
    text(f"ndname-{name}", NAME_R, tc, name, ha="right", bold=True, fs=7.0)
    lines = REASON[name]
    t_first = tc if nl == 1 else tc - 1.35                     # the numbers stand on the first line, so a long second line runs under them
    for k, ln in enumerate(lines):
        text(f"ndr-{name}-{k}", BAND_X0 + 2.4, t_first + 2.7 * k, ln, fs=FL, within=wb)
    text(f"ndk-{name}", KAPP_R, t_first, fmt2(v["max_mean"]), ha="right", fs=FL, within=wb)
    text(f"nda-{name}", ATP_R, t_first, f"{v['x_max']:g}", ha="right", fs=FL, within=wb)

# ================================================================== panel b: inset, caption, key, notes
text("b-letter", RX0, T_A + 2.2, "b", bold=True, fs=9)
text("b-title", RX0 + 4.6, T_A + 2.2, "Two glutamates, one water", bold=True, fs=7.5)
text("b-sub1", RX0 + 4.6, T_A + 5.8, "Glu29 and Glu32 each touch the same water,", color=SUB)
text("b-sub2", RX0 + 4.6, T_A + 8.6, "drawn next to the ATP analogue AMPPCP.", color=SUB)
A = dict(ART["anchors"])


def mmpt(name):
    fx, fy = A[name]
    return (IMG["x"] + fx * IMG["w"], IMG["t"] + fy * IMG["h"])


DATA["img"] = dict(IMG, name="pocket__full", anchors={k: mmpt(k) for k in A})
d29, d32 = GEO["Glu29_to_water"]["A"], GEO["Glu32_to_water"]["A"]
RLAB = [("AMPPCP", "lig_PA", None, -4.2), ("Mg ion", "mg", None, -5.0), ("water", "water", None, -9.2), ("Glu29", "glu29_CD", f"{d29:.1f} Å", 0.0)]      # last: label offset from its anchor, mm
LLAB = [("Glu32", "glu32_CD", f"{d32:.1f} Å")]
LAB_X_R = IMG["x"] + IMG["w"] + 2.8
LAB_X_L = IMG["x"] - 2.8
order = sorted(range(len(RLAB)), key=lambda i: mmpt(RLAB[i][1])[1] + RLAB[i][3])
lt, prev, prev_h = {}, -99.0, 0.0
for i in order:
    lt[i] = max(mmpt(RLAB[i][1])[1] + RLAB[i][3], prev + prev_h)
    prev, prev_h = lt[i], (6.0 if RLAB[i][2] else 3.8)
for i, (s, a, sub, _dt) in enumerate(RLAB):
    text(f"lab-{a}", LAB_X_R, lt[i], s, fs=7.0)
    if sub:
        text(f"sub-{a}", LAB_X_R, lt[i] + 2.8, sub, fs=FL, color=SUB)
    DATA["leaders"].append(dict(id=f"lead-{a}", label=f"lab-{a}", anchor=a, side="r", from_x=LAB_X_R - 0.7, from_t=lt[i], to=mmpt(a)))
for s, a, sub in LLAB:
    text(f"lab-{a}", LAB_X_L, mmpt(a)[1], s, ha="right", fs=7.0)
    if sub:
        text(f"sub-{a}", LAB_X_L, mmpt(a)[1] + 2.8, sub, ha="right", fs=FL, color=SUB)
    DATA["leaders"].append(dict(id=f"lead-{a}", label=f"lab-{a}", anchor=a, side="l", from_x=LAB_X_L + 0.7, from_t=mmpt(a)[1], to=mmpt(a)))
CAP = ["MutL repairs DNA mismatches and hydrolyses ATP. PDB 6LZJ chain A:", "its $Aquifex aeolicus$ ATPase domain with AMPPCP.",
       "Residue numbers are the paper's; the PDB file's are 7 lower.", "Å: carboxylate O to water O, computed from the PDB file;",
       "the paper's Fig. 1A gives its own values."]
for k, s_ in enumerate(CAP):
    text(f"cap-{k}", RX0, T_CAP + 1.2 + 2.75 * k, s_, fs=FL, color=SUB, mfs=FL)
text("name-0", RX0, T_NAMES, "E29Q: Glu29 replaced by Gln; E29Q/E32Q: both; WT: wild type.", fs=FL, color=SUB)
text("name-1", RX0, T_NAMES + 2.8, "Amino acids: A Ala, G Gly, K Lys, Q Gln, V Val.", fs=FL, color=SUB)
text("colour-h", RX0, T_NAMES + 7.2, "Colour: residue replaced", bold=True, fs=7.0)
CHIPS = [("wt", RX0), ("g29", RX0 + 24.0), ("g32", RX0 + 38.0), ("both", RX0 + 52.0)]
for c, cx0 in CHIPS:
    ct = T_NAMES + 10.8
    if c == "both":
        two_tone("chip-both", cx0, ct - 1.1, 3.4, 2.2, horizontal=False)
        text("chip-t-both", cx0 + 4.4, ct, "both", fs=FL, color=SUB)
    else:
        rect(f"chip-{c}", cx0, ct - 1.1, 3.4, 2.2, CLS[c]["fill"], ec=CLS[c]["dark"], lw=0.35, z=3)
        text(f"chip-t-{c}", cx0 + 4.4, ct, CLS[c]["text"], fs=FL, color=SUB)
NOTES = ["† Table 1's E32A and E32Q rows look exchanged against the source data:", "Km, its error, kcat/Km and the fold lower cross. Panel c draws the source", "data; panel a prints Table 1 as published.",
         "* Km above the highest ATP tested (5 mM): extrapolated.", "Fold lower has no error: 160 and 170 are not distinct."]
for k, s_ in enumerate(NOTES):
    text(f"note-{k}", RX0, T_NOTES + 2.75 * k + (0.9 if k >= 3 else 0.0) + (0.9 if k >= 4 else 0.0), s_, fs=FL, color=INK if k < 3 else SUB)

# ================================================================== panel c: five tiles in rank order
text("c-letter", LX0, T_C + 2.2, "c", bold=True, fs=9)
text("c-title", LX0 + 4.6, T_C + 2.2, "Speed against ATP, ordered as a", bold=True, fs=7.5)
text("c-sub1", LX0 + 4.6, T_C + 5.8, "kapp: ATP hydrolysed per enzyme per minute. Top kapp: highest mean, computed. Numbers: kcat, top kapp per min; Km mM.", color=SUB)
text("c-sub2", LX0 + 4.6, T_C + 8.8, "Height: kapp ÷ own kcat (1 = top speed). Width: ATP concentration (wild type 1 mM, others 5 mM).", color=SUB)
lg_t = T_C + 12.0                                              # legend row of the marks
items = [("dot", "mean of 3 runs; bar: standard deviation", 42.0), ("solid", "curve from Table 1's Km", 25.0), ("dashed", "unweighted refit of the dots, computed", 42.5), ("dotted", "kcat and Km", 12.5)]
gx = LX0 + 4.6
for kind, s_, wtxt in items:
    g0, g1 = gx, gx + 5.6
    if kind == "dot":
        cv.plot([(g0 + g1) / 2], [H - lg_t], linestyle="none", marker="o", ms=2.3, mfc=CLS["g32"]["fill"], mec=CLS["g32"]["dark"], mew=0.3, zorder=6)
        cv.plot([(g0 + g1) / 2] * 2, [H - lg_t - 1.2, H - lg_t + 1.2], color=CLS["g32"]["dark"], lw=0.5, zorder=5)
    elif kind == "solid":
        cv.plot([g0, g1], [H - lg_t] * 2, color=INK, lw=0.7, solid_capstyle="butt")
    elif kind == "dashed":
        cv.plot([g0, g1], [H - lg_t] * 2, color=INK, lw=0.6, ls=(0, (2.2, 1.4)), dash_capstyle="butt")
    else:
        cv.plot([g0, g1], [H - lg_t] * 2, color=GUIDE, lw=0.6, ls=(0, (1, 1.4)))
    text(f"lg-{kind}", g1 + 1.6, lg_t, s_, fs=FL, color=SUB)
    gx = g1 + 1.6 + wtxt + 4.0
assert gx - 4.0 <= RX1, gx
tiles = []
for i, name in enumerate(MEAS):
    x0 = LX0 + i * (TW + 1.2)
    t0 = T_TILES
    v = V[name]
    cl = CLS[v["cls"]]
    rect(f"band-{name}", x0, t0, TW, 0.9, cl["fill"], z=2)
    wb = (x0, t0, x0 + TW, t0 + TILE_H)
    text(f"tile-{name}-name", x0 + 1.0, t0 + 3.3, name + (" †" if name in ("E32A", "E32Q") else ""), bold=True, fs=7.5, within=wb)
    px, pt_, pw, ph = x0 + PL, t0 + TILE_PLOT_T, TW - PL - PR, TILE_PLOT_H
    xmax = v["xmax"]
    ax = axes(px, pt_, pw, ph)
    ax.set_xlim(0, xmax)
    ax.set_ylim(0, 1.12)
    ax.set_yticks([0, 0.5, 1])
    ax.set_yticklabels(["0", "0.5", "1"] if i == 0 else ["", "", ""])             # the y axis is shared: its numbers stand once, at the left
    xt = [0, int(xmax)]                                                          # the ends of the measured range: 1 mM for wild type, 5 mM for the others
    ax.set_xticks(xt)
    ax.set_xticklabels([f"{u:g}" for u in xt])
    s_ = np.linspace(0, xmax, 220)
    kT, KT = v["kcat"], v["km"]
    ax.plot([0, xmax], [1, 1], color=DOTTED, lw=0.6, ls=(0, (1, 1.4)), zorder=1, clip_on=False)
    if KT <= xmax:
        ax.plot([KT, KT], [0, 0.5], color=DOTTED, lw=0.6, ls=(0, (1, 1.4)), zorder=1)
        ax.plot([0, KT], [0.5, 0.5], color=DOTTED, lw=0.6, ls=(0, (1, 1.4)), zorder=1)
    rf = v["refit"]
    ax.plot(s_, rf["kcat"] / kT * s_ / (rf["km"] + s_), color=INK, lw=0.6, ls=(0, (2.2, 1.4)), zorder=3, dash_capstyle="butt")
    ax.plot(s_, s_ / (KT + s_), color=INK, lw=0.7, zorder=4, solid_capstyle="butt")
    dots = []
    for j, p in enumerate(v["pts"]):
        y, sd = p["mean"] / kT, p["sd"] / kT
        ax.plot([p["x"], p["x"]], [max(y - sd, 0), y + sd], color=cl["dark"], lw=0.5, zorder=5, solid_capstyle="butt", clip_on=False)
        d_, = ax.plot([p["x"]], [y], linestyle="none", marker="o", ms=2.3, mfc=cl["fill"], mec=cl["dark"], mew=0.3, zorder=6, clip_on=False)
        d_.set_gid(f"dot-{name}-{j}")
        dots.append(dict(id=f"dot-{name}-{j}", x=px + pw * p["x"] / xmax, t=pt_ + ph * (1 - y / 1.12)))
    DATA["dots"][name] = dots
    DATA["boxes"][f"tile-{name}"] = dict(x=px, t=pt_, w=pw, h=ph, xmax=xmax, ymax=1.12)
    invisible_area(f"area-tile-{name}", px, pt_, pw, ph)
    text(f"tile-{name}-xt", px + pw / 2, pt_ + ph + 4.6, "ATP (mM)", ha="center", fs=FL, within=wb)
    if i == 0:
        text(f"tile-{name}-yt", x0 + 1.9, pt_ + ph / 2, "kapp ÷ kcat", ha="center", fs=FL, rot=True)
    top = max(p["mean"] for p in v["pts"])
    rows_ = (("kcat", v["kcat_s"], v["kcat_e"]), ("Km", v["km_s"], v["km_e"] + (" *" if name == "E32V" else "")), ("top kapp", fmt2(top), None))
    for k, (lab, mean, err) in enumerate(rows_):
        tt = t0 + TILE_PLOT_T + TILE_PLOT_H + 7.9 + 2.7 * k
        if i == 0:                                                                # row labels once, at the left of the number block
            text(f"tile-{name}-n{k}-l", x0 + 0.8, tt, lab, fs=FL, color=INK, within=wb)
        text(f"tile-{name}-n{k}-m", x0 + 18.6, tt, mean, ha="right", fs=FL, within=wb)
        if err is not None:
            text(f"tile-{name}-n{k}-pm", x0 + 19.9, tt, "±", ha="center", fs=FL, within=wb)
            text(f"tile-{name}-n{k}-e", x0 + 21.2, tt, err, fs=FL, within=wb)
    tiles.append(dict(name=name, x0=x0, t0=t0, cls=v["cls"]))
DATA["tiles"] = tiles

# ================================================================== foot
text("boundary", LX0, H - 5.6, "Paper's: dots, bars, Table 1. Computed here: refits, fold lower, top kapp, scaling, distances. Structure: a PDB entry.", fs=FL, color=SUB)
CREDIT = "After Fig. 1A, D, E of Fukui et al., eLife 2026, doi:10.7554/eLife.111443, CC BY 4.0. Data: source data 2, Table 1, 6LZJ (Izuhara 2020). Redesigned; values as published."
assert len(CREDIT) <= 170, len(CREDIT)          # one line at the type floor: about 1.04 mm a character in 175 mm
text("credit", LX0, H - 2.3, CREDIT, fs=FL, color=SUB)

# ------------------------------------------------------------------ write
OUT.mkdir(exist_ok=True)
save_plot_layer(fig, OUT / "layer.svg")
DATA["fonts"] = FONTS
(OUT / "layer.js").write_text("window.DATA = " + json.dumps(DATA, indent=1) + ";\n", encoding="utf-8")
print(json.dumps(dict(H=H, tile_w=round(TW, 2), img_h=round(IMG["h"], 2), a_end=round(T_A_END, 1), notes_end=round(T_NOTES + 17, 1), t_c=round(T_C, 1), t_tiles=round(T_TILES, 1), words=len(TXT))))
