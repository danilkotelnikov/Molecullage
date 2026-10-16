import csv
import re
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "struct"))
import contacts  # noqa: E402
import style  # noqa: E402


def test_setup_commands_are_the_flat_journal_style():
    text = "\n".join(style.setup_commands())
    for word in ("camera ortho", "lighting flat", "specularReflectivity 0", "silhouettes true", "windowsize", "bgColor white"):
        assert word in text
    assert "soft" not in text


def test_save_is_transparent_2400_by_1800():
    c = style.save_command("x.png")
    assert "width 2400 height 1800" in c and "transparentBackground true" in c


def test_flat_gain_compensation_round_trips():
    for h in ("#91D7AB", "#E16F6B", "#FFFFFF"):
        c = style.comp(h)
        back = "#" + "".join("%02X" % min(255, round(int(c[i:i + 2], 16) * style.FLAT_GAIN)) for i in (1, 3, 5))
        assert all(abs(int(back[i:i + 2], 16) - int(h[i:i + 2], 16)) <= 2 for i in (1, 3, 5))


def test_cdr_parsing():
    assert style.parse_cdr("h1:26-32,h3:99-122") == {"h1": (26, 32), "h3": (99, 122)}
    assert style.parse_cdr("none") == {} and "h3" in style.parse_cdr("1mel_vhh")


def test_args_override_config_and_name_defaults_to_group():
    g, kv = style.parse_args(["complex", "pdb=a.pdb", "binder=H,L"])
    p = style.group_params(g, kv)
    assert g == "complex" and p["binder"] == "H,L" and p["name"] == "complex" and p["antigen"] == "L"   # antigen from structfig.example.json


def test_args_refuse_unknown_keys_and_unsafe_values():
    for bad in ["antigen=L; open /x/evil.py", "antigen=L\nexit", "antigen=A B", 'antigen="A"', "antigen=", "antigen=$(x)"]:
        with pytest.raises(ValueError):
            style.parse_args(["complex", bad])
    with pytest.raises(ValueError):
        style.parse_args(["complex", "script=x"])
    assert style.parse_args(["chains", "assign=A:peri,B:rose", "t=0,0.25,0.5", "pdb=C:/x/1MEL.pdb"])[1]["t"] == "0,0.25,0.5"


def test_renders_hide_chimerax_labels_of_missing_structure():
    """A gap in a model is drawn with a pseudobond and a label such as '6 residues'; the label must not reach the PNG."""
    src = (ROOT / "struct" / "cx_common.py").read_text(encoding="utf-8")
    assert "hide pseudobonds; label delete" in src


def test_dry_run_prints_the_command_and_never_offscreen():
    r = subprocess.run([sys.executable, "-I", str(ROOT / "struct" / "run_cx.py"), "--dry-run", str(ROOT / "struct" / "render.py"), "series", "pdb=data/pdb/1MEL.pdb"],
                       capture_output=True, text=True, env={**os.environ, "STRUCTFIG_CHIMERAX": ""})
    assert r.returncode == 0 and "--script" in r.stdout and "render.py series pdb=data/pdb/1MEL.pdb" in r.stdout.replace("\\", "/")
    assert "offscreen" not in r.stdout


def test_render_scripts_never_use_offscreen():
    for f in (ROOT / "struct").glob("*.py"):
        code = [l for l in f.read_text(encoding="utf-8").splitlines() if re.search(r"""["']--offscreen["']""", l)]
        assert not code, f


def test_contact_table_schema_and_counts():
    d = ROOT / "examples" / "contacts" / "data"
    rows = list(csv.DictReader(open(d / "contacts.csv", encoding="utf-8")))
    meta = json.loads((d / "contacts.meta.json").read_text())
    assert meta["tool"].startswith("PDBe Arpeggio") and meta["pairs"] == len(rows) == 55
    assert meta["binder_residues"] == len({r["binder_num"] for r in rows}) == 18
    assert all(float(r["distance"]) <= 4.5 for r in rows)
    assert {t for r in rows for t in r["types"].split(";") if t} <= set(contacts.ORDER)
    assert all((r["hb_binder_atom"] != "") == ("hbond" in r["types"].split(";")) for r in rows)


def test_arpeggio_records_are_filtered_to_the_two_sides():
    raw = [
        {"bgn": {"auth_asym_id": "A", "auth_seq_id": 5, "auth_atom_id": "OG"}, "end": {"auth_asym_id": "L", "auth_seq_id": 9, "auth_atom_id": "ND2"}, "contact": ["hbond", "polar", "vdw"], "distance": 2.9},
        {"bgn": {"auth_asym_id": "A", "auth_seq_id": 5, "auth_atom_id": "OG"}, "end": {"auth_asym_id": "A", "auth_seq_id": 7, "auth_atom_id": "N"}, "contact": ["polar"], "distance": 3.0},
        {"bgn": {"auth_asym_id": "L", "auth_seq_id": 9, "auth_atom_id": "CB"}, "end": {"auth_asym_id": "A", "auth_seq_id": 6, "auth_atom_id": "CD"}, "contact": ["proximal"], "distance": 4.0},
    ]
    atoms = contacts.from_arpeggio(raw, {"A"}, {"L"})
    assert len(atoms) == 1 and atoms[0]["types"] == "hbond;polar" and atoms[0]["antigen_num"] == 9


@pytest.mark.skipif(not os.environ.get("STRUCTFIG_CHIMERAX"), reason="set STRUCTFIG_CHIMERAX to run a real render")
def test_real_render_writes_layers(tmp_path):
    env = {**os.environ, "STRUCTFIG_ART": str(tmp_path)}
    r = subprocess.run([sys.executable, "-I", str(ROOT / "struct" / "run_cx.py"), str(ROOT / "struct" / "render.py"), "anatomy", "name=t", f"pdb={ROOT / 'data/pdb/1MEL.pdb'}",
                        "binder=A", "drop=B,L,M", "cdr=1mel_vhh"], capture_output=True, text=True, env=env, cwd=ROOT)
    assert "ChimeraX exit: 0" in r.stdout and (tmp_path / "t__main.png").exists()
