"""Run inside .venv-tools: trim a PDB file to some chains and write the mmCIF that pdbe-arpeggio reads.

    .venv-tools/Scripts/python struct/_arpeggio_prep.py in.pdb out.cif A,L
"""
import sys

import gemmi

src, dst, keep = sys.argv[1], sys.argv[2], sys.argv[3].split(",")
st = gemmi.read_structure(src)
st.setup_entities()
for name in [c.name for c in st[0]]:
    if name not in keep:
        st[0].remove_chain(name)
st.make_mmcif_document().write_file(dst)
