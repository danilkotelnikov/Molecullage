"""Read PDB 7F61 (mmCIF) and derive what the figure draws. No ChimeraX needed.

    from structure import load
    S = load()

Everything the snake plot and the 3D view use comes from this file:
  seq        chain A sequence, residue number -> one-letter code (SEQRES, numbering = UniProt Q9Y5N1 = the paper's numbering)
  observed   residue numbers that have coordinates (chain A)
  ca         residue number -> CA coordinates (x, y, z) in angstrom (7F61 frame)
  records    helix records of chain A as deposited (_struct_conf), (id, start, end)
  tm         the seven transmembrane helices, rule below
  axis       unit vector along the receptor axis (membrane normal), pointing to the extracellular side
  z          residue number -> height of the CA along the axis, angstrom (0 at the mean CA of the seven TM helices)
  sites      the four activity-restoring residues with name, helix and position checks
  lig        heavy-atom coordinates of ligand 1IB (chain A)

Helix rule (the deposited records are split into helices that the paper does not name):
  a record of 24 or more residues is one transmembrane (TM) helix; a record shorter than 24 residues that is followed by a record starting on
  its last residue is joined to that record (the two pieces of one bent helix). The seven TM helices TM1 to TM7 are, in sequence order, the
  results. Records that are left over (63-66, 138-146, 234-241, 416-428, 429-432) are short helices in the loops and in helix 8.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from Bio.PDB.MMCIF2Dict import MMCIF2Dict

HERE = Path(__file__).resolve().parent
CIF = HERE.parent / "data" / "pdb" / "7F61.cif"
THREE = {"ALA": "A", "ARG": "R", "ASN": "N", "ASP": "D", "CYS": "C", "GLN": "Q", "GLU": "E", "GLY": "G", "HIS": "H", "ILE": "I", "LEU": "L", "LYS": "K",
         "MET": "M", "PHE": "F", "PRO": "P", "SER": "S", "THR": "T", "TRP": "W", "TYR": "Y", "VAL": "V"}
LONG = 24                      # residues: a record at least this long is a TM helix on its own
# the four sites of the paper: number (as in the paper and in 7F61), residue in 7F61, residue after the mutation, generic number the paper prints
SITES = [
    dict(n=1, num=73, wt="L", mut="M", bw="2.43", where="TM2"),
    dict(n=2, num=193, wt="F", mut="S", bw="ECL2", where="ECL2"),
    dict(n=3, num=359, wt="S", mut="Y", bw="6.36", where="TM6"),
    dict(n=4, num=415, wt="C", mut="R", bw="7.56", where="TM7"),
]
DELETED = (237, 340)           # ICL3 residues deleted in H3R_i3d (Methods of the paper)
N11 = 11                       # N11Q in every construct


def _rows(d, cat):
    keys = [k for k in d if k.startswith(cat + ".")]
    n = len(d[keys[0]])
    return [{k.split(".", 1)[1]: d[k][i] for k in keys} for i in range(n)]


def tm_helices(records):
    """records: list of (id, start, end) sorted by start. Returns list of dicts(start, end, parts) for TM1..TM7 and the leftover short records."""
    recs = sorted(records, key=lambda r: r[1])
    tm, used = [], set()
    for i, (rid, a, b) in enumerate(recs):
        if i in used:
            continue
        if b - a + 1 >= LONG:
            tm.append(dict(start=a, end=b, parts=[rid]))
            used.add(i)
        elif i + 1 < len(recs) and recs[i + 1][1] == b and i + 1 not in used:     # next record starts on this record's last residue
            tm.append(dict(start=a, end=recs[i + 1][2], parts=[rid, recs[i + 1][0]]))
            used.update({i, i + 1})
    short = [recs[i] for i in range(len(recs)) if i not in used]
    return tm, short


def load(cif: Path = CIF) -> dict:
    d = MMCIF2Dict(str(cif))
    # --- sequence and which residues have coordinates
    scheme = [r for r in _rows(d, "_pdbx_poly_seq_scheme") if r["asym_id"] == "A"]
    seq = {int(r["pdb_seq_num"]): THREE[r["mon_id"]] for r in scheme}
    observed = {int(r["pdb_seq_num"]) for r in scheme if r["auth_seq_num"] != "?"}
    nums = sorted(seq)
    assert nums == list(range(nums[0], nums[-1] + 1)), "chain A numbering is not continuous"
    ref = [r for r in _rows(d, "_struct_ref_seq") if r["pdbx_strand_id"] == "A"][0]
    assert ref["pdbx_db_accession"] == "Q9Y5N1" and int(ref["pdbx_auth_seq_align_beg"]) == nums[0] and int(ref["pdbx_auth_seq_align_end"]) == nums[-1]
    dif = [r for r in _rows(d, "_struct_ref_seq_dif") if r["pdbx_pdb_strand_id"] == "A"]
    engineered = [(int(r["pdbx_auth_seq_num"]), r["db_mon_id"], r["mon_id"]) for r in dif]          # [(121, 'SER', 'LYS')]
    # --- coordinates: first model, first alternative location
    at = {k: d[k] for k in d if k.startswith("_atom_site.")}
    ca, lig, sc = {}, [], {}
    for i in range(len(at["_atom_site.id"])):
        if at["_atom_site.pdbx_PDB_model_num"][i] != "1" or at["_atom_site.auth_asym_id"][i] != "A":
            continue
        alt = at["_atom_site.label_alt_id"][i]
        if alt not in (".", "A"):
            continue
        xyz = (float(at["_atom_site.Cartn_x"][i]), float(at["_atom_site.Cartn_y"][i]), float(at["_atom_site.Cartn_z"][i]))
        comp, name, num = at["_atom_site.label_comp_id"][i], at["_atom_site.label_atom_id"][i], int(at["_atom_site.auth_seq_id"][i])
        if at["_atom_site.group_PDB"][i] == "ATOM":
            if name == "CA":
                ca[num] = np.array(xyz)
            elif name not in ("N", "C", "O"):
                sc.setdefault(num, []).append(np.array(xyz))
        elif comp == "1IB":
            lig.append((name, np.array(xyz)))
    assert set(ca) == observed - {nums[-1]} or set(ca) == observed, "CA atoms and observed residues disagree"
    # --- helices
    conf = [r for r in _rows(d, "_struct_conf") if r["beg_auth_asym_id"] == "A"]
    records = [(r["id"], int(r["beg_auth_seq_id"]), int(r["end_auth_seq_id"])) for r in conf]
    for r in conf:
        assert r["end_auth_asym_id"] == "A" and r["conf_type_id"] == "HELX_P"
        assert seq[int(r["beg_auth_seq_id"])] == THREE[r["beg_label_comp_id"]] and seq[int(r["end_auth_seq_id"])] == THREE[r["end_label_comp_id"]]
    tm, short = tm_helices(records)
    assert len(tm) == 7, [(t["start"], t["end"]) for t in tm]
    # --- axis: mean of the seven TM helix axes, each pointing from the extracellular end to the intracellular end of an odd helix and the other way for even
    #     helices (TM1 starts outside, TM2 starts inside, ...); the sign convention gives one vector that points to the extracellular side.
    axes = []
    for k, t in enumerate(tm):
        pts = np.array([ca[i] for i in range(t["start"], t["end"] + 1) if i in ca])
        c = pts.mean(0)
        v = np.linalg.svd(pts - c, full_matrices=False)[2][0]
        along = (pts[-1] - pts[0]) @ v                       # direction of the chain through the helix
        v = v if along > 0 else -v                           # v now points from the first to the last residue
        axes.append(v if k % 2 == 1 else -v)                 # odd k (TM2, TM4, TM6) run inside -> outside; TM1, 3, 5, 7 run outside -> inside
    axis = np.mean(axes, axis=0)
    axis /= np.linalg.norm(axis)
    ang = [float(np.degrees(np.arccos(np.clip(a @ axis, -1, 1)))) for a in axes]
    tmca = np.array([ca[i] for t in tm for i in range(t["start"], t["end"] + 1) if i in ca])
    origin = tmca.mean(0)
    z = {i: float((p - origin) @ axis) for i, p in ca.items()}
    # --- sites
    sites = []
    for s in SITES:
        i = s["num"]
        assert seq[i] == s["wt"] and i in ca, (s, seq.get(i))
        where = None
        for k, t in enumerate(tm):
            if t["start"] <= i <= t["end"]:
                where = f"TM{k + 1}"
        if where is None:
            where = "ECL2" if 179 <= i <= 194 else "loop/helix 8"
        side = np.mean(sc[i], axis=0) if i in sc else ca[i]
        sites.append(dict(s, ca=ca[i], side=side, z=z[i], sc=[p for p in sc.get(i, [])], helix=where))
    return dict(seq=seq, nums=nums, observed=observed, ca=ca, records=records, tm=tm, short=short, axis=axis, origin=origin, z=z, sites=sites, lig=lig,
                engineered=engineered, axis_angles=ang, side_chain=sc)


if __name__ == "__main__":
    S = load()
    print("residues", S["nums"][0], "-", S["nums"][-1], "observed", len(S["observed"]), "engineered", S["engineered"])
    print("TM helices:", [(f"TM{k + 1}", t["start"], t["end"], t["parts"]) for k, t in enumerate(S["tm"])])
    print("short records:", S["short"])
    print("axis", np.round(S["axis"], 3), "angles of the seven helix axes to it (deg)", [round(a, 1) for a in S["axis_angles"]])
    for s in S["sites"]:
        print(s["n"], f"{s['wt']}{s['num']}{s['mut']}", s["helix"], "z(CA) = %.1f A" % s["z"], "side-chain z = %.1f" % ((s["side"] - S["origin"]) @ S["axis"]))
    for k, t in enumerate(S["tm"]):
        zs = [S["z"][i] for i in range(t["start"], t["end"] + 1) if i in S["z"]]
        print(f"TM{k + 1}", t["start"], t["end"], "z from %.1f to %.1f" % (zs[0], zs[-1]))
    print("ligand atoms", len(S["lig"]))
