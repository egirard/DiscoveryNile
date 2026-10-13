# CI and Deployment

> **DiscoveryNile:** `.github/workflows/verify.yml` runs the `verify` job on every push and pull request and, since 2026-10-12, a `deploy` job that publishes the verified build of `main` to GitHub Pages at <https://egirard.github.io/DiscoveryNile/> through the Pages deployment actions (`actions/upload-pages-artifact` and `actions/deploy-pages`; Settings → Pages → source: GitHub Actions). It differs from the template's design below in two ways: the retained PR previews and the `cleanup-pr-preview.yml` workflow are still **disabled**, and the build goes through the Pages artifact rather than a `gh-pages` branch. The hosted table uses the local backend and has no relay, so phones cannot take a seat from it yet. Everything else here still applies.

Every push and pull request is verified with the same script the Git hooks run, then built and deployed to GitHub Pages: `main` to the production URL, each pull request to a retained preview URL. The tracer bullet for a slice ends at a URL a reviewer can open on a table, not at a green check.

## Workflow: `ci-and-deploy.yml`

```yaml
name: Verify and deploy
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }
  workflow_dispatch:
    inputs:
      update_baselines:
        description: Generate Linux screenshot baselines and open a PR with them
        type: boolean
        default: false
permissions: { contents: write, pull-requests: write }
concurrency: { group: pages-${{ github.ref }}, cancel-in-progress: false }

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cachix/install-nix-action@v31
      - run: nix develop --command bun install --frozen-lockfile
      - run: nix develop --command bunx playwright install --with-deps chromium
      - run: nix develop --command bun run verify:change
      - if: failure()
        uses: actions/upload-artifact@v4
        with: { name: playwright-results, path: test-results/ }

  deploy:
    needs: verify
    if: >-
      inputs.update_baselines != true &&
      (github.event_name != 'pull_request' ||
       github.event.pull_request.head.repo.full_name == github.repository)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cachix/install-nix-action@v31
      - run: nix develop --command bun install --frozen-lockfile
      - id: target
        run: |
          if [[ "${{ github.event_name }}" == "pull_request" ]]; then
            echo "base=/${{ github.event.repository.name }}/pr${{ github.event.pull_request.number }}" >> "$GITHUB_OUTPUT"
            echo "dest=pr${{ github.event.pull_request.number }}" >> "$GITHUB_OUTPUT"
          else
            echo "base=/${{ github.event.repository.name }}" >> "$GITHUB_OUTPUT"
            echo "dest=" >> "$GITHUB_OUTPUT"
          fi
      - run: nix develop --command bun run build
        env:
          PUBLIC_BASE_PATH: ${{ steps.target.outputs.base }}
          VITE_GIT_HASH: ${{ github.event.pull_request.head.sha || github.sha }}
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          # … the other five VITE_FIREBASE_* secrets, only for Firebase projects
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: build
          destination_dir: ${{ steps.target.outputs.dest }}
          keep_files: true
      - if: github.event_name == 'pull_request'
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          message: |
            Preview: https://${{ github.repository_owner }}.github.io${{ steps.target.outputs.base }}/
```

### Verify

- Runs inside the Nix shell so tool versions match a developer's machine.
- Runs `verify:change`, which is check, unit, rules (if any), the **full** E2E suite, and build. Never shard a scenario's steps.
- Uploads `test-results/` (diff images and traces) on failure.

### Deploy

- Builds once with `PUBLIC_BASE_PATH` set to `/<repo>` for `main` or `/<repo>/pr<N>` for a pull request. SvelteKit's `paths.base` reads it; assets, client navigation, manifest URLs, and QR join URLs must all honour it.
- Publishes `build/` to the matching directory of the `gh-pages` branch with `keep_files: true`, so main deployments never remove PR previews and previews never remove each other.
- Posts (or updates) one sticky comment on the PR with the preview link.
- A separate small workflow on `pull_request: closed` deletes `pr<N>` from `gh-pages`.

### Fork safety

- Forked pull requests are verified but **not deployed**: they have no access to secrets, and the `if:` guards the deploy job.
- Never use `pull_request_target` for the build.
- Firebase browser configuration is public and is provided as repository secrets only for convenience; deployment credentials never are.

## Screenshot baselines on Linux

Text is rendered from one bundled typeface (`static/fonts/`, declared in `src/app.html`; see [assets.md](assets.md)), never from `system-ui`: the runner and a developer's machine resolve the generic families to different fonts, which left CI red on every panel with text from slice 028 until the font was bundled.

Baselines are compared on Linux runners. A developer on macOS cannot generate matching images locally. Instead:

1. Push the branch.
2. Run the workflow manually with `update_baselines: true` (or use the `update-baselines.yml` workflow if the project splits it out).
3. The job runs `bun run test:e2e:update`, commits the regenerated `screenshots/` and `README.md` files to the branch, and opens or updates a pull request.
4. **Review every changed image** in the PR before merging. CI never rewrites baselines silently on the normal path.

## Firebase projects

- The workflow needs `jdk` in the flake for the emulators; `verify:change` starts them via `firebase emulators:exec`.
- `firestore.rules` are deployed manually with `firebase deploy --only firestore:rules` by a maintainer, never from CI.
- Rules tests under `tests/rules/` must pass before a rules change is deployed.

## Coding agent runner

`agent-setup-steps.yml` (for GitHub Copilot the file and job must be named `copilot-setup-steps`) prepares the runner the agent works in: checkout, Nix with flakes, direnv allowed, Bun, `bun install --frozen-lockfile`, `bunx playwright install --with-deps chromium`. After it runs, `bun run verify:change` works and the agent can satisfy the commit contract. See [ai-agent-workflow.md](ai-agent-workflow.md).

## Deployment checklist for a new project

- [ ] Repository → Settings → Pages: source `gh-pages` branch, root.
- [ ] Actions permissions allow `contents: write` and `pull-requests: write`.
- [ ] `svelte.config.js` reads `PUBLIC_BASE_PATH` into `kit.paths.base`; `+layout.ts` sets `prerender = true` and `ssr = false`.
- [ ] `static/manifest.webmanifest` uses relative URLs.
- [ ] Firebase projects: six `VITE_FIREBASE_*` repository secrets; a `<project>-e2e` emulator project id in `.firebaserc`.
- [ ] First push to `main` deploys; the URL in `docs/vision.md` matches.
