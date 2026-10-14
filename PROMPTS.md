# Prompts

## 1. 2026-10-11

Record all prompts I give you for this project in PROMPTS.md for later reference, verbatim and without commentary. At the conclusion of each prompt, insert a terse summary of the outcome (generally limited to 1 or 2 lines) that is flagged (using inline code). I also want to use a lightweight prompting so that I can ask unimportant questions (what port is the server on, for example) without cluttering up prompt.md. When I want to give a lightweight prompt, I will prefix it with "OTR: ", and you will not add it to prompts.md and not add the summary result.

`Outcome: Created PROMPTS.md and saved the recording convention (verbatim prompts, inline-code outcome, OTR: prefix skipped) to memory.`

## 2. 2026-10-11

I'm about to give a prompt, but would like you to review the prompt and advise on improvements that can be made.  Prompt: 

Build DiscoveryNile: a browser tabletop implementation of the 1978 Discovery Games board game 'Source of the Nile', for a large flat multi-touch screen with players seated on every side of the table. The project follows the pattern set by egirard/TabletopTemplate: thin vertical slices, an append-only event stream with a deterministic reducer, icon-first tabletop UX with per-seat orientation, and the template's central rule that every commit ships a player-visible change proven by an end-to-end Playwright test. Game rules come from egirard/SourceOfTheNileRulesReference, which is the authority for every rules question — when code and that reference disagree, the reference wins and the discrepancy is raised rather than guessed at. Toolchain: Nix + direnv + Bun + SvelteKit + TypeScript, Vitest for unit tests, Playwright for e2e (same shape as egirard/Ashardalon). Licence: MiT; the GitHub repository is private. Done, for the first phase, means: the template's docs are imported and filled in for this game, a LICENSE is present, the rules reference is documented and pinned, and docs/implementation-plan.md lists the slice sequence so a coding agent can be handed slice 001.
Ignore any licence discrepancies with other repositories, since I am the sole author of all repositories and I'm okay with changing the license.

`Outcome: Reviewed the draft prompt against the three referenced repos; flagged ~10 gaps (bootstrap mechanism, rules-source precedence, pin mechanism, commit-contract exemption, Pages-on-private-repo, PROMPTS.md collision) and supplied a revised prompt.`

## 3. 2026-10-11

let's adjust the repository to be public, but otherwise execute the prompt as specified.  For reference, this was your recommended prompt: 

Build DiscoveryNile: a browser tabletop implementation of the 1978 Discovery Games board game "Source of the Nile", for a large flat multi-touch screen with players seated on every side of the table.

Bootstrap: create the private GitHub repository egirard/DiscoveryNile and initialise it in this directory. Import egirard/TabletopTemplate by cloning it and squashing its history into one "import template" commit. Keep the PROMPTS.md already present here and discard the template's copy. The template is the sole authority for toolchain and project shape (Nix + direnv + Bun + SvelteKit + TypeScript, Vitest, Playwright); egirard/Ashardalon is reference-only. direnv is not installed on this machine; install it via Nix or use `nix develop` directly.

Pattern: thin vertical slices, an append-only event stream with a deterministic reducer, icon-first tabletop UX with per-seat orientation, and the template's central rule that every commit ships a player-visible change proven by an end-to-end Playwright test. Phase-1 bootstrap commits are exempt from the player-visible rule, but the imported seed slice must build and its existing unit and e2e tests must pass on this machine before phase 1 is done.

Rules: egirard/SourceOfTheNileRulesReference is the authority. Precedence when sources disagree: source-of-the-nile-rules.md, then source-of-the-nile-rules.pdf where the Markdown transcription is garbled, then the modernized rules only where the original is silent; quickstart and photos are illustrative. source_of_the_nile_1978_deck.csv is the sole authority for card data and source_of_the_nile_1978_map.jpg for geography. When code and the reference disaghe discrepancy is raised, not guessed at. Pin by vendoring the rules Markdown and deck CSV into docs/rules-reference/ and recording the upstream commit SHA and
date in docs/rules-reference.md; do not vend

Deployment: disable the GitHub Pages and PR-ep the verification job.

Licence: MIT. Ignore licence discrepancies wam the sole author.

Done for phase 1 means: template docs importe, including docs/vision.md, a docs/rules.mdsummary, and a chosen state backend (local only for now); LICENSE present; rules reference vendored, pinned andocumented; docs/implementation-plan.md writdocs/implementation-plan-guide.md, coveringthe game to a playable end-to-end state, with the first ten slices specified in detail and the rest as titled headings, so a coding agent can be handed sld tests green.

