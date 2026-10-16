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
- **Randomness:** every die roll is drawn from the seeded PRNG (`src/lib/game/random.ts`) in the order the rules resolve them. The PRNG state lives in `GameState` and advances inside the reducer, so events carry choices and never outcomes, and a replay reproduces every roll. Rolls are rendered as dice at the acting seat with their modifiers (rules.md D-1). Since 014 the PRNG has named streams derived from the seed (`main` for the roll-off, deck, exploration and disasters; one per later rule, starting with `hunting`), so a rule added later never shifts the rolls of an earlier one and scenario stories survive; dice scripts are per stream (`?dice=` and `?dice-hunting=`).
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
007-a-turn-in-europe               landed
008-sail-to-africa                 landed
009-outfit-the-expedition          landed
010-first-step-into-the-unknown    landed
011-rivers-and-oases               landed
012-movement-rates                 landed
013-disaster-cards                 landed
014-hunting-and-rations            landed
015-water-in-the-desert            landed
016-natives-discovered-and-policy  landed
017-native-reaction-and-combat     landed
018-defeat-escape-and-victory      landed
019-negotiation-and-trade          landed
020-tribe-attitude                 landed
021-sickness-starvation-desertion  landed
022-specialties-in-the-field       landed
023-caches-and-reorganisation      landed
024-return-to-europe               landed
025-publishing-and-points
026-death-and-retirement
027-superlatives
028-epic-transits
029-joint-expeditions
030-game-end-and-continuation
031-reload-and-undo                landed
032-responsive-27-and-55           landed
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

### 7. A turn in Europe — `007-a-turn-in-europe` ✅ landed

- **Player sees:** at the active rail, tickets drawn last turn are discarded automatically with a short animation; if the hand exceeds five the player must choose discards before anything else; then one card is drawn to the rail; an end-turn control (with confirmation at the edge) passes the marker clockwise. Money total shown at the rail as a number facing the seat.
- **Introduced:** `turn/ended`, `cards/discarded`; phases within a Europe turn (`discard`, `draw`, `act`); hand-limit enforcement in the reducer; discard-pile reshuffle into the deck bottom when empty.
- **Scenario 007:** `turn-begins-draw` (bottom-1 draws; six cards) → `end-turn-confirmed` (tap end turn, confirm; marker at next seat) → `hand-limit` (a seeded hand of six at the next seat forces a discard choice; choose one; draw) → `ticket-expires` (a ticket held across a turn is discarded).
- **Unit tests:** ticket expiry; discard to five before draw; draw order from the seed; reshuffle at empty deck; clockwise order with gaps (empty seats skipped); illegal end-turn while a discard is pending is a diagnostic.

### 8. Sail to Africa — `008-sail-to-africa` ✅ landed

- **Player sees:** a "sail" control at the rail opens a port chooser on the board: the 13 ports highlight; ports for which the player holds a ticket show the ticket; others show the $500 fare; ports unaffordable are disabled with the reason. Choosing one moves the explorer token from the rail to the port hex over the following skipped turn; the rail shows the remaining budget.
- **Introduced:** `voyage/booked`; explorer `location: { port }` and `money`; the skipped turn in the turn cycle; `PortChooser.svelte`.
- **Scenario 008:** `choose-port` (chooser open; Mombasa shows $500; a ticketed port shows the ticket) → `booked` (tap; token in transit on the rail; budget shown) → `arrived` (end turns around the table; token on the port hex).
- **Unit tests:** fare vs ticket (`RQ-2`); unaffordable ports; money after fare; the skipped turn.

### 9. Outfit the expedition — `009-outfit-the-expedition` ✅ landed

