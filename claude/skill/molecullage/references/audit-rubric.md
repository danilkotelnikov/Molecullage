# Audit rubric

`audit_figure` measures a figure and suggests a verdict. You decide the verdict after you have looked at the picture and read the blind reader's answer. Record it with `audit_figure(path, verdict, reason, blind_read)`.

## What the tool measures

| Measure | Meaning | Limit (strictness normal) |
|---|---|---|
| ink | share of pixels darker than 235 of 255 in any channel | at least 9 % |
| cells | share of the cells of a 20 by 12 grid with under 1 % ink | at most 25 % |
| band | longest run of empty pixel rows, share of the height | at most 4 % |
| blank | largest empty rectangle, share of the area | at most 6 % |
| colours | dominant colours (at least 1 % of the non-white pixels), how many are chromatic | at most 8 hues |
| worst distance | smallest colour-vision distance (CIEDE2000, four vision types) among the dominant colours; pale tints above L 85 are backgrounds and are not compared | at least 11.5 (what the shipped palette reaches) |
| effective dpi | pixel width divided by the width in inches at the target width | at least 300; line art at least 600 |
| size in mm | the figure at the target width | the width of the project |
| smallest text | PDF only: smallest font size scaled to the target width | at least 6.5 pt, Arial only |

The first four are the same layout checks that `qa_figure` runs, computed on the raster. A picture with a dark background (ink above 90 %) is flagged, and its empty-space checks are not used. Photos and tables are not held to the layout and colour checks.

## Verdicts

| Verdict | When | What it means |
|---|---|---|
| KEEP | every check passes and the blind reader got the message | leave it; check the caption and the file |
| RESTYLE | the content and layout are right; palette, type, units, labels or resolution are not | same data and layout, new palette and type; use the script if there is one |
| REDRAW | the layout fails (empty space, uneven boxes, no flow) or the picture is a drawing that a template covers | new page from a template; keep the content |
| REPLACE | a drawing or screenshot stands for something that exists as data or a structure | a real ChimeraX render, or a plot made from the data |
| DEMOTE | a table or a sentence says the same | set it as a table or text; the figure goes |

The tool's suggestion depends on the kind of figure:

- photo or micrograph: KEEP. It is data. Check the resolution only.
- table: DEMOTE.
- structure picture: REPLACE when any check fails (a screenshot, a dark background, low resolution); KEEP otherwise.
- plot: KEEP when every check passes; RESTYLE when any fails. Without a script, the data must come from the author.
- schematic: KEEP when every check passes; REDRAW when a layout check fails or two things fail; RESTYLE when only colour, type or resolution fails.

## When to override the suggestion

- The blind reader could not say what the figure shows: at least REDRAW, even if every check passes.
- The figure is a good drawing of something that exists as data: REPLACE.
- A check fails for a reason that is part of the design (a white plot layer, a sequence track with gaps): KEEP, and write the reason in `reason`.
- The figure would take more than three rounds and adds little: DEMOTE or KEEP, and tell the user.

## The reason

Write one sentence. Say what fails and what the new version will do, for example: "Five plain boxes with no data between them, mixed type sizes, half the page empty." A phrase such as "poor quality" tells the builder nothing to fix.

## The kind

The inventory guesses the kind from the file name, the caption and the pixels. Look at the picture, and pass the kind you see: `structure`, `schematic`, `plot`, `table` or `photo`.
