Redesign of Figure 1D and E (with Table 1) of Fukui et al. 2026, eLife 15:RP111443, doi 10.7554/eLife.111443 (version of record, 25 September 2026). Licence CC BY 4.0 (read at Europe PMC and in the article). The original is not reproduced here; open it at the DOI.

**The original.** Panel D draws wild type and eleven mutants on one axis, 0 to 1 mM, so every mutant is a flat line near zero. Panel E repeats seven on 0 to 5 mM with a magnified y axis. Twelve similar colours are named only in a line under each panel, the dead variants overlap at zero, and kcat, Km and N.D. sit in Table 1, away from the curves (my reading of the image).

**The redesign.** Panel a ranks Table 1 by kcat/Km: dot, printed value, fold below wild type, kcat and Km with the printed ±; the seven N.D. variants follow as a list with the paper's reasons. Panel b is a flat ChimeraX inset of PDB 6LZJ chain A with the colour key. Panel c has one tile per active variant, in panel a's order: kapp divided by its own kcat against ATP, with the absolute top kapp printed.

**Numbers.** Points: Figure 1 source data 2 (12,702 bytes). kcat, Km, kcat/Km, N.D.: Table 1 as printed. Computed here and labelled: refit curves, fold lower, top kapp, scaling, two distances.

**Rebuild** (Python with scipy, openpyxl, matplotlib, PyMuPDF; Node; Chrome; ChimeraX 1.10):

```
py -3 -B -I gallery/12-mutl-kinetics/fetch_data.py
py -3 -B -I gallery/12-mutl-kinetics/src/derive.py
py -3 -B -I gallery/12-mutl-kinetics/src/geometry.py
py -3 -B gallery/12-mutl-kinetics/src/rebuild_art.py
py -3 -B gallery/12-mutl-kinetics/src/make_layer.py
node build/build.mjs gallery/12-mutl-kinetics/page/12-mutl-kinetics.html 178 --out gallery/12-mutl-kinetics --art gallery/12-mutl-kinetics/art
py -3 -I qa/qa_fig.py gallery/12-mutl-kinetics/12-mutl-kinetics
py -3 -B gallery/12-mutl-kinetics/src/verify_pdf.py
```

---

## Checks and open points (for reviewers)

**Ten-second reading.** Four MutL variants stay active, about 100 to 170 times less efficient than wild type (97 to 171, computed from Table 1); for seven others no activity was detected.

**Where the paper and the data disagree.**
- **E32A and E32Q.** The source file's column E32Q fits the Table 1 row E32A, and its column E32A fits the row E32Q, in the whole row: Km 2.12 against 2.1 mM (standard error 0.389 against 0.39) and 3.48 against 3.5 mM (0.456 against 0.46); kcat 0.104 and 0.100 against 0.10 and 0.10; the printed kcat error is 2.57 times my fit standard error in both. So Km, both errors, kcat/Km, the rank and the fold-lower figures cross. In the original's panel E the curve labelled E32Q is the higher one at 5 mM, as in the file (my reading of its pixels; no value taken). Either Table 1 has the two rows exchanged or the file and the figure do; I cannot tell which. The figure says only that the rows look exchanged: tiles draw the file as labelled, panel a prints Table 1 as published, both names carry a dagger. The headline range is the same either way. The authors should be asked.
- **No error on kcat/Km.** Table 1 prints a ± for kcat and Km only, and does not define it. My unweighted least-squares refit gives Km standard errors equal to the printed Km ± for E29Q, E32V and the crossed pair (0.025 against 0.026 for wild type); the printed kcat ± is 2.1 to 3.1 times my standard error as labelled, and 2.6 times (2.8 for wild type) once the pair is uncrossed. kcat and Km are strongly correlated in these fits (r 0.86 to 0.99), so adding the two printed errors in quadrature would badly overstate an error on kcat/Km. None is drawn. The fold-lower figures are rounded to two digits and carry no error, so 160 and 170 are not distinct.
- **Fit method.** The paper names IgorPro and the standard Michaelis-Menten equation and does not state weights; the fit was probably made to the three replicates, which the file does not hold. My unweighted refit of the means reproduces Table 1 for wild type, E29Q and E32V (kcat within 6 %, Km within 5 %; `tables/refit_vs_table1.csv`). An SD-weighted fit does not (it does not converge for E32A and E32V). The solid and dashed curves therefore differ visibly only in the two dagger tiles, where Table 1 and the data disagree, and slightly for wild type.
- **Units.** The file gives none. kapp is read as per minute: Table 1 gives kcat in min⁻¹, the original's axis is labelled min⁻¹, and the file's wild-type top mean (0.58) lies just under the Table 1 kcat (0.65).
- **E29V.** The 5 mM cell of the file is a formula (`=0.00368044330203485/2.6`); its stored value 0.00142 is used. Three cells (0.05, 0.1, 0.2 mM) are blank.
- **Distances.** The original's panel A prints two distances; I read them as 3.2 and 2.9 Å from its pixels and use neither. Mine, computed from 6LZJ, are 2.89 Å (Glu29 O to water) and 2.76 Å (Glu32 O to water); the water is 3.54 Å from the AMPPCP gamma phosphorus. The figure says the paper's Fig. 1A gives its own values.
- **Residue numbers.** The paper numbers residues as UniProt does. 6LZJ numbers them 7 lower (DBREF: file residues 2 to 308 = UniProt 9 to 315; the motif K E L V E N is file 21 to 26, paper 28 to 33). Paper Glu29 and Glu32 are file Glu22 and Glu25. `src/geometry.py` asserts this and that HOH 565 is the only water within 3.2 Å of both.

