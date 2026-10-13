# Multi-Device Play

Some games need more than the table. A phone gives a player a private display; another desktop browser lets a remote player, a spectator, or a second screen join. This document describes how those clients find the game and what each one shows.

## Roles

| Client | Route | Sees | Writes | Transport |
|---|---|---|---|---|
| Table | `/table` | Everything public, oriented per seat | Appends every event | Local backend (host) |
| Phone | `/hand?session=…&seat=…` | Only its seat's private view | Sends intents to the table | Relay (WebSocket) |
| Second screen / spectator | `/table?session=…&view=1` | Everything public | Nothing | Relay |
| Remote player | `/table?gameId=…` | Everything public | Appends events | Firebase |

The relay speaks the session protocol of the ARViewer project's relay (`github.com/egirard/ARViewer`, `server/server.js`), the one Jaipur's tabletop uses: a client sends `{type: 'join', session, role: 'table' | 'viewer', seat}`; the table publishes `{type: 'state', state: {events, geometry}}`, which the relay caches for late joiners and forwards to every viewer; a viewer sends `{type: 'action', action, …}`, which the relay stamps with the viewer's seat and forwards to the table. The deployed table uses the hosted relay at `wss://arviewer-relay.onrender.com/ws`; `scripts/relay.ts` is the same protocol for development and E2E.

All roles project the same event stream. Shared-table mode is not a separate rules implementation. **The first three rows need no Firebase**; see the relay in [state-and-persistence.md](state-and-persistence.md).

## Room codes

Every game has a **room code**: five uppercase letters (`ABCDEFGHIJKLMNOPQRSTUVWXYZ`), generated with `crypto.getRandomValues` and rejection sampling so the distribution is unbiased. The table reserves one at load, retrying if the code is already in use. Helpers `generateRoomCode`, `normalizeRoomCode`, and `isRoomCode` live in `src/lib/tabletop/room-code.ts` and have unit tests.

The room code is the `gameId` for the repository and appears in every join URL.

## Per-seat QR codes

When the game supports phones, the table shows **one QR code on each seat's rail**, rotated toward that seat.

- The QR encodes `${origin}${base}/hand?session=<relay session>&seat=<seat id>` (with a Firebase backend, `gameId=<code>` instead of `session`).
- Generated client-side with the `qrcode` package (`toDataURL`, error correction `M`, margin 2, around 360 px, colours from the theme).
- Displayed as an `<a>` around an `<img>` with an `aria-label` that names the seat, so the URL is also a link for testing and for laptops.
- A seat that has been taken hides its QR and shows the player's chosen icon or name instead; a "rejoin" affordance brings it back if the phone drops.
- Since a QR code is a dense high-contrast square it is also an excellent tracking feature for an AR viewer. Keep it flat, unrotated within its own frame, and unobscured. An AR attachment also needs the table's physical geometry (see "Physical size is local configuration" in [tabletop-ux.md](tabletop-ux.md)); the table publishes it over the same relay.

## The phone hand page

`/hand` is a small, portrait, single-seat page.

1. Reads `session` (or `gameId`) and `seat` from the URL; refuses with a clear message if either is missing.
2. Connects to the relay as a viewer claiming that seat (or, with Firebase, subscribes to the stream directly).
3. Asks for a name (or a pick from icons) the first time and remembers it locally per session.
4. Sends a `seat/take` intent; the table appends `seat/taken` and the phone renders `seatView` for its seat from the stream the host publishes.
5. Shows connection status in a `[role="status"][data-status]` element.

Private *selections* (which cards to return, which secret objective) are made on the phone and sent as intents; the *public* completion of the action (tapping the market, ending the turn) happens on the table. The table shows a face-down or count-only representation of what the phone holds. Selection highlight is always host-driven state, so the phone and the table can never disagree.

### Test hooks

Development and E2E builds accept `?name=<n>&auto=1` on `/hand` to prefill the name and take the seat without interaction. These parameters are ignored in production builds.

## Other browsers

- A second desktop browser can attach as a **viewer** through the relay (a mirror for a wall screen, a spectator, a laptop for someone who cannot reach the table) with no Firebase.
- A second browser that must **write independently** of the table, such as a remote player, requires the Firebase backend. What that browser may do is a project decision recorded in `docs/vision.md`.

## Information boundaries

- The table never renders another seat's private state, even face-down representations that leak counts the rules keep secret.
- A phone never renders another seat's private state.
- The E2E fit check (see [e2e-test-guidelines.md](e2e-test-guidelines.md)) fails a table scenario if any element marked private is present in the table DOM.

## Scenarios

At least one scenario must:

- start the relay, open the table, take seat `bottom-1` by following its QR link in a second (phone-sized) browser context, and prove the phone shows that seat's private state while the table shows only the public representation; and
- reload the phone and the table and prove both reconstruct the same state.

Use one isolated browser context per device. Never share storage between contexts. Playwright's `webServer` can be an array; the relay is started alongside the dev server.
