# E2E scenarios

Each directory is one numbered scenario: a spec, committed baseline screenshots, and a generated `README.md` walkthrough. See [`docs/e2e-test-guidelines.md`](../../docs/e2e-test-guidelines.md).

| # | Scenario | Proves |
|---|---|---|
| 001 | [App shell and seats](001-app-shell-and-seats/README.md) | The table loads with a seat per edge; a player takes the bottom seat; it survives a reload |
| 002 | [Phone takes a seat](002-phone-takes-a-seat/README.md) | A phone opens a seat's QR link, takes the seat through the relay, and sees its private view; the table shows only the public rail |
