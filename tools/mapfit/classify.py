"""Classify each hex of the board by its printed colour and symbol. Writes classes.json and
lettered overlay tiles for checking."""
import json, sys
import numpy as np
from PIL import Image, ImageDraw

SRC, OUT = sys.argv[1], sys.argv[2]
data = json.load(open(f"{OUT}/centres.json"))
SCALE = data["scale"]
im = Image.open(SRC).convert("RGB")
W0, H0 = im.size
im = im.resize((W0 // SCALE, H0 // SCALE), Image.BOX)
a = np.asarray(im).astype(np.int32)
H, W = a.shape[:2]
R = data["rowpitch"] / SCALE / 1.5
Rf, Gf, Bf = a[..., 0], a[..., 1], a[..., 2]
lum = (299 * Rf + 587 * Gf + 114 * Bf) // 1000
blue = (Bf > Rf + 40) & (Bf > Gf + 5)
brown = (Rf > Bf + 30) & (Rf > Gf + 12) & (lum < 170)
brownsym = (Rf - Bf > 35) & (Rf - Gf > 20) & (lum < 150) & (Rf > 60)
green = (Gf > Rf + 20) & (Gf > Bf + 20)
black = (lum < 70) & (np.abs(Rf - Gf) < 25) & (np.abs(Gf - Bf) < 25)

yy, xx = np.mgrid[0:H, 0:W]

def disk(cx, cy, r0, r1):
    d2 = (xx - cx) ** 2 + (yy - cy) ** 2
    return (d2 >= r0 * r0) & (d2 < r1 * r1)

classes = {}
for hid, (fx, fy) in data["centres"].items():
    cx, cy = fx / SCALE, fy / SCALE
    if cx < 0 or cy < 0 or cx >= W or cy >= H:
        continue
    x0, x1 = int(max(0, cx - R)), int(min(W, cx + R + 1))
    y0, y1 = int(max(0, cy - R)), int(min(H, cy + R + 1))
    sl = (slice(y0, y1), slice(x0, x1))
    d2 = (xx[sl] - cx) ** 2 + (yy[sl] - cy) ** 2
    inner = d2 < (0.55 * R) ** 2
    ring = (d2 >= (0.72 * R) ** 2) & (d2 < (0.92 * R) ** 2)
    whole = d2 < (0.92 * R) ** 2
    n_in, n_ring, n_whole = inner.sum(), ring.sum(), whole.sum()
    f_blue = blue[sl][whole].sum() / n_whole
    f_brown = brown[sl][whole].sum() / n_whole
    f_black = black[sl][whole].sum() / n_whole
    f_green_ring = green[sl][ring].sum() / n_ring
    f_green_in = green[sl][inner].sum() / n_in
    f_brown_in = brownsym[sl][inner].sum() / n_in
    f_blue_in = blue[sl][inner].sum() / n_in
    info = dict(blue=round(f_blue, 3), brown=round(f_brown, 3), black=round(f_black, 3), gring=round(f_green_ring, 3), gin=round(f_green_in, 3), brin=round(f_brown_in, 3))
    if f_black > 0.5:
        cls = "off"
    elif f_blue > 0.6:
        cls = "sea"
    elif f_brown > 0.5:
        cls = "desert"
    else:
        base = "jungle" if f_green_ring > 0.22 else None
        sym = None
        if f_brown_in > 0.06:
            sym = "mountain"
        elif f_green_in > 0.05:
            # veldt (V/W, pointed bottom) vs swamp (grass with a base line)
            g = green[sl] & inner
            ys, xs = np.nonzero(g)
            top, bot = ys.min(), ys.max()
            h = bot - top + 1
            rows_w = []
            for frac0, frac1 in [(0.0, 0.25), (0.75, 1.0)]:
                band = (ys >= top + frac0 * h) & (ys < top + frac1 * h + 1)
                rows_w.append((xs[band].max() - xs[band].min() + 1) if band.any() else 0)
            topw, botw = rows_w
            info["topw"], info["botw"] = int(topw), int(botw)
            sym = "swamp" if botw >= 0.55 * topw else "veldt"
        if base and sym:
            cls = f"jungle-{sym}"
        elif base:
            cls = "jungle"
        elif sym:
            cls = sym
        else:
            cls = "blank"
    info["river"] = bool(0.015 < f_blue < 0.6 and cls not in ("sea", "off"))
    info["coast"] = bool(0.25 < f_blue <= 0.6)
    classes[hid] = dict(cls=cls, **info)

json.dump(classes, open(f"{OUT}/classes.json", "w"), indent=0)
from collections import Counter
print(Counter(v["cls"] for v in classes.values()))
print("river hints:", sum(v["river"] for v in classes.values()))

CODE = {"off": "x", "sea": "~", "desert": "D", "blank": ".", "jungle": "J", "veldt": "V", "swamp": "S", "mountain": "M", "jungle-mountain": "JM", "jungle-swamp": "JS", "jungle-veldt": "JV"}
ov = im.copy()
dr = ImageDraw.Draw(ov)
for hid, (fx, fy) in data["centres"].items():
    if hid not in classes:
        continue
    cx, cy = fx / SCALE, fy / SCALE
    c = classes[hid]
    txt = CODE[c["cls"]] + ("r" if c["river"] else "") + ("c" if c["coast"] else "")
    col = (255, 0, 0) if c["cls"] != "blank" else (120, 0, 200)
    dr.rectangle((cx - 14, cy - 8, cx + 14, cy + 8), fill=(255, 255, 255))
    dr.text((cx - 12, cy - 6), txt, fill=col)
    dr.text((cx - 16, cy + 9), hid[1:], fill=(0, 90, 200))
tw, th = W // 3 + 40, H // 4 + 40
for tj in range(4):
    for ti in range(3):
        x0, y0 = ti * (W // 3), tj * (H // 4)
        ov.crop((x0, y0, min(W, x0 + tw), min(H, y0 + th))).save(f"{OUT}/cl{tj}{ti}.png")
