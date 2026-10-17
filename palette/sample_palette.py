"""Sample the flat fills of a figure page or image.

    py -3 -I palette/sample_palette.py paper.pdf --page 8 --levels 2 --max 18 --out sampled.json
    py -3 -I palette/sample_palette.py figure.png

Method. A PDF page is rendered at 300 dpi (PyMuPDF). Every pixel colour is grouped with its neighbours by integer division
of each channel by `levels` (default 2), so that a flat fill with a little noise falls into one group. Inside a group the
exact colour that occurs most often is the fill. Anti-aliased edges are mixtures of two fills; they are rare per colour and
lie far from both fills, so they drop out when `min_share` is applied. A kept colour that lies within `levels` of a stronger one
(per channel) is merged into it. White is skipped by default. Output: hex, pixel count, share, in order of count.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image


def load(path: str, page: int = 1, dpi: int = 300) -> np.ndarray:
    p = Path(path)
    if p.suffix.lower() == ".pdf":
        import pymupdf as fitz

        doc = fitz.open(p)
        pix = doc[page - 1].get_pixmap(dpi=dpi, alpha=False)
        return np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3].copy()
    im = Image.open(p).convert("RGBA")
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255))   # transparent pixels count as white
    return np.asarray(Image.alpha_composite(bg, im).convert("RGB"))


def sample(img: np.ndarray, levels: int = 2, max_colours: int = 18, min_share: float = 0.0005, skip_white: bool = True) -> list[dict]:
    flat = img.reshape(-1, 3).astype(np.int64)
    if skip_white:
        flat = flat[(flat < 250).any(axis=1)]
    total = len(flat)
    if total == 0:
        return []
    keys = flat[:, 0] * 65536 + flat[:, 1] * 256 + flat[:, 2]
    vals, counts = np.unique(keys, return_counts=True)
    group: dict[tuple, list] = {}
    for v, n in zip(vals, counts):
        rgb = (int(v) >> 16, (int(v) >> 8) & 255, int(v) & 255)
        group.setdefault(tuple(c // levels for c in rgb), []).append((int(n), rgb))
    cand = []
    for members in group.values():
        n_total = sum(n for n, _ in members)
        n_best, rgb = max(members)
        cand.append((n_total, rgb))
    cand.sort(reverse=True)
    kept: list[tuple[int, tuple]] = []
    for n, rgb in cand:
        if n / total < min_share:
            break
        for i, (m, r) in enumerate(kept):
            if max(abs(a - b) for a, b in zip(rgb, r)) <= levels:
                kept[i] = (m + n, r)
                break
        else:
            kept.append((n, rgb))
        if len(kept) >= max_colours * 3:
            break
    kept.sort(reverse=True)
    return [{"hex": "#%02X%02X%02X" % rgb, "count": int(n), "share": round(n / total, 5)} for n, rgb in kept[:max_colours]]


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("file")
    ap.add_argument("--page", type=int, default=1)
    ap.add_argument("--levels", type=int, default=2)
    ap.add_argument("--max", type=int, default=18, dest="max_colours")
    ap.add_argument("--min-share", type=float, default=0.0005)
    ap.add_argument("--keep-white", action="store_true")
    ap.add_argument("--out")
    a = ap.parse_args()
    res = sample(load(a.file, a.page), a.levels, a.max_colours, a.min_share, not a.keep_white)
    text = json.dumps({"file": Path(a.file).name, "page": a.page, "levels": a.levels, "colours": res}, indent=1)
    if a.out:
        Path(a.out).write_text(text + "\n", encoding="utf-8")
    print(text)


if __name__ == "__main__":
    main()
