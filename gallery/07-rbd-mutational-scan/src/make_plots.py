"""Plot layer of gallery piece 07 (redesign of Fig. 2 of Taylor and Starr 2026, PLoS Pathogens 22(6):e1014074).

    py -3 -B gallery/07-rbd-mutational-scan/src/make_plots.py

Reads data/source_data/ppat.1014074.s001.csv (S1 Data; run fetch_data.py first), src/contacts.json (run src/contacts.py first) and the trimmed render index in art/
(index.scan.json, index.zoom.json) and writes
  page/plots_layer.svg   matplotlib: heat-map cells, site-mean strips, frames, colour bars, key glyphs, tick marks (no text: the page draws all text)
  page/plots_layer.js    window.DATA: every position in millimetres (top-down, origin top-left of the 178 mm page), counts, and the sentences that depend on the data
  tables/drawn_cells.csv cells with no value, and cells averaged from fewer than 3 barcodes, in the two heat maps

Layout, left to right: the 20 ACE2-contact sites (wide columns), a gap, the 180 other sites (narrow columns), each block in site order, each inside a frame with 0.5 mm of padding.
Rows, top to bottom: R K H D E Q N S T Y W F A I L M V G P C (the order of the paper's Fig. 5B), then a gap (the white line) and the single-residue deletion.
Per background: a strip of the site mean of the binding score, a strip of the site mean of the expression score, the binding heat map.
Cell colour: scale.py. Dot: the unmutated residue of that site. Grey with a diagonal: no value in the table (NA); nothing is filled in.
Under the lower map: a black tick at every tenth site of the other block (stacked in rows where the labels would touch), a grey mark where contact sites were taken out of the
order, a triangle where site 483 (deleted) would be.
"""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.collections import LineCollection, PatchCollection  # noqa: E402
from matplotlib.patches import Circle, Polygon, Rectangle  # noqa: E402

HERE = Path(__file__).resolve().parent
GAL = HERE.parent
ROOT = GAL.parents[1]
sys.path.insert(0, str(ROOT / "plots"))
sys.path.insert(0, str(HERE))
from plot_layer import MM, save_plot_layer  # noqa: E402
import pal  # noqa: E402
import scale  # noqa: E402
import scan_data as SD  # noqa: E402

OUT_PAGE = GAL / "page"
OUT_TAB = GAL / "tables"
INK, RULE = pal.INK, pal.RULE

# ------------------------------------------------------------------ layout, millimetres, top-down from the top-left corner of the page
W = 178.0
X0 = 28.0                                   # left edge of the contact frame (the strip names and the amino-acid letters sit to its left)
PAD = 0.5                                   # padding between a frame and its first and last column
P_C = 2.2                                   # column pitch of the contact block
GAP = 3.0                                   # gap between the frames
X_END = 176.0                               # right edge of the other frame
ROW, DEL_GAP = 2.1, 0.5                     # row pitch; extra gap (the white line) before the deletion row
STRIP_H, STRIP_GAP = 2.2, 0.4
MAP_H = 21 * ROW + DEL_GAP
# header: the left text lines sit at 5.8, 9.0, 12.2, 15.4; colour bars on the right
BAR = {"bind": dict(x=92.5, L=39.5), "expr": dict(x=135.0, L=39.5)}
BAR_CAP1, BAR_CAP2, BAR_DT, BAR_H = 2.2, 5.2, 7.2, 2.2      # caption rows and bar top, relative to the top of the header; bar height
TICKS = {"bind": [-4, -2, 0, 1], "expr": [-2, -1, 0, 1]}
T_KEY = 19.4                                # key line: glyphs and their texts
T_G1, T_G2, T_BRACKET = 23.6, 26.6, 29.0    # block headings (bold, plain) and the bracket
T_STRIP0 = 30.4
BLOCK = {}
t = T_STRIP0
for _, _name in SD.BG:
    BLOCK[_name] = dict(strip_b=t, strip_e=t + STRIP_H + STRIP_GAP, map_t=t + 2 * STRIP_H + STRIP_GAP + 0.7)
    t = BLOCK[_name]["map_t"] + MAP_H + 3.0
