
## Not sampled

Text that exists but none of the samples above reaches. The asks are worded in the rules' own files, named here.

- **Explored with moves left** (mounted or by canoe; no horses or camels are sold at Mombasa, where the samples start). The result panel stays until the next step: title "Explored a veldt hex" (the terrain's name, "Explored a jungle mountain hex"), then "You have 2 MP: pick a hex to move into, or" `[END TURN]`, then the step's lines.
- **Sickness** at the end of a turn (`rations.ts`): a die a man, asked for by the bunch, "for the 3 sick bearers, a die a man; 1 or less recovers, 5 or more dies, anything between is still sick" (the numbers shift "with the doctor" and "starving too"), "for the starving bearer; 4 or more and he falls sick, less and he stays well".
- **Oasis** on entering a desert hex another explorer mapped (`exploration/reducer.ts`): "for the oasis; even finds the oasis, if there is one here; odd finds none, and only its first finder may look again". In a newly mapped desert hex: "for an oasis in this desert", then "to confirm the oasis".
- **Cataract by canoe**: "for the canoes over the cataract; the die less 3 is the canoes lost over the falls, of 2; 3 or less loses none".
- **Cache**: "for the cache; 1 or 2 and it has gone; 3 or more and it is recovered".
- **Specialties** (`specialties.ts`): "for a zoological specimen; 2 or 3 finds a specimen in veldt; anything else, none"; "for the preaching; the tribe's attitude rises by the die less 1: …"; "for the treatment; 1 a fatal disease, 2 the explorer falls sick, …".
- **A disaster card that applies** (`disasters/resolve.ts`): its own dice ("for the doctor; 6 and the doctor averts it; less and it strikes", "for the toll; the total is the toll in gifts; more than the 20 carried and the raiders attack", "for the raiders; the total is the animals they try to steal; each raider shot saves one", "for the explorer's shot (crocodile); 6 kills one, less misses").
- **Rivers met from a neighbour** (`rivers.ts`): "for the water two rivers leave from; 1–2 lake, 3–4 swamp, 5–6 jungle-swamp", "for where the river comes from; it comes from water or unexplored country that way; from mapped land it cannot, and rises here", "for where the river flows on to; it flows on into water or unexplored country that way; toward mapped land it cannot, and the die is rolled again".
- **Other terrain**: "for jungle in the mountain; 4 adds jungle, anything else mountain alone"; beside jungle the table reads "1 desert (veldt here, beside jungle)", beside desert "4 jungle (veldt here, beside desert)".
- **The roll for first player** before the game: "Roll 4 D6 for first player; the highest total goes first; a tie is rolled again", shown its own way at every seat.
- **Without physical dice** the table rolls for itself: no dice panel, no asks and no result panel; only the log lines and the rail's one line appear.