`Outcome: Created public repo egirard/DiscoveryNile from a squashed TabletopTemplate import; renamed, verify-only CI, rules reference pinned (6ee4718a) and vendored, docs/rules.md (13 RQs), vision, plan 003–032 with issue 003; seed verified green locally after supplying the template's missing diagnostics client.`

## 4. 2026-10-12

I've reviewed the development plan and I'd like you to roll through the every step.  If there are unresolved or open questions, please make an educated guess and also log them for review at the conclusion.

`Outcome (paused 2026-10-12): slices 003–011 landed and verified (board transcription, known Africa, explorers, start and deal, Europe turn, voyage, outfitting, first step with lost check and terrain, rivers/cataracts/peaks); guesses logged in docs/open-questions.md G-1..G-31 and RQ-14; slice 012 in progress, uncommitted (see memory).`

## 5. 2026-10-12

We can substitute in a non-random die sequence for the purpose of running unit tests; assume that you can just define a sequence of numbers (maybe generated by the rng) then substitute in numbers that you need to drive specific outcomes.  Record the sequence as part of the unit or e2e test.

`Outcome: Implemented rngScripted + ?dice= URL script and the created() fixture dice argument (uncommitted, part of slice 012 work in progress); first use planned for scenario 012.`

## 6. 2026-10-12

resume as per instructions in discovery-nile-wip-012

`Outcome: Resumed the roll-through. 012 (movement rates), 013 (disaster cards), 014 (hunting and rations, with named PRNG streams), 015 (water in the desert), 016 (natives discovered, policy chooser, retreat), 017 (native reaction and combat), 018 (defeat, captivity, escape, victory spoils), 019 (negotiation, poisoning, trade), 020 (tribe attitude and regard), 021 (sickness, starvation, desertion), 022 (specialties in the field), 023 (caches and reorganisation) and 024 (return to Europe) landed and pushed; river overlays no longer swallow taps; the rail's roll log wraps; G-32..77 logged. Paused before 025 for context.`

## 7. 2026-10-12

continue implementation

`Outcome (paused 2026-10-12): 025 (publishing and points), 026 (death and retirement), 027 (superlatives), 028 (epic transits, with a recorded trek replayed), 029 (joint expeditions), 030 (game end and continuation) and 031 (within-turn undo and reload at every phase) landed and pushed; the move-after-halt gap and the token-over-target tap bug fixed; G-78..106 and RQ-15..16 logged. Paused before 032 (the last slice) for context.`

## 8. 2026-10-12

resume as per memory discovery-nile-roll-through

`Outcome: 032 (responsive pass) landed and pushed: the table-4k project runs the six-seat scenario at 55" beside the 27" run, the touch target is 12 mm rounded up and every scenario now fails a control under it, rails wrap within their seat and grow inward, the ticket-card width bug and three undersized controls fixed, the piles moved to the top-right sea corner, G-107..111 logged; every slice of the plan has landed. The closing review list follows in the reply.`

## 9. 2026-10-12

please bring up both local servers and also fix the CI font mismatch to enable the public deploy

`Outcome: one bundled typeface (DejaVu Sans as "Nile Sans", WOFF2 in static/fonts, declared in app.html) replaces system-ui everywhere so CI and the workstation rasterise the same bytes; every baseline regenerated and spot-checked; pushed so the deploy job can publish; dev server (3000) and relay (3001) started.`

## 10. 2026-10-12

