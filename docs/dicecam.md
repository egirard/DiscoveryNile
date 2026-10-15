# Physical dice and the dicecam

The table can play with real dice (PROMPTS.md, prompts 18 and 19). "Physical dice" is switched on from the options screen and recorded as a `dice/physical` event. From then on no rule draws a die from the seeded generator: the reducer stops at the roll, the table asks the seat whose roll it is, and the throw enters the log as a `dice/rolled` event, so a replay produces the same game.

## How a roll is asked for

Every place a rule rolls says what for, in the words the table uses (`DiceAsk` in `src/lib/game/random.ts`): `d6(rng, 'main', { what: 'to see if you are lost', hint: "4+ means you're okay" })`. With physical dice on and nothing scripted on that stream, `d6` and `dice` throw `DiceNeeded` before anything is changed (the reducers are pure). `reduceOne` catches it and holds the event in `state.awaiting`: the seat (the ask's `seat`, else the event's, else the current seat), the stream, how many dice, the prompt `Roll a D6 {what}; {hint}` and the throws already made for the same event. Every other event is refused while a roll is awaited.

`dice/rolled { seat, values }` appends the values to the stream's script and applies the held event again from the same state; its earlier throws are read back in order, and it either completes or stops at the next roll. A throw of several dice (the roll for first player, a mountain's height, the natives' reaction) is asked for as one. The dice an event used are dropped from the state once it completes.

The table shows the ask at the rolling seat's edge (`DicePrompt.svelte`): the prompt, the throws already made for the action, what the dicecam sees, and six faces to tap when there is no camera, or when it misreads. A scrim holds the rest of the table still.

A die asked for part way through a step comes with the step's log lines so far (`DiceNeeded.sofar`, prompt 34): the prompt shows them as the log will, the verdict on the same line as the die, and lists a throw on its own only until its line is written.

## The dicecam

The dicecam is the table's own camera, shown on a canvas in the south-west corner of the board, read by the dice analysis of the WebCamTool project (https://github.com/egirard/WebCamTool, the camera pipeline behind its Yahtzee page). The table does not bundle that analysis: WebCamTool packages it as module workers, hosted with its site (`https://egirard.github.io/WebCamTool/dicecam/engine.js`, its `docs/dicecam-engine.md`), and the table loads the engine at runtime.

**The division.** The table (`Dicecam.svelte`) owns the camera, so the permission is the table's own: it asks for the camera the moment physical dice are switched on, draws every frame on its canvas letterboxed, and draws the engine's last reading over the picture the way the Yahtzee page draws its overlay (`overlay.ts`: the tray's floor dashed in orange, each die's outline in blue, its box in red, its top face in green, the pips in magenta, a confidence bar along its foot and the value above it, in orange when the die lies askew). The engine owns the analysis: motion (calibrating, rolling, settled), the tray, the dice, and the roll bookkeeping (one roll id per throw, removals, askew). The table posts one frame at a time as an `ImageBitmap` and the next only after the engine's `tick` for the last, so frames never queue up behind an analysis and the rate adapts to the machine. The dicecam is kept mounted for the whole game so the engine stays calibrated; the page moves it with CSS only, parked in the corner and brought to the middle of the board, turned toward the roller, while a roll is asked.

**Loading the engine** (`engine.ts`). A worker script must be same-origin with the page that creates it, so the table starts the engine through a blob module that imports the hosted file; GitHub Pages serves it with `Access-Control-Allow-Origin: *`, which that import needs. The engine's chunks, the detector worker it starts (the analysis proper, in a worker of its own so the motion loop never waits on it) and the digit model resolve beside the engine, from its real URL. The URL comes from `VITE_DICECAM_URL` (the deploy job sets the hosted engine; a value starting with `/` is taken under the app's base path). Without it the prompt says there is no dicecam and the faces do the work. The engine must say `ready` within thirty seconds, else the dicecam reports it could not be loaded.

**Status** (`DicecamStatus`): `starting` (the camera is being asked for), `loading` (the camera streams, the engine is not up yet), `active`, then the camera's failures (`permission-denied`, `no-camera`, `camera-in-use`, `unsupported`, `reconnecting` after the stream ended, `error` once three reconnections failed) and `no-engine`. The prompt's status line words each; the dicecam's own corner shows a short note while it is not active, and the engine's motion state beside its label while it is.

