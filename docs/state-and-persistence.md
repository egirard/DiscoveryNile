# State and Persistence

Game state is stored in one of several places, chosen per project and sometimes per launch. Regardless of where it lives, it always has the same shape: **an append-only stream of events reduced deterministically into state.** This document defines that shape, the repository interface that hides the storage location, and the backends that implement it.

Three backends exist. **Firebase is always optional.** Most projects use the local backend alone; projects with phones add the relay; only projects that need several independent writers (remote play) add Firebase.

| Backend | Persists | Shares with phones / other browsers | Writers | Needs a server |
|---|---|---|---|---|
| Local | Yes, `localStorage` | No | This browser | No |
| Local + relay | Yes, `localStorage` | Yes, live | This browser; others send *intents* to it | A dumb WebSocket relay |
| Firebase | Yes, Firestore + local cache | Yes, live | Every joined client | Firebase project (emulators in tests) |

## Why events, not state

- **Replay.** Reloading the table, restarting the browser, reconnecting a phone, or opening the game in another browser all reconstruct the same position from the same events.
- **Determinism.** Given the same events and the same seed, every client derives the same state. Conflicts and bugs are reproducible from a saved stream.
- **Privacy by projection.** The full stream is available to every client; what each seat *sees* is a selector over the state. No second data model is needed for the phone.
- **Slices stay thin.** Adding a feature is adding an event type and a reducer case, both of which are exercised by that feature's scenario.

## The event envelope

Every event has the same envelope. The vocabulary of `type` and the shape of `payload` grow slice by slice.

```typescript
export const SCHEMA_VERSION = 1;   // shape of the envelope and payloads
export const REDUCER_VERSION = 1;  // semantics of reduce()

export interface GameEvent {
  id: string;              // `${actorUid}-${clientSeq padded to 8}` — idempotent retries
  type: GameEventType;     // 'seat/taken', 'round/started', 'cards/sold', …
  payload: Record<string, unknown>;
  actorUid: string;        // who appended it (table host uid or a phone's uid)
  clientSeq: number;       // per-actor monotonic counter, persisted locally
  createdAtMillis: number; // server timestamp when remote; local clock when pending
  schemaVersion: number;
  reducerVersion: number;
}
```

Rules:

- **Payloads carry stable IDs**, never display text. `cardId: 'ruby-3'`, not `card: 'Ruby'`.
- **Commit seeds, not outcomes.** A `round/started` event carries a seed; the reducer derives the shuffle, the deal, and every later draw from it. Never append "resolved" events whose values could disagree with the action that caused them.
- **The reducer owns legality.** An invalid, duplicate, stale, or incompatible event produces a diagnostic and leaves state untouched. It never partially mutates.
- **Versions guard replay.** A `schemaVersion` or `reducerVersion` the client does not understand is a compatibility error shown to the player, not a crash and not silently ignored.
- **Keep the vocabulary small.** Prefer one atomic event (`cards/exchanged` listing both taken and returned IDs) to several that must be interpreted together.

## The reducer

```typescript
export function reduce(events: readonly GameEvent[]): GameState;
export function reduceOne(state: GameState, event: GameEvent): GameState; // pure, total
```

- Pure and total: same input, same output, no exceptions for bad events (they become diagnostics in state).
- Randomness comes only from the seeded PRNG in `src/lib/game/random.ts`, keyed by the seed committed in an event, on named streams so that a rule added later does not shift earlier rolls. `Math.random()` and `Date.now()` do not appear in game logic.
- The reducer lives in `src/lib/game/` with per-feature cases in `src/lib/features/<feature>/reducer.ts`.
- Every reducer case has unit tests (see [unit-test-guidelines.md](unit-test-guidelines.md)).

## Selectors and views

```typescript
export function fullView(state: GameState): GameState;                  // for tests and the reducer
export function seatView(state: GameState, seat: Seat): SeatView;       // what the phone at that seat sees
export function tableView(state: GameState): TableView;                 // what the shared screen shows
```

The table renders `tableView`; a phone renders `seatView`. Neither has access to anything else. A scenario that reads `window.__TABLETOP__.getState()` sees the full state and asserts that the rendered views hide what they should.

## The repository interface

The UI talks to one interface. It does not know, and must not care, which backend is behind it.

