Redesign of Figure 1 of Fry et al. 2026, Cell, doi 10.1016/j.cell.2026.08.057. Licence CC BY 4.0 (read at Europe PMC and in the article). The original is not reproduced here; open it at the DOI.

**The original** (panels C to F, read on a downloaded copy of the figure) draws the monomer twice, as a map and as a cartoon side by side, with about 20 subunit colours (several blues, several greens) and hand-placed labels. The key (F) is a table of 19 subunits without any colour, so a reader cannot join a row to a colour. The de novo and homology marks sit only in that table.

**The redesign** draws the deposited model once, as flat surfaces (one per chain), plus a second view turned 90 degrees. The headline is the paper's finding: the TCA-cycle enzyme MDH is integrated into the ATP synthase. Colour family = module (F1, Fo, Stalk: the "Domain" column of the paper's table); tone = subunit; grey = chains the entry calls "unknown protein". Each ring sits in the largest visible flat area of the chain it names. The key table has swatch, copies, panel, entity, gene ID, boxed chain ids and the paper's mark.

**Numbers.** Entities, chains, gene IDs and resolution come from the mmCIF of PDB 9ZFT (10,502,535 bytes, SHA-256 pinned in `fetch_data.py`); 9ZFW (2,077,896 bytes) only confirms that subunits e and g are built there. Names, modules and marks come from the table in Fig. 1F, read from the figure image.

**Rebuild** (Python, ChimeraX 1.10, Node, Chrome), from the repository root:

```
py -3 -I gallery/05-atp-synthase/fetch_data.py
py -3 -I gallery/05-atp-synthase/src/entities.py
py -3 -I gallery/05-atp-synthase/src/tones.py
MOLECULLAGE_ART=$PWD/gallery/05-atp-synthase/art py -3 -B struct/run_cx.py gallery/05-atp-synthase/src/render_atp.py
py -3 -I gallery/05-atp-synthase/src/anchors.py
py -3 -I gallery/05-atp-synthase/src/make_layout.py
node build/build.mjs gallery/05-atp-synthase/page/05-atp-synthase.html 178 --out gallery/05-atp-synthase --art gallery/05-atp-synthase/art
py -3 -I qa/qa_fig.py gallery/05-atp-synthase/05-atp-synthase
```

---

## Checks and open points (for reviewers)

**Ten-second reading.** An ATP synthase seen from the side: a blue head on a gold base, a pink and dark-red stalk, and the brick-red enzyme MDH on top, which the headline says is part of the complex; every subunit is named on a picture or in the key, with module, entity number, gene ID and chain ids.

**Fig. 1F image checked.** I opened the table in the Fig. 1F image (a copy fetched from the PMC server into the scratchpad) and checked, row by row, the subunit names (the table prints MASA, 04460 and Atp6 as the key does), the "Domain" column (F1, Fo, Stalk), the gene IDs and every mark. The marks are a star for epsilon, IF1, c and 04460 and a dot for all other subunits, delta included. The accuracy reader could not open the image.

**Where the paper and the data differ.**
- Subunit delta: the table marks it de novo (dot). The Results do not call it homology; they list "c, delta and epsilon, IF1, and ACANB04460" as components that complexome data identified, and delta with epsilon in the AlphaFold3 rotor model. The note under the key says that.
- Resolution: the entry gives 4.3 A; the text and Table 1 give 4.2 A for the monomer map. The footer prints both.
- Epsilon: Fig. 1F gives ACANB12077/06500; the entry holds ACANB12077 only. The key prints the entry's value and a note names 06500. The entry details of gamma repeat ACANB07530.
- Subunits e and g are in Fig. 1F but have no entity in 9ZFT (asserted). `tones.py` asserts that both gene IDs are in 9ZFW, titled "Membrane region of Acanthamoeba castellanii mitochondrial ATP synthase dimer". Table 1 gives 6,185 protein residues for the monomer, the entry has 6,415 C-alpha atoms; not printed.
- The sheet names 9ZFU (F1), 9ZFV (MDH-OSCP) and 9ZFW (membrane region). The paper's data statement and key-resources table give 9ZFV for F1, 9ZFW for MDH-OSCP and 9ZFU for the Fo dimer. By its RCSB title and its entities, 9ZFW is the membrane region.

**Reading choices.**
- Modules are the paper's three "Domain" words, so gamma, delta and epsilon sit in F1 (the module line says "with gamma, delta, epsilon, IF1"). MASA and MDH stay in Stalk, as the table and the text ("three Acanthamoeba-specific subunits in the peripheral stalk") have them; a note calls them the "hat" above OSCP, the paper's word. A fourth module would be my invention.
- "04460" is a gene number that the paper uses as a name; a note says so. OSCP is expanded with its standard name, which the paper does not give.
- Grey chains are the entry's entities 18 to 21. That they are the helices the paper calls "visible, but unassigned" (Fig. 1D, grey) is my reading of the entry; the note quotes the paper's words.
- "Identified" copies the table: dot = de novo, star = homology; it is not a confidence value.
- Nucleotides, Mg and hydrogens are deleted; no membrane is drawn, because the paper gives no membrane position for the monomer.
- Surfaces are ChimeraX molecular surfaces, one per chain (`surface #1`, probe 1.4 A, grid 0.6 A), flat lighting, silhouettes 3.4 px at 2400 px. Chains of one subunit share a tone, so the nine c chains read as one ring. View a shows 33 of the 34 chains (alpha copy a is hidden); view b shows all. The rotor axis (C-alpha centroids of the c-ring and of alpha plus beta) is vertical, F1 up, subunit b to the left in a; b is a quarter turn about that axis, stalk side toward the viewer. One scale.
- A subunit is labelled in view b when b shows at least 1.45 times the flat visible area of a (8, d, f, 04460, i/j); the Panel column of the key says where.

**Rings and leaders.** Anchor = the deepest point of the largest connected piece of the chain's flat surface (id render of the same camera, minus outlines and edges), at least 1.1 mm from an edge (0.6 mm asserted). This replaces the projected centroid, which lies off the visible surface for most chains (distances in `tables/anchors.csv`). Where a subunit has several copies, `make_layout.py` picks the copy that gives the cleanest leader. Asserted: no crossing; at least 1.5 mm between any leader and another ring or leader; 2.5 mm between rings; the anchor pixel is on the chain (id render) and has the subunit's tone in the final PNG (`anchors.py`); leader ends on the ring and ring on the anchor pixel (`checkAlign`).

**Colour.** Three families of the token file (indigo, apricot, rose) plus grey. A tone is a lightness and a hue shift of at most 16 degrees inside the family; a hill-climb moved all 17 tones (`tones.py`). Touching subunits (34 pairs, any atoms within 4.5 A) differ by at least 14.3 CIEDE2000 (worst of normal vision and three colour-vision types; 14.7 in normal vision; 10 is asserted). The smallest distance between any two of the 18 colours is 10.5 in normal vision and 8.5 in the worst case (8 and MASA).

**Build checks** (`checkAlign`, 0.25 mm, on the rendered page): panel letters and titles, renders on their boxes, label columns and rows, leaders, rings, table columns and rows, outer margin, no text on text.

**QA** (`qa_fig.py`, normal): ink 17.9 %, empty cells 16.7 %, longest empty band 2.7 %, largest blank 4.2 %, smallest type 6.55 pt, Arial only, one page, 178 x 200.9 mm, renders 55.0 mm (a) and 40.2 mm (b) wide. Words 493 against 130 (warning): the key table with its gene IDs and chain lists, and the notes the review asked for, are most of them; the same reason as in piece 03.
