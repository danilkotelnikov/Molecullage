"""Read the atoms and bonds of the inhibitor (component A1CIK, MWAC-3634) from the chem_comp tables inside data/pdb/9PEL.cif, with the 3D coordinates of the
copy in chain A and the stereo labels of the component.

    py -3 -I gallery/02-ebola-pocket/src/ligand_graph.py

Writes src/ligand_graph.json: heavy atoms with element, aromatic flag, deposited stereo label (R or S where the component defines one) and the
coordinates of residue A:401; bonds with order. The deposited file carries the component description of the ligand, so no other download is needed.
src/ligand2d.py turns this into 2D coordinates and wedge or hash bonds.
"""
from __future__ import annotations

import json
from pathlib import Path

import gemmi

ROOT = Path(__file__).resolve().parents[1]
COMP = "A1CIK"


def main() -> None:
    path = str(ROOT / "data" / "pdb" / "9PEL.cif")
    b = gemmi.cif.read(path).sole_block()
    atoms = [(r[1], r[2], r[3] == "Y", r[4]) for r in b.find("_chem_comp_atom.", ["comp_id", "atom_id", "type_symbol", "pdbx_aromatic_flag", "pdbx_stereo_config"]) if r[0] == COMP]
    bonds = [(r[1], r[2], r[3], r[4] == "Y") for r in b.find("_chem_comp_bond.", ["comp_id", "atom_id_1", "atom_id_2", "value_order", "pdbx_aromatic_flag"]) if r[0] == COMP]
    st = gemmi.read_structure(path)
    lig = next(r for r in st[0]["A"] if r.name == COMP)
    xyz = {a.name: [round(a.pos.x, 3), round(a.pos.y, 3), round(a.pos.z, 3)] for a in lig}
    heavy = {a for a, e, _, _ in atoms if e != "H"}
    out = {
        "component": COMP,
        "source": "data/pdb/9PEL.cif: _chem_comp_atom, _chem_comp_bond, and the coordinates of residue A:401",
        "atoms": [{"name": a, "element": e.capitalize(), "aromatic": ar, "stereo": (s if s in ("R", "S") else ""), "xyz": xyz[a]} for a, e, ar, s in atoms if a in heavy],
        "bonds": [{"a": x, "b": y, "order": o, "aromatic": ar} for x, y, o, ar in bonds if x in heavy and y in heavy],
        "n_heavy": len(heavy),
    }
    assert out["n_heavy"] == 53, out["n_heavy"]   # C42 Cl F3 N5 O2
    assert sorted(a["name"] + a["stereo"] for a in out["atoms"] if a["stereo"]) == ["C02R", "C26R", "C37S"], "stereocentres of the component changed"
    (Path(__file__).with_name("ligand_graph.json")).write_text(json.dumps(out, indent=1), encoding="utf-8")
    print(f"{out['n_heavy']} heavy atoms, {len(out['bonds'])} bonds, stereocentres C02 R, C26 R, C37 S -> src/ligand_graph.json")


if __name__ == "__main__":
    main()
