"""Check the built PDF against the tables: live text, Arial only, one page, 178 mm wide, and every number the figure prints.

    py -3 -B gallery/12-mutl-kinetics/src/verify_pdf.py        # after node build/build.mjs ... and src/derive.py, src/make_layer.py

Reads 12-mutl-kinetics.pdf (live text) and tables/. Fails if a Table 1 number, a kcat/Km value, a fold-lower number, a top-kapp value, an ATP range or the
headline range in the PDF differs from the table it comes from, or if the figure says "not determined" where the paper says "activity not detected".
"""
from __future__ import annotations

import csv
import json
import math
import re
from pathlib import Path

import pymupdf as fitz

ROOT = Path(__file__).resolve().parent.parent
pdf = fitz.open(ROOT / "12-mutl-kinetics.pdf")
assert len(pdf) == 1, f"{len(pdf)} pages"
pg = pdf[0]
assert abs(pg.rect.width / 72 * 25.4 - 178.0) < 0.3, pg.rect.width / 72 * 25.4
fonts = {f[3] for f in pg.get_fonts()}
assert fonts and all("Arial" in f for f in fonts), f"fonts other than Arial: {fonts}"
words = [w[4] for w in pg.get_text("words")]
text = " ".join(words)
D = json.loads((ROOT / "tables" / "derived.json").read_text(encoding="utf-8"))
T1 = list(csv.reader(l for l in (ROOT / "tables" / "table1_mutl.csv").open(encoding="utf-8") if not l.startswith("#")))[1:]
V = D["variants"]

# Table 1 as printed: kcat and Km with their errors in the tiles, kcat/Km in panel a
for rank, name, kcat, kerr, km, kmerr, kk in T1:
    if kcat == "N.D.":
        assert name in words, name
        continue
    assert f"{kcat} ± {kerr}" in text, f"{name}: '{kcat} ± {kerr}' not printed"
    assert f"{km} ± {kmerr}" in text, f"{name}: '{km} ± {kmerr}' not printed"
    assert kk in words, f"{name}: kcat/Km {kk} not printed"

# computed numbers: fold lower (two significant digits), the headline range, top kapp and ATP range of the N.D. list, top kapp of the tiles
sig2 = lambda v: int(round(v, -int(math.floor(math.log10(abs(v)))) + 1))   # noqa: E731
fmt2 = lambda v: "0" if v == 0 else f"{v:.{max(2 - math.floor(math.log10(abs(v))) - 1, 0)}f}"   # noqa: E731
ratios = {n: V[n]["ratio"] for n in D["det"] if n != "WT"}      # unrounded: wild-type printed kcat/Km divided by the printed value
for n, r in ratios.items():
    assert str(sig2(r)) in words, (n, r)
assert 97 <= min(ratios.values()) < 98 and sig2(max(ratios.values())) == 170, ratios      # 97.5 to 171.1: the headline says "about 100 to 170"
assert "about 100 to 170 times" in text
for n in D["nd"]:
    assert fmt2(V[n]["max_mean"]) in words, (n, fmt2(V[n]["max_mean"]))
    assert f"{V[n]['x_max']:g}" in words
for n in D["det"]:
    top = max(p["mean"] for p in V[n]["pts"])
    assert fmt2(top) in words, (n, top)
for s in ("N.D.: activity not detected (Table 1)", "below the detection limit", "complete loss of ATPase activity", "charge reversal likely perturbs the site (paper)", "(circular dichroism spectrum)"):
    assert s in text, s
assert "not determined" not in text.lower(), "the paper's words are: activity not detected"
for n in D["rank"]:
    assert n in words, n

# words by kind
number = re.compile(r"^[+−–\-]?[\d,\.]+%?$")
kinds = {"numbers and ticks": 0, "names, symbols and units": 0, "plain words": 0}
sym = re.compile(r"^(E\d\d[A-Z](/E\d\d[A-Z])?|WT|kcat|Km|kapp|kcat/Km|mM|µM|min|per|ATP|AMPPCP|Mg|Å|N\.D\.|±|÷|×|†|\*|=|\(|\)|[A-Z]\.?)$")
for w in words:
    if number.match(w):
        kinds["numbers and ticks"] += 1
    elif sym.match(w.strip(",.;:()")):
        kinds["names, symbols and units"] += 1
    else:
        kinds["plain words"] += 1
print("PDF ok: one page, 178 mm, fonts", sorted(fonts), "| words", len(words), kinds)
