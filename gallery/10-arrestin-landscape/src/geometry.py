"""Superpose the receptors of the rendered entries on one receptor, fix one viewing frame and compute the receptor-arrestin contacts.

    py -3 -I gallery/10-arrestin-landscape/src/geometry.py          # reads data/<ID>.cif, writes tables/geometry.json and tables/contacts.csv

Entries (chain letters are the author chains of the mmCIF files): 9WSV MOR/betaarr1 (receptor R, arrestin C), 8JRV GCGR (R, A), 8ZYU NTSR1 (R, B). Antibody fragments, nanobodies, peptides, ligands, water and ions are not part of the geometry.

Superposition   Calpha atoms of the transmembrane helices of each receptor onto those of the 9WSV receptor. Residue pairs come from a global sequence
                alignment (Biopython PairwiseAligner, BLOSUM62, gap open -10, extend -0.5); only pairs whose two residues both lie in a helix of 18 or more residues
                (HELX records of the mmCIF) are used, and only helices that start at or after TM1 (the first helix record of 25 or more residues). Pairs further apart than the
                cutoff after a fit are dropped step by step (12, 8, 6, 4.5, 3.5, 3.0 A) and the fit is repeated.
View frame      up = mean axis of the long helices of the 9WSV receptor (each helix: mean of its last four Calpha minus mean of its first four, signs aligned),
                signed to point away from the arrestin; right = the horizontal direction in which the arrestin of the Tail entry (8JRV) lies away from the receptor axis.
                The same rotation is applied to every entry. The view is then turned about the vertical axis by the angle that shows most of the contact residues
                (scan_views: every 10 degrees; a contact residue counts as visible when no other Calpha lies in front of it within 4 A on the screen; best angle =
                largest smallest visible share over the three entries, among angles that keep the Tail arrestin at least 20 A to the right of the receptor).
Hidden          receptor residues before TM1 (the extracellular N-terminal segment) are not drawn: written to the JSON as hide_before.
Contacts        receptor and arrestin residues with any heavy atom within CONTACT_A of the other protein.
"""
import csv
import json
import sys
from pathlib import Path

import gemmi
import numpy as np
from Bio import Align
from Bio.Align import substitution_matrices

HERE = Path(__file__).resolve().parents[1]
DATA, TABLES = HERE / "data", HERE / "tables"
ENTRIES = {
    "9WSV": dict(rec="R", arr="C", mode="Core", receptor="MOR"),
    "8JRV": dict(rec="R", arr="A", mode="Tail", receptor="GCGR"),
    "8ZYU": dict(rec="R", arr="B", mode="Loop-engaged", receptor="NTSR1"),
}
REF = "9WSV"
TAIL = "8JRV"
LONG_HELIX = 18
TM1_MIN = 25
SCHEDULE = (12.0, 8.0, 6.0, 4.5, 3.5, 3.0)
CONTACT_A = 4.5
AA3 = {"ALA": "A", "ARG": "R", "ASN": "N", "ASP": "D", "CYS": "C", "GLN": "Q", "GLU": "E", "GLY": "G", "HIS": "H", "ILE": "I", "LEU": "L", "LYS": "K",
       "MET": "M", "PHE": "F", "PRO": "P", "SER": "S", "THR": "T", "TRP": "W", "TYR": "Y", "VAL": "V"}


def load(pid):
    st = gemmi.read_structure(str(DATA / f"{pid}.cif"))
    st.setup_entities()
    return st


def amino_letter(name):
    """One-letter code of a standard or modified amino acid (SEP -> S, TPO -> T), or None for water, ligands and ions."""
    if name in AA3:
        return AA3[name]
    t = gemmi.find_tabulated_residue(name)
    if t is not None and t.is_amino_acid():
        return t.one_letter_code.upper() if t.one_letter_code.strip() else "X"
    return None


def residues(st, chain):
    """[(number, icode, name, one-letter, CA xyz, all heavy atom xyz)] of the modelled amino-acid residues of one chain, modified ones (SEP, TPO) included."""
    out = []
    for r in st[0][chain]:
        aa = amino_letter(r.name)
        if aa is None:
            continue
        ca = r.find_atom("CA", "*")
        if ca is None:
            continue
        heavy = np.array([a.pos.tolist() for a in r if a.element.name != "H"])
        out.append(dict(num=r.seqid.num, ic=r.seqid.icode.strip(), name=r.name, aa=aa, ca=np.array(ca.pos.tolist()), xyz=heavy))
    return out


