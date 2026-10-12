# E2E scenarios

Each directory is one numbered scenario: a spec, committed baseline screenshots, and a generated `README.md` walkthrough. See [`docs/e2e-test-guidelines.md`](../../docs/e2e-test-guidelines.md).

| # | Scenario | Proves |
|---|---|---|
| 001 | [App shell and seats](001-app-shell-and-seats/README.md) | The table loads with six seats; a player takes the bottom seat; it survives a reload |
| 002 | [Phone takes a seat](002-phone-takes-a-seat/README.md) | A phone opens a seat's QR link, takes the seat through the relay, and sees its private view; the table shows only the public rail |
| 003 | [Africa board and six seats](003-africa-board-and-six-seats/README.md) | The hex map of Africa with its thirteen ports fills the table between six seat rails; taking a seat leaves the board unchanged; it survives a reload |
| 004 | [Known Africa](004-known-africa/README.md) | The pre-printed periphery of 1820 is drawn: terrain symbols, the twelve printed rivers with drainage numbers, and the two printed cataracts; the interior stays blank |
