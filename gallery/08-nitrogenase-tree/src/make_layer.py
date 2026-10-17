"""Layer of gallery piece 08 (redesign of Figs 3A, 4A, 4B of Cuevas Zuviria et al. 2025, eLife 14:RP105613).

    py -3 -I gallery/08-nitrogenase-tree/src/make_layer.py        # needs data/fig4 (fetch_data.py), tables/inset_*.json (src/spans.py) and art/ (render_nsdb.py, trim.py)

Writes
  page/plots_layer.svg   the tree (769 nodes as lines), clade bands and strips, tip guides, the root stub, the three event branches and discs, the trait matrix
                         (385 rows x 3 traits), colour keys, numbered rings, right bars. Hand-written SVG in millimetres (viewBox = page), no text.
  page/plots_layer.js    window.DATA: every box, column, row, marker, label position and number the page text sits on (millimetres from the top-left corner)
  tables/tip_traits.csv  the 385 rows as drawn: tip, block, row, the three traits, organism
  tables/clade_medians.csv, tables/events.csv

Everything drawn comes from the files: topology, branch lengths, clade labels, nitrogenase types and traits from the Figure 4 source data.
Computed here: the root (outgroup edge), the order of the rows, the medians of the table, the positions of the three events (last common ancestor of the clade's tips),
the places of the event labels (the free spot next to each disc that crosses the fewest tree lines) and of the letters D and K on the renders (the middle of the
largest visible patch of each grey, from the PNG).
Checked here: node counts against the paper, the three event nodes against the node numbers printed in the paper's Fig. 3 (786 and 787, 1206, 1207, 1345).
"""
from __future__ import annotations

import csv
import json
import statistics
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFont
from scipy import ndimage as ndi

HERE = Path(__file__).resolve().parent
GAL = HERE.parent
ROOT = GAL.parents[1]
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(ROOT / "plots"))
import nsdb_tree as T  # noqa: E402
import pal  # noqa: E402

PAGE, TAB, ART = GAL / "page", GAL / "tables", GAL / "art"
PAGE.mkdir(exist_ok=True)
TAB.mkdir(exist_ok=True)

# ------------------------------------------------------------------ layout, millimetres from the top-left corner
W, H = 178.0, 222.0
X0 = 1.5                                       # outer margin
Y0, P = 40.0, 0.34                             # top of row 0, row pitch
NR = 385
Y1 = Y0 + NR * P                               # bottom of the last row
LBAR_X, LBAR_W = 2.0, 3.2                      # left strips: clade names on the bands
XR, S = 9.0, 15.4                              # x of the root, mm per substitution per site
MX0, CWID, CGAP = 44.0, 15.4, 1.6              # matrix: left edge, column width, gap
MEND = MX0 + 3 * CWID + 2 * CGAP               # right edge of the matrix
RING_X = 95.5                                  # centre of the numbered rings at the row ends
BAR_X, BAR_W = 97.7, 3.0                       # right bars (colour only; the leaders to panel b start here)
RX = 106.2                                     # left edge of the right column (panel b)
DISC_R = 1.5                                   # radius of the discs (events, glyphs)
DISC_OFF = DISC_R + 0.45                       # event discs rest on their thick branch (above or below it), so that short branches stay visible
STUB = 3.1                                     # length of the dashed root stub (not to scale: the file gives the root branch no stem)
INK, SUB, RULE = pal.INK, pal.SUB, pal.RULE
FILL = pal.FILL

