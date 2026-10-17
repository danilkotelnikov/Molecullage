"""Build tokens/tokens.base.json from palette/sampled.json.

    py -3 -B palette/make_tokens.py

Fills are the sampled values. Dark text and loop tones are DERIVED: the sampled colour with its OKLab lightness lowered
(0.46 to 0.52) so that text reaches 4.5:1 on white. Every derived value is marked "derived" in the provenance block.
White text goes on a family only if white on its fill reaches 4.4:1; every other family takes ink.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import colour as C  # noqa: E402

ROOT = HERE.parent
S = json.loads((HERE / "sampled.json").read_text(encoding="utf-8"))["colours"]
INK = "#0A0A0A"


def fam(fill, edge, role, derived=False):
    return dict(fill=fill, edge=edge, role=role, edge_derived=derived)


D = C.darker
FAM = {
    "mint": fam(S["lightgreen"], S["forest"], "antigen, target"),
    "rose": fam(S["salmon"], D(S["salmon"], 0.52), "binder, heavy chain", True),
    "peri": fam(S["purple"], D(S["purple"], 0.48), "light chain", True),
    "apricot": fam(S["amber"], D(S["amber"], 0.52), "contact patch, epitope", True),
    "indigo": fam(S["navy"], S["navy"], "implemented model, tool blocks"),
    "violet": fam(S["pink"], S["maroon"], "complexes"),
    "grey": fam(S["cream"], "#151515", "neutral cards and inputs"),
    "full": fam("#FFFFFF", "#151515", "designed, not implemented: white and dashed"),
    "green": fam(S["green"], S["forest"], "stage hue: selection"),
    "purple": fam(S["purple"], D(S["purple"], 0.48), "stage hue: dynamics", True),
    "maroon": fam(S["maroon"], S["maroon"], "stage hue: evaluation, held-out set"),
    "palemint": fam(S["palemint"], S["forest"], "data pill"),
    "palelilac": fam(S["palelilac"], D(S["purple"], 0.48), "data pill", True),
    "palepink": fam(S["palepink"], D(S["salmon"], 0.52), "data pill", True),
    "palesky": fam("#E9F3F9", S["navy"], "pass zone, good-region shading"),
}
ALIAS = {"antigen": "mint", "target": "mint", "binder": "rose", "heavy": "rose", "light": "peri", "epitope": "apricot",
         "model": "indigo", "base": "indigo", "complex": "violet", "neutral": "grey", "module": "grey", "cream": "grey", "ok": "mint"}
DATA = [S["navy"], D(S["salmon"], 0.52), S["forest"], D(S["purple"], 0.48), D(S["amber"], 0.52), S["maroon"]]


def build() -> dict:
    white_on = [k for k, v in FAM.items() if k != "full" and C.contrast(v["fill"]) >= 4.4]
    dark_on = [k for k in FAM if k not in white_on]
    sel = ",".join(f".card.fam-{k} .t,.card.fam-{k} .s,.band.fam-{k} b,.band.fam-{k} span,.bar.fam-{k} b,.state.fam-{k} .t" for k in white_on)
    css = f".card,.state,.chipbox,.sw,.group,.bar{{border-color:{INK}!important}}"
    css += sel + "{color:#fff!important}"
    css += ",".join(f".stage.fam-{k},.badge.fam-{k}" for k in white_on) + "{color:#fff!important}"
    css += ",".join(f".stage.fam-{k},.badge.fam-{k}" for k in dark_on) + f"{{color:{INK}!important}}"
    css += f".stage,.badge{{border-color:{INK}!important}}"
    core = [FAM[k]["fill"] for k in ("mint", "rose", "peri", "apricot", "indigo", "violet")]
    d, kind, pair = C.min_de(core)
    return {
        "name": "molecullage-base",
        "version": "1.0.0",
        "note": "Palette sampled from the flat fills of one open-access paper (see provenance). Fills are sampled; dark tones are derived.",
        "color": {
            "ink": INK, "sub": "#2B2B2B", "line": INK, "rule": "#3A3A3A", "guide": "#777777", "white": "#FFFFFF",
            "family": {k: {"fill": v["fill"], "edge": v["edge"], **({"dash": True} if k == "full" else {})} for k, v in FAM.items()},
            "alias": ALIAS,
            "data": DATA,
        },
        "render": {"silhouette_px": 3.4},
        "meta": {
            "source": "sampled from Fig. 8 of Int. J. Mol. Sci. 2025, 26, 9262 (doi 10.3390/ijms26199262, open access); plot colours from Figs 1, 4 and 7",
            "method": "mode of exact pixel colours of a 300 dpi page render, colours grouped at 2 levels (palette/sample_palette.py)",
            "core_six": core,
            "core_six_min_ciede2000": round(d, 1),
            "core_six_worst_case": {"vision": kind, "pair": list(pair)},
            "white_text_on": white_on,
        },
        "css": css,
        "provenance": {
            k: {"fill": v["fill"], "edge": v["edge"], "role": v["role"],
                "fill_origin": "sampled" if k != "full" and k != "palesky" else "chosen",
                "edge_origin": "derived (OKLab lightness lowered)" if v["edge_derived"] else "sampled or chosen"}
            for k, v in FAM.items()
        },
    }


if __name__ == "__main__":
    tok = build()
    out = ROOT / "tokens" / "tokens.base.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(tok, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print("wrote", out, "| core six, worst-case CIEDE2000:", tok["meta"]["core_six_min_ciede2000"], "| white text on:", ", ".join(tok["meta"]["white_text_on"]))
