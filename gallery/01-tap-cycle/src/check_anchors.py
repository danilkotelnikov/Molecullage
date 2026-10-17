"""Check that every marker of the figure lands on the element it names, from the trimmed renders (build-time check, run after struct/trim.py).

    py -3 -I gallery/01-tap-cycle/src/check_anchors.py

For each entry: the gap anchors (TAP1 Asp674 and TAP2 His661 Calpha) must fall on the protein layer (a 5 x 5 window with opaque pixels) and inside the image; the
nucleotide anchors must lie on a pixel of the ligand layer. Both exit code 1 when violated. Also reported, not an error: the chain colour under the anchor. A Calpha
in the middle of the NBD dimer can lie behind the other chain in this view; the page colours the dot by its own chain so that it stays unambiguous.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parents[1]
ART = HERE / "art"
TOK = json.loads((HERE.parents[1] / "tokens" / "tokens.base.json").read_text(encoding="utf-8"))["color"]["family"]
hexrgb = lambda h: np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)])
FILL = {"A": hexrgb(TOK["peri"]["fill"]), "B": hexrgb(TOK["apricot"]["fill"])}
MINT = hexrgb(TOK["mint"]["fill"])
bad = 0
for grp in ("tapif", "tapof"):
    idx = json.loads((ART / f"index.{grp}.json").read_text(encoding="utf-8"))
    for key, e in idx.items():
        if key.endswith("_lig"):
            continue
        i = key.split("__")[1]
        im = np.array(Image.open(ART / f"{key}_t.png").convert("RGBA")).astype(int)
        lig = np.array(Image.open(ART / f"{key}_lig_t.png").convert("RGBA")).astype(int)
        H, W = im.shape[:2]
        res = {}
        for a, ch in (("gapA", "A"), ("gapB", "B")):
            x, y = int(round(e["anchors"][a][0] * W)), int(round(e["anchors"][a][1] * H))
            win = im[max(y - 2, 0):y + 3, max(x - 2, 0):x + 3].reshape(-1, 4)
            opaque = win[win[:, 3] > 200][:, :3]
            near = lambda col: int((np.abs(opaque - col).max(axis=1) <= 6).sum())
            own, other = near(FILL[ch]), near(FILL["B" if ch == "A" else "A"])
            res[a] = (own, other, len(opaque))
            if len(opaque) == 0:
                print(f"  {i} {a}: no protein pixel under the anchor")
                bad += 1
            elif own == 0 or other > own:
                print(f"  {i} {a}: note: {'TAP1' if ch == 'A' else 'TAP2'} atom lies behind the other chain here (own {own}, other {other} of {len(opaque)} opaque pixels)")
        for a in ("nucA", "nucB", "pep"):
            if a in e["anchors"]:
                x, y = int(round(e["anchors"][a][0] * W)), int(round(e["anchors"][a][1] * H))
                if lig[y, x, 3] < 200:
                    print(f"  {i} {a}: anchor is not on a ligand pixel")
                    bad += 1
        print(i, "gapA own/other/opaque", res["gapA"], "gapB", res["gapB"])
print("anchor check:", "FAILED" if bad else "ok")
sys.exit(1 if bad else 0)
