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
