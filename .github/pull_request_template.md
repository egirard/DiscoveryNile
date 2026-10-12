## What the player can now see or do

<!-- One or two sentences. If you cannot write this, the change is not a slice. -->

## Scenario

- Scenario: `tests/e2e/NNN-<name>/` (new | extended: steps N–M)
- Baselines changed: none | `<scenario>`: <reason>

## Commit contract (all required — see docs/commit-contract.md)

- [ ] Player-visible change, nothing beyond what its scenario shows
- [ ] Only the events, reducer cases, and state that change observes
- [ ] Unit tests for every new pure function
- [ ] New or extended numbered scenario; every step has verifications
- [ ] Baselines generated on Linux, **visually reviewed**, committed
- [ ] Scenario `README.md` generated, not hand-edited; `tests/e2e/README.md` updated
- [ ] All existing scenarios pass; any baseline change is intentional and explained
- [ ] UI is touch-sized, icon-first, and oriented per seat (docs/tabletop-ux.md)
- [ ] Docs updated for any changed rule, event, invariant, or screen
- [ ] `bun run verify:change` passes from a clean tree

Closes #
