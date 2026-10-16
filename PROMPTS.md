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

## 27. 2026-10-14

*(voice, summarised)* A UI fix for the roll for first player: after a seat rolls, its number appears in front of its station, the next seat's number against theirs when it rolls, the winner gets a big glowing highlight to say it won, and the game starts about three seconds later.

`Outcome: each seat's roll for first player stands in front of its own station as it comes (a panel turned toward the seat: the four dice and the total; the prompt no longer lists other seats' throws); once every seat has rolled the winner's glows as first player under a scrim and play begins about three seconds later through a game/begun event (\`?first-player-pause=<ms>|hold\`, \`VITE_FIRST_PLAYER_PAUSE_MS\`, 0 in E2E builds) (G-143). Scenarios 006 and 037 hold the pause and gain first-player-decided; every baseline regenerated for the log line of prompt 28.`

## 28. 2026-10-14

*(voice, summarised)* All the first-player rolls collapse into a single log entry that records each seat's roll and then says who won, as one line that appears in every player's log.

`Outcome: the roll for first player is one line in every seat's log: each seat's four dice and total in seat order (RollRecord.contenders), a tie's totals and the throw again on the same line, and who goes first (G-144).`

## 29. 2026-10-14

Please don't restart the running server unless there's a live fix that you absolutely need to test or if I've asked you to.

`Outcome: adopted and saved to memory: the dev server on port 3000 is left running (Vite applies code changes live); only a change to its environment that a live fix needs, or a request, restarts it. The relay still stops for the hooks' scenarios and comes back afterwards.`

## 30. 2026-10-14

For a development server (localhost:3000, for example) let's implement an on-demand reload for vite.  Se details here: 

> *(pasted guidance, summarised: a Vite plugin whose `hotUpdate` hook broadcasts a custom `vite-update-available` event instead of a full reload when no module handles the change; a client listener on `vite:beforeFullReload` that throws to block the automatic reload and raises a prompt; a banner with a "Reload" button that reloads on demand; HMR for CSS and components still applies.)*

`Outcome: the dev server never reloads the page by itself: an `on-demand-reload` Vite plugin (dev only) turns every full-reload message into a `vite-update-available` event, and the table and hand pages answer it with a "New code is ready" prompt whose button reloads; CSS and component changes still apply in place, and `diag:reload` still reloads from here. The pasted guide's client-side block no longer works (Vite 6 settles its listeners), so the hold is server-side. Verified on a throwaway dev server: an app.html change left the page in place with the prompt up, and the reload happened on the tap. Takes effect on port 3000 at its next start.`

## 31. 2026-10-14

*(voice, summarised)* A bug in the current local session: a canoe expedition at Quelimane trying to reach the Zambezi cannot get there; only the hexes to the west and the north-west/south-west are lit as targets, while due south should be a coast hex it can move to.

`Outcome: assessed, not changed: by the rulebook canoes may never enter jungle-swamp, and the hex west of Quilimane (the screen's south, the board being turned) is jungle-swamp on the printed board as in the transcription; the Zambezi's mouth is not adjacent to the port, so the canoes go round by portage (RQ-17, G-145). The board photograph shows the mouth hex as jungle where the transcription has veldt, noted for RQ-5. The table should say why a hex is unlit; offered as a follow-up. The session was not captured: the table's page predated the capture defaults.`

## 32. 2026-10-14

canoes can always traverse ocean shore hexes.  Let's also add status information using icons (connected to diagnostics, running version's brief git id, date of the last build, update ready) - this can be at the top line of the page next to the options.  Please force a reload once that lands.

`Outcome: canoes now always traverse ocean shore hexes, a coastal jungle-swamp included (RQ-17 re-read, G-145): the Zambezi delta west of Quilimane opens, and scenario 012's canoes at Brass are offered the Niger delta's jungle-swamp (step shore-open-to-canoes). A status line beside the north-west gear (G-146) shows, icons first, whether the diagnostics capture answers, the running build's short git id, the build's date and an update waiting with a reload button; the footer marker is gone and 001 reads the line. The Vite config change restarted the dev server, which reloaded the table once; a second reload is sent through the capture once the commit lands.`

## 33. 2026-10-14

*(voice, summarised)* The game being played right now asks for 36 D6 to determine a village's loot. Capture the individual dice from the dicecam as they are rolled and record them one by one, or give an auto-roll button that finishes the rolls automatically.

`Outcome: a throw of more dice than the tray holds is gathered over several throws (G-147): each throw the dicecam reads goes in as it settles (fewer dice than wanted, never more), each tapped face goes in at once, the prompt counts them ("4 of 36 in") and says what is still wanted, and "Roll the rest" has the table roll the remainder from the generator (\`dice/rolled {auto: true}\`, the same on every client). A throw the tray holds whole, four dice or fewer, is still taken only whole. Scenario 018's loot is now rolled this way (steps loot-asked, loot-part-thrown, looted). The dev table picks it up at its next reload; the hosted table once the deploy lands.`

