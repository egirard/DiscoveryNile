# DiscoveryNile implementation plan

## Objective

Deliver *Source of the Nile* as a sequence of independently playable slices on a tabletop computer. Each slice is one commit (or a few) that a player can see and touch, proven by a numbered Playwright scenario. The sequence follows the order a player meets the game: the board and seats, an explorer and money in Europe, the voyage, the outfitting, the first step into a blank hex, and then one rule at a time until an evening's game, with deaths, publications, superlatives and a scored winner, is playable end to end. Slices 003 to 012 are specified in detail; later slices are titled and scoped so the order is visible and can be refined as they approach.

## Commit contract

[docs/commit-contract.md](commit-contract.md). Not restated here. Bootstrap commits of phase 1 (template import, documentation, pinning the rules reference) were exempt from the player-visible rule; every commit from slice 003 onward satisfies it.

## Fixed technical decisions

- **Backend:** local only (`createLocalRepository`), the template's default. No relay, no phones, no Firebase in this milestone. The rules have no hidden information (see [rules.md](rules.md) D-2). The template's relay and `/hand` route stay in the tree, untouched, with scenario 002 still proving them.
- **Seats:** six, laid out `{ bottom: 2, top: 2, left: 1, right: 1 }`. One explorer per seat at a time; a seat may commission a new explorer when its explorer dies or retires.
- **Screens:** the `table` project at 1920×1080 stands for 27"; `table-4k` at 3840×2160 for 55" and runs for the responsive scenario only.
- **Map:** a pointy-top hex grid transcribed from the pinned board photograph into `src/lib/features/map/manifest.ts`. Hex ids are offset coordinates `c<col>r<row>`; the six neighbour directions are numbered 1 to 6 clockwise from north-east exactly as the board's directional indicator (1 NE, 2 E, 3 SE, 4 SW, 5 W, 6 NW), so a die roll *is* a direction. Original iconography; nothing from the photograph is shipped.
- **Randomness:** every die roll is drawn from the seeded PRNG (`src/lib/game/random.ts`) in the order the rules resolve them. The PRNG state lives in `GameState` and advances inside the reducer, so events carry choices and never outcomes, and a replay reproduces every roll. Rolls are rendered as dice at the acting seat with their modifiers (rules.md D-1).
- **Rules authority:** [rules-reference.md](rules-reference.md), pinned at commit `6ee4718a`. Ambiguities become `RQ-n` entries in [rules.md](rules.md) and are cited from tests.
- **Deployment:** CI verifies only; GitHub Pages is disabled ([ci-and-deployment.md](ci-and-deployment.md)).
- **Browser:** current Chrome.

## Event and state model (initial vocabulary)

Events are `noun/verb-past`; payloads carry ids and choices. Everything on the right is derived by replay.

| Event | Payload | Introduced in | Derived by replay |
|---|---|---|---|
| `game/created` | `gameId`, `seats` layout, `seed` | 001 (template), layout changes in 003 | seat list, PRNG initial state |
| `seat/taken` | `seat`, `uid`, `name?` | 001 (template) | occupancy |
| `explorer/commissioned` | `seat`, `specialties[]` | 005 | an explorer in Europe for that seat, colour by seat |
| `game/started` | `roundLimit?` | 006 | four-dice roll-off, turn order, five cards dealt per explorer, deck order |
| `cards/discarded` | `seat`, `cardIds[]` | 007 | hand, discard pile |
| `turn/ended` | `seat` | 007 | ticket discards, hand limit, the draw, next seat, round counter |
| `voyage/booked` | `seat`, `port`, `ticketCardId \| null` | 008 | money spent, token at port after the skipped turn |
| `expedition/outfitted` | `seat`, `purchases` (counts per item) | 009 | the Expedition Organization Chart, remaining money forfeited |
| `expedition/moved` | `seat`, `path: hexId[]` | 010 | per hex: lost check, terrain, river, cataract, heights, marker, native discovery (each from the PRNG) |
| `hex/published` … `policy/chosen`, `gifts/offered`, `trade/made`, `cache/left`, `expedition/reorganised`, `explorer/retired` | per slice | 013 onward | per slice |

State grows with the same slices: `explorers[]` (seat, specialties, location `europe | port | hexId | dead`, hand, money, chart, knownHexes, markers), `map` (generated hexes keyed by id, tribes), `deck` (draw and discard order), `turn` (order, current seat, round, phase), `rng` (PRNG state), `scores`.

## Scenario map

