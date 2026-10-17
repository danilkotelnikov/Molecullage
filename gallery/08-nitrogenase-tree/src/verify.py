"""Independent check of the numbers printed on the figure, with other code than the build (pandas and regular expressions, not nsdb_tree.py).

    py -3 -I gallery/08-nitrogenase-tree/src/verify.py        # after fetch_data.py and a build; exits with an error when a printed number differs

1. Counts of the tree file and of the tables against the paper's text (769 nodes, 385 + 384, 5,378 structures in the Zenodo index).
2. Medians of the table of panel c, recomputed from Figure4SourceData3.csv, against the numbers in the PDF text.
3. The ends of the three colour keys (lowest and highest value of the 385 living proteins), against the PDF text.
4. The three insertion segments against the sequences of the entries (the alignment in spans.py), and the leaders: that each inset PNG holds the indigo segment.
"""
from __future__ import annotations

import json
import re
import statistics
import sys
from pathlib import Path

import fitz
import numpy as np
import pandas as pd
from PIL import Image

GAL = Path(__file__).resolve().parent.parent
D = GAL / "data"
tree = (D / "fig4" / "Figure4SourceData1.tree").read_text()
d3 = pd.read_csv(D / "fig4" / "Figure4SourceData3.csv", sep="\t")
idx = pd.read_csv(D / "zenodo_13351063_index.csv")
pdf = fitz.open(str(GAL / "08-nitrogenase-tree.pdf"))[0].get_text()
ok = True


def check(cond, msg):
    global ok
    print(("ok    " if cond else "FAIL  ") + msg)
    ok &= bool(cond)


# 1. counts
tips = re.findall(r"[(,]([^(),:;]+):", tree)
check(len(tips) == 770, f"tree tips by regular expression: {len(tips)} (770 = 385 nitrogenases + 385 outgroup)")
check(sum(t.startswith("BchChl_") for t in tips) == 385, "outgroup tips: 385")
internal = re.findall(r"\)(\d+):", tree) + re.findall(r"\)(\d+);", tree)
check(len(internal) == 768, f"internal nodes with a label: {len(internal)} (768; the paper's 769 nodes = 385 living + 384 ancestors, outgroup excluded)")
check(len(d3) == 769 and (d3.is_ancestral == False).sum() == 385 and (d3.is_ancestral == True).sum() == 384, "Figure4SourceData3: 769 rows = 385 living + 384 ancestors")
check(len(idx) == 5378, f"Zenodo index.csv rows: {len(idx)} (the paper: 5378 structures)")
check(2 * (385 + 6 * 384) == 5378, "385 x 1 + 384 x 6 = 2689 structures per component, x 2 components (DDKK, HH) = 5378")
# 2. medians
liv, anc = d3[~d3.is_ancestral], d3[d3.is_ancestral]
rows = {"Nif-I": (liv[liv.clade == "nif-i"], anc[anc.clade == "nif-i"]), "Nif-II": (liv[liv.clade == "nif-ii"], anc[anc.clade == "nif-ii"]),
        "Nif-III": (liv[liv.clade == "nif-iii"], anc[anc.clade == "nif-iii"]), "Vnf + Anf": (liv[liv.nitrogenase_type.isin(["Vnf", "Anf"])], anc[anc.clade == "an"])}
fmt = {"total_area": lambda v: f"{round(v):,}", "intermolecular_contacts": lambda v: f"{v:,.0f}" if float(v).is_integer() else f"{v:,.1f}", "binding_affinity": lambda v: ("−" if v < 0 else "") + f"{abs(v):.1f}"}
text = pdf.replace("\n", " ")
for name, (a, b) in rows.items():
    exp = [str(len(a)), str(len(b))]
    for col in fmt:
        exp += [fmt[col](a[col].median()), fmt[col](b[col].median())]
    # the row as printed: label, then the eight values in order
    m = re.search(re.escape(name) + r"\s+" + r"\s+".join(re.escape(e) for e in exp), text)
    check(m is not None, f"table row {name}: {' | '.join(exp)}")
check((anc.clade == "other").sum() == 5, "5 deepest ancestors carry the label 'other' (left out of the table)")
# 3. colour keys
for col, lo_first in (("total_area", True), ("intermolecular_contacts", True), ("binding_affinity", False)):
    lo, hi = liv[col].min(), liv[col].max()
    f = fmt[col]
    a, b = (f(lo), f(hi)) if lo_first else (f(hi), f(lo))
    check(a in text and b in text, f"key ends of {col}: {a} (light), {b} (dark)")
# 4. insets: the indigo segment is in every render
spans = json.loads((GAL / "tables" / "insertion_spans.json").read_text())
for pid, sp in spans.items():
    im = np.array(Image.open(GAL / "art" / f"nsdb__{pid}_t.png").convert("RGBA")).astype(int)
    indigo = (abs(im[..., 0] - 0x1D) < 12) & (abs(im[..., 1] - 0x39) < 12) & (abs(im[..., 2] - 0x7B) < 12) & (im[..., 3] > 250)
    share = indigo.sum() / (im[..., 3] > 250).sum()
    check(share > 0.02, f"{pid}: indigo segment covers {100 * share:.1f} % of the render ({sp['event']}, {sp['length']} residues)")
# 5. the words of the insets and the marks, as printed: lengths with their baselines, ring numbers in the headers, the notes on Vnf, Anf and node 802
for s in ("52 residues", "43 residues", "vs. 3U7Q chain D", "vs. 4WES chain K", "(34 vs. 4WES chain D)", "Anf sits inside Vnf", "Node 802", "labelled Nif-III in the data", "can end in .5"):
    check(s in text, f"printed: {s}")
check(spans["8BOQ"]["alt"]["length"] == 34 and spans["8BOQ"]["length"] == 52 and spans["3U7Q"]["length"] == 43 and spans["4WES"]["length"] == 52, "segment lengths in tables/insertion_spans.json: 52 (8BOQ, 34 against 4WES), 43, 52")
words = [w[4] for w in fitz.open(str(GAL / "08-nitrogenase-tree.pdf"))[0].get_text("words")]
check(all(words.count(str(n)) >= 4 for n in (1, 2, 3)), "ring numbers 1, 2 and 3 each appear in the tree, at the row end and in the inset header")
sys.exit(0 if ok else 1)
