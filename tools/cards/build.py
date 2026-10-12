"""Generate src/lib/features/cards/cards.json from the vendored deck CSV (docs/rules-reference)."""
import csv, json, re, sys
SRC, DEST = sys.argv[1], sys.argv[2]
PORTS = {"mombasa": "mombasa", "capetown": "capetown", "laurenco marques": "lourenco-marques", "lourenco marques": "lourenco-marques",
         "quilimane": "quilimane", "calabar": "calabar", "kilwa": "kilwa", "launda": "luanda", "luanda": "luanda", "benguela": "benguela",
         "port elizabeth": "port-elizabeth", "zanzibar": "zanzibar", "durban": "durban", "brass": "brass", "khartoum": "khartoum"}
cards = []
with open(SRC, newline="", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        n = int(row["Card #"])
        kind = row["Funding / Reward Type"].strip()
        value = row["Funding / Reward Value"].strip()
        port = row["Funding / Ticket Port"].strip()
        if kind == "Free Ticket":
            donation = {"kind": "ticket", "port": PORTS[port.lower()]}
        elif kind.startswith("Donation"):
            donation = {"kind": "money", "amount": int(re.sub(r"[^0-9]", "", value))}
            if kind == "Donation (Special)":
                donation["note"] = port  # the whimsical donor
        else:
            donation = {"kind": "none"}
        cards.append({
            "id": f"card-{n}", "number": n,
            "disaster": {"text": row["Disaster Text"].strip(), "context": row["Terrain / Context"].strip(), "type": row["Disaster Type"].strip()},
            "donation": donation,
        })
assert len(cards) == 48, len(cards)
json.dump(cards, open(DEST, "w"), indent=1, ensure_ascii=False)
from collections import Counter
print(Counter(c["donation"]["kind"] for c in cards))
