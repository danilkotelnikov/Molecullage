"""Download the inputs of gallery piece 08 (redesign of Figs 3A, 4A, 4B of Cuevas Zuviria et al. 2025, eLife 14:RP105613, doi 10.7554/eLife.105613) into data/ and check them.

    py -3 -B gallery/08-nitrogenase-tree/fetch_data.py            # download what is missing, verify every file
    py -3 -B gallery/08-nitrogenase-tree/fetch_data.py --force    # download again

Files (all small; every one is named in the article's supplementary-material entries or in the task sheet):
  Figure 4 source data 1, 2, 3 (eLife CDN, .zip; the tree, the tree annotations, the DDKK structural data), unpacked to data/fig4/
  Supplementary file 6 (eLife CDN, .docx; the units and programs of the structural features)
  index.csv of the Zenodo record 10.5281/zenodo.13351063 (171 kB; the 23 archives of predicted structures, 967 MB, are NOT downloaded)
  3U7Q, 4WES, 8BOQ (files.rcsb.org, mmCIF; the entries rendered)
The Europe PMC full text (fullTextXML) and the eLife and Zenodo records are read only to check the licence, the version and the counts; they are not stored.
Not downloaded: Figure 2 source data 1 (65.8 MB) and Figure 6 source data 1: not used here.
Writes data/SOURCES.txt (URL, size, SHA-256). Exits with an error when a file differs from the SHA-256 pinned below, which means the publisher or the PDB
replaced it since this figure was built: look at the new file before you update the pin. A zip is unpacked member by member (names checked, no paths).
"""
import hashlib
import io
import json
import re
import sys
import urllib.request
import zipfile
from pathlib import Path

DATA = Path(__file__).resolve().parent / "data"
UA = {"User-Agent": "molecullage-gallery/0.1"}
CDN = "https://cdn.elifesciences.org/articles/105613/"
# name -> (url, size in bytes as the eLife record and the server give it, sha256 of the file as downloaded on 2026-10-17)
FILES = {
    "elife-105613-fig4-data1-v1.zip": (CDN + "elife-105613-fig4-data1-v1.zip", 43444, "ce9ea9229154a59567941f56c951b010f046aedaeafd30415c06d78dda601273"),
    "elife-105613-fig4-data2-v1.zip": (CDN + "elife-105613-fig4-data2-v1.zip", 200383, "c9ab4e28b5bf617837fb95536adb7008c7a2321655b0f784540ea75263dffdf9"),
    "elife-105613-fig4-data3-v1.zip": (CDN + "elife-105613-fig4-data3-v1.zip", 410548, "42d73148a8f11d20b1e2efff95939d72f5b198c76286e2f5d0ef0e704627a0d8"),
    "elife-105613-supp6-v1.docx": (CDN + "elife-105613-supp6-v1.docx", 19106, "cf315caaab22c2570a67625d7923f694238b96a00686e9bda0c4104cfb7e2388"),
    "zenodo_13351063_index.csv": ("https://zenodo.org/api/records/13351063/files/index.csv/content", 171000, "e5b73cac653a82337ebd47f075bb1c9646f701e58572b5c29e8a918eac23b2dc"),
    "3U7Q.cif": ("https://files.rcsb.org/download/3U7Q.cif", None, "4021acb1765da9070528f0013f09d598d962c025d6d0b96ec8aa62143ea8bfb2"),
    "4WES.cif": ("https://files.rcsb.org/download/4WES.cif", None, "98bf60be81495bd750cdf263a0bf1dd25d9d50615f9d393ea2f46ca0843d1f88"),
    "8BOQ.cif": ("https://files.rcsb.org/download/8BOQ.cif", None, "338ef628f137c94835f4705ecfe7224e37676fd7cd0427119580613a066fea42"),
}
# zip member -> name in data/fig4/ (the zips hold one folder, eLife-VOR-ADV-2024-105613/)
MEMBERS = {
    "elife-105613-fig4-data1-v1.zip": {"Figure4SourceData1.tree": "Figure4SourceData1.tree"},
    "elife-105613-fig4-data2-v1.zip": {"Figure4SourceData2.csv": "Figure4SourceData2.csv"},
    "elife-105613-fig4-data3-v1.zip": {"Figure4SourceData3.csv": "Figure4SourceData3.csv"},
}


def get(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180) as r:
        return r.read()


def check_records() -> list[str]:
    """Licence, version and counts, read from Europe PMC, the eLife API and Zenodo (not stored)."""
    out = []
    xml = get("https://www.ebi.ac.uk/europepmc/webservices/rest/PMC12425478/fullTextXML").decode("utf-8")
    assert "creativecommons.org/licenses/by/4.0" in xml, "Europe PMC full text no longer states CC BY 4.0"
    assert "version of record" in xml
    for s in ("5378 protein structures", "769 tree nodes"):
        assert s in xml, f"the text no longer says: {s}"
    out.append("Europe PMC PMC12425478: licence ali:license_ref https://creativecommons.org/licenses/by/4.0/; publication-state version of record; text: '5378 protein structures', '769 tree nodes'")
    a = json.loads(get("https://api.elifesciences.org/articles/105613"))
    assert a["copyright"]["license"] == "CC-BY-4.0" and a["doiVersion"] == "10.7554/eLife.105613.4" and a["status"] == "vor"
    out.append(f"eLife API: status {a['status']}, doiVersion {a['doiVersion']}, published {a['published'][:10]}, licence {a['copyright']['license']}")
    z = json.loads(get("https://zenodo.org/api/records/13351063"))
    assert z["metadata"]["license"]["id"] == "cc-by-4.0" and len(z["files"]) == 24
    out.append(f"Zenodo 13351063: licence {z['metadata']['license']['id']}, {len(z['files'])} files, {sum(f['size'] for f in z['files'])} bytes in all, record file list read only")
    return out


def main(force: bool) -> int:
    DATA.mkdir(exist_ok=True)
    (DATA / "fig4").mkdir(exist_ok=True)
    lines, bad = [], []
    for name, (url, size, pin) in FILES.items():
        f = DATA / name
        if force or not f.exists():
            f.write_bytes(get(url))
        b = f.read_bytes()
        h = hashlib.sha256(b).hexdigest()
        state = "pinned, matches" if pin and pin == h else ("PINNED VALUE DIFFERS" if pin else "not pinned yet")
        if pin and pin != h:
            bad.append(name)
        if size is not None and size != len(b):
            bad.append(name + " (size)")
        lines.append(f"{name}\t{url}\t{len(b)} bytes\tsha256 {h}\t{state}")
        print(lines[-1])
    for zname, members in MEMBERS.items():
        with zipfile.ZipFile(DATA / zname) as z:
            names = {Path(i.filename).name: i for i in z.infolist() if not i.is_dir()}
            for want, dest in members.items():
                assert want in names, f"{zname} has no member {want}"
                (DATA / "fig4" / dest).write_bytes(z.read(names[want]))
    for line in check_records():
        print(line)
        lines.append("record check\t" + line)
    (DATA / "SOURCES.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    if bad:
        print("FAILED: changed upstream:", ", ".join(bad), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main("--force" in sys.argv))
