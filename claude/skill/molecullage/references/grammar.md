# Drawing rules

These 28 rules decide how a Molecullage figure is drawn. Each one can be checked on the finished figure, by the QA script or by eye, and each says what goes wrong when it is broken. Sizes are for a figure 178 mm wide; at 89 mm, halve the widths and keep the type sizes. The numeric limits are close to values measured on a set of published antibody-design figures. Treat them as a guide.

## A. What a figure is made of

1. Give the figure one message, and state it in the first sentence of the caption in 20 words or fewer. Let one real object (one structure or one sequence) run through the figure in one orientation and one colour code. Put a second object in a separate panel. When two objects share a panel, the reader takes them for one, and a colour no longer means one thing.
2. Draw what flows between stages. Every box has a drawn object beside it, and two boxes in a row always have an object between them. Show an input as a picture of the input, not as a noun in a box. A row of named boxes tells the reader only the order of the steps; the objects between them show what each step does.
3. Use two kinds of rectangle only. A state card holds a picture, a tensor or a table. An operation box names a module and shows its input and output. Remove any rectangle that is neither. Keep to at most 8 boxes per panel and 12 words per box. Any other rectangle looks like content, and the reader looks for a meaning that is not there.
4. Before you draw, say what the picture would show in one sentence of 20 words. If nothing is lost, use a table or a list in the caption instead. A chain of six or fewer named steps with no branch, loop or drawn object always fails this test. Items set against four or more attributes are a table. A figure that fails this test takes space and shows nothing that the sentence or the table does not.
5. Draw missing data as a gap in the object itself: a dashed outline in place, or empty cells in a sequence strip, with the same fill for every mask in the paper. Draw noise as the real object degraded (dots), not as an icon. An icon for "missing" or "noise" is one more symbol to learn; a gap in the object needs no key.
6. Draw tensors as small fixed shapes. A pair map is a tile, a sequence is a strip, a batch is a stack of three offset cards, and a repeat is a count on the block ("x N"). The long side is at least 12 mm. Colour marks the data type; modules are grey or one tool colour. Expand one block per figure at most. When shapes change from tensor to tensor, or every block is expanded, the reader cannot tell data from modules.
7. Write time and noise as values. Every state of a trajectory carries its value as plain text and sits under one labelled arrow. A sweep is a strip with the value above or below each frame. Show at most five frames plus an ellipsis. Without the values the reader cannot tell the frames apart, and more frames only make each one smaller.
8. Give a concept that has no shape of its own computed toy data: 8 to 12 points or a small density, one toy per plate. A maths panel draws the quantity, not its symbol, and holds at most two equations. A symbol alone shows the reader nothing that the text does not already say.
9. Show evidence as a matrix. Rows are designs or conditions, columns are kinds of evidence, every row uses the same drawing, and the headers appear once. Name controls, thresholds and reference lines inside the data panel. Put the direction ("lower is better") in the title. When rows are drawn differently, the reader cannot compare them.
10. Show status in one way only. Implemented is a solid fill; designed or proposed is white and dashed. Do not add a second code in dash style or tint. Line style encodes data type, with at most three styles and the key inside the figure. When status is coded twice, the reader looks for a second meaning.

## B. Structure renders

11. Render structures in flat colour with a dark silhouette: no shading, no specular reflection, no cast shadow (ChimeraX `lighting flat`, specular 0, silhouettes of about 3 px at 2400 px wide). Use one background and at most four hues per render. Colour chains in family tints (binder rose, light chain periwinkle, antigen mint, epitope apricot), and loops in the dark tone of their chain. Draw a noise series as spheres at C-alpha positions; the last frame adds the real cartoon as a transparent tint. Shading changes the colour of a chain across the render, so the chain no longer matches its key or its text label.
12. A render that is the subject of the figure is at least 45 mm wide. In a row of three or four, each is at least 30 mm. A state in a process strip is at least 20 mm, and is allowed only where a larger render of the same object exists. Under 15 mm a render is a pictogram and makes no claim. The render fills at least 80 % of its cell. A smaller render cannot show the loops and residues that its labels point to.
13. Keep the viewpoint fixed across a row: antigen on the left, binder on the right, loop 3 facing the antigen. A close-up is an inset of at least 25 % of the figure width, with leaders to real residues and side chains as sticks. When the viewpoint changes between panels, the same object looks like a different one.
14. Put the label of every render in the same place, in at most three lines: a role or identifier, then one or two metrics, at least 7 pt. Put loop names at the loop tips, with straight leaders that end on a real residue. Set role colours once and use them in text labels too, so that the legend is one row or absent. When labels move from render to render, the reader has to search for them.
15. Say in the figure what every picture is: a deposited structure (PDB id), a decoy pose, an interpolation path or a toy example. The claim-boundary line (rule 20) carries this. Entry, chains, numbering, atom selection and cut-off go in the notes file. A reader who cannot tell a deposited structure from a toy will take the toy for data.

## C. Layout and type

