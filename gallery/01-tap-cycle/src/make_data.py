"""Write page/data.js (window.DATA) for the figure page from the entries and tables/tap_geometry.json.

    py -3 -I gallery/01-tap-cycle/src/make_data.py

Everything the page prints about a structure comes from here: PDB id, EM resolution (_em_3d_reconstruction.resolution), the nucleotide
and peptide per chain (residue names of the mmCIF), the EQ marker (the entry title says "EQ mutant"), the gap (tap_geometry.json).
"""
import json
from pathlib import Path

import gemmi

HERE = Path(__file__).resolve().parents[1]
G = json.loads((HERE / "tables" / "tap_geometry.json").read_text(encoding="utf-8"))
NUC = {"ATP": "ATP", "ADP": "ADP"}
out = {}
for i, e in G["entries"].items():
    st = gemmi.read_structure(str(HERE / "data" / f"{i}.cif"))
    st.setup_entities()
    chains = {}
    for ch in st[0]:
        names = [r.name for r in ch if r.het_flag == "H" and r.name in NUC]
        if ch.name in "AB":
            chains[ch.name] = names
    pep = ""
    for ent in st.entities:
        if ent.polymer_type == gemmi.PolymerType.PeptideL and len(ent.full_sequence) < 20:
            pep = "".join(gemmi.find_tabulated_residue(x).one_letter_code.upper() for x in ent.full_sequence)
    blk = gemmi.cif.read(str(HERE / "data" / f"{i}.cif")).sole_block()
    title = blk.find_value("_struct.title").strip("'\"")
    out[i] = {
        "id": i, "resolution": e["resolution_A"], "gap": e["gap_A"], "gapInplane": e["gap_inplane_A"], "title": title,
        "eq": "EQ mutant" in title, "nucA": chains.get("A", []), "nucB": chains.get("B", []), "peptide": pep,
        "fitPairs": e["n_fit_pairs"], "fitRmsd": e["fit_rmsd_A"],
    }
meta = {"anchor": G["anchor_chain"], "reference": G["reference"], "gapPair": G["gap_pair"], "nTmd": G["n_tmd"], "prune": G["prune_A"]}
(HERE / "page").mkdir(exist_ok=True)
(HERE / "page" / "data.js").write_text("window.DATA = " + json.dumps({"states": out, "meta": meta}, indent=1) + ";\n", encoding="utf-8")
for i, d in out.items():
    print(i, d["resolution"], d["gap"], d["nucA"], d["nucB"], d["peptide"], "EQ" if d["eq"] else "WT")
