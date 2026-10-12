import json, sys
import numpy as np
from PIL import Image
SRC, OUT = sys.argv[1], sys.argv[2]
data = json.load(open(f"{OUT}/centres.json")); classes = json.load(open(f"{OUT}/classes.json"))
im = Image.open(SRC).convert("RGB"); a = np.asarray(im).astype(np.int32)
H, W = a.shape[:2]; R = data["rowpitch"] / 1.5
Rf, Gf, Bf = a[...,0], a[...,1], a[...,2]
satblue = (Bf > 140) & (Rf < 110) & (Bf > Gf + 40)
yy, xx = np.mgrid[0:H, 0:W]
def frac(hid, r0, r1):
    x, y = data["centres"][hid]
    x0, x1, y0, y1 = int(x-R), int(x+R+1), int(y-R), int(y+R+1)
    sl = (slice(max(0,y0),min(H,y1)), slice(max(0,x0),min(W,x1)))
    d2 = (xx[sl]-x)**2 + (yy[sl]-y)**2
    m = (d2 >= (r0*R)**2) & (d2 < (r1*R)**2)
    return satblue[sl][m].sum() / max(1, m.sum())
regions = {"nile": (15,25,0,8), "niger": (1,6,4,13), "congo": (5,9,13,17), "cunene": (5,9,23,25), "orange": (7,18,29,37), "east": (17,25,19,32)}
for name,(c0,c1,r0,r1) in regions.items():
    print(f"== {name}  (inner blue fraction ×100; sea hexes shown as ~~)")
    print("     " + " ".join(f"{c:>3}" for c in range(c0,c1+1)))
    for r in range(r0,r1+1):
        row=[]
        for c in range(c0,c1+1):
            hid=f"c{c}r{r}"
            if hid not in classes: row.append("  ."); continue
            cl=classes[hid]["cls"]
            if cl in ("sea","off"): row.append(" ~~"); continue
            f=frac(hid,0,0.75)
            row.append(f"{int(round(f*100)):>3}")
        print(f"r{r:<3} " + " ".join(row))
