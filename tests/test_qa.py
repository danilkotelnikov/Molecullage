import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "qa"))
import qa_fig  # noqa: E402


def make_png(tmp_path, share=0.12):
    """White page; vertical dark stripes so that about `share` of the pixels are ink and no row or band is empty."""
    a = np.full((600, 1000, 3), 255, np.uint8)
    w = int(1000 * share)
    for x in range(0, 1000, 100):
        a[:, x:x + w // 10 + 1] = 20
    p = tmp_path / "fig.png"
    Image.fromarray(a).save(p)
    return p


def test_strictness_changes_the_marks(tmp_path):
    p = make_png(tmp_path, 0.12)
    n = qa_fig.run(str(p), strictness="normal", quick=True)
    s = qa_fig.run(str(p), strictness="strict", quick=True)
    lo = qa_fig.run(str(p), strictness="loose", quick=True)
    assert 9 < n["marks"]["ink"]["value"] < 20
    assert n["marks"]["ink"]["status"] == "ok"
    assert s["marks"]["ink"]["status"] == "FAIL" and not s["ok"]
    assert "below 20.0" in s["marks"]["ink"]["reason"]
    assert lo["marks"]["ink"]["status"] == "ok"


def test_loose_turns_failures_into_warnings(tmp_path):
    p = tmp_path / "empty.png"
    Image.new("RGB", (600, 400), "white").save(p)
    assert not qa_fig.run(str(p), strictness="normal", quick=True)["ok"]
    r = qa_fig.run(str(p), strictness="loose", quick=True)
    assert r["ok"] and r["marks"]["ink"]["status"] == "warn" and r["failures"]


def test_config_sets_the_default_strictness(tmp_path):
    (tmp_path / "structfig.json").write_text(json.dumps({"strictness": "strict"}))
    p = make_png(tmp_path, 0.12)
    assert qa_fig.run(str(p), quick=True)["strictness"] == "strict"


def test_cli_exit_code_and_json(tmp_path):
    p = make_png(tmp_path, 0.12)
    r = subprocess.run([sys.executable, "-I", str(ROOT / "qa" / "qa_fig.py"), str(p), "--quick", "--json", "--strictness", "strict"], capture_output=True, text=True)
    assert r.returncode == 1 and json.loads(r.stdout)["strictness"] == "strict"


@pytest.mark.parametrize("name", ["pipeline", "sequence", "contacts", "plots2", "series", "dates", "structures"])
def test_examples_pass_at_normal_strictness(name):
    """The shipped examples pass every mark at normal strictness (warnings such as the word count are allowed). palette is a reference sheet and is not in this list."""
    r = qa_fig.run(str(ROOT / "examples" / name / name), strictness="normal")
    assert r["ok"], r["failures"]


def test_example_pdf_marks_and_fonts():
    r = qa_fig.run(str(ROOT / "examples" / "contacts" / "contacts"), strictness="normal")
    assert r["marks"]["type"]["value"] >= 6.5 and r["marks"]["fonts"]["status"] == "ok" and r["marks"]["pages"]["value"] == 1
    assert abs(r["marks"]["width"]["value"] - 178.0) < 0.5 and r["marks"]["width"]["status"] == "ok"
    assert qa_fig.run(str(ROOT / "examples" / "contacts" / "contacts"), strictness="strict")["marks"]["words"]["status"] == "FAIL"
