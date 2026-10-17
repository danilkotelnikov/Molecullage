"""Read S1 Data (ppat.1014074.s001.csv) of Taylor and Starr 2026 and build what the figure draws. No third-party code; stdlib only.

    py -3 -I gallery/07-rbd-mutational-scan/src/scan_data.py        # check the table, print the counts, write tables/site_means.csv

Table columns used: target (Omicron_KP3 = KP.3.1.1, Omicron_LP8 = LP.8.1), wildtype, position (spike numbering), mutant (one letter, or - for a deletion),
delta_bind (change of the binding score from the unmutated RBD of that background; the score is -log10(KD), higher = tighter binding, Methods of the paper),
delta_expr (change of the expression score, logMFI, from the unmutated RBD; higher = more RBD displayed on yeast), n_bc_* (barcoded variants averaged).
"NA" in a score column = no value in the table: drawn as missing, never filled.
The site mean is computed here, not in the paper: the plain mean of the measured values at a site over its 20 mutations (19 amino-acid substitutions and the
deletion; the row of the unmutated residue is not part of it), per background and per score. A site with no measured value would have no mean (none does).
"""
from __future__ import annotations

import csv
import json
import statistics
from pathlib import Path

HERE = Path(__file__).resolve().parent
GAL = HERE.parent
CSV = GAL / "data" / "source_data" / "ppat.1014074.s001.csv"
CONTACTS = HERE / "contacts.json"

BG = [("Omicron_KP3", "KP.3.1.1"), ("Omicron_LP8", "LP.8.1")]
AA_ORDER = list("RKHDEQNSTYWFAILMVGPC") + ["-"]        # rows of the heat maps, top to bottom: the order of the paper's Fig. 5B, then the single-residue deletion
SITES = [s for s in range(331, 532) if s != 483]         # 200 sites: N331 to T531 of Wuhan-Hu-1 numbering without 483 (V483del in BA.2.86 and its descendants)
HOTSPOTS = [455, 456, 493]                               # "sites 455, 456, and 493" (abstract and Results of the paper)
CONTACT_CUTOFF = "under 5 A"                             # the paper's definition (legend of Fig 2): non-hydrogen atoms < 5 A from ACE2 in PDB 8QSQ; computed in contacts.py


def num(x: str):
    return None if x == "NA" else float(x)


