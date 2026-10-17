"""Positions for the page (millimetres, origin top left): the two renders, every leader and label, the key table. Writes page/data.js.

    py -3 -I gallery/05-atp-synthase/src/make_layout.py

Inputs: src/colours.json (tones, chains, gene IDs, marks), art/index.atp.json (crops, anchors from src/anchors.py).
The renders of both views are drawn at one scale (HA mm for the crop height of view A). A label sits in a column left or right of its render, on the side
of the anchor (the half of the render that holds it); label heights are the anchors' heights, pushed apart to LABEL_PITCH, and the labels are assigned to the
free heights so that the total leader length is smallest (Hungarian method), which leaves no two leaders crossing. Asserted here: straight leaders,
no crossing, no leader within CLEAR mm of another subunit's anchor, no two leaders within SEP mm, no two anchors within DOT_SEP mm. The page repeats the checks on the rendered DOM.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from scipy.optimize import linear_sum_assignment

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
W = 178.0
HA = 84.0            # height of the crop of view A in mm
LABEL_PITCH = 3.5    # mm between label rows
CLEAR = 1.5          # mm: closest approach of a leader to another subunit's anchor
SEP = 1.5            # mm: closest approach of two leaders (they may not run close and parallel)
DOT_SEP = 2.5        # mm: closest approach of two anchors
CHAR = 1.42          # mm per character of a 7 pt label, upper estimate (the page measures the real width)

COL = json.loads((HERE / "colours.json").read_text(encoding="utf-8"))
IDX = json.loads((ROOT / "art" / "index.atp.json").read_text(encoding="utf-8"))
subs = {s["key"]: s for s in COL["subunits"] + [COL["unassigned"]]}


def seg_cross(p, q, r, s) -> bool:
    def o(a, b, c):
        return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    return o(p, q, r) * o(p, q, s) < 0 and o(r, s, p) * o(r, s, q) < 0


def seg_dist(p, q, r, s) -> float:
    if seg_cross(p, q, r, s):
        return 0.0
    return min(seg_point(p, q, r), seg_point(p, q, s), seg_point(r, s, p), seg_point(r, s, q))


def seg_point(p, q, a) -> float:
    p, q, a = map(np.array, (p, q, a))
    t = np.clip(((a - p) @ (q - p)) / ((q - p) @ (q - p)), 0, 1)
    return float(np.linalg.norm(p + t * (q - p) - a))


def spread(ys, lo, hi, pitch):
    """Heights as near the wanted ys as possible, at least `pitch` apart, inside [lo, hi] (ys sorted)."""
    y = np.array(ys, float)
    for _ in range(2000):
        moved = False
        for i in range(1, len(y)):
            if y[i] - y[i - 1] < pitch - 1e-9:
                m = (y[i] + y[i - 1]) / 2
                y[i - 1], y[i] = m - pitch / 2, m + pitch / 2
                moved = True
        y = np.clip(y, lo, hi)
        if not moved:
            break
    assert all(y[i] - y[i - 1] >= pitch - 1e-6 for i in range(1, len(y))), "labels do not fit"
    return y


def main() -> None:
    a_img, b_img = IDX["atp_A__full"], IDX["atp_B__full"]
    S = a_img["h"] / HA                      # px per mm
    wA, hB, wB = a_img["w"] / S, b_img["h"] / S, b_img["w"] / S
    # ---- grid of the page (top-down mm)
    X0 = 1.5
    T_HEAD = 10.5                            # panel heads (letter, title, sub-line)
    T_IMG = 24.5                             # top of both renders
    LCOL_R = X0 + 14.0                       # labels of view A on the left end here (right-aligned)
    xA = LCOL_R + 3.0
    RCOL_L = xA + wA + 3.0                   # labels of view A on the right start here
    xB = RCOL_L + 12.0 + 3.0 + 2.0           # view B starts after the right label column of a
    BCOL_L = xB + wB + 3.0                   # labels of view B on the right
    XK = BCOL_L + 10.0 + 3.0                 # module key column
    layout = dict(A=dict(x=xA, y=T_IMG, w=wA, h=HA), B=dict(x=xB, y=T_IMG, w=wB, h=hB))
    assert XK + 18 <= W - X0, ("row 1 is too wide", XK, W)
    items = []
    for key, s in subs.items():
        for v, img in (("A", a_img), ("B", b_img)):
            if f"lab_{key}" in img["anchors"]:
                L = layout[v]
                cands = []   # every copy of the subunit that shows enough surface: chain, anchor in mm, anchor in px of the crop
                for nm, (fx, fy) in img["anchors"].items():
                    if nm == f"lab_{key}" or nm.startswith(f"alt_{key}_"):
                        c = img["meta"][f"chain_{key}"] if nm == f"lab_{key}" else nm[len(f"alt_{key}_"):]
                        cands.append(dict(chain=c, ax=L["x"] + fx * L["w"], ay=L["y"] + fy * L["h"], px=img["meta"][f"px_{key}_{c}"]))
                items.append(dict(key=key, view=v, text=s["label"], hex=s["hex"], cands=cands, ci=0))
    gap = 0.9

    def place(state: dict):
        """Set copy, side, column edge, label height and leader start of every item for the given state {key: (side, copy index)}; return (violations, total leader length)."""
        for i in items:
            i["side"], i["ci"] = state[i["key"]]
            i.update(chain=i["cands"][i["ci"]]["chain"], ax=i["cands"][i["ci"]]["ax"], ay=i["cands"][i["ci"]]["ay"], px=i["cands"][i["ci"]]["px"])
            i["col"] = LCOL_R if (i["view"] == "A" and i["side"] == "L") else (RCOL_L if i["view"] == "A" else BCOL_L)
            i["lx"] = i["col"]                    # edge of the label nearest its render
        groups = {}
        for i in items:
            groups.setdefault((i["view"], i["side"]), []).append(i)
        for (v, side), g in groups.items():
            L = layout[v]
            lo, hi = L["y"] + 1.5, L["y"] + L["h"] - 1.5
            g.sort(key=lambda i: i["ay"])
            slots = spread([i["ay"] for i in g], lo, hi, LABEL_PITCH)
            sx = lambda i: i["lx"] + (gap if side == "L" else -gap)
            cost = np.array([[np.hypot(sx(i) - i["ax"], sl - i["ay"]) for sl in slots] for i in g])
            r, c = linear_sum_assignment(cost)
            for ri, ci in zip(r, c):
                g[ri]["ly"] = float(slots[ci])
                g[ri]["start"] = [sx(g[ri]), float(slots[ci])]
        viol, total = 0, 0.0
        for a_ in items:
            total += float(np.hypot(a_["start"][0] - a_["ax"], a_["start"][1] - a_["ay"])) ** 2   # squared: many short leaders beat one long one
            for b_ in items:
                if a_ is b_:
                    continue
                if seg_cross(a_["start"], [a_["ax"], a_["ay"]], b_["start"], [b_["ax"], b_["ay"]]):
                    viol += 1
                if seg_point(a_["start"], [a_["ax"], a_["ay"]], [b_["ax"], b_["ay"]]) < CLEAR:
                    viol += 1
                if seg_dist(a_["start"], [a_["ax"], a_["ay"]], b_["start"], [b_["ax"], b_["ay"]]) < SEP:
                    viol += 1
                if np.hypot(a_["ax"] - b_["ax"], a_["ay"] - b_["ay"]) < DOT_SEP:
                    viol += 1
        nl = sum(1 for i in items if i["view"] == "A" and i["side"] == "L")
        nr = sum(1 for i in items if i["view"] == "A" and i["side"] == "R")
        viol += max(0, abs(nl - nr) - 4)
        return viol, total

    # state: view B all to the right; view A starts as left half / right half by anchor x with the first copy; then single changes (side, copy) while (violations, length) falls
    for i in items:
        i["ax"] = i["cands"][0]["ax"]
    state = {i["key"]: ("R", 0) for i in items}
    A_items = sorted([i for i in items if i["view"] == "A"], key=lambda i: i["cands"][0]["ax"])
    for k, i in enumerate(A_items):
        state[i["key"]] = ("L" if k < len(A_items) // 2 else "R", 0)
    best = place(state)
    improved = True
    while improved:
        improved = False
        for i in items:
            for side in (("L", "R") if i["view"] == "A" else ("R",)):
                for ci in range(len(i["cands"])):
                    if (side, ci) == state[i["key"]]:
                        continue
                    t = dict(state)
                    t[i["key"]] = (side, ci)
                    sc = place(t)
                    if sc < best:
                        state, best, improved = t, sc, True
    best = place(state)
    assert best[0] == 0, ("no layout without a crossing or a leader through another anchor", best)
    groups = {}
    for i in items:
        groups.setdefault((i["view"], i["side"]), []).append(i)
    # ---- checks (the search already counted them; repeated here as hard assertions)
    for a in range(len(items)):
        for b in range(a + 1, len(items)):
            p, q, r, s = items[a]["start"], [items[a]["ax"], items[a]["ay"]], items[b]["start"], [items[b]["ax"], items[b]["ay"]]
            assert not seg_cross(p, q, r, s), ("leaders cross", items[a]["key"], items[b]["key"])
    for a in items:
        for b in items:
            if a is not b:
                d = seg_point(a["start"], [a["ax"], a["ay"]], [b["ax"], b["ay"]])
                assert d >= CLEAR, ("leader of", a["key"], "passes", round(d, 2), "mm from the anchor of", b["key"])
                assert seg_dist(a["start"], [a["ax"], a["ay"]], b["start"], [b["ax"], b["ay"]]) >= SEP, ("leaders", a["key"], b["key"], "closer than", SEP, "mm")
                assert np.hypot(a["ax"] - b["ax"], a["ay"] - b["ay"]) >= DOT_SEP, ("anchors", a["key"], b["key"], "closer than", DOT_SEP, "mm")
    # ---- table
    panel_of = {i["key"]: i["view"].lower() for i in items}   # the panel that labels the subunit
    rows = []
    for m in COL["modules"]:
        rows.append(dict(kind="module", module=m["id"], name=m["name"], family=m["family"]))
        for s in COL["subunits"]:
            if s["module"] == m["id"]:
                rows.append(dict(kind="sub", key=s["key"], label=s["label"], module=m["id"], entity=s["entities"][0], gene=s["gene"], chains=s["chains"],
                                 copies=s["copies"], panel=panel_of[s["key"]], mark=s["mark"], hex=s["hex"]))
    u = COL["unassigned"]
    rows.append(dict(kind="module", module="none", name="Unassigned", family="grey"))
    rows.append(dict(kind="sub", key="unk", label="unknown protein", module="none", entity=" ".join(map(str, u["entities"])), gene=None, chains=u["chains"],
                     copies=u["copies"], panel=panel_of["unk"], mark=None, hex=u["hex"]))
    data = dict(W=W, X0=X0, T_HEAD=T_HEAD, T_IMG=T_IMG, S_px_per_mm=S, layout=layout, LCOL_R=LCOL_R, RCOL_L=RCOL_L, BCOL_L=BCOL_L, XK=XK,
                labels=[{k: v for k, v in i.items() if k != "cands"} for i in items], rows=rows, modules=COL["modules"], ladder={m["id"]: m["ladder_hex"] for m in COL["modules"]}, tones={k: s["hex"] for k, s in subs.items()},
                subs=[dict(key=k, label=s["label"], module=s["module"], hex=s["hex"], chains=s["chains"], gene=s["gene"], mark=s["mark"], entities=s["entities"]) for k, s in subs.items()],
                imgs={"A": "atp_A__full", "B": "atp_B__full"}, crop_px={"A": [a_img["w"], a_img["h"]], "B": [b_img["w"], b_img["h"]]},
                anchor_px={i["key"]: i["px"] for i in items}, check=COL["check"])
    (ROOT / "page").mkdir(exist_ok=True)
    (ROOT / "page" / "data.js").write_text("window.DATA = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
    print(f"scale {S:.2f} px/mm; A {wA:.1f} x {HA:.1f} mm, B {wB:.1f} x {hB:.1f} mm; key column at x {XK:.1f}; {len(items)} leaders, none crossing")
    for g in sorted(groups):
        print(g, [(i["text"], round(i["ly"], 1)) for i in sorted(groups[g], key=lambda i: i["ly"])])


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    main()