16. Use Arial or Helvetica only, as live text in the PDF. Write maths in Arial italic with real sub- and superscripts (`f.rich`, `MS()` in the kit). Replace any symbol that falls back to another font, such as the tilde operator, until the PDF font list holds Arial only. A fallback font changes the letter shapes in the middle of a formula.
17. Panel letters are 9 pt bold lower case. Titles and object names are 7.5 pt bold. Labels are 7 pt. Secondary text and tick labels are 6.5 pt, and 6.5 pt is the floor for everything, including maths scripts (maths is 8.4 pt, and scripts at 78 % come to 6.5 pt). Use sentence case and the ink colour; use a role colour only for a label that names the role. Text below the floor is hard to read in print, and a role colour on an unrelated label suggests a link that does not exist.
18. Keep an outer margin of 1.5 mm and panel gaps of 2 to 4 mm. Everything in a column shares its edge: panel letter, image, card and text start at the same x. Labels sit in aligned rows and columns, leaders are straight, and the baselines of repeated items match. Edges that are almost aligned look like errors.
19. White space has a budget. In a grid of 20 columns and 12 rows, at most 25 % of the cells are empty. The longest empty band across the full width is at most 4 % of the height. The largest empty rectangle is at most 6 % of the area. Ink (pixels darker than 235) covers at least 9 %. Some empty space carries meaning and is allowed: the run of an arrow, a gutter, a dashed gap, an encoded quantity. Strict mode uses tighter limits: ink 20 %, cells 20 %, band 2.5 %, blank 4 %. A large empty area leaves less room for the content, which then needs smaller pictures and smaller type.
20. Use at most 130 words in a schematic and 90 in a plate, 6 per box or label, and 3 per arrow. Add one footnote line of 14 words or fewer, the claim boundary: what is real data and what is illustration. Everything else goes in the caption. Every block has a name; when its job is not obvious, it has one plain sub-line. Write sets of links as lists ("A1, A3"), never as ranges. A figure with too many words is slow to read, and one with too few cannot be read without its caption. A range claims members that may not be in the set.
21. Use an icon only when it stands for something: a real object, a number or a state. Use at most two per figure. Do not put a gear, a shield or scales on every box. An icon on every box adds ink and no information, and the reader still tries to decode it.
22. Use at most four hue families per figure, plus grey, and give each colour one meaning across all figures. Never use colour alone: every distinction also has text, a position or a shape. Text has a contrast of at least 4.5:1. Never make red against green the only difference. Readers with red-green colour blindness can see such a pair as one colour, and a greyscale print loses any difference carried by hue alone.
23. Do not use images from generative models. Many journals do not permit them. Do not put a generated sketch into a deliverable either. A generated picture can show detail that no data supports.

## D. Checks before a figure is used

24. `qa/qa_fig.py` measures ink, empty cells, empty band, blank rectangle, type size, render widths, words, fonts, pages and width on the built PNG and PDF. Every check passes, or the notes file gives the reason it does not apply. Without a written reason, the next person who builds the figure cannot tell a deliberate exception from a fault.
25. Before a figure is used, it gets three reads. The first is an overclaim read: an independent reader asks what a reviewer could say this picture proves that the work has not shown. The second is a blind read: a reader who sees only the PNG says what it shows. The third is the author's own look. Authors do not certify their own figures, because they know what a figure should show and see that in it.

## E. Schematics read by someone outside the field

These three rules came from a thesis, where the first block schematics were called "very good design, but non-intuitive" and "lacking schematics and representative thumbnails". A reader who does not know the field needs to be told what the system is for and shown one real example of what each block holds.

26. Say in one line at the top of a schematic what the drawn system is for, in plain words: at most 14 words, 7.5 to 8 pt bold. Write "proposed" when the system is a design. Without it a reader sees clean boxes and arrows and cannot tell what they serve. The line claims no more than the claim-boundary line allows.
27. Put one real example object in each block that matters: a thumbnail 12 to 22 mm wide (a structure render, a small matrix, or a mini plot made from the project's own data), with one frame style and the same place in every block, and its source (file, entry id, data file) in the notes. A thumbnail replaces words, so the word budget of rule 20 still holds. Structure renders must also pass the render-width check, so plan the page for it; the page then grows in height.
28. A thumbnail never shows a result for a block that has not run. On a designed (white, dashed) block it shows an input or an intended object, drawn grey. Say on the picture or in the key that it is an example, name a stand-in system ("mi3", "toy square"), and call a fragment a fragment ("part of MS2, 5TC1"). The status key says what solid and dashed mean, and a picture does not use dashed strokes for content, because the reader then cannot tell a drawn dash from the status dash. Readers who did not know the figure mistook full-colour pictures on solid blocks for outputs until the key said otherwise.

## Common faults

These are the faults that the rules above catch most often:

- a chain of three to six boxes with one to three words each and no object;
- a generic icon on every box;
- a blob where a real object belongs;
- a small render with six leaders;
- one fact coded three ways;
- a half-empty legend;
- the same pipeline drawn twice;
- a specification (widths, parameter counts) drawn as boxes;
- labels rotated by 45 degrees;
- rainbow colour ramps for ordered values;
- panel gaps of 7 to 8 mm;
- text at 4 to 5 pt;
- five or more panels with no matrix;
- drawing conventions that the reader can decode only with the caption.
