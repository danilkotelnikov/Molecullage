"""Contacts between the inhibitor MWAC-3634 (component A1CIK, chain A of PDB 9PEL) and the protein, computed from the deposited coordinates.

    py -3 -I gallery/02-ebola-pocket/src/pocket_contacts.py

Reads data/pdb/9PEL.cif and src/ligand2d.json (ring list). Writes src/contacts.json and src/contacts.csv. Definitions, all computed here:
  contact              a protein residue with at least one heavy atom within 4.5 A of a heavy atom of the inhibitor (hydrogens ignored)
  hydrogen bond        N or O of the inhibitor and N or O of the residue, donor and acceptor roles fitting, heavy atoms within 3.5 A.
                       For a ring nitrogen as acceptor the partner must lie within 60 degrees of the in-plane lone-pair direction
                       (the direction from the mean of its two ring neighbours to the nitrogen); a stacked donor does not count.
                       The model has hydrogens only on some atoms, so no angle at the hydrogen is used.
  cation-pi            centre of the Arg guanidinium N atoms (or Lys NZ) within 6.0 A of an aromatic ring centre of the inhibitor, and within
                       2.0 A of the ring normal through that centre (the thresholds PLIP uses; the code is our own)
  hydrophobic contact  a contact with at least one carbon-carbon pair within 4.5 A
Alternative conformations: the one with the highest occupancy of each residue (Gln551 of chain a: B, 0.56), the one ChimeraX shows.
"""
from __future__ import annotations

import csv
import json
from collections import defaultdict
from pathlib import Path

import gemmi
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
CUT, HB_MAX, CATPI_D, CATPI_OFF, LONE_PAIR_MAX = 4.5, 3.5, 6.0, 2.0, 60.0
LIG_CHAIN, LIG_NAME = "A", "A1CIK"
SUBUNIT = {"A": "GP1", "a": "GP2"}   # chain A = GP1, chain a = GP2 of the same protomer (see how.md)
ONE = {"ALA": "A", "ARG": "R", "ASN": "N", "ASP": "D", "CYS": "C", "GLN": "Q", "GLU": "E", "GLY": "G", "HIS": "H", "ILE": "I", "LEU": "L", "LYS": "K",
       "MET": "M", "PHE": "F", "PRO": "P", "SER": "S", "THR": "T", "TRP": "W", "TYR": "Y", "VAL": "V"}
THREE = {"ALA": "Ala", "ARG": "Arg", "ASN": "Asn", "ASP": "Asp", "CYS": "Cys", "GLN": "Gln", "GLU": "Glu", "GLY": "Gly", "HIS": "His", "ILE": "Ile",
         "LEU": "Leu", "LYS": "Lys", "MET": "Met", "PHE": "Phe", "PRO": "Pro", "SER": "Ser", "THR": "Thr", "TRP": "Trp", "TYR": "Tyr", "VAL": "Val"}
# polar atoms of the protein that can donate (D) or accept (A) in a hydrogen bond
PROT_D = {("*", "N"), ("SER", "OG"), ("THR", "OG1"), ("TYR", "OH"), ("ASN", "ND2"), ("GLN", "NE2"), ("ARG", "NE"), ("ARG", "NH1"), ("ARG", "NH2"),
          ("LYS", "NZ"), ("HIS", "ND1"), ("HIS", "NE2"), ("TRP", "NE1")}
PROT_A = {("*", "O"), ("SER", "OG"), ("THR", "OG1"), ("TYR", "OH"), ("ASN", "OD1"), ("GLN", "OE1"), ("ASP", "OD1"), ("ASP", "OD2"), ("GLU", "OE1"),
          ("GLU", "OE2"), ("HIS", "ND1"), ("HIS", "NE2")}
LIG_ACC = {"N15", "N18", "O41", "O43"}   # quinoline N, imidazole N, two carbonyl O (N03 is substituted, N24 is an amide N, N39 an amide N-H)
LIG_DON = {"N39"}


def P(a: gemmi.Atom) -> np.ndarray:
    return np.array([a.pos.x, a.pos.y, a.pos.z])


def best_altlocs(model: gemmi.Model) -> dict:
    """(chain, seq id) -> altloc kept: the one with the highest occupancy (first on a tie)."""
    keep = {}
    for ch in model:
        for r in ch:
            occ = defaultdict(float)
            for a in r:
                if a.altloc != "\0":
                    occ[a.altloc] = max(occ[a.altloc], a.occ)
            if occ:
                keep[(ch.name, r.seqid.num, r.seqid.icode)] = max(occ, key=lambda k: (occ[k], -ord(k)))
    return keep


