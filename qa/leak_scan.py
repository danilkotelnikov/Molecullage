"""Scan the files that would be published for personal paths, tone slips and anything on your own deny list.

    py -3 -I qa/leak_scan.py            # from the repository root; exit code 1 if anything is found
    py -3 -I qa/leak_scan.py --list     # also print the scanned files and the image files

The file list is `git ls-files --cached --others --exclude-standard` (what a commit would hold), else a walk of the folder.
Coordinate files (data/pdb) and lock files are skipped. This file and tests/test_leak.py are skipped too.
Tone patterns apply to prose files (.md) and to the text of skill files.

Project names, private numbers and anything else you do not want in a public repository belong in a deny list that lives
OUTSIDE the repository, so that the list itself never gets published. One regular expression per line, `#` starts a comment.
The scanner reads, in this order, the file named in STRUCTFIG_DENYLIST, then ~/.structfig/denylist.txt.
Each line is matched case-insensitively against file names and file text.
"""
from __future__ import annotations

import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEXT = {".md", ".js", ".mjs", ".py", ".html", ".css", ".json", ".txt", ".yml", ".yaml", ".svg", ".cxc", ".toml"}
SKIP_DIRS = {".git", "node_modules", ".venv-tools", "out", "tmp", "__pycache__", ".pytest_cache"}
SKIP_FILES = {"package-lock.json", "qa/leak_scan.py", "tests/test_leak.py", "tests/leak.test.mjs"}
SKIP_PREFIX = ("data/pdb/",)

NAMES = [r"scratch[_/]"]
PATHS = [r"[A-Za-z]:[/\\]+Users[/\\]", r"/Users/\w+", r"/home/\w+", r"AppData", r"OneDrive"]
NUMBERS: list[str] = []
TONE = [r"\bleverag\w+", r"\bseamless\w*", r"\bpowerful\b", r"\brobust\w*", r"\bcomprehensive\b", r"state-of-the-art", r"\bdelve\b", r"\btapestry\b", r"\bcrucial\b", r"ensure that",
        r"This section describes", r"!(?=\s|$)"]


def load_denylist() -> list[str]:
    """Extra patterns from a file outside the repository (see the module doc). Returns [] when there is none."""
    candidates = [os.environ.get("STRUCTFIG_DENYLIST", ""), str(Path.home() / ".structfig" / "denylist.txt")]
    for c in candidates:
        if c and Path(c).is_file():
            lines = Path(c).read_text(encoding="utf-8").splitlines()
            return [ln.strip() for ln in lines if ln.strip() and not ln.strip().startswith("#")]
    return []


def files() -> list[Path]:
    try:
        out = subprocess.run(["git", "ls-files", "--cached", "--others", "--exclude-standard"], cwd=ROOT, capture_output=True, text=True, check=True).stdout.split("\n")
        found = [ROOT / p for p in out if p]
    except (OSError, subprocess.CalledProcessError):
        found = [p for p in ROOT.rglob("*") if p.is_file()]
    keep = []
    for p in found:
        rel = p.relative_to(ROOT).as_posix()
        if not p.exists() or any(part in SKIP_DIRS for part in p.relative_to(ROOT).parts) or rel in SKIP_FILES or rel.startswith(SKIP_PREFIX):
            continue
        keep.append(p)
    return keep


def scan(paths: list[Path], extra: list[str] | None = None) -> list[str]:
    deny = load_denylist() if extra is None else extra
    hits: list[str] = []
    groups = [("name", NAMES + deny, re.I), ("path", PATHS, 0), ("number", NUMBERS, 0)]
    for p in paths:
        rel = p.relative_to(ROOT).as_posix()
        for pat in NAMES + deny:                          # file names too
            if re.search(pat, rel, re.I):
                hits.append(f"{rel}: file name matches {pat}")
        if p.suffix.lower() not in TEXT:
            continue
        try:
            lines = p.read_text(encoding="utf-8", errors="replace").splitlines()
        except OSError:
            continue
        prose = p.suffix.lower() == ".md"
        for i, line in enumerate(lines, 1):
            for label, pats, flag in groups + ([("tone", TONE, re.I)] if prose else []):
                for pat in pats:
                    if re.search(pat, line, flag):
                        hits.append(f"{rel}:{i}: {label} {pat!r}: {line.strip()[:100]}")
    return hits


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")   # a Windows console may be cp1251
    paths = files()
    deny = load_denylist()
    hits = scan(paths, deny)
    if "--list" in sys.argv:
        print(len(paths), "files scanned,", len(deny), "deny-list patterns")
        print("images:", ", ".join(sorted(p.relative_to(ROOT).as_posix() for p in paths if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".gif", ".tif"})) or "none")
    for h in hits:
        print(h)
    print("leak scan:", "clean" if not hits else f"{len(hits)} finding(s)")
    return 1 if hits else 0


if __name__ == "__main__":
    sys.exit(main())
