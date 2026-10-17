Redesign of Figure 1 of Yu et al. 2023, Bioinformatics 39(1):btac749, doi 10.1093/bioinformatics/btac749. Licence CC BY 4.0 (read at Europe PMC and in the article). The original is not reproduced here; open it at the DOI.

**The original** is a workflow picture whose script names, file types, four modes and outputs are carried by a legend of about 120 words. I could not open the picture: the Europe PMC image address returned HTTP 403 and I did not try to get round it. This reading is from the legend. It does not tell a reader which step needs which hardware, which file passes from step to step, what the four modes do to a list of proteins, or what comes out at the end.

**The redesign** reads left to right in three steps. Strip and block colour give the hardware: green CPU, purple GPU, navy for analysis, where the text names none. Pale pills are what a step makes; cream is what you supply; a white pill with a purple edge is a request. The four modes are four rows in one frame, drawn as your input to step 2. For example proteins A, B, C each row shows the input and the complexes it leads to. Outputs sit at the end.

**Numbers.** There are none. Every step, file name and arrow comes from the legend and text; the sentences are listed below and checked by `src/check_support.py`.

**Rebuild** (Python, Node, Chrome):

```
py -3 -B gallery/09-alphapulldown-workflow/fetch_data.py
py -3 -I gallery/09-alphapulldown-workflow/src/check_support.py
node build/build.mjs gallery/09-alphapulldown-workflow/page/09-alphapulldown-workflow.html 178 --out gallery/09-alphapulldown-workflow --art gallery/09-alphapulldown-workflow/art
py -3 -I qa/qa_fig.py gallery/09-alphapulldown-workflow/09-alphapulldown-workflow
```

---

## Checks and open points (for reviewers)

**Ten-second reading.** AlphaPulldown makes alignment files on CPUs, then predicts complex structures on GPUs for one of four ways of combining proteins that you choose, then produces a notebook and a score table.

**Which sentence supports which element** (Yu et al. 2023; `check_support.py` finds every quoted fragment in the Europe PMC text, PMC9805587, 22 of 22).
- Sequences into step 1: legend, "takes protein sequences as input". Step 1 block: legend, "generates MSAs, and finds structural templates for each protein"; section 2.1 gives the long form of MSA.
- Step 1 to pickle files: legend, "MSAs and structural features are stored in Python 'pickle' files". Reuse: section 2.2, "can be reused for multiple PPI predictions".
- Pickle files to step 2, and step 2 to predicted structures: legend, "The next stage takes these 'pickle' files as input and predicts protein complex structures on GPUs". AlphaFold-Multimer as the program: section 2.3.1.
- Modes into step 2 (the second input of step 2): legend, "The user can choose from the following modes"; section 2.3.
- Predicted structures to step 3, "when all predictions have finished": legend, "Once all predictions are finished". Step 3 block: legend, "an analysis pipeline built in a Singularity image, alpha-analysis.sif".
- Step 3 to outputs, "analysis pipeline assesses the predicted interfaces": introduction (iv), which also says the pipeline "generates a Jupyter notebook". Table: legend, "a table with various model quality scores and interface properties"; section 3, "a CSV table" and "such as the interface surface area or the number of hydrogen bonds".
- Notebook note: section 3, "inter-chain predicted alignment error below the user-defined cut-off".
- CPU strip: legend, "runs on CPUs"; section 2.1, "many sequences in parallel using multiple CPUs".
- Rows: pulldown, section 2.3.1 (baits, candidates, "each bait and candidate"); homo-oligomer, 2.3.3 ("desired oligomeric states", "for each state"); custom, 2.3.4 ("any combination of any number of proteins and their fragments", "not limited to pairwise predictions"); all versus all, 2.3.2 ("a single list", "all pairwise combinations"). Regions note: introduction (iii) and 2.3.4.

**Where I read beyond the text.**
- Three example proteins, not two. With two, pulldown (bait A, candidate B) and all-versus-all (list A, B) both give the single pair A + B, and the figure could not show how the modes differ.
- "All pairwise combinations" is drawn as every pair of two different proteins in the list, once each. The paper does not say whether a protein is paired with itself or whether A + B and B + A both run. The frame says so in a note.
- "Oligomeric states" is drawn as n copies of A, with the symbols n1 and n2. The paper gives no values.
- The paper says the user "can choose from" the modes and "provide" the input; it names no file for pulldown, all-versus-all and custom, and "an input file" for homo-oligomer. Whether one run can combine modes is not stated. The frame is titled "Step 2 input: you choose a mode". No arrow runs from the sequences into it: the paper does not say the lists are made from the step 1 files, only that the modes come once the features exist.
- The notebook: the introduction says the analysis pipeline generates it; the legend says AlphaPulldown generates it and uses the pipeline for the table. Both outputs are drawn from the step 3 block.
- Step 3 hardware: neither legend nor text names one. I did not read the Supplementary Note, so the key says "not named in the text".
- File names: only `create_individual_features.py` and `alpha-analysis.sif` are names in the paper. Pickle, Jupyter notebook and CSV are file types and are written as the paper writes them.
- Plain-word glosses are mine, not the paper's: pickle files as Python data files, a Singularity image as a packaged program, a bait as the protein used to find partners and candidates as the proteins tested with each bait, the inter-chain predicted alignment error as the model's own error estimate between two chains.
- "Complexes to model" are white pills with a purple edge (a request); "predicted structures" is a pale purple pill (a result). The paper does not say where the lists are made; the frame sits in step 2 because the legend puts the modes in "the next stage".
- Left out on purpose: the MMseqs2 option for step 1 (section 2.2) and the by-organism pairing features, to keep step 1 readable.

**Colour.** Strong colours stay apart for colour-blind readers (smallest CIEDE2000 distance 20.3, protan, purple against navy). The pale fills of step 1 and step 3 are close under deuteranopia (3.0), so every pill also has a dark edge and a name; colour is never the only cue. Modes are drawn in the order of the legend; no mode numbers are drawn, so the only numbers are the step badges.

**Build checks** (`checkAlign`, 0.25 mm, measured on the rendered page): every block at its grid position, blocks of one column on both column edges, the four spine blocks on one row, both frames on one top edge, equal column gaps, every arrow starts and ends 0.3 mm clear of the block it names, mode rows on their centres, output pills inside the frame, text that fits its block with 0.45 mm to spare (the script name included), no text on text, on blocks, on swatches or on step badges, labels clear of arrows, nothing within 1 mm of the page edge.

**QA** (`qa_fig.py`, normal): ink 31.8 %, empty cells 4.6 %, longest empty band 2.9 %, largest blank 2.5 %, smallest type 6.55 pt, Arial only, one page, 178 x 125 mm. Words 332 against 130 (warning): about 40 are the credit and claim lines and about 70 are the definitions and notes that review asked for; the rest are block names, the mode examples and the key.
