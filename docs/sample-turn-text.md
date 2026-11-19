# Sample turn text

The text the table shows during a turn, one step of play at a time: the prompt before a roll or a choice, and every result that can follow it. This document is the spec for that text. It is edited by hand; where the game words a step differently, the game is to follow this document.

`bun run docs:turn-text` plays the game's rules and writes the words the game uses today, to `docs/sample-turn-text.generated.md` (not committed), for comparing with this spec. It does not write this file.

## How a step is written

Each numbered step is one line of the turn's record. The line changes as the step is played:

- **Ask**: the line before the roll. It is the heading of the dice panel at the seat's edge.
- **Result**: the same line after the roll. It takes the ask's place in the record. One result is written here for each outcome that reads differently, with sample dice.
- A step with no dice (a card, a choice of policy, a trade) has a **Prompt**, the panel and its buttons, in place of the ask.

When the turn moves on to its next operation, the lines of the finished one fold into a single **Summary**. Each section below ends with its summaries.

The form of each text:

- **An ask for a yes or a no** opens with the question, then the roll, then the number wanted: "Lost? Roll a D6; 2+ finds the way (−1 for leaving veldt)". When the number wanted comes from a sum, the face to roll comes first and the sum follows in brackets.
- **An ask for a quantity** is its formula: "3D6 multiplied, plus 100, gives the mountain's height in hundreds of feet".
- **An ask read from a table** names the table's subject and lists every face.
- An ask says only what the player wants to roll. What happens otherwise is left to the result.
- **A result** is one line: `Label [dice] arithmetic => Outcome`. The label ends in a question mark when the roll answers yes or no. The arithmetic is written only when dice are combined or changed. The outcome says what happened, with its numbers, and stops: it does not announce the next roll, which the next ask does. Only a second roll of the same die is asked for in the result ("Roll a D6 again").
- **A summary** is `Operation => what was found, gained or lost`. No dice, no arithmetic, and nothing that was not found: a hex with no river and no natives is "Veldt".

Wording kept the same throughout: one die is "a D6", more are "2D6", "3D6", "8D6"; a number to reach is "2+", a span is "2 to 4"; a total is "over" or "not over" a number it must beat, and "reaches" or "is short of" a number it must equal or beat; mixed terrain is "jungle with mountain"; a tribe is "tribe 1"; natives are written of plainly, as a meeting that may go well or badly, with no exclamation mark.

Notation: `[4]` and `[6 6 6]` are dice drawn as faces. *[Text in italic brackets]* says which step follows and is not shown at the table.

## Where the text is shown

- **Dice panel**, at the seat's edge while the table waits for dice: the ask as its heading (the words after its semicolon in lighter type under it), the status, then the lines already answered in this operation, one line each as their results, newest first. Nothing is nested under a line.
- **Status**, under the ask, is the same for every step: "Waiting for a D6 roll" or "Waiting for a roll of 3D6" with the dicecam, "Tap the dice tray to roll one die" or "Tap the dice tray to roll 3 dice" with the manual tray. A roll that may come in over several throws also shows a tally, "4 of 8 in", and "Waiting for a throw; 4 more dice wanted".
- **Result panel**, at the seat's edge once an operation's last die is in, for five seconds or until `[OK]`: the summary as its title, then the operation's result lines, newest first.
- **Rail**: the seat's rail shows the summary of the operation that last finished. While an operation is under way it shows that operation's newest result line.
- **Log**: one entry for each operation, headed by its summary; opened, the entry shows its result lines in the order they were rolled.

## 1. The start of a turn in the field

**1.1 The disaster card**

Prompt, the disaster card panel at the seat's edge:

- Heading: "Disaster card"
- Card: "28" · "Loss (Guide)" · "DESERT"
- Text: "Your GUIDE and one of your ASKARIS are from different DESERT tribes. They fight a duel and the GUIDE is killed."
- Under the text, when the card does not apply to where the expedition is: "No effect here"
- Button: [Apply it] when the card applies, else [Discard]

Results:

