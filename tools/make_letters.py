"""Cut the "BiTS" lettering (with the microphone as the "i") out of source/bts-logo-mic.png:
no checker corridor, no dark panel, transparent WebP/PNG for the header mark, plus the square favicon.
usage: python3 tools/make_letters.py source/bts-logo-mic.png img

The lettering sits on the logo's flat dark panel, so a pixel is lettering when it differs from the panel colour.
Alpha ramps in over a small colour distance (soft antialiased edge); enclosed holes smaller than the mic-head mesh
are filled so dark bevel/mesh pixels do not punch holes; the big counters of the B stay transparent."""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
im = np.asarray(Image.open(src).convert('RGB')).astype(float)
H, W, _ = im.shape

# the dark panel colour, sampled from the empty panel above the lettering
panel = np.median(im[int(H * 0.22):int(H * 0.30), int(W * 0.38):int(W * 0.62)].reshape(-1, 3), axis=0)

# search only inside the panel around the lettering, so the checker walls and floor can never leak in
x0, y0, x1, y1 = int(W * 0.305), int(H * 0.37), int(W * 0.695), int(H * 0.625)
crop = im[y0:y1, x0:x1]
dist = np.linalg.norm(crop - panel, axis=-1)
alpha = np.clip((dist - 14) / (46 - 14), 0, 1)           # 0 at the panel colour, 1 once clearly different

solid = alpha > 0.5
# keep the letters: blobs that are a real share of the biggest one (drops stray antialiased checker-edge pixels)
lab, n = ndimage.label(ndimage.binary_closing(solid, structure=np.ones((3, 3)), iterations=2), structure=np.ones((3, 3)))
sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= 0.03 * sizes.max()])
# fill small enclosed holes (dark bevel / mic mesh) but not the counters of the B
filled = ndimage.binary_fill_holes(keep)
holes = filled & ~keep
hl, hn = ndimage.label(holes)
hs = ndimage.sum(np.ones_like(hl), hl, range(1, hn + 1))
for i, s in enumerate(hs, 1):
    if s < 900:                                           # px at source size; the B counters are far larger
        keep |= hl == i
near = ndimage.binary_dilation(keep, structure=np.ones((3, 3)), iterations=2)
alpha[~near] = 0
alpha[keep & (alpha < 1)] = np.maximum(alpha[keep & (alpha < 1)], 0.0)
alpha[ndimage.binary_erosion(keep, iterations=2)] = 1      # fully opaque inside the lettering

rgba = np.zeros((*alpha.shape, 4), dtype=np.uint8)
rgba[..., :3] = crop.clip(0, 255).astype(np.uint8)
rgba[..., 3] = (alpha * 255).round().astype(np.uint8)
img = Image.fromarray(rgba, 'RGBA')
img = img.crop(img.getchannel('A').getbbox())

# header mark: 2x / 3x of the 40px slot
for h in (80, 120):
    w = round(img.width * h / img.height)
    img.resize((w, h), Image.LANCZOS).save(f'{out}/bts-letters-{h}.webp', 'WEBP', quality=92, method=6, exact=True)
img.save(f'{out}/bts-letters-full.png', optimize=True)

# favicon: the lettering centred on black in a square
side = 180; pad = 10
fw = side - 2 * pad; fh = round(img.height * fw / img.width)
tile = Image.new('RGBA', (side, side), (0, 0, 0, 255))
tile.alpha_composite(img.resize((fw, fh), Image.LANCZOS), (pad, (side - fh) // 2))
tile.convert('RGB').save(f'{out}/favicon.png', optimize=True)
print('panel', panel.round(), 'letters', img.size)
