"""Tree and table of Cuevas Zuviria et al. 2025 (eLife 14:RP105613), read from the paper's Figure 4 source data, laid out for the figure.

    py -3 -I gallery/08-nitrogenase-tree/src/nsdb_tree.py          # self-check: prints the counts and asserts them against the paper

Inputs (data/fig4/, written by fetch_data.py):
  Figure4SourceData1.tree  Newick, 770 tips and 768 internal nodes: 385 nitrogenases, 385 outgroup sequences (tip names start BchChl_),
                           internal nodes labelled with node numbers 771 to 1538, a three-way split at the root (an unrooted tree).
  Figure4SourceData2.csv   tip names, accessions, descriptions, organisms, taxonomy (770 rows).
  Figure4SourceData3.csv   tab separated, 769 rows: the 385 present-day nitrogenases (name = tip name) and the 384 ancestors ("Anc_<node number>"),
                           with clade label, nitrogenase type and the structural attributes of the predicted DDKK complex.

What this module computes (nothing is read from the original figure):
  1. Rooting: the tree is rooted on the branch above the one clade whose tips are all outgroup (the authors' code roots on node 822, the same clade).
     The 385 nitrogenase tips and 384 internal nodes on the other side are the 769 nodes of the paper.
  2. Order of the tips: at every internal node the children are ordered by the group of their tips (Nif-III, Vnf, Anf, Nif-I, Nif-II: the mean rank),
     then the smaller subtree first, then the node number. Every group is checked to be one block of rows.
  3. Layout: rectangular phylogram. Row of a tip = its place in that order; row of an internal node = the middle of its first and last child;
     x = sum of branch lengths from the root of the nitrogenase subtree (the unit is the one of the tree file: expected amino-acid substitutions per site).
"""
from __future__ import annotations

import csv
import statistics
from pathlib import Path

HERE = Path(__file__).resolve().parent
GAL = HERE.parent
DATA = GAL / "data" / "fig4"
TREE = DATA / "Figure4SourceData1.tree"
TAX = DATA / "Figure4SourceData2.csv"
TRAITS = DATA / "Figure4SourceData3.csv"

# the three traits plotted in Fig. 4B and Fig. 4-figure supplement 1B, C, D; column names of Figure4SourceData3.csv.
# unit and definition: Supplementary file 6 of the paper (Total area: exposed protein surface in A^2; Intermolecular contacts: number of contacts between
# residues of different chains; Binding affinity: free energy of binding of the complex in kcal/mol, the lower the more stable)
TRAIT_COLS = ["total_area", "intermolecular_contacts", "binding_affinity"]
GROUP_RANK = {"nif-iii": 0, "Vnf": 1, "Anf": 2, "nif-i": 3, "nif-ii": 4}      # order of the blocks, top to bottom (as in the paper's Fig. 3A)
GROUP_NAME = {"nif-iii": "Nif-III", "Vnf": "Vnf", "Anf": "Anf", "nif-i": "Nif-I", "nif-ii": "Nif-II"}


class Node:
    __slots__ = ("name", "len", "kids", "par", "tips", "ntips", "x", "y", "depth_rank", "order")

    def __init__(self, name="", ln=None):
        self.name, self.len = name, ln
        self.kids, self.par = [], None
        self.tips = []          # names of the tips below (filled by finish())
        self.ntips = 0
        self.x = self.y = None

    @property
    def is_tip(self):
        return not self.kids


def parse_newick(text: str) -> Node:
    """Newick with branch lengths and internal node labels; iterative. Returns the root."""
    s = text.strip().rstrip(";").strip()
    root = cur = Node()
    stack = []
    i, n = 0, len(s)
    while i < n:
        c = s[i]
        if c == "(":
            ch = Node(); ch.par = cur; cur.kids.append(ch)
            stack.append(cur); cur = ch; i += 1
        elif c == ",":
            cur = stack[-1]
            ch = Node(); ch.par = cur; cur.kids.append(ch)
            cur = ch; i += 1
        elif c == ")":
            cur = stack.pop(); i += 1
            i = _label(s, i, cur)
        else:
            i = _label(s, i, cur)
    assert not stack and cur is root, "unbalanced Newick"
    return root


def _label(s: str, i: int, node: Node) -> int:
    j = i
    while j < len(s) and s[j] not in "(),;:":
        j += 1
    node.name = s[i:j].strip()
    if j < len(s) and s[j] == ":":
        k = j + 1
        while k < len(s) and s[k] not in "(),;":
            k += 1
        node.len = float(s[j + 1:k])
        j = k
    return j


def walk(root: Node):
    """Pre-order list of nodes."""
    out, st = [], [root]
    while st:
        n = st.pop()
        out.append(n)
        st.extend(reversed(n.kids))
    return out


def finish(root: Node):
    """tips and ntips below every node (post-order)."""
    for n in reversed(walk(root)):
        if n.is_tip:
            n.tips, n.ntips = [n.name], 1
        else:
            n.tips = [t for k in n.kids for t in k.tips]
            n.ntips = len(n.tips)


