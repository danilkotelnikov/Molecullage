"""Parse Table 1 of He, Zhao and Xu 2026 (Cell Discovery 12:61, doi 10.1038/s41421-026-00909-1, CC BY 4.0) from the Europe PMC full-text XML.

    py -3 -I gallery/10-arrestin-landscape/src/table1.py          # parse data/PMC13503860.xml, check, write tables/table1.csv

The XML table has 27 body rows. A row holds one or more PDB entries: several values of a cell sit in <p> children, and a cell
with one value that stands for several entries (for example "Core" for two PDB ids) is repeated for each. Cells with a rowspan
(GPR1, and the second NTSR1 row) carry over to the rows below. The script asserts the counts it relies on and writes one CSV
row per PDB entry, in table order. Nothing is typed by hand.
"""
from __future__ import annotations

import csv
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

GAL = Path(__file__).resolve().parents[1]
XML = GAL / "data" / "PMC13503860.xml"
OUT = GAL / "tables" / "table1.csv"

MODES = ["Core", "Tail", "Loop-engaged", "Side-engaged", "Membrane-anchored"]   # the five modes of Fig. 2a-e of the paper, in its order
HEADER = ["row", "receptor", "arrestin", "technique", "resolution_A", "pdb", "conformation_as_in_table", "mode", "ref"]


def cell_values(td: ET.Element) -> list[str]:
    ps = td.findall("p")
    if ps:
        return ["".join(p.itertext()).strip() for p in ps]
    return ["".join(td.itertext()).strip()]


def mode_of(conf: str) -> str:
    """The engagement mode is the mode word the table starts its Conformation entry with."""
    for m in MODES:
        if conf.lower().startswith(m.lower().split("-")[0]):   # "Core ...", "Tail ...", "Loop-engaged", "Side-engaged", "Membrane-anchored"
            return m
    raise ValueError(conf)


def parse(xml_path: Path = XML) -> list[dict]:
    root = ET.parse(xml_path).getroot()
    tw = root.find(".//table-wrap[@id='Tab1']")
    assert tw is not None and "".join(tw.find("label").itertext()).strip() == "Table 1"
    assert "".join(tw.find("caption").itertext()).strip() == "Structures of the GPCR‒arrestin complex.", "caption changed"
    head = ["".join(th.itertext()).strip() for th in tw.find(".//thead/tr")]
    assert head == ["Receptor", "Arrestin", "Technique", "Resolution (Å)", "PDB", "Conformation or other features", "Ref."], head
    body = tw.findall(".//tbody/tr")
    assert len(body) == 27, f"expected 27 body rows, found {len(body)}"
    carry = {}                 # column index -> (rows left, value) for rowspan cells
    rows = []
    for ri, tr in enumerate(body, 1):
        tds = tr.findall("td")
        col, ti = 0, 0
        cells = {}
        while col < 7:
            if col in carry and carry[col][0] > 0:
                n, v = carry[col]
                cells[col] = v
                carry[col] = (n - 1, v)
                col += 1
                continue
            td = tds[ti]
            ti += 1
            vals = cell_values(td)
            rs = int(td.get("rowspan", "1"))
            cells[col] = vals
            if rs > 1:
                carry[col] = (rs - 1, vals)
            col += 1
        assert ti == len(tds), f"row {ri}: unused cells"
        pdb = cells[4]
        n = len(pdb)
        for c in (3, 5):
            assert len(cells[c]) in (1, n), f"row {ri}: column {c} has {len(cells[c])} values for {n} entries"
        for c in (0, 1, 2, 6):
            assert len(cells[c]) == 1, f"row {ri}: column {c} has several values"
        for k in range(n):
            res = cells[3][k] if len(cells[3]) == n else cells[3][0]
            conf = cells[5][k] if len(cells[5]) == n else cells[5][0]
            rows.append(dict(row=ri, receptor=cells[0][0], arrestin=cells[1][0], technique=cells[2][0], resolution_A=res, pdb=pdb[k],
                             conformation_as_in_table=conf, mode=mode_of(conf), ref=cells[6][0]))
    return rows


def checks(rows: list[dict]) -> None:
    assert len(rows) == 36 and len({r["pdb"] for r in rows}) == 36, (len(rows), len({r["pdb"] for r in rows}))
    assert all(re.fullmatch(r"[0-9][A-Z0-9]{3}", r["pdb"]) for r in rows)
    assert all(re.fullmatch(r"\d\.\d\d", r["resolution_A"]) for r in rows)
    assert {r["technique"] for r in rows} == {"XFEL", "Cryo-EM"}
    assert {r["arrestin"] for r in rows} == {"Arr1", "βarr1", "βarr2"}
    assert len({r["receptor"] for r in rows}) == 16


def write(rows: list[dict]) -> None:
    OUT.parent.mkdir(exist_ok=True)
    with open(OUT, "w", newline="", encoding="utf-8") as f:
        f.write("# Table 1 of He Q, Zhao LH, Xu HE. 2026. Cell Discovery 12:61, doi 10.1038/s41421-026-00909-1 (CC BY 4.0), parsed from the Europe PMC full-text XML (PMC13503860) by src/table1.py. One row per PDB entry; 'row' is the row of the table (27 rows, 36 entries). 'mode' is the first word of the Conformation entry.\n")
        w = csv.DictWriter(f, fieldnames=HEADER, lineterminator="\n")
        w.writeheader()
        w.writerows(rows)


def load(path: Path = OUT) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        lines = [ln for ln in f if not ln.startswith("#")]
    return list(csv.DictReader(lines))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    rows = parse()
    checks(rows)
    write(rows)
    from collections import Counter
    print(len(rows), "entries from 27 rows;", "modes", dict(Counter(r["mode"] for r in rows)), "arrestins", dict(Counter(r["arrestin"] for r in rows)),
          "techniques", dict(Counter(r["technique"] for r in rows)))
    sys.exit(0)
