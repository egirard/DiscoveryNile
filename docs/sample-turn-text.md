# Sample turn text

Every piece of text the table shows during a turn, as the game words it, for review and for speccing the interaction flow. The samples are produced by playing the game's own rules with dice rolled at the table (physical dice on), so the words are the game's, not a paraphrase.

This file is generated: `bun run docs:turn-text` plays the sequences again and writes it over. The words before the samples and after them are kept in `src/lib/docs/sample-turn-text.head.md` and `src/lib/docs/sample-turn-text.tail.md`; the sequences are in `src/lib/docs/sample-turn-text.test.ts`. Notes for the spec belong in those files, where a regeneration keeps them.

## How to read the samples

Each sample is a sequence of numbered steps: something the player does, or dice coming up. Under each step is what the table then shows.

- **Move prompt**: the line at the seat's edge while the seat may move; the words are followed by a control, shown as `[END TURN]` or `[REMAIN]`.
- **Dice panel**: shown at the seat's edge while the table waits for dice.
  - *Note*: what the board has just shown of the last die, when there is one.
  - *Ask*: what to roll and why. This is the text before the roll. The words up to the semicolon ("Roll a D6 to see if you are lost;") stand as the panel's heading; the rest, what the outcomes mean, reads under it in lighter type.
  - *Status*: the line under the ask. The samples show the dicecam's waiting words; with the manual tray it reads "Tap the dice tray to roll one die" / "Tap the dice tray to roll 3 dice". Under it are six die faces to tap instead.
  - *So far (newest first)*: what the dice have already decided for the same action. An ask already answered is kept in its words with "Result:", its dice and what they meant. Once the rule has written a log line for those dice, the line stands there as a summary (its kind and its outcome), with its asks under it.
- **Result panel**: shown at the seat's edge once the last die of an action is in, for five seconds or until `[OK]`. Its title is the segment of the turn it closes ("The step into c24r12", "The natives", "The hunt"), and it holds that whole segment, newest first.
- **Lines added to the log**: the lines the action wrote, as the opened log words them, with their dice, what was needed and the modifiers. An action with no dice writes a plain line.
- **Rail's one line**: the seat's rail shows only the newest log line, cut shorter (modifiers as bare numbers). This is what remains on view once the next operation starts and the panel is gone.
- Other panels (disaster card, policy, spoils, negotiation, trade) are listed with their headings and buttons.

Notation: `[4]` or `[6 6 6]` are dice drawn as faces. `**Lost check**` is the line's kind label. `needs 2+` is the "needs" tag. `−1 leaving veldt = 3` is the modifiers and the total. `(+2 more dice not drawn)` stands for the "+2" shown when a line has more than six dice. `(1)` in a heading is the tribe's numbered marker.

## The test each text is held to

- **An ask** says what the roll decides and what every outcome means, with the numbers that apply here and the modifiers already counted in them.
- **A result** shows the dice, the sum where there is one, the outcome, and what changed.
- **A log line** can be read on its own, without the panel that led to it.
- **The rail's line** may be short but carries the outcome.

## What the review changed (prompt 85)

