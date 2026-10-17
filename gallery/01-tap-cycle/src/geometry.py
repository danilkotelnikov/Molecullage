"""Superpose the six TAP entries, fix one viewing frame, and measure the nucleotide-binding-domain (NBD) gap.

    py -3 -I gallery/01-tap-cycle/src/geometry.py [A|B]        # superpose on the TAP2 transmembrane core (B, default) or on TAP1 (A)

Reads data/<ID>.cif. Writes tables/tap_geometry.json (read by render_tap.py and by the page) and tables/tap_states.csv.

Definitions (all from the coordinates; chain A = TAP1 and chain B = TAP2 in every entry; residue numbers are those of the PDB entries):
  TMD            Calpha of chain A residues 173-484 (model start to the end of TM6, before the TMD-NBD linker 485-491 named in the paper)
                 and of chain B residues 138-449 (the same end of TM6), only residues that have a Calpha in all six entries.
  Superposition  Kabsch fit of the Calpha atoms of the anchor-chain TMD of each entry onto those of 9N63 (the 3.1 A entry). Pairs further
                 than PRUNE_A after the fit are dropped step by step (cutoffs 12, 8, 6, 4.5, 3.5, 3.0 A) and the fit is repeated until no
                 pair is dropped: the pairs that remain are the part of the TMD that keeps its shape between the six states.
  Viewing frame  up = mean axis of the 12 long transmembrane helices of 9N63 (HELX records of 20 or more residues inside the TMDs), signed to point
                 away from the NBDs (towards the ER lumen). right = mean horizontal direction of the NBD gap vector of the six entries
                 (from TAP1 to TAP2). The same rotation is applied to all six entries.
  NBD gap        Calpha-Calpha distance between TAP1 Asp674 (D-loop, motif SALD) and TAP2 His661 (H-loop, motif VIAHR), the two residues
                 on either side of the consensus ATPase site that Fig. 4E of the paper shows moving apart after ATP hydrolysis.
"""
import csv
import json
import re
import sys
from pathlib import Path

import gemmi
import numpy as np

HERE = Path(__file__).resolve().parents[1]
DATA, TABLES = HERE / "data", HERE / "tables"
IDS = ["9N61", "9N62", "9N63", "9N64", "9N65", "9N66"]
REF = "9N63"
TMD = {"A": (173, 484), "B": (138, 449)}
NBD_START = {"A": 492, "B": 457}
PRUNE_A = 3.0
LONG_HELIX = 18
SCHEDULE = (12.0, 8.0, 6.0, 4.5, 3.5, 3.0)
MIN_PAIRS = 100


def ca_map(st, chain):
    out = {}
    for r in st[0][chain]:
        if r.het_flag != "A":
            continue
        a = r.find_atom("CA", "*")
        if a is not None:
            out[r.seqid.num] = np.array(a.pos.tolist())
    return out


def kabsch(P, Q):
    """Rotation R and translation t so that R @ p + t ~ q (least squares)."""
    pc, qc = P.mean(0), Q.mean(0)
    H = (P - pc).T @ (Q - qc)
    U, S, Vt = np.linalg.svd(H)
    d = np.sign(np.linalg.det(Vt.T @ U.T))
    R = Vt.T @ np.diag([1, 1, d]) @ U.T
    return R, qc - R @ pc


def fit_pruned(P, Q, cutoff):
    """Iterative pruned Kabsch fit: at every cutoff of the schedule, refit until no pair is dropped (at least MIN_PAIRS stay)."""
    keep = np.ones(len(P), bool)
    for c in [s for s in SCHEDULE if s >= cutoff]:
        while True:
            R, t = kabsch(P[keep], Q[keep])
            dev = np.linalg.norm((P @ R.T + t) - Q, axis=1)
            new = keep & (dev <= c)
            if new.sum() < MIN_PAIRS:
                new = keep & (dev <= np.sort(dev[keep])[MIN_PAIRS - 1])
            if (new == keep).all():
                break
            keep = new
    R, t = kabsch(P[keep], Q[keep])
    return R, t, keep, np.linalg.norm((P @ R.T + t) - Q, axis=1)


