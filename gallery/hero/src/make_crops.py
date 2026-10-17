"""Cut the five picture tiles of the hero banner and write the layout the page reads.

    py -3 -I gallery/hero/src/make_crops.py            (from the repository root)

Every tile is a crop of a finished gallery figure, cut at element boundaries by the pixel boxes below (read off the 600 dpi
PNGs: x0, y0, x1, y1, right and bottom exclusive). Two tiles (the ATP synthase and the Ebola glycoprotein) are cut from the
render layer of the figure (gallery/<figure>/art/*.png, the picture that sits under the leaders and labels of the finished
figure), because the same picture in the final PNG is crossed by leader lines that a crop could only cut. Three tiles are cut
from the final PNG.

Outputs: gallery/hero/art/tile_<key>.png (600 dpi, white background, the crop plus its white margin) and
gallery/hero/page/data.js (window.DATA: the grid and the tiles in millimetres; the page draws from it and asserts it).
"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
HERO = HERE.parent
REPO = HERO.parent.parent
G = REPO / "gallery"
DPI = 600
MM = DPI / 25.4

# ---- the grid, millimetres, origin top left of the 178 x 52 banner
W, H_PAGE = 178.0, 52.0
X0, XR = 47.0, 176.5          # the tile row: left edge, right edge (outer margin 1.5 mm)
GAP = 2.0                     # equal gap between tiles
TOP = 1.8                     # top of the tiles

# ---- the tiles. box: crop in the source, pixels. padx, pady: white margin added on each side, pixels.
TILES = [
    dict(key="atp", src=G / "05-atp-synthase/art/atp_A__full.png", box=(49, 43, 2348, 3557), padx=105, pady=105,
         cap=("Cryo-EM complex", "PDB 9ZFT")),
    dict(key="tree", src=G / "08-nitrogenase-tree/08-nitrogenase-tree.png", box=(125, 944, 2207, 4037), padx=93, pady=93,
         cap=("Evolutionary tree", "with traits")),
    dict(key="tap", src=G / "01-tap-cycle/01-tap-cycle.png", box=(3319, 729, 4092, 2011), padx=60, pady=38,
         cap=("Transport cycle", "PDB 9N61")),
    dict(key="rbd", src=G / "07-rbd-mutational-scan/07-rbd-mutational-scan.png", box=(652, 712, 1401, 1906), padx=36, pady=36,
         cap=("Mutational scan", "SARS-CoV-2 RBD")),
    dict(key="ebola", src=G / "02-ebola-pocket/art/overview__full.png", box=(628, 217, 1659, 1594), padx=41, pady=85,
         cap=("Ligand pocket", "PDB 9PEL")),
]

# The RBD crop ends at a column boundary (after column 14 of the 20 contact sites), so the frame lines that close the strips
# and the heat map on the right are copied from the left edge of the same block: the 9 px gap, then the 5 px frame.
RBD_FRAME = dict(gap=(664, 673), frame=(659, 664))


def load_white(path: Path) -> Image.Image:
    im = Image.open(path).convert("RGBA")
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
    bg.alpha_composite(im)
    return bg.convert("RGB")


def crop_tile(t: dict) -> Image.Image:
    im = load_white(t["src"])
    x0, y0, x1, y1 = t["box"]
    c = im.crop((x0, y0, x1, y1))
    if t["key"] == "rbd":
        g0, g1 = RBD_FRAME["gap"]
        f0, f1 = RBD_FRAME["frame"]
        gap = im.crop((g0, y0, g1, y1))
        frame = im.crop((f0, y0, f1, y1))
        out = Image.new("RGB", (c.width + gap.width + frame.width, c.height), (255, 255, 255))
        out.paste(c, (0, 0)); out.paste(gap, (c.width, 0)); out.paste(frame, (c.width + gap.width, 0))
        c = out
    out = Image.new("RGB", (c.width + 2 * t["padx"], c.height + 2 * t["pady"]), (255, 255, 255))
    out.paste(c, (t["padx"], t["pady"]))
    return out


def main() -> None:
    crops = [crop_tile(t) for t in TILES]
    asp = [c.width / c.height for c in crops]
    h = (XR - X0 - GAP * (len(TILES) - 1)) / sum(asp)
    ws = [a * h for a in asp]
    (HERO / "art").mkdir(exist_ok=True)
    tiles, x = [], X0
    for t, c, w in zip(TILES, crops, ws):
        px = (round(w * MM), round(h * MM))
        c.resize(px, Image.Resampling.LANCZOS).save(HERO / "art" / f"tile_{t['key']}.png", dpi=(DPI, DPI))
        tiles.append(dict(key=t["key"], file=f"art/tile_{t['key']}.png", x=round(x, 4), w=round(w, 4), px=px, cap=list(t["cap"]),
                          source=str(t["src"].relative_to(REPO)).replace("\\", "/"), box=list(t["box"])))
        x += w + GAP
    data = dict(W=W, H=H_PAGE, X0=X0, XR=XR, GAP=GAP, TOP=TOP, TH=round(h, 4), tiles=tiles)
    (HERO / "page").mkdir(exist_ok=True)
    (HERO / "page" / "data.js").write_text("window.DATA = " + json.dumps(data, indent=1) + ";\n", encoding="utf-8")
    print(f"tile height {h:.2f} mm; widths " + ", ".join(f"{t['key']} {w:.2f}" for t, w in zip(TILES, ws)) + f"; right edge {x - GAP:.2f}")


if __name__ == "__main__":
    main()