**N.D. variants.** Table 1: "N.D. means that the activity was not detected." The figure uses those words. Reasons are the paper's: "below the detection limit" (E29A, E29V, E29K, E29G); "complete loss of ATPase activity" (E29Q/E32Q, and E32K, for which the paper adds that charge reversal "is likely to perturb the local electrostatic environment"); for E32G its CD spectrum "suggests that this substitution disrupts the secondary structure", so E32G has its own group. The file holds small non-zero means for most of them; the list prints the highest (computed, 0 for E29K) and the highest ATP tested: 1 mM for E29K, E29G, E32K, E32G, 5 mM for E29A, E29V, E29Q/E32Q.

**Extrapolation.** E32V's Km (5.5 mM) lies above the highest ATP tested (5 mM), so it is marked with a hollow dot and an asterisk in panel a and in its tile; no Km guide is drawn there. Its kcat is also beyond the data (top kapp 0.067 against kcat 0.15 per minute).

**Version.** eLife shows a version of record published 2026-09-25 (version DOI 10.7554/eLife.111443.4; reviewed preprints v1 to v3 came before). The Europe PMC full text is that version. The source-data file is named `-v1.xlsx` on the eLife content server (the article record at `api.elifesciences.org/articles/111443` links it).

**Reading choices.** Panels are lettered in reading order: a the ranking, b the structure, c the tiles. Tile y is kapp divided by the Table 1 kcat of that variant (printed to two digits, so about 5 % rounding in scale); tile x runs from 0 to the highest ATP measured, 1 mM for wild type and 5 mM for the others, with no curve beyond it. The solid curve is the Michaelis-Menten curve with the Table 1 Km (kcat cancels); the dashed one is my refit. Dotted guides show kcat and Km only where Km lies inside the range. Ranking is by the printed kcat/Km. Colours: indigo wild type, apricot Glu29 replaced, purple Glu32 replaced, two-tone both; the same apricot and purple mark Glu29 and Glu32 in the inset. Pale grey is only the band behind N.D. variants; lines differ by style (solid, dashed, dotted), not by grey; AMPPCP is near-black. All dots in panel a share one size and outline; a hollow dot means extrapolated. Assay (Methods): 70 °C, 60 min, 10 µM protein, three independent experiments. Not drawn: the GyrB, PMS2 and MLH1 rows of Table 1 and Figs. 2 and 5, which repeat the design for other proteins.

**Build checks** (`checkAlign`, 0.25 mm, measured on the rendered page): every text on its anchor; plot areas on their boxes; every tile dot and panel a dot at the position computed from its value (0.12 mm); the inset and the five leaders on anchors computed from the render; no leader crosses another leader or a label; no text on text; no text within 1 mm of the page edge; N.D. and tile texts inside their boxes. `derive.py` asserts Table 1 against the file (and the crossing above), `geometry.py` the PDB offsets, `verify_pdf.py` one page, 178 mm, Arial only, every printed number against the tables and that "not determined" appears nowhere.

**QA** (`qa_fig.py`, normal): ink 9.2 %, empty cells 10.8 %, longest empty band 2.6 %, largest blank 2.8 %, smallest type 6.55 pt, inset 40.7 mm, Arial only, one page, 178 mm. Words 538 against 130 (warning), down from 695 after the review: 87 are numbers and tick labels, 129 names, units and symbols; the rest are titles, definitions, the paper's reasons and notes. Cut: the seven N.D. tiles became one list with shared columns, units stand once, y ticks once, row labels once.

**Data downloaded** (`data/SOURCES.txt` has URL, size and SHA-256): `elife-111443-fig1-data2-v1.xlsx` 12,702 bytes; `PMC13614785.xml` 212,381 bytes; `6LZJ.pdb` 377,703 bytes. The PMC and Europe PMC `bin/` addresses of the file answered with a script-check page and HTTP 403; I did not work around them and took the file from the publisher's content server. The original figure image (318,028 bytes) was read into the scratchpad only, never into the repository.
