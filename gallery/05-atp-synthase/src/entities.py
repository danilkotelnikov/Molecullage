"""List the entities and chains of 9ZFT from the deposited mmCIF and write tables/entities.csv.

    py -3 -I gallery/05-atp-synthase/src/entities.py

Columns: entity id, entity description (as deposited), label_asym_id and auth_asym_id of each chain, residues and
atoms per chain (polymer atoms, first model), and the centroid of the C-alpha atoms. Nothing here is interpreted:
the module of each entity is set in src/modules.py from the paper.
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

from Bio.PDB.MMCIF2Dict import MMCIF2Dict

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
CIF = ROOT / "data" / "pdb" / "9ZFT.cif"


def main() -> None:
    d = MMCIF2Dict(str(CIF))
    ent = dict(zip(d["_entity.id"], d["_entity.pdbx_description"]))
    typ = dict(zip(d["_entity.id"], d["_entity.type"]))
    det = dict(zip(d["_entity.id"], d["_entity.details"]))   # the gene ID of the entity (ACANB#####), "?" when none
    seq_len = {e: len(s.replace("\n", "")) for e, s in zip(d["_entity_poly.entity_id"], d["_entity_poly.pdbx_seq_one_letter_code_can"])}
    asym_ent = dict(zip(d["_struct_asym.id"], d["_struct_asym.entity_id"]))
    rows: dict[str, dict] = {}
    for g, lab, auth, el, at, x, y, z, mod, comp in zip(
        d["_atom_site.group_PDB"], d["_atom_site.label_asym_id"], d["_atom_site.auth_asym_id"], d["_atom_site.type_symbol"],
        d["_atom_site.label_atom_id"], d["_atom_site.Cartn_x"], d["_atom_site.Cartn_y"], d["_atom_site.Cartn_z"],
        d["_atom_site.pdbx_PDB_model_num"], d["_atom_site.label_comp_id"]):
        if mod != "1":
            continue
        r = rows.setdefault(lab, dict(label=lab, auth=auth, entity=asym_ent[lab], n_atoms=0, n_ca=0, ca=[0.0, 0.0, 0.0], group=g))
        r["n_atoms"] += 1
        if at == "CA":
            r["n_ca"] += 1
            for i, v in enumerate((x, y, z)):
                r["ca"][i] += float(v)
    out = []
    for lab, r in sorted(rows.items(), key=lambda kv: (int(kv[1]["entity"]), kv[0])):
        n = max(r["n_ca"], 1)
        out.append(dict(entity=r["entity"], description=ent[r["entity"]], gene_id=det[r["entity"]].replace(chr(10), ""), type=typ[r["entity"]], seq_len=seq_len.get(r["entity"], ""),
                        label_asym=lab, auth_asym=r["auth"], atoms=r["n_atoms"], ca=r["n_ca"],
                        cx=round(r["ca"][0] / n, 2), cy=round(r["ca"][1] / n, 2), cz=round(r["ca"][2] / n, 2)))
    (ROOT / "tables").mkdir(exist_ok=True)
    with open(ROOT / "tables" / "entities.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(out[0]))
        w.writeheader()
        w.writerows(out)
    for r in out:
        print(r["entity"].rjust(2), r["label_asym"].ljust(3), r["auth_asym"].ljust(3), str(r["ca"]).rjust(5), str(r["seq_len"]).rjust(5), r["description"])
    print(len(out), "chains,", len({r["entity"] for r in out}), "entities with atoms;", len(ent), "entities in the file")
    for k in ("_struct.title", "_exptl.method", "_em_3d_reconstruction.resolution", "_refine.ls_d_res_high", "_em_3d_reconstruction.nominal_pixel_size"):
        if k in d:
            print(k, d[k])


if __name__ == "__main__":
    main()
