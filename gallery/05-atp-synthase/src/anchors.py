"""Where each leader of the figure ends, from the coordinates and the id render. Run after src/render_atp.py.

    py -3 -I gallery/05-atp-synthase/src/anchors.py [--stats]

For every view V in VIEWS:
  1. Decode art/atp_V__id.png (one flat colour per chain, no antialiasing) to a map of the chain that owns each visible pixel.
  2. The flat part of a chain = the pixels that the id render gives to it and that show its tone in the final render (no outline, no anti-aliased edge).
     The anchor of a chain is the deepest point (largest distance to the edge) of the largest connected piece of its flat part: the dot sits in the largest
     visible area, away from edges and slivers. For a subunit with several copies the copy with the largest piece is the main one; every copy whose piece
     is at least LABEL_AREA is kept as an alternative for the layout. The projected C-alpha centroid (from the coordinates, art/atp_V.anchors.json) is kept
     for reference and the distance to the anchor is logged ("moved"). Asserted: the anchor has at least EDGE_MIN px of flat surface around it.
  3. A subunit is labelled in the first view of VIEWS where its best copy shows at least LABEL_AREA px^2 (assert: some view does).
  4. Crop each view to its own box (same pixel scale), write art/atp_V__full_t.png and art/index.atp.json (the kit's index: size, aspect, anchors as
     fractions of the crop; anchor names lab_<subunit> only for the view that labels it).
  5. Check, on the cropped final PNG, that the pixel at every anchor has the tone of its subunit (within 8 levels per channel) and, on the cropped id map,
     that it belongs to the chain. Any miss raises an error.
Writes tables/anchors.csv (subunit, view, chain, visible area, centroid px, anchor px, moved, labelled).
"""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
ART = ROOT / "art"
VIEWS = ["A", "B"]
PAD = 8
EDGE_MIN = 24       # px of the render (40 px per mm at the size of the figure): a dot of 0.6 mm radius fits inside the flat surface
B_RATIO = 1.45      # a subunit is labelled in view B when B shows at least this many times its visible area in A
LABEL_AREA = 10000  # px^2 of flat surface: a subunit is labelled in a view when one copy shows at least this much (about 6 mm^2 in the figure)


def hexrgb(h: str) -> np.ndarray:
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)])


def decode(view: str, meta: dict):
    im = np.array(Image.open(ART / f"atp_{view}__id.png").convert("RGBA"))
    lv = np.array(meta["id_levels"])
    gain = meta["gain"]
    alpha = im[..., 3] > 128
    # expected pixel of level v: ChimeraX got round(v / gain) and its flat light multiplies by gain
    exp = np.minimum(255, np.round(np.round(lv / gain) * gain)).astype(np.float32)
    idx, err = [], np.zeros(alpha.shape, np.float32)
    for k in range(3):
        d = np.abs(im[..., k].astype(np.float32)[..., None] - exp[None, None, :])   # H x W x 4, one channel at a time
        idx.append(d.argmin(-1))
        err = np.maximum(err, d.min(-1))
    cid = idx[0] * 16 + idx[1] * 4 + idx[2]
    cid = np.where(alpha, cid, 0)
    bad = int(((err > 10) & alpha).sum())
    return cid, alpha, bad     # cid: integer id of the chain, 0 where nothing is drawn; meta["id_of"] maps a chain to its id


