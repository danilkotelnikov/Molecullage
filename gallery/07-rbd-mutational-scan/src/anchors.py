"""Anchors and outlines of the hotspot sites on the enlargement, read from the flat colour maps ChimeraX writes.

    py -3 -I gallery/07-rbd-mutational-scan/src/anchors.py probe       # visible pixels of each hotspot patch for every probe azimuth (to pick the view)
    py -3 -I gallery/07-rbd-mutational-scan/src/anchors.py final       # writes art/zoom.anchors.json from art/zoomid_final.png

In an id map the three hotspot patches are flat red (455), blue (456) and green (493) on a white RBD (see render_scan.py); the pixels of one patch are the
visible part of that residue's surface at the camera of the figure. The anchor is the pixel of the patch farthest from its edge (distance transform), so a label
centred there lies on the residue it names. The outline is the contour of the patch. Both are in pixels of the 2400 x 1800 canvas; struct/trim.py converts every
[x, y] pair to a fraction of the cropped image. The script stops when a patch is smaller than MIN_RADIUS_PX (a label would not sit on it).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage import measure

ART = Path(__file__).resolve().parent.parent / "art"
MIN_RADIUS_PX = 110.0


def patches(png: Path) -> dict:
    im = np.array(Image.open(png).convert("RGBA")).astype(int)
    r, g, b, a = im[..., 0], im[..., 1], im[..., 2], im[..., 3]
    ok = a > 250
    return {"455": ok & (r > 200) & (g < 90) & (b < 90), "456": ok & (b > 200) & (r < 90) & (g < 90), "493": ok & (g > 150) & (r < 90) & (b < 90)}


def main() -> None:
    mode = sys.argv[1] if len(sys.argv) > 1 else "final"
    if mode == "probe":
        for p in sorted(ART.glob("scanprobe_*.png"), key=lambda q: q.stem):
            pa = patches(p)
            inner = {k: round(float(ndi.distance_transform_edt(np.pad(v, 1)).max()), 1) for k, v in pa.items()}
            print(f"{p.stem:20s} visible pixels { {k: int(v.sum()) for k, v in pa.items()} }  inscribed radius px {inner}")
        return
    pa = patches(ART / "zoomid_final.png")
    out = {"canvas": [2400, 1800]}
    for k, v in pa.items():
        dt = ndi.distance_transform_edt(np.pad(v, 1))[1:-1, 1:-1]
        y, x = np.unravel_index(int(dt.argmax()), dt.shape)
        assert dt.max() >= MIN_RADIUS_PX, f"site {k}: the visible patch is too small ({dt.max():.1f} px)"
        out[f"hot_{k}"] = [float(x), float(y)]
        out[f"hot_{k}_radius_px"] = float(dt.max())
        out[f"hot_{k}_area_px"] = int(v.sum())
        # outline: the largest contour of the patch, simplified to 1.5 px
        lab, n = ndi.label(v)
        big = np.argmax(ndi.sum(v, lab, range(1, n + 1))) + 1
        cs = measure.find_contours(np.pad((lab == big), 1).astype(float), 0.5)
        c = measure.approximate_polygon(max(cs, key=len) - 1, tolerance=1.5)
        for i, (cy, cx) in enumerate(c[:-1]):                 # the last point repeats the first
            out[f"hot_{k}_c{i}"] = [round(float(cx), 1), round(float(cy), 1)]
        out[f"hot_{k}_npts"] = int(len(c) - 1)
        print(k, "anchor", (int(x), int(y)), "inscribed radius px", round(float(dt.max()), 1), "visible pixels", int(v.sum()), "outline points", len(c) - 1)
    (ART / "zoom.anchors.json").write_text(json.dumps(out, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