- Every ask now names its modifiers and every outcome: the lost check says what moves the die and that being lost ends the turn; the terrain asks say what happens when nothing is copied; the natives' reaction lists what makes its target; each check of a fight says what follows either way.
- Results carry their sums where they left them out (the mountain's height, the natives' and askaris' strikes, prisoners).
- Log lines say what changed: a lost step ends the turn, prisoners carry as bearers, a defeat loses the expedition, the stores left after the meal, trade prices with their units.
- The natives' reaction line gives its target as what was needed, and no longer writes the dice total after the modifiers as if it were their sum.
- The warriors' sum shows the dice as they counted ("2 × 2 × 2"), not the dice as thrown beside a different product.
- A panel line with its asks under it is the summary alone, so a result is not said twice; the asks keep the dice, and a die tapped there is still set right.
- The result panel's title is its segment's, not the last ask's.
- A captive's escape ask no longer lists the other player's last action.
- The ask's hint is drawn lighter under its heading, so a longer ask is still read at a glance.
- Negative numbers use a minus sign, and a modifier is written number first ("−1 leaving veldt", "+3 policy 3, show of force").

## [NEEDS RESOLUTION]

Two gaps are in what the game does, not in how it words it, and were left for a decision:

1. **[NEEDS RESOLUTION] Four disaster cards are not played out.** Card 16 (the toll that cannot be paid: the raiders attack), card 18 (the poisoned oasis), card 29 (forty cannibals attack, as hostile natives under policy 4) and card 46 (the stampede: a defeat roll plus 2) are drawn and announced, and cost nothing. Their lines now say so plainly ("not played out yet: nothing is lost") in place of naming a slice. Recommendation: one slice that plays all four through the existing fight, poison and defeat rules. The open point is a captive with no tribe to hold him: a defeat by raiders, cannibals or elephants that rolls "held prisoner" needs a ruling (suggested: by raiders and cannibals as a tribe would; by the elephants, rolled again).
2. **[NEEDS RESOLUTION] Rivers never branch and the Drainage Basin Rule is not applied** (rules §7.4). A river that finds nothing to come from rises where it stands, however short of its mouth's number. The asks describe what the game does. Recommendation: its own slice, since it changes what the map generates rather than how a roll is told.

## A. A step into a hex

### A1. Not lost, terrain copied from a neighbour, no river, no natives; then the end of the turn and the hunt

The expedition has just been outfitted at Mombasa. The step costs both movement points, so the result is shown for five seconds rather than kept with a prompt for the next step.

**Before anything is tapped**

Move prompt at bottom-1's edge: "Pick a hex to move into, or" [END TURN]

**1. The player taps hex c24r12 on the board**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 to see if you are lost; −1 leaving veldt: 2+ finds the way; less is lost, and the turn ends here"
- Status: "Waiting for a D6 roll"

**2. The dice come up 4**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the direction of the terrain to copy; a mapped neighbour that way is copied; nothing mapped there and the die is rolled once more"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Lost check** not lost
    - *Roll a D6 to see if you are lost; −1 leaving veldt: 2+ finds the way; less is lost, and the turn ends here* / Result: [4] 4 − 1 = 3: not lost

**3. The dice come up 3**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for a river source; even and a river rises here, if the next die gives it somewhere to flow; odd and there is none"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Terrain** mapped veldt: veldt copied from the neighbour in direction 3
    - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour that way is copied; nothing mapped there and the die is rolled once more* / Result: [3] veldt, copied from direction 3
  - **Lost check** not lost
    - *Roll a D6 to see if you are lost; −1 leaving veldt: 2+ finds the way; less is lost, and the turn ends here* / Result: [4] 4 − 1 = 3: not lost

**4. The dice come up 3**

Dice panel at bottom-1's edge:

- Ask: "Roll 2 D6 for natives; a total of 2, 3 or 4 finds natives in veldt; anything else, none"
- Status: "Waiting for a roll of 2 D6"
- So far (newest first):
  - **Water** 3 is odd: no river
    - *Roll a D6 for a river source; even and a river rises here, if the next die gives it somewhere to flow; odd and there is none* / Result: [3] odd: no river
  - **Terrain** mapped veldt: veldt copied from the neighbour in direction 3
    - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour that way is copied; nothing mapped there and the die is rolled once more* / Result: [3] veldt, copied from direction 3
  - **Lost check** not lost
    - *Roll a D6 to see if you are lost; −1 leaving veldt: 2+ finds the way; less is lost, and the turn ends here* / Result: [4] 4 − 1 = 3: not lost

**5. The dice come up 3, 3**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The step into c24r12"
  - **Natives** no natives (3 + 3 = 6)
    - *Roll 2 D6 for natives; a total of 2, 3 or 4 finds natives in veldt; anything else, none* / Result: [3 3] 3 + 3 = 6: no natives
  - **Water** 3 is odd: no river
    - *Roll a D6 for a river source; even and a river rises here, if the next die gives it somewhere to flow; odd and there is none* / Result: [3] odd: no river
  - **Terrain** mapped veldt: veldt copied from the neighbour in direction 3
    - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour that way is copied; nothing mapped there and the die is rolled once more* / Result: [3] veldt, copied from direction 3
  - **Lost check** not lost
    - *Roll a D6 to see if you are lost; −1 leaving veldt: 2+ finds the way; less is lost, and the turn ends here* / Result: [4] 4 − 1 = 3: not lost
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Lost check** needs 2+ [4] −1 leaving veldt = 3 not lost
- bottom-1: **Terrain** [3] mapped veldt: veldt copied from the neighbour in direction 3
- bottom-1: **Water** [3] 3 is odd: no river
- bottom-1: **Natives** needs 2, 3, 4 [3 3] no natives (3 + 3 = 6)

Rail's one line at bottom-1: **Natives** needs 2, 3, 4 [3 3] no natives (3 + 3 = 6)

**6. The player taps END TURN**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the hunt; 1 or less bags nothing, 2–3 one ration a hunter, 4–5 two, 6 or more three; 6 hunters"
- Status: "Waiting for a D6 roll"

**7. The dice come up 3**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The hunt"
  - **Hunting** one per hunter: 6 rations bagged, 12 men ate (6 from the stores, 34 left)
    - *Roll a D6 for the hunt; 1 or less bags nothing, 2–3 one ration a hunter, 4–5 two, 6 or more three; 6 hunters* / Result: [3] one per hunter: 6 bagged
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Hunting** needs 2 / 4 / 6 for one, two, three per hunter [3] one per hunter: 6 rations bagged, 12 men ate (6 from the stores, 34 left)
- top-1: drew $200

Rail's one line at top-1: drew $200

### A2. Nothing to copy: the terrain table, a composite (jungle with mountain), the peak, a river with a cataract, natives found

The same step from Mombasa with other dice.

**Before anything is tapped**

Move prompt at bottom-1's edge: "Pick a hex to move into, or" [END TURN]

**1. The player taps hex c24r12 on the board**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 to see if you are lost; −1 leaving veldt: 2+ finds the way; less is lost, and the turn ends here"
- Status: "Waiting for a D6 roll"

**2. The dice come up 4**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the direction of the terrain to copy; a mapped neighbour that way is copied; nothing mapped there and the die is rolled once more"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Lost check** not lost
    - *Roll a D6 to see if you are lost; −1 leaving veldt: 2+ finds the way; less is lost, and the turn ends here* / Result: [4] 4 − 1 = 3: not lost

**3. The dice come up 6**

Dice panel at bottom-1's edge:

- Note: "Hex in direction 6 is empty; roll again"
- Ask: "Roll a D6 for the direction of the terrain to copy, once more; a mapped neighbour that way is copied; nothing mapped there and the terrain table decides"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour that way is copied; nothing mapped there and the die is rolled once more* / Result: [6] nothing mapped in direction 6: rolled once more
  - **Lost check** not lost
    - *Roll a D6 to see if you are lost; −1 leaving veldt: 2+ finds the way; less is lost, and the turn ends here* / Result: [4] 4 − 1 = 3: not lost

**4. The dice come up 6**

Dice panel at bottom-1's edge:

- Note: "Hex in direction 6 is empty too; roll on the terrain table"
- Ask: "Roll a D6 for the terrain; 1 desert, 2 mountain, 3 swamp, 4 jungle, 5 veldt, 6 lake"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll a D6 for the direction of the terrain to copy, once more; a mapped neighbour that way is copied; nothing mapped there and the terrain table decides* / Result: [6] nothing mapped in direction 6: the terrain table next
  - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour that way is copied; nothing mapped there and the die is rolled once more* / Result: [6] nothing mapped in direction 6: rolled once more
  - **Lost check** not lost
    - *Roll a D6 to see if you are lost; −1 leaving veldt: 2+ finds the way; less is lost, and the turn ends here* / Result: [4] 4 − 1 = 3: not lost

**5. The dice come up 4**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for what the jungle hides; 2 adds mountain, 3 adds swamp, anything else jungle alone"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll a D6 for the terrain; 1 desert, 2 mountain, 3 swamp, 4 jungle, 5 veldt, 6 lake* / Result: [4] jungle
  - *Roll a D6 for the direction of the terrain to copy, once more; a mapped neighbour that way is copied; nothing mapped there and the terrain table decides* / Result: [6] nothing mapped in direction 6: the terrain table next
  - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour that way is copied; nothing mapped there and the die is rolled once more* / Result: [6] nothing mapped in direction 6: rolled once more
  - **Lost check** not lost
    - *Roll a D6 to see if you are lost; −1 leaving veldt: 2+ finds the way; less is lost, and the turn ends here* / Result: [4] 4 − 1 = 3: not lost

**6. The dice come up 2**

Dice panel at bottom-1's edge:

- Ask: "Roll 3 D6 for the mountain's height; the three dice multiplied, plus 100, in hundreds of feet: over 15,000 ft is a recorded peak"
- Status: "Waiting for a roll of 3 D6"
- So far (newest first):
  - **Terrain** mapped jungle mountain: nothing mapped in direction 6, rolled again; nothing mapped in direction 6 either; 4 on the table: jungle; 2: mountain in the jungle
    - *Roll a D6 for what the jungle hides; 2 adds mountain, 3 adds swamp, anything else jungle alone* / Result: [2] mountain in the jungle
    - *Roll a D6 for the terrain; 1 desert, 2 mountain, 3 swamp, 4 jungle, 5 veldt, 6 lake* / Result: [4] jungle
    - *Roll a D6 for the direction of the terrain to copy, once more; a mapped neighbour that way is copied; nothing mapped there and the terrain table decides* / Result: [6] nothing mapped in direction 6: the terrain table next
    - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour that way is copied; nothing mapped there and the die is rolled once more* / Result: [6] nothing mapped in direction 6: rolled once more
  - **Lost check** not lost
    - *Roll a D6 to see if you are lost; −1 leaving veldt: 2+ finds the way; less is lost, and the turn ends here* / Result: [4] 4 − 1 = 3: not lost

**7. The dice come up 5, 6, 4**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for a river source; even and a river rises here, if the next die gives it somewhere to flow; odd and there is none"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll 3 D6 for the mountain's height; the three dice multiplied, plus 100, in hundreds of feet: over 15,000 ft is a recorded peak* / Result: [5 6 4] 5 × 6 × 4 + 100 = 220 hundred: 22,000 ft, a recorded peak
  - **Terrain** mapped jungle mountain: nothing mapped in direction 6, rolled again; nothing mapped in direction 6 either; 4 on the table: jungle; 2: mountain in the jungle
    - *Roll a D6 for what the jungle hides; 2 adds mountain, 3 adds swamp, anything else jungle alone* / Result: [2] mountain in the jungle
    - *Roll a D6 for the terrain; 1 desert, 2 mountain, 3 swamp, 4 jungle, 5 veldt, 6 lake* / Result: [4] jungle
    - *Roll a D6 for the direction of the terrain to copy, once more; a mapped neighbour that way is copied; nothing mapped there and the terrain table decides* / Result: [6] nothing mapped in direction 6: the terrain table next
    - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour that way is copied; nothing mapped there and the die is rolled once more* / Result: [6] nothing mapped in direction 6: rolled once more
  - **Lost check** not lost
    - *Roll a D6 to see if you are lost; −1 leaving veldt: 2+ finds the way; less is lost, and the turn ends here* / Result: [4] 4 − 1 = 3: not lost

**8. The dice come up 2**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for which way the river flows; it flows into water or unexplored country that way; toward mapped land there is no river after all"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll a D6 for a river source; even and a river rises here, if the next die gives it somewhere to flow; odd and there is none* / Result: [2] even: a river, if the next die allows
  - *Roll 3 D6 for the mountain's height; the three dice multiplied, plus 100, in hundreds of feet: over 15,000 ft is a recorded peak* / Result: [5 6 4] 5 × 6 × 4 + 100 = 220 hundred: 22,000 ft, a recorded peak
  - **Terrain** mapped jungle mountain: nothing mapped in direction 6, rolled again; nothing mapped in direction 6 either; 4 on the table: jungle; 2: mountain in the jungle
    - *Roll a D6 for what the jungle hides; 2 adds mountain, 3 adds swamp, anything else jungle alone* / Result: [2] mountain in the jungle
    - *Roll a D6 for the terrain; 1 desert, 2 mountain, 3 swamp, 4 jungle, 5 veldt, 6 lake* / Result: [4] jungle
    - *Roll a D6 for the direction of the terrain to copy, once more; a mapped neighbour that way is copied; nothing mapped there and the terrain table decides* / Result: [6] nothing mapped in direction 6: the terrain table next
    - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour that way is copied; nothing mapped there and the die is rolled once more* / Result: [6] nothing mapped in direction 6: rolled once more
  - **Lost check** not lost
    - *Roll a D6 to see if you are lost; −1 leaving veldt: 2+ finds the way; less is lost, and the turn ends here* / Result: [4] 4 − 1 = 3: not lost

**9. The dice come up 6**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for a cataract; on a river in mountain 2, 3 or 4 is a cataract, anything else none"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll a D6 for which way the river flows; it flows into water or unexplored country that way; toward mapped land there is no river after all* / Result: [6] it flows in direction 6
  - *Roll a D6 for a river source; even and a river rises here, if the next die gives it somewhere to flow; odd and there is none* / Result: [2] even: a river, if the next die allows
  - *Roll 3 D6 for the mountain's height; the three dice multiplied, plus 100, in hundreds of feet: over 15,000 ft is a recorded peak* / Result: [5 6 4] 5 × 6 × 4 + 100 = 220 hundred: 22,000 ft, a recorded peak
  - **Terrain** mapped jungle mountain: nothing mapped in direction 6, rolled again; nothing mapped in direction 6 either; 4 on the table: jungle; 2: mountain in the jungle
    - *Roll a D6 for what the jungle hides; 2 adds mountain, 3 adds swamp, anything else jungle alone* / Result: [2] mountain in the jungle
    - *Roll a D6 for the terrain; 1 desert, 2 mountain, 3 swamp, 4 jungle, 5 veldt, 6 lake* / Result: [4] jungle
    - *Roll a D6 for the direction of the terrain to copy, once more; a mapped neighbour that way is copied; nothing mapped there and the terrain table decides* / Result: [6] nothing mapped in direction 6: the terrain table next
    - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour that way is copied; nothing mapped there and the die is rolled once more* / Result: [6] nothing mapped in direction 6: rolled once more
  - **Lost check** not lost
    - *Roll a D6 to see if you are lost; −1 leaving veldt: 2+ finds the way; less is lost, and the turn ends here* / Result: [4] 4 − 1 = 3: not lost

**10. The dice come up 3**

Dice panel at bottom-1's edge:

- Ask: "Roll 4 D6 for the waterfall's height; the four dice multiplied, in feet: 400 ft or more is a recorded fall"
- Status: "Waiting for a roll of 4 D6"
- So far (newest first):
  - *Roll a D6 for a cataract; on a river in mountain 2, 3 or 4 is a cataract, anything else none* / Result: [3] a cataract, its fall measured next
  - *Roll a D6 for which way the river flows; it flows into water or unexplored country that way; toward mapped land there is no river after all* / Result: [6] it flows in direction 6
  - *Roll a D6 for a river source; even and a river rises here, if the next die gives it somewhere to flow; odd and there is none* / Result: [2] even: a river, if the next die allows
  - *Roll 3 D6 for the mountain's height; the three dice multiplied, plus 100, in hundreds of feet: over 15,000 ft is a recorded peak* / Result: [5 6 4] 5 × 6 × 4 + 100 = 220 hundred: 22,000 ft, a recorded peak
  - **Terrain** mapped jungle mountain: nothing mapped in direction 6, rolled again; nothing mapped in direction 6 either; 4 on the table: jungle; 2: mountain in the jungle
    - *Roll a D6 for what the jungle hides; 2 adds mountain, 3 adds swamp, anything else jungle alone* / Result: [2] mountain in the jungle
    - *Roll a D6 for the terrain; 1 desert, 2 mountain, 3 swamp, 4 jungle, 5 veldt, 6 lake* / Result: [4] jungle
    - *Roll a D6 for the direction of the terrain to copy, once more; a mapped neighbour that way is copied; nothing mapped there and the terrain table decides* / Result: [6] nothing mapped in direction 6: the terrain table next
    - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour that way is copied; nothing mapped there and the die is rolled once more* / Result: [6] nothing mapped in direction 6: rolled once more
  - **Lost check** not lost
    - *Roll a D6 to see if you are lost; −1 leaving veldt: 2+ finds the way; less is lost, and the turn ends here* / Result: [4] 4 − 1 = 3: not lost

**11. The dice come up 2, 3, 4, 5**

Dice panel at bottom-1's edge:

- Ask: "Roll 2 D6 for natives; a total of 2, 3, 4, 5, 6 or 7 finds natives in jungle mountain on water; anything else, none"
- Status: "Waiting for a roll of 2 D6"
- So far (newest first):
  - **Water** 5 × 6 × 4 = 120, plus 100 = 220 hundred feet: a record-breaking peak of 22,000 ft (over 15,000), the first discovered and the highest so far; 2 is even: a river rises here and flows in direction 6; a cataract on a 3 (its fall of 120 ft, 2 × 3 × 4 × 5, under the 400 recorded)
    - *Roll 4 D6 for the waterfall's height; the four dice multiplied, in feet: 400 ft or more is a recorded fall* / Result: [2 3 4 5] 2 × 3 × 4 × 5 = 120 ft: under the 400 recorded
    - *Roll a D6 for a cataract; on a river in mountain 2, 3 or 4 is a cataract, anything else none* / Result: [3] a cataract, its fall measured next
    - *Roll a D6 for which way the river flows; it flows into water or unexplored country that way; toward mapped land there is no river after all* / Result: [6] it flows in direction 6
    - *Roll a D6 for a river source; even and a river rises here, if the next die gives it somewhere to flow; odd and there is none* / Result: [2] even: a river, if the next die allows
    - *Roll 3 D6 for the mountain's height; the three dice multiplied, plus 100, in hundreds of feet: over 15,000 ft is a recorded peak* / Result: [5 6 4] 5 × 6 × 4 + 100 = 220 hundred: 22,000 ft, a recorded peak
  - **Terrain** mapped jungle mountain: nothing mapped in direction 6, rolled again; nothing mapped in direction 6 either; 4 on the table: jungle; 2: mountain in the jungle
    - *Roll a D6 for what the jungle hides; 2 adds mountain, 3 adds swamp, anything else jungle alone* / Result: [2] mountain in the jungle
    - *Roll a D6 for the terrain; 1 desert, 2 mountain, 3 swamp, 4 jungle, 5 veldt, 6 lake* / Result: [4] jungle
    - *Roll a D6 for the direction of the terrain to copy, once more; a mapped neighbour that way is copied; nothing mapped there and the terrain table decides* / Result: [6] nothing mapped in direction 6: the terrain table next
    - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour that way is copied; nothing mapped there and the die is rolled once more* / Result: [6] nothing mapped in direction 6: rolled once more
  - **Lost check** not lost
    - *Roll a D6 to see if you are lost; −1 leaving veldt: 2+ finds the way; less is lost, and the turn ends here* / Result: [4] 4 − 1 = 3: not lost

**12. The dice come up 1, 2**

Dice panel at bottom-1's edge:

- Ask: "Roll 3 D6 for the warriors; the three dice multiplied; the largest counts no more than 1, the hex to Mombasa"
- Status: "Waiting for a roll of 3 D6"
- So far (newest first):
  - **Natives** natives on 3: a tribe is here, its warriors next
    - *Roll 2 D6 for natives; a total of 2, 3, 4, 5, 6 or 7 finds natives in jungle mountain on water; anything else, none* / Result: [1 2] 1 + 2 = 3: natives
  - **Water** 5 × 6 × 4 = 120, plus 100 = 220 hundred feet: a record-breaking peak of 22,000 ft (over 15,000), the first discovered and the highest so far; 2 is even: a river rises here and flows in direction 6; a cataract on a 3 (its fall of 120 ft, 2 × 3 × 4 × 5, under the 400 recorded)
    - *Roll 4 D6 for the waterfall's height; the four dice multiplied, in feet: 400 ft or more is a recorded fall* / Result: [2 3 4 5] 2 × 3 × 4 × 5 = 120 ft: under the 400 recorded
    - *Roll a D6 for a cataract; on a river in mountain 2, 3 or 4 is a cataract, anything else none* / Result: [3] a cataract, its fall measured next
    - *Roll a D6 for which way the river flows; it flows into water or unexplored country that way; toward mapped land there is no river after all* / Result: [6] it flows in direction 6
    - *Roll a D6 for a river source; even and a river rises here, if the next die gives it somewhere to flow; odd and there is none* / Result: [2] even: a river, if the next die allows
    - *Roll 3 D6 for the mountain's height; the three dice multiplied, plus 100, in hundreds of feet: over 15,000 ft is a recorded peak* / Result: [5 6 4] 5 × 6 × 4 + 100 = 220 hundred: 22,000 ft, a recorded peak
  - **Terrain** mapped jungle mountain: nothing mapped in direction 6, rolled again; nothing mapped in direction 6 either; 4 on the table: jungle; 2: mountain in the jungle
    - *Roll a D6 for what the jungle hides; 2 adds mountain, 3 adds swamp, anything else jungle alone* / Result: [2] mountain in the jungle
    - *Roll a D6 for the terrain; 1 desert, 2 mountain, 3 swamp, 4 jungle, 5 veldt, 6 lake* / Result: [4] jungle
    - *Roll a D6 for the direction of the terrain to copy, once more; a mapped neighbour that way is copied; nothing mapped there and the terrain table decides* / Result: [6] nothing mapped in direction 6: the terrain table next
    - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour that way is copied; nothing mapped there and the die is rolled once more* / Result: [6] nothing mapped in direction 6: rolled once more
  - **Lost check** not lost
    - *Roll a D6 to see if you are lost; −1 leaving veldt: 2+ finds the way; less is lost, and the turn ends here* / Result: [4] 4 − 1 = 3: not lost

**13. The dice come up 3, 3, 3**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The step into c24r12"
  - **Natives** natives on 3: tribe 1 of 9 warriors, 1 × 3 × 3, the 3 cut to 1, the hex to Mombasa
    - *Roll 3 D6 for the warriors; the three dice multiplied; the largest counts no more than 1, the hex to Mombasa* / Result: [3 3 3] 1 × 3 × 3 = 9 warriors, the 3 cut to 1
    - *Roll 2 D6 for natives; a total of 2, 3, 4, 5, 6 or 7 finds natives in jungle mountain on water; anything else, none* / Result: [1 2] 1 + 2 = 3: natives
  - **Water** 5 × 6 × 4 = 120, plus 100 = 220 hundred feet: a record-breaking peak of 22,000 ft (over 15,000), the first discovered and the highest so far; 2 is even: a river rises here and flows in direction 6; a cataract on a 3 (its fall of 120 ft, 2 × 3 × 4 × 5, under the 400 recorded)
    - *Roll 4 D6 for the waterfall's height; the four dice multiplied, in feet: 400 ft or more is a recorded fall* / Result: [2 3 4 5] 2 × 3 × 4 × 5 = 120 ft: under the 400 recorded
    - *Roll a D6 for a cataract; on a river in mountain 2, 3 or 4 is a cataract, anything else none* / Result: [3] a cataract, its fall measured next
    - *Roll a D6 for which way the river flows; it flows into water or unexplored country that way; toward mapped land there is no river after all* / Result: [6] it flows in direction 6
    - *Roll a D6 for a river source; even and a river rises here, if the next die gives it somewhere to flow; odd and there is none* / Result: [2] even: a river, if the next die allows
    - *Roll 3 D6 for the mountain's height; the three dice multiplied, plus 100, in hundreds of feet: over 15,000 ft is a recorded peak* / Result: [5 6 4] 5 × 6 × 4 + 100 = 220 hundred: 22,000 ft, a recorded peak
  - **Terrain** mapped jungle mountain: nothing mapped in direction 6, rolled again; nothing mapped in direction 6 either; 4 on the table: jungle; 2: mountain in the jungle
    - *Roll a D6 for what the jungle hides; 2 adds mountain, 3 adds swamp, anything else jungle alone* / Result: [2] mountain in the jungle
    - *Roll a D6 for the terrain; 1 desert, 2 mountain, 3 swamp, 4 jungle, 5 veldt, 6 lake* / Result: [4] jungle
    - *Roll a D6 for the direction of the terrain to copy, once more; a mapped neighbour that way is copied; nothing mapped there and the terrain table decides* / Result: [6] nothing mapped in direction 6: the terrain table next
    - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour that way is copied; nothing mapped there and the die is rolled once more* / Result: [6] nothing mapped in direction 6: rolled once more
  - **Lost check** not lost
    - *Roll a D6 to see if you are lost; −1 leaving veldt: 2+ finds the way; less is lost, and the turn ends here* / Result: [4] 4 − 1 = 3: not lost
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Lost check** needs 2+ [4] −1 leaving veldt = 3 not lost
- bottom-1: **Terrain** [6 6 4 2] mapped jungle mountain: nothing mapped in direction 6, rolled again; nothing mapped in direction 6 either; 4 on the table: jungle; 2: mountain in the jungle
- bottom-1: **Water** [5 6 4 2 6 3] (+4 more dice not drawn) 5 × 6 × 4 = 120, plus 100 = 220 hundred feet: a record-breaking peak of 22,000 ft (over 15,000), the first discovered and the highest so far; 2 is even: a river rises here and flows in direction 6; a cataract on a 3 (its fall of 120 ft, 2 × 3 × 4 × 5, under the 400 recorded)
- bottom-1: **Natives** needs 2, 3, 4, 5, 6, 7 [1 2 3 3 3] natives on 3: tribe 1 of 9 warriors, 1 × 3 × 3, the 3 cut to 1, the hex to Mombasa

Rail's one line at bottom-1: **Natives** needs 2, 3, 4, 5, 6, 7 [1 2 3 3 3] natives on 3: tribe 1 of 9 warriors, 1 × 3 × 3, the 3 cut to 1, the hex to Mombasa

Policy panel at bottom-1's edge:

- Heading: "(1) 9 warriors"
- [1] "Defensive stand" / "Stay put on guard: no hunting, research or trade, no leaving until next turn"
- [2] "Retreat" / "Back to the hex you came from; your marker here is removed"
- [3] "Show of force" / "Approach warily, muskets ready"
- [4] "Ignore them" / "Carry on as if they were not there"
- [5] "Friendly approach" / "Open hands and gifts"

### A3. The terrain cannot be entered on foot: the expedition turns back

The second turn in the field, from c24r12.

**Before anything is tapped**

Move prompt at bottom-1's edge: "Pick a hex to move into, or" [END TURN]

**1. The player taps hex c23r12 on the board**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 to see if you are lost; −1 leaving veldt: 2+ finds the way; less is lost, and the turn ends here"
- Status: "Waiting for a D6 roll"

**2. The dice come up 4**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the direction of the terrain to copy; a mapped neighbour that way is copied; nothing mapped there and the die is rolled once more"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Lost check** not lost
    - *Roll a D6 to see if you are lost; −1 leaving veldt: 2+ finds the way; less is lost, and the turn ends here* / Result: [4] 4 − 1 = 3: not lost

**3. The dice come up 3**

Dice panel at bottom-1's edge:

- Note: "Hex in direction 3 is empty; roll again"
- Ask: "Roll a D6 for the direction of the terrain to copy, once more; a mapped neighbour that way is copied; nothing mapped there and the terrain table decides"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour that way is copied; nothing mapped there and the die is rolled once more* / Result: [3] nothing mapped in direction 3: rolled once more
  - **Lost check** not lost
    - *Roll a D6 to see if you are lost; −1 leaving veldt: 2+ finds the way; less is lost, and the turn ends here* / Result: [4] 4 − 1 = 3: not lost

**4. The dice come up 3**

Dice panel at bottom-1's edge:

- Note: "Hex in direction 3 is empty too; roll on the terrain table"
- Ask: "Roll a D6 for the terrain; 1 desert, 2 mountain, 3 swamp, 4 jungle, 5 veldt, 6 lake"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll a D6 for the direction of the terrain to copy, once more; a mapped neighbour that way is copied; nothing mapped there and the terrain table decides* / Result: [3] nothing mapped in direction 3: the terrain table next
  - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour that way is copied; nothing mapped there and the die is rolled once more* / Result: [3] nothing mapped in direction 3: rolled once more
  - **Lost check** not lost
    - *Roll a D6 to see if you are lost; −1 leaving veldt: 2+ finds the way; less is lost, and the turn ends here* / Result: [4] 4 − 1 = 3: not lost

**5. The dice come up 3**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for jungle in the swamp; 4 adds jungle, anything else swamp alone"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll a D6 for the terrain; 1 desert, 2 mountain, 3 swamp, 4 jungle, 5 veldt, 6 lake* / Result: [3] swamp
  - *Roll a D6 for the direction of the terrain to copy, once more; a mapped neighbour that way is copied; nothing mapped there and the terrain table decides* / Result: [3] nothing mapped in direction 3: the terrain table next
  - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour that way is copied; nothing mapped there and the die is rolled once more* / Result: [3] nothing mapped in direction 3: rolled once more
  - **Lost check** not lost
    - *Roll a D6 to see if you are lost; −1 leaving veldt: 2+ finds the way; less is lost, and the turn ends here* / Result: [4] 4 − 1 = 3: not lost

**6. The dice come up 3**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The step into c23r12"
  - **Turned back** swamp is impassable on foot: the expedition turns back
  - **Terrain** mapped swamp: nothing mapped in direction 3, rolled again; nothing mapped in direction 3 either; 3 on the table: swamp; 3: no jungle in the swamp
    - *Roll a D6 for jungle in the swamp; 4 adds jungle, anything else swamp alone* / Result: [3] no jungle: swamp alone
    - *Roll a D6 for the terrain; 1 desert, 2 mountain, 3 swamp, 4 jungle, 5 veldt, 6 lake* / Result: [3] swamp
    - *Roll a D6 for the direction of the terrain to copy, once more; a mapped neighbour that way is copied; nothing mapped there and the terrain table decides* / Result: [3] nothing mapped in direction 3: the terrain table next
    - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour that way is copied; nothing mapped there and the die is rolled once more* / Result: [3] nothing mapped in direction 3: rolled once more
  - **Lost check** not lost
    - *Roll a D6 to see if you are lost; −1 leaving veldt: 2+ finds the way; less is lost, and the turn ends here* / Result: [4] 4 − 1 = 3: not lost
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Lost check** needs 2+ [4] −1 leaving veldt = 3 not lost
- bottom-1: **Terrain** [3 3 3 3] mapped swamp: nothing mapped in direction 3, rolled again; nothing mapped in direction 3 either; 3 on the table: swamp; 3: no jungle in the swamp
- bottom-1: **Turned back** swamp is impassable on foot: the expedition turns back

Rail's one line at bottom-1: **Turned back** swamp is impassable on foot: the expedition turns back

### A4. A step into a hex already on the map

From c24r12 back toward the coast: one movement point, so a point is left afterwards.

**Before anything is tapped**

Move prompt at bottom-1's edge: "Pick a hex to move into, or" [END TURN]

**1. The player taps hex c24r13 on the board**

Lines added to the log (open log wording):

- bottom-1: moved to c24r13

Rail's one line at bottom-1: moved to c24r13

Move prompt at bottom-1's edge: "You have 1 MP: pick a hex to move into, or" [END TURN]

## B. The start of a turn in the field, and a step that gets lost

### B1. The disaster card at the start of the turn, then lost on the first step

The second turn in the field: the turn opens with the disaster card.

**Before anything is tapped**

Disaster card panel at bottom-1's edge:

- Heading: "Disaster card"
- Card: "28" · "Loss (Guide)" · "DESERT"
- Text: "Your GUIDE and one of your ASKARIS are from different DESERT tribes. They fight a duel and the GUIDE is killed."
- Button: [Apply it] when the card applies to where the expedition is, else [No effect here: discard it]

**1. The player taps the card's button**

Lines added to the log (open log wording):

- bottom-1: **Disaster card** (card 28: no effect) no effect here: a card for desert

Rail's one line at bottom-1: **Disaster card** (card 28: no effect) no effect here: a card for desert

Move prompt at bottom-1's edge: "Pick a hex to move into, or" [END TURN]

**2. The player taps hex c23r12 on the board**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 to see if you are lost; −1 leaving veldt: 2+ finds the way; less is lost, and the turn ends here"
- Status: "Waiting for a D6 roll"

**3. The dice come up 1**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the hunt; 1 or less bags nothing, 2–3 one ration a hunter, 4–5 two, 6 or more three; 6 hunters"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Lost check** lost: the expedition stays where it is and the turn ends
    - *Roll a D6 to see if you are lost; −1 leaving veldt: 2+ finds the way; less is lost, and the turn ends here* / Result: [1] 1 − 1 = 0: lost, the turn ends here

**4. The dice come up 1**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The hunt"
  - **Hunting** the hunt fails: 12 men ate (12 from the stores, 22 left)
    - *Roll a D6 for the hunt; 1 or less bags nothing, 2–3 one ration a hunter, 4–5 two, 6 or more three; 6 hunters* / Result: [1] nothing bagged
- Segment heading: "The step into c23r12"
  - **Lost check** lost: the expedition stays where it is and the turn ends
    - *Roll a D6 to see if you are lost; −1 leaving veldt: 2+ finds the way; less is lost, and the turn ends here* / Result: [1] 1 − 1 = 0: lost, the turn ends here
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Lost check** needs 2+ [1] −1 leaving veldt = 0 lost: the expedition stays where it is and the turn ends
- bottom-1: **Hunting** needs 2 / 4 / 6 for one, two, three per hunter [1] the hunt fails: 12 men ate (12 from the stores, 22 left)

Rail's one line at bottom-1: **Hunting** needs 2 / 4 / 6 [1] the hunt fails: 12 men ate (12 from the stores, 22 left)

## C. Natives

### C1. Natives found by a step: the policy panel

From c24r12 into c23r12.

**Before anything is tapped**

Move prompt at bottom-1's edge: "Pick a hex to move into, or" [END TURN]

**1. The player taps hex c23r12 on the board**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 to see if you are lost; −1 leaving veldt: 2+ finds the way; less is lost, and the turn ends here"
- Status: "Waiting for a D6 roll"

**2. The dice come up 4**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the direction of the terrain to copy; a mapped neighbour that way is copied; nothing mapped there and the die is rolled once more"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Lost check** not lost
    - *Roll a D6 to see if you are lost; −1 leaving veldt: 2+ finds the way; less is lost, and the turn ends here* / Result: [4] 4 − 1 = 3: not lost

**3. The dice come up 2**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for a river source; even and a river rises here, if the next die gives it somewhere to flow; odd and there is none"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Terrain** mapped veldt: veldt copied from the neighbour in direction 2
    - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour that way is copied; nothing mapped there and the die is rolled once more* / Result: [2] veldt, copied from direction 2
  - **Lost check** not lost
    - *Roll a D6 to see if you are lost; −1 leaving veldt: 2+ finds the way; less is lost, and the turn ends here* / Result: [4] 4 − 1 = 3: not lost

**4. The dice come up 3**

Dice panel at bottom-1's edge:

- Ask: "Roll 2 D6 for natives; a total of 2, 3 or 4 finds natives in veldt; anything else, none"
- Status: "Waiting for a roll of 2 D6"
- So far (newest first):
  - **Water** 3 is odd: no river
    - *Roll a D6 for a river source; even and a river rises here, if the next die gives it somewhere to flow; odd and there is none* / Result: [3] odd: no river
  - **Terrain** mapped veldt: veldt copied from the neighbour in direction 2
    - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour that way is copied; nothing mapped there and the die is rolled once more* / Result: [2] veldt, copied from direction 2
  - **Lost check** not lost
    - *Roll a D6 to see if you are lost; −1 leaving veldt: 2+ finds the way; less is lost, and the turn ends here* / Result: [4] 4 − 1 = 3: not lost

**5. The dice come up 1, 2**

Dice panel at bottom-1's edge:

- Ask: "Roll 3 D6 for the warriors; the three dice multiplied; the largest counts no more than 2, the hexes to Mombasa"
- Status: "Waiting for a roll of 3 D6"
- So far (newest first):
  - **Natives** natives on 3: a tribe is here, its warriors next
    - *Roll 2 D6 for natives; a total of 2, 3 or 4 finds natives in veldt; anything else, none* / Result: [1 2] 1 + 2 = 3: natives
  - **Water** 3 is odd: no river
    - *Roll a D6 for a river source; even and a river rises here, if the next die gives it somewhere to flow; odd and there is none* / Result: [3] odd: no river
  - **Terrain** mapped veldt: veldt copied from the neighbour in direction 2
    - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour that way is copied; nothing mapped there and the die is rolled once more* / Result: [2] veldt, copied from direction 2
  - **Lost check** not lost
    - *Roll a D6 to see if you are lost; −1 leaving veldt: 2+ finds the way; less is lost, and the turn ends here* / Result: [4] 4 − 1 = 3: not lost

**6. The dice come up 2, 2, 3**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The step into c23r12"
  - **Natives** natives on 3: tribe 1 of 8 warriors, 2 × 2 × 2, the 3 cut to 2, the hexes to Mombasa
    - *Roll 3 D6 for the warriors; the three dice multiplied; the largest counts no more than 2, the hexes to Mombasa* / Result: [2 2 3] 2 × 2 × 2 = 8 warriors, the 3 cut to 2
    - *Roll 2 D6 for natives; a total of 2, 3 or 4 finds natives in veldt; anything else, none* / Result: [1 2] 1 + 2 = 3: natives
  - **Water** 3 is odd: no river
    - *Roll a D6 for a river source; even and a river rises here, if the next die gives it somewhere to flow; odd and there is none* / Result: [3] odd: no river
  - **Terrain** mapped veldt: veldt copied from the neighbour in direction 2
    - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour that way is copied; nothing mapped there and the die is rolled once more* / Result: [2] veldt, copied from direction 2
  - **Lost check** not lost
    - *Roll a D6 to see if you are lost; −1 leaving veldt: 2+ finds the way; less is lost, and the turn ends here* / Result: [4] 4 − 1 = 3: not lost
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Lost check** needs 2+ [4] −1 leaving veldt = 3 not lost
- bottom-1: **Terrain** [2] mapped veldt: veldt copied from the neighbour in direction 2
- bottom-1: **Water** [3] 3 is odd: no river
- bottom-1: **Natives** needs 2, 3, 4 [1 2 2 2 3] natives on 3: tribe 1 of 8 warriors, 2 × 2 × 2, the 3 cut to 2, the hexes to Mombasa

Rail's one line at bottom-1: **Natives** needs 2, 3, 4 [1 2 2 2 3] natives on 3: tribe 1 of 8 warriors, 2 × 2 × 2, the 3 cut to 2, the hexes to Mombasa

Policy panel at bottom-1's edge:

- Heading: "(1) 8 warriors"
- [1] "Defensive stand" / "Stay put on guard: no hunting, research or trade, no leaving until next turn"
- [2] "Retreat" / "Back to the hex you came from; your marker here is removed"
- [3] "Show of force" / "Approach warily, muskets ready"
- [4] "Ignore them" / "Carry on as if they were not there"
- [5] "Friendly approach" / "Open hands and gifts"

### C2. Show of force, hostile: the fight won, prisoners taken, the village found and looted

Continues C1.

**Before anything is tapped**

Policy panel at bottom-1's edge:

- Heading: "(1) 8 warriors"
- [1] "Defensive stand" / "Stay put on guard: no hunting, research or trade, no leaving until next turn"
- [2] "Retreat" / "Back to the hex you came from; your marker here is removed"
- [3] "Show of force" / "Approach warily, muskets ready"
- [4] "Ignore them" / "Carry on as if they were not there"
- [5] "Friendly approach" / "Open hands and gifts"

**1. The player chooses policy 3, "Show of force"**

Dice panel at bottom-1's edge:

- Ask: "Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)"
- Status: "Waiting for a roll of 3 D6"

**2. The dice come up 6, 6, 6**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide, else they attack"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**3. The dice come up 1**

Dice panel at bottom-1's edge:

- Ask: "Roll 2 D6 for surprise; a total of 3 or more, the policy number, and the expedition fires first; less and it is surprised"
- Status: "Waiting for a roll of 2 D6"
- So far (newest first):
  - **Fight** hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 8 warriors: the natives attack
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide, else they attack* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**4. The dice come up 6, 6**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 to drive them off; the volley killed 6: the die × 6 more than the 2 warriors left drives them off, else they close in"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Fight** hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 8 warriors: the natives attack; surprise 6 + 6 = 12, not under policy 3: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall
    - *Roll 2 D6 for surprise; a total of 3 or more, the policy number, and the expedition fires first; less and it is surprised* / Result: [6 6] 6 + 6 = 12: not surprised
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide, else they attack* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**5. The dice come up 6**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for prisoners; 5 askaris less the die are taken prisoner, no more than the 2 warriors left; a 6 takes none, and the village is looted if it is found"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Fight** hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 8 warriors: the natives attack; surprise 6 + 6 = 12, not under policy 3: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall; morale 6 × 6 killed = 36, more than the 2 warriors left: the natives are driven off
    - *Roll a D6 to drive them off; the volley killed 6: the die × 6 more than the 2 warriors left drives them off, else they close in* / Result: [6] 6 × 6 = 36: the natives are driven off
    - *Roll 2 D6 for surprise; a total of 3 or more, the policy number, and the expedition fires first; less and it is surprised* / Result: [6 6] 6 + 6 = 12: not surprised
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide, else they attack* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**6. The dice come up 2**

Dice panel at bottom-1's edge:

- Ask: "Roll 2 D6 to find the village; a total of 5 or less finds it (2 prisoners + policy 3); more and it stays hidden this turn"
- Status: "Waiting for a roll of 2 D6"
- So far (newest first):
  - *Roll a D6 for prisoners; 5 askaris less the die are taken prisoner, no more than the 2 warriors left; a 6 takes none, and the village is looted if it is found* / Result: [2] 5 − 2 = 3: 2 taken, every warrior left
  - **Fight** hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 8 warriors: the natives attack; surprise 6 + 6 = 12, not under policy 3: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall; morale 6 × 6 killed = 36, more than the 2 warriors left: the natives are driven off
    - *Roll a D6 to drive them off; the volley killed 6: the die × 6 more than the 2 warriors left drives them off, else they close in* / Result: [6] 6 × 6 = 36: the natives are driven off
    - *Roll 2 D6 for surprise; a total of 3 or more, the policy number, and the expedition fires first; less and it is surprised* / Result: [6 6] 6 + 6 = 12: not surprised
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide, else they attack* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**7. The dice come up 1, 2**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The natives"
  - **Victory** prisoners: 5 askaris − 2 = 3, 2 taken (every warrior left); the prisoners carry as bearers; village 1 + 2 = 3, within 2 prisoners + policy 3 = 5: the village is found
    - *Roll 2 D6 to find the village; a total of 5 or less finds it (2 prisoners + policy 3); more and it stays hidden this turn* / Result: [1 2] 1 + 2 = 3: the village is found
    - *Roll a D6 for prisoners; 5 askaris less the die are taken prisoner, no more than the 2 warriors left; a 6 takes none, and the village is looted if it is found* / Result: [2] 5 − 2 = 3: 2 taken, every warrior left
  - **Fight** hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 8 warriors: the natives attack; surprise 6 + 6 = 12, not under policy 3: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall; morale 6 × 6 killed = 36, more than the 2 warriors left: the natives are driven off
    - *Roll a D6 to drive them off; the volley killed 6: the die × 6 more than the 2 warriors left drives them off, else they close in* / Result: [6] 6 × 6 = 36: the natives are driven off
    - *Roll 2 D6 for surprise; a total of 3 or more, the policy number, and the expedition fires first; less and it is surprised* / Result: [6 6] 6 + 6 = 12: not surprised
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide, else they attack* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Native reaction** needs 5 or less [6 6 6] +2 hexes to the nearest port, +3 policy 3, show of force hostile: 18 on the dice, over the target of 5
- bottom-1: **Fight** [1 6 6 6] hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 8 warriors: the natives attack; surprise 6 + 6 = 12, not under policy 3: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall; morale 6 × 6 killed = 36, more than the 2 warriors left: the natives are driven off
- bottom-1: **Victory** [2 1 2] prisoners: 5 askaris − 2 = 3, 2 taken (every warrior left); the prisoners carry as bearers; village 1 + 2 = 3, within 2 prisoners + policy 3 = 5: the village is found

Rail's one line at bottom-1: **Victory** [2 1 2] prisoners: 5 askaris − 2 = 3, 2 taken (every warrior left); the prisoners carry as bearers; village 1 + 2 = 3, within 2 prisoners + policy 3 = 5: the village is found

Spoils panel at bottom-1's edge:

- Heading: "The village is found · 2 prisoners"
- "Release the prisoners" / "Leave the village alone; the tribe remembers your mercy"
- "Keep them as bearers and loot" / "A die per warrior met: rations, gifts, a camel or canoe"

**8. The player chooses "Keep them as bearers and loot"**

Dice panel at bottom-1's edge:

- Ask: "Roll 8 D6 for the loot; one die a warrior: 1–4 that many rations, 5 a gift, 6 nothing"
- Tally: "0 of 8 in"
- Status: "Waiting for a throw; 8 more dice wanted"

**9. The dice come up 3, 3, 3, 3**

Dice panel at bottom-1's edge:

- Ask: "Roll 8 D6 for the loot; one die a warrior: 1–4 that many rations, 5 a gift, 6 nothing"
- Tally: "4 of 8 in"
- Status: "Waiting for a throw; 4 more dice wanted"

**10. The dice come up 1, 6, 2, 5**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The natives"
  - **Loot** looted 15 rations, 1 gift (a die a warrior: 1 to 4 that many rations, 5 a gift, 6 nothing)
    - *Roll 8 D6 for the loot; one die a warrior: 1–4 that many rations, 5 a gift, 6 nothing* / Result: [3 3 3 3 1 6 2 5] 15 rations, 1 gift
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Loot** [3 3 3 3 1 6] (+2 more dice not drawn) looted 15 rations, 1 gift (a die a warrior: 1 to 4 that many rations, 5 a gift, 6 nothing)

Rail's one line at bottom-1: **Loot** [3 3 3 3 1 6] (+2 more dice not drawn) looted 15 rations, 1 gift (a die a warrior: 1 to 4 that many rations, 5 a gift, 6 nothing)

**11. The player taps END TURN**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the hunt; 1 or less bags nothing, 2–3 one ration a hunter, 4–5 two, 6 or more three; 6 hunters"
- Status: "Waiting for a D6 roll"

**12. The dice come up 4**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The hunt"
  - **Hunting** two per hunter: 12 rations bagged, 14 men ate (2 from the stores, 47 left)
    - *Roll a D6 for the hunt; 1 or less bags nothing, 2–3 one ration a hunter, 4–5 two, 6 or more three; 6 hunters* / Result: [4] two per hunter: 12 bagged
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Hunting** needs 2 / 4 / 6 for one, two, three per hunter [4] two per hunter: 12 rations bagged, 14 men ate (2 from the stores, 47 left)

Rail's one line at bottom-1: **Hunting** needs 2 / 4 / 6 [4] two per hunter: 12 rations bagged, 14 men ate (2 from the stores, 47 left)

### C3. Show of force, hostile: the natives lose their nerve and hide

Continues C1.

**Before anything is tapped**

Policy panel at bottom-1's edge:

- Heading: "(1) 8 warriors"
- [1] "Defensive stand" / "Stay put on guard: no hunting, research or trade, no leaving until next turn"
- [2] "Retreat" / "Back to the hex you came from; your marker here is removed"
- [3] "Show of force" / "Approach warily, muskets ready"
- [4] "Ignore them" / "Carry on as if they were not there"
- [5] "Friendly approach" / "Open hands and gifts"

**1. The player chooses policy 3, "Show of force"**

Dice panel at bottom-1's edge:

- Ask: "Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)"
- Status: "Waiting for a roll of 3 D6"

**2. The dice come up 6, 6, 6**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide, else they attack"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**3. The dice come up 6**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The natives"
  - **Fight** hostile; nerve 6 × 5 askaris ÷ policy 3 = 10, more than 8 warriors: the natives hide
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide, else they attack* / Result: [6] 6 × 5 ÷ 3 = 10: the natives hide
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Native reaction** needs 5 or less [6 6 6] +2 hexes to the nearest port, +3 policy 3, show of force hostile: 18 on the dice, over the target of 5
- bottom-1: **Fight** [6] hostile; nerve 6 × 5 askaris ÷ policy 3 = 10, more than 8 warriors: the natives hide

Rail's one line at bottom-1: **Fight** [6] hostile; nerve 6 × 5 askaris ÷ policy 3 = 10, more than 8 warriors: the natives hide

### C4. Show of force, hostile: surprised and defeated, the explorer taken prisoner; the escape roll on the next turn

Continues C1.

**Before anything is tapped**

Policy panel at bottom-1's edge:

- Heading: "(1) 8 warriors"
- [1] "Defensive stand" / "Stay put on guard: no hunting, research or trade, no leaving until next turn"
- [2] "Retreat" / "Back to the hex you came from; your marker here is removed"
- [3] "Show of force" / "Approach warily, muskets ready"
- [4] "Ignore them" / "Carry on as if they were not there"
- [5] "Friendly approach" / "Open hands and gifts"

**1. The player chooses policy 3, "Show of force"**

Dice panel at bottom-1's edge:

- Ask: "Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)"
- Status: "Waiting for a roll of 3 D6"

**2. The dice come up 6, 6, 6**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide, else they attack"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**3. The dice come up 1**

Dice panel at bottom-1's edge:

- Ask: "Roll 2 D6 for surprise; a total of 3 or more, the policy number, and the expedition fires first; less and it is surprised"
- Status: "Waiting for a roll of 2 D6"
- So far (newest first):
  - **Fight** hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 8 warriors: the natives attack
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide, else they attack* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**4. The dice come up 1, 1**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the natives' strike; 8 warriors ÷ the die, rounded down, is the askaris who fall, of 5"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Fight** hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 8 warriors: the natives attack; surprise 1 + 1 = 2, under policy 3: the expedition is surprised
    - *Roll 2 D6 for surprise; a total of 3 or more, the policy number, and the expedition fires first; less and it is surprised* / Result: [1 1] 1 + 1 = 2: surprised
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide, else they attack* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**5. The dice come up 1**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 on the consequences of defeat; 1 killed, 2 held prisoner, 3 escapes with nothing, 4 with a musket and 9 rations, 5 that and one survival roll, 6 that and two"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll a D6 for the natives' strike; 8 warriors ÷ the die, rounded down, is the askaris who fall, of 5* / Result: [1] 8 ÷ 1 = 8: all 5 askaris fall
  - *Roll 2 D6 for surprise; a total of 3 or more, the policy number, and the expedition fires first; less and it is surprised* / Result: [1 1] 1 + 1 = 2: surprised
  - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide, else they attack* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**6. The dice come up 2**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The natives"
  - **Defeat** defeat 2: the explorer is held prisoner and the expedition is lost; an escape is rolled for each turn
    - *Roll a D6 on the consequences of defeat; 1 killed, 2 held prisoner, 3 escapes with nothing, 4 with a musket and 9 rations, 5 that and one survival roll, 6 that and two* / Result: [2] held prisoner
  - **Fight** hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 8 warriors: the natives attack; surprise 1 + 1 = 2, under policy 3: the expedition is surprised; the natives strike: 8 warriors ÷ 1 = 8, all 5 askaris fall; every askari is dead: defeat
    - *Roll a D6 for the natives' strike; 8 warriors ÷ the die, rounded down, is the askaris who fall, of 5* / Result: [1] 8 ÷ 1 = 8: all 5 askaris fall
    - *Roll 2 D6 for surprise; a total of 3 or more, the policy number, and the expedition fires first; less and it is surprised* / Result: [1 1] 1 + 1 = 2: surprised
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide, else they attack* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Native reaction** needs 5 or less [6 6 6] +2 hexes to the nearest port, +3 policy 3, show of force hostile: 18 on the dice, over the target of 5
- bottom-1: **Fight** [1 1 1 1] hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 8 warriors: the natives attack; surprise 1 + 1 = 2, under policy 3: the expedition is surprised; the natives strike: 8 warriors ÷ 1 = 8, all 5 askaris fall; every askari is dead: defeat
- bottom-1: **Defeat** [2] defeat 2: the explorer is held prisoner and the expedition is lost; an escape is rolled for each turn

Rail's one line at bottom-1: **Defeat** [2] defeat 2: the explorer is held prisoner and the expedition is lost; an escape is rolled for each turn

**7. The player taps END TURN**

**8. The other player (top-1) plays a turn in Europe and ends it; it is bottom-1's turn again**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for an escape; the die − 3 for a prisoner: 1 or less killed, 2 still held, 3 escapes with nothing, 4 with a musket and 9 rations, 5 that and one survival roll, 6 that and two"
- Status: "Waiting for a D6 roll"

Lines added to the log (open log wording):

- top-1: discarded $200

Rail's one line at top-1: discarded $200

**9. The dice come up 6**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The natives"
  - **Captivity** escape 6 − 3 = 3: the explorer escapes alone
    - *Roll a D6 for an escape; the die − 3 for a prisoner: 1 or less killed, 2 still held, 3 escapes with nothing, 4 with a musket and 9 rations, 5 that and one survival roll, 6 that and two* / Result: [6] 6 − 3 = 3: escapes alone, with nothing
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Captivity** [6] escape 6 − 3 = 3: the explorer escapes alone

Rail's one line at bottom-1: **Captivity** [6] escape 6 − 3 = 3: the explorer escapes alone

Move prompt at bottom-1's edge: "Natives here. Pick a hex to move into, or" [REMAIN]

### C5. Friendly approach, not hostile: gifts offered, the chief satisfied, trade

Continues C1.

**Before anything is tapped**

Policy panel at bottom-1's edge:

- Heading: "(1) 8 warriors"
- [1] "Defensive stand" / "Stay put on guard: no hunting, research or trade, no leaving until next turn"
- [2] "Retreat" / "Back to the hex you came from; your marker here is removed"
- [3] "Show of force" / "Approach warily, muskets ready"
- [4] "Ignore them" / "Carry on as if they were not there"
- [5] "Friendly approach" / "Open hands and gifts"

**1. The player chooses policy 5, "Friendly approach"**

Dice panel at bottom-1's edge:

- Ask: "Roll 3 D6 for the natives' reaction; a total of 7 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +5 policy 5, friendly approach)"
- Status: "Waiting for a roll of 3 D6"

**2. The dice come up 1, 1, 1**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The natives"
  - **Native reaction** not hostile: 3 on the dice, within the target of 7
    - *Roll 3 D6 for the natives' reaction; a total of 7 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +5 policy 5, friendly approach)* / Result: [1 1 1] 1 + 1 + 1 = 3: not hostile
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Native reaction** needs 7 or less [1 1 1] +2 hexes to the nearest port, +5 policy 5, friendly approach not hostile: 3 on the dice, within the target of 7

Rail's one line at bottom-1: **Native reaction** needs 7 or less [1 1 1] +2 +5 not hostile: 3 on the dice, within the target of 7

Negotiation panel at bottom-1's edge:

- Heading: "(1) 8 warriors · (gifts icon) 20"
- Offer row: [−] "0" [+] [×1] and the button "Offer 0 gifts" / "Gifts × the larger of two dice must reach the warriors" (the count follows the offer: "Offer 4 gifts", "Offer 1 gift")
- "Give everything" / "All goods and animals but the men; the chief returns three dice of gifts"
- "Do not negotiate" / "Carry on with the turn"

**3. The player offers 4 gifts**

Dice panel at bottom-1's edge:

- Ask: "Roll 2 D6 for the offer of 4 gifts; the larger die × 4 must reach the 8 warriors to satisfy the chief; less insults him"
- Status: "Waiting for a roll of 2 D6"

**4. The dice come up 3, 5**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the price of food; the die is the rations one gift buys"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Negotiation** 4 gifts offered: the larger die 5 × 4 = 20, reaching 8 warriors: the chief is satisfied
    - *Roll 2 D6 for the offer of 4 gifts; the larger die × 4 must reach the 8 warriors to satisfy the chief; less insults him* / Result: [3 5] 5 × 4 = 20: the chief is satisfied

**5. The dice come up 3**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the price of bearers; the die is the gifts one bearer costs"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll a D6 for the price of food; the die is the rations one gift buys* / Result: [3] 3 rations a gift
  - **Negotiation** 4 gifts offered: the larger die 5 × 4 = 20, reaching 8 warriors: the chief is satisfied
    - *Roll 2 D6 for the offer of 4 gifts; the larger die × 4 must reach the 8 warriors to satisfy the chief; less insults him* / Result: [3 5] 5 × 4 = 20: the chief is satisfied

**6. The dice come up 3**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the price of guides; the die is the gifts one guide costs"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll a D6 for the price of bearers; the die is the gifts one bearer costs* / Result: [3] 3 gifts each
  - *Roll a D6 for the price of food; the die is the rations one gift buys* / Result: [3] 3 rations a gift
  - **Negotiation** 4 gifts offered: the larger die 5 × 4 = 20, reaching 8 warriors: the chief is satisfied
    - *Roll 2 D6 for the offer of 4 gifts; the larger die × 4 must reach the 8 warriors to satisfy the chief; less insults him* / Result: [3 5] 5 × 4 = 20: the chief is satisfied

**7. The dice come up 3**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the price of askaris; the die is the gifts one askari costs, with a musket"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll a D6 for the price of guides; the die is the gifts one guide costs* / Result: [3] 3 gifts each
  - *Roll a D6 for the price of bearers; the die is the gifts one bearer costs* / Result: [3] 3 gifts each
  - *Roll a D6 for the price of food; the die is the rations one gift buys* / Result: [3] 3 rations a gift
  - **Negotiation** 4 gifts offered: the larger die 5 × 4 = 20, reaching 8 warriors: the chief is satisfied
    - *Roll 2 D6 for the offer of 4 gifts; the larger die × 4 must reach the 8 warriors to satisfy the chief; less insults him* / Result: [3 5] 5 × 4 = 20: the chief is satisfied

**8. The dice come up 3**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The natives"
  - **Trade** the chief permits trade: 3 rations a gift, a bearer 3 gifts, a guide 3 gifts, an askari 3 gifts and a musket
    - *Roll a D6 for the price of askaris; the die is the gifts one askari costs, with a musket* / Result: [3] 3 gifts and a musket each
    - *Roll a D6 for the price of guides; the die is the gifts one guide costs* / Result: [3] 3 gifts each
    - *Roll a D6 for the price of bearers; the die is the gifts one bearer costs* / Result: [3] 3 gifts each
    - *Roll a D6 for the price of food; the die is the rations one gift buys* / Result: [3] 3 rations a gift
  - **Negotiation** 4 gifts offered: the larger die 5 × 4 = 20, reaching 8 warriors: the chief is satisfied
    - *Roll 2 D6 for the offer of 4 gifts; the larger die × 4 must reach the 8 warriors to satisfy the chief; less insults him* / Result: [3 5] 5 × 4 = 20: the chief is satisfied
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Negotiation** [3 5] 4 gifts offered: the larger die 5 × 4 = 20, reaching 8 warriors: the chief is satisfied
- bottom-1: **Trade** [3 3 3 3] the chief permits trade: 3 rations a gift, a bearer 3 gifts, a guide 3 gifts, an askari 3 gifts and a musket

Rail's one line at bottom-1: **Trade** [3 3 3 3] the chief permits trade: 3 rations a gift, a bearer 3 gifts, a guide 3 gifts, an askari 3 gifts and a musket

Trade panel at bottom-1's edge:

- Heading: "(gifts icon) 16 gifts"
- Row (food icon): "3 rations / gift", the count held, [−] to sell, [+] to buy
- Row (bearers icon): "3 gifts", the count held, [−] to sell, [+] to buy
- Row (guides icon): "3 gifts", the count held, [−] to sell, [+] to buy
- Row (askaris icon): "3 gifts + musket", the count held, [−] to sell, [+] to buy
- [Done trading]

**9. The player buys with [+] on the food row**

Lines added to the log (open log wording):

- bottom-1: **Trade** bought 3 rations for 1 gift

Rail's one line at bottom-1: **Trade** bought 3 rations for 1 gift

Trade panel at bottom-1's edge:

- Heading: "(gifts icon) 15 gifts"
- Row (food icon): "3 rations / gift", the count held, [−] to sell, [+] to buy
- Row (bearers icon): "3 gifts", the count held, [−] to sell, [+] to buy
- Row (guides icon): "3 gifts", the count held, [−] to sell, [+] to buy
- Row (askaris icon): "3 gifts + musket", the count held, [−] to sell, [+] to buy
- [Done trading]

**10. The player taps Done trading**

Lines added to the log (open log wording):

- bottom-1: took leave of the chief

Rail's one line at bottom-1: took leave of the chief

### C6. Friendly approach: the offer falls short

Continues C1.

**Before anything is tapped**

Policy panel at bottom-1's edge:

- Heading: "(1) 8 warriors"
- [1] "Defensive stand" / "Stay put on guard: no hunting, research or trade, no leaving until next turn"
- [2] "Retreat" / "Back to the hex you came from; your marker here is removed"
- [3] "Show of force" / "Approach warily, muskets ready"
- [4] "Ignore them" / "Carry on as if they were not there"
- [5] "Friendly approach" / "Open hands and gifts"

**1. The player chooses policy 5, "Friendly approach"**

Dice panel at bottom-1's edge:

- Ask: "Roll 3 D6 for the natives' reaction; a total of 7 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +5 policy 5, friendly approach)"
- Status: "Waiting for a roll of 3 D6"

**2. The dice come up 1, 1, 1**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The natives"
  - **Native reaction** not hostile: 3 on the dice, within the target of 7
    - *Roll 3 D6 for the natives' reaction; a total of 7 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +5 policy 5, friendly approach)* / Result: [1 1 1] 1 + 1 + 1 = 3: not hostile
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Native reaction** needs 7 or less [1 1 1] +2 hexes to the nearest port, +5 policy 5, friendly approach not hostile: 3 on the dice, within the target of 7

Rail's one line at bottom-1: **Native reaction** needs 7 or less [1 1 1] +2 +5 not hostile: 3 on the dice, within the target of 7

Negotiation panel at bottom-1's edge:

- Heading: "(1) 8 warriors · (gifts icon) 20"
- Offer row: [−] "0" [+] [×1] and the button "Offer 0 gifts" / "Gifts × the larger of two dice must reach the warriors" (the count follows the offer: "Offer 4 gifts", "Offer 1 gift")
- "Give everything" / "All goods and animals but the men; the chief returns three dice of gifts"
- "Do not negotiate" / "Carry on with the turn"

**3. The player offers 4 gifts**

Dice panel at bottom-1's edge:

- Ask: "Roll 2 D6 for the offer of 4 gifts; the larger die × 4 must reach the 8 warriors to satisfy the chief; less insults him"
- Status: "Waiting for a roll of 2 D6"

**4. The dice come up 1, 1**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 5: more than the 8 warriors and they hide, else they attack"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Negotiation** 4 gifts offered: the larger die 1 × 4 = 4, short of 8 warriors: the chief is insulted
    - *Roll 2 D6 for the offer of 4 gifts; the larger die × 4 must reach the 8 warriors to satisfy the chief; less insults him* / Result: [1 1] 1 × 4 = 4: the chief is insulted

**5. The dice come up 3**

Dice panel at bottom-1's edge:

- Ask: "Roll 2 D6 for surprise; a total of 5 or more, the policy number, and the expedition fires first; less and it is surprised"
- Status: "Waiting for a roll of 2 D6"
- So far (newest first):
  - **Fight** hostile; nerve 3 × 5 askaris ÷ policy 5 = 3, not more than 8 warriors: the natives attack
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 5: more than the 8 warriors and they hide, else they attack* / Result: [3] 3 × 5 ÷ 5 = 3: the natives attack
  - **Negotiation** 4 gifts offered: the larger die 1 × 4 = 4, short of 8 warriors: the chief is insulted
    - *Roll 2 D6 for the offer of 4 gifts; the larger die × 4 must reach the 8 warriors to satisfy the chief; less insults him* / Result: [1 1] 1 × 4 = 4: the chief is insulted

**6. The dice come up 3, 3**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 to drive them off; the volley killed 6: the die × 6 more than the 2 warriors left drives them off, else they close in"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Fight** hostile; nerve 3 × 5 askaris ÷ policy 5 = 3, not more than 8 warriors: the natives attack; surprise 3 + 3 = 6, not under policy 5: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall
    - *Roll 2 D6 for surprise; a total of 5 or more, the policy number, and the expedition fires first; less and it is surprised* / Result: [3 3] 3 + 3 = 6: not surprised
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 5: more than the 8 warriors and they hide, else they attack* / Result: [3] 3 × 5 ÷ 5 = 3: the natives attack
  - **Negotiation** 4 gifts offered: the larger die 1 × 4 = 4, short of 8 warriors: the chief is insulted
    - *Roll 2 D6 for the offer of 4 gifts; the larger die × 4 must reach the 8 warriors to satisfy the chief; less insults him* / Result: [1 1] 1 × 4 = 4: the chief is insulted

**7. The dice come up 1**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for prisoners; 5 askaris less the die are taken prisoner, no more than the 2 warriors left; a 6 takes none, and the village is looted if it is found"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Fight** hostile; nerve 3 × 5 askaris ÷ policy 5 = 3, not more than 8 warriors: the natives attack; surprise 3 + 3 = 6, not under policy 5: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall; morale 1 × 6 killed = 6, more than the 2 warriors left: the natives are driven off
    - *Roll a D6 to drive them off; the volley killed 6: the die × 6 more than the 2 warriors left drives them off, else they close in* / Result: [1] 1 × 6 = 6: the natives are driven off
    - *Roll 2 D6 for surprise; a total of 5 or more, the policy number, and the expedition fires first; less and it is surprised* / Result: [3 3] 3 + 3 = 6: not surprised
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 5: more than the 8 warriors and they hide, else they attack* / Result: [3] 3 × 5 ÷ 5 = 3: the natives attack
  - **Negotiation** 4 gifts offered: the larger die 1 × 4 = 4, short of 8 warriors: the chief is insulted
    - *Roll 2 D6 for the offer of 4 gifts; the larger die × 4 must reach the 8 warriors to satisfy the chief; less insults him* / Result: [1 1] 1 × 4 = 4: the chief is insulted

**8. The dice come up 6**

Dice panel at bottom-1's edge:

- Ask: "Roll 2 D6 to find the village; a total of 5 or less finds it (0 prisoners + policy 5); more and it stays hidden this turn"
- Status: "Waiting for a roll of 2 D6"
- So far (newest first):
  - *Roll a D6 for prisoners; 5 askaris less the die are taken prisoner, no more than the 2 warriors left; a 6 takes none, and the village is looted if it is found* / Result: [6] a 6, no quarter: none taken
  - **Fight** hostile; nerve 3 × 5 askaris ÷ policy 5 = 3, not more than 8 warriors: the natives attack; surprise 3 + 3 = 6, not under policy 5: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall; morale 1 × 6 killed = 6, more than the 2 warriors left: the natives are driven off
    - *Roll a D6 to drive them off; the volley killed 6: the die × 6 more than the 2 warriors left drives them off, else they close in* / Result: [1] 1 × 6 = 6: the natives are driven off
    - *Roll 2 D6 for surprise; a total of 5 or more, the policy number, and the expedition fires first; less and it is surprised* / Result: [3 3] 3 + 3 = 6: not surprised
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 5: more than the 8 warriors and they hide, else they attack* / Result: [3] 3 × 5 ÷ 5 = 3: the natives attack
  - **Negotiation** 4 gifts offered: the larger die 1 × 4 = 4, short of 8 warriors: the chief is insulted
    - *Roll 2 D6 for the offer of 4 gifts; the larger die × 4 must reach the 8 warriors to satisfy the chief; less insults him* / Result: [1 1] 1 × 4 = 4: the chief is insulted

**9. The dice come up 6, 6**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The natives"
  - **Victory** prisoners: a 6, no quarter, none taken; village 6 + 6 = 12, over 0 prisoners + policy 5 = 5: the village cannot be found
    - *Roll 2 D6 to find the village; a total of 5 or less finds it (0 prisoners + policy 5); more and it stays hidden this turn* / Result: [6 6] 6 + 6 = 12: the village cannot be found
    - *Roll a D6 for prisoners; 5 askaris less the die are taken prisoner, no more than the 2 warriors left; a 6 takes none, and the village is looted if it is found* / Result: [6] a 6, no quarter: none taken
  - **Fight** hostile; nerve 3 × 5 askaris ÷ policy 5 = 3, not more than 8 warriors: the natives attack; surprise 3 + 3 = 6, not under policy 5: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall; morale 1 × 6 killed = 6, more than the 2 warriors left: the natives are driven off
    - *Roll a D6 to drive them off; the volley killed 6: the die × 6 more than the 2 warriors left drives them off, else they close in* / Result: [1] 1 × 6 = 6: the natives are driven off
    - *Roll 2 D6 for surprise; a total of 5 or more, the policy number, and the expedition fires first; less and it is surprised* / Result: [3 3] 3 + 3 = 6: not surprised
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 5: more than the 8 warriors and they hide, else they attack* / Result: [3] 3 × 5 ÷ 5 = 3: the natives attack
  - **Negotiation** 4 gifts offered: the larger die 1 × 4 = 4, short of 8 warriors: the chief is insulted
    - *Roll 2 D6 for the offer of 4 gifts; the larger die × 4 must reach the 8 warriors to satisfy the chief; less insults him* / Result: [1 1] 1 × 4 = 4: the chief is insulted
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Negotiation** [1 1] 4 gifts offered: the larger die 1 × 4 = 4, short of 8 warriors: the chief is insulted
- bottom-1: **Fight** [3 3 3 1] hostile; nerve 3 × 5 askaris ÷ policy 5 = 3, not more than 8 warriors: the natives attack; surprise 3 + 3 = 6, not under policy 5: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall; morale 1 × 6 killed = 6, more than the 2 warriors left: the natives are driven off
- bottom-1: **Victory** [6 6 6] prisoners: a 6, no quarter, none taken; village 6 + 6 = 12, over 0 prisoners + policy 5 = 5: the village cannot be found

Rail's one line at bottom-1: **Victory** [6 6 6] prisoners: a 6, no quarter, none taken; village 6 + 6 = 12, over 0 prisoners + policy 5 = 5: the village cannot be found

### C7. Friendly approach: no gifts given

Continues C1.

**Before anything is tapped**

Policy panel at bottom-1's edge:

- Heading: "(1) 8 warriors"
- [1] "Defensive stand" / "Stay put on guard: no hunting, research or trade, no leaving until next turn"
- [2] "Retreat" / "Back to the hex you came from; your marker here is removed"
- [3] "Show of force" / "Approach warily, muskets ready"
- [4] "Ignore them" / "Carry on as if they were not there"
- [5] "Friendly approach" / "Open hands and gifts"

**1. The player chooses policy 5, "Friendly approach"**

Dice panel at bottom-1's edge:

- Ask: "Roll 3 D6 for the natives' reaction; a total of 7 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +5 policy 5, friendly approach)"
- Status: "Waiting for a roll of 3 D6"

**2. The dice come up 1, 1, 1**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The natives"
  - **Native reaction** not hostile: 3 on the dice, within the target of 7
    - *Roll 3 D6 for the natives' reaction; a total of 7 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +5 policy 5, friendly approach)* / Result: [1 1 1] 1 + 1 + 1 = 3: not hostile
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Native reaction** needs 7 or less [1 1 1] +2 hexes to the nearest port, +5 policy 5, friendly approach not hostile: 3 on the dice, within the target of 7

Rail's one line at bottom-1: **Native reaction** needs 7 or less [1 1 1] +2 +5 not hostile: 3 on the dice, within the target of 7

Negotiation panel at bottom-1's edge:

- Heading: "(1) 8 warriors · (gifts icon) 20"
- Offer row: [−] "0" [+] [×1] and the button "Offer 0 gifts" / "Gifts × the larger of two dice must reach the warriors" (the count follows the offer: "Offer 4 gifts", "Offer 1 gift")
- "Give everything" / "All goods and animals but the men; the chief returns three dice of gifts"
- "Do not negotiate" / "Carry on with the turn"

**3. The player chooses "Do not negotiate"**

Lines added to the log (open log wording):

- bottom-1: declined to give gifts

Rail's one line at bottom-1: declined to give gifts

### C8. Retreat

Continues C1.

**Before anything is tapped**

Policy panel at bottom-1's edge:

- Heading: "(1) 8 warriors"
- [1] "Defensive stand" / "Stay put on guard: no hunting, research or trade, no leaving until next turn"
- [2] "Retreat" / "Back to the hex you came from; your marker here is removed"
- [3] "Show of force" / "Approach warily, muskets ready"
- [4] "Ignore them" / "Carry on as if they were not there"
- [5] "Friendly approach" / "Open hands and gifts"

**1. The player chooses policy 2, "Retreat"**

Lines added to the log (open log wording):

- bottom-1: policy 2: the expedition retreats

Rail's one line at bottom-1: policy 2: the expedition retreats

### C9. Defensive stand

Continues C1.

**Before anything is tapped**

Policy panel at bottom-1's edge:

- Heading: "(1) 8 warriors"
- [1] "Defensive stand" / "Stay put on guard: no hunting, research or trade, no leaving until next turn"
- [2] "Retreat" / "Back to the hex you came from; your marker here is removed"
- [3] "Show of force" / "Approach warily, muskets ready"
- [4] "Ignore them" / "Carry on as if they were not there"
- [5] "Friendly approach" / "Open hands and gifts"

**1. The player chooses policy 1, "Defensive stand"**

Dice panel at bottom-1's edge:

- Ask: "Roll 3 D6 for the natives' reaction; a total of 3 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +1 policy 1, defensive stand)"
- Status: "Waiting for a roll of 3 D6"

**2. The dice come up 1, 1, 1**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The natives"
  - **Native reaction** not hostile: 3 on the dice, within the target of 3
    - *Roll 3 D6 for the natives' reaction; a total of 3 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +1 policy 1, defensive stand)* / Result: [1 1 1] 1 + 1 + 1 = 3: not hostile
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Native reaction** needs 3 or less [1 1 1] +2 hexes to the nearest port, +1 policy 1, defensive stand not hostile: 3 on the dice, within the target of 3

Rail's one line at bottom-1: **Native reaction** needs 3 or less [1 1 1] +2 +1 not hostile: 3 on the dice, within the target of 3

### C10. Ignore them, not hostile; the next turn begins among the natives, and REMAIN meets them again

Continues C1.

**Before anything is tapped**

Policy panel at bottom-1's edge:

- Heading: "(1) 8 warriors"
- [1] "Defensive stand" / "Stay put on guard: no hunting, research or trade, no leaving until next turn"
- [2] "Retreat" / "Back to the hex you came from; your marker here is removed"
- [3] "Show of force" / "Approach warily, muskets ready"
- [4] "Ignore them" / "Carry on as if they were not there"
- [5] "Friendly approach" / "Open hands and gifts"

**1. The player chooses policy 4, "Ignore them"**

Dice panel at bottom-1's edge:

- Ask: "Roll 3 D6 for the natives' reaction; a total of 6 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +4 policy 4, ignore them)"
- Status: "Waiting for a roll of 3 D6"

**2. The dice come up 1, 1, 1**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The natives"
  - **Native reaction** not hostile: 3 on the dice, within the target of 6
    - *Roll 3 D6 for the natives' reaction; a total of 6 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +4 policy 4, ignore them)* / Result: [1 1 1] 1 + 1 + 1 = 3: not hostile
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Native reaction** needs 6 or less [1 1 1] +2 hexes to the nearest port, +4 policy 4, ignore them not hostile: 3 on the dice, within the target of 6

Rail's one line at bottom-1: **Native reaction** needs 6 or less [1 1 1] +2 +4 not hostile: 3 on the dice, within the target of 6

**3. The player taps END TURN**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the hunt; 1 or less bags nothing, 2–3 one ration a hunter, 4–5 two, 6 or more three; 6 hunters"
- Status: "Waiting for a D6 roll"

**4. The dice come up 3**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The hunt"
  - **Hunting** one per hunter: 6 rations bagged, 12 men ate (6 from the stores, 28 left)
    - *Roll a D6 for the hunt; 1 or less bags nothing, 2–3 one ration a hunter, 4–5 two, 6 or more three; 6 hunters* / Result: [3] one per hunter: 6 bagged
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Hunting** needs 2 / 4 / 6 for one, two, three per hunter [3] one per hunter: 6 rations bagged, 12 men ate (6 from the stores, 28 left)

Rail's one line at bottom-1: **Hunting** needs 2 / 4 / 6 [3] one per hunter: 6 rations bagged, 12 men ate (6 from the stores, 28 left)

**5. The other player (top-1) plays a turn in Europe and ends it; it is bottom-1's turn again**

Lines added to the log (open log wording):

- top-1: discarded $200

Rail's one line at top-1: discarded $200

Disaster card panel at bottom-1's edge:

- Heading: "Disaster card"
- Card: "26" · "Loss (1 Bearer)" · "LAKE"
- Text: "A BEARER goes fishing by the LAKE and is not seen again."
- Button: [Apply it] when the card applies to where the expedition is, else [No effect here: discard it]

**6. The player taps the card's button**

Lines added to the log (open log wording):

- bottom-1: **Disaster card** (card 26: no effect) no effect here: a card for lake

Rail's one line at bottom-1: **Disaster card** (card 26: no effect) no effect here: a card for lake

Move prompt at bottom-1's edge: "Natives here. Pick a hex to move into, or" [REMAIN]

**7. The player taps REMAIN**

Policy panel at bottom-1's edge:

- Heading: "(1) 8 warriors"
- [1] "Defensive stand" / "Stay put on guard: no hunting, research or trade, no leaving until next turn"
- [2] "Retreat" / "Back to the hex you came from; your marker here is removed"
- [3] "Show of force" / "Approach warily, muskets ready"
- [4] "Ignore them" / "Carry on as if they were not there"
- [5] "Friendly approach" / "Open hands and gifts"

### C11. Show of force, hostile: the volley does not drive them off, and the fight goes hand to hand

A tribe of 12 warriors, found as in C1 with other dice for the warriors.

**Before anything is tapped**

Policy panel at bottom-1's edge:

- Heading: "(1) 12 warriors"
- [1] "Defensive stand" / "Stay put on guard: no hunting, research or trade, no leaving until next turn"
- [2] "Retreat" / "Back to the hex you came from; your marker here is removed"
- [3] "Show of force" / "Approach warily, muskets ready"
- [4] "Ignore them" / "Carry on as if they were not there"
- [5] "Friendly approach" / "Open hands and gifts"

**1. The player chooses policy 3, "Show of force"**

Dice panel at bottom-1's edge:

- Ask: "Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)"
- Status: "Waiting for a roll of 3 D6"

**2. The dice come up 6, 6, 6**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 12 warriors and they hide, else they attack"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**3. The dice come up 1**

Dice panel at bottom-1's edge:

- Ask: "Roll 2 D6 for surprise; a total of 3 or more, the policy number, and the expedition fires first; less and it is surprised"
- Status: "Waiting for a roll of 2 D6"
- So far (newest first):
  - **Fight** hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 12 warriors: the natives attack
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 12 warriors and they hide, else they attack* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**4. The dice come up 6, 6**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 to drive them off; the volley killed 6: the die × 6 more than the 6 warriors left drives them off, else they close in"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Fight** hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 12 warriors: the natives attack; surprise 6 + 6 = 12, not under policy 3: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall
    - *Roll 2 D6 for surprise; a total of 3 or more, the policy number, and the expedition fires first; less and it is surprised* / Result: [6 6] 6 + 6 = 12: not surprised
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 12 warriors and they hide, else they attack* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**5. The dice come up 1**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the natives' strike; 6 warriors ÷ the die, rounded down, is the askaris who fall, of 5"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Fight** hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 12 warriors: the natives attack; surprise 6 + 6 = 12, not under policy 3: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall; morale 1 × 6 killed = 6, not more than the 6 warriors left: they close in
    - *Roll a D6 to drive them off; the volley killed 6: the die × 6 more than the 6 warriors left drives them off, else they close in* / Result: [1] 1 × 6 = 6: they close in
    - *Roll 2 D6 for surprise; a total of 3 or more, the policy number, and the expedition fires first; less and it is surprised* / Result: [6 6] 6 + 6 = 12: not surprised
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 12 warriors and they hide, else they attack* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**6. The dice come up 6**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 to see if the askaris break; the die × 1 fallen more than the 5 askaris who began and they break and run, a defeat; else they hold"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Fight** hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 12 warriors: the natives attack; surprise 6 + 6 = 12, not under policy 3: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall; morale 1 × 6 killed = 6, not more than the 6 warriors left: they close in; the natives strike: 6 warriors ÷ 6 = 1 askari falls
    - *Roll a D6 for the natives' strike; 6 warriors ÷ the die, rounded down, is the askaris who fall, of 5* / Result: [6] 6 ÷ 6 = 1: 1 askari falls
    - *Roll a D6 to drive them off; the volley killed 6: the die × 6 more than the 6 warriors left drives them off, else they close in* / Result: [1] 1 × 6 = 6: they close in
    - *Roll 2 D6 for surprise; a total of 3 or more, the policy number, and the expedition fires first; less and it is surprised* / Result: [6 6] 6 + 6 = 12: not surprised
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 12 warriors and they hide, else they attack* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**7. The dice come up 1**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the askaris' strike; 4 askaris ÷ the die, rounded down, plus 1 is the warriors who fall, of 6"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Fight** hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 12 warriors: the natives attack; surprise 6 + 6 = 12, not under policy 3: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall; morale 1 × 6 killed = 6, not more than the 6 warriors left: they close in; the natives strike: 6 warriors ÷ 6 = 1 askari falls; the askaris' nerve 1 × 1 fallen = 1, not over the 5 that stood: the askaris hold
    - *Roll a D6 to see if the askaris break; the die × 1 fallen more than the 5 askaris who began and they break and run, a defeat; else they hold* / Result: [1] 1 × 1 = 1: the askaris hold
    - *Roll a D6 for the natives' strike; 6 warriors ÷ the die, rounded down, is the askaris who fall, of 5* / Result: [6] 6 ÷ 6 = 1: 1 askari falls
    - *Roll a D6 to drive them off; the volley killed 6: the die × 6 more than the 6 warriors left drives them off, else they close in* / Result: [1] 1 × 6 = 6: they close in
    - *Roll 2 D6 for surprise; a total of 3 or more, the policy number, and the expedition fires first; less and it is surprised* / Result: [6 6] 6 + 6 = 12: not surprised
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 12 warriors and they hide, else they attack* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**8. The dice come up 2**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 to see if the natives break; the die × 3 fallen more than the 3 warriors left drives them off, a victory; else they strike again"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Fight** hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 12 warriors: the natives attack; surprise 6 + 6 = 12, not under policy 3: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall; morale 1 × 6 killed = 6, not more than the 6 warriors left: they close in; the natives strike: 6 warriors ÷ 6 = 1 askari falls; the askaris' nerve 1 × 1 fallen = 1, not over the 5 that stood: the askaris hold; the askaris strike: 4 askaris ÷ 2 + 1 = 3 warriors fall
    - *Roll a D6 for the askaris' strike; 4 askaris ÷ the die, rounded down, plus 1 is the warriors who fall, of 6* / Result: [2] 4 ÷ 2 + 1 = 3: 3 warriors fall
    - *Roll a D6 to see if the askaris break; the die × 1 fallen more than the 5 askaris who began and they break and run, a defeat; else they hold* / Result: [1] 1 × 1 = 1: the askaris hold
    - *Roll a D6 for the natives' strike; 6 warriors ÷ the die, rounded down, is the askaris who fall, of 5* / Result: [6] 6 ÷ 6 = 1: 1 askari falls
    - *Roll a D6 to drive them off; the volley killed 6: the die × 6 more than the 6 warriors left drives them off, else they close in* / Result: [1] 1 × 6 = 6: they close in
    - *Roll 2 D6 for surprise; a total of 3 or more, the policy number, and the expedition fires first; less and it is surprised* / Result: [6 6] 6 + 6 = 12: not surprised
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 12 warriors and they hide, else they attack* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**9. The dice come up 1**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the natives' strike; 3 warriors ÷ the die, rounded down, is the askaris who fall, of 4"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Fight** hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 12 warriors: the natives attack; surprise 6 + 6 = 12, not under policy 3: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall; morale 1 × 6 killed = 6, not more than the 6 warriors left: they close in; the natives strike: 6 warriors ÷ 6 = 1 askari falls; the askaris' nerve 1 × 1 fallen = 1, not over the 5 that stood: the askaris hold; the askaris strike: 4 askaris ÷ 2 + 1 = 3 warriors fall; morale 1 × 3 fallen = 3, not more than the 3 warriors left: they fight on
    - *Roll a D6 to see if the natives break; the die × 3 fallen more than the 3 warriors left drives them off, a victory; else they strike again* / Result: [1] 1 × 3 = 3: they fight on
    - *Roll a D6 for the askaris' strike; 4 askaris ÷ the die, rounded down, plus 1 is the warriors who fall, of 6* / Result: [2] 4 ÷ 2 + 1 = 3: 3 warriors fall
    - *Roll a D6 to see if the askaris break; the die × 1 fallen more than the 5 askaris who began and they break and run, a defeat; else they hold* / Result: [1] 1 × 1 = 1: the askaris hold
    - *Roll a D6 for the natives' strike; 6 warriors ÷ the die, rounded down, is the askaris who fall, of 5* / Result: [6] 6 ÷ 6 = 1: 1 askari falls
    - *Roll a D6 to drive them off; the volley killed 6: the die × 6 more than the 6 warriors left drives them off, else they close in* / Result: [1] 1 × 6 = 6: they close in
    - *Roll 2 D6 for surprise; a total of 3 or more, the policy number, and the expedition fires first; less and it is surprised* / Result: [6 6] 6 + 6 = 12: not surprised
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 12 warriors and they hide, else they attack* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**10. The dice come up 3**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 to see if the askaris break; the die × 1 fallen more than the 5 askaris who began and they break and run, a defeat; else they hold"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Fight** hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 12 warriors: the natives attack; surprise 6 + 6 = 12, not under policy 3: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall; morale 1 × 6 killed = 6, not more than the 6 warriors left: they close in; the natives strike: 6 warriors ÷ 6 = 1 askari falls; the askaris' nerve 1 × 1 fallen = 1, not over the 5 that stood: the askaris hold; the askaris strike: 4 askaris ÷ 2 + 1 = 3 warriors fall; morale 1 × 3 fallen = 3, not more than the 3 warriors left: they fight on; the natives strike: 3 warriors ÷ 3 = 1 askari falls
    - *Roll a D6 for the natives' strike; 3 warriors ÷ the die, rounded down, is the askaris who fall, of 4* / Result: [3] 3 ÷ 3 = 1: 1 askari falls
    - *Roll a D6 to see if the natives break; the die × 3 fallen more than the 3 warriors left drives them off, a victory; else they strike again* / Result: [1] 1 × 3 = 3: they fight on
    - *Roll a D6 for the askaris' strike; 4 askaris ÷ the die, rounded down, plus 1 is the warriors who fall, of 6* / Result: [2] 4 ÷ 2 + 1 = 3: 3 warriors fall
    - *Roll a D6 to see if the askaris break; the die × 1 fallen more than the 5 askaris who began and they break and run, a defeat; else they hold* / Result: [1] 1 × 1 = 1: the askaris hold
    - *Roll a D6 for the natives' strike; 6 warriors ÷ the die, rounded down, is the askaris who fall, of 5* / Result: [6] 6 ÷ 6 = 1: 1 askari falls
    - *Roll a D6 to drive them off; the volley killed 6: the die × 6 more than the 6 warriors left drives them off, else they close in* / Result: [1] 1 × 6 = 6: they close in
    - *Roll 2 D6 for surprise; a total of 3 or more, the policy number, and the expedition fires first; less and it is surprised* / Result: [6 6] 6 + 6 = 12: not surprised
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 12 warriors and they hide, else they attack* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**11. The dice come up 1**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the askaris' strike; 3 askaris ÷ the die, rounded down, plus 1 is the warriors who fall, of 3"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Fight** hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 12 warriors: the natives attack; surprise 6 + 6 = 12, not under policy 3: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall; morale 1 × 6 killed = 6, not more than the 6 warriors left: they close in; the natives strike: 6 warriors ÷ 6 = 1 askari falls; the askaris' nerve 1 × 1 fallen = 1, not over the 5 that stood: the askaris hold; the askaris strike: 4 askaris ÷ 2 + 1 = 3 warriors fall; morale 1 × 3 fallen = 3, not more than the 3 warriors left: they fight on; the natives strike: 3 warriors ÷ 3 = 1 askari falls; the askaris' nerve 1 × 1 fallen = 1, not over the 5 that stood: the askaris hold
    - *Roll a D6 to see if the askaris break; the die × 1 fallen more than the 5 askaris who began and they break and run, a defeat; else they hold* / Result: [1] 1 × 1 = 1: the askaris hold
    - *Roll a D6 for the natives' strike; 3 warriors ÷ the die, rounded down, is the askaris who fall, of 4* / Result: [3] 3 ÷ 3 = 1: 1 askari falls
    - *Roll a D6 to see if the natives break; the die × 3 fallen more than the 3 warriors left drives them off, a victory; else they strike again* / Result: [1] 1 × 3 = 3: they fight on
    - *Roll a D6 for the askaris' strike; 4 askaris ÷ the die, rounded down, plus 1 is the warriors who fall, of 6* / Result: [2] 4 ÷ 2 + 1 = 3: 3 warriors fall
    - *Roll a D6 to see if the askaris break; the die × 1 fallen more than the 5 askaris who began and they break and run, a defeat; else they hold* / Result: [1] 1 × 1 = 1: the askaris hold
    - *Roll a D6 for the natives' strike; 6 warriors ÷ the die, rounded down, is the askaris who fall, of 5* / Result: [6] 6 ÷ 6 = 1: 1 askari falls
    - *Roll a D6 to drive them off; the volley killed 6: the die × 6 more than the 6 warriors left drives them off, else they close in* / Result: [1] 1 × 6 = 6: they close in
    - *Roll 2 D6 for surprise; a total of 3 or more, the policy number, and the expedition fires first; less and it is surprised* / Result: [6 6] 6 + 6 = 12: not surprised
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 12 warriors and they hide, else they attack* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**12. The dice come up 1**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for prisoners; every warrior fell, so none can be taken whatever the die; the village is looted if it is found"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Fight** hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 12 warriors: the natives attack; surprise 6 + 6 = 12, not under policy 3: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall; morale 1 × 6 killed = 6, not more than the 6 warriors left: they close in; the natives strike: 6 warriors ÷ 6 = 1 askari falls; the askaris' nerve 1 × 1 fallen = 1, not over the 5 that stood: the askaris hold; the askaris strike: 4 askaris ÷ 2 + 1 = 3 warriors fall; morale 1 × 3 fallen = 3, not more than the 3 warriors left: they fight on; the natives strike: 3 warriors ÷ 3 = 1 askari falls; the askaris' nerve 1 × 1 fallen = 1, not over the 5 that stood: the askaris hold; the askaris strike: 3 askaris ÷ 1 + 1 = 4, all 3 warriors fall; the natives are destroyed
    - *Roll a D6 for the askaris' strike; 3 askaris ÷ the die, rounded down, plus 1 is the warriors who fall, of 3* / Result: [1] 3 ÷ 1 + 1 = 4: all 3 warriors fall
    - *Roll a D6 to see if the askaris break; the die × 1 fallen more than the 5 askaris who began and they break and run, a defeat; else they hold* / Result: [1] 1 × 1 = 1: the askaris hold
    - *Roll a D6 for the natives' strike; 3 warriors ÷ the die, rounded down, is the askaris who fall, of 4* / Result: [3] 3 ÷ 3 = 1: 1 askari falls
    - *Roll a D6 to see if the natives break; the die × 3 fallen more than the 3 warriors left drives them off, a victory; else they strike again* / Result: [1] 1 × 3 = 3: they fight on
    - *Roll a D6 for the askaris' strike; 4 askaris ÷ the die, rounded down, plus 1 is the warriors who fall, of 6* / Result: [2] 4 ÷ 2 + 1 = 3: 3 warriors fall
    - *Roll a D6 to see if the askaris break; the die × 1 fallen more than the 5 askaris who began and they break and run, a defeat; else they hold* / Result: [1] 1 × 1 = 1: the askaris hold
    - *Roll a D6 for the natives' strike; 6 warriors ÷ the die, rounded down, is the askaris who fall, of 5* / Result: [6] 6 ÷ 6 = 1: 1 askari falls
    - *Roll a D6 to drive them off; the volley killed 6: the die × 6 more than the 6 warriors left drives them off, else they close in* / Result: [1] 1 × 6 = 6: they close in
    - *Roll 2 D6 for surprise; a total of 3 or more, the policy number, and the expedition fires first; less and it is surprised* / Result: [6 6] 6 + 6 = 12: not surprised
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 12 warriors and they hide, else they attack* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**13. The dice come up 6**

Dice panel at bottom-1's edge:

- Ask: "Roll 2 D6 to find the village; a total of 3 or less finds it (0 prisoners + policy 3); more and it stays hidden this turn"
- Status: "Waiting for a roll of 2 D6"
- So far (newest first):
  - *Roll a D6 for prisoners; every warrior fell, so none can be taken whatever the die; the village is looted if it is found* / Result: [6] none left to take
  - **Fight** hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 12 warriors: the natives attack; surprise 6 + 6 = 12, not under policy 3: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall; morale 1 × 6 killed = 6, not more than the 6 warriors left: they close in; the natives strike: 6 warriors ÷ 6 = 1 askari falls; the askaris' nerve 1 × 1 fallen = 1, not over the 5 that stood: the askaris hold; the askaris strike: 4 askaris ÷ 2 + 1 = 3 warriors fall; morale 1 × 3 fallen = 3, not more than the 3 warriors left: they fight on; the natives strike: 3 warriors ÷ 3 = 1 askari falls; the askaris' nerve 1 × 1 fallen = 1, not over the 5 that stood: the askaris hold; the askaris strike: 3 askaris ÷ 1 + 1 = 4, all 3 warriors fall; the natives are destroyed
    - *Roll a D6 for the askaris' strike; 3 askaris ÷ the die, rounded down, plus 1 is the warriors who fall, of 3* / Result: [1] 3 ÷ 1 + 1 = 4: all 3 warriors fall
    - *Roll a D6 to see if the askaris break; the die × 1 fallen more than the 5 askaris who began and they break and run, a defeat; else they hold* / Result: [1] 1 × 1 = 1: the askaris hold
    - *Roll a D6 for the natives' strike; 3 warriors ÷ the die, rounded down, is the askaris who fall, of 4* / Result: [3] 3 ÷ 3 = 1: 1 askari falls
    - *Roll a D6 to see if the natives break; the die × 3 fallen more than the 3 warriors left drives them off, a victory; else they strike again* / Result: [1] 1 × 3 = 3: they fight on
    - *Roll a D6 for the askaris' strike; 4 askaris ÷ the die, rounded down, plus 1 is the warriors who fall, of 6* / Result: [2] 4 ÷ 2 + 1 = 3: 3 warriors fall
    - *Roll a D6 to see if the askaris break; the die × 1 fallen more than the 5 askaris who began and they break and run, a defeat; else they hold* / Result: [1] 1 × 1 = 1: the askaris hold
    - *Roll a D6 for the natives' strike; 6 warriors ÷ the die, rounded down, is the askaris who fall, of 5* / Result: [6] 6 ÷ 6 = 1: 1 askari falls
    - *Roll a D6 to drive them off; the volley killed 6: the die × 6 more than the 6 warriors left drives them off, else they close in* / Result: [1] 1 × 6 = 6: they close in
    - *Roll 2 D6 for surprise; a total of 3 or more, the policy number, and the expedition fires first; less and it is surprised* / Result: [6 6] 6 + 6 = 12: not surprised
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 12 warriors and they hide, else they attack* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**14. The dice come up 6, 6**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The natives"
  - **Victory** prisoners: none, every warrior fell; village 6 + 6 = 12, over 0 prisoners + policy 3 = 3: the village cannot be found
    - *Roll 2 D6 to find the village; a total of 3 or less finds it (0 prisoners + policy 3); more and it stays hidden this turn* / Result: [6 6] 6 + 6 = 12: the village cannot be found
    - *Roll a D6 for prisoners; every warrior fell, so none can be taken whatever the die; the village is looted if it is found* / Result: [6] none left to take
  - **Fight** hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 12 warriors: the natives attack; surprise 6 + 6 = 12, not under policy 3: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall; morale 1 × 6 killed = 6, not more than the 6 warriors left: they close in; the natives strike: 6 warriors ÷ 6 = 1 askari falls; the askaris' nerve 1 × 1 fallen = 1, not over the 5 that stood: the askaris hold; the askaris strike: 4 askaris ÷ 2 + 1 = 3 warriors fall; morale 1 × 3 fallen = 3, not more than the 3 warriors left: they fight on; the natives strike: 3 warriors ÷ 3 = 1 askari falls; the askaris' nerve 1 × 1 fallen = 1, not over the 5 that stood: the askaris hold; the askaris strike: 3 askaris ÷ 1 + 1 = 4, all 3 warriors fall; the natives are destroyed
    - *Roll a D6 for the askaris' strike; 3 askaris ÷ the die, rounded down, plus 1 is the warriors who fall, of 3* / Result: [1] 3 ÷ 1 + 1 = 4: all 3 warriors fall
    - *Roll a D6 to see if the askaris break; the die × 1 fallen more than the 5 askaris who began and they break and run, a defeat; else they hold* / Result: [1] 1 × 1 = 1: the askaris hold
    - *Roll a D6 for the natives' strike; 3 warriors ÷ the die, rounded down, is the askaris who fall, of 4* / Result: [3] 3 ÷ 3 = 1: 1 askari falls
    - *Roll a D6 to see if the natives break; the die × 3 fallen more than the 3 warriors left drives them off, a victory; else they strike again* / Result: [1] 1 × 3 = 3: they fight on
    - *Roll a D6 for the askaris' strike; 4 askaris ÷ the die, rounded down, plus 1 is the warriors who fall, of 6* / Result: [2] 4 ÷ 2 + 1 = 3: 3 warriors fall
    - *Roll a D6 to see if the askaris break; the die × 1 fallen more than the 5 askaris who began and they break and run, a defeat; else they hold* / Result: [1] 1 × 1 = 1: the askaris hold
    - *Roll a D6 for the natives' strike; 6 warriors ÷ the die, rounded down, is the askaris who fall, of 5* / Result: [6] 6 ÷ 6 = 1: 1 askari falls
    - *Roll a D6 to drive them off; the volley killed 6: the die × 6 more than the 6 warriors left drives them off, else they close in* / Result: [1] 1 × 6 = 6: they close in
    - *Roll 2 D6 for surprise; a total of 3 or more, the policy number, and the expedition fires first; less and it is surprised* / Result: [6 6] 6 + 6 = 12: not surprised
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 12 warriors and they hide, else they attack* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Native reaction** needs 5 or less [6 6 6] +2 hexes to the nearest port, +3 policy 3, show of force hostile: 18 on the dice, over the target of 5
- bottom-1: **Fight** [1 6 6 1 6 1] (+5 more dice not drawn) hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 12 warriors: the natives attack; surprise 6 + 6 = 12, not under policy 3: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall; morale 1 × 6 killed = 6, not more than the 6 warriors left: they close in; the natives strike: 6 warriors ÷ 6 = 1 askari falls; the askaris' nerve 1 × 1 fallen = 1, not over the 5 that stood: the askaris hold; the askaris strike: 4 askaris ÷ 2 + 1 = 3 warriors fall; morale 1 × 3 fallen = 3, not more than the 3 warriors left: they fight on; the natives strike: 3 warriors ÷ 3 = 1 askari falls; the askaris' nerve 1 × 1 fallen = 1, not over the 5 that stood: the askaris hold; the askaris strike: 3 askaris ÷ 1 + 1 = 4, all 3 warriors fall; the natives are destroyed
- bottom-1: **Victory** [6 6 6] prisoners: none, every warrior fell; village 6 + 6 = 12, over 0 prisoners + policy 3 = 3: the village cannot be found

Rail's one line at bottom-1: **Victory** [6 6 6] prisoners: none, every warrior fell; village 6 + 6 = 12, over 0 prisoners + policy 3 = 3: the village cannot be found

### C12. Defeated, the explorer escapes with two survival rolls

Continues C1; the fight as in C4.

**Before anything is tapped**

Policy panel at bottom-1's edge:

- Heading: "(1) 8 warriors"
- [1] "Defensive stand" / "Stay put on guard: no hunting, research or trade, no leaving until next turn"
- [2] "Retreat" / "Back to the hex you came from; your marker here is removed"
- [3] "Show of force" / "Approach warily, muskets ready"
- [4] "Ignore them" / "Carry on as if they were not there"
- [5] "Friendly approach" / "Open hands and gifts"

**1. The player chooses policy 3, "Show of force"**

Dice panel at bottom-1's edge:

- Ask: "Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)"
- Status: "Waiting for a roll of 3 D6"

**2. The dice come up 6, 6, 6**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide, else they attack"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**3. The dice come up 1**

Dice panel at bottom-1's edge:

- Ask: "Roll 2 D6 for surprise; a total of 3 or more, the policy number, and the expedition fires first; less and it is surprised"
- Status: "Waiting for a roll of 2 D6"
- So far (newest first):
  - **Fight** hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 8 warriors: the natives attack
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide, else they attack* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**4. The dice come up 1, 1**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the natives' strike; 8 warriors ÷ the die, rounded down, is the askaris who fall, of 5"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Fight** hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 8 warriors: the natives attack; surprise 1 + 1 = 2, under policy 3: the expedition is surprised
    - *Roll 2 D6 for surprise; a total of 3 or more, the policy number, and the expedition fires first; less and it is surprised* / Result: [1 1] 1 + 1 = 2: surprised
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide, else they attack* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**5. The dice come up 1**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 on the consequences of defeat; 1 killed, 2 held prisoner, 3 escapes with nothing, 4 with a musket and 9 rations, 5 that and one survival roll, 6 that and two"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll a D6 for the natives' strike; 8 warriors ÷ the die, rounded down, is the askaris who fall, of 5* / Result: [1] 8 ÷ 1 = 8: all 5 askaris fall
  - *Roll 2 D6 for surprise; a total of 3 or more, the policy number, and the expedition fires first; less and it is surprised* / Result: [1 1] 1 + 1 = 2: surprised
  - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide, else they attack* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**6. The dice come up 6**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 on the survival table; 1 guide, 2 bearer, 3 askari, 4 camel, 5 horse, 6 canoe: one comes away with the explorer; a kind the expedition had none of is rolled again"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll a D6 on the consequences of defeat; 1 killed, 2 held prisoner, 3 escapes with nothing, 4 with a musket and 9 rations, 5 that and one survival roll, 6 that and two* / Result: [6] escapes, with two survival rolls
  - *Roll a D6 for the natives' strike; 8 warriors ÷ the die, rounded down, is the askaris who fall, of 5* / Result: [1] 8 ÷ 1 = 8: all 5 askaris fall
  - *Roll 2 D6 for surprise; a total of 3 or more, the policy number, and the expedition fires first; less and it is surprised* / Result: [1 1] 1 + 1 = 2: surprised
  - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide, else they attack* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**7. The dice come up 2**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for what the bearer carries; 1–3 ten rations, 4–5 ten gifts, 6 ten muskets"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll a D6 on the survival table; 1 guide, 2 bearer, 3 askari, 4 camel, 5 horse, 6 canoe: one comes away with the explorer; a kind the expedition had none of is rolled again* / Result: [2] a bearer
  - *Roll a D6 on the consequences of defeat; 1 killed, 2 held prisoner, 3 escapes with nothing, 4 with a musket and 9 rations, 5 that and one survival roll, 6 that and two* / Result: [6] escapes, with two survival rolls
  - *Roll a D6 for the natives' strike; 8 warriors ÷ the die, rounded down, is the askaris who fall, of 5* / Result: [1] 8 ÷ 1 = 8: all 5 askaris fall
  - *Roll 2 D6 for surprise; a total of 3 or more, the policy number, and the expedition fires first; less and it is surprised* / Result: [1 1] 1 + 1 = 2: surprised
  - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide, else they attack* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**8. The dice come up 1**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 on the survival table; 1 guide, 2 bearer, 3 askari, 4 camel, 5 horse, 6 canoe: one comes away with the explorer; a kind the expedition had none of is rolled again"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll a D6 for what the bearer carries; 1–3 ten rations, 4–5 ten gifts, 6 ten muskets* / Result: [1] 10 rations
  - *Roll a D6 on the survival table; 1 guide, 2 bearer, 3 askari, 4 camel, 5 horse, 6 canoe: one comes away with the explorer; a kind the expedition had none of is rolled again* / Result: [2] a bearer
  - *Roll a D6 on the consequences of defeat; 1 killed, 2 held prisoner, 3 escapes with nothing, 4 with a musket and 9 rations, 5 that and one survival roll, 6 that and two* / Result: [6] escapes, with two survival rolls
  - *Roll a D6 for the natives' strike; 8 warriors ÷ the die, rounded down, is the askaris who fall, of 5* / Result: [1] 8 ÷ 1 = 8: all 5 askaris fall
  - *Roll 2 D6 for surprise; a total of 3 or more, the policy number, and the expedition fires first; less and it is surprised* / Result: [1 1] 1 + 1 = 2: surprised
  - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide, else they attack* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**9. The dice come up 4**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 on the survival table; 1 guide, 2 bearer, 3 askari, 4 camel, 5 horse, 6 canoe: one comes away with the explorer; a kind the expedition had none of is rolled again"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll a D6 on the survival table; 1 guide, 2 bearer, 3 askari, 4 camel, 5 horse, 6 canoe: one comes away with the explorer; a kind the expedition had none of is rolled again* / Result: [4] camels: the expedition had none, rolled again
  - *Roll a D6 for what the bearer carries; 1–3 ten rations, 4–5 ten gifts, 6 ten muskets* / Result: [1] 10 rations
  - *Roll a D6 on the survival table; 1 guide, 2 bearer, 3 askari, 4 camel, 5 horse, 6 canoe: one comes away with the explorer; a kind the expedition had none of is rolled again* / Result: [2] a bearer
  - *Roll a D6 on the consequences of defeat; 1 killed, 2 held prisoner, 3 escapes with nothing, 4 with a musket and 9 rations, 5 that and one survival roll, 6 that and two* / Result: [6] escapes, with two survival rolls
  - *Roll a D6 for the natives' strike; 8 warriors ÷ the die, rounded down, is the askaris who fall, of 5* / Result: [1] 8 ÷ 1 = 8: all 5 askaris fall
  - *Roll 2 D6 for surprise; a total of 3 or more, the policy number, and the expedition fires first; less and it is surprised* / Result: [1 1] 1 + 1 = 2: surprised
  - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide, else they attack* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**10. The dice come up 2**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for what the bearer carries; 1–3 ten rations, 4–5 ten gifts, 6 ten muskets"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll a D6 on the survival table; 1 guide, 2 bearer, 3 askari, 4 camel, 5 horse, 6 canoe: one comes away with the explorer; a kind the expedition had none of is rolled again* / Result: [2] a bearer
  - *Roll a D6 on the survival table; 1 guide, 2 bearer, 3 askari, 4 camel, 5 horse, 6 canoe: one comes away with the explorer; a kind the expedition had none of is rolled again* / Result: [4] camels: the expedition had none, rolled again
  - *Roll a D6 for what the bearer carries; 1–3 ten rations, 4–5 ten gifts, 6 ten muskets* / Result: [1] 10 rations
  - *Roll a D6 on the survival table; 1 guide, 2 bearer, 3 askari, 4 camel, 5 horse, 6 canoe: one comes away with the explorer; a kind the expedition had none of is rolled again* / Result: [2] a bearer
  - *Roll a D6 on the consequences of defeat; 1 killed, 2 held prisoner, 3 escapes with nothing, 4 with a musket and 9 rations, 5 that and one survival roll, 6 that and two* / Result: [6] escapes, with two survival rolls
  - *Roll a D6 for the natives' strike; 8 warriors ÷ the die, rounded down, is the askaris who fall, of 5* / Result: [1] 8 ÷ 1 = 8: all 5 askaris fall
  - *Roll 2 D6 for surprise; a total of 3 or more, the policy number, and the expedition fires first; less and it is surprised* / Result: [1 1] 1 + 1 = 2: surprised
  - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide, else they attack* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**11. The dice come up 5**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The natives"
  - **Defeat** defeat 6: the explorer escapes alone, the expedition lost, with a musket and 9 rations, a bearer (survival 2) with 10 rations (load 1), a bearer (survival 2) with 10 gifts (load 5)
    - *Roll a D6 for what the bearer carries; 1–3 ten rations, 4–5 ten gifts, 6 ten muskets* / Result: [5] 10 gifts
    - *Roll a D6 on the survival table; 1 guide, 2 bearer, 3 askari, 4 camel, 5 horse, 6 canoe: one comes away with the explorer; a kind the expedition had none of is rolled again* / Result: [2] a bearer
    - *Roll a D6 on the survival table; 1 guide, 2 bearer, 3 askari, 4 camel, 5 horse, 6 canoe: one comes away with the explorer; a kind the expedition had none of is rolled again* / Result: [4] camels: the expedition had none, rolled again
    - *Roll a D6 for what the bearer carries; 1–3 ten rations, 4–5 ten gifts, 6 ten muskets* / Result: [1] 10 rations
    - *Roll a D6 on the survival table; 1 guide, 2 bearer, 3 askari, 4 camel, 5 horse, 6 canoe: one comes away with the explorer; a kind the expedition had none of is rolled again* / Result: [2] a bearer
    - *Roll a D6 on the consequences of defeat; 1 killed, 2 held prisoner, 3 escapes with nothing, 4 with a musket and 9 rations, 5 that and one survival roll, 6 that and two* / Result: [6] escapes, with two survival rolls
  - **Fight** hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 8 warriors: the natives attack; surprise 1 + 1 = 2, under policy 3: the expedition is surprised; the natives strike: 8 warriors ÷ 1 = 8, all 5 askaris fall; every askari is dead: defeat
    - *Roll a D6 for the natives' strike; 8 warriors ÷ the die, rounded down, is the askaris who fall, of 5* / Result: [1] 8 ÷ 1 = 8: all 5 askaris fall
    - *Roll 2 D6 for surprise; a total of 3 or more, the policy number, and the expedition fires first; less and it is surprised* / Result: [1 1] 1 + 1 = 2: surprised
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide, else they attack* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; a total of 5 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +3 policy 3, show of force)* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Native reaction** needs 5 or less [6 6 6] +2 hexes to the nearest port, +3 policy 3, show of force hostile: 18 on the dice, over the target of 5
- bottom-1: **Fight** [1 1 1 1] hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 8 warriors: the natives attack; surprise 1 + 1 = 2, under policy 3: the expedition is surprised; the natives strike: 8 warriors ÷ 1 = 8, all 5 askaris fall; every askari is dead: defeat
- bottom-1: **Defeat** [6 2 1 4 2 5] defeat 6: the explorer escapes alone, the expedition lost, with a musket and 9 rations, a bearer (survival 2) with 10 rations (load 1), a bearer (survival 2) with 10 gifts (load 5)

