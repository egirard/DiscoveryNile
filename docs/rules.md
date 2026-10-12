# Source of the Nile: rules summary for implementation

An implementation-oriented restatement of the 1978 rules, organised the way the reducer will meet them. It is a summary: the vendored original in [`rules-reference/source-of-the-nile-rules.md`](rules-reference/source-of-the-nile-rules.md) is the authority and wins on any disagreement (see [`rules-reference.md`](rules-reference.md)). Section references in the form *(Rules: Exploring: Mapping)* point at the original's headings. Open questions are collected at the end as `RQ-n` items and are cited from tests and commits.

## 1. The game in one paragraph

Players are 19th-century explorers. Each raises money in Europe by drawing donation cards, sails to one of 13 African ports, outfits an expedition, and walks, rides or paddles into a hex map whose interior is blank. Entering a blank hex generates its terrain, rivers, and possibly natives semi-randomly from dice and the neighbouring hexes. Discoveries only score when the explorer returns to Europe and **publishes** them; an explorer who dies takes every unpublished hex with him and the hexes are erased. A game runs to an agreed time limit; most points wins. Luck is large, competition with other players is incidental, the continent is the opponent. *(Rules: Description of Game)*

## 2. Components as data

- **Map.** Africa from Khartoum to Capetown and Lagos to Mombasa on a pointy-top hex grid. The periphery (territory known c. 1820) is pre-printed; the interior is 452 blank hexes. The board carries a **directional indicator**: six directions numbered 1 to 6 clockwise starting at north-east (1 = NE, 2 = E, 3 = SE, 4 = SW, 5 = W, 6 = NW). Pre-printed river mouths carry a **drainage number** (see §7.4). Ports of entry: Khartoum, Mombasa, Zanzibar, Kilwa, Quilimane, Lourenço Marques, Durban, Port Elizabeth, Capetown, Benguela, Luanda, Calabar, Brass. *(Rules: Description of Game; Getting to Africa; map board)*
- **Terrain.** Six basic types, each with a number used by the random table: 1 desert, 2 mountain, 3 swamp, 4 jungle, 5 veldt, 6 lake. Jungle may combine with swamp or mountain (jungle-swamp, jungle-mountain); no other combinations. Features: river, river source / end (blue dot), oasis (desert only), cataract (on a river), recorded waterfall height, recorded peak height. *(Rules: Exploring: Mapping)*
- **Cards.** One deck of 48 cards, each with a **donation** face (used in Europe) and a **disaster** face (used in Africa). Data per card is in [`rules-reference/source_of_the_nile_1978_deck.csv`](rules-reference/source_of_the_nile_1978_deck.csv): 32 money donations ($5 to $500, including two whimsical special donations of $77 and $5), 12 free tickets each tied to one port, 4 cards with no donation. When the draw pile is empty the discards are shuffled and added to the bottom. *(Rules: Starting the Game; Disasters)*
- **Per player.** An explorer token on the map, cache markers, coloured hex markers for visited-but-unpublished hexes, and an Expedition Organization Chart tracking men, animals and supplies. Native tribes are numbered white markers with details recorded separately. *(Rules: Starting the Game; Expedition Organization)*
- **Dice.** Six-sided only. Many results are products of dice (warriors, heights).

## 3. Setup

1. Each player chooses which specialties the first explorer has: any subset of evangelism, medicine, zoology, geology, or none ("ordinary explorer"). A specialty is permanent for that explorer. *(Rules: Starting the Game; Explorer Specialties)*
2. Each player rolls four dice; highest total plays first; play proceeds clockwise. *(Rules: Starting the Game)* `RQ-1` tie-break.
3. Every explorer starts in Europe with five donation cards dealt face up. There is no secrecy in donations. *(Rules: Starting the Game)*

## 4. A turn in Europe

Each turn an explorer stays in Europe, in order: *(Rules: Starting the Game)*

1. Discard every free ticket held (tickets cannot be saved; they are usable only on the turn after being drawn).
2. Discard down to five cards if above five.
3. Draw one card.
4. Optionally publish any unpublished hexes carrying the player's markers, drawing one extra card per hex published (§12).
5. Optionally decide to sail: see §5.

## 5. Getting to Africa

