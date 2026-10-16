# Figure grammar

Twenty-five rules, each one checkable. Sizes are for a 178 mm figure; at 89 mm halve the widths and keep the type. The limits are close to what we measured on a set of published antibody-design figures. Use them as a guide.

## A. What a figure is made of

1. **One message, one running object.** The first sentence of the caption states the message in 20 words or fewer. One real object (one structure, one sequence) runs through the figure in one orientation and one colour code. A second object goes in a separate panel.
2. **Draw what flows between stages.** No box without a drawn object beside it, and never two boxes in a row without an object between them. An input is a picture of the input, not a noun in a box.
3. **Two kinds of rectangle.** A state card holds a picture, a tensor or a table. An operation box names a module and shows its input and output. A rectangle that is neither goes. At most 8 boxes per panel and 12 words per box.
4. **Drop test.** Say what the picture shows in one sentence of 20 words. If nothing is lost, use a table or a caption list instead. A chain of six or fewer named steps with no branch, loop or drawn object always fails. A table of items against four or more attributes is a table.
5. **Missing is a gap in the thing.** A dashed outline in place, or empty cells in a sequence strip, the same fill for every mask in the paper. Noise is the real object degraded (dots), not an icon.
6. **Tensors are glyphs.** A pair map is a tile, a sequence is a strip, a batch is a stack of three offset cards, a repeat is a count on the block ("x N"). The long side is at least 12 mm. Colour marks the data type; modules are grey or one tool colour. One expanded block per figure.
7. **Time and noise are written.** Every state of a trajectory carries its value as plain text and sits under one labelled arrow. A sweep is a strip with the value above or below each frame. At most five frames plus an ellipsis.
8. **A concept with no shape gets computed toy data**: 8 to 12 points or a small density, one toy per plate. A maths panel draws the quantity, not its symbol. At most two equations in a panel.
9. **Evidence is a matrix.** Rows are designs or conditions, columns are kinds of evidence, the same drawing in every row, headers once. Controls, thresholds and reference lines are named inside the data panel. Direction ("lower is better") goes in the title.
10. **Status has one channel.** Implemented is a solid fill; designed or proposed is white and dashed. No second code in dash style or tint. Line style encodes data type, at most three styles, key inside the figure.

## B. Structure renders

11. **Style.** Flat colour with a dark silhouette. No shading, no specular reflection, no cast shadow (ChimeraX `lighting flat`, specular 0, silhouettes of about 3 px at 2400 px wide). One background. At most four hues per render. Chains in family tints (binder rose, light chain periwinkle, antigen mint, epitope apricot); loops in the dark tone of their chain. A noise series is spheres at C-alpha positions; the last frame adds the real cartoon as a transparent tint.
12. **Size.** A render that is the subject: at least 45 mm wide. A row of three or four: at least 30 mm each. A state in a process strip: at least 20 mm, and only where a larger render of the same object exists. Under 15 mm it is a pictogram and makes no claim. The render fills at least 80 % of its cell.
13. **Viewpoint.** Fixed across a row. Antigen on the left, binder on the right, loop 3 facing the antigen. A close-up is an inset of at least 25 % of the figure width with leaders to real residues; side chains as sticks.
14. **Label slot.** At most three lines in the same place on every render: a role or identifier, then one or two metrics, at least 7 pt. Loop names at the loop tips with straight leaders that end on a real residue. Role colours are set once and used in text labels too, so a legend is absent or one row.
15. **Provenance in the figure.** Every picture says what it is: deposited structure (PDB id), decoy pose, interpolation path, toy example. The claim-boundary line (rule 20) carries it. Entry, chains, numbering, atom selection and cut-off go in the notes file.

## C. Layout and type

16. **Font.** Arial or Helvetica only, as live text in the PDF. Maths is Arial italic with real sub- and superscripts (`f.rich`, `MS()` in the kit). A symbol that falls back to another font, such as the tilde operator, is replaced until the PDF font list is Arial only.
17. **Type ladder.** Panel letters 9 pt bold lower case. Titles and object names 7.5 pt bold. Labels 7 pt. Secondary text and tick labels 6.5 pt, the floor for everything including maths scripts (maths 8.4 pt, scripts at 78 % come to 6.5 pt). Sentence case, ink colour; a role colour only for a label that names the role.
18. **Grid and alignment.** Outer margin 1.5 mm. Panel gap 2 to 4 mm. A column edge is shared by everything in it: panel letter, image, card and text start at the same x. Labels sit in aligned rows and columns; leaders are straight; baselines of repeated items match.
19. **White space is a budget.** Empty cells of a grid of 20 columns and 12 rows at most 25 %; longest empty full-width band at most 4 % of the height; largest empty rectangle at most 6 % of the area; ink (pixels darker than 235) at least 9 %. Acceptable emptiness: the run of an arrow, a gutter, a dashed gap, an encoded quantity. Strict mode uses tighter limits: ink 20 %, cells 20 %, band 2.5 %, blank 4 %.
20. **Words.** At most 130 words in a schematic and 90 in a plate, 6 per box or label, 3 per arrow. One footnote line of 14 words or fewer, the claim boundary: what is real data, what is illustration. Everything else goes to the caption. Every block has a name; when its job is not obvious it has one plain sub-line. Write link sets as lists ("A1, A3"), never ranges.
21. **Icons need a referent.** A real object, a number or a state. At most two per figure. No gear, shield or scales on every box.
22. **Colour.** At most four hue families per figure plus grey. One meaning per colour across figures. Never colour alone: every distinction also has text, a position or a shape. Contrast at least 4.5:1 for text. No red against green as the only difference.
23. **No generative imagery.** Many journals do not permit it. Sketches never go into a deliverable.

## D. Gate

24. `qa/qa_fig.py` reports ink, empty cells, band, blank rectangle, type size, render widths, words, fonts, pages and width from the built PNG and PDF. Every mark holds, or the notes file gives the reason it does not.
25. Before a figure is adopted: an independent overclaim read ("what could a reviewer say this picture proves that the work has not shown"), a blind read by a reader who sees only the PNG, and the author's look. Authors do not certify their own figures.

## Anti-patterns

A chain of three to six boxes with one to three words each and no object. A generic icon on every box. A blob where a real object belongs. A small render with six leaders. One fact coded three ways. A half-empty legend. The same pipeline drawn twice. A specification (widths, parameter counts) drawn as boxes. Labels rotated by 45 degrees. Rainbow ramps for ordered things. Panel gaps of 7 to 8 mm. Text at 4 to 5 pt. Five or more panels with no matrix. A picture grammar that needs its caption to decode.
