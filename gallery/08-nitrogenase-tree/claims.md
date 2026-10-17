# What every element of the figure rests on

Source data = `Figure4SourceData1.tree`, `Figure4SourceData2.csv`, `Figure4SourceData3.csv` of Cuevas Zuviría et al. 2025 (eLife 14:RP105613, version of record), in `data/fig4/` after `fetch_data.py`. SF6 = Supplementary file 6 of the paper.

| Element | Source | Kind |
|---|---|---|
| Tree topology, 769 nodes, branch lengths | `.tree` file; outgroup clade (node 822) cut off | source data |
| Root, dashed stub | edge above node 822 (the authors' R code roots on 822); the stub is not to scale, the file gives no root stem | computed here |
| Order of the rows | children ordered by group (Nif-III, Vnf, Anf, Nif-I, Nif-II), then smaller subtree first, then node number; each group is one block (asserted) | computed here |
| Clade strips (names), bands, right bars | `clade` and `nitrogenase_type` columns of Source data 3 | source data |
| "Vnf and Anf sit inside Nif-III" | Results, first section; tree: last common ancestor of the Nif-III tips (node 820) holds both | paper text, checked on the tree |
| "Anf sits inside Vnf" | tree: last common ancestor of the 17 Vnf tips (node 802) holds all 17 Anf tips; one Vnf tip is sister to the Anf clade (node 787); asserted in `make_layer.py` | computed here |
| Node 802 counts as a Nif-III ancestor | `clade` of `Anc_802` in Source data 3 is nif-iii; asserted | source data |
| 385 living, 384 ancestors, 5,378 structures | Results text, Source data 3, Zenodo `index.csv` | paper text, checked |
| Scale bar 0.5, "amino-acid substitutions per site", "branch lengths are to scale" | file has no unit; unit as in the scale bar of Fig. 3A ("aa sub/site"); the bar is 0.5 x 15.4 mm, asserted against the drawn tree | paper figure label |
| Matrix columns: surface area (Å²), contacts (residue pairs), ΔG (kcal/mol) | `total_area`, `intermolecular_contacts`, `binding_affinity`; units and meanings from SF6 | source data |
| Grey scale and its legend (lighter to darker, smaller to larger; ΔG less to more stable) | lowest to highest of the 385 living rows (ΔG reversed); "the lower, the more stable" is SF6 | computed here, wording from SF6 |
| Discs D, K | last common ancestor of the clade's tips (Anf node 786, Nif-I 1207, Nif-II 1345) and its parent; the paper: "the branch leading to the last common ancestor of the clade"; the disc rests above or below the thick branch | computed here, placement as the paper's text |
| Clade named beside each disc | the clade whose last common ancestor the branch leads to | computed here |
| "K appears first, then lengthens later" | Results: the K extension "evolved progressively in length ... through several deep-time ancestors of the Nif-I clade" | paper text |
| Node numbers 786, 787, 1206, 1207, 1345 | printed in Fig. 3; the tree reproduces them (asserted in `make_layer.py`) | paper figure label, checked |
| Rings 1 to 3 and the numbers in the inset headers | tips `Anf_Azotobacter_vinelandii` (8BOQ), `Nif_Azotobacter_vinelandii` (3U7Q), `Nif_Clostridium_pasteurianum` (4WES); numbered in the order of the rows (asserted); organisms from RCSB | source data and RCSB |
| Leaders from the right bars to the frames | start at the bar edge, inside the rows of the clade of the entry, end at the frame (asserted) | computed here |
| Insets | mmCIF of 3U7Q, 4WES, 8BOQ; chains D (NifD, AnfD) and K (NifK, AnfK) | deposited structures |
| Letters D and K on the renders | middle of the largest visible patch of each grey in the trimmed PNG | computed here |
| Inserted segments and their lengths (43, 52, 52 residues) | pairwise alignment of the entries' sequences (`spans.py`) against the relative named in each inset (3U7Q chain D, 4WES chain K, 3U7Q chain D; 8BOQ also 34 against 4WES chain D); the paper's values are "about 8 to 40", "about 55", "about 60" | computed here |
| Resolution 1.00, 1.08, 1.55 Å | `_refine.ls_d_res_high` of the mmCIF files (8BOQ: 1.547) | PDB |
| Table medians and counts | recomputed from Source data 3 (`verify.py` does it again with other code) | computed here |
| "Medians over an even count can end in .5" | 983.5 and 991.5 are medians of 34 and 32 values | computed here |
| "Nif-I: most contacts, lowest ΔG; Nif-II: largest surface area" | Results, "Phylogenetic trends of nitrogenase DDKK complex structures"; the figure says that the order of the medians matches | paper text |
| "AlphaFold2 predictions" | Results and Methods (ColabFold, AlphaFold2, no templates) | paper text |
| Credit and second credit line | the second line states what is computed here (medians, segment lengths) | computed here |
| Not drawn | taxonomy colours (Fig. 4A), charged residue fraction (not in the source data), the growth of the K extension through nodes 1209 and 1224, the experimental ancestors 9HB9, 9HBN, 9HBC, HH structures | said in `how.md` |
