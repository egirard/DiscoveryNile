import json, sys
from PIL import Image, ImageDraw, ImageFont
SRC, OUT = sys.argv[1], sys.argv[2]
data = json.load(open(f"{OUT}/centres.json")); classes = json.load(open(f"{OUT}/classes.json"))
im = Image.open(SRC).convert("RGB")
R = data["rowpitch"] / 1.5
CODE = {"off": "x", "sea": "~", "desert": "D", "blank": ".", "jungle": "J", "veldt": "V", "swamp": "S", "mountain": "M", "jungle-mountain": "JM", "jungle-swamp": "JS", "jungle-veldt": "JV"}
regions = {
 "nw": (0, 10, 0, 13), "nile": (15, 26, 0, 11), "west": (3, 11, 10, 31), "east": (18, 26, 10, 34), "cape": (8, 19, 29, 38), "ne": (19, 26, 9, 22),
}
try:
    font = ImageFont.truetype("/nix/store/2ppmsk65csi9d1d05c43jhl2r2z5lrjf-dejavu-fonts-minimal-2.37/share/fonts/truetype/DejaVuSans.ttf", 26)
except Exception:
    font = ImageFont.load_default()
for name, (c0, c1, r0, r1) in regions.items():
    pts = [data["centres"][f"c{c}r{r}"] for c in range(c0, c1 + 1) for r in range(r0, r1 + 1) if f"c{c}r{r}" in data["centres"]]
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    box = (int(min(xs) - R), int(min(ys) - R), int(max(xs) + R), int(max(ys) + R))
    crop = im.crop(box); dr = ImageDraw.Draw(crop)
    for c in range(c0, c1 + 1):
        for r in range(r0, r1 + 1):
            hid = f"c{c}r{r}"
            if hid not in data["centres"] or hid not in classes: continue
            x, y = data["centres"][hid]; x -= box[0]; y -= box[1]
            cl = classes[hid]
            txt = CODE[cl["cls"]] + ("r" if cl["river"] else "")
            dr.text((x - 30, y - 34), f"{c},{r}", fill=(0, 60, 220), font=font)
            dr.text((x - 12, y - 4), txt, fill=(220, 0, 0), font=font)
    w, h = crop.size; s = min(1.0, 1400 / max(w, h))
    crop.resize((int(w * s), int(h * s)), Image.LANCZOS).save(f"{OUT}/reg-{name}.png")
    print(name, crop.size)
