"""Put figures side by side on one sheet, each with a label and its QA marks.

    py -3 -I qa/contact_sheet.py --out sheet.png --cols 2 --spec '[{"path":"a.png","label":"before"},{"path":"b.png","label":"after"}]'

Reads png, jpg, tif, pdf (pymupdf) and svg (pymupdf). Under every picture: the label, ink, empty cells, band and blank rectangle (qa/qa_fig.py marks).
Writes one PNG. Needs numpy and Pillow.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import audit_raster as A  # noqa: E402
import qa_fig  # noqa: E402

CELL_W, PIC_H, TEXT_H, PAD = 720, 460, 56, 24
BG, INK, SUB = (255, 255, 255), (10, 10, 10), (90, 90, 90)


def font(size: int, bold: bool = False):
    for name in (("arialbd.ttf", "Arial Bold.ttf", "LiberationSans-Bold.ttf") if bold else ("arial.ttf", "Arial.ttf", "LiberationSans-Regular.ttf")) + ("DejaVuSans.ttf",):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", required=True)
    ap.add_argument("--cols", type=int, default=2)
    ap.add_argument("--spec", required=True, help='JSON list of {"path", "label"}')
    a = ap.parse_args(argv)
    items = json.loads(a.spec)
    cols = max(1, min(a.cols, len(items)))
    rows = -(-len(items) // cols)
    sheet = Image.new("RGB", (PAD + cols * (CELL_W + PAD), PAD + rows * (PIC_H + TEXT_H + PAD)), BG)
    d = ImageDraw.Draw(sheet)
    fb, fr = font(22, True), font(19)
    report = []
    for i, it in enumerate(items):
        arr, facts = A.load(Path(it["path"]), dpi=150)
        x0, y0 = PAD + (i % cols) * (CELL_W + PAD), PAD + (i // cols) * (PIC_H + TEXT_H + PAD)
        d.rectangle([x0, y0, x0 + CELL_W, y0 + PIC_H], outline=(200, 200, 200))
        label = it.get("label") or Path(it["path"]).name
        if arr is None:
            d.text((x0 + 10, y0 + PIC_H + 6), f"{label}: not measured", font=fb, fill=INK)
            report.append(dict(path=it["path"], label=label, marks=None, note="; ".join(facts["notes"])))
            continue
        im = Image.fromarray(arr)
        s = min((CELL_W - 12) / im.width, (PIC_H - 12) / im.height)
        im = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.LANCZOS)
        sheet.paste(im, (x0 + (CELL_W - im.width) // 2, y0 + (PIC_H - im.height) // 2))
        m = {k: round(float(v), 1) for k, v in qa_fig.array_metrics(arr).items()}
        d.text((x0, y0 + PIC_H + 6), label, font=fb, fill=INK)
        d.text((x0, y0 + PIC_H + 32), f"ink {m['ink']} %   empty cells {m['cells']} %   band {m['band']} %   blank {m['blank']} %", font=fr, fill=SUB)
        report.append(dict(path=it["path"], label=label, marks=m))
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    print(json.dumps(dict(out=str(out), size=sheet.size, items=report)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
