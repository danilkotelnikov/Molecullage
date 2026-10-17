"""Layout data of gallery piece 10 (redesign of Table 1 and Fig. 2 of He, Zhao and Xu 2026, Cell Discovery 12:61).

    py -3 -I gallery/10-arrestin-landscape/src/make_data.py

Reads tables/table1.csv (src/table1.py), tables/rcsb_check.csv (src/rcsb_check.py), tables/geometry.json (src/geometry.py) and art/index.modes.json
(struct/trim.py). Writes page/data.js (window.DATA: every position in millimetres, top-down from the top-left corner of the page, and the numbers
the page prints) and tables/tiles.csv (the marks as drawn). Every printed number is copied from those files; the counts are computed here and asserted.

Grid. Rows are receptors, columns are the five engagement modes of Fig. 2a-e of the paper. A mark is one PDB entry. A cell holds its entries left to
right in table order and wraps after SLOTS[col] marks. Rows: receptors with a non-Core entry first, in the order of the columns, then the others in
the order of Table 1.
"""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
GAL = HERE.parent
sys.path.insert(0, str(HERE))
import table1  # noqa: E402

MODES = table1.MODES
W = 178.0
X0, XR = 1.5, 176.5                      # outer margin 1.5 mm
LABEL_W = 16.0                           # receptor name column
PITCH = 12.7                             # one mark: marker slot, id and resolution
CORE_SLOTS = 4
NC_W = 26.275                            # width of each non-Core column (two marks)
CORE_X0 = X0 + LABEL_W + 0.5             # left edge of the Core column
CORE_W = CORE_SLOTS * PITCH + 1.0
NC_X0 = CORE_X0 + CORE_W + 1.6           # left edge of the Tail column
assert abs(NC_X0 + 4 * NC_W - XR) < 0.6, NC_X0 + 4 * NC_W
SLOTS = [CORE_SLOTS, 2, 2, 2, 2]
MARK_DX, TEXT_DX = 2.45, 5.35            # marker centre and text left edge, from the left edge of a mark (the ring of a marked entry ends 0.35 mm before the text)
ROW_PITCH = 6.5                          # one sub-row; a mark is two text lines
ID_DT, RES_DT = -1.3, 1.3                # centre of the id line and of the resolution line from the row centre
D_MAX, D_MIN, R_BEST, R_WORST = 4.0, 1.8, 2.65, 7.70    # marker diameter (mm) at the best and the worst resolution of the table (A); linear in between
SUB6 = '<sub style="font-size:6.55pt">'                 # subscript at the type floor (the kit default, 0.78 em of 7 pt, would be 5.5 pt)
DISPLAY = {"PTH1R": "PTH1R†", "mGlu3R": "mGlu3R†", "mGlu8R": "mGlu8R†", "APJR": "APJR†", "Turkey β1AR": "Turkey β" + SUB6 + "1</sub>AR", "5-HT2BR": "5-HT" + SUB6 + "2B</sub>R"}
ARR_FAM = {"Arr1": "indigo", "βarr1": "peri", "βarr2": "rose"}      # colour of the arrestin type (token families)
SHAPE = {"XFEL": "square", "Cryo-EM": "circle"}

T_HEAD = 28.2                            # mode names
T_COUNT = 31.3                           # counts under the names
T0 = 34.5                                # top of the matrix


def diameter(res: float) -> float:
    return D_MAX - (D_MAX - D_MIN) * (res - R_BEST) / (R_WORST - R_BEST)


