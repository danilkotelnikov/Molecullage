# Glossary

Words used in the README, the QA script and the templates.

| Term | Meaning |
|---|---|
| ink | The share of pixels that are not near white: darker than 235 of 255 in any channel. A pale tint counts as ink. |
| empty cells | The page is cut into a grid of 20 columns and 12 rows. A cell is empty when less than 1 % of its pixels are ink. The check reports the share of empty cells. |
| band | The tallest horizontal strip across the whole width that holds no ink, as a share of the figure height. |
| blank rectangle | The largest empty rectangle anywhere on the page, as a share of the area. It is found on tiles of 1/60 of the width. |
| QA checks | The measurements that `qa/qa_fig.py` makes on a built figure: ink, empty cells, band, blank rectangle, type size, picture width, words, fonts, pages and width. Each is reported as ok, FAIL or warn. In the JSON output they are called `marks`. |
| drawing rules | The 28 rules in `docs/grammar.md` that decide how a figure is drawn. |
| pill | A rounded label for a piece of data. It sits between blocks and says what passes from one to the next. |
| tool block | A saturated rectangle with a bold white name, for a step that computes something. |
| stage strip | A coloured bar that names a stage of a pipeline. It stands at the left edge of a column of blocks, or lies flat across the top of one. |
| badge | A small numbered circle that gives the reading order. |
| anchor | A point on a render, in pixels, that sits on a real residue or a real centre, such as a loop tip or the middle of an epitope. The page ends leaders on anchors. They are stored next to each render in `art/`. |
| trim | Cropping a ChimeraX render to the drawn object, with one shared crop for all layers of a group, so that the layers still stack. `struct/trim.py` does it and writes the index with the sizes and anchors. |
| layer | One transparent PNG of a render group, for example the whole complex, the antigen alone, the antibody alone, or a close-up. |
| claim boundary | One line at the foot of the figure that says what is real data and what is illustration. |
| token file | A JSON file with the palette: a fill and an edge for each colour family, colours for plots, and the text colours. |
| overclaim read | A review of the figure text and notes by a reader who asks what a reviewer could say the picture proves that the work has not shown. |
| blind read | A review by a reader who sees only the PNG and says what it shows. The reader answers three questions: what does it show, what could you not interpret, and what looks wrong. |
| checkpoint | A point in the project redesign where Claude stops and you decide: after the plan (checkpoint A) and after the two prototypes (checkpoint B). |