Luanda should be on the coast (one hex to the west of its current position)
Port names can be aligned with the port row, and face "north", with most port names placed in the water off the coast.  port Elizabeth and Khartoum can be to the south or the north of the cities, and calabar can align to the southwest corner of the city.  all should be readable from the south.
Icons and buttons are fairly confusing.  we need to introduce tooltips to describe them and their actions (note that this is not touch-friendly, so we will need to improve feedback in a later stage.  this design is to help me better understand the design.
Map should resize to fill most of the screen when the screen resizes.
River names should appear at the mouth of the river
Let's configure the game to use a relay server like Jaipur's (see GitHub.com/egirard/Jaipur)
Non-playing positions should not be shown once the game starts.

`Outcome: four slices landed and pushed. 033 map legibility (Luanda on the coast at c7r19; port names hand-placed in the sea, upright for the south edge, Khartoum and Port Elizabeth south, Calabar at its south-west corner; river names at the mouths). 034 the table fills the screen (seats nobody took vanish at the start, the board takes the free edges, the layout follows the window). Tooltips (every aria-label doubles as a title). Relay: the ARViewer session protocol Jaipur uses, the deployed table on wss://arviewer-relay.onrender.com/ws (smoke-tested), the local relay speaking the same subset. G-112..117.`

## 11. 2026-10-12

It's unclear how "every seat votes to end the game" is supposed to happen.  Please explain the usage pattern there.

`Outcome: explained in the reply (the vote lives on the retire panel, reached by tapping one's own explorer on one's own turn; the last vote ends the game); no code change. The weakness noted: a vote is only visible and castable on the voter's turn, so consensus takes a round and nobody sees the tally between turns.`

## 12. 2026-10-12

Let's add a "configuration" or "options" screen launched from a gear icon that is displayed in the northwest and southeast corners of the board (so each player should be able to reach it).  In that screen we should get access to "End this game".  Also include the screen size configuration in the options screen along with qr codes to join or rejoin from a phone.

`Outcome: 035 Options landed: a gear at the north-west and south-east corners opens the options screen turned toward its corner, with the screen diagonal (steps, 27"/55" presets, a bank-card outline to check against), every seat's QR code, and "End this game" by agreement after a confirmation (game/ended); the vote on the retire panel is gone; G-118..121.`

## 13. 2026-10-12

let's expand the log, which currently shows as a single line in each player's pod.  Add a "+" at the end of the section to expand the log, which opens to a fairly short but scrollable list.  the close button "-" will replace the "+" in place when the log is open.  This will show a more complete list of everything that's happened in the turn.

## 14. 2026-10-12

Please improve the alignment of the river names with the river lengths.... it's good for single digit rivers, but runs too close for double digit lengths.

`Outcome: river names now sit clear of their drainage numbers by the number's width (two digits push the name half a radius further); every board baseline regenerated.`

`Outcome: a "+" at the end of each rail's roll log opens the full list of the turn at the player's edge (every record with dice, modifiers and outcome, a short scrollable list); "−" in its place closes it; scenario 036; G-122. Every rail baseline with a log regenerated.`

## 15. 2026-10-13

the outfitting dialog needs improvement. Change "men" to "people". Add the names of the items (so the the name appears above the icon and price, as a two-liner).  We need to inform the player how their expedition can move: Overland iff enough bearers (or animals) can carry all the load (including canoes at 8 per); By canoe (at 1,2,3, or 4 hexes, determined by bearer count); 8+bearers means the canoes can bypass cataracts; Mounted iff there are enough horses or camels to carry everyone (note that a horse that is ridden can only carry 5 units of food, and that a mounted bearer could be leading three other horses loaded with 20 units). I expect that all of this information can be shown in the current "number of people" line.  Note also that horses and camels are only available at certain locations.  The outfitting dialog should mention the port at the top, and include icons for "foot", "canoe", and "horse" or "camel" if available - these will spend all of the money on the appropriate outfit as per the samples in the rules . Add a X5 znd X10 next to the X1 button.  Tapping the "done" button replaces done with "confirm" (looks like done with a checkmark overlaid) in-place, with a cancel appearing to the left.  Tapping anywhere else will also cancel.

`Outcome: 009 revisited: the outfitting panel is headed by the port with foot, canoe and horse/camel buttons that spend the whole budget like the rules' samples (scaled to the budget, mode kept); every item named above its icon and price; the "people" line says how the expedition could move (overland, canoe 1–4 hexes with the cataract mark at eight bearers, mounted with riders carrying 5 and led animals 20, which now also decides the mode in play); ×1/×5/×10; done becomes a confirmation in place with a cancel to its left, and a tap anywhere else takes it back. Scenario 009 extended to six steps; G-123..125.`

## 16. 2026-10-13

The log isn't appearing.

It only seems to appear if you enter an unknown hex.

`Outcome: the turn's log now has a plain line for every action that rolls nothing (the card drawn in Europe, passage booked, outfitting and what was bought, a step through known country, water, policy, gifts, the prisoners' fate, retirement), written once in the dispatcher; the rail's "+" is there from the first action and an undo removes the line. Scenario 036 extended (log-before-any-roll); G-126.`

## 17. 2026-10-13

The most recent line of the log should be shown even when the log is collapsed.  The + that is next to this text should expand directly above (so the - in the open log is aligned with the - in the player area. The log should show more than just the current turn.  Die results for first player should only show up in the log, not in the player mat. When a player is in europe the two choices are to sail or to wait... let's change the "end turn" to be an hourglass, and when clicking on the hourglass the checkmark to confirm should appear overlaid on the hourglass (not in the "sail" button's position.  The sail button can turn into an x.  Likewise when the sail button is clicked, a checkmark should overlay that button with the x to the right this time.

`Outcome: the rail reads the log's latest line with the "+" after it, and the "+" opens the rest of the log directly above, its "−" over the rail's, the latest line left on the rail as the list's last (G-127); the log spans the game round by round, the meal closing each turn and the landing logged (G-128); the roll for first player is a log line, not dice at the rail (G-129); the hourglass ends the turn with the check mark on itself and the "✕" to its left, the ship takes the check mark with the "✕" to its right, a port tap chooses and the check mark books (G-130). Scenario 036 rewritten; 007 and 008 gained a step; every rail baseline regenerated.`

## 18. 2026-10-14

we're going to integrate physical dice into this game, using the dicecam as implemented in https://github.com/egirard/WebCamTool - each time a die roll is needed in the live game (not in testing) the player will be prompted with a request "Roll a D6 to see if you are lost; 4+ means you're okay", then the dicecam will be monitored to wait for a single die result.  after the result is found, the result is logged and the game continues.  Note that for mountains or for game start, multiple dice are needed.

`Outcome: "Physical dice" on the options screen (dice/physical) stops the generator: every rule that rolls says what for, the reducer holds the event at the roll and the table asks the seat at its edge ("Roll a D6 to see if you are lost; 2+ means you're okay", several dice as one throw), the dicecam (WebCamTool's /embed route in a frame, docs/dicecam.md) or a tapped face answers, and the throw is a dice/rolled event the log replays (G-131..134). Scenario 037; the WebCamTool side is docs/dicecam-embed.patch, to land in that repository.`

## 19. 2026-10-14

Dicecam is getting a 404 on the deployed page and on port 3000. I'd like to replace the deployment model you have for dicecam.  Please package a worker thread to perform the analysis and load it from the dicecam repository.  I expect we will need to modify dicecam in order to do this.  Then display the dice table the same way that the yahtzee game did (effectively embedding a canvas display for the video input, sometimes overlaying the analysis results, etc.)

`Outcome: WebCamTool now packages its analysis as module workers published with its site (dicecam/engine.js + detect.js, protocol 2, its docs/dicecam-engine.md; landed on its main and deployed); the table loads the engine at runtime through a blob import (CORS from GitHub Pages), owns the camera itself and shows the feed on a canvas in the dicecam's corner with the engine's reading drawn over it as the Yahtzee page draws its overlay (tray, outline, box, face, pips, confidence, value); one frame in flight at a time (G-133, G-135). The frame and its patch are gone. Scenario 037 gained tray-read-once, with Chromium's fake camera playing a synthetic tray and a stand-in worker the scenario speaks for; every 037 baseline regenerated. Verified end to end against the hosted engine: the real detector read a synthetic tray as 3, 5, 2, 6 and the table took the roll for first player from it.`

## 20. 2026-10-14

End Turn should not use the hourglass unless you're in England.
After lost, move straight to "hunt", or give notice if hunting isn't needed (ie: in capetown)
For costs, track individual dice in order, and fill out details as they appear
for single line dice tracking, include full information (roll needed, roll seen, result)
when starting a new player, remember the dice pool. I've seen the lost die be read from a previous roll. The current system does the properly for a single player, but seems to forget dice status when a new player turn starts.
for direction of terrain we need to have a 1-6 compass visible on map.

`Outcome: the turn is ended with an arrow in Africa, the hourglass staying a wait in Europe (G-136); a failed lost check ends the turn there and then, straight on to the hunt's die, or with "no hunting needed at Mombasa" on the lost check's line where the expedition is provisioned (G-137); the trade prices are one die per item, each asked for by name and listed as it comes (G-138); a check's log line reads what it needed, the dice, the modifiers, the total and the outcome (G-139); the dicecam remembers the last throw's dice across asks and seats, by their places and faces, and asks for them to be picked up instead of reading them again under a new name (G-140); a compass on the board numbers the six directions as a die does (G-141). Scenario 037 gained straight-to-the-hunt, last-throw-still-lying and hunted-and-passed (seed 34); 010's lost step ends the turn; 007 and 010 check the control's icon; every baseline regenerated for the compass and the arrow.`

## 21. 2026-10-14

we've over-corrected on ignoring old dice.... now we're ignoring the first die rolled.  Let me suggest that you take
  an image of the dicecam content at the very start (start of the run, or start of a player's turn) and not interpret
  until that image has changed.  Alternately, correct the logic for ignoring the previous player's last roll.  Also,
  let's not prompt with "the last throw is still in the tray"... that's just irritating to the player... try "waiting
  for a D6 roll" instead.

`Outcome: the dicecam judges a throw by what lies in the tray and never by the engine's roll id, which a hand reaching in renews and a single die tossed in from outside the picture can keep (that was the die ignored): when an ask opens, the tray as it lies and the throw last taken are the lies to ignore, each die by its face and place within a die's width, and any other reading is a throw; at the start of the run the engine's first reading is the tray as found; the status line says "Waiting for a D6 roll" (G-142, G-140 revised). Each reading judged is logged to the browser console. Scenario 037 gained tray-as-found, its hunt is thrown under the lost die's name, and its baselines are regenerated.`

## 22. 2026-10-14

*(voice, summarised)* Prompts given by voice are logged here as a summary rather than verbatim; typed prompts stay verbatim.

`Outcome: the convention is recorded here and in memory: a prompt that comes as transcribed speech is logged as a one- or two-line summary marked "(voice, summarised)"; typed prompts and the OTR: rule are unchanged.`

## 23. 2026-10-14

*(voice, summarised)* Wire up a diagnostic system that captures the game state while the user plays, so that feedback on a moment of gameplay comes with the context it happened in; a separate instance on the development machine may be needed to track it, or something already running (the relay) may serve.

`Outcome: the template's diagnostics capture, present but unused, is now wired in: \`bun run dev\` points the table at the capture server on 3002 (and the local relay and the hosted engine) by default, the table writes every event, the whole stream as a replayable file, every ask for dice (with what lay in the tray) and every reading the dicecam judged, and \`bun run diag:context\` words the latest session's last lines on the local clock with the game as its stream reduces; AGENTS.md says to read it first when the user reports a moment of play. The capture server and the dev server are running on the development machine.`

## 24. 2026-10-14

*(voice, summarised)* Feed this project's experience of the TabletopTemplate back into that template: recommendations and clarifications that make it more useful, a chapter on integrating the dicecam, and a chapter on direct communication through the relay without a database backing store.

`Outcome: TabletopTemplate 3a778a2 (pushed, its verifier green): the gitignore pattern that hid its diagnostics module fixed and the module tracked; the relay ported at both ends to the ARViewer session protocol this project uses, so a deployed table needs no server; new chapters docs/relay.md (direct play without a database), docs/dicecam.md (physical dice through WebCamTool's engine) and docs/lessons-from-discoverynile.md (bugs, clarifications, patterns, process); clarifications in state-and-persistence, ai-agent-workflow, development, e2e guidelines, ci-and-deployment, diagnostics, AGENTS.md and the README; logged there as its prompt 14.`

## 25. 2026-10-14

*(voice, summarised)* In the WebCamTool project the dicecam engine was pulled out of, add any configuration or updating wanted and annotations from this experience, so that future clients of the engine can learn from it.

`Outcome: WebCamTool 9e07b13 (pushed, Pages deployed): docs/dicecam-engine.md gained "Reading a throw" (judge by the lie, not the roll id; two agreeing readings; neutral status; what to log), "Tuning the motion detector", "Testing a consumer without a camera" and "What the first consumer found"; the protocol's comments say what the roll id really is; protocol 2 gained a configure message for the motion detector's sensitivity and the motion score on every tick. Smoke-tested cross-origin: the rebuilt engine reads the pipped tray as 3, 5, 2, 6 after a configure, and this table's dev server reads it from the hosted build.`

## 26. 2026-10-14

*(voice, summarised)* Wire up a way to force a reload of the table on localhost:3000, possibly through the diagnostic system, so that a fix can be tried and its result seen at once; and is the game entirely replayable from its state, so that such a fix could be applied live?

`Outcome: the capture server now carries a command stream (GET /diag/<session>/events) that a dev-build table listens to, and \`bun run diag:reload\` posts a reload to every table playing the latest session; the game replays from its stored events on the code as it now is, and the capture shows the reload. Verified on the dev table: reload delivered, page reloaded, the commissioned explorer still there. Replay: the game is an append-only event stream reduced deterministically (events only in localStorage, physical dice as events, no clock or Math.random in the rules), so a fix to the reducer is applied to the whole game on reload; the one caveat is a fix that changes what an earlier event meant, which replays as a different game.`
