# Redesign plan

Project: sample-project. Target width: 178 mm. 3 figures: 3 to rebuild, 0 to keep or set as a table.

## One palette

Token file: tokens/tokens.base.json. Smallest colour-vision distance among the core families: 11.5 (CIEDE2000). Families: mint #91D7AB, rose #E16F6B, peri #9B51E1, apricot #FBB153, indigo #1D397B, violet #F1C3DD, grey #FFEDD1, full #FFFFFF, green #01B151, purple #9B51E1, maroon #9B2D61, palemint #D1F1EB, palelilac #EFCBFF, palepink #FFD9D7, palesky #E9F3F9.

Roles: antigen = mint, target = mint, binder = rose, heavy = rose, light = peri, epitope = apricot, model = indigo, base = indigo, complex = violet, neutral = grey, module = grey, cream = grey, ok = mint.
A role colour means that role in every figure of the project and nothing else.

## One type ladder

Arial only. Panel letter 9 pt bold, title 7.5 pt bold, label 7 pt, floor 6.5 pt. At most 6 words per box, 3 per arrow, 130 words in a schematic, 90 in a plate, one footnote line.

## Figures

| id | kind | verdict | template | what to do |
|---|---|---|---|---|
| bfactors | plot | RESTYLE | plots2 | same content: new palette and type, from the script if there is one |
| pipeline | schematic | REDRAW | pipeline | new page from the template; keep the content |
| structure | structure | REPLACE | structures | real render (render_structure) or a data plot instead of the picture |

## Order of work

1. structure (REPLACE, template structures) - prototype
2. pipeline (REDRAW, template pipeline) - prototype
3. bfactors (RESTYLE, template plots2)

## Gate

Build structure and pipeline first. They stand for one structure-led and one schematic figure. Show them next to the old versions with the QA numbers. Nothing else is rebuilt before a yes.

## Effort

About 7 build rounds in total (restyle 1, redraw 3, replace 3, table 1). Each round is a build, the QA marks, a blind read and a fix list. After three rounds on one figure, ask the user.

## Not changed

Original files are never overwritten. New files get new names under molecullage/figures/. Swapping them into the project is a separate step the user asks for.