## 34. 2026-10-15

results of a die roll need to be recorded in the log on the same line as the roll (lost, okay); disaster cards need to be shown in full to the player before the results are applied; cache screen should show what's already stored in the cache so that cached goods can also be collected; cache screen should show current movement rates similar to the way that the outfitting screen shows; take water rations should be moved into the cache interface;

`Outcome: four slices. (1) The lines so far on the dice prompt (G-149, 56d27ea): a die asked for part way through a step comes with the step's log lines so far, the verdict on the same line as the die ("Lost check needs 2+ [4] veldt −1 = 3 found the way"); and the rail's latest line never wraps, so a roll and its result stay together (G-151). (2) The disaster card is shown in full at the player's edge before it applies (G-150, 75611eb): a turn in the field opens on the card (number, kind, context, text, whether it applies here); a tap applies it, and only then are its dice asked for; an action sent with the card unread faces it first, so older games replay unchanged. (3) and (4) The camp panel (G-148, 28db944): the reorganise panel lists every cache on the hex with its goods, this turn's giving them back item by item, earlier ones dug up with the die first; shows how the expedition as it stands can move, as the outfitting screen does; and takes and pours water, the rail's water controls gone. Scenarios 013, 015, 023 and 037 read the changes; every rail baseline regenerated and compared against its committed version.`


## 35. 2026-10-15

let's reorganize the "player card" so that it shows up in two sections. (1) the player status area, which includes name, hat icon, expedition details, cache icon; (2) log section, which shows a single line when collapsed and a small number of lines when expanded.... the log should appear with an outline that grows/collapses.  Most interaction happen above the player panel.  the cache icon should look like a pile of round stones piled up

`Outcome: the rail is two sections (G-152): the status row at the player's edge (name, the explorer's hat, the hand, the expedition's summary and the controls, the camp's control now a cairn of round stones) and, inward of it, the log in an outlined box: a pill round the latest line when collapsed, and at the "+" the box grows inward to hold a few earlier lines above it, scrolling, the "−" collapsing it again; the status row never moves and the board keeps its size. Scenario 036 reads the two sections; every rail baseline regenerated and compared against its committed version.`

## 36. 2026-10-15

let's institute a smarter dicecam watcher, which will allow players to pick up one of the dice in the box and roll it, allow players to roll another die after there are already dice in the box, etc.  So, for the "baboon shoot" where we have to roll 16 dice looking for a 6, the player can roll them one at a time or in groups and have those interpreted.  When there are three dice in the box the player can roll a fourth die which would be treated as a new single d6.

`Outcome: the dicecam judges each die on its own (G-153): a die with the same face up within a die's width of where a die lay in the tray as it lay is resting, every other die is the throw. So with three dice lying a fourth tossed in beside them is a throw of one, one of the three picked up and rolled is a throw of one, and a throw gathered in parts (sixteen shots at the baboons) can be rolled a die at a time as the dice pile up in the tray, a few at a time, or by picking some up and rolling them again; a whole throw of four thrown again is still taken whole even when one die lands where it lay. The status line counts the dice thrown ("2 dice thrown, one die wanted"), the console line says how many rest ("taken 5, 3 lying"). Known limits: a rolled die landing where it lay with the same face up is not seen as thrown, and a rolled die that knocks another a die's width along counts as two thrown. Scenario 037's hunt die is tossed in beside the lost die; scenario 018 gained fifth-die-tossed-in. The dev table picks it up at its next reload.`

## 37. 2026-10-15

we seem to get some mis-reads on the die rolls.  let's add a way to check again by tapping on the dicecam image, where the die you tap gets re-examined and the game corrects the outcome if the die is re-interpreted.  If the player taps the die again, present a radial menu as the yahtzee game and dicecam system supported to allow the plaer to set the die result.  ALSO: allow players to correct previous die rolls recorded in the log by tapping on them, providing a similar radial menu to change the die result.  If at all possible, reset the outcome of the die roll... if not possible, pop up a message to explain why it's impossible and resume the game afterwards.

`Outcome: a die can be set right after the fact (G-154, G-155). Every die in the log knows the throw it came from; a tap on it (the rail's latest line, the open log, the prompt's lines so far) opens a radial menu of the six faces round the die, turned to the seat, the face it shows marked, and the face chosen goes as dice/corrected. The reducer applies a correction by folding the game again from its events with the die changed, and lets it stand only if every later action is accepted as before and every later throw answers the ask it answered; otherwise a notice at the seat's edge says why the die stays ("the die stays a 1: the throw for the hunt that followed would answer another ask") and the game goes on as it was. A corrected die carries a dot. In the dicecam's picture a tap on a die has it read again from the readings that follow (the engine has no request to re-read one die): two agreeing readings of another face correct it, the same face leaves it be, each said over the picture; a second tap opens the six faces over the picture. Each throw the dicecam reads now goes with where its dice lay. Two commits on scenario 037: die-tapped-at-the-rail → hunt-die-set-by-hand → correction-refused, then die-tapped-in-the-picture → die-read-again → die-menu-in-the-picture → die-set-from-the-picture.`

