// The terrain's direction shown on the board (PROMPTS.md, prompt 68). A blank hex takes its terrain from the
// neighbour in a direction rolled (rules §7.3), and until now only the log said which. After each direction die
// the board plays it out: the digit rolled glows on the compass, then the neighbour that way glows, then its
// terrain is copied into the hex explored; a neighbour with nothing mapped glows red and fades, and the table says
// to roll again. This module is the pure part: which steps a change of the game calls for, and the words.
import type { GameState, RollRecord } from '$lib/game/state';
import { allRecords } from '$lib/game/sources';
import { isLand, type Terrain } from './manifest';
import { terrainLookup } from './generate';
import { neighbour, type Direction, type HexId } from './hex';

/** One direction die played out: the hex explored, the way rolled, the neighbour there and what is mapped in it. */
export interface RevealStep {
  hex: HexId;
  direction: Direction;
  neighbour: HexId;
  /** The terrain copied, or null when nothing is mapped that way (sea, off the map, or still blank). */
  terrain: Terrain | null;
  /** The first try or the second. */
  attempt: number;
}

/** What each step shows in turn: the digit on the compass, the neighbour, then the copy or the empty hex fading. */
export type RevealPhase = 'digit' | 'hex' | 'copy' | 'empty';
export const phasesOf = (step: RevealStep): RevealPhase[] => ['digit', 'hex', step.terrain ? 'copy' : 'empty'];

/** The ask's words for the direction die (generate.ts), by which its throws are told among an event's. */
export const DIRECTION_ASK = 'for the direction of the terrain to copy';

type Held = NonNullable<GameState['awaiting']>;
const isStep = (held: GameState['awaiting']): held is Held => held?.event.type === 'expedition/moved';
/** The direction dice thrown so far for a step held for dice. */
export function directionsRolled(held: GameState['awaiting']): number[] {
  return isStep(held) ? held.rolled.filter((r) => r.prompt.includes(DIRECTION_ASK)).flatMap((r) => r.values) : [];
}
/** The hex a held step is entering. */
export function steppingInto(held: GameState['awaiting']): HexId | null {
  if (!isStep(held)) return null;
  const path = (held.event.payload as { path?: unknown }).path;
  return Array.isArray(path) && typeof path.at(-1) === 'string' ? (path.at(-1) as HexId) : null;
}

function stepsFor(state: GameState, hex: HexId, directions: number[], from: number): RevealStep[] {
  const lookup = terrainLookup(state.map);
  return directions.slice(from).map((d, i) => {
    const n = neighbour(hex, d as Direction);
    return { hex, direction: d as Direction, neighbour: n, terrain: isLand(n) ? (lookup(n) ?? null) : null, attempt: from + i + 1 };
  });
}

/**
 * The direction dice that came between two states of the game, to be played out: those of a step held for more dice
 * (physical dice: one die at a time), and those of a step applied in full (the table's own dice: both tries at once),
 * less any already played while it was held.
 */
export function revealSteps(before: GameState, after: GameState): RevealStep[] {
  const sameEvent = before.awaiting && after.awaiting && before.awaiting.event.id === after.awaiting.event.id;
  const played = directionsRolled(before.awaiting).length;
  if (isStep(after.awaiting)) {
    const hex = steppingInto(after.awaiting);
    return hex ? stepsFor(after, hex, directionsRolled(after.awaiting), sameEvent ? played : 0) : [];
  }
  const fresh = allRecords(after).slice(allRecords(before).length).filter((r) => r.kind === 'terrain' && r.hex);
  return fresh.flatMap((r) => stepsFor(after, r.hex as HexId, r.rolls.filter((roll) => roll.label.startsWith('direction')).map((roll) => roll.value), isStep(before.awaiting) && steppingInto(before.awaiting) === r.hex ? played : 0));
}

/** "mapped veldt: …" → veldt: the terrain a step's line so far gave its hex, shown while the step is held for more dice. */
export function mappedBy(record: RollRecord | undefined): Terrain | null {
  const m = record?.kind === 'terrain' ? /^mapped ([a-z-]+)/.exec(record.outcome) : null;
  return m ? (m[1] as Terrain) : null;
}

/** The terrain a step held for dice has already given its hex (the terrain's line among its lines so far), to draw until the step is applied. */
export function provisionalTerrain(held: GameState['awaiting']): { hex: HexId; terrain: Terrain } | null {
  const hex = steppingInto(held);
  const terrain = hex ? mappedBy(held!.sofar.find((r) => r.kind === 'terrain' && r.hex === hex)) : null;
  return hex && terrain ? { hex, terrain } : null;
}

/**
 * The direction just rolled found nothing, and the step waits for the next die: the direction, and whether it was the
 * second try (the terrain table is next) or the first (the direction is rolled again).
 */
export function emptyDirection(state: GameState): { direction: number; attempt: number } | null {
  const held = state.awaiting;
  const hex = steppingInto(held);
  if (!hex || !held!.rolled.at(-1)?.prompt.includes(DIRECTION_ASK)) return null;
  const steps = stepsFor(state, hex, directionsRolled(held), 0);
  const last = steps.at(-1);
  return last && !last.terrain ? { direction: last.direction, attempt: last.attempt } : null;
}

/** What the turn's panel says once the red glow has faded. */
export function emptyText(empty: { direction: number; attempt: number }): string {
  return empty.attempt === 1 ? `Hex in direction ${empty.direction} is empty; roll again` : `Hex in direction ${empty.direction} is empty too; roll on the terrain table`;
}
