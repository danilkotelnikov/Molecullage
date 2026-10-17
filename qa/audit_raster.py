"""Audit one figure file: the QA marks, colours, resolution and (for a PDF) type size, with a suggested verdict.

    py -3 -I qa/audit_raster.py figure.png --width-mm 178 --kind plot --json
    py -3 -I qa/audit_raster.py figure.pdf --width-mm 89

Reads png, jpg, tif, bmp, gif and webp with Pillow. A PDF or SVG needs pymupdf (optional); without it the file is reported as not measured.
EPS is read only when Pillow can open it (it needs Ghostscript), else it is reported as not measured.
Measures, on the picture composited on white:
  ink, cells, band, blank   the four raster marks of qa/qa_fig.py (same code, same limits at strictness normal)
  colours                   dominant colours (at least 1 % of the non-white pixels, merged under CIEDE2000 6), how many are
                            chromatic (pale tints above L 85 are backgrounds), and the worst-case colour-vision distance among the chromatic ones (palette/check_palette.py)
  resolution                effective dpi and size in mm at the target width
  type (PDF only)           smallest text size, scaled to the target width
The verdict is a suggestion from references/audit-rubric.md: KEEP, RESTYLE, REDRAW, REPLACE or DEMOTE, with the reason.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / "palette"))
import qa_fig  # noqa: E402
import colour as C  # noqa: E402

RASTER = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".gif", ".webp"}
KINDS = ("structure", "schematic", "plot", "table", "photo")
LIMIT = dict(ink=9.0, cells=25.0, band=4.0, blank=6.0)   # strictness normal
MAX_SIDE = 4000
CV_WARN = 11.5                              # worst-case CIEDE2000; the shipped palette reaches 11.5
MAX_HUES = 8


def to_rgb(im: Image.Image) -> Image.Image:
    """RGB on a white background, from any Pillow mode (16-bit and float TIFFs are scaled to 8 bit)."""
    if im.mode in ("I;16", "I;16B", "I", "F"):
        a = np.asarray(im).astype(np.float64)
        lo, hi = a.min(), a.max()
        im = Image.fromarray(((a - lo) / max(hi - lo, 1) * 255).astype(np.uint8))
    if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
        im = im.convert("RGBA")
        bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
        bg.alpha_composite(im)
        return bg.convert("RGB")
    return im.convert("RGB")


def load(path: Path, dpi: int = 200) -> tuple[np.ndarray, dict]:
    """Return (rgb array, facts). facts: format, vector, width_px, height_px, file_dpi, page_mm, text, notes."""
    ext = path.suffix.lower()
    facts = dict(format=ext.lstrip(".") or "?", vector=False, width_px=None, height_px=None, file_dpi=None, page_mm=None, text=None, notes=[])
    if ext in (".pdf", ".svg"):
        try:
            import pymupdf as fitz
        except ImportError:
            facts["notes"].append("pymupdf is not installed, so this file was not measured (pip install pymupdf), or export it to PNG")
            return None, facts
        doc = fitz.open(path)
        page = doc[0]
        facts.update(vector=True, page_mm=(round(page.rect.width / 72 * 25.4, 1), round(page.rect.height / 72 * 25.4, 1)))
        if len(doc) > 1:
            facts["notes"].append(f"{len(doc)} pages; page 1 measured")
        pix = page.get_pixmap(dpi=dpi, alpha=False)
        arr = np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3].copy()
        if ext == ".pdf":
            spans = [s for b in page.get_text("dict")["blocks"] for l in b.get("lines", []) for s in l["spans"] if s["text"].strip()]
            facts["text"] = dict(smallest_pt=min((s["size"] for s in spans), default=None), words=len(page.get_text("words")),
                                 fonts=sorted({s["font"] for s in spans}), page_pt=round(page.rect.width, 1))
        return arr, facts
    try:
        im = Image.open(path)
        facts["width_px"], facts["height_px"] = im.size
        d = im.info.get("dpi")
        if d and d[0] and d[0] > 1:
            facts["file_dpi"] = round(float(d[0]))
        if ext == ".eps":
            facts.update(vector=True)
            im.load()
        im = to_rgb(im)
    except Exception as e:  # unreadable or EPS without Ghostscript
        facts["notes"].append(f"not measured: {str(e).splitlines()[0][:120]}" + (" (EPS needs Ghostscript; export to PNG)" if ext == ".eps" else ""))
        return None, facts
    if max(im.size) > MAX_SIDE:
        f = -(-max(im.size) // MAX_SIDE)
        im = im.reduce(f)
        facts["notes"].append(f"measured on a copy reduced {f} times (largest side over {MAX_SIDE} px)")
    return np.asarray(im).astype(np.uint8), facts


def _lab(h: str):
    return C.lab(C.lin(C.rgb(h)))


def dominant_colours(im: np.ndarray, min_share: float = 0.01, merge: float = 6.0, top: int = 12) -> list[dict]:
    ink = (im < 235).any(axis=2)
    px = im[ink].astype(np.int64)
    if len(px) == 0:
        return []
    key = (px[:, 0] // 8) * 1024 + (px[:, 1] // 8) * 32 + (px[:, 2] // 8)
    n = np.bincount(key, minlength=32768)
    order = [k for k in np.argsort(-n) if n[k] / len(px) >= min_share][:top]
    out: list[dict] = []
    for k in order:
        m = key == k
        hx = C.to_hex(px[m].mean(axis=0) / 255.0)
        share = float(n[k] / len(px))
        for o in out:
            if C.de2000(_lab(hx), _lab(o["hex"])) < merge:
                o["share"] += share
                break
        else:
            out.append(dict(hex=hx, share=share))
    for o in out:
        rgb = C.rgb(o["hex"]) * 255
        o["chromatic"] = bool(rgb.max() - rgb.min() >= 30)
        o["share"] = round(o["share"], 3)
    return out


def colour_facts(im: np.ndarray) -> dict:
    dom = dominant_colours(im)
    chroma = [o["hex"] for o in dom if o["chromatic"]]
    marks = [h for h in chroma if _lab(h)[0] <= 85]   # pale tints are backgrounds; they are not compared
    res = dict(dominant=dom, chromatic=len(chroma), neutral=len(dom) - len(chroma), worst_distance=None, worst_vision=None, worst_pair=None)
    if len(marks) >= 2:
        d, kind, pair = C.min_de(marks)
        res.update(worst_distance=round(float(d), 1), worst_vision=kind, worst_pair=list(pair))
    return res


def guess_kind(path: Path, colours: dict, marks: dict) -> str:
    n = path.stem.lower()
    for kind, words in (("table", ("table",)), ("photo", ("photo", "micrograph", "microscop", "gel", "blot", "western", "stain", "tem", "sem", "cryo-em")),
                        ("structure", ("struct", "render", "pdb", "chimera", "pymol", "surface", "cartoon", "complex", "fold")),
                        ("schematic", ("pipeline", "workflow", "schem", "overview", "diagram", "scheme", "flow", "abstract", "model")),
                        ("plot", ("plot", "curve", "roc", "hist", "box", "violin", "scatter", "bar", "heat", "umap", "pca", "volcano", "line"))):
        if any(w in n for w in words):
            return kind
    return "plot" if marks["ink"] < 30 and colours["chromatic"] <= 4 else "schematic"


def suggest(kind: str, flags: dict, has_script: bool) -> tuple[str, str]:
    """Verdict and one-sentence reason. flags: layout (list), resolution (list), colour (list), type (list)."""
    lay, res, col, typ = flags["layout"], flags["resolution"], flags["colour"], flags["type"]
    allf = lay + res + col + typ
    if kind == "photo":
        return "KEEP", "A photo or micrograph is data; only the file needs checking." + (f" Check: {'; '.join(res)}." if res else "")
    if kind == "table":
        return "DEMOTE", "The content is a table; set it as a table or as text."
    if kind == "structure":
        if allf:
            return "REPLACE", "A raster picture of a structure; make a real render in the flat style. Marks: " + "; ".join(allf) + "."
        return "KEEP", "A structure picture that passes every mark."
    if kind == "plot":
        if not allf:
            return "KEEP", "Every mark passes."
        return "RESTYLE", "Same data, new palette and type. Marks: " + "; ".join(allf) + "." + ("" if has_script else " No script found: the data must come from the author.")
    # schematic
    if not allf:
        return "KEEP", "Every mark passes."
    if lay or len(allf) >= 2:
        return "REDRAW", "Draw it again from a template. Marks: " + "; ".join(allf) + "."
    return "RESTYLE", "Layout holds; change palette and type only. Marks: " + "; ".join(allf) + "."


def audit(path: Path, width_mm: float = 178.0, kind: str = "auto", has_script: bool = False) -> dict:
    im, facts = load(path)
    out = dict(path=str(path), width_mm_target=width_mm, **{k: facts[k] for k in ("format", "vector", "width_px", "height_px", "file_dpi", "page_mm", "notes")})
    if im is None:
        out.update(measured=False, kind=kind if kind != "auto" else "unknown", verdict=None, reason="not measured: " + "; ".join(facts["notes"]))
        return out
    H, W = im.shape[:2]
    if facts["width_px"] is None:
        facts["width_px"], facts["height_px"] = W, H
    marks = {k: round(float(v), 2) for k, v in qa_fig.array_metrics(im).items()}
    colours = colour_facts(im)
    kind = guess_kind(path, colours, marks) if kind == "auto" else kind
    out.update(measured=True, kind=kind, marks=marks, colours=colours)
    # size and resolution at the target width
    px_w, px_h = facts["width_px"], facts["height_px"]
    if facts["vector"] and facts["page_mm"]:
        pw, ph = facts["page_mm"]
        out["size_mm"] = [round(width_mm, 1), round(width_mm * ph / pw, 1)]
        out["effective_dpi"] = None
        out["scale_to_target"] = round(width_mm / pw, 3)
    else:
        out["size_mm"] = [round(width_mm, 1), round(width_mm * px_h / px_w, 1)]
        out["effective_dpi"] = round(px_w / (width_mm / 25.4))
    if facts["text"]:
        t = facts["text"]
        pt = t["smallest_pt"]
        out["text"] = dict(smallest_pt_in_file=None if pt is None else round(pt, 2),
                           smallest_pt_at_target=None if pt is None else round(pt * width_mm / (facts["page_mm"][0]), 2),
                           words=t["words"], fonts=t["fonts"])
    # flags
    fl = dict(layout=[], resolution=[], colour=[], type=[])
    if kind not in ("photo", "table") and marks["ink"] > 90:
        fl["layout"].append(f"dark background (ink {marks['ink']:.0f} %); journals print on white and the empty-space marks cannot be read")
    elif kind not in ("photo", "table"):
        for k, lim, op in (("ink", LIMIT["ink"], ">="), ("cells", LIMIT["cells"], "<="), ("band", LIMIT["band"], "<="), ("blank", LIMIT["blank"], "<=")):
            v = marks[k]
            if (v < lim - qa_fig.TOL) if op == ">=" else (v > lim):
                fl["layout"].append(f"{k} {v:.1f} % {'below' if op == '>=' else 'above'} {lim:g} %")
    dpi = out["effective_dpi"]
    if dpi is not None:
        need = 300 if kind in ("photo", "structure") else 600
        if dpi < 300:
            fl["resolution"].append(f"{dpi} dpi at {width_mm:g} mm, under 300")
        elif dpi < need * 0.98:
            fl["resolution"].append(f"{dpi} dpi at {width_mm:g} mm, line art wants {need}")
    if kind not in ("photo", "table"):
        if colours["worst_distance"] is not None and colours["worst_distance"] < CV_WARN:
            fl["colour"].append(f"two colours come within {colours['worst_distance']} (CIEDE2000, {colours['worst_vision']}); the palette reaches {CV_WARN}")
        if colours["chromatic"] > MAX_HUES:
            fl["colour"].append(f"{colours['chromatic']} dominant hues, more than {MAX_HUES}")
    if out.get("text") and out["text"]["smallest_pt_at_target"] is not None and out["text"]["smallest_pt_at_target"] < 6.5 - qa_fig.TOL:
        fl["type"].append(f"smallest text {out['text']['smallest_pt_at_target']} pt at the target width, under 6.5")
    if out.get("text") and any("Arial" not in f for f in out["text"]["fonts"]):
        fl["type"].append("fonts other than Arial: " + ", ".join(f for f in out["text"]["fonts"] if "Arial" not in f))
    out["flags"] = fl
    out["verdict"], out["reason"] = suggest(kind, fl, has_script)
    return out


def main(argv=None) -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("path")
    ap.add_argument("--width-mm", type=float, default=178.0, help="target width in the paper (default 178)")
    ap.add_argument("--kind", choices=("auto",) + KINDS, default="auto")
    ap.add_argument("--has-script", action="store_true", help="the data or script behind a plot is available")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args(argv)
    p = Path(a.path)
    if not p.is_file():
        print(f"not found: {p}", file=sys.stderr)
        return 2
    r = audit(p, a.width_mm, a.kind, a.has_script)
    if a.json:
        print(json.dumps(r, indent=1))
    elif not r["measured"]:
        print(f"{p.name}: {r['reason']}")
    else:
        m, c = r["marks"], r["colours"]
        print(f"{p.name} [{r['kind']}] {r['verdict']}: {r['reason']}")
        print(f"  ink {m['ink']} %, cells {m['cells']} %, band {m['band']} %, blank {m['blank']} % | {c['chromatic']} hues, worst distance {c['worst_distance']} | "
              f"{r['size_mm'][0]} x {r['size_mm'][1]} mm" + (f" at {r['effective_dpi']} dpi" if r["effective_dpi"] else " vector"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
