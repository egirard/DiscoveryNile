# Assets

Every visual asset in the project, its origin, and its licence. Publisher artwork and trade dress from the 1978 game are never copied (see [rules-reference.md](rules-reference.md), "Respect for the source").

| Asset | Where | Origin | Licence |
|---|---|---|---|
| `static/icons/app.svg` | app icon | TabletopTemplate placeholder, to be replaced by a DiscoveryNile mark in a UI slice | MIT (this repository) |
| Terrain, feature, personnel, supply, card and dice icons | `static/icons/`, `src/lib/ui/` | Original SVG drawn for this project, one per slice as the slice needs it; each listed here when added | MIT (this repository) |
| Map manifest | `src/lib/features/map/manifest.ts` (arrives with slice 003) | Transcribed by hand from `source_of_the_nile_1978_map.jpg` in the pinned rules reference: grid, coastline as hex membership, pre-printed terrain, rivers, drainage numbers, ports. Data only; the photograph itself is not shipped | MIT (this repository) |
| Deck data | `docs/rules-reference/source_of_the_nile_1978_deck.csv` (code reads a generated module) | Vendored from the pinned rules reference | Card text © 1978 Discovery Games; used as game data |

Rules for new assets:

- Prefer SVG; raster only for illustrated art.
- Store the semantic identity (id, kind, value, label) of every piece in a manifest; render art from it. Art enhances semantics already in the DOM.
- Add a row here in the same commit that adds the asset.