Rail's one line at bottom-1: **Defeat** [6 2 1 4 2 5] defeat 6: the explorer escapes alone, the expedition lost, with a musket and 9 rations, a bearer (survival 2) with 10 rations (load 1), a bearer (survival 2) with 10 gifts (load 5)

### C13. Friendly approach: everything given to the chief

Continues C1.

**Before anything is tapped**

Policy panel at bottom-1's edge:

- Heading: "(1) 8 warriors"
- [1] "Defensive stand" / "Stay put on guard: no hunting, research or trade, no leaving until next turn"
- [2] "Retreat" / "Back to the hex you came from; your marker here is removed"
- [3] "Show of force" / "Approach warily, muskets ready"
- [4] "Ignore them" / "Carry on as if they were not there"
- [5] "Friendly approach" / "Open hands and gifts"

**1. The player chooses policy 5, "Friendly approach"**

Dice panel at bottom-1's edge:

- Ask: "Roll 3 D6 for the natives' reaction; a total of 7 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +5 policy 5, friendly approach)"
- Status: "Waiting for a roll of 3 D6"

**2. The dice come up 1, 1, 1**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The natives"
  - **Native reaction** not hostile: 3 on the dice, within the target of 7
    - *Roll 3 D6 for the natives' reaction; a total of 7 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +5 policy 5, friendly approach)* / Result: [1 1 1] 1 + 1 + 1 = 3: not hostile
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Native reaction** needs 7 or less [1 1 1] +2 hexes to the nearest port, +5 policy 5, friendly approach not hostile: 3 on the dice, within the target of 7

