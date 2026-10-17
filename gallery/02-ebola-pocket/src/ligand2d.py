"""Flat 2D drawing of the inhibitor from its bond graph (RDKit CoordGen), with wedge and hash bonds for the three stereocentres.
Needs RDKit; the result is committed, so a rebuild does not.

    python src/ligand2d.py          # run where RDKit exists (here: WSL conda env chai-1, RDKit 2024.09.6)

Reads src/ligand_graph.json. Checks the formula against the chemical component (C42 H33 Cl F3 N5 O2). The stereocentres are taken from the deposited
coordinates of the ligand (residue A:401): RDKit assigns R or S from the 3D structure and the labels must equal those of the component
(C02 R, C26 R, C37 S). The 2D coordinates are then drawn flat and RDKit chooses the wedge or hash bond that shows each centre. Writes src/ligand2d.json:
atom positions in bond-length units (1.0 = one bond), bonds, rings, hydrogen counts (for labels such as NH), wedge bonds (narrow end at the stereocentre),
and the RDKit version. The page may rotate this drawing but must not mirror it: a mirror image would swap wedge and hash. The (2P) axis of the
compound (the bond between quinoline and benzimidazole) is not marked.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

from rdkit import Chem, __version__ as RDV
from rdkit.Chem import rdDepictor, rdMolDescriptors
from rdkit.Geometry import Point3D

HERE = Path(__file__).resolve().parent
g = json.loads((HERE / "ligand_graph.json").read_text(encoding="utf-8"))
ORDER = {"SING": Chem.BondType.SINGLE, "DOUB": Chem.BondType.DOUBLE, "TRIP": Chem.BondType.TRIPLE}

m = Chem.RWMol()
idx = {}
for a in g["atoms"]:
    idx[a["name"]] = m.AddAtom(Chem.Atom(a["element"]))
for b in g["bonds"]:
    m.AddBond(idx[b["a"]], idx[b["b"]], ORDER[b["order"].upper()])
mol = m.GetMol()
Chem.SanitizeMol(mol)
formula = rdMolDescriptors.CalcMolFormula(mol)
assert formula == "C42H33ClF3N5O2", formula   # matches _chem_comp.formula of A1CIK in 9PEL

# stereo from the deposited 3D coordinates
conf3 = Chem.Conformer(mol.GetNumAtoms())
for a in g["atoms"]:
    conf3.SetAtomPosition(idx[a["name"]], Point3D(*a["xyz"]))
conf3.Set3D(True)
mol.AddConformer(conf3, assignId=True)
Chem.AssignStereochemistryFrom3D(mol)
names = [a["name"] for a in g["atoms"]]
cip = {names[i]: a.GetProp("_CIPCode") for i, a in enumerate(mol.GetAtoms()) if a.HasProp("_CIPCode")}
want = {a["name"]: a["stereo"] for a in g["atoms"] if a["stereo"]}
assert cip == want, f"stereo from 3D {cip} differs from the component {want}"

# flat drawing; wedge or hash bonds from the stereo tags and the flat coordinates
flat = Chem.Mol(mol)
flat.RemoveAllConformers()
rdDepictor.SetPreferCoordGen(True)
rdDepictor.Compute2DCoords(flat)
Chem.WedgeMolBonds(flat, flat.GetConformer())
conf = flat.GetConformer()
pos = {n: (conf.GetAtomPosition(idx[n]).x, conf.GetAtomPosition(idx[n]).y) for n in names}
bl = sum(math.dist(pos[b["a"]], pos[b["b"]]) for b in g["bonds"]) / len(g["bonds"])
wedges = []
for bd in flat.GetBonds():
    d = bd.GetBondDir()
    if d in (Chem.BondDir.BEGINWEDGE, Chem.BondDir.BEGINDASH):
        wedges.append({"from": names[bd.GetBeginAtomIdx()], "to": names[bd.GetEndAtomIdx()], "kind": "wedge" if d == Chem.BondDir.BEGINWEDGE else "hash"})
assert sorted(w["from"] for w in wedges) == ["C02", "C26", "C37"], wedges
rings = [[names[i] for i in r] for r in flat.GetRingInfo().AtomRings()]
out = {
    "rdkit": RDV, "formula": formula, "mean_bond_length_in_rdkit_units": round(bl, 4), "stereo_from_3d": cip,
    "atoms": [{"name": a["name"], "element": a["element"], "x": round(pos[a["name"]][0] / bl, 4), "y": round(pos[a["name"]][1] / bl, 4),
               "h": flat.GetAtomWithIdx(idx[a["name"]]).GetTotalNumHs()} for a in g["atoms"]],
    "bonds": [{"a": b["a"], "b": b["b"], "order": b["order"]} for b in g["bonds"]],
    "wedges": wedges,
    "rings": [{"atoms": r, "aromatic": all(flat.GetAtomWithIdx(idx[n]).GetIsAromatic() for n in r)} for r in rings],
}
(HERE / "ligand2d.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
print(RDV, formula, len(out["atoms"]), "atoms", len(out["rings"]), "rings; stereo", cip, "; wedges", wedges)