def reroot_on_outgroup(root: Node, outgroup_prefix="BchChl_"):
    """Return (new_root, ingroup_root, outgroup_node): the tree rooted on the edge above the one clade whose tips are all outgroup."""
    finish(root)
    cand = [n for n in walk(root) if n.ntips > 1 and all(t.startswith(outgroup_prefix) for t in n.tips) and n.par is not None
            and not all(t.startswith(outgroup_prefix) for t in n.par.tips)]
    assert len(cand) == 1, f"expected one outgroup clade, found {len(cand)}"
    og = cand[0]
    adj = {}
    for n in walk(root):
        adj.setdefault(id(n), (n, []))
        if n.par is not None:
            adj[id(n)][1].append((n.par, n.len))
            adj.setdefault(id(n.par), (n.par, []))[1].append((n, n.len))

    def build(n, frm):
        r = Node(n.name)
        for m, ln in adj[id(n)][1]:
            if m is frm:
                continue
            c = build(m, n)
            c.len, c.par = ln, r
            r.kids.append(c)
        return r

    p = og.par
    a, b = build(og, p), build(p, og)
    a.len = b.len = og.len / 2.0
    new_root = Node("root")
    new_root.kids = [a, b]
    a.par = b.par = new_root
    finish(new_root)
    return new_root, b, a


def read_traits():
    rows = list(csv.DictReader(open(TRAITS, encoding="utf-8", newline=""), delimiter="\t"))
    out = {}
    for r in rows:
        key = r["original_name"][4:] if r["is_ancestral"] == "True" else r["original_name"]       # Anc_<n> -> node label n
        assert key not in out
        out[key] = r
    return out


def read_tax():
    return {r["Name"]: r for r in csv.DictReader(open(TAX, encoding="utf-8", newline=""))}


def group_of(row):
    """Block of a present-day protein: Anf and Vnf by the type column, the three Nif clades by the clade label of the file."""
    t = row["nitrogenase_type"]
    if t in ("Anf", "Vnf"):
        return t
    assert t == "Nif" and row["clade"] in ("nif-i", "nif-ii", "nif-iii"), (t, row["clade"])
    return row["clade"]


def load():
    """Parse, check against the paper, root, order, lay out. Returns a dict with the nodes and the arrays the figure draws."""
    root0 = parse_newick(TREE.read_text())
    n0 = walk(root0)
    traits, tax = read_traits(), read_tax()
    # ---- counts as the files give them
    tips0 = [n for n in n0 if n.is_tip]
    assert len(n0) == 1538 and len(tips0) == 770 and len(n0) - len(tips0) == 768
    assert sum(t.name.startswith("BchChl_") for t in tips0) == 385
    assert {t.name for t in tips0} == set(tax)
    root, ing, og = reroot_on_outgroup(root0)
    assert og.name == "822" and og.ntips == 385, "the outgroup clade is node 822, as in the authors' code"
    nodes = walk(ing)
    tips = [n for n in nodes if n.is_tip]
    internal = [n for n in nodes if not n.is_tip]
    assert len(tips) == 385 and len(internal) == 384 and len(nodes) == 769
    anc = {k for k, r in traits.items() if r["is_ancestral"] == "True"}
    assert {n.name for n in internal} == anc, "the 384 ancestors are exactly the internal nodes of the nitrogenase subtree"
    assert {t.name for t in tips} == {k for k, r in traits.items() if r["is_ancestral"] == "False"}
    assert len(traits) == 769
    grp = {t.name: group_of(traits[t.name]) for t in tips}
    # ---- order of the children
    for n in nodes:
        if n.kids:
            n.kids.sort(key=lambda k: (statistics.fmean(GROUP_RANK[grp[t]] for t in k.tips), k.ntips, int(k.name) if k.name.isdigit() else 0))
    # rows
    order = []
    st = [ing]
    while st:                                    # depth-first, children in their sorted order
        n = st.pop()
        if n.is_tip:
            order.append(n)
        else:
            st.extend(reversed(n.kids))
    assert len(order) == 385
    for i, t in enumerate(order):
        t.y = float(i)
    for n in reversed(walk(ing)):
        if n.kids:
            n.y = (n.kids[0].y + n.kids[-1].y) / 2.0
    ing.x = 0.0
    for n in walk(ing):
        for k in n.kids:
            k.x = n.x + k.len
    # ---- every group is one block of rows
    blocks = {}
    for g in GROUP_RANK:
        rows = [int(t.y) for t in order if grp[t.name] == g]
        assert rows == list(range(rows[0], rows[-1] + 1)), f"group {g} is not one block of rows"
        blocks[g] = (rows[0], rows[-1])
    assert [blocks[g][0] for g in sorted(GROUP_RANK, key=GROUP_RANK.get)] == sorted(b[0] for b in blocks.values())
    byname = {n.name: n for n in nodes}
    return dict(root=ing, nodes=nodes, tips=order, internal=internal, byname=byname, traits=traits, tax=tax, grp=grp, blocks=blocks,
                outgroup=og, max_x=max(t.x for t in order))


def lca(byname, names):
    chains = []
    for nm in names:
        c, n = [], byname[nm]
        while n is not None:
            c.append(n); n = n.par
        chains.append(c)
    common = set(map(id, chains[0]))
    for c in chains[1:]:
        common &= set(map(id, c))
    return next(n for n in chains[0] if id(n) in common)


def is_below(node, anc):
    while node is not None:
        if node is anc:
            return True
        node = node.par
    return False


if __name__ == "__main__":
    L = load()
    print("tree file: 1538 nodes = 770 tips (385 nitrogenases + 385 outgroup) + 768 internal")
    print("rooted on the outgroup edge (node %s, %d tips); nitrogenase subtree: %d tips + %d internal = %d nodes" % (L["outgroup"].name, L["outgroup"].ntips, len(L["tips"]), len(L["internal"]), len(L["nodes"])))
    print("blocks (first row, last row):", {GROUP_NAME[g]: b for g, b in L["blocks"].items()})
    print("max root-to-tip distance:", round(L["max_x"], 4), "substitutions per site")
