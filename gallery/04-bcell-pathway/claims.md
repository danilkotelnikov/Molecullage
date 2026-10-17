# Where each part of the figure comes from

Paper: Kalchschmidt et al. 2025, Cell Reports 44(10):116361 (PMC12594101). "Results" sections are named as in the article; paragraphs are counted from the top of each section, figure legends not counted. Tables are the paper's supplementary tables (`fetch_data.py`). Panels a and b show reporter brightness and regulators from the screens; panel c shows RNA-seq (DESeq2) changes of genes. The figure says so in panel c.

Colours: dark blue = a step or pathway; pale blue = a gene or gene group; cream = a count. Purple and apricot = the role of a regulator (panel b only). Maroon and mint = RNA up or down after a drug (panel c only). No colour has two meanings. Neither pair is red against green; worst-case colour-vision distance (CIEDE2000, `palette/colour.py`): purple to apricot 28.3, maroon to mint 35.5.

## a Cells

| Figure element | Source |
|---|---|
| 47 reporter cell lines, SU-DHL-4, a fluorescent tag (mOrange or GFP) in each gene | Introduction paragraph 3; Results "A B cell gene reporter panel" paragraph 1; Table S1 (47 genes, 12 mOrange, 35 GFP) |
| Each gene has its own tagged line and its own screen | Results "A comprehensive B cell regulatory network" paragraph 1 ("screens across all 47 reporter cell lines") |
| Tag brightness tracks expression | "A B cell gene reporter panel" paragraph 1 (reporter against RNA-seq, R^2 = 0.92). It holds at baseline; for MYC and MCL1 under rapamycin reporter and mRNA disagree (see below) |
| Four group names | same paragraph |
| Which gene sits in which group | read from the paper's Fig. 2A (stated in the panel: "Groups follow Fig. 2A"). The text names only BCL6, MYC, OCT2 and PAX5 (nuclear group). Sizes 15 + 6 + 2 + 24 = 47. Table S1 has no group column. PLCG2 (drawn on the branch to NF-kB) and PIK3AP1 (between SYK and PI3K) are the builder's reading of Fig. 2A; group borders are approximate |
| Gene names | as printed in Fig. 2A and the text. Table S1 and S3 symbols: CD20 = MS4A1, CD45 = PTPRC, OCT2 = POU2F2, OCAB = POU2AF1 (S1 "OcaB"), IGH (S1 "IgH"), IGK (S1 "IgKappa"). `tables/reporters_47.csv` lists both |
| No arrows between groups | the text states none. Fig. 2A draws about 18 pathway arrows; none is in the text, so none is drawn |

## b Screen

| Figure element | Source |
|---|---|
| CRISPR screens, genes knocked out one per cell, dimmest and brightest 5% sorted | Results "Human B cell CRISPR-Cas9 gene regulatory screens" paragraph 1 (Brunello library, all protein-coding genes; top and bottom 5%); Methods "Genome-wide CRISPR/Cas9 regulator screens" (MOI 0.3) |
| Regulator: loss changes a reporter's brightness | same paragraph (activators and repressors, "directly or indirectly") |
| 4,440 regulators = 1,685 + 1,002 + 1,753; 17,638 links = 6,487 + 11,151 | Results "A comprehensive B cell regulatory network" paragraph 2; Methods "Gene regulatory network"; Fig. 3B; recounted from Table S3A and S3B by `src/derive.py` |
| "Both" = a regulator that is an activator for some reporters and a repressor for others | same paragraph ("1,002 context-dependent regulators that acted as activators for some genes and as repressors for others"). Defined in panel b and in the key |
| Group 1 (17 genes), group 2 (18 genes), example names | Results "Broad bi-phasic impact of mTOR signaling" paragraph 1 (BCL-XL, MSH6, MSH2, E2F2; CD79A, MEF2B, OCAB, CD79B) and paragraph 3 (MSH6 group 1, IGK group 2); Fig. 5A. Stated in the panel: "text and Fig. 5A". The other 12 of the 47 reporter genes are not described by the paper and are not drawn |
| Ribosome, translation and mTORC1 regulators activate group 1 and repress group 2 | same section, paragraphs 3 to 5 |
| The box is a subset of the 4,440 regulators | paragraph 3 ("175 out of 282 ribosome regulators (62%) functioned as both activators and repressors"); the box is the ribosome, translation and mTORC1 clusters of Fig. 5B and 5F |

## c Analysis

