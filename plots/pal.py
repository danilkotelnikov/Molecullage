"""Palette for the matplotlib plot layers, read from a token file.

    import sys; sys.path.insert(0, "plots")
    from pal import FILL, EDGE, DATA, INK, SUB, RULE, RAMP, mix

FILL["rose"], EDGE["rose"], and so on, for every family of the token file (see docs/palette.md). DATA is the ordered
categorical list for lines and markers on white. RAMP is the heat-map ramp: white, pale lilac, navy.

The token file is $STRUCTFIG_TOKENS, else the "palette" key of the nearest structfig.json, else tokens/tokens.base.json.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def token_path() -> Path:
    env = os.environ.get("STRUCTFIG_TOKENS")
    if env:
        return Path(env)
    cfg = ROOT / "structfig.json"
    if cfg.exists():
        p = json.loads(cfg.read_text(encoding="utf-8")).get("palette")
        if p and (ROOT / p).exists():
            return ROOT / p
    return ROOT / "tokens" / "tokens.base.json"


def load(path=None) -> dict:
    return json.loads(Path(path or token_path()).read_text(encoding="utf-8"))["color"]


_C = load()
FILL = {k: v["fill"] for k, v in _C["family"].items()}
EDGE = {k: v["edge"] for k, v in _C["family"].items()}
DATA = list(_C["data"])
INK, SUB, RULE, LINE = _C["ink"], _C["sub"], _C["rule"], _C["line"]
RAMP = ["#FFFFFF", FILL["palelilac"], FILL["indigo"]]


def mix(a: str, b: str, t: float = 0.5) -> str:
    """Mix two #rrggbb colours: t = 0 gives a, t = 1 gives b."""
    pa, pb = [int(a[i:i + 2], 16) for i in (1, 3, 5)], [int(b[i:i + 2], 16) for i in (1, 3, 5)]
    return "#" + "".join("%02X" % round(x + (y - x) * t) for x, y in zip(pa, pb))