- Result 1: Disaster: Loss (Guide), desert => No effect here
- Result 2: Disaster: Loss (1 Bearer), lake => 1 bearer lost
- Result 3: a card with dice of its own asks for them *[section 5]*

**1.2 A prisoner's escape**

Only when the explorer began the turn held prisoner. It takes the place of the whole turn.

- Ask: "Escape? Roll a D6; 6 escapes with nothing, 5 stays held, 1 to 4 is fatal"
- Result 1: Escape? [6] => The explorer escapes alone, with nothing
- Result 2: Escape? [5] => Still held
- Result 3: Escape? [3] => The explorer is killed

The ask gives the outcome for each face. The rule behind it is the defeat table (3.11) with 3 taken from the die.

**1.3 The move prompt**

At the seat's edge while the seat may move; the words are followed by a control.

- At the start of the turn: "Pick a hex to move into, or" [END TURN]
- With movement left after a step: "1 move left: pick a hex, or" [END TURN]
- With natives in the hex: "Natives here. Pick a hex to move into, or" [REMAIN]

Tapping an unexplored hex starts 2.1. Tapping an explored hex is 2.13. [REMAIN] meets the natives *[3.1]*. [END TURN] starts 4.1.

## 2. A step into a hex

**2.1 Player taps an unexplored hex on the board**

- Ask: "Lost? Roll a D6; 2+ finds the way (−1 for leaving veldt)"
- Result 1: Lost? [4] (−1 for veldt) => Not lost *[2.2]*
- Result 2: Lost? [1] (−1 for veldt) => Lost! *[the expedition stays where it is and the turn ends: 4.1]*

**2.2 Enter a hex**

- Ask: "Terrain in the new hex: Roll a D6 for the neighbour to copy"
- Result 1a (nothing to copy): Direction [3] is empty. Roll a D6 again.
- Result 1b (second blank terrain roll): Directions [3] and [4] are empty. *[2.3]*
- Result 2: Direction [1] contains veldt. *[2.5 if the terrain cannot be entered, 2.6 for a mountain, else 2.7]*

Result 1a is also the ask for the second roll: the line stays as it is until the second die is in.

**2.3 Random terrain**

Only after two empty directions.

- Ask: "Terrain in the new hex: Roll a D6; 1 desert, 2 mountain, 3 swamp, 4 jungle, 5 veldt, 6 lake"
- Beside jungle the ask reads "1 desert*" and takes a second line: "* No desert next to jungle: veldt instead". Beside desert it reads "4 jungle*" with "* No jungle next to desert: veldt instead".
- Result 1: Random terrain [5] => Veldt *[2.7]*
- Result 2: Random terrain [4] => Jungle *[2.4]*
- Result 3: Random terrain [1] => Veldt (no desert next to jungle) *[2.7]*

**2.4 Mixed terrain**

Only after jungle, swamp or mountain as random terrain.

- Ask after jungle: "Jungle alone? Roll a D6; 2 adds mountain, 3 adds swamp"
- Ask after swamp: "Jungle too? Roll a D6; 4 adds jungle to the swamp"
- Ask after mountain: "Jungle too? Roll a D6; 4 adds jungle to the mountain"
- Result 1: Mixed? [2] => Jungle with mountain *[2.6]*
- Result 2: Mixed? [3] => Jungle with swamp
- Result 3: Mixed? [5] => Jungle alone
- Result 4: Mixed? [3] => Swamp alone *[2.5 on foot]*
- Result 5: Mixed? [4] => Mountain with jungle *[2.6]*

**2.5 The terrain cannot be entered**

No dice. The step ends here and the expedition stays where it was. The hex stays on the map.

- Result: Swamp, no way in on foot => Turned back

**2.6 The mountain's height**

Only in a hex with mountain.

- Ask: "3D6 multiplied, plus 100, gives the mountain's height in hundreds of feet; over 15,000 ft is recorded"
- Result 1: Height [5 6 4] 5 × 6 × 4 + 100 = 220 => 22,000 ft: the second highest peak so far, worth 4 points when published!
- Result 2: Height [3 4 4] 3 × 4 × 4 + 100 = 148 => 14,800 ft: not recorded (15,000 or under)
- Result 3: Height [3 4 5] 3 × 4 × 5 + 100 = 160 => 16,000 ft: a recorded peak, but four are higher

