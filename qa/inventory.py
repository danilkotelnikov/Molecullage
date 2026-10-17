"""Find every figure of a project: image files, the scripts that make them, and where the text cites them.

    py -3 -I qa/inventory.py path/to/project --width-mm 178 --extract-dir path/to/project/molecullage/extracted

Finds
  files        png, jpg, tif, pdf (one page), svg, eps; and the media of .docx files and the image outputs of .ipynb notebooks
               (written to --extract-dir when you pass it)
  scripts      .py, .R, .ipynb, .Rmd, .qmd that use matplotlib, seaborn, plotly, plotnine, ggplot2 or R base graphics, with the
               files they save (savefig, ggsave, write_image, png(), pdf() ...)
  references   LaTeX \\includegraphics (with the caption of its figure environment), Markdown and Quarto images, HTML img,
               Sphinx figure and image, and docx pictures (with the paragraph that follows or holds them)
Prints one JSON object: figures (id, path, size, dpi, size in mm at the target width, kind guess, script, cited_in, caption),
scripts, references, documents (PDFs of more than one page), counts. Reads files; writes only into --extract-dir.
Needs numpy and Pillow. pymupdf is optional (PDF page size and page count; without it the page box is read from the bytes).
"""
from __future__ import annotations

import argparse
import io
import json
import re
import sys
import zipfile
from pathlib import Path

import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None  # only the header is read for size; pixels are read from a reduced copy
IMG = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".pdf", ".svg", ".eps"}
SKIP_DIRS = {"node_modules", "__pycache__", "site-packages", "venv", "env", "dist", "molecullage", "_build", "build"}
MAX_FILES = 8000
MAX_TEXT = 2_000_000
MIN_SIDE = 64  # smaller rasters are icons, not figures

OUT_PATTERNS = [
    re.compile(r"""\.savefig\([^\n]*?(["'])([^"'\n]+?\.\w{3,4})\1"""),
    re.compile(r"""\bggsave\([^\n]*?(["'])([^"'\n]+?\.\w{3,4})\1"""),
    re.compile(r"""\.(?:write_image|write_html|save)\([^\n]*?(["'])([^"'\n]+?\.(?:png|jpe?g|svg|pdf|html|tiff?))\1"""),
    re.compile(r"""\b(?:png|pdf|svg|tiff|jpeg|cairo_pdf|postscript)\(\s*(?:file(?:name)?\s*=\s*)?(["'])(.+?)\1"""),
]
LIBS = [("matplotlib", re.compile(r"\bmatplotlib\b|\bplt\.")), ("seaborn", re.compile(r"\bseaborn\b|\bsns\.")),
        ("plotly", re.compile(r"\bplotly\b")), ("plotnine", re.compile(r"\bplotnine\b")),
        ("ggplot2", re.compile(r"ggplot2|\bggplot\(|\bggsave\(")),
        ("R base graphics", re.compile(r"(?<![\w.])(?:plot|hist|barplot|boxplot|heatmap|image|pie|curve)\(")),
        ("ChimeraX/PyMOL render", re.compile(r"\bsave\s+\S+\.png|cmd\.png\(|pymol"))]
INCLUDEGRAPHICS = re.compile(r"\\includegraphics\s*(?:\[[^\]]*\])?\s*\{([^}]+)\}")
GRAPHICSPATH = re.compile(r"\\graphicspath\s*\{((?:\s*\{[^}]*\}\s*)+)\}")
MD_IMG = re.compile(r"!\[([^\]]*)\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)(?:\{[^}]*\})?")
HTML_IMG = re.compile(r"<img\b[^>]*?\bsrc=[\"']([^\"']+)[\"'][^>]*>", re.I)
RST_IMG = re.compile(r"^\s*\.\.\s+(?:figure|image)::\s*(\S+)", re.M)
KIND_WORDS = [("table", ("table",)),
              ("photo", ("photo", "micrograph", "microscop", "gel", "blot", "western", "stained", "staining", "tem ", "cryo-em map")),
              ("structure", ("structure of", "structure", "render", "chimerax", "pymol", "surface", "cartoon", "crystal", "docking", "bound to", "fold")),
              ("schematic", ("pipeline", "workflow", "schem", "overview", "diagram", "flowchart", "graphical abstract", "abstract", "model of", "scheme")),
              ("plot", ("plot", "curve", "roc", "histogram", "distribution", "box", "violin", "scatter", "bar", "heatmap", "umap", "pca", "volcano", "correlation", "mean", "error bars", "b-factor", "bfactor", "profile", "per residue", "versus", " vs "))]


