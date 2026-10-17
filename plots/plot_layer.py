"""Plot layer helpers.

A figure is an HTML page of fixed size in millimetres. Data plots stay matplotlib: draw them on a transparent canvas of
the same size as the page (new_plot_canvas), save the SVG (save_plot_layer) and include it in the page with
<!--INLINE_SVG relative/path/to/layer.svg--> inside the .fig element. The kit draws schematics, panel letters and labels
on top, at the same millimetre coordinates.

Text is Arial at the type ladder (7 pt labels, 6.5 pt floor), kept as text in the SVG so that the PDF carries live text.
"""
from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib import font_manager  # noqa: E402

MM = 1.0 / 25.4
W_FULL, W_HALF, H_MAX = 178.0, 89.0, 170.0
FS, FS_FLOOR = 7.0, 6.55
INK, LINE = "#0A0A0A", "#3A3A3A"


def _setup() -> list[str]:
    avail = {f.name for f in font_manager.fontManager.ttflist}
    fams = [f for f in ("Arial", "Liberation Sans", "DejaVu Sans") if f in avail] or ["DejaVu Sans"]
    plt.rcParams.update({
        "font.family": "sans-serif", "font.sans-serif": fams, "font.size": FS,
        "axes.labelsize": FS, "axes.titlesize": FS, "xtick.labelsize": FS_FLOOR, "ytick.labelsize": FS_FLOOR, "legend.fontsize": FS_FLOOR,
        "axes.linewidth": 0.6, "xtick.major.width": 0.6, "ytick.major.width": 0.6, "xtick.major.size": 2.0, "ytick.major.size": 2.0,
        "lines.linewidth": 0.9, "axes.spines.top": False, "axes.spines.right": False, "axes.edgecolor": LINE,
        "axes.labelcolor": INK, "text.color": INK, "xtick.color": INK, "ytick.color": INK,
        "figure.facecolor": "none", "axes.facecolor": "none", "savefig.facecolor": "none",
        "svg.fonttype": "none", "svg.hashsalt": "molecullage", "pdf.fonttype": 42,
        "mathtext.fontset": "custom", "mathtext.rm": fams[0], "mathtext.it": fams[0] + ":italic", "mathtext.bf": fams[0] + ":bold",
    })
    return fams


FONTS = _setup()


def new_plot_canvas(width_mm: float, height_mm: float):
    """Figure and a millimetre axes (origin bottom-left, data coordinates in mm) on a transparent background."""
    assert width_mm <= W_FULL + 1e-6 and height_mm <= H_MAX + 1e-6, "figure exceeds 178 x 170 mm"
    fig = plt.figure(figsize=(width_mm * MM, height_mm * MM), dpi=100)
    fig.patch.set_alpha(0.0)
    cv = fig.add_axes([0, 0, 1, 1])
    cv.set_xlim(0, width_mm)
    cv.set_ylim(0, height_mm)
    cv.axis("off")
    return fig, cv


def mm_axes(fig, x, y, w, h, **kw):
    """Data axes placed by millimetres: (x, y) bottom-left, size (w, h)."""
    W, H = fig.get_size_inches() / MM
    ax = fig.add_axes([x / W, y / H, w / W, h / H], **kw)
    ax.patch.set_alpha(0.0)
    ax.tick_params(length=2.5, width=0.6, pad=2)
    return ax


def save_plot_layer(fig, path) -> Path:
    """Write the SVG (text kept as text, transparent) and close the figure."""
    out = Path(path)
    out.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out, format="svg", transparent=True, metadata={"Date": None})   # no date and a fixed hash salt: the same input gives the same file
    plt.close(fig)
    return out