## 38. 2026-10-16

cache screen should show cached gear in a right column, with the take back button in between the columns, not at the bottom

`Outcome: the camp panel is in two columns when a cache was made this turn (G-156): the expedition's goods on the left as before, the cached goods in a column to the right under a "cached" head, item by item on the same rows, and the arrow that takes them back standing between the two columns; an item wholly cached keeps its row ("none left") so it can be taken back. Earlier caches, to be dug up, are still listed below. Scenario 023's cached and taken-back steps read the columns.`

## 39. 2026-10-16

cache actions should be logged in a single line, not 12 individual "1 canoes cached" lines

`Outcome: everything reorganised in a turn at one place is one line of the log (G-157), summed per action and item and written again as each tap adds to it: "20 food, 5 muskets cached; 5 bearers dismissed; 10 food taken back from the cache"; anything else logged in between starts a new camp line. The tally rides on the record (RollRecord.camp, features/expedition/camp.ts); noteAction now counts a rewritten latest line as a record made. Scenario 023's cached and taken-back steps read the line.`

## 40. 2026-10-16

the trade dialog should show the movement capabilities as per the outfitting screen

`Outcome: the trade panel shows the movement notes of the outfitting screen and the camp under the gifts (G-158): the people, the load against what is carried, and a pill per mode, counting each purchase as it is made. Scenarios 019 and 022 read them.`

## 41. 2026-10-16

multiple trade transactions should collapse to a single log line

`Outcome: every exchange with a chief in a turn is one line of the log (G-159), summed per direction and item and written again as each tap adds to it: "bought 1 bearer for 2 gifts; sold 6 rations for 2 gifts"; the permission line stays its own and anything logged in between starts a new line. The tally rides on the record (RollRecord.trades, features/natives/trades.ts). Scenario 019's traded step reads it.`

## 42. 2026-10-16

you should be able to cache excess food so you can move, then do the move.  when I start over-loaded, movement is impossible for the turn.... is that according to the rules?

`Outcome: assessment, no change. The 1978 rules say what each bearer and animal carries and that an expedition may be reorganised (cache, dismiss, turn loose) on any turn; their only "speed limit" drops an expedition short of canoes or mounts to the on-foot rate. They never say an overloaded expedition cannot move. The table does not stop it either: the reducer never refuses a step for the load (probed: 105 units on bearers carrying 30 still has four move targets and the move goes through), and caching food on the camp panel then moving in the same turn already works; the foot pill's ✗ in the movement notes is a reading, not a rule. Asked the user what blocked the move in their game (the disaster card unfaced, the move already made, sick men, a port's landing turn), since the dev capture holds no such game.`

## 43. 2026-10-16

how hard is it to carry a sick person?  Also, an expedition can NOT move overland with more gear than you can carry.

`Outcome: the load overland is enforced (G-160, RQ-18): on foot the expedition carries what its bearers and animals can (ten a bearer, twenty a led animal, five a ridden one, nothing for a bearer leading animals or shouldering a canoe); a sick man carried costs twenty of it and a sick bearer carries nothing; with more to carry the reducer refuses the step ("cannot move overland: 105 units to carry, the bearers and animals carry 30; cache or dismiss at the camp first"), the board offers no step and the rail marks the load with a crossed foot until the camp has lightened it, the same turn. By canoe on the water nothing is weighed; mounted the load already had to fit. New scenario 038 (overloaded → lightened → moved). Eight scenarios and five unit fixtures had been playing overloaded expeditions (six bearers under a hundred rations): they now buy what their bearers carry, the 028 trek sets out with sixteen bearers and nine askaris under forty rations and arrives thinned by thirst and hunger, and 015's caravan carries exactly its 150 units; every changed baseline was diffed against its committed version (the rail's food counts, the trade and camp panels' notes, 009's inland step gone for a canoe expedition whose bearers all shoulder canoes).`

## 44. 2026-10-16

