# E2E scenarios

Each directory is one numbered scenario: a spec, committed baseline screenshots, and a generated `README.md` walkthrough. See [`docs/e2e-test-guidelines.md`](../../docs/e2e-test-guidelines.md).

| # | Scenario | Proves |
|---|---|---|
| 001 | [App shell and seats](001-app-shell-and-seats/README.md) | The table loads with six seats; a player takes the bottom seat; it survives a reload |
| 002 | [Phone takes a seat](002-phone-takes-a-seat/README.md) | A phone opens a seat's QR link, takes the seat through the relay, and sees its private view; the table shows only the public rail |
| 003 | [Africa board and six seats](003-africa-board-and-six-seats/README.md) | The hex map of Africa with its thirteen ports fills the table between six seat rails; taking a seat leaves the board unchanged; it survives a reload |
| 004 | [Known Africa](004-known-africa/README.md) | The pre-printed periphery of 1820 is drawn: terrain symbols, the twelve printed rivers with drainage numbers, and the two printed cataracts; the interior stays blank |
| 005 | [Commission an explorer](005-commission-an-explorer/README.md) | A taken seat offers the four specialties and a confirm; the explorer token appears on the rail in the seat colour with a badge per specialty; a second seat commissions an ordinary explorer |
| 006 | [First player and donations](006-first-player-and-donations/README.md) | Starting the game rolls four dice per explorer in view, marks the high roller, deals five face-up donation cards to each rail and puts the piles on the board; all of it replays from the seed |
| 007 | [A turn in Europe](007-a-turn-in-europe/README.md) | A Europe turn draws a card; end-turn needs confirmation at the edge and passes the marker clockwise; unused free tickets expire at the owner's next turn; a hand over five must be trimmed by tapping cards before drawing |
| 008 | [Sail to Africa](008-sail-to-africa/README.md) | The sail control turns the ports into a chooser showing ticket, fare or unaffordable; booking makes the hand the budget, the explorer skips a turn at sea and lands on the port hex |
| 009 | [Outfit the expedition](009-outfit-the-expedition/README.md) | At the port a panel at the player's edge sells the price list with ×1/×10 steps, port restrictions, a running budget and a carrying summary; confirming forfeits the rest and the rail lists the expedition |
| 010 | [First step into the unknown](010-first-step-into-the-unknown/README.md) | From the port the expedition targets one adjacent hex; a blank one rolls the lost check at the rail; lost means staying put; success generates and draws the terrain, places the marker and moves the token |
| 011 | [Rivers, oases and cataracts](011-rivers-and-oases/README.md) | Mapped hexes gain river sources, continuations through rolled exits, cataracts with waterfall heights and mountain peak heights, all drawn on the board and replayable |
| 012 | [Movement rates](012-movement-rates/README.md) | The first step of a turn fixes the mode and a budget of movement points shown as pips at the rail: four mounted with unknown hexes costing two, four by canoe along water only; a hex that proves impassable for the mode is mapped and claimed but turns the expedition back |