MAP_B = BLOCK["LP.8.1"]["map_t"] + MAP_H     # bottom of the lower map

# panel b: for each background an overview render and its enlargement side by side (four tiles in a row), then the notes; sizes from the trimmed art (struct/trim.py)
AR = json.loads((GAL / "art" / "index.scan.json").read_text(encoding="utf-8"))["scan__kp"]["ar"]
AR_Z = json.loads((GAL / "art" / "index.zoom.json").read_text(encoding="utf-8"))["zoom__kp"]["ar"]
RW = 41.0
RH, RH_Z = RW / AR, RW / AR_Z
X_OV = [1.5, 1.5 + 2 * RW + 3.0 + 4.0]      # overview of KP.3.1.1, of LP.8.1
X_IN = [X_OV[0] + RW + 3.0, X_OV[1] + RW + 3.0]        # their enlargements
DIGIT_MM, CHAR_MM = 1.30, 1.20              # width of a digit and an average character at 6.55 pt (the page measures the real text and checks)


def main() -> None:
    cells = SD.load()
    SD.check(cells)
    contacts = json.loads((HERE / "contacts.json").read_text(encoding="utf-8"))
    con = sorted(contacts["sites_50"])
    oth = [s for s in SD.SITES if s not in con]
    assert len(con) == 20 and len(oth) == 180
    wt = {t: SD.wild_type(cells, t) for t, _ in SD.BG}
    assert [wt["Omicron_KP3"][x] for x in SD.HOTSPOTS] == ["S", "L", "E"]
    cols = [(s, "c") for s in con] + [(s, "o") for s in oth]
    fc_l, fc_r = X0, X0 + 2 * PAD + len(con) * P_C                  # contact frame
    fo_l = fc_r + GAP                                               # other frame
    P_O = (X_END - PAD - (fo_l + PAD)) / len(oth)
    fo_r = X_END
    xcol = {}
    for i, s in enumerate(con):
        xcol[s] = (fc_l + PAD + i * P_C, P_C)                       # left edge, width
    for i, s in enumerate(oth):
        xcol[s] = (fo_l + PAD + i * P_O, P_O)
    assert fo_r <= W - 1.5
    rowy = {a: i * ROW + (DEL_GAP if a == "-" else 0.0) for i, a in enumerate(SD.AA_ORDER)}   # offset from the top of a map

    # ---- sentences that depend on the data
    resn = contacts["resn"]
    THREE = {"ALA": "A", "ARG": "R", "ASN": "N", "ASP": "D", "CYS": "C", "GLN": "Q", "GLU": "E", "GLY": "G", "HIS": "H", "ILE": "I", "LEU": "L", "LYS": "K", "MET": "M", "PHE": "F",
             "PRO": "P", "SER": "S", "THR": "T", "TRP": "W", "TYR": "Y", "VAL": "V"}
    dif = {n: {int(s): v for s, v in contacts["differs_from_table"][t].items()} for t, n in SD.BG}          # site -> [8QSQ letter, table letter]
    for n, d in dif.items():                                                                                   # recompute from the table and the structure: every wild type that differs
        t = dict((nn, tt) for tt, nn in SD.BG)[n]
        again = {s: [THREE[resn[str(s)]], wt[t][s]] for s in SD.SITES if str(s) in resn and THREE[resn[str(s)]] != wt[t][s]}
        assert again == {s: list(v) for s, v in d.items()}, (n, again, d)
    kp, lp = dif["KP.3.1.1"], dif["LP.8.1"]
    both = sorted(s for s in kp if s in lp and kp[s] == lp[s])
    only_kp, only_lp = sorted(s for s in kp if s not in both), sorted(s for s in lp if s not in both)
    sub = lambda d, ss: ", ".join(f"{d[s][0]}{s}{d[s][1]}" for s in ss)
    diff_text = f"8QSQ residue to scanned residue: {sub(kp, both)} (both)" + (f"; {sub(kp, only_kp)} (KP.3.1.1 only)" if only_kp else "") + (f"; {sub(lp, only_lp)} (LP.8.1 only)" if only_lp else "") + "."
    no_coords = [s for s in SD.SITES if str(s) not in resn]
    no_coords_text = ", ".join(str(s) for s in no_coords)
    print(diff_text, "| no coordinates:", no_coords_text)

    # ---- tick marks of the other block: every tenth site, in the first row where its label fits; a mark where contact sites were taken out; a triangle at 483
    centre = lambda s: xcol[s][0] + xcol[s][1] / 2
    items = []                                                      # (x centre, width, kind, text)
    for s in oth:
        if s % 10 == 0:
            items.append((centre(s), 3 * DIGIT_MM, "tick", s))
    x483 = xcol[482][0] + xcol[482][1]                                # boundary between sites 482 and 484
    assert 484 in xcol and 482 in xcol and abs(xcol[484][0] - x483) < 1e-9
    items.sort(key=lambda q: q[0])
    row_right = []                                                  # right edge of the last item in each row
    placed = []
    for x, w, kind, s in items:
        r = 0
        while True:
            if r == len(row_right):
                row_right.append(-99.0)
            if x - w / 2 >= row_right[r] + 0.45:
                break
            r += 1
        row_right[r] = x + w / 2
        placed.append(dict(x=x, row=r, kind=kind, site=s))
    n_rows = len(row_right)
    marks = []                                                      # grey marks: boundaries inside the other block where one or more contact sites were taken out
    for a, b in zip(oth, oth[1:]):
        if b - a > 1 and any(s in con for s in range(a + 1, b)):
            marks.append(xcol[a][0] + xcol[a][1])
    first_gap = [s for s in con if s < oth[0]]                      # contact sites before the first other site would sit at the left edge: none here
    assert not first_gap
    # vertical positions under the lower map
    T_LAB = MAP_B + 3.0                                              # centre of the first row of tick labels
    ROW_LAB = 2.8
    ax1 = max(MAP_B + 7.8, T_LAB + ROW_LAB * (n_rows - 1) + 1.4) + 2.6          # centre of the first axis sentence
    ax2 = ax1 + 3.0
    PB_T = ax2 + 3.8                                                 # top of panel b (letter row)
    RT = PB_T + 19.8                                                 # top of the tiles; their names sit above
    NOTE_T = RT + max(RH, RH_Z) + 2.8
    N_NOTES = 2
    H = round(NOTE_T + 3.0 * (N_NOTES - 1) + 8.6, 1)                 # page height: notes, then the two lines of the foot

    def Y(t):
        return H - t

    fig = plt.figure(figsize=(W * MM, H * MM), dpi=100)
    fig.patch.set_alpha(0.0)
    cv = fig.add_axes([0, 0, 1, 1])
    cv.set_xlim(0, W)
    cv.set_ylim(0, H)
    cv.axis("off")

    D = dict(W=W, H=H, X0=X0, PAD=PAD, P_C=P_C, P_O=P_O, ROW=ROW, MAP_H=MAP_H, STRIP_H=STRIP_H, MAP_B=MAP_B, T=dict(key=T_KEY, g1=T_G1, g2=T_G2, bracket=T_BRACKET),
             blocks={}, contact=[], bars={}, counts={}, hotspots=SD.HOTSPOTS, f_c=[fc_l, fc_r], f_o=[fo_l, fo_r], row_y={a: rowy[a] for a in SD.AA_ORDER},
             ticks=[], marks=marks, x483=x483, t_lab=T_LAB, row_lab=ROW_LAB, ax=[ax1, ax2], diff_text=diff_text, no_coords_text=no_coords_text,
             pb=dict(t=PB_T, rt=RT, rw=RW, rh=RH, rh_in=RH_Z, x_ov=X_OV, x_in=X_IN, ar=AR, ar_in=AR_Z, notes_t=NOTE_T, names_t=RT - 1.6))
    rows_out = []
    for t, name in SD.BG:
        b = BLOCK[name]
        D["blocks"][name] = dict(b)
        mb = SD.site_mean(cells, t, "bind")
        me = SD.site_mean(cells, t, "expr")
        rects, fcs, dots, miss_l = [], [], [], []
        n_miss = 0
        for s, kind in cols:
            x, w = xcol[s]
            for a in SD.AA_ORDER:
                c = cells[t][(s, a)]
                top = b["map_t"] + rowy[a]
                v = c["bind"]
                rects.append(Rectangle((x, Y(top + ROW)), w, ROW))
                if v is None:
                    n_miss += 1
                    fcs.append(scale.MISSING_FILL)
                    miss_l.append([(x, Y(top + ROW)), (x + w, Y(top))])
                    rows_out.append((name, s, a, "NA", c["n_bind"]))
                    continue
                fcs.append(scale.color(v, "bind"))
                if c["is_wt"]:
                    dots.append(Circle((x + w / 2, Y(top + ROW / 2)), 0.42 if kind == "c" else 0.19))
                rows_out.append((name, s, a, f"{v:.2f}", c["n_bind"]))
        cells_col = PatchCollection(rects, facecolors=fcs, edgecolors=fcs, linewidths=0.12, zorder=2)
        cells_col.set_gid(f"cells_{name}")
        cv.add_collection(cells_col)
        dc = PatchCollection(dots, facecolors=INK, edgecolors="none", zorder=4)
        dc.set_gid(f"wt_{name}")
        cv.add_collection(dc)
        ml = LineCollection(miss_l, colors=scale.MISSING_LINE, linewidths=0.55, zorder=4, capstyle="butt")
        ml.set_gid(f"missing_{name}")
        cv.add_collection(ml)
        for key, tt, mm_ in (("bind", b["strip_b"], mb), ("expr", b["strip_e"], me)):          # strips: site mean of binding, site mean of expression
            sr, sf = [], []
            for s, _ in cols:
                x, w = xcol[s]
                assert mm_[s][0] is not None
                sr.append(Rectangle((x, Y(tt + STRIP_H)), w, STRIP_H))
                sf.append(scale.color(mm_[s][0], key))
            sc = PatchCollection(sr, facecolors=sf, edgecolors=sf, linewidths=0.12, zorder=2)
            sc.set_gid(f"strip_{key}_{name}")
            cv.add_collection(sc)
        for (xa, xb, tag) in ((fc_l, fc_r, "c"), (fo_l, fo_r, "o")):                           # frames (white cells would otherwise vanish)
            for key, tt, hh in (("bind", b["strip_b"], STRIP_H), ("expr", b["strip_e"], STRIP_H), ("map", b["map_t"], MAP_H)):
                r = Rectangle((xa, Y(tt + hh)), xb - xa, hh, facecolor="none", edgecolor=RULE, linewidth=0.35, zorder=5)
                r.set_gid(f"box_{key}_{tag}_{name}")
                cv.add_patch(r)
        for s in SD.HOTSPOTS:                                                                     # hotspot columns: an outline around the strips and the map of the column
            x, w = xcol[s]
            r = Rectangle((x, Y(b["map_t"] + MAP_H)), w, MAP_H + (b["map_t"] - b["strip_b"]), facecolor="none", edgecolor=INK, linewidth=0.9, zorder=6)
            r.set_gid(f"hot_{s}_{name}")
            cv.add_patch(r)
        mut = [(s, a) for s, _ in cols for a in SD.AA_ORDER if not cells[t][(s, a)]["is_wt"]]
        D["counts"][name] = dict(mutations=len(mut), substitutions=sum(1 for s, a in mut if a != "-"), deletions=sum(1 for s, a in mut if a == "-"), missing_binding=n_miss,
                                 missing_expression=sum(1 for s, a in mut if cells[t][(s, a)]["expr"] is None), sites=len(cols))
        assert D["counts"][name]["substitutions"] == 3800 and D["counts"][name]["deletions"] == 200
    # ---- brackets over the two frames
    for (xa, xb, tag) in ((fc_l, fc_r, "c"), (fo_l, fo_r, "o")):
        ln = LineCollection([[(xa, Y(T_BRACKET + 0.9)), (xa, Y(T_BRACKET)), (xb, Y(T_BRACKET)), (xb, Y(T_BRACKET + 0.9))]], colors=INK, linewidths=0.6, zorder=5)
        ln.set_gid(f"bracket_{tag}")
        cv.add_collection(ln)
    # ---- ticks under the lower map: every contact column (black, 0.9 mm); every tenth site of the other block (black, longer where the label is in a lower row);
    #      grey marks where contact sites were taken out; a triangle where 483 would be
    tk, gk = [], []
    for s in con:
        x, w = xcol[s]
        tk.append([(x + w / 2, Y(MAP_B)), (x + w / 2, Y(MAP_B + 0.9))])
        D["contact"].append(dict(site=s, wt=wt["Omicron_KP3"][s], x=x + w / 2, hot=s in SD.HOTSPOTS))
    for p in placed:
        if p["kind"] == "tick":
            tk.append([(p["x"], Y(MAP_B)), (p["x"], Y(T_LAB + ROW_LAB * p["row"] - 1.3))] if p["row"] else [(p["x"], Y(MAP_B)), (p["x"], Y(MAP_B + 0.9))])
        D["ticks"].append(p)
    for x in marks:
        gk.append([(x, Y(MAP_B)), (x, Y(MAP_B + 0.7))])
    tc = LineCollection(tk, colors=INK, linewidths=0.5, zorder=5)
    tc.set_gid("ticks_sites")
    cv.add_collection(tc)
    gc = LineCollection(gk, colors="#8A8A8A", linewidths=0.5, zorder=5)
    gc.set_gid("marks_gaps")
    cv.add_collection(gc)
    tri = Polygon([(x483 - 0.7, Y(MAP_B + 1.5)), (x483 + 0.7, Y(MAP_B + 1.5)), (x483, Y(MAP_B + 0.2))], closed=True, facecolor="#FFFFFF", edgecolor=INK, linewidth=0.45, zorder=6)
    tri.set_gid("mark_483")
    cv.add_patch(tri)
    tri2 = Polygon([(x483 - 0.7, Y(T_BRACKET - 1.5)), (x483 + 0.7, Y(T_BRACKET - 1.5)), (x483, Y(T_BRACKET - 0.2))], closed=True, facecolor="#FFFFFF", edgecolor=INK, linewidth=0.45, zorder=6)
    tri2.set_gid("mark_483_top")
    cv.add_patch(tri2)
    # ---- colour bars: 60 vector steps, ticks, outline. Panel a: binding (map and strip) and expression (strip); panel b: binding again for the structure
    def bar(key, bx, L, top, gid):
        lo, hi = scale.LIMITS[key]
        px = lambda v: bx + (v - lo) / (hi - lo) * L
        rs, fs = [], []
        for i in range(60):
            v0, v1 = lo + (hi - lo) * i / 60, lo + (hi - lo) * (i + 1) / 60
            rs.append(Rectangle((px(v0), Y(top + BAR_H)), px(v1) - px(v0), BAR_H))
            fs.append(scale.color((v0 + v1) / 2, key))
        bc = PatchCollection(rs, facecolors=fs, edgecolors=fs, linewidths=0.1, zorder=2)
        bc.set_gid("bar_" + gid)
        cv.add_collection(bc)
        r = Rectangle((bx, Y(top + BAR_H)), L, BAR_H, facecolor="none", edgecolor=RULE, linewidth=0.35, zorder=5)
        r.set_gid("bar_box_" + gid)
        cv.add_patch(r)
        tcol = LineCollection([[(px(v), Y(top + BAR_H)), (px(v), Y(top + BAR_H + 0.9))] for v in TICKS[key]], colors=INK, linewidths=0.5, zorder=5)
        cv.add_collection(tcol)
        return dict(x=bx, L=L, t=top, h=BAR_H, lo=lo, hi=hi, ticks=[dict(v=v, x=px(v)) for v in TICKS[key]])
    D["bars"]["bind"] = bar("bind", BAR["bind"]["x"], BAR["bind"]["L"], BAR_DT, "bind")
    D["bars"]["expr"] = bar("expr", BAR["expr"]["x"], BAR["expr"]["L"], BAR_DT, "expr")
    D["bars"]["struct"] = bar("bind", BAR["bind"]["x"], BAR["bind"]["L"], PB_T + BAR_DT, "struct")
    # ---- key line: unmutated residue (dot), no value (grey with a diagonal), hotspot column (outlined box)
    gx = [6.1, 44.5, 101.0]
    g = Rectangle((gx[0], Y(T_KEY + 1.0)), 2.3, 2.0, facecolor="#FFFFFF", edgecolor=RULE, linewidth=0.35, zorder=5)
    g.set_gid("key_dot_cell")
    cv.add_patch(g)
    kd = PatchCollection([Circle((gx[0] + 1.15, Y(T_KEY)), 0.42)], facecolors=INK, edgecolors="none", zorder=6)
    kd.set_gid("key_dot")
    cv.add_collection(kd)
    g = Rectangle((gx[1], Y(T_KEY + 1.0)), 2.3, 2.0, facecolor=scale.MISSING_FILL, edgecolor=RULE, linewidth=0.35, zorder=5)
    g.set_gid("key_missing_cell")
    cv.add_patch(g)
    km = LineCollection([[(gx[1], Y(T_KEY + 1.0)), (gx[1] + 2.3, Y(T_KEY - 1.0))]], colors=scale.MISSING_LINE, linewidths=0.55, zorder=6)
    km.set_gid("key_missing_line")
    cv.add_collection(km)
    g = Rectangle((gx[2], Y(T_KEY + 1.0)), 2.3, 2.0, facecolor="#FFFFFF", edgecolor=INK, linewidth=0.9, zorder=5)
    g.set_gid("key_hot")
    cv.add_patch(g)
    D["key"] = dict(t=T_KEY, x=gx, text_dx=3.6)
    OUT_PAGE.mkdir(exist_ok=True)
    save_plot_layer(fig, OUT_PAGE / "plots_layer.svg")
    (OUT_PAGE / "plots_layer.js").write_text("window.DATA = " + json.dumps(D, indent=1) + ";\n", encoding="utf-8")
    OUT_TAB.mkdir(exist_ok=True)
    nat = {n: t for t, n in SD.BG}
    with open(OUT_TAB / "drawn_cells.csv", "w", newline="", encoding="utf-8") as f:
        f.write("# Cells of the two heat maps with no value in S1 Data (delta_bind = NA) and cells averaged from fewer than 3 barcoded variants (n_bc_bind). "
                "Source: Taylor and Starr 2026, PLoS Pathogens 22(6):e1014074, S1 Data (CC BY 4.0). The unmutated cells are not listed.\n")
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["background", "site", "mutant", "delta_bind", "n_bc_bind"])
        for r in rows_out:
            if (r[3] == "NA" or r[4] < 3) and not cells[nat[r[0]]][(r[1], r[2])]["is_wt"]:
                w.writerow(r)
    low = {n: sum(1 for r in rows_out if r[0] == n and r[3] != "NA" and r[4] < 3 and not cells[nat[n]][(r[1], r[2])]["is_wt"]) for _, n in SD.BG}
    print("drawn per background:", D["counts"], "| sites:", len(cols), "| cells with fewer than 3 barcodes (drawn):", low)
    print("frames:", D["f_c"], D["f_o"], "| P_O", round(P_O, 4), "| tick rows:", n_rows, "| grey marks:", len(marks), "| H", H, "| MAP_B", round(MAP_B, 2), "PB_T", round(PB_T, 2))


if __name__ == "__main__":
    main()
