"""Colour maths shared by the palette tools: sRGB, CIE Lab, CIEDE2000, OKLab, colour-vision simulation, contrast.

Colour-vision simulation follows Machado, Oliveira and Fernandes (2009), severity 1.0, applied in linear sRGB.
"""
from __future__ import annotations

import itertools
import math

import numpy as np

MACHADO = {
    "deutan": [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
    "protan": [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
    "tritan": [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
}
KINDS = ("normal", "deutan", "protan", "tritan")
_M1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566], [0.0883024619, 0.2817188376, 0.6299787005]])
_M2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468], [1.9779984951, -2.4285922050, 0.4505937099], [0.0259040371, 0.7827717662, -0.8086757660]])


def rgb(h: str) -> np.ndarray:
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], float) / 255


def to_hex(c) -> str:
    return "#%02X%02X%02X" % tuple(int(round(float(x) * 255)) for x in np.clip(c, 0, 1))


def lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def delin(l):
    return np.where(l <= 0.0031308, 12.92 * l, 1.055 * np.clip(l, 1e-12, None) ** (1 / 2.4) - 0.055)


def lab(l):
    m = np.array([[0.4124564, 0.3575761, 0.1804375], [0.2126729, 0.7151522, 0.0721750], [0.0193339, 0.1191920, 0.9503041]])
    xyz = (m @ l) / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 216 / 24389, np.cbrt(xyz), (24389 / 27 * xyz + 16) / 116)
    return np.array([116 * f[1] - 16, 500 * (f[0] - f[1]), 200 * (f[1] - f[2])])


def de2000(a, b) -> float:
    L1, a1, b1 = a
    L2, a2, b2 = b
    C1, C2 = math.hypot(a1, b1), math.hypot(a2, b2)
    Cm = (C1 + C2) / 2
    G = 0.5 * (1 - math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)))
    a1p, a2p = (1 + G) * a1, (1 + G) * a2
    C1p, C2p = math.hypot(a1p, b1), math.hypot(a2p, b2)
    h1 = math.degrees(math.atan2(b1, a1p)) % 360
    h2 = math.degrees(math.atan2(b2, a2p)) % 360
    dL, dC = L2 - L1, C2p - C1p
    dh = 0 if C1p * C2p == 0 else (h2 - h1 + 540) % 360 - 180
    dH = 2 * math.sqrt(C1p * C2p) * math.sin(math.radians(dh / 2))
    Lm, Cpm = (L1 + L2) / 2, (C1p + C2p) / 2
    if C1p * C2p == 0:
        hm = h1 + h2
    elif abs(h1 - h2) <= 180:
        hm = (h1 + h2) / 2
    else:
        hm = (h1 + h2 + 360) / 2 if h1 + h2 < 360 else (h1 + h2 - 360) / 2
    T = (1 - 0.17 * math.cos(math.radians(hm - 30)) + 0.24 * math.cos(math.radians(2 * hm))
         + 0.32 * math.cos(math.radians(3 * hm + 6)) - 0.20 * math.cos(math.radians(4 * hm - 63)))
    dth = 30 * math.exp(-(((hm - 275) / 25) ** 2))
    Rc = 2 * math.sqrt(Cpm ** 7 / (Cpm ** 7 + 25 ** 7))
    Sl = 1 + 0.015 * (Lm - 50) ** 2 / math.sqrt(20 + (Lm - 50) ** 2)
    Sc, Sh = 1 + 0.045 * Cpm, 1 + 0.015 * Cpm * T
    Rt = -math.sin(math.radians(2 * dth)) * Rc
    return math.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh))


def seen(h: str, kind: str):
    """Lab of a colour as seen with the given vision type."""
    l = lin(rgb(h))
    if kind != "normal":
        l = np.clip(np.array(MACHADO[kind]) @ l, 0, 1)
    return lab(l)


def min_de(hexes):
    """Smallest CIEDE2000 between any two colours over the four vision types: (value, kind, pair)."""
    best = (1e9, None, None)
    for kind in KINDS:
        labs = {h: seen(h, kind) for h in hexes}
        for a, b in itertools.combinations(hexes, 2):
            d = de2000(labs[a], labs[b])
            if d < best[0]:
                best = (d, kind, (a, b))
    return best


def pair_matrix(hexes):
    """Worst-case CIEDE2000 over the four vision types for every pair: {(a, b): value}."""
    out = {}
    labs = {k: {h: seen(h, k) for h in hexes} for k in KINDS}
    for a, b in itertools.combinations(hexes, 2):
        out[(a, b)] = min(de2000(labs[k][a], labs[k][b]) for k in KINDS)
    return out


def to_oklab(h: str):
    return _M2 @ np.cbrt(_M1 @ lin(rgb(h)))


def from_oklab(v) -> str:
    l = np.clip(np.linalg.inv(_M1) @ (np.linalg.inv(_M2) @ v) ** 3, 0, 1)
    return to_hex(delin(l))


def darker(h: str, L: float) -> str:
    """The colour with its OKLab lightness lowered to L (same hue and chroma where the sRGB gamut allows). A derived tone, not a sampled one."""
    v = to_oklab(h)
    v[0] = min(v[0], L)
    return from_oklab(v)


def luminance(h: str) -> float:
    return float(lin(rgb(h)) @ np.array([0.2126, 0.7152, 0.0722]))


def contrast(a: str, b: str = "#FFFFFF") -> float:
    la, lb = luminance(a), luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)
