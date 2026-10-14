# Diagnostics Capture

A tabletop computer has no developer tools you can open while people are playing, a phone attached over the relay has none at all, and a bug that appears after forty turns cannot be reproduced by hand. The **diagnostics capture server** gives the application somewhere to put what you would otherwise want to see in a console: event streams, state dumps, console errors, relay traffic, geometry, rendered canvases.

The pattern comes from [egirard/dicecam](https://github.com/egirard/dicecam), where a small PUT server on the developer's machine let the browser save captured camera frames and analysis output to disk for later study.

## The server

`scripts/diag-server.ts` is a Bun HTTP server (`bun run diag`, port 3002 by default) that writes into `./diagnostics/<session>/`:

| Method and path | Effect |
|---|---|
| `PUT /diag/<session>/<name>` | Write the request body to `diagnostics/<session>/<name>` |
| `POST /diag/<session>/log` | Append one timestamped JSON line to `diagnostics/<session>/log.ndjson` |
| `GET /diag/<session>/?suffix=.json` | List the session's files |
| `GET /diag/<session>/<name>` | Read a file back |
| `GET /health` | Readiness |

Names are restricted to `[A-Za-z0-9._-]`; it never writes outside its directory. CORS is open because the table, the phone, and the server are on the same LAN and nothing here is sensitive. `diagnostics/` is git-ignored.

## The client

`src/lib/diagnostics/diag.ts` is inactive unless a server URL is configured **and** the build is a dev or E2E build. Production builds never send anything.

```typescript
import { configureDiagnostics, log, snapshot, put, canvas } from '$lib/diagnostics/diag';

configureDiagnostics({ session: game.gameId });   // reads ?diag-server=… or VITE_DIAG_URL

log('event/appended', event);                     // one line in log.ndjson
snapshot('events-after-diagnostic', game.events); // events-after-diagnostic.json
put('geometry.json', JSON.stringify(geometry));
await canvas('board-render', canvasElement);      // board-render.png
```

Calls are fire-and-forget and serialized; a missing server never affects the game. Window errors and unhandled rejections are logged automatically once configured.

## What to capture, by default

A project wires these in the slices that introduce the relevant feature:

| When | Capture |
|---|---|
| Every appended event | `log('event/appended', event)` |
| The reducer records a diagnostic | `snapshot('events-<n>', events)` so the exact stream that produced it can become a unit-test fixture |
| A relay message arrives or is sent | `log('relay/in' \| 'relay/out', message)` |
| The screen geometry is computed or changed | `put('geometry.json', …)` |
| A canvas is rendered for tracking or AR | `canvas('tracking-layer', el)` |
| A phone joins, leaves, or reconnects | `log('phone/…', { seat, uid })` |

## Turning a capture into a test

A captured `events-*.json` is an event stream. Drop it in `src/lib/game/fixtures/` and replay it:

```typescript
import stream from './fixtures/events-2026-09-27-ABCDE.json';
it('reproduces the stale-seat diagnostic from the table on 27 Sept', () => {
  expect(reduce(stream).diagnostics).toEqual([]);
});
```

This is the fastest route from "something odd happened on the table" to a red unit test.

## Using it

1. `bun run diag` on the development machine.
2. Open the table with `?diag-server=http://<dev-machine>:3002` (or set `VITE_DIAG_URL` in a dev build). Phones opened from that table's QR codes inherit the setting through the relay's published geometry message.
3. Play. Files accumulate under `diagnostics/<room code>/`.
4. Read `log.ndjson`, replay snapshots in unit tests, open canvases.

## On this table (DiscoveryNile)

Wired in for prompt 23 (PROMPTS.md), so that feedback on a moment of play comes with what the table saw and did. `bun run dev` points the table at the capture server on 3002 (and at the local relay and the hosted dicecam engine) unless the variables are set otherwise, so playing on the dev server is enough; production builds never send.

What the table writes to `diagnostics/<room code>/`:

| Line or file | When |
|---|---|
| `events/loaded` | the table opened a game: how many events it found |
| `event/appended` with the whole event | every event appended from then on |
| `events.json` | the whole stream, rewritten on every change: `reduce` it to stand where the table stood |
| `events-diagnostic-<n>.json` | the reducer refused an event: the stream that did it, to become a unit-test fixture |
| `dice/asked` | the table asked a seat for a throw: the prompt, the throws already made for the action, what lay in the tray |
| `dicecam/reading` | the dicecam judged a reading: the roll id, each die's face, confidence and place, and the verdict (`taken 5`, `lying there already`, `read once`, `1 of 2 wanted`) |
| `dicecam/rolling`, `dicecam/status`, `dicecam/error` | the engine saw the dice move; the camera or the engine changed state; the engine failed |
| `window/error`, `window/unhandledrejection` | the page broke |

Read it back with `bun run diag:context`: the latest session's last lines, each worded, and the game as the captured stream reduces to (the turn, what is asked, the latest lines of the turn's log, any diagnostics). `--since 12:30` (a clock time today, or an ISO time) narrows to the moment; `--last 100` widens; `--list` names the sessions; a room code picks one. When a report says "the hunt die was ignored just now", that is the first thing to run.

**Reloading the table from here** (prompt 26). A table that sends to the capture also listens to it: `GET /diag/<session>/events` is a server-sent command stream, and `bun run diag:reload` (or a room code) posts `{ "type": "reload" }` to `/diag/<session>/command`, which every listening table answers with `location.reload()`. The game replays from its stored events on the code as it now is, and the capture shows the reload (`command`, then `events/loaded`). That is the loop for a fix made while people play: change the code, reload the table, read the capture again. Only dev builds listen, as only dev builds send. The dev server itself never reloads the page on its own (prompt 30): a change Vite cannot apply in place puts a "New code is ready" prompt on the page instead, so the reload happens when the player taps it or when `diag:reload` says so.

The capture server runs on the development machine; the hosted table at GitHub Pages cannot reach it, so a report from the hosted table has only the browser console (the `dicecam` lines are there too).

## In E2E

Scenarios do not use the diagnostics server; their evidence is the step journal, the screenshots, and the trace. Playwright's `trace: 'retain-on-failure'` already captures the console and network for a failed step. The diagnostics server is for the table in use, not for CI.

## Ports

| Purpose | Port |
|---|---|
| Diagnostics server | 3002 |

See [development.md](development.md) for the others.
