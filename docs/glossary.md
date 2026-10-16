# Glossary

Words that the README, the QA marks and the templates use.

| Term | Meaning |
|---|---|
| ink | The share of pixels that are not near white: darker than 235 of 255 in any channel. A pale tint counts as ink. |
| empty cells | The page is cut into a grid of 20 columns and 12 rows. A cell is empty when less than 1 % of its pixels are ink. The mark is the share of empty cells. |
| band | The tallest horizontal strip, across the whole width, that holds no ink. It is given as a share of the figure height. |
| blank rectangle | The largest empty rectangle anywhere on the page, as a share of the area. It is found on tiles of 1/60 of the width. |
| marks | The measured values: ink, empty cells, band, blank rectangle, type size, picture width, words, fonts, pages and width. Each is reported as ok, FAIL or warn. |
| pill | A rounded pale shape for data. It sits between blocks and says what flows. |
| tool block | A saturated rectangle with a bold white name. It computes something. |
| stage strip | A coloured strip that names a stage of a pipeline. It stands at the left edge of a column of blocks, or lies flat on top of one. |
| badge | A small numbered circle that gives the reading order. |
| anchor | A point on a render, in pixels, that sits on a real residue or a real centre: a loop tip, the middle of an epitope. The page ends leaders on anchors. They are written next to each render in `art/`. |
| trim | Cropping a ChimeraX render to the drawn object, with one shared crop for all layers of a group, so that the layers still stack. `struct/trim.py` does it and writes the index with the sizes and anchors. |
| layer | One transparent PNG of a render group, for example the whole complex, the antigen alone, the antibody alone, a close-up. |
| claim boundary | One line at the foot of the figure that says what is real data and what is illustration. |
| token file | A JSON file with the palette: a fill and an edge for each colour family, colours for plots, and the text colours. |
| overclaim read | A review of the figure text and notes by a reader who asks what a reviewer could say the picture proves that the work has not shown. |
| blind read | A review by a reader who sees only the PNG and answers three questions: what does it show, what could you not interpret, what looks wrong. |