### Protocol (version 2)

The types are `EngineMessage` in `src/lib/features/dice/dicecam.ts`, a reading of WebCamTool's `src/lib/dicecam/protocol.ts`. To the engine: `{ type: 'frame', bitmap, timestamp }` (transferred) and `{ type: 'reset' }` (after the camera restarted). From the engine:

| Message | When |
|---|---|
| `{ type: 'ready', protocol: 2, version }` | the engine and its detector are up |
| `{ type: 'tick', motion: { status, progress? }, frame }` | every frame: the motion state, and the next frame may go |
| `{ type: 'roi', roi }` | the tray's floor as last found (`{ detected, polygon, confidence }`), or `null` |
| `{ type: 'rolling', … }` | motion: a throw is under way; the overlay is cleared |
| `{ type: 'removed', remaining, … }` | dice taken out of the tray |
| `{ type: 'settled', rollId, kind, frame, dice: [{ value, confidence, askew, boundingBox, contour, face, pips, … }] }` | a reading of the settled tray, the dice left to right, with the geometry the overlay draws; `rollId` names the throw |
| `{ type: 'error', message }` | something failed; the engine goes on where it can |

### Reading a throw

`consider` in `dicecam.ts` judges each settled reading against the ask: the tray must show exactly the number of dice asked for, every die read with confidence 0.7 or better and none askew, and two consecutive readings of the same throw must agree before the values are sent as `dice/rolled`. What already lies in the tray is never read as the throw: when an ask opens, the table takes the tray as it lies (the engine's last reading) and the throw last taken, whoever threw it, as lies to ignore, each die by its face and where it lay (prompts 20 and 21). A reading that shows one of those lies, every die within a die's width of where it lay with the same face up, is ignored whatever the engine calls it, and the status line waits for a roll ("Waiting for a D6 roll"); a reading that shows anything else is a throw, whatever the engine calls it. The engine's `rollId` is not the judge of a throw: it follows the engine's motion detector, which a hand reaching in trips (the same lie gets a new name) and a single die tossed in from outside the picture can miss (a new lie keeps the old name); it decides only for a die whose place is unknown. At the start of the run, before any reading is known, the engine's first reading is the tray as found, unless the engine saw the dice roll first. The table logs each reading it judges to the browser console (`dicecam <rollId> <face>@<x>,<y> … <verdict>`).

A throw of more dice than the tray holds (more than `DICE_AT_HAND`, four: the loot of a village is a die a warrior) is gathered over several throws (prompt 33). The reducer takes a `dice/rolled` of any number of dice up to what is still wanted and keeps them in `awaiting.have` until the count is in, then applies the held event; `dice/rolled {auto: true}` has the table roll the rest from the stream's generator, the same on every client. The dice rolled go into the stream's script where the held event reads the throw (`DiceNeeded.at`), after whatever it reads before and ahead of anything a scenario scripted for later, so a scripted game can turn physical dice on part way. On such an ask `consider` takes a throw of fewer dice than wanted too (never more), each throw taken a lie for the next, while a throw the tray holds whole is still only taken whole; the prompt shows the dice in so far ("4 of 12 in"), each tapped face goes in at once, and "Roll the rest" sends the `auto` event. The status line says what is still wanted ("Waiting for a throw; 8 more dice wanted").

## In E2E builds

Every scenario's Chromium has a camera: its fake device playing `tests/e2e/fixtures/dicecam-tray.y4m`, one still frame of a synthetic tray (640×360, four blank dice in a row; `--use-file-for-fake-video-capture` in `playwright.config.ts`, with the camera permission granted). Only a table with physical dice on asks for it. `build:e2e` sets `VITE_DICECAM_URL=/dicecam-stub.worker.js`, a stand-in engine that takes the frames and makes nothing of them, answering each with a settled tick, and repeats to the table whatever the scenario posts on the `dicecam-stub` broadcast channel. Scenario 037 speaks for the engine that way, in its protocol, with readings whose geometry is the tray's, so the overlay is drawn where the dice are; it enters other throws by tapping faces. The real analysis is never exercised by a test.
