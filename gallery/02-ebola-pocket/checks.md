# Checks and notes for 02-ebola-pocket

Plain notes behind `how.md`. Paper: Bu et al. 2026, Nature Communications 17:10401 (PMC13627709). Entry: PDB 9PEL, cryo-EM 2.54 Å, deposited 2025-07-02, released 2026-08-12 (dates and resolution read from the file).

## What is data and what is illustration
- Data: the 9PEL coordinates, the contacts computed from them, the distances 3.2 Å and 3.8 Å, the 5 Å scale bar.
- Illustration: the flat 2D drawing of the inhibitor (RDKit CoordGen 2024.09.6, from the bond graph inside the entry), the positions of tiles, the transparent look of the ribbons, the viewing direction.
- Stereochemistry: the three stereocentres are drawn with wedge and hash bonds. RDKit assigned R or S from the deposited 3D coordinates of the ligand (C02 R, C26 R, C37 S), the script stops unless these equal the labels of the component, and the 2D drawing is only rotated, never mirrored. The (2P) axis between quinoline and benzimidazole is not marked.

## Definitions used (all in `src/pocket_contacts.py`)
- Contact: a non-hydrogen atom of the residue within 4.5 Å of a non-hydrogen atom of the inhibitor.
- Hydrogen bond: N or O pair within 3.5 Å, donor and acceptor roles fitting; a ring nitrogen must have the partner within 60° of its lone-pair direction. The file has hydrogens on some atoms only, so no hydrogen angle is used.
- Cation–π: centre of the Arg guanidinium N atoms within 6.0 Å of an aromatic ring centre and within 2.0 Å of the ring normal (the limits PLIP uses; the code is ours).
- Hydrophobic contact: a contact with at least one carbon–carbon pair within 4.5 Å.
- Residue with an alternative conformation (Gln551, chain a): the one with the higher occupancy (B, 0.56), the one ChimeraX shows.

## Computed against the paper
| Paper says | Computed from 9PEL |
|---|---|
| 18 GP residues in direct contact, analysed with LigPlot (the paper states no distance limit) | 20 within 4.5 Å. The 18 residues of the original's panel B (a list that exists only as pixels there, used for this check only) are all inside my 20. Extra: Ser41 (one N–O pair, 4.44 Å) and Leu184 (fluorine contact, F35 to CD1 3.11 Å). The figure says so in one line. |
| Only five polar residues: Ser65, Arg64, Glu100, Thr519, Gln551 | All five are in the set. Ser65, Glu100 and Gln551 each have a carbon–carbon pair, as the paper says (hydrophobic contribution). |
| Thr519 forms a hydrogen bond | Yes: Thr519 OG1 to quinoline N15, 3.20 Å, 30° from the lone-pair direction. It is the only one. |
| Arg64 forms a cation–π interaction | Yes: guanidinium centre 3.84 Å from the centre of the quinoline pyridine ring (offset 1.34 Å), also 3.98 Å from the quinoline benzo ring (offset 1.69 Å). Drawn: the nearer ring. |
| (not stated) | Arg64 NH2 to N15 is 3.16 Å but 74° above the ring plane: stacking, not an in-plane hydrogen bond, so not counted. |

Of the 20 tiles: 1 hydrogen bond (Thr519), 1 cation–π (Arg64), 17 hydrophobic, 1 polar only (Ser41, 4.44 Å: a proximity, not a bond; the figure prints 4.4 Å on its line).

Not drawn: the western (8 residues) and eastern (10 residues) regions and the strand names β1 to β19. They depend on the paper's own region definitions and secondary-structure labels, which I cannot reproduce from the text.

## Comparison entries, checked but not drawn
- 5JQ7 (toremifene, ligand T0R): 18 residues within 4.5 Å; the paper says 17 but lists no residues in its text, so I cannot say which one is extra.
- DFF lid (Asp192, Phe193, Phe194): the paper says it is disordered with MWAC-3634. In 9BSV residues 190 to 199 are modelled; in 9PEL chains A, B and C no residue from 190 to 200 is modelled. Consistent with the paper.
- Chains: the inhibitor in chain A touches only chains A and a (likewise B with b, C with c). No glycan, nanobody or other protomer is within 4.5 Å.

