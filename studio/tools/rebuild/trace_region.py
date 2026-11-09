import re
import sys
from pathlib import Path
from PIL import Image


def rgb_to_hex(rgb):
    return f"#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}"


def fallback_svg(crop: Image.Image) -> str:
    w, h = crop.size
    px = crop.convert("RGB").load()
    bg = px[0, 0]

    def diff(c1, c2):
        return abs(c1[0] - c2[0]) + abs(c1[1] - c2[1]) + abs(c1[2] - c2[2])

    row_spans = []
    r_sum = g_sum = b_sum = count = 0
    for y in range(h):
        lx = -1
        rx = -1
        for x in range(w):
            c = px[x, y]
            if diff(c, bg) > 24:
                if lx < 0:
                    lx = x
                rx = x
                r_sum += c[0]
                g_sum += c[1]
                b_sum += c[2]
                count += 1
        if lx >= 0:
            row_spans.append((y, lx, rx + 1))

    if count == 0 or not row_spans:
        return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" data-bg="{rgb_to_hex(bg)}"></svg>'

    fill_hex = rgb_to_hex((r_sum // count, g_sum // count, b_sum // count))
    # Build contour polygon along right edge down, then left edge up (sampled every 2 rows for compact SVG)
    step = max(1, len(row_spans) // 32)
    sampled = row_spans[::step]
    if sampled[-1] != row_spans[-1]:
        sampled.append(row_spans[-1])

    pts = []
    for y, lx, _rx in [sampled[0]]:
        pts.append((lx, y))
    for y, _lx, rx in sampled:
        pts.append((rx, y))
    for y, lx, _rx in reversed(sampled):
        pts.append((lx, y + 1))

    cmds = [f"M{pts[0][0]} {pts[0][1]}"] + [f"L{px_x} {px_y}" for (px_x, px_y) in pts[1:]] + ["Z"]
    d = " ".join(cmds)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" data-bg="{rgb_to_hex(bg)}">\n'
        f'<path d="{d}" fill="{fill_hex}" transform="translate(0,0)"/>\n'
        f"</svg>\n"
    )


def main():
    if len(sys.argv) < 7:
        print("Usage: trace_region.py <png> <x> <y> <w> <h> <out.svg>", file=sys.stderr)
        sys.exit(1)

    png_path = Path(sys.argv[1]).resolve()
    x, y, w, h = int(float(sys.argv[2])), int(float(sys.argv[3])), int(float(sys.argv[4])), int(float(sys.argv[5]))
    out_svg = Path(sys.argv[6]).resolve()
    out_svg.parent.mkdir(parents=True, exist_ok=True)

    img = Image.open(png_path).convert("RGB")
    crop = img.crop((x, y, x + w, y + h))
    bg_rgb = crop.getpixel((0, 0))
    bg_hex = rgb_to_hex(bg_rgb).lower()

    # Check if the crop is completely uniform (blank region)
    extrema = crop.getextrema()
    if all(lo == hi for (lo, hi) in extrema):
        out_svg.write_text(
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" data-bg="{bg_hex}"></svg>\n',
            encoding="utf-8",
        )
        return

    crop_file = out_svg.with_suffix(".crop.png")
    crop.save(crop_file)
    try:
        import vtracer  # type: ignore

        vtracer.convert_image_to_svg_py(
            str(crop_file),
            str(out_svg),
            colormode="color",
            mode="spline",
            filter_speckle=4,
            color_precision=6,
            layer_difference=16,
            corner_threshold=60,
            length_threshold=4.0,
            splice_threshold=45,
            path_precision=3,
        )
        svg_text = out_svg.read_text(encoding="utf-8")
        kept_lines = []
        for line in svg_text.splitlines():
            m = re.search(r'fill="([^"]+)"', line, re.IGNORECASE)
            if "<path" in line and m and m.group(1).lower() == bg_hex:
                continue
            kept_lines.append(line)
        out_svg.write_text("\n".join(kept_lines) + "\n", encoding="utf-8")
    except Exception:
        out_svg.write_text(fallback_svg(crop), encoding="utf-8")
    finally:
        if crop_file.exists():
            crop_file.unlink()


if __name__ == "__main__":
    main()
