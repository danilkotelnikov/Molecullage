"""Download the Source Data file of Mirdita et al. 2022 (Nature Methods 19:679-682, doi 10.1038/s41592-022-01488-1) into data/ and check it.

    py -3 -B gallery/03-colabfold-benchmark/fetch_data.py            # download what is missing, verify every file
    py -3 -B gallery/03-colabfold-benchmark/fetch_data.py --force    # download again

File: 41592_2022_1488_MOESM4_ESM.xlsx, "Source Data Fig. 2 - Raw data for plotting. Each sub-figure is a different sheet" (CC BY 4.0).
Source: the publisher's supplementary-file server, named in the supplementary-material entry of the article at Europe PMC (PMC9184281).
Writes data/SOURCES.txt (URL, size, SHA-256). Exits with an error when the file differs from the SHA-256 pinned below,
which means the publisher replaced it since this figure was built: look at the new file before you update the pin.
The article full text (Europe PMC REST, fullTextXML) is read only to copy the numbers the text states; it is not stored.
"""
import hashlib
import sys
import urllib.request
from pathlib import Path

DATA = Path(__file__).resolve().parent / "data"
FILES = {
    "41592_2022_1488_MOESM4_ESM.xlsx": (
        "https://static-content.springer.com/esm/art%3A10.1038%2Fs41592-022-01488-1/MediaObjects/41592_2022_1488_MOESM4_ESM.xlsx",
        # SHA-256 of the file as downloaded on 2026-10-17
        "ef75ececda66826dc2294d39bfd338f54388ae3f754168e3a8dc3cdaf5d38602",
    ),
}


def main(force: bool) -> int:
    DATA.mkdir(exist_ok=True)
    lines, bad = [], []
    for name, (url, pin) in FILES.items():
        f = DATA / name
        if force or not f.exists():
            req = urllib.request.Request(url, headers={"User-Agent": "molecullage-gallery/0.1"})
            with urllib.request.urlopen(req, timeout=120) as r:
                f.write_bytes(r.read())
        b = f.read_bytes()
        h = hashlib.sha256(b).hexdigest()
        state = "pinned, matches" if pin == h else "PINNED VALUE DIFFERS"
        if pin != h:
            bad.append(name)
        lines.append(f"{name}\t{url}\t{len(b)} bytes\tsha256 {h}\t{state}")
        print(lines[-1])
    (DATA / "SOURCES.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    if bad:
        print("FAILED: changed upstream:", ", ".join(bad), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main("--force" in sys.argv))
