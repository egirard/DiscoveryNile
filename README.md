# DiscoveryNile

A browser tabletop implementation of **Source of the Nile** (Ross W. Maker and David A. Wesely, Discovery Games, 1978) for a large, flat, multi-touch screen with players seated on every side of the table.

The project is built from [egirard/TabletopTemplate](https://github.com/egirard/TabletopTemplate) and keeps its pattern: thin vertical slices, an append-only event stream reduced deterministically, icon-first tabletop UX with per-seat orientation, and the template's central rule that **every commit ships a player-visible change proven by an end-to-end Playwright test.**

Game rules come from the pinned, private rules reference described in [`docs/rules-reference.md`](docs/rules-reference.md). It is the authority for every rules question: when code and the reference disagree, the reference wins and the discrepancy is raised, not guessed at.

## Status

Phase 1 (bootstrap): template imported, documentation filled in, rules reference vendored and pinned, implementation plan written. The seed from the template (scenarios 001 and 002) builds and passes. The first DiscoveryNile slice is **003** in [`docs/implementation-plan.md`](docs/implementation-plan.md), with its issue spec in [`.github/ISSUES/003-africa-board-and-six-seats.md`](.github/ISSUES/003-africa-board-and-six-seats.md).

## Getting started

```sh
direnv allow            # or prefix commands with: nix develop --command
bun install --frozen-lockfile
bunx playwright install --with-deps chromium
bun run dev             # http://localhost:3000/table/
bun run verify:change   # everything CI and the hooks run
```

See [`docs/development.md`](docs/development.md) for the environment, scripts and ports.

## Documentation

| Document | What it covers |
|---|---|
| [`docs/vision.md`](docs/vision.md) | What playing Source of the Nile on a table should feel like; principles, modes, non-goals |
| [`docs/rules.md`](docs/rules.md) | Implementation-oriented rules summary, implementation decisions, open rules questions (`RQ-n`) |
| [`docs/rules-reference.md`](docs/rules-reference.md) | The pinned rules reference: what it contains, precedence between its sources, how to raise a discrepancy |
| [`docs/rules-reference/`](docs/rules-reference/) | Vendored verbatim copies of the rules Markdown and the deck CSV at the pin |
| [`docs/implementation-plan.md`](docs/implementation-plan.md) | Fixed decisions, event vocabulary, scenario map, and the slice sequence |
| [`docs/assets.md`](docs/assets.md) | Asset inventory and licences |
| [`docs/tabletop-ux.md`](docs/tabletop-ux.md) | Hardware, seats and orientation, icon-first design, touch input, virtual keyboard |
| [`docs/architecture.md`](docs/architecture.md) | Thin vertical slices, feature layout, the runtime shape of the app |
| [`docs/state-and-persistence.md`](docs/state-and-persistence.md) | Event stream and reducer, repository interface, local and optional backends |
| [`docs/multi-device.md`](docs/multi-device.md) | Room codes, per-seat QR codes, phones and second screens (not used in the first milestone) |
| [`docs/development.md`](docs/development.md) | Nix, direnv, Bun, SvelteKit, ports, scripts, hooks, troubleshooting |
| [`docs/project-structure.md`](docs/project-structure.md) | Canonical directory and file layout |
| [`docs/commit-contract.md`](docs/commit-contract.md) | What every commit must contain and how it is verified |
| [`docs/e2e-test-guidelines.md`](docs/e2e-test-guidelines.md) | Playwright scenarios, step helper, screenshots, generated walkthroughs |
| [`docs/unit-test-guidelines.md`](docs/unit-test-guidelines.md) | Vitest, what to unit test, determinism |
| [`docs/ci-and-deployment.md`](docs/ci-and-deployment.md) | GitHub Actions verification; deployment (disabled for now) |
| [`docs/diagnostics.md`](docs/diagnostics.md) | Capture server the table sends event streams, logs, and renders to during development |
| [`docs/self-repair-evaluation.md`](docs/self-repair-evaluation.md) | Evaluation of capture, player issue reporting, and live self-repair |
| [`docs/ai-agent-workflow.md`](docs/ai-agent-workflow.md) | How an AI coding agent works in this project |
| [`docs/implementation-plan-guide.md`](docs/implementation-plan-guide.md) | How the slice sequence and per-slice issue specs are written |
| [`AGENTS.md`](AGENTS.md) | Agent-neutral instructions read by whichever coding agent the project uses |
| [`PROMPTS.md`](PROMPTS.md) | Verbatim record of the prompts that produced this project |

## Licence

MIT, see [`LICENSE`](LICENSE). The rules and card text of *Source of the Nile* are © 1978 Discovery Games and are used as game data; no publisher artwork is reproduced.
