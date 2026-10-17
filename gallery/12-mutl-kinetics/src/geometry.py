"""Geometry of the two glutamates and the nucleophilic water in PDB 6LZJ (aqMutL N-terminal domain with AMPPCP), computed from the coordinates.

    py -3 -B -I gallery/12-mutl-kinetics/src/geometry.py          # run fetch_data.py first

The paper numbers aqMutL residues as UniProt does; the file 6LZJ numbers them 7 lower (DBREF: file residues 2-308 = UniProt 9-315). The script checks the offset
on the sequence (the paper's alignment, Fig. 1B, shows ...K-E29-L-V-E32-N33...; in the file K21 E22 L23 V24 E25 N26) and on the DBREF line.
The water taken as the nucleophile is the one water within hydrogen-bond distance (3.2 A heavy atoms) of a carboxylate oxygen of BOTH glutamates; the script asserts
that exactly one water qualifies. Writes tables/6lzj_geometry.json (read by the ChimeraX script and by make_layer.py) and tables/6lzj_distances.csv.
"""
from __future__ import annotations

import csv
import json
import math
from pathlib import Path

HERE = Path(__file__).resolve().parent
GAL = HERE.parent
PDB = GAL / "data" / "6LZJ.pdb"
OFFSET = 7                       # paper number = file number + 7
HB = 3.2                         # hydrogen-bond cut-off for donor-acceptor heavy atoms, angstrom

atoms = []
dbref = None
for l in PDB.read_text().splitlines():
    if l.startswith("DBREF"):
        dbref = l
    if l.startswith(("ATOM", "HETATM")):
        atoms.append(dict(rec=l[:6].strip(), name=l[12:16].strip(), alt=l[16], res=l[17:20].strip(), ch=l[21], num=int(l[22:26]), xyz=(float(l[30:38]), float(l[38:46]), float(l[46:54])), occ=float(l[54:60])))
d = lambda a, b: math.dist(a["xyz"], b["xyz"])
tok = dbref.split()      # DBREF 6LZJ A 2 308 UNP O67518 MUTL_AQUAE 9 315
assert tok[3:5] == ["2", "308"] and tok[8:10] == ["9", "315"], dbref        # file residues 2-308 are UniProt 9-315: offset 7
seq = {}
for a in atoms:
    if a["rec"] == "ATOM":
        seq[a["num"]] = a["res"]
motif = [seq[21 + i] for i in range(6)]
assert motif == ["LYS", "GLU", "LEU", "VAL", "GLU", "ASN"], motif                      # K E L V E N: the paper's Lys28 Glu29 Leu30 Val31 Glu32 Asn33 are file 21 to 26
G29, G32, N33 = 29 - OFFSET, 32 - OFFSET, 33 - OFFSET
assert seq[G29] == "GLU" and seq[G32] == "GLU" and seq[N33] == "ASN"
assert sorted({a["ch"] for a in atoms}) == ["A"]
oe29 = [a for a in atoms if a["num"] == G29 and a["rec"] == "ATOM" and a["name"] in ("OE1", "OE2")]
oe32 = [a for a in atoms if a["num"] == G32 and a["rec"] == "ATOM" and a["name"] in ("OE1", "OE2")]
assert len(oe29) == 2 and len(oe32) == 2 and all(a["alt"] == " " and a["occ"] == 1.0 for a in oe29 + oe32)
wat = [a for a in atoms if a["res"] == "HOH"]
acp = [a for a in atoms if a["res"] == "ACP"]
mg = [a for a in atoms if a["res"] == "MG"]
assert len(mg) == 1 and len(acp) == 31
both = [w for w in wat if min(d(w, o) for o in oe29) <= HB and min(d(w, o) for o in oe32) <= HB]
assert len(both) == 1, [w["num"] for w in both]
w = both[0]
o29 = min(oe29, key=lambda o: d(w, o))
o32 = min(oe32, key=lambda o: d(w, o))
pg = next(a for a in acp if a["name"] == "PG")
out = dict(
    entry="6LZJ", chain="A", resolution_A=1.73, offset_file_to_paper=OFFSET, file_number=dict(Glu29=G29, Glu32=G32, Asn33=N33),
    water=dict(resname="HOH", number=w["num"], xyz=w["xyz"]),
    Glu29_to_water=dict(atom=o29["name"], A=round(d(w, o29), 2)), Glu32_to_water=dict(atom=o32["name"], A=round(d(w, o32), 2)),
    water_to_PG=round(d(w, pg), 2), water_to_Mg=round(d(w, mg[0]), 2), Glu29_to_Glu32_closest_O=round(min(d(a, b) for a in oe29 for b in oe32), 2),
    other_waters_within_3p2_of_either=[dict(number=x["num"], to_Glu29=round(min(d(x, o) for o in oe29), 2), to_Glu32=round(min(d(x, o) for o in oe32), 2)) for x in wat if x is not w and (min(d(x, o) for o in oe29) <= HB or min(d(x, o) for o in oe32) <= HB)],
    ligand=dict(resname="ACP", number=acp[0]["num"], atoms=len(acp)), mg=dict(number=mg[0]["num"]),
)
(GAL / "tables").mkdir(exist_ok=True)
(GAL / "tables" / "6lzj_geometry.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
with open(GAL / "tables" / "6lzj_distances.csv", "w", newline="", encoding="utf-8") as fh:
    fh.write("# Computed from the coordinates of PDB 6LZJ chain A (1.73 A). Paper numbering = file numbering + 7 (Glu29 = file residue 22, Glu32 = file residue 25). Heavy-atom distances in angstrom.\n")
    wr = csv.writer(fh, lineterminator="\n")
    wr.writerow(["from", "to", "distance_A"])
    wr.writerow([f"Glu29 {o29['name']} (file Glu{G29})", f"water HOH {w['num']} O", f"{d(w, o29):.2f}"])
    wr.writerow([f"Glu32 {o32['name']} (file Glu{G32})", f"water HOH {w['num']} O", f"{d(w, o32):.2f}"])
    wr.writerow([f"water HOH {w['num']} O", "AMPPCP PG", f"{d(w, pg):.2f}"])
    wr.writerow([f"water HOH {w['num']} O", "Mg", f"{d(w, mg[0]):.2f}"])
print(json.dumps(out, indent=1))
