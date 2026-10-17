"""Fetch a public PDB entry and record what the RCSB data API says about it.

    py -3 -B scripts/fetch_pdb.py 1MEL 1VFB 7Z0X

Writes data/pdb/<ID>.pdb (or .cif when no PDB file exists) from files.rcsb.org and data/pdb/<ID>.record.json
from data.rcsb.org: title, deposit date, release date, method, and every polymer entity with its chains.
Check the record against the figure notes before you draw an entry.
"""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / "data" / "pdb"
API = "https://data.rcsb.org/rest/v1/core"


def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "molecullage-fetch/0.1"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def record(entry: str) -> dict:
    e = json.loads(get(f"{API}/entry/{entry}"))
    out = {
        "id": entry,
        "title": e["struct"]["title"],
        "deposit_date": e["rcsb_accession_info"]["deposit_date"][:10],
        "release_date": e["rcsb_accession_info"]["initial_release_date"][:10],
        "revision_date": e["rcsb_accession_info"]["revision_date"][:10],
        "method": [m["method"] for m in e["exptl"]],
        "resolution_A": (e.get("rcsb_entry_info") or {}).get("resolution_combined"),
        "entities": [],
    }
    for n in e["rcsb_entry_container_identifiers"]["polymer_entity_ids"]:
        p = json.loads(get(f"{API}/polymer_entity/{entry}/{n}"))
        ident = p["rcsb_polymer_entity_container_identifiers"]
        out["entities"].append({
            "entity": n,
            "description": p["rcsb_polymer_entity"]["pdbx_description"],
            "length": p["entity_poly"]["rcsb_sample_sequence_length"],
            "auth_chains": ident.get("auth_asym_ids", []),
            "label_chains": ident.get("asym_ids", []),
            "sequence": p["entity_poly"]["pdbx_seq_one_letter_code_can"],
        })
    return out


def fetch(entry: str) -> None:
    entry = entry.upper()
    DATA.mkdir(parents=True, exist_ok=True)
    try:
        data, ext = get(f"https://files.rcsb.org/download/{entry}.pdb"), "pdb"
    except urllib.error.HTTPError:
        data, ext = get(f"https://files.rcsb.org/download/{entry}.cif"), "cif"
    (DATA / f"{entry}.{ext}").write_bytes(data)
    rec = record(entry)
    rec["file"] = f"{entry}.{ext}"
    (DATA / f"{entry}.record.json").write_text(json.dumps(rec, indent=1), encoding="utf-8")
    print(entry, ext, rec["deposit_date"], rec["method"], [(x["entity"], x["auth_chains"], x["description"]) for x in rec["entities"]])


if __name__ == "__main__":
    for a in sys.argv[1:] or sys.exit(__doc__):
        fetch(a)
