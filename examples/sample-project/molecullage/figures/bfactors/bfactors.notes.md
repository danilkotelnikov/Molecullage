# bfactors

**Message.** The two chains of PDB 1MEL have the same mean B-factor but move in different places.

**Template.** templates/plots2.html of Molecullage, one panel. Plot layer: `make_bfactors.py` (matplotlib, transparent SVG), labels from the kit.

**Data.** PDB 1MEL, deposited 1996-06-06, checked against data.rcsb.org on 2026-10-16. C-alpha atoms of chain A (132 residues) and chain L (127), first alternate location, B-factor column of `data/pdb/1MEL.pdb`. Means 14.4 and 14.8 A^2, computed in the script. Same data as the original Figure 1.

**Claim boundary.** Deposited structure PDB 1MEL; values read from the coordinate file.

**QA.** qa_figure, strictness normal: ink 63.9 %, cells 9.2 %, band 2.3 %, blank 3.3 %, type 6.55 pt, Arial only, width 178.1 mm. All checks pass. Ink is high because the plot area is a pale panel (palesky token).

**Colour.** Chain A is the rose fill, chain L a dark tone of the mint fill (OKLab lightness 0.44). Their worst-case colour-vision distance is 16.3. The first try used the rose and mint edge tones, which are 3.2 apart for deuteranopes; the dashed line for chain L is a second channel.

**Reads.** Blind read, round 1 (2026-10-17, fresh agent, PNG only). Found: x axis ran to 140 though the data end at 133; no tick above 30 though a peak reaches 40; fills overlapped heavily; footer too close to the x label. Fixed: axis to 135, ticks to 40, fill opacity 0.6, label moved up. Round 2 not run yet. Overclaim read: not required (review = blind).

**Ten-second sentence.** Two lines of motion along the chains: they peak in different places and average the same.
