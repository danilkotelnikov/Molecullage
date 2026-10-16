"""Typed contacts between a binder and its antigen.

    py -3 -I struct/contacts.py data/pdb/1MEL.pdb --binder A --antigen L --out examples/contacts/data
    py -3 -I struct/contacts.py data/pdb/1MEL.pdb --binder A --antigen L --out ... --tool chimerax

Tool order: PDBe Arpeggio from the venv .venv-tools (python -m venv .venv-tools; .venv-tools/Scripts/pip install pdbe-arpeggio
openbabel-wheel), else ChimeraX "hbonds" and "contacts". The tool that ran is written to contacts.meta.json and must be named in the
figure notes. Arpeggio adds hydrogens with Open Babel and reports interaction classes; ChimeraX reports only hydrogen bonds and
generic close contacts, so its tiles carry the types hbond and none.

A residue pair is listed when the smallest heavy-atom distance is at most --cutoff (default 4.5 angstrom, own geometry).
Types are the Arpeggio classes found on any atom pair of the two residues (up to 5.0 angstrom):
  hbond, polar (polar contact; ionic is counted here), weak_hbond, carbonyl, hydrophobic, ring (aromatic).
Output: contacts.csv (one row per residue pair), contacts_atoms.csv (one row per atom pair), contacts.meta.json.
"""
from __future__ import annotations

import argparse
import csv
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
CLASS = {"hbond": "hbond", "polar": "polar", "ionic": "polar", "weak_polar": "weak_hbond", "carbonyl": "carbonyl", "hydrophobic": "hydrophobic", "aromatic": "ring"}
ORDER = ["hbond", "polar", "weak_hbond", "carbonyl", "hydrophobic", "ring"]
BACKBONE = {"N", "O"}


def read_pdb(path: Path, chains: set[str]):
    """{(chain, num, icode): (resname, {atom: xyz})}; first alternate location only; heavy atoms."""
    out: dict = {}
    for line in path.read_text().splitlines():
        if not line.startswith("ATOM") or line[21] not in chains or line[16] not in " A" or line[76:78].strip() == "H":
            continue
        k = (line[21], int(line[22:26]), line[26].strip())
        out.setdefault(k, (line[17:20].strip(), {}))[1][line[12:16].strip()] = np.array([float(line[30:38]), float(line[38:46]), float(line[46:54])])
    return out


def min_distance(a: dict, b: dict) -> float:
    A, B = np.array(list(a.values())), np.array(list(b.values()))
    return float(np.sqrt(((A[:, None, :] - B[None, :, :]) ** 2).sum(-1)).min())


def add_hydrogens(pdb: Path, work: Path) -> tuple[Path, str] | None:
    """Hydrogens from ChimeraX (hbond-optimised): Open Babel's default hydrogens find no inter-chain hydrogen bonds in 1MEL. None if ChimeraX is missing."""
    sys.path.insert(0, str(ROOT / "struct"))
    import run_cx

    if not run_cx.find_exe():
        return None
    work.mkdir(parents=True, exist_ok=True)
    out = work / f"{pdb.stem}_H.pdb"
    run_cx.main([str(ROOT / "struct" / "contacts_cx.py"), "mode=addh", f"pdb={pdb.resolve().as_posix()}", f"out={out.as_posix()}"])
    if not out.exists():
        return None
    return out, Path(str(out) + ".version").read_text().strip()