def main() -> None:
    st = gemmi.read_structure(str(ROOT / "data" / "pdb" / "9PEL.cif"))
    model = st[0]
    keep = best_altlocs(model)

    def use(cra) -> bool:
        if cra.atom.element.name in ("H", "D"):
            return False
        alt = keep.get((cra.chain.name, cra.residue.seqid.num, cra.residue.seqid.icode))
        return cra.atom.altloc == "\0" or cra.atom.altloc == alt

    lig = next(r for r in model[LIG_CHAIN] if r.name == LIG_NAME)
    lig_atoms = {a.name: a for a in lig if a.element.name != "H"}
    ns = gemmi.NeighborSearch(model, st.cell, 6.0).populate()
    pairs = defaultdict(list)   # residue key -> [(distance, ligand atom, residue atom, ligand element, residue element)]
    meta = {}
    for ln, la in lig_atoms.items():
        for m in ns.find_atoms(la.pos, "\0", radius=CUT):
            cra = m.to_cra(model)
            if cra.residue is lig or not use(cra):
                continue
            d = la.pos.dist(cra.atom.pos)
            if d <= CUT:
                k = (cra.chain.name, cra.residue.seqid.num)
                meta[k] = cra.residue
                pairs[k].append((d, ln, cra.atom.name, la.element.name, cra.atom.element.name, P(cra.atom)))
    chains = sorted({k[0] for k in pairs})
    nonprotein = sorted({meta[k].name for k in pairs if meta[k].name not in ONE})
    assert set(chains) <= set(SUBUNIT) and not nonprotein, f"contacts outside GP1 chain A and GP2 chain a: {chains} {nonprotein}"

    ligfile = json.loads((SRC / "ligand2d.json").read_text(encoding="utf-8"))
    rings = [r["atoms"] for r in ligfile["rings"] if r["aromatic"]]
    ringgeom = []
    for names in rings:
        X = np.array([P(lig_atoms[n]) for n in names])
        c = X.mean(0)
        nrm = np.linalg.svd(X - c)[2][2]
        ringgeom.append((names, c, nrm))

    def neighbours_mean(n: str) -> np.ndarray:
        nb = [b["b"] if b["a"] == n else b["a"] for b in ligfile["bonds"] if n in (b["a"], b["b"])]
        return np.mean([P(lig_atoms[x]) for x in nb], axis=0)

    # hydrogen bonds
    hbonds = []
    for k, rows in pairs.items():
        res = meta[k]
        for d, ln, rn, le, re_, rpos in rows:
            if le not in ("N", "O") or re_ not in ("N", "O") or d > HB_MAX:
                continue
            can_d = (res.name, rn) in PROT_D or ("*", rn) in PROT_D and res.name != "PRO"
            can_a = (res.name, rn) in PROT_A or ("*", rn) in PROT_A
            ok = (ln in LIG_ACC and can_d) or (ln in LIG_DON and can_a)
            note = ""
            if ok and ln in ("N15", "N18"):
                u = P(lig_atoms[ln]) - neighbours_mean(ln)
                v = rpos - P(lig_atoms[ln])
                ang = float(np.degrees(np.arccos(np.clip(u @ v / np.linalg.norm(u) / np.linalg.norm(v), -1, 1))))
                note = f"{ang:.0f} deg from the lone-pair direction"
                ok = ang <= LONE_PAIR_MAX
            hbonds.append(dict(chain=k[0], num=k[1], res=res.name, atom=rn, lig_atom=ln, dist=round(d, 2), accepted=ok, note=note))

    # cation-pi: every Arg and Lys of the two chains within 9 A of the inhibitor, not only the contact set
    catpi = []
    centre = np.mean([P(a) for a in lig_atoms.values()], axis=0)
    for cn in SUBUNIT:
        for r in model[cn]:
            if r.name not in ("ARG", "LYS") or np.linalg.norm(P(r["CA"][0]) - centre) > 25:
                continue
            names = ("NE", "NH1", "NH2") if r.name == "ARG" else ("NZ",)
            cat = np.mean([P(r[n][0]) for n in names], axis=0)
            for rn, c, nrm in ringgeom:
                v = cat - c
                dist = float(np.linalg.norm(v))
                axial = abs(float(v @ nrm))
                off = float(np.sqrt(max(dist * dist - axial * axial, 0.0)))
                if dist <= CATPI_D and off <= CATPI_OFF:
                    catpi.append(dict(chain=cn, num=r.seqid.num, res=r.name, ring=rn, dist=round(dist, 2), offset=round(off, 2), height=round(axial, 2),
                                      centre=[round(float(x), 3) for x in c], in_contact_set=(cn, r.seqid.num) in pairs))

    rows_out = []
    for k in sorted(pairs, key=lambda k: (k[0] != "A", k[1])):
        res = meta[k]
        pp = sorted(pairs[k], key=lambda t: t[:5])
        cc = [p for p in pp if p[3] == "C" and p[4] == "C"]
        types = []
        if any(h["accepted"] and (h["chain"], h["num"]) == k for h in hbonds):
            types.append("hbond")
        if any((c["chain"], c["num"]) == k for c in catpi):
            types.append("cation_pi")
        if cc:
            types.append("hydrophobic")
        res_atoms = {}   # residue atom -> (closest distance to the inhibitor, nearest inhibitor atom): every residue atom that touches
        for d, ln, rn, le, re_, _ in pp:
            if rn not in res_atoms or d < res_atoms[rn][0]:
                res_atoms[rn] = (round(d, 2), ln)
        rows_out.append(dict(
            chain=k[0], num=k[1], res=res.name, name3=THREE[res.name], code=ONE[res.name], subunit=SUBUNIT[k[0]],
            n_pairs=len(pp), d_min=round(pp[0][0], 2), lig_atom_nearest=pp[0][1], res_atom_nearest=pp[0][2],
            contact_atoms={a: dict(d=v[0], lig=v[1]) for a, v in sorted(res_atoms.items(), key=lambda kv: kv[1][0])},
            cc_lig_atoms=sorted({p[1] for p in cc}),   # inhibitor carbons that make a carbon-carbon pair with this residue (the hydrophobic contact)
            n_cc_pairs=len(cc), lig_atoms={a: sum(1 for p in pp if p[1] == a) for a in sorted({p[1] for p in pp})},
            types=types or ["contact"], altloc=keep.get((k[0], k[1], gemmi.SeqId(str(k[1])).icode), "")))
    out = dict(entry="9PEL", ligand=dict(component=LIG_NAME, chain=LIG_CHAIN, seq_num=lig.seqid.num, heavy_atoms=len(lig_atoms)), cutoff_A=CUT,
               numbering="author residue numbers and chain letters of the deposited entry (GP precursor numbering)",
               chains_in_contact=chains, residues=rows_out, hbond_candidates=hbonds, cation_pi=catpi,
               thresholds=dict(contact=CUT, hbond_max=HB_MAX, lone_pair_max_deg=LONE_PAIR_MAX, cation_pi_dist=CATPI_D, cation_pi_offset=CATPI_OFF))
    (SRC / "contacts.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
    with open(SRC / "contacts.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["chain", "residue", "number", "subunit", "heavy_atom_pairs_within_4.5A", "closest_A", "closest_inhibitor_atom", "closest_residue_atom", "CC_pairs", "types"])
        for r in rows_out:
            w.writerow([r["chain"], r["name3"], r["num"], r["subunit"], r["n_pairs"], r["d_min"], r["lig_atom_nearest"], r["res_atom_nearest"], r["n_cc_pairs"], "+".join(r["types"])])
    print(f"{len(rows_out)} residues within {CUT} A (chains {chains}); {sum(1 for r in rows_out if r['subunit'] == 'GP1')} GP1, {sum(1 for r in rows_out if r['subunit'] == 'GP2')} GP2")
    for r in rows_out:
        print(f"  {r['chain']}{r['num']:>4} {r['name3']}  pairs {r['n_pairs']:>2}  closest {r['d_min']:.2f} ({r['lig_atom_nearest']}-{r['res_atom_nearest']})  CC {r['n_cc_pairs']:>2}  {'+'.join(r['types'])}")
    print("hydrogen-bond candidates (N/O pairs within 3.5 A):", [(h['chain'], h['num'], h['res'], h['atom'], h['lig_atom'], h['dist'], h['accepted'], h['note']) for h in hbonds])
    print("cation-pi:", [(c['chain'], c['num'], c['res'], c['ring'][:2], c['dist'], c['offset'], c['in_contact_set']) for c in catpi])


if __name__ == "__main__":
    main()
