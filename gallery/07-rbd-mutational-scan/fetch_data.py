"""Download the inputs of gallery piece 07-rbd-mutational-scan into data/ (git-ignored) and check them against pinned SHA-256 values.

    py -3 -I gallery/07-rbd-mutational-scan/fetch_data.py

Files (a CC BY 4.0 paper and PDB open data):
  data/source_data/ppat.1014074.s001.csv   S1 Data of Taylor and Starr 2026, PLoS Pathogens 22(6):e1014074, doi 10.1371/journal.ppat.1014074
                                           "Final variant scores" (journals.plos.org; Europe PMC serves the same bytes in its supplementaryFiles zip)
  data/pdb/8QSQ.cif                        BA.2.86 RBD (chain A) with ACE2 (chain B), the structure the paper uses (files.rcsb.org)
Size and SHA-256 go to data/SOURCES.txt. A file that differs from the pinned hash stops the script with exit code 1: the figure was checked
against the pinned bytes, so a changed file needs a new look before it is trusted. A web page instead of the file (bot check) stops it too;
do not look for a way round that.
"""
from __future__ import annotations

import hashlib
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE / "data"
# (relative path, url, pinned sha256, pinned size)   pins: files as downloaded on 2026-10-17
FILES = [
    ("source_data/ppat.1014074.s001.csv", "https://journals.plos.org/plospathogens/article/file?type=supplementary&id=10.1371/journal.ppat.1014074.s001",
     "740d395480e63de04465e035efe00d9d6683ef9abc07b1e98473e96898a96c91", 677005),
    ("pdb/8QSQ.cif", "https://files.rcsb.org/download/8QSQ.cif", "62f3de459b5a86a152029e8d0875eb9cbaa142141647880bfc5a5533615baf81", 696028),
]


def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "molecullage-gallery/1.0 (figure redesign; CC BY paper, public PDB)"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def main() -> int:
    lines, bad = [], 0
    for rel, url, sha, size in FILES:
        path = DATA / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists():
            data = get(url)
            if data[:15].lower().startswith((b"<!doctype html", b"<html")):
                print(f"FAIL {rel}: the server returned a web page (bot check or error), not the file. Stop; do not look for a way round it.")
                return 1
            path.write_bytes(data)
        data = path.read_bytes()
        got = hashlib.sha256(data).hexdigest()
        status = "pinned"
        if got != sha or len(data) != size:
            status = "CHANGED"
            bad += 1
        print(f"{status:8s} {rel}  {len(data)} bytes  sha256 {got}")
        lines.append(f"{rel}\t{url}\t{len(data)} bytes\tsha256 {got}\t{status}")
    (DATA / "SOURCES.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    if bad:
        print(f"{bad} file(s) differ from the pinned SHA-256: stop and re-check the figure against the new bytes.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