- **Player sees:** on arrival, the rail becomes the Expedition Organization Chart: a row per item with icon, price, minus/plus controls sized for fingers, a count, and a running budget; camels only at Khartoum, horses only at Capetown, Durban, Port Elizabeth; a capacity summary (men, rations carried, loads) updating live; a confirm that forfeits unspent money. After confirming, the chart is read-only and the token on the port hex shows the expedition is ready.
- **Introduced:** `expedition/outfitted`; `chart` in explorer state; `priceList`, `availability(port)`, `capacity(chart)` (bearer loads, animal loads, canoe loads, paddlers) in `src/lib/features/expedition/`; `ExpeditionChart.svelte`.
- **Scenario 009:** `price-list` (at Mombasa: no camels, no horses) → `sample-canoe-expedition` (enter the rules' first sample expedition; total $1000; capacity shows 2 canoes carrying 24 men) → `confirmed` (unspent $30 of a $1030 budget forfeited; chart read-only). Revisited after the plan (prompt 15): see "Post-plan changes".
- **Unit tests:** price list from rules §5; port availability; the three sample expeditions total $1000, $970, $1000; capacity arithmetic from §5 (bearer 10 food / 2+2 / 10 gifts, led camel 20, ridden 5, eight bearers per canoe, one bearer per three animals); overspend rejected.

### 10. First step into the unknown — `010-first-step-into-the-unknown` ✅ landed

- **Player sees:** on the explorer's African turn, tapping the token highlights the adjacent hexes it may enter this turn (one blank hex on foot); tapping a blank hex rolls the lost check as dice at the rail with its modifiers; on success the hex fills in with generated basic terrain (copied from a neighbour or rolled, with the composite roll if any), the token moves there, and the seat's marker appears on the hex; on failure the token stays, with a "lost" badge for the turn. The turn then ends (hunting and rations arrive in 014).
- **Introduced:** `expedition/moved` with a one-hex path; `knownHexes` per explorer; the lost check (rules §7.2, steps 1–4, foot only, no guides yet) and basic terrain generation (§7.3) in `src/lib/features/map/generate.ts`, consuming the PRNG; generated hexes in `state.map`; `MoveTargets.svelte`.
- **Scenario 010:** `targets-shown` (from Mombasa, adjacent blank hexes highlighted, known hexes not) → `lost` (seed chosen so the first attempt is lost; dice and modifiers shown; token unmoved) → `mapped` (next turn succeeds; terrain rendered; marker on hex; state `map[hex].terrain` set) → `persists-after-reload`.
- **Unit tests:** lost check per leaving terrain (`d6−1`, `−2`, `−3`, `−5`), sick −1; terrain copy from the first then second direction roll; random table with notes A and B; composite rolls (`RQ-4`); determinism: same seed, same hex.

### 11. Rivers, oases and cataracts — `011-rivers-and-oases` ✅ landed (oases and the per-explorer oasis rule are unit-tested; the scenario shows sources, a cataract, a peak and a continuation)

- **Player sees:** a newly mapped hex may now show a river crossing it, a source dot, an oasis in desert, a cataract mark, and, when tall enough, a recorded waterfall or peak height; the expedition's lost check shows "downstream: no roll" when following a river.
- **Introduced:** river generation cases 1–3, the Drainage Basin Rule with the mouth numbers from 004, lake-joining and salt-lake rules, per-explorer oasis knowledge, cataract and height rolls (§7.4–7.5); river rendering across hex edges.
- **Scenario 011:** `source-found` (seeded: a source dot and river to a neighbour) → `river-continues` (entering the neighbour draws the river through) → `cataract-and-height` (a mountain hex records a peak over 15,000 ft and a cataract) → `oasis` (a desert hex with an oasis known only to this explorer).
- **Unit tests:** each case of §7.4 with hand-built neighbourhoods; branching; drainage rule forcing continuation; uphill prohibition; oasis per-explorer rules; cataract odds per terrain; height products and thresholds.

### 12. Movement rates — `012-movement-rates` ✅ landed (the scenario shows mounted, a terrain conflict and canoes; walking two known hexes, canoe speeds by paddlers and the speed limit are unit-tested; Zanzibar's two mainland hexes are grid-adjacent, so no special case was needed)

- **Player sees:** the highlighted move targets now reflect the expedition: two known hexes on foot, four mounted, canoe speeds by paddlers, half speed through swamp, no entry into impassable terrain for the mode, a path of several hexes chosen tap by tap with the remaining movement shown as marks; a terrain conflict bounces the expedition back with an explanation at the rail; a cataract blocks canoes without eight bearers; Zanzibar's mainland adjacency.
- **Introduced:** `expedition/moved` with multi-hex paths; `movementBudget(explorer, chart)`; passability per mode; terrain conflict; the "unknown twice when mounted" rule and its lost cut-off.
- **Scenario 012:** `foot-two-known` → `mounted-four` → `canoe-along-river` → `terrain-conflict`.
- **As landed:** `mounted-four` → `terrain-conflict` → `canoe-along-river`, driven by seed 1573 and the first scripted dice (`?dice=`, see [e2e-test-guidelines.md](e2e-test-guidelines.md)); the path is still one `expedition/moved` per hex, tapped step by step against a per-turn budget of movement points shown as pips at the rail (G-32..36).
- **Unit tests:** every row of §7.1; speed limit when loads exceed carriage; slowest canoe; `RQ-13`.

### 13. Disaster cards — `013-disaster-cards` ✅ landed

Draw at the start of each African turn outside ports and Cape Colony; applicability by terrain context; losses applied to the chart; "explorer suffers instead" when the type is absent; averting rolls for askaris, doctors, missionaries, geologists; card-specific procedures from the deck CSV. Cape Colony membership computed from the map.

- **As landed:** every card's disaster face is a case in `disasters/resolve.ts` over the seeded dice; sickness is tallied per type on the explorer (`sick`) for 021 to act on; the explorer struck "instead" is recorded as sick until 026 models death; cards that need combat (16 unpaid, 29), the defeat table (46) or the poisoning table (18) record what happened and hand over to 017–019; missionary attitude against bad omens waits for 022. Scenario 013 (seed 863, dice-scripted rhino): `disaster-strikes` → `no-effect` → `rhino-charges`. Guesses G-37..43.

### 14. Hunting and rations — `014-hunting-and-rations` ✅ landed

End-of-turn hunting roll with terrain modifiers, consumption per man and per horse in desert, animals shot for food, surplus discarded; the chart updates with an animation at the rail. `RQ-7`.

- **As landed:** on `turn/ended` in the field (G-44) one die on the new `hunting` PRNG stream, modified by the camp, feeds the explorer and the well askaris' bag to the men first, then the stores; horses eat four in the desert; horses then camels are shot for ten when the stores run short; men left hungry are counted for 021. The die and the meal stay at the rail as `lastMeal` until the explorer's next turn; the food count simply changes (no animation yet, G-47). Scenario 014 (seed 863, `dice-hunting=4,1`): `fair-hunting` → `no-game`; shooting animals is unit-tested. Named PRNG streams (G-45) keep earlier scenarios' stories intact.

### 15. Water in the desert — `015-water-in-the-desert` ✅ landed

Water rations picked up in watered hexes, weights, consumption per man and animal, the oasis search, thirst order and deaths.

- **As landed:** `water/taken` (± ten rations per tap, at the rail until prompt 34 and on the camp panel since, anywhere but a dry desert hex) fills the chart's water, which already weighs four in the carrying summary; the evening in a dry desert hex (no river, no oasis known to this explorer) costs one per man and four per animal after the meal, men first in the rules' order, thirsty men dying and thirsty animals shot for their meat (G-48); a later explorer's own oasis check on entering a mapped desert hex, retried each turn while camped if the oasis exists, rolls on the `water` stream (G-49, unit-tested). Scenario 015 (seed 2, hunting 1,1): `water-taken` → `dry-camp` → `thirst`.

### 16. Natives discovered and the explorer's policy — `016-natives-discovered-and-policy` ✅ landed

Two-dice discovery per terrain (`RQ-6`), warriors as a capped product of three dice, a numbered tribe marker on the hex, the five-policy chooser at the rail with each policy's consequences explained, policy 2's retreat.

- **As landed:** discovery rolls on the `natives` stream when an explorer first enters a mapped, unpublished hex with no known tribe (each explorer once per hex, G-51); tribes live in `state.tribes` with the marker number on the hex; entering or remaining in a hex with a tribe puts the turn in the `natives` phase until `natives/policy` is chosen on an edge panel (`PolicyChooser`); policy 1 holds the expedition and forbids hunting, policy 2 retreats to `cameFrom` and removes the marker (G-53), policies 3–5 wait for the reaction roll (017). Scenario 016 (seed 18, scripted main and natives dice): `natives-found` → `retreat` → `ignored`.

### 17. Native reaction and combat — `017-native-reaction-and-combat` ✅ landed

Three-dice reaction with all modifiers shown, hide-or-attack, surprise, volley, melee rounds as a visible exchange of casualty dice.

- **As landed:** `natives/react` in `natives/reaction.ts` resolves rules §8.2–8.3 on the `combat` stream for policies 1, 3, 4 and 5 (G-55): reaction dice with modifiers, strength (hide or attack), surprise with the mounted and desert adjustments, the volley, then alternating strikes until victory or defeat; askari losses go to the chart and warrior losses to the tribe, which keeps its survivors; the rail shows the reaction and every combat die with a narrated note. Defeat's consequences and victory's spoils wait for 018 (G-57). Scenario 017 (seed 18, scripted combat dice): `the-fight` → `they-hide`.

### 18. Defeat, escape and victory — `018-defeat-escape-and-victory` ✅ landed

Consequences of defeat, captivity with per-turn escape rolls, the Escape Survival table, victory, prisoners, finding and looting the village, desertion stopping.

- **As landed:** `natives/aftermath.ts` resolves the consequences-of-defeat table (killed, held prisoner, escapes alone or with a musket, nine rations and survival rolls limited to what the expedition had), captivity as a location with an escape roll at −3 every turn, and the results of victory: prisoners (joining as bearers), the village search with a retry each turn while the explorer stays, and looting a die per warrior met; `natives/spoils` on an edge panel chooses release (attitude +3) or keep and loot. A killed explorer's seat is skipped in the turn order (G-62); desertion stopping waits for 021. Scenario 018 (seed 18, scripted combat dice): `village-found` → `looted` → `captured` → `escaped`. The rail's roll log now wraps into rows.

### 19. Negotiation and trade — `019-negotiation-and-trade` ✅ landed

Gift offers, insulted chiefs and poisoning, "give everything", trade prices rolled per item per turn, hiring natives, buying and selling across turns.

- **As landed:** a calm reaction to policy 3 or 5 opens the `negotiate` phase and a panel at the edge: offer gifts (`natives/offered`, gifts × the larger of two dice against the warriors), give everything but the men (three dice of gifts back), or decline; an insulted chief keeps the gifts (G-64) and reconsiders through the same hide-or-attack and fight as a hostile reaction, poisoning the explorer when too weak to attack (dies, recovers with a bonus, or fails). A satisfied chief rolls a price per item for sale here (animals in the desert, canoes on water, rations per gift, bearers, guides, askaris plus a musket) and the `trade` phase's panel buys and sells one at a time (`natives/traded`, `natives/done`); prior negotiation counts as local knowledge on later contacts. Scenario 019 (seed 18, scripted combat dice): `chief-satisfied` → `traded` → `given-everything`; the insult and poison path is unit-tested.

### 20. Tribe attitude — `020-tribe-attitude` ✅ landed

Per-tribe attitude persisted and applied, per-explorer bonuses for releasing prisoners, prior-negotiation and published-hex modifiers.

- **As landed:** each tribe keeps `attitude` (towards everyone: −1 for an explorer's defeat, −1 more for his death, evangelism and medicine from 022) and `regard` per seat (+3 for releasing every prisoner); both are reaction modifiers at the rail and are shown on the policy panel. Prior negotiation already counts as local knowledge (019); the published-hex modifier waits for 025. Scenario 020 (seed 18): `prisoners-released` → `remembered` → `calmer-welcome`.

### 21. Sickness, starvation and desertion — `021-sickness-starvation-desertion` ✅ landed

Starvation order, sick men and carrying, recovery and death rolls, explorer respect and askari desertion, guards on starving bearers.

- **As landed:** after the meal and the water, `starve` hands hunger to bearers, guides, askaris and the explorer in turn: hungry guides and askaris desert (askaris with muskets), hungry bearers desert unless an askari guards each, the sick cannot desert (G-68); `sicknessRound` on the `sickness` stream rolls the sick (−1 healthy doctor, +3 starving: ≤1 recovers, ≥5 dies, the explorer included) and then the starving well (4–6 fall sick); `sickCarried` halts movement when the sick outnumber animals, pairs of well bearers and canoe seats, with a halt mark at the rail. Scenario 021 (seed 863, hunting 1,1, sickness 4,5,6,1,2,3,4): `starving` → `halted` → `wasting`. Desertion stopping on a victory is not modelled (desertion is immediate, G-69).

### 22. Specialties in the field — `022-specialties-in-the-field` ✅ landed

The turn spent on evangelism, medicine, zoology or geology instead of moving; results, poison attempts, specimens carried on the chart; the zoologist-geologist two-turn rule; captured specialists.

- **As landed:** `specialty/performed` on the `specialty` stream: zoology and geology are owed to every unpublished hex entered (`research`, one turn each, movement barred until done, one attempt per specialty per hex), specimens counted on the explorer and weighed as rations; evangelism and medicine are offered on the trade panel once the chief permits and are owed before trading ends (G-71), moving the tribe's attitude, banking points in `goodWorks`, with the chief's and witch doctor's poison attempts; captives preach or treat from the rail without permission (medicine −1) and the attitude gained adds to their escape rolls. Scenario 022 (seed 18): `permission` → `preached` → `study-owed` → `specimen`; medicine and captivity are unit-tested.

### 23. Caches and reorganisation — `023-caches-and-reorganisation` ✅ landed

Leaving caches with markers, dismissing men, releasing or eating animals, carrying canoes overland, recovering a cache (`RQ-3`).

- **As landed:** a reorganise control at the rail opens an edge panel (`expedition/reorganised`: cache goods, dismiss men, turn animals loose or eat them for ten rations each); caches live in `state.caches` with a marker in the seat colour on the board, one per explorer, hex and turn; `cache/recovered` on a later turn rolls the `cache` stream (1–2 gone); another explorer's cache waits for publication (RQ-3, 025). Carrying canoes overland is already the foot rate (G-33). Scenario 023 (seed 863, cache 5): `cached` → `recovered`; eating and releasing animals are unit-tested.

### 24. Return to Europe — `024-return-to-europe` ✅ landed

Reaching a port, dismissing the expedition, sailing home, back in Europe next turn with the Europe turn resuming.

- **As landed:** `expedition/returned` at a port of entry (landed there or standing on its hex) clears the chart and sets a `homeward` location; the explorer is in Europe at the start of his next turn and the Europe turn draws as usual; markers, known hexes, specimens and good works remain for 025. Standing on a port's hex now counts as being in port for disasters and meals (G-76). Scenario 024 (seed 863): `homeward` → `back-in-europe`.

### 25. Publishing and points — `025-publishing-and-points` ✅ landed

Choosing hexes to publish in Europe, stealing contested hexes, extra cards per hex, points per hex, tribe and specimen, the published map becoming known to all, scores at each rail as countable marks.

- **As landed:** in Europe a publish control at the rail opens the claim on the board: every hex under the seat's marker is offered and a tap sends `hex/published` for it. The hex records `publishedBy`, every marker on it comes off, its points (terrain and water from `map/scoring.ts`, the tribe discovered and, for its victor, defeated) go to `state.scores[seat]`, one donation card is drawn, and the rail notes what was counted. Each rail shows its score as tally marks (`scoring/Tally.svelte`), drawn only once a point exists. A published hex is known to all: no lost check or unknown-hex cost, no natives roll, no marker, no naturalist's turn, its oasis and its caches open to everyone (RQ-3), and a +1 on reactions with policies 3 and 5; published hexes south of the Orange or draining into it join Cape Colony (G-81). Specimens and good works score on landing in Europe (G-79). A halted expedition can no longer move by a direct event. Scenario 025 (seed 26): `contested` → `published` → `stolen`.

### 26. Death and retirement — `026-death-and-retirement` ✅ landed

Explorer death from any cause, retirement from Europe, erasure of unpublished hexes nobody else visited (with the regenerate-later behaviour), commissioning a new explorer at the same seat.

- **As landed:** every death (a fight, captivity, a disaster card that strikes the explorer, poison, disease, sickness) and `explorer/retired` (a tap on one's explorer at the rail, confirmed at the edge) go through `explorers/fate.ts`: markers off, unpublished hexes only he had visited erased with their tribes and caches (so a later explorer generates them anew), his caches gone, everyone's known hexes trimmed, and `fate` recorded for the obituary at the rail. The seat's turn stays open to read the rail and ends as usual; the seat is skipped until `explorer/commissioned` again, when the new explorer starts in Europe with an empty hand. Tribe and cache numbers are never reused. Scenario 026 (seed 18, 018's dice with a 1 on the defeat die): `killed` → `successor` → `retired`.

### 27. Superlatives — `027-superlatives` ✅ landed

Highest mountain, highest waterfall, largest lake (`RQ-8`), longest river with the shortest-path source computation and the Nile's 25 off-map hexes, pre-game known records, ranked points.

- **As landed:** `scoring/superlatives.ts` ranks each superlative at the moment its hex is published against the records published before it (`state.superlatives`): a peak over 15,000 ft (8/4/2/1), a waterfall of 400 ft or more (4/2/1), a lake measured as its connected lake hexes and scored once by its first published hex (RQ-8, 4/2/1), and a river source measured from the sea along the shortest course through every river hex the table knows, plus the Nile's 25 and the Niger's 23 hexes beyond the board, ranked among the rivers known in 1820 (Niger 23, Orange 12, Senegal 10, Gambia 7) and the sources published so far (16/8/4/2/1); a source whose river has not been followed to the sea cannot be measured yet. A new record takes first place; points once scored stay (RQ-15). The publish note names what scored. Scenario 027 (seed 210): `peak-mapped` → `published`.

### 28. Epic transits — `028-epic-transits` ✅ landed

Detecting the four crossings, route uniqueness, bonus computation, the north-east exclusion.

- **As landed:** `scoring/transits.ts` recognises a crossing when an expedition steps onto a port across the continent from its port of entry (the route is every hex passed through on the trip, from `known`); the pre-printed hexes at the north-east edge (columns 22 and beyond, rows up to 11) bar it, the route must differ from every earlier route on that crossing, and four explorers at most may score one. The explorer carries the `transit` (and `state.transits` keeps them in order); each route hex he publishes earns 1, ½, ⅓ or ¼ point by his order (RQ-16), shown in the publish note and counted in the tally with its fraction. Scenario 028 (seed 43) replays a trek recorded in `trek.json` through the table's event log up to the last step onto Khartoum: `crossing` → `route-published`.

### 29. Joint expeditions — `029-joint-expeditions` ✅ landed

Pooling money, moving as one on the last member's turn, joining and splitting, shared lost checks and disasters, disputed assets.

- **As landed:** a party (`state.parties`, `explorer.party`) has one chart, held by its leader (`expedition/party.ts`: `holderOf`, `moverOf`, `leaveParty`). In Europe `voyage/booked` takes `with`: companions pool their hands' cash (tickets are never pooled) and sail and land with the leader, whose turn lands everyone. The party moves on the turn of the member last in the order, as one: one lost check, one natives roll, markers and knowledge for every member, each naturalist owing his study. The leader's turn draws the disaster and feeds every explorer from the one chart; the fight is the party's, and a defeat sends each member to the consequences table and breaks the party up. `expedition/joined` merges a chart into another's party where they stand (not on policy 1 or 2); `expedition/split` leaves with a share chosen at the edge, the rest passing to the next member; death or sailing home leaves the men with the companions. Scenario 029 (seed 26): `pooled` → `landed-together` → `moved-as-one` → `split`.

### 30. Game end and continuation — `030-game-end-and-continuation` ✅ landed

The optional round limit (`RQ-10`), ending by consensus, final retirement and publication, the winner, and starting a new game that continues the same map.

- **As landed:** a round limit is chosen beside the start control (`game/started {roundLimit}`, kept on the turn); when the order would wrap past it, or when every seat with an explorer has voted on the retire panel (`game/end-voted`), `endGame` runs: every explorer in Europe publishes all he can (scoring as usual), every explorer retires (the usual erasure), and `state.ended` records the standings and the winner or winners. The table shows the standings in the middle with a continue control; `game/continued` keeps the map (published hexes, their tribes, the superlative records, the transits) and clears scores, explorers, deck and turn so the seats commission anew and start again. Scenario 030 (seed 26, five rounds): `round-limit` → `game-over` → `continued`.

### 31. Reload and undo — `031-reload-and-undo` ✅ landed

Reload at every phase of a turn reconstructs the same screen; confirmation at the edge for consequential actions; a within-turn undo for choices not yet resolved by dice.

- **As landed:** the reducer keeps `state.undo`, the one action that can still be taken back: after every event it compares the states before and after, and an event made by the current seat that rolled no die (same `rng`), drew no card (same `deck`), kept the turn and did not end the game is undoable; `turn/undone {seat, eventId}` restores the state it was applied to (one level, as part of the event log, so a reload replays it). The rail shows a dashed undo control beside the turn controls while it applies. Reload reconstructs every phase from the log, as before; the choosers that live only on the screen (the port chooser, the claim, the reorganise and split panels) close on reload. Confirmations at the edge: ending the turn, outfitting, retiring, splitting; publication opens a deliberate claim. Scenario 031 (seed 26): `undone-voyage` → `reloaded-discarding` → `undone-outfit` → `resolved-by-dice` → `reloaded-mid-turn`.

### 32. Responsive pass at 27" and 55" — `032-responsive-27-and-55` ✅ landed

The 4K project; physical sizing of touch targets, hexes and cards from the configured diagonal; the fit check at every step with six seats occupied.

- **As landed:** the `table-4k` project (3840×2160) runs this scenario beside `table` (1920×1080); each tells the table its size with `?diag=` (55" and 27"), and the touch target is 12 mm rounded up, never under 44 px, with text and icons scaling with it (`--scale`) on a denser screen. The fit check in every scenario now also fails any control under the target (move and publish targets are hex-sized and measured by this scenario instead). Six seats occupied exposed four layout faults, fixed here: a rail's content now wraps within the seat's span of its edge and grows inward from the table's edge instead of reaching off the table or into the next seat; a ticket card, through a shared CSS class, was 55% of the hand wide and its artwork swallowed taps beside it (every scenario's ticket baselines changed); the round-limit and chart-step buttons were under 44 px; the piles sat where the second bottom seat's rail is, so they moved to the sea at the board's top-right corner. The port chooser's tap area is never smaller than the target. At 27" the board between six rails gives a 9.7 mm hex, under the 12 mm minimum, and the scenario records that the board already fills the height it has (G-107). Scenario 032 (seed 5, bottom-1 first by scripted dice): `six-seats-taken` → `six-explorers` → `six-hands-dealt` → `port-chooser` → `outfitting-at-the-edge` → `move-targets` → `denser-screen` (the same game at half the diagonal: a 78 px target).

### Post-plan changes

Slices landed after the plan's last numbered slice, at the user's direction (PROMPTS.md, prompt 10).

- **037 Physical dice** ✅ landed (prompt 18): "Physical dice" on the options screen (`dice/physical`) stops the generator; each rule that rolls says what for, and the reducer holds the event at the roll with the seat to ask, the count and the prompt in `state.awaiting` (G-131); the table shows the ask at that seat's edge with the throws already made for the action, the dicecam's status and six faces to tap, over a scrim (G-132); the dicecam is parked in the south-west corner and brought to the middle of the board while a roll is asked, two agreeing readings sending the throw as `dice/rolled` (G-133, docs/dicecam.md); the held event is applied again from the same state once the dice are in, so the log replays the game (G-134). Revisited (prompt 19): the dicecam is the table's own camera on a canvas, with the tray and the dice drawn over the picture as the Yahtzee page draws them, read by WebCamTool's analysis packaged as module workers in that repository and loaded at runtime from its hosted build through a blob import (G-133, G-135). Scenario 037: `physical-dice-on` → `first-player-asked` → `tray-read-once` → `first-throw-read` → `three-faces-tapped` → `game-started` → `lost-check-asked` → `lost` → `terrain-asked` → `mapped` → `persists-after-reload`.
- **Dice in play** ✅ landed (prompt 20): the turn is ended with an arrow in Africa, the hourglass staying a wait in Europe (G-136); a failed lost check ends the turn there and then, straight on to the hunt, or with a notice where no hunting is needed (G-137); the trade prices are one die per item, each asked for by name (G-138); a check's log line reads what it needed, the dice, the modifiers, the total and the outcome (G-139); the dicecam remembers the last throw's dice across asks and seats rather than reading them again (G-140); a compass on the board numbers the six directions as a die does (G-141). Scenario 037 gained `straight-to-the-hunt` → `last-throw-still-lying` → `hunted-and-passed`; scenario 010's `lost` step ends the turn; 007 and 010 check the control's icon.
- **The roll for first player at the stations** ✅ landed (prompts 27 and 28): each seat's throw stands in front of its own station as it comes, the winner's glows as first player and the table stands still for about three seconds (`starting`, `game/begun`) before play begins (G-143); the roll is one line in every seat's log, each seat's dice and total and who goes first (G-144). Scenario 006 gained `first-player-decided`, 037 `first-player-decided` and a reworked `first-throw-read`.
- **The tray as it lies** ✅ landed (prompt 21): the dicecam judges a throw by what lies in the tray, never by the engine's roll id (which a hand trips and a tossed die can escape): the tray as it lies when an ask opens and the throw last taken are ignored, anything else is a throw, the engine's first reading of the run is the tray as found, and the status line waits for a roll (G-142). Scenario 037 gained `tray-as-found`, and its hunt is thrown under the lost die's name.
- **A throw in parts** ✅ landed (prompt 33): a throw of more dice than the tray holds (the loot, a die a warrior) is gathered over several throws: each throw the dicecam reads or each tapped face goes in as its own `dice/rolled`, the prompt counts them ("4 of 12 in"), and "Roll the rest" has the table draw the rest from the generator (`auto`); the dice rolled are placed where the held event reads them, so a scripted scenario can turn physical dice on part way (G-147). Scenario 018 gained `loot-asked` → `loot-part-thrown` and reworked `looted`; the dicecam stub helpers moved to `tests/e2e/helpers/dicecam.ts`.
- **The camp panel** ✅ landed (prompt 34): the reorganise panel shows how the expedition as it stands can move (the outfitting screen's movement notes, now `MovementNotes.svelte`), takes and pours water (the rail's water controls are gone), and lists the caches on the hex with their goods: this round's give goods back item by item (`take`), earlier ones are dug up with the die as before (G-148). Scenario 015 takes its water on the panel; 023 gained `taken-back`; every rail baseline reflowed.
- **The lines so far on the dice prompt** ✅ landed (prompt 34): a physical die asked for part way through a step comes with the step's log lines so far, verdicts included, so the prompt reads "Lost check needs 2+ [4] found the way" above the next ask rather than the bare die (G-149). Scenario 037's `terrain-asked` and `straight-to-the-hunt` read them.
- **The disaster card read first** ✅ landed (prompt 34): a turn in the field opens on its disaster card, shown in full at the player's edge (`DisasterCard.svelte`, phase `disaster`, `turn.disaster`); a tap sends `disaster/faced`, which applies, logs and discards it, and asks for its dice only then (G-150). An action sent with the card unread faces it first, so older event streams replay unchanged. Scenario 013 gained `card-drawn`; every scenario's end-turn helper reads the next seat's card (`tests/e2e/helpers/turn.ts`).
- **One line at the rail** ✅ landed (prompt 34): the rail's latest line never wraps, so a roll and its result stay together: a check's "needs" is cut to its numbers at the rail, a long result to an ellipsis, and the line may run to eighteen targets; the open log is twelve targets wide (G-151). Every baseline with a long rail line regenerated and compared.
- **The rail in two sections** ✅ landed (prompt 35): a seat's rail is the status row at the player's edge (name, hat, hand, expedition, controls, the camp's control now a cairn) and, inward of it, the log in an outlined box that is a pill round the latest line when collapsed and grows inward to hold a few earlier lines when the "+" opens it, the "−" collapsing it; the status row never moves (G-152). Scenario 036 reads the two sections and the box's growth; every rail baseline regenerated and compared.
- **Each die on its own** ✅ landed (prompt 36): the dicecam judges a reading die by die: a die with the same face up within a die's width of where a die lay in the tray as it lay is resting, every other die is the throw, so a die tossed in beside three lying there is a throw of one, one of the three picked up and rolled is a throw of one, and a throw gathered in parts (sixteen shots at the baboons) can be rolled a die at a time as the dice pile up, a few at a time, or by rolling some again; the status line counts the dice thrown (G-153). Scenario 037's hunt die is tossed in beside the lost die; scenario 018 gained `fifth-die-tossed-in`.
- **A die set right** ✅ landed (prompt 37): every die in the log knows the throw it came from; a tap on it opens a radial menu of the six faces round the die and the face chosen goes as `dice/corrected`, which the reducer applies by folding the game again with the die changed, or refuses with the reason when the game could not have gone on as it did (a later action refused, a later throw answering another ask), shown at the seat's edge (G-154); a tap on a die in the dicecam's picture has it read again, two agreeing readings of another face correcting it, and a second tap opens the six faces over the picture (G-155). Scenario 037 gained `die-tapped-at-the-rail` → `hunt-die-set-by-hand` → `correction-refused` → `die-tapped-in-the-picture` → `die-read-again` → `die-menu-in-the-picture` → `die-set-from-the-picture`.
- **The camp in two columns** ✅ landed (prompt 38): the goods cached this turn stand in a column to the right of the expedition's, item by item, with the take-back control between the columns instead of in rows at the bottom (G-156). Scenario 023's `cached` and `taken-back` read the columns.
- **The camp's one line** ✅ landed (prompt 39): everything reorganised in a turn at one place is one line of the log, summed per action and item and written again as each tap adds to it, instead of a line a tap (G-157). Scenario 023's `cached` and `taken-back` read the line.
- **Movement on the trade panel** ✅ landed (prompt 40): the trade panel shows how the expedition as it stands could move, as the outfitting screen and the camp do, counting each purchase (G-158). Scenarios 019 and 022 read it.
- **009 Outfitting revisited** ✅ landed (prompt 15): the panel is headed by the port with foot, canoe and horse/camel buttons that spend the whole budget like the rules' sample expeditions (G-124); every item is named above its icon and price; the people line says how the expedition could move: overland, by canoe at one to four hexes with the cataract mark once eight bearers can portage, mounted (G-123); the step is ×1/×5/×10; done becomes a confirmation in place that a tap anywhere else takes back (G-125). Scenario 009: `price-list` → `sample-canoe-expedition` → `done-asks-to-confirm` → `mounted-outfit` → `canoe-outfit` → `confirmed`.
- **036 The log** ✅ landed: a "+" at the end of the rail's roll log opens the full, scrollable list of the turn at the player's edge; "−" in its place closes it (G-122). Revisited (prompt 16): every action that rolled nothing is a plain line in the list, so the "+" is there from the turn's first action (G-126). Revisited again (prompt 17): the rail reads the log's latest line and the "+" opens the rest directly above it, the list's "−" over the rail's (G-127); the log spans the whole game, round by round, the meal closing each turn in the field and the landing logged for the turn at sea (G-128); the roll for first player is read in the log, not at the rail (G-129). Scenario 036: `latest-line-at-the-rail` → `log-opened-above` → `lost-check-is-the-latest-line` → `log-expanded` → `log-closed`.
- **007/008 Europe's two choices revisited** ✅ landed (prompt 17): the end-turn control is an hourglass that takes the check mark in place with the "✕" to its left; the ship takes the check mark with the "✕" to its right, a port tap chooses and the check mark books (G-130). Scenario 007 gained `hourglass-asks-to-confirm`; scenario 008 gained `port-chosen`.
- **035 Options** ✅ landed: a gear at the north-west and south-east corners opens the options screen, turned toward its corner: screen size with a bank-card outline (G-120), every seat's QR code (G-121), and "End this game" by agreement with a confirmation (G-118, G-119); the vote on the retire panel is gone (G-101). Scenario 035: `options-from-the-corner` → `screen-size-set` → `ended-by-agreement`.
- **Hosted relay** ✅ landed (scenario 002): the relay protocol is the ARViewer relay's, which Jaipur uses; the deployed table points at the hosted relay so phones can take seats from it (G-117).
- **Tooltips** ✅ landed (scenario 034, `hover-explains`): every labelled control and marker carries its label as a tooltip for a mouse (G-116).
- **034 The table fills the screen** ✅ landed: once the game starts, seats nobody took show nothing and the board takes the free edges (G-114); the layout follows the window on resize (G-115). Scenario 034: `six-seats-offered` → `free-edges-to-the-board` → `window-resized`.
- **033 Map legibility** ✅ landed: Luanda moved one hex west onto the coast (c7r19, G-4); port names placed by hand in the sea beside their ports, upright for the south edge (G-112); river names at their mouths beside the drainage numbers (G-113). Scenario 033: `ports-named-in-the-sea`.

## Definition of complete

- Every scenario in the map has landed and passes with zero-pixel tolerance on Linux.
- A full game is playable on one table: six explorers commissioned, at least one voyage, outfitting, exploration generating terrain, rivers, natives and disasters, a death with erasure, a return and publication, a superlative scored, an epic transit, and a winner declared at the round limit.
- Every section of [rules.md](rules.md) is implemented or explicitly listed as a variant deferred to a later milestone, and every `RQ-n` is pinned by a unit test.
- Reloading at any point reconstructs the same state and screen.
- All screens satisfy the [tabletop-ux.md](tabletop-ux.md) checklist with one to six seats occupied, at 27" and 55".