The rank is among the peaks discovered so far; the points are those of that rank (8, 4, 2, 1).

**2.7 A river source**

- Ask: "River source? Roll a D6; even and a river might rise here"
- Result 1: River? [3] => No river *[2.11]*
- Result 2: River? [2] => A river might rise here! *[2.8]*

**2.8 The way the river flows**

- Ask: "Which way does it flow? Roll a D6; it needs water or unexplored country that way"
- Result 1: Flows [6] => A river rises here and flows in direction 6! *[2.9 unless the hex is lake or swamp, else 2.11]*
- Result 2: Flows [4] => Direction 4 is mapped land: no river after all *[2.11]*

**2.9 A cataract**

Only on a river in a hex that is not lake or swamp.

- Ask in mountain: "Any cataract? Roll a D6; 2 to 4 finds one in mountain"
- Ask in desert: "Any cataract? Roll a D6; 1 or 2 finds one in desert"
- Ask in other terrain: "Any cataract? Roll a D6; 1 finds one in veldt"
- Result 1: Cataract? [3] => Discovered a cataract! *[2.10]*
- Result 2: Cataract? [6] => No cataract *[2.11]*

**2.10 The waterfall's height**

- Ask: "4D6 multiplied gives the waterfall's height in feet; 400 ft or more is recorded"
- Result 1: Waterfall [2 3 4 5] 2 × 3 × 4 × 5 = 120 => 120 ft: not recorded (under 400)
- Result 2: Waterfall [4 5 5 6] 4 × 5 × 5 × 6 = 600 => 600 ft: the second highest waterfall so far, worth 2 points when published!
- Result 3: Waterfall [4 4 5 5] 4 × 4 × 5 × 5 = 400 => 400 ft: a recorded waterfall, but three are higher

The rank is among the waterfalls discovered so far; the points are those of that rank (4, 2, 1).

**2.11 Natives**

- Ask in veldt: "Any natives? Roll 2D6; 2 to 4 finds them in veldt"
- Ask in jungle with mountain, on a river: "Any natives? Roll 2D6; 2 to 7 finds them in jungle with mountain on a river"
- Result 1: Natives? [3 3] 6 => None *[the step is done]*
- Result 2: Natives? [1 2] 3 => Natives found *[2.12]*

**2.12 The warriors**

- Ask: "3D6 multiplied gives the number of warriors; the highest die is capped at 2 (distance to Mombasa)"
- Result 1: Warriors [2 2 3] 2 × 2 × 2 (the 3 counts as 2) => Tribe 1: 8 warriors *[3.1]*
- Result 2: Warriors [1 2 2] 1 × 2 × 2 => Tribe 1: 4 warriors *[3.1]*

**2.13 Player taps an explored hex**

No dice.

- Result: Moved to c24r13

**Summary of a step**

- Explored c24r12 => Veldt
- Explored c24r12 => Jungle with mountain; the second highest peak (22,000 ft); a river source with a cataract; tribe 1, 8 warriors
- Lost leaving c24r11 => The turn ends
- Turned back from c23r12 => Swamp, no way in on foot
- Moved to c24r13

A step that leaves movement keeps its result panel until the next step, with the move prompt under the summary: "1 move left: pick a hex, or" [END TURN].

## 3. Natives

The samples of 3.2 to 3.10 follow one meeting: tribe 1 of 8 warriors, 2 hexes from port, met by 5 askaris and the explorer.

**3.1 The policy**

Prompt, the policy panel at the seat's edge, when a step finds natives or the player taps [REMAIN] among them:

- Heading: "Tribe 1 · 8 warriors"
- [1] "Defensive stand" / "Stay put on guard: no hunting, research or trade, no leaving until next turn"
- [2] "Retreat" / "Back to the hex you came from; your marker here is removed"
- [3] "Show of force" / "Approach warily, muskets ready"
- [4] "Ignore them" / "Carry on as if they were not there"
- [5] "Friendly approach" / "Open hands and gifts"

