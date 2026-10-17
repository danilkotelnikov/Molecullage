"""The EC50 values of Tables 1 and 2 of Nakajima et al. 2026 (Protein Science 35(1):e70408, doi 10.1002/pro.70408, CC BY 4.0), copied as printed.

Every entry is (label, sites, mean as printed, SD as printed or None, n, table).
  sites   badge numbers of the sites changed: 1 = L73, 2 = F193, 3 = S359, 4 = C415
  mean    the printed string; None where the table says ND (not determined)
  SD      the printed string; None where the paper gives no SD (single experiment) or no value
  n       3 = "mean +- SD from three independent experiments performed in triplicate"; 1 = "assessed in a single experiment" (the three mutants named in the
          table notes of Tables 1 and 2); None for ND
Units: micromolar (uM), histamine, yeast-based growth assay (strain YB1, Figures 2 and 4 of the paper).
check_tables.py compares this file with the tables of the article text at Europe PMC (PMC12720417).
"""

# Table 2 (single-residue changes), in the order of the table, grouped by site
SINGLE = [
    ("L73M", (1,), "36.3", None, 1, "Table 2"),
    ("L73A", (1,), None, None, None, "Table 2"),
    ("L73F", (1,), None, None, None, "Table 2"),
    ("F193S", (2,), "12.4", None, 1, "Table 2"),
    ("F193A", (2,), "17.8", "6.4", 3, "Table 2"),
    ("F193Y", (2,), None, None, None, "Table 2"),
    ("S359Y", (3,), "7.5", None, 1, "Table 2"),
    ("S359A", (3,), None, None, None, "Table 2"),
    ("S359F", (3,), None, None, None, "Table 2"),
    ("S359Q", (3,), None, None, None, "Table 2"),
    ("C415R", (4,), "4.0", "1.6", 3, "Table 2"),
    ("C415A", (4,), "49", "10", 3, "Table 2"),
    ("C415K", (4,), "10.8", "5.0", 3, "Table 2"),
    ("C415E", (4,), None, None, None, "Table 2"),
    ("C415L", (4,), "148", "65", 3, "Table 2"),
    ("C415Y", (4,), None, None, None, "Table 2"),
]
# Table 1 (two changes together); the paper lists them in another order, this is the order of the site numbers
DOUBLE = [
    ("L73M + F193S", (1, 2), "1.9", "0.5", 3, "Table 1"),
    ("L73M + S359Y", (1, 3), "6.7", "2.1", 3, "Table 1"),
    ("L73M + C415R", (1, 4), "1.4", "0.5", 3, "Table 1"),
    ("F193S + S359Y", (2, 3), "1.0", "0.4", 3, "Table 1"),
    ("F193S + C415R", (2, 4), "0.23", "0.05", 3, "Table 1"),
    ("S359Y + C415R", (3, 4), "8.5", "6.4", 3, "Table 1"),
]
# C415R in Table 1 (the single mutant listed with the doubles); not drawn, named in a note because it differs from Table 2
C415R_TABLE1 = ("3.5", "1.5")
# Table 1 and 2 values of the three mutants assessed once, for the check against the article
SINGLE_RUN = ("L73M", "F193S", "S359Y")
