# Figure inventory

Folder: sample-project. Target width: 178 mm. 3 figures, 1 figure scripts, 3 references in text; 0 figures are cited nowhere, 0 references point at no file.

| id | path | size | mm at target | dpi at target | kind | script | cited in |
|---|---|---|---|---|---|---|---|
| bfactors | figures/bfactors.png | 640 x 480 px | 178 x 133.5 | 91 | plot | scripts/make_before.py | README.md:5 |
| pipeline | figures/pipeline.png | 800 x 320 px | 178 x 71.2 | 114 | schematic | scripts/make_before.py | README.md:9 |
| structure | figures/structure.png | 960 x 620 px | 178 x 115 | 137 | structure |  | README.md:13 |

## Captions

- **bfactors**: Figure 1. B-factors of the C-alpha atoms of chain A (antibody fragment) and chain L (lysozyme) in PDB 1MEL.
- **pipeline**: Figure 2. Screening pipeline: sequences are folded, docked to the antigen and scored; the best ones are kept.
- **structure**: Figure 3. Structure of the antibody fragment bound to lysozyme, PDB 1MEL.

## Scripts

- scripts/make_before.py: matplotlib; saves bfactors.png, pipeline.png

Kinds marked "guess" come from the file name or the pixels. Look at the picture and correct them in the audit.
