"""Crop the ChimeraX renders in the art folder and write <group>__<layer>_t.png plus index.<group>.json.

All layers of one group share one crop box (the union of their content), so a layer can be stacked on another at the same
position; the layer "inset" has its own box. Anchors written by render.py (pixels on the 2400 x 1800 canvas) are
converted to fractions of the cropped image, (0, 0) = top left. Anchor files: <group>_<layer>.anchors.json, else <group>.anchors.json.
The "ab" layer also gets a smoothed silhouette polygon ("outline") for dashed missing-partner drawings.

    py -3 -I struct/trim.py [group ...]          # art folder: $STRUCTFIG_ART, else "art" of structfig.json
"""
import json
import sys

from collections import defaultdict
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage import measure

sys.path.insert(0, str(Path(__file__).resolve().parent))
import style  # noqa: E402

OUT = style.art_dir()
PAD = 8  # px of transparent margin kept around the content
SEPARATE = {"inset"}

layers = defaultdict(list)
for p in sorted(OUT.glob("*__*.png")):
    if p.stem.endswith("_t"):
        continue
    group, layer = p.stem.split("__", 1)
    layers[group].append((layer, p))


def union_box(paths):
    box = None
    for p in paths:
        bb = Image.open(p).convert("RGBA").getchannel("A").getbbox()
        if bb is None:
            print("empty:", p.name)
            continue
        box = bb if box is None else (min(box[0], bb[0]), min(box[1], bb[1]), max(box[2], bb[2]), max(box[3], bb[3]))
    return box


def pad(box, size):
    return (max(box[0] - PAD, 0), max(box[1] - PAD, 0), min(box[2] + PAD, size[0]), min(box[3] + PAD, size[1]))


def load_anchors(group, layer):
    for name in (f"{group}_{layer}.anchors.json", f"{group}.anchors.json"):
        f = OUT / name
        if f.exists():
            return json.loads(f.read_text(encoding="utf-8"))
    return {}


OUTLINE = {"ab"}  # layers that also get a silhouette outline (polyline in image fractions), for dashed 'missing partner' drawings


def outline(t):
    """Largest outer contour of the content of a cropped RGBA image, as a polyline in fractions of its width and height."""
    mask = np.array(t.getchannel("A")) > 20
    mask = ndi.binary_closing(mask, structure=np.ones((3, 3)), iterations=10)
    mask = ndi.binary_fill_holes(mask)
    mask = ndi.binary_dilation(mask, iterations=10)
    mask = ndi.gaussian_filter(mask.astype(float), 14) > 0.5
    cs = measure.find_contours(np.pad(mask, 1).astype(float), 0.5)
    c = max(cs, key=len) - 1
    c = measure.approximate_polygon(c, tolerance=3.5)
    return [[round(float(x) / t.width, 5), round(float(y) / t.height, 5)] for y, x in c]




only = set(sys.argv[1:])
total = 0
for group, items in layers.items():
    if only and group not in only:
        continue
    index = {}
    shared = union_box([p for layer, p in items if layer not in SEPARATE])
    for layer, p in items:
        im = Image.open(p).convert("RGBA")
        box = union_box([p]) if layer in SEPARATE else shared
        if box is None:
            continue
        box = pad(box, im.size)
        t = im.crop(box)
        t.save(OUT / f"{group}__{layer}_t.png")
        a = load_anchors(group, layer)
        canvas = a.pop("canvas", list(im.size))
        norm = {}
        for k, v in a.items():
            if isinstance(v, list) and len(v) == 2 and all(isinstance(x, (int, float)) for x in v):
                norm[k] = [round((v[0] - box[0]) / t.width, 5), round((v[1] - box[1]) / t.height, 5)]
        index[f"{group}__{layer}"] = dict(w=t.width, h=t.height, ar=round(t.width / t.height, 5), anchors=norm,
                                          meta={k: v for k, v in a.items() if k not in norm})
        if layer in OUTLINE:
            index[f"{group}__{layer}"]["outline"] = outline(t)
    (OUT / f"index.{group}.json").write_text(json.dumps(index, indent=1), encoding="utf-8")
    total += len(index)
    print(group, len(index), "layers:", ", ".join(index))
print(total, "layers written")
