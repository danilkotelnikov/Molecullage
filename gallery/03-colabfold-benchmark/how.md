Redesign of Figure 2 of Mirdita et al. 2022, Nature Methods, doi 10.1038/s41592-022-01488-1. Licence CC BY 4.0 (read at Europe PMC and in the article). The original is not reproduced here; open it at the DOI.

**The original** has four plot types in one figure. Panel a: 91 tiny rotated domain names, five markers on each, a key floating over the data, "FM" unexplained. Panel b: two line types and five colours on one log axis, in minutes while the source file is in seconds. Panel c: two blues for the two ColabFold modes, while dark blue is a different setup in panel a. Panel d: three similar blues.

**The redesign** gives each panel a plain title with its direction and one key: same colour = same software and sequence database. Free-modelling domains stand apart in a, with the paper's caveat that ColabFold's search was tuned on them. Every axis has a unit; d is labelled on its lines. Printed numbers are the paper's, except those marked computed: the 63-domain means (a) and the search-time ratios (b).

**Numbers.** All from Source Data Fig. 2 (`41592_2022_1488_MOESM4_ESM.xlsx`, 246,252 bytes): a from sheet fig2a; b from fig2b (seconds / 60); c from sheet fig2d; d from sheet fig2c (seconds / 3600); the sheet names for c and d are swapped. Nothing is fitted; c is sorted by the AlphaFold-multimer value.

**Rebuild** (Python with openpyxl, Node, Chrome):

```
py -3 -B gallery/03-colabfold-benchmark/fetch_data.py
py -3 -B gallery/03-colabfold-benchmark/src/make_plots.py
node build/build.mjs gallery/03-colabfold-benchmark/page/03-colabfold-benchmark.html 178 --out gallery/03-colabfold-benchmark --art gallery/03-colabfold-benchmark/art
py -3 -I qa/qa_fig.py gallery/03-colabfold-benchmark/03-colabfold-benchmark
```

---

## Checks and open points (for reviewers)

**Ten-second reading.** On the 63 other CASP14 domains ColabFold scores slightly below AlphaFold2 (0.914 and 0.915 against 0.932). On the 28 free-modelling domains the paper tuned ColabFold's search, so read that block with care. Its search takes about 1/90 of AlphaFold2's time (median), and a proteome takes 48 to 242 hours against an extrapolated 4,234.

**Where the data and the paper differ.**
- Sheet fig2b holds only MSA-generation rows. The original also draws model-inference lines, so panel b shows search time only and says so.
- The paper's "fivefold faster for single predictions" counts search plus model run, so it is not drawn under a search-only panel. Computed medians of the per-target ratio of search times (`tables/fig2b_ratios.csv`): AlphaFold2 over ColabFold 90.8 (BFD/MGnify) and 76.3 (ColabFoldDB); AlphaFold-Colab 80.5 and 66.5. AlphaFold-Colab was timed in Colab, the others on one server core (Methods).
- Sheets give no units. Seconds are assumed: fig2b / 60 matches the minutes axis of the original; the first proteome value, 6,780 s, is the 113 min of the Methods; the last "Stop >= 85" value, 173,303 s, is the 48 h of the Results.
- Methods give 3.7-fold and 4.8-fold early-stop speed-ups; the sheet gives 3.62 and 5.03 (3.73 and 5.19 without the first 6,780 s). No ratio is printed.
- The extrapolated AlphaFold2 line ends at 4,233.75 h; the original labels it "about 4,200 h". Its first value (0 s) cannot sit on a log axis and is not drawn.
- The paper prints 0.79 and 0.62; the figure prints 0.790 and 0.620. The build asserts that all nine paper means (28 free-modelling, 91 all) equal the sheet's to three decimals. The four 63-domain means are computed here (`tables/fig2a_means.csv`); bars sit on them.
- The sheet has 28 AlphaFold-Colab rows and none for the other 63 domains; the paper leaves AlphaFold-Colab out of its all-domain means ("cannot be used as a standalone").

**Reading choices.** Panel c is indigo because Methods give BFD/MGnify for the complexes; d is green because the proteome search used ColabFoldDB. AlphaFold-multimer and the extrapolated AlphaFold2 line use the AlphaFold2 grey, listed as two key entries. "Shortest first": Methods sort the batch by length and the per-protein time rises along the run. The GPU (one Nvidia Titan RTX) and the 25 excluded proteins over 1,000 residues are not drawn. "No known template" is the usual CASP meaning, not a paper sentence. The ids in c are the sheet's target codes, not checked against RCSB. The Europe PMC `bin/` address of the file gave HTTP 403; the file came from the publisher's static-content server (HTTP 200).

**Build checks** (`checkAlign`, 0.25 mm, measured on the rendered page): panel letters, titles, plot areas, captions, key columns, numbers under their columns, mean bars at their means, leader ends on the line ends, no text on text, nothing within 1 mm of the page edge.

**QA** (`qa_fig.py`, normal): ink 35.8 %, empty cells 6.3 %, longest empty band 2.0 %, largest blank 2.1 %, smallest type 6.55 pt, Arial only, one page, 178 mm. Words 391 against 130 (warning): about 80 are tick labels, ids and numbers; the rest are titles, definitions, key entries and labels of a four-panel data figure. In the 63-domain block 51 of 392 dots overlap a little.
