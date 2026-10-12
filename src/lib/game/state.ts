import type { SeatId } from '$lib/tabletop/seats';
import type { RngState } from './random';
import type { CardId } from '$features/cards/deck';
import type { PortId } from '$features/map/manifest';
import type { Chart, Item } from '$features/expedition/prices';
import type { HexId } from '$features/map/hex';
import type { Terrain } from '$features/map/manifest';
import type { Modifier, Roll } from '$features/map/generate';
import type { RiverCourse } from '$features/map/rivers';
import type { MovementBudget } from '$features/exploration/movement';

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
  /** Sailing home with the government's free passage; in Europe at the start of the explorer's next turn (rules §12). */
  | { kind: 'homeward'; port: PortId }
  | { kind: 'hex'; hex: HexId }
  /** Held prisoner by a tribe (rules §8.4): an escape roll every turn; `had` is the chart at capture, for the survival table. */
  | { kind: 'captive'; hex: HexId; tribe: number; had: Chart; goodwill: number }
  /** Out of play, dead or retired (`fate` says which); the seat may commission a new explorer. */
  | { kind: 'dead' };

/** Who in the expedition is sick (rules §10–11). Consequences of sickness arrive with slice 021. */
export interface Sickness {
  explorer: boolean;
  guides: number;
  bearers: number;
  askaris: number;
  animals: number;
}

export const NO_SICKNESS: Sickness = { explorer: false, guides: 0, bearers: 0, askaris: 0, animals: 0 };

export interface ExplorerState {
  seat: SeatId;
  specialties: Specialty[];
  location: ExplorerLocation;
  sick: Sickness;
  /** Donation cards, face up. */
  hand: CardId[];
  /** The round each card in hand was drawn in; free tickets expire at the owner's next turn. */
  drawnRound: Record<string, number>;
  /** Expedition budget once passage is booked: the hand's money less the fare, until it is spent. */
  money: number;
  /** The Expedition Organization Chart, once outfitted at a port. */
  chart: Chart | null;
  /** The end-of-turn hunt and meal (rules §11), shown at the rail until the explorer's next turn. */
  lastMeal: RollRecord | null;
  /** Hexes this explorer has passed through (plus the port of entry): "known" for movement and lost checks. */
  known: HexId[];
  /** The hex (or port hex) the last step was made from: where a retreat goes (rules §8.1). */
  cameFrom: HexId | null;
  /** Added to later poisoning rolls after a recovery (rules §8.5). */
  poisonBonus: number;
  /** Specimens carried back for the zoologist's and geologist's points (rules §9); each weighs a ration. */
  specimens: { zoology: number; geology: number };
  /** Points earned in the field by evangelism and medicine (rules §9), scored in Europe. */
  goodWorks: { evangelism: number; medicine: number };
  /** The unpublished hex a naturalist entered and must study for a turn per specialty before moving on. */
  research: { hex: HexId; done: ('zoology' | 'geology')[] } | null;
  /** Set when the explorer is out of play (location 'dead'): how, when, and the obituary for the rail (rules §12). */
  fate: { kind: 'died' | 'retired'; round: number; cause: string } | null;
}

/** A tribe discovered in play (rules §7.7), numbered as its marker. */
export interface Tribe {
  id: number;
  hex: HexId;
  warriors: number;
  /** Attitude level, starting at 0 (rules §8.6). */
  attitude: number;
  /** After a victory whose village was not found: the explorer may search again while he stays (rules §8.4). */
  pending: { by: SeatId; prisoners: number; policy: number; original: number } | null;
  /** Explorers who have negotiated with this tribe (+1 on later contacts with policies 3 and 5). */
  negotiatedBy: SeatId[];
  /** Attitude earned towards one explorer only, such as for releasing every prisoner (rules §8.6). */
  regard: Partial<Record<SeatId, number>>;
  /** Missionaries who have preached here and doctors who have treated here, once each (rules §9). */
  preachedBy: SeatId[];
  treatedBy: SeatId[];
  /** Explorers who have defeated this tribe in a fight (one point when the hex is published, rules §12). */
  defeatedBy: SeatId[];
}

/** Goods buried or hidden on a hex under one of the explorer's cache markers (rules §5, RQ-3). */
export interface Cache {
  id: number;
  hex: HexId;
  seat: SeatId;
  /** The round it was made; it may be dug up on a later turn. */
  round: number;
  contents: Partial<Record<Item, number>>;
}

