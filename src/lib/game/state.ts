import type { SeatId } from '$lib/tabletop/seats';
import type { RngState } from './random';
import type { CardId } from '$features/cards/deck';
import type { PortId } from '$features/map/manifest';
import type { Chart } from '$features/expedition/prices';
import type { HexId } from '$features/map/hex';
import type { Terrain } from '$features/map/manifest';
import type { Modifier, Roll } from '$features/map/generate';

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

/** Where an explorer is. Grows as slices need it (hex, captivity). */
export type ExplorerLocation =
  | { kind: 'europe' }
  | { kind: 'voyage'; port: PortId } // booked passage; arrives at the start of the explorer's next turn, which is skipped
  | { kind: 'port'; port: PortId }
  | { kind: 'hex'; hex: HexId }
  | { kind: 'dead' };

export interface ExplorerState {
  seat: SeatId;
  specialties: Specialty[];
  location: ExplorerLocation;
  /** Donation cards, face up. */
  hand: CardId[];
  /** The round each card in hand was drawn in; free tickets expire at the owner's next turn. */
  drawnRound: Record<string, number>;
  /** Expedition budget once passage is booked: the hand's money less the fare, until it is spent. */
  money: number;
  /** The Expedition Organization Chart, once outfitted at a port. */
  chart: Chart | null;
  /** Hexes this explorer has passed through (plus the port of entry): "known" for movement and lost checks. */
  known: HexId[];
}

/** A hex whose terrain has been determined in play. */
export interface MappedHex {
  terrain: Terrain;
  /** Seats holding a coloured marker here (visited, unpublished). */
  markers: SeatId[];
}

/** A roll the table showed, kept for the current turn so the rail can display it. */
export interface RollRecord {
  kind: 'lost-check' | 'terrain';
  seat: SeatId;
  hex: HexId;
  rolls: Roll[];
  modifiers?: Modifier[];
  total?: number;
  /** Human-readable result: 'lost', 'moved', 'mapped veldt', 'bounced: lake' … */
  outcome: string;
  lost?: boolean;
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
  /** The expedition has moved (or tried to) this turn. */
  moved: boolean;
  /** Rolls shown this turn. */
  log: RollRecord[];
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
  /** Hexes mapped in play, by id. */
  map: Record<string, MappedHex>;
  diagnostics: Diagnostic[];
}

export function initialState(): GameState {
  return { gameId: null, hostUid: null, seats: [], explorers: [], rng: null, rollOff: null, turn: null, deck: null, map: {}, diagnostics: [] };
}
