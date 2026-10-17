"""Make the two poor figures of the sample project with plain matplotlib defaults.

    py -3 -B scripts/make_before.py        (run from examples/sample-project)

figures/bfactors.png   a default-style line plot of the C-alpha B-factors of PDB 1MEL (data/pdb/1MEL.pdb of the Molecullage folder)
figures/pipeline.png   a pipeline of plain boxes and arrows with wobbly lines, mixed type sizes and default colours
The third figure, figures/structure.png, is a ChimeraX screenshot: see scripts/default_render.cxc.
"""
from __future__ import annotations

import random
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

HERE = Path(__file__).resolve().parent.parent
PDB = HERE.parents[1] / "data" / "pdb" / "1MEL.pdb"
OUT = HERE / "figures"


def bfactors():
    series = {}
    for line in PDB.read_text().splitlines():
        if line.startswith("ATOM") and line[12:16].strip() == "CA" and line[21] in "AL" and line[16] in " A":
            series.setdefault(line[21], []).append((int(line[22:26]), float(line[60:66])))
    return series


def plot() -> None:
    s = bfactors()
    plt.figure(figsize=(6.4, 4.8), dpi=100)          # the matplotlib default size
    for c in "AL":
        x, y = zip(*s[c])
        plt.plot(x, y, label=c)
    plt.title("Figure 1")
    plt.xlabel("res")
    plt.ylabel("bfac")
    plt.legend()
    plt.savefig(OUT / "bfactors.png")
    plt.close()


def wobble(rng, pts, amp=0.012):
    return [(x + rng.uniform(-amp, amp), y + rng.uniform(-amp, amp)) for x, y in pts]


def pipeline() -> None:
    rng = random.Random(7)
    fig = plt.figure(figsize=(8, 3.2), dpi=100)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, 8)
    ax.set_ylim(0, 3.2)
    ax.axis("off")
    boxes = [("Sequences", 0.3, "tab:blue", 15), ("Fold", 1.9, "tab:orange", 12), ("dock to\nthe antigen", 3.5, "lightgreen", 11),
             ("SCORE", 5.1, "tab:orange", 16), ("best ones", 6.6, "yellow", 12)]
    for i, (text, x, col, fs) in enumerate(boxes):
        y0, w, h = 1.0 + 0.15 * (i % 2), 1.3, 1.1
        pts = [(x, y0), (x + w, y0), (x + w, y0 + h), (x, y0 + h), (x, y0)]
        ax.fill([p[0] for p in pts], [p[1] for p in pts], color=col, alpha=0.5)
        for _ in range(2):
            w2 = wobble(rng, pts)
            ax.plot([p[0] for p in w2], [p[1] for p in w2], color="black", lw=1.6)
        ax.text(x + w / 2, y0 + h / 2, text, ha="center", va="center", fontsize=fs, family="Comic Sans MS", color="black")
        if i:
            px = boxes[i - 1][1] + w
            ax.annotate("", xy=(x - 0.03, y0 + h / 2), xytext=(px + 0.03, 1.0 + 0.15 * ((i - 1) % 2) + h / 2), arrowprops=dict(arrowstyle="->", lw=2, color="red"))
    ax.text(0.3, 2.9, "my pipeline!!", fontsize=18, family="Comic Sans MS", color="darkblue")
    ax.text(3.7, 0.35, "(takes long)", fontsize=9, family="Comic Sans MS", color="gray")
    fig.savefig(OUT / "pipeline.png")
    plt.close(fig)


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    plot()
    pipeline()
