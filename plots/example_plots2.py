"""Plot layer of the two-panel example: matplotlib draws the data, the kit draws letters, titles and labels at the same millimetre boxes.

    py -3 -B plots/example_plots2.py

a  C-alpha B-factors of PDB 1MEL, chain A (single-domain antibody) and chain L (lysozyme), first copy (data/pdb/1MEL.pdb).
b  contacts per residue of PDB 4KRL: for every residue of the nanobody (chain B), the number of EGFR residues (chain A) with a heavy atom within
   4.5 angstrom of any heavy atom of the residue.
Writes examples/plots2/plots2_layer.svg and plots2_layer.js (window.DATA: boxes in mm and summary numbers).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
from plot_layer import mm_axes, new_plot_canvas, save_plot_layer  # noqa: E402
from pal import DATA, EDGE, FILL, INK  # noqa: E402

W, H = 178.0, 56.0
BOX_A = dict(x=15.0, t=9.0, w=70.0, h=38.0)     # top-down mm
BOX_B = dict(x=108.0, t=9.0, w=66.0, h=38.0)


def read(path: Path, chains: set[str]):
    out = {}
    for line in path.read_text().splitlines():
        if line.startswith("ATOM") and line[21] in chains and line[16] in " A" and line[76:78].strip() != "H":
            k = (line[21], int(line[22:26]), line[26].strip())
            out.setdefault(k, {})[line[12:16].strip()] = (np.array([float(line[30:38]), float(line[38:46]), float(line[46:54])]), float(line[60:66]))
    return out


def pale_area(ax) -> None:
    """A pale plot area. The layer is saved transparent, so the area is a patch, not the axes face colour."""
    from matplotlib.patches import Rectangle

    ax.add_patch(Rectangle((0, 0), 1, 1, transform=ax.transAxes, facecolor=FILL["palesky"], edgecolor="none", zorder=0, clip_on=False))


def main() -> None:
    mel = read(ROOT / "data" / "pdb" / "1MEL.pdb", {"A", "L"})
    series = {c: sorted((k[1], v["CA"][1]) for k, v in mel.items() if k[0] == c and "CA" in v) for c in ("A", "L")}
    krl = read(ROOT / "data" / "pdb" / "4KRL.pdb", {"A", "B"})
    ag = [(k, np.array([a[0] for a in v.values()])) for k, v in krl.items() if k[0] == "A"]
    counts = []
    for k, v in sorted((k, v) for k, v in krl.items() if k[0] == "B"):
        xyz = np.array([a[0] for a in v.values()])
        n = sum(1 for _, g in ag if np.sqrt(((xyz[:, None, :] - g[None, :, :]) ** 2).sum(-1)).min() <= 4.5)
        counts.append((k[1], n))
    fig, cv = new_plot_canvas(W, H)
    mm = lambda b: (b["x"], H - b["t"] - b["h"], b["w"], b["h"])  # noqa: E731
    ax = mm_axes(fig, *mm(BOX_A))
    pale_area(ax)
    for c, col, lab in (("A", EDGE["rose"], "chain A"), ("L", EDGE["mint"], "chain L")):
        xs, ys = zip(*series[c])
        ax.fill_between(xs, ys, color=FILL["palepink" if c == "A" else "palemint"], alpha=0.85, linewidth=0)
        ax.plot(xs, ys, color=col, lw=1.1, label=lab)
    ax.set_xlim(0, 150)
    ax.set_ylim(0, max(max(y for _, y in s) for s in series.values()) * 1.3)
    ax2 = mm_axes(fig, *mm(BOX_B))
    pale_area(ax2)
    xs, ys = zip(*counts)
    ax2.bar(xs, ys, width=0.85, color=FILL["rose"], edgecolor=INK, linewidth=0.3)
    ax2.set_xlim(0, 135)
    ax2.set_ylim(0, max(ys) * 1.35)
    ax2.set_yticks(range(0, max(ys) + 1, 2))
    mean = {c: round(float(np.mean([y for _, y in s])), 1) for c, s in series.items()}
    data = dict(W=W, H=H, a=BOX_A, b=BOX_B, bfactor_mean=mean, n_ca={c: len(s) for c, s in series.items()}, contacts_total=sum(ys), contact_residues=sum(1 for y in ys if y), max_count=max(ys),
                max_residue=xs[int(np.argmax(ys))], colours=dict(A=EDGE["rose"], L=EDGE["mint"]))
    out = ROOT / "examples" / "plots2"
    out.mkdir(parents=True, exist_ok=True)
    save_plot_layer(fig, out / "plots2_layer.svg")
    (out / "plots2_layer.js").write_text("window.DATA = " + json.dumps(data, indent=1) + ";\n", encoding="utf-8")
    print(json.dumps({k: data[k] for k in ("bfactor_mean", "n_ca", "contacts_total", "contact_residues", "max_count", "max_residue")}))


if __name__ == "__main__":
    main()
