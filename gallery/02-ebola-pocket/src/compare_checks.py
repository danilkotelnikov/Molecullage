"""Checks against numbers in the paper's text that can be reproduced from coordinates. Prints; writes src/compare_checks.json.

    py -3 -I gallery/02-ebola-pocket/src/compare_checks.py

1. Toremifene in PDB 5JQ7: the paper says 17 GP residues interact with it. Count residues with a heavy atom within 4.5 A of the ligand, per ligand copy.
2. The DFF lid (Asp192, Phe193, Phe194): the paper says it is disordered in the MWAC-3634 complex. Are residues 190 to 197 modelled in 9PEL (chains A, B, C) and in 9BSV?
3. Chain pairing: which GP2 chain does each GP1 chain contact through the inhibitor in its own pocket (the sheet says A with a).
"""
from __future__ import annotations

import json
from pathlib import Path

import gemmi
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
out = {}


def contacts(path, lig_name, cut=4.5):
    st = gemmi.read_structure(str(path))
    m = st[0]
    ns = gemmi.NeighborSearch(m, st.cell, 6.0).populate()
    res = {}
    for ch in m:
        for r in ch:
            if r.name != lig_name:
                continue
            found = set()
            for a in r:
                if a.element.name == "H":
                    continue
                for mk in ns.find_atoms(a.pos, "\0", radius=cut):
                    cra = mk.to_cra(m)
                    if cra.residue is r or cra.atom.element.name == "H" or cra.residue.name in ("HOH", lig_name):
                        continue
                    if a.pos.dist(cra.atom.pos) <= cut and cra.residue.het_flag != "H":
                        found.add((cra.chain.name, cra.residue.seqid.num, cra.residue.name))
            res[f"{ch.name}{r.seqid.num}"] = sorted(found)
    return res


t = contacts(ROOT / "data" / "pdb" / "5JQ7.cif", "T0R")
out["toremifene_5JQ7_residues_within_4.5A"] = {k: len(v) for k, v in t.items()}
print("5JQ7 toremifene copies, residues within 4.5 A:", out["toremifene_5JQ7_residues_within_4.5A"])
for k, v in t.items():
    print(" ", k, [f"{n}{num}" for c, num, n in v])

for name in ("9PEL", "9BSV"):
    st = gemmi.read_structure(str(ROOT / "data" / "pdb" / f"{name}.cif"))
    m = st[0]
    rows = {}
    for ch in m:
        nums = [r.seqid.num for r in ch if r.entity_type == gemmi.EntityType.Polymer]
        if nums and 150 < max(nums) < 420 or (nums and min(nums) < 100 and max(nums) > 190):
            rows[ch.name] = [n for n in nums if 185 <= n <= 200]
    out[f"{name}_modelled_185_200"] = rows
    print(name, "modelled residues 185-200 per chain:", rows)

c = json.loads((ROOT / "src" / "contacts.json").read_text(encoding="utf-8"))
st = gemmi.read_structure(str(ROOT / "data" / "pdb" / "9PEL.cif"))
m = st[0]
pairing = {}
for gp1, gp2 in (("A", "a"), ("B", "b"), ("C", "c")):
    lig = next(r for r in m[gp1] if r.name == "A1CIK")
    ns = gemmi.NeighborSearch(m, st.cell, 6.0).populate()
    chains = set()
    for a in lig:
        if a.element.name == "H":
            continue
        for mk in ns.find_atoms(a.pos, "\0", radius=4.5):
            cra = mk.to_cra(m)
            if cra.residue is not lig and cra.atom.element.name != "H":
                chains.add(cra.chain.name)
    pairing[f"ligand of chain {gp1}"] = sorted(chains)
out["ligand_neighbour_chains"] = pairing
print("chains within 4.5 A of each ligand copy:", pairing)
(ROOT / "src" / "compare_checks.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
