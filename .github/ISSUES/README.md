# Slice issues

One file per slice from `docs/implementation-plan.md`, in the format described in [`docs/ai-agent-workflow.md`](../../docs/ai-agent-workflow.md). Create the GitHub issue with:

```sh
gh issue create --title "003: The table shows Africa with six seats" --body-file .github/ISSUES/003-africa-board-and-six-seats.md --label slice
```

| # | Issue | Scenario | Status |
|---|---|---|---|
| 001 | [App shell and seats](001-app-shell-and-seats.md) | `tests/e2e/001-app-shell-and-seats` | landed (template seed) |
| 002 | Phone takes a seat (no issue file; template seed) | `tests/e2e/002-phone-takes-a-seat` | landed (template seed) |
| 003 | [Africa board and six seats](003-africa-board-and-six-seats.md) | `tests/e2e/003-africa-board-and-six-seats` | **next** |