def slug(s: str) -> str:
    s = re.sub(r"[^A-Za-z0-9_-]+", "_", s).strip("_")
    return (s or "fig")[:56]


def read_text(p: Path) -> str:
    try:
        return p.read_bytes()[:MAX_TEXT].decode("utf-8", errors="replace")
    except OSError:
        return ""


def walk(root: Path, notes: list[str]):
    seen = 0
    stack = [root]
    while stack:
        d = stack.pop()
        try:
            entries = sorted(d.iterdir())
        except OSError:
            continue
        for e in entries:
            if e.is_symlink():
                continue
            if e.is_dir():
                if e.name.startswith(".") or e.name.lower() in SKIP_DIRS:
                    continue
                stack.append(e)
            elif e.is_file():
                seen += 1
                if seen > MAX_FILES:
                    notes.append(f"stopped after {MAX_FILES} files; point the tool at a smaller folder")
                    return
                yield e


def pdf_facts(p: Path) -> dict:
    try:
        import pymupdf as fitz

        doc = fitz.open(p)
        r = doc[0].rect
        return dict(pages=len(doc), mm=(r.width / 72 * 25.4, r.height / 72 * 25.4))
    except ImportError:
        b = p.read_bytes()[:20_000_000]
        pages = len(re.findall(rb"/Type\s*/Page(?![s\w])", b))
        m = re.search(rb"/MediaBox\s*\[\s*([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s*\]", b)
        mm = None
        if m:
            x0, y0, x1, y1 = (float(v) for v in m.groups())
            mm = ((x1 - x0) / 72 * 25.4, (y1 - y0) / 72 * 25.4)
        return dict(pages=pages or 1, mm=mm)
    except Exception:
        return dict(pages=1, mm=None)


def svg_mm(p: Path):
    t = read_text(p)[:4000]
    def num(attr):
        m = re.search(rf"\b{attr}\s*=\s*[\"']([\d.]+)\s*(mm|cm|in|pt|px)?[\"']", t)
        if not m:
            return None
        v, u = float(m.group(1)), m.group(2) or "px"
        return v * {"mm": 1, "cm": 10, "in": 25.4, "pt": 25.4 / 72, "px": 25.4 / 96}[u]
    w, h = num("width"), num("height")
    if w is None or h is None:
        m = re.search(r"viewBox\s*=\s*[\"']\s*[\d.\-]+\s+[\d.\-]+\s+([\d.]+)\s+([\d.]+)", t)
        if m:
            w, h = float(m.group(1)) * 25.4 / 96, float(m.group(2)) * 25.4 / 96
    return (w, h) if w and h else None


def eps_mm(p: Path):
    m = re.search(rb"%%BoundingBox:\s*([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)", p.read_bytes()[:8192])
    if not m:
        return None
    x0, y0, x1, y1 = (float(v) for v in m.groups())
    return (x1 - x0) / 72 * 25.4, (y1 - y0) / 72 * 25.4


