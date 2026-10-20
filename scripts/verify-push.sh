#!/usr/bin/env bash
# The push's verification (PROMPTS.md, prompt 61): the full `bun run verify:change`, unless the tip of every ref being
# pushed has a tree that a full run already passed (scripts/verify-change.sh records them in .git/verified-trees).
# A commit's tree is exactly what was verified, so an amend or a rebase, which change the tree, run it again.
# git gives the refs on stdin: <local ref> <local sha> <remote ref> <remote sha>, one line each.
set -euo pipefail

record="$(git rev-parse --git-dir)/verified-trees"
unverified=0
while read -r _local_ref local_sha _remote_ref _remote_sha; do
  [[ "$local_sha" =~ ^0+$ ]] && continue # a deletion
  tree=$(git rev-parse "$local_sha^{tree}")
  if [[ -f "$record" ]] && grep -qx "$tree" "$record"; then
    echo "verify-push: ${local_sha:0:7} has tree ${tree:0:7}, which bun run verify:change passed already; not run again"
  else
    unverified=1
  fi
done
if ((unverified)); then bun run verify:change; fi