```typescript
export type SyncStatus = 'offline' | 'syncing' | 'synced';

export interface GameRepository {
  append(type: GameEventType, payload: Record<string, unknown>): Promise<void>;
  subscribe(
    onEvents: (events: GameEvent[]) => void,
    onError: (error: Error) => void,
    onStatus?: (status: SyncStatus) => void
  ): () => void;
  disconnect(): Promise<void>;
  reconnect(): Promise<void>;
}
```

- `append` is optimistic: the event is delivered to subscribers immediately as *pending* and removed if the backend rejects it.
- `subscribe` delivers the complete ordered stream on every change, never a delta.
- Ordering: acknowledged events by `createdAtMillis` then `id`; pending events after them by `clientSeq` then `id`.
- The current sync status is rendered somewhere on the table as `[role="status"][data-status]` so scenarios can wait for `synced`.

## Backends

### Local (default)

`createLocalRepository(gameId, actorUid)`

- Events are stored in `localStorage` under `<project>:local:<gameId>:events:v1`; the current game id is stored so a reload resumes it.
- A stable per-browser host uid is generated once and stored locally. No authentication.
- Other tabs of the same browser on the same game receive appends through the `storage` event.
- No network SDK is loaded. No emulator is needed for tests.
- **Persists across restarts** of the browser and the table. This satisfies most projects.
- Only this browser can write. To let phones see and act, add the relay (next section); Firebase is not required.

### Local + relay

`createLocalRepository(gameId, actorUid)` plus `attachRelay(repository, relayUrl, gameId)`

- The table keeps the local backend as the single source of truth and the **only writer**.
- The table connects to a **relay**: a dumb WebSocket server that knows nothing about the game. It forwards JSON between a *host* and any number of *viewers* in the same session, caches the host's last publication for late joiners, and stamps each viewer's messages with the seat it claimed.
- The host publishes the full ordered event stream (or the per-seat view, for private information) whenever it changes. Viewers reduce it locally exactly as the table does.
- A viewer never appends. It sends an **intent** (`{ seat, action, … }`); the host validates it and appends the resulting event. Selection state therefore always lives on the table and the phone can never disagree with it.
- The relay is stateless beyond its cache; restarting it loses nothing because the host republishes on reconnect.
- The template ships a minimal relay (`scripts/relay.ts`, Bun, ~80 lines) for development and E2E. A deployed project points at a hosted relay (jaipur uses the ARViewer relay); the protocol is the boundary, so any relay that forwards JSON and stamps seats will do.
- Nothing in the relay path touches Firebase or requires authentication. Session ids are unguessable; that is the security model, matching the physical table.

### Firebase

### Selecting a backend

At load, in order:

1. `?local=1` forces the local backend; `?firebase=1` forces Firebase.
2. Otherwise, the project's configured default (`VITE_DEFAULT_BACKEND`, `local` unless set).
3. If Firebase is selected but no configuration is present, fall back to local and say so in the status area.
4. Independently, `?relay=<ws-url>` or `VITE_RELAY_URL` attaches the relay to whatever backend is active. Without a relay URL, phones cannot connect and QR codes are not shown.

`?new=1` abandons the current local game and starts a fresh one; `?gameId=XXXXX` opens that game (or, with `?new=1`, recreates it, which is how E2E pins the room code). `?seed=<n>` pins the seed committed in `game/created`. All three are one-shot: the application removes them from the URL once applied so a reload resumes the same game.

## Identity, trust, and privacy

- Anonymous uids attribute events; they do not prove identity.
- Every client can technically read the whole stream, including hidden information. The *ordinary* UI never renders another seat's private state. Server-authoritative hidden information is out of scope unless a project's trust requirement changes.
- Two valid-looking concurrent events are ordered canonically; the first valid at its position applies, the later stale one is ignored and surfaced as a diagnostic.
- Events may carry `expectedEventId`, `roundNumber`, and `turnNumber` so a client can explain a conflict promptly.

## Introducing this in slices

Per [architecture.md](architecture.md), none of this lands ahead of a visible need:

| First scenario that… | Introduces |
|---|---|
| shows anything that must survive a reload | envelope, `reduce`, local backend, `window.__TABLETOP__` |
| shows a shuffled or random outcome | seeded PRNG and a seed-carrying event |
| shows two seats | `seatView`, seat rotation |
| opens a phone | relay attachment, `/hand` route, QR (see [multi-device.md](multi-device.md)) |
| opens a second browser that must write independently of the table | Firebase backend, emulators, rules tests |
| reloads mid-game or disconnects a client | cache, cursor, status area, conflict diagnostics |