Rail's one line at bottom-1: **Native reaction** needs 7 or less [1 1 1] +2 +5 not hostile: 3 on the dice, within the target of 7

Negotiation panel at bottom-1's edge:

- Heading: "(1) 8 warriors · (gifts icon) 20"
- Offer row: [−] "0" [+] [×1] and the button "Offer 0 gifts" / "Gifts × the larger of two dice must reach the warriors" (the count follows the offer: "Offer 4 gifts", "Offer 1 gift")
- "Give everything" / "All goods and animals but the men; the chief returns three dice of gifts"
- "Do not negotiate" / "Carry on with the turn"

**3. The player chooses "Give everything"**

Dice panel at bottom-1's edge:

- Ask: "Roll 3 D6 for the chief's gifts in return; the total is the gifts the chief gives in return"
- Status: "Waiting for a roll of 3 D6"

**4. The dice come up 2, 3, 4**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the price of food; the die is the rations one gift buys"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Negotiation** everything given: the chief is satisfied and returns 9 gifts
    - *Roll 3 D6 for the chief's gifts in return; the total is the gifts the chief gives in return* / Result: [2 3 4] 2 + 3 + 4 = 9 gifts

**5. The dice come up 3**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the price of bearers; the die is the gifts one bearer costs"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll a D6 for the price of food; the die is the rations one gift buys* / Result: [3] 3 rations a gift
  - **Negotiation** everything given: the chief is satisfied and returns 9 gifts
    - *Roll 3 D6 for the chief's gifts in return; the total is the gifts the chief gives in return* / Result: [2 3 4] 2 + 3 + 4 = 9 gifts

