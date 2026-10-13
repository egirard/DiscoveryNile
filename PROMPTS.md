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
