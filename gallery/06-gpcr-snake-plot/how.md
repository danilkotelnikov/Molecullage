Redesign of Figures 1a,b and 4 (with Tables 1 and 2) of Nakajima et al. 2026, Protein Science, DOI 10.1002/pro.70408. Licence CC BY 4.0 (read at Europe PMC and in the article). The original is not reproduced here; open it at the DOI.

**The original** draws the receptor twice: a snake plot (a) with residue numbers, four red sites and a grey deleted loop, and a cartoon of PDB 7F61 with purple sticks (b). The EC50 values are in Tables 1 and 2, the curves in Figure 4. I could not open the figure images (Europe PMC answered HTTP 403, and I looked for no other route), so this is read from the legends and text. Nothing in them joins a snake position to its stick.

**The redesign** joins them with one numbered orange badge per site, the same in all three panels. Panel a is a snake plot of chain A of 7F61 (residues 27 to 433 of 445). Panel b is a flat ChimeraX render of that chain, the four residues as sticks. Panel c plots every EC50 of Tables 1 and 2 on a log axis with the printed SD.

**Numbers.** EC50 and SD are copied from the tables. Helices, heights and stick ends are computed from 7F61 (`tables/*.csv`). Chain B, cholesterol and water are not drawn; Table 3 (H1R) is not plotted.

**Rebuild** (Python with numpy, Biopython, Pillow and matplotlib, Node, Chrome, ChimeraX 1.10):

```
py -3 -B gallery/06-gpcr-snake-plot/src/rebuild.py
```

---

## Checks and open points (for reviewers)

**Ten-second reading.** Where the four yeast-activating mutations of the histamine H3 receptor sit (inner ends of helices 2, 6 and 7, and the outer loop ECL2), and the histamine EC50 of each mutant, alone and in pairs.

**Changes after the reviews.** Accuracy review (0 wrong): panel a now says it draws the 7F61 chain (27-433 of 445, S121K included) and defines the yeast construct H3R_i3d; helix 8 is a row along the inner face under TM7; the block heads name the paper's tables and "six double mutants"; ND is the paper's note plus a line that the text calls some ND mutants inactive and some weak; the key says TM limits are 7F61 helix records. Blind read: the four long leaders are gone (the badge numbers link the panels, each stick has a short leader to its badge); one key beside the snake plot names every symbol; the one-experiment mark is a diamond, not a circle; the axis is repeated over the first block; the notes are one block. Words 373 (was 410): about 70 are row names, numbers, ND and tick labels, about 45 are badge digits.

**Where the paper and the data differ.**
- C415R is 4.0 ± 1.6 µM in Table 2 and 3.5 ± 1.5 µM in Table 1. Table 2's value is drawn, both are in a note.
- The text says L73F gave modest activity, Table 2 lists ND; hence the ND line above.
- Table 1 lists ten rows (six pairs and four singles); the six pairs are drawn, the singles come from Table 2.
- The paper deletes ICL3 237-340 in H3R_i3d. 7F61 has coordinates for 237-241 and none for 242-346 (and 433). The snake plot draws the construct (341-346 and 433 dashed); the 3D shows 7F61 as deposited.
- 7F61 carries S121K (not a site, not marked). N11 is not in 7F61 (it starts at 27), so N11Q has a square, not a circle. 434-445 are not in 7F61 either.
- The paper prints generic numbers (2.43, ...) without naming a scheme. `src/check_numbering.py`: its residue names match 7F61 and the implied x.50 residues are D80, R132, P373, P409, so the figure calls them Ballesteros-Weinstein numbers. Numbers rise along the chain; TM2 runs from inside to outside, so 2.43 (L73) is seven residues before 2.50 (D80), the 7th circle from the inner end of TM2. In 3D, sites 1, 3 and 4 lie close together because the paper puts L73, S359 and C415 in the bottom layer of the bundle.
- The paper draws the four residues magenta and the ligand orange (Figure 4); here the sites are orange and the ligand rose.

**Choices.**
- Helices: a deposited helix record of 24 or more residues is a helix; a shorter record followed by one that starts on its last residue is joined to it (HELX_P3 and P4): TM1 to TM7 are 30-62, 67-98, 102-138, 148-178, 195-230, 348-384, 390-416. The paper gives no limits; short records (63-66, 138-146, 234-241) are not named; 416-432 is helix 8.
- Circle height: a straight-line fit of CA height along the receptor axis against residue number (largest gap to a real CA 2.8 A). Loops, the ECL2 hairpin, the ICL3 arc and helix 8 are drawn evenly; only order and ends are data.
- 3D view (turn 244 degrees, tilt 30 degrees onto the outside face): the best of a search for no hidden stick and the widest smallest gap (3.7 mm) between sticks (`src/choose_view.py`). Dots sit on the centroid of the side-chain atoms; the build asserts that this equals the projection of the coordinates (0.1 mm). Heights in 3D depend on the view.
- Pairs are sorted by site number, not as in Table 1. The circle fills follow the helix records.

**Data.** `data/pdb/7F61.cif` (422,633 bytes, files.rcsb.org, SHA-256 pinned in `fetch_data.py`; X-ray 2.6 A, deposited 2021-06-23). Tables read from the Europe PMC full text of PMC12720417; `src/check_tables.py` compares all 22 values.

**Build checks** (`checkAlign`, measured on the rendered page): every circle at its computed place (0.08 mm), every dot on its residue (0.1 mm), badges, numbers on their decimal points, marks at the log of the printed mean, bars at mean ± SD, no text on a circle, a leader, a badge, another text or a tick label, nothing within 1 mm of the page edge.

**QA** (`qa_fig.py`, normal): ink 17.6 %, empty cells 14.6 %, longest empty band 2.5 %, largest blank 4.7 %, smallest type 6.55 pt, Arial only, one page, 178 mm. Words 373 against 130 (warning, a three-panel data figure). Page 178 by 201.5 mm.

**Not done.** The original figure was not seen.
