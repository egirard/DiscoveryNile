# Tabletop UX

Tabletop projects are games played on a **tabletop computer**: a large horizontal touchscreen that supports multiple simultaneous players seated on any side. This document is the design contract every screen must satisfy.

## Hardware

- A large touchscreen laid flat as a table surface.
- Screen sizes currently in use: **27"** and **55"** diagonal. The application must be usable on both without a separate build; the diagonal is local configuration (see below).
- Multi-touch: several players may be touching the screen at the same time. The UI must never assume one pointer.
- Chrome (current stable) is the only supported browser. Do not spend effort on other browsers.

## Seats and orientation

The screen has **no single "up"**. Players occupy **seats** along the edges, and a seat's "up" is the direction away from its edge.

- A seat has an **edge** (`bottom`, `top`, `left`, `right`) and an **index** along that edge, starting at 1. Its id is `<edge>-<index>`: `bottom-1`, `bottom-2`, `left-1`. An edge can hold more than one player; a 55" table comfortably seats two per long edge.
- The project declares how many seats each edge offers (`{ bottom: 2, top: 2, left: 1, right: 1 }`); the layout distributes rails along the edge accordingly and leaves unoccupied seats empty until play begins. Once the game has started, a seat nobody took shows nothing, and the shared board takes any edge with no player on it.
- Every player-facing element (that player's pieces, prompts, score, QR code, virtual keyboard) is **rotated toward its seat's edge** and positioned at that seat's span of the edge.
- Every shared element (the board, the market, the draw pile, turn indicator) is **omnidirectional**: radially symmetric, iconographic, duplicated per seat, or rotated toward the active player *only* if the game's design calls for it and the animation is short.
- **`bottom-1`** is the canonical seat for development, screenshots, and E2E tests. Nothing about the code may depend on that; it is a testing convention.
- When a player acts, feedback appears **at that player's rail**, not in a global toast.

## Physical size is local configuration

The application cannot know the physical size of the screen it is on. The **screen diagonal in inches** is a local configuration value:

- Set once with `?diag=<inches>` or on the options screen (the gear at the north-west or south-east corner), persisted in `localStorage`, defaulting to 55.
- Used to derive millimetres per CSS pixel, so touch targets, pieces, and QR codes are sized physically rather than in pixels, and so the 27" and 55" experiences come from one layout.
- Offered with a calibration affordance: draw an ISO ID-1 outline (85.6 × 54.0 mm) and let the user hold a bank card against it.
- Passed to any attached phone or AR viewer that needs to know the table's geometry (viewport pixels and physical width).

## Iconography over text

- **Icons are preferred to text.** Icons are direction-agnostic and language-agnostic; text has a reading direction and is unreadable from the opposite seat.
- Where text is unavoidable (a name a player typed, a number), it is short and oriented toward the player it is for.
- Every icon has an accessible label (`aria-label`) so tests and assistive technology can identify it. Semantics never depend on pixels.
- Numbers on shared elements (piece counts, deck size) are shown as **countable marks or repeated per seat**, not as a single digit that is upside down for half the table.
- Original art only. Publisher artwork, logos, and trade dress are never copied. See the asset notes below.

## Input

- Input is **touch or mouse**. Design for fingers first: a touch target is at least **12 mm** physically, derived from the configured diagonal; never smaller than 44 CSS px.
- **No hover-dependent interaction.** Hover may embellish but never gates. Every control's `aria-label` doubles as its tooltip (`src/lib/ui/tooltips.ts`), so a mouse can learn what an icon does; a finger cannot hover, so the icons must stand on their own and touch feedback is a later stage.
- **No keyboard**, except a **virtual keyboard** rendered on the table, oriented to the seat using it, for the rare text entry (a player name). Physical keyboard shortcuts may exist for development and E2E but nothing a player needs is keyboard-only.
- **No drag as the only way** to do something. Drag is welcome as a shortcut; a tap-tap alternative always exists, because concurrent drags by multiple players are fragile.
- **Concurrency**: two players may interact at once. Selections and staging are per seat, not global; one player's half-finished action does not block another's legal action unless the rules say so.
- Accidental touches happen on a table. Consequential actions (ending a turn, selling, discarding) require a **confirmation at the player's edge** or an **undo** within the same turn.

## Layout

- The whole interface **fits the viewport**. No document scrolling, ever. Internal scroll regions are avoided; when unavoidable they are marked so tests can check them (see [e2e-test-guidelines.md](e2e-test-guidelines.md)).
- Layout is computed from the viewport and seat count, not from fixed pixel positions, and recomputed when the window resizes. The same layout code produces the 27" and 55" experiences.
- Reserve a **rail** along each occupied edge for that seat's private-to-the-table elements (score, staged pieces, prompts, QR).
- Keep the **centre** for the shared board.
- Animations clarify cause and effect (a card flying to its destination) but are short, respect `prefers-reduced-motion`, and never decide rules outcomes. Reloading mid-animation shows the settled state.

## Phones as private displays

When the game has hidden information, each seat shows a **QR code** on its rail. Scanning it opens that seat's private view on the phone. The phone shows only what that player alone may see; public actions still happen on the table. See [multi-device.md](multi-device.md).

## Assets

- Store the semantic identity of every piece (id, kind, value, label) in a manifest; render art from it. Art is an enhancement of semantics that already exist in the DOM.
- Prefer SVG for icons; raster only for illustrated art.
- Keep an `assets.md` in the project listing every asset, its source or generation prompt, and its licence.

## Checklist for a new screen

- [ ] Works with 1 to `6` seats occupied, on any combination of edges, including two on one edge.
- [ ] Every player-facing element is rotated to its seat.
- [ ] Every shared element is legible from every seat.
- [ ] No text a player must read from the wrong direction.
- [ ] Every icon has an `aria-label` and every test-relevant element a `data-testid`.
- [ ] Touch targets meet the physical minimum at 27" using the configured diagonal.
- [ ] No hover, keyboard, or drag-only interaction.
- [ ] Fits the viewport at 27" and 55" with no scrolling.
- [ ] Concurrent input from two seats does not corrupt either player's action.
