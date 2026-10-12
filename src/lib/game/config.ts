import type { SeatLayout } from '$lib/tabletop/seats';

/** Six explorers: two on each long edge, one on each short edge (docs/rules.md D-3). */
export const SEAT_LAYOUT: SeatLayout = { bottom: 2, top: 2, left: 1, right: 1 };