The player names a port of entry and **skips one turn** while the token moves there. During that wait the player outfits the expedition from the price list, up to the budget, and pays **$500** for passage unless holding a free ticket for that port (`RQ-2`: the original's sentence is garbled; this is the reading taken). Unspent money is lost. Zanzibar counts as adjacent to the two coastal veldt hexes for movement, no canoe needed. *(Rules: Getting to Africa)*

### Price list *(Rules: Expedition Organization)*

| Item | Price | Where |
|---|---|---|
| Guide | $50 | any port, or friendly tribe |
| Bearer | $10 | any port, or friendly tribe |
| Askari | $50 | any port, or friendly tribe |
| Camel | $50 | Khartoum only (or desert tribes) |
| Horse | $50 | Capetown, Durban, Port Elizabeth only |
| Canoe | $50 | any port |
| Musket | $10 | ports only |
| Food ration | $2 | any port |
| Gift | $2 | any port |

### Personnel and equipment rules *(Rules: Expedition Organization)*

- **Bearers** carry, paddle, lead animals. Will not hunt, fight, guide. Load: 10 food, or 2 food + 2 water, or 10 gifts/muskets. Eight bearers carry one canoe. One bearer leads up to three camels or horses.
- **Guides** only guide (§7.2). A guide never gets lost in his home hex and helps in hexes adjacent to it.
- **Askaris** hunt and fight. Will not guide, carry, paddle.
- **Camels** must be led or ridden; led: 20 rations or equivalent; ridden: rider + 5 rations. Askaris and guides ride but do not lead. No jungle, swamp, lake.
- **Horses** as camels but allowed in jungle; no swamp, lake; in desert each eats 4 food rations per turn.
- **Canoes** carry 12 men and unlimited food, gifts, muskets; no animals. Paddled and carried only by bearers.
- **Muskets** weigh one ration; gifts or hiring currency for askaris inland.
- **Food**: one ration per man per turn. A shot camel or horse yields 10 rations for men.
- **Water**: free wherever there is water; needed only to enter a desert hex without river or oasis. A water ration weighs four food rations. Men drink 1, horses 4 per turn; camels 4 per turn or 8 every other turn. Shooting thirsty animals is allowed; shooting thirsty men is not.
- **Gifts** weigh one ration.
- **Explorer respect**: if the explorer does bearer work (carrying, paddling, leading animals), one askari deserts per turn until a victory over natives or a dangerous animal is killed by a suitable disaster card.
- **Caches and reorganisation**: any turn an expedition may cache canoes, rations, gifts or muskets (cache marker, contents recorded), release or eat animals, or dismiss men. Dismissed men and animals vanish. Returning to a cache: roll one die, on 1 or 2 it is gone. Other explorers' caches are findable only in published hexes (`RQ-3`).
- **Speed limit**: an expedition that cannot carry all its men and supplies with its canoes, horses or camels moves at the on-foot rate.

## 6. A turn in Africa *(Rules: Order of a Turn)*

1. **Disaster** card, unless in a port of entry or in Cape Colony.
2. **Either** exploration (movement, lost check, mapping, native discovery) **or** a specialty action (geology, zoology, medicine, evangelism). Never both.
3. **Natives**: policy, reaction, then combat or negotiation and trade.
4. **Hunting and rations.**
5. **Starvation, sickness, desertion.**

**Cape Colony** is every published and pre-printed hex along the Orange and Vaal and their tributaries plus everything south of the Orange. In it no disaster is drawn and nobody starves (an already-sick explorer may still die). *(Rules: Disasters: Cape Colony)*

## 7. Exploration

### 7.1 Movement *(Rules: Exploring: Movement)*

"Known" hexes are those this explorer has passed through, pre-printed, or published. Everything else is "unknown" to him.

| Mode | Known hexes / turn | Unknown | Notes |
|---|---|---|---|
| On foot | 2 | 1 | cannot enter lake or swamp |
| Mounted (all men and loads carried) | 4 | 2 known + 1 unknown, or 2 unknown in succession (a lost result on the first ends movement) | camels: no jungle, swamp, lake; horses: no swamp, lake |
| Canoe, ≥ 8 paddlers per canoe | 4 | 2 | |
| Canoe, 4–7 paddlers | 3 | 1 | |
| Canoe, 2–3 paddlers | 2 | 1 | |
| Canoe, 1 paddler | 1 | 1 | |
| Canoe, no paddlers | 1 downstream only | — | drifting |

- An expedition moves at its slowest canoe. Canoes follow rivers through any terrain, the coastline, and cross lakes; through swamp at half speed and needing 8 paddlers to enter an unknown swamp hex; never into jungle-swamp. Canoes can be carried overland by 8 bearers each (those bearers carry nothing else) at on-foot speed.
- **Cataracts** block canoes unless at least 8 bearers portage (§7.5).
- **Terrain conflict**: entering an unmapped hex and finding terrain the mode cannot use sends the expedition back to its previous hex at the end of the turn; the hex still counts as mapped by that explorer.

### 7.2 Becoming lost *(Rules: Exploring: Becoming Lost)*

Checked once per attempt to enter an **unknown** hex; lost means the expedition stays where it is for the turn.

1. Terrain of the hex being **left**: following a river downstream → never lost (stop). Upstream → d6 − 1. Leaving lake, desert or veldt not along a river → d6 − 1. Leaving swamp or mountain → d6 − 2. Leaving jungle → d6 − 3 (jungle-swamp or jungle-mountain → d6 − 5).
2. Guides: a guide hired in the hex being left → never lost (stop). A guide hired in an adjacent hex → +1.
3. Explorer sick, wounded or starving → −1.
4. Result ≤ 0 → lost.

Joint expeditions check once as a group. *(Rules: Joint Expeditions)*

### 7.3 Mapping basic terrain *(Rules: Exploring: Mapping: Basic Terrain Generation)*

On reaching a blank hex:

1. Roll d6 → a direction on the indicator. If the adjacent hex in that direction is mapped, copy its basic terrain. Otherwise roll once more; if that neighbour is mapped, copy it.
2. Otherwise roll d6 on the random table: 1 desert (veldt instead if any neighbour is jungle), 2 mountain, 3 swamp, 4 jungle (veldt instead if any neighbour is desert), 5 veldt, 6 lake.
3. If random terrain was jungle: roll d6 again, 3 adds swamp, 2 adds mountain, else nothing. If it was swamp or mountain: roll d6, 4 adds jungle (skip this roll if any neighbour is desert).

`RQ-4`: whether composite checks also apply when terrain was copied from a neighbour (reading taken: no; copying copies the composite).

### 7.4 Rivers and oases *(Rules: Exploring: Mapping: Rivers and Oases)*

Lake, swamp and jungle-swamp hexes have no visible river course: skip. Otherwise, three cases decided by mapped neighbours:

1. **Rivers flow out of the new hex** (a neighbour has a river entering from this hex). More than one such river → the hex must be lake, swamp or jungle-swamp: replace basic terrain by a random roll among those three. Exactly one: if other rivers flow *in* from neighbours, all connect. If not, roll a direction; if the neighbour there is lake, swamp, jungle-swamp or unexplored (and not already connected downstream, which would mean water flowing uphill), the river comes from there; otherwise the river **ends** in this hex, unless the Drainage Basin Rule forbids ending, in which case it **branches** into two, each resolved again (at most one may end; two branches reaching the same neighbour rejoin around an island). If only one permissible neighbour exists and ending is forbidden, connect without rolling. If no neighbour is permissible the river ends regardless. Mark an end with a blue dot.
2. **Rivers flow into the new hex.** If every neighbour is explored and none is lake/swamp/jungle-swamp or carries the outflow, the whole hex becomes a **great salt lake** (replacing its terrain). Otherwise roll directions until a permissible neighbour (lake, swamp, jungle-swamp, unexplored, not already connected) is found; the river crosses to it. Several inflows join into one outflow.
3. **No rivers in or out.** Roll d6: odd → no river. Even → roll a direction; if that neighbour is lake, swamp, jungle-swamp or unexplored, a **source** is placed in the hex centre and a river flows to that neighbour; otherwise nothing.

- **Oases**: desert hexes never get a source; a "source" result in desert is an **oasis**, the only way an oasis appears. Rivers cross desert only to or from already-explored neighbours. Oases are certain only for whoever found them: each explorer checks once on first entering an unpublished river-less desert hex; later attempts are allowed only if the first explorer there found one. Published hexes reveal their oasis to all. Water rations for the search must be picked up in the hex being left.
- **Drainage Basin Rule**: each pre-printed river mouth carries a number; at least that many hexes of river, swamp, jungle-swamp or lake must be connected to the mouth before the river may end in a new hex while a connectable neighbour exists (a branch may end if the other continues). If an unsatisfied river's branches all ended in lake/swamp/jungle-swamp, or a river enters such a hex with no outflow, and one to six unexplored hexes border that water body, the river **must** continue through one of them: whoever maps one of those hexes treats it as case 1 (unless that hex is itself lake/swamp/jungle-swamp). More than six such hexes: explore until six remain. None: the system ends.
- **Lakes**: two lakes already joined by a river cannot also be joined by a lake hex; such a hex becomes swamp. A lake with no inflow is landlocked.

Numbers read from the board photograph at the pin (to be verified during the map transcription, see `RQ-5`): White Nile 35, Congo 25, Zambezi 16, Orange 14, Limpopo 13, Ogooué 10, Cunene 10, Rufiji 10, Niger 6.

### 7.5 Cataracts and peaks *(Rules: Cataracts; Mountain Peaks)*

- Whenever a river is mapped in a new hex, roll d6: cataract on 1 in jungle or veldt; 1–2 in desert; 2–4 in mountain; never in lake, swamp, jungle-swamp. A cataract sits downstream of any branch in the hex.
- First discovering a cataract while canoeing downstream: d6 − 3 canoes are lost over the falls.
- Cataract height: product of four dice in feet; record (blue) if ≥ 400.
- Mountain peak: whenever mountain terrain is discovered, product of three dice + 100, in hundreds of feet; record (brown) if > 150 (15,000 ft).

### 7.6 Marking hexes *(Rules: Exploring: Marking Explored Hexes)*

Finishing mapping a hex, or entering a hex mapped but unpublished by someone else, places the explorer's coloured marker there. Several players may hold markers on one hex.

### 7.7 Discovering natives *(Rules: Exploring: Discovery of Natives)*

The first time each explorer enters an unpublished hex not known to hold natives, roll two dice:

| Hex | Natives on |
|---|---|
| lake | 2–3 |
| veldt, swamp, jungle | 2–4 |
| mountain | 5–6 |
| river or oasis | 7 |
| desert without water | never |

`RQ-6`: whether "river or oasis" is an additional roll result for a hex that also has terrain natives (reading taken: a hex with a river or oasis finds natives on its terrain numbers *or* 7).

Warriors = product of three dice, but the largest die is capped at the distance in hexes to the nearest port of entry. Place a numbered tribe marker and record the tribe.

## 8. Natives

### 8.1 Policy *(Rules: Natives: Explorer Policy)*

Whenever an explorer enters, remains in, or discovers natives in a hex, choose a policy: **1** defensive stand (no hunting, research, trade, or leaving until next turn), **2** immediate retreat to the previous hex (marker removed, credit lost unless published; remaining movement may be spent), **3** cautious show of force, **4** ignore them, **5** open friendly approach.

### 8.2 Reaction *(Rules: Natives: Native Reaction)*

Roll three dice. Target = distance to nearest port + policy number, + 2 if policy 4 or 5 with no askaris (+1 more if also unarmed), + 1 if policy 3 or 5 and (a guide from an adjacent hex, or prior negotiation with this tribe, or the hex is published), ± the tribe's attitude level. Target ≥ roll → not hostile this turn; with policy 3 or 5 the explorer may negotiate (§8.5).

Hostile: roll d6 × askaris ÷ policy number. Greater than the warriors → they hide (no negotiation possible). Otherwise they attack: roll two dice for surprise (+1 if outside desert and entirely mounted; −1 if in desert and not entirely mounted); result < policy number → surprised.

### 8.3 Combat *(Rules: Combat Resolution)*

- **Not surprised**: askaris and explorer each fire once, killing one warrior each. d6 × killed > remaining warriors → natives driven off (victory). Otherwise melee; no reloading.
- **Surprised**: no shots. Askari casualties = warriors ÷ d6 (floor). All askaris dead → defeat. Else d6 × casualties > original askaris → they break (defeat).
- **Melee**: native casualties = remaining askaris ÷ d6 (floor) + 1; d6 × that > remaining warriors → victory; else repeat alternating casualty and morale checks until one side is finished.

### 8.4 Defeat and victory *(Rules: Consequences of Defeat; Results of Victory)*

Defeat: d6 → 1 or less: explorer killed; 2: held prisoner (roll again each turn at −3; remains until killed, escaped or retired); 3: escapes alone, no food, no weapons; 4: musket + 9 rations; 5: that plus one Escape Survival roll; 6+: plus two rolls. Survival table: 1 guide, 2 bearer\*, 3 askari, 4 camel\*, 5 horse\*, 6 canoe\*; starred items carry d6 → 1–3 ten rations, 4–5 ten gifts, 6 ten muskets; impossible results re-roll. Captured missionaries and doctors may add attitude gains to the escape roll (§9).

Victory: the explorer may stay and claim the hex; desertion stops. Prisoners = surviving askaris − d6 (capped at surviving warriors); on a 6 no prisoners and the village is looted automatically if found. Village found if two dice ≤ prisoners + policy number (may retry on later turns). Then either release prisoners (attitude +3 towards this explorer) or keep them as bearers and loot: per original warrior d6 → 1–4 that many rations, 5 one gift, 6 a camel (desert) or canoe (river/lake/swamp). Defeated desert tribes also yield one camel per prisoner.

### 8.5 Negotiation and trade *(Rules: Natives: Negotiation; Trading; Poisoning)*

Offer gifts: roll two dice; gifts × larger die < warriors → the chief is insulted, re-checks hostility, and attempts **poisoning** if too weak to attack. Giving everything except men always satisfies and returns 3d6 gifts. A satisfied chief permits evangelism, medicine, trade. Trade prices roll per item per turn: camel/horse/canoe 1–6 gifts (camels and horses in desert hexes, canoes on water), rations 1–6 per gift, bearers and guides 1–6 gifts, askaris 1–6 gifts + 1 musket.

Poisoning: d6 → 1–2 explorer dies; 3 recovers (+1 on future poison rolls); 4–6 fails.

### 8.6 Attitude *(Rules: Natives: Attitude Levels)*

Per tribe, starting at 0: defeat of an explorer −1, explorer killed −1 more, prisoners all released +3 (towards that explorer only), evangelism and medicine successes as rolled (towards everyone). Added to the policy number on later contacts.

## 9. Specialties *(Rules: Explorer Specialties)*

- **Evangelism**: must preach to each new tribe once permitted. d6 → 1 no effect; 2 +1; 3 +2; 4 +3 and chief and witch doctor each try poison; 5 +4 and chief tries poison; 6 +5. Captured missionaries preach without permission; gains add to escape rolls. Scores up to 5 per tribe by attitude induced. Missionaries may also spend a turn preaching to their own men against taboo/magic disasters (d6 − 2 to men's attitude; > 5 ignores such cards; 1–5 ignore on d6 ≤ attitude).
- **Medicine**: must treat each new tribe. d6 → ≤1 explorer dies of disease; 2 explorer sick; 3 epidemic unhalted, chief poisons, −1; 4 nothing; 5 +1, witch doctor poisons, 1 point; 6+ +2, two poison attempts, 2 points. Captured: treat at −1. Doctors subtract 1 from medical disaster rolls and from sick men's rolls; a 6 prevents a sickness disaster.
- **Zoology**: must spend a turn in every unpublished hex entered; one specimen per hex on d6 = 1 lake; 2–3 veldt or swamp; 2–4 jungle; 4–5 mountain; 6 desert; 1 if river or oasis present. +1 to the explorer's own hunting; kills animals on 5–6 in animal disasters. Specimens are carried as one ration each (unlimited by canoe) and score 1 each in Europe.
- **Geology**: must spend a turn in every unknown hex entered; specimen on d6 = 1 swamp or jungle without mountain; 1–2 jungle-mountain or veldt; 1–4 mountain without jungle; 1–3 desert; 6 if a river; never in lake. Immune to rockslide and flash-flood disasters. A zoologist-geologist spends one turn on each.

## 10. Disasters *(Rules: Disasters)*

Each African turn outside a port or Cape Colony, draw a card and apply its disaster face if its terrain context matches the explorer's situation, otherwise discard with no effect. When a card kills or sickens a type of man the expedition lacks, the explorer suffers it. Averting: askaris and explorer roll d6 per animal attack, each 6 kills one animal (zoologist 5–6); doctors roll d6, 6 averts sickness/poison/snakebite; missionaries' men may ignore taboo/magic cards (§9); geologists ignore rockslides and flash floods. Canoe losses: overturned canoes keep the canoe but lose contents; sunk canoes are lost; drowned men = two dice. Joint expeditions: d6 per explorer, low roller suffers. Card-specific procedures (tolls, rhino charges, baboons, cannibals as a policy-4 encounter, elephants as a defeat roll + 2, poisoned oasis, bad omens) follow the card text in the deck CSV.

## 11. Hunting, rations, survival *(Rules: Hunting; Starvation, Sickness and Desertion)*

- Hunting: one d6 for the expedition (`RQ-7`), −4 desert, −3 lake, −1 swamp, +1 jungle, +2 river or oasis: ≤1 nothing; 2–3 one ration per hunter; 4–5 two; 6+ three. Hunters are the explorer and the askaris; zoologist +1 for his own share. Surplus does not keep. Policy 1 forbids hunting.
- Each man eats one ration; horses in desert eat 4.
- Starvation: shoot animals for 10 rations each first; then bearers starve, then guides, askaris, explorer. Starving guides and askaris desert (askaris take muskets); starving bearers stop working and desert unless each is guarded by an askari. Each starving man: d6 4–6 → sick.
- Sickness: sick men must be carried (animal, two unladen bearers, or canoe) or the expedition halts. Per sick man per turn d6, −1 with a healthy doctor, +3 if also starving: ≤1 recovers; ≥5 dies; otherwise still sick.
- Thirst in dry desert: guides go without first, then bearers, askaris, explorer; anyone without water dies.

## 12. Returning, publishing, scoring

- **Return** *(Rules: Return to Europe)*: at any port, dismiss the men (supplies go to them), sail home free. Back in Europe next turn; any port may be used.
- **Publishing** *(Rules: Publishing Discoveries)*: only in Europe; any hex carrying the player's marker, even if someone else mapped it first; the first to publish wins the hex and all markers there are removed; one extra card per hex. Until publication the visitor keeps private advantages (speed, known cataracts and oases, known native mood, lower lost risk); publication reveals the hex to all.
- **Death or retirement** *(Rules: Scoring)*: remove the explorer's markers; erase unpublished hexes nobody else has visited (their contents become rumour and are regenerated later). A retired explorer in Europe publishes first. The player then starts a new explorer in Europe; one explorer per player at a time.
- **Points** *(Rules: Scoring)*: desert, veldt, lake, river hex 1 each; jungle, swamp, oasis 2 each; composites add (jungle-swamp 4; a river adds 1 to any hex); mountain is not listed (`RQ-14`). Tribe discovered 1, defeated 1, doctored 1–2, evangelised 1–5. Specimens returned 1 each. Superlatives: highest mountain over 15,000 ft 8/4/2/1; largest lake 4/2/1 (`RQ-8`: "largest" undefined in the original); highest waterfall over 400 ft 4/2/1; source of the longest river 16/8/4/2/1. Longest river: the lake/swamp/jungle-swamp/source hex farthest from the mouth along the shortest river path is the true source; ties go to the first published; the Nile has 25 off-map hexes. Known at start: Atlas and Drakensberg peaks of about 15,000 ft, no large lakes, several waterfalls of about 400 ft, rivers White Nile 33 hexes (source unknown), Niger 23, Orange 12, Senegal 10, Gambia 7.
- **Epic transits**: first completion of each of four crossings (Khartoum↔Cape Colony ports; Khartoum↔east-coast ports north of Durban; Khartoum↔west-coast ports north of Capetown; west coast north of Capetown↔east coast north of Durban) scores the number of previously unpublished hexes on the route; later explorers on different routes score ½, ⅓, ¼ point per previously published hex; every bonus hex must be published; the north-east pre-printed hexes may not be used.
- **Game end** *(Rules: Description of Game)*: an agreed time limit; all explorers retire; highest score wins. A game may be continued from where it left off.

## 13. Joint expeditions *(Rules: Joint Expeditions)*

Players may pool money (not tickets) and move as one expedition on the last member's turn; expeditions meeting in a hex may join unless either is on policy 1 or 2; they may split any time (disputed assets go to the high die per item); lost checks and disasters are shared as above; each hex is published by exactly one of them.

## 14. Decisions this implementation makes

These are not in the rules; they are recorded so the code and the plan agree.

- **D-1 Dice are seeded.** Every roll comes from the game's seeded PRNG in rule order; events carry choices, never outcomes. Rolls are displayed as dice faces at the acting seat so the game stays legible as a dice game.
- **D-2 No hidden information.** Donations are face up by rule and the map is shared by rule; private-to-explorer knowledge (oases, cataracts, native mood, "known" hexes) is tracked per explorer and enforced by the reducer, but displayed on the table as the physical board does. No phones are required.
- **D-3 Up to six explorers.** The rules give no maximum; the table offers six seats (two on each long edge, one on each short edge). `RQ-9`.
- **D-4 Game length.** The table records an agreed round limit at start (default: none, ended by consensus from the table). `RQ-10`.
- **D-5 Geography is data.** The board is transcribed into a manifest (grid, pre-printed terrain, rivers, ports, drainage numbers) from the pinned photograph; it is rendered with original iconography, never the scanned art.

## 15. Open rules questions

| # | Question | Sources | Smallest interpretation taken |
|---|---|---|---|
| RQ-1 | Tie on the four-dice first-player roll | Starting the Game | Tied players re-roll among themselves |
| RQ-2 | Garbled sentence: "unless he has a 'free ticket' card and the port of entry he has chosen" | Getting to Africa (md and pdf identical) | A ticket pays passage only to the port printed on it |
| RQ-3 | Garbled: "Explorers can only find other explorers' caches published in published hexes" | Expedition Organization: Caches | Another explorer's cache is visible and usable only once its hex is published |
| RQ-4 | Do composite (jungle-swamp/mountain) rolls apply when terrain is copied from a neighbour? | Basic Terrain Generation | No; copying copies the neighbour's full terrain |
| RQ-5 | The board was transcribed from a photograph (`tools/mapfit/`): a 27×42 pointy-top grid, 626 land hexes, **447 blank** against the rulebook's 452; ports, rivers and drainage numbers read by eye. Uncertain hexes: the Congo's printed course (c6r16–c7r16–c7r15), the Rufiji's inland end (c22r20), the Zambezi's (c18r26), the Limpopo ending in jungle-swamp c19r30, Durban's terrain (mountain), Port Elizabeth's (mountain), the Cunene mouth (desert), coastal land/sea calls at c3r8, c19r31, c18r33, and swamp-versus-veldt symbols in the Cape and Limpopo lowveld | map.jpg | Pinned by unit test at 447 blank and 626 land; verify against the physical board and regenerate `board.json` |
| RQ-6 | Natives table row "River or Oasis: 7": additional to, or instead of, the terrain row? | Discovery of Natives | Additional: a river/oasis hex finds natives on its terrain numbers or on 7 |
| RQ-7 | One hunting roll per expedition or one per hunter? | Hunting and Adjustment of Rations | One roll per expedition, applied per hunter; zoologist +1 only to his own share |
| RQ-8 | "Largest lake" is undefined in the original; the modernized edition says connected surface area | Scoring; modernized §12 | Count of connected lake hexes, first published breaks ties |
| RQ-9 | Maximum number of players | Starting the Game | Six seats |
| RQ-10 | What ends the game | Description of Game | Optional round limit chosen at start, else ended by consensus |
| RQ-11 | Deck CSV port spellings "Laurenco Marques", "Launda" vs rules "Lourenco Marques", "Luanda" | deck.csv rows 22, 33 | Map CSV spellings to the port ids; raise upstream |
| RQ-12 | Cards 8, 29, 31, 46 have no donation; cards 4 and 10 have special donations ($77, $5) | deck.csv | A no-donation card is drawn and discarded with no money; specials are plain money |
| RQ-13 | Movement "2 known + 1 unknown" for mounted expeditions: may the unknown hex be entered after fewer than 2 known? | Exploring: Movement | Yes; the limits are maxima |
| RQ-14 | "Areas Mapped" lists desert, veldt, lake, river, jungle, swamp and oasis but no value for a mountain hex | Scoring: Points for Published Discoveries | Taken literally: a mountain hex scores 0 on its own (peaks score as superlatives); jungle-mountain scores 2 for the jungle |
