"""Layout of the left block (a snake plot, b 3D view) of gallery piece 06-gpcr-snake-plot.

    py -3 -I gallery/06-gpcr-snake-plot/src/layout.py

Needs data/pdb/7F61.cif (fetch_data.py), src/view.json (choose_view.py) and art/index.h3r.json + art/h3r.anchors.json (render_h3r.py, then struct/trim.py).
Writes
  page/snake_layer.svg   one circle per residue (ids res<number>), the dashed ICL3 gap, the dashed N-terminal stub and the N11Q marker
  page/layout_data.js    window.LAYOUT: every position the page draws or checks, in page millimetres (x right, t down)
  tables/helices.csv, tables/sites.csv, tables/snake_residues.csv   what the figure draws, from the coordinates
Each site has a numbered badge beside its circle in the snake plot (the number is the link to panels b and c) and, in the 3D picture, a dot on the residue (centroid of the
side-chain atoms, checked against the projection of the coordinates) joined by a short straight leader to a badge. The badge place is the best of a ring of candidates
(directions 10 degrees apart, 5.5 to 10 mm long): least ink of the render under the badge and the leader, clear of the other residues, badges and leaders.
Stops with an AssertionError when an anchor is off its residue, a leader crosses another or a circle or badge touches another.
"""
from __future__ import annotations

import csv
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from common import H, INK, T_SNAKE, W, XL0, XL1  # noqa: E402
from snake import R_BADGE, R_BEAD, R_SITE, build  # noqa: E402
from structure import load  # noqa: E402

GAL = HERE.parent
PAGE, TAB, ART = GAL / "page", GAL / "tables", GAL / "art"
TOK = json.loads((GAL.parents[1] / "tokens" / "tokens.base.json").read_text(encoding="utf-8"))["color"]["family"]
MINT_F, MINT_E = TOK["mint"]["fill"], TOK["mint"]["edge"]
APR_F, APR_E = TOK["apricot"]["fill"], TOK["apricot"]["edge"]
IMG_X_LEFT = 23.0            # left edge of the 3D picture on the page
KEY_X = 75.5                 # the key to the sites starts here, right of the picture
CHAR = 1.15                  # mm per character of 6.55 pt Arial (estimate for the placement of labels)


def seg_dist(p, a, b):
    p, a, b = np.asarray(p, float), np.asarray(a, float), np.asarray(b, float)
    ab = b - a
    t = 0.0 if not ab.any() else float(np.clip((p - a) @ ab / (ab @ ab), 0, 1))
    return float(np.linalg.norm(p - (a + t * ab)))