def run_arpeggio(pdb: Path, chains: list[str], work: Path) -> tuple[list[dict], str]:
    venv = ROOT / ".venv-tools" / ("Scripts" if sys.platform == "win32" else "bin")
    py = venv / ("python.exe" if sys.platform == "win32" else "python")
    exe = venv / ("pdbe-arpeggio.exe" if sys.platform == "win32" else "pdbe-arpeggio")
    if not exe.exists():
        raise FileNotFoundError("pdbe-arpeggio is not installed in .venv-tools")
    work.mkdir(parents=True, exist_ok=True)
    h = add_hydrogens(pdb, work)
    if h:
        pdb = h[0]
    cif = work / f"{pdb.stem}_trim.cif"
    subprocess.run([str(py), str(ROOT / "struct" / "_arpeggio_prep.py"), str(pdb), str(cif), ",".join(chains)], check=True)
    subprocess.run([str(exe), str(cif), "-s", f"/{chains[0]}//", "-o", str(work)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    version = subprocess.run([str(py), "-c", "import importlib.metadata as m;print(m.version('pdbe-arpeggio'))"], capture_output=True, text=True).stdout.strip()
    return json.loads((work / f"{cif.stem}.json").read_text()), f"PDBe Arpeggio {version} (hydrogens added by {'ChimeraX ' + h[1] if h else 'Open Babel'})"


def from_arpeggio(raw, binder: set[str], antigen: set[str]):
    atoms = []
    for r in raw:
        b, e = r["bgn"], r["end"]
        if b["auth_asym_id"] in binder and e["auth_asym_id"] in antigen:
            x, y = b, e
        elif e["auth_asym_id"] in binder and b["auth_asym_id"] in antigen:
            x, y = e, b
        else:
            continue
        types = sorted({CLASS[c] for c in r["contact"] if c in CLASS}, key=ORDER.index)
        if not types:
            continue
        atoms.append(dict(binder_chain=x["auth_asym_id"], binder_num=x["auth_seq_id"], binder_atom=x["auth_atom_id"],
                          antigen_chain=y["auth_asym_id"], antigen_num=y["auth_seq_id"], antigen_atom=y["auth_atom_id"],
                          distance=r["distance"], types=";".join(types)))
    return atoms


def run_chimerax(pdb: Path, binder: list[str], antigen: list[str], work: Path):
    sys.path.insert(0, str(ROOT / "struct"))
    import run_cx

    exe = run_cx.find_exe()
    if not exe:
        raise FileNotFoundError("ChimeraX not found")
    work.mkdir(parents=True, exist_ok=True)
    out = work / "cx_contacts.json"
    run_cx.main([str(ROOT / "struct" / "contacts_cx.py"), f"pdb={pdb.resolve().as_posix()}", f"binder={','.join(binder)}", f"antigen={','.join(antigen)}", f"out={out.as_posix()}"])
    data = json.loads(out.read_text())
    return data["atoms"], f"ChimeraX {data['version']} hbonds and contacts (no interaction classifier)"


def build(pdb: Path, binder: list[str], antigen: list[str], out: Path, cutoff: float = 4.5, tool: str = "auto") -> dict:
    atoms, used = None, None
    if tool in ("auto", "arpeggio"):
        try:
            raw, used = run_arpeggio(pdb, binder + antigen, out / "_arpeggio")
            atoms = from_arpeggio(raw, set(binder), set(antigen))
        except (FileNotFoundError, subprocess.CalledProcessError) as e:
            if tool == "arpeggio":
                raise
            print("Arpeggio unavailable, falling back to ChimeraX:", e, file=sys.stderr)
    if atoms is None:
        atoms, used = run_chimerax(pdb, binder, antigen, out / "_cx")
    res = read_pdb(pdb, set(binder) | set(antigen))
    pairs: dict = {}
    for a in atoms:
        pairs.setdefault((a["binder_chain"], a["binder_num"], a["antigen_chain"], a["antigen_num"]), []).append(a)
    rows = []
    bkeys = [k for k in res if k[0] in binder]
    akeys = [k for k in res if k[0] in antigen]
    for bk in bkeys:
        for ak in akeys:
            d = min_distance(res[bk][1], res[ak][1])
            if d > cutoff:
                continue
            ats = pairs.get((bk[0], bk[1], ak[0], ak[1]), [])
            types = sorted({t for a in ats for t in a["types"].split(";")}, key=ORDER.index)
            hb = sorted((a for a in ats if "hbond" in a["types"].split(";")), key=lambda a: a["distance"])
            bb = any(a["binder_atom"] in BACKBONE or a["antigen_atom"] in BACKBONE for a in hb)
            rows.append(dict(binder_chain=bk[0], binder_num=bk[1], binder_res=res[bk][0], antigen_chain=ak[0], antigen_num=ak[1], antigen_res=res[ak][0],
                             distance=round(d, 2), types=";".join(types), backbone_hbond="yes" if bb else "no",
                             hb_binder_atom=hb[0]["binder_atom"] if hb else "", hb_antigen_atom=hb[0]["antigen_atom"] if hb else ""))
    rows.sort(key=lambda r: (r["binder_num"], r["antigen_num"]))
    out.mkdir(parents=True, exist_ok=True)
    for name, data in (("contacts.csv", rows), ("contacts_atoms.csv", sorted(atoms, key=lambda a: (a["binder_num"], a["antigen_num"], a["distance"])))):
        with open(out / name, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=list(data[0].keys()) if data else ["empty"])
            w.writeheader()
            w.writerows(data)
    from collections import Counter

    meta = dict(tool=used, entry_file=pdb.name, binder=binder, antigen=antigen, cutoff_A=cutoff, pairs=len(rows), atom_pairs=len(atoms),
                pairs_with_type=sum(1 for r in rows if r["types"]), types={t: sum(1 for r in rows if t in r["types"].split(";")) for t in ORDER},
                hbond_pairs=sum(1 for r in rows if "hbond" in r["types"].split(";")), backbone_hbond_pairs=sum(1 for r in rows if r["backbone_hbond"] == "yes"),
                binder_residues=len({(r["binder_chain"], r["binder_num"]) for r in rows}), antigen_residues=len({(r["antigen_chain"], r["antigen_num"]) for r in rows}),
                note="pairs are listed by own heavy-atom geometry; types come from the tool; a pair with no type is drawn as 'no specific type'")
    (out / "contacts.meta.json").write_text(json.dumps(meta, indent=1), encoding="utf-8")
    return meta


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pdb")
    ap.add_argument("--binder", required=True, help="chain id(s), comma separated")
    ap.add_argument("--antigen", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--cutoff", type=float, default=4.5)
    ap.add_argument("--tool", choices=["auto", "arpeggio", "chimerax"], default="auto")
    a = ap.parse_args()
    print(json.dumps(build(Path(a.pdb), a.binder.split(","), a.antigen.split(","), Path(a.out), a.cutoff, a.tool), indent=1))


if __name__ == "__main__":
    main()