Results:

- Result 1: Policy 3 => Show of force *[3.2; the same for 1, 4 and 5 with their names]*
- Result 2: Policy 2 => Retreat: back to c24r12 *[the meeting is over]*

**3.2 The natives' reaction**

- Ask: "Are they hostile? Roll 3D6; 5 or less and they are not (2 hexes to port + policy 3)"
- Result 1: Hostile? [6 6 6] 18, over 5 => Hostile *[3.3]*
- Result 2: Hostile? [1 1 1] 3, not over 5 => Not hostile *[policy 5: 3.12; policy 1 or 4: the meeting is over]*

**3.3 Attack or hide**

- Ask: "Do they attack? Roll a D6; only a 6 makes them hide (die × 5 askaris ÷ policy 3 must beat 8 warriors)"
- Result 1: Attack? [1] 1 × 5 ÷ 3 = 1 (rounded down), not over 8 => The natives attack *[3.4]*
- Result 2: Attack? [6] 6 × 5 ÷ 3 = 10, over 8 => The natives hide *[the meeting is over; after an insulted chief, 3.16]*

When no face can make them hide the ask reads "no roll makes them hide"; when every face does, "any roll makes them hide".

**3.4 Surprise**

- Ask: "Surprised? Roll 2D6; 3+ and you fire first (policy 3)"
- Result 1: Surprised? [6 6] 12 => Not surprised: 6 shots, 6 warriors fall, 2 left *[3.5]*
- Result 2: Surprised? [1 1] 2 => Surprised: the natives strike first *[3.6]*

**3.5 The volley**

- Ask: "Driven off? Roll a D6; any roll drives them off (die × 6 fallen must beat the 2 warriors left)"
- Result: Driven off? [1] 1 × 6 = 6, over 2 => The natives are driven off: victory *[3.9]*

Against a tribe of 12, with 6 left after the volley:

- Ask: "Driven off? Roll a D6; 2+ drives them off (die × 6 fallen must beat the 6 warriors left)"
- Result 1: Driven off? [2] 2 × 6 = 12, over 6 => The natives are driven off: victory *[3.9]*
- Result 2: Driven off? [1] 1 × 6 = 6, not over 6 => They close in *[3.6]*

**3.6 Hand to hand: the natives' strike**

After a surprise, 8 warriors against 5 askaris:

- Ask: "Natives strike: 8 warriors ÷ the die gives the askaris who fall, of 5"
- Result 1: Natives strike [6] 8 ÷ 6 = 1 (rounded down) => 1 askari falls, 4 left *[3.7]*
- Result 2: Natives strike [1] 8 ÷ 1 = 8 => All 5 askaris fall: defeat *[3.11]*

**3.7 Hand to hand: do the askaris break?**

- Ask: "Do the askaris break? Roll a D6; only a 6 and they run (die × 1 fallen must beat the 5 who began)"
- Result 1: Askaris break? [1] 1 × 1 = 1, not over 5 => The askaris hold *[3.8]*
- Result 2: Askaris break? [6] 6 × 1 = 6, over 5 => The askaris break and run: defeat *[3.11]*

**3.8 Hand to hand: the askaris' strike**

- Ask: "Askaris strike: 4 askaris ÷ the die, plus 1, gives the warriors who fall, of 8"
- Result 1: Askaris strike [2] 4 ÷ 2 + 1 = 3 => 3 warriors fall, 5 left *[do the natives break, below]*
- Result 2: Askaris strike [1] 4 ÷ 1 + 1 = 5 => 5 warriors fall, 3 left *[do the natives break, below]*
- Result 3, when no warrior is left: Askaris strike [1] 4 ÷ 1 + 1 = 5 => All 3 warriors fall: victory *[3.9]*

Do the natives break closes the round:

- Ask: "Do the natives break? Roll a D6; 2+ and they run (die × 3 fallen must beat the 5 left)"
- Result 1: Natives break? [1] 1 × 3 = 3, not over 5 => They fight on *[3.6 again]*
- Result 2: Natives break? [2] 2 × 3 = 6, over 5 => The natives are driven off: victory *[3.9]*

