# Figure audit

Marks are in percent: ink, empty cells, longest empty band, largest blank rectangle (limits at strictness normal: ink at least 9, cells at most 25, band at most 4, blank at most 6). Worst is the smallest colour-vision distance (CIEDE2000) among the dominant colours; the shipped palette reaches 11.5.

| id | kind | verdict | ink / cells / band / blank | colours | dpi | reason |
|---|---|---|---|---|---|---|
| bfactors | plot | **RESTYLE** | 7.91 / 32.92 / 7.29 / 9.38 | 4 hues, worst 18.1 | 91 | Same data, new palette and type: raw axis names, no units, a title that says nothing, legend on the data, 91 dpi, empty space. |
| pipeline | schematic | **REDRAW** | 30.55 / 51.25 / 17.19 / 22.95 | 4 hues, worst 35.4 | 114 | Five plain boxes with no data between them, mixed type sizes, comic font, colours without meaning, half the page empty. |
| structure | structure | **REPLACE** | 99.96 / 0 / 0 / 0 | 0 hues, worst n/a | 137 | A black-background screenshot, one colour for all chains, no labels, 137 dpi: make a flat render with the role colours. |

## Blind reads

- **bfactors**: Reader saw a line plot of two chains but not the point; could not read bfac, res, A and L; flagged the empty title, no units, legend on the data, no marked regions.
- **pipeline**: Reader got the flow Sequences, Fold, dock, SCORE, best ones; could not say what flows between steps or what the colours mean; flagged informal title, comic font, uneven boxes, tiny arrows, empty space.
- **structure**: Reader saw ribbons on black and could not say which protein, how many chains or where the interface is; flagged the single colour, black background, no labels, wide empty margins.

Verdicts: KEEP, RESTYLE (same content, new palette and type), REDRAW (new page from a template), REPLACE (a real render or a data plot instead of a drawing), DEMOTE (becomes a table or text). Rules: references/audit-rubric.md.
