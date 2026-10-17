"""Download the input of gallery piece 06-gpcr-snake-plot into data/ (git-ignored) and check it against a pinned SHA-256.

    py -3 -I gallery/06-gpcr-snake-plot/fetch_data.py

File (public PDB open data):
  data/pdb/7F61.cif   X-ray structure of the human histamine H3 receptor with the antagonist PF03654746 (ligand 1IB), 2.6 A,
                      chain A = receptor, chain B = BRIL fusion (files.rcsb.org)
The paper's numbers (Tables 1 and 2 of Nakajima et al. 2026) are small tables copied by hand into src/ec50_tables.py and tables/*.csv; no
third-party data file is stored. The article text is read from Europe PMC (PMC12720417, fullTextXML) only to check those numbers and is not stored.
Size and SHA-256 go to data/SOURCES.txt. A file that differs from the pinned hash stops the script with exit code 1: the figure was checked against
the pinned bytes, so a changed file needs a new look before it is trusted.
"""
from __future__ import annotations

import hashlib
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE / "data"
# (relative path, url, pinned sha256, pinned size); hash of the file as downloaded on 2026-10-17
FILES = [
    ("pdb/7F61.cif", "https://files.rcsb.org/download/7F61.cif", "098bb4f13be3d277d7d8b212010997f41dab62f80f48e8ecf749f6a9dfc1076e", 422633),
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
