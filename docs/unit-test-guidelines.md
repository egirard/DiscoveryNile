# Unit Test Guidelines

Unit tests cover what E2E scenarios cannot cover exhaustively: the full legality matrix of a rule, every branch of a reducer case, geometry edge cases, and helpers. They run with Vitest in a fraction of a second and are part of every commit.

## What to unit test

| Code | Test |
|---|---|
| Reducer cases (`src/lib/features/*/reducer.ts`, `src/lib/game/`) | Every legal transition, every illegal one (produces a diagnostic and unchanged state), duplicates, stale events, version mismatches |
| Selectors (`seatView`, `tableView`) | Private information is absent from the wrong view; public counts are right |
| Seeded PRNG and shuffles | Same seed → same sequence; different seeds differ; distribution sanity |
| Rules helpers (legal moves, scoring, tie-breaks, end conditions) | The complete matrix from `docs/rules.md`, including the boundaries |
| Seat geometry (`src/lib/tabletop/`) | Rotation per edge, rail placement for 1…N seats, physical sizing for 27" and 55" |
| Room codes | Length, alphabet, unbiased sampling with a fake byte source, normalization |
| Repository ordering (`orderEventStream`) | Remote-before-pending, tie-breaks, deduplication |
| Firebase config reader | Missing variables produce a clear error |

Do not unit-test Svelte components' rendering; that is what scenarios are for. Pure functions extracted from components are fair game.

## Conventions

- Tests sit next to the code: `reducer.ts` ↔ `reducer.test.ts`.
- One `describe` per function; `it` names read as specs: `it('rejects a sale of fewer than two expensive goods')`.
- Build event fixtures with small factory helpers in `src/lib/game/test-fixtures.ts` so tests read as stories, not JSON.
- Fixed seeds. No `Math.random`, no `Date.now`, no timers.
- Every diagnostic the reducer can emit has at least one test that triggers it.
- When a rules question is resolved (a residual tie-break, an ambiguous edge case), the decision is recorded in `docs/rules.md` **and** pinned by a unit test in the same commit.

## Running

```sh
bun run test:unit          # once
bun run test:unit:watch    # watch mode
```

`vitest.config.ts` uses the `jsdom` environment only for files that need `localStorage`; everything else runs in `node`.

## Coverage

There is no numeric coverage gate. The gate is the commit contract: every new pure function has tests, and every reducer case has its legal and illegal paths tested. Reviewers check that, not a percentage.
