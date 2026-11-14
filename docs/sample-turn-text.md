# Sample turn text

Every piece of text the table shows during a turn, as the game produces it today, for review and editing into a spec of the interaction flow. The samples were produced by playing the game's own rules with dice rolled at the table (physical dice on), so the words are the game's, not a paraphrase. Snapshot of 2026-11-14 (commit fc94ac6).

## How to read the samples

Each sample is a sequence of numbered steps: something the player does, or dice coming up. Under each step is what the table then shows.

- **Move prompt**: the line at the seat's edge while the seat may move; the words are followed by a control, shown as `[END TURN]` or `[REMAIN]`.
- **Dice panel**: shown at the seat's edge while the table waits for dice.
  - *Note*: what the board has just shown of the last die, when there is one.
  - *Ask*: what to roll and why. This is the text before the roll.
  - *Status*: the line under the ask. The samples show the dicecam's waiting words; with the manual tray it reads "Tap the dice tray to roll one die" / "Tap the dice tray to roll 3 dice". Under it are six die faces to tap instead.
  - *So far (newest first)*: what the dice have already decided for the same action. An ask already answered is kept in its words with "Result:", its dice and what they meant. Once the rule has written a log line for those dice, the line stands there with its asks under it.
- **Result panel**: shown at the seat's edge once the last die of an action is in, for five seconds or until `[OK]`. It holds the whole segment of the turn (the step into a hex, the natives, or the hunt), newest first.
- **Lines added to the log**: the lines the action wrote, as the opened log words them. An action with no dice writes a plain line.
- **Rail's one line**: the seat's rail shows only the newest log line, cut shorter (modifiers as bare numbers). This is what remains on view once the next operation starts and the panel is gone.
- Other panels (disaster card, policy, spoils, negotiation, trade) are listed with their headings and buttons.

Notation: `[4]` or `[6 6 6]` are dice drawn as faces. `**Lost check**` is the line's kind label. `needs 2+` is the "needs" tag. `veldt -1 = 3` is the modifiers and the total. `(+2 more dice not drawn)` stands for the "+2" shown when a line has more than six dice. `(1)` in a heading is the tribe's numbered marker.

## Things noticed while collecting the samples

These are current behaviour, listed because they look like candidates for the spec:

