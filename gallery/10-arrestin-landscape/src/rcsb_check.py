"""Compare Table 1 of He, Zhao and Xu 2026 with the RCSB records of its PDB ids.

    py -3 -I gallery/10-arrestin-landscape/src/rcsb_check.py            # compare data/rcsb/*.json with tables/rcsb_check.csv, fail if they differ
    py -3 -I gallery/10-arrestin-landscape/src/rcsb_check.py --update   # write tables/rcsb_check.csv

For each of the 36 entries: title, method, X-ray source, resolution and initial release date as RCSB gives them (data.rcsb.org core/entry),
next to the table's technique and resolution, with a flag where they differ. Nothing is corrected: the figure draws the table's values
and how.md reports every mismatch.
Resolution match: the RCSB value rounded to two decimals equals the table value. Technique match: Table "Cryo-EM" with RCSB "ELECTRON MICROSCOPY";
Table "XFEL" with "X-RAY DIFFRACTION" and a diffraction source named "FREE ELECTRON LASER".
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

OUT = GAL / "tables" / "rcsb_check.csv"
HEADER = ["pdb", "receptor", "table_technique", "rcsb_method", "rcsb_xray_source", "technique_match", "table_resolution_A", "rcsb_resolution_A", "resolution_match", "initial_release_date", "rcsb_title"]


def rows() -> list[dict]:
    out = []
    for r in table1.load():
        d = json.loads((GAL / "data" / "rcsb" / f"{r['pdb']}.json").read_text(encoding="utf-8"))
        method = d["exptl"][0]["method"]
        src = ";".join(sorted({s.get("source", "") for s in d.get("diffrn_source", [])}))
        res = d["rcsb_entry_info"]["resolution_combined"]
        assert len(res) == 1, (r["pdb"], res)
        tm = {"Cryo-EM": method == "ELECTRON MICROSCOPY", "XFEL": method == "X-RAY DIFFRACTION" and "FREE ELECTRON LASER" in src}[r["technique"]]
        rm = f"{res[0]:.2f}" == r["resolution_A"]
        out.append(dict(pdb=r["pdb"], receptor=r["receptor"], table_technique=r["technique"], rcsb_method=method, rcsb_xray_source=src, technique_match=tm,
                        table_resolution_A=r["resolution_A"], rcsb_resolution_A=f"{res[0]:g}", resolution_match=rm,
                        initial_release_date=d["rcsb_accession_info"]["initial_release_date"][:10], rcsb_title=d["struct"]["title"]))
    return out


def main(update: bool) -> int:
    new = rows()
    assert len(new) == 36
    bad = [r for r in new if not (r["technique_match"] and r["resolution_match"])]
    for r in bad:
        print("MISMATCH", r["pdb"], "technique", r["table_technique"], "vs", r["rcsb_method"], r["rcsb_xray_source"], "| resolution", r["table_resolution_A"], "vs", r["rcsb_resolution_A"])
    print(len(new) - len(bad), "of 36 entries agree on technique and resolution;", len(bad), "differ")
    text = "# RCSB core/entry record of every PDB id of Table 1 of He, Zhao and Xu 2026 (Cell Discovery 12:61), read 2026-10-17 from data.rcsb.org, next to the table's technique and resolution. Written by src/rcsb_check.py.\n"
    import io
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=HEADER, lineterminator="\n")
    w.writeheader()
    w.writerows(new)
    text += buf.getvalue()
    if update or not OUT.exists():
        OUT.write_text(text, encoding="utf-8")
        print("wrote", OUT)
        return 0
    if OUT.read_text(encoding="utf-8") != text:
        print("FAILED: the RCSB records differ from tables/rcsb_check.csv; look at them and rerun with --update", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main("--update" in sys.argv))
