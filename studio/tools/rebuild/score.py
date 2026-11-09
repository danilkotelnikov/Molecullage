import argparse
import json
import sys
from pathlib import Path
import numpy as np
from PIL import Image


def hex_to_rgb(hex_str: str):
    h = hex_str.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def letterbox_params(w: int, h: int):
    s = min(1920.0 / w, 1080.0 / h)
    ox = (1920.0 - w * s) / 2.0
    oy = (1080.0 - h * s) / 2.0
    return s, ox, oy


def letterbox_image(img: Image.Image, bg_rgb=(255, 255, 255)) -> Image.Image:
    w, h = img.size
    if (w, h) == (1920, 1080):
        return img.convert("RGB")
    s, ox, oy = letterbox_params(w, h)
    nw = max(1, int(round(w * s)))
    nh = max(1, int(round(h * s)))
    resized = img.convert("RGB").resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (1920, 1080), bg_rgb)
    canvas.paste(resized, (int(round(ox)), int(round(oy))))
    return canvas


def sobel_edges(gray: np.ndarray) -> np.ndarray:
    # 3x3 Sobel kernels on float grey image in [0, 255]
    p = np.pad(gray, 1, mode="edge")
    gx = (
        -1.0 * p[:-2, :-2] + 1.0 * p[:-2, 2:]
        - 2.0 * p[1:-1, :-2] + 2.0 * p[1:-1, 2:]
        - 1.0 * p[2:, :-2] + 1.0 * p[2:, 2:]
    )
    gy = (
        -1.0 * p[:-2, :-2] - 2.0 * p[:-2, 1:-1] - 1.0 * p[:-2, 2:]
        + 1.0 * p[2:, :-2] + 2.0 * p[2:, 1:-1] + 1.0 * p[2:, 2:]
    )
    mag = np.hypot(gx, gy)
    return mag > 64.0


def compute_score(orig_img: Image.Image, reb_img: Image.Image, reading: dict, bg_hex: str = "#FFFFFF") -> dict:
    if reb_img.size != (1920, 1080):
        raise ValueError(
            f"rebuild image must be 1920x1080, got {reb_img.size[0]}x{reb_img.size[1]} (original is {orig_img.size[0]}x{orig_img.size[1]})"
        )

    bg_rgb = hex_to_rgb(bg_hex)
    orig_1080 = letterbox_image(orig_img, bg_rgb).convert("L")
    reb_l = reb_img.convert("L")

    a = np.asarray(orig_1080, dtype=np.float64)
    b = np.asarray(reb_l, dtype=np.float64)

    mad = float(np.mean(np.abs(a - b))) / 255.0
    mad_score = max(0.0, min(1.0, 1.0 - mad))

    edges_a = sobel_edges(a)
    edges_b = sobel_edges(b)
    union = int(np.sum(edges_a | edges_b))
    if union == 0:
        edge_iou = 1.0
    else:
        inter = int(np.sum(edges_a & edges_b))
        edge_iou = float(inter) / float(union)

    w_orig = int(reading.get("width", orig_img.size[0]))
    h_orig = int(reading.get("height", orig_img.size[1]))
    s, ox, oy = letterbox_params(w_orig, h_orig)

    parts_out = []
    for p in reading.get("parts", []):
        bx, by, bw, bh = p["box"]
        x0 = max(0, min(1919, int(round(bx * s + ox))))
        y0 = max(0, min(1079, int(round(by * s + oy))))
        x1 = max(x0 + 1, min(1920, int(round((bx + bw) * s + ox))))
        y1 = max(y0 + 1, min(1080, int(round((by + bh) * s + oy))))
        sub_a = a[y0:y1, x0:x1]
        sub_b = b[y0:y1, x0:x1]
        p_mad = (float(np.mean(np.abs(sub_a - sub_b))) / 255.0) if sub_a.size > 0 else 0.0
        parts_out.append({"id": p["id"], "mad_score": max(0.0, min(1.0, 1.0 - p_mad))})

    parts_out.sort(key=lambda item: item["mad_score"])
    return {
        "mad_score": mad_score,
        "edge_iou": edge_iou,
        "parts": parts_out,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("original")
    parser.add_argument("rebuild")
    parser.add_argument("reading")
    parser.add_argument("out")
    parser.add_argument("--bg", default="#FFFFFF")
    args = parser.parse_args()

    with Image.open(args.original) as orig_img, Image.open(args.rebuild) as reb_img:
        reading = json.loads(Path(args.reading).read_text(encoding="utf-8"))
        res = compute_score(orig_img, reb_img, reading, args.bg)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(res, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
