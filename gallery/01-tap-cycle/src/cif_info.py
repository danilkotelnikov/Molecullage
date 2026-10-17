"""Print what the mmCIF header says about each entry: title, resolution, entities, ligands, chains, mutations.

    py -3 -I gallery/01-tap-cycle/src/cif_info.py
"""
from pathlib import Path

import gemmi

DATA = Path(__file__).resolve().parents[1] / "data"
IDS = ["9N61", "9N62", "9N63", "9N64", "9N65", "9N66"]


def table(doc, cat, keys):
    t = doc.sole_block().find(cat, keys)
    return [list(r) for r in t] if t else []


for i in IDS:
    doc = gemmi.cif.read(str(DATA / f"{i}.cif"))
    b = doc.sole_block()
    print("=" * 70, i)
    print(" title:", b.find_value("_struct.title"))
    print(" method:", b.find_value("_exptl.method"), "| EM resolution:", b.find_value("_em_3d_reconstruction.resolution"),
          "| refine d_res_high:", b.find_value("_refine.ls_d_res_high"), "| numparticles:", b.find_value("_em_3d_reconstruction.num_particles"))
    print(" deposited:", b.find_value("_pdbx_database_status.recvd_initial_deposition_date"), "| release:", table(doc, "_pdbx_audit_revision_history.", ["revision_date"])[:1])
    print(" EMDB:", table(doc, "_database_2.", ["database_id", "database_code"]))
    print(" entities:")
    for r in table(doc, "_entity.", ["id", "type", "pdbx_description", "pdbx_number_of_molecules", "pdbx_mutation"]):
        print("   ", r)
    print(" asym (label_asym, entity):", table(doc, "_struct_asym.", ["id", "entity_id"]))
    print(" polymer strands:", table(doc, "_entity_poly.", ["entity_id", "pdbx_strand_id", "nstd_linkage"]))
    print(" nonpoly entities:", table(doc, "_pdbx_entity_nonpoly.", ["entity_id", "name", "comp_id"]))
    print(" source organism / mutation:", table(doc, "_entity_src_gen.", ["entity_id", "pdbx_gene_src_gene", "pdbx_gene_src_scientific_name"]))
    print(" seq dif:", table(doc, "_struct_ref_seq_dif.", ["pdbx_pdb_id_code", "pdbx_pdb_strand_id", "seq_num", "mon_id", "db_mon_id", "details"])[:10])
    print(" em assembly:", table(doc, "_em_entity_assembly.", ["id", "name", "details"]))
    print(" em sample:", b.find_value("_em_experiment.entity_assembly_id"))
    print(" struct_keywords:", b.find_value("_struct_keywords.text"), "|", b.find_value("_struct_keywords.pdbx_keywords"))
    print(" citation:", table(doc, "_citation.", ["title", "journal_abbrev", "year", "pdbx_database_id_DOI"]))
    print(" struct_conf count:", len(table(doc, "_struct_conf.", ["id"])), " atoms:", len(table(doc, "_atom_site.", ["id"])))
    print(" pdbx_database_related:", table(doc, "_pdbx_database_related.", ["db_id", "db_name", "details"])[:6])
    print(" struct_details/ model details:", b.find_value("_struct.pdbx_descriptor"), b.find_value("_struct.pdbx_model_details"))
    st = gemmi.read_structure(str(DATA / f"{i}.cif"))
    for ch in st[0]:
        names = []
        for r in ch:
            if r.het_flag == "H" and r.name != "HOH":
                names.append((r.name, str(r.seqid)))
        seq = [r for r in ch if r.het_flag == "A"]
        print(f"   chain {ch.name}: {len(seq)} polymer residues, first {seq[0].seqid if seq else None} last {seq[-1].seqid if seq else None}; hets {names}")
