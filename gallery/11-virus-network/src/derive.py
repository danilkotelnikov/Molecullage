"""Read the network of Fig. 3 of Safi et al. 2026 (The EMBO Journal 45(10):3514-3539) and check it against the paper.

    py -3 -B -I gallery/11-virus-network/src/derive.py          # needs data/ from fetch_data.py; writes tables/*.csv and prints every check

Inputs (data/): the Zenodo Cytoscape session Mimivirus_coip_fun_categories.cys (nodes, edges, regions, functional categories, PDB-complex edges),
Source data Fig. 3 (the partner lists of Fig. 3A and the bait pairs of Fig. 3B), Dataset EV1 (the IP-MS tables), pdb_entries.json.
Every number the paper prints about this network is asserted here. `load()` returns everything make_layer.py draws.
"""
from __future__ import annotations

import collections
import csv
import io
import json
import re
import sys
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
GAL = HERE.parent
DATA = GAL / "data"
TAB = GAL / "tables"

# ---------------------------------------------------------------- names and orders used by every panel
VM = ["L323", "R595", "R443", "L330", "R387"]            # membrane baits (paper: green nodes), largest first
NVF = ["R252", "R561", "L274", "R721", "L410"]           # nucleoid and VF baits (paper: gray nodes), largest first
BAITS = VM + NVF
SUB = {b: "VM" for b in VM} | {b: "NVF" for b in NVF}
# region classes: the paper's Fig. 3C legend, with "VF" written VF-IL (Methods: internal layer of the viral factory, VF-IL)
REGIONS = ["vfil", "virion_vfil", "nucleoid_vfil", "nucleoid", "virion", "membrane_in", "membrane_out", "none"]
REGION_NAME = {
    "vfil": "VF-IL only", "virion_vfil": "Virion and VF-IL", "nucleoid_vfil": "Nucleoid, virion and VF-IL", "nucleoid": "Nucleoid, not VF-IL",
    "virion": "Virion only", "membrane_in": "Membrane, in virion", "membrane_out": "Membrane, not in virion", "none": "No region listed",
}
# the 15 functional categories of the legend of Fig. 3D, in the order of that legend
FUNC = ["Uncharacterized", "Structural/Motifs/Protein binding", "DNA Replication and Repair", "Protein Modification and Folding", "Transcription",
        "Carbohydrate Metabolism", "Morphogenesis", "Oxidation-Reduction", "Nucleotide Metabolism", "Hydrolases", "Translation and Ribosome Function",
        "Structural/Motifs/DNA binding", "Lipid Metabolism", "Amino Acid Metabolism", "Transferases"]
PDB_TAG = {"7a09": "7a09", "7dvq": "7dvq", "PDB_6zj3": "6zj3", "PDB_RNAPOLCORE": "rnap_core", "PDB_RNAPOLNOTCORE": "rnap_other"}

# ---------------------------------------------------------------- numbers the paper prints (Results, "Mapping protein-protein interactions"; Fig. 3A,B legends), copied as written
PAPER_HOST_VIRAL = {"R443": (1, 14), "L410": (18, 29), "R252": (123, 62), "R561": (66, 18), "R721": (39, 26), "L274": (59, 21)}   # (host, viral)
PAPER_TOTAL = {"R443": 15, "L323": 37, "R595": 18}
PAPER_SHARED = {("R443", "L323"): 6, ("R595", "R443"): 3, ("R595", "L323"): 15, ("L410", "R721"): 34, ("L410", "R252"): 13, ("R721", "R252"): 15}
PAPER_PDB_HOST_PROTEINS = "around 40 host proteins connected to the NVF subnetwork"


def _csv_table(z: zipfile.ZipFile, name: str) -> list[dict]:
    rows = list(csv.reader(io.StringIO(z.read(name).decode("utf-8"))))
    return [dict(zip(rows[1], r)) for r in rows[5:] if r]


def short(i: str) -> str:
    m = re.fullmatch(r"BAESF_(\d+)\.mRNA\.1", i)
    return m.group(1) if m else i


def region_of(r: dict) -> str:
    loc, mem = r["loc"], r["prey_membrane"] == "1"
    v, c, f = "virion" in loc, "core" in loc, "vfIL" in loc          # the file's codes: virion, core (read as the paper's Nucleoid), vfIL
    if mem:
        return "membrane_in" if v else "membrane_out"
    if c and f:
        return "nucleoid_vfil"
    if c:
        return "nucleoid"
    if v and f:
        return "virion_vfil"
    if v:
        return "virion"
    return "vfil" if f else "none"


