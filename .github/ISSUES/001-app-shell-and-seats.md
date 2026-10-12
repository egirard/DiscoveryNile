# 001: The table shows a seat on each edge

## User story
> As a player at the table, I can see a seat on each edge and take the one in front of me, so that the table knows where I am sitting.

## Acceptance criteria
- [ ] Opening `/table/` shows a board in the centre and one seat rail on each edge, each rotated toward its edge.
- [ ] Each empty rail offers a single icon control to take the seat.
- [ ] Taking a seat replaces the control with a player icon on that rail only.
- [ ] Reloading the page restores the same game and the taken seat.
- [ ] A room code and a build marker are visible.

## Design
### Screen
```
┌──────────────────────────────┐
│           [top-1]  (180°)    │
│ [left-1]     ◯     [right-1] │
│  (90°)    ABCDE     (270°)   │
│          [bottom-1] (0°)     │
└──────────────────────────────┘
```
### Events (only those this slice observes)
| Event | Payload | Introduced or extended |
|---|---|---|
| `game/created` | `gameId`, `seats` layout, `seed` | introduced |
| `seat/taken` | `seat`, `uid`, `name?` | introduced |
### State (only what the UI reads)
`gameId`, `seats[] { id, uid, name }`, `diagnostics[]`
### Test IDs
`table`, `board`, `room-code`, `build-marker`, `seat-rail-<seat>`, `seat-join-<seat>`, `seat-name-<seat>`

## Unit tests
- `seatsFor`, `parseSeatId`, `rotationFor`, `positionAlongEdge`
- `reduceSeats`: create, take, re-take, taken by another, unknown seat, leave
- `createLocalRepository`: persist, replay, sequence continuation
- `generateRoomCode`, `mmPerPx`, `pxFor`

## E2E scenario 001-app-shell-and-seats (new)
| Step id | Action | Verifications |
|---|---|---|
| empty-table | goto `/table/?new=1&gameId=ABCDE&seed=1234` | 4 rails; 4 join controls; none taken; room code `ABCDE` and build marker; seed = 1234 |
| bottom-seat-taken | tap `seat-join-bottom-1` | bottom rail taken; 3 join controls left; bottom face 0°, top face 180°; state occupant `table:bottom-1`, no diagnostics |
| persists-after-reload | reload | same room code, URL parameters gone; bottom still taken; events replayed `[game/created, seat/taken]` |

## Documentation
- `tests/e2e/README.md` scenario map

## Dependencies
- none

## Labels
`slice`, `seats`
