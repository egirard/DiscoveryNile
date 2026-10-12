# Open questions and guesses made while executing the plan

Every educated guess made while rolling through `docs/implementation-plan.md` without the maintainer in the loop, for review. Rules questions proper live in `docs/rules.md` as `RQ-n`; this list points at them where relevant and records everything else (design, data, scope).

| # | Slice | Question | Guess taken | Where |
|---|---|---|---|---|
| G-1 | 003 | The board is taller than wide; a landscape table makes hexes tiny if north is "up" | The whole map is rotated 90° with north toward the left edge; hexes are 23 mm wide on a 55" table | `HexBoard.svelte` |
| G-2 | 003 | Port names are text, which the UX doc discourages | Shown anyway, small, readable from the bottom seat; the anchor icon carries the meaning | `HexBoard.svelte` |
| G-3 | 003 | The transcription yields 447 blank hexes; the rulebook says 452 | Pinned at 447; coastal half-hexes are the likely difference | `RQ-5` |
| G-4 | 003 | Which hex is each port, and the terrain under Durban and Port Elizabeth | Read from the photograph; Durban and Port Elizabeth sit on mountain hexes, Zanzibar is a one-hex veldt island | `RQ-5`, `tools/mapfit/build.py` |
| G-5 | 003 | Printed river courses that run along hex edges (Congo, Rufiji, Zambezi, Limpopo) | Assigned to the hexes listed in `build.py`; the Limpopo ends in jungle-swamp c19r30 | `RQ-5` |
| G-6 | 003 | Swamp versus veldt symbols in the Cape and the Limpopo lowveld are hard to tell apart in the photo | Veldt unless the symbol has a visible base line (c18r30, c19r29 swamp; c19r30, c20r25, c23r17, c23r23 jungle-swamp) | `RQ-5` |
| G-7 | 003 | Partial hexes cut by the board edge (top row, left column, east edge) | Excluded unless more than half the hex is on the board | `tools/mapfit/build.py` |
| G-8 | 004 | The rulebook's points table has no entry for mountain hexes | Mountain scores 0 on its own, literally as printed; see `RQ-14` | `scoring.ts` |
| G-9 | 004 | Where a printed river meets the sea or leaves the board, how far to draw it | Extended one hex radius seaward from the mouth (and off-board for the Niger and Nile), with the drainage number placed just seaward | `HexBoard.svelte` |
| G-10 | 005 | Seat colours are not in the rules (counters come in "one color group for each player") | Six fixed colours by seat: red, blue, green, yellow, purple, orange | `explorers/colours.ts` |
| G-11 | 005 | Specialty iconography | Book (evangelism), medicine bottle (medicine), paw (zoology), crystal (geology), pith helmet (explorer); all original | `ui/Icon.svelte` |
| G-12 | 006 | The rules do not say in what order the opening five cards are dealt | Round-robin in turn order starting with the first player, from a seeded shuffle | `turn/reducer.ts` |
| G-13 | 006 | A game created without `?seed=` has no seed for its dice | The table draws a random 32-bit seed at creation and commits it in `game/created`; a stream without one falls back to a hash of the room code | `store.ts`, `seats/reducer.ts` |
| G-14 | 006 | Pile counts are numbers, which the UX doc says should be countable marks on shared elements | Stacks show thickness layers plus a small number; revisit in the responsive pass | `DeckStack.svelte` |
| G-15 | 007 | When exactly a free ticket expires: "must be used or discarded in the next turn" | A ticket is usable during the turn it was drawn (and the first turn for opening cards) and is discarded at the start of its owner's next turn; implemented as `drawnRound` per card | `turn/reducer.ts` |
| G-16 | 007 | Does the first player draw a card on the very first turn? | Yes: every Europe turn draws one, so the first player starts with six | `turn/reducer.ts` |
| G-17 | 007 | Cards are discarded one at a time by tapping; no multi-select | One tap per card while the discard prompt shows; the draw happens as soon as the hand is at five | `TurnControls.svelte` |
| G-18 | 008 | What happens to the hand when sailing: the rules say money not spent on the expedition is lost | The whole hand is converted to a cash budget when passage is booked (less the $500 fare unless a ticket to that port is used); every card, including unused tickets, goes to the discard pile | `turn/reducer.ts` |
| G-19 | 008 | How the skipped turn at sea is handled | At the start of the explorer's next turn the token lands at the port and the turn passes on automatically | `turn/reducer.ts` |
| G-20 | 008 | Booking does not end the turn by itself | The player still ends the turn with the end-turn control (so publishing before sailing stays possible) | `TurnControls.svelte` |
