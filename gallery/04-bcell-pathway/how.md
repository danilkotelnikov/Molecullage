Redesign of the graphical abstract (unnumbered; Fig. 2A draws the same pathway) of Kalchschmidt J, Kanno T, Park S, Dubois WD, Zhao Y, Trzaskoma P, Thomas CJ, Staudt LM, O'Shea JJ, Jung S, Casellas R 2025, Cell Reports 44(10):116361, doi:10.1016/j.celrep.2025.116361. Licence CC BY 4.0 (read at Europe PMC and in the article). The original is not reproduced here; open it at the DOI.

**Original.** One frame packs 47 gene boxes in tiny type, a plate, an instrument, a bar sketch and a network hairball. Screened genes differ from others only by outline colour. The finding is a small icon at the foot.

**Redesign.** Three numbered rows: cells, screen, analysis. The 47 genes are 6.55 pt pills in the paper's four groups. Panel c is RNA-seq, not reporter brightness: ten named genes under rapamycin, the GSK3 inhibitor LY2090314 and both, and the 303 genes changed by each drug. Purple and apricot are a regulator's role in b; maroon and mint are RNA up or down in c. Four scatter dots carry shapes, not labels: BCL6 sits in the dense edge, where no straight leader stays clear of other dots.

**Numbers.** Tables S1, S3, S5, S6, S9, S10; `src/derive.py` asserts every count the text also gives. n.c. means not listed as changed. Quadrant counts and the 99 and 74 translation genes are counted from the tables.

**Arrows.** Only "activate" and "repress" (Results, "Broad bi-phasic impact", paragraphs 3 to 5) and the opposite drug effects (Results, "mTOR suppresses" and "GSK3 counteracts"). Fig. 2A's pathway arrows are not in the text and are left out. `claims.md` maps each element to its source.

**Ten seconds.** Blocking mTORC1 or GSK3 moves the same B cell genes in opposite directions.

**QA.** Ink 31.0 %, empty cells 1.7 %, band 1.4 %, blank 1.6 %, type 6.55 pt: pass. Words 515 against 130: warn; 198 are gene names, drug names, values and ticks.

```
py -3 -B gallery/04-bcell-pathway/fetch_data.py
py -3 -B -I gallery/04-bcell-pathway/src/derive.py
py -3 -B gallery/04-bcell-pathway/src/make_layer.py
node build/build.mjs gallery/04-bcell-pathway/page/04-bcell-pathway.html 178 --out gallery/04-bcell-pathway --art gallery/04-bcell-pathway/art
py -3 -I qa/qa_fig.py gallery/04-bcell-pathway/04-bcell-pathway
```