def graft_range(pid, chain, acc="P30518"):
    """Author residue range of the chain that the entry's own reference table assigns to UniProt `acc` (V2R, P30518), or None."""
    b = gemmi.cif.read(str(DATA / f"{pid}.cif")).sole_block()
    refs = {r[0]: r[1] for r in b.find("_struct_ref.", ["id", "pdbx_db_accession"])}
    spans = [(int(r[2]), int(r[3])) for r in b.find("_struct_ref_seq.", ["ref_id", "pdbx_strand_id", "pdbx_auth_seq_align_beg", "pdbx_auth_seq_align_end"]) if refs.get(r[0]) == acc and r[1] == chain]
    return spans[0] if spans else None


def tm1_start(st, chain):
    """Number of the first residue of TM1: the start of the first helix record of TM1_MIN or more residues in the receptor chain."""
    return min(h.start.res_id.seqid.num for h in st.helices if h.start.chain_name == chain and h.end.res_id.seqid.num - h.start.res_id.seqid.num + 1 >= TM1_MIN)


def helices(st, chain):
    """(start, end) of the helix records of LONG_HELIX or more residues that begin at or after TM1."""
    t = tm1_start(st, chain)
    return sorted((h.start.res_id.seqid.num, h.end.res_id.seqid.num) for h in st.helices if h.start.chain_name == chain and h.start.res_id.seqid.num >= t
                  and h.end.res_id.seqid.num - h.start.res_id.seqid.num + 1 >= LONG_HELIX)


def long_helix_numbers(st, chain):
    """Residue numbers of the chain that lie in a helix of `helices`."""
    out = set()
    for a, b in helices(st, chain):
        out.update(range(a, b + 1))
    return out


def kabsch(P, Q):
    pc, qc = P.mean(0), Q.mean(0)
    H = (P - pc).T @ (Q - qc)
    U, S, Vt = np.linalg.svd(H)
    d = np.sign(np.linalg.det(Vt.T @ U.T))
    R = Vt.T @ np.diag([1, 1, d]) @ U.T
    return R, qc - R @ pc


def align_pairs(ref_res, res):
    """Residue index pairs (i in ref, j in res) of a global alignment of the two modelled sequences."""
    al = Align.PairwiseAligner()
    al.substitution_matrix = substitution_matrices.load("BLOSUM62")
    al.open_gap_score, al.extend_gap_score = -10, -0.5
    al.end_gap_score = 0
    a = "".join(r["aa"] for r in ref_res)
    b = "".join(r["aa"] for r in res)
    best = al.align(a, b)[0]
    pairs = []
    for (a0, a1), (b0, b1) in zip(*best.aligned):
        pairs += [(a0 + k, b0 + k) for k in range(a1 - a0)]
    return pairs


def fit_onto(ref_res, res, ref_hel, hel):
    pairs = [(i, j) for i, j in align_pairs(ref_res, res) if ref_res[i]["num"] in ref_hel and res[j]["num"] in hel]
    P = np.array([res[j]["ca"] for i, j in pairs])
    Q = np.array([ref_res[i]["ca"] for i, j in pairs])
    keep = np.ones(len(pairs), bool)
    for cut in SCHEDULE:
        while True:
            R, t = kabsch(P[keep], Q[keep])
            d = np.linalg.norm(P @ R.T + t - Q, axis=1)
            new = d <= cut
            if new.sum() < 40:
                break
            if (new == keep).all():
                break
            keep = new
        keep = d <= cut if (d <= cut).sum() >= 40 else keep
    R, t = kabsch(P[keep], Q[keep])
    d = np.linalg.norm(P @ R.T + t - Q, axis=1)
    return R, t, int(keep.sum()), len(pairs), float(np.sqrt(np.mean(d[keep] ** 2)))


def helix_axis(st, chain, res):
    """Mean axis of the long helices of a receptor chain (unit vector, sign arbitrary), and the centroid of their Calpha atoms."""
    by = {r["num"]: r for r in res}
    dirs, pts = [], []
    for a, b in helices(st, chain):
        idx = [n for n in range(a, b + 1) if n in by]
        if len(idx) < LONG_HELIX - 2:
            continue
        p = np.array([by[n]["ca"] for n in idx])
        d = p[-4:].mean(0) - p[:4].mean(0)
        dirs.append(d / np.linalg.norm(d))
        pts.append(p)
    dirs = np.array(dirs)
    dirs = dirs * np.sign(dirs @ dirs[0])[:, None]
    ax = dirs.mean(0)
    return ax / np.linalg.norm(ax), np.concatenate(pts).mean(0), len(dirs)


