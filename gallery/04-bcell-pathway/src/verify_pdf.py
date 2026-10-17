"""Check the built PDF against the tables: every number the figure prints, and the word count by kind.

    py -3 -B gallery/04-bcell-pathway/src/verify_pdf.py        # after node build/build.mjs ... and src/derive.py

Reads 04-bcell-pathway.pdf (live text) and tables/. Fails if a count or a plotted value in the PDF differs from the table it comes from.
"""
from __future__ import annotations

import csv
import json
import re
import sys
from pathlib import Path

import pymupdf as fitz

ROOT = Path(__file__).resolve().parent.parent
pdf = fitz.open(ROOT / "04-bcell-pathway.pdf")
words = [w[4] for w in pdf[0].get_text("words")]
text = " ".join(words)
words_c = [w.strip("(),.;:") for w in words]
counts = json.loads((ROOT / "tables" / "counts.json").read_text(encoding="utf-8"))
ex = list(csv.DictReader((ROOT / "tables" / "example_genes.csv").open(encoding="utf-8")))
fmt = lambda n: f"{n:,}"   # noqa: E731

want = [counts["regulators"], counts["activators_only"], counts["both_roles"], counts["repressors_only"], counts["links"], counts["activating_links"],
        counts["repressing_links"], counts["rapamycin_genes_changed"], counts["gsk3i_genes_changed"], counts["shared_genes"], counts["opposite_direction"]]
q = counts["quadrants"]
want += [counts["translation_genes_S6B_cluster2"], counts["translation_up_with_both_S10"]]
want += [q["rapa up, GSK3i down"], q["rapa down, GSK3i up"], q["rapa up, GSK3i up"], q["rapa down, GSK3i down"]]
missing = [fmt(n) for n in want if fmt(n) not in words_c]
assert not missing, f"numbers not in the PDF: {missing}"

sgn = lambda v: ("+" if v > 0 else "−") + f"{abs(v):.2f}"   # noqa: E731
vals = []
for r in ex:
    for k in ("log2FC_rapamycin_S5", "log2FC_LY2090314_S9", "log2FC_both_S10"):
        if r[k] != "":
            vals.append(sgn(float(r[k])))
for v in vals:
    assert v in words, f"plotted value not printed: {v}"
printed = [w for w in words if re.fullmatch(r"[+−]\d\.\d\d", w)]
assert sorted(printed) == sorted(vals), "the PDF prints values that are not in the tables"

nc = sum(1 for r in ex for k in ("log2FC_rapamycin_S5", "log2FC_LY2090314_S9", "log2FC_both_S10") if r[k] == "")
assert words.count("n.c.") >= nc, "a cell that is not listed does not print n.c."
# the 47 reporter genes: each name appears as a pill
reps = [r["label_in_figure"] for r in csv.DictReader((ROOT / "tables" / "reporters_47.csv").open(encoding="utf-8"))]
for g in reps:
    assert g in words, g

# words by kind
gene = re.compile(r"^[A-Z0-9][A-Za-z0-9\-]*[A-Z0-9],?$")
number = re.compile(r"^[+−–\-]?[\d,\.]+%?$|^n\.c\.$")
names = {"mTORC1", "SU-DHL-4", "RNA-seq", "RNA", "CRISPR", "BCR", "GSK3", "LY2090314", "BCL-XL", "PI3K-AKT-mTOR", "NF-κB"}
kinds = {"numbers and ticks": 0, "gene and drug names": 0, "plain words": 0}
for w in words:
    if number.match(w):
        kinds["numbers and ticks"] += 1
    elif w.rstrip(",.;:") in names or (gene.match(w) and len(w) >= 2 and w not in ("A", "S1", "S3", "S5", "S9", "S10")):
        kinds["gene and drug names"] += 1
    else:
        kinds["plain words"] += 1
print(f"OK: {len(want)} counts, {len(vals)} plotted values and {len(reps)} gene names match the tables")
print(f"words in the PDF: {len(words)}", kinds)
sys.exit(0)
