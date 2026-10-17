"""Download the inputs of gallery piece 02-ebola-pocket into data/ (git-ignored) and check them against pinned SHA-256 values.

    py -3 -I gallery/02-ebola-pocket/fetch_data.py

Files (all public, CC BY 4.0 paper or PDB open data):
  data/pdb/9PEL.cif   cryo-EM structure of EBOV GP + MWAC-3634 + nanobody Nanosota-EB2 (files.rcsb.org)
  data/pdb/5JQ7.cif   EBOV GP + toremifene (comparison counts in how.md only)
  data/pdb/9BSV.cif   EBOV GP, unbound (comparison in how.md only)
  data/source_data/41467_2026_77332_MOESM4_ESM.xlsx   the paper's Source Data file (static-content.springer.com)
The map EMD-71566 is not downloaded. Size and SHA-256 go to data/SOURCES.txt. A file that differs from the pinned hash stops the script
with exit code 1: the figure was checked against the pinned bytes, so a changed file needs a new look before it is trusted.
"""
from __future__ import annotations

import hashlib
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE / "data"
SPR = "https://static-content.springer.com/esm/art%3A10.1038%2Fs41467-026-77332-3/MediaObjects/"
# (relative path, url, pinned sha256 or None, pinned size or None)
FILES = [
    ("pdb/9PEL.cif", "https://files.rcsb.org/download/9PEL.cif", "4a723c2d4034aa5f18e4a91e964ed88617412cceed5dce5afe6ac2268ed9399a", 1164917),
    ("pdb/5JQ7.cif", "https://files.rcsb.org/download/5JQ7.cif", "715561fb3758ee83e684bbfd85079e29aa8035ee71a34817be041796ea36715c", 666217),
    ("pdb/9BSV.cif", "https://files.rcsb.org/download/9BSV.cif", "0f5c3302489f0b8ad084f39fa286b23f3c28229d3205b2283b52a8de96b5923d", 1137571),
    ("source_data/41467_2026_77332_MOESM4_ESM.xlsx", SPR + "41467_2026_77332_MOESM4_ESM.xlsx",
     "c2d28d41e03d08547c2d2e8754aed1efbd937655427215a111c20e4588c700f6", 64359),
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
        status = "pinned" if sha else "NOT PINNED YET"
        if sha and (got != sha or len(data) != size):
            status = "CHANGED"
            bad += 1
        print(f"{status:14s} {rel}  {len(data)} bytes  sha256 {got}")
        lines.append(f"{rel}\t{url}\t{len(data)} bytes\tsha256 {got}\t{status}")
    (DATA / "SOURCES.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    if bad:
        print(f"{bad} file(s) differ from the pinned SHA-256: stop and re-check the figure against the new bytes.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