def func_of(r: dict) -> str:
    return r["prey_func_cat"] if r["prey_func_cat"] in FUNC else ""    # host proteins and three viral ones ('-', 'not found:pan domain') carry no paper category


def load() -> dict:
    z = zipfile.ZipFile(DATA / "Mimivirus_coip_fun_categories.cys")
    names = z.namelist()

    def tab(net: str, kind: str):
        n = [x for x in names if f"/{net}/SHARED_ATTRS" in x and kind in x]
        assert len(n) == 1, (net, kind, n)
        return _csv_table(z, n[0])

    nodes = {r["shared name"]: r for r in tab("198793-Merged+Network_3", "CyNode")}
    edges = tab("198793-Merged+Network_3", "CyEdge")
    ms_edges, pdb_edges = [], collections.defaultdict(set)
    for e in edges:
        a, b = e["shared name"].split(" (interacts with) ")
        tags = re.split(r"[;,]", e["tag"])
        for t in tags:
            if t.endswith("--MS"):
                bait = t[:-4]
                assert a == bait or b == bait, e
                other = b if a == bait else a
                if other != bait:                                    # the bait found in its own pull-down is a self-loop: not a link
                    ms_edges.append((bait, other))
            elif t in PDB_TAG and a != b:                            # a == b: placeholder self-loops of the Cytoscape file
                pdb_edges[PDB_TAG[t]].add(frozenset((a, b)))
    assert len(ms_edges) == len(set(ms_edges)), "duplicate bait-prey links"
    return dict(nodes=nodes, ms_edges=ms_edges, pdb_edges={k: sorted(tuple(sorted(p)) for p in v) for k, v in pdb_edges.items()})


