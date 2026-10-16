import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "palette"))
import colour as C  # noqa: E402
import make_tokens  # noqa: E402
import sample_palette as S  # noqa: E402
import check_palette  # noqa: E402

PLANTED = ["#1D397B", "#E16F6B", "#91D7AB", "#FBB153", "#9B51E1"]


def synthetic(tmp_path, noise=True):
    """Flat fills on white with dark outlines, anti-aliased by a blur-like edge band and +-1 level noise on one fill."""
    im = Image.new("RGB", (500, 300), "white")
    d = ImageDraw.Draw(im)
    for i, h in enumerate(PLANTED):
        x = 10 + i * 95
        d.rectangle([x, 20, x + 80, 260], fill=h, outline="#0A0A0A", width=3)
    a = np.asarray(im).astype(int)
    if noise:
        rng = np.random.default_rng(1)
        m = (a == np.array([0x91, 0xD7, 0xAB])).all(axis=2)          # one fill gets +-1 noise on 10 % of its pixels
        jit = rng.integers(-1, 2, size=a.shape)
        pick = m & (rng.random(m.shape) < 0.1)
        a[pick] += jit[pick]
        # mixtures of fill and white along a vertical seam: anti-aliased edge colours
        for k in range(6):
            a[100:200, 90 + k] = (a[100:200, 90 + k] * (k + 1) / 7 + 255 * (6 - k) / 7).astype(int)
    p = tmp_path / "synth.png"
    Image.fromarray(a.clip(0, 255).astype("uint8")).save(p)
    return p


def test_sampler_recovers_planted_fills_exactly(tmp_path):
    res = S.sample(S.load(str(synthetic(tmp_path))), levels=2, max_colours=8)
    found = [r["hex"] for r in res]
    for h in PLANTED:
        assert h in found, (h, found)
    assert "#0A0A0A" in found


def test_sampler_reads_pdf_page(tmp_path):
    import fitz

    png = synthetic(tmp_path, noise=False)
    doc = fitz.open()
    page = doc.new_page(width=300, height=180)
    page.insert_image(page.rect, filename=str(png))
    pdf = tmp_path / "s.pdf"
    doc.save(pdf)
    found = {r["hex"] for r in S.sample(S.load(str(pdf), 1), levels=2, max_colours=10)}
    assert sum(h in found for h in PLANTED) >= 4   # resampling by the PDF renderer may shift one colour by a level


def test_core_six_distance_is_the_measured_value():
    tok = json.loads((ROOT / "tokens" / "tokens.base.json").read_text())
    fam = tok["color"]["family"]
    d, _, _ = C.min_de([fam[k]["fill"] for k in check_palette.CORE])
    assert round(d, 1) == 11.5 == tok["meta"]["core_six_min_ciede2000"]


def test_tokens_file_is_what_make_tokens_builds():
    built = make_tokens.build()
    stored = json.loads((ROOT / "tokens" / "tokens.base.json").read_text())
    assert built == stored


def test_derived_dark_tone_is_darker_and_reads_on_white():
    for fill in ("#E16F6B", "#FBB153", "#9B51E1"):
        t = C.darker(fill, 0.5)
        assert C.to_oklab(t)[0] < C.to_oklab(fill)[0] + 1e-6
        assert C.contrast(t) >= 4.4


def test_white_text_only_where_contrast_allows():
    tok = json.loads((ROOT / "tokens" / "tokens.base.json").read_text())
    white = set(tok["meta"]["white_text_on"])
    for k, v in tok["color"]["family"].items():
        assert (C.contrast(v["fill"]) >= 4.4 and k != "full") == (k in white)


def test_role_search_ranks_by_worst_case():
    sampled = json.loads((ROOT / "palette" / "sampled.json").read_text())["colours"]
    rows = check_palette.best_roles(sampled)
    assert rows[0]["min_ciede2000"] >= rows[-1]["min_ciede2000"]
    assert rows[0]["roles"]["antigen"] == "lightgreen"
