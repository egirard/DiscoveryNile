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
| `GET /diag/<session>/events` | A command stream (server-sent events) that dev-build tables listen to |
| `POST /diag/<session>/command` | Send a command to every listener (`{ "type": "reload" }`), or, with `{ "type": "save", "target": "board", "data": … }`, write a source file: see "The map editor" below |
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
| `dice/consumed` | a throw entered the game (prompt 57): the seat, how the values came (`dicecam`, `tap`, `auto`), the engine's roll id, each die's face, place in the picture and confidence, the dice left lying, what the table ignored as the tray as it lay, whether the engine saw anything move since the last throw was taken, and what the throw is for (the held event, the ask's words, the stream, how many dice and which part of a gathered throw) |
| `dicecam/rolling`, `dicecam/status`, `dicecam/error` | the engine saw the dice move; the camera or the engine changed state; the engine failed |
| `window/error`, `window/unhandledrejection` | the page broke |

Read it back with `bun run diag:context`: the latest session's last lines, each worded, and the game as the captured stream reduces to (the turn, what is asked, the latest lines of the turn's log, any diagnostics). `--since 12:30` (a clock time today, or an ISO time) narrows to the moment; `--last 100` widens; `--list` names the sessions; a room code picks one. When a report says "the hunt die was ignored just now", that is the first thing to run.

**Watching the dice** (prompt 57). The user saw the table take a die it had already taken. Every throw consumed is a `dice/consumed` line now, and `bun run diag:dice` reads them back as a health report: how many throws and dice the capture holds by source, then every die that looks consumed twice. A die taken within a die's width (the table's own `MOVED_LESS_THAN`, 0.06 of the frame) of where a die taken before lay, while the engine saw nothing move in the tray since that throw was taken, is **RE-USED**, whatever face the engine read this time (a resting die read as another face is a misread; since prompt 58 the table's judge counts a changed face at an unmoved place as a throw only once the engine has seen the dice move, so a RE-USED line from a table on that code is a new finding, not the flicker); the same face at the same place after a throw is listed **to check** (a die that landed on its own spot, or not) within two minutes. `--all` reports every session, latest first; a room code picks one; `--since 12:30` narrows to the moment; `--list` prints every throw first. The command exits 1 when a die was re-used, so a loop or a cron can watch it. For the part of a capture written before the line existed (the LIVBV room has run since the 17th) the throws are rebuilt from the readings judged `taken …`, the `dice/asked` they answered, the `dice/rolled` appended after them (its `lay` says where the dice taken were) and the `dicecam/rolling` lines between; a `dice/rolled` with no reading before it was tapped or rolled by the table. Run over LIVBV on the 18th the report named six dice re-used in two episodes, each a resting die whose face flickered in the engine's reading: the pure reader is `src/lib/diagnostics/dice.ts`, unit-tested against that capture's excerpt (`fixtures/dice-reuse-2026-10-17.ndjson`), and scenario 041 plays the same case against a stand-in server: since prompt 58 the flicker is left alone there (the reading's verdict says "lying there already, 1 misread"), and the dice thrown after the engine saw them move are taken, the sixes landing on their own spots listed to check.

**Reloading the table from here** (prompt 26). A table that sends to the capture also listens to it: `GET /diag/<session>/events` is a server-sent command stream, and `bun run diag:reload` (or a room code) posts `{ "type": "reload" }` to `/diag/<session>/command`, which every listening table answers with `location.reload()`. The game replays from its stored events on the code as it now is, and the capture shows the reload (`command`, then `events/loaded`). That is the loop for a fix made while people play: change the code, reload the table, read the capture again. Only dev builds listen, as only dev builds send. The dev server itself never reloads the page on its own (prompt 30): a change Vite cannot apply in place puts a "New code is ready" prompt on the page instead, so the reload happens when the player taps it or when `diag:reload` says so.

