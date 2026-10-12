// Seats: an edge of the table plus an index along it. `bottom-1` is the canonical test seat.
export type Edge = 'bottom' | 'top' | 'left' | 'right';
export const EDGES: readonly Edge[] = ['bottom', 'right', 'top', 'left'];

export type SeatId = `${Edge}-${number}`;
export type SeatLayout = Record<Edge, number>;

export interface Seat {
  id: SeatId;
  edge: Edge;
  index: number; // 1-based along the edge
  count: number; // seats on this edge
}

export const DEFAULT_LAYOUT: SeatLayout = { bottom: 1, top: 1, left: 1, right: 1 };

export function seatsFor(layout: SeatLayout): Seat[] {
  const seats: Seat[] = [];
  for (const edge of EDGES) {
    const count = Math.max(0, layout[edge] ?? 0);
    for (let index = 1; index <= count; index++) seats.push({ id: `${edge}-${index}`, edge, index, count });
  }
  return seats;
}

export function parseSeatId(value: string): Seat | null {
  const m = /^(bottom|top|left|right)-(\d+)$/.exec(value);
  if (!m) return null;
  const index = Number(m[2]);
  if (index < 1) return null;
  return { id: `${m[1] as Edge}-${index}`, edge: m[1] as Edge, index, count: index };
}

/** Degrees to rotate a seat's rail so that "up" points away from its edge. */
export function rotationFor(edge: Edge): number {
  return { bottom: 0, left: 90, top: 180, right: 270 }[edge];
}

/** Fraction (0..1) along the edge, in that edge's clockwise reading direction, where the seat sits. */
export function positionAlongEdge(seat: Seat): number {
  return (seat.index - 0.5) / seat.count;
}
