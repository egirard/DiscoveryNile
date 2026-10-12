# Diagnostics, Issue Reporting, and Self-Repair: Capability Evaluation

Three earlier projects each built a piece of a diagnostic loop:

| Project | Capability | Loop closed by |
|---|---|---|
| dicecam | **Capture.** Save live inputs the algorithm got wrong so the algorithm can be improved offline. | A developer, later |
| Ashardalon | **Report.** A player presses a bug icon; a GitHub issue is filed with a screenshot and captures. | A developer, soon |
| istanbul (or a sibling) | **Repair.** A failure is detected, submitted to a helper that has an agent produce a fix, the fix is verified and deployed, and the live table reloads and replays the whole game on the corrected code. Players never notice. | The system, while the game is still being played |

They form a ladder. Each rung reuses the one below it, and each rung has design consequences for the platform that are cheap if chosen now and expensive if retrofitted. This document evaluates all three and lists the choices.

## The one property everything depends on

**The complete game is a recording, and the recording is the only input to the state.**

The template already has this ([state-and-persistence.md](state-and-persistence.md)): an append-only event stream, a deterministic reducer, seeded randomness committed in events. Every capability below is a consequence of protecting that property:

- Capture is cheap because the recording *is* the capture.
- A report is complete because attaching the recording attaches the whole game.
- Repair is possible because a reload replays the recording under new code.

What threatens the property, and the rules that protect it:

