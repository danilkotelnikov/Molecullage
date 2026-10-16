import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "qa"))
import leak_scan  # noqa: E402


def test_repository_is_clean():
    r = subprocess.run([sys.executable, "-I", str(ROOT / "qa" / "leak_scan.py")], capture_output=True, text=True, cwd=ROOT)
    assert r.returncode == 0, r.stdout


def test_built_in_patterns_catch_what_they_should():
    bad = ["C:/Users/someone/x", "/home/someone/data", "see scratch/notes"]
    pats = leak_scan.NAMES + leak_scan.PATHS
    for s in bad:
        assert any(re.search(p, s, re.I) for p in pats), s
    for s in ["structfig toolkit", "examples/dates", "20-column, 12-row grid"]:
        assert not any(re.search(p, s, re.I) for p in pats), s
    for s in ["a powerful tool", "seamless", "We leverage this!", "ensure that it works"]:
        assert any(re.search(p, s, re.I) for p in leak_scan.TONE), s


def test_deny_list_from_outside_the_repository(tmp_path, monkeypatch):
    """A deny list in a file outside the repository is read, and a hit names the pattern."""
    deny = tmp_path / "denylist.txt"
    deny.write_text("# project words\nsecretproject\n\\b123,456,789 parameters\n", encoding="utf-8")
    monkeypatch.setenv("STRUCTFIG_DENYLIST", str(deny))
    assert leak_scan.load_denylist() == ["secretproject", r"\b123,456,789 parameters"]
    page = tmp_path / "page.md"
    page.write_text("The SecretProject model has 123,456,789 parameters.\n", encoding="utf-8")
    monkeypatch.setattr(leak_scan, "ROOT", tmp_path)
    hits = leak_scan.scan([page])
    assert len(hits) == 2, hits
