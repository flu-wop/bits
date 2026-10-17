"""Create the optimized web derivatives in img/ from the ORIGINAL files on the `capture` branch.
usage: git show capture --stat; git checkout capture -- capture/assets; python3 tools/prepare_assets.py capture/assets img
Same images, same base filenames; only resized/re-encoded."""
import sys, os
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
def rs(im, w):
    return im if im.width <= w else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
def webp(name, widths, q=78):
    im = Image.open(f'{src}/{name}').convert('RGB'); base = os.path.splitext(name)[0]
    for w in widths:
        rs(im, w).save(f'{out}/{base}-{w}.webp', 'WEBP', quality=q, method=6)
def jpg(name, w):
    im = Image.open(f'{src}/{name}').convert('RGB'); base = os.path.splitext(name)[0]
    rs(im, w).save(f'{out}/{base}-og.jpg', 'JPEG', quality=80, optimize=True, progressive=True)
# logo: lossy WebP q88 is ~4x smaller than re-encoded PNG with no visible loss on the checker
# (home logo is now the mic-"i" BITS logo: source/bts-logo-mic.png; its webps, the letters-only header mark and the
#  favicon are made by tools/make_letters.py and the PIL snippet in DESIGN.md / git history)
webp('bts-logos-06.png', [967], 80)
webp('SunShow24_-square_FINAL-1080-.jpg', [540, 1080], 80)
webp('IMG_2843-1.JPG', [800, 1600], 76)
webp('IMG_8177.JPG', [800, 1600], 76)
webp('1months6continent-1-8.jpg', [800, 1499], 68)
for n in ['IMG_8188.JPG', 'AA019A_2.jpg', 'R2_007.jpg']: jpg(n, 1200)

# favicon: now produced by tools/make_letters.py from source/bts-logo-mic.png
