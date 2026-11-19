# Sample turn text

The text the table shows during a turn, one step of play at a time: the prompt before a roll or a choice, and every result that can follow it. This document is the spec for that text. It is edited by hand; where the game words a step differently today, the game is to follow this document.

`bun run docs:turn-text` still plays the game's rules and writes the words the game uses today, to `docs/sample-turn-text.generated.md` (not committed), for comparing with this spec. It no longer writes this file.

## How a step is written

Each numbered step is one line of the turn's record. The line changes as the step is played:

- **Ask**: the line before the roll. It is the heading of the dice panel at the seat's edge.
- **Result**: the same line after the roll. It takes the ask's place in the record. One result is written here for each outcome that reads differently, with sample dice.
- A step with no dice (a card, a choice of policy, a trade) has a **Prompt**, the panel and its buttons, in place of the ask.

When the turn moves on to its next operation, the lines of the finished one fold into a single **Summary**. Each section below ends with its summaries.

The form of each text:

- **Ask**: "Roll N D6 for …", then at most one clause: the number to reach and what moves it. A context comes first when the roll alone would not say what it is for ("Terrain in the new hex: …"). An ask lists every face only when the roll is read from a table.
- **Result**: `Label [dice] (modifier) arithmetic => Outcome`. The label ends in a question mark when the roll answers yes or no. The arithmetic is written only when dice are combined. The outcome says what changed, with its numbers.
- **Summary**: `Operation => what the map, the expedition or the tribe now holds`. No dice and no arithmetic.

Notation: `[4]` and `[6 6 6]` are dice drawn as faces. *[Text in italic brackets]* says which step follows and is not shown at the table.

## Where the text is shown

- **Dice panel**, at the seat's edge while the table waits for dice: the ask as its heading, the status under it, then the lines already answered in this operation, one line each as their results, newest first. Nothing is nested under a line.
- **Status**, under the ask, is the same for every step: "Waiting for a D6 roll" or "Waiting for a roll of 3 D6" with the dicecam, "Tap the dice tray to roll one die" or "Tap the dice tray to roll 3 dice" with the manual tray. A roll that may come in over several throws also shows a tally, "4 of 8 in", and "Waiting for a throw; 4 more dice wanted".
- **Result panel**, at the seat's edge once an operation's last die is in, for five seconds or until `[OK]`: the summary as its title, then the operation's result lines, newest first.
- **Rail**: the seat's rail shows the summary of the operation that last finished. While an operation is under way it shows that operation's newest result line.
- **Log**: one entry for each operation, headed by its summary; opened, the entry shows its result lines in the order they were rolled.

## 1. The start of a turn in the field

**1.1 The disaster card**

Prompt, the disaster card panel at the seat's edge:

- Heading: "Disaster card"
- Card: "28" · "Loss (Guide)" · "DESERT"
- Text: "Your GUIDE and one of your ASKARIS are from different DESERT tribes. They fight a duel and the GUIDE is killed."
- Button: [Apply it] when the card applies to where the expedition is, else [No effect here: discard it]

Results:

- Result 1: Disaster card 28 (desert) => No effect here
- Result 2: Disaster card 26 (lake) => 1 bearer lost
- Result 3: a card with dice of its own asks for them *[section 5]*

**1.2 A prisoner's escape**

Only when the explorer began the turn held prisoner. It takes the place of the whole turn.

- Ask: "Roll a D6 for an escape; 6 escapes with nothing, 5 is still held, 4 or less is killed"
- Result 1: Escape? [6] => The explorer escapes alone, with nothing
- Result 2: Escape? [5] => Still held; another escape is rolled next turn
- Result 3: Escape? [3] => The explorer is killed

The ask gives the outcome for each face. The rule behind it is the defeat table (3.11) with 3 taken from the die.

**1.3 The move prompt**

At the seat's edge while the seat may move; the words are followed by a control.

- At the start of the turn: "Pick a hex to move into, or" [END TURN]
- With movement left after a step: "You have 1 MP: pick a hex to move into, or" [END TURN]
- With natives in the hex: "Natives here. Pick a hex to move into, or" [REMAIN]

Tapping an unexplored hex starts 2.1. Tapping an explored hex is 2.13. [REMAIN] meets the natives *[3.1]*. [END TURN] starts 4.1.

## 2. A step into a hex

**2.1 Player taps an unexplored hex on the board**