# colour families: one per clade group (Nif-III, Vnf and Anf are three tones of one family because Vnf and Anf sit inside the Nif-III clade), indigo for the events
_pl, _pp = FILL["palelilac"], FILL["peri"]
_vnf = pal.mix(_pl, _pp, 0.55)
C = {
    "nif-i": dict(name="Nif-I", bar=FILL["mint"], band=pal.mix(FILL["mint"], "#FFFFFF", 0.62), text=INK),
    "nif-ii": dict(name="Nif-II", bar=FILL["apricot"], band=pal.mix(FILL["apricot"], "#FFFFFF", 0.62), text=INK),
    "nif-iii": dict(name="Nif-III", bar=_pl, band=pal.mix(_pl, "#FFFFFF", 0.45), text=INK),
    "Vnf": dict(name="Vnf", bar=_vnf, band=pal.mix(_vnf, "#FFFFFF", 0.40), text=INK),
    "Anf": dict(name="Anf", bar=_pp, band=pal.mix(_pp, "#FFFFFF", 0.30), text="#FFFFFF"),
}
EVENT = FILL["indigo"]
GUIDE = pal.load()["guide"]
D_GREY, K_GREY = pal.mix("#FFFFFF", GUIDE, 0.20), pal.mix("#FFFFFF", GUIDE, 0.80)       # the two greys of the renders (render_nsdb.py uses the same mixes)
GREY_LO, GREY_HI = "#F2F2F2", "#161616"        # trait ramp: lowest to highest value; neutral on purpose, so that colour stays for clades and events
TRAITS = [
    dict(col="total_area", name="Surface area", unit="Å²", fmt="{:,.0f}", invert=False),
    dict(col="intermolecular_contacts", name="Contacts", unit="residue pairs", fmt="{:,.0f}", invert=False),
    dict(col="binding_affinity", name="ΔG", unit="kcal/mol", fmt="{:.1f}", invert=True),     # darker = lower (more stable)
]
# tip -> (group, PDB entry): numbered 1 to 3 from the top of the tree, the order of the insets
HIGHLIGHT = [("Anf_Azotobacter_vinelandii", "Anf", "8BOQ"), ("Nif_Azotobacter_vinelandii", "nif-i", "3U7Q"), ("Nif_Clostridium_pasteurianum", "nif-ii", "4WES")]
BASE = {"8BOQ": ["3U7Q chain D", "4WES chain D"], "3U7Q": ["4WES chain K"], "4WES": ["3U7Q chain D"]}     # relatives the segments are aligned against (the first is the one used)
EV_LABEL = {"anf": "Anf", "nif1": "Nif-I", "nif2": "Nif-II"}
FONT = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 100)


def text_w(s: str, pt: float = 6.55) -> float:
    """Width of s in millimetres in Arial at pt points."""
    return FONT.getlength(s) / 100.0 * pt * 25.4 / 72.0


def ycen(row: float) -> float:
    return Y0 + (row + 0.5) * P


def f3(v):
    return f"{v:.3f}".rstrip("0").rstrip(".")


def label_spot(e, segs, taken, bounds, band):
    """Free place for the label of an event disc: beside it, or on the other side of the branch; the one that crosses the fewest tree lines (0 wanted) and stays in the band."""
    w, h = text_w(EV_LABEL[e["key"]]) + 0.6, 2.7
    x, yd, yb, r = e["xm"], e["y"] + e["dy"], e["y"], DISC_R
    far = yb - 0.7 - h if e["dy"] > 0 else yb + 0.7                 # the side of the branch the disc is not on
    cands = [("right", x + r + 0.6, yd - h / 2), ("left", x - r - 0.6 - w, yd - h / 2), ("far", x - w / 2, far), ("beyond", x - w / 2, yd + (e["dy"] < 0 and -r - 0.4 - h or r + 0.4))]
    best = None
    for name, cx, cy in cands:
        if cx < LBAR_X + LBAR_W + 0.8:
            continue
        n = 0
        if cy < band[0] or cy + h > band[1]:                       # a label must stay inside the band of its disc
            n += 10
        for s_ in segs:
            if s_[0] == "h":                                      # ("h", x1, x2, y)
                _, x1, x2, yy = s_
                if cy - 0.1 < yy < cy + h + 0.1 and x1 < cx + w and x2 > cx:
                    n += 1
            else:                                                  # ("v", x, y1, y2) with y1 < y2
                _, xx, y1, y2 = s_
                if cx - 0.1 < xx < cx + w + 0.1 and y1 < cy + h and y2 > cy:
                    n += 1
        for (ox, oy, ow, oh) in taken:
            if cx < ox + ow and ox < cx + w and cy < oy + oh and oy < cy + h:
                n += 5
        if best is None or n < best[0]:
            best = (n, name, cx, cy, w, h)
    n, name, cx, cy, w, h = best
    return dict(side=name, x=cx, t=cy, w=w, h=h, crossings=n)