def load():
    """-> dict bg -> dict (site, aa) -> dict(wt, bind, expr, n_bind, n_expr)  (bind and expr are the delta columns; None = NA)."""
    cells = {t: {} for t, _ in BG}
    with open(CSV, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            key = (int(r["position"]), r["mutant"])
            assert key not in cells[r["target"]], key
            cells[r["target"]][key] = dict(wt=r["wildtype"], bind=num(r["delta_bind"]), expr=num(r["delta_expr"]), n_bind=int(r["n_bc_bind"]), n_expr=int(r["n_bc_expr"]),
                                           bind_raw=num(r["bind"]), expr_raw=num(r["expr"]), is_wt=(r["mutant"] == r["wildtype"]))
    return cells


def contact_sites() -> list[int]:
    j = json.loads(CONTACTS.read_text(encoding="utf-8"))
    return list(j["sites_50"])      # the paper's definition, < 5 A; sites_45 holds the 4.5 A set for comparison


def check(cells) -> dict:
    stats = {}
    for t, name in BG:
        c = cells[t]
        assert sorted({s for s, _ in c}) == SITES, t
        assert all(len({a for s2, a in c if s2 == s}) == 21 for s in SITES), t
        wtmap = {s: c[(s, "-")]["wt"] for s in SITES}      # every row of a site carries the same wild-type letter
        for s in SITES:
            row = [(a, c[(s, a)]) for a in AA_ORDER]
            wts = [a for a, v in row if v["is_wt"]]
            assert wts == [wtmap[s]], (t, s, wts)               # exactly one wild-type row per site, and it is one of the 20 amino acids
            assert c[(s, wtmap[s])]["bind"] == 0 and c[(s, wtmap[s])]["expr"] == 0, (t, s)
        na_b = sum(1 for v in c.values() if v["bind"] is None)
        na_e = sum(1 for v in c.values() if v["expr"] is None)
        measured_b = [v["bind"] for v in c.values() if v["bind"] is not None and not v["is_wt"]]
        measured_e = [v["expr"] for v in c.values() if v["expr"] is not None and not v["is_wt"]]
        stats[name] = dict(rows=len(c), na_bind=na_b, na_expr=na_e, mutations=sum(1 for v in c.values() if not v["is_wt"]), measured_bind=len(measured_b), measured_expr=len(measured_e),
                           bind_min=min(measured_b), bind_max=max(measured_b), expr_min=min(measured_e), expr_max=max(measured_e),
                           min_nbc_bind=min(v["n_bind"] for v in c.values() if not v["is_wt"] and v["bind"] is not None))
    assert stats["KP.3.1.1"]["na_bind"] == 7 and stats["KP.3.1.1"]["na_expr"] == 6 and stats["LP.8.1"]["na_bind"] == 17 and stats["LP.8.1"]["na_expr"] == 17, stats
    return stats


def wild_type(cells, t) -> dict:
    return {s: next(a for a in AA_ORDER if cells[t][(s, a)]["is_wt"] and a != "-") for s in SITES}


def site_mean(cells, t, key) -> dict:
    out = {}
    for s in SITES:
        v = [cells[t][(s, a)][key] for a in AA_ORDER if not cells[t][(s, a)]["is_wt"] and cells[t][(s, a)][key] is not None]
        out[s] = (statistics.mean(v), len(v)) if v else (None, 0)
    return out


def main() -> None:
    cells = load()
    st = check(cells)
    con = set(contact_sites())
    rows = []
    wts = {t: wild_type(cells, t) for t, _ in BG}
    means = {(t, k): site_mean(cells, t, k) for t, _ in BG for k in ("bind", "expr")}
    for s in SITES:
        rows.append([s, wts["Omicron_KP3"][s], wts["Omicron_LP8"][s], int(s in con)] +
                    [x for t, _ in BG for k in ("bind", "expr") for x in ((f"{means[(t, k)][s][0]:.3f}", means[(t, k)][s][1]))])
    (GAL / "tables").mkdir(exist_ok=True)
    with open(GAL / "tables" / "site_means.csv", "w", newline="", encoding="utf-8") as f:
        f.write("# Site means computed here from S1 Data of Taylor and Starr 2026, PLoS Pathogens 22(6):e1014074, doi 10.1371/journal.ppat.1014074 (CC BY 4.0). "
                "Plain mean over the measured values of the site's 20 mutations (19 substitutions and the deletion; the unmutated residue is excluded). "
                "bind = mean of delta_bind (change of -log10 KD, log10 units); expr = mean of delta_expr (change of logMFI). n = measured mutations in the mean. "
                "contact = RBD atom within 5 A of ACE2 in PDB 8QSQ, computed by src/contacts.py (the paper's definition). Spike numbering.\n")
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["site", "wt_KP.3.1.1", "wt_LP.8.1", "contact"] + [f"{k}_{n}_{x}" for _, n in BG for k in ("bind", "expr") for x in ("mean", "n")])
        w.writerows(rows)
    print(json.dumps(st, indent=1))
    print("sites:", len(SITES), "| contact sites (< 5 A):", len(con), sorted(con), "| in the table:", all(s in SITES for s in con))
    for t, n in BG:
        print(n, "wild-type letters at the contact sites:", "".join(wts[t][s] + str(s) + " " for s in sorted(con)))
    print("hotspots", {n: [wts[t][s] + str(s) for s in HOTSPOTS] for t, n in BG})
    for t, n in BG:
        mb = means[(t, "bind")]
        print(n, "site-mean binding: min", min(v[0] for v in mb.values()), "max", max(v[0] for v in mb.values()), "| expression:", min(v[0] for v in means[(t, "expr")].values()), max(v[0] for v in means[(t, "expr")].values()),
              "| sites with fewer than 20 measured (binding):", [s for s, v in mb.items() if v[1] < 20])


if __name__ == "__main__":
    main()