- Ask: "Roll a D6 to see if you are lost; −1 for leaving veldt: 2+ finds the way"
- Result 1: Lost? [4] (−1 for veldt) => Not lost *[2.2]*
- Result 2: Lost? [2] (−1 for veldt) => Lost! *[the expedition stays where it is and the turn ends: 4.1]*

**2.2 Enter a hex**

- Ask: "Terrain in the new hex: Roll a D6 for the direction to copy"
- Result 1a (nothing to copy): Direction [3] is empty. Roll a D6 again.
- Result 1b (second blank terrain roll): Direction [3] and [4] are empty. *[2.3]*
- Result 2: Direction [1] contains veldt. *[2.5 if the terrain cannot be entered, 2.6 for a mountain, else 2.7]*

Result 1a is also the ask for the second roll: the line stays as it is until the second die is in.

**2.3 The terrain table**

Only after two empty directions.

- Ask: "Terrain in the new hex: Roll a D6: 1 desert\[*], 2 mountain, 3 swamp, 4 jungle, 5 veldt, 6 lake" with an optional second line if there is jungle adjacent to the hex: "\[*] Desert can't be found next to Jungle, treat as Veldt" OR vice-versa.
- Result 1: Random terrain [5] => Veldt *[2.7]*
- Result 2: Random terrain [4] => Jungle. Roll a D6 for what it hides. *[2.4]*

**2.4 Mixed terrain**

Only after jungle, swamp or mountain on the terrain table.

- Ask after jungle: "Roll a D6 for what the jungle hides; 2 adds mountain, 3 adds swamp"
- Ask after swamp: "Roll a D6 for jungle in the swamp; 4 adds jungle"
- Ask after mountain: "Roll a D6 for jungle in the mountain; 4 adds jungle"
- Result 1: Jungle [2] => Jungle with mountain *[2.6]*
- Result 2: Jungle [3] => Jungle with swamp
- Result 3: Jungle [5] => Jungle alone
- Result 4: Swamp [3] => Swamp alone *[2.5 on foot]*

**2.5 The terrain cannot be entered**

No dice. The step ends here and the expedition stays where it was.

- Result: Swamp cannot be entered on foot => Turned back

**2.6 The mountain's height**

Only in a hex with mountain.

- Ask: "3D6 multiplied, plus 100 gives the mountain's height in hundreds of feet"
- Result 1: Height [5 6 4] 5 × 6 × 4 + 100 = 220 => 22,000 ft: a recorded peak, the \[second] highest so far!\nThis discovery is worth nnn points when you publish it!"
- Result 2: Height [1 2 3] 1 × 2 × 3 + 100 = 106 => 10,600 ft: not recorded (15,000 or under)

**2.7 A river source**

- Ask: "Roll a D6 for a river source; even and a river rises here"
- Result 1: River? [3] => No river *[2.11]*
- Result 2: River? [2] => A river might rise here! Roll a D6 for the way it flows. *[2.8]*

**2.8 The way the river flows**

- Ask: "Roll a D6 for the direction the river flows"
- Result 1: Flows [6] => The river flows in direction 6 *[2.9 in mountain, else 2.11]*
- Result 2: Flows [4] => Direction 4 is already mapped: no river after all *[2.11]*

**2.9 A cataract**

Only on a river in a hex where one can be.

- Ask: "Roll a D6 for a cataract; 2, 3 or 4 on a river in mountain"
- Result 1: Cataract? [3] => Discovered a cataract! *[2.10]*
- Result 2: Cataract? [6] => No cataract *[2.11]*

**2.10 The waterfall's height**

- Ask: "4D6 multiplied gives the waterfall's height in feet"
- Result 1: Fall [2 3 4 5] 2 × 3 × 4 × 5 => 120 ft: not recorded (under 400)
- Result 2: Fall [4 5 5 6] 4 × 5 × 5 × 6 => 600 ft: This is the \[second] tallest waterfall!\nThis discovery is worth nnn points when you publish it!"

**2.11 Natives**

- Ask in veldt: "Any natives? Roll 2 D6; 2 to 4 finds them in veldt"
- Ask in jungle with mountain, on a river: "Any natives? Roll 2 D6; 2 to 7 finds them in jungle mountain on water"
- Result 1: Natives? [3 3] 6 => None *[the step is done]*
- Result 2: Natives? [1 2] 3 => Natives found. *[2.12]*

**2.12 The warriors**

