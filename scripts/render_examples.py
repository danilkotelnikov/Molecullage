"""Make every ChimeraX render and the contact table used by the examples. Needs ChimeraX (a window opens, one run at a time).

    py -3 -B scripts/fetch_pdb.py 1MEL 1VFB 7Z0X 1IGT 4KRL      # once: coordinates and records
    py -3 -B scripts/render_examples.py

Steps: contacts (Arpeggio, hydrogens from ChimeraX), then struct/render.py for each group, then struct/trim.py. Output: art/ (trimmed PNG and index files).
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PY = [sys.executable, "-B"]
RUN = PY + [str(ROOT / "struct" / "run_cx.py"), str(ROOT / "struct" / "render.py")]
D = "data/pdb"
JOBS = [
    PY + [str(ROOT / "struct" / "contacts.py"), f"{D}/1MEL.pdb", "--binder", "A", "--antigen", "L", "--out", "examples/contacts/data"],
    RUN + ["complex", "name=mel", f"pdb={D}/1MEL.pdb", "binder=A", "antigen=L", "drop=B,M", "cdr=1mel_vhh", "contacts=examples/contacts/data/contacts.csv"],
    RUN + ["series", "name=series", f"pdb={D}/1MEL.pdb", "binder=A"],
    RUN + ["anatomy", "name=vhh", f"pdb={D}/1MEL.pdb", "binder=A", "drop=B,L,M", "cdr=1mel_vhh"],
    RUN + ["anatomy", "name=fv", f"pdb={D}/1VFB.pdb", "binder=B", "light=A", "drop=C", "cdr=1vfb_vh", "light_cdr=1vfb_vl"],
    RUN + ["complex", "name=fab", f"pdb={D}/7Z0X.pdb", "binder=H,L", "antigen=R"],
    RUN + ["chains", "name=igg", f"pdb={D}/1IGT.pdb", "assign=A:peri,B:rose,C:palelilac,D:palepink"],
    PY + [str(ROOT / "struct" / "trim.py")],
]

if __name__ == "__main__":
    for job in JOBS:
        print(">", " ".join(Path(a).name if "\\" in a or "/" in a and a.endswith(".py") else a for a in job))
        subprocess.run(job, cwd=ROOT, check=True)