def motif(seq_by_num, pat):
    nums = sorted(seq_by_num)
    s = "".join(seq_by_num[n] for n in nums)
    m = re.search(pat, s)
    return None if m is None else [nums[k] for k in range(m.start(), m.end())]


def main(anchor="B"):
    other = "B" if anchor == "A" else "A"
    sts = {}
    for i in IDS:
        s = gemmi.read_structure(str(DATA / f"{i}.cif"))
        s.setup_entities()
        sts[i] = s
    cas = {i: {c: ca_map(sts[i], c) for c in "AB"} for i in IDS}
    one = {c: {r.seqid.num: gemmi.find_tabulated_residue(r.name).one_letter_code.upper() for r in sts[REF][0][c] if r.het_flag == "A"} for c in "AB"}

    dloop = motif(one["A"], r"SALD")[3]              # TAP1 D-loop Asp (D674)
    hloop = motif(one["B"], r"VIAHR")[3]             # TAP2 H-loop His (H661)
    assert (one["A"][dloop], one["B"][hloop]) == ("D", "H"), (one["A"][dloop], one["B"][hloop])
    print("gap pair: TAP1 %s%d (D-loop) - TAP2 %s%d (H-loop)" % (one["A"][dloop], dloop, one["B"][hloop], hloop))

    common = {c: [n for n in range(TMD[c][0], TMD[c][1] + 1) if all(n in cas[i][c] for i in IDS)] for c in "AB"}
    print("TMD residues with a Calpha in all six: TAP1 %d of %d, TAP2 %d of %d" % (len(common["A"]), TMD["A"][1] - TMD["A"][0] + 1, len(common["B"]), TMD["B"][1] - TMD["B"][0] + 1))
    Q = np.array([cas[REF][anchor][n] for n in common[anchor]])

    # ---- membrane normal: mean axis of the long TM helices of the reference
    b = gemmi.cif.read(str(DATA / f"{REF}.cif")).sole_block()
    helices = []
    for r in b.find("_struct_conf.", ["beg_auth_asym_id", "beg_auth_seq_id", "end_auth_seq_id"]):
        ch, s, e = r[0], int(r[1]), int(r[2])
        if ch in "AB" and s >= TMD[ch][0] and e <= TMD[ch][1] and e - s + 1 >= LONG_HELIX:
            helices.append((ch, s, e))
    nbd_c = np.mean([v for c in "AB" for n, v in cas[REF][c].items() if n >= NBD_START[c]], axis=0)
    axes = []
    for ch, s, e in helices:
        X = np.array([cas[REF][ch][n] for n in range(s, e + 1) if n in cas[REF][ch]])
        u = np.linalg.svd(X - X.mean(0))[2][0]
        axes.append(u if u @ (X.mean(0) - nbd_c) > 0 else -u)
    axes = np.array(axes)
    up_ref = axes.mean(0)
    up_ref /= np.linalg.norm(up_ref)
    tilt = np.degrees(np.arccos(np.clip(axes @ up_ref, -1, 1)))
    print("long TM helices: %d, angle to the mean axis median %.1f deg, max %.1f deg" % (len(axes), np.median(tilt), tilt.max()))

    # ---- superposition of every entry on the reference (anchor chain TMD)
    fits = {}
    for i in IDS:
        P = np.array([cas[i][anchor][n] for n in common[anchor]])
        R, t, keep, dev = fit_pruned(P, Q, PRUNE_A)
        fits[i] = (R, t, keep, dev)
    # ---- viewing frame: right = mean horizontal gap vector (TAP1 -> TAP2) after superposition
    gsum = np.zeros(3)
    for i in IDS:
        R, t = fits[i][:2]
        g = (R @ cas[i]["B"][hloop] + t) - (R @ cas[i]["A"][dloop] + t)
        gsum += g - (g @ up_ref) * up_ref
    xr = gsum / np.linalg.norm(gsum)
    zr = np.cross(xr, up_ref)
    F = np.stack([xr, up_ref, zr])
    assert abs(np.linalg.det(F) - 1) < 1e-9
    o = np.concatenate([[cas[REF][anchor][n] for n in common[anchor]], [cas[REF][other][n] for n in common[other]]]).mean(0)

    out = {"reference": REF, "anchor_chain": anchor, "tmd": TMD, "prune_A": PRUNE_A, "n_tmd": {c: len(common[c]) for c in "AB"},
           "gap_pair": {"A": dloop, "B": hloop}, "n_helices": len(helices), "helix_axis_median_tilt_deg": round(float(np.median(tilt)), 1),
           "helix_axis_max_tilt_deg": round(float(tilt.max()), 1), "entries": {}}
    rows = []
    for i in IDS:
        R, t, keep, dev = fits[i]
        Rv, tv = F @ R, F @ (t - o)
        M = np.eye(4)
        M[:3, :3], M[:3, 3] = Rv, tv
        Po = np.array([cas[i][other][n] for n in common[other]])
        Qo = np.array([cas[REF][other][n] for n in common[other]])
        dev_o = np.linalg.norm(Po @ R.T + t - Qo, axis=1)
        pa, pb = Rv @ cas[i]["A"][dloop] + tv, Rv @ cas[i]["B"][hloop] + tv
        gap = float(np.linalg.norm(cas[i]["A"][dloop] - cas[i]["B"][hloop]))
        assert abs(np.linalg.norm(pa - pb) - gap) < 1e-6
        inplane = float(np.linalg.norm((pa - pb)[:2]))
        lig = [f"{r.name} {ch.name}{r.seqid.num}" for ch in sts[i][0] for r in ch if r.het_flag == "H" and r.name != "HOH"]
        blk = gemmi.cif.read(str(DATA / f"{i}.cif")).sole_block()
        resolution = float(list(blk.find("_em_3d_reconstruction.", ["resolution"]))[0][0])
        title = blk.find_value("_struct.title").strip("'\"")
        out["entries"][i] = {"matrix_to_view": M.tolist(), "n_fit_pairs": int(keep.sum()), "fit_rmsd_A": round(float(np.sqrt(np.mean(dev[keep] ** 2))), 2),
                             "other_tmd_median_dev_A": round(float(np.median(dev_o)), 1), "gap_A": round(gap, 1), "gap_inplane_A": round(inplane, 1),
                             "inplane_fraction": round(inplane / gap, 3), "resolution_A": resolution, "title": title, "ligands": lig,
                             "gap_atoms_view_A": {"A": pa.tolist(), "B": pb.tolist()}}
        rows.append([i, resolution, int(keep.sum()), round(float(np.sqrt(np.mean(dev[keep] ** 2))), 2), round(float(np.median(dev_o)), 1), round(gap, 1), round(inplane / gap, 2), "; ".join(lig), title])
        print("%s res %.1f | %s TMD pairs kept %3d/%d rmsd %.2f A | %s TMD median dev %4.1f A | gap %5.1f A, in-plane share %.2f | %s" %
              (i, resolution, anchor, keep.sum(), len(keep), np.sqrt(np.mean(dev[keep] ** 2)), other, np.median(dev_o), gap, inplane / gap, lig))
    TABLES.mkdir(exist_ok=True)
    (TABLES / "tap_geometry.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
    with open(TABLES / "tap_states.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["pdb", "resolution_A", "anchor_tmd_pairs_kept", "anchor_tmd_fit_rmsd_A", "other_tmd_median_dev_A", "nbd_gap_A", "gap_inplane_share", "ligands", "title"])
        w.writerows(rows)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "B")
