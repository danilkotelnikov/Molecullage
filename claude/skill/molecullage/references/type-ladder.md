# Type ladder

Sizes are the final sizes in points on a figure of 178 mm (two columns) or 89 mm (one column). At 89 mm, halve the widths and keep the type sizes.

| Use | Size | Weight |
|---|---|---|
| Panel letter | 9 pt | bold, lower case |
| Panel title, object or block name | 7.5 pt | bold |
| Label, sub-line, key text | 7 pt | regular |
| Tick labels, secondary text, scripts | 6.5 pt, the floor | regular |
| Maths | 8.4 pt | italic variables; scripts at 78 % come to 6.5 pt |

- Arial or Helvetica only, as live text in the PDF. Maths is Arial too. Replace a symbol that falls back to another font (the tilde operator) until the PDF font list is Arial only.
- A CSS size of 6.5 pt prints as 6.495 pt. The build writes the floor as 6.55 pt; the QA check allows 0.06 pt.
- Sentence case. Ink colour. A role colour only on a label that names the role.
- Nothing at 6.2, 5.8 or below. Pass `mfs` 8.4 to `f.rich` so that scripts stay at 6.5 pt.
- Words: at most 6 per box or label, 3 per arrow, 130 in a schematic, 90 in a plate, one footnote line of 14 words. A short title per panel (6 words), a name on every block, one plain sub-line where the job is not obvious, arrows labelled with what flows, a "Look for:" line on maths plates.
- Change the sizes in `molecullage.json` (`typeLadder`); the build turns it into CSS variables (`--fs-letter`, `--fs-title`, `--fs-label`, `--fs-floor`, `--fs-math`).