def analyse(D: dict, log=print) -> dict:
    nodes, ms_edges, pdb_edges = D["nodes"], D["ms_edges"], D["pdb_edges"]
    bait_set = set(BAITS)
    assert {n for n, r in nodes.items() if r["msbait"] == "1"} == bait_set
    nbr = collections.defaultdict(set)                                # bait -> proteins found in its pull-down
    for b, p in ms_edges:
        nbr[b].add(p)
    prey_baits = collections.defaultdict(set)
    for b, p in ms_edges:
        prey_baits[p].add(b)
    prey = sorted(p for p in prey_baits if p not in bait_set)
    tax = {n: ("viral" if r["tax"] == "VIRUS" else "host") for n, r in nodes.items()}
    per_bait = {b: dict(viral=sum(tax[p] == "viral" for p in nbr[b]), host=sum(tax[p] == "host" for p in nbr[b]), total=len(nbr[b])) for b in BAITS}
    # ---- counts the paper prints
    for b, (h, v) in PAPER_HOST_VIRAL.items():
        assert (per_bait[b]["host"], per_bait[b]["viral"]) == (h, v), (b, per_bait[b], h, v)
    for b, t in PAPER_TOTAL.items():
        assert per_bait[b]["total"] == t, (b, per_bait[b])
    log("per-bait (host, viral) agree with the Results text for", sorted(PAPER_HOST_VIRAL), "and totals for", sorted(PAPER_TOTAL))
    n_links = len(ms_edges)
    bait_bait = [(b, p) for b, p in ms_edges if p in bait_set]
    log(f"links {n_links}; to prey {n_links - len(bait_bait)}; between baits {len(bait_bait)}; prey (non-bait) {len(prey)}: "
        f"viral {sum(tax[p] == 'viral' for p in prey)}, host {sum(tax[p] == 'host' for p in prey)}; baits also found as prey {len({p for _, p in bait_bait})}")
    assert (n_links, len(bait_bait), len(prey)) == (549, 10, 433)
    # ---- Source data Fig. 3A partner lists and Dataset EV1 against the network
    sd = zipfile.ZipFile(DATA / "44318_2026_770_MOESM13_ESM.zip")
    for b in BAITS:
        got = {l.split("\t")[0] for l in sd.read(f"Figure_3/3A/AP-MS_partners/{b}.txt").decode().splitlines()[1:] if l.strip()}
        assert got - {b} == nbr[b] and b in got, (b, sorted(got ^ nbr[b])[:6])
    log("Source data Fig. 3A: the ten partner lists equal the network's partners of each bait (each list also names the bait itself)")
    import openpyxl
    wb = openpyxl.load_workbook(DATA / "44318_2026_770_MOESM6_ESM.xlsx", read_only=True, data_only=True)
    ev1 = {}
    for ws in wb.worksheets:
        if ws.title == "Legend":
            continue
        b = ws.title.split("-")[0]
        hit = {r[0] for r in list(ws.iter_rows(values_only=True))[2:] if r[0] and r[3] not in (None, "") and float(r[3]) >= 1 and float(r[4]) < 0.01}
        assert hit - {b} == nbr[b], (b, sorted(hit ^ nbr[b])[:6])
        ev1[b] = len(hit) - 1
    log("Dataset EV1 (log2 fold change >= 1, p < 0.01, the Methods' rule): the eight sheets give the same partners; R252 and R561 are not in EV1 (earlier study)")
    # ---- bait pairs (Fig. 3B)
    pairs = []
    for l in sd.read("Figure_3/3B/network_baits_with_shared_partners.tsv").decode().splitlines()[1:]:
        a, b, s, d, sh = (l.split("\t") + [""])[:5]
        pairs.append((a, b, int(s), int(d), sh))
    comp = {}
    for a, b, s, d, sh in pairs:
        shared = (nbr[a] - {b}) & (nbr[b] - {a})
        direct = int(b in nbr[a]) + int(a in nbr[b])
        assert (len(shared), direct) == (s, d), (a, b, s, d, len(shared), direct)
        assert set(x for x in sh.split(",") if x) == shared, (a, b)
        comp[(a, b)] = (s, d)
    assert len(pairs) == 34
    import itertools
    listed = {frozenset((a, b)) for a, b, *_ in pairs}
    for a, b in itertools.combinations(BAITS, 2):                       # the 11 pairs the file leaves out share nothing and are not linked
        if frozenset((a, b)) not in listed:
            assert not ((nbr[a] - {b}) & (nbr[b] - {a})) and b not in nbr[a] and a not in nbr[b], (a, b)
    for (a, b), n in PAPER_SHARED.items():
        s = comp.get((a, b), comp.get((b, a)))
        assert s and s[0] == n, ((a, b), s, n)
    log("Fig. 3B pair table: shared-partner counts and direct connections equal those computed from the network (34 listed pairs; the other 11 of 45 share nothing); the six counts in the text agree")
    # ---- Louvain on the weights of the Methods: edge_weight = Nc + 10 * Ndc
    import networkx as nx
    G = nx.Graph()
    G.add_nodes_from(BAITS)
    for a, b, s, d, _ in pairs:
        if s + 10 * d > 0:
            G.add_edge(a, b, weight=s + 10 * d)
    split = collections.Counter()
    for seed in range(200):
        parts = nx.community.louvain_communities(G, weight="weight", seed=seed)
        split[tuple(sorted(tuple(sorted(p)) for p in parts))] += 1
    top = split.most_common(3)
    log("Louvain (networkx, 200 seeds): " + "; ".join(f"{n} runs -> {list(k)}" for k, n in top))
    paper = tuple(sorted((tuple(sorted(VM)), tuple(sorted(NVF)))))
    louvain_seed1 = tuple(sorted(tuple(sorted(p)) for p in nx.community.louvain_communities(G, weight="weight", seed=1)))
    assert louvain_seed1 == paper, louvain_seed1
    log("Louvain with seed 1 returns the two groups of the paper:", paper)
    # ---- prey table
    rows = []
    for p in prey:
        r = nodes[p]
        bs = sorted(prey_baits[p], key=BAITS.index)
        subs = sorted({SUB[b] for b in bs})
        rows.append(dict(id=p, short=short(p), organism=tax[p], region=region_of(r), membrane=int(r["prey_membrane"] == "1"), function=func_of(r), baits=";".join(bs),
                         n_baits=len(bs), subnetworks="+".join(subs), annotation=re.sub(r"\s+", " ", r["prey_func_annot"]).strip()))
    # ---- PDB-complex edges
    pdb = {}
    for k, es in pdb_edges.items():
        ns = sorted({x for e in es for x in e})
        pdb[k] = dict(edges=es, nodes=ns)
        log(f"PDB complex {k}: {len(ns)} proteins ({sum(tax[n] == 'viral' for n in ns)} viral, {sum(tax[n] == 'host' for n in ns)} host), {len(es)} links")
    host_union = {n for k in ("7a09", "7dvq", "6zj3") for n in pdb[k]["nodes"]}
    log(f"host proteins in the three complexes 7a09, 7dvq, 6zj3, all together: {len(host_union)} (paper: {PAPER_PDB_HOST_PROTEINS})")
    pdb_of = collections.defaultdict(list)
    for k, v in pdb.items():
        for n in v["nodes"]:
            pdb_of[n].append(k)
    for r in rows:
        r["pdb"] = ";".join(pdb_of.get(r["id"], []))
    no_link = sorted(n for n in nodes if n not in bait_set and n not in prey_baits)
    log(f"network file nodes: {len(nodes)} = 10 baits + {len(prey)} prey + {len(no_link)} viral proteins with no bait link "
        f"({sum(1 for n in no_link if n in pdb_of)} of them are RNA polymerase chains in the PDB-complex links)")
    return dict(nodes=nodes, prey=rows, per_bait=per_bait, ev1=ev1, pairs=pairs, pdb=pdb, pdb_of=dict(pdb_of), ms_edges=ms_edges, nbr={b: sorted(v) for b, v in nbr.items()},
                no_link=no_link, tax=tax, louvain=top)