**The map editor** (prompt 47). The board was transcribed from a photograph (`tools/mapfit/`, RQ-5) and some hexes were misread. `/editor/` on the dev server (`http://127.0.0.1:3000/editor/`; elsewhere open it with `?diag-server=http://<dev-machine>:3002`) is a tool of its own, apart from the table: the board's window north up as the table shows it (the land's bounding box, columns 2–25 and rows 1–36, no sea beyond it but an unmarked margin of about a hex for the names at the coast, prompt 53), the sea hexes inside the window drawn dark, with the pre-printed terrain, rivers, ports and names drawn by the same parts as the table's board (prompt 52: `art.ts`, `TerrainSymbols.svelte`, `BoardFeatures.svelte`), so the editor labels the map as the game does; a brush (the eight terrains, blank, sea) chosen and tapped onto hexes; the changes listed with a take-back each; and Save, which sends the whole board to the capture server as `POST /diag/map-editor/command` with `{ "type": "save", "target": "board", "changes": […], "data": <the board> }`. The server knows the file each target names (`board` is `src/lib/features/map/board.json`, under the checkout it runs in or `DIAG_SAVE_ROOT`), checks the data before writing (every hex keyed at its own place with a known terrain, every port on its hex, every river on land; `validateBoard` in `features/map/editor.ts`) and writes the file exactly as the transcription wrote it (`serialiseBoard`), so `git diff` shows the hexes changed and nothing else. The command is logged under `diagnostics/map-editor/` without its data. A port and a river hex stay land whatever the brush. Rivers are edited too (prompt 48): a river is chosen from a list (or added with "+ River"), the **course** tool adds a land hex at either end of its course with a tap (beside the inland end it extends the river, beside the mouth it becomes the new mouth; the first tap on an empty river places its mouth) or takes an end hex off, the **cataract** tool marks or unmarks a cataract on a hex of a course, and the river's name, the river it joins, its drainage number, its hexes off the map and whether it continues off the map are fields beside the list; Remove takes a river away unless another joins it. A river is listed among the changes with what changed in words ("named Benue River; +c4r6; cataract at c3r6", "added, 2 hexes", "removed"), with a take-back that puts the river back as it was saved. The **single hex editor** (prompt 49) under "Hex" shows the hex tapped with its six spokes, numbered as the dice give the directions, blue where a river leaves the hex; a tap on a spoke adds or clears that river edge and the map follows at once. As rivers are courses, the tap is a course edit: a spoke cleared takes the end hex off its river (a course running on through both hexes is refused, as is orphaning a tributary's junction); a spoke added extends the river whose course ends at either hex, else starts a tributary from a hex on a course (joining it), else a new river with its mouth at the hex tapped. A spoke **toward the sea** (prompt 51) makes the hex the mouth of the river that ends there, flowing out that way (its course turned round if this was the inland end, a junction given up): the river's optional `mouth` direction is written when the way out is not straight on from the second hex, and the board draws the river's reach into the sea that way (`HexBoard`); on a hex with no river it starts one, its mouth here, to be drawn inland from the coast. The hex editor also shows the hex's terrain, marked among the game's own terrain symbols (the brushes use them too), and a tap on a symbol changes it live. The server refuses a board whose rivers do not hold together (a course that jumps or crosses itself, a cataract off its course, a tributary whose first hex is not on the river it joins, a river with no hexes), and the editor says so before sending. Once the file is written the dev server offers the table its reload ("New code is ready"), and the new board applies to games in play when they reload; a game whose events led through a changed hex replays on the new terrain. `tools/mapfit/build.py` regenerates `board.json` from scratch and would undo these corrections: carry them into its hand transcription before running it again.

**On WSL2** (prompt 50): the server listens on the IPv4 wildcard (`DIAG_HOST`, default `0.0.0.0`), as does the relay (`RELAY_HOST`). Bun's default is the IPv6 wildcard, and Windows' localhost forwarding into WSL2 relays only IPv4 sockets, so a table opened in a Windows browser could reach Vite (bound to `127.0.0.1`) but never these two servers: nothing was captured, the status line's capture dot stayed down, and the map editor's Save failed with "Failed to fetch". If the dot is down while `curl http://127.0.0.1:3002/health` answers from the shell, check `ss -ltn -4` lists the port.

The capture server runs on the development machine; the hosted table at GitHub Pages cannot reach it, so a report from the hosted table has only the browser console (the `dicecam` lines are there too).

## In E2E

Scenarios do not run the diagnostics server; their evidence is the step journal, the screenshots, and the trace. Two stand in for it with `page.route` (040 the map editor's save, 041 the dice consumed), as the editor and the table would speak to it. Playwright's `trace: 'retain-on-failure'` already captures the console and network for a failed step. The diagnostics server is for the table in use, not for CI.

## Ports

| Purpose | Port |
|---|---|
| Diagnostics server | 3002 |

See [development.md](development.md) for the others.
