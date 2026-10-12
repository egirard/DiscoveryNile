# Tabletop Template

A starter template for **tabletop games**: browser games played on a large, flat, multi-touch screen with players seated on every side of the table. It fixes a pattern for building, testing, developing, and deploying such games so that each new project starts with the decisions already made.

The template is opinionated about one thing above all: **every commit ships a player-visible change proven by an end-to-end test.** Everything else in these documents follows from that.

## Using this template

1. Create a new repository from this template.
2. Replace the placeholders in [`docs/vision.md`](docs/vision.md) and write the game's rules summary in `docs/rules.md`.
3. Write the slice sequence in `docs/implementation-plan.md` using [`docs/implementation-plan-guide.md`](docs/implementation-plan-guide.md).
4. Choose the state backend(s) the game needs (see [`docs/state-and-persistence.md`](docs/state-and-persistence.md)).
5. Point your AI coding agent at [`AGENTS.md`](AGENTS.md) and hand it slice 001.

## Documentation

| Document | What it covers |
|---|---|
| [`docs/vision.md`](docs/vision.md) | Template for the per-project vision, principles, and non-goals |
| [`docs/tabletop-ux.md`](docs/tabletop-ux.md) | Hardware, seats and orientation, icon-first design, touch input, virtual keyboard |
| [`docs/architecture.md`](docs/architecture.md) | Thin vertical slices, feature layout, the runtime shape of the app |
| [`docs/state-and-persistence.md`](docs/state-and-persistence.md) | Event stream and reducer, repository interface, local and Firebase backends |
| [`docs/multi-device.md`](docs/multi-device.md) | Room codes, per-seat QR codes, phone hand controllers, additional browsers |
| [`docs/development.md`](docs/development.md) | Nix, direnv, Bun, SvelteKit, ports, scripts, hooks, troubleshooting |
| [`docs/project-structure.md`](docs/project-structure.md) | Canonical directory and file layout |
| [`docs/commit-contract.md`](docs/commit-contract.md) | What every commit must contain and how it is verified |
| [`docs/e2e-test-guidelines.md`](docs/e2e-test-guidelines.md) | Playwright scenarios, step helper, screenshots, generated walkthroughs |
| [`docs/unit-test-guidelines.md`](docs/unit-test-guidelines.md) | Vitest, what to unit test, determinism |
| [`docs/ci-and-deployment.md`](docs/ci-and-deployment.md) | GitHub Actions verification, GitHub Pages, retained PR previews |
| [`docs/diagnostics.md`](docs/diagnostics.md) | Capture server the table and phones send event streams, logs, and renders to during development |
| [`docs/self-repair-evaluation.md`](docs/self-repair-evaluation.md) | Evaluation of capture, player issue reporting, and live self-repair, with the design choices each needs |
| [`docs/ai-agent-workflow.md`](docs/ai-agent-workflow.md) | How an AI coding agent works in a project built from this template |
| [`docs/implementation-plan-guide.md`](docs/implementation-plan-guide.md) | How to write the slice sequence and per-slice issue specs |
| [`AGENTS.md`](AGENTS.md) | Agent-neutral instructions read by whichever coding agent the project uses |
| [`PROMPTS.md`](PROMPTS.md) | Verbatim record of the prompts that produced this template |

## Reference implementations

These documents distill patterns from three earlier projects:

- [egirard/Ashardalon](https://github.com/egirard/Ashardalon) — Nix + Bun environment, agent setup workflow, numbered E2E tests with screenshot galleries, per-slice issue specs.
- [egirard/jaipur](https://github.com/egirard/jaipur) — append-only event stream with deterministic reducer, swappable local / Firestore repository, tabletop route with per-seat QR codes and phone hand controllers.
- [anicolao/istanbul](https://github.com/anicolao/istanbul) — the step helper that generates scenario walkthroughs, the layout-fit assertion, the shared-table and private-phone scenario, and the verification contract.
- [egirard/dicecam](https://github.com/egirard/dicecam) — the local capture server the browser saves diagnostic output to.
