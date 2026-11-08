<!-- version: 2 | date: 2026-11-07 -->
# Nature mode

Nature mode is the default for figures for papers. It asks one thing: a figure shows data on axes, and boxes are the last resort.
Origin: the owner, 2026-11-07 ("more Nature-like, not just casual rectangles and schematics"). Numbers in rule 34 and 35 come from the Nature guide "Final submission" (nature.com/nature/for-authors/final-submission, read 2026-11-07). Nature mode is a style target, not a promise that a journal accepts the figure.

## Why

A box with a word in it tells the reader the order of steps. It does not tell a number, a trend or a comparison. A reader of a paper looks for marks on an axis: dots, bars, lines, tiles. The gallery pieces 03 (benchmark plots) and 12 (small multiples) show the target. A page that is mostly cards looks like a slide.

## Choose the form from the message

Write the message of the figure in one sentence. Then find its row.

| The message is | Draw | Do not draw |
|---|---|---|
| a number or a threshold | a mark on a labelled axis, the threshold as a line or a band named in place | a card that holds the number |
| a time course | points and lines on a real time axis | arrows between boxes that carry times |
| a comparison of groups | the points of every animal, study or sample, with the summary beside them; small multiples on one axis | a bar of means alone |
| a ranking | a sorted dot or bar plot | a numbered list in boxes |
| shares of a whole | one stacked bar on a shared axis | a pie, or boxes with percentages |
| counts by two categories | a unit matrix: one square is one item | a table of text boxes |
| a conversion between scales (for example IgG, Brix and total protein) | parallel axes aligned on one ruler, with the category bands | a table of boxes |
| a process with real objects (structures, files, samples) | a diagram, in diagram mode (rules 2 and 3) | boxes with names only |
| a mechanism | one real object, labelled | a chain of named boxes |

If the message is order only ("first this, then that"), say it in the caption or in the title. Do not draw it.

## Rules (29 to 38; rules 1 to 28 are in `grammar.md`)

29. Form follows message (the table above). At most one panel of a figure is a diagram. Rectangles that hold words cover at most 25 % of the figure area (QA mark `boxes`).
30. Every axis names the quantity and its unit. The panel title says the direction ("higher is better"). A threshold is a line or a band inside the axis, named in place.
31. Show the data. Draw the points when a group has 30 values or fewer. For more, draw the range or the interval, and say what it is. Never draw a mean as a bare bar.
32. Repeated comparisons use small multiples: same axes, same scale, same order.
33. Label in place. A legend is for the encodings that cannot carry a label. Put no text over a shaded area or an image (Nature).
34. Panel letters are 8 pt bold, upright, lower case. All other text is 7 pt or smaller. The floor stays 6.5 pt (Nature allows 5 pt; we keep a higher floor for print safety). One sans-serif font in the whole paper. Lines are 0.25 to 1 pt at final size (Nature).
35. Width is 89 mm, 120 to 136 mm or 183 mm; depth is at most 247 mm (Nature). Fill the width and keep white space low (rule 19). Old figures at 178 mm stay valid.
36. Output is vector PDF with live text. Do not rasterise plots or text (Nature). The PNG is for preview and drafts.
37. A colour has one meaning in the whole figure set. Use at most four hue families. A sequential ramp has one hue. A diverging ramp needs a meaningful zero. Never use a rainbow. Check every palette with `palette_check`. A colour is never the only difference between two things.
38. Put the source, the number of items and a mark for every computed value on the figure (rule 20 claim-boundary line). Never invent a curve, an error bar or a p-value.

## Checks

- `build_figure` writes `<key>.build.json` next to the PNG: text sizes and the share of the area that words-in-rectangles cover.
- `qa_figure` adds two marks in Nature mode: `boxes` (limit `standards.natureMode.boxShareMax`, default 25 %; warning in normal, FAIL in strict) and `typeMax` (warning above 8 pt).
- Density marks. A data plot is mostly white: thin lines and small marks. The schematic limits (ink at least 9 %, empty cells at most 25 %, largest empty block at most 6 %) would push it toward filled boxes. In Nature mode a page whose box share is within the limit gets plot limits: ink at least 3 %, empty cells at most 50 %, largest empty block at most 10 % (`standards.natureMode.density`). Strict mode keeps its own limits. The band mark (4 %) stays.
- The form choice cannot be measured. The blind read has a fourth question for it (`blind-read.md`, question 4). Fix every answer to question 4 before you call the figure finished.
- A page that is a real process diagram sets `"standards": {"mode": "diagram"}` in `molecullage.json` and writes the reason in the notes file.

## Settings

```json
"standards": { "mode": "nature", "natureMode": { "boxShareMax": 25, "density": { "ink": 3, "cells": 50, "blank": 10 } } },
"typeLadder": { "letter": 8, "title": 7, "label": 7, "floor": 6.5, "math": 8.4 },
"widthMm": [183, 136, 89]
```

## Redesign an existing figure in six steps

1. Write the message in one sentence.
2. List every number and every claim the figure makes.
3. Pick the form of each from the table. Plot the numbers. Keep a diagram panel only where the objects are real.
4. Move words that only name or order steps into the title and the caption.
5. Build, run `qa_figure` (full run), then the blind read with question 4.
6. Write in the notes file what was a box before and what it is now.

## Example

The review of calf immunity had a colostrum figure with twelve step boxes, a forest plot and a "map" of squares. In Nature mode the step boxes went to a table with numbers and sources (the order of steps is a list, not a figure). Two figures were drawn from the numbers of papers read in full: a forest plot of pooled risks with the outlier models shown as open marks, and three panels on one page (sensitivity and specificity of two refractometers against the cut-off, and the share of calves per consensus category before and after an adjustment, with the herd goals as ticks). The map of squares stayed, because a unit matrix is a data form. Box share of all three pages is 0 %.
