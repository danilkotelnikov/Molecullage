"""Check that the numbering of the paper is the numbering of PDB 7F61 chain A, and write tables/numbering_check.csv.

    py -3 -I gallery/06-gpcr-snake-plot/src/check_numbering.py

The paper (Nakajima et al. 2026) names residues as number plus a generic position in superscript, for example L73 (2.43). The residues below are all the ones whose name and generic
position the text prints. The script asserts that residue n of 7F61 chain A (SEQRES numbering = UniProt Q9Y5N1) is the residue the paper names, and that the x.50 positions implied by
each printed pair (position minus the offset from x.50) are the same residue for every pair of one helix, and are the TM helix of the figure. The implied x.50 residues are D80, R132, P373
and P409, the conserved D, R, P and P of class A receptors (my reading of the sequence, not a statement of the paper).
"""
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from structure import load  # noqa: E402

# residue number, residue letter, generic position as printed in the paper (Introduction and Results), where the text prints it
NAMED = [
    (73, "L", "2.43", "L73(2.43)M"), (115, "Y", "3.33", "Y115(3.33)"), (128, "I", "3.46", "I128(3.46)M"), (357, "A", "6.34", "A357(6.34)"),
    (359, "S", "6.36", "S359(6.36)Y"), (378, "M", "6.55", "M378(6.55)"), (381, "R", "6.58", "R381(6.58)"), (394, "Y", "7.35", "Y394(7.35)"),
    (412, "Y", "7.53", "Y412(7.53)W"), (415, "C", "7.56", "C415(7.56)R"),
]


def main():
    S = load()
    tm = {f"TM{k + 1}": (h["start"], h["end"]) for k, h in enumerate(S["tm"])}
    rows, implied = [], {}
    for num, aa, gen, text in NAMED:
        assert S["seq"][num] == aa, (num, aa, S["seq"][num])
        helix, pos = gen.split(".")
        n50 = num + (50 - int(pos))
        implied.setdefault(int(helix), set()).add(n50)
        rows.append([text, num, S["seq"][num], gen, f"TM{helix}", n50, S["seq"][n50]])
    for h, s in implied.items():
        assert len(s) == 1, (h, s)
        n50 = next(iter(s))
        a, b = tm[f"TM{h}"]
        assert a <= n50 <= b, (h, n50, a, b)
    out = Path(__file__).resolve().parents[1] / "tables" / "numbering_check.csv"
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["named_in_paper", "number", "residue_in_7F61", "generic_position", "helix", "implied_x.50_number", "implied_x.50_residue"])
        w.writerows(rows)
    print("numbering of the paper = numbering of 7F61; implied x.50 residues:", {f"{h}.50": f"{S['seq'][next(iter(s))]}{next(iter(s))}" for h, s in sorted(implied.items())})


if __name__ == "__main__":
    main()
