Redesign of Figures 3A, 4A and 4B of Cuevas Zuviría B et al. 2025, eLife 14:RP105613 (version of record, reviewed-preprint version 4, published 2025-09-11), DOI 10.7554/elife.105613. Licence CC BY 4.0 (read at Europe PMC and in the article). The original is not reproduced here; open it at the DOI.

**Original.** Fig. 3A packs the 769-node tree into thin lines; the D and K insertions are thick paths in the blue and red of the pale clade shading and the structures, and both D events share one colour. Fig. 4B puts about 80 large circles on a grey tree (nodes cut "to mitigate visual overcrowding"); Fig. 4A needs a 28-colour legend; in the supplement all 769 circles overlap.

**Redesign.** One tree of all 385 living proteins and 384 ancestors with clade names on the bands, one grey row per living protein, three traits, one legend, a disc on each branch the paper names, numbered rings that tie three tips to three deposited structures (inserted segment in indigo), and a median table that adds the ancestors. Colour is kept for clades and events.

**Numbers.** Tree, clade labels, traits: Figure 4 source data 1 to 3. Units and meanings: Supplementary file 6. Structures: PDB 3U7Q, 4WES, 8BOQ. Computed here: root, row order, medians, event nodes (they match the node numbers in Fig. 3), segment lengths.

**Ten seconds.** "Three branches of the nitrogenase tree gained a piece of the D or K subunit; Nif-I has the most contacts and the lowest binding energy."

```
py -3 -B gallery/08-nitrogenase-tree/fetch_data.py
py -3 -I gallery/08-nitrogenase-tree/src/nsdb_tree.py
py -3 -B gallery/08-nitrogenase-tree/src/spans.py
MOLECULLAGE_ART=<abs path>/gallery/08-nitrogenase-tree/art py -3 -B struct/run_cx.py gallery/08-nitrogenase-tree/src/render_nsdb.py nsdb
MOLECULLAGE_ART=<abs path>/gallery/08-nitrogenase-tree/art py -3 -I struct/trim.py nsdb
py -3 -I gallery/08-nitrogenase-tree/src/make_layer.py
node build/build.mjs gallery/08-nitrogenase-tree/page/08-nitrogenase-tree.html 178 --out gallery/08-nitrogenase-tree --art gallery/08-nitrogenase-tree/art
py -3 -I qa/qa_fig.py gallery/08-nitrogenase-tree/08-nitrogenase-tree
py -3 -I gallery/08-nitrogenase-tree/src/verify.py
```

---

## Checks and open points (for reviewers)

**Gate.** Licence: Europe PMC full text (`ali:license_ref` CC BY 4.0, publication state "version of record"), the eLife API record (CC-BY-4.0, `doiVersion` 10.7554/eLife.105613.4) and the Zenodo record (cc-by-4.0). The source data came from the eLife CDN addresses that the eLife API lists (HTTP 200; sizes equal the supplementary-material entries). The Europe PMC `bin/` address was not tried. The original figure images were fetched from the eLife IIIF server into a scratch folder only and read there.

**Counts against the paper.** The tree file holds 1,538 nodes: 770 tips (385 nitrogenases and 385 outgroup sequences, BchChl_, annotated as protochlorophyllide reductase subunit N) and 768 internal nodes. The paper's 769 nodes are the 385 living tips plus the 384 internal nodes of the nitrogenase subtree; the 384 ancestors of Figure4SourceData3 are exactly those nodes ("Anc_n" is node n). 5,378 = (385 + 6 x 384) x 2 components; the Zenodo `index.csv` has 5,378 rows. The Introduction says 770 extant and 4,608 ancestral structures: 385 x 2 and 384 x 6 x 2.

**Rooting.** The file is unrooted (three-way split at node 771). It is rooted on the edge above the outgroup clade (node 822), as the authors' R code does. The file gives no position inside that edge, so the root is drawn as a short dashed stub, not to scale, and said so on the figure.

**Scale.** The file has no unit. The scale bar of the paper's Fig. 3A reads "aa sub/site"; the Methods use RAxML with LG+G+F. The tree is not dated. The scale bar starts at the root x, under the tree.

