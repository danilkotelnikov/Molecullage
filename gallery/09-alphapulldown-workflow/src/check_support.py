"""Check that every step, label and arrow of the figure is backed by a sentence of the paper.

    py -3 -I gallery/09-alphapulldown-workflow/src/check_support.py

Reads data/PMC9805587.xml (run fetch_data.py first). Each entry below names one element of the figure and gives the
sentence fragments of Yu et al. 2023 that support it. The script normalises quotes and spaces, looks for every fragment
in the article text, prints one line per element and exits with 1 when a fragment is missing. It also prints every
sentence that names CPUs or GPUs, so that the claim "hardware not named for the analysis step" can be checked by eye.
"""
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

XML = Path(__file__).resolve().parents[1] / "data" / "PMC9805587.xml"

# element of the figure -> fragments of the paper (Fig. 1 legend, Introduction, sections 2.1-2.3.4, section 3)
SUPPORT = [
    ("arrow: protein sequences -> step 1", ["which takes protein sequences as input"]),
    ("step 1 block: create_individual_features.py, MSAs and structural templates", ["create_individual_features.py script", "generates MSAs, and finds structural templates for each protein", "calculate multiple sequence alignments (MSAs)"]),
    ("arrow: step 1 -> pickle files", ["MSAs and structural features are stored in Python 'pickle' files"]),
    ("pickle files: reusable for many predictions", ["pickle files that can be reused for multiple PPI predictions"]),
    ("arrow: pickle files -> step 2", ["The next stage takes these 'pickle' files as input and predicts protein complex structures on GPUs"]),
    ("step 2 block: AlphaFold-Multimer", ["AlphaPulldown will automatically run AlphaFold-Multimer prediction between each bait and candidate"]),
    ("arrow: modes -> step 2 (complexes of the chosen mode); four modes", ["The user can choose from the following modes: (1) pulldown, (2) homo-oligomer, (3) custom and (4) all versus all", "the user can choose from the following four modes of the main prediction"]),
    ("arrow: step 2 -> predicted structures", ["predicts protein complex structures on GPUs"]),
    ("arrow: predicted structures -> step 3 (when all predictions have finished)", ["Once all predictions are finished, AlphaPulldown generates a Jupyter notebook"]),
    ("step 3 block: alpha-analysis.sif, a Singularity image", ["uses an analysis pipeline built in a Singularity image, alpha-analysis.sif, to produce a table"]),
    ("arrow: step 3 -> outputs (assesses the predicted interfaces)", ["analysis pipeline that assesses the predicted interfaces with multiple scores and generates a Jupyter notebook for interactive analysis"]),
    ("output: score table (CSV file); model quality scores, interface properties", ["to produce a table with various model quality scores and interface properties", "The analysis pipeline will also return a CSV table"]),
    ("output: interface properties such as area and hydrogen bonds", ["such as the interface surface area or the number of hydrogen bonds"]),
    ("output: Jupyter notebook, graphical summary", ["provides a graphical summary"]),
    ("note: notebook only for models below the cut-off", ["For all models with an inter-chain predicted alignment error below the user-defined cut-off, a Jupyter notebook will be generated"]),
    ("strip 1: On CPUs, many proteins in parallel", ["The first stage of AlphaPulldown runs on CPUs", "calculation of features for many sequences in parallel using multiple CPUs"]),
    ("strip 2: On GPUs, structure prediction", ["predicts protein complex structures on GPUs"]),
    ("row pulldown: baits, candidates, each bait with each candidate", ["takes one or more proteins as 'baits' and a list of other proteins as 'candidates'", "AlphaFold-Multimer prediction between each bait and candidate"]),
    ("row homo-oligomer: desired oligomeric states, one run per state", ["The user only needs to provide an input file with desired oligomeric states, and AlphaPulldown will automatically run modelling for each state"]),
    ("row custom: any combination, not only pairs", ["any combination of any number of proteins and their fragments as an input, not limited to pairwise predictions"]),
    ("row all versus all: one list, all pairwise combinations", ["Based on a single list of proteins, AlphaPulldown will automatically generate all pairwise combinations and predict their structures"]),
    ("note: regions of a protein, residue numbers kept", ["allows selecting protein regions for modelling while retaining the original residue indexes", "the resulting models keep the residue numbering of the full-length sequences"]),
]


def norm(s: str) -> str:
    s = s.replace("‘", "'").replace("’", "'").replace("“", '"').replace("”", '"').replace(" ", " ")
    return re.sub(r"\s+", " ", s).strip()


def main() -> int:
    if not XML.exists():
        print("missing", XML, "- run fetch_data.py first", file=sys.stderr)
        return 2
    root = ET.fromstring(XML.read_bytes())
    body = norm("".join(root.find(".//body").itertext()))
    missing = 0
    for name, frags in SUPPORT:
        ok = [fr for fr in frags if norm(fr) in body]
        state = "ok" if len(ok) == len(frags) else "MISSING"
        missing += state != "ok"
        print(f"{state:7s} {name}")
        for fr in frags:
            if norm(fr) not in body:
                print("        not found:", fr)
    print()
    print("Sentences that name CPUs or GPUs (the analysis step is not among them):")
    for s in re.split(r"(?<=[.;]) ", body):
        if re.search(r"\b[CG]PUs?\b", s):
            print(" -", s[:240])
    print(f"\n{len(SUPPORT) - missing} of {len(SUPPORT)} elements supported")
    return 1 if missing else 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.exit(main())
