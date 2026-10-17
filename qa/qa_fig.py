"""Measure a built figure against the drawing rules.

    py -3 -I qa/qa_fig.py out/sequence                 # key: reads out/sequence.png and out/sequence.pdf
    py -3 -I qa/qa_fig.py out/sequence.png --quick     # PNG checks only (ink, cells, band, blank): fast, used by the hook
    py -3 -I qa/qa_fig.py out/sequence --strictness strict --json

Checks (limits close to what we measured on a set of published antibody-design figures; use them as a guide):
  ink      share of pixels darker than 235 of 255 in any channel
  cells    share of the cells of a 20-column, 12-row grid with less than 1 % ink (empty cells)
  band     longest run of empty pixel rows, share of the height
  blank    largest empty axis-aligned rectangle of tiles (tile = 1/60 of the width), share of the area
  type     smallest text in the PDF, pt (the PDF page is the figure at final size)
  render   smallest embedded raster width, mm (structure renders; under 15 mm is an icon)
  words    words in the PDF against the budget of molecullage.json (schematic or plate)
  fonts    Arial only; pages: one; width: one of molecullage.json "widthMm"

Strictness (molecullage.json "strictness", or --strictness):
  normal   ink >= 9, cells <= 25, band <= 4, blank <= 6, type >= 6.5, render >= 20. A failed check is FAIL; words, fonts and width are warnings.
  strict   tighter limits: ink >= 20, cells <= 20, band <= 2.5, blank <= 4; type, render as normal. Words, fonts, width are FAIL too.
  loose    the normal limits, but every failed check is only a warning. The exit code stays 0.
A check that fails is reported with its reason. Nothing is changed.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

LIMITS = {
    "normal": dict(ink=(9.0, ">="), cells=(25.0, "<="), band=(4.0, "<="), blank=(6.0, "<="), type=(6.5, ">="), render=(20.0, ">=")),
    "strict": dict(ink=(20.0, ">="), cells=(20.0, "<="), band=(2.5, "<="), blank=(4.0, "<="), type=(6.5, ">="), render=(20.0, ">=")),
}
LIMITS["loose"] = LIMITS["normal"]
UNIT = dict(ink="%", cells="%", band="%", blank="%", type="pt", render="mm", words="")
TOL = 0.06  # a CSS size of 6.5 pt prints as 6.495 pt
DEFAULT_WORDS = {"schematic": 130, "plate": 90}


def find_config(start: Path) -> dict:
    d = start.resolve()
    d = d if d.is_dir() else d.parent
    for p in [d, *d.parents]:
        if (p / "molecullage.json").exists():
            return json.loads((p / "molecullage.json").read_text(encoding="utf-8"))
    return {}


def largest_empty_rect(empty: np.ndarray) -> int:
    """Largest all-True rectangle in a boolean matrix (histogram method); returns its area in cells."""
    h = np.zeros(empty.shape[1], int)
    best = 0
    for row in empty:
        h = np.where(row, h + 1, 0)
        stack = []
        for i, v in enumerate(list(h) + [0]):
            start = i
            while stack and stack[-1][1] >= v:
                s, hh = stack.pop()
                best = max(best, hh * (i - s))
                start = s
            stack.append((start, v))
    return best


def png_metrics(png: Path) -> dict:
    return array_metrics(np.asarray(Image.open(png).convert("RGB")).astype(np.uint8))


def array_metrics(im: np.ndarray) -> dict:
    """The four raster marks of an RGB uint8 array (qa/audit_raster.py reuses this)."""
    H, W, _ = im.shape
    dark235 = (im < 235).any(axis=2)
    gh, gw = H // 12, W // 20
    cells = dark235[: gh * 12, : gw * 20].reshape(12, gh, 20, gw).mean(axis=(1, 3)) >= 0.01
    rows = ~dark235.any(axis=1)
    run = best = 0
    for r in rows:
        run = run + 1 if r else 0
        best = max(best, run)
    tile = max(W // 60, 1)
    th, tw = H // tile, W // tile
    d248 = (im < 248).any(axis=2)[: th * tile, : tw * tile].reshape(th, tile, tw, tile).mean(axis=(1, 3)) >= 0.01
    return dict(ink=100.0 * dark235.mean(), cells=100.0 * (1 - cells.mean()), band=100.0 * best / H,
                blank=100.0 * largest_empty_rect(~d248) / (th * tw))


def pdf_metrics(pdf: Path) -> dict:
    import pymupdf as fitz

    doc = fitz.open(pdf)
    p = doc[0]
    spans = [s for b in p.get_text("dict")["blocks"] for l in b.get("lines", []) for s in l["spans"] if s["text"].strip()]
    imgs = [round((i["bbox"][2] - i["bbox"][0]) / 72 * 25.4, 1) for i in p.get_image_info()]
    return dict(type=min((s["size"] for s in spans), default=float("nan")), render=min(imgs) if imgs else None, renders=imgs,
                words=len(p.get_text("words")), pages=len(doc), fonts=sorted({s["font"] for s in spans}),
                mm=(round(p.rect.width / 72 * 25.4, 1), round(p.rect.height / 72 * 25.4, 1)))


def judge(m: dict, strictness: str, cfg: dict, kind: str, quick: bool) -> dict:
    lim = LIMITS[strictness]
    soft = strictness == "loose"
    marks = {}

    def put(name, value, limit, op, status_fail="FAIL", note=""):
        if value is None or value != value:
            marks[name] = dict(value=None, limit=limit, status="n/a", reason="not measured")
            return
        ok = value >= limit - TOL if op == ">=" else value <= limit
        st = "ok" if ok else ("warn" if soft else status_fail)
        reason = "" if ok else f"{name} {value:.1f}{UNIT.get(name, '')} is {'below' if op == '>=' else 'above'} {limit}{UNIT.get(name, '')}{note}"
        marks[name] = dict(value=round(float(value), 2), limit=limit, op=op, status=st, reason=reason)

    for n in ("ink", "cells", "band", "blank"):
        put(n, m[n], *lim[n])
    if not quick:
        for n in ("type", "render"):
            put(n, m.get(n), *lim[n])
        budget = (cfg.get("words") or {}).get(kind, DEFAULT_WORDS[kind])
        put("words", m["words"], budget, "<=", "FAIL" if strictness == "strict" else "warn", f" ({kind} budget)")
        bad_fonts = [f for f in m["fonts"] if "Arial" not in f]
        marks["fonts"] = dict(value=m["fonts"], status="ok" if not bad_fonts else ("FAIL" if strictness == "strict" else "warn"), reason="" if not bad_fonts else "fonts other than Arial: " + ", ".join(bad_fonts))
        marks["pages"] = dict(value=m["pages"], status="ok" if m["pages"] == 1 else ("warn" if soft else "FAIL"), reason="" if m["pages"] == 1 else f"{m['pages']} pages")
        widths = cfg.get("widthMm") or [178, 89]
        okw = any(abs(m["mm"][0] - w) <= 1.0 for w in widths)
        marks["width"] = dict(value=m["mm"][0], limit=widths, status="ok" if okw else ("FAIL" if strictness == "strict" else "warn"), reason="" if okw else f"width {m['mm'][0]} mm is not one of {widths}")
    return marks


def run(target: str, outdir: str | None = None, strictness: str | None = None, kind: str = "schematic", quick: bool = False) -> dict:
    t = Path(target)
    base = (Path(outdir) / t.name) if outdir else t
    base = base.with_suffix("") if base.suffix.lower() in (".png", ".pdf") else base
    png, pdf = base.with_suffix(".png"), base.with_suffix(".pdf")
    cfg = find_config(png.parent)
    strictness = strictness or cfg.get("strictness", "normal")
    if strictness not in LIMITS:
        raise SystemExit(f"strictness must be normal, strict or loose, not {strictness!r}")
    if not png.exists():
        raise SystemExit(f"not found: {png}")
    m = png_metrics(png)
    if not quick:
        if not pdf.exists():
            raise SystemExit(f"not found: {pdf} (use --quick for the PNG marks only)")
        m.update(pdf_metrics(pdf))
    marks = judge(m, strictness, cfg, kind, quick)
    return dict(key=base.name, strictness=strictness, quick=quick, ok=not any(v["status"] == "FAIL" for v in marks.values()),
                failures=[v["reason"] for v in marks.values() if v["status"] in ("FAIL", "warn") and v["reason"]], marks=marks,
                extra={k: m[k] for k in ("renders", "mm", "fonts", "pages") if k in m})


def line(r: dict) -> str:
    ms = r["marks"]
    cols = " ".join(f"{n} {ms[n]['value']}{UNIT.get(n, '')} {ms[n]['status']}" for n in ("ink", "cells", "band", "blank", "type", "render", "words") if n in ms and ms[n]["value"] is not None)
    return f"Molecullage QA {r['key']} [{r['strictness']}]: {'ok' if r['ok'] else 'FAIL'} | {cols}" + ("" if not r["failures"] else " | " + "; ".join(r["failures"]))


def main(argv=None) -> int:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')   # a Windows console may be cp1251
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("targets", nargs="+", help="a key (out/name) or a .png/.pdf path")
    ap.add_argument("--dir", help="folder of the built files when targets are bare keys")
    ap.add_argument("--strictness", choices=sorted(LIMITS))
    ap.add_argument("--kind", choices=sorted(DEFAULT_WORDS), default="schematic", help="word budget to apply")
    ap.add_argument("--quick", action="store_true", help="PNG marks only")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args(argv)
    res = [run(t, a.dir, a.strictness, a.kind, a.quick) for t in a.targets]
    if a.json:
        print(json.dumps(res if len(res) > 1 else res[0], indent=1))
    else:
        for r in res:
            print(line(r))
    return 0 if all(r["ok"] for r in res) else 1


if __name__ == "__main__":
    sys.exit(main())
