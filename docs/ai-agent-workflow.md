# AI Agent Workflow

Projects built from this template are meant to be developed by an AI coding agent as much as by people. The specific agent (GitHub Copilot, Claude Code, Codex, or another) may differ per project, so the instructions are agent-neutral and the agent-specific glue is one line.

## Files

| File | Purpose |
|---|---|
| `AGENTS.md` | The instructions. Every agent is pointed here. |
| `CLAUDE.md` | `Read and follow AGENTS.md.` |
| `.github/copilot-instructions.md` | `Read and follow AGENTS.md.` |
| `.github/workflows/agent-setup-steps.yml` | Prepares the runner the agent works in. Copilot requires the file and job be named `copilot-setup-steps`; other agents may not need it. |
| `.github/ISSUES/NNN-<slice>.md` | One issue spec per slice, in the format below. |
| `.github/pull_request_template.md` | The commit contract as a checklist. |

When a project switches agents, only the one-line file and the setup workflow name change.

## A task is a slice

The unit of work given to the agent is **one slice**: one numbered entry from `docs/implementation-plan.md`, expanded into an issue spec. The agent's definition of done is the commit contract ([commit-contract.md](commit-contract.md)) and the checklist in `AGENTS.md`.

Task descriptions name the **visible change**, never the infrastructure:

| Say | Not |
|---|---|
| "Show four empty seat rails around the table" | "Create the seat model" |
| "Let the bottom seat take a seat and show its icon on the rail" | "Add seat/taken event and reducer" |
| "Show a QR code on each empty rail that opens the hand page" | "Implement phone connectivity" |

If a slice cannot be described as something a player sees, it is not a slice; fold it into the one that first needs it.

## Issue spec format

Each slice's issue lives in `.github/ISSUES/NNN-<slice>.md` and can be created on GitHub with `gh issue create --body-file`. The format:

```markdown
# NNN: <Title as the player sees it>

## User story
> As a player at the table, I can <do X> so that <Y>.

## Acceptance criteria
- [ ] <observable statement>
- [ ] <observable statement>

## Design
### Screen
<ASCII sketch or reference to docs/<screen>-ux.md; which seats see what; what rotates>
### Events (only those this slice observes)
| Event | Payload | Introduced or extended |
### State (only what the UI reads)
<fields added to GameState / SeatView / TableView>
### Test IDs
<the data-testid values this slice adds>

## Unit tests
- <function>: <cases>

## E2E scenario NNN-<name> (new | extends NNN, steps N–M)
| Step id | Action | Verifications |
|---|---|---|
| empty-table | goto /table/?new=1&gameId=ABCDE&seed=1234 | 4 rails visible; no seat taken; room code ABCDE |
| bottom-seat-taken | tap seat-join-bottom-1 | rail data-taken; rotate 0deg |

## Documentation
- <docs to update>

## Dependencies
- NNN (must be complete)

## Labels
`slice`, `<feature>`
```

The E2E table is the most important section: it tells the agent exactly which steps and verifications to write, and it is what the reviewer compares the generated README against.

## Running the agent

1. Ensure the previous slice's scenario passes on `main`.
2. Open (or assign) the issue for the next slice.
3. The agent works on a branch, satisfies the contract, and opens a pull request using the template.
4. CI verifies and deploys a preview. The reviewer reads the generated scenario README first, then the diff, then plays the preview on a table if the change is orientation-sensitive.
5. Merge. The scenario number is now part of the product's history.

## Guardrails the agent must respect

These are restated in `AGENTS.md`; they are the ones agents most often get wrong:

- Never add state, events, or infrastructure the slice's UI does not observe.
- Never build UI against mock data. Wire it to the reducer even when the reducer case is trivial.
- Never regenerate baselines without inspecting them, and never to make an unrelated scenario pass.
- Never hand-edit a generated README.
- Never loosen a test, add a retry, or bypass the verifier.
- Never contact production Firebase from a test.
- Prefer the smaller slice when the task is ambiguous, and state the assumption.

## Reviewing agent output

A reviewer's fastest check is: **does the scenario README tell the story the issue asked for, with the verifications the issue listed?** If yes, read the diff for anything beyond that story. If no, the pull request goes back with the specific missing step or verification named.