def write_tables(A: dict):
    TAB.mkdir(exist_ok=True)

    def w(name, header, rows, note):
        with open(TAB / name, "w", newline="", encoding="utf-8") as f:
            f.write("# " + note + "\n")
            c = csv.writer(f, lineterminator="\n")
            c.writerow(header)
            c.writerows(rows)

    src = "computed from Zenodo 10.5281/zenodo.17313812 (Mimivirus_coip_fun_categories.cys, Merged Network_3) by src/derive.py"
    w("prey.csv", ["id", "short", "organism", "region", "membrane_tmd", "function", "baits", "n_baits", "subnetworks", "pdb_complexes", "annotation"],
      [[r["id"], r["short"], r["organism"], r["region"], r["membrane"], r["function"], r["baits"], r["n_baits"], r["subnetworks"], r["pdb"], r["annotation"]] for r in A["prey"]],
      "one row per prey protein (433), " + src)
    pb = A["per_bait"]
    w("baits.csv", ["bait", "subnetwork", "viral", "host", "total", "enriched_EV1_excluding_bait"],
      [[b, SUB[b], pb[b]["viral"], pb[b]["host"], pb[b]["total"], A["ev1"].get(b, "")] for b in BAITS], "partners per bait; " + src + "; EV1 column from Dataset EV1 (log2FC>=1, p<0.01)")
    w("bait_pairs.csv", ["bait_a", "bait_b", "shared_partners", "direct_connections"], [[a, b, s, d] for a, b, s, d, _ in A["pairs"]],
      "Source data Fig. 3B (network_baits_with_shared_partners.tsv); every row re-computed from the network and equal")
    w("bait_links.csv", ["bait", "found_bait"], [[b, p] for b, p in A["ms_edges"] if p in set(BAITS)],
      "a bait found in the pull-down of another bait (Fig. 3B direct connections), directed: first column pulled down the second; " + src)
    w("pdb_links.csv", ["complex", "protein_a", "protein_b"], [[k, a, b] for k, v in A["pdb"].items() for a, b in v["edges"]], "links of each homologous PDB complex; " + src)
    ent = json.loads((DATA / "pdb_entries.json").read_text(encoding="utf-8"))
    w("pdb_entries.csv", ["pdb_id", "title", "first_release"], [[k.upper(), v[0], v[1]] for k, v in ent.items()], "read from data.rcsb.org on 2026-10-17 (fetch_data.py); labels only")
    cnt = collections.Counter((r["region"], r["organism"]) for r in A["prey"])
    w("region_counts.csv", ["region", "viral", "host"], [[REGION_NAME[g], cnt[(g, "viral")], cnt[(g, "host")]] for g in REGIONS], "prey per region class; " + src)


if __name__ == "__main__":
    D = load()
    A = analyse(D)
    write_tables(A)
    print("tables written to", TAB)
