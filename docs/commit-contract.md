# Commit Contract

Every implementation commit in a Tabletop project contains all of the following in one reviewable unit. This is the rule that everything else in the template is built to serve.

## The contract

1. **The smallest coherent player-visible capability.** Something a person at the table can see or touch that they could not before.
2. **Only the events, reducer cases, and state that capability requires.** No speculative fields, no unused event types.
3. **Unit tests** for every new pure function: reducer cases, rules, selectors, geometry, room codes.
4. **An E2E scenario, new or extended**, that drives the capability through the real UI from the bottom seat, with a programmatic verification and a zero-tolerance screenshot at every step. Baselines are generated, **visually inspected**, and committed. The walkthrough `README.md` is regenerated, not hand-edited.
5. **Every existing scenario still passes.** If a baseline changed, the change is intentional, reviewed, and explained in the commit message.
6. **Accessible, touch-sized, orientation-correct UI** for every affected state, per [tabletop-ux.md](tabletop-ux.md).
7. **Documentation updates** for any changed rule, event, invariant, or screen design.
8. **`bun run verify:change` passes** from a clean checkout of the commit.

A commit that satisfies only some of these is split until each part satisfies all of them, or is not landed.

## What this forbids

- Infrastructure-only, model-only, or "setup" commits. See [architecture.md](architecture.md).
- UI built against mock or hard-coded state.
- Rules or reducer logic without the browser proof that exercises it.
- Skipped (`test.skip`), focused (`test.only`), or retried tests.
- Loosened screenshot tolerance, masked regions, or per-test timeout overrides.
- Regenerating baselines to make CI green without understanding why they changed.
- Hand-edited scenario READMEs.
- `git commit --no-verify` or `git push --no-verify`.

## Refactors

A refactor has no new visible behaviour, so it has no new scenario. It rides in the next slice that touches the code and must leave every existing baseline byte-identical. If it changes anything observable it is not a refactor: it gets a semantic assertion and a reviewed baseline change.

## Commit messages

```
<slice number> <imperative summary of the visible change>

<What the player can now do or see. One or two sentences.>

Scenario: tests/e2e/NNN-<name>/  (new | extended: steps N–M)
Baselines changed: none | <scenario>: <reason>
Docs: <files touched> | none
```

The slice number is the scenario number the commit belongs to. Several commits may share a number when a slice is landed in parts; each part still satisfies the whole contract.

## Pull requests

A pull request is one or more contract-satisfying commits. The template's `.github/pull_request_template.md` restates the contract as a checklist; every box is ticked before review. CI runs the same verifier as the hooks and deploys a retained preview so reviewers can play the change. See [ci-and-deployment.md](ci-and-deployment.md).

## Reviewing

A reviewer reads the scenario README first. If the walkthrough does not make the change obvious, the slice is not thin enough or the scenario is not telling the story. Then the reviewer reads the diff to confirm nothing landed beyond what the walkthrough shows.
