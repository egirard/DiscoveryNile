import type { SeatId } from '$lib/tabletop/seats';

export interface SeatState {
  id: SeatId;
  uid: string | null;
  name: string | null;
}

export interface Diagnostic {
  eventId: string;
  reason: string;
}

export interface GameState {
  gameId: string | null;
  hostUid: string | null;
  seats: SeatState[];
  diagnostics: Diagnostic[];
}

export function initialState(): GameState {
  return { gameId: null, hostUid: null, seats: [], diagnostics: [] };
}
