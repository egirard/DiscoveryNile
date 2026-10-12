# 003: The table shows Africa with six seats

## User story
> As a player at the table, I can see the hex map of Africa with its thirteen ports and a seat rail for each of six players, and take the seat in front of me, so that the table is ready for a game of Source of the Nile.

## Acceptance criteria
- [ ] Opening `/table/` shows a pointy-top hex grid in the shape of the game board (land hexes only; the sea is the background) filling the centre of the table and fitting between the rails.
- [ ] The thirteen ports of entry (Khartoum, Mombasa, Zanzibar, Kilwa, Quilimane, Lourenço Marques, Durban, Port Elizabeth, Capetown, Benguela, Luanda, Calabar, Brass) are marked on their hexes with a port icon and an omnidirectional label.
- [ ] Six seat rails are shown: `bottom-1`, `bottom-2`, `top-1`, `top-2`, `left-1`, `right-1`, each rotated toward its edge and positioned along its span.
- [ ] Taking a seat behaves exactly as in scenario 001.
- [ ] Reloading restores the same game, board and taken seat.
- [ ] No hex shows terrain yet (terrain is slice 004); no publisher artwork is used.

## Design
### Screen
```
┌──────────────────────────────────────────────┐
│      [top-1] (180°)        [top-2] (180°)     │
│ [left-1]   ┌── hex grid: Africa ──┐  [right-1] │
│  (90°)     │ ⬢⬢⬢⬢⬢⬢⬢⬢⬢⬢⬢⬢⬢⬢⬢⬢   │   (270°)  │
│            │  ⬢⬢⬢⬢⬢ ports ⚓ ⬢⬢   │           │
│            └──────────────────────┘           │
│    [bottom-1] (0°)        [bottom-2] (0°)     │
└──────────────────────────────────────────────┘
```
Directions on the grid are numbered 1–6 clockwise from north-east (1 NE, 2 E, 3 SE, 4 SW, 5 W, 6 NW), matching the board's directional indicator, so that later a die roll is a direction. The grid is transcribed from `source_of_the_nile_1978_map.jpg` in the pinned rules reference (see `docs/rules-reference.md`); only data is transcribed, never the artwork.

### Events (only those this slice observes)
| Event | Payload | Introduced or extended |
|---|---|---|
| `game/created` | `seats` becomes `{ bottom: 2, top: 2, left: 1, right: 1 }` | extended |

### State (only what the UI reads)
Nothing new in `GameState`: the board is static manifest data (`src/lib/features/map/manifest.ts`) read by the table. Seats come from the layout as before.

### Test IDs
`board`, `hex-grid`, `hex-<id>` (e.g. `hex-c12r07`), `port-<portId>` (e.g. `port-mombasa`), `seat-rail-<seat>`, `seat-join-<seat>` (existing)

## Unit tests
- `hex.ts`: `neighbour(id, direction)` for directions 1–6 on an even row and an odd row; `distance(a, b)`; `toPixel` for pointy-top layout; `parseHexId`.
- `manifest.ts` invariants: every port hex exists in the grid; exactly 13 ports; no duplicate ids; grid dimensions as transcribed (record them under `RQ-5` in `docs/rules.md`; the 452 blank-hex invariant is pinned in 004 when terrain distinguishes blank from pre-printed).
- `seatsFor({ bottom: 2, top: 2, left: 1, right: 1 })` yields six seats; `positionAlongEdge` places `bottom-1` and `bottom-2` at ¼ and ¾.

## E2E scenario 003-africa-board-and-six-seats (new)
| Step id | Action | Verifications |
|---|---|---|
| empty-board | goto `/table/?new=1&gameId=ABCDE&seed=1234` | `hex-grid` visible inside `board` with `data-e2e-fit`; `hex-*` count equals the manifest's land-hex count; 13 `port-*` markers; 6 rails; 6 join controls; no seat taken; room code `ABCDE` |
| bottom-seat-taken | tap `seat-join-bottom-1` | bottom-1 rail taken; 5 join controls left; `bottom-2` rail at 0°, `top-1` at 180°, `left-1` at 90°, `right-1` at 270°; board unchanged |
| persists-after-reload | reload | same room code; URL parameters gone; bottom-1 still taken; events `[game/created, seat/taken]`; grid still present |

Scenario 001's baselines change (six rails instead of four); regenerate, inspect, and explain in the commit message.

## Documentation
- `docs/assets.md`: add the port icon.
- `docs/rules.md`: record the transcribed grid dimensions under `RQ-5`.
- `tests/e2e/README.md` scenario map.

## Dependencies
- 001 (landed)

## Labels
`slice`, `map`, `seats`
