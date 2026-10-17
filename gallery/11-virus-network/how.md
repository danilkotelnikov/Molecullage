Redesign of Figure 3 of Safi et al. 2026, The EMBO Journal, doi 10.1038/s44318-026-00770-8. Licence CC BY 4.0 (read at Europe PMC and in the article). The original is not reproduced here; open it at the DOI.

**The original.** Panel D draws about 600 nodes with labels near 2 pt and over a thousand grey lines. Function, region, bait and PDB complex share one canvas as fills, shapes, borders and edges; host proteins hide in V-shaped count nodes.

**The redesign.** A headline states the finding. Panel a: ten baits on one ring in the paper's two subnetworks, 433 prey on the outer ring in eight region sections with function and organism strips, one key beside it. Panel b: bait counts with a scale. Panel c: shared prey as a lower-triangle matrix. Panel d: the five PDB complexes as rings. One bait order throughout.

**Numbers.** `src/derive.py` reads Source data Fig. 3 and the Zenodo Cytoscape session and asserts every number the Results text prints; the headline sums come from the same table. Ring order: exhaustive search, no random numbers (7,337 spoke crossings; 52,625 with alphabetical sections). Bait-to-bait arcs keep 1.5 mm from every other bait, asserted in the page. PDB rings: seed 1.

**Ten seconds.** Ten virus baits pulled down 433 proteins: membrane baits mostly viral ones, nucleoid and factory baits mostly host ones.

```
py -3 -B gallery/11-virus-network/fetch_data.py
py -3 -B -I gallery/11-virus-network/src/derive.py
py -3 -B gallery/11-virus-network/src/make_layer.py
node build/build.mjs gallery/11-virus-network/page/11-virus-network.html 178 --out gallery/11-virus-network --art gallery/11-virus-network/art
py -3 -B gallery/11-virus-network/src/verify_pdf.py
py -3 -I qa/qa_fig.py gallery/11-virus-network/11-virus-network
```

Needs Python with matplotlib, networkx, openpyxl and PyMuPDF, Node and Chrome. `make_layer.py --refit` solves the ring layout again; otherwise it reads `tables/layout_a.json`.

---

## Checks and open points (for reviewers)

**Data used** (`data/SOURCES.txt` has URL, size, SHA-256; `fetch_data.py` fails if a file changed). Source data Fig. 3 (7,762 bytes); Datasets EV1 to EV5 (874,663; 23,070; 86,823; 53,063; 15,826 bytes; only EV1 is used); Zenodo 10.5281/zenodo.17313812, file `Mimivirus_coip_fun_categories.cys` (650,095 bytes; the other three files of the record hold the same network with other colour codes and were not downloaded); titles and release dates of the nine PDB entries read from data.rcsb.org (no coordinates). Zenodo 10.5281/zenodo.17296301 was not touched. The Europe PMC address of the Fig. 3 image gave HTTP 403; the image was read from the publisher's static-content server (HTTP 200) into a scratch folder only and is not in this repository. One mistaken request to the Europe PMC `supplementaryFiles` address returned a 51 MB zip that was read into memory and not saved.

**Where the data and the paper agree.** Host and viral counts of six baits and totals of three baits in the Results text; the six shared-partner counts in the text; the 34 listed pairs of the Fig. 3B table (the other 11 of 45 pairs share nothing and are not linked); the partner lists of Fig. 3A for all ten baits; the EV1 rule (log2 fold change at least 1, p below 0.01) for eight baits (R252 and R561 come from an earlier study and are not in EV1). The three PDB-complex link sets cover 39 host proteins (paper: around 40). The foot line says "every count the paper prints"; it does not cover the differences below.

**Where they differ or are unclear.**
- R443: the Results give 9 viral membrane proteins among 14 viral partners. The file flags 8 of those 14 (L323, L373, L487, L593, R335, R387, R513b, R595). The Results also list L446 as having a transmembrane domain, but the file has `prey_membrane` 0 for L446, so the figure puts it under "No region listed". A note on panel d says so.
- Methods against file: VF-IL has 64 viral proteins in the Methods and 63 in the file (123 host in both); the Methods give 86 nucleoid proteins and the file flags 82 viral ones. The figure draws the file.
- Contact in the PDB complexes: the Methods say under 8 Å; the file names of the three link tables say 10 Å (6zj3) and 20 Å (7a09, 7dvq). The figure prints the Methods value.
- The two RNA polymerase link sets are named `core` and `not core` in the file (tags `PDB_RNAPOLCORE`, `PDB_RNAPOLNOTCORE`); the paper does not define them, so panel d calls them file names. The 17 proteins of "not core" include the 8 of "core". The file does not say which of the six entries gives which link. The legend names six entries; the Methods name only 6RFL, 7AMV and 8Q3K.
- Prey `AccaoMp04` has `tax` VIRUS in the file but looks like an *Acanthamoeba* mitochondrial locus tag (not confirmed). It stays viral, as in the paper's count of 18 for R561.
- The paper does not explain the L and R prefixes of the virus gene names; the figure says only that such names are virus genes.
- 151 viral proteins of the network file have no bait link. Eleven appear in panel d as squares (RNA polymerase chains); 140 are not drawn. The paper's own Fig. 3D draws them as region members.
- Three viral prey carry no category (`not found:pan domain` twice, one empty); host proteins have none. The paper's list has 15 categories; all 15 occur.
- The paper does not print 433 prey or 549 links; both are computed (539 bait to prey, 10 between baits; 7 baits were also found in another bait's pull-down).
- In panel a the 539 grey lines show the pattern; for R252, R561 and L274 the bundles fuse and one bait's lines cannot be followed. Counts are in b and c.

**Reading choices.** The file's region codes (`virion`, `core`, `vfIL`): `core` is read as the paper's Nucleoid. The 12 viral proteins coded `core-virion` are nucleoid-enriched and in the virion but not in VF-IL, so the section is "Nucleoid, not VF-IL". VF-IL is the internal layer of the viral factory (VF). Virion count 206, as in the Methods. Membrane is the paper's call from at least two of three predictors. Host ids are shortened (BAESF_#####.mRNA.1 to #####). Function colours: 14 tones in four hue families plus sand for Uncharacterized, all named in the key (greedy max-min CIEDE2000 over four vision types; closest pair 4.9, so some tones are close). Maroon means bait everywhere (nodes, bait-to-bait arcs, shared-prey shade). Page height is 258 mm.

**Not labelled.** The 389 prey that match no PDB complex have no name on the figure (names in `tables/prey.csv`); the 44 that do are named in panel d. Positions on the ring carry no distance.

**Build checks** (`checkAlign`, 0.25 mm, measured on the rendered page): every label on its anchor, bait names centred on their nodes, bars, cells and key swatches on their computed positions, region badges, leader ends, bar numbers in three columns, no text on text, nothing within 1 mm of the edge, no bait-to-bait line within 1.5 mm of a third bait. `verify_pdf.py` reads the PDF: one page, Arial only, 315 labels at their anchors, bait numbers, headline sums, 45 matrix cells, region and function counts equal the tables.

**QA** (`qa_fig.py`, normal): ink 15.7 %, empty cells 7.9 %, longest empty band 1.4 %, largest blank 2.2 %, smallest type 6.55 pt: pass. Words 751 against 130: warn. About 220 are ids and numbers; the rest are titles, definitions, key entries and labels of a four-panel data figure with a key.