A round that ends with both sides standing folds its four lines into one before the next round begins: Round 1 => 1 askari and 3 warriors fall; 4 askaris and 5 warriors left.

**3.9 Victory: prisoners**

- Ask: "Prisoners: 5 askaris less the die, at most the 2 warriors left; a 6 takes none"
- Result 1: Prisoners [2] 5 − 2 = 3 => 2 taken, all who were left
- Result 2: Prisoners [6] => None taken
- Result 3, no roll, when every warrior fell: Prisoners => None: no warrior is left

Then the village:

- Ask: "Village found? Roll 2D6; 5 or less finds it (2 prisoners + policy 3)"
- Result 1: Village? [1 2] 3, not over 5 => The village is found *[3.10]*
- Result 2: Village? [6 6] 12, over 5 => Not found *[the meeting is over]*

**3.10 The spoils**

Prompt, the spoils panel at the seat's edge:

- Heading: "The village is found · 2 prisoners"
- "Release the prisoners" / "Leave the village alone; the tribe remembers your mercy"
- "Keep them as bearers and loot" / "A die per warrior: rations and gifts" (what the dice can bring in this hex)

Results:

- Result 1: Spoils => Prisoners released, the village left alone
- Result 2: the loot is rolled:
  - Ask: "Loot: 8D6, one per warrior; 1 to 4 that many rations, 5 a gift, 6 nothing"
  - Result: Loot [3 3 3 3 1 6 2 5] => 15 rations, 1 gift; 2 prisoners carry as bearers

**3.11 Defeat**

- Ask: "Defeat. Roll a D6; 1 killed, 2 held prisoner, 3 escape with nothing, 4 with a musket and 9 rations, 5 the same and one companion, 6 the same and two"
- Result 1: Defeat [1] => The explorer is killed
- Result 2: Defeat [2] => The explorer is held prisoner *[1.2 each turn]*
- Result 3: Defeat [3] => The explorer escapes alone with nothing
- Result 4: Defeat [4] => The explorer escapes with a musket and 9 rations
- Result 5: Defeat [6] => The explorer escapes with a musket, 9 rations and two companions *[who gets away, below, twice]*

That the expedition is lost is said once, in the summary.

Who gets away:

