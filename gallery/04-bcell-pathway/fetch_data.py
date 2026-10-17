"""Download the supplementary tables of Kalchschmidt et al. 2025 (Cell Reports 44(10):116361) into data/ and check them.

    py -3 -B gallery/04-bcell-pathway/fetch_data.py            # download what is missing, verify every file
    py -3 -B gallery/04-bcell-pathway/fetch_data.py --force    # download again

Source: the Europe PMC REST service, https://www.ebi.ac.uk/europepmc/webservices/rest/PMC12594101/supplementaryFiles
(a zip of all supplementary files of the article, about 31 MB, held in memory). Only the six tables the figure uses are
written to data/; the zip also holds the article figures and other tables, which are not kept. The sequencing data
(GEO GSE290879) and the proteomics data (PRIDE PXD067812) are not downloaded.

Table names follow the paper: the text of each file's first row names the table.
    supplement-5   Table S1   sgRNA and primers of the 47 reporter lines (the list of the 47 genes)
    supplement-7   Table S3   activators (S3A) and repressors (S3B) of the 47 screens
    supplement-9   Table S5   genes changed by 2 days of rapamycin
    supplement-10  Table S6   STRING clusters of the genes down (S6A) and up (S6B) with rapamycin
    supplement-2   Table S9   genes changed by 2 days of the GSK3 inhibitor LY2090314
    supplement-3   Table S10  genes changed by 2 days of rapamycin and LY2090314 together

Writes data/SOURCES.txt (URL, size, SHA-256). Exits with an error when a file differs from the SHA-256 pinned below.
That means the publisher revised the table since this figure was built: read the new file before you update the pin.
The licence is CC BY 4.0 (Europe PMC record and the in-article statement); the xlsx files are not committed (.gitignore).
"""
import hashlib
import io
import sys
import urllib.request
import zipfile
from pathlib import Path

DATA = Path(__file__).resolve().parent / "data"
URL = "https://www.ebi.ac.uk/europepmc/webservices/rest/PMC12594101/supplementaryFiles"
PINNED = {
    # file: (size in bytes, SHA-256), as downloaded on 2026-10-17
    "NIHMS2120106-supplement-5.xlsx": (30540, "1dda66a603e27a90f1ba1170516da459ae8ed960c12d18cc47c936490f3cd88d"),
    "NIHMS2120106-supplement-7.xlsx": (463381, "cca5f9725452df1aa193ed89590f974a9b965ae259c3d79b7c93bb731523e4a6"),
    "NIHMS2120106-supplement-9.xlsx": (287443, "cf5ee90e4e941d1cce3f76f437a6ef691179decb719b78627214dd7ae8304c20"),
    "NIHMS2120106-supplement-10.xlsx": (551063, "f296de20e855b4f0a8ba2ae6d06172143cbced15d8236bbd35c1bd3fa604288c"),
    "NIHMS2120106-supplement-2.xlsx": (65153, "507c89fdf3b57b577449a9312afc91f00db5f3452944433640c8dc4bcc8cc147"),
    "NIHMS2120106-supplement-3.xlsx": (106690, "bd24ab1f184c9e54e443fac9acd8b9d1379e89c55e52000eb31d3a32a36ea1e1"),
}
NAMES = {
    "NIHMS2120106-supplement-5.xlsx": "Table S1", "NIHMS2120106-supplement-7.xlsx": "Table S3", "NIHMS2120106-supplement-9.xlsx": "Table S5",
    "NIHMS2120106-supplement-10.xlsx": "Table S6", "NIHMS2120106-supplement-2.xlsx": "Table S9", "NIHMS2120106-supplement-3.xlsx": "Table S10",
}


def sha(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def main(force: bool) -> int:
    DATA.mkdir(exist_ok=True)
    missing = [n for n in PINNED if force or not (DATA / n).exists()]
    lines, bad = [], []
    if missing:
        req = urllib.request.Request(URL, headers={"User-Agent": "molecullage-gallery/0.1"})
        with urllib.request.urlopen(req, timeout=300) as r:
            blob = r.read()
        print(f"zip: {len(blob)} bytes, sha256 {sha(blob)} (informational: the zip is built on request and its bytes may change)")
        z = zipfile.ZipFile(io.BytesIO(blob))
        for n in missing:
            (DATA / n).write_bytes(z.read(n))
    for n, (size, pin) in PINNED.items():
        b = (DATA / n).read_bytes()
        h = sha(b)
        ok = len(b) == size and h == pin
        if not ok:
            bad.append(n)
        lines.append(f"{n}\t{NAMES[n]}\t{URL}\t{len(b)} bytes\tsha256 {h}\t{'pinned, matches' if ok else 'PINNED VALUE DIFFERS'}")
        print(lines[-1])
    (DATA / "SOURCES.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    if bad:
        print("FAILED: changed upstream:", ", ".join(bad), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main("--force" in sys.argv))
