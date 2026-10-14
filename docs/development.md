# Development Environment

This document describes the environment a developer (or an AI coding agent) has when working on a project built from this template.

## Overview

- **Nix flake** (`flake.nix`) pins the toolchain so local machines, CI, and the agent runner match.
- **direnv** (`.envrc` containing `use flake`) activates the shell on entering the directory.
- **Bun** is the runtime, package manager, and script runner. `npm` and `yarn` are not used.
- **SvelteKit** with `@sveltejs/adapter-static` builds a static site of TypeScript, HTML, CSS, and JS for current Chrome.
- **Vite** is the dev server, pinned to port **3000** with `strictPort`. E2E scenarios run against the **production build** served by `vite preview` on port 4000, so on-demand compilation never reloads a page mid-scenario.
- **Vitest** runs unit tests; **Playwright** runs E2E scenarios against Chromium.
- **Husky** hooks run the verifier on every commit and push.

## The Nix flake

```nix
{
  description = "DiscoveryNile development environment";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };
  outputs = { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let pkgs = import nixpkgs { inherit system; };
      in {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [ bun git ] ++ lib.optionals useFirebase [ jdk ];
          shellHook = ''
            export XDG_CACHE_HOME="$PWD/.cache"   # keeps Playwright/Firebase downloads stable across invocations
          '';
        };
      });
}
```

Add `jdk` only when the project uses the Firebase emulators. Add other tools here, never with a global install.

## Getting started

1. Install Nix and enable flakes (`experimental-features = nix-command flakes` in `~/.config/nix/nix.conf`).
2. Install direnv and hook it into your shell (`eval "$(direnv hook bash)"`).
3. In the project directory: `direnv allow`.
4. `bun install --frozen-lockfile`
5. `bunx playwright install --with-deps chromium`
6. `bun run dev` and open `http://localhost:3000`.

Without direnv: prefix commands with `nix develop --command`, or enter the shell with `nix develop`.

## Scripts

| Script | What it does |
|---|---|
| `bun run dev` | Vite dev server on port 3000 (`--strictPort`, fails rather than moving), pointed at the local relay, the diagnostics capture server and the hosted dicecam engine unless `VITE_RELAY_URL`, `VITE_DIAG_URL` or `VITE_DICECAM_URL` say otherwise |
| `bun run build` | Static production build into `build/` |
| `bun run preview` | Serve the production build on port 4000 |
| `bun run check` | `svelte-check` type and template checking |
| `bun run test:unit` | Vitest, all unit tests |
| `bun run test:unit:watch` | Vitest in watch mode |
| `bun run build:e2e` | Production build with the fixed E2E environment (`VITE_E2E`, git hash, relay URL) |
| `bun run test:e2e` | `build:e2e`, then all Playwright scenarios against the built client and the relay |
| `bun run test:e2e:only` | Scenarios without rebuilding (iterating on a spec) |
| `bun run test:e2e -- --grep 003` | One scenario by number |
| `bun run test:e2e:update` | Regenerate baselines. **Review every image before committing.** |
| `bun run test:e2e:ui` | Playwright UI mode |
| `bun run test:e2e:report` | Open the last HTML report |
| `bun run test:rules` | Firestore rules tests against the emulator (Firebase projects only) |
| `bun run emulators` | Start the Firebase emulators for manual testing (Firebase projects only) |
| `bun run relay` | Minimal WebSocket relay for phones on port 3001, speaking the ARViewer session protocol the hosted relay speaks |
| `bun run diag` | Diagnostics capture server on port 3002 (see [diagnostics.md](diagnostics.md)) |
| `bun run diag:context` | What the table saw and did in the latest captured session: the last lines worded, and the game as its stream reduces |
| `bun run diag:reload` | Reload every table playing the latest captured session, so the game replays from its events on the code as it now is |
| `bun run verify:change` | Everything the hooks and CI run. See below. |

When the project uses Firebase, `test:e2e` and `test:rules` wrap their command in `firebase emulators:exec --project <project>-e2e --only auth,firestore "…"`.

## Ports