## Source Data
`41467_2026_77332_MOESM4_ESM.xlsx` has 14 sheets: Figure 2c, 6a, 6b, 6c, 6d, S3, S4, S5a, S5b, S6a, S7a to S7d. None belongs to Fig. 3, 4 or 5. The potency and thermal-shift numbers in the paper text (IC50 1.2 nM and 0.65 nM, ΔTm 4.0 and 7.2 °C) are not plotted in Fig. 4 or 5, so no data panel was added.

## Reading the original
Fig. 5 was fetched into the scratchpad only (never into the repo) and read. Fig. 4 returned a bot check (an HTML challenge page, not an image); I did not retry or work round it and used its legend.

## Lines and end points
Both panels carry the same 20 tiles, and every tile has exactly one line, in the style of its contact. Panel b: the line ends on an inhibitor atom the residue touches: N15 for the hydrogen bond, the pyridine ring centre for the cation–π, N39 for Ser41, and for a hydrophobic line a carbon that makes a carbon–carbon pair with the residue (computed). Panel a: the line ends on a residue atom that touches the inhibitor (the closest one unless it is not drawn or too near another end, ends at least 1.5 mm apart); the three special tiles continue in the same line to N15, the ring centre or N39, as in panel b. Backbone atoms are not drawn in the render (the ribbon hides them) except for Ser65, whose only contacts are backbone atoms, so a line never ends on an undrawn atom. The page checks: no two lines cross, all end points are 1.5 mm apart, ends sit on the render anchors, hydrophobic lines end on carbons with a carbon pair. One exception, listed in the page data: Leu43 and Leu184 both end on C32 (the CF3 carbon), because it is the only carbon that makes a carbon–carbon pair with Leu43 and the only one left for Leu184 once C52 is taken by Leu558.
The sheet asked for leaders from each 2D residue to its place in the 3D view. Twenty long straight leaders across the inhibitor drawing would cross it, so the tiles are the link: same name, colour and chain letter in both panels.

## QA
`qa/qa_fig.py` at normal strictness: ink 15.7 %, empty cells 15.0 %, longest empty band 2.8 %, largest empty rectangle 2.9 %, smallest text 6.55 pt, smallest render 22.5 mm, Arial only, one page, 178 x 141.5 mm. Words: 304 against a budget of 130 (warning only). Forty residue tiles (name and chain) account for 80 of them and the key and the definitions of the contact types for most of the rest; the brief asks for the chain and number on every residue label and every symbol to be defined on the figure.

## Changes after the accuracy and blind reads
Stereo wedges and hashes added, with the check against the component. A line in the figure states that the paper lists 18 residues. Ser41 carries 4.4 Å. The overview names the entry (one of three copies, nanobody and glycans not drawn). The key names component A1CIK. Hydrophobic lines in panel b end on carbons that make a carbon–carbon pair. Panel a lines use the same styles as panel b, carry the distances, and end on drawn atoms, each at least 1.5 mm from every other end (the view direction is chosen so that this holds: `src/choose_view.py`). Thr519, Arg64 and Ser41 have one line each, ending on N15, the ring centre and N39 in both panels. The secondary amide is drawn as NH. The key sits under the panels, with sample tiles that show the chain letters. Contact is defined twice, in different words, once: "Listed: any atom within 4.5 Å. Hydrophobic line: a carbon pair within 4.5 Å."

## Data downloaded
See `data/SOURCES.txt` (URL, size, SHA-256): 9PEL.cif 1,164,917 bytes; 5JQ7.cif 666,217 bytes; 9BSV.cif 1,137,571 bytes; Source Data xlsx 64,359 bytes. The EMD-71566 map was not downloaded. Hashes are pinned in `fetch_data.py`.
