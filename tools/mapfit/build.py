"""Build the board manifest (board.json) from the classifier output plus the hand transcription."""
import json, sys
from collections import Counter

OUT = sys.argv[1]
DEST = sys.argv[2]
classes = json.load(open(f"{OUT}/classes.json"))

D, M, S, J, V = "desert", "mountain", "swamp", "jungle", "veldt"
JS, JM = "jungle-swamp", "jungle-mountain"
BLANK = None

def rng(c0, c1, r0, r1):
    return [(c, r) for c in range(c0, c1 + 1) for r in range(r0, r1 + 1)]

# 1. Land set from the classifier, then forced sea where print overlays confused it.
land = {}
for hid, v in classes.items():
    c, r = hid[1:].split("r"); c, r = int(c), int(r)
    if v["cls"] in ("sea", "off"):
        continue
    land[(c, r)] = v["cls"]
for cr in rng(1, 5, 19, 29) + rng(25, 25, 13, 41) + rng(0, 26, 0, 0) + rng(0, 1, 0, 41) + rng(26, 26, 0, 41) + rng(0, 26, 38, 41):
    land.pop(cr, None)
for cr in [(25, 1), (25, 3), (25, 5), (1, 3), (1, 5), (1, 7), (1, 9), (2, 9), (3, 9), (19, 31), (18, 33), (3, 8)]:
    land.pop(cr, None)
land[(3, 8)] = JS  # jungle-swamp hex beside Brass, half sea

# 2. Only the periphery carries printed symbols; interior green/brown is crayon from old games.
zones = set(rng(2, 9, 3, 33) + rng(22, 25, 9, 34) + rng(8, 19, 29, 37) + rng(22, 25, 1, 6) + [(18, 6), (18, 7)])
terrain = {}
for cr, cls in land.items():
    if cls == "blank":
        terrain[cr] = BLANK
    elif cls == "desert":
        terrain[cr] = D
    elif cr in zones:
        terrain[cr] = {"mountain": M, "swamp": S, "jungle": J, "veldt": V, "jungle-swamp": JS, "jungle-veldt": JS, "jungle-mountain": JM}[cls]
    else:
        terrain[cr] = BLANK

# 3. Hand transcription from the full-resolution crops (overrides everything above).
over = {}
def put(t, *cells):
    for c in cells:
        over[c] = t
put(D, *[(c, 1) for c in range(2, 23)], (2, 2), (19, 2), (20, 2), (21, 2), (22, 2), (19, 3), (20, 3), (21, 3), (20, 4), (21, 4), (22, 4), (19, 5), (19, 6),
    (25, 6), (25, 7), (25, 8), (25, 9), (6, 24), (7, 25), (7, 26), (7, 27), (8, 28), (8, 29), (8, 30), (8, 31), (8, 32), (8, 33))
put(M, (23, 1), (24, 1), (23, 2), (25, 2), (22, 3), (23, 4), (25, 4), (22, 5), (22, 6),
    (16, 32), (17, 32), (14, 33), (15, 33), (10, 34), (11, 34), (12, 34), (13, 34), (14, 34), (16, 34), (17, 34),
    (11, 35), (12, 35), (13, 35), (14, 35), (15, 35), (11, 36), (12, 36), (13, 36), (14, 36), (16, 31), (17, 31), (17, 30), (17, 29))
put(S, (18, 6), (18, 7), (18, 30), (19, 29))
put(V, (2, 4), (7, 17), (8, 18), (8, 19), (8, 20), (7, 21), (7, 22), (6, 23), (7, 23), (7, 24),
    (9, 32), (10, 32), (11, 32), (13, 32), (18, 32), (9, 33), (10, 33), (11, 33), (12, 33), (13, 33), (16, 33), (17, 33), (15, 34), (10, 35), (10, 36), (15, 36),
    (20, 29), (20, 28), (19, 28), (19, 27), (18, 26), (19, 26), (20, 26), (19, 25), (20, 24), (21, 24), (22, 24), (22, 23), (23, 22), (24, 22), (23, 21), (24, 21),
    (23, 20), (22, 19), (23, 19), (22, 18), (22, 17), (23, 16), (23, 15), (24, 15), (24, 14), (24, 13), (25, 12), (25, 11), (25, 10))
put(J, (2, 5), (2, 6), (2, 7), (3, 7), (4, 7), (2, 8), (4, 8), (5, 8), (5, 9), (4, 11), (4, 12), (5, 12), (6, 15), (6, 16), (7, 16), (8, 16), (8, 17), (9, 18), (9, 19), (9, 20), (8, 21), (8, 22),
    (18, 31), (20, 30), (21, 25), (23, 24), (24, 20), (23, 18))
