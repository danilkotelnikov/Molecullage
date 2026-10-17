Redesign of Figure 5 of Bu F, Ye G, Sharma KL et al. 2026, Nature Communications, DOI 10.1038/s41467-026-77332-3. Licence CC BY 4.0 (read at Europe PMC and in the article). The original is not reproduced here; open it at the DOI.

**The original.** Fig. 5A–B show where the inhibitor MWAC-3634 sits in the Ebola virus glycoprotein. Hard to read: A labels float on the structure without leaders or chains; B uses spoked arcs and coloured text that only the legend explains, gives the hydrogen bond no distance, draws the cation–π contact like any other arc, and names the compound only "3634". Fig. 4 was behind a bot check; I used its legend.

**The redesign.** One tile per residue, same in both panels. a: ChimeraX flat render of PDB 9PEL (GP1 chain A, GP2 chain a, inhibitor A1CIK, chain A; copies B/b, C/c and the nanobody omitted). b: the same contacts drawn flat, stereocentres as wedge and hash bonds. Numbers and chains are as deposited. Computed from 9PEL: 20 residues with a non-hydrogen atom within 4.5 Å, Thr519 hydrogen bond 3.2 Å, Arg64 cation–π 3.8 Å. The paper (LigPlot) lists 18; Ser41 and Leu184 are the two extra. No Source Data sheet belongs to Fig. 4 or 5, so there is no potency panel. Details: checks.md.

**Ten seconds.** A drug sits between two protein parts; 20 residues touch it, mostly by oily contact, with one hydrogen bond and one cation–π contact.

**Rebuild.** `py -3 -I gallery/02-ebola-pocket/rebuild.py` (`--skip-render` without ChimeraX).