show the full card when a new donation arrives, and show the set of cards when the initial donation arrives (similar to the card draw for disasters.

`Outcome: cards are shown in full as they arrive (G-161): the hand dealt stands under each seat's roll for first player while the table stands still, and after that, or whenever a turn in Europe draws a card or a hex published earns one, the cards not yet looked at wait in full at the seat's edge, the donation large and the disaster the card would be in Africa beneath, with a Take control; taking them is a cards/seen event, and any act of the seat takes them too. No scrim, so no other seat is held. Scenario 006 reads the cards at the stations and gained cards-taken; 007 reads the sixth card waiting.`

## 45. 2026-10-16

please make the pop-up dialogs movable (by dragging around the title); we don't need any visual affordance for this; after the dialog closes, forget about the reposition so that the next dialog shows up in the default location

`Outcome: every panel at a seat's edge (EdgePanel: the dice prompt, the camp, the outfitting chart, the disaster card, the natives' panels, the cards waiting, the notices) can be dragged by its title or any other part that is not a control, with no affordance, and is kept inside the viewport; the offset lives with the open panel, so it is forgotten when the panel closes and the next opens in its place (G-162). Scenario 023 gained camp-dragged and checks the panel is back in its place when opened again.`

## 46. 2026-10-16

I'd like to see the "end turn" button only show up when the player has an option to end their turn early (IE: there is still a reasonable option that they should take, like move).  If the player has taken their action(s), then the button should either be a checkmark over the action they've selected, OR an empty checkmark icon.  So, for "landed at <port>", the button should just be a checkmark since the player can't do an undo and the player hasn't really done anything.

`Outcome: the end-turn control asks for confirmation only when the turn would end early (G-163): with something reasonable left (a passage the hand can book or a hex to publish in Europe; a step to take, a study owed or an expedition to outfit at the port in Africa) it is the hourglass or the arrow as before; with nothing left it is a plain check mark that ends the turn at a tap, and the ship is offered only when a passage can be booked. The check mark over the action taken is not drawn. Scenario 010 reads both; every scenario's end-turn helper handles either.`

## 47. 2026-10-16

1) single card donation should be narrower, with a checkmark icon instead of "take it"; 2) let's allow mixed movement for canoes and horses and camels so that moving through a "known" hex reduces the available movement by one, and moving into an unknown hex reduces it by 2.  This does not change any of the published movement rates but does allow correct calculations for mixed movement. 3) Some of the terrain is entered incorrectly due to a bad scan.  Please create a "map editor" as a separate tool that allows me to change the contents of a hex, with the data sent to the back end diagnostic server as a "save" command.

`Outcome: three slices. (1) 024: the panel of cards waiting is as wide as the cards it holds, so one card waits in a panel one card wide, and a round check mark takes the cards in place of "Take it" (G-164; every scenario showing the top seat's one-card panel regenerated, each diff bounded to the panel). (2) 039: a known hex costs one movement point and an unknown hex two, whatever the mode (RQ-19, G-165), so a canoe with four to seven paddlers paddles one unknown hex and one known in a turn where before the unknown hex took all three points; no published rate changes; mounted and on foot nothing changes. New scenario 039 up the Niger and the Benue from Brass. (3) 040: a map editor at /editor/ (bun run dev → http://127.0.0.1:3000/editor/), a tool of its own: the grid north up, sea and land, a brush of the eight terrains plus blank and sea, changes listed with a take-back, Save posting {type:'save', target:'board', changes, data} to the capture server, which validates the board and writes board.json in the transcription's own format (so git diff shows the hexes changed); ports and river hexes stay land (G-166). The capture server (3002) was restarted on the new code; the dev server was not.`

## 48. 2026-10-16

the map editor needs to edit rivers as well.

`Outcome: the map editor edits rivers (G-167): a river is chosen from a select or added with "+ River"; the course tool adds a land hex at either end of its course with a tap (the first tap on an empty river places the mouth) or takes an end hex off, the candidate hexes glowing; the cataract tool marks a hex of a course; name, joins, drainage, hexes off the map and continues-off-map are fields, Remove takes a river away unless another joins it. River changes are listed in words ("named Benue River; +c4r6; cataract at c3r6", "added, 2 hexes", "removed") with a take-back to the river as saved; the file's field order is kept, and the server (and the editor before sending) refuses rivers that do not hold together. Scenario 040 gained river-extended → cataract-marked → river-added. The capture server was restarted for the new checks.`

## 49. 2026-10-16

we need to be able to edit the direction that the river leaves a hex.  Let's make the edit process something like: click on a hex and it gets highlighted and shown in the single hex editor (a new section in the right hand panel), where there are six lines heading in the six directions, either blue for a river or empty for none.  Edits in the single hex editor appear "live" on the map.

`Outcome: the single hex editor (G-168): the hex tapped on the map is highlighted and shown under "Hex" with six spokes numbered as the dice give the directions, blue where a river leaves it; a tap on a spoke adds or clears that river edge and the map follows at once. Rivers being courses, the tap is a course edit: a cleared spoke takes the end hex off its river (a course running on through both hexes, or a tributary's junction, is refused with the reason); an added spoke extends the river whose course ends at either hex, else starts a tributary from a hex on a course, else a new river with its mouth at the hex tapped. Scenario 040 gained spoke-added → spoke-cleared.`