- Ask: "Who gets away with you? Roll a D6; 1 guide, 2 bearer, 3 askari, 4 camel, 5 horse, 6 canoe"
- Result 1: Companion [3] => An askari
- Result 2: Companion [2] => A bearer *[the bearer's load, below]*
- Result 3: Companion [4] => Camel: the expedition had none. Roll a D6 again.

The bearer's load:

- Ask: "The bearer's load: Roll a D6; 1 to 3 ten rations, 4 or 5 ten gifts, 6 ten muskets"
- Result 1: Load [1] => 10 rations
- Result 2: Load [5] => 10 gifts

**3.12 The negotiation**

Prompt, the negotiation panel at the seat's edge, after a friendly approach that is not hostile:

- Heading: "Tribe 1 · 8 warriors · (gifts icon) 20"
- Offer row: [−] "4" [+] [×1] and the button "Offer 4 gifts" / "Gifts × the larger of two dice must reach the warriors"
- "Give everything" / "All goods and animals but the men; the chief returns three dice of gifts"
- "Do not negotiate" / "Carry on with the turn"

Results:

- Result 1: an offer is rolled *[3.13]*
- Result 2: everything is given *[3.14]*
- Result 3: Negotiation => No gifts offered *[the meeting is over]*

**3.13 The offer**

- Ask: "Is the chief satisfied? Roll 2D6; a 2+ on either die will do (larger die × 4 gifts must reach 8 warriors)"
- Result 1: Offer [3 5] 5 × 4 = 20, reaches 8 => The chief is satisfied *[3.15]*
- Result 2: Offer [1 1] 1 × 4 = 4, short of 8 => The chief is insulted *[3.3; if the natives hide, 3.16]*

**3.14 Everything given**

- Ask: "3D6 added gives the gifts the chief returns"
- Result: Chief's gifts [2 3 4] 2 + 3 + 4 = 9 => 9 gifts returned; the chief is satisfied *[3.15]*

**3.15 Trade**

Four prices are rolled, one die each, in this order:

- Ask: "Price of food: the die is the rations a gift buys"
- Result: Food [4] => 4 rations a gift
- Ask: "Price of a bearer: the die is his cost in gifts"
- Result: Bearer [2] => 2 gifts
- Ask: "Price of a guide: the die is his cost in gifts"
- Result: Guide [5] => 5 gifts
- Ask: "Price of an askari: the die is his cost in gifts, with a musket"
- Result: Askari [3] => 3 gifts and a musket

Once the fourth price is in, the four lines fold into one: Prices => 4 rations a gift; a bearer 2 gifts, a guide 5 gifts, an askari 3 gifts and a musket.

Prompt, the trade panel at the seat's edge:

- Heading: "(gifts icon) 16 gifts"
- Row (food icon): "4 rations a gift", the count held, [−] to sell, [+] to buy
- Row (bearers icon): "2 gifts", the count held, [−] to sell, [+] to buy
- Row (guides icon): "5 gifts", the count held, [−] to sell, [+] to buy
- Row (askaris icon): "3 gifts + musket", the count held, [−] to sell, [+] to buy
- [Done trading]

Results:

- Result 1, one line that keeps the tally while the panel is open: Trade => Bought 4 rations for 1 gift
- Result 2, [Done trading] with nothing bought or sold: Trade => Took leave of the chief

**3.16 Poison**

Only when an insulted chief's warriors hide.

- Ask: "Poison. Roll a D6; 1 or 2 kills the explorer, 3 he recovers, 4+ it fails"
- Result 1: Poison [1] => The explorer dies
- Result 2: Poison [3] => Poisoned, but he recovers; +1 against poison from now on
- Result 3: Poison [5] => The poison fails

**Summary of a meeting**

- Tribe 1, show of force => Hostile, driven off by the volley: 6 warriors fall, 2 prisoners; the village looted for 15 rations and 1 gift
- Tribe 1, show of force => Hostile; the natives hide
- Tribe 1, show of force => Hostile; victory hand to hand in 2 rounds: 8 warriors and 2 askaris fall
- Tribe 1, show of force => Hostile; surprised and defeated: 5 askaris fall, the explorer held prisoner, the expedition lost
- Tribe 1, show of force => Hostile; defeated: the explorer escapes with a musket, 9 rations, a bearer with 10 rations and a bearer with 10 gifts; the expedition lost
- Tribe 1, friendly approach => 4 gifts satisfy the chief; bought 4 rations for 1 gift
- Tribe 1, friendly approach => Everything given, 9 gifts returned
- Tribe 1, friendly approach => 4 gifts insult the chief; the natives attack and are driven off: 6 warriors fall
- Tribe 1, friendly approach => 1 gift insults the chief; the natives hide; poisoned, but the explorer recovers
- Tribe 1, friendly approach => No gifts offered
- Tribe 1, defensive stand => Not hostile
- Tribe 1, ignore them => Not hostile
- Tribe 1, retreat => Back to c24r12
- Prisoner of tribe 1 => The explorer escapes alone, with nothing

## 4. The end of a turn

**4.1 The hunt**

When the player taps [END TURN], the turn runs out of movement, or a step is lost.

- Ask: "Hunt: Roll a D6; 1 nothing, 2 or 3 one ration a hunter, 4 or 5 two, 6 three (6 hunters)"
- Result 1: Hunt [3] => 6 rations bagged, 12 eaten: 34 left
- Result 2: Hunt [1] => Nothing bagged, 12 eaten: 28 left

**4.2 The next seat**

No dice. The next seat's rail takes its own line:

- Result: Drew a card: $200
- Result: Discarded a card: $200

**Summary of the end of a turn**

The hunt's result is its own summary; it is shown once.

## 5. Steps still to be written out

These asks exist in the game and have not yet been played through in this document. Each is given in the same form, from the rule the game applies.

**Sickness and starvation**, at the end of a turn, a die a man, asked for by the bunch:

- Ask: "Sick bearers: a die each; 1 recovers, 5 or 6 dies"
- Result: Sick bearers [1 3 6] => 1 recovers, 1 still sick, 1 dies
- Ask: "Does the starving bearer fall sick? Roll a D6; 4+ and he does"
- Result 1: Starving bearer [5] => Falls sick
- Result 2: Starving bearer [2] => Stays well

The numbers in the first ask shift with a doctor in the expedition and for a man who is starving too.

**The oasis**, entering a desert hex another explorer mapped:

- Ask: "Any oasis? Roll a D6; even finds one"
- Result 1: Oasis? [2] => The oasis is found
- Result 2: Oasis? [3] => None found

In a newly mapped desert hex, 2.7 and 2.8 are worded for an oasis: "Any oasis? Roll a D6; even and there might be one here", then "Is there an oasis? Roll a D6; it needs water or unexplored country that way".

**A cataract by canoe**:

- Ask: "Canoes over the cataract: the die less 3 gives the canoes lost, of 2"
- Result 1: Canoes [5] 5 − 3 = 2 => 2 canoes lost
- Result 2: Canoes [3] => None lost

**The cache**:

- Ask: "Is the cache still here? Roll a D6; 3+ and it is"
- Result 1: Cache? [4] => Recovered
- Result 2: Cache? [2] => Gone

**Rivers met from a neighbour**:

- Ask: "Two rivers leave this hex, so it is water: Roll a D6; 1 or 2 lake, 3 or 4 swamp, 5 or 6 jungle with swamp"
- Ask: "Where does the river come from? Roll a D6; water or unexplored country that way, else it rises here"
- Ask: "Where does the river flow on? Roll a D6; water or unexplored country that way, else roll again"

**Specialties**:

- Ask: "Any specimen? Roll a D6; 2 or 3 finds one in veldt"
- Ask: "Preaching: Roll a D6; the tribe's attitude rises by the die less 1; 4 and 5 bring poison attempts"
- Ask: "Treatment: Roll a D6; 1 a fatal disease, 2 the explorer falls sick, 3 the epidemic spreads, 4 nothing, 5 minor cases, 6 major cases"

**A disaster card with dice of its own**:

- Ask: "Can the doctor avert it? Roll a D6; a 6 does"
- Ask: "The dice added give the toll in gifts; over the 20 you carry and the raiders attack"
- Ask: "The dice added give the animals the raiders try to steal; each raider shot saves one"
- Ask: "The explorer shoots at the crocodile: Roll a D6; a 6 kills it"

**The roll for first player**, before the game, shown its own way at every seat: "Who goes first? Roll 4D6; highest total, ties roll again".

**Without physical dice** the table rolls for itself: there is no dice panel and no ask; each line appears as its result, and the summaries stand as above.

## [NEEDS RESOLUTION]

Two gaps are in what the game does, not in how it words it, and were left for a decision:

1. **[NEEDS RESOLUTION] Four disaster cards are not played out.** Card 16 (the toll that cannot be paid: the raiders attack), card 18 (the poisoned oasis), card 29 (forty cannibals attack, as hostile natives under policy 4) and card 46 (the stampede: a defeat roll plus 2) are drawn and announced, and cost nothing. Their lines say so plainly ("not played out yet: nothing is lost"). Recommendation: one slice that plays all four through the existing fight, poison and defeat rules. The open point is a captive with no tribe to hold him: a defeat by raiders, cannibals or elephants that rolls "held prisoner" needs a ruling (suggested: by raiders and cannibals as a tribe would; by the elephants, rolled again).
2. **[NEEDS RESOLUTION] Rivers never branch and the Drainage Basin Rule is not applied** (rules §7.4). A river that finds nothing to come from rises where it stands, however short of its mouth's number. The asks describe what the game does. Recommendation: its own slice, since it changes what the map generates rather than how a roll is told.