def contacts(rec, arr):
    """Residue numbers of the receptor and of the arrestin that have a heavy atom within CONTACT_A of the other protein."""
    from scipy.spatial import cKDTree

    ra = np.concatenate([r["xyz"] for r in rec])
    rid = np.concatenate([[i] * len(r["xyz"]) for i, r in enumerate(rec)])
    aa = np.concatenate([r["xyz"] for r in arr])
    aid = np.concatenate([[i] * len(r["xyz"]) for i, r in enumerate(arr)])
    pairs = cKDTree(ra).query_ball_tree(cKDTree(aa), CONTACT_A)
    rc, ac = set(), set()
    for i, lst in enumerate(pairs):
        for j in lst:
            rc.add(int(rid[i]))
            ac.add(int(aid[j]))
    return sorted(rec[i]["num"] for i in rc), sorted(arr[i]["num"] for i in ac), {rec[i]["num"]: rec[i]["name"] for i in rc}


def rot_y(deg):
    c, s = np.cos(np.radians(deg)), np.sin(np.radians(deg))
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def scan_views(R, fit, F, cen, rc_by, hide_by, off_min=20.0):
    """Visible share of the contact residues for turns of the view about the vertical axis; returns (best degrees, table rows)."""
    from scipy.spatial import cKDTree

    pts = {}
    for pid in ENTRIES:
        Rm, t = fit[pid][0], fit[pid][1]
        v = lambda xyz: (np.asarray(xyz) @ Rm.T + t - cen) @ F.T          # model -> view frame (right, up, towards the viewer)
        rec, arr = R[pid]["rec"], R[pid]["arr"]
        keep = [r for r in rec if r["num"] >= hide_by[pid]]
        pts[pid] = dict(rec=v([r["ca"] for r in keep]), arr=v([r["ca"] for r in arr]), con=v([r["ca"] for r in keep if r["num"] in rc_by[pid]]))
    rows = []
    for deg in range(0, 360, 10):
        Rt = rot_y(deg)
        vis = {}
        for pid, d in pts.items():
            allp = np.vstack([d["rec"], d["arr"]]) @ Rt.T
            tree = cKDTree(allp[:, :2])
            n = 0
            for p in d["con"] @ Rt.T:
                n += all(allp[i, 2] <= p[2] + 1.5 for i in tree.query_ball_point(p[:2], 4.0))
            vis[pid] = n / len(d["con"])
        dx = float(((pts[TAIL]["arr"].mean(0) - pts[TAIL]["rec"].mean(0)) @ Rt.T)[0])
        rows.append((deg, vis, dx))
    ok = [r for r in rows if r[2] >= off_min]
    best = max(ok, key=lambda r: (min(r[1].values()), float(np.mean(list(r[1].values())))))
    return best[0], rows


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    S = {pid: load(pid) for pid in ENTRIES}
    R = {pid: dict(rec=residues(S[pid], e["rec"]), arr=residues(S[pid], e["arr"])) for pid, e in ENTRIES.items()}
    H = {pid: long_helix_numbers(S[pid], e["rec"]) for pid, e in ENTRIES.items()}
    ax, cen, nh = helix_axis(S[REF], ENTRIES[REF]["rec"], R[REF]["rec"])
    arr_cen = np.mean([r["ca"] for r in R[REF]["arr"]], 0)
    if (arr_cen - cen) @ ax > 0:
        ax = -ax                      # axis points away from the arrestin: up is the extracellular side
    fit, off = {}, {}
    for pid in ENTRIES:
        if pid == REF:
            fit[pid] = (np.eye(3), np.zeros(3), 0, 0, 0.0)
        else:
            fit[pid] = fit_onto(R[REF]["rec"], R[pid]["rec"], H[REF], H[pid])
        Rm, t = fit[pid][0], fit[pid][1]
        a_cen = (np.array([r["ca"] for r in R[pid]["arr"]]) @ Rm.T + t).mean(0)
        o = a_cen - cen
        off[pid] = o - (o @ ax) * ax
    # right = the horizontal direction in which the arrestin of the Tail entry lies away from the receptor axis
    xdir = off[TAIL] / np.linalg.norm(off[TAIL])
    ydir = ax
    zdir = np.cross(xdir, ydir)
    F = np.stack([xdir, ydir, zdir])                  # rows: right, up, towards the viewer
    cn = {pid: set(contacts(R[pid]["rec"], R[pid]["arr"])[0]) for pid in ENTRIES}
    hide = {pid: tm1_start(S[pid], e["rec"]) for pid, e in ENTRIES.items()}
    deg, scan_rows = scan_views(R, fit, F, cen, cn, hide)
    with open(TABLES / "view_scan.csv", "w", newline="", encoding="utf-8") as f:
        f.write("# Share of the receptor contact residues (heavy atoms within 4.5 A of arrestin) that stay visible when the common view is turned about the vertical axis; computed by src/geometry.py scan_views. tail_arrestin_right_A: how far to the right of the receptor the Tail arrestin lies (A).\n")
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["turn_deg"] + [f"visible_share_{p}" for p in ENTRIES] + ["tail_arrestin_right_A", "chosen"])
        for d_, vis, dx in scan_rows:
            w.writerow([d_] + [f"{vis[p]:.2f}" for p in ENTRIES] + [f"{dx:.1f}", "yes" if d_ == deg else ""])
    F = rot_y(deg) @ F                                # the chosen turn is part of the frame
    out = dict(ref=REF, frame_right_from=TAIL, view_turn_deg=deg, up=ax.tolist(), centre=cen.tolist(), n_reference_helices=nh, entries={})
    print("view turned by", deg, "degrees about the vertical axis")
    print("reference helices", nh, "; up axis in the 9WSV frame", ax.round(3).tolist())
    rows = []
    for pid, e in ENTRIES.items():
        Rm, t, nk, np_, rmsd = fit[pid]
        M = F @ Rm                                    # model -> view rotation
        tv = F @ (t - cen)
        rc, ac, rnames = contacts(R[pid]["rec"], R[pid]["arr"])
        o = F @ off[pid]
        gr = graft_range(pid, e["rec"])
        graft = None
        if gr:                                        # residues of the V2R tail: in the P42866/P47871 range of the same chain they belong to the receptor proper, not to V2R
            others = [graft_range(pid, e["rec"], a) for a in ("P42866", "P47871")]
            a, b = gr
            lo = max([o_[1] for o_ in others if o_ and o_[1] >= a] + [a - 1]) + 1
            graft = dict(uniprot="P30518", auth_from=lo, auth_to=b, n_receptor_contacts=sum(1 for n in rc if lo <= n <= b))
        modified = sorted(n for n, nm in rnames.items() if nm not in AA3)
        out["entries"][pid] = dict(mode=e["mode"], receptor=e["receptor"], rec_chain=e["rec"], arr_chain=e["arr"], matrix_to_view=np.hstack([M, tv[:, None]]).tolist(),
                                   hide_before=tm1_start(S[pid], e["rec"]), pairs_kept=nk, pairs_total=np_, rmsd_A=round(rmsd, 2), receptor_contacts=rc, arrestin_contacts=ac, modified_contacts={n: rnames[n] for n in modified}, v2r_tail=graft, arrestin_offset_right_A=round(float(o[0]), 1))
        rows.append((pid, e["mode"], e["receptor"], nk, np_, f"{rmsd:.2f}", len(rc), len(ac), f"{o[0]:.1f}"))
        print(pid, e["receptor"], e["mode"], "| fit pairs", nk, "of", np_, "rmsd", round(rmsd, 2), "A | contacts receptor", len(rc), "arrestin", len(ac), "| arrestin centroid right of the receptor axis by", round(float(o[0]), 1), "A")
    TABLES.mkdir(exist_ok=True)
    (TABLES / "geometry.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
    with open(TABLES / "contacts.csv", "w", newline="", encoding="utf-8") as f:
        f.write("# Receptor and arrestin residues with a heavy atom within 4.5 A of the other protein, computed by src/geometry.py from data/<ID>.cif (author chain letters and residue numbers of the entries).\n")
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["pdb", "mode", "receptor", "receptor_chain", "arrestin_chain", "n_receptor_contact_residues", "n_arrestin_contact_residues", "receptor_residues", "arrestin_residues", "modified_residues_included", "v2r_tail_residues", "n_in_v2r_tail", "fit_pairs", "fit_pairs_candidates", "fit_rmsd_A"])
        for pid, e in ENTRIES.items():
            d = out["entries"][pid]
            w.writerow([pid, e["mode"], e["receptor"], e["rec"], e["arr"], len(d["receptor_contacts"]), len(d["arrestin_contacts"]),
                        " ".join(map(str, d["receptor_contacts"])), " ".join(map(str, d["arrestin_contacts"])),
                        " ".join(f"{v}{k}" for k, v in d["modified_contacts"].items()),
                        (f"{d['v2r_tail']['auth_from']}-{d['v2r_tail']['auth_to']}" if d["v2r_tail"] else ""), (d["v2r_tail"]["n_receptor_contacts"] if d["v2r_tail"] else ""),
                        d["pairs_kept"], d["pairs_total"], d["rmsd_A"]])


if __name__ == "__main__":
    main()
