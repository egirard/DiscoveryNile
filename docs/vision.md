# Vision

## North star

Six people lean over a table and watch Africa fill in. Every hex that appears was earned by someone's dice, someone's guides, someone's rations; every blank hex is a dare. Playing *Source of the Nile* on cardboard means crayons, erasers, a procedure of a dozen die rolls per hex, and an organisation chart of counters that must be moved correctly every turn. The digital table keeps the thing the cardboard does best, a shared, growing, hand-drawn-feeling map that everyone can reach and argue over, and takes over the thing it does worst: the bookkeeping. The dice still roll in plain sight. The map still erases when an explorer dies.

## Experience principles

### The table is the board

The shared screen *is* the play surface. Public state lives on it, oriented so that every seat can read it. Players reach across it to act, exactly as they would with cardboard. Panels, menus, and dashboards are secondary and must never obscure the board.

### Every seat is a first-class player

Players sit on any side of the table. Player-facing elements rotate toward their seat; shared elements are legible from every direction. No seat is "the top of the screen". See [tabletop-ux.md](tabletop-ux.md).

### Icons before words

The interface communicates through iconography, layout, colour, and motion. Terrain, personnel, animals, supplies, cards and dice are icons. Text is a last resort and, when used, faces the player it is for. Keyboards do not exist except as an on-screen keyboard oriented to one seat.

### Legal choices explain themselves

Selecting an expedition shows where it can move this turn and at what risk of becoming lost. A purchase shows what it will carry. A policy toward natives shows what it allows and forbids. Disabled actions show why. The interface assists understanding but never recommends a move.

### The dice are public

Nearly every outcome in the game is a die roll, and the rules are written so that the table watches the roll. The application rolls from a seeded stream so that replay is exact, but every roll is shown as dice at the acting seat, with the modifiers that applied, so a player can follow the rule being resolved. Nothing is resolved silently.

### Replay is part of the product

State is an append-only event stream reduced deterministically. Reloading the table reconstructs exactly the same position, including the map. A game can be left overnight and continued, as the rules themselves anticipate. See [state-and-persistence.md](state-and-persistence.md).

## Modes

| Mode | Where the game lives | Who writes events | Typical use |
|---|---|---|---|
| Local table | This browser's local storage | The table only | Default, and the only mode in the first milestone |

The game has no hidden information: donations are face up by rule and the map is shared by rule. Phones and second screens are therefore not required and are not planned until a slice has a reason for them (a wall mirror of the map, say). The template's relay and hand route remain in the codebase for that day.

## Intended audience

A household or games club with a 27" or 55" table, two to six players (one explorer each, several explorers over the evening), who already own or have read the rules and want to play them without the bookkeeping. Ages that can read a hex map and weigh a risk, roughly ten and up. A single player exploring alone is supported because the rules support it.

## Product values

- **Faithfulness:** outcomes follow the published rules of *Source of the Nile* as pinned in [rules-reference.md](rules-reference.md); discrepancies are raised, not guessed.
- **Determinism:** randomness is seeded, versioned, and replayable.
- **Clarity:** public state and action consequences are understandable from any seat without reading.
- **Touchability:** every action is operable by touch with generous targets, and by mouse.
- **Recoverability:** reloads, restarts, and ordinary network interruptions never require manual reconstruction.
- **Reviewability:** each feature is delivered as a small vertical slice with a real browser journey and visual evidence.
- **Respect for the source:** rules are implemented; publisher artwork, the map's trade dress and the card illustrations are not copied.

## Measures of success

- A new player can take a seat, choose an explorer, and understand whose turn it is in under 30 seconds.
- Six players can complete an evening's game on one table without a rules question the interface could have answered, and without touching a rulebook for the procedure of mapping a hex.
- Reloading the table reconstructs the same state, including every generated hex, from immutable history.
- A full game (several expeditions, a death, a publication, a scored superlative) is playable end to end.
- All core flows fit without page scrolling at 27" and 55" table sizes.
- Every rule, edge case, and end condition has deterministic unit coverage, and every `RQ-n` in [rules.md](rules.md) is pinned by a test.

## Not the goal

- No AI opponents or advisors; the continent is the opponent.
- No accounts, matchmaking, chat, or remote play; the game lives on one table.
- No server-side anti-cheat; everyone at the table can see everything, as with cardboard.
- No reproduction of the original board, card art, or rulebook prose in the product.
- No expansions, variants, or house rules until the 1978 rules are complete; variants are a later milestone.
- No native apps; current Chrome on a table is the target.