| Threat | Rule |
|---|---|
| State derived from wall-clock time, animation timing, or `Math.random()` | These never touch the reducer. Time enters as an event field (`createdAtMillis`) and is only displayed. |
| UI-only state that matters to the player (a half-staged trade, a selected card) lost on reload | Anything a player would miss after a reload is an **intent event** in the stream (jaipur's `tabletop/intent`). Purely cosmetic state (hover, scroll) is not. |
| Inputs from outside the stream: camera frames, dice recognition, AR poses, phone sensors | The **recognised result** is appended as an event; the **raw input** is captured alongside as a file keyed by that event's id. The reducer sees only the event. |
| A phone or second screen holding state the table does not | Phones send intents; only the host appends. Already the rule. |
| Reducer changes that make old recordings replay differently | Versioning policy, below. |

## Rung 1: Capture (dicecam)

**What it needs:** a place to send things and a habit of sending them. The template has the capture server and client ([diagnostics.md](diagnostics.md)).

**Design choices to add:**

1. **Raw-input sidecars.** For any project with recognition (camera, AR, dice), the recogniser writes the raw frame or sample to the capture server under the id of the event it produced. A misrecognition then arrives as a pair: what the algorithm saw and what it decided. That pair is the dicecam use case, and it is also a test fixture.
2. **Capture is always on in development and optional in production.** In production the client stays silent unless the player or an automatic trigger asks for a report (rung 2). Bandwidth and privacy both argue for this.
3. **Fixture promotion is a one-step tool.** `bun run fixture <session> <name>` copies a captured stream into `src/lib/game/fixtures/` and generates a unit test that replays it and asserts no diagnostics. A capture that cannot become a test in one command will not become one.

**Verdict:** enabled today, sidecars and the fixture tool are small additions.

## Rung 2: Report (Ashardalon)

Ashardalon's feedback button rendered the page with `html2canvas`, copied the image to the clipboard, and opened a pre-filled GitHub issue URL. It worked because a browser with a keyboard, a clipboard, and a GitHub login was in front of the player. A tabletop has none of those, so the same capability needs different plumbing.

**What a report must contain** to be actionable without a follow-up question:

| Item | Source | Already available |
|---|---|---|
| The full event stream and seed | `window.__TABLETOP__`-equivalent internal API | yes |
| Schema, reducer, and PRNG versions, build hash | constants, `__GIT_HASH__` | yes |
| Reducer diagnostics | `state.diagnostics` | yes |
| Screen geometry and seat layout | `screenGeometry`, layout | yes |
| A screenshot | `html2canvas` (Ashardalon), or an SVG/DOM serialisation, or the phone's camera | no |
| Recent client log | the capture client's queue, kept in a ring buffer | partial |
| Which seat reported and what they meant | the rail the icon was pressed on; an icon vocabulary for "wrong / stuck / ugly / other" | no |
| Free text | the reporting player's phone, if attached; otherwise the virtual keyboard | no |

**Design choices:**

1. **The report icon lives on each seat's rail**, rotated to that seat, like every other player-facing control. Pressing it captures everything above first, then asks the minimum: one icon for category. Text is optional and comes from the phone when there is one.
2. **Reports go to the helper, not to GitHub directly.** A table cannot hold a GitHub token and the URL-prefill trick cannot carry an event stream. The helper is a small authenticated service (the capture server grown up) that stores the bundle, creates the issue with a link to the bundle, and attaches the screenshot. The GitHub API cannot attach files to issues, so the helper hosts the bundle and links it, or commits it into a `reports/` branch.
3. **Automatic reports use the same path.** A reducer diagnostic in production, an uncaught error, a runtime invariant failure (conservation: every card in exactly one zone), or a fit-check failure at runtime files a report without a player pressing anything. These are the failures the repair rung acts on.
4. **Privacy by construction.** The stream contains hidden information. On a local table that is fine; on a networked game a report should carry the reporting seat's view plus the full stream only if the project's vision says so. Names players typed are the only personal data; the helper can hash them.
5. **Each report is replayable in one command.** `bun run replay <bundle>` opens the table at the bundle's final state under the current code. If a developer cannot see the bug in under a minute the report was not complete.

**Verdict:** enabled by a helper service and one visible slice (the rail icon). The helper is ordinary infrastructure and can be shared across projects.

## Rung 3: Repair (the live loop)

The loop, spelled out. The decided model (see "Decisions" below) is that the app detects a failure such as an assertion, reports the recorded game to the support server, and the server **registers a failing test case from the recorded steps first**. The fix then exists to turn that test green.

```
 app assertion fails ──► report: recorded stream + state ──► support server
                                                                  │
       players keep playing                                       ▼
       (or stare at a crash)                  register FAILING test from the recording
                                                                  │
                                                                  ▼
                                              agent fixes until the test passes
                                              (fix + scenario, commit contract)
                                                                  │
                                                                  ▼
                                              CI verifies → deploy per the merge policy
                                                                  │
 table notices new version ◄──────────────────────────────────────┘
       │
       ▼
 safe moment → reload → replay the whole stream under new code → same game, corrected
```

The failing test is the pivot. It is generated, not written: the recording is the arrange-and-act, the assertion that fired is the expect. Registering it before any fix means the repair is test-driven by construction, the test outlives the fix as a regression guard, and a fix the agent cannot make still leaves a red test for a person.

Every arrow is a design choice.

### 3.1 Detection

Already discussed under rung 2. The additional requirement is that detection be **precise enough to be worth an automatic fix**: a reducer diagnostic with the offending event id, an invariant with the values that violated it. A vague "something is wrong" report is a rung-2 report for a human.

### 3.2 The fix is a normal slice

The agent workflow already exists ([ai-agent-workflow.md](ai-agent-workflow.md)). The helper turns the bundle into an issue spec whose E2E section is *given*: "load this recording, assert no diagnostics, assert these values, screenshot". The captured stream becomes the fixture, the fixture becomes the scenario, and the commit contract does the rest. **Nothing about the contract is relaxed for a self-repair commit.** That is the safety property.

### 3.3 Versioning and replay across code changes

This is the hard part, and it is the reason to decide the policy now.

- **A fix to derivation** (scoring was wrong, a legal move was rejected, a display projection was off) replays cleanly: same events, better state. This is the common case and the one the loop is for.
- **A fix that changes what is legal** means some already-accepted events become illegal under the new reducer, or vice versa. Replay then produces a state the players did not see. Three policies exist and a project must pick one per fix:
  - **Heal:** replay under the new rules and accept the corrected state. Players see the board change. Honest, sometimes jarring.
  - **Grandfather:** the reducer keeps the old behaviour for events whose `reducerVersion` predates the fix. Players see nothing; the code carries history.
  - **Fork:** the table reports that this game cannot be continued and offers a rematch. Last resort.
  The reducer version stamp on every event exists so that grandfathering is possible; the template's `reduceOne` should dispatch on it once a project needs to.
- **A schema change** (a payload field renamed) needs an event migrator run before replay. Migrators are pure, tested, and live next to the reducer.
- **Replay must be fast.** A game is hundreds to a few thousand events; a reducer that replays them in well under a second keeps the reload invisible. If a project's reducer cannot, it snapshots state every N events and replays from the last snapshot, but the stream remains the source of truth.

### 3.4 Deployment and version discovery

- The build is already static and published to GitHub Pages with a hash marker. Add a **`version.json`** next to it (build hash, reducer and schema versions, timestamp).
- The table **polls `version.json`** on a slow interval, or the relay pushes a `deploy` message from the helper. Polling needs no new infrastructure and is enough.
- **Builds stay addressable by hash** (`/v/<hash>/`) so a client can roll back if replay under the new build produces diagnostics the old build did not. Retained PR previews already do this for pull requests; production needs the same.

### 3.5 The safe moment to reload

A reload mid-drag or mid-animation is visible. The table reloads only when:

- no intent is pending and no animation is running (both are knowable: intents are events, animations are declared);
- the relay has acknowledged the last publish, so phones will rejoin the same session;
- and, for the "players never know" standard, the new build's replay has been **dry-run in a hidden iframe** first and produced no diagnostics.

Phones reload on a relay message after the table has, and rejoin with the uid they keep in local storage. Seat assignments are events, so they survive.

### 3.6 Trust and the merge policy

The loop's value is speed; its risk is an agent's fix landing on a live table with no human in between. Options, in increasing trust:

1. **Human gate.** The agent opens the PR; a person merges. The table still self-updates afterwards. Most of the value, none of the risk.
2. **Contract gate.** Auto-merge if the verifier passes *and* the generated failing test now passes *and* no existing baseline changed. Baseline changes mean the fix touched something visible beyond the bug.
3. **Scoped auto-merge.** As above, but only for diffs confined to `src/lib/game/` and `src/lib/features/*/reducer.ts` (pure logic) with no UI changes.

The policy is **set per game instance**, not per repository, and the instance's build flavour is part of it: a debug build of the table may accept option 2 or 3 so that a development table repairs itself live, while a production build of the same game stays on option 1. The client sends its flavour and instance id with every report; the support server applies the matching policy. Nothing about the commit contract changes across policies.

**Verdict:** achievable, and most of the machinery is the commit contract and the replay property working together. The genuinely new pieces are the helper service, `version.json` polling with hash-addressed builds, the safe-moment reload, and the versioning policy. None of them is large; all of them are hard to add after the fact.

## Design choices, consolidated

| # | Choice | Needed for | State in template |
|---|---|---|---|
| 1 | Event stream is the only input to state; intents that matter are events | all | done, rule stated |
| 2 | Raw external inputs captured as sidecars keyed by event id | capture, report | to add when a project has recognition |
| 3 | Versions stamped on every event; reducer can dispatch on `reducerVersion`; schema migrators | repair | stamps done; dispatch and migrators to add with the first versioned fix |
| 4 | Capture server and fire-and-forget client | all | done |
| 5 | Ring-buffered client log included in reports | report | to add |
| 6 | One-command fixture promotion and one-command replay of a bundle | capture, report, repair | to add (`bun run fixture`, `bun run replay`) |
| 7 | Report icon per seat rail, icon-only category, optional text from the phone | report | one slice |
| 8 | Automatic reports on diagnostics, uncaught errors, invariant and fit failures | report, repair | one slice |
| 9 | Support server: stores bundles, registers the failing test, files issues, starts agent tasks, notifies deploys | report, repair | separate project per game, built from a shared core |
| 10 | Report → issue spec with a given E2E section; fix is a normal contract commit | repair | workflow exists; helper glue to add |
| 11 | `version.json`, slow polling, hash-addressed builds, rollback | repair | to add to CI and the app shell |
| 12 | Safe-moment reload: no pending intent, no animation, relay acked, dry-run replay clean | repair | one slice |
| 13 | Phones rejoin after a relay `deploy` message | repair | small addition to relay and hand page |
| 14 | Merge policy per game instance and build flavour; human gate by default, auto-merge allowed for debug tables | repair | CI and support-server setting to add |
| 15 | Runtime assertions and invariants (conservation, seat uniqueness) checked after every reduce; an assertion failure is the canonical repair trigger | report, repair | to add per game |
| 16 | Generated failing test from a report: recording as arrange-and-act, the fired assertion as the expect, registered before any fix | repair | support-server core to add |

## Suggested order, as slices

1. **Report icon on the rail** with the bundle assembled and sent to the capture server. Visible: the icon and a "sent" confirmation at the rail.
2. **Version badge and reload prompt.** The build marker becomes a badge that changes colour when `version.json` differs; tapping it reloads at a safe moment. Visible, and the safe-moment logic gets its scenario.
3. **Automatic report on a diagnostic**, shown as a small mark at the affected seat. Visible.
4. **Replay a bundle** (`?bundle=`) in E2E builds, giving reports a scenario path.
5. **Support server** for the game, built on the shared core: bundle store, failing-test registration, GitHub integration, agent trigger, per-instance merge policy.
6. **Silent reload** once the safe-moment logic and dry-run replay have soaked, enabled first on debug tables.

Each is a thin slice with an E2E scenario. Step 5 is the only one outside the game repository.

## Decisions

Recorded from the project owner, 28 September 2026:

- **The support server is project-specific.** Each game runs its own, but the bundle store, failing-test registration, issue filing, agent trigger, and deploy notification are generic and should live in a shared core that a game's server configures. The game-specific parts are the assertion vocabulary, the fixture and scenario generators, and the merge policy.
- **The merge policy is set per game instance**, and may be enabled only in debug builds. A development table can repair itself live; a production table keeps a human gate.
- **The general model:** app logic detects a failure such as an assertion, reports the recorded game state to the diagnostic system, the system registers a failing test case from the recorded repro steps, the back end corrects the failure, and the corrected logic is deployed and reloaded into the live client so the crashed app continues.

## Remaining question

- Which project holds the live-fix implementation? istanbul's tree has replay, version guard, and undo but no support server or reload trigger. Seeing it would sharpen 3.4 and 3.5.
