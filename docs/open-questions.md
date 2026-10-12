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