**6. The dice come up 3**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the price of guides; the die is the gifts one guide costs"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll a D6 for the price of bearers; the die is the gifts one bearer costs* / Result: [3] 3 gifts each
  - *Roll a D6 for the price of food; the die is the rations one gift buys* / Result: [3] 3 rations a gift
  - **Negotiation** everything given: the chief is satisfied and returns 9 gifts
    - *Roll 3 D6 for the chief's gifts in return; the total is the gifts the chief gives in return* / Result: [2 3 4] 2 + 3 + 4 = 9 gifts

**7. The dice come up 3**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the price of askaris; the die is the gifts one askari costs, with a musket"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll a D6 for the price of guides; the die is the gifts one guide costs* / Result: [3] 3 gifts each
  - *Roll a D6 for the price of bearers; the die is the gifts one bearer costs* / Result: [3] 3 gifts each
  - *Roll a D6 for the price of food; the die is the rations one gift buys* / Result: [3] 3 rations a gift
  - **Negotiation** everything given: the chief is satisfied and returns 9 gifts
    - *Roll 3 D6 for the chief's gifts in return; the total is the gifts the chief gives in return* / Result: [2 3 4] 2 + 3 + 4 = 9 gifts

**8. The dice come up 3**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The natives"
  - **Trade** the chief permits trade: 3 rations a gift, a bearer 3 gifts, a guide 3 gifts, an askari 3 gifts and a musket
    - *Roll a D6 for the price of askaris; the die is the gifts one askari costs, with a musket* / Result: [3] 3 gifts and a musket each
    - *Roll a D6 for the price of guides; the die is the gifts one guide costs* / Result: [3] 3 gifts each
    - *Roll a D6 for the price of bearers; the die is the gifts one bearer costs* / Result: [3] 3 gifts each
    - *Roll a D6 for the price of food; the die is the rations one gift buys* / Result: [3] 3 rations a gift
  - **Negotiation** everything given: the chief is satisfied and returns 9 gifts
    - *Roll 3 D6 for the chief's gifts in return; the total is the gifts the chief gives in return* / Result: [2 3 4] 2 + 3 + 4 = 9 gifts
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Negotiation** [2 3 4] everything given: the chief is satisfied and returns 9 gifts
- bottom-1: **Trade** [3 3 3 3] the chief permits trade: 3 rations a gift, a bearer 3 gifts, a guide 3 gifts, an askari 3 gifts and a musket