```
001-app-shell-and-seats            landed (template)
002-phone-takes-a-seat             landed (template)
003-africa-board-and-six-seats     landed
004-known-africa                   landed
005-commission-an-explorer         landed
006-first-player-and-donations     landed
007-a-turn-in-europe
008-sail-to-africa
009-outfit-the-expedition
010-first-step-into-the-unknown
011-rivers-and-oases
012-movement-rates
013-disaster-cards
014-hunting-and-rations
015-water-in-the-desert
016-natives-discovered-and-policy
017-native-reaction-and-combat
018-defeat-escape-and-victory
019-negotiation-and-trade
020-tribe-attitude
021-sickness-starvation-desertion
022-specialties-in-the-field
023-caches-and-reorganisation
024-return-to-europe
025-publishing-and-points
026-death-and-retirement
027-superlatives
028-epic-transits
029-joint-expeditions
030-game-end-and-continuation
031-reload-and-undo
032-responsive-27-and-55
```

## Slice sequence

### 1–2. Landed by the template seed

Scenario 001 proves the shell, four seats, a room code, a build marker and persistence across reload. Scenario 002 proves a phone can take a seat over the relay. Both stay green; 003 changes the seat count and 001's baselines change with it, intentionally.

### 3. The table shows Africa with six seats — `003-africa-board-and-six-seats` ✅ landed

