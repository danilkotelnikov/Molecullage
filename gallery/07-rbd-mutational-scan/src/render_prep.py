"""Colours for the ChimeraX renders: one hex per RBD residue of 8QSQ chain A and background, from the site mean of the binding score.

    py -3 -I gallery/07-rbd-mutational-scan/src/render_prep.py        # writes src/render_input.json

Residues are keyed by the author number of the entry (what ChimeraX shows as the residue number): spike number = author number + 3 up to spike 482,
+ 4 from spike 484 (see contacts.py). Spike sites without coordinates in 8QSQ (331, 528 to 531) are not drawn; every modelled residue has a table row.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import scale  # noqa: E402
import scan_data as SD  # noqa: E402


def auth_of(spike: int) -> int:
    return spike - 3 if spike <= 482 else spike - 4


def main() -> None:
    cells = SD.load()
    SD.check(cells)
    c = json.loads((HERE / "contacts.json").read_text(encoding="utf-8"))
    assert c["offset_spike_minus_auth"] == {"up_to_482": 3, "from_484": 4}
    out = {"colours": {}, "hotspots_auth": {str(s): auth_of(s) for s in SD.HOTSPOTS}, "contact_auth": [auth_of(s) for s in c["sites_50"]], "first_auth": c["first_auth"], "last_auth": c["last_auth"]}
    for t, name in SD.BG:
        m = SD.site_mean(cells, t, "bind")
        cols = {}
        for s in SD.SITES:
            a = auth_of(s)
            if c["first_auth"] <= a <= c["last_auth"]:
                cols[str(a)] = scale.color(m[s][0], "bind")
        out["colours"][name] = cols
    assert len(out["colours"]["KP.3.1.1"]) == c["n_residues"], (len(out["colours"]["KP.3.1.1"]), c["n_residues"])
    (HERE / "render_input.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
    print("residues coloured:", {k: len(v) for k, v in out["colours"].items()}, "| hotspots (spike -> author):", out["hotspots_auth"])


if __name__ == "__main__":
    main()
