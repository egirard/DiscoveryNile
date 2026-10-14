# Instructions for coding agents

This file is agent-neutral. Whichever AI coding agent a project uses (GitHub Copilot, Claude Code, Codex, or another) is pointed here by a one-line agent-specific file:

- `.github/copilot-instructions.md` → "Read and follow `AGENTS.md`."
- `CLAUDE.md` → "Read and follow `AGENTS.md`."

Keep the agent-specific files to that one line so the instructions live in one place.

## Read first

1. [`docs/development.md`](docs/development.md) — the environment you are running in and the commands available.
2. [`docs/commit-contract.md`](docs/commit-contract.md) — what every commit must contain. This is not optional.
3. [`docs/e2e-test-guidelines.md`](docs/e2e-test-guidelines.md) — how to write the E2E scenario that every commit needs.
4. [`docs/architecture.md`](docs/architecture.md) and [`docs/tabletop-ux.md`](docs/tabletop-ux.md) — how the application is shaped and why.
5. [`docs/rules.md`](docs/rules.md) and [`docs/rules-reference.md`](docs/rules-reference.md) — the game's rules, the pinned reference that is the authority for them, and how to raise a discrepancy instead of guessing.
6. [`docs/implementation-plan.md`](docs/implementation-plan.md) — the slice you have been asked to build and the slices around it.

## The one rule

**Every commit is a thin vertical slice with a player-visible change and an E2E scenario that proves it.**

Do not:

- land infrastructure, data models, or "setup" without UI that uses them in the same commit;
- land UI against mock or hard-coded state;
- add a reducer or rules change without the browser proof that exercises it;
- skip, focus, or loosen a test to get a commit through;
- bypass the verifier with `--no-verify`;
- hand-edit generated scenario `README.md` files or regenerate screenshot baselines without visually inspecting them.

## Definition of done for a task

A task is one slice. It is done when all of the following are true:

- [ ] The player-visible change described in the task is implemented.
- [ ] Only the state, logic, and data that the change observes were added.
- [ ] Unit tests cover the new pure logic (reducer, rules, geometry).
- [ ] A new or extended numbered E2E scenario walks through the change with a programmatic verification at every step, and its baselines and generated README are committed.
- [ ] Existing E2E scenarios pass unchanged, or their baseline changes were intentional and reviewed.
- [ ] `bun run verify:change` passes from a clean tree.
- [ ] Any affected document under `docs/` is updated.

## Working conventions

- Use `bun`, never `npm` or `yarn`. Use `bunx playwright`, not a global install.
- Run inside the Nix shell (`nix develop --command …`) or with direnv active so tool versions match CI.
- Interact from seat **`bottom-1`** in E2E scenarios unless the scenario is specifically about another seat.
- Every element a test touches or asserts on has a stable `data-testid`. Seat-specific elements carry the seat id (`seat-rail-bottom-1`, `seat-join-left-2`).
- Prefer icons to text in the UI. When text is unavoidable it must face its player.
- Keep randomness behind the seeded PRNG so scenarios are deterministic.
- Do not contact production Firebase from any test. Tests use the local backend or the emulators.
- When a rule is unclear or sources disagree, add an `RQ-n` to `docs/rules.md`, implement the smallest interpretation, and cite it from the test and the commit message. Never silently pick a reading.
- Keep commits small. If a task turns out to need two visible changes, make two commits, each with its own scenario step or scenario.
- When the user reports something seen while playing on the dev server, read the diagnostics capture first (`bun run diag:context`, [docs/diagnostics.md](docs/diagnostics.md)): it holds every event, every ask for dice and every reading the dicecam judged, with the time. After a fix, `bun run diag:reload` reloads the table and the game replays from its events on the new code; read the capture again to see the result.

## When something is unclear

Prefer the interpretation that yields the smaller visible slice. If a design question would change what the player sees, state the assumption in the commit message and the scenario README rather than stopping.
