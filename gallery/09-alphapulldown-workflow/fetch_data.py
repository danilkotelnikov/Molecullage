"""Download the full text of Yu et al. 2023 (Bioinformatics 39(1):btac749, doi 10.1093/bioinformatics/btac749, PMC9805587) into data/ and check it.

    py -3 -B gallery/09-alphapulldown-workflow/fetch_data.py            # download what is missing, verify every file
    py -3 -B gallery/09-alphapulldown-workflow/fetch_data.py --force    # download again

The figure has no numeric data. Every step, file name and arrow comes from the legend of Fig. 1 and the text, and src/check_support.py
checks each supporting sentence against this file. The only input is the Europe PMC full-text XML (CC BY 4.0, read in the XML licence element).
Writes data/SOURCES.txt (URL, size, SHA-256). Exits with an error when the file differs from the SHA-256 pinned below, which means Europe PMC
changed the record since this figure was built: read the new text before you update the pin.
"""
import hashlib
import sys
import urllib.request
from pathlib import Path

DATA = Path(__file__).resolve().parent / "data"
FILES = {
    "PMC9805587.xml": (
        "https://www.ebi.ac.uk/europepmc/webservices/rest/PMC9805587/fullTextXML",
        # SHA-256 of the file as downloaded on 2026-10-17
        "21ce3daf8a59866b8cc7d34b79f086c8c1315e0e7d994d56806d97615742cf13",
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