- **Player sees:** a hex grid in the shape of the board (land hexes only; sea is background) filling the centre of the table, the 13 ports of entry marked with a port icon and an omnidirectional label, and six seat rails: two on the bottom edge, two on the top, one left, one right. Room code and build marker as before.
- **Introduced:** `src/lib/features/map/manifest.ts` with the grid (which `c<col>r<row>` ids exist), port hexes, and the directional convention; `src/lib/features/map/hex.ts` (`neighbour(id, direction)`, `distance`, pixel placement for pointy-top hexes); `HexBoard.svelte` rendering the grid from the manifest, sized from the viewport so the whole board fits with the rails; `DEFAULT_LAYOUT` becomes the six-seat layout in `game/created`.
- **Scenario 003:** `empty-board` (board present, the manifest's land hexes rendered, 13 port markers, 6 rails, no seat taken) → `bottom-seat-taken` (tap `seat-join-bottom-1`; rail taken; the board unchanged) → `persists-after-reload`.
- **Unit tests:** `neighbour` for all six directions on even and odd rows; `distance`; manifest invariants (13 ports, every port hex exists, 626 land and 447 blank hexes per `RQ-5`, river adjacency, drainage numbers); `seatsFor` with two seats on one edge.
- **As landed:** the board is transcribed with `tools/mapfit/` (lattice fit, colour classification, hand overrides) into `board.json`; terrain and rivers are already in the data and are drawn in 004. On a landscape table the map is rotated with north to the left so hexes stay touch-sized.
- **Baselines changed:** 001 (six rails instead of four), explained in the commit.
- Issue spec: [`.github/ISSUES/003-africa-board-and-six-seats.md`](../.github/ISSUES/003-africa-board-and-six-seats.md).

### 4. The known Africa of 1820 — `004-known-africa` ✅ landed

- **Player sees:** the pre-printed periphery: desert across the north and down the south-west coast, the Abyssinian mountains, the Sudd, the Cape's veldt and mountains, coastal veldt and jungle, the pre-printed rivers (White and Blue Nile, Niger and Benue, Ogooué, Congo, Cunene, Orange and Vaal, Limpopo, Zambezi, Rufiji) with their drainage numbers at the mouth, the pre-printed cataracts, and Zanzibar. Blank hexes are visibly blank.
- **Introduced:** terrain, river segment, feature and drainage-number fields in the manifest; terrain and river iconography (original SVG, omnidirectional); `tableView` selector exposing hex terrain.
- **Scenario 004:** `known-africa` (spot-check hexes: Khartoum is desert with two rivers entering, the Sudd is swamp, a chosen pre-printed cataract hex shows the cataract mark; blank-hex count 452 per the rules, `RQ-5`) → `drainage-numbers` (each river mouth shows its number).
- **Unit tests:** manifest invariants (every river segment connects to a neighbour or a mouth, no river in lake/swamp/jungle-swamp, drainage numbers present for every pre-printed mouth, composite terrain only jungle-swamp or jungle-mountain, 452 blank hexes); `terrainPoints(hex)` from rules §12 for pre-printed hexes.

### 5. Commission an explorer — `005-commission-an-explorer` ✅ landed

- **Player sees:** after taking a seat, the rail offers four specialty toggles (evangelism, medicine, zoology, geology) and a confirm control; confirming puts an explorer token in that seat's colour on the rail's "Europe" area with its specialty badges. Other rails are unaffected.
- **Introduced:** `explorer/commissioned`; `explorers[]` in state with `seat`, `specialties`, `location: 'europe'`; `ExplorerSetup.svelte` and `ExplorerToken.svelte`; specialty iconography.
- **Scenario 005:** `setup-offered` (toggles visible at bottom-1 only, rotated 0°) → `zoologist-doctor-commissioned` (toggle two, confirm; token with two badges on the bottom rail; state has one explorer with `['medicine','zoology']`) → `second-seat-ordinary` (take `top-1`, confirm with no toggles; token rotated 180°).
- **Unit tests:** reducer: commission needs a taken seat, one explorer per seat, specialties are a set, any subset including empty; re-commission rejected while an explorer is alive.

### 6. First player and donations — `006-first-player-and-donations` ✅ landed

- **Player sees:** a start control on the board once at least one explorer is commissioned; starting shows every explorer's four-dice roll-off at its rail, a turn marker at the winner's rail, and five donation cards face up on each explorer's rail (money cards show the amount facing the seat; ticket cards show a ticket icon and the port). The deck and discard pile appear on the board as omnidirectional stacks with countable marks.
- **Introduced:** `game/started`; `turn` state (order, current seat, round 1); `deck` state seeded from the PRNG shuffle of the 48 cards; the card manifest generated from `docs/rules-reference/source_of_the_nile_1978_deck.csv` into `src/lib/features/cards/deck.ts` (ids `card-1` … `card-48`, port ids normalised per `RQ-11`); `DiceRoll.svelte`; `Card.svelte`; `rng` state.
- **Scenario 006:** `ready-to-start` (two explorers; start control enabled) → `started` (dice shown at both rails with totals; turn marker at the high roller for seed 1234; five cards each; deck count 38; state `turn.current` matches) → `persists-after-reload` (same cards, same marker).
- **Unit tests:** roll-off with `RQ-1` tie re-roll; dealing five from the seeded shuffle; deck manifest has 48 cards, 12 tickets, 33 money, 3 none (`RQ-12`); PRNG state advances identically on replay.

### 7. A turn in Europe — `007-a-turn-in-europe`

- **Player sees:** at the active rail, tickets drawn last turn are discarded automatically with a short animation; if the hand exceeds five the player must choose discards before anything else; then one card is drawn to the rail; an end-turn control (with confirmation at the edge) passes the marker clockwise. Money total shown at the rail as a number facing the seat.
- **Introduced:** `turn/ended`, `cards/discarded`; phases within a Europe turn (`discard`, `draw`, `act`); hand-limit enforcement in the reducer; discard-pile reshuffle into the deck bottom when empty.
- **Scenario 007:** `turn-begins-draw` (bottom-1 draws; six cards) → `end-turn-confirmed` (tap end turn, confirm; marker at next seat) → `hand-limit` (a seeded hand of six at the next seat forces a discard choice; choose one; draw) → `ticket-expires` (a ticket held across a turn is discarded).
- **Unit tests:** ticket expiry; discard to five before draw; draw order from the seed; reshuffle at empty deck; clockwise order with gaps (empty seats skipped); illegal end-turn while a discard is pending is a diagnostic.

### 8. Sail to Africa — `008-sail-to-africa`

- **Player sees:** a "sail" control at the rail opens a port chooser on the board: the 13 ports highlight; ports for which the player holds a ticket show the ticket; others show the $500 fare; ports unaffordable are disabled with the reason. Choosing one moves the explorer token from the rail to the port hex over the following skipped turn; the rail shows the remaining budget.
- **Introduced:** `voyage/booked`; explorer `location: { port }` and `money`; the skipped turn in the turn cycle; `PortChooser.svelte`.
- **Scenario 008:** `choose-port` (chooser open; Mombasa shows $500; a ticketed port shows the ticket) → `booked` (tap; token in transit on the rail; budget shown) → `arrived` (end turns around the table; token on the port hex).
- **Unit tests:** fare vs ticket (`RQ-2`); unaffordable ports; money after fare; the skipped turn.

### 9. Outfit the expedition — `009-outfit-the-expedition`

- **Player sees:** on arrival, the rail becomes the Expedition Organization Chart: a row per item with icon, price, minus/plus controls sized for fingers, a count, and a running budget; camels only at Khartoum, horses only at Capetown, Durban, Port Elizabeth; a capacity summary (men, rations carried, loads) updating live; a confirm that forfeits unspent money. After confirming, the chart is read-only and the token on the port hex shows the expedition is ready.
- **Introduced:** `expedition/outfitted`; `chart` in explorer state; `priceList`, `availability(port)`, `capacity(chart)` (bearer loads, animal loads, canoe loads, paddlers) in `src/lib/features/expedition/`; `ExpeditionChart.svelte`.
- **Scenario 009:** `price-list` (at Mombasa: no camels, no horses) → `sample-canoe-expedition` (enter the rules' first sample expedition; total $1000; capacity shows 2 canoes carrying 24 men) → `confirmed` (unspent $30 of a $1030 budget forfeited; chart read-only).
- **Unit tests:** price list from rules §5; port availability; the three sample expeditions total $1000, $970, $1000; capacity arithmetic from §5 (bearer 10 food / 2+2 / 10 gifts, led camel 20, ridden 5, eight bearers per canoe, one bearer per three animals); overspend rejected.

### 10. First step into the unknown — `010-first-step-into-the-unknown`

- **Player sees:** on the explorer's African turn, tapping the token highlights the adjacent hexes it may enter this turn (one blank hex on foot); tapping a blank hex rolls the lost check as dice at the rail with its modifiers; on success the hex fills in with generated basic terrain (copied from a neighbour or rolled, with the composite roll if any), the token moves there, and the seat's marker appears on the hex; on failure the token stays, with a "lost" badge for the turn. The turn then ends (hunting and rations arrive in 014).
- **Introduced:** `expedition/moved` with a one-hex path; `knownHexes` per explorer; the lost check (rules §7.2, steps 1–4, foot only, no guides yet) and basic terrain generation (§7.3) in `src/lib/features/map/generate.ts`, consuming the PRNG; generated hexes in `state.map`; `MoveTargets.svelte`.
- **Scenario 010:** `targets-shown` (from Mombasa, adjacent blank hexes highlighted, known hexes not) → `lost` (seed chosen so the first attempt is lost; dice and modifiers shown; token unmoved) → `mapped` (next turn succeeds; terrain rendered; marker on hex; state `map[hex].terrain` set) → `persists-after-reload`.
- **Unit tests:** lost check per leaving terrain (`d6−1`, `−2`, `−3`, `−5`), sick −1; terrain copy from the first then second direction roll; random table with notes A and B; composite rolls (`RQ-4`); determinism: same seed, same hex.

### 11. Rivers, oases and cataracts — `011-rivers-and-oases`

- **Player sees:** a newly mapped hex may now show a river crossing it, a source dot, an oasis in desert, a cataract mark, and, when tall enough, a recorded waterfall or peak height; the expedition's lost check shows "downstream: no roll" when following a river.
- **Introduced:** river generation cases 1–3, the Drainage Basin Rule with the mouth numbers from 004, lake-joining and salt-lake rules, per-explorer oasis knowledge, cataract and height rolls (§7.4–7.5); river rendering across hex edges.
- **Scenario 011:** `source-found` (seeded: a source dot and river to a neighbour) → `river-continues` (entering the neighbour draws the river through) → `cataract-and-height` (a mountain hex records a peak over 15,000 ft and a cataract) → `oasis` (a desert hex with an oasis known only to this explorer).
- **Unit tests:** each case of §7.4 with hand-built neighbourhoods; branching; drainage rule forcing continuation; uphill prohibition; oasis per-explorer rules; cataract odds per terrain; height products and thresholds.

### 12. Movement rates — `012-movement-rates`

- **Player sees:** the highlighted move targets now reflect the expedition: two known hexes on foot, four mounted, canoe speeds by paddlers, half speed through swamp, no entry into impassable terrain for the mode, a path of several hexes chosen tap by tap with the remaining movement shown as marks; a terrain conflict bounces the expedition back with an explanation at the rail; a cataract blocks canoes without eight bearers; Zanzibar's mainland adjacency.
- **Introduced:** `expedition/moved` with multi-hex paths; `movementBudget(explorer, chart)`; passability per mode; terrain conflict; the "unknown twice when mounted" rule and its lost cut-off.
- **Scenario 012:** `foot-two-known` → `mounted-four` → `canoe-along-river` → `terrain-conflict`.
- **Unit tests:** every row of §7.1; speed limit when loads exceed carriage; slowest canoe; `RQ-13`.

### 13. Disaster cards — `013-disaster-cards`

Draw at the start of each African turn outside ports and Cape Colony; applicability by terrain context; losses applied to the chart; "explorer suffers instead" when the type is absent; averting rolls for askaris, doctors, missionaries, geologists; card-specific procedures from the deck CSV. Cape Colony membership computed from the map.

### 14. Hunting and rations — `014-hunting-and-rations`

End-of-turn hunting roll with terrain modifiers, consumption per man and per horse in desert, animals shot for food, surplus discarded; the chart updates with an animation at the rail. `RQ-7`.

### 15. Water in the desert — `015-water-in-the-desert`

Water rations picked up in watered hexes, weights, consumption per man and animal, the oasis search, thirst order and deaths.

### 16. Natives discovered and the explorer's policy — `016-natives-discovered-and-policy`

Two-dice discovery per terrain (`RQ-6`), warriors as a capped product of three dice, a numbered tribe marker on the hex, the five-policy chooser at the rail with each policy's consequences explained, policy 2's retreat.

### 17. Native reaction and combat — `017-native-reaction-and-combat`

Three-dice reaction with all modifiers shown, hide-or-attack, surprise, volley, melee rounds as a visible exchange of casualty dice.

### 18. Defeat, escape and victory — `018-defeat-escape-and-victory`

Consequences of defeat, captivity with per-turn escape rolls, the Escape Survival table, victory, prisoners, finding and looting the village, desertion stopping.

### 19. Negotiation and trade — `019-negotiation-and-trade`

Gift offers, insulted chiefs and poisoning, "give everything", trade prices rolled per item per turn, hiring natives, buying and selling across turns.

### 20. Tribe attitude — `020-tribe-attitude`

Per-tribe attitude persisted and applied, per-explorer bonuses for releasing prisoners, prior-negotiation and published-hex modifiers.

### 21. Sickness, starvation and desertion — `021-sickness-starvation-desertion`

Starvation order, sick men and carrying, recovery and death rolls, explorer respect and askari desertion, guards on starving bearers.

### 22. Specialties in the field — `022-specialties-in-the-field`

The turn spent on evangelism, medicine, zoology or geology instead of moving; results, poison attempts, specimens carried on the chart; the zoologist-geologist two-turn rule; captured specialists.

### 23. Caches and reorganisation — `023-caches-and-reorganisation`

Leaving caches with markers, dismissing men, releasing or eating animals, carrying canoes overland, recovering a cache (`RQ-3`).

### 24. Return to Europe — `024-return-to-europe`

Reaching a port, dismissing the expedition, sailing home, back in Europe next turn with the Europe turn resuming.

### 25. Publishing and points — `025-publishing-and-points`

Choosing hexes to publish in Europe, stealing contested hexes, extra cards per hex, points per hex, tribe and specimen, the published map becoming known to all, scores at each rail as countable marks.

### 26. Death and retirement — `026-death-and-retirement`

Explorer death from any cause, retirement from Europe, erasure of unpublished hexes nobody else visited (with the regenerate-later behaviour), commissioning a new explorer at the same seat.

### 27. Superlatives — `027-superlatives`

Highest mountain, highest waterfall, largest lake (`RQ-8`), longest river with the shortest-path source computation and the Nile's 25 off-map hexes, pre-game known records, ranked points.

### 28. Epic transits — `028-epic-transits`

Detecting the four crossings, route uniqueness, bonus computation, the north-east exclusion.

### 29. Joint expeditions — `029-joint-expeditions`

Pooling money, moving as one on the last member's turn, joining and splitting, shared lost checks and disasters, disputed assets.

### 30. Game end and continuation — `030-game-end-and-continuation`

The optional round limit (`RQ-10`), ending by consensus, final retirement and publication, the winner, and starting a new game that continues the same map.

### 31. Reload and undo — `031-reload-and-undo`

Reload at every phase of a turn reconstructs the same screen; confirmation at the edge for consequential actions; a within-turn undo for choices not yet resolved by dice.

### 32. Responsive pass at 27" and 55" — `032-responsive-27-and-55`

The 4K project; physical sizing of touch targets, hexes and cards from the configured diagonal; the fit check at every step with six seats occupied.

## Definition of complete

- Every scenario in the map has landed and passes with zero-pixel tolerance on Linux.
- A full game is playable on one table: six explorers commissioned, at least one voyage, outfitting, exploration generating terrain, rivers, natives and disasters, a death with erasure, a return and publication, a superlative scored, an epic transit, and a winner declared at the round limit.
- Every section of [rules.md](rules.md) is implemented or explicitly listed as a variant deferred to a later milestone, and every `RQ-n` is pinned by a unit test.
- Reloading at any point reconstructs the same state and screen.
- All screens satisfy the [tabletop-ux.md](tabletop-ux.md) checklist with one to six seats occupied, at 27" and 55".
