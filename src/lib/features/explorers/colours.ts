import type { SeatId } from '$lib/tabletop/seats';

/** Each seat's explorer colour: the counters of the physical game, one colour per player. */
export const SEAT_COLOURS: Record<string, string> = {
  'bottom-1': '#c8463c',
  'bottom-2': '#2f6fc4',
  'right-1': '#3b9a4a',
  'top-1': '#e0b422',
  'top-2': '#8a4fb5',
  'left-1': '#e37d2c'
};

export function colourFor(seat: SeatId | string): string {
  return SEAT_COLOURS[seat] ?? '#888888';
}
