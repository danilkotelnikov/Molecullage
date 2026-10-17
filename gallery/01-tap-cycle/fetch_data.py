"""Download the six PDB entries of Lee, Manon and Chen 2025 (Immunity 58(9):2166) into data/ and check them.

    py -3 -B gallery/01-tap-cycle/fetch_data.py            # download what is missing, verify every file
    py -3 -B gallery/01-tap-cycle/fetch_data.py --force    # download again

Source: https://files.rcsb.org/download/<ID>.cif (mmCIF, the only file used). The map files (EMD-49045 to EMD-49050) are not downloaded.
Writes data/SOURCES.txt (URL, size, SHA-256). Exits with an error when a file differs from the SHA-256 pinned below,
which means the PDB revised the entry since this figure was built: look at the new file before you update the pin.
"""
import hashlib
import sys
import urllib.request
from pathlib import Path

DATA = Path(__file__).resolve().parent / "data"
IDS = ["9N61", "9N62", "9N63", "9N64", "9N65", "9N66"]
PINNED = {
    # SHA-256 of the files as downloaded on 2026-10-17 (initial release 2025-09-03)
    "9N61": "c56e3bdf5c16b674c90117b18738083765e9997ca9c182db17a6e51591b5f013",
    "9N62": "61506dd50205e4c26681cc772e5ab07b83a7963206ea80e6eade9a7a6e90da1e",
    "9N63": "76682f4ce1ce81b29ec93e0d6d871f00481995c6826d9e0012d5cadc29a6d5d4",
    "9N64": "9acfdf3a5e279ee71a6bacb026aa245515bc1918d1488129bd083db08c5aa4a3",
    "9N65": "05da8c5b541315f97edacb162004c4b01541f02f2eeb967e6674dabc2d87584c",
    "9N66": "08b7f0dff6d1392fbf2aec61db2400bae33e039fbee4fb5d374c2aa8abf1f78a",
}


def sha(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def main(force: bool) -> int:
    DATA.mkdir(exist_ok=True)
    lines, bad = [], []
    for i in IDS:
        url = f"https://files.rcsb.org/download/{i}.cif"
        f = DATA / f"{i}.cif"
        if force or not f.exists():
            req = urllib.request.Request(url, headers={"User-Agent": "molecullage-gallery/0.1"})
            with urllib.request.urlopen(req, timeout=120) as r:
                f.write_bytes(r.read())
        b = f.read_bytes()
        h = sha(b)
        pin = PINNED.get(i, "")
        state = "pinned, matches" if pin and pin == h else ("PINNED VALUE DIFFERS" if pin else "not pinned yet")
        if pin and pin != h:
            bad.append(i)
        lines.append(f"{i}\t{url}\t{len(b)} bytes\tsha256 {h}\t{state}")
        print(lines[-1])
    (DATA / "SOURCES.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    if bad:
        print("FAILED: changed upstream:", ", ".join(bad), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main("--force" in sys.argv))
