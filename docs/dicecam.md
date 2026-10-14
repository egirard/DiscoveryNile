# Physical dice and the dicecam

The table can play with real dice (PROMPTS.md, prompt 18). "Physical dice" is switched on from the options screen and recorded as a `dice/physical` event. From then on no rule draws a die from the seeded generator: the reducer stops at the roll, the table asks the seat whose roll it is, and the throw enters the log as a `dice/rolled` event, so a replay produces the same game.

## How a roll is asked for

Every place a rule rolls says what for, in the words the table uses (`DiceAsk` in `src/lib/game/random.ts`): `d6(rng, 'main', { what: 'to see if you are lost', hint: "4+ means you're okay" })`. With physical dice on and nothing scripted on that stream, `d6` and `dice` throw `DiceNeeded` before anything is changed (the reducers are pure). `reduceOne` catches it and holds the event in `state.awaiting`: the seat (the ask's `seat`, else the event's, else the current seat), the stream, how many dice, the prompt `Roll a D6 {what}; {hint}` and the throws already made for the same event. Every other event is refused while a roll is awaited.

`dice/rolled { seat, values }` appends the values to the stream's script and applies the held event again from the same state; its earlier throws are read back in order, and it either completes or stops at the next roll. A throw of several dice (the roll for first player, a mountain's height, the natives' reaction) is asked for as one. The dice an event used are dropped from the state once it completes.

The table shows the ask at the rolling seat's edge (`DicePrompt.svelte`): the prompt, the throws already made for the action, what the dicecam sees, and six faces to tap when there is no camera, or when it misreads. A scrim holds the rest of the table still.

## The dicecam

The dicecam is the WebCamTool project (https://github.com/egirard/WebCamTool), whose camera pipeline reads D6 dice in a tray. The table does not bundle it: it embeds the project's hosted `/embed` route in an `<iframe allow="camera">` (`DicecamDock.svelte`), on for the whole game so the camera stays calibrated, and listens for its messages. The frame is parked in the south-west corner of the board and, while a roll is asked, comes to the middle of the board turned toward the seat that rolls, over the dimmed table; it is moved with CSS only, since moving it in the DOM would reload it. The URL comes from `VITE_DICECAM_URL` (the deploy job sets `https://egirard.github.io/WebCamTool/embed`; a value starting with `/` is taken under the app's base path). Without it the prompt says there is no dicecam and the faces do the work.

### Protocol (version 1)

The embed route posts plain messages to `window.parent` with target origin `*`; they carry nothing private. The table accepts only messages whose `source` is its own frame and whose origin is the frame's.

| Message | When |
|---|---|
| `{ dicecam: 'ready' }` | the page is up |
| `{ dicecam: 'camera', status }` | every camera state change: `initializing`, `awaiting-consent`, `active`, `permission-denied`, `no-camera`, `camera-in-use`, `reconnecting`, `unsupported`, `error` |
| `{ dicecam: 'rolling' }` | motion: a throw is under way |
| `{ dicecam: 'removed', remaining }` | dice taken out of the tray |
| `{ dicecam: 'settled', rollId, dice: [{ value, confidence, askew }] }` | a reading of the settled tray, dice left to right; `rollId` names the throw |

### Reading a throw

`consider` in `src/lib/features/dice/dicecam.ts` judges each settled reading against the ask: the tray must show exactly the number of dice asked for, every die read with confidence 0.7 or better and none askew, and two consecutive readings of the same throw must agree before the values are sent as `dice/rolled`. A throw already taken is never read twice, so dice left lying from the last roll do not answer the next ask; the next throw needs motion, which gives it a new `rollId`.

### The embed route in WebCamTool

The route is `src/routes/embed/+page.svelte` in WebCamTool, listed in its `kit.prerender.entries`: `VideoDisplay` (camera consent and recovery as on `/yahtzee`) with the detection overlay, the motion and detection pipeline started when the camera is active, and the three dice events re-posted as above. It is a small page; until it lands in that repository its change is kept here as [dicecam-embed.patch](dicecam-embed.patch) (`git apply docs/dicecam-embed.patch` in a WebCamTool checkout at commit 22bab8a; `bun run check` and `bun run build:pages` pass with it). Pushing it to WebCamTool's `main` publishes `https://egirard.github.io/WebCamTool/embed`, which is what the deployed table points at.

## In E2E builds

`build:e2e` sets `VITE_DICECAM_URL=/dicecam-stub.html`, a static page that shows the word "dicecam" and says nothing. Scenario 037 speaks for it, posting the protocol's messages from inside the frame, and enters other throws by tapping faces. The camera itself is never exercised by a test.
