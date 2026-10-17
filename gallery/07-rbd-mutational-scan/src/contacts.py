"""ACE2-contact sites of the RBD in PDB 8QSQ (BA.2.86 RBD, chain A, with ACE2, chain B), computed from the coordinate file.

    py -3 -I gallery/07-rbd-mutational-scan/src/contacts.py

Contact site: an RBD residue (chain A) with at least one heavy atom within 4.5 A of a heavy atom of an ACE2 protein residue (chain B).
The paper's legend uses "< 5 A" (non-hydrogen atoms, same structure); both sets are written so that the difference is visible.
Numbering: the author residue numbers of the mmCIF (auth_seq_id) are NOT the spike (Wuhan-Hu-1) numbers of the data table. The first modelled residue
of chain A, V (author number 329), is V332 of the spike (I332V in BA.2.86): spike number = author number + 3 up to spike 482, + 4 from spike 484,
because BA.2.86 lacks residue 483 and the entry numbers consecutively. The script finds both offsets by aligning the residue letters to the table's
wild-type letters and asserts that only the documented substitutions differ.
Writes
  src/contacts.json                    sets at 4.5 A and 5 A, nearest-atom distances, residue names, the residue range of chain A
  tables/contacts_8QSQ.csv             one row per RBD residue with a contact within 5 A: site, residue, minimum distance, in 4.5 set, in 5 set
Reads data/pdb/8QSQ.cif (fetch_data.py) and data/source_data/ppat.1014074.s001.csv.
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
GAL = HERE.parent
CIF = GAL / "data" / "pdb" / "8QSQ.cif"
CSV = GAL / "data" / "source_data" / "ppat.1014074.s001.csv"
THREE = {"ALA": "A", "ARG": "R", "ASN": "N", "ASP": "D", "CYS": "C", "GLN": "Q", "GLU": "E", "GLY": "G", "HIS": "H", "ILE": "I", "LEU": "L", "LYS": "K",
         "MET": "M", "PHE": "F", "PRO": "P", "SER": "S", "THR": "T", "TRP": "W", "TYR": "Y", "VAL": "V"}


def read_atoms(path: Path):
    """atom_site loop of an mmCIF file: list of dicts (group, atom, resn, chain (auth), resi (auth), icode, x, y, z, element, model, altloc)."""
    lines = path.read_text(encoding="utf-8").splitlines()
    i = next(k for k, ln in enumerate(lines) if ln.strip() == "_atom_site.group_PDB")
    j = i
    cols = []
    while lines[j].startswith("_atom_site."):
        cols.append(lines[j].strip().split(".")[1])
        j += 1
    ix = {c: cols.index(c) for c in ("group_PDB", "label_atom_id", "label_alt_id", "label_comp_id", "auth_asym_id", "auth_seq_id", "pdbx_PDB_ins_code",
                                     "Cartn_x", "Cartn_y", "Cartn_z", "type_symbol", "pdbx_PDB_model_num", "occupancy")}
    out = []
    while j < len(lines) and not lines[j].startswith("#"):
        t = lines[j].split()
        j += 1
        if len(t) != len(cols):
            continue            # none in this file: all atom lines are single-line records
        out.append(dict(group=t[ix["group_PDB"]], atom=t[ix["label_atom_id"]].strip('"'), alt=t[ix["label_alt_id"]], resn=t[ix["label_comp_id"]], chain=t[ix["auth_asym_id"]],
                        resi=int(t[ix["auth_seq_id"]]), icode=t[ix["pdbx_PDB_ins_code"]], xyz=(float(t[ix["Cartn_x"]]), float(t[ix["Cartn_y"]]), float(t[ix["Cartn_z"]])),
                        el=t[ix["type_symbol"]], model=t[ix["pdbx_PDB_model_num"]], occ=float(t[ix["occupancy"]])))
    return out


def main() -> None:
    atoms = [a for a in read_atoms(CIF) if a["model"] == "1" and a["el"] != "H"]
    A = [a for a in atoms if a["chain"] == "A" and a["group"] == "ATOM"]
    B = [a for a in atoms if a["chain"] == "B" and a["group"] == "ATOM"]          # ACE2 protein; the six NAG (HETATM) are not counted as ACE2
    assert A and B and not any(a["icode"] not in ("?", ".") for a in A), "insertion codes in chain A would break the number-to-site map"
    assert {a["alt"] for a in atoms} <= {".", "?"}, "alternative locations: handle them before counting"
    # numbering: the author residue numbers of this entry are NOT the spike numbers. The offset is found by aligning the structure's residue letters
    # to the table's wild-type letters (the best offset must leave only the documented substitutions: 455, 456, 493 for both, 445 for LP.8.1).
    wt = {"Omicron_KP3": {}, "Omicron_LP8": {}}
    with open(CSV, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            wt[r["target"]][int(r["position"])] = r["wildtype"]
    letters_auth = {}
    for a in A:
        letters_auth[a["resi"]] = THREE[a["resn"]]
    # Two offsets: BA.2.86 lacks spike residue 483 (V483del, Fig 1A of the paper; the table has no site 483), and the entry numbers its residues
    # consecutively. So spike = author + 3 up to spike 482 and spike = author + 4 from spike 484. Each offset is the best of -10..10 on its own segment.
    def best(lo, hi):
        sc = {off: sum(1 for s, l in letters_auth.items() if lo <= s + off <= hi and wt["Omicron_KP3"].get(s + off) == l) for off in range(-10, 11)}
        o = max(sc, key=sc.get)
        return o, sc[o], sorted(sc.values())[-2]
    (OFF_LO, n_lo, nx_lo), (OFF_HI, n_hi, nx_hi) = best(331, 482), best(484, 531)
    print("offset (spike = author + offset): up to 482:", OFF_LO, f"({n_lo} letters match, next best {nx_lo});", "from 484:", OFF_HI, f"({n_hi} match, next best {nx_hi})")
    assert (OFF_LO, OFF_HI) == (3, 4) and 483 not in wt["Omicron_KP3"]
    OFF = lambda auth: OFF_LO if auth + OFF_LO <= 482 else OFF_HI
    resn, sites_auth = {}, sorted(letters_auth)
    for a in A:
        resn[a["resi"] + OFF(a["resi"])] = a["resn"]
    sites = sorted(resn)
    near = {}
    pb = np.array([a["xyz"] for a in B])
    for a in A:
        d = float(np.sqrt(((pb - np.array(a["xyz"])) ** 2).sum(1)).min())
        k = a["resi"] + OFF(a["resi"])
        near[k] = min(near.get(k, 1e9), d)
    set45 = [s for s in sites if near[s] <= 4.5]
    set50 = [s for s in sites if near[s] < 5.0]
    diff = {}
    for t, d in wt.items():
        diff[t] = {s: (THREE[resn[s]], d[s]) for s in sites if s in d and THREE[resn[s]] != d[s]}
        print(t, "sites with coordinates:", len(sites), "| table sites without coordinates:", [s for s in sorted(d) if s not in resn],
              "| letters that differ (structure, table):", diff[t])
    assert set(diff["Omicron_KP3"]) == {455, 456, 493}, diff["Omicron_KP3"]
    assert set(diff["Omicron_LP8"]) == {346, 445, 455, 456, 493}, diff["Omicron_LP8"]
    assert all(s in wt["Omicron_KP3"] for s in sites), "a modelled residue has no row in the table"
    print("chain A: author numbers", sites_auth[0], "to", sites_auth[-1], "= spike", sites[0], "to", sites[-1], "n =", len(sites), "| chain B protein atoms:", len(B))
    print("contact sites <= 4.5 A:", len(set45), set45)
    print("contact sites <  5.0 A:", len(set50), "extra over 4.5:", sorted(set(set50) - set(set45)))
    (HERE / "contacts.json").write_text(json.dumps(dict(entry="8QSQ", chain_rbd="A", chain_ace2="B", cutoff_A=4.5, offset_spike_minus_auth=dict(up_to_482=OFF_LO, from_484=OFF_HI), first_spike=sites[0], last_spike=sites[-1], first_auth=sites_auth[0], last_auth=sites_auth[-1], n_residues=len(sites),
                                                      sites_45=set45, sites_50=set50, nearest_A={str(s): round(near[s], 2) for s in sites if near[s] < 6.0},
                                                      resn={str(s): resn[s] for s in sites}, differs_from_table=diff), indent=1), encoding="utf-8")
    (GAL / "tables").mkdir(exist_ok=True)
    with open(GAL / "tables" / "contacts_8QSQ.csv", "w", newline="", encoding="utf-8") as f:
        f.write("# PDB 8QSQ chain A (BA.2.86 RBD) against chain B (ACE2 protein atoms), heavy atoms; computed here by src/contacts.py. Numbers are spike numbers (author residue number + 3 up to 482, + 4 from 484). Residue names are those of the structure.\n")
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["site", "residue_in_8QSQ", "min_heavy_atom_distance_A", "contact_4.5A", "contact_under_5A"])
        for s in sites:
            if near[s] < 5.0:
                w.writerow([s, THREE[resn[s]], f"{near[s]:.2f}", int(s in set45), int(s in set50)])


if __name__ == "__main__":
    main()
