"""Colour-vision check and role assignment for a palette.

    py -3 -I palette/check_palette.py tokens/tokens.base.json            # distance table for the core roles, contrast per fill
    py -3 -I palette/check_palette.py "#1D397B" "#E16F6B" "#91D7AB"        # pairs of explicit colours
    py -3 -I palette/check_palette.py tokens/tokens.base.json --roles palette/sampled.json --json

Distance is CIEDE2000 between sRGB colours after simulating normal vision, deuteranopia, protanopia and tritanopia
(Machado, Oliveira and Fernandes 2009, severity 1.0). A pair is as distinguishable as its worst case.

--roles <sampled.json> searches by brute force for the assignment of the sampled colours to the four free roles
(antigen, light chain, patch, complex) that maximises the smallest distance, with binder and base fixed.
"""
from __future__ import annotations

import argparse
import itertools
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import colour as C  # noqa: E402

CORE = ("mint", "rose", "peri", "apricot", "indigo", "violet")
OPTIONS = {
    "antigen": ["teal", "green", "lightgreen"],
    "light": ["purple", "lilac", "indigo"],
    "patch": ["orange", "amber"],
    "complex": ["maroon", "pink", "palelilac"],
}


def report(hexes: list[str], names: list[str] | None = None) -> dict:
    names = names or hexes
    d, kind, pair = C.min_de(hexes)
    pm = C.pair_matrix(hexes)
    return {
        "min_ciede2000": round(d, 1), "worst_vision": kind, "worst_pair": list(pair),
        "pairs": [{"a": names[hexes.index(a)], "b": names[hexes.index(b)], "worst_case": round(v, 1)} for (a, b), v in sorted(pm.items(), key=lambda kv: kv[1])],
        "contrast_on_white": {n: round(C.contrast(h), 1) for n, h in zip(names, hexes)},
    }


def best_roles(sampled: dict, fixed=("navy", "salmon"), top: int = 8) -> list[dict]:
    rows = []
    for combo in itertools.product(*OPTIONS.values()):
        hexes = [sampled[k] for k in fixed] + [sampled[c] for c in combo]
        d, kind, pair = C.min_de(hexes)
        rows.append({"min_ciede2000": round(d, 1), "vision": kind, "pair": list(pair), "roles": dict(zip(OPTIONS, combo))})
    rows.sort(key=lambda r: -r["min_ciede2000"])
    return rows[:top]


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("items", nargs="+", help="a token file or hex colours")
    ap.add_argument("--roles", help="sampled.json: search role assignments")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    if len(a.items) == 1 and a.items[0].lower().endswith(".json"):
        fam = json.loads(Path(a.items[0]).read_text(encoding="utf-8"))["color"]["family"]
        names = [k for k in CORE if k in fam]
        hexes = [fam[k]["fill"] for k in names]
    else:
        hexes = [h.upper() if h.startswith("#") else "#" + h.upper() for h in a.items]
        names = hexes
    out = {"colours": dict(zip(names, hexes)), **report(hexes, names)}
    if a.roles:
        out["best_roles"] = best_roles(json.loads(Path(a.roles).read_text(encoding="utf-8"))["colours"])
    if a.json:
        print(json.dumps(out, indent=1))
        return
    print(f"smallest distance {out['min_ciede2000']} ({out['worst_vision']}): {out['worst_pair']}")
    for p in out["pairs"][:6]:
        print(f"  {p['a']:>10} {p['b']:<10} {p['worst_case']:5.1f}")
    print("contrast on white:", ", ".join(f"{k} {v}" for k, v in out["contrast_on_white"].items()))
    for r in out.get("best_roles", []):
        print(f"{r['min_ciede2000']:5.1f} {r['vision']:7s} {r['roles']}")


if __name__ == "__main__":
    main()
