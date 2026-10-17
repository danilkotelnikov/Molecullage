"""Download the data behind Fig. 3 of Safi et al. 2026 (The EMBO Journal 45(10):3514-3539, doi 10.1038/s44318-026-00770-8) into data/ and check it.

    py -3 -B gallery/11-virus-network/fetch_data.py            # download what is missing, verify every file
    py -3 -B gallery/11-virus-network/fetch_data.py --force    # download again
    py -3 -B gallery/11-virus-network/fetch_data.py --list     # list the Zenodo record (names, sizes) and the PDB entries; download nothing

Files (all CC BY 4.0):
  Source data Fig. 3          44318_2026_770_MOESM13_ESM.zip   publisher's supplementary-file server (named in the article's supplementary-material entries, PMC13186993)
  Datasets EV1 to EV5         44318_2026_770_MOESM6..10_ESM.xlsx   same server
  Mimivirus co-IP network     Mimivirus_coip_fun_categories.cys   Zenodo 10.5281/zenodo.17313812 (Cytoscape session, a zip of network tables; the other three files of the record
                              hold the same network with other colour codes and are not needed)
  Not downloaded: Zenodo 10.5281/zenodo.17296301 (AlphaFold2 models), and the PDB entries 6rfl, 7amv, 8q3k, 7und, 7nvu, 7ena, 7dvq, 7a09, 6zj3 (only title and release date are read
  from data.rcsb.org, to label edges; the answers are stored in tables/pdb_entries.csv).
Writes data/SOURCES.txt (URL, size, SHA-256). Exits with an error when a file differs from the SHA-256 pinned below,
which means the publisher or Zenodo replaced it since this figure was built: look at the new file before you update the pin.
"""
import hashlib
import json
import sys
import urllib.request
from pathlib import Path

DATA = Path(__file__).resolve().parent / "data"
EMBO = "https://static-content.springer.com/esm/art%3A10.1038%2Fs44318-026-00770-8/MediaObjects/"
ZEN = "https://zenodo.org/api/records/17313812/files/"
FILES = {
    # name: (url, sha256 of the file as downloaded on 2026-10-17)
    "44318_2026_770_MOESM13_ESM.zip": (EMBO + "44318_2026_770_MOESM13_ESM.zip", "8037a16391065a8c2dc7a5228f0087f631f311216d44a45dd57fa869f2dac3ea"),
    "44318_2026_770_MOESM6_ESM.xlsx": (EMBO + "44318_2026_770_MOESM6_ESM.xlsx", "99c7f56398a991dd6b54fd634b2e33ec01cffabb95a4120c2deef3bdc1a57bd4"),
    "44318_2026_770_MOESM7_ESM.xlsx": (EMBO + "44318_2026_770_MOESM7_ESM.xlsx", "a663705aee64c5ee37c14185eda0e5f43dd25d0248d22f944776e64681782534"),
    "44318_2026_770_MOESM8_ESM.xlsx": (EMBO + "44318_2026_770_MOESM8_ESM.xlsx", "c4ed0c8a2afa14d037ae9c619b961a4c9362cf8394897fc3e9ed08682b463589"),
    "44318_2026_770_MOESM9_ESM.xlsx": (EMBO + "44318_2026_770_MOESM9_ESM.xlsx", "9fc988de71f36aca533114794e3bb40d1d16160944d36421fc993d32faf5105e"),
    "44318_2026_770_MOESM10_ESM.xlsx": (EMBO + "44318_2026_770_MOESM10_ESM.xlsx", "09fde5becf2f1aa07d254009acedb9356aa215791cd1ee26078896276a3ddb9c"),
    "Mimivirus_coip_fun_categories.cys": (ZEN + "Mimivirus_coip_fun_categories.cys/content", "5131bf0308fcc1645ba418f88626091e11a3eb99fa07b6aad76ed3d31b4a84b2"),
}
# title and first release date of each entry the legend of Fig. 3 names, read from data.rcsb.org on 2026-10-17 (labels only; no coordinates are downloaded)
PDB_PIN = {
    "6rfl": ("Structure of the complete Vaccinia DNA-dependent RNA polymerase complex", "2019-12-11"),
    "7amv": ("Atomic structure of the poxvirus transcription pre-initiation complex in the initially melted state", "2021-10-06"),
    "8q3k": ("The open state of the ASFV apo-RNA polymerase", "2024-02-14"),
    "7und": ("Pol II-DSIF-SPT6-PAF1c-TFIIS-nucleosome complex (stalled at +38)", "2022-10-19"),
    "7nvu": ("RNA polymerase II core pre-initiation complex with open promoter DNA", "2021-05-05"),
    "7ena": ("TFIID-based PIC-Mediator holo-complex in pre-assembled state (pre-hPIC-MED)", "2021-05-26"),
    "7dvq": ("Cryo-EM Structure of the Activated Human Minor Spliceosome (minor Bact Complex)", "2021-03-31"),
    "7a09": ("Structure of a human ABCE1-bound 43S pre-initiation complex - State III", "2020-10-14"),
    "6zj3": ("Cryo-EM structure of the highly atypical cytoplasmic ribosome of Euglena gracilis", "2020-10-07"),
}
PDB_IDS = list(PDB_PIN)
UA = {"User-Agent": "molecullage-gallery/0.1"}


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
        return r.read()


def listing():
    j = json.loads(get("https://zenodo.org/api/records/17313812"))
    print(j["metadata"]["title"], j["metadata"]["license"], j["doi"])
    for f in j["files"]:
        print("  ", f["key"], f["size"], "bytes", f["checksum"])
    for p in PDB_IDS:
        e = json.loads(get(f"https://data.rcsb.org/rest/v1/core/entry/{p}"))
        print("  ", p, e["struct"]["title"], e["rcsb_accession_info"]["initial_release_date"][:10])


def main(force: bool) -> int:
    DATA.mkdir(exist_ok=True)
    lines, bad = [], []
    for name, (url, pin) in FILES.items():
        f = DATA / name
        if force or not f.exists():
            f.write_bytes(get(url))
        b = f.read_bytes()
        h = hashlib.sha256(b).hexdigest()
        state = "pinned, matches" if pin == h else ("NOT PINNED YET" if pin is None else "PINNED VALUE DIFFERS")
        if pin != h:
            bad.append(name)
        lines.append(f"{name}\t{url}\t{len(b)} bytes\tsha256 {h}\t{state}")
        print(lines[-1])
    entries = {}
    for p in PDB_IDS:
        e = json.loads(get(f"https://data.rcsb.org/rest/v1/core/entry/{p}"))
        got = (e["struct"]["title"], e["rcsb_accession_info"]["initial_release_date"][:10])
        entries[p] = got
        ok = got == PDB_PIN[p]
        if not ok:
            bad.append("pdb " + p)
        lines.append(f"pdb {p}\thttps://data.rcsb.org/rest/v1/core/entry/{p}\t{got[1]}\t{got[0]}\t{'pinned, matches' if ok else 'PINNED VALUE DIFFERS'}")
        print(lines[-1])
    (DATA / "pdb_entries.json").write_text(json.dumps(entries, indent=1), encoding="utf-8")
    (DATA / "SOURCES.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    if bad:
        print("FAILED: not matching a pin:", ", ".join(bad), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    if "--list" in sys.argv:
        listing()
        sys.exit(0)
    sys.exit(main("--force" in sys.argv))