1. The result panel's title comes from the last ask answered, not from the segment: "Natives", "The warriors", "Jungle in the swamp", "The price of askaris", "To find the village", "On the consequences of defeat", "An escape".
2. While an event is still asking, an answered ask stands alone in "So far"; once the rule writes its line, the same result is said twice (the line's own wording, then the ask and its result under it).
3. A captive's escape ask (C4) lists the other player's last action ("discarded $200") under "So far".
4. A negative total is written with a hyphen ("2 − 3 = -1") where the rest of the sum uses a minus sign.
5. Modifiers in a line are written "veldt -1" and "policy 3 +3" with no separator between a label ending in a number and its value.
6. On foot, a step into an unexplored hex spends both movement points, so the "Explored a ... hex" result that stays with a prompt for the next step did not arise in any sample (see "Not sampled").

## A. A step into a hex

### A1. Not lost, terrain copied from a neighbour, no river, no natives; then the end of the turn and the hunt

The expedition has just been outfitted at Mombasa. The step costs both movement points, so the result is shown for five seconds rather than kept with a prompt for the next step.

**Before anything is tapped**

Move prompt at bottom-1's edge: "Pick a hex to move into, or" [END TURN]

**1. The player taps hex c24r12 on the board**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 to see if you are lost; 2+ means you're okay"
- Status: "Waiting for a D6 roll"

**2. The dice come up 4**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the direction of the terrain to copy; a mapped neighbour in that direction is copied"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Lost check** needs 2+ [4] veldt -1 = 3 not lost
    - *Roll a D6 to see if you are lost; 2+ means you're okay* / Result: [4] 4 − 1 = 3: not lost

**3. The dice come up 3**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for a river source; an even roll means a river rises here"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Terrain** [3] mapped veldt: veldt copied from the neighbour in direction 3
    - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour in that direction is copied* / Result: [3] veldt, copied from direction 3
  - **Lost check** needs 2+ [4] veldt -1 = 3 not lost
    - *Roll a D6 to see if you are lost; 2+ means you're okay* / Result: [4] 4 − 1 = 3: not lost

**4. The dice come up 3**

Dice panel at bottom-1's edge:

- Ask: "Roll 2 D6 for natives; natives on 2, 3, 4"
- Status: "Waiting for a roll of 2 D6"
- So far (newest first):
  - **Water** [3] 3 is odd: no river
    - *Roll a D6 for a river source; an even roll means a river rises here* / Result: [3] odd: no river
  - **Terrain** [3] mapped veldt: veldt copied from the neighbour in direction 3
    - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour in that direction is copied* / Result: [3] veldt, copied from direction 3
  - **Lost check** needs 2+ [4] veldt -1 = 3 not lost
    - *Roll a D6 to see if you are lost; 2+ means you're okay* / Result: [4] 4 − 1 = 3: not lost

**5. The dice come up 3, 3**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "Natives"
  - **Natives** needs 2, 3, 4 [3 3] no natives (3 + 3 = 6)
    - *Roll 2 D6 for natives; natives on 2, 3, 4* / Result: [3 3] 3 + 3 = 6: no natives
  - **Water** [3] 3 is odd: no river
    - *Roll a D6 for a river source; an even roll means a river rises here* / Result: [3] odd: no river
  - **Terrain** [3] mapped veldt: veldt copied from the neighbour in direction 3
    - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour in that direction is copied* / Result: [3] veldt, copied from direction 3
  - **Lost check** needs 2+ [4] veldt -1 = 3 not lost
    - *Roll a D6 to see if you are lost; 2+ means you're okay* / Result: [4] 4 − 1 = 3: not lost
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Lost check** needs 2+ [4] veldt -1 = 3 not lost
- bottom-1: **Terrain** [3] mapped veldt: veldt copied from the neighbour in direction 3
- bottom-1: **Water** [3] 3 is odd: no river
- bottom-1: **Natives** needs 2, 3, 4 [3 3] no natives (3 + 3 = 6)

Rail's one line at bottom-1: **Natives** needs 2, 3, 4 [3 3] no natives (3 + 3 = 6)

**6. The player taps END TURN**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the hunt; the die bags one ration per hunter at 2, two at 4, three at 6"
- Status: "Waiting for a D6 roll"

**7. The dice come up 3**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The hunt"
  - **Hunting** needs 2 / 4 / 6 for one, two, three per hunter [3] one per hunter: 6 rations bagged, 12 men ate (6 from the stores)
    - *Roll a D6 for the hunt; the die bags one ration per hunter at 2, two at 4, three at 6* / Result: [3] one per hunter
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Hunting** needs 2 / 4 / 6 for one, two, three per hunter [3] one per hunter: 6 rations bagged, 12 men ate (6 from the stores)
- top-1: drew $200

Rail's one line at top-1: drew $200

### A2. Nothing to copy: the terrain table, a composite (jungle with mountain), the peak, a river with a cataract, natives found

The same step from Mombasa with other dice.

**Before anything is tapped**

Move prompt at bottom-1's edge: "Pick a hex to move into, or" [END TURN]

**1. The player taps hex c24r12 on the board**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 to see if you are lost; 2+ means you're okay"
- Status: "Waiting for a D6 roll"

**2. The dice come up 4**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the direction of the terrain to copy; a mapped neighbour in that direction is copied"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Lost check** needs 2+ [4] veldt -1 = 3 not lost
    - *Roll a D6 to see if you are lost; 2+ means you're okay* / Result: [4] 4 − 1 = 3: not lost

**3. The dice come up 6**

Dice panel at bottom-1's edge:

- Note: "Hex in direction 6 is empty; roll again"
- Ask: "Roll a D6 for the direction of the terrain to copy, once more; a mapped neighbour in that direction is copied"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour in that direction is copied* / Result: [6] nothing mapped in direction 6
  - **Lost check** needs 2+ [4] veldt -1 = 3 not lost
    - *Roll a D6 to see if you are lost; 2+ means you're okay* / Result: [4] 4 − 1 = 3: not lost

**4. The dice come up 6**

Dice panel at bottom-1's edge:

- Note: "Hex in direction 6 is empty too; roll on the terrain table"
- Ask: "Roll a D6 for the terrain; 1 desert, 2 mountain, 3 swamp, 4 jungle, 5 veldt, 6 lake"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll a D6 for the direction of the terrain to copy, once more; a mapped neighbour in that direction is copied* / Result: [6] nothing mapped in direction 6
  - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour in that direction is copied* / Result: [6] nothing mapped in direction 6
  - **Lost check** needs 2+ [4] veldt -1 = 3 not lost
    - *Roll a D6 to see if you are lost; 2+ means you're okay* / Result: [4] 4 − 1 = 3: not lost

**5. The dice come up 4**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for what the jungle hides; 2 adds mountain, 3 adds swamp"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll a D6 for the terrain; 1 desert, 2 mountain, 3 swamp, 4 jungle, 5 veldt, 6 lake* / Result: [4] jungle
  - *Roll a D6 for the direction of the terrain to copy, once more; a mapped neighbour in that direction is copied* / Result: [6] nothing mapped in direction 6
  - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour in that direction is copied* / Result: [6] nothing mapped in direction 6
  - **Lost check** needs 2+ [4] veldt -1 = 3 not lost
    - *Roll a D6 to see if you are lost; 2+ means you're okay* / Result: [4] 4 − 1 = 3: not lost

**6. The dice come up 2**

Dice panel at bottom-1's edge:

- Ask: "Roll 3 D6 for the mountain's height; the product plus 100, in hundreds of feet; over 15,000 ft is a recorded peak"
- Status: "Waiting for a roll of 3 D6"
- So far (newest first):
  - **Terrain** [6 6 4 2] mapped jungle-mountain: nothing mapped in direction 6, rolled again; nothing mapped in direction 6 either; 4 on the table: jungle; 2: mountain in the jungle
    - *Roll a D6 for what the jungle hides; 2 adds mountain, 3 adds swamp* / Result: [2] mountain in the jungle
    - *Roll a D6 for the terrain; 1 desert, 2 mountain, 3 swamp, 4 jungle, 5 veldt, 6 lake* / Result: [4] jungle
    - *Roll a D6 for the direction of the terrain to copy, once more; a mapped neighbour in that direction is copied* / Result: [6] nothing mapped in direction 6
    - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour in that direction is copied* / Result: [6] nothing mapped in direction 6
  - **Lost check** needs 2+ [4] veldt -1 = 3 not lost
    - *Roll a D6 to see if you are lost; 2+ means you're okay* / Result: [4] 4 − 1 = 3: not lost

**7. The dice come up 5, 6, 4**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for a river source; an even roll means a river rises here"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll 3 D6 for the mountain's height; the product plus 100, in hundreds of feet; over 15,000 ft is a recorded peak* / Result: [5 6 4] 22,000 ft: a recorded peak
  - **Terrain** [6 6 4 2] mapped jungle-mountain: nothing mapped in direction 6, rolled again; nothing mapped in direction 6 either; 4 on the table: jungle; 2: mountain in the jungle
    - *Roll a D6 for what the jungle hides; 2 adds mountain, 3 adds swamp* / Result: [2] mountain in the jungle
    - *Roll a D6 for the terrain; 1 desert, 2 mountain, 3 swamp, 4 jungle, 5 veldt, 6 lake* / Result: [4] jungle
    - *Roll a D6 for the direction of the terrain to copy, once more; a mapped neighbour in that direction is copied* / Result: [6] nothing mapped in direction 6
    - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour in that direction is copied* / Result: [6] nothing mapped in direction 6
  - **Lost check** needs 2+ [4] veldt -1 = 3 not lost
    - *Roll a D6 to see if you are lost; 2+ means you're okay* / Result: [4] 4 − 1 = 3: not lost

**8. The dice come up 2**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for which way the river flows; a direction around the hex"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll a D6 for a river source; an even roll means a river rises here* / Result: [2] even: a river, if it has somewhere to flow
  - *Roll 3 D6 for the mountain's height; the product plus 100, in hundreds of feet; over 15,000 ft is a recorded peak* / Result: [5 6 4] 22,000 ft: a recorded peak
  - **Terrain** [6 6 4 2] mapped jungle-mountain: nothing mapped in direction 6, rolled again; nothing mapped in direction 6 either; 4 on the table: jungle; 2: mountain in the jungle
    - *Roll a D6 for what the jungle hides; 2 adds mountain, 3 adds swamp* / Result: [2] mountain in the jungle
    - *Roll a D6 for the terrain; 1 desert, 2 mountain, 3 swamp, 4 jungle, 5 veldt, 6 lake* / Result: [4] jungle
    - *Roll a D6 for the direction of the terrain to copy, once more; a mapped neighbour in that direction is copied* / Result: [6] nothing mapped in direction 6
    - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour in that direction is copied* / Result: [6] nothing mapped in direction 6
  - **Lost check** needs 2+ [4] veldt -1 = 3 not lost
    - *Roll a D6 to see if you are lost; 2+ means you're okay* / Result: [4] 4 − 1 = 3: not lost

**9. The dice come up 6**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for a cataract; 2, 3 or 4 means a cataract"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll a D6 for which way the river flows; a direction around the hex* / Result: [6] it flows in direction 6
  - *Roll a D6 for a river source; an even roll means a river rises here* / Result: [2] even: a river, if it has somewhere to flow
  - *Roll 3 D6 for the mountain's height; the product plus 100, in hundreds of feet; over 15,000 ft is a recorded peak* / Result: [5 6 4] 22,000 ft: a recorded peak
  - **Terrain** [6 6 4 2] mapped jungle-mountain: nothing mapped in direction 6, rolled again; nothing mapped in direction 6 either; 4 on the table: jungle; 2: mountain in the jungle
    - *Roll a D6 for what the jungle hides; 2 adds mountain, 3 adds swamp* / Result: [2] mountain in the jungle
    - *Roll a D6 for the terrain; 1 desert, 2 mountain, 3 swamp, 4 jungle, 5 veldt, 6 lake* / Result: [4] jungle
    - *Roll a D6 for the direction of the terrain to copy, once more; a mapped neighbour in that direction is copied* / Result: [6] nothing mapped in direction 6
    - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour in that direction is copied* / Result: [6] nothing mapped in direction 6
  - **Lost check** needs 2+ [4] veldt -1 = 3 not lost
    - *Roll a D6 to see if you are lost; 2+ means you're okay* / Result: [4] 4 − 1 = 3: not lost

**10. The dice come up 3**

Dice panel at bottom-1's edge:

- Ask: "Roll 4 D6 for the waterfall's height; the product in feet; 400 ft or more is recorded"
- Status: "Waiting for a roll of 4 D6"
- So far (newest first):
  - *Roll a D6 for a cataract; 2, 3 or 4 means a cataract* / Result: [3] a cataract
  - *Roll a D6 for which way the river flows; a direction around the hex* / Result: [6] it flows in direction 6
  - *Roll a D6 for a river source; an even roll means a river rises here* / Result: [2] even: a river, if it has somewhere to flow
  - *Roll 3 D6 for the mountain's height; the product plus 100, in hundreds of feet; over 15,000 ft is a recorded peak* / Result: [5 6 4] 22,000 ft: a recorded peak
  - **Terrain** [6 6 4 2] mapped jungle-mountain: nothing mapped in direction 6, rolled again; nothing mapped in direction 6 either; 4 on the table: jungle; 2: mountain in the jungle
    - *Roll a D6 for what the jungle hides; 2 adds mountain, 3 adds swamp* / Result: [2] mountain in the jungle
    - *Roll a D6 for the terrain; 1 desert, 2 mountain, 3 swamp, 4 jungle, 5 veldt, 6 lake* / Result: [4] jungle
    - *Roll a D6 for the direction of the terrain to copy, once more; a mapped neighbour in that direction is copied* / Result: [6] nothing mapped in direction 6
    - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour in that direction is copied* / Result: [6] nothing mapped in direction 6
  - **Lost check** needs 2+ [4] veldt -1 = 3 not lost
    - *Roll a D6 to see if you are lost; 2+ means you're okay* / Result: [4] 4 − 1 = 3: not lost

**11. The dice come up 2, 3, 4, 5**

Dice panel at bottom-1's edge:

- Ask: "Roll 2 D6 for natives; natives on 2, 3, 4, 5, 6, 7"
- Status: "Waiting for a roll of 2 D6"
- So far (newest first):
  - **Water** [5 6 4 2 6 3] (+4 more dice not drawn) 5 × 6 × 4 = 120, plus 100 = 220 hundred feet: a record-breaking peak of 22,000 ft (over 15,000), the first discovered and the highest so far; 2 is even: a river rises here and flows in direction 6; a cataract on a 3 (its fall of 120 ft, 2 × 3 × 4 × 5, under the 400 recorded)
    - *Roll 4 D6 for the waterfall's height; the product in feet; 400 ft or more is recorded* / Result: [2 3 4 5] 2 × 3 × 4 × 5 = 120 ft: under the 400 recorded
    - *Roll a D6 for a cataract; 2, 3 or 4 means a cataract* / Result: [3] a cataract
    - *Roll a D6 for which way the river flows; a direction around the hex* / Result: [6] it flows in direction 6
    - *Roll a D6 for a river source; an even roll means a river rises here* / Result: [2] even: a river, if it has somewhere to flow
    - *Roll 3 D6 for the mountain's height; the product plus 100, in hundreds of feet; over 15,000 ft is a recorded peak* / Result: [5 6 4] 22,000 ft: a recorded peak
  - **Terrain** [6 6 4 2] mapped jungle-mountain: nothing mapped in direction 6, rolled again; nothing mapped in direction 6 either; 4 on the table: jungle; 2: mountain in the jungle
    - *Roll a D6 for what the jungle hides; 2 adds mountain, 3 adds swamp* / Result: [2] mountain in the jungle
    - *Roll a D6 for the terrain; 1 desert, 2 mountain, 3 swamp, 4 jungle, 5 veldt, 6 lake* / Result: [4] jungle
    - *Roll a D6 for the direction of the terrain to copy, once more; a mapped neighbour in that direction is copied* / Result: [6] nothing mapped in direction 6
    - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour in that direction is copied* / Result: [6] nothing mapped in direction 6
  - **Lost check** needs 2+ [4] veldt -1 = 3 not lost
    - *Roll a D6 to see if you are lost; 2+ means you're okay* / Result: [4] 4 − 1 = 3: not lost

**12. The dice come up 1, 2**

Dice panel at bottom-1's edge:

- Ask: "Roll 3 D6 for the warriors; the product, the largest die no more than 1"
- Status: "Waiting for a roll of 3 D6"
- So far (newest first):
  - **Natives** needs 2, 3, 4, 5, 6, 7 [1 2] natives on 3: a tribe is here, its warriors next
    - *Roll 2 D6 for natives; natives on 2, 3, 4, 5, 6, 7* / Result: [1 2] 1 + 2 = 3: natives
  - **Water** [5 6 4 2 6 3] (+4 more dice not drawn) 5 × 6 × 4 = 120, plus 100 = 220 hundred feet: a record-breaking peak of 22,000 ft (over 15,000), the first discovered and the highest so far; 2 is even: a river rises here and flows in direction 6; a cataract on a 3 (its fall of 120 ft, 2 × 3 × 4 × 5, under the 400 recorded)
    - *Roll 4 D6 for the waterfall's height; the product in feet; 400 ft or more is recorded* / Result: [2 3 4 5] 2 × 3 × 4 × 5 = 120 ft: under the 400 recorded
    - *Roll a D6 for a cataract; 2, 3 or 4 means a cataract* / Result: [3] a cataract
    - *Roll a D6 for which way the river flows; a direction around the hex* / Result: [6] it flows in direction 6
    - *Roll a D6 for a river source; an even roll means a river rises here* / Result: [2] even: a river, if it has somewhere to flow
    - *Roll 3 D6 for the mountain's height; the product plus 100, in hundreds of feet; over 15,000 ft is a recorded peak* / Result: [5 6 4] 22,000 ft: a recorded peak
  - **Terrain** [6 6 4 2] mapped jungle-mountain: nothing mapped in direction 6, rolled again; nothing mapped in direction 6 either; 4 on the table: jungle; 2: mountain in the jungle
    - *Roll a D6 for what the jungle hides; 2 adds mountain, 3 adds swamp* / Result: [2] mountain in the jungle
    - *Roll a D6 for the terrain; 1 desert, 2 mountain, 3 swamp, 4 jungle, 5 veldt, 6 lake* / Result: [4] jungle
    - *Roll a D6 for the direction of the terrain to copy, once more; a mapped neighbour in that direction is copied* / Result: [6] nothing mapped in direction 6
    - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour in that direction is copied* / Result: [6] nothing mapped in direction 6
  - **Lost check** needs 2+ [4] veldt -1 = 3 not lost
    - *Roll a D6 to see if you are lost; 2+ means you're okay* / Result: [4] 4 − 1 = 3: not lost

**13. The dice come up 3, 3, 3**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The warriors"
  - **Natives** needs 2, 3, 4, 5, 6, 7 [1 2 3 3 3] natives on 3: tribe 1 of 9 warriors, 3 × 3 × 3, the 3 cut to 1 for the distance to Mombasa
    - *Roll 3 D6 for the warriors; the product, the largest die no more than 1* / Result: [3 3 3] 1 × 3 × 3 = 9 warriors, the 3 cut to 1
    - *Roll 2 D6 for natives; natives on 2, 3, 4, 5, 6, 7* / Result: [1 2] 1 + 2 = 3: natives
  - **Water** [5 6 4 2 6 3] (+4 more dice not drawn) 5 × 6 × 4 = 120, plus 100 = 220 hundred feet: a record-breaking peak of 22,000 ft (over 15,000), the first discovered and the highest so far; 2 is even: a river rises here and flows in direction 6; a cataract on a 3 (its fall of 120 ft, 2 × 3 × 4 × 5, under the 400 recorded)
    - *Roll 4 D6 for the waterfall's height; the product in feet; 400 ft or more is recorded* / Result: [2 3 4 5] 2 × 3 × 4 × 5 = 120 ft: under the 400 recorded
    - *Roll a D6 for a cataract; 2, 3 or 4 means a cataract* / Result: [3] a cataract
    - *Roll a D6 for which way the river flows; a direction around the hex* / Result: [6] it flows in direction 6
    - *Roll a D6 for a river source; an even roll means a river rises here* / Result: [2] even: a river, if it has somewhere to flow
    - *Roll 3 D6 for the mountain's height; the product plus 100, in hundreds of feet; over 15,000 ft is a recorded peak* / Result: [5 6 4] 22,000 ft: a recorded peak
  - **Terrain** [6 6 4 2] mapped jungle-mountain: nothing mapped in direction 6, rolled again; nothing mapped in direction 6 either; 4 on the table: jungle; 2: mountain in the jungle
    - *Roll a D6 for what the jungle hides; 2 adds mountain, 3 adds swamp* / Result: [2] mountain in the jungle
    - *Roll a D6 for the terrain; 1 desert, 2 mountain, 3 swamp, 4 jungle, 5 veldt, 6 lake* / Result: [4] jungle
    - *Roll a D6 for the direction of the terrain to copy, once more; a mapped neighbour in that direction is copied* / Result: [6] nothing mapped in direction 6
    - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour in that direction is copied* / Result: [6] nothing mapped in direction 6
  - **Lost check** needs 2+ [4] veldt -1 = 3 not lost
    - *Roll a D6 to see if you are lost; 2+ means you're okay* / Result: [4] 4 − 1 = 3: not lost
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Lost check** needs 2+ [4] veldt -1 = 3 not lost
- bottom-1: **Terrain** [6 6 4 2] mapped jungle-mountain: nothing mapped in direction 6, rolled again; nothing mapped in direction 6 either; 4 on the table: jungle; 2: mountain in the jungle
- bottom-1: **Water** [5 6 4 2 6 3] (+4 more dice not drawn) 5 × 6 × 4 = 120, plus 100 = 220 hundred feet: a record-breaking peak of 22,000 ft (over 15,000), the first discovered and the highest so far; 2 is even: a river rises here and flows in direction 6; a cataract on a 3 (its fall of 120 ft, 2 × 3 × 4 × 5, under the 400 recorded)
- bottom-1: **Natives** needs 2, 3, 4, 5, 6, 7 [1 2 3 3 3] natives on 3: tribe 1 of 9 warriors, 3 × 3 × 3, the 3 cut to 1 for the distance to Mombasa

Rail's one line at bottom-1: **Natives** needs 2, 3, 4, 5, 6, 7 [1 2 3 3 3] natives on 3: tribe 1 of 9 warriors, 3 × 3 × 3, the 3 cut to 1 for the distance to Mombasa

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

- Ask: "Roll a D6 to see if you are lost; 2+ means you're okay"
- Status: "Waiting for a D6 roll"

**2. The dice come up 4**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the direction of the terrain to copy; a mapped neighbour in that direction is copied"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Lost check** needs 2+ [4] veldt -1 = 3 not lost
    - *Roll a D6 to see if you are lost; 2+ means you're okay* / Result: [4] 4 − 1 = 3: not lost

**3. The dice come up 3**

Dice panel at bottom-1's edge:

- Note: "Hex in direction 3 is empty; roll again"
- Ask: "Roll a D6 for the direction of the terrain to copy, once more; a mapped neighbour in that direction is copied"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour in that direction is copied* / Result: [3] nothing mapped in direction 3
  - **Lost check** needs 2+ [4] veldt -1 = 3 not lost
    - *Roll a D6 to see if you are lost; 2+ means you're okay* / Result: [4] 4 − 1 = 3: not lost

**4. The dice come up 3**

Dice panel at bottom-1's edge:

- Note: "Hex in direction 3 is empty too; roll on the terrain table"
- Ask: "Roll a D6 for the terrain; 1 desert, 2 mountain, 3 swamp, 4 jungle, 5 veldt, 6 lake"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll a D6 for the direction of the terrain to copy, once more; a mapped neighbour in that direction is copied* / Result: [3] nothing mapped in direction 3
  - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour in that direction is copied* / Result: [3] nothing mapped in direction 3
  - **Lost check** needs 2+ [4] veldt -1 = 3 not lost
    - *Roll a D6 to see if you are lost; 2+ means you're okay* / Result: [4] 4 − 1 = 3: not lost

**5. The dice come up 3**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for jungle in the swamp; 4 adds jungle"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll a D6 for the terrain; 1 desert, 2 mountain, 3 swamp, 4 jungle, 5 veldt, 6 lake* / Result: [3] swamp
  - *Roll a D6 for the direction of the terrain to copy, once more; a mapped neighbour in that direction is copied* / Result: [3] nothing mapped in direction 3
  - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour in that direction is copied* / Result: [3] nothing mapped in direction 3
  - **Lost check** needs 2+ [4] veldt -1 = 3 not lost
    - *Roll a D6 to see if you are lost; 2+ means you're okay* / Result: [4] 4 − 1 = 3: not lost

**6. The dice come up 3**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "Jungle in the swamp"
  - **Turned back** swamp is impassable on foot: the expedition turns back
  - **Terrain** [3 3 3 3] mapped swamp: nothing mapped in direction 3, rolled again; nothing mapped in direction 3 either; 3 on the table: swamp; 3: no jungle in the swamp
    - *Roll a D6 for jungle in the swamp; 4 adds jungle* / Result: [3] no jungle: swamp
    - *Roll a D6 for the terrain; 1 desert, 2 mountain, 3 swamp, 4 jungle, 5 veldt, 6 lake* / Result: [3] swamp
    - *Roll a D6 for the direction of the terrain to copy, once more; a mapped neighbour in that direction is copied* / Result: [3] nothing mapped in direction 3
    - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour in that direction is copied* / Result: [3] nothing mapped in direction 3
  - **Lost check** needs 2+ [4] veldt -1 = 3 not lost
    - *Roll a D6 to see if you are lost; 2+ means you're okay* / Result: [4] 4 − 1 = 3: not lost
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Lost check** needs 2+ [4] veldt -1 = 3 not lost
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

- bottom-1: **Disaster card** (card 28: no effect) not here: desert

Rail's one line at bottom-1: **Disaster card** (card 28: no effect) not here: desert

Move prompt at bottom-1's edge: "Pick a hex to move into, or" [END TURN]

**2. The player taps hex c23r12 on the board**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 to see if you are lost; 2+ means you're okay"
- Status: "Waiting for a D6 roll"

**3. The dice come up 1**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the hunt; the die bags one ration per hunter at 2, two at 4, three at 6"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Lost check** needs 2+ [1] veldt -1 = 0 lost
    - *Roll a D6 to see if you are lost; 2+ means you're okay* / Result: [1] 1 − 1 = 0: lost

**4. The dice come up 1**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The hunt"
  - **Hunting** needs 2 / 4 / 6 for one, two, three per hunter [1] nothing per hunter: no game, 12 men ate (12 from the stores)
    - *Roll a D6 for the hunt; the die bags one ration per hunter at 2, two at 4, three at 6* / Result: [1] nothing bagged
- Segment heading: "The step into c23r12"
  - **Lost check** needs 2+ [1] veldt -1 = 0 lost
    - *Roll a D6 to see if you are lost; 2+ means you're okay* / Result: [1] 1 − 1 = 0: lost
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Lost check** needs 2+ [1] veldt -1 = 0 lost
- bottom-1: **Hunting** needs 2 / 4 / 6 for one, two, three per hunter [1] nothing per hunter: no game, 12 men ate (12 from the stores)

Rail's one line at bottom-1: **Hunting** needs 2 / 4 / 6 [1] nothing per hunter: no game, 12 men ate (12 from the stores)

## C. Natives

### C1. Natives found by a step: the policy panel

From c24r12 into c23r12.

**Before anything is tapped**

Move prompt at bottom-1's edge: "Pick a hex to move into, or" [END TURN]

**1. The player taps hex c23r12 on the board**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 to see if you are lost; 2+ means you're okay"
- Status: "Waiting for a D6 roll"

**2. The dice come up 4**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the direction of the terrain to copy; a mapped neighbour in that direction is copied"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Lost check** needs 2+ [4] veldt -1 = 3 not lost
    - *Roll a D6 to see if you are lost; 2+ means you're okay* / Result: [4] 4 − 1 = 3: not lost

**3. The dice come up 2**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for a river source; an even roll means a river rises here"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Terrain** [2] mapped veldt: veldt copied from the neighbour in direction 2
    - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour in that direction is copied* / Result: [2] veldt, copied from direction 2
  - **Lost check** needs 2+ [4] veldt -1 = 3 not lost
    - *Roll a D6 to see if you are lost; 2+ means you're okay* / Result: [4] 4 − 1 = 3: not lost

**4. The dice come up 3**

Dice panel at bottom-1's edge:

- Ask: "Roll 2 D6 for natives; natives on 2, 3, 4"
- Status: "Waiting for a roll of 2 D6"
- So far (newest first):
  - **Water** [3] 3 is odd: no river
    - *Roll a D6 for a river source; an even roll means a river rises here* / Result: [3] odd: no river
  - **Terrain** [2] mapped veldt: veldt copied from the neighbour in direction 2
    - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour in that direction is copied* / Result: [2] veldt, copied from direction 2
  - **Lost check** needs 2+ [4] veldt -1 = 3 not lost
    - *Roll a D6 to see if you are lost; 2+ means you're okay* / Result: [4] 4 − 1 = 3: not lost

**5. The dice come up 1, 2**

Dice panel at bottom-1's edge:

- Ask: "Roll 3 D6 for the warriors; the product, the largest die no more than 2"
- Status: "Waiting for a roll of 3 D6"
- So far (newest first):
  - **Natives** needs 2, 3, 4 [1 2] natives on 3: a tribe is here, its warriors next
    - *Roll 2 D6 for natives; natives on 2, 3, 4* / Result: [1 2] 1 + 2 = 3: natives
  - **Water** [3] 3 is odd: no river
    - *Roll a D6 for a river source; an even roll means a river rises here* / Result: [3] odd: no river
  - **Terrain** [2] mapped veldt: veldt copied from the neighbour in direction 2
    - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour in that direction is copied* / Result: [2] veldt, copied from direction 2
  - **Lost check** needs 2+ [4] veldt -1 = 3 not lost
    - *Roll a D6 to see if you are lost; 2+ means you're okay* / Result: [4] 4 − 1 = 3: not lost

**6. The dice come up 2, 2, 3**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The warriors"
  - **Natives** needs 2, 3, 4 [1 2 2 2 3] natives on 3: tribe 1 of 8 warriors, 2 × 2 × 3, the 3 cut to 2 for the distance to Mombasa
    - *Roll 3 D6 for the warriors; the product, the largest die no more than 2* / Result: [2 2 3] 2 × 2 × 2 = 8 warriors, the 3 cut to 2
    - *Roll 2 D6 for natives; natives on 2, 3, 4* / Result: [1 2] 1 + 2 = 3: natives
  - **Water** [3] 3 is odd: no river
    - *Roll a D6 for a river source; an even roll means a river rises here* / Result: [3] odd: no river
  - **Terrain** [2] mapped veldt: veldt copied from the neighbour in direction 2
    - *Roll a D6 for the direction of the terrain to copy; a mapped neighbour in that direction is copied* / Result: [2] veldt, copied from direction 2
  - **Lost check** needs 2+ [4] veldt -1 = 3 not lost
    - *Roll a D6 to see if you are lost; 2+ means you're okay* / Result: [4] 4 − 1 = 3: not lost
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Lost check** needs 2+ [4] veldt -1 = 3 not lost
- bottom-1: **Terrain** [2] mapped veldt: veldt copied from the neighbour in direction 2
- bottom-1: **Water** [3] 3 is odd: no river
- bottom-1: **Natives** needs 2, 3, 4 [1 2 2 2 3] natives on 3: tribe 1 of 8 warriors, 2 × 2 × 3, the 3 cut to 2 for the distance to Mombasa

Rail's one line at bottom-1: **Natives** needs 2, 3, 4 [1 2 2 2 3] natives on 3: tribe 1 of 8 warriors, 2 × 2 × 3, the 3 cut to 2 for the distance to Mombasa

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

- Ask: "Roll 3 D6 for the natives' reaction; 5 or less keeps them calm"
- Status: "Waiting for a roll of 3 D6"

**2. The dice come up 6, 6, 6**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Native reaction** [6 6 6] distance to port +2, policy 3 +3 = 18 hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; 5 or less keeps them calm* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**3. The dice come up 1**

Dice panel at bottom-1's edge:

- Ask: "Roll 2 D6 for surprise; 3+ and the expedition is ready"
- Status: "Waiting for a roll of 2 D6"
- So far (newest first):
  - **Fight** [1] hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 8 warriors: the natives attack
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** [6 6 6] distance to port +2, policy 3 +3 = 18 hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; 5 or less keeps them calm* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**4. The dice come up 6, 6**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 to drive them off; the die × 6 killed over 2 warriors drives them off"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Fight** [1 6 6] hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 8 warriors: the natives attack; surprise 6 + 6 = 12, not under policy 3: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall
    - *Roll 2 D6 for surprise; 3+ and the expedition is ready* / Result: [6 6] 6 + 6 = 12: not surprised
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** [6 6 6] distance to port +2, policy 3 +3 = 18 hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; 5 or less keeps them calm* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**5. The dice come up 6**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for prisoners; 5 askaris less the die; 6 takes none"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Fight** [1 6 6 6] hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 8 warriors: the natives attack; surprise 6 + 6 = 12, not under policy 3: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall; morale 6 × 6 killed = 36, more than the 2 warriors left: the natives are driven off
    - *Roll a D6 to drive them off; the die × 6 killed over 2 warriors drives them off* / Result: [6] 6 × 6 = 36: the natives are driven off
    - *Roll 2 D6 for surprise; 3+ and the expedition is ready* / Result: [6 6] 6 + 6 = 12: not surprised
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** [6 6 6] distance to port +2, policy 3 +3 = 18 hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; 5 or less keeps them calm* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**6. The dice come up 2**

Dice panel at bottom-1's edge:

- Ask: "Roll 2 D6 to find the village; 5 or less finds it"
- Status: "Waiting for a roll of 2 D6"
- So far (newest first):
  - *Roll a D6 for prisoners; 5 askaris less the die; 6 takes none* / Result: [2] 5 − 2: 2 taken
  - **Fight** [1 6 6 6] hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 8 warriors: the natives attack; surprise 6 + 6 = 12, not under policy 3: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall; morale 6 × 6 killed = 36, more than the 2 warriors left: the natives are driven off
    - *Roll a D6 to drive them off; the die × 6 killed over 2 warriors drives them off* / Result: [6] 6 × 6 = 36: the natives are driven off
    - *Roll 2 D6 for surprise; 3+ and the expedition is ready* / Result: [6 6] 6 + 6 = 12: not surprised
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** [6 6 6] distance to port +2, policy 3 +3 = 18 hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; 5 or less keeps them calm* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**7. The dice come up 1, 2**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "To find the village"
  - **Victory** [2 1 2] prisoners: 5 askaris − 2 = 2 taken (the 2 warriors left); village 1 + 2 = 3, within 2 prisoners + policy 3 = 5: the village is found
    - *Roll 2 D6 to find the village; 5 or less finds it* / Result: [1 2] 1 + 2 = 3: the village is found
    - *Roll a D6 for prisoners; 5 askaris less the die; 6 takes none* / Result: [2] 5 − 2: 2 taken
  - **Fight** [1 6 6 6] hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 8 warriors: the natives attack; surprise 6 + 6 = 12, not under policy 3: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall; morale 6 × 6 killed = 36, more than the 2 warriors left: the natives are driven off
    - *Roll a D6 to drive them off; the die × 6 killed over 2 warriors drives them off* / Result: [6] 6 × 6 = 36: the natives are driven off
    - *Roll 2 D6 for surprise; 3+ and the expedition is ready* / Result: [6 6] 6 + 6 = 12: not surprised
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** [6 6 6] distance to port +2, policy 3 +3 = 18 hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; 5 or less keeps them calm* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Native reaction** [6 6 6] distance to port +2, policy 3 +3 = 18 hostile: 18 on the dice, over the target of 5
- bottom-1: **Fight** [1 6 6 6] hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 8 warriors: the natives attack; surprise 6 + 6 = 12, not under policy 3: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall; morale 6 × 6 killed = 36, more than the 2 warriors left: the natives are driven off
- bottom-1: **Victory** [2 1 2] prisoners: 5 askaris − 2 = 2 taken (the 2 warriors left); village 1 + 2 = 3, within 2 prisoners + policy 3 = 5: the village is found

Rail's one line at bottom-1: **Victory** [2 1 2] prisoners: 5 askaris − 2 = 2 taken (the 2 warriors left); village 1 + 2 = 3, within 2 prisoners + policy 3 = 5: the village is found

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

- Title: "The loot"
  - **Loot** [3 3 3 3 1 6] (+2 more dice not drawn) looted 15 rations, 1 gift (a die a warrior: 1 to 4 that many rations, 5 a gift, 6 nothing)
    - *Roll 8 D6 for the loot; one die a warrior: 1–4 that many rations, 5 a gift, 6 nothing* / Result: [3 3 3 3 1 6 2 5] 15 rations, 1 gift
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Loot** [3 3 3 3 1 6] (+2 more dice not drawn) looted 15 rations, 1 gift (a die a warrior: 1 to 4 that many rations, 5 a gift, 6 nothing)

Rail's one line at bottom-1: **Loot** [3 3 3 3 1 6] (+2 more dice not drawn) looted 15 rations, 1 gift (a die a warrior: 1 to 4 that many rations, 5 a gift, 6 nothing)

**11. The player taps END TURN**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the hunt; the die bags one ration per hunter at 2, two at 4, three at 6"
- Status: "Waiting for a D6 roll"

**12. The dice come up 4**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The hunt"
  - **Hunting** needs 2 / 4 / 6 for one, two, three per hunter [4] two per hunter: 12 rations bagged, 14 men ate (2 from the stores)
    - *Roll a D6 for the hunt; the die bags one ration per hunter at 2, two at 4, three at 6* / Result: [4] two per hunter
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Hunting** needs 2 / 4 / 6 for one, two, three per hunter [4] two per hunter: 12 rations bagged, 14 men ate (2 from the stores)

Rail's one line at bottom-1: **Hunting** needs 2 / 4 / 6 [4] two per hunter: 12 rations bagged, 14 men ate (2 from the stores)

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

- Ask: "Roll 3 D6 for the natives' reaction; 5 or less keeps them calm"
- Status: "Waiting for a roll of 3 D6"

**2. The dice come up 6, 6, 6**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Native reaction** [6 6 6] distance to port +2, policy 3 +3 = 18 hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; 5 or less keeps them calm* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**3. The dice come up 6**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The natives' nerve"
  - **Fight** [6] hostile; nerve 6 × 5 askaris ÷ policy 3 = 10, more than 8 warriors: the natives hide
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide* / Result: [6] 6 × 5 ÷ 3 = 10: the natives hide
  - **Native reaction** [6 6 6] distance to port +2, policy 3 +3 = 18 hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; 5 or less keeps them calm* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Native reaction** [6 6 6] distance to port +2, policy 3 +3 = 18 hostile: 18 on the dice, over the target of 5
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

- Ask: "Roll 3 D6 for the natives' reaction; 5 or less keeps them calm"
- Status: "Waiting for a roll of 3 D6"

**2. The dice come up 6, 6, 6**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Native reaction** [6 6 6] distance to port +2, policy 3 +3 = 18 hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; 5 or less keeps them calm* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**3. The dice come up 1**

Dice panel at bottom-1's edge:

- Ask: "Roll 2 D6 for surprise; 3+ and the expedition is ready"
- Status: "Waiting for a roll of 2 D6"
- So far (newest first):
  - **Fight** [1] hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 8 warriors: the natives attack
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** [6 6 6] distance to port +2, policy 3 +3 = 18 hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; 5 or less keeps them calm* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**4. The dice come up 1, 1**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the natives' strike; 8 warriors ÷ the die askaris fall"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Fight** [1 1 1] hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 8 warriors: the natives attack; surprise 1 + 1 = 2, under policy 3: the expedition is surprised
    - *Roll 2 D6 for surprise; 3+ and the expedition is ready* / Result: [1 1] 1 + 1 = 2: surprised
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** [6 6 6] distance to port +2, policy 3 +3 = 18 hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; 5 or less keeps them calm* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**5. The dice come up 1**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 on the consequences of defeat; 1 killed, 2 prisoner, 3 escapes alone, 4 a musket and rations, 5 and 6 survival rolls"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll a D6 for the natives' strike; 8 warriors ÷ the die askaris fall* / Result: [1] 8 ÷ 1: 5 askaris fall
  - *Roll 2 D6 for surprise; 3+ and the expedition is ready* / Result: [1 1] 1 + 1 = 2: surprised
  - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** [6 6 6] distance to port +2, policy 3 +3 = 18 hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; 5 or less keeps them calm* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile

**6. The dice come up 2**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "On the consequences of defeat"
  - **Defeat** [2] defeat 2: the explorer is held prisoner
    - *Roll a D6 on the consequences of defeat; 1 killed, 2 prisoner, 3 escapes alone, 4 a musket and rations, 5 and 6 survival rolls* / Result: [2] held prisoner
  - **Fight** [1 1 1 1] hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 8 warriors: the natives attack; surprise 1 + 1 = 2, under policy 3: the expedition is surprised; the natives strike: 8 warriors ÷ 1 = 8, all 5 askaris fall; every askari is dead: defeat
    - *Roll a D6 for the natives' strike; 8 warriors ÷ the die askaris fall* / Result: [1] 8 ÷ 1: 5 askaris fall
    - *Roll 2 D6 for surprise; 3+ and the expedition is ready* / Result: [1 1] 1 + 1 = 2: surprised
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 3: more than the 8 warriors and they hide* / Result: [1] 1 × 5 ÷ 3 = 1: the natives attack
  - **Native reaction** [6 6 6] distance to port +2, policy 3 +3 = 18 hostile: 18 on the dice, over the target of 5
    - *Roll 3 D6 for the natives' reaction; 5 or less keeps them calm* / Result: [6 6 6] 6 + 6 + 6 = 18: hostile
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Native reaction** [6 6 6] distance to port +2, policy 3 +3 = 18 hostile: 18 on the dice, over the target of 5
- bottom-1: **Fight** [1 1 1 1] hostile; nerve 1 × 5 askaris ÷ policy 3 = 1, not more than 8 warriors: the natives attack; surprise 1 + 1 = 2, under policy 3: the expedition is surprised; the natives strike: 8 warriors ÷ 1 = 8, all 5 askaris fall; every askari is dead: defeat
- bottom-1: **Defeat** [2] defeat 2: the explorer is held prisoner

Rail's one line at bottom-1: **Defeat** [2] defeat 2: the explorer is held prisoner

**7. The player taps END TURN**

**8. The other player (top-1) plays a turn in Europe and ends it; it is bottom-1's turn again**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for an escape; with −3: 1 killed, 2 prisoner, 3 escapes alone, 4 a musket and rations, 5 and 6 survival rolls"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - discarded $200

Lines added to the log (open log wording):

- top-1: discarded $200

Rail's one line at top-1: discarded $200

**9. The dice come up 6**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "An escape"
  - **Captivity** [6] escape 6 − 3 = 3: the explorer escapes alone
    - *Roll a D6 for an escape; with −3: 1 killed, 2 prisoner, 3 escapes alone, 4 a musket and rations, 5 and 6 survival rolls* / Result: [6] 6 − 3 = 3: escapes alone
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

- Ask: "Roll 3 D6 for the natives' reaction; 7 or less keeps them calm"
- Status: "Waiting for a roll of 3 D6"

**2. The dice come up 1, 1, 1**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The natives' reaction"
  - **Native reaction** [1 1 1] distance to port +2, policy 5 +5 = 3 not hostile: 3 on the dice, within the target of 7
    - *Roll 3 D6 for the natives' reaction; 7 or less keeps them calm* / Result: [1 1 1] 1 + 1 + 1 = 3: not hostile
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Native reaction** [1 1 1] distance to port +2, policy 5 +5 = 3 not hostile: 3 on the dice, within the target of 7

Rail's one line at bottom-1: **Native reaction** [1 1 1] +2 +5 = 3 not hostile: 3 on the dice, within the target of 7

Negotiation panel at bottom-1's edge:

- Heading: "(1) 8 warriors · (gifts icon) 20"
- Offer row: [−] "0" [+] [×1] and the button "Offer 0 gifts" / "Gifts × the larger of two dice must reach the warriors" (the count follows the offer: "Offer 4 gifts", "Offer 1 gift")
- "Give everything" / "All goods and animals but the men; the chief returns three dice of gifts"
- "Do not negotiate" / "Carry on with the turn"

**3. The player offers 4 gifts**

Dice panel at bottom-1's edge:

- Ask: "Roll 2 D6 for the offer of 4 gifts; the larger die times 4 must reach 8 warriors"
- Status: "Waiting for a roll of 2 D6"

**4. The dice come up 3, 5**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the price of food; in gifts, rations per gift"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Negotiation** [3 5] 4 gifts offered: the larger die 5 × 4 = 20, reaching 8 warriors: the chief is satisfied
    - *Roll 2 D6 for the offer of 4 gifts; the larger die times 4 must reach 8 warriors* / Result: [3 5] 5 × 4 = 20: the chief is satisfied

**5. The dice come up 3**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the price of bearers; in gifts each"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll a D6 for the price of food; in gifts, rations per gift* / Result: [3] 3 rations a gift
  - **Negotiation** [3 5] 4 gifts offered: the larger die 5 × 4 = 20, reaching 8 warriors: the chief is satisfied
    - *Roll 2 D6 for the offer of 4 gifts; the larger die times 4 must reach 8 warriors* / Result: [3 5] 5 × 4 = 20: the chief is satisfied

**6. The dice come up 3**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the price of guides; in gifts each"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll a D6 for the price of bearers; in gifts each* / Result: [3] 3 gifts each
  - *Roll a D6 for the price of food; in gifts, rations per gift* / Result: [3] 3 rations a gift
  - **Negotiation** [3 5] 4 gifts offered: the larger die 5 × 4 = 20, reaching 8 warriors: the chief is satisfied
    - *Roll 2 D6 for the offer of 4 gifts; the larger die times 4 must reach 8 warriors* / Result: [3 5] 5 × 4 = 20: the chief is satisfied

**7. The dice come up 3**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the price of askaris; in gifts each"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - *Roll a D6 for the price of guides; in gifts each* / Result: [3] 3 gifts each
  - *Roll a D6 for the price of bearers; in gifts each* / Result: [3] 3 gifts each
  - *Roll a D6 for the price of food; in gifts, rations per gift* / Result: [3] 3 rations a gift
  - **Negotiation** [3 5] 4 gifts offered: the larger die 5 × 4 = 20, reaching 8 warriors: the chief is satisfied
    - *Roll 2 D6 for the offer of 4 gifts; the larger die times 4 must reach 8 warriors* / Result: [3 5] 5 × 4 = 20: the chief is satisfied

**8. The dice come up 3**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The price of askaris"
  - **Trade** [3 3 3 3] the chief permits trade: 3 rations per gift, bearer 3, guide 3, askari 3
    - *Roll a D6 for the price of askaris; in gifts each* / Result: [3] 3 gifts each
    - *Roll a D6 for the price of guides; in gifts each* / Result: [3] 3 gifts each
    - *Roll a D6 for the price of bearers; in gifts each* / Result: [3] 3 gifts each
    - *Roll a D6 for the price of food; in gifts, rations per gift* / Result: [3] 3 rations a gift
  - **Negotiation** [3 5] 4 gifts offered: the larger die 5 × 4 = 20, reaching 8 warriors: the chief is satisfied
    - *Roll 2 D6 for the offer of 4 gifts; the larger die times 4 must reach 8 warriors* / Result: [3 5] 5 × 4 = 20: the chief is satisfied
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Negotiation** [3 5] 4 gifts offered: the larger die 5 × 4 = 20, reaching 8 warriors: the chief is satisfied
- bottom-1: **Trade** [3 3 3 3] the chief permits trade: 3 rations per gift, bearer 3, guide 3, askari 3

Rail's one line at bottom-1: **Trade** [3 3 3 3] the chief permits trade: 3 rations per gift, bearer 3, guide 3, askari 3

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

- Ask: "Roll 3 D6 for the natives' reaction; 7 or less keeps them calm"
- Status: "Waiting for a roll of 3 D6"

**2. The dice come up 1, 1, 1**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The natives' reaction"
  - **Native reaction** [1 1 1] distance to port +2, policy 5 +5 = 3 not hostile: 3 on the dice, within the target of 7
    - *Roll 3 D6 for the natives' reaction; 7 or less keeps them calm* / Result: [1 1 1] 1 + 1 + 1 = 3: not hostile
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Native reaction** [1 1 1] distance to port +2, policy 5 +5 = 3 not hostile: 3 on the dice, within the target of 7

Rail's one line at bottom-1: **Native reaction** [1 1 1] +2 +5 = 3 not hostile: 3 on the dice, within the target of 7

Negotiation panel at bottom-1's edge:

- Heading: "(1) 8 warriors · (gifts icon) 20"
- Offer row: [−] "0" [+] [×1] and the button "Offer 0 gifts" / "Gifts × the larger of two dice must reach the warriors" (the count follows the offer: "Offer 4 gifts", "Offer 1 gift")
- "Give everything" / "All goods and animals but the men; the chief returns three dice of gifts"
- "Do not negotiate" / "Carry on with the turn"

**3. The player offers 4 gifts**

Dice panel at bottom-1's edge:

- Ask: "Roll 2 D6 for the offer of 4 gifts; the larger die times 4 must reach 8 warriors"
- Status: "Waiting for a roll of 2 D6"

**4. The dice come up 1, 1**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 5: more than the 8 warriors and they hide"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Negotiation** [1 1] 4 gifts offered: the larger die 1 × 4 = 4, short of 8 warriors: the chief is insulted
    - *Roll 2 D6 for the offer of 4 gifts; the larger die times 4 must reach 8 warriors* / Result: [1 1] 1 × 4 = 4: the chief is insulted

**5. The dice come up 3**

Dice panel at bottom-1's edge:

- Ask: "Roll 2 D6 for surprise; 5+ and the expedition is ready"
- Status: "Waiting for a roll of 2 D6"
- So far (newest first):
  - **Fight** [3] hostile; nerve 3 × 5 askaris ÷ policy 5 = 3, not more than 8 warriors: the natives attack
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 5: more than the 8 warriors and they hide* / Result: [3] 3 × 5 ÷ 5 = 3: the natives attack
  - **Negotiation** [1 1] 4 gifts offered: the larger die 1 × 4 = 4, short of 8 warriors: the chief is insulted
    - *Roll 2 D6 for the offer of 4 gifts; the larger die times 4 must reach 8 warriors* / Result: [1 1] 1 × 4 = 4: the chief is insulted

**6. The dice come up 3, 3**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 to drive them off; the die × 6 killed over 2 warriors drives them off"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Fight** [3 3 3] hostile; nerve 3 × 5 askaris ÷ policy 5 = 3, not more than 8 warriors: the natives attack; surprise 3 + 3 = 6, not under policy 5: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall
    - *Roll 2 D6 for surprise; 5+ and the expedition is ready* / Result: [3 3] 3 + 3 = 6: not surprised
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 5: more than the 8 warriors and they hide* / Result: [3] 3 × 5 ÷ 5 = 3: the natives attack
  - **Negotiation** [1 1] 4 gifts offered: the larger die 1 × 4 = 4, short of 8 warriors: the chief is insulted
    - *Roll 2 D6 for the offer of 4 gifts; the larger die times 4 must reach 8 warriors* / Result: [1 1] 1 × 4 = 4: the chief is insulted

**7. The dice come up 1**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for prisoners; 5 askaris less the die; 6 takes none"
- Status: "Waiting for a D6 roll"
- So far (newest first):
  - **Fight** [3 3 3 1] hostile; nerve 3 × 5 askaris ÷ policy 5 = 3, not more than 8 warriors: the natives attack; surprise 3 + 3 = 6, not under policy 5: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall; morale 1 × 6 killed = 6, more than the 2 warriors left: the natives are driven off
    - *Roll a D6 to drive them off; the die × 6 killed over 2 warriors drives them off* / Result: [1] 1 × 6 = 6: the natives are driven off
    - *Roll 2 D6 for surprise; 5+ and the expedition is ready* / Result: [3 3] 3 + 3 = 6: not surprised
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 5: more than the 8 warriors and they hide* / Result: [3] 3 × 5 ÷ 5 = 3: the natives attack
  - **Negotiation** [1 1] 4 gifts offered: the larger die 1 × 4 = 4, short of 8 warriors: the chief is insulted
    - *Roll 2 D6 for the offer of 4 gifts; the larger die times 4 must reach 8 warriors* / Result: [1 1] 1 × 4 = 4: the chief is insulted

**8. The dice come up 6**

Dice panel at bottom-1's edge:

- Ask: "Roll 2 D6 to find the village; 5 or less finds it"
- Status: "Waiting for a roll of 2 D6"
- So far (newest first):
  - *Roll a D6 for prisoners; 5 askaris less the die; 6 takes none* / Result: [6] no quarter: none taken
  - **Fight** [3 3 3 1] hostile; nerve 3 × 5 askaris ÷ policy 5 = 3, not more than 8 warriors: the natives attack; surprise 3 + 3 = 6, not under policy 5: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall; morale 1 × 6 killed = 6, more than the 2 warriors left: the natives are driven off
    - *Roll a D6 to drive them off; the die × 6 killed over 2 warriors drives them off* / Result: [1] 1 × 6 = 6: the natives are driven off
    - *Roll 2 D6 for surprise; 5+ and the expedition is ready* / Result: [3 3] 3 + 3 = 6: not surprised
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 5: more than the 8 warriors and they hide* / Result: [3] 3 × 5 ÷ 5 = 3: the natives attack
  - **Negotiation** [1 1] 4 gifts offered: the larger die 1 × 4 = 4, short of 8 warriors: the chief is insulted
    - *Roll 2 D6 for the offer of 4 gifts; the larger die times 4 must reach 8 warriors* / Result: [1 1] 1 × 4 = 4: the chief is insulted

**9. The dice come up 6, 6**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "To find the village"
  - **Victory** [6 6 6] prisoners: a 6, no quarter, none taken; village 6 + 6 = 12, over 0 prisoners + policy 5 = 5: the village cannot be found
    - *Roll 2 D6 to find the village; 5 or less finds it* / Result: [6 6] 6 + 6 = 12: the village cannot be found
    - *Roll a D6 for prisoners; 5 askaris less the die; 6 takes none* / Result: [6] no quarter: none taken
  - **Fight** [3 3 3 1] hostile; nerve 3 × 5 askaris ÷ policy 5 = 3, not more than 8 warriors: the natives attack; surprise 3 + 3 = 6, not under policy 5: the expedition is ready; the volley: 5 askaris and the explorer fire, 6 warriors fall; morale 1 × 6 killed = 6, more than the 2 warriors left: the natives are driven off
    - *Roll a D6 to drive them off; the die × 6 killed over 2 warriors drives them off* / Result: [1] 1 × 6 = 6: the natives are driven off
    - *Roll 2 D6 for surprise; 5+ and the expedition is ready* / Result: [3 3] 3 + 3 = 6: not surprised
    - *Roll a D6 for the natives' nerve; the die × 5 askaris ÷ policy 5: more than the 8 warriors and they hide* / Result: [3] 3 × 5 ÷ 5 = 3: the natives attack
  - **Negotiation** [1 1] 4 gifts offered: the larger die 1 × 4 = 4, short of 8 warriors: the chief is insulted
    - *Roll 2 D6 for the offer of 4 gifts; the larger die times 4 must reach 8 warriors* / Result: [1 1] 1 × 4 = 4: the chief is insulted
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

- Ask: "Roll 3 D6 for the natives' reaction; 7 or less keeps them calm"
- Status: "Waiting for a roll of 3 D6"

**2. The dice come up 1, 1, 1**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The natives' reaction"
  - **Native reaction** [1 1 1] distance to port +2, policy 5 +5 = 3 not hostile: 3 on the dice, within the target of 7
    - *Roll 3 D6 for the natives' reaction; 7 or less keeps them calm* / Result: [1 1 1] 1 + 1 + 1 = 3: not hostile
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Native reaction** [1 1 1] distance to port +2, policy 5 +5 = 3 not hostile: 3 on the dice, within the target of 7

Rail's one line at bottom-1: **Native reaction** [1 1 1] +2 +5 = 3 not hostile: 3 on the dice, within the target of 7

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

- Ask: "Roll 3 D6 for the natives' reaction; 3 or less keeps them calm"
- Status: "Waiting for a roll of 3 D6"

**2. The dice come up 1, 1, 1**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The natives' reaction"
  - **Native reaction** [1 1 1] distance to port +2, policy 1 +1 = 3 not hostile: 3 on the dice, within the target of 3
    - *Roll 3 D6 for the natives' reaction; 3 or less keeps them calm* / Result: [1 1 1] 1 + 1 + 1 = 3: not hostile
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Native reaction** [1 1 1] distance to port +2, policy 1 +1 = 3 not hostile: 3 on the dice, within the target of 3

Rail's one line at bottom-1: **Native reaction** [1 1 1] +2 +1 = 3 not hostile: 3 on the dice, within the target of 3

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

- Ask: "Roll 3 D6 for the natives' reaction; 6 or less keeps them calm"
- Status: "Waiting for a roll of 3 D6"

**2. The dice come up 1, 1, 1**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The natives' reaction"
  - **Native reaction** [1 1 1] distance to port +2, policy 4 +4 = 3 not hostile: 3 on the dice, within the target of 6
    - *Roll 3 D6 for the natives' reaction; 6 or less keeps them calm* / Result: [1 1 1] 1 + 1 + 1 = 3: not hostile
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Native reaction** [1 1 1] distance to port +2, policy 4 +4 = 3 not hostile: 3 on the dice, within the target of 6

Rail's one line at bottom-1: **Native reaction** [1 1 1] +2 +4 = 3 not hostile: 3 on the dice, within the target of 6

**3. The player taps END TURN**

Dice panel at bottom-1's edge:

- Ask: "Roll a D6 for the hunt; the die bags one ration per hunter at 2, two at 4, three at 6"
- Status: "Waiting for a D6 roll"

**4. The dice come up 3**

Result panel at bottom-1's edge (five seconds, or OK):

- Title: "The hunt"
  - **Hunting** needs 2 / 4 / 6 for one, two, three per hunter [3] one per hunter: 6 rations bagged, 12 men ate (6 from the stores)
    - *Roll a D6 for the hunt; the die bags one ration per hunter at 2, two at 4, three at 6* / Result: [3] one per hunter
- [OK]

Lines added to the log (open log wording):

- bottom-1: **Hunting** needs 2 / 4 / 6 for one, two, three per hunter [3] one per hunter: 6 rations bagged, 12 men ate (6 from the stores)

Rail's one line at bottom-1: **Hunting** needs 2 / 4 / 6 [3] one per hunter: 6 rations bagged, 12 men ate (6 from the stores)

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

- bottom-1: **Disaster card** (card 26: no effect) not here: lake

Rail's one line at bottom-1: **Disaster card** (card 26: no effect) not here: lake

Move prompt at bottom-1's edge: "Natives here. Pick a hex to move into, or" [REMAIN]

**7. The player taps REMAIN**

Policy panel at bottom-1's edge:

- Heading: "(1) 8 warriors"
- [1] "Defensive stand" / "Stay put on guard: no hunting, research or trade, no leaving until next turn"
- [2] "Retreat" / "Back to the hex you came from; your marker here is removed"
- [3] "Show of force" / "Approach warily, muskets ready"
- [4] "Ignore them" / "Carry on as if they were not there"
- [5] "Friendly approach" / "Open hands and gifts"

## Not sampled

Text that exists but none of the samples above reaches. Ask wording is given where it is fixed.

- **Explored with moves left.** When a step explores a hex and the expedition can still move (mounted or by canoe), the result panel stays until the next step: title "Explored a veldt hex" (the terrain's name, "Explored a jungle mountain hex"), then "You have 1 MP: pick a hex to move into, or" `[END TURN]`, then the step's lines.
- **Further rounds of a fight**, when the volley does not settle it: "Roll a D6 for the natives' strike; 8 warriors ÷ the die askaris fall" (sampled in C4), "Roll a D6 to see if the askaris break; the die × 2 fallen over 5 and they run", "Roll a D6 for the askaris' strike; 3 askaris ÷ the die, plus one, warriors fall", "Roll a D6 to see if the natives break; the die × 4 fallen over 8 warriors drives them off" (the numbers follow the fight). Their results read "2 × 2 = 4: the askaris hold", "the askaris break and run", "they fight on", "the natives are driven off".
- **After a defeat**: "Roll a D6 on the survival table; 1 guide, 2 bearer, 3 askari, 4 camel, 5 horse, 6 canoe", and the rolls for what survives of each kind.
- **Giving everything to the chief**: "Roll 3 D6 for the chief's gifts in return; the total in gifts".
- **Poison**: "Roll a D6 for the chief's poison; 4+ means you shrug it off" (the number follows the modifiers).
- **Sickness** at the end of a turn: asks for the sick and the starving by the bunch, "for the sick explorer", "Roll a D6 for the starving explorer; 4+ and he falls sick".
- **Oasis**: "Roll a D6 for the oasis; an even roll finds it, if there is one to find".
- **Cataract by canoe**: "Roll a D6 for the canoes over the cataract; each point over 3 loses a canoe".
- **Cache**: "Roll a D6 for the cache; 1 or 2 and it has gone".
- **Specialties**: zoological or geological research; "Roll a D6 for the preaching; 1 jeers, 2 ignores, 3 listens, 4 applauds, 5 the witch doctor converts, 6 the chief"; "for the treatment".
- **A disaster card that applies**: its own dice ("for the doctor; 6 averts it", "for the toll; in gifts", "for the raiders; how many animals they are after", shots at an animal, "on the consequences of defeat; plus 2: ...").
- **Rivers met from a neighbour**: "for the water two rivers leave from; 1–2 lake, 3–4 swamp, 5–6 jungle-swamp", "for where the river comes from; a direction around the hex", "for where the river flows on to; a direction around the hex, rolled again until the river can go that way".
- **Other terrain**: "Roll a D6 for jungle in the mountain; 4 adds jungle"; a desert or jungle rolled beside the other becomes veldt ("desert, but veldt beside jungle").
- **The roll for first player** before the game: "Roll 4 D6 for first player; the highest total goes first", shown its own way at every seat.
- **Without physical dice** the table rolls for itself: no dice panel, no asks and no result panel; only the log lines and the rail's one line appear.