/** A hex whose terrain has been determined in play. */
export interface MappedHex {
  terrain: Terrain;
  /** Seats holding a coloured marker here (visited, unpublished). */
  markers: SeatId[];
  /** The seat that published the hex (rules §12); a published hex is known to every explorer. */
  publishedBy: SeatId | null;
  /** The tribe marker on the hex, if natives were discovered. */
  tribe: number | null;
  /** Explorers who have rolled for natives here and found none (each rolls once, rules §7.7). */
  nativesCheckedBy: SeatId[];
  /** River course through the hex, if any (rules §7.4). */
  river: RiverCourse | null;
  /** Desert only: an oasis was found, and by whom it is known (rules §7.4). */
  oasis: boolean;
  oasisKnownTo: SeatId[];
  /** Recorded only over 15,000 ft (rules §7.5). */
  peakFeet: number | null;
}

/** A roll the table showed, kept for the current turn so the rail can display it. */
export interface RollRecord {
  kind: 'lost-check' | 'terrain' | 'water' | 'turned-back' | 'canoes' | 'disaster' | 'hunting' | 'natives' | 'reaction' | 'combat' | 'defeat' | 'captivity' | 'victory' | 'loot' | 'negotiation' | 'poison' | 'trade' | 'specialty' | 'cache' | 'published';
  seat: SeatId;
  hex: HexId;
  /** The disaster card drawn this turn (rules §10). */
  card?: CardId;
  /** Whether the card's context matched the expedition's situation. */
  applies?: boolean;
  rolls: Roll[];
  modifiers?: Modifier[];
  total?: number;
  /** Human-readable result: 'lost', 'moved', 'mapped veldt', 'bounced: lake' … */
  outcome: string;
  lost?: boolean;
}

/**
 * Where the current seat is in its turn. `discard`: over the hand limit, must choose discards
 * before drawing. `natives`: in a hex with natives, a policy must be chosen (rules §8.1).
 * `spoils`: a village found after a victory, prisoners to release or keep (rules §8.4). `negotiate`: a
 * calm chief awaits the explorer's gifts (§8.5); `trade`: permission granted, prices rolled. `act`: free to
 * publish, sail or end the turn.
 */
export type Phase = 'discard' | 'natives' | 'spoils' | 'negotiate' | 'trade' | 'act';

export interface TurnState {
  /** Seats with explorers, clockwise from the first player. */
  order: SeatId[];
  current: SeatId;
  round: number;
  phase: Phase;
  /** The expedition's movement is over for this turn. */
  moved: boolean;
  /** Mode and points for this turn, fixed by the first move. */
  movement: MovementBudget | null;
  /** The policy chosen towards the natives this turn (rules §8.1), once chosen. */
  policy: number | null;
  /** Trade permitted this turn: the tribe and the prices rolled (rules §8.5). */
  trade: { tribe: number; prices: Partial<Record<Item, number>> } | null;
  /** Rolls shown this turn. */
  log: RollRecord[];
}

/** Points scored by a seat (rules §12): once scored they are never lost, whatever becomes of the explorer. */
export interface ScoreEntry {
  kind: 'hex' | 'tribe' | 'specimens' | 'works' | 'superlative';
  /** What was scored: a hex id, a tribe number, or the specialty. */
  detail: string;
  points: number;
  round: number;
}

/** A superlative discovery as published (rules §12): its rank and points at that moment (RQ-15). */
export interface SuperlativeRecord {
  kind: 'peak' | 'waterfall' | 'lake' | 'source';
  hex: HexId;
  seat: SeatId;
  /** Feet, lake hexes, or the river's length in hexes. */
  value: number;
  /** For a source: the river system (a manifest river id, or the coastal hex of an unnamed river). */
  system?: string;
  rank: number;
  points: number;
  round: number;
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
  /** Tribes discovered, by marker number. */
  tribes: Record<number, Tribe>;
  /** Caches left on the board, by marker number. */
  caches: Record<number, Cache>;
  /** Points scored, by seat, in the order they were scored (rules §12). */
  scores: Partial<Record<SeatId, ScoreEntry[]>>;
  /** Superlative discoveries in the order published; later ranks are measured against them. */
  superlatives: SuperlativeRecord[];
  diagnostics: Diagnostic[];
}

export function initialState(): GameState {
  return { gameId: null, hostUid: null, seats: [], explorers: [], rng: null, rollOff: null, turn: null, deck: null, map: {}, tribes: {}, caches: {}, scores: {}, superlatives: [], diagnostics: [] };
}
