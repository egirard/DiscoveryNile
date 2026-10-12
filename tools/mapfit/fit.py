"""Fit the pointy-top hex lattice of the Source of the Nile board photograph.

Step 1: find vertical hex edges, estimate the local lattice (period and phase) in a grid of
windows, chain the windows into one consistent (col,row) indexing, and write centres.json plus
an overlay image for visual checking.
"""
import json
import sys

import numpy as np
from PIL import Image, ImageDraw

SRC = sys.argv[1]
OUT = sys.argv[2]
SCALE = 2  # work at half resolution

im = Image.open(SRC).convert("RGB")
W0, H0 = im.size
im = im.resize((W0 // SCALE, H0 // SCALE), Image.BOX)
a = np.asarray(im).astype(np.float32)
H, W = a.shape[:2]
lum = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]

# Line-ness: a dark pixel whose horizontal neighbours are brighter is on a vertical line.
d = 4
vert = np.zeros_like(lum)
vert[:, d:-d] = (lum[:, :-2 * d] + lum[:, 2 * d:]) / 2 - lum[:, d:-d]
horiz = np.zeros_like(lum)
horiz[d:-d, :] = (lum[:-2 * d, :] + lum[2 * d:, :]) / 2 - lum[d:-d, :]
vmask = (vert > 14) & (vert > 1.6 * horiz)


def dominant_period(profile, lo, hi):
    """Period (in samples) of the strongest FFT component with period in [lo, hi], plus its phase."""
    p = profile - profile.mean()
    n = len(p)
    spec = np.fft.rfft(p * np.hanning(n))
    freqs = np.fft.rfftfreq(n)
    ok = (freqs > 1 / hi) & (freqs < 1 / lo)
    k = np.argmax(np.abs(spec) * ok)
    # refine the frequency by parabolic interpolation on the magnitude
    mags = np.abs(spec)
    if 0 < k < len(mags) - 1:
        y0, y1, y2 = mags[k - 1], mags[k], mags[k + 1]
        denom = y0 - 2 * y1 + y2
        delta = 0.5 * (y0 - y2) / denom if denom != 0 else 0.0
    else:
        delta = 0.0
    f = (k + delta) / n
    period = 1 / f
    # phase: position of the first maximum of cos(2π f x + φ)
    phase_fit = np.sum(p * np.exp(-2j * np.pi * f * np.arange(n)))
    phi = np.angle(phase_fit)
    x0 = (-phi / (2 * np.pi)) * period
    return period, x0 % period


def refine_offset(profile, period, x0, half_width):
    """Snap x0 to the profile's actual peak near x0 by averaging peak positions across the window."""
    n = len(profile)
    positions = []
    k0 = int(np.floor(-x0 / period)) - 1
    for k in range(k0, int(np.ceil((n - x0) / period)) + 1):
        c = x0 + k * period
        lo, hi = int(round(c - half_width)), int(round(c + half_width))
        if lo < 0 or hi >= n:
            continue
        seg = profile[lo : hi + 1]
        if seg.max() <= 0:
            continue
        # centroid of the segment above half its max
        xs = np.arange(lo, hi + 1)
        wts = np.clip(seg - seg.max() * 0.5, 0, None)
        if wts.sum() == 0:
            continue
        positions.append(((xs * wts).sum() / wts.sum() - c))
    if not positions:
        return x0
    return x0 + float(np.median(positions))


# Windows: 4 across, 5 down, overlapping.
NX, NY = 4, 5
win_w, win_h = W // 3, H // 4
windows = []
for j in range(NY):
    for i in range(NX):
        x0 = int(i * (W - win_w) / (NX - 1))
        y0 = int(j * (H - win_h) / (NY - 1))
        windows.append((i, j, x0, y0))

local = {}
for i, j, x0, y0 in windows:
    sub = vmask[y0 : y0 + win_h, x0 : x0 + win_w].astype(np.float32)
    cols = sub.sum(axis=0)
    rows = sub.sum(axis=1)
    # vertical edges every w/2 horizontally (w = hex width ≈ 77px at half res → 38.5)
    px, ox = dominant_period(cols, 30, 50)
    ox = refine_offset(cols, px, ox, 6)
    # vertical edges are centred on hex rows every 1.5R ≈ 33px
    py, oy = dominant_period(rows, 55, 85)
    oy = refine_offset(rows, py, oy, 14)
    # Which x-phase do the edges at this row use? Check a band of rows around one centre.
    cy = oy + py * round((win_h / 2 - oy) / py)
    band = sub[max(0, int(cy - py * 0.25)) : int(cy + py * 0.25), :].sum(axis=0)
    xs = np.arange(win_w)
    score_a = sum(band[int(round(x))] for x in np.arange(ox, win_w, 2 * px) if 0 <= round(x) < win_w)
    score_b = sum(band[int(round(x))] for x in np.arange(ox + px, win_w, 2 * px) if 0 <= round(x) < win_w)
    # Edge x positions at row cy: ox_row + k*w, where w = 2*px; centres are midway between edges.
    ox_row = ox if score_a >= score_b else ox + px
    signal = float(sub.sum())
    local[(i, j)] = dict(signal=signal, x0=x0, y0=y0, w=2 * px, rh=py, ox=x0 + ox_row, cy=y0 + cy, edge_phase=ox_row, row_phase=oy)
    print(f"window {i},{j}: w={2*px:.2f} rowpitch={py:.2f} edge_x={x0+ox_row:.1f} row_y={y0+cy:.1f} a/b={score_a:.0f}/{score_b:.0f}")

best_signal = max(v["signal"] for v in local.values())
med_w = float(np.median([v["w"] for v in local.values()]))
med_rh = float(np.median([v["rh"] for v in local.values()]))
for k in list(local):
    if local[k]["signal"] < 0.2 * best_signal or abs(local[k]["w"] - med_w) > 0.08 * med_w or abs(local[k]["rh"] - med_rh) > 0.08 * med_rh:
        print(f"dropping weak window {k} signal={local[k]['signal']:.0f}")
        del local[k]
# Chain windows from the centre outward: assign each window's reference row (cy) and edge (ox) a
# global (col,row) index. A hex centre sits at edge_x + w/2 ; moving one row shifts x by w/2.
order = sorted(local.keys(), key=lambda k: abs(k[0] - (NX - 1) / 2) + abs(k[1] - (NY - 1) / 2))
origin = local[order[0]]
# global lattice params (median of all windows)
w = float(np.median([v["w"] for v in local.values()]))
rh = float(np.median([v["rh"] for v in local.values()]))
print(f"global w={w:.3f} rowpitch={rh:.3f} (R={rh/1.5:.3f})")

# centre hex of the origin window: col 0,row 0 at (origin.ox + w/2, origin.cy)
ref = {order[0]: (origin["ox"] + w / 2, origin["cy"], 0, 0)}


def centre_from(v, col, row, cx0, cy0, c0, r0):
    """Pixel centre of (col,row) using window v's local lattice anchored at (cx0,cy0)=(c0,r0)."""
    dx = (col - c0) * v["w"] + (row - r0) * v["w"] / 2
    dy = (row - r0) * v["rh"]
    return cx0 + dx, cy0 + dy


anchors = {}
anchors[order[0]] = (origin["ox"] + w / 2, origin["cy"], 0, 0)
done = {order[0]}
pending = [k for k in order if k not in done]
while pending:
    for key in list(pending):
        i, j = key
        nbrs = [n for n in [(i - 1, j), (i + 1, j), (i, j - 1), (i, j + 1), (i-1,j-1),(i+1,j-1),(i-1,j+1),(i+1,j+1)] if n in anchors]
        if not nbrs:
            continue
        v = local[key]
        # predict this window's reference hex (nearest to its own detected cy / ox) from a neighbour
        n = nbrs[0]
        ax, ay, ac, ar = anchors[n]
        vn = local[n]
        # the detected reference centre in this window:
        cx_det, cy_det = v["ox"] + v["w"] / 2, v["cy"]
        # predict its (col,row) via the neighbour's lattice
        row_f = ar + (cy_det - ay) / vn["rh"]
        row = int(round(row_f))
        col_f = ac + (cx_det - ax - (row - ar) * vn["w"] / 2) / vn["w"]
        col = int(round(col_f))
        # the detected edge phase only tells us centres modulo w; check parity against prediction
        px_pred, py_pred = centre_from(vn, col, row, ax, ay, ac, ar)
        err = abs(px_pred - cx_det)
        if err > v["w"] / 4:
            # the detected x phase is off by half a hex: this row's parity was misjudged; shift
            cx_det += v["w"] / 2 if px_pred > cx_det else -v["w"] / 2
            col_f = ac + (cx_det - ax - (row - ar) * vn["w"] / 2) / vn["w"]
            col = int(round(col_f))
        anchors[key] = (cx_det, cy_det, col, row)
        done.add(key)
        pending.remove(key)
        print(f"window {key}: ref hex col={col} row={row} at ({cx_det:.1f},{cy_det:.1f}) err={err:.1f} rowf={row_f:.2f} colf={col_f:.2f}")

# For every (col,row) that lands inside the image, compute the centre from the nearest window.
centres = {}
cols = range(-40, 41)
rows = range(-60, 61)
for row in rows:
    for col in cols:
        # choose the window whose anchor is nearest (in predicted pixel space using global params)
        ax, ay, ac, ar = anchors[order[0]]
        gx = ax + (col - ac) * w + (row - ar) * w / 2
        gy = ay + (row - ar) * rh
        if not (-w <= gx < W + w and -rh <= gy < H + rh):
            continue
        # inverse-distance blend of every window's local estimate (smooth across seams)
        num_x = num_y = den = 0.0
        for k, (bx, by, bc, br) in anchors.items():
            ex, ey = centre_from(local[k], col, row, bx, by, bc, br)
            d2 = (bx - gx) ** 2 + (by - gy) ** 2 + 1.0
            wgt = 1.0 / (d2 * d2)
            num_x += ex * wgt; num_y += ey * wgt; den += wgt
        cx, cy = num_x / den, num_y / den
        if 0 <= cx < W and 0 <= cy < H:
            centres[(col, row)] = (cx, cy)

# normalise indices so the minimum col/row is 0
min_row = min(r for _, r in centres)
def to_offset(q, r):
    rr = r - min_row
    return q + (rr - (rr & 1)) // 2, rr
offs = {to_offset(c, r): v for (c, r), v in centres.items()}
min_col = min(c for c, _ in offs)
offs = {(c - min_col, r): v for (c, r), v in offs.items()}
centres = {k: v for k, v in offs.items()}
min_col = 0; min_row = 0
out = {f"c{c}r{r}": [x * SCALE, y * SCALE] for (c, r), (x, y) in centres.items()}
json.dump({"scale": SCALE, "w": w * SCALE, "rowpitch": rh * SCALE, "centres": out}, open(f"{OUT}/centres.json", "w"))
print(f"{len(out)} centres; cols {min_col}..{max(c for c,_ in centres)} rows {min_row}..{max(r for _,r in centres)}")

# overlay for checking
ov = im.copy()
dr = ImageDraw.Draw(ov)
Rr = rh / 1.5
for (c, r), (x, y) in centres.items():
    pts = [(x + Rr * np.cos(np.pi / 180 * (60 * k - 30)), y + Rr * np.sin(np.pi / 180 * (60 * k - 30))) for k in range(6)]
    dr.polygon(pts, outline=(255, 0, 0))
    dr.text((x - 10, y - 5), f"{c-min_col},{r-min_row}", fill=(200, 0, 200))
ov.save(f"{OUT}/overlay.png")
tw, th = W // 3 + 40, H // 4 + 40
for tj in range(4):
    for ti in range(3):
        x0, y0 = ti * (W // 3), tj * (H // 4)
        ov.crop((x0, y0, min(W, x0 + tw), min(H, y0 + th))).save(f"{OUT}/ov{tj}{ti}.png")