def raster_facts(src) -> dict | None:
    try:
        im = Image.open(src)
        w, h = im.size
        dpi = im.info.get("dpi")
        small = im.convert("RGBA") if im.mode in ("P", "LA", "RGBA") else im
        small = small.reduce(max(1, max(w, h) // 160)) if max(w, h) > 160 else small
        if small.mode == "RGBA":
            bg = Image.new("RGBA", small.size, (255, 255, 255, 255))
            bg.alpha_composite(small)
            small = bg
        a = np.asarray(small.convert("RGB"))
        white = float((a >= 235).all(axis=2).mean())
        q = (a // 16).reshape(-1, 3)
        uniq = len(np.unique(q[:, 0].astype(int) * 256 + q[:, 1].astype(int) * 16 + q[:, 2].astype(int)))
        return dict(w=w, h=h, dpi=round(float(dpi[0])) if dpi and dpi[0] > 1 else None, white=white, colours=uniq)
    except Exception:
        return None


def kind_guess(name: str, caption: str, px: dict | None) -> tuple[str, str]:
    for src, text in (("name", name.lower()), ("caption", caption.lower())):
        score = {kind: sum(w in text for w in words) for kind, words in KIND_WORDS}
        best = max(score, key=lambda k: score[k])   # ties go to the first kind of the list
        if score[best]:
            return best, src
    if px:
        if px["colours"] > 400 and px["white"] < 0.5:
            return "photo", "pixels"
        return ("plot" if px["white"] >= 0.75 else "schematic"), "pixels"
    return "unknown", "none"


def braces(text: str, start: int) -> str:
    """Text inside the balanced braces that open at text[start] == '{'."""
    depth = 0
    for i in range(start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return text[start + 1:i]
    return text[start + 1:]


def clean(s: str) -> str:
    s = re.sub(r"\\(?:textbf|textit|emph|textrm|mathrm)\{([^{}]*)\}", r"\1", s)
    s = re.sub(r"\\[a-zA-Z]+\*?(?:\[[^\]]*\])?", " ", s)
    return re.sub(r"\s+", " ", s.replace("{", "").replace("}", "").replace("~", " ")).strip()[:600]


def resolve(target: str, bases: list[Path], root: Path) -> Path | None:
    t = target.strip().strip("\"'")
    if re.match(r"^[a-z]+://", t, re.I) or t.startswith("data:"):
        return None
    t = t.split("?")[0].split("#")[0]
    exts = ["", ".png", ".pdf", ".jpg", ".jpeg", ".tif", ".tiff", ".svg", ".eps"]
    for b in bases + [root]:
        for e in exts:
            c = (b / (t + e)).resolve()
            if c.is_file() and c.suffix.lower() in IMG:
                return c
    return None


def scan_tex(p: Path, root: Path, text: str):
    gp = []
    for m in GRAPHICSPATH.finditer(text):
        gp += [p.parent / x for x in re.findall(r"\{([^}]*)\}", m.group(1))]
    for m in INCLUDEGRAPHICS.finditer(text):
        line = text.count("\n", 0, m.start()) + 1
        cap = ""
        fb = max(text.rfind("\\begin{figure", 0, m.start()), text.rfind("\\begin{wrapfigure", 0, m.start()))
        if fb != -1 and not re.search(r"\\end\{(?:figure|wrapfigure)\*?\}", text[fb:m.start()]):
            end = re.search(r"\\end\{(?:figure|wrapfigure)\*?\}", text[m.end():])
            env = text[fb:m.end() + (end.end() if end else 0)]
            cm = re.search(r"\\caption\s*(?:\[[^\]]*\])?\s*\{", env)
            if cm:
                cap = clean(braces(env, cm.end() - 1))
        for tgt in m.group(1).split(","):
            yield p, line, tgt, cap, gp


def following_caption(text: str, end: int) -> str:
    """The paragraph after an image, when it starts with Figure, Fig. or Table (Markdown, Quarto)."""
    para = re.split(r"\n\s*\n", text[end:].lstrip(), maxsplit=1)[0].strip()
    para = re.sub(r"^[*_]+|[*_]+$", "", para).strip()
    return " ".join(para.split())[:600] if re.match(r"[*_]*(?:fig(?:ure|\.)?|table)\s*[\dA-Za-z]+[.:]", para, re.I) else ""


def scan_md(p: Path, text: str):
    for m in MD_IMG.finditer(text):
        alt = clean(m.group(1)) if m.group(1) else ""
        weak = re.fullmatch(r"(?:fig(?:ure|\.)?)\s*\d+", alt, re.I)
        yield p, text.count("\n", 0, m.start()) + 1, m.group(2), following_caption(text, m.end()) or ("" if weak else alt), []
    for m in HTML_IMG.finditer(text):
        alt = re.search(r"\balt=[\"']([^\"']*)[\"']", m.group(0))
        yield p, text.count("\n", 0, m.start()) + 1, m.group(1), alt.group(1) if alt else "", []


def scan_rst(p: Path, text: str):
    for m in RST_IMG.finditer(text):
        after = text[m.end():]
        cap = ""
        paras = re.split(r"\n\s*\n", after.lstrip("\n"), maxsplit=2)
        if len(paras) > 1 and not paras[1].lstrip().startswith(":") and not paras[1].startswith(".."):
            cap = " ".join(paras[1].split())
        yield p, text.count("\n", 0, m.start()) + 1, m.group(1), cap[:600], []


def scan_script(p: Path, rel: str, text: str) -> dict | None:
    libs = [n for n, rx in LIBS if rx.search(text) and (n != "R base graphics" or p.suffix.lower() in (".r", ".rmd", ".qmd"))]
    outs = sorted({m.group(2) for rx in OUT_PATTERNS for m in rx.finditer(text)})
    if not libs and not outs:
        return None
    return dict(path=rel, kind=p.suffix.lower().lstrip("."), libs=libs, outputs=outs, lines=text.count("\n") + 1)


def inline_figures(rel: str, text: str) -> list[dict]:
    """Quarto and R Markdown chunks that draw a figure without saving a file."""
    out = []
    for m in re.finditer(r"^```\{(?:python|r)[^}]*\}\n((?:.|\n)*?)^```", text, re.M):
        body = m.group(1)
        lab = re.search(r"#\|\s*label:\s*(\S+)", body)
        cap = re.search(r"#\|\s*fig-cap:\s*[\"']?(.+?)[\"']?\s*$", body, re.M)
        if lab and lab.group(1).startswith("fig-"):
            out.append(dict(label=lab.group(1), caption=cap.group(1) if cap else "", file=rel, line=text.count("\n", 0, m.start()) + 1))
    return out


def scan_ipynb(p: Path, rel: str, extract: Path | None):
    try:
        nb = json.loads(read_text(p))
    except ValueError:
        return None, []
    src_all, imgs = [], []
    for ci, cell in enumerate(nb.get("cells", [])):
        if cell.get("cell_type") != "code":
            continue
        src_all.append("".join(cell.get("source", [])))
        for k, o in enumerate(cell.get("outputs", [])):
            data = o.get("data", {})
            if "image/png" in data:
                imgs.append((ci, k, data["image/png"]))
    rec = scan_script(p, rel, "\n".join(src_all))
    if rec is None and imgs:
        rec = dict(path=rel, kind="ipynb", libs=[], outputs=[], lines=sum(s.count("\n") + 1 for s in src_all))
    if rec is not None:
        rec["embedded_images"] = len(imgs)
    out = []
    if extract is not None and imgs:
        import base64
        extract.mkdir(parents=True, exist_ok=True)
        for ci, k, b64 in imgs:
            f = extract / f"{slug(p.stem)}_cell{ci}_{k}.png"
            f.write_bytes(base64.b64decode("".join(b64) if isinstance(b64, list) else b64))
            out.append(f)
    return rec, out


def scan_docx(p: Path, extract: Path | None):
    """Yield (media name, bytes, caption) for every picture of a .docx."""
    try:
        z = zipfile.ZipFile(p)
        rels = z.read("word/_rels/document.xml.rels").decode("utf-8", "replace")
        doc = z.read("word/document.xml").decode("utf-8", "replace")
    except (KeyError, zipfile.BadZipFile, OSError):
        return
    target = {m.group(1): m.group(2) for m in re.finditer(r"<Relationship\b[^>]*?\bId=\"([^\"]+)\"[^>]*?\bTarget=\"([^\"]+)\"", rels)}
    target.update({m.group(2): m.group(1) for m in re.finditer(r"<Relationship\b[^>]*?\bTarget=\"([^\"]+)\"[^>]*?\bId=\"([^\"]+)\"", rels)})
    paras = re.findall(r"<w:p[ >](?:.|\n)*?</w:p>", doc)
    txt = lambda s: re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", s.replace("</w:t>", " "))).strip()  # noqa: E731
    for i, para in enumerate(paras):
        for rid in re.findall(r"r:embed=\"([^\"]+)\"", para):
            t = target.get(rid, "")
            name = "word/" + t.lstrip("/").replace("word/", "", 1)
            if name not in z.namelist():
                continue
            cap = txt(para)
            for j in (i + 1, i - 1):
                if not cap and 0 <= j < len(paras) and re.match(r"\s*(fig|figure|рис)", txt(paras[j]), re.I):
                    cap = txt(paras[j])
            yield name, z.read(name), cap[:600], i + 1


def main(argv=None) -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("dir")
    ap.add_argument("--width-mm", type=float, default=178.0)
    ap.add_argument("--ignore", action="append", default=[], help="folder name or relative path to skip (repeatable)")
    ap.add_argument("--extract-dir", help="where to write docx pictures and notebook outputs (inside the project)")
    a = ap.parse_args(argv)
    root = Path(a.dir).resolve()
    extract = Path(a.extract_dir).resolve() if a.extract_dir else None
    if extract is not None and root not in extract.parents and extract != root:
        print("--extract-dir must lie inside the project folder", file=sys.stderr)
        return 2
    notes: list[str] = []
    skip = {s.strip("/\\").lower() for s in a.ignore}
    files = [f for f in walk(root, notes) if not skip & ({q.lower() for q in f.relative_to(root).parts[:-1]} | {f.relative_to(root).parent.as_posix().lower()})]
    rel = lambda p: p.resolve().relative_to(root).as_posix() if root in p.resolve().parents else p.as_posix()  # noqa: E731
    figs: dict[str, dict] = {}
    documents, scripts, refs, inline = [], [], [], []
    ids: set[str] = set()

    def add_fig(path: Path, origin: str | None = None, data: bytes | None = None, caption: str = "") -> None:
        r = rel(path) if origin is None else origin
        ext = path.suffix.lower()
        f = dict(id="", path=r, format=ext.lstrip("."), vector=ext in (".pdf", ".svg", ".eps"), pixels=None, file_dpi=None, native_mm=None,
                 target_mm=None, effective_dpi=None, kind="unknown", kind_source="none", script=None, cited_in=[], caption=caption, origin=origin)
        px = None
        if ext == ".pdf":
            pf = pdf_facts(path)
            if pf["pages"] > 1:
                documents.append(dict(path=r, pages=pf["pages"]))
                return
            f["native_mm"] = pf["mm"]
        elif ext == ".svg":
            f["native_mm"] = svg_mm(path)
        elif ext == ".eps":
            f["native_mm"] = eps_mm(path)
        else:
            px = raster_facts(io.BytesIO(data) if data is not None else path)
            if px is None:
                notes.append(f"unreadable image: {r}")
                return
            if min(px["w"], px["h"]) < MIN_SIDE:
                notes.append(f"skipped as an icon (under {MIN_SIDE} px): {r}")
                return
            f["pixels"], f["file_dpi"] = [px["w"], px["h"]], px["dpi"]
            f["effective_dpi"] = round(px["w"] / (a.width_mm / 25.4))
        w, h = (f["native_mm"] or (None, None)) if f["vector"] else (a.width_mm, a.width_mm * px["h"] / px["w"])
        if f["vector"] and f["native_mm"]:
            f["native_mm"] = [round(w, 1), round(h, 1)]
            h = a.width_mm * h / w
        f["target_mm"] = [round(a.width_mm, 1), round(h, 1)] if h else None
        f["kind"], f["kind_source"] = kind_guess(path.stem, caption, px)
        base = slug(path.stem if origin is None else f"{Path(origin.split('::')[0]).stem}_{path.stem}")
        n, i = base, 2
        while n in ids:
            n, i = f"{base}_{i}", i + 1
        ids.add(n)
        f["id"] = n
        figs[(origin or str(path.resolve()))] = f

    cites = []  # (source file, line, target, caption, graphicspath)
    texts = {}
    for p in files:
        ext = p.suffix.lower()
        if ext in IMG:
            add_fig(p)
        elif ext == ".docx":
            for name, data, cap, line in scan_docx(p, extract):
                if Path(name).suffix.lower() not in IMG:
                    continue
                if extract is not None:
                    dst = extract / slug(p.stem)
                    dst.mkdir(parents=True, exist_ok=True)
                    (dst / Path(name).name).write_bytes(data)
                    path = dst / Path(name).name
                    add_fig(path, caption=cap)
                    f = figs.get(str(path.resolve()))
                    if f:
                        f["cited_in"].append(f"{rel(p)}:{line}")
                        f["origin"] = f"{rel(p)}::{name}"
                else:
                    add_fig(Path(name), origin=f"{rel(p)}::{name}", data=data, caption=cap)
                    if f"{rel(p)}::{name}" in figs:
                        figs[f"{rel(p)}::{name}"]["cited_in"].append(f"{rel(p)}:{line}")
        elif ext == ".ipynb":
            rec, pngs = scan_ipynb(p, rel(p), extract)
            if rec:
                scripts.append(rec)
            for q in pngs:
                add_fig(q)
                if str(q.resolve()) in figs:
                    figs[str(q.resolve())]["script"] = rel(p)
        elif ext in (".py", ".r", ".rmd", ".qmd", ".md", ".markdown", ".tex", ".rst", ".txt"):
            t = read_text(p)
            texts[p] = t
            if ext in (".py", ".r", ".rmd", ".qmd"):
                rec = scan_script(p, rel(p), t)
                if rec:
                    scripts.append(rec)
                if ext in (".rmd", ".qmd"):
                    inline += inline_figures(rel(p), t)
            if ext == ".tex":
                cites += scan_tex(p, root, t)
            elif ext in (".md", ".markdown", ".qmd", ".rmd"):
                cites += scan_md(p, t)
            elif ext == ".rst":
                cites += scan_rst(p, t)
    for p, line, tgt, cap, gp in cites:
        hit = resolve(tgt, [p.parent] + gp, root)
        rec = dict(file=rel(p), line=line, target=tgt.strip(), figure=None, caption=cap)
        if hit is not None:
            f = figs.get(str(hit))
            if f is not None:
                rec["figure"] = f["id"]
                f["cited_in"].append(f"{rel(p)}:{line}")
                if cap and not f["caption"]:
                    f["caption"] = cap
                    k = kind_guess(hit.stem, cap, None)
                    if f["kind_source"] in ("none", "pixels") and k[0] != "unknown":
                        f["kind"], f["kind_source"] = k
        refs.append(rec)
    by_name = {}
    for s in scripts:
        for o in s["outputs"]:
            by_name.setdefault(Path(o).name, s["path"])
    for f in figs.values():
        if f["script"] is None:
            f["script"] = by_name.get(Path(f["path"].split("::")[-1]).name)
    # One figure per folder and file name: the vector file is the master, the other formats go to "also".
    order = {".pdf": 0, ".svg": 1, ".eps": 2, ".tif": 3, ".tiff": 3, ".png": 4, ".jpg": 5, ".jpeg": 5}
    groups: dict[str, list[dict]] = {}
    for f in figs.values():
        groups.setdefault(f["path"].lower() if "::" in f["path"] else str(Path(f["path"]).with_suffix("")).lower(), []).append(f)
    idmap, out = {}, []
    for g in groups.values():
        g.sort(key=lambda f: order.get("." + f["format"], 9))
        m = g[0]
        m["also"] = [x["path"] for x in g[1:]]
        keep = min((x["id"] for x in g), key=lambda i: (len(i), i))
        for x in g:
            idmap[x["id"]] = keep
        m["id"] = keep
        for x in g[1:]:
            m["cited_in"] = sorted(set(m["cited_in"]) | set(x["cited_in"]))
            m["caption"] = m["caption"] or x["caption"]
            m["script"] = m["script"] or x["script"]
            if m["kind_source"] in ("none", "pixels") and x["kind_source"] in ("name", "caption"):
                m["kind"], m["kind_source"] = x["kind"], x["kind_source"]
            if m["effective_dpi"] is None and x["effective_dpi"]:
                m["raster_copy"] = dict(path=x["path"], pixels=x["pixels"], effective_dpi=x["effective_dpi"])
        out.append(m)
    out.sort(key=lambda f: f["path"])
    for r in refs:
        r["figure"] = idmap.get(r["figure"], r["figure"])
    for f in out:
        f.pop("origin", None)
    res = dict(dir=str(root), target_width_mm=a.width_mm, figures=out, scripts=scripts, references=refs, inline_figures=inline, documents=documents, notes=notes,
               counts=dict(figures=len(out), scripts=len(scripts), references=len(refs), uncited=sum(1 for f in out if not f["cited_in"]),
                           broken_references=sum(1 for r in refs if r["figure"] is None)))
    print(json.dumps(res, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
