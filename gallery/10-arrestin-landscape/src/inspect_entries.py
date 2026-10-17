"""List the polymer entities, chains and modelled residue ranges of the rendered entries (exploration helper; reads data/<ID>.cif).

    py -3 -I gallery/10-arrestin-landscape/src/inspect_entries.py 9WSV 8JRV 8ZYU 9IJR 9E82
"""
import sys
from pathlib import Path

import gemmi

DATA = Path(__file__).resolve().parents[1] / "data"
sys.stdout.reconfigure(encoding="utf-8")
for pid in sys.argv[1:]:
    st = gemmi.read_structure(str(DATA / f"{pid}.cif"))
    st.setup_entities()
    print("==", pid, st.resolution, len(st), "model(s)")
    doc = gemmi.cif.read(str(DATA / f"{pid}.cif"))
    b = doc.sole_block()
    ent = {}
    for row in b.find("_entity.", ["id", "type", "pdbx_description"]):
        ent[row[0]] = (row[1], row[2])
    refs = {}
    for row in b.find("_struct_ref.", ["entity_id", "pdbx_db_accession", "db_name", "pdbx_seq_one_letter_code"]):
        refs[row[0]] = (row[1], row[2])
    for e in st.entities:
        if e.entity_type != gemmi.EntityType.Polymer:
            continue
        print(" entity", e.name, ent.get(e.name, ("?", "?"))[1][:70], "| ref", refs.get(e.name), "| subchains", list(e.subchains), "| len", len(e.full_sequence))
    for ch in st[0]:
        poly = ch.get_polymer()
        if len(poly) == 0:
            continue
        print("  chain", ch.name, "entity", poly[0].entity_id if poly else "", "res", poly[0].seqid.num, "-", poly[-1].seqid.num, "n", len(poly))
