"""Candidate NBD gap definitions across the six entries: Calpha-Calpha distances in A for pairs of motif residues across the two ATPase sites.

    py -3 -I gallery/01-tap-cycle/src/gap_candidates.py

Not part of the build. It records why the figure uses TAP1 Asp674 (D-loop) to TAP2 His661 (H-loop): that pair sits on the two sides of the consensus site and is the
motion that Fig. 4E of the paper describes after ATP hydrolysis (D-loop of NBD1 and H-loop of NBD2 move apart, about 3 A). It was chosen from this table after reading
the paper, not from the numbers alone; the textbook pair signature Ser644 to Walker A Gly506 is listed too and does not separate 9N63 from 9N66 (6.3 against 5.6 A).
"""
import re
from pathlib import Path

import gemmi
import numpy as np

DATA = Path(__file__).resolve().parents[1] / "data"
IDS = ["9N61", "9N62", "9N63", "9N64", "9N65", "9N66"]
st = {i: gemmi.read_structure(str(DATA / f"{i}.cif")) for i in IDS}


def ca(i, ch, n):
    for r in st[i][0][ch]:
        if r.seqid.num == n and r.het_flag == "A":
            return np.array(r.find_atom("CA", "*").pos.tolist())
    return None


seqs = {}
for ch in "AB":
    seqs[ch] = {r.seqid.num: gemmi.find_tabulated_residue(r.name).one_letter_code.upper() for r in st["9N61"][0][ch] if r.het_flag == "A"}


def find(ch, pat):
    nums = sorted(seqs[ch])
    s = "".join(seqs[ch][n] for n in nums)
    return [nums[m.start()] for m in re.finditer(pat, s)]


print("TAP2 H-loop VIAHR at", find("B", "VIAHR"), " TAP1 H-loop (ITQH) at", find("A", "ITQHL"))
print("TAP1 D-loop SALD", find("A", "SALD"), "TAP2 D-loop SALD", find("B", "SALD"))
print("Q-loop TAP1", find("A", "VGQEP"), "TAP2", find("B", "VGQEP"), "A-loop Y TAP1", find("A", "FAYP"), "TAP2", find("B", "FAYP"))
hB = find("B", "VIAHR")[0] + 3   # H of VIAHR
hA = find("A", "ITQHL")[0] + 3
print("H-loop His: B", hB, seqs["B"][hB], " A", hA, seqs["A"][hA])
pairs = {
    "cons D-loop A674 - H-loop B%d" % hB: [("A", 674), ("B", hB)],
    "cons sig S644(A) - WalkerA G506(B)": [("A", 644), ("B", 506)],
    "cons sig S644(A) - WalkerA K509(B)": [("A", 644), ("B", 509)],
    "cons sig G646(A) - WalkerA K509(B)": [("A", 646), ("B", 509)],
    "cons sig Q647(A) - WalkerB E632(B)": [("A", 647), ("B", 632)],
    "cons sig S644(A) - WalkerB E632(B)": [("A", 644), ("B", 632)],
    "deg D-loop B638 - H-loop A%d" % hA: [("B", 638), ("A", hA)],
    "deg sig A608(B) - WalkerA G541(A)": [("B", 608), ("A", 541)],
    "deg sig A608(B) - WalkerA K544(A)": [("B", 608), ("A", 544)],
    "A:N540 - B:D638 (paper H-bonds)": [("A", 540), ("B", 638)],
    "A:G541 - B:G506": [("A", 541), ("B", 506)],
    "A:K544 - B:K509": [("A", 544), ("B", 509)],
    "A:S644 - B:S608": [("A", 644), ("B", 608)],
}
print("%-45s" % "pair", *IDS)
for name, ((c1, n1), (c2, n2)) in pairs.items():
    vals = []
    for i in IDS:
        a, b = ca(i, c1, n1), ca(i, c2, n2)
        vals.append("%6.1f" % np.linalg.norm(a - b) if a is not None and b is not None else "   n/a")
    print("%-45s" % name, *vals)

# NBD centroid distance (all NBD Calpha) and nearest approach between the two NBDs
for i in IDS:
    A = np.array([ca(i, "A", n) for n in sorted(seqs["A"]) if n >= 492 and ca(i, "A", n) is not None])
    B = np.array([ca(i, "B", n) for n in sorted(seqs["B"]) if n >= 457 and ca(i, "B", n) is not None])
    d = np.linalg.norm(A[:, None] - B[None], axis=2)
    print(i, "NBD centroid distance %.1f A; closest Calpha pair %.1f A" % (np.linalg.norm(A.mean(0) - B.mean(0)), d.min()))
