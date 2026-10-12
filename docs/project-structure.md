# Project Structure

The canonical layout of a project built from this template. Directories arrive slice by slice (see [architecture.md](architecture.md)); this is where they go when they do.

```
<project>/
├── .envrc                          # `use flake` — direnv activates the Nix shell
├── flake.nix / flake.lock          # pinned toolchain: bun, git (+ jdk when Firebase emulators are used)
├── package.json / bun.lock         # scripts and dependencies
├── AGENTS.md                       # agent-neutral instructions
├── CLAUDE.md                       # one line: read AGENTS.md
├── .github/
│   ├── copilot-instructions.md     # one line: read AGENTS.md
│   ├── pull_request_template.md    # commit-contract checklist
│   ├── ISSUES/                     # per-slice issue specs (see implementation-plan-guide.md)
│   └── workflows/
│       ├── ci-and-deploy.yml       # verify, build, deploy main + retained PR previews
│       └── agent-setup-steps.yml   # environment prep for the coding agent (name per agent)
├── .husky/
│   ├── pre-commit                  # bun run verify:change
│   └── pre-push                    # bun run verify:change
├── scripts/
│   ├── verify-change.sh            # the single verification entry point
│   ├── relay.ts                    # minimal WebSocket relay for phones (dev and E2E)
│   └── diag-server.ts              # diagnostics capture server (dev only, see docs/diagnostics.md)
├── docs/
│   ├── vision.md                   # filled-in from the template
│   ├── rules.md                    # implementation-oriented rules summary of the game
│   ├── implementation-plan.md      # slice sequence and scenario map
│   ├── assets.md                   # asset inventory and licences
│   ├── <screen>-ux.md              # per-screen design notes as screens appear
│   └── (the guideline documents from this template)
├── src/
│   ├── app.html                    # SvelteKit shell
│   ├── app.d.ts
│   ├── routes/
│   │   ├── +layout.ts              # prerender = true, ssr = false
│   │   ├── +page.svelte            # lobby
│   │   ├── table/+page.svelte      # shared board
│   │   └── hand/+page.svelte       # phone private view
│   └── lib/
│       ├── features/<feature>/     # UI + events + reducer slice + selectors + unit tests
│       ├── game/                   # reduce(), event envelope, versions, seeded PRNG
│       ├── diagnostics/            # fire-and-forget client for the capture server
│       ├── repository/             # GameRepository, local backend, relay attachment, firebase backend, selection
│       ├── tabletop/               # seats (edge + index), rotation, physical sizing, virtual keyboard, QR
│       └── ui/                     # icons and primitives used by ≥2 features
├── static/
│   ├── manifest.webmanifest
│   ├── icons/                      # SVG iconography
│   └── art/                        # illustrated assets listed in docs/assets.md
├── tests/
│   ├── e2e/
│   │   ├── helpers/
│   │   │   ├── test-step-helper.ts # step(), fit check, journal, README generation
│   │   │   ├── seats.ts            # take a seat from a given edge
│   │   │   └── phone.ts            # open a hand page in a second context
│   │   ├── 001-<scenario>/
│   │   │   ├── 001-<scenario>.spec.ts
│   │   │   ├── README.md           # generated walkthrough — never hand-edited
│   │   │   └── screenshots/        # committed baselines
│   │   └── …
│   └── rules/                      # Firestore rules tests (only when Firebase is used)
├── playwright.config.ts
├── vite.config.ts
├── vitest.config.ts
├── svelte.config.js
├── tsconfig.json
├── firebase.json / .firebaserc / firestore.rules   # only when Firebase is used
└── PROMPTS.md                      # optional: verbatim prompt log, as in this template
```

## Naming

- Files and directories: `kebab-case`. Svelte components: `PascalCase.svelte`.
- Scenario directories: `NNN-short-kebab-name`, numbered sequentially and never renumbered.
- Test IDs: `kebab-case`, seat-specific ones carry the seat id (`seat-rail-bottom-1`).
- Events: `noun/verb-past` (`seat/taken`, `round/started`, `cards/sold`).
- Local storage keys: `<project>:<scope>:<id>:<thing>:v<N>`.

## What does not go in the repository

- Service-account credentials, private keys, Firebase CLI tokens, production data.
- `node_modules`, `build`, `test-results`, `playwright-report`, `.firebase/cache`, `diagnostics/`.
- Screenshots that were not visually reviewed.