| Figure element | Source |
|---|---|
| RNA-seq, log2 fold change against solvent control (+1 twice as high) | Methods "RNA-seq analysis" (DESeq2); inhibitors dissolved in DMSO, treated against DMSO (Methods "Inhibitor treatments"). Not reporter brightness: the sub-title says so |
| Rapamycin blocks mTORC1; LY2090314 blocks GSK3; 2 days | "Broad bi-phasic" paragraph 4; "GSK3 counteracts mTOR" paragraph 3; Methods "Inhibitor treatments" |
| 2,458 genes changed by rapamycin (1,277 up, 1,181 down) | "mTOR suppresses immune response genes" paragraph 1; Table S5 |
| 427 genes changed by LY2090314 (356 down, 71 up) | "GSK3 counteracts mTOR" paragraph 4; Table S9 |
| "Changed" = base mean above 100, fold change above 1.5, adjusted p below 0.01 | Methods "RNA-seq analysis". The smallest fold change among the 303 dots is 1.495 (log2 0.580), so the rule holds to rounding |
| Why these ten genes | "Genes the paper names as changed by rapamycin": MSH2, MSH6, E2F2 ("mTOR suppresses" paragraph 1, decreased) and IL4R, CD86, CD79A, CD79B, BACH2, BCL6, AICDA (paragraph 3, upregulated immune genes). No other selection rule was used |
| Heading "Group 1 genes" | the paper's own name for MSH6, MSH2 and E2F2 ("Broad bi-phasic" paragraph 1). All three also sit in the largest cluster of genes lowered by rapamycin (Table S6A, cluster 1: cell cycle genes such as CDK1, CDC6). CD79A and CD79B are group 2 genes (paragraph 1) and appear under "Immune response genes", the paper's own words |
| Heading "Immune response genes" | "mTOR suppresses" paragraph 3. IL4R, CD86, CD79A, CD79B, AICDA are in the largest cluster of genes raised by rapamycin (Table S6B, cluster 1); BACH2 and BCL6 are in cluster 52 |
| Bar values | `log2FoldChange` of the gene in Table S5, S9, S10. n.c. = the gene is not in that table, which means it is not listed as changed (not zero) |
| 8 of 10 genes n.c. with both drugs | counted from Table S10. The table title does not say what it is compared with. The paper's PCA paragraph ("GSK3 counteracts mTOR" paragraph 5) compares with DMSO, and the fold changes of S10 and S5 agree in sign (r = +0.51, 437 shared genes), so the column is read as against DMSO. The three Group 1 genes are n.c. under LY2090314 alone and under both drugs |
| Of 99 translation genes raised by rapamycin, 74 stay up with both | "GSK3 counteracts mTOR" paragraph 6 (cluster 3, translation factors, "independent of GSK3"). Counted: the 99 genes of Table S6B cluster 2 (ribosomal proteins, EEF and EIF genes; all raised in Table S5); 74 are listed up in Table S10 and none down. Cluster 2 of S6B is not the paper's cluster 3 of Fig. 7F, but both are the translation group |
| Scatter: 303 genes listed in both S5 and S9; 248 up with rapamycin and down with LY2090314 | "GSK3 counteracts mTOR" paragraph 4 ("70% ... n = 248"); the other quadrants (36, 7, 12) and 284 = 248 + 36 are counted from S5 and S9. Pearson r = -0.674 is not printed |
| Four marked dots (circle IL4R, square CD86, triangle BACH2, diamond BCL6) | the four named genes listed in both S5 and S9. They sit at the values printed in the matrix (checked in `make_layer.py`). They are marked by shapes, not labelled with leaders: a search over every free position within 45 mm found no straight leader from BCL6 to an outside marker that stays 0.55 mm clear of the other 299 dots |
| Title "often move the same genes in opposite directions" | 284 of the 303 genes in both lists move in opposite directions (counted). Of the ten genes, GSK3 inhibition alone lists four (IL4R, CD86, BACH2, BCL6), all in the opposite direction; the other six are n.c. |

## Credit line

Panel a follows Fig. 2A and the graphical abstract; panel b follows Figs 3B and 5 (counts and groups); panel c follows Figs 6 and 7 and Tables S5, S9, S10. The credit line names Figs 2A, 5, 7 for space (one line at 6.55 pt). Table S6 supplies the cluster membership used in the notes above.

## Not drawn, and why

- Text and table disagree: the text says 21 of the 47 reporter genes are among the most upregulated with rapamycin; Table S6B lists 22 (Table S5: 22 up, 3 down).
- MYC and MCL1: their reporters fall with rapamycin (text, Fig. 5G) while their mRNA rises (Table S5, log2 fold change +1.47 and +0.64). This is why panel c says RNA and not brightness, and why neither gene is an example.
- AKT inhibition raises FOXO1 activity, and FOXO1 raises BACH2, IGH, BTG2 and OCAB (Results "A B cell gene reporter panel" paragraph 2). The text states it, but FOXO1 is not one of the 47 and it is a test of the panel, not the finding.
- GSK3 phosphorylation before FBXW7 degrades MYC, MCL1 and cyclin E ("GSK3 counteracts mTOR" paragraph 2). The Discussion says a stable MYC did not rescue the rapamycin effect, so the mechanism is open.
- GEO GSE290879 and PRIDE PXD067812 were not downloaded.
