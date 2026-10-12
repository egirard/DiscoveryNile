import type { SeatId } from '$lib/tabletop/seats';
import type { RngState } from './random';
import type { CardId } from '$features/cards/deck';

export interface SeatState {
  id: SeatId;
  uid: string | null;
  name: string | null;
}

export interface Diagnostic {
  eventId: string;
  reason: string;
}

export type Specialty = 'evangelism' | 'medicine' | 'zoology' | 'geology';

/** Where an explorer is. Grows as slices need it (port, hex, captivity, dead). */
export type ExplorerLocation = { kind: 'europe' } | { kind: 'dead' };

export interface ExplorerState {
  seat: SeatId;
  specialties: Specialty[];
  location: ExplorerLocation;
  /** Donation cards, face up. */
  hand: CardId[];
  /** The round each card in hand was drawn in; free tickets expire at the owner's next turn. */
  drawnRound: Record<string, number>;
}

/**
 * Where the current seat is in its turn. `discard`: over the hand limit, must choose discards
 * before drawing. `act`: free to publish, sail or end the turn.
 */
export type Phase = 'discard' | 'act';

export interface TurnState {
  /** Seats with explorers, clockwise from the first player. */
  order: SeatId[];
  current: SeatId;
  round: number;
  phase: Phase;
}

export interface DeckState {
  draw: CardId[];
  discard: CardId[];
}

/** The four-dice roll-off for first player: every attempt per seat (re-rolls on ties, RQ-1). */
export type RollOff = Record<string, number[][]>;

export interface GameState {
  gameId: string | null;
  hostUid: string | null;
  seats: SeatState[];
  explorers: ExplorerState[];
  /** Serialisable PRNG state; every die roll and shuffle advances it (docs/rules.md D-1). */
  rng: RngState | null;
  rollOff: RollOff | null;
  turn: TurnState | null;
  deck: DeckState | null;
  diagnostics: Diagnostic[];
}

export function initialState(): GameState {
  return { gameId: null, hostUid: null, seats: [], explorers: [], rng: null, rollOff: null, turn: null, deck: null, diagnostics: [] };
}
