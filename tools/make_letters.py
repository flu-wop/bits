"""Cut the flat-lime "b!ts" lettering out of her logo (bts-logos-03.png): no checker, no dark backdrop, transparent PNG/WebP.
usage: python3 tools/make_letters.py <path/to/bts-logos-03.png> img
The lettering is one flat colour sitting on the logo's dark panel, so each pixel is a mix of lime and that panel colour;
alpha is the lime share of the mix and the colour is set back to pure lime (no dark fringe on a black page)."""
import sys, os
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
im = np.asarray(Image.open(src).convert('RGB')).astype(float)
H, W, _ = im.shape

# sample the two colours from the image itself: lime from the letter interior, panel from the area above the letters
ys, xs = slice(int(H * 0.40), int(H * 0.72)), slice(int(W * 0.30), int(W * 0.70))
region = im[ys, xs]
lime_mask = (region[..., 1] > 190) & (region[..., 0] > 150) & (region[..., 2] < 140)
lime = np.median(region[lime_mask], axis=0)
panel = np.median(im[int(H * 0.10):int(H * 0.25), int(W * 0.35):int(W * 0.65)].reshape(-1, 3), axis=0)

# only look inside the dark panel around the letters, so the checker walls and floor can never leak in
box = (int(W * 0.30), int(H * 0.40), int(W * 0.70), int(H * 0.69))
x0, y0, x1, y1 = box
crop = im[y0:y1, x0:x1]
d = lime - panel
a = np.clip(((crop - panel) @ d) / (d @ d), 0, 1)
a[a < 0.06] = 0            # kill resampling noise in the panel
a[a > 0.94] = 1
# anything that is not a lime/panel mix (white or black checker pixels) is off the line between the two colours
resid = np.linalg.norm((crop - panel) - a[..., None] * d, axis=-1)
a[resid > 40] = 0

# keep only the letters: connected blobs of solid lime (b ! t s). Antialiased checker/panel edge pixels that slipped
# through are not part of any solid blob, so drop everything that does not touch one of them.
from scipy import ndimage
solid = a > 0.9
lab, n = ndimage.label(solid, structure=np.ones((3, 3)))
sizes = ndimage.sum(solid, lab, range(1, n + 1))
keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= 0.02 * sizes.max()])
near = ndimage.binary_dilation(keep, structure=np.ones((3, 3)), iterations=2)   # their own antialiased edge, 2px
a[~near] = 0

rgba = np.zeros((*a.shape, 4), dtype=np.uint8)
rgba[..., :3] = lime.round().astype(np.uint8)
rgba[..., 3] = (a * 255).round().astype(np.uint8)
img = Image.fromarray(rgba, 'RGBA')
img = img.crop(img.getchannel('A').getbbox())

# 2x of the 40px header slot, plus a larger one for retina desktop
for h in (80, 120):
    w = round(img.width * h / img.height)
    img.resize((w, h), Image.LANCZOS).save(f'{out}/bts-letters-{h}.webp', 'WEBP', quality=92, method=6, lossless=False, exact=True)
img.save(f'{out}/bts-letters-full.png', optimize=True)
print('lime', lime, 'panel', panel, 'letters', img.size)