Rail's one line at bottom-1: **Trade** [3 3 3 3] the chief permits trade: 3 rations a gift, a bearer 3 gifts, a guide 3 gifts, an askari 3 gifts and a musket

Trade panel at bottom-1's edge:

- Heading: "(gifts icon) 9 gifts"
- Row (food icon): "3 rations / gift", the count held, [−] to sell, [+] to buy
- Row (bearers icon): "3 gifts", the count held, [−] to sell, [+] to buy
- Row (guides icon): "3 gifts", the count held, [−] to sell, [+] to buy
- Row (askaris icon): "3 gifts + musket", the count held, [−] to sell, [+] to buy
- [Done trading]

### C14. Friendly approach: the chief insulted but too weak to attack, so he tries poison

A tribe of 2 warriors, found as in C1 with other dice for the warriors.

**Before anything is tapped**

Policy panel at bottom-1's edge:

- Heading: "(1) 2 warriors"
- [1] "Defensive stand" / "Stay put on guard: no hunting, research or trade, no leaving until next turn"
- [2] "Retreat" / "Back to the hex you came from; your marker here is removed"
- [3] "Show of force" / "Approach warily, muskets ready"
- [4] "Ignore them" / "Carry on as if they were not there"
- [5] "Friendly approach" / "Open hands and gifts"

