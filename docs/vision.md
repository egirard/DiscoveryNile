# Vision

> Template. Replace every `{{…}}` placeholder and delete this line. Keep the section headings; later documents and the AI coding agent refer to them.

## North star

{{One paragraph. What should it feel like to play `{{GAME}}` around a tabletop computer? Name the thing the physical game does well that the digital version must not lose.}}

## Experience principles

### The table is the board

The shared screen *is* the play surface. Public state lives on it, oriented so that every seat can read it. Players reach across it to act, exactly as they would with cardboard. Panels, menus, and dashboards are secondary and must never obscure the board.

### Every seat is a first-class player

Players sit on any side of the table. Player-facing elements rotate toward their seat; shared elements are legible from every direction. No seat is "the top of the screen". See [tabletop-ux.md](tabletop-ux.md).

### Icons before words

The interface communicates through iconography, layout, colour, and motion. Text is a last resort and, when used, faces the player it is for. Keyboards do not exist except as an on-screen keyboard oriented to one seat.

### Legal choices explain themselves

Selecting a piece shows what can be done with it and what it will cost. Disabled actions show why. The interface assists understanding but never recommends a move.

### Private information goes to the phone

{{Delete this section if the game has no hidden information.}} Anything a player must see and others must not (a hand of cards, a secret objective) is shown on that player's phone, joined by scanning the QR code at their seat. Public actions still happen on the table. See [multi-device.md](multi-device.md).

### Replay is part of the product

State is an append-only event stream reduced deterministically. Reloading the table, reconnecting a phone, or opening the same game in another browser reconstructs exactly the same position. See [state-and-persistence.md](state-and-persistence.md).

## Modes

| Mode | Where the game lives | Who writes events | Typical use |
|---|---|---|---|
| Local table | This browser's local storage | The table only | {{Default for most games}} |
| Table + phones | Local storage, shared over a WebSocket relay | The table; phones send intents | Games with hidden information, second screens, spectators |
| Networked | Firebase | Every joined client | Remote play |

{{Keep the rows the project supports; delete the others.}}

## Intended audience

{{Who sits around this table? A family with a 27" table at home? A game café with 55" tables? How many players, and what age range?}}

## Product values

- **Faithfulness:** outcomes follow the published rules of `{{GAME}}`.
- **Determinism:** randomness is seeded, versioned, and replayable.
- **Clarity:** public state and action consequences are understandable from any seat without reading.
- **Touchability:** every action is operable by touch with generous targets, and by mouse.
- **Recoverability:** reloads, restarts, and ordinary network interruptions never require manual reconstruction.
- **Reviewability:** each feature is delivered as a small vertical slice with a real browser journey and visual evidence.
- **Respect for the source:** rules are implemented; publisher artwork and trade dress are not copied.

## Measures of success

- {{A new player can take a seat and understand whose turn it is in under N seconds.}}
- {{N players can complete a full game on one table without a rules question the interface could have answered.}}
- Reloading the table reconstructs the same state from immutable history.
- {{No private information is visible on the shared table.}}
- All core flows fit without page scrolling at 27" and 55" table sizes and on a phone.
- Every rule, edge case, and end condition has deterministic unit coverage.

## Not the goal

{{List what this project deliberately does not do: expansions, AI opponents, accounts, matchmaking, chat, server-side anti-cheat, native apps…}}
