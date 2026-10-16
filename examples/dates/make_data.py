"""Make data.js for templates/dates.html from the RCSB records written by scripts/fetch_pdb.py (data/pdb/<ID>.record.json).

    py -3 -B examples/dates/make_data.py

The cut-off date is an example, chosen for this page. Dates are deposit, initial release and last revision as the RCSB data API reports them.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ENTRIES = ["1VFB", "1MEL", "4KRL", "7Z0X"]
WHAT = {"1VFB": "Fv of an IgG1 with lysozyme", "1MEL": "single-domain VH with lysozyme", "4KRL": "VHH 7D12 with EGFR domain III", "7Z0X": "Fab with spike S1 domain"}   # short, from the entity descriptions in the record
CUTOFF = "2010-01-01"
rows = []
for e in ENTRIES:
    r = json.loads((ROOT / "data" / "pdb" / f"{e}.record.json").read_text())
    rows.append(dict(id=e, what=WHAT[e], deposited=r["deposit_date"], released=r["release_date"], revised=r["revision_date"]))
(Path(__file__).parent / "data.js").write_text("window.DATA = " + json.dumps(dict(cutoff=CUTOFF, rows=rows, kinds=["deposited", "released", "revised"]), indent=1) + ";\n", encoding="utf-8")
print(rows)