**1. The player chooses policy 5, "Friendly approach"**

Dice panel at bottom-1's edge:

- Ask: "Roll 3 D6 for the natives' reaction; a total of 7 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +5 policy 5, friendly approach)"
- Status: "Waiting for a roll of 3 D6"

**2. The dice come up 1, 1, 1**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The natives"
  - **Native reaction** not hostile: 3 on the dice, within the target of 7
    - *Roll 3 D6 for the natives' reaction; a total of 7 or less and they are not hostile, more and they are hostile (+2 hexes to the nearest port, +5 policy 5, friendly approach)* / Result: [1 1 1] 1 + 1 + 1 = 3: not hostile
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Native reaction** needs 7 or less [1 1 1] +2 hexes to the nearest port, +5 policy 5, friendly approach not hostile: 3 on the dice, within the target of 7

Rail's one line at bottom-1: **Native reaction** needs 7 or less [1 1 1] +2 +5 not hostile: 3 on the dice, within the target of 7

Negotiation panel at bottom-1's edge:

- Heading: "(1) 2 warriors · (gifts icon) 20"
- Offer row: [−] "0" [+] [×1] and the button "Offer 0 gifts" / "Gifts × the larger of two dice must reach the warriors" (the count follows the offer: "Offer 4 gifts", "Offer 1 gift")
- "Give everything" / "All goods and animals but the men; the chief returns three dice of gifts"
- "Do not negotiate" / "Carry on with the turn"

