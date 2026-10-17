"""Style and parameters of the ChimeraX renders, without any ChimeraX import (so --dry-run can use it).

Colours come from the token file: $MOLECULLAGE_TOKENS, else the "palette" of molecullage.json, else tokens/tokens.base.json.
Parameters of a render group come from molecullage.json ("structures": {group: {...}}) and are overridden by key=value words
on the command line:  render.py complex entry=1MEL pdb=data/pdb/1MEL.pdb binder=A antigen=L drop=/B,M cdr=1mel_vhh
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
W, H = 2400, 1800
# ChimeraX "lighting flat" multiplies every colour by this factor (measured on flat fills); dividing it out makes the pixels equal the palette.
FLAT_GAIN = 1.158
EPITOPE_A = 4.5
# Chosen loop spans by sequence index (position in the chain, not a numbering scheme). They are examples for the public entries,
# not annotations. Write your own as cdr=h1:26-32,h2:52-57,h3:99-122.
CDR_PRESETS = {
    "1mel_vhh": {"h1": (26, 32), "h2": (52, 57), "h3": (99, 122)},
    "1vfb_vh": {"h1": (26, 32), "h2": (52, 56), "h3": (98, 105)},
    "1vfb_vl": {"l1": (24, 34), "l2": (50, 56), "l3": (89, 97)},
    "none": {},
}


def config() -> dict:
    for p in (os.environ.get("MOLECULLAGE_CONFIG"), Path.cwd() / "molecullage.json", ROOT / "molecullage.json", ROOT / "molecullage.example.json"):
        if p and Path(p).exists():
            return json.loads(Path(p).read_text(encoding="utf-8"))
    return {}


def token_path() -> Path:
    env = os.environ.get("MOLECULLAGE_TOKENS")
    if env:
        return Path(env)
    p = config().get("palette")
    return (ROOT / p) if p and (ROOT / p).exists() else ROOT / "tokens" / "tokens.base.json"


def tokens() -> dict:
    return json.loads(token_path().read_text(encoding="utf-8"))


def art_dir() -> Path:
    env = os.environ.get("MOLECULLAGE_ART")
    return Path(env) if env else ROOT / config().get("art", "art")


def mix(a: str, b: str, t: float = 0.5) -> str:
    pa, pb = [int(a[i:i + 2], 16) for i in (1, 3, 5)], [int(b[i:i + 2], 16) for i in (1, 3, 5)]
    return "#" + "".join("%02X" % round(x + (y - x) * t) for x, y in zip(pa, pb))


def comp(h: str) -> str:
    """Colour to give ChimeraX so that the flat-lit pixel equals h."""
    return "#" + "".join("%02X" % min(255, round(int(h[i:i + 2], 16) / FLAT_GAIN)) for i in (1, 3, 5))


def palette() -> dict:
    t = tokens()
    fam = t["color"]["family"]
    ink = t["color"]["ink"]
    return dict(
        mint=fam["mint"]["fill"], rose=fam["rose"]["fill"], rose_e=fam["rose"]["edge"], peri=fam["peri"]["fill"], peri_e=fam["peri"]["edge"],
        apricot=fam["apricot"]["fill"], apricot_e=fam["apricot"]["edge"], palepink=fam["palepink"]["fill"], palelilac=fam["palelilac"]["fill"],
        ink=ink, sil_px=t.get("render", {}).get("silhouette_px", 3.4),
    )


def setup_commands(p: dict | None = None) -> list[str]:
    """The commands that put ChimeraX in the flat journal style. A real window is needed (no --offscreen): windowsize sets its size."""
    p = p or palette()
    return [
        "close",
        "set bgColor white; windowsize 900 675; camera ortho",
        *light_commands(p),
    ]


def light_commands(p: dict | None = None) -> list[str]:
    """Lighting resets when a model is opened: send these right before every save."""
    p = p or palette()
    return [
        "lighting flat",
        "lighting depthCue false; material specularReflectivity 0",
        f"graphics silhouettes true width {p['sil_px']} color {p['ink']} depthJump 0.015",
    ]


def save_command(out_png: str) -> str:
    return f"save {out_png} width {W} height {H} supersample 3 transparentBackground true"


def parse_cdr(s: str) -> dict:
    """'1mel_vhh', 'none', or 'h1:26-32,h2:52-57,h3:99-122'."""
    if not s:
        return {}
    if s in CDR_PRESETS:
        return dict(CDR_PRESETS[s])
    out = {}
    for part in s.split(","):
        k, rng = part.split(":")
        a, b = rng.split("-")
        out[k.strip()] = (int(a), int(b))
    return out


KEYS = {"name", "pdb", "entry", "binder", "antigen", "light", "drop", "cdr", "light_cdr", "contacts", "seed", "sigma", "t", "assign", "mode", "out"}
SAFE_VALUE = re.compile(r"^[A-Za-z0-9_,.:=+/\\-]+$")   # no space, quote, semicolon or line break: ChimeraX runs ';' as a command separator


def parse_args(argv: list[str]) -> tuple[str | None, dict]:
    """['complex', 'entry=1MEL', ...] -> ('complex', {...}); a word without '=' is the group.

    Keys must be ones the scripts read, and values must be plain words or paths, because they end up in ChimeraX commands.
    """
    group, kv = None, {}
    for a in argv:
        if "=" in a:
            k, v = a.split("=", 1)
            if k not in KEYS:
                raise ValueError(f"key {k!r} is not one of: {', '.join(sorted(KEYS))}")
            if not SAFE_VALUE.match(v):
                raise ValueError(f"the value of {k!r} has a character that is not allowed (space, quote, semicolon or line break)")
            kv[k] = v
        elif group is None:
            group = a
    return group, kv


def group_params(group: str, kv: dict) -> dict:
    base = dict((config().get("structures") or {}).get(group, {}))
    base.update(kv)
    base.setdefault("name", group)
    return base