put(JS, (3, 8), (4, 9), (5, 10), (4, 13), (6, 14), (19, 30), (20, 25), (23, 23), (23, 17))
put(BLANK, (3, 6), (7, 15), (12, 32), (14, 32), (15, 32), (18, 29), (18, 28), (18, 27), (22, 20), (24, 2), (23, 3), (24, 3), (24, 4), (23, 5), (24, 5), (23, 6), (24, 6))
for cr, t in over.items():
    if cr not in land:
        land[cr] = "override"
    terrain[cr] = t

ports = {
    "khartoum": ("Khartoum", (20, 1)), "mombasa": ("Mombasa", (25, 12)), "zanzibar": ("Zanzibar", (24, 15)), "kilwa": ("Kilwa", (23, 18)),
    "quilimane": ("Quilimane", (21, 25)), "lourenco-marques": ("Lourenço Marques", (18, 31)), "durban": ("Durban", (17, 34)),
    "port-elizabeth": ("Port Elizabeth", (14, 36)), "capetown": ("Capetown", (10, 36)), "benguela": ("Benguela", (7, 21)),
    "luanda": ("Luanda", (8, 19)), "calabar": ("Calabar", (4, 8)), "brass": ("Brass", (2, 8)),
}
rivers = [
    dict(id="white-nile", name="White Nile", drainage=35, offMapHexes=25, path=[(20, 1), (20, 2), (19, 3), (20, 4), (19, 5), (19, 6), (18, 6)], cataracts=[]),
    dict(id="blue-nile", name="Blue Nile", joins="white-nile", path=[(20, 1), (21, 2), (21, 3), (22, 4), (22, 5)], cataracts=[(22, 5)]),
    dict(id="niger", name="Niger", drainage=6, offMapHexes=23, path=[(2, 8), (2, 7), (2, 6), (2, 5)], cataracts=[], continuesOffMap=True),
    dict(id="benue", name="Benue", joins="niger", path=[(2, 6), (3, 6)], cataracts=[]),
    dict(id="ogooue", name="Ogooué", drainage=10, path=[(4, 12), (5, 12)], cataracts=[]),
    dict(id="congo", name="Congo", drainage=25, path=[(6, 16), (7, 16), (7, 15)], cataracts=[(7, 15)]),
    dict(id="cunene", name="Cunene", drainage=10, path=[(6, 24), (7, 24)], cataracts=[]),
    dict(id="orange", name="Orange", drainage=14, path=[(8, 33), (9, 32), (10, 32), (11, 32), (12, 32), (13, 32), (13, 33), (14, 33), (15, 33), (16, 32), (16, 31)], cataracts=[]),
    dict(id="vaal", name="Vaal", joins="orange", path=[(14, 33), (14, 32)], cataracts=[]),
    dict(id="limpopo", name="Limpopo", drainage=13, path=[(18, 31), (19, 30)], cataracts=[]),
    dict(id="zambezi", name="Zambezi", drainage=16, path=[(20, 26), (19, 26), (18, 26)], cataracts=[]),
    dict(id="rufiji", name="Rufiji", drainage=10, path=[(24, 20), (23, 20), (22, 20)], cataracts=[]),
]

hid = lambda cr: f"c{cr[0]}r{cr[1]}"
for name, (_, cr) in ports.items():
    assert cr in land, f"port {name} hex {cr} not land"
for rv in rivers:
    for cr in rv["path"]:
        assert cr in land, f"river {rv['id']} hex {cr} not land"
        if terrain[cr] in (S, JS):
            assert cr == rv["path"][-1], f"river {rv['id']} passes through swamp {cr}"

hexes = {}
for cr in sorted(land, key=lambda x: (x[1], x[0])):
    hexes[hid(cr)] = dict(col=cr[0], row=cr[1], terrain=terrain[cr])
for pid, (name, cr) in ports.items():
    hexes[hid(cr)]["port"] = pid
out = dict(
    cols=27, rows=42,
    hexes=hexes,
    ports={pid: dict(name=name, hex=hid(cr)) for pid, (name, cr) in ports.items()},
    rivers=[dict({k: v for k, v in rv.items() if k not in ("path", "cataracts")}, path=[hid(c) for c in rv["path"]], cataracts=[hid(c) for c in rv["cataracts"]]) for rv in rivers],
)
json.dump(out, open(DEST, "w"), indent=1)
cnt = Counter(v["terrain"] for v in hexes.values())
print("land hexes:", len(hexes)); print(cnt)