**3. The player offers 1 gift**

Dice panel at bottom-1's edge:

- Ask: "Roll 2 D6 for the offer of 1 gift; the larger die × 1 must reach the 2 warriors to satisfy the chief; less insults him"
- Status: "Waiting for a roll of 2 D6"

**4. The dice come up 1, 1**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 5: more than the 2 warriors and they hide, else they attack"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Negotiation** 1 gift offered: the larger die 1 × 1 = 1, short of 2 warriors: the chief is insulted
    - *Roll 2 D6 for the offer of 1 gift; the larger die × 1 must reach the 2 warriors to satisfy the chief; less insults him* / Result: [1 1] 1 × 1 = 1: the chief is insulted

**5. The dice come up 6**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the chief's poison; 2 or less kills the explorer, 3 and he recovers, hardened against the next, 4 or more and the poison fails"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Fight** hostile; nerve 6 × 5 askaris ÷ policy 5 = 6, more than 2 warriors: the natives hide
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 5: more than the 2 warriors and they hide, else they attack* / Result: [6] 6 × 5 ÷ 5 = 6: the natives hide
  - **Negotiation** 1 gift offered: the larger die 1 × 1 = 1, short of 2 warriors: the chief is insulted
    - *Roll 2 D6 for the offer of 1 gift; the larger die × 1 must reach the 2 warriors to satisfy the chief; less insults him* / Result: [1 1] 1 × 1 = 1: the chief is insulted

**6. The dice come up 3**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The natives"
  - **Poison** poisoned, the explorer recovers (3; hardened against the next attempt)
    - *Roll a D6 for the chief's poison; 2 or less kills the explorer, 3 and he recovers, hardened against the next, 4 or more and the poison fails* / Result: [3] poisoned, but he recovers
  - **Fight** hostile; nerve 6 × 5 askaris ÷ policy 5 = 6, more than 2 warriors: the natives hide
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 5: more than the 2 warriors and they hide, else they attack* / Result: [6] 6 × 5 ÷ 5 = 6: the natives hide
  - **Negotiation** 1 gift offered: the larger die 1 × 1 = 1, short of 2 warriors: the chief is insulted
    - *Roll 2 D6 for the offer of 1 gift; the larger die × 1 must reach the 2 warriors to satisfy the chief; less insults him* / Result: [1 1] 1 × 1 = 1: the chief is insulted
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Negotiation** [1 1] 1 gift offered: the larger die 1 × 1 = 1, short of 2 warriors: the chief is insulted
- bottom-1: **Fight** [6] hostile; nerve 6 × 5 askaris ÷ policy 5 = 6, more than 2 warriors: the natives hide
- bottom-1: **Poison** [3] poisoned, the explorer recovers (3; hardened against the next attempt)

Rail's one line at bottom-1: **Poison** [3] poisoned, the explorer recovers (3; hardened against the next attempt)

## Not sampled

Text that exists but none of the samples above reaches. The asks are worded in the rules' own files, named here.

- **Explored with moves left** (mounted or by canoe; no horses or camels are sold at Mombasa, where the samples start). The result panel stays until the next step: title "Explored a veldt hex" (the terrain's name, "Explored a jungle mountain hex"), then "You have 2 MP: pick a hex to move into, or" `[END TURN]`, then the step's lines.
- **Sickness** at the end of a turn (`rations.ts`): a die a man, asked for by the bunch, "for the 3 sick bearers, a die a man; 1 or less recovers, 5 or more dies, anything between is still sick" (the numbers shift "with the doctor" and "starving too"), "for the starving bearer; 4 or more and he falls sick, less and he stays well".
- **Oasis** on entering a desert hex another explorer mapped (`exploration/reducer.ts`): "for the oasis; even finds the oasis, if there is one here; odd finds none, and only its first finder may look again". In a newly mapped desert hex: "for an oasis in this desert", then "to confirm the oasis".
- **Cataract by canoe**: "for the canoes over the cataract; the die less 3 is the canoes lost over the falls, of 2; 3 or less loses none".
- **Cache**: "for the cache; 1 or 2 and it has gone; 3 or more and it is recovered".
- **Specialties** (`specialties.ts`): "for a zoological specimen; 2 or 3 finds a specimen in veldt; anything else, none"; "for the preaching; the tribe's attitude rises by the die less 1: …"; "for the treatment; 1 a fatal disease, 2 the explorer falls sick, …".
- **A disaster card that applies** (`disasters/resolve.ts`): its own dice ("for the doctor; 6 and the doctor averts it; less and it strikes", "for the toll; the total is the toll in gifts; more than the 20 carried and the raiders attack", "for the raiders; the total is the animals they try to steal; each raider shot saves one", "for the explorer's shot (crocodile); 6 kills one, less misses").
- **Rivers met from a neighbour** (`rivers.ts`): "for the water two rivers leave from; 1–2 lake, 3–4 swamp, 5–6 jungle-swamp", "for where the river comes from; it comes from water or unexplored country that way; from mapped land it cannot, and rises here", "for where the river flows on to; it flows on into water or unexplored country that way; toward mapped land it cannot, and the die is rolled again".
- **Other terrain**: "for jungle in the mountain; 4 adds jungle, anything else mountain alone"; beside jungle the table reads "1 desert (veldt here, beside jungle)", beside desert "4 jungle (veldt here, beside desert)".
- **The roll for first player** before the game: "Roll 4 D6 for first player; the highest total goes first; a tie is rolled again", shown its own way at every seat.
- **Without physical dice** the table rolls for itself: no dice panel, no asks and no result panel; only the log lines and the rail's one line appear.
