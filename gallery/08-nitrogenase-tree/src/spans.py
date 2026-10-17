"""Inserted segments and the common view of the three deposited entries drawn in panel b (3U7Q, 4WES, 8BOQ).

    py -3 -I gallery/08-nitrogenase-tree/src/spans.py        # writes tables/insertion_spans.json, tables/inset_frames.json and tables/inset_entries.json

What the paper gives (Results, "Ancient structural insertion events distinguish major nitrogenase clades"): a D-subunit C-terminus extension of about 60 residues
unique to Anf, a K-subunit N-terminus extension of about 8 to 40 residues unique to Nif-I, and a D-subunit insertion of about 55 residues unique to Nif-II.
It gives no residue numbers for the deposited entries. This script finds the segments in the deposited sequences by pairwise alignment with a homologue that lacks them:
  K N-terminal extension  3U7Q chain K (A. vinelandii Nif, Nif-I)   against 4WES chain K (C. pasteurianum Nif, Nif-II): the residues before the first aligned one
  D insertion             4WES chain D (C. pasteurianum Nif, Nif-II) against 3U7Q chain D (Nif-I): the one internal run of unaligned residues
  D C-terminal extension  8BOQ chain D (A. vinelandii Anf)           against 3U7Q chain D (Nif-I): the residues after the last aligned one
Biopython PairwiseAligner, global, BLOSUM62, gap open -11, gap extend -1, free end gaps. The result is this script's own measurement on the sequences of the entries,
not the paper's residue range; the lengths are compared with the paper's "about" values in how.md.

The common view: the three DDKK tetramers are superposed on 3U7Q (CA atoms of the aligned residues, both D and both K chains, the dimer pairing with the lower RMSD),
then turned so that the pseudo two-fold axis of 3U7Q points at the viewer, chain D of the first dimer upper left and its K upper right.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from Bio import Align
from Bio.Align import substitution_matrices
from Bio.PDB.MMCIF2Dict import MMCIF2Dict

HERE = Path(__file__).resolve().parent
GAL = HERE.parent
DATA, TAB = GAL / "data", GAL / "tables"
ENTRIES = {  # entry: (auth chains of D, auth chains of K); entities read from the file
    "3U7Q": (["A", "C"], ["B", "D"]),
    "4WES": (["A", "C"], ["B", "D"]),
    "8BOQ": (["A", "D"], ["B", "E"]),
}
REF = "3U7Q"


def aligner():
    al = Align.PairwiseAligner()
    al.substitution_matrix = substitution_matrices.load("BLOSUM62")
    al.mode = "global"
    al.open_gap_score, al.extend_gap_score, al.end_gap_score = -11, -1, 0
    return al


class Entry:
    def __init__(self, pid):
        self.pid = pid
        d = MMCIF2Dict(str(DATA / f"{pid}.cif"))
        g = lambda k: d[k] if isinstance(d[k], list) else [d[k]]
        # canonical sequence of each entity
        self.seq = {}
        for eid, s in zip(g("_entity_poly.entity_id"), g("_entity_poly.pdbx_seq_one_letter_code_can")):
            self.seq[eid] = s.replace("\n", "").replace(" ", "")
        a = {k: g(k) for k in ("_atom_site.group_PDB", "_atom_site.label_atom_id", "_atom_site.label_alt_id", "_atom_site.label_seq_id", "_atom_site.auth_seq_id",
                               "_atom_site.pdbx_PDB_ins_code", "_atom_site.auth_asym_id", "_atom_site.label_entity_id", "_atom_site.Cartn_x", "_atom_site.Cartn_y",
                               "_atom_site.Cartn_z", "_atom_site.pdbx_PDB_model_num")}
        self.ca = {}       # auth chain -> {label_seq_id: (auth_seq_id, ins, xyz)}
        self.ent = {}      # auth chain -> entity id
        for i in range(len(a["_atom_site.group_PDB"])):
            if a["_atom_site.group_PDB"][i] != "ATOM" or a["_atom_site.label_atom_id"][i] != "CA" or a["_atom_site.pdbx_PDB_model_num"][i] != "1":
                continue
            if a["_atom_site.label_alt_id"][i] not in (".", "A"):
                continue
            ch = a["_atom_site.auth_asym_id"][i]
            seq_id = int(a["_atom_site.label_seq_id"][i])
            xyz = np.array([float(a[f"_atom_site.Cartn_{c}"][i]) for c in "xyz"])
            ins = a["_atom_site.pdbx_PDB_ins_code"][i]
            self.ca.setdefault(ch, {})[seq_id] = (int(a["_atom_site.auth_seq_id"][i]), "" if ins in ("?", ".") else ins, xyz)
            self.ent[ch] = a["_atom_site.label_entity_id"][i]

    def chain_seq(self, ch):
        return self.seq[self.ent[ch]]


def pairs(al, sa, sb):
    """Aligned residue pairs (index in a, index in b), 1-based, from the best alignment, plus the unaligned runs."""
    aln = al.align(sa, sb)[0]
    ia = ib = 0
    pr, runs, cur = [], [], None
    for x, y in zip(aln[0], aln[1]):
        kind = "only_a" if y == "-" else ("only_b" if x == "-" else None)
        if x != "-":
            ia += 1
        if y != "-":
            ib += 1
        if kind is None:
            pr.append((ia, ib))
        if kind != (cur[0] if cur else None):
            if cur:
                runs.append(cur)
            cur = [kind, 0, 0, 0] if kind else None
            if cur:
                cur[1] = ia if kind == "only_a" else ib          # first residue of the run, in its own sequence
        if cur:
            cur[2] = ia if kind == "only_a" else ib              # last residue of the run
            cur[3] += 1
    if cur:
        runs.append(cur)
    return pr, runs, float(aln.score)


def kabsch(P, Q):
    """Rotation R and translation t with R P + t close to Q (least squares)."""
    pc, qc = P.mean(0), Q.mean(0)
    H = (P - pc).T @ (Q - qc)
    U, _, Vt = np.linalg.svd(H)
    d = np.sign(np.linalg.det(Vt.T @ U.T))
    R = Vt.T @ np.diag([1, 1, d]) @ U.T
    return R, qc - R @ pc


def rmsd(P, Q):
    return float(np.sqrt(((P - Q) ** 2).sum(1).mean()))


def dimers(e, dch, kch):
    """Pair every D chain with the K chain it touches most (CA pairs within 8 A)."""
    out = []
    for d in dch:
        pd = np.array([v[2] for v in e.ca[d].values()])
        best = max(kch, key=lambda k: (np.linalg.norm(pd[:, None, :] - np.array([v[2] for v in e.ca[k].values()])[None, :, :], axis=2) < 8.0).sum())
        out.append((d, best))
    assert len({k for _, k in out}) == 2, "two different K chains expected"
    return out


def main():
    al = aligner()
    E = {p: Entry(p) for p in ENTRIES}
    spans = {}
    # ---- inserted segments
    ref_d, ref_k = E["3U7Q"].chain_seq("A"), E["3U7Q"].chain_seq("B")
    cp_d, cp_k = E["4WES"].chain_seq("A"), E["4WES"].chain_seq("B")
    an_d = E["8BOQ"].chain_seq("A")
    # K extension of 3U7Q
    pr, runs, sc = pairs(al, ref_k, cp_k)
    lead = [r for r in runs if r[0] == "only_a" and r[1] == 1]
    assert len(lead) == 1
    k_ext = (1, lead[0][2])
    # D insertion of 4WES
    pr, runs, sc = pairs(al, cp_d, ref_d)
    internal = [r for r in runs if r[0] == "only_a" and r[3] >= 20 and r[1] > 1 and r[2] < len(cp_d)]
    assert len(internal) == 1, runs
    d_ins = (internal[0][1], internal[0][2])
    # D C-terminal extension of 8BOQ
    pr, runs, sc = pairs(al, an_d, ref_d)
    tail = [r for r in runs if r[0] == "only_a" and r[2] == len(an_d) and r[3] >= 20]
    assert len(tail) == 1, runs
    d_ct = (tail[0][1], tail[0][2])
    # the same tail against the other relative (C. pasteurianum NifD): the length depends on the baseline, so the figure names both
    pr, runs, sc = pairs(al, an_d, cp_d)
    tail2 = [r for r in runs if r[0] == "only_a" and r[2] == len(an_d) and r[3] >= 20]
    assert len(tail2) == 1, runs
    alt_ct = dict(baseline="4WES chain A", label_seq=[tail2[0][1], tail2[0][2]], length=tail2[0][3])

    def auth(entry, ch, rng):
        ca = E[entry].ca[ch]
        nums = [ca[i][0] for i in range(rng[0], rng[1] + 1) if i in ca]
        return nums

    spans = {
        "3U7Q": dict(event="K-subunit N-terminal extension", chains=["B", "D"], baseline="4WES chain B", label_seq=list(k_ext), length=k_ext[1] - k_ext[0] + 1,
                     modelled={c: auth("3U7Q", c, k_ext) for c in ("B", "D")}, paper="about 8 to 40 residues (shorter in early, longer in late Nif-I lineages)"),
        "4WES": dict(event="D-subunit insertion", chains=["A", "C"], baseline="3U7Q chain A", label_seq=list(d_ins), length=d_ins[1] - d_ins[0] + 1,
                     modelled={c: auth("4WES", c, d_ins) for c in ("A", "C")}, paper="about 55 residues"),
        "8BOQ": dict(event="D-subunit C-terminal extension", chains=["A", "D"], baseline="3U7Q chain A", label_seq=list(d_ct), length=d_ct[1] - d_ct[0] + 1,
                     modelled={c: auth("8BOQ", c, d_ct) for c in ("A", "D")}, paper="about 60 residues", alt=alt_ct),
    }
    for k, v in spans.items():
        print(k, v["event"], "label_seq", v["label_seq"], "length", v["length"], "| modelled residues per chain:", {c: len(n) for c, n in v["modelled"].items()}, "| paper:", v["paper"])
    # ---- superposition on 3U7Q
    ref = E[REF]
    rd, rk = ENTRIES[REF]
    rdim = dimers(ref, rd, rk)
    frames = {}
    for pid in ENTRIES:
        e = E[pid]
        dch, kch = ENTRIES[pid]
        if pid == REF:
            frames[pid] = dict(R=np.eye(3), t=np.zeros(3), rmsd=0.0, npairs=0, dimers=rdim)
            continue
        edim = dimers(e, dch, kch)
        best = None
        for perm in (edim, edim[::-1]):
            P, Q = [], []
            for (ed, ek), (xd, xk) in zip(perm, rdim):
                for (ec, rc, sa, sb) in ((ed, xd, e.chain_seq(ed), ref.chain_seq(xd)), (ek, xk, e.chain_seq(ek), ref.chain_seq(xk))):
                    pr, _, _ = pairs(al, sa, sb)
                    for ia, ib in pr:
                        if ia in e.ca[ec] and ib in ref.ca[rc]:
                            P.append(e.ca[ec][ia][2]); Q.append(ref.ca[rc][ib][2])
            P, Q = np.array(P), np.array(Q)
            keep = np.ones(len(P), bool)
            for _ in range(4):                                   # drop pairs farther than 2 x the RMSD, refit
                R, t = kabsch(P[keep], Q[keep])
                dist = np.linalg.norm((P @ R.T + t) - Q, axis=1)
                r = float(np.sqrt((dist[keep] ** 2).mean()))
                keep = dist < max(2.0 * r, 2.0)
            R, t = kabsch(P[keep], Q[keep])
            r = rmsd(P[keep] @ R.T + t, Q[keep])
            if best is None or r < best["rmsd"]:
                best = dict(R=R, t=t, rmsd=r, npairs=int(keep.sum()), npairs_all=len(P), dimers=perm)
        frames[pid] = best
        print(pid, "fit on 3U7Q: CA RMSD %.2f A over %d of %d aligned pairs; dimers %s" % (best["rmsd"], best["npairs"], best["npairs_all"], best["dimers"]))
    # ---- view frame from the pseudo two-fold axis of 3U7Q (dimer 1 -> dimer 2)
    (d1, k1), (d2, k2) = rdim
    P = np.array([v[2] for c in (d1, k1) for v in ref.ca[c].values()])
    # pair residues by label_seq_id between the two dimers
    P, Q = [], []
    for c1, c2 in ((d1, d2), (k1, k2)):
        for i, v in ref.ca[c1].items():
            if i in ref.ca[c2]:
                P.append(v[2]); Q.append(ref.ca[c2][i][2])
    P, Q = np.array(P), np.array(Q)
    R2, t2 = kabsch(P, Q)
    ang = float(np.degrees(np.arccos(np.clip((np.trace(R2) - 1) / 2, -1, 1))))
    w, V = np.linalg.eig(R2)
    axis = np.real(V[:, np.argmin(np.abs(w - 1))])
    axis /= np.linalg.norm(axis)
    print("pseudo two-fold of 3U7Q: rotation %.1f deg, CA RMSD between the dimers %.2f A" % (ang, rmsd(P @ R2.T + t2, Q)))
    cen = lambda c: np.mean([v[2] for v in ref.ca[c].values()], axis=0)
    allca = np.array([v[2] for c in (d1, k1, d2, k2) for v in ref.ca[c].values()])
    origin = allca.mean(0)
    z = axis
    x = (cen(k1) - cen(d1)); x -= x.dot(z) * z; x /= np.linalg.norm(x)
    y = np.cross(z, x)
    # dimer 1 should sit in the upper half of the view (y > 0 for its centre); otherwise turn about x by 180 degrees
    c1 = (cen(d1) + cen(k1)) / 2 - origin
    if c1.dot(y) < 0:
        z, y = -z, -y
    Rv = np.stack([x, y, z])                                       # rows: view axes in the 3U7Q frame
    out = {}
    for pid, f in frames.items():
        Rt = Rv @ f["R"]                                           # entry coordinates -> view coordinates (x right, y up, z towards the viewer)
        tt = Rv @ (f["t"] - origin)
        out[pid] = dict(matrix=[list(map(float, np.append(Rt[i], tt[i]))) for i in range(3)], fit_rmsd=round(f["rmsd"], 3), fit_pairs=f["npairs"],
                        dimers=[list(d) for d in f["dimers"]])
    TAB.mkdir(exist_ok=True)
    info = {}
    for pid in ENTRIES:
        d = MMCIF2Dict(str(DATA / f"{pid}.cif"))
        g = lambda k: d[k][0] if isinstance(d[k], list) else d[k]
        org = d.get("_entity_src_gen.pdbx_gene_src_scientific_name") or d.get("_entity_src_nat.pdbx_organism_scientific") or ["?"]
        info[pid] = dict(title=g("_struct.title"), method=g("_exptl.method"), resolution=g("_refine.ls_d_res_high"), organism=sorted(set(org if isinstance(org, list) else [org])),
                         chains_D=ENTRIES[pid][0], chains_K=ENTRIES[pid][1], released=g("_pdbx_database_status.recvd_initial_deposition_date"))
    (TAB / "inset_entries.json").write_text(json.dumps(info, indent=1, ensure_ascii=False), encoding="utf-8")
    (TAB / "inset_frames.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
    spans_out = {k: {kk: vv for kk, vv in v.items()} for k, v in spans.items()}
    (TAB / "insertion_spans.json").write_text(json.dumps(spans_out, indent=1), encoding="utf-8")
    print("wrote tables/inset_frames.json and tables/insertion_spans.json")


if __name__ == "__main__":
    main()
