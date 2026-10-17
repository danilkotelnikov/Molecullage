"""Download the inputs of gallery piece 10 (redesign of Table 1 / Fig. 2 of He, Zhao and Xu 2026, Cell Discovery 12:61) into data/ and check them.

    py -3 -B gallery/10-arrestin-landscape/fetch_data.py            # download what is missing, verify every pinned file
    py -3 -B gallery/10-arrestin-landscape/fetch_data.py --force    # download again

Downloaded (nothing else):
  data/PMC13503860.xml   article full text, Europe PMC REST fullTextXML (CC BY 4.0); only Table 1 and the text are read
  data/rcsb/<ID>.json    https://data.rcsb.org/rest/v1/core/entry/<ID>, the 36 PDB ids of Table 1: title, method, resolution, release date
  data/<ID>.cif          https://files.rcsb.org/download/<ID>.cif for the three entries that are rendered
No figure image and no PDF of the paper is downloaded.
Writes data/SOURCES.txt (URL, size, SHA-256). Exits with an error when a pinned file differs from the SHA-256 below, which means the
source changed since this figure was built: look at the new file before you update the pin. The RCSB JSON records are not pinned as
files (RCSB adds fields over time); src/rcsb_check.py compares the four values it uses with tables/rcsb_check.csv and fails if they differ.
"""
import hashlib
import sys
import urllib.request
from pathlib import Path

GAL = Path(__file__).resolve().parent
DATA = GAL / "data"
sys.path.insert(0, str(GAL / "src"))

PMC = "PMC13503860"
XML_URL = f"https://www.ebi.ac.uk/europepmc/webservices/rest/{PMC}/fullTextXML"
RENDER_IDS = ["9WSV", "8JRV", "8ZYU"]       # Core (MOR), Tail (GCGR), Loop-engaged (NTSR1)
PINNED = {
    # SHA-256 of the files as downloaded on 2026-10-17
    f"{PMC}.xml": "028aea2b5d71603b87546e501cf48c7a3d5e13e41b29e5142d7e2be3320a3aa0",
    "9WSV.cif": "fcc4d5a58d69200557d1a20561d7be8b0d59dd3a091643d93cd111592a6f50e9",
    "8JRV.cif": "68a99dc8198900cca30f60f7995a220b6396d1cfca9f3ec96b17284f228744a2",
    "8ZYU.cif": "f78318fa731b23a15854da2c0329d0d499242958ed6d254f886b9b25bd0f3d0b",
}


def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "molecullage-gallery/0.1"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.read()


def fetch(path: Path, url: str, force: bool) -> bytes:
    path.parent.mkdir(parents=True, exist_ok=True)
    if force or not path.exists():
        path.write_bytes(get(url))
    return path.read_bytes()


def main(force: bool) -> int:
    DATA.mkdir(exist_ok=True)
    lines, bad = [], []

    def record(rel: str, url: str, b: bytes):
        h = hashlib.sha256(b).hexdigest()
        pin = PINNED.get(rel, "")
        state = "pinned, matches" if pin and pin == h else ("PINNED VALUE DIFFERS" if pin else "not pinned (checked by value)" if rel.startswith("rcsb/") else "not pinned yet")
        if pin and pin != h:
            bad.append(rel)
        lines.append(f"{rel}\t{url}\t{len(b)} bytes\tsha256 {h}\t{state}")
        print(lines[-1])

    record(f"{PMC}.xml", XML_URL, fetch(DATA / f"{PMC}.xml", XML_URL, force))
    import table1
    ids = [r["pdb"] for r in table1.parse(DATA / f"{PMC}.xml")]
    for i in ids:
        url = f"https://data.rcsb.org/rest/v1/core/entry/{i}"
        record(f"rcsb/{i}.json", url, fetch(DATA / "rcsb" / f"{i}.json", url, force))
    for i in RENDER_IDS:
        url = f"https://files.rcsb.org/download/{i}.cif"
        record(f"{i}.cif", url, fetch(DATA / f"{i}.cif", url, force))
    (DATA / "SOURCES.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    if bad:
        print("FAILED: changed upstream:", ", ".join(bad), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main("--force" in sys.argv))
