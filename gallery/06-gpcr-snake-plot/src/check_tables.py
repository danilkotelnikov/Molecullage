"""Compare src/ec50_tables.py with Tables 1 and 2 of the article text at Europe PMC (PMC12720417, fullTextXML). Nothing is stored.

    py -3 -I gallery/06-gpcr-snake-plot/src/check_tables.py

Mutant names in the article carry the generic number as a superscript that the text export glues to the name (L732.43M); the check removes it.
Fails with an AssertionError that names the row when a value differs.
"""
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ec50_tables import C415R_TABLE1, DOUBLE, SINGLE  # noqa: E402

URL = "https://www.ebi.ac.uk/europepmc/webservices/rest/PMC12720417/fullTextXML"
GENERIC = re.compile(r"(?<=\d)(2\.43|6\.36|7\.56|ECL2)(?=[A-Z])")


def name(s):
    s = re.sub(r"\s+", "", s)
    return GENERIC.sub("", s)


def value(s):
    s = re.sub(r"\s+", " ", s.replace("±", "+-")).strip()
    if s == "ND":
        return None, None
    m = re.fullmatch(r"([\d.]+)(?: \+- ([\d.]+))?", s)
    assert m, s
    return m.group(1), m.group(2)


def main():
    root = ET.fromstring(urllib.request.urlopen(urllib.request.Request(URL, headers={"User-Agent": "molecullage-gallery/1.0"}), timeout=120).read())
    tabs = {}
    for tw in root.iter("table-wrap"):
        label = "".join(tw.find("label").itertext()).strip().title()
        rows = [[re.sub(r"\s+", " ", "".join(c.itertext())).strip() for c in tr] for tr in tw.iter("tr")]
        tabs[label] = rows
    t1 = {name(r[0]): value(r[1]) for r in tabs["Table 1"][1:]}
    t2 = {}
    for r in tabs["Table 2"][1:]:
        for a in (0, 2):
            if r[a]:
                t2[name(r[a])] = value(r[a + 1])
    n = 0
    for label, sites, mean, sd, runs, tab in SINGLE:
        got = t2[label]
        assert got == (mean, sd), (label, got, (mean, sd))
        n += 1
    for label, sites, mean, sd, runs, tab in DOUBLE:
        key = label.replace(" + ", "/")
        got = t1[key]
        assert got == (mean, sd), (label, got, (mean, sd))
        n += 1
    assert t1["C415R"] == C415R_TABLE1, t1["C415R"]
    for k in ("L73M", "F193S", "S359Y"):
        assert t1[k] == t2[k] and t1[k][1] is None, (k, t1[k], t2[k])
    print(f"{n} values of Tables 1 and 2 agree with the article text (PMC12720417); C415R is {t1['C415R']} in Table 1 and {t2['C415R']} in Table 2")


if __name__ == "__main__":
    main()