def letter_spots(pdb: str):
    """Middle of the largest patch of the D grey and of the K grey in the trimmed render (the point farthest from the patch edge), as fractions of the image."""
    im = np.array(Image.open(ART / f"nsdb__{pdb}_t.png").convert("RGBA")).astype(int)
    out = {}
    for key, col in (("D", D_GREY), ("K", K_GREY)):
        rgb = [int(col[i:i + 2], 16) for i in (1, 3, 5)]
        m = (np.abs(im[..., :3] - rgb).max(2) <= 3) & (im[..., 3] > 250)
        m = ndi.binary_opening(m, iterations=2)
        lab, n = ndi.label(m)
        assert n, f"{pdb}: no {key} grey in the render"
        sizes = ndi.sum(m, lab, range(1, n + 1))
        big = lab == (1 + int(np.argmax(sizes)))
        dist = ndi.distance_transform_edt(big)
        yy, xx = np.unravel_index(int(np.argmax(dist)), dist.shape)
        assert dist[yy, xx] > 45, f"{pdb}: the largest {key} patch is too small for a letter ({dist[yy, xx]:.0f} px)"
        out[key] = (float(xx) / im.shape[1], float(yy) / im.shape[0], float(dist[yy, xx]))
    return out


def main():
    L = T.load()
    byname, tips, grp, traits = L["byname"], L["tips"], L["grp"], L["traits"]
    # ---- the three events: last common ancestor of the clade's tips (paper: "the branch leading to the last common ancestor of the clade")
    anf = T.lca(byname, [t.name for t in tips if grp[t.name] == "Anf"])
    n1 = T.lca(byname, [t.name for t in tips if grp[t.name] == "nif-i"])
    n2 = T.lca(byname, [t.name for t in tips if grp[t.name] == "nif-ii"])
    # the node numbers printed in Fig. 3 of the paper (Anc786 and Anc787 around Anf, Anc1206, Anc1207 for Nif-I, Anc1345 for Nif-II); the tree reproduces them
    assert anf.name == "786" and anf.par.name == "787", (anf.name, anf.par.name)
    assert n1.name == "1207" and n1.par.name == "1206", (n1.name, n1.par.name)
    assert n2.name == "1345" and n2.par.name == "1206", (n2.name, n2.par.name)
    for a, b in (("1209", "1207"), ("1224", "1209")):                 # the nodes Fig. 3C shows after 1207 lie below it in the tree
        assert T.is_below(byname[a], byname[b]) and byname[a] is not byname[b]
    assert T.is_below(byname["Nif_Azotobacter_vinelandii"], byname["1224"])
    # Anf sits inside Vnf in the source tree: the last common ancestor of all Vnf tips (802) holds all Anf tips
    vnf_lca = T.lca(byname, [t.name for t in tips if grp[t.name] == "Vnf"])
    assert vnf_lca.name == "802" and all(T.is_below(byname[t.name], vnf_lca) for t in tips if grp[t.name] == "Anf") and vnf_lca.ntips == 34
    assert traits["802"]["clade"] == "nif-iii"                         # node 802 is labelled Nif-III in the data: it counts in the Nif-III ancestor row
    events = [
        dict(key="anf", letter="D", group="Anf", node=anf, text="D-subunit C-terminal extension", paper="about 60 residues, unique to Anf"),
        dict(key="nif1", letter="K", group="nif-i", node=n1, text="K-subunit N-terminal extension", paper="about 8 to 40 residues, unique to Nif-I"),
        dict(key="nif2", letter="D", group="nif-ii", node=n2, text="D-subunit insertion", paper="about 55 residues, unique to Nif-II"),
    ]
    # ---- trait columns
    def val(t, col):
        return float(traits[t.name][col])

    cols = []
    for k, tr in enumerate(TRAITS):
        v = [val(t, tr["col"]) for t in tips]
        lo, hi = min(v), max(v)
        x = MX0 + k * (CWID + CGAP)
        cols.append(dict(**tr, x=x, w=CWID, vmin=lo, vmax=hi, lo_txt=tr["fmt"].format(lo), hi_txt=tr["fmt"].format(hi)))

    def grey(v, c):
        t = (v - c["vmin"]) / (c["vmax"] - c["vmin"])
        if c["invert"]:
            t = 1 - t
        return pal.mix(GREY_LO, GREY_HI, t)

    # ---- SVG
    o = []
    add = o.append
    add(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}mm" height="{H}mm" viewBox="0 0 {W} {H}" version="1.1">')
    add('<g id="layer">')
    add('<g id="bands">')
    for g, (a, b) in L["blocks"].items():
        add(f'<rect id="band_{g}" x="{LBAR_X}" y="{f3(Y0 + a * P)}" width="{f3(MEND - LBAR_X)}" height="{f3((b - a + 1) * P)}" fill="{C[g]["band"]}"/>')
    add("</g>")
    # tip guides: from the end of every tip to the matrix, hairline
    d = []
    for t in L["tips"]:
        x = XR + S * t.x
        if x + 0.35 < MX0 - 0.7:
            d.append(f"M{f3(x + 0.35)} {f3(ycen(t.y))}H{f3(MX0 - 0.7)}")
    add(f'<path id="guides" d="{"".join(d)}" fill="none" stroke="#9A9A9A" stroke-width="0.05"/>')
    # tree: one horizontal per branch, one vertical per internal node
    hz, vt, segs = [], [], []
    for n in L["nodes"]:
        if n is not L["root"]:
            hz.append(f"M{f3(XR + S * n.par.x)} {f3(ycen(n.y))}H{f3(XR + S * n.x)}")
            segs.append(("h", XR + S * n.par.x, XR + S * n.x, ycen(n.y)))
        if n.kids:
            vt.append(f"M{f3(XR + S * n.x)} {f3(ycen(n.kids[0].y))}V{f3(ycen(n.kids[-1].y))}")
            segs.append(("v", XR + S * n.x, ycen(n.kids[0].y), ycen(n.kids[-1].y)))
    add(f'<g id="tree" fill="none" stroke="{INK}" stroke-width="0.13" stroke-linecap="butt"><path id="tree_h" d="{"".join(hz)}"/><path id="tree_v" d="{"".join(vt)}"/></g>')
    # root stub: dashed, not to scale (the file gives the root branch no stem); it leaves the root node to the left
    ry = ycen(L["root"].y)
    add(f'<path id="stub" d="M{f3(XR - STUB)} {f3(ry)}H{f3(XR)}" fill="none" stroke="{INK}" stroke-width="0.13" stroke-dasharray="0.7 0.5"/>')
    # event branches: the branch from the parent to the node, thick, in the event colour
    add('<g id="events">')
    for e in events:
        n = e["node"]
        xa, xb, y = XR + S * n.par.x, XR + S * n.x, ycen(n.y)
        a_, b_ = L["blocks"][e["group"]]
        top_, bot_ = Y0 + a_ * P, Y0 + (b_ + 1) * P
        e.update(xa=xa, xb=xb, y=y, xm=(xa + xb) / 2, band=(top_, bot_))
        e["dy"] = -DISC_OFF if y - DISC_OFF - DISC_R >= top_ else DISC_OFF       # above the branch unless that leaves the band
        assert top_ <= y + e["dy"] - DISC_R and y + e["dy"] + DISC_R <= bot_, "disc outside its band"
        add(f'<path id="evb_{e["key"]}" d="M{f3(xa)} {f3(y)}H{f3(xb)}" fill="none" stroke="{EVENT}" stroke-width="0.7" stroke-linecap="butt"/>')
    add("</g>")
    # matrix
    add('<g id="matrix">')
    for k, c in enumerate(cols):
        add(f'<g id="mcol_{k}">')
        for i, t in enumerate(tips):
            y = Y0 + i * P
            col = grey(val(t, c["col"]), c)
            add(f'<rect{" id=" + chr(34) + "mc_%d_%d" % (k, i) + chr(34) if i in (0, NR - 1) else ""} x="{f3(c["x"])}" y="{f3(y)}" width="{f3(c["w"])}" height="{f3(P + 0.02)}" fill="{col}"/>')
        add("</g>")
    add("</g>")
    # colour keys (12 vector steps) above the columns
    KEY_TOP, KEY_H, NSTEP = Y0 - 5.6, 1.6, 12
    add('<g id="keys">')
    for k, c in enumerate(cols):
        sw = c["w"] / NSTEP
        for s in range(NSTEP):
            t = (s + 0.5) / NSTEP
            v = c["vmin"] + t * (c["vmax"] - c["vmin"])
            add(f'<rect{" id=" + chr(34) + "key_%d" % k + chr(34) if s == 0 else ""} x="{f3(c["x"] + s * sw)}" y="{f3(KEY_TOP)}" width="{f3(sw + 0.02)}" height="{KEY_H}" fill="{grey(v, c)}"/>')
        add(f'<rect id="keyframe_{k}" x="{f3(c["x"])}" y="{f3(KEY_TOP)}" width="{f3(c["w"])}" height="{KEY_H}" fill="none" stroke="{RULE}" stroke-width="0.1"/>')
    add("</g>")
    # left strips (clade names, turned) and right bars (colour only)
    add('<g id="bars">')
    for g, (a, b) in L["blocks"].items():
        add(f'<rect id="lbar_{g}" x="{LBAR_X}" y="{f3(Y0 + a * P)}" width="{LBAR_W}" height="{f3((b - a + 1) * P)}" fill="{C[g]["bar"]}" stroke="{INK}" stroke-width="0.12"/>')
        add(f'<rect id="bar_{g}" x="{BAR_X}" y="{f3(Y0 + a * P)}" width="{BAR_W}" height="{f3((b - a + 1) * P)}" fill="{C[g]["bar"]}" stroke="{INK}" stroke-width="0.12"/>')
    add("</g>")
    # numbered rings: at the tip and at the end of the same row
    rings = []
    add('<g id="rings">')
    for num, (nm, g, pdb) in enumerate(HIGHLIGHT, 1):
        t = byname[nm]
        assert grp[nm] == g
        xt, y = XR + S * t.x, ycen(t.y)
        rings.append(dict(n=num, name=nm, pdb=pdb, group=g, row=int(t.y), xt=xt, y=y))
        add(f'<circle id="ringt_{num}" cx="{f3(xt)}" cy="{f3(y)}" r="1.25" fill="#FFFFFF" stroke="{INK}" stroke-width="0.25"/>')
        add(f'<circle id="ringm_{num}" cx="{RING_X}" cy="{f3(y)}" r="1.25" fill="#FFFFFF" stroke="{INK}" stroke-width="0.25"/>')
    add("</g>")
    assert [r["n"] for r in sorted(rings, key=lambda r: r["y"])] == [1, 2, 3], "numbers follow the order of the rows"
    # event discs and the places of their labels
    add('<g id="discs">')
    for e in events:
        add(f'<circle id="disc_{e["key"]}" cx="{f3(e["xm"])}" cy="{f3(e["y"] + e["dy"])}" r="{DISC_R}" fill="{EVENT}" stroke="#FFFFFF" stroke-width="0.25"/>')
    add("</g>")
    bounds = sorted({Y0 + (b + 1) * P for g, (a, b) in L["blocks"].items()} - {Y1})
    taken = [(e["xm"] - DISC_R, e["y"] + e["dy"] - DISC_R, 2 * DISC_R, 2 * DISC_R) for e in events] + [(r["xt"] - 1.25, r["y"] - 1.25, 2.5, 2.5) for r in rings]
    for e in events:
        e["label"] = label_spot(e, segs, taken, bounds, e["band"])
        taken.append((e["label"]["x"], e["label"]["t"], e["label"]["w"], e["label"]["h"]))
    # ---- table
    by = {g: [t for t in tips if grp[t.name] == g] for g in T.GROUP_RANK}
    anc_rows = {}
    for key, r in traits.items():
        if r["is_ancestral"] == "True":
            anc_rows.setdefault(r["clade"], []).append(r)
    assert {k: len(v) for k, v in anc_rows.items()} == {"nif-i": 137, "nif-ii": 179, "nif-iii": 31, "an": 32, "other": 5}, {k: len(v) for k, v in anc_rows.items()}
    TROWS = [("nif-i", ["nif-i"], "nif-i"), ("nif-ii", ["nif-ii"], "nif-ii"), ("nif-iii", ["nif-iii"], "nif-iii"), ("an", ["Vnf", "Anf"], "an")]
    table = []
    for key, groups, ancl in TROWS:
        today = [t.name for g in groups for t in by[g]]
        anc = anc_rows[ancl]
        row = dict(key=key, label={"nif-i": "Nif-I", "nif-ii": "Nif-II", "nif-iii": "Nif-III", "an": "Vnf + Anf"}[key], groups=groups, n_today=len(today), n_anc=len(anc))
        for tr in TRAITS:
            row[tr["col"] + "_today"] = statistics.median(float(traits[n][tr["col"]]) for n in today)
            row[tr["col"] + "_anc"] = statistics.median(float(r[tr["col"]]) for r in anc)
        table.append(row)
    # ---- tables
    with open(TAB / "tip_traits.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["row", "tip", "block", "organism", "total_area_A2", "intermolecular_contacts", "binding_affinity_kcal_per_mol"])
        for i, t in enumerate(tips):
            w.writerow([i, t.name, C[grp[t.name]]["name"], L["tax"][t.name]["Organism"], traits[t.name]["total_area"], traits[t.name]["intermolecular_contacts"], traits[t.name]["binding_affinity"]])
    with open(TAB / "clade_medians.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["row", "n_today", "n_ancestors", "area_today", "area_ancestors", "contacts_today", "contacts_ancestors", "dG_today", "dG_ancestors"])
        for r in table:
            w.writerow([r["label"], r["n_today"], r["n_anc"]] + [r[tr["col"] + s] for tr in TRAITS for s in ("_today", "_anc")])
    with open(TAB / "events.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["event", "subunit", "clade_block", "node_at_branch_end", "node_at_branch_start", "branch_length_subst_per_site", "paper"])
        for e in events:
            w.writerow([e["text"], e["letter"], C[e["group"]]["name"], e["node"].name, e["node"].par.name, e["node"].len, e["paper"]])
    # ---- window.DATA
    ent = json.loads((TAB / "inset_entries.json").read_text(encoding="utf-8"))
    spn = json.loads((TAB / "insertion_spans.json").read_text(encoding="utf-8"))
    insets = []
    for r in rings:
        pdb, g = r["pdb"], r["group"]
        typ = "Anf" if g == "Anf" else "Nif"
        letter = spn[pdb]["event"][0]
        assert any(e["group"] == g and e["letter"] == letter for e in events)
        assert ent[pdb]["method"] == "X-RAY DIFFRACTION" and spn[pdb]["event"].startswith(letter + "-subunit")
        insets.append(dict(n=r["n"], pdb=pdb, group=g, type=typ, letter=letter, species=ent[pdb]["organism"][0].replace(" DJ", ""), resolution=ent[pdb]["resolution"], length=spn[pdb]["length"],
                           span=spn[pdb]["label_seq"], chain=spn[pdb]["chains"][0], base=BASE[pdb], event=spn[pdb]["event"], paper=spn[pdb]["paper"],
                           alt=({"name": "4WES chain D", "length": spn[pdb]["alt"]["length"]} if "alt" in spn[pdb] else None), modelled={c: len(n) for c, n in spn[pdb]["modelled"].items()}, letters={k: v[:2] for k, v in letter_spots(pdb).items()}))
    data = dict(
        W=W, H=H, X0=X0, Y0=Y0, P=P, NR=NR, Y1=Y1, XR=XR, S=S, MX0=MX0, MEND=MEND, RING_X=RING_X, LBAR_X=LBAR_X, LBAR_W=LBAR_W, BAR_X=BAR_X, BAR_W=BAR_W, RX=RX, KEY_TOP=KEY_TOP, KEY_H=KEY_H,
        STUB=STUB, max_x=L["max_x"], max_x_mm=XR + S * L["max_x"],
        colors=dict(D=D_GREY, K=K_GREY, event=EVENT), disc_r=DISC_R,
        cols=[dict(k=k, x=c["x"], w=c["w"], name=c["name"], unit=c["unit"], lo=c["lo_txt"], hi=c["hi_txt"], invert=c["invert"]) for k, c in enumerate(cols)],
        blocks={g: dict(r0=a, r1=b, n=b - a + 1, name=C[g]["name"], bar=C[g]["bar"], band=C[g]["band"], text=C[g]["text"], top=Y0 + a * P, bottom=Y0 + (b + 1) * P) for g, (a, b) in L["blocks"].items()},
        events=[dict(key=e["key"], letter=e["letter"], group=e["group"], node=e["node"].name, parent=e["node"].par.name, xa=e["xa"], xb=e["xb"], xm=e["xm"], y=e["y"], dy=e["dy"], text=e["text"],
                     len=e["node"].len, label=dict(text=EV_LABEL[e["key"]], **e["label"])) for e in events],
        rings=rings, insets=insets, root=dict(x=XR, y=ry), table=table,
        counts=dict(nodes=len(L["nodes"]), tips=len(tips), ancestors=len(L["internal"]), outgroup=L["outgroup"].ntips),
    )
    (PAGE / "plots_layer.js").write_text("window.DATA = " + json.dumps(data, ensure_ascii=False) + ";\n", encoding="utf-8")
    add("</g></svg>")
    (PAGE / "plots_layer.svg").write_text("\n".join(o), encoding="utf-8")
    print("tree: %d nodes drawn (%d tips, %d internal); rows %d x %.2f mm = %.1f mm; max root-to-tip %.4f -> x %.1f mm" % (len(L["nodes"]), len(tips), len(L["internal"]), NR, P, NR * P, L["max_x"], XR + S * L["max_x"]))
    for e in events:
        print("event", e["letter"], e["text"], "| node", e["node"].name, "from", e["node"].par.name, "| branch length", e["node"].len, "| x %.1f..%.1f mm, y %.1f mm" % (e["xa"], e["xb"], e["y"]), "| label", e["label"])
    for r in rings:
        print("ring", r["n"], r["pdb"], r["name"], "row", r["row"], "y %.1f mm" % r["y"])
    for i in insets:
        print("letters", i["pdb"], i["letters"])
    print("root y %.1f mm" % ry)
    for r in table:
        print(r["label"], r["n_today"], r["n_anc"], {k: round(v, 1) for k, v in r.items() if isinstance(v, float)})
    for c in cols:
        print("column", c["name"], c["lo_txt"], c["hi_txt"])
    print("svg bytes", (PAGE / "plots_layer.svg").stat().st_size)


if __name__ == "__main__":
    main()
