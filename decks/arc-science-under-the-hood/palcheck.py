"""Measure a rendered colour against the palette: py -3 palcheck.py frame.png x0,y0,x1,y1 #hex [more regions].
Takes the pixels closest in hue to the hex inside the region, reads their brightest quarter (the lit side) and prints delta E 2000."""
import sys
import numpy as np
from PIL import Image
from skimage.color import rgb2lab, deltaE_ciede2000

im = np.asarray(Image.open(sys.argv[1]).convert('RGB'), float) / 255
args = sys.argv[2:]
for box, hexc in zip(args[0::2], args[1::2]):
    x0, y0, x1, y1 = map(int, box.split(','))
    px = im[y0:y1, x0:x1].reshape(-1, 3)
    want = np.array([int(hexc[i:i + 2], 16) for i in (1, 3, 5)], float)[None] / 255
    lab, wl = rgb2lab(px[None])[0], rgb2lab(want[None])[0]
    hue = np.hypot(*(lab[:, 1:] / np.maximum(np.linalg.norm(lab[:, 1:], axis=1, keepdims=True), 1e-6) - wl[:, 1:] / max(np.linalg.norm(wl[:, 1:]), 1e-6)).T)
    keep = lab[(hue < 0.45) & (lab[:, 0] > 30)]   # the page behind is darker than this
    if len(keep) < 50:
        print(box, hexc, 'too few pixels of that hue', len(keep)); continue
    top = keep[keep[:, 0] >= np.percentile(keep[:, 0], 75)]
    m = np.median(top, 0)
    print(box, hexc, 'lit L', round(float(m[0]), 1), 'target L', round(float(wl[0, 0]), 1), 'dE', round(float(deltaE_ciede2000(m[None], wl)[0]), 1), 'pixels', len(keep))
