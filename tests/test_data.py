"""Every PDB entry used in the examples: the record from data.rcsb.org, the coordinate file and the notes must agree."""
import json
import re
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IDS = ["1MEL", "1VFB", "7Z0X", "1IGT", "4KRL"]


def test_header_date_and_chains_match_the_rcsb_record():
    for e in IDS:
        rec = json.loads((ROOT / "data" / "pdb" / f"{e}.record.json").read_text())
        lines = (ROOT / "data" / "pdb" / rec["file"]).read_text().splitlines()
        header = next(l for l in lines if l.startswith("HEADER"))
        assert header[62:66].strip() == e
        assert datetime.strptime(header[50:59], "%d-%b-%y").date().isoformat()[5:] == rec["deposit_date"][5:]
        in_file = {l[21] for l in lines if l.startswith("ATOM")}
        want = {c for ent in rec["entities"] for c in ent["auth_chains"]}
        assert want <= in_file, (e, want, in_file)


def test_notes_quote_the_deposit_dates_of_the_entries_they_name():
    notes = {p: p.read_text(encoding="utf-8") for p in (ROOT / "examples").glob("*/notes.md")}
    seen = set()
    for e in IDS:
        rec = json.loads((ROOT / "data" / "pdb" / f"{e}.record.json").read_text())
        for p, text in notes.items():
            if re.search(rf"\b{e}\b", text) and p.parent.name not in ("pipeline", "series"):
                if rec["deposit_date"] in text:
                    seen.add(e)
    assert seen == set(IDS)
    for p, text in notes.items():   # a date written after "deposited" must be the record's date
        for e, d in re.findall(r"(1MEL|1VFB|7Z0X|1IGT|4KRL)[^\n|]{0,40}?deposited (\d{4}-\d{2}-\d{2})", text):
            assert json.loads((ROOT / "data" / "pdb" / f"{e}.record.json").read_text())["deposit_date"] == d, (p, e, d)