def main() -> None:
    rows_in = table1.load()
    assert len(rows_in) == 36
    mode_i = {m: i for i, m in enumerate(MODES)}
    receptors = []
    for r in rows_in:
        if r["receptor"] not in receptors:
            receptors.append(r["receptor"])
    first_nc = {}
    for r in rows_in:
        if r["mode"] != "Core":
            first_nc[r["receptor"]] = min(first_nc.get(r["receptor"], 9), mode_i[r["mode"]])
    nc_order = sorted(first_nc, key=lambda k: (first_nc[k], receptors.index(k)))
    order = nc_order + [k for k in receptors if k not in nc_order]
    assert nc_order == ["GCGR", "NTSR1", "GPR52", "ACKR3"], nc_order
    assert len(order) == 16

    # ---- counts (computed from the table, asserted)
    n_ent = {m: sum(1 for r in rows_in if r["mode"] == m) for m in MODES}
    n_rec = {m: len({r["receptor"] for r in rows_in if r["mode"] == m}) for m in MODES}
    assert n_ent == {"Core": 29, "Tail": 2, "Loop-engaged": 2, "Side-engaged": 2, "Membrane-anchored": 1}, n_ent
    assert n_rec == {"Core": 13, "Tail": 1, "Loop-engaged": 1, "Side-engaged": 1, "Membrane-anchored": 1}, n_rec
    n_arr = {a: sum(1 for r in rows_in if r["arrestin"] == a) for a in ARR_FAM}
    n_tech = {t: sum(1 for r in rows_in if r["technique"] == t) for t in SHAPE}
    assert n_arr == {"Arr1": 3, "βarr1": 32, "βarr2": 1} and n_tech == {"XFEL": 3, "Cryo-EM": 33}
    cols = []
    for ci, m in enumerate(MODES):
        x0 = CORE_X0 if ci == 0 else NC_X0 + (ci - 1) * NC_W
        w = CORE_W if ci == 0 else NC_W
        cols.append(dict(mode=m, x0=x0, w=w, slots=SLOTS[ci], tile_x0=x0 + 0.5, n_entries=n_ent[m], n_receptors=n_rec[m]))

    # ---- rows and tiles
    rows, tiles = [], []
    t = T0
    for rec in order:
        mine = [r for r in rows_in if r["receptor"] == rec]
        by_mode = {m: [r for r in mine if r["mode"] == m] for m in MODES}
        nsub = max(-(-len(by_mode[m]) // SLOTS[mode_i[m]]) for m in MODES if by_mode[m])
        row = dict(receptor=rec, label=DISPLAY.get(rec, rec), t_top=t, t_bot=t + nsub * ROW_PITCH, t_c=t + nsub * ROW_PITCH / 2, nsub=nsub)
        for m in MODES:
            ci = mode_i[m]
            for k, r in enumerate(by_mode[m]):
                sub, slot = divmod(k, SLOTS[ci])
                x = cols[ci]["tile_x0"] + slot * PITCH
                tc = t + (sub + 0.5) * ROW_PITCH
                res = float(r["resolution_A"])
                d = diameter(res)
                tiles.append(dict(pdb=r["pdb"], receptor=rec, mode=m, col=ci, arrestin=r["arrestin"], technique=r["technique"], resolution=r["resolution_A"],
                                  d=round(d, 3), shape=SHAPE[r["technique"]], fam=ARR_FAM[r["arrestin"]], x=round(x + MARK_DX, 3), t=round(tc, 3), tx=round(x + TEXT_DX, 3),
                                  t_id=round(tc + ID_DT, 3), t_res=round(tc + RES_DT, 3), tile_x=round(x, 3), mark="", conf=r["conformation_as_in_table"]))
        rows.append(row)
        t += nsub * ROW_PITCH
    assert len(tiles) == 36 and len({x["pdb"] for x in tiles}) == 36
    t_end = t
    for c in cols[1:]:                                    # a cell never holds more than its slots in one sub-row; non-Core cells hold one sub-row
        assert max(sum(1 for x in tiles if x["col"] == cols.index(c) and x["receptor"] == r["receptor"]) for r in rows) <= c["slots"]
    assert all(r["nsub"] == 1 for r in rows if r["receptor"] != "GPR1") and [r["nsub"] for r in rows if r["receptor"] == "GPR1"] == [2]

    # ---- panel b: the rendered entries, one view
    geo = json.loads((GAL / "tables" / "geometry.json").read_text(encoding="utf-8"))
    art = json.loads((GAL / "art" / "index.modes.json").read_text(encoding="utf-8"))
    rcsb = {r["pdb"]: r for r in csv.DictReader(l for l in (GAL / "tables" / "rcsb_check.csv").read_text(encoding="utf-8").splitlines() if not l.startswith("#"))}
    ren = []
    for pid, g in geo["entries"].items():
        row = next(x for x in rows_in if x["pdb"] == pid)
        assert row["mode"] == g["mode"] and row["receptor"] == g["receptor"]
        ren.append(dict(pdb=pid, mode=g["mode"], receptor=g["receptor"], arrestin=row["arrestin"], n_receptor_contacts=len(g["receptor_contacts"]), name=f"modes__{pid}",
                        n_v2r_tail=(g["v2r_tail"]["n_receptor_contacts"] if g["v2r_tail"] else 0), resolution=row["resolution_A"], rcsb_title=rcsb[pid]["rcsb_title"], ar=art[f"modes__{pid}"]["ar"]))
    assert [x["n_receptor_contacts"] for x in ren] == [32, 21, 30] and [x["n_v2r_tail"] for x in ren] == [12, 12, 0]
    assert [x["mode"] for x in ren] == ["Core", "Tail", "Loop-engaged"]
    flags = {pid: dict(technique_match=r["technique_match"], rcsb_xray_source=r["rcsb_xray_source"]) for pid, r in rcsb.items() if r["technique_match"] != "True" or r["resolution_match"] != "True"}
    assert list(flags) == ["5DGY"], flags
    for x in tiles:                                     # a ring marks the entries drawn in panel b; a hollow mark flags a technique that RCSB does not confirm
        x["ring"] = x["pdb"] in {r["pdb"] for r in ren}
        x["hollow"] = x["pdb"] in flags

    D = dict(W=W, X0=X0, XR=XR, LABEL_W=LABEL_W, PITCH=PITCH, ROW_PITCH=ROW_PITCH, MARK_DX=MARK_DX, TEXT_DX=TEXT_DX, T_HEAD=T_HEAD, T_COUNT=T_COUNT, T0=T0, T_END=t_end,
             cols=cols, rows=rows, tiles=tiles, render=ren, n_ent=n_ent, n_rec=n_rec, n_arr=n_arr, n_tech=n_tech, flags=flags,
             diam=dict(D_MAX=D_MAX, D_MIN=D_MIN, R_BEST=R_BEST, R_WORST=R_WORST), n_entries=len(tiles), n_receptors=len(order), n_rows_table=27, nc_order=nc_order,
             r_min=min(float(x["resolution"]) for x in tiles), r_max=max(float(x["resolution"]) for x in tiles))
    assert D["r_min"] == R_BEST and D["r_max"] == R_WORST
    (GAL / "page").mkdir(exist_ok=True)
    (GAL / "page" / "data.js").write_text("window.DATA = " + json.dumps(D, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
    with open(GAL / "tables" / "tiles.csv", "w", newline="", encoding="utf-8") as f:
        f.write("# The marks of the figure, one per PDB entry, from tables/table1.csv (He, Zhao and Xu 2026, Table 1; CC BY 4.0). Resolution and technique as in Table 1; marker_diameter_mm is computed by src/make_data.py (linear in resolution, 4.4 mm at 2.65 A, 2.0 mm at 7.70 A).\n")
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["pdb", "receptor", "mode", "arrestin", "technique", "resolution_A", "conformation_as_in_table", "marker_diameter_mm", "x_mm", "y_mm"])
        for x in tiles:
            w.writerow([x["pdb"], x["receptor"], x["mode"], x["arrestin"], x["technique"], x["resolution"], x["conf"], f"{x['d']:.3f}", f"{x['x']:.2f}", f"{x['t']:.2f}"])
    print("rows", len(rows), "sub-rows", round((t_end - T0) / ROW_PITCH), "matrix", T0, "to", round(t_end, 1), "mm;", len(tiles), "marks; entries per mode", n_ent)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
