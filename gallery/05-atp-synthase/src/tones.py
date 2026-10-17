"""Colour of every subunit of 9ZFT: one colour family per module, one tone per subunit. Writes src/colours.json and tables/subunits.csv.

    py -3 -I gallery/05-atp-synthase/src/tones.py

1. Joins src/modules.py to the entry: the gene ID of each subunit must equal the gene ID stored in _entity.details of its entity (assert),
   every polymer entity must be a subunit or one of the unassigned ones (assert), and the chains come from the entry (auth_asym_id, the id ChimeraX uses).
   Subunits e and g (table of Fig. 1F) must be absent from 9ZFT and present, by gene ID, in 9ZFW (assert; 9ZFW is the membrane region of the dimer).
2. Tones: a tone is (lightness L, hue shift dh) of the module's family in OKLab; the chroma is that of the family fill, reduced where the sRGB gamut needs it.
   dh stays inside HUE_RANGE (about +-15 degrees, narrower toward the neighbouring family), so that a module stays one family.
   A random-restart hill-climb moves the 17 tones (grey for unassigned is fixed) to maximise, in this order: the smallest CIEDE2000 between touching subunits
   (any heavy atoms within 4.5 A, at least 20 atom pairs), taken as the worst of normal vision, deuteranopia, protanopia and tritanopia (palette/colour.py);
   the smallest normal-vision distance between any two of the 18 colours; the smallest worst-case distance between any two.
   Asserted: touching subunits (the grey chains included) differ by at least TOUCH_MIN (worst case over the four vision types).
   L_KEY keeps alpha and beta (large, alternating) in mid tones, c in a light-mid tone and MDH (the subject of the paper) strong.
3. Writes the tone of every subunit, the contact pairs, and the smallest distances to colours.json and prints them.
"""
from __future__ import annotations

import csv
import itertools
import json
import math
import random
import sys
from pathlib import Path

import numpy as np
from Bio.PDB.MMCIF2Dict import MMCIF2Dict
from scipy.spatial import cKDTree

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
REPO = ROOT.parents[1]
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(REPO / "palette"))
import colour as C  # noqa: E402
import modules as MOD  # noqa: E402

FAM = json.loads((REPO / "tokens" / "tokens.base.json").read_text(encoding="utf-8"))["color"]
GREY = FAM["guide"]   # unassigned chains
HUE_RANGE = {"indigo": (-16.0, 16.0), "apricot": (-8.0, 14.0), "rose": (-14.0, 8.0)}   # degrees of OKLab hue around the family fill
L_RANGE = (0.30, 0.93)
# the big surfaces and the subject of the paper get mid or strong tones; every other subunit may take any lightness
L_KEY = {"alpha": (0.55, 0.80), "beta": (0.35, 0.60), "c": (0.65, 0.88), "MDH": (0.35, 0.55)}
TOUCH_MIN = 10.0
CONTACT_A, CONTACT_MIN_PAIRS = 4.5, 20
RESTARTS, STEPS = 10, 2500
_INV1, _INV2 = np.linalg.inv(C._M1), np.linalg.inv(C._M2)


def tone(fill: str, L: float, dh: float = 0.0) -> str:
    v0 = C.to_oklab(fill)
    c, hue = math.hypot(v0[1], v0[2]), math.atan2(v0[2], v0[1]) + math.radians(dh)
    for _ in range(80):
        v = np.array([L, c * math.cos(hue), c * math.sin(hue)])
        lin = _INV1 @ (_INV2 @ v) ** 3
        if np.all(lin >= -1e-6) and np.all(lin <= 1 + 1e-6):
            return C.from_oklab(v)
        c *= 0.96
    return C.from_oklab(np.array([L, 0.0, 0.0]))


_seen: dict = {}


def seen(h: str, k: str):
    if (h, k) not in _seen:
        _seen[(h, k)] = C.seen(h, k)
    return _seen[(h, k)]


def dist(a: str, b: str) -> tuple[float, float]:
    """(normal-vision CIEDE2000, worst of the four vision types) between two colours."""
    d = [C.de2000(seen(a, k), seen(b, k)) for k in C.KINDS]
    return d[0], min(d)


def load_entry(path: Path):
    d = MMCIF2Dict(str(path))
    ent_name = dict(zip(d["_entity.id"], d["_entity.pdbx_description"]))
    ent_type = dict(zip(d["_entity.id"], d["_entity.type"]))
    ent_det = {k: {x.strip() for x in v.replace("\n", "").replace("|", ",").split(",")} for k, v in zip(d["_entity.id"], d["_entity.details"])}
    asym_ent = dict(zip(d["_struct_asym.id"], d["_struct_asym.entity_id"]))
    xyz, ent_of, chains = [], [], {}
    for g, lab, auth, mod, x, y, z, el in zip(d["_atom_site.group_PDB"], d["_atom_site.label_asym_id"], d["_atom_site.auth_asym_id"],
                                              d["_atom_site.pdbx_PDB_model_num"], d["_atom_site.Cartn_x"], d["_atom_site.Cartn_y"], d["_atom_site.Cartn_z"],
                                              d["_atom_site.type_symbol"]):
        if mod != "1" or ent_type[asym_ent[lab]] != "polymer" or el == "H":   # heavy atoms of polymer chains
            continue
        xyz.append((float(x), float(y), float(z)))
        ent_of.append(int(asym_ent[lab]))
        chains[auth] = int(asym_ent[lab])
    return np.array(xyz), np.array(ent_of), chains, ent_name, ent_det, d["_struct.title"][0]


