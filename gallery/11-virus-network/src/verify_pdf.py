"""Check the built PDF of gallery piece 11 against the tables and the layout data.

    py -3 -B gallery/11-virus-network/src/verify_pdf.py

1. one page, 178 mm wide, fonts Arial only, smallest text 6.5 pt;
2. every label of page/layer.js is in the PDF as live text, at its computed anchor (within 1 mm);
3. every number printed for a bait, a matrix cell, a region and a function category equals the number in tables/*.csv.
"""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

import fitz

GAL = Path(__file__).resolve().parents[1]
PDF = GAL / "11-virus-network.pdf"
D = json.loads((GAL / "page" / "layer.js").read_text(encoding="utf-8").split("=", 1)[1].rstrip().rstrip(";"))


def table(name):
    with open(GAL / "tables" / name, encoding="utf-8") as f:
        f.readline()
        return list(csv.DictReader(f))


doc = fitz.open(PDF)
assert len(doc) == 1, "more than one page"
pg = doc[0]
K = 25.4 / 72
assert abs(pg.rect.width * K - 178) < 0.3, pg.rect.width * K
spans = []
for b in pg.get_text("dict")["blocks"]:
    for ln in b.get("lines", []):
        for s in ln["spans"]:
            if s["text"].strip():
                spans.append(dict(text=s["text"].strip(), l=s["bbox"][0] * K, r=s["bbox"][2] * K, cy=(s["bbox"][1] + s["bbox"][3]) / 2 * K, size=s["size"], font=s["font"]))
fonts = {s["font"] for s in spans}
assert fonts <= {"ArialMT", "Arial-BoldMT"}, fonts
assert min(s["size"] for s in spans) >= 6.5, min(s["size"] for s in spans)
bad = []
for L in D["labels"]:
    ax = {"left": "l", "right": "r"}.get(L["ha"])
    ok = False
    for s in spans:
        if s["text"] != L["s"].strip():
            continue
        x = s[ax] if ax else (s["l"] + s["r"]) / 2
        if abs(x - L["x"]) < 1.0 and abs(s["cy"] - L["t"]) < 1.0:
            ok = True
            break
    if not ok:
        bad.append(L["id"])
assert not bad, "labels missing or off their anchor in the PDF: " + ", ".join(bad[:12])
lab = {L["id"]: L["s"] for L in D["labels"]}
baits = {r["bait"]: r for r in table("baits.csv")}
for b, r in baits.items():
    assert [lab[f"b-num-{b}-{k}"] for k in sorted(k for k in (round(L["x"]) for L in D["labels"] if L["id"].startswith(f"b-num-{b}-")))] == [r["viral"], r["host"], r["total"]], b
n_cells = 0
pairs = {frozenset((r["bait_a"], r["bait_b"])): r["shared_partners"] for r in table("bait_pairs.csv")}
order = [b for b in baits]
for i in range(10):
    for j in range(i):
        want = pairs.get(frozenset((order[i], order[j])), "0")
        assert lab[f"c-num-{order[i]}-{order[j]}"] == want, (order[i], order[j])
        n_cells += 1
assert n_cells == 45
reg = table("region_counts.csv")
rcount = {r["region"]: (r["viral"], r["host"]) for r in reg}
names = {i: lab[f"rk-name-{i}"] for i in range(1, 9)}
for i, nm in names.items():
    assert (lab[f"rk-v-{i}"], lab[f"rk-h-{i}"]) == rcount[nm], nm
prey = table("prey.csv")
nfun = 0
for ci in range(5):
    for ri in range(6):
        k = f"fk-name-{ci}-{ri}"
        if k in lab:
            n = sum(1 for r in prey if r["organism"] == "viral" and r["function"] == lab[k])
            assert lab[f"fk-n-{ci}-{ri}"] == str(n), (lab[k], n)
            nfun += n
n_unch = sum(1 for r in prey if r["organism"] == "viral" and r["function"] == "Uncharacterized")
assert lab["fk-name-unch"] == "Uncharacterized" and lab["fk-n-unch"] == str(n_unch), n_unch
nocat = sum(1 for r in prey if r["organism"] == "viral" and r["function"] not in {lab[f"fk-name-{ci}-{ri}"] for ci in range(5) for ri in range(6) if f"fk-name-{ci}-{ri}" in lab} | {"Uncharacterized"})
assert nfun + n_unch + nocat == 144 and nocat == 3, (nfun, n_unch, nocat)
assert lab["fk-white"].endswith(f"viral {nocat}"), lab["fk-white"]
vm = [baits[b] for b in ("L323", "R595", "R443", "L330", "R387")]
nvf = [baits[b] for b in ("R252", "R561", "L274", "R721", "L410")]
head = lab["headline"]
assert f"({sum(int(r['viral']) for r in vm)}/{sum(int(r['total']) for r in vm)} pairs)" in head and f"({sum(int(r['host']) for r in nvf)}/{sum(int(r['total']) for r in nvf)})" in head, head
credit = lab["credit"]
assert "doi:10.1038/s44318-026-00770-8" in credit and "CC BY 4.0" in credit
print(f"PDF ok: 1 page, fonts {sorted(fonts)}, smallest {min(s['size'] for s in spans)} pt, {len(D['labels'])} labels at their anchors, bait numbers, 45 matrix cells, region and function counts equal the tables")
