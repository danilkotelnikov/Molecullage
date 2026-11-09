import json
import sys
import unittest
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

TEST_DIR = Path(__file__).resolve().parent
REBUILD_DIR = TEST_DIR.parent
if str(REBUILD_DIR) not in sys.path:
    sys.path.insert(0, str(REBUILD_DIR))

from score import compute_score, letterbox_image  # noqa: E402


class TestScore(unittest.TestCase):
    def setUp(self):
        self.fixture_png = TEST_DIR / "fixture.png"
        self.fixture_reading = json.loads((TEST_DIR / "fixture.reading.json").read_text(encoding="utf-8"))

    def test_identical(self):
        with Image.open(self.fixture_png) as orig:
            reb = letterbox_image(orig, (255, 255, 255))
            res = compute_score(orig, reb, self.fixture_reading, "#FFFFFF")
        self.assertAlmostEqual(res["mad_score"], 1.0, places=9)
        self.assertAlmostEqual(res["edge_iou"], 1.0, places=9)

    def test_inverted(self):
        black = Image.new("RGB", (1920, 1080), (0, 0, 0))
        white = Image.new("RGB", (1920, 1080), (255, 255, 255))
        res = compute_score(black, white, {"width": 1920, "height": 1080, "parts": []}, "#FFFFFF")
        self.assertAlmostEqual(res["mad_score"], 0.0, places=9)

    def test_both_blank(self):
        w1 = Image.new("RGB", (1920, 1080), (255, 255, 255))
        w2 = Image.new("RGB", (1920, 1080), (255, 255, 255))
        res = compute_score(w1, w2, {"width": 1920, "height": 1080, "parts": []}, "#FFFFFF")
        self.assertAlmostEqual(res["edge_iou"], 1.0, places=9)

    def test_shift(self):
        with Image.open(self.fixture_png) as orig:
            reb = letterbox_image(orig, (255, 255, 255))
            shifted = ImageChops.offset(reb, 10, 0)
            res = compute_score(orig, shifted, self.fixture_reading, "#FFFFFF")
        self.assertLess(res["edge_iou"], 0.5)
        self.assertGreater(res["mad_score"], 0.9)

    def test_rebuild_size(self):
        with Image.open(self.fixture_png) as orig:
            bad_reb = Image.new("RGB", (1200, 800), (255, 255, 255))
            with self.assertRaises(ValueError) as ctx:
                compute_score(orig, bad_reb, self.fixture_reading, "#FFFFFF")
        msg = str(ctx.exception)
        self.assertIn("1200x800", msg)
        self.assertIn("1920x1080", msg)

    def test_letterbox_portrait(self):
        orig = Image.new("RGB", (800, 1200), (255, 255, 255))
        draw = ImageDraw.Draw(orig)
        draw.rectangle([200, 300, 600, 700], fill=(0, 0, 0))

        resized = orig.resize((720, 1080), Image.Resampling.LANCZOS)
        reb = Image.new("RGB", (1920, 1080), (255, 255, 255))
        reb.paste(resized, (600, 0))

        res = compute_score(orig, reb, {"width": 800, "height": 1200, "parts": []}, "#FFFFFF")
        self.assertAlmostEqual(res["mad_score"], 1.0, places=9)
        self.assertAlmostEqual(res["edge_iou"], 1.0, places=9)

    def test_parts_sorted(self):
        orig = Image.new("RGB", (1920, 1080), (255, 255, 255))
        reb = Image.new("RGB", (1920, 1080), (255, 255, 255))
        draw = ImageDraw.Draw(reb)
        # Make part 'bad' black on reb while 'good' stays white
        draw.rectangle([100, 100, 200, 200], fill=(0, 0, 0))
        reading = {
            "width": 1920,
            "height": 1080,
            "parts": [
                {"id": "good", "box": [400, 400, 100, 100]},
                {"id": "bad", "box": [100, 100, 100, 100]},
            ],
        }
        res = compute_score(orig, reb, reading, "#FFFFFF")
        self.assertEqual(res["parts"][0]["id"], "bad")
        self.assertEqual(res["parts"][1]["id"], "good")


if __name__ == "__main__":
    unittest.main()