| Purpose | Port |
|---|---|
| Vite dev server | 3000 |
| Vite preview of the production build; E2E `baseURL` | 4000 |
| Relay (dev and E2E) | 3001 |
| Diagnostics capture server (dev only) | 3002 |
| Firestore emulator | 8186 |
| Auth emulator | 9200 |

`strictPort` is set everywhere so a busy port fails loudly instead of silently moving and breaking E2E.

## The verifier

`scripts/verify-change.sh` is the single entry point for "is this change acceptable". Hooks and CI call it; so should you before pushing.

```sh
#!/usr/bin/env bash
set -euo pipefail
if [[ -z "${IN_NIX_SHELL:-}" ]]; then
  exec nix develop --command bun run verify:change
fi
git diff --cached --check
git diff --check
bun run check
bun run test:unit
[[ -f firebase.json ]] && bun run test:rules
bun run test:e2e
bun run build
```

It re-executes itself inside the Nix shell if it is not already there. It runs the full E2E suite, not just the changed scenario, because a slice may change a baseline it did not intend to.

`.husky/pre-commit` and `.husky/pre-push` both contain `bun run verify:change`. Do not bypass them with `--no-verify`.

## Environment variables

| Variable | Purpose |
|---|---|
| `VITE_DEFAULT_BACKEND` | `local` (default) or `firebase` |
| `VITE_FIREBASE_*` | Public Firebase client configuration (six variables) |
| `VITE_USE_FIREBASE_EMULATORS` | `true` in E2E |
| `VITE_FIRESTORE_EMULATOR_HOST/PORT`, `VITE_FIREBASE_AUTH_EMULATOR_HOST/PORT` | Emulator addresses |
| `VITE_RELAY_URL` | WebSocket relay the table publishes to and phones join through: the local relay for dev and E2E, the hosted ARViewer relay (`wss://arviewer-relay.onrender.com/ws`) for the deployed table |
| `VITE_DICECAM_URL` | The dicecam engine the table loads as a worker for physical dice (see [dicecam.md](dicecam.md)): WebCamTool's hosted `dicecam/engine.js` for the deployed table and the dev server, `/dicecam-stub.worker.js` (a stand-in that the scenario speaks for) in E2E builds; unset, the table offers only the faces to tap |
| `VITE_DIAG_URL` | Diagnostics capture server (dev builds only; `bun run dev` defaults it to `http://127.0.0.1:3002`) |
| `VITE_GIT_HASH` | Build marker shown in the UI footer; `e2e-test-commit` in scenarios |
| `PUBLIC_BASE_PATH` | `/<repo>` or `/<repo>/pr<N>` at deploy time |

Playwright's `webServer.env` sets all of these to fixed values so scenarios never depend on a developer's shell.

## Coding agent environment

The agent runner is prepared by `.github/workflows/agent-setup-steps.yml` (rename per agent; GitHub Copilot requires `copilot-setup-steps.yml` with a job of the same name). It installs Nix, direnv, Bun, dependencies, and Chromium so `bun run verify:change` works. See [ai-agent-workflow.md](ai-agent-workflow.md).

## Troubleshooting

| Symptom | Fix |
|---|---|
| direnv does not load | `direnv status`, then `direnv allow` |
| `bun: command not found` | You are outside the Nix shell: `nix develop` |
| Port 3000 in use | Stop the other process; do not change the port |
| Playwright cannot find Chromium | `bunx playwright install --with-deps chromium` inside the shell |
| Chromium: `error while loading shared libraries: libnspr4.so` (fresh Ubuntu/WSL) | The browser downloaded but its system libraries did not: `sudo bunx playwright install-deps chromium` once, then rerun |
| Screenshots differ from CI | See "Determinism" in [e2e-test-guidelines.md](e2e-test-guidelines.md); fonts and GPU flags are pinned, never loosen tolerance |
| The dicecam says "No camera" in a scenario | Chromium's fake camera plays `tests/e2e/fixtures/dicecam-tray.y4m` ([dicecam.md](dicecam.md)); the path given to `--use-file-for-fake-video-capture` must be absolute and plain (no `..`), or Chromium silently offers no device |
| Firebase emulator will not start | `jdk` must be in the flake; check ports 8186 and 9200 |
