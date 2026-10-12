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

`Outcome: Resumed the roll-through. 012 (movement rates), 013 (disaster cards), 014 (hunting and rations, with named PRNG streams), 015 (water in the desert), 016 (natives discovered, policy chooser, retreat), 017 (native reaction and combat), 018 (defeat, captivity, escape, victory spoils), 019 (negotiation, poisoning, trade), 020 (tribe attitude and regard) and 021 (sickness, starvation, desertion) landed and pushed; river overlays no longer swallow taps; the rail's roll log wraps; G-32..70 logged.`
