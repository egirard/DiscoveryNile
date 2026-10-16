# Architectural Overview

This document describes how a Tabletop project is structured and, more importantly, how it *grows*. The structure follows from one rule:

> **Every commit must include an E2E scenario that demonstrates a visible change in the application.**

[commit-contract.md](commit-contract.md) states the rule precisely and [e2e-test-guidelines.md](e2e-test-guidelines.md) covers the mechanics of the scenario. This document covers the consequences for how the code is shaped.

## Thin vertical slices, not layers

Because every commit must produce a visible, screenshot-verifiable change, there are **no infrastructure-only commits** and **no data-model-only commits**. The following kinds of patches do not exist in a Tabletop project:

- "Set up the state store."
- "Define the card / tile / token data structures."
- "Add the rules engine."
- "Build out the networking layer."

Instead, every commit is a **thin vertical slice** through the whole stack: a small amount of UI, the minimum state that UI observes, the minimum logic that produces that state, and an E2E scenario that walks through it.

```
              layered (NOT this)             vertical slices (this)

   UI      ┌─────────────────────┐        ┌──┬──┬──┬──┬──┬──┬──┐
           │        (later)      │        │  │  │  │  │  │  │  │
   State   ├─────────────────────┤        │  │  │  │  │  │  │  │
           │        (later)      │        │  │  │  │  │  │  │  │
   Logic   ├─────────────────────┤        │  │  │  │  │  │  │  │
           │   commit 3          │        │  │  │  │  │  │  │  │
   Data    ├─────────────────────┤        │  │  │  │  │  │  │  │
           │   commit 1, 2       │        │c1│c2│c3│c4│c5│c6│c7│
           └─────────────────────┘        └──┴──┴──┴──┴──┴──┴──┘
```

The finished application is the same either way. The difference is that in the slice model the application is *always* runnable, *always* demonstrable, and *always* covered by tests, from the very first commit.

## Rules

### 1. Data structures are defined only when the UI observes them

A field, type, event, or collection is added to the application **only** when a commit renders it or renders something derived from it. If the UI cannot show it, it does not exist yet.

Data structures are therefore frequently *incomplete* relative to the final design. That is expected. They are extended in later slices as more of them becomes visible.

### 2. Infrastructure is introduced in the slice that first needs it

The event store is introduced in the first commit that displays state that survives a reload. The Firebase backend is introduced in the first commit whose scenario opens a second browser context and expects convergence. Seat rotation is introduced in the first commit that shows something to two seats. The QR code and phone route arrive in the first commit whose scenario scans one.

Infrastructure is never introduced speculatively.

### 3. Every commit ships a user-visible increment plus its proof

The full anatomy is in [commit-contract.md](commit-contract.md). In short: UI change, only the state and logic it requires, unit tests for that logic, an E2E scenario with reviewed baselines and a generated walkthrough, and documentation.

### 4. Refactors ride along with a visible change

A pure refactor has no new visible behaviour and therefore no new scenario. Refactors are folded into the next slice that touches the affected code, so that slice's scenario and the existing suite exercise the refactored code. Large refactors are decomposed into several slices, each paired with a real increment. A refactor must leave every existing baseline unchanged; if it changes observable behaviour it is not a refactor and needs its own semantic assertion and reviewed screenshot change.

### 5. Slice ordering follows player value

The first slice is the smallest thing a player could see: typically the application shell with seats drawn around an empty table. Each subsequent slice is the next-most-valuable thing a player could see. The scenario numbers form a narrative of the product being built. [implementation-plan-guide.md](implementation-plan-guide.md) shows how to write that sequence down before starting.

## Runtime shape

The following is the shape every Tabletop project converges on. A project does not build it up front; it arrives slice by slice (rule 2). It is described here so slices head in the same direction.

