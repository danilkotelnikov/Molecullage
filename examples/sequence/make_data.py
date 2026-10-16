"""Make data.js for templates/sequence.html from a deposited chain.

    py -3 -B examples/sequence/make_data.py

Entry 1MEL, chain A (a single-domain antibody). The sequence is the entity sequence of the RCSB record. A position is
  observed  if the PDB file has atoms for it with occupancy above 0,
  zero      if it has atoms and every occupancy is 0,
  absent    if the file has no atoms for it (no coordinates).
Position n is residue number n of chain A (checked below against the sequence letters of resolved residues).
Loops are chosen spans (struct/style.py CDR_PRESETS "1mel_vhh"), not an annotation scheme. Contact residues are the
binder residues of examples/contacts/data/contacts.csv (heavy atoms within 4.5 angstrom of lysozyme, chain L).
"""
import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "struct"))
import style  # noqa: E402

AA = {"ALA": "A", "ARG": "R", "ASN": "N", "ASP": "D", "CYS": "C", "GLN": "Q", "GLU": "E", "GLY": "G", "HIS": "H", "ILE": "I", "LEU": "L",
      "LYS": "K", "MET": "M", "PHE": "F", "PRO": "P", "SER": "S", "THR": "T", "TRP": "W", "TYR": "Y", "VAL": "V"}
ENTRY, CHAIN = "1MEL", "A"
rec = json.loads((ROOT / "data" / "pdb" / f"{ENTRY}.record.json").read_text())
seq = next(e["sequence"] for e in rec["entities"] if CHAIN in e["auth_chains"])
occ: dict[int, list[float]] = {}
letters: dict[int, str] = {}
for line in (ROOT / "data" / "pdb" / f"{ENTRY}.pdb").read_text().splitlines():
    if line.startswith("ATOM") and line[21] == CHAIN:
        n = int(line[22:26])
        occ.setdefault(n, []).append(float(line[54:60]))
        letters[n] = AA.get(line[17:20].strip(), "X")
bad = [n for n, c in letters.items() if n <= len(seq) and seq[n - 1] != c]
assert not bad, f"numbering differs from sequence index at {bad[:5]}"


def runs(pos):
    out, pos = [], sorted(pos)
    for n in pos:
        if out and n == out[-1][1] + 1:
            out[-1][1] = n
        else:
            out.append([n, n])
    return out


observed = [n for n in range(1, len(seq) + 1) if n in occ and max(occ[n]) > 0]
zero = [n for n in range(1, len(seq) + 1) if n in occ and max(occ[n]) == 0]
absent = [n for n in range(1, len(seq) + 1) if n not in occ]
loops = [[k.upper(), a, b] for k, (a, b) in style.CDR_PRESETS["1mel_vhh"].items()]
contacts = sorted({int(r["binder_num"]) for r in csv.DictReader(open(ROOT / "examples" / "contacts" / "data" / "contacts.csv"))})
in_loop = sorted(n for _, a, b in loops for n in range(a, b + 1) if n in observed)
assert set(contacts) <= set(in_loop) <= set(observed), "sets are not nested"
data = dict(entry=ENTRY, chain=CHAIN, seq=seq, runs=dict(observed=runs(observed), zero=runs(zero), absent=runs(absent), loop=runs(in_loop), contact=runs(contacts)),
            counts=dict(length=len(seq), observed=len(observed), zero=len(zero), absent=len(absent), loop=len(in_loop), contact=len(contacts)), loops=loops,
            art="vhh__main", record_date=rec["deposit_date"])
(Path(__file__).parent / "data.js").write_text("window.DATA = " + json.dumps(data, indent=1) + ";\n", encoding="utf-8")
print(data["counts"], data["runs"])
