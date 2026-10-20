#!/usr/bin/env bash
# The single verification entry point. Hooks and CI run this; so should you before pushing.
set -euo pipefail

if [[ -z "${IN_NIX_SHELL:-}" ]] && command -v nix >/dev/null 2>&1; then
  exec nix develop --command bun run verify:change
fi

git diff --cached --check
git diff --check
bun run check
bun run test:unit
if [[ -f firebase.json ]]; then bun run test:rules; fi
bun run test:e2e
bun run build

# Passed with nothing unstaged or untracked: the index is the tree verified. Recorded so that the push hook
# (scripts/verify-push.sh) need not run this again for a commit of it (prompt 61).
if [[ -z "$(git status --porcelain | grep -v '^[MADRC]  ')" ]]; then
  git write-tree >> "$(git rev-parse --git-dir)/verified-trees"
fi
