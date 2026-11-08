# QA checks

`qa_figure` (or `py -3 -I qa/qa_fig.py <out/key>`) measures the built PNG and PDF. `--quick` measures the PNG only. The JSON output lists the checks under `marks`.

| Check | Measures | normal | strict |
|---|---|---|---|
| ink | pixels darker than 235 of 255 in any channel | at least 9 % | at least 20 % |
| cells | empty cells of a grid of 20 columns and 12 rows (under 1 % ink) | at most 25 % | at most 20 % |
| band | longest run of empty pixel rows, share of the height | at most 4 % | at most 2.5 % |
| blank | largest empty rectangle of tiles (tile = 1/60 of the width) | at most 6 % | at most 4 % |
| type | smallest text in the PDF | at least 6.5 pt | at least 6.5 pt |
| render | smallest embedded raster, width | at least 20 mm | at least 20 mm |
| words | words in the PDF against `words.schematic` (130) or `words.plate` (90) with `kind` | warning | FAIL |
| fonts | Arial only | warning | FAIL |
| pages | one | FAIL | FAIL |
| width | one of `widthMm` (183, 136, 89 in Nature mode; 178 stays valid) within 1 mm | warning | FAIL |
| overplate | nested word-holding boxes (a box inside a box, rule 40); needs `<key>.build.json` | 0 (warning) | 0 (FAIL) |
| boxes | Nature mode: share of the area covered by rectangles that hold words (cards, tool blocks, pills, stage strips, bands); needs `<key>.build.json` | at most 25 % (warning) | at most 25 % (FAIL) |
| typeMax | Nature mode: text above 8 pt (panel letters 8 pt, other text 7 pt or less) | warning | warning |

In Nature mode a page whose box share is within the limit is judged with plot densities (ink at least 3 %, empty cells at most 50 %, largest empty block at most 10 %; `standards.natureMode.density`). `boxes` and `typeMax` run only in Nature mode (`standards.mode`, default `nature`; `docs/nature-mode.md`). A page that is a real process diagram sets `"standards": {"mode": "diagram"}` and says why in its notes file. The limit comes from `standards.natureMode.boxShareMax`.

`loose` uses the normal limits and reports every failure as a warning; the exit code stays 0. Any FAIL gives exit code 1.

Each failed check comes with its reason, for example "ink 6.7 % is below 9.0 %". Fix the figure, or write in the notes why the check does not apply. Good reasons: a plot layer is white by design; a mask is a gap; a sequence track leaves white where no set holds a residue. "It looks fine" is not a reason. Do not add decoration to pass a check: it adds ink and no information.

The limits are close to values measured on a set of published antibody-design figures; treat them as a guide. They suit schematics and plates. Plot pages usually need `loose`.