def seg_cross(a, b, c, d):
    o = lambda p, q, r: (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
    return o(a, b, c) * o(a, b, d) < 0 and o(c, d, a) * o(c, d, b) < 0


def rect_circle_gap(rect, c, r):
    l, t, rr, b = rect
    dx, dy = max(l - c[0], 0, c[0] - rr), max(t - c[1], 0, c[1] - b)
    return math.hypot(dx, dy) - r


def main():
    S = load()
    G = build(S, t_top=T_SNAKE)
    V = json.loads((HERE / "view.json").read_text(encoding="utf-8"))
    A = json.loads((ART / "h3r.anchors.json").read_text(encoding="utf-8"))
    IDX = json.loads((ART / "index.h3r.json").read_text(encoding="utf-8"))["h3r__full"]
    S3D, ppa = V["scale_mm_per_A"], A["px_per_A"]
    w_mm, h_mm = IDX["w"] / ppa * S3D, IDX["h"] / ppa * S3D
    beads, sites = G["beads"], G["sites"]
    snake_bottom = max(b["t"] for b in beads.values()) + R_BEAD
    gap = G["gap"]
    p0, p1 = np.array(gap["p0"]), np.array(gap["p1"])
    ctrl = np.array([(p0[0] + p1[0]) / 2, max(p0[1], p1[1]) + 5.0])
    a0, a1 = p0 + np.array([0, R_BEAD]), p1 + np.array([0, R_BEAD])
    gap_mid = 0.25 * a0 + 0.5 * ctrl + 0.25 * a1
    TB = snake_bottom + 3.0                                    # top of the panel b title row
    img_l, img_t = IMG_X_LEFT, TB + 3.2

    o_px = np.array(A["origin"])
    # the picture is placed so that its left edge is IMG_X_LEFT; page position of a render pixel
    ox, oy = IDX["anchors"]["origin"]
    origin_page = (img_l + ox * w_mm, img_t + oy * h_mm)

    def canvas_to_page(px):
        return (origin_page[0] + S3D * (px[0] - o_px[0]) / ppa, origin_page[1] + S3D * (px[1] - o_px[1]) / ppa)

    def page_of(frac):
        return (img_l + frac[0] * w_mm, img_t + frac[1] * h_mm)

    # ------------------------------------------------------------ the anchors in the 3D picture, checked against the coordinates
    R, centre = np.array(V["R"]), np.array(V["centre"])
    anchors, worst, worst_img = [], 0.0, 0.0
    for i, s in enumerate(S["sites"], start=1):
        got = canvas_to_page(A[f"site{i}_side"])
        a = (s["side"] - centre) @ R.T
        exp = (origin_page[0] + S3D * a[0], origin_page[1] - S3D * a[1])
        worst = max(worst, abs(got[0] - exp[0]), abs(got[1] - exp[1]))
        fr = page_of(IDX["anchors"][f"site{i}_side"])
        worst_img = max(worst_img, abs(got[0] - fr[0]), abs(got[1] - fr[1]))
        anchors.append(got)
    assert worst < 0.1, f"the ChimeraX anchors differ from the projection of the coordinates by {worst:.3f} mm"
    assert worst_img < 0.02, f"the picture is not where the anchors say it is ({worst_img:.3f} mm)"
    for k, s in enumerate(sites):
        s["anchor"] = anchors[k]

    # ------------------------------------------------------------ numbered badge on a short leader for each residue in the picture
    alpha = np.asarray(Image.open(ART / "h3r__full_t.png").convert("RGBA").getchannel("A")).astype(float) / 255.0
    ph, pw = alpha.shape

    def ink(x, t):
        u, v = int((x - img_l) / w_mm * pw), int((t - img_t) / h_mm * ph)
        return alpha[v, u] if 0 <= u < pw and 0 <= v < ph else 0.0

    def ink_disc(c, r):
        return float(np.mean([ink(c[0] + r * f * math.cos(a), c[1] + r * f * math.sin(a)) for f in (0, 0.6, 1) for a in np.linspace(0, 2 * math.pi, 8, endpoint=False)]))

    def ink_seg(a, b):
        return float(np.mean([ink(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u) for u in np.linspace(0, 1, 15)]))

    placed = {}
    order = [0, 2, 3, 1]                                       # the three sites close together first, the lone one last
    for k in order:
        an = np.array(anchors[k])
        others = [np.array(anchors[j]) for j in range(4) if j != k]
        away = an - np.mean(others, axis=0)
        away = away / (np.linalg.norm(away) or 1.0)
        best = None
        for deg in range(0, 360, 10):
            u = np.array([math.cos(math.radians(deg)), math.sin(math.radians(deg))])
            for L in (5.5, 7.0, 8.5, 10.0):
                c = an + u * L
                if not (IMG_X_LEFT - 1.0 <= c[0] <= KEY_X - 2.2 and c[1] >= img_t - 1.0):
                    continue
                s0, s1 = an + u * 0.8, c - u * (R_BADGE + 0.05)
                if any(np.linalg.norm(c - o) < R_BADGE + 2.2 for o in others):
                    continue
                if any(np.linalg.norm(c - np.array(placed[j][0])) < 2 * R_BADGE + 1.8 for j in placed):
                    continue
                if any(seg_dist(o, s0, s1) < 1.3 for o in others):
                    continue
                if any(seg_dist(np.array(placed[j][0]), s0, s1) < R_BADGE + 0.8 or seg_cross(s0, s1, np.array(placed[j][1][0]), np.array(placed[j][1][1])) or
                       seg_dist(c, np.array(placed[j][1][0]), np.array(placed[j][1][1])) < R_BADGE + 0.8 for j in placed):
                    continue
                score = 6.0 * ink_disc(c, R_BADGE) + 2.0 * ink_seg(s0, s1) + 0.18 * L + 0.9 * (1 - float(u @ away))
                if best is None or score < best[0]:
                    best = (score, tuple(c), (tuple(s0), tuple(s1)))
        assert best, f"no free place for the badge of site {k + 1} in the picture"
        placed[k] = (best[1], best[2])
    for a in range(4):
        for b in range(a + 1, 4):
            assert not seg_cross(*placed[a][1], *placed[b][1]), (a + 1, b + 1)

    # ------------------------------------------------------------ labels of the helices, directly above the top of each column (or of the loop that rises from it)
    cols, tm = G["cols"], G["tm"]
    texts_in_snake = []                                        # rectangles (l, t, r, b) already taken by labels
    circles = [(b["x"], b["t"], R_SITE if i in {s["num"] for s in sites} else R_BEAD) for i, b in beads.items()]
    badge_discs = [(s["badge"][0], s["badge"][1], R_BADGE) for s in sites]
    tmlab = []
    for k, (a_, b_) in enumerate(tm):
        ts = [beads[i]["t"] for i in range(a_, b_ + 1)]
        top = min(ts)
        if k == 3:                                             # TM4: the ECL2 hairpin rises from its top; the label goes above the hairpin
            top = min(beads[i]["t"] for i in range(G["loops"]["ECL2"]["a"], G["loops"]["ECL2"]["b"] + 1))
        wlab, hlab = 3 * CHAR + 0.2, 2.5
        found = None
        for dt in (3.3, 4.0, 4.7, 5.4, 6.1, 6.8):
            for dx in (0.0, 1.6, -1.6, 3.2, -3.2, 4.8, -4.8):
                cx, cy = cols[k] + dx, top - R_BEAD - dt
                rect = (cx - wlab / 2, cy - hlab / 2, cx + wlab / 2, cy + hlab / 2)
                if rect[0] < 1.5 or rect[1] < 15.8:
                    continue
                if any(rect_circle_gap(rect, (c[0], c[1]), c[2]) < 0.45 for c in circles + badge_discs):
                    continue
                if any(not (rect[2] < r[0] - 0.3 or r[2] < rect[0] - 0.3 or rect[3] < r[1] - 0.3 or r[3] < rect[1] - 0.3) for r in texts_in_snake):
                    continue
                found = (cx, cy)
                break
            if found:
                break
        assert found, f"no place for the label of TM{k + 1}"
        texts_in_snake.append((found[0] - wlab / 2, found[1] - hlab / 2, found[0] + wlab / 2, found[1] + hlab / 2))
        tmlab.append(dict(name=f"TM{k + 1}", x=found[0], t=found[1], start=a_, end=b_, x_col=cols[k], t_top=min(ts), t_bot=max(ts), n=b_ - a_ + 1))

    # ------------------------------------------------------------ SVG layer of the snake plot (page millimetres)
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}mm" height="{H}mm" viewBox="0 0 {W} {H}" id="snake_layer">']
    out.append(f'<g id="snake" stroke-width="0.18" stroke="{MINT_E}">')
    site_nums = {s["num"] for s in S["sites"]}
    for i in sorted(beads):
        if i in site_nums:
            continue
        b = beads[i]
        fill = MINT_F if b["helix_record"] else "#FFFFFF"
        dash = "" if b["resolved"] else ' stroke-dasharray="0.45 0.3"'
        out.append(f'<circle id="res{i}" cx="{b["x"]:.3f}" cy="{b["t"]:.3f}" r="{R_BEAD}" fill="{fill}"{dash}/>')
    out.append("</g>")
    out.append(f'<path id="icl3_gap" d="M{a0[0]:.3f} {a0[1]:.3f} Q{ctrl[0]:.3f} {ctrl[1]:.3f} {a1[0]:.3f} {a1[1]:.3f}" fill="none" stroke="{INK}" stroke-width="0.3" stroke-dasharray="0.9 0.7"/>')
    ns = G["nstub"]
    n0, dv = np.array(ns["p0"]), np.array(ns["dir"])
    nd0, nd1 = n0 + dv * R_BEAD, n0 + dv * ns["dash_len"]
    msz = 2.4
    nm = n0 + dv * (ns["dash_len"] + msz / 2 + 0.2)
    assert nm[0] - msz / 2 >= 1.5, nm
    out.append(f'<line id="nterm_dash" x1="{nd0[0]:.3f}" y1="{nd0[1]:.3f}" x2="{nd1[0]:.3f}" y2="{nd1[1]:.3f}" stroke="{INK}" stroke-width="0.3" stroke-dasharray="0.9 0.7"/>')
    out.append(f'<rect id="n11q_marker" x="{nm[0] - msz / 2:.3f}" y="{nm[1] - msz / 2:.3f}" width="{msz}" height="{msz}" fill="#FFFFFF" stroke="{INK}" stroke-width="0.3"/>')
    out.append(f'<g id="sites" stroke-width="0.25" stroke="{APR_E}">')
    for s in sites:
        out.append(f'<circle id="res{s["num"]}" cx="{s["bead"][0]:.3f}" cy="{s["bead"][1]:.3f}" r="{R_SITE}" fill="{APR_F}"/>')
    out.append("</g></svg>")
    PAGE.mkdir(exist_ok=True)
    (PAGE / "snake_layer.svg").write_text("\n".join(out), encoding="utf-8")

    # ------------------------------------------------------------ helix 8 bracket
    h8 = G["h8"]
    xa, xb = beads[h8["first"]]["x"], beads[h8["last"]]["x"]
    bracket = dict(x0=xa - R_BEAD, x1=xb + R_BEAD, t=h8["t_row"] + 2.6, tick=0.8, mid=(xa + xb) / 2)

    # ------------------------------------------------------------ data for the page
    D = dict(
        W=W, H=H, TB=TB, KEY_X=KEY_X,
        img=dict(name="h3r__full", x_left=img_l, t_top=img_t, w=w_mm, h=h_mm, scale=S3D, phi=V["phi_deg"], tilt=V["tilt_deg"]),
        sites=[dict(n=s["n"], num=s["num"], wt=s["wt"], mut=s["mut"], bw=s["bw"], where=s["where"], bead=s["bead"], badge=s["badge"], anchor=s["anchor"],
                    tag=placed[k][0], tagseg=placed[k][1]) for k, s in enumerate(sites)],
        beads=[[i, round(b["x"], 3), round(b["t"], 3), int(b["helix_record"]), int(b["resolved"])] for i, b in sorted(beads.items())],
        cols=cols, tm=tmlab, loops=G["loops"], gap=dict(a0=a0.tolist(), a1=a1.tolist(), ctrl=ctrl.tolist(), mid=gap_mid.tolist(), n=gap["n_deleted"], rng=gap["deleted"]),
        nstub=dict(p0=n0.tolist(), dir=dv.tolist(), marker=nm.tolist(), size=msz), h8=bracket, r_bead=R_BEAD, r_site=R_SITE, r_badge=R_BADGE,
        fit_dev=G["fit_dev"], anchor_check_mm=round(worst, 4), n_beads=len(beads), snake_t=[min(b["t"] for b in beads.values()), snake_bottom],
        last_bead=[beads[max(beads)]["x"], beads[max(beads)]["t"]], tail_x=cols[6],
    )
    (PAGE / "layout_data.js").write_text("window.LAYOUT = " + json.dumps(D, separators=(",", ":")) + ";\n", encoding="utf-8")

    # ------------------------------------------------------------ tables
    TAB.mkdir(exist_ok=True)
    with open(TAB / "helices.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["helix", "first_residue", "last_residue", "residues", "deposited_records", "fit_deviation_A"])
        for k, h in enumerate(S["tm"]):
            w.writerow([f"TM{k + 1}", h["start"], h["end"], h["end"] - h["start"] + 1, "+".join(h["parts"]), G["fit_dev"][k]])
        for rid, a_, b_ in S["short"]:
            w.writerow([f"short helix ({'helix 8' if rid in ('HELX_P12', 'HELX_P13') else 'loop'})", a_, b_, b_ - a_ + 1, rid, ""])
    with open(TAB / "sites.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["badge", "residue", "number", "mutation", "generic_number_in_paper", "where", "z_CA_A", "anchor_x_mm", "anchor_t_mm"])
        for k, s in enumerate(S["sites"]):
            w.writerow([s["n"], s["wt"], s["num"], s["wt"] + str(s["num"]) + s["mut"], s["bw"], s["helix"], round(s["z"], 2), round(anchors[k][0], 2), round(anchors[k][1], 2)])
    with open(TAB / "snake_residues.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["number", "aa", "in_helix_record", "has_coordinates", "x_mm", "t_mm", "part"])
        for i, b in sorted(beads.items()):
            w.writerow([i, b["aa"], int(b["helix_record"]), int(b["resolved"]), round(b["x"], 3), round(b["t"], 3), b["where"]])
    print("circles", len(beads), "| anchors agree with the coordinates to", round(worst, 3), "mm | badge leaders (mm):",
          [round(float(np.linalg.norm(np.array(placed[k][0]) - np.array(anchors[k]))), 1) for k in range(4)])
    print("3D picture: left %.1f top %.1f w %.1f h %.1f mm (bottom %.1f); snake bottom %.1f, TB %.1f" % (img_l, img_t, w_mm, h_mm, img_t + h_mm, snake_bottom, TB))


if __name__ == "__main__":
    main()
