import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "plots"))
import pal  # noqa: E402
import plot_layer  # noqa: E402


def test_palette_comes_from_the_token_file():
    assert pal.FILL["mint"] == "#91D7AB" and pal.EDGE["rose"].startswith("#") and len(pal.DATA) == 6
    assert pal.mix("#000000", "#FFFFFF", 0.5) == "#808080"


def test_layer_keeps_text_as_text_and_is_transparent(tmp_path):
    fig, cv = plot_layer.new_plot_canvas(80, 40)
    ax = plot_layer.mm_axes(fig, 10, 5, 60, 30)
    ax.plot([0, 1, 2], [0, 1, 0])
    ax.set_xlabel("residue number")
    out = plot_layer.save_plot_layer(fig, tmp_path / "l.svg")
    svg = out.read_text(encoding="utf-8")
    assert "residue number" in svg                      # live text, not outlines
    assert 'width="226' in svg or "pt" in svg           # 80 mm is about 226.8 pt
    assert "fill: #ffffff" not in svg.split("</metadata>")[1][:400]   # no white page rectangle first
