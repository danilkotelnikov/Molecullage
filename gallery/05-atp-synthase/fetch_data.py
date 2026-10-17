"""Download the PDB entry of gallery piece 05-atp-synthase into data/ (git-ignored) and check it against a pinned SHA-256.

    py -3 -I gallery/05-atp-synthase/fetch_data.py

File (PDB open data, files.rcsb.org):
  data/pdb/9ZFT.cif   Acanthamoeba castellanii ATP synthase monomer, 34 chains (Fry et al., Cell 2026; entry released 2026-10-14)
  data/pdb/9ZFW.cif   membrane region of the dimer, only to confirm where subunits e and g are built (src/tones.py reads its entity names and gene IDs)
No EMDB map is downloaded. Size and SHA-256 go to data/SOURCES.txt. A file that differs from the pinned hash stops the script with exit code 1:
the figure was checked against the pinned bytes, so a changed file needs a new look before it is trusted.
"""
from __future__ import annotations

import hashlib
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE / "data"
# (relative path, url, pinned sha256 or None, pinned size or None)
FILES = [
    ("pdb/9ZFT.cif", "https://files.rcsb.org/download/9ZFT.cif", "fd3ab1f4dbec95bb30becd987e92f8aebda8b59c686c2b7b3446d855d236ace4", 10502535),
    ("pdb/9ZFW.cif", "https://files.rcsb.org/download/9ZFW.cif", "cf5409e45666f43e68a7bf31afa67e7d642c9fca7b42e0af1778a076132ccde2", 2077896),
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