```
┌──────────────────────────────── browser (table) ────────────────────────────────┐
│                                                                                  │
│   routes/                                                                        │
│     /            lobby: seats, QR codes, start                                   │
│     /table       the shared board (the main screen)                              │
│     /hand        a phone's private view for one seat                             │
│     /editor      the map editor, a developer's tool (docs/diagnostics.md)        │
│                                                                                  │
│   UI (Svelte components, per feature)                                            │
│        │ dispatch(intent)                          ▲ derived views per seat      │
│        ▼                                           │                             │
│   append(event) ────────► GameRepository ─────► events[] ──► reduce() ──► state  │
│                              │        ▲                          │               │
│                   ┌──────────┴──┐  ┌──┴──────────┐               │ publish       │
│                   │ local store │  │  Firestore  │ (optional)    ▼               │
│                   └─────────────┘  └─────────────┘         relay client          │
└──────────────────────────────────────────────────────────────────┬───────────────┘
                                                                   │ WebSocket
                                                          ┌────────┴────────┐
                                                          │  relay (dumb)   │
                                                          └───┬─────────┬───┘
                                                    intents ▲ │         │ ▼ views
                                                   ┌──────────┴───┐ ┌───┴──────────┐
                                                   │ phone /hand  │ │ second screen│
                                                   └──────────────┘ └──────────────┘
```

- **Events, not state, are stored.** The canonical record of a game is an ordered, append-only list of events. State is a deterministic projection of that list. See [state-and-persistence.md](state-and-persistence.md).
- **One repository interface, several backends.** The UI never knows whether events live in `localStorage` or Firestore. Firebase is always optional.
- **Phones and second screens attach through a relay.** The table stays the only writer; phones send intents, the table appends events and republishes. See [multi-device.md](multi-device.md).
- **Views are derived per seat.** The reducer produces the full state; selectors produce what each seat (and each phone) may see. The table never renders private information.
- **Routes are thin.** `/table` and `/hand` are two projections of the same events. Shared-table mode is not a second rules implementation.

## Structural consequences

Because slices must be cheap to add, the codebase is organised to make each one small.

### Feature-oriented layout

Code is grouped by **feature** (what a player sees), not by layer. See [project-structure.md](project-structure.md) for the full tree.

```
src/lib/
├── features/
│   ├── seats/        # seat rail, QR, join   + its events, reducer slice, selectors, tests
│   ├── board/
│   ├── market/
│   └── …
├── game/             # the reducer entry point, event envelope, PRNG, versions
├── repository/       # GameRepository interface, local backend, firebase backend
├── tabletop/         # seat geometry, rotation, physical sizing, virtual keyboard
└── ui/               # icons, primitives shared by ≥2 features (never speculative)
```

A new slice usually touches one feature directory, the reducer, and one scenario directory.

### One inspectable store

In development and E2E builds the game is exposed on `window.__TABLETOP__` with `getState()`, `getEvents()`, `getSeed()`, and `append()` so scenarios can assert on state programmatically and seed deterministically. It is not exposed in production builds.

### Stable test identities

Every interactive or informational element carries a `data-testid`. Seat-specific elements carry the seat id (`bottom-1`, `left-2`). Layout containers that must be fully visible carry `data-e2e-fit`; the root carries `data-e2e-layout`.

### Orientation from the first two-seat slice

Per [tabletop-ux.md](tabletop-ux.md), player-facing elements rotate toward their seat and shared elements are omnidirectional. This is part of whichever slice first shows content to more than one seat, not a layer added later.

## Working with an AI coding agent

This model is designed to be driven by an AI coding agent as well as by people. Each task given to the agent is one slice, and the agent's definition of done is the commit contract. A task names the visible change, not the infrastructure: "show four empty seats around the table", not "create the player model". See [ai-agent-workflow.md](ai-agent-workflow.md).

## Summary

| Layered development | Slice development (this template) |
|---|---|
| Build data model first | Define data only when the UI shows it |
| Infrastructure commits | Infrastructure arrives inside a feature slice |
| Tests added once UI exists | Every commit has an E2E scenario from commit one |
| App runnable "eventually" | App runnable and demonstrable after every commit |
| Commits grouped by layer | Commits grouped by player-visible feature |
