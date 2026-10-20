#!/usr/bin/env bash
# The commit's verification (PROMPTS.md, prompt 61): the whitespace check, the type check and the unit tests, then
# only the scenarios the commit touches (any staged file under tests/e2e/NNN-*/). The full verification, every
# scenario and the build, runs on push (scripts/verify-push.sh) and in CI: a slice may change a baseline it did not
# intend to, and the push is where that is caught. Run `bun run verify:change` before committing to have the push
# hook skip its run (the tree it passed is recorded).
set -euo pipefail

if [[ -z "${IN_NIX_SHELL:-}" ]] && command -v nix >/dev/null 2>&1; then
  exec nix develop --command bash scripts/verify-commit.sh
fi

git diff --cached --check
bun run check
bun run test:unit
if [[ -f firebase.json ]]; then bun run test:rules; fi

mapfile -t scenarios < <(git diff --cached --name-only --diff-filter=ACMR | sed -n 's#^tests/e2e/\([0-9][0-9][0-9]-[^/]*\)/.*#\1#p' | sort -u)
if ((${#scenarios[@]})); then
  echo "verify-commit: scenarios staged: ${scenarios[*]}"
  bun run build:e2e
  bun run test:e2e:only "${scenarios[@]/#/tests/e2e/}"
else
  echo "verify-commit: no scenario staged; every scenario runs on push"
fi