def main() -> None:
    stats = "--stats" in sys.argv
    sys.stdout.reconfigure(encoding="utf-8")
    COL = json.loads((HERE / "colours.json").read_text(encoding="utf-8"))
    VIEW = json.loads((ART / "view.json").read_text(encoding="utf-8"))
    for v in VIEWS:
        assert v in VIEW["views"], f"view {v} was not rendered: run render_atp.py views=A,B"
    subs = COL["subunits"] + [COL["unassigned"]]
    chain_sub = COL["chain_subunit"]
    pv = {}
    for v in VIEWS:
        meta = json.loads((ART / f"atp_{v}.anchors.json").read_text(encoding="utf-8"))
        owner, alpha, bad = decode(v, meta)
        assert bad < 0.001 * alpha.sum(), f"view {v}: {bad} of {alpha.sum()} pixels are not an id colour"
        res, copies = {}, {}
        final = np.array(Image.open(ART / f"atp_{v}__full.png").convert("RGBA")).astype(int)
        for s in subs:
            per = {}
            # flat = pixels of the final render that show the tone of the subunit: outlines (ink) and anti-aliased edges are not
            flat = (np.abs(final[..., :3] - hexrgb(s["hex"])).max(-1) <= 8) & (final[..., 3] == 255)
            for c in s["chains"]:
                own = owner == meta["id_of"][c]
                cx, cy = meta["chains"][c]["cent"]
                e = dict(subunit=s["key"], label=s["label"], chain=c, id_area=int(own.sum()), area=0, cent=[cx, cy], moved=None, anchor=None)
                lab, nlab = ndi.label(own & flat)          # the flat parts of this chain, as connected pieces
                if nlab:
                    sizes = ndi.sum(np.ones_like(lab), lab, index=range(1, nlab + 1))
                    k = int(np.argmax(sizes)) + 1           # the largest piece
                    piece = lab == k
                    dt = ndi.distance_transform_edt(np.pad(piece, 1))[1:-1, 1:-1]
                    ys, xs = np.nonzero(dt >= dt.max() - 1e-6)
                    j = int(np.argmin((xs - cx) ** 2 + (ys - cy) ** 2))     # deepest point of the piece (ties: nearest the projected centroid)
                    e["area"], e["anchor"] = int(sizes[k - 1]), [float(xs[j]), float(ys[j])]
                    e["moved"], e["edge_px"] = float(np.hypot(xs[j] - cx, ys[j] - cy)), float(dt.max())
                per[c] = e
            copies[s["key"]] = per
            res[s["key"]] = max(per.values(), key=lambda e: e["area"])     # the copy that shows most
        pv[v] = dict(meta=meta, owner=owner, alpha=alpha, res=res, copies=copies)
        if stats:
            print(f"--- view {v}: visible area (px^2) of the best copy, moved distance (px)")
            for s in subs:
                e = res[s["key"]]
                print(f"  {s['label']:11s} chain {e['chain']:2s} area {e['area']:8d} {'labelled-size' if e['area'] >= LABEL_AREA else 'small        '} moved {e['moved'] if e['moved'] is None else round(e['moved'])}")
    if stats:
        return
    # a subunit is labelled in view A unless view B shows at least B_RATIO times its visible area (or A shows less than LABEL_AREA of it)
    label_view = {}
    for s in subs:
        aA, aB = (pv[v]["res"][s["key"]]["area"] for v in VIEWS)
        v = "B" if (aB >= B_RATIO * aA and aB >= LABEL_AREA) or (aA < LABEL_AREA and aB >= LABEL_AREA) else "A"
        assert pv[v]["res"][s["key"]]["area"] >= LABEL_AREA, f"{s['key']} is not visible enough in any view"
        label_view[s["key"]] = v
    index, rows = {}, []
    for v in VIEWS:
        bb = Image.fromarray((pv[v]["alpha"] * 255).astype(np.uint8)).getbbox()
        W, H = VIEW["PW"], VIEW["PH"]
        box = (max(bb[0] - PAD, 0), max(bb[1] - PAD, 0), min(bb[2] + PAD, W), min(bb[3] + PAD, H))
        cw, ch = box[2] - box[0], box[3] - box[1]
        full = Image.open(ART / f"atp_{v}__full.png").convert("RGBA").crop(box)
        full.save(ART / f"atp_{v}__full_t.png")
        fa = np.array(full)
        ow = pv[v]["owner"][box[1]:box[3], box[0]:box[2]]
        idof = pv[v]["meta"]["id_of"]
        anchors, meta_out = {}, {"crop_box_px": list(box), "full_px": [W, H], "px_per_A": pv[v]["meta"]["px_per_A"]}
        for s in subs:
            e = pv[v]["res"][s["key"]]
            rows.append([v, s["key"], e["chain"], e["area"], "%.0f %.0f" % tuple(e["cent"]), "%.0f %.0f" % tuple(e["anchor"]) if e["anchor"] else "",
                         "" if e["moved"] is None else round(e["moved"]), round(e.get("edge_px", 0)), "yes" if label_view[s["key"]] == v else "no"])
            if label_view[s["key"]] != v:
                continue
            for c, ec in pv[v]["copies"][s["key"]].items():
                if ec["area"] < LABEL_AREA:
                    continue
                ax, ay = ec["anchor"][0] - box[0], ec["anchor"][1] - box[1]
                assert ec["edge_px"] >= EDGE_MIN, (v, s["key"], c, ec["edge_px"])
                nm = f"lab_{s['key']}" if c == e["chain"] else f"alt_{s['key']}_{c}"
                anchors[nm] = [round(ax / cw, 6), round(ay / ch, 6)]
                xi, yi = int(round(ax)), int(round(ay))
                assert ow[yi, xi] == idof[c], (v, s["key"], c, int(ow[yi, xi]), idof[c])
                assert chain_sub[c] == s["key"]
                got, want = fa[yi, xi, :3].astype(int), hexrgb(s["hex"])
                assert fa[yi, xi, 3] == 255 and np.abs(got - want).max() <= 8, (v, s["key"], c, got.tolist(), want.tolist())
                meta_out[f"px_{s['key']}_{c}"] = [round(ax, 1), round(ay, 1)]
                meta_out[f"moved_{s['key']}_{c}"] = round(ec["moved"], 1)
                meta_out[f"cent_px_{s['key']}_{c}"] = [round(ec["cent"][0] - box[0], 1), round(ec["cent"][1] - box[1], 1)]
            meta_out[f"chain_{s['key']}"] = e["chain"]
        index[f"atp_{v}__full"] = dict(w=cw, h=ch, ar=round(cw / ch, 5), anchors=anchors, meta=meta_out)
    (ART / "index.atp.json").write_text(json.dumps(index, indent=1), encoding="utf-8")
    with open(ROOT / "tables" / "anchors.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["view", "subunit", "chain", "visible_area_px2", "centroid_px", "anchor_px", "moved_px", "edge_distance_px", "labelled_here"])
        w.writerows(rows)
    for v in VIEWS:
        lab = [k for k, vv in label_view.items() if vv == v]
        moved = [(k, round(pv[v]["res"][k]["moved"])) for k in lab if pv[v]["res"][k]["moved"]]
        print(f"view {v}: crop {index[f'atp_{v}__full']['w']} x {index[f'atp_{v}__full']['h']} px; labels {len(lab)}: {lab}; moved off the centroid: {moved}")


if __name__ == "__main__":
    main()
