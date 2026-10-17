"""Which entity of PDB 9ZFT is which subunit of which module. Data only; imported by tones.py and the page builder.

Subunit names, the three modules and the de novo / homology marks are those of the table in Fig. 1F of Fry et al., Cell 2026
(columns "Domain", "Subunit", "GeneID", "Cryo-EM structure"). The join to the deposited entry is the gene ID: the entry
stores it in _entity.details of each entity, and tones.py asserts that it equals the gene ID of the table.
Entity numbers and deposited names are those of the mmCIF (src/entities.py writes tables/entities.csv).

mark: "dot" = identified directly from the density (de novo), "star" = by homology (legend of Fig. 1F).
"""
from __future__ import annotations

MODULES = [
    # id, name as in the paper's "Domain" column, colour family of tokens/tokens.base.json
    ("F1", "F1", "indigo"),
    ("Fo", "Fo", "apricot"),
    ("Stalk", "Stalk", "rose"),
]

# key, label on the figure, module, entity ids in 9ZFT, gene ID (Fig. 1F and the entry), mark in Fig. 1F
SUBUNITS = [
    ("alpha", "α", "F1", [16], "ACANB15922", "dot"),
    ("beta", "β", "F1", [17], "ACANB02410", "dot"),
    ("gamma", "γ", "F1", [3], "ACANB07530", "dot"),
    ("delta", "δ", "F1", [5], "ACANB02409", "dot"),
    ("epsilon", "ε", "F1", [9], "ACANB12077", "star"),
    ("IF1", "IF1", "F1", [7], "ACANB08262", "star"),
    ("Atp6", "Atp6", "Fo", [1], "ACANB15943", "dot"),
    ("c", "c", "Fo", [14], "ACANB15917", "star"),
    ("f", "f", "Fo", [12], "ACANB14194", "dot"),
    ("ij", "i/j", "Fo", [11], "ACANB04724", "dot"),
    ("s8", "8", "Stalk", [2], "ACANB15938", "dot"),
    ("b", "b", "Stalk", [4], "ACANB15939", "dot"),
    ("d", "d", "Stalk", [6], "ACANB10705", "dot"),
    ("OSCP", "OSCP", "Stalk", [8], "ACANB01783", "dot"),
    ("s04460", "04460", "Stalk", [15], "ACANB04460", "star"),
    ("MASA", "MASA", "Stalk", [13], "ACANB14707", "dot"),
    ("MDH", "MDH", "Stalk", [10], "ACANB11954", "dot"),
]
# entities 18 to 21 are named "unknown protein" in the entry and have no gene ID: drawn grey, no module
UNASSIGNED = ("unk", "unassigned", None, [18, 19, 20, 21], None, None)
