"""Download the inputs of gallery piece 12 (redesign of Fig. 1D and E of Fukui et al., eLife 15:RP111443, doi 10.7554/eLife.111443) into data/ and check them.

    py -3 -B gallery/12-mutl-kinetics/fetch_data.py            # download what is missing, verify every file
    py -3 -B gallery/12-mutl-kinetics/fetch_data.py --force    # download again

Files (all CC BY 4.0 or public PDB archive data):
  elife-111443-fig1-data2-v1.xlsx   "Figure 1 - source data 2": kapp against [ATP] for wild-type and mutant aqMutL NTDs (Fig. 1D and E).
                                    Source: the eLife content server named in the article's JSON record (api.elifesciences.org/articles/111443).
  PMC13614785.xml                   article full text, Europe PMC REST fullTextXML (version of record, published 2026-09-25); read for Table 1 and the Methods.
  6LZJ.pdb                          aqMutL NTD with AMPPCP, the entry named in the legend of Fig. 1A (files.rcsb.org).

Writes data/SOURCES.txt (URL, size, SHA-256). Exits with an error when a file differs from the SHA-256 pinned below, which means the
publisher or the archive replaced it since this figure was built: look at the new file before you update the pin. The article XML is
not pinned as a whole (Europe PMC edits its metadata); the numbers of Table 1 are pinned instead, by SHA-256 of the extracted rows.
"""
import hashlib
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

DATA = Path(__file__).resolve().parent / "data"
FILES = {
    "elife-111443-fig1-data2-v1.xlsx": (
        "https://cdn.elifesciences.org/articles/111443/elife-111443-fig1-data2-v1.xlsx",
        "6dcea8cbe48c4071596a1f2fd65ed5360d1863e30d72c022da18388e7266731a",     # SHA-256 of the file as downloaded on 2026-10-17
    ),
    "PMC13614785.xml": ("https://www.ebi.ac.uk/europepmc/webservices/rest/PMC13614785/fullTextXML", None),
    "6LZJ.pdb": ("https://files.rcsb.org/download/6LZJ.pdb", "3576cd5b34e86a7d432aeaa5a10c75ee441fbbaa0ec432d51a6fcf80d2a659f7"),
}
TABLE1_PIN = "a39cab7f34124aafb12fb9d80927ce54249940417cb13bc84eed6da4234b1eda"     # SHA-256 of the rows of Table 1 as read_table1() returns them, one line per row


def text(e):
    return re.sub(r"\s+", " ", "".join(e.itertext())).strip()


def read_table1(xml_path: Path):
    """Rows of Table 1 of the article as printed: [protein/mutant, kcat, Km, kcat/Km] (strings, footnote marks removed)."""
    root = ET.fromstring(re.sub(rb"<!DOCTYPE[^>]*>", b"", xml_path.read_bytes(), flags=re.S))
    tw = next(t for t in root.iter("table-wrap") if t.get("id") == "table1")
    rows = [[text(td) for td in tr] for tr in tw.iter("tr")]
    assert rows[0][0] == "Proteins" and len(rows) == 24, rows[0]
    return [[c.replace("†", "") for c in r] for r in rows[1:]]


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
        if pin is None:
            state = "not pinned (article text; Table 1 is pinned below)"
        elif pin == h:
            state = "pinned, matches"
        else:
            state = "PINNED VALUE DIFFERS"
            bad.append(name)
        lines.append(f"{name}\t{url}\t{len(b)} bytes\tsha256 {h}\t{state}")
        print(lines[-1])
    t1 = "\n".join("|".join(r) for r in read_table1(DATA / "PMC13614785.xml"))
    th = hashlib.sha256(t1.encode("utf-8")).hexdigest()
    st = "pinned, matches" if th == TABLE1_PIN else "PINNED VALUE DIFFERS"
    if th != TABLE1_PIN:
        bad.append("Table 1 rows")
    lines.append(f"Table 1 rows (23 rows, from PMC13614785.xml)\tsha256 {th}\t{st}")
    print(lines[-1])
    (DATA / "SOURCES.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    if bad:
        print("FAILED: changed upstream or not pinned yet:", ", ".join(bad), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main("--force" in sys.argv))
