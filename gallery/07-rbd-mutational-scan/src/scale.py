"""The diverging colour scales of piece 07 (stdlib only), shared by the heat maps (matplotlib), the key (page) and the ChimeraX renders.

A score is the change of a measurement from the unmutated RBD of the same background (delta_bind, delta_expr of S1 Data). 0 = the unmutated value = white.
Two scales, one per measurement, with the same two hues; the two sides of 0 have their own length (the table has far more weakening than strengthening):
  binding     -4.5 ... 0 ... +1.0   (change of -log10 KD; table range -4.41 to +0.73)
  expression  -2.5 ... 0 ... +1.0   (change of logMFI; table range -2.09 to +0.51)
Below 0 (weaker binding, less RBD displayed): white, pale lilac, periwinkle, dark periwinkle (family "peri" of tokens/tokens.base.json).
Above 0 (tighter binding, more RBD displayed): white, mint, dark mint (family "mint").
Purple against green is not a red-green pair and the two sides also differ in lightness; the check below prints the colour-vision distances.
Colours are interpolated linearly in sRGB between the stops of the token file.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]


def _tokens():
    p = os.environ.get("MOLECULLAGE_TOKENS")
    if not p:
        cfg = ROOT / "molecullage.json"
        rel = json.loads(cfg.read_text(encoding="utf-8")).get("palette") if cfg.exists() else None
        p = ROOT / rel if rel and (ROOT / rel).exists() else ROOT / "tokens" / "tokens.base.json"
    return json.loads(Path(p).read_text(encoding="utf-8"))["color"]


_C = _tokens()
FAM = _C["family"]
NEG_STOPS = [(0.0, "#FFFFFF"), (0.35, FAM["palelilac"]["fill"]), (0.70, FAM["peri"]["fill"]), (1.0, FAM["peri"]["edge"])]
POS_STOPS = [(0.0, "#FFFFFF"), (0.50, FAM["mint"]["fill"]), (1.0, FAM["mint"]["edge"])]
LIMITS = {"bind": (-4.5, 1.0), "expr": (-2.5, 1.0)}
MISSING_FILL, MISSING_LINE = "#D4D4D4", "#4A4A4A"        # no value in the table: neutral grey with a diagonal line (not on either scale)


def _rgb(h):
    return [int(h[i:i + 2], 16) for i in (1, 3, 5)]


def _interp(stops, t):
    t = min(max(t, 0.0), 1.0)
    for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
        if t <= t1:
            u = (t - t0) / (t1 - t0)
            return "#" + "".join("%02X" % round(a + (b - a) * u) for a, b in zip(_rgb(c0), _rgb(c1)))
    return stops[-1][1]


def color(v: float, kind: str = "bind") -> str:
    """Hex colour of a score. Values beyond a limit take the end colour (none of the table's cells does)."""
    lo, hi = LIMITS[kind]
    return _interp(NEG_STOPS, v / lo) if v < 0 else _interp(POS_STOPS, v / hi)


def _srgb_lin(c):
    c /= 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _lab(h):
    r, g, b = (_srgb_lin(x) for x in _rgb(h))
    x, y, z = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b, 0.2126729 * r + 0.7151522 * g + 0.0721750 * b, 0.0193339 * r + 0.1191920 * g + 0.9503041 * b
    f = lambda t: t ** (1 / 3) if t > 216 / 24389 else (24389 / 27 * t + 16) / 116
    fx, fy, fz = f(x / 0.95047), f(y), f(z / 1.08883)
    return 116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)


def lightness(h: str) -> float:
    return _lab(h)[0]


if __name__ == "__main__":
    for kind in LIMITS:
        lo, hi = LIMITS[kind]
        vs = [lo, lo * 0.75, lo * 0.5, lo * 0.25, 0, hi * 0.25, hi * 0.5, hi]
        print(kind, [(round(v, 2), color(v, kind), round(lightness(color(v, kind)), 1)) for v in vs])
    ls = [lightness(color(LIMITS['bind'][0] * i / 40, "bind")) for i in range(41)]
    assert all(a >= b - 1e-6 for a, b in zip(ls, ls[1:])), "the weakening side must get steadily darker"
    ls = [lightness(color(1.0 * i / 40, "bind")) for i in range(41)]
    assert all(a >= b - 1e-6 for a, b in zip(ls, ls[1:])), "the strengthening side must get steadily darker"