- Ask: "3D6 multiplied gives the number of warriors.  Each die is capped at 2 (distance to Mombasa)."
- Result 1: Warriors [2 2 3] 2 × 2 × 2 (the 3 counts as 2) => Tribe 1: 8 warriors *[3.1]*
- Result 2: Warriors [1 2 2] 1 × 2 × 2 => Tribe 1: 4 warriors *[3.1]*

**2.13 Player taps an explored hex**

No dice.

- Result: Moved to c24r13

**Summary of a step**

- Explored c24r12 => Veldt; no river; no natives
- Explored c24r12 => Jungle with mountain, a recorded peak of 22,000 ft; a river flowing in direction 6 over a cataract of 120 ft; tribe 1, 9 warriors
- Lost leaving c24r11 => The turn ends
- Turned back from c23r12 => Swamp, not entered on foot
- Moved to c24r13

A step that leaves movement keeps its result panel until the next step, with the move prompt under the summary: "You have 2 MP: pick a hex to move into, or" [END TURN].

## 3. Natives

**3.1 The policy**

Prompt, the policy panel at the seat's edge, when a step finds natives or the player taps [REMAIN] among them:

- Heading: "(1) 8 warriors" (the tribe's numbered marker and its strength)
- [1] "Defensive stand" / "Stay put on guard: no hunting, research or trade, no leaving until next turn"
- [2] "Retreat" / "Back to the hex you came from; your marker here is removed"
- [3] "Show of force" / "Approach warily, muskets ready"
- [4] "Ignore them" / "Carry on as if they were not there"
- [5] "Friendly approach" / "Open hands and gifts"

Results:

- Result 1: Policy 3 => Show of force *[3.2; the same for 1, 4 and 5 with their names]*
- Result 2: Policy 2 => Retreat: back to c24r12 *[the encounter is over]*

**3.2 The natives' reaction**

- Ask: "Roll 3 D6 for the natives' reaction; 5 or less and they are not hostile (2 hexes to port + policy 3)"
- Result 1: Hostile? [6 6 6] 18, over 5 => Hostile *[3.3]*
- Result 2: Hostile? [1 1 1] 3, within 5 => Not hostile *[policy 5: 3.12; policy 1 or 4: the encounter is over]*

**3.3 The natives' nerve**

- Ask: "Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide"
- Result 1: Nerve [1] 1 × 5 ÷ 3 = 1, not over 8 => The natives attack *[3.4]*
- Result 2: Nerve [6] 6 × 5 ÷ 3 = 10, over 8 => The natives hide *[the encounter is over; after an insulted chief, 3.16]*

**3.4 Surprise**

- Ask: "Roll 2 D6 for surprise; 3 or more, the policy number, and the expedition fires first"
- Result 1: Surprised? [6 6] 12 => Ready: 5 askaris and the explorer fire, 6 warriors fall, 2 left *[3.5]*
- Result 2: Surprised? [1 1] 2 => Surprised: the natives strike first *[3.6]*

**3.5 The volley**

- Ask: "Roll a D6 to drive them off; the die × 6 killed must be more than the 2 warriors left"
- Result 1: Driven off? [6] 6 × 6 = 36, over 2 => The natives are driven off: victory *[3.9]*
- Result 2: Driven off? [1] 1 × 6 = 6, not over 6 => They close in *[3.6]*

**3.6 Hand to hand: the natives' strike**

- Ask: "Roll a D6 for the natives' strike; 6 warriors ÷ the die is the askaris who fall, of 5"
- Result 1: Natives strike [6] 6 ÷ 6 => 1 askari falls, 4 left *[3.7]*
- Result 2: Natives strike [1] 8 ÷ 1 => All 5 askaris fall: defeat *[3.11]*

**3.7 Hand to hand: the askaris' nerve**

- Ask: "Roll a D6 to see if the askaris break; the die × 1 fallen more than the 5 who began and they run"
- Result 1: Askaris break? [1] 1 × 1 = 1, not over 5 => The askaris hold *[3.8]*
- Result 2: Askaris break? [6] 6 × 1 = 6, over 5 => The askaris break and run: defeat *[3.11]*

**3.8 Hand to hand: the askaris' strike**

- Ask: "Roll a D6 for the askaris' strike; 4 askaris ÷ the die, plus 1, is the warriors who fall, of 6"
- Result 1: Askaris strike [2] 4 ÷ 2 + 1 => 3 warriors fall, 3 left *[the natives' nerve, below]*
- Result 2: Askaris strike [1] 3 ÷ 1 + 1 = 4 => All 3 warriors fall: victory *[3.9]*

The natives' nerve closes the round:

- Ask: "Roll a D6 to see if the natives break; the die × 3 fallen more than the 3 warriors left and they run"
- Result 1: Natives break? [1] 1 × 3 = 3, not over 3 => They fight on *[3.6 again]*
- Result 2: Natives break? [2] 2 × 3 = 6, over 3 => The natives are driven off: victory *[3.9]*

A round that ends with both sides standing folds its four lines into one before the next round begins: Round 1 => 1 askari and 3 warriors fall; 4 askaris and 3 warriors left.

**3.9 Victory: prisoners**

- Ask: "Roll a D6 for prisoners; 5 askaris less the die are taken, of the 2 warriors left; a 6 takes none"
- Result 1: Prisoners [2] 5 − 2 = 3 => 2 taken, every warrior left; they carry as bearers
- Result 2: Prisoners [6] => None taken
- Result 3, no roll, when every warrior fell: Prisoners => None: no warrior is left

Then the village:

- Ask: "Roll 2 D6 to find the village; 5 or less finds it (2 prisoners + policy 3)"
- Result 1: Village? [1 2] 3, within 5 => The village is found *[3.10]*
- Result 2: Village? [6 6] 12, over 5 => Not found this turn *[the encounter is over]*

**3.10 The spoils**

Prompt, the spoils panel at the seat's edge:

- Heading: "The village is found · 2 prisoners"
- "Release the prisoners" / "Leave the village alone; the tribe remembers your mercy"
- "Keep them as bearers and loot" / "A die per warrior met: rations, gifts, a camel or canoe"

Results:

- Result 1: Spoils => Prisoners released, the village left alone
- Result 2: the loot is rolled:
  - Ask: "Roll 8 D6 for the loot, a die a warrior; 1 to 4 that many rations, 5 a gift, 6 nothing"
  - Result: Loot [3 3 3 3 1 6 2 5] => 15 rations, 1 gift

**3.11 Defeat**

- Ask: "Roll a D6 on the consequences of defeat; 1 killed, 2 held prisoner, 3 escapes with nothing, 4 with a musket and 9 rations, 5 that and one survival roll, 6 that and two"
- Result 1: Defeat [1] => The explorer is killed; the expedition is lost
- Result 2: Defeat [2] => Held prisoner; the expedition is lost *[1.2 each turn]*
- Result 3: Defeat [3] => The explorer escapes alone with nothing; the expedition is lost
- Result 4: Defeat [4] => The explorer escapes with a musket and 9 rations; the expedition is lost
- Result 5: Defeat [6] => The explorer escapes with a musket, 9 rations and two survival rolls; the expedition is lost *[the survival table, below, twice]*

The survival table:

- Ask: "Roll a D6 on the survival table; 1 guide, 2 bearer, 3 askari, 4 camel, 5 horse, 6 canoe"
- Result 1: Survival [3] => An askari comes away with the explorer
- Result 2: Survival [2] => A bearer. Roll a D6 for what he carries.
- Result 3: Survival [4] => Camel: the expedition had none. Roll a D6 again.

The bearer's load:

- Ask: "Roll a D6 for what the bearer carries; 1 to 3 ten rations, 4 or 5 ten gifts, 6 ten muskets"
- Result 1: Load [1] => A bearer with 10 rations
- Result 2: Load [5] => A bearer with 10 gifts

**3.12 The negotiation**

Prompt, the negotiation panel at the seat's edge, after a friendly approach that is not hostile:

- Heading: "(1) 8 warriors · (gifts icon) 20"
- Offer row: [−] "0" [+] [×1] and the button "Offer 4 gifts" / "Gifts × the larger of two dice must reach the warriors"
- "Give everything" / "All goods and animals but the men; the chief returns three dice of gifts"
- "Do not negotiate" / "Carry on with the turn"

Results:

- Result 1: an offer is rolled *[3.13]*
- Result 2: everything is given *[3.14]*
- Result 3: Negotiation => Declined to give gifts *[the encounter is over]*

**3.13 The offer**

- Ask: "Roll 2 D6 for the offer of 4 gifts; the larger die × 4 must reach the 8 warriors"
- Result 1: Offer [3 5] 5 × 4 = 20, reaching 8 => The chief is satisfied *[3.15]*
- Result 2: Offer [1 1] 1 × 4 = 4, short of 8 => The chief is insulted *[3.3; if the natives hide, 3.16]*

**3.14 Everything given**

- Ask: "Roll 3 D6 for the chief's gifts in return; the total is the gifts he gives"
- Result: Chief's gifts [2 3 4] => 9 gifts returned; the chief is satisfied *[3.15]*

**3.15 Trade**

Four prices are rolled, one die each, in this order:

- Ask: "Roll a D6 for the price of food; the die is the rations one gift buys"
- Result: Food [3] => 3 rations a gift
- Ask: "Roll a D6 for the price of bearers; the die is the gifts one bearer costs"
- Result: Bearers [3] => 3 gifts each
- Ask: "Roll a D6 for the price of guides; the die is the gifts one guide costs"
- Result: Guides [3] => 3 gifts each
- Ask: "Roll a D6 for the price of askaris; the die is the gifts one askari costs, with a musket"
- Result: Askaris [3] => 3 gifts and a musket each

Once the fourth price is in, the four lines fold into one: Prices => 3 rations a gift; a bearer 3 gifts, a guide 3 gifts, an askari 3 gifts and a musket.

Prompt, the trade panel at the seat's edge:

- Heading: "(gifts icon) 16 gifts"
- Row (food icon): "3 rations / gift", the count held, [−] to sell, [+] to buy
- Row (bearers icon): "3 gifts", the count held, [−] to sell, [+] to buy
- Row (guides icon): "3 gifts", the count held, [−] to sell, [+] to buy
- Row (askaris icon): "3 gifts + musket", the count held, [−] to sell, [+] to buy
- [Done trading]

Results:

- Result 1, one line that keeps the tally while the panel is open: Trade => Bought 3 rations for 1 gift
- Result 2, [Done trading] with nothing bought or sold: Trade => Took leave of the chief

**3.16 Poison**

Only when an insulted chief's warriors hide.

- Ask: "Roll a D6 for the chief's poison; 2 or less kills the explorer, 3 and he recovers, 4 or more and it fails"
- Result 1: Poison [1] => The explorer dies
- Result 2: Poison [3] => Poisoned, but he recovers, hardened against the next attempt
- Result 3: Poison [5] => The poison fails

**Summary of an encounter**

- Tribe 1, show of force => Hostile, driven off by the volley: 6 warriors killed, 2 prisoners; the village looted for 15 rations and 1 gift
- Tribe 1, show of force => Hostile, but the natives hide
- Tribe 1, show of force => Hostile; victory hand to hand in 2 rounds: 12 warriors killed, 2 askaris lost; the village not found
- Tribe 1, show of force => Surprised and defeated: 5 askaris lost, the explorer held prisoner, the expedition lost
- Tribe 1, show of force => Defeated: the explorer escapes with a musket, 9 rations, a bearer with 10 rations and a bearer with 10 gifts; the expedition lost
- Tribe 1, friendly approach => Not hostile; 4 gifts satisfy the chief; bought 3 rations for 1 gift
- Tribe 1, friendly approach => Not hostile; everything given, 9 gifts returned; nothing traded
- Tribe 1, friendly approach => Not hostile; 4 gifts insult the chief; the natives attack and are driven off: 6 warriors killed, no prisoners; the village not found
- Tribe 1, friendly approach => Not hostile; 1 gift insults the chief; the natives hide; poisoned, but the explorer recovers
- Tribe 1, friendly approach => Not hostile; no gifts given
- Tribe 1, defensive stand => Not hostile
- Tribe 1, ignored => Not hostile
- Tribe 1, retreat => Back to c24r12
- Prisoner of tribe 1 => The explorer escapes alone, with nothing

## 4. The end of a turn

**4.1 The hunt**

When the player taps [END TURN], the turn runs out of movement, or a step is lost.

- Ask: "Roll a D6 for the hunt; 6 hunters each bag one ration on 2 or 3, two on 4 or 5, three on 6"
- Result 1: Hunt [3] => 6 rations bagged; 12 men ate, 6 from the stores, 34 left
- Result 2: Hunt [1] => Nothing bagged; 12 men ate from the stores, 22 left

**4.2 The next seat**

No dice. The next seat's rail takes its own line:

- Result: Drew $200
- Result: Discarded $200

**Summary of the end of a turn**

- End of turn => 6 rations bagged, 12 eaten; 34 rations left
- End of turn => Nothing bagged, 12 eaten; 22 rations left

## 5. Steps still to be written out

These asks exist in the game and have not yet been played through in this document. Each is given in the same form, from the rule the game applies; the ones marked "ask today" keep the game's present wording until their results are written.

**Sickness and starvation**, at the end of a turn, a die a man, asked for by the bunch:

- Ask: "Roll 3 D6 for the 3 sick bearers, a die a man; 1 recovers, 5 or 6 dies"
- Result: Sick bearers [1 3 6] => 1 recovers, 1 still sick, 1 dies
- Ask: "Roll a D6 for the starving bearer; 4 or more and he falls sick"
- Result 1: Starving bearer [5] => Falls sick
- Result 2: Starving bearer [2] => Stays well

The numbers in the first ask shift with a doctor in the expedition and for a man who is starving too.

**The oasis**, entering a desert hex another explorer mapped:

- Ask: "Roll a D6 for the oasis; even finds it, if there is one here"
- Result 1: Oasis? [2] => The oasis is found
- Result 2: Oasis? [3] => None found; only its first finder may look again

In a newly mapped desert hex, 2.7 and 2.8 are worded for an oasis: "Roll a D6 for an oasis in this desert; even and there may be one", then "Roll a D6 to confirm the oasis".

**A cataract by canoe**:

- Ask: "Roll a D6 for the canoes over the cataract; the die less 3 is the canoes lost, of 2"
- Result 1: Canoes [5] 5 − 3 => 2 canoes lost
- Result 2: Canoes [3] => None lost

**The cache**:

- Ask: "Roll a D6 for the cache; 3 or more and it is recovered"
- Result 1: Cache? [4] => Recovered
- Result 2: Cache? [2] => Gone

**Rivers met from a neighbour** (ask today):

- "for the water two rivers leave from; 1–2 lake, 3–4 swamp, 5–6 jungle-swamp"
- "for where the river comes from; it comes from water or unexplored country that way; from mapped land it cannot, and rises here"
- "for where the river flows on to; it flows on into water or unexplored country that way; toward mapped land it cannot, and the die is rolled again"

**Specialties** (ask today):

- "for a zoological specimen; 2 or 3 finds a specimen in veldt; anything else, none"
- "for the preaching; the tribe's attitude rises by the die less 1: 1 they jeer, 2 ignore, 3 listen, 4 applaud and two try poison, 5 the witch doctor converts and the chief tries poison, 6 the chief converts"
- "for the treatment; 1 a fatal disease, 2 the explorer falls sick, 3 the epidemic spreads, 4 nothing, 5 minor cases, 6 major cases"

**A disaster card with dice of its own** (ask today):

- "for the doctor; 6 and the doctor averts it; less and it strikes"
- "for the toll; the total is the toll in gifts; more than the 20 carried and the raiders attack"
- "for the raiders; the total is the animals they try to steal; each raider shot saves one"
- "for the explorer's shot (crocodile); 6 kills one, less misses"

**The roll for first player**, before the game, shown its own way at every seat (ask today): "Roll 4 D6 for first player; the highest total goes first; a tie is rolled again".

**Without physical dice** the table rolls for itself: there is no dice panel and no ask; each line appears as its result, and the summaries stand as above.

## [NEEDS RESOLUTION]

Two gaps are in what the game does, not in how it words it, and were left for a decision:

1. **[NEEDS RESOLUTION] Four disaster cards are not played out.** Card 16 (the toll that cannot be paid: the raiders attack), card 18 (the poisoned oasis), card 29 (forty cannibals attack, as hostile natives under policy 4) and card 46 (the stampede: a defeat roll plus 2) are drawn and announced, and cost nothing. Their lines say so plainly ("not played out yet: nothing is lost"). Recommendation: one slice that plays all four through the existing fight, poison and defeat rules. The open point is a captive with no tribe to hold him: a defeat by raiders, cannibals or elephants that rolls "held prisoner" needs a ruling (suggested: by raiders and cannibals as a tribe would; by the elephants, rolled again).
2. **[NEEDS RESOLUTION] Rivers never branch and the Drainage Basin Rule is not applied** (rules §7.4). A river that finds nothing to come from rises where it stands, however short of its mouth's number. The asks describe what the game does. Recommendation: its own slice, since it changes what the map generates rather than how a roll is told.

Three points in this document change what the table does as well as what it says, and are proposals until confirmed:

3. **A line that is asked and answered in one place.** Today the dice panel keeps each answered ask in full with its result under a summary line. Here an answered line is its result alone, and the summary comes once the operation is over.
4. **No roll for prisoners when no warrior is left** (3.9). Today a die is asked for that cannot change anything.
5. **Hand to hand folds by the round** (3.8), and the four trade prices fold into one line (3.15).