def search_tones(keys, fam_of_key, touching, rng):
    """Hill-climb on (L, dh) per subunit; returns {key: (L, dh)}, the score and the colour function."""
    idx = {k: i for i, k in enumerate(keys)}
    n = len(keys)
    idx["unk"] = n                      # the fixed grey takes part in the touching pairs
    tpairs = [tuple(sorted((idx[a], idx[b]))) for a, b in touching]   # the matrices are filled above the diagonal
    cache: dict = {}

    def col(k, L, dh):
        key = (k, round(L, 4), round(dh, 3))
        if key not in cache:
            cache[key] = tone(FAM["family"][fam_of_key[k]]["fill"], L, dh)
        return cache[key]

    def full(cols):
        dn = np.full((n + 1, n + 1), 1e9)
        dw = np.full((n + 1, n + 1), 1e9)
        allc = cols + [GREY]
        for i in range(n + 1):
            for j in range(i + 1, n + 1):
                dn[i, j], dw[i, j] = dist(allc[i], allc[j])
        return dn, dw

    def value(dn, dw):
        t = min(dw[i, j] for i, j in tpairs)
        return (round(min(t, 14.0), 2), round(min(dn.min(), 10.0), 2), round(dw.min(), 2))

    best = None
    for r in range(RESTARTS):
        st = {}
        for k in keys:
            lo, hi = HUE_RANGE[fam_of_key[k]]
            st[k] = (rng.uniform(*L_KEY.get(k, L_RANGE)), rng.uniform(lo, hi))
        cols = [col(k, *st[k]) for k in keys]
        dn, dw = full(cols)
        cur = value(dn, dw)
        for _ in range(STEPS):
            k = rng.choice(keys)
            i = idx[k]
            lo, hi = HUE_RANGE[fam_of_key[k]]
            Llo, Lhi = L_KEY.get(k, L_RANGE)
            L = min(Lhi, max(Llo, st[k][0] + rng.gauss(0, 0.05)))
            dh = min(hi, max(lo, st[k][1] + rng.gauss(0, 5.0)))
            c_new = col(k, L, dh)
            dn2, dw2 = dn.copy(), dw.copy()
            allc = cols + [GREY]
            for j in range(n + 1):
                if j == i:
                    continue
                a, b = (i, j) if i < j else (j, i)
                x, y = (c_new, allc[j]) if i < j else (allc[j], c_new)
                dn2[a, b], dw2[a, b] = dist(x, y)
            v2 = value(dn2, dw2)
            if v2 >= cur:
                st[k], cols[i], dn, dw, cur = (L, dh), c_new, dn2, dw2, v2
        print(f"  restart {r}: touching worst-case {cur[0]}, all pairs normal {cur[1]}, all pairs worst-case {cur[2]}", flush=True)
        if best is None or cur > best[0]:
            best = (cur, dict(st))
    return best[1], best[0], col


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")   # Greek subunit names on a cp1251 console
    rng = random.Random(5)
    xyz, ent_of, chains, ent_name, ent_det, title = load_entry(ROOT / "data" / "pdb" / "9ZFT.cif")
    poly_entities = sorted(set(chains.values()))
    subs = [dict(key=k, label=lab, module=m, entities=e, gene=g, mark=mk) for k, lab, m, e, g, mk in MOD.SUBUNITS]
    unk = dict(key=MOD.UNASSIGNED[0], label=MOD.UNASSIGNED[1], module=None, entities=MOD.UNASSIGNED[3], gene=None, mark=None)
    # --- join to the entry
    covered = sorted(e for s in subs + [unk] for e in s["entities"])
    assert covered == poly_entities, (covered, poly_entities)
    for s in subs:
        (e,) = s["entities"]
        assert ent_det[str(e)] == {s["gene"]}, (s["key"], ent_det[str(e)], s["gene"])
    for s in subs + [unk]:
        s["chains"] = sorted(c for c, e in chains.items() if e in s["entities"])
        s["copies"] = len(s["chains"])
        s["entity_names"] = [ent_name[str(e)] for e in s["entities"]]
    assert sum(s["copies"] for s in subs + [unk]) == len(chains) == 34
    # subunits e (ACANB06593) and g (ACANB02343) are in the table of Fig. 1F: absent from 9ZFT, built in 9ZFW (membrane region of the dimer)
    EG = {"ACANB06593", "ACANB02343"}
    assert not (EG & set().union(*ent_det.values())), "e or g is in 9ZFT"
    _, _, _, _, det_w, title_w = load_entry(ROOT / "data" / "pdb" / "9ZFW.cif")
    assert EG <= set().union(*det_w.values()), "e and g are not both in 9ZFW"
    # --- contact graph between subunits
    sub_of_entity = {e: s["key"] for s in subs + [unk] for e in s["entities"]}
    tree = cKDTree(xyz)
    cnt: dict = {}
    for i, j in tree.query_pairs(CONTACT_A, output_type="ndarray"):
        a, b = sub_of_entity[ent_of[i]], sub_of_entity[ent_of[j]]
        if a != b:
            cnt[tuple(sorted((a, b)))] = cnt.get(tuple(sorted((a, b))), 0) + 1
    contacts = {k: v for k, v in cnt.items() if v >= CONTACT_MIN_PAIRS}
    # --- tones
    fam_of = {m: f for m, _, f in MOD.MODULES}
    keys = [s["key"] for s in subs]
    fam_of_key = {s["key"]: fam_of[s["module"]] for s in subs}
    touching = list(contacts)
    print("searching tones ...")
    st, val, col = search_tones(keys, fam_of_key, touching, rng)
    assign = {k: col(k, *st[k]) for k in keys}
    assign["unk"] = GREY
    for s in subs + [unk]:
        s["hex"] = assign[s["key"]]
        s["family"] = fam_of.get(s["module"], "grey")
        s["L"], s["dh"] = (st[s["key"]] if s["key"] in st else (None, None))
    touch = sorted((dist(assign[x], assign[y])[1], x, y, contacts[(x, y)]) for (x, y) in contacts)
    touch_n = sorted((dist(assign[x], assign[y])[0], x, y) for (x, y) in contacts)
    allp = sorted((dist(assign[x], assign[y])[1], x, y) for x, y in itertools.combinations(assign, 2))
    alln = sorted((dist(assign[x], assign[y])[0], x, y) for x, y in itertools.combinations(assign, 2))
    assert touch[0][0] >= TOUCH_MIN, f"touching subunits differ by only {touch[0]}"
    ladder = {m: sorted((s["hex"] for s in subs if s["module"] == m), key=lambda h: -C.to_oklab(h)[0]) for m, _, _ in MOD.MODULES}
    out = dict(
        modules=[dict(id=m, name=n, family=f, ladder_hex=ladder[m]) for m, n, f in MOD.MODULES],
        subunits=subs, unassigned=unk,
        chain_colour={c: assign[sub_of_entity[e]] for c, e in chains.items()},
        chain_subunit={c: sub_of_entity[e] for c, e in chains.items()},
        contacts=[dict(a=x, b=y, atom_pairs=v) for (x, y), v in sorted(contacts.items())],
        check=dict(
            touching_pairs_worst_case_min=round(touch[0][0], 2), touching_pair=touch[0][1:3],
            touching_pairs_normal_vision_min=round(touch_n[0][0], 2), touching_pair_normal=touch_n[0][1:3],
            all_pairs_worst_case_min=round(allp[0][0], 2), all_pairs_pair=allp[0][1:3],
            all_pairs_normal_vision_min=round(alln[0][0], 2), all_pairs_normal_pair=alln[0][1:3],
            touch_min_asserted=TOUCH_MIN, hue_range_deg=HUE_RANGE, l_range=L_RANGE, l_by_subunit=L_KEY,
            contact_rule=f"heavy atoms of two subunits within {CONTACT_A} A, at least {CONTACT_MIN_PAIRS} atom pairs", n_touching_pairs=len(contacts),
            e_g_in_9ZFW=title_w),
    )
    (HERE / "colours.json").write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
    with open(ROOT / "tables" / "subunits.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["module", "subunit", "entities", "deposited_entity_name", "gene_id", "chains", "copies", "mark_fig1F", "tone_hex"])
        for s in subs + [unk]:
            w.writerow([s["module"] or "", s["label"], " ".join(map(str, s["entities"])), " | ".join(dict.fromkeys(s["entity_names"])), s["gene"] or "",
                        " ".join(s["chains"]), s["copies"], s["mark"] or "", s["hex"]])
    for s in subs + [unk]:
        lh = "" if s["L"] is None else f"L {s['L']:.2f} dh {s['dh']:+.1f}"
        print(f"{(s['module'] or '-'):6s} {s['label']:11s} ent {str(s['entities']):16s} chains {' '.join(s['chains']):20s} {s['hex']}  {lh}")
    print("touching pairs:", len(contacts), "| smallest worst-case distance among touching pairs:", out["check"]["touching_pairs_worst_case_min"], touch[0][1:3],
          "| normal vision:", out["check"]["touching_pairs_normal_vision_min"], touch_n[0][1:3])
    print("all pairs: worst-case min", out["check"]["all_pairs_worst_case_min"], allp[0][1:3], "| normal-vision min", out["check"]["all_pairs_normal_vision_min"], alln[0][1:3])


if __name__ == "__main__":
    main()