**Clades.** The file labels tips and ancestors nif-i, nif-ii, nif-iii, an (Vnf and Anf together) and other (the 5 deepest ancestors: nodes 821, 820, 1206, 1207, 1345). Vnf and Anf are split by the type column. Nif-I, Nif-II and Anf are single clades on the tree (last common ancestors 1207, 1345, 786). Vnf is not a clade: node 802, the last common ancestor of its 17 tips, holds all 17 Anf tips, and one Vnf tip is sister to the Anf clade (node 787). The bands are row blocks and the subtitle says so ("Anf sits inside Vnf"). Vnf and Anf sit inside the clade of node 820, as the paper says. Node 802 is labelled nif-iii in the data, so it counts in the Nif-III ancestor row; the figure says so. The table follows the file labels; the 5 "other" ancestors are left out and said so. The three tones of the Nif-III family differ by 8 % of lightness or more (asserted in `checks.js`).

**Events.** The paper places each insertion on the branch to the clade's last common ancestor; the discs rest on 1206 to 1207 (K), 1206 to 1345 (D, Nif-II) and 787 to 786 (D, Anf), above or below the thick branch (whichever stays in its band), with the clade named beside each. The node numbers 786, 787, 1206, 1207 and 1345 appear only in the image of Fig. 3; the build asserts that the tree reproduces them. The K disc marks the first appearance; the paper says the extension lengthened through later Nif-I ancestors (nodes 1209 and 1224 in Fig. 3C), which are not drawn; the figure says so in one line.

**Segments.** The paper gives no residue numbers. Pairwise alignment (Biopython, BLOSUM62, gap -11 and -1, free end gaps): 3U7Q chain K against 4WES chain K, residues 1 to 43 (42 modelled; paper: about 8 to 40); 4WES chain D against 3U7Q chain D, 377 to 428 (paper: about 55); 8BOQ chain D against 3U7Q chain D, 464 to 515 (chain A 52 modelled, chain D 50; paper: about 60). The lengths depend on the baseline, so each inset names it ("vs. 3U7Q chain D"); 8BOQ also gives 34 against 4WES chain D. The start of the 8BOQ tail lies in a weakly aligned stretch (the last 21 residues of 3U7Q NifD align weakly to AnfD 443 to 463). The paper defines the insertions against reconstructed ancestors, not against these entries. 4WES is named only in the label of Fig. 3D; RCSB: C. pasteurianum Nif, 1.08 Å. 8BOQ is X-ray, 1.547 Å (not cryo-EM); its AnfG chains are not drawn. The crystallised ancestors 9HB9, 9HBN, 9HBC are not drawn: the files give no node number for them.

**View.** The three entries are superposed on 3U7Q (C-alpha RMSD 1.26 Å for 4WES, 1.66 Å for 8BOQ) and seen along the pseudo two-fold axis of 3U7Q, from the side on which all three segments are exposed; the other side hides most of the K extension. Surfaces, D light grey, K mid grey (tones derived from the token "guide", raised in contrast after the blind read). The letters D and K sit on the middle of the largest visible patch of each grey, found in the PNG (`make_layer.py`).

**Traits.** Area, contacts and ΔG are columns of Figure4SourceData3 (FreeSASA and PRODIGY, Supplementary file 6, predicted structures). The grey scale runs from the lowest to the highest of the 385 living proteins; for ΔG dark is lower (more stable). One legend above the columns gives the words at both ends. The paper's "charged residue fraction" (Fig. 4-figure supplement 1E) is not in the published source data (the R code reads a fourth file) and is left out; so are the taxonomy colours of Fig. 4A. Medians over an even count can end in .5 (983.5, 991.5); the figure says so.

**Statements.** "Nif-I has the most contacts and lowest ΔG; Nif-II the largest surface area" is the paper's text (Results, "Phylogenetic trends"); the figure says only that the order of the medians matches it.

**Credit.** The credit now runs over two lines; the second replaces "values as published" with what is computed here, because medians and segment lengths are not as published.

**Other.** The data list of the article names, as a previously published dataset, Zenodo 10.5281/zenodo.1335106 with a title about a classroom chair survey: an apparent slip, not used. Fig. 2 source data 1 (65.8 MB) was not downloaded. `art_flip/` holds the first, front view (scratch, git-ignored).

**QA** (`qa_fig.py`, normal): ink 42.4 %, empty cells 3.3 %, longest empty band 2.2 %, largest blank 2.5 %, smallest type 6.55 pt, Arial only, one page, 178 mm, smallest render 40 mm. Words 446 against 130 (warning): 70 are numbers (table, key ends, ring numbers). `checkAlign` (0.25 mm) measures matrix columns, strips, bars, rings, discs, labels, leaders, frames, letters, the table, tone differences, clearances and text on text on the rendered page.
