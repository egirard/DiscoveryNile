# Implementation Plan Guide

Before the first slice, a project writes `docs/implementation-plan.md`: the ordered sequence of thin vertical slices that will become the game, and the scenario map that will prove them. This guide describes how to write it. Jaipur's and Istanbul's plans are the models.

## Structure

```markdown
# <Game> implementation plan

## Objective
<One paragraph: the complete game as a sequence of independently playable slices.>

## Commit contract
<Link to docs/commit-contract.md. Do not restate it.>

## Fixed technical decisions
<Backend(s), modes, seat count, screen sizes, anything decided up front. Keep it short.>

## Event and state model (initial vocabulary)
<A small table of the events the first several slices will introduce, and what is derived by replay.>

## Scenario map
001-app-shell-and-seats
002-…
…

## Slice sequence
### 1. <Visible change>
- <what the player sees>
- <what is introduced to make that possible: events, reducer cases, helpers>
- Scenario 001-…: <what it proves>
- Unit tests: <what>

### 2. …

## Definition of complete
<What must be true for the project to be done.>
```

## Writing the slice sequence

1. **Start with the shell.** Slice 1 is always: the application loads, shows the table with the seats drawn for the configured player count, the build marker, and a status area; verify, CI, hooks, and the retained preview all exist; scenario 001 proves it at table size. This is the only slice where "infrastructure" is most of the work, and it is still proven by a visible screen at a deployed URL.
2. **Then the smallest thing a player does.** Usually taking a seat.
3. **Then the smallest thing that changes the board.** Usually starting a round with a seeded setup.
4. **Then each action of a turn, one per slice**, in the order a player would encounter them.
5. **Then the turn cycle, round end, scoring, game end, rematch.**
6. **Then reconnect, replay, and conflict handling** as its own scenario, once there is enough game to disrupt.
7. **Then phones** if the game has hidden information, as the slice that first shows a QR code and a hand page.
8. **Then the responsive and accessibility pass** across 27", 55", and phone, with the fit check at every step.

Split a slice whenever its scenario would need more than roughly eight steps, but never split behaviour from its proof.

## Writing each slice

For each slice, answer in order:

- **What does the player see?** If the answer is nothing, it is not a slice.
- **From which seat?** The bottom seat unless the slice is about orientation.
- **What must exist for that to render?** Only that gets built.
- **What could go wrong that a screenshot cannot show?** Those are the unit tests.
- **What does the scenario walk through?** Write the step table now; it becomes the issue spec and later the generated README.

## Scenario numbering

The scenario map in the plan is the intent. Numbers are assigned when slices land and are never reused or renumbered. If a slice is dropped, its number is skipped. If a slice grows into two, the second takes the next free number and the plan is updated.

## Keeping the plan current

The plan is a living document. When a slice lands, tick it. When an assumption changes (a backend is added, a mode dropped), update the fixed decisions. When a rules question is resolved, it goes into `docs/rules.md` and the unit tests, and the plan links to it. An agent starting a slice reads the plan first, so it must reflect reality.
