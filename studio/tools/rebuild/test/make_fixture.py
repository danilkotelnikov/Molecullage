from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


def main() -> None:
    out = Path(__file__).resolve().parent / "fixture.png"
    img = Image.new("RGB", (1200, 800), (255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Navy rectangle at (100, 100, 300, 200) -> x0=100, y0=100, x1=400, y1=300
    draw.rectangle([100, 100, 400, 300], fill=(20, 45, 95))

    # Black arrow from (450, 200) to (700, 200), 6 px wide, with a triangle head
    draw.line([(450, 200), (682, 200)], fill=(0, 0, 0), width=6)
    draw.polygon([(700, 200), (676, 188), (676, 212)], fill=(0, 0, 0))

    # Word "Gold" in Arial 48 px at (800, 170)
    font_path = Path(r"C:\Windows\Fonts\arial.ttf")
    if font_path.exists():
        font = ImageFont.truetype(str(font_path), 48)
    else:
        font = ImageFont.load_default()
    draw.text((800, 170), "Gold", fill=(20, 20, 20), font=font)

    # Filled circle of radius 60 at (300, 550), for tracing
    r = 60
    cx, cy = 300, 550
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(185, 135, 35))

    img.save(out)


if __name__ == "__main__":
    main()
